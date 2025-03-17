import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';
import { formatNumber } from './UtilsModule.js';

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
        renderSkillTree();
      }
      updatePrestigeStateCache();
    }
  });

  openPrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when overlay is active
    updatePrestigeUI();
    renderSkillTree();
    centerSkillTree();
    
    // Add entrance animation
    skillTreeContainer.style.opacity = '0';
    fixedPrestigeInfo.style.transform = 'translateY(50px)';
    fixedPrestigeInfo.style.opacity = '0';
    
    setTimeout(() => {
      skillTreeContainer.style.transition = 'opacity 0.5s ease';
      skillTreeContainer.style.opacity = '1';
      
      setTimeout(() => {
        fixedPrestigeInfo.style.transition = 'all 0.5s ease';
        fixedPrestigeInfo.style.transform = 'translateY(0)';
        fixedPrestigeInfo.style.opacity = '1';
      }, 200);
    }, 100);
  });

  closePrestigeBtn.addEventListener('click', () => {
    // Add exit animation
    skillTreeContainer.style.opacity = '0';
    fixedPrestigeInfo.style.transform = 'translateY(50px)';
    fixedPrestigeInfo.style.opacity = '0';
    
    setTimeout(() => {
      prestigeOverlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
      
      // Reset styles for next opening
      setTimeout(() => {
        skillTreeContainer.style.transition = '';
        skillTreeContainer.style.opacity = '';
        fixedPrestigeInfo.style.transition = '';
        fixedPrestigeInfo.style.transform = '';
        fixedPrestigeInfo.style.opacity = '';
      }, 500);
    }, 300);
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
  
  // Add home button event listener
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
  // Ignora se o estado do jogo ainda não está disponível
  if (!gameState) return false;

  // Verifica mudanças nos fragments
  if ((gameState.fragments || 0) !== lastPrestigeState.fragments) {
    return true;
  }

  // Verifica mudanças nos prestigeUpgrades
  const currentUpgrades = gameState.prestigeUpgrades || [];
  if (currentUpgrades.length !== lastPrestigeState.prestigeUpgrades.length) {
    return true;
  }

  // Verifica se algum upgrade mudou de nível
  return currentUpgrades.some((upgrade, index) => {
    const lastUpgrade = lastPrestigeState.prestigeUpgrades[index];
    return !lastUpgrade || upgrade.level !== lastUpgrade.level;
  });
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
  const levelSpacing = 100; // Space between level nodes
  const direction = {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
  
  let prevNode = parentNode;
  
  // Create a node for each level
  for (let level = 1; level <= upgrade.maxLevel; level++) {
    const distance = level * levelSpacing;
    const x = startX + direction.x * (level - 1) * 80;
    const y = startY + direction.y * (level - 1) * 80;
    
    const levelUpgrade = {
      ...upgrade,
      name: `${upgrade.name} ${level}`,
      level: Math.min(upgrade.level, level),
      maxLevel: 1, // Each node represents one level
      currentLevel: upgrade.level,
      targetLevel: level
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
  
  // Determine node status
  let nodeStatus = 'locked';
  let nodeIcon = '🔒';
  
  if (isCentral) {
    nodeStatus = 'central';
    nodeIcon = '⭐';
  } else if (isType) {
    nodeStatus = 'type';
    nodeIcon = '📚';
  } else {
    const upgrade = data;
    const canAfford = (gameState.fragments || 0) >= calculateUpgradePrice(upgrade);
    const maxedOut = upgrade.currentLevel >= upgrade.maxLevel || 
                     (upgrade.targetLevel && upgrade.currentLevel >= upgrade.targetLevel);
    
    if (maxedOut) {
      nodeStatus = 'maxed';
      nodeIcon = '✨';
    } else if (upgrade.currentLevel > 0) {
      nodeStatus = 'purchased';
      nodeIcon = '✅';
    } else if (canAfford) {
      nodeStatus = 'available';
      nodeIcon = '💰';
    } else {
      nodeIcon = '🔒';
    }
    
    nodeElement.classList.add(nodeStatus);
  }
  
  // Create node content
  nodeElement.innerHTML = `
    <div class="skill-node-icon">${nodeIcon}</div>
    ${!isCentral && !isType && data.currentLevel > 0 ? 
      `<div class="skill-node-level">${data.currentLevel}</div>` : ''}
  `;
  
  // Add event listeners for tooltip and click
  nodeElement.addEventListener('mouseenter', (e) => {
    showSkillTooltip(e, data);
  });
  
  nodeElement.addEventListener('mouseleave', () => {
    hideSkillTooltip();
  });
  
  if (!isCentral && !isType) {
    nodeElement.addEventListener('click', () => {
      if (nodeStatus === 'locked' || nodeStatus === 'maxed') return;
      
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      
      // Add click animation
      nodeElement.classList.add('node-clicked');
      setTimeout(() => nodeElement.classList.remove('node-clicked'), 300);
      
      // For multi-level upgrades, we need to specify the target level
      if (data.targetLevel) {
        // Only allow buying if all previous levels are purchased
        if (data.currentLevel >= data.targetLevel - 1) {
          socket.emit('buyPrestigeUpgrade', data.id, data.targetLevel);
        } else {
          showNotification('Você precisa comprar os níveis anteriores primeiro!');
        }
      } else {
        socket.emit('buyPrestigeUpgrade', data.id);
      }
    });
  }
  
  // Store node data for later reference
  const nodeData = {
    element: nodeElement,
    id,
    x,
    y,
    status: nodeStatus
  };
  
  skillNodes.push(nodeData);
  return nodeData;
}

function createConnection(fromNode, toNode) {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  
  const connection = document.createElement('div');
  connection.className = 'skill-connection';
  
  // Set connection status based on nodes
  if (toNode.status === 'maxed') {
    connection.classList.add('maxed');
  } else if (toNode.status === 'purchased' || toNode.status === 'available') {
    connection.classList.add('active');
  }
  
  // Position and rotate the connection
  connection.style.width = `${distance}px`;
  connection.style.left = `${fromNode.x}px`;
  connection.style.top = `${fromNode.y}px`;
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
    const currentEffect = getUpgradeEffect(upgrade);
    const nextEffect = getNextUpgradeEffect(upgrade);
    const maxedOut = upgrade.currentLevel >= upgrade.maxLevel || 
                     (upgrade.targetLevel && upgrade.currentLevel >= upgrade.targetLevel);
    
    tooltipContent += `
      <p class="level">Nível: ${upgrade.currentLevel}${upgrade.targetLevel ? `/${upgrade.targetLevel}` : `/${upgrade.maxLevel}`}</p>
      <p class="effect">Efeito atual: ${formatEffect(upgrade.id, currentEffect)}</p>
      ${!maxedOut ? `<p class="effect">Próximo efeito: ${formatEffect(upgrade.id, nextEffect)}</p>` : ''}
      ${!maxedOut ? `<p class="cost">Custo: ${formatNumber(price)} 🔮</p>` : ''}
    `;
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
  const level = upgrade.targetLevel ? upgrade.targetLevel : upgrade.level + 1;
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, level - 1));
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