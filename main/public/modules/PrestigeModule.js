import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';
import { formatNumber } from './UtilsModule.js';
import { playSound, tickSound } from './AudioModule.js';

const prestigeOverlay = document.getElementById('prestige-overlay');
const openPrestigeBtn = document.getElementById('open-prestige');
const closePrestigeBtn = document.getElementById('close-prestige');

// Skill Tree Elements
let skillTree;
let skillTreeContainer;
let skillTooltip;
let zoomInBtn;
let zoomOutBtn;
let fixedPrestigeInfo;
let centerTreeBtn;

// Skill Tree State
let skillTreeScale = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let treePositionX = 0;
let treePositionY = 0;
let skillNodes = [];
let skillConnections = [];

// Cache do último estado para comparação
let lastPrestigeState = {
  fragments: 0,
  prestigeUpgrades: []
};

export function initPrestige() {
  // Initialize skill tree elements
  skillTree = document.getElementById('skill-tree');
  skillTreeContainer = document.getElementById('skill-tree-container');
  skillTooltip = document.getElementById('skill-tooltip');
  zoomInBtn = document.getElementById('zoom-in');
  zoomOutBtn = document.getElementById('zoom-out');
  fixedPrestigeInfo = document.getElementById('fixed-prestige-info');
  centerTreeBtn = document.getElementById('center-tree');

  socket.on('gameStateUpdate', (newState) => {
    // Ignora atualizações de clique e auto-clique
    if (newState.type === 'click' || newState.type === 'autoclick') {
      // Atualiza apenas o UI básico se necessário
      if (prestigeOverlay.classList.contains('active')) {
        updatePrestigeUI();
      }
      return;
    }

    // Para outros tipos de atualização, verifica se houve mudança relevante
    const shouldUpdateUI = hasPrestigeStateChanged();
    if (shouldUpdateUI) {
      updatePrestigeUI();
      if (prestigeOverlay.classList.contains('active')) {
        if (skillNodes.length > 0) {
          // Se já temos nós, apenas atualizamos o status
          updateSkillTreeNodes();
        } else {
          // Se não temos nós, renderizamos a árvore completa
          renderSkillTree();
        }
      }
      updatePrestigeStateCache();
    }
  });

  // Adicionar listener para o evento de compra de upgrade de prestígio
  socket.on('buyPrestigeUpgrade', (data) => {
    console.log('Evento buyPrestigeUpgrade recebido:', data);
    
    // Atualizar o cache do estado de prestígio
    if (gameState.prestigeUpgrades) {
      const upgrade = gameState.prestigeUpgrades.find(u => u.id === data.id);
      if (upgrade) {
        console.log(`Atualizando upgrade ${data.id} para nível ${data.level}`);
        upgrade.level = data.level;
        
        // Atualizar o cache do estado de prestígio
        updatePrestigeStateCache();
      }
    }
    
    if (prestigeOverlay.classList.contains('active')) {
      // Forçar a renderização completa da árvore de habilidades
      console.log('Renderizando árvore de habilidades após compra');
      skillTree.innerHTML = '';
      skillNodes = [];
      skillConnections = [];
      renderSkillTree();
    }
  });

  openPrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.add('active');
    document.body.classList.add('overlay-active');
    
    // Centralizar a árvore de habilidades
    centerSkillTree();
    
    // Renderizar a árvore de habilidades se ainda não foi feito
    if (skillNodes.length === 0) {
      renderSkillTree();
    } else {
      // Caso contrário, apenas atualizar o status dos nós
      updateSkillTreeNodes();
    }
    
    // Atualizar o UI de prestígio
    updatePrestigeUI();
    
    // Disparar evento de abertura do overlay
    document.dispatchEvent(new CustomEvent('overlayOpened', { detail: { id: 'prestige-overlay' } }));
  });

  closePrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.remove('active');
    document.body.classList.remove('overlay-active');
    
    // Disparar evento de fechamento do overlay
    document.dispatchEvent(new CustomEvent('overlayClosed', { detail: { id: 'prestige-overlay' } }));
  });

  prestigeOverlay.addEventListener('click', (e) => {
    if (e.target === prestigeOverlay) {
      closePrestigeBtn.click();
    }
  });

  document.getElementById('prestige-button').addEventListener('click', () => {
    if (!isOwnPlayer()) {
      showNotification('Você só pode prestigiar quando for o jogador ativo!');
      return;
    }
    const player = gameState.players.find(player => player.id === socket.id);
    if (player && player.level < 2) {
      showNotification('Você precisa estar pelo menos no nível 2 para prestigiar!');
      return;
    }
    
    // Add confirmation animation
    const button = document.getElementById('prestige-button');
    button.classList.add('confirming');
    button.textContent = 'Confirmar?';
    
    // If already confirming, proceed with prestige
    if (button.dataset.confirming === 'true') {
      socket.emit('prestige');
      button.classList.remove('confirming');
      button.textContent = 'Prestigiar';
      button.dataset.confirming = 'false';
      return;
    }
    
    button.dataset.confirming = 'true';
    
    // Reset confirmation after 3 seconds
    setTimeout(() => {
      if (button.dataset.confirming === 'true') {
        button.classList.remove('confirming');
        button.textContent = 'Prestigiar';
        button.dataset.confirming = 'false';
      }
    }, 3000);
  });

  // Initialize skill tree controls
  initSkillTreeControls();
  
  // Centralizar a árvore de habilidades
  centerTreeBtn.addEventListener('click', centerSkillTree);
  
  // Add window resize handler to adjust skill tree
  window.addEventListener('resize', () => {
    if (prestigeOverlay.classList.contains('active')) {
      centerSkillTree();
    }
  });
}

function initSkillTreeControls() {
  // Zoom controls
  zoomInBtn.addEventListener('click', () => {
    skillTreeScale = Math.min(skillTreeScale + 0.1, 2);
    updateSkillTreeTransform();
  });

  zoomOutBtn.addEventListener('click', () => {
    skillTreeScale = Math.max(skillTreeScale - 0.1, 0.5);
    updateSkillTreeTransform();
  });

  // Drag controls
  skillTreeContainer.addEventListener('mousedown', (e) => {
    // Ignore if clicking on fixed elements or nodes
    if (e.target === fixedPrestigeInfo || 
        fixedPrestigeInfo.contains(e.target) ||
        e.target.closest('.skill-node') ||
        e.target.closest('.zoom-controls')) {
      return;
    }
    
    isDragging = true;
    skillTreeContainer.classList.add('grabbing');
    dragStartX = e.clientX - treePositionX;
    dragStartY = e.clientY - treePositionY;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      treePositionX = e.clientX - dragStartX;
      treePositionY = e.clientY - dragStartY;
      updateSkillTreeTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    skillTreeContainer.classList.remove('grabbing');
  });

  // Mouse wheel zoom
  skillTreeContainer.addEventListener('wheel', (e) => {
    // Ignore wheel events on fixed elements
    if (e.target === fixedPrestigeInfo || fixedPrestigeInfo.contains(e.target)) {
      return;
    }
    
    e.preventDefault();
    const zoomSpeed = 0.1;
    const zoomDirection = e.deltaY < 0 ? 1 : -1;
    
    // Calculate zoom centered on mouse position
    const containerRect = skillTreeContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Calculate mouse position relative to the tree
    const mouseXRelative = (mouseX - treePositionX) / skillTreeScale;
    const mouseYRelative = (mouseY - treePositionY) / skillTreeScale;
    
    // Apply zoom
    const oldScale = skillTreeScale;
    skillTreeScale = Math.max(0.5, Math.min(2, skillTreeScale + zoomDirection * zoomSpeed));
    
    // Adjust position to zoom centered on mouse
    treePositionX = mouseX - mouseXRelative * skillTreeScale;
    treePositionY = mouseY - mouseYRelative * skillTreeScale;
    
    updateSkillTreeTransform();
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!prestigeOverlay.classList.contains('active')) return;
    
    switch (e.key) {
      case '=':
      case '+':
        zoomInBtn.click();
        break;
      case '-':
        zoomOutBtn.click();
        break;
      case 'Escape':
        closePrestigeBtn.click();
        break;
      case 'Home':
        centerSkillTree();
        break;
    }
  });
}

function updateSkillTreeTransform() {
  skillTree.style.transform = `translate(${treePositionX}px, ${treePositionY}px) scale(${skillTreeScale})`;
}

function centerSkillTree() {
  const containerRect = skillTreeContainer.getBoundingClientRect();
  treePositionX = containerRect.width / 2;
  treePositionY = containerRect.height / 2;
  skillTreeScale = 1; // Reset scale when centering
  updateSkillTreeTransform();
}

function hasPrestigeStateChanged() {
  // Verificar se os fragmentos mudaram
  if (gameState.fragments !== lastPrestigeState.fragments) {
    return true;
  }
  
  // Verificar se os upgrades de prestígio mudaram
  if (!gameState.prestigeUpgrades || !lastPrestigeState.prestigeUpgrades) {
    return true;
  }
  
  // Verificar se o número de upgrades mudou
  if (gameState.prestigeUpgrades.length !== lastPrestigeState.prestigeUpgrades.length) {
    return true;
  }
  
  // Verificar se algum upgrade específico mudou
  for (let i = 0; i < gameState.prestigeUpgrades.length; i++) {
    const currentUpgrade = gameState.prestigeUpgrades[i];
    const lastUpgrade = lastPrestigeState.prestigeUpgrades[i];
    
    if (currentUpgrade.id !== lastUpgrade.id || 
        currentUpgrade.level !== lastUpgrade.level) {
      return true;
    }
  }
  
  return false;
}

function updatePrestigeStateCache() {
  lastPrestigeState = {
    fragments: gameState.fragments || 0,
    prestigeUpgrades: gameState.prestigeUpgrades ? 
      JSON.parse(JSON.stringify(gameState.prestigeUpgrades)) : []
  };
}

function updatePrestigeUI() {
  const ownPlayer = gameState.players?.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  const fragmentsCount = document.getElementById('fragments-count');
  const potentialFragments = document.getElementById('potential-fragments');
  
  if (fragmentsCount) {
    fragmentsCount.textContent = formatNumber(gameState.fragments || 0);
  }
  
  if (potentialFragments) {
    const reward = calculatePrestigeReward(ownPlayer.level || 1);
    potentialFragments.textContent = formatNumber(reward);
  }
}

function calculatePrestigeReward() {
  const base = Math.floor(gameState.teamLevel / 10);
  const fragmentMultiplierUpgrade = gameState.prestigeUpgrades?.find(u => u.id === 'fragment-multiplier');
  
  // Calcular o multiplicador corretamente
  const multiplier = fragmentMultiplierUpgrade ? 
    (1 + fragmentMultiplierUpgrade.level * 0.2) : 1; // usa a mesma fórmula do prestigeUpgrades.js
  
  return Math.max(1, Math.floor(base * multiplier));
}

function renderSkillTree() {
  if (!skillTree || !gameState?.prestigeUpgrades) return;

  // Clear previous nodes and connections
  skillTree.innerHTML = '';
  skillNodes = [];
  skillConnections = [];

  // Create central node
  const centralNode = createSkillNode({
    id: 'central',
    name: 'Centro de Poder',
    description: 'O centro da sua árvore de habilidades',
    x: 0,
    y: 0,
    isCentral: true
  });
  
  // Calculate positions for each upgrade node
  const totalUpgrades = gameState.prestigeUpgrades.length;
  const radius = 300; // Increased distance from center for better visibility
  
  // Group upgrades by type for better organization
  const upgradesByType = groupUpgradesByType(gameState.prestigeUpgrades);
  
  // Create nodes for each upgrade type
  let angleOffset = 0;
  Object.entries(upgradesByType).forEach(([type, upgrades], typeIndex) => {
    const typeAngle = (2 * Math.PI / Object.keys(upgradesByType).length) * typeIndex;
    const typeRadius = radius * 0.6; // Slightly closer to center
    
    // Create type node if there are multiple upgrades of this type
    if (upgrades.length > 1) {
      const typeNodeX = Math.cos(typeAngle) * typeRadius;
      const typeNodeY = Math.sin(typeAngle) * typeRadius;
      
      const typeNode = createSkillNode({
        id: `type-${type}`,
        name: getTypeName(type),
        description: `Categoria de upgrades: ${getTypeName(type)}`,
        x: typeNodeX,
        y: typeNodeY,
        isType: true
      });
      
      // Connect type node to central node
      createConnection(centralNode, typeNode);
      
      // Create upgrade nodes around the type node
      upgrades.forEach((upgrade, i) => {
        const upgradeAngle = typeAngle + (i - (upgrades.length - 1) / 2) * (Math.PI / 8);
        const upgradeRadius = radius;
        
        const x = Math.cos(upgradeAngle) * upgradeRadius;
        const y = Math.sin(upgradeAngle) * upgradeRadius;
        
        // For multi-level upgrades, create multiple nodes in a line
        if (upgrade.maxLevel > 1) {
          createMultiLevelNodes(upgrade, x, y, upgradeAngle, typeNode);
        } else {
          const node = createSkillNode({
            ...upgrade,
            x,
            y
          });
          
          // Connect to type node
          createConnection(typeNode, node);
        }
      });
    } else if (upgrades.length === 1) {
      // If only one upgrade of this type, connect directly to central node
      const upgrade = upgrades[0];
      const x = Math.cos(typeAngle) * radius;
      const y = Math.sin(typeAngle) * radius;
      
      if (upgrade.maxLevel > 1) {
        createMultiLevelNodes(upgrade, x, y, typeAngle, centralNode);
      } else {
        const node = createSkillNode({
          ...upgrade,
          x,
          y
        });
        
        // Connect to central node
        createConnection(centralNode, node);
      }
    }
  });
  
  // Add all nodes and connections to the DOM
  skillConnections.forEach(conn => skillTree.appendChild(conn.element));
  skillNodes.forEach(node => skillTree.appendChild(node.element));
  
  // Add subtle animation to nodes
  skillNodes.forEach((node, index) => {
    if (node.element) {
      node.element.style.opacity = '0';
      node.element.style.transform = 'scale(0.5)';
      
      setTimeout(() => {
        node.element.style.transition = 'all 0.5s ease';
        node.element.style.opacity = '1';
        node.element.style.transform = '';
      }, 50 * index);
    }
  });
}

function createMultiLevelNodes(upgrade, startX, startY, angle, parentNode) {
  // Increase the spacing between level nodes (was 80)
  const levelSpacing = 120; // More space between level nodes
  const direction = {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
  
  let prevNode = parentNode;
  
  // Create a node for each level
  for (let level = 1; level <= upgrade.maxLevel; level++) {
    const x = startX + direction.x * (level - 1) * levelSpacing;
    const y = startY + direction.y * (level - 1) * levelSpacing;
    
    // Criar um objeto de upgrade específico para este nível
    const levelUpgrade = {
      ...upgrade,
      id: `${upgrade.id}-level-${level}`, // ID único para cada nível
      originalId: upgrade.id, // Manter o ID original para referência
      name: `${upgrade.name} ${level}`,
      currentLevel: upgrade.level, // The overall upgrade level
      targetLevel: level, // The specific level this node represents
      originalMaxLevel: upgrade.maxLevel // Manter referência ao nível máximo original
    };
    
    const node = createSkillNode({
      ...levelUpgrade,
      x,
      y
    });
    
    // Connect to previous node
    createConnection(prevNode, node);
    prevNode = node;
  }
}

function createSkillNode(data) {
  const { id, name, description, x, y, isCentral, isType } = data;
  
  const nodeElement = document.createElement('div');
  nodeElement.className = `skill-node ${isCentral ? 'central-node' : ''}`;
  nodeElement.style.left = `${x}px`;
  nodeElement.style.top = `${y}px`;
  
  // Aplicar estilo específico para o nó central
  if (isCentral) {
    nodeElement.style.border = '4px solid #8b00ff';
  }
  
  // Determine node status
  let nodeStatus = 'locked';
  let nodeIcon = '🔒';
  
  if (isCentral) {
    nodeStatus = 'central';
    nodeIcon = '🔮';
  } else if (isType) {
    nodeStatus = 'type';
    nodeIcon = '📚';
  } else {
    const upgrade = data;
    const canAfford = (gameState.fragments || 0) >= calculateUpgradePrice(upgrade);
    
    // For multi-level upgrades
    if (upgrade.targetLevel) {
      // Check if this specific level is already purchased
      if (upgrade.currentLevel >= upgrade.targetLevel) {
        // Verificar se é o último nível do upgrade
        /*if (upgrade.targetLevel === (upgrade.originalMaxLevel || upgrade.maxLevel)) {
          nodeStatus = 'maxed';
          nodeIcon = '✨';
        } else {*/
          nodeStatus = 'purchased';
          nodeIcon = '✅';
        //}
      } 
      // Check if this level is the next one to purchase (previous level is purchased)
      else if (upgrade.currentLevel === upgrade.targetLevel - 1) {
        if (canAfford) {
          nodeStatus = 'available';
          nodeIcon = '💰';
        } else {
          nodeStatus = 'unlocked';
          nodeIcon = '🔓';
        }
      }
      // Check if this is the first level and it's not purchased yet
      else if (upgrade.targetLevel === 1) {
        if (canAfford) {
          nodeStatus = 'available';
          nodeIcon = '💰';
        } else {
          nodeStatus = 'unlocked';
          nodeIcon = '🔓';
        }
      }
      // All other levels should be locked until their previous level is purchased
      else {
        nodeStatus = 'locked';
        nodeIcon = '🔒';
      }
    } 
    // For regular upgrades
    else {
      if (upgrade.level > 0) {
        nodeStatus = 'purchased';
        nodeIcon = '✅';
      } else if (canAfford) {
        nodeStatus = 'available';
        nodeIcon = '💰';
      } else {
        // Verificar se o upgrade está disponível mas o jogador não tem fragmentos suficientes
        nodeStatus = 'unlocked';
        nodeIcon = '🔓';
      }
    }
  }
  
  nodeElement.classList.add(nodeStatus);
  
  // Add node content
  nodeElement.innerHTML = `
    <div class="node-icon">${nodeIcon}</div>
  `;
  
  // Add event listeners
  nodeElement.addEventListener('mouseenter', (e) => {
    showSkillTooltip(e, data);
  });
  
  nodeElement.addEventListener('mouseleave', () => {
    if (skillTooltip) {
      skillTooltip.classList.remove('visible');
    }
  });
  
  nodeElement.addEventListener('click', () => {
    handleNodeClick(id);
  });
  
  // Store node data
  const nodeData = {
    id,
    element: nodeElement,
    x,
    y,
    status: nodeStatus,
    targetLevel: data.targetLevel,
    originalMaxLevel: data.originalMaxLevel,
    originalId: data.originalId
  };
  
  skillNodes.push(nodeData);
  return nodeData;
}

function createConnection(fromNode, toNode) {
  // Node size in pixels (from CSS)
  const nodeSize = 80;
  const nodeRadius = nodeSize / 2;

  // Calculate center points of nodes
  const fromX = fromNode.x + nodeRadius;
  const fromY = fromNode.y + nodeRadius;
  const toX = toNode.x + nodeRadius;
  const toY = toNode.y + nodeRadius;
  
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  
  const connection = document.createElement('div');
  connection.className = 'skill-connection';
  
  // Set connection status based on nodes
  if (toNode.status === 'maxed' || toNode.status === 'purchased' || toNode.status === 'available') {
    connection.classList.add('active');
  } else if (toNode.status === 'unlocked') {
    connection.classList.add('unlocked');
  }
  
  // Position and rotate the connection
  connection.style.width = `${distance}px`;
  connection.style.left = `${fromX}px`;
  connection.style.top = `${fromY}px`;
  connection.style.transform = `rotate(${angle}deg)`;
  
  const connectionData = {
    element: connection,
    from: fromNode.id,
    to: toNode.id
  };
  
  skillConnections.push(connectionData);
  return connectionData;
}

function showSkillTooltip(event, data) {
  if (!skillTooltip) return;
  
  const { name, description, isCentral, isType } = data;
  
  let tooltipContent = `<h3>${name}</h3><p>${description}</p>`;
  
  if (!isCentral && !isType) {
    const upgrade = data;
    const price = calculateUpgradePrice(upgrade);
    const maxedOut = upgrade.currentLevel >= upgrade.maxLevel || 
                     (upgrade.targetLevel && upgrade.currentLevel >= upgrade.targetLevel);
    
    if (!maxedOut) {
      tooltipContent += `<p class="cost">Custo: ${formatNumber(price)} 🔮</p>`;
    }
  }
  
  skillTooltip.innerHTML = tooltipContent;
  
  // Position tooltip near the mouse but within viewport
  const tooltipRect = skillTooltip.getBoundingClientRect();
  const containerRect = skillTreeContainer.getBoundingClientRect();
  
  let left = event.clientX - containerRect.left + 15;
  let top = event.clientY - containerRect.top + 15;
  
  // Adjust if tooltip would go outside container
  if (left + tooltipRect.width > containerRect.width) {
    left = event.clientX - containerRect.left - tooltipRect.width - 15;
  }
  
  if (top + tooltipRect.height > containerRect.height) {
    top = event.clientY - containerRect.top - tooltipRect.height - 15;
  }
  
  skillTooltip.style.left = `${left}px`;
  skillTooltip.style.top = `${top}px`;
  skillTooltip.classList.add('visible');
}

function hideSkillTooltip() {
  if (skillTooltip) {
    skillTooltip.classList.remove('visible');
  }
}

function calculateUpgradePrice(upgrade) {
  if (!upgrade) return 0;
  
  // Para upgrades multi-nível, usar targetLevel
  if (upgrade.targetLevel) {
    return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.targetLevel - 1));
  }
  
  // Para upgrades regulares, calcular o preço para o próximo nível
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffect(upgrade) {
  const level = upgrade.currentLevel;
  if (typeof upgrade.effect === 'function') {
    return upgrade.effect(level);
  }
  return level;
}

function getNextUpgradeEffect(upgrade) {
  const nextLevel = upgrade.targetLevel ? upgrade.targetLevel : upgrade.currentLevel + 1;
  if (typeof upgrade.effect === 'function') {
    return upgrade.effect(nextLevel);
  }
  return nextLevel;
}

function formatEffect(upgradeId, effect) {
  if (upgradeId === 'fragment-multiplier') {
    return `x${effect.toFixed(1)}`;
  } else if (upgradeId === 'powerups-unlock') {
    return effect ? 'Desbloqueado' : 'Bloqueado';
  }
  return `x${effect.toFixed(1)}`;
}

function groupUpgradesByType(upgrades) {
  const types = {};
  
  upgrades.forEach(upgrade => {
    const type = getUpgradeType(upgrade.id);
    if (!types[type]) {
      types[type] = [];
    }
    types[type].push(upgrade);
  });
  
  return types;
}

function getUpgradeType(id) {
  if (id.includes('fragment')) return 'fragment';
  if (id.includes('powerups')) return 'powerup';
  return 'misc';
}

function getTypeName(type) {
  const typeNames = {
    'fragment': 'Fragmentos',
    'powerup': 'Power-Ups',
    'misc': 'Diversos'
  };
  
  return typeNames[type] || 'Outros';
}

// Função para atualizar o status dos nós após uma compra
function updateSkillTreeNodes() {
  // Obter o jogador atual
  const player = gameState.players?.find(p => p.id === socket.id);
  if (!player) return;
  
  console.log("Atualizando nós da árvore de habilidades...");
  
  // Agora, atualize o status visual de cada nó
  skillNodes.forEach(node => {
    if (!node.element) return;
    
    // Pular nós centrais e de tipo
    if (node.status === 'central' || node.status === 'type') return;
    
    // Use o ID original se disponível
    const upgradeId = node.originalId || node.id;
    const upgrade = gameState.prestigeUpgrades?.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    // Determinar o novo status do nó
    let newStatus = 'locked';
    let nodeIcon = '🔒';
    
    const canAfford = (gameState.fragments || 0) >= calculateUpgradePrice(upgrade);
    
    // Para upgrades multi-nível
    if (node.targetLevel) {
      // Verificar se este nível específico já foi comprado
      if (upgrade.level >= node.targetLevel) {
        // Verificar se é o último nível do upgrade
        /*if (node.targetLevel === (node.originalMaxLevel || upgrade.maxLevel)) {
          newStatus = 'maxed';
          nodeIcon = '✨';
        } else {*/
          newStatus = 'purchased';
          nodeIcon = '✅';
        //}
      } 
      // Verificar se este é o próximo nível a ser comprado (nível anterior foi comprado)
      else if (upgrade.level === node.targetLevel - 1) {
        if (canAfford) {
          newStatus = 'available';
          nodeIcon = '💰';
        } else {
          newStatus = 'unlocked';
          nodeIcon = '🔓';
        }
      }
      // Verificar se este é o primeiro nível e ainda não foi comprado
      else if (node.targetLevel === 1) {
        if (canAfford) {
          newStatus = 'available';
          nodeIcon = '💰';
        } else {
          newStatus = 'unlocked';
          nodeIcon = '🔓';
        }
      }
      // Todos os outros níveis devem estar bloqueados até que o nível anterior seja comprado
      else {
        newStatus = 'locked';
        nodeIcon = '🔒';
      }
    } 
    // Para upgrades regulares
    else {
      /*const maxedOut = upgrade.level >= upgrade.maxLevel;
      
      if (maxedOut) {
        newStatus = 'maxed';
        nodeIcon = '✨';
      } else*/ if (upgrade.level > 0) {
        newStatus = 'purchased';
        nodeIcon = '✅';
      } else if (canAfford) {
        newStatus = 'available';
        nodeIcon = '💰';
      } else {
        // Verificar se o upgrade está disponível mas o jogador não tem fragmentos suficientes
        newStatus = 'unlocked';
        nodeIcon = '🔓';
      }
    }
    
    // Atualizar o status do nó se for diferente
    if (node.status !== newStatus) {
      console.log(`Atualizando nó ${node.id} de ${node.status} para ${newStatus}`);
      node.element.classList.remove(node.status);
      node.element.classList.add(newStatus);
      node.status = newStatus;
      
      // Atualizar o ícone
      const iconElement = node.element.querySelector('.node-icon');
      if (iconElement) {
        iconElement.textContent = nodeIcon;
      }
      
      // Atualizar as conexões relacionadas a este nó
      updateNodeConnections(node);
    }
  });
}

function updateNodeConnections(node) {
  // Atualizar todas as conexões que têm este nó como destino
  skillConnections.forEach(conn => {
    if (conn.to === node.id) {
      const connection = conn.element;
      if (!connection) return;
      
      // Remover classes existentes
      connection.classList.remove('maxed', 'active', 'unlocked');
      
      // Adicionar classe com base no status do nó
      if (node.status === 'maxed' || node.status === 'purchased' || node.status === 'available') {
        connection.classList.add('active');
      } else if (node.status === 'unlocked') {
        connection.classList.add('unlocked');
      }
    }
  });
}

function handleNodeClick(nodeId) {
  const player = gameState.players?.find(p => p.id === socket.id);
  if (!player || !isOwnPlayer()) return;
  
  const node = skillNodes.find(n => n.id === nodeId);
  if (!node) return;
  
  // Use o ID original se disponível, caso contrário use o ID do nó
  const upgradeId = node.originalId || node.id;
  const upgrade = gameState.prestigeUpgrades.find(u => u.id === upgradeId);
  if (!upgrade) return;
  
  console.log(`Clique no nó ${nodeId}, status: ${node.status}, targetLevel: ${node.targetLevel}`);
  
  // Verificar se o nó está disponível para compra
  if (node.status !== 'available') {
    if (node.status === 'locked') {
      showNotification('Este upgrade está bloqueado! Complete os upgrades anteriores primeiro.', 'info');
    } else if (node.status === 'purchased') {
      // Verificar se atingiu o nível máximo
      const isMaxLevel = node.targetLevel === (node.originalMaxLevel || upgrade.maxLevel) || 
                         (!node.targetLevel && upgrade.level >= upgrade.maxLevel);
      
      if (isMaxLevel) {
        showNotification('Este upgrade já está no nível máximo!', 'info');
      } else {
        showNotification('Este upgrade já foi comprado!', 'info');
      }
    } else if (node.status === 'unlocked') {
      showNotification('Fragmentos insuficientes para comprar este upgrade!', 'error');
    }
    return;
  }
  
  // Para upgrades multi-nível
  if (node.targetLevel) {
    const targetLevel = node.targetLevel;
    const price = calculateUpgradePrice({...upgrade, targetLevel: targetLevel});
    
    console.log(`Tentando comprar nível ${targetLevel} do upgrade ${upgradeId}, preço: ${price}, fragmentos: ${gameState.fragments}`);
    
    if (gameState.fragments >= price) {
      socket.emit('buyPrestigeUpgrade', upgradeId, targetLevel);
      playSound(tickSound);
      
      // Mostrar animação de compra
      const nodeElement = node.element;
      nodeElement.classList.add('purchasing');
      setTimeout(() => {
        nodeElement.classList.remove('purchasing');
      }, 500);
    } else {
      showNotification('Fragmentos insuficientes!', 'error');
    }
  } else {
    // Para upgrades regulares
    const price = calculateUpgradePrice(upgrade);
    
    if (gameState.fragments >= price) {
      socket.emit('buyPrestigeUpgrade', upgradeId);
      playSound(tickSound);
      
      // Mostrar animação de compra
      const nodeElement = node.element;
      nodeElement.classList.add('purchasing');
      setTimeout(() => {
        nodeElement.classList.remove('purchasing');
      }, 500);
    } else {
      showNotification('Fragmentos insuficientes!', 'error');
    }
  }
}