import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification, showMergeTip } from './UIModule.js';

export const openCharacterSelectionBtn = document.getElementById('open-character-selection');
export const closeCharacterSelectionBtn = document.getElementById('close-character-selection');
export const characterSelectionOverlay = document.getElementById('character-selection-overlay');
export const characterSelectionContent = document.getElementById('character-selection-content');
export const selectCharacterButton = document.getElementById('character-select-button');
export const inventoryToggle = document.getElementById('inventory-toggle');
export const inventoryGrid = document.getElementById('inventory-grid');
export const trashZone = document.getElementById('trash-zone');

// Character types now come from the server via gameState
// We'll provide a function to access them
function getCharacterTypes() {
  return gameState.characterTypes || {};
}

// Helper to get a specific character type
function getCharacterType(type) {
  const types = getCharacterTypes();
  return types[type] || null;
}

// Current selected character
let selectedCharacterType = null;
let characterCards;
let characterContainers;

// Definir uma variável global para armazenar informações do item sendo arrastado
let currentDraggedItem = null;

// Definir uma variável global para controlar o estado de tooltip
let tooltipsEnabled = true;

// Definir uma variável para o seletor de tipos de personagem
let characterTypeSelector = document.querySelector('.character-options');

// Variáveis para o sistema de forja
let forgeMode = false;
let selectedForgeItem = null;

export function initCharacterSelection() {
  // Não carrega mais do localStorage - apenas verifica no gameState
  const player = gameState.players?.find(p => p.id === socket.id);
  if (player && player.characterType && getCharacterType(player.characterType)) {
    selectedCharacterType = player.characterType;
  }

  // Inicialmente esconde os containers de personagens
  hideAllCharacterContainers();
  
  // Update stat labels to abbreviations
  updateStatLabels();
  
  // Listen for character types updates from server
  document.addEventListener('characterTypesUpdated', () => {
    // Re-render selection if overlay is active
    if (characterSelectionOverlay.classList.contains('active')) {
      renderCharacterSelection();
    }
  });

  // Add "Select Character" button event
  openCharacterSelectionBtn.addEventListener('click', () => {
    characterSelectionOverlay.classList.add('active');
    
    // Não restauramos mais o layout ao abrir o overlay
    // Mantemos o estado de seleção do personagem conforme estava

    // Solicita atualização dos personagens selecionados ao servidor
    socket.emit('requestCharacterUpdate');
    
    // Solicitar tipos de personagem se ainda não tivermos
    if (!gameState.characterTypes) {
      socket.emit('requestCharacterTypes');
    }
    
    renderCharacterSelection();
    
    // Atualizar o inventário sempre que a tela de personagem for aberta
    renderInventorySlots();
    
    // Mostrar dica de fusão
    showMergeTip();
    
    // Update button text based on current state
    updateSelectButtonText();
    
    // Dispatch event for overlay state change
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: true } }));
  });

  closeCharacterSelectionBtn.addEventListener('click', () => {
    characterSelectionOverlay.classList.remove('active');
    
    // Dispatch event for overlay state change
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
  });

  characterSelectionOverlay.addEventListener('click', (e) => {
    if (e.target === characterSelectionOverlay) {
      characterSelectionOverlay.classList.remove('active');
      
      // Dispatch event for overlay state change
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
    }
  });

  // Toggle inventory expansion
  inventoryToggle.addEventListener('click', () => {
    // Add rotation animation
    inventoryToggle.classList.remove('rotate-animation');
    void inventoryToggle.offsetWidth; // Trigger reflow to restart animation
    inventoryToggle.classList.add('rotate-animation');
    
    const isExpanded = inventoryGrid.classList.toggle('expanded');
    inventoryToggle.textContent = isExpanded ? '▲' : '▼';
    
    // When collapsed, remove padding immediately
    if (!isExpanded) {
      inventoryGrid.style.padding = '0';
    } else {
      // When expanded, reset any inline padding
      inventoryGrid.style.padding = '';
    }
  });

  // Initialize with inventory slots
  renderInventorySlots();
  
  // Make inventory expanded by default
  inventoryGrid.classList.add('expanded');
  inventoryToggle.textContent = '▲';

  // Garantir que o botão existe antes de adicionar o listener
  if (selectCharacterButton) {
    selectCharacterButton.addEventListener('click', () => {
      const player = gameState.players?.find(p => p.id === socket.id);
      const hasCharacter = player && player.characterType;
      
      if (hasCharacter) {
        // If player already has a character, show character selection options
        resetCharacterSelection();
      } else if (selectedCharacterType) {
        // If no character yet but one is selected, save it
        saveSelectedCharacter(selectedCharacterType);
        
        // After clicking the select button, hide non-selected cards with animation
        characterCards.forEach(card => {
          const cardType = card.getAttribute('data-character-type');
          if (cardType !== selectedCharacterType) {
            card.style.opacity = '0';
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        });
        
        // Esconde o card selecionado também usando classes CSS
        const characterOptions = document.querySelector('.character-options');
        if (characterOptions) {
          characterOptions.classList.add('hidden');
        }
        
        // Show notification
        const characterName = getCharacterType(selectedCharacterType)?.name || selectedCharacterType;
        showNotification(`Personagem ${characterName} selecionado!`, 'success');

        // Update button text
        updateSelectButtonText();
        
        // Deixar overlay aberto para que o jogador possa ver os outros personagens
        // Atualiza a exibição para mostrar os personagens dos outros jogadores
        updateOtherPlayersCharacters();
      }
    });
  } else {
    console.error('Select character button not found');
  }

  // Listen for character updates from server
  socket.on('playerCharacterUpdate', (data) => {
    if (data.playerId && data.characterType !== undefined) {
      const player = gameState.players.find(p => p.id === data.playerId);
      if (player) {
        player.characterType = data.characterType;
        
        // Se for o jogador atual, atualiza a variável local
        if (data.playerId === socket.id) {
          selectedCharacterType = data.characterType;
          
          // Solicitar tipos de personagem se ainda não tivermos e recebemos um tipo de personagem
          if (data.characterType && !gameState.characterTypes) {
            socket.emit('requestCharacterTypes');
          }
        }
        
        // Renderiza toda a tela de seleção para garantir que as opções sejam atualizadas
        renderCharacterSelection();
      }
    }
  });

  // Adicionar evento para atualizar o inventário quando gameState for atualizado
  socket.on('gameStateUpdate', (state) => {
    if (characterSelectionOverlay.classList.contains('active')) {
      renderInventorySlots();
    }
  });
  
  // Adicionar evento para atualizar o inventário quando um boss for derrotado
  socket.on('bossResult', (result) => {
    if (result.victory && result.equipmentDrop) {
      // Se a tela de personagem estiver aberta, atualizar imediatamente
      if (characterSelectionOverlay.classList.contains('active')) {
        renderInventorySlots();
      }
    }
  });
  
  // Adicionar evento para quando um item for dropado (evento local)
  document.addEventListener('itemDropped', () => {
    // Se a tela de personagem estiver aberta, atualizar imediatamente
    if (characterSelectionOverlay.classList.contains('active')) {
      renderInventorySlots();
    }
  });

  // Adicionar evento de socket para receber resultado da fusão
  socket.on('mergingResult', (result) => {
    console.log('Resultado da fusão recebido:', result);
    
    if (result.success) {
      console.log('Fusão bem-sucedida! Novo item:', result.newItem);
      // Tocar som de fusão
      const audio = new Audio('/assets/sounds/levelUp.mp3');
      audio.play();
      
      // Mostrar animação de fusão concluída
      showMergeAnimation(result.itemId);
      
      // Atualizar inventário
      renderInventorySlots();
      
      // Mostrar notificação de sucesso
      showNotification(`Fusão concluída! Você criou: ${result.newItem.name}`, 'success');
    } else {
      console.log('Fusão falhou:', result.message);
      // Mostrar mensagem de erro
      showNotification(result.message || 'Falha na fusão de itens', 'error');
    }
  });
  
  // Configurar a zona de lixeira para descartar itens
  setupTrashZone();
  
  // Adicionar evento de socket para receber confirmação de descarte de item
  socket.on('discardResult', (result) => {
    if (result.success) {
      showNotification(`Item descartado com sucesso`, 'success');
      // Forçar uma atualização imediata do inventário
      renderInventorySlots();
      
      // Emitir evento para outros módulos que possam depender do inventário
      document.dispatchEvent(new CustomEvent('inventoryUpdated'));
      
      // Reproduzir som de descarte
      const audio = new Audio('/assets/sounds/trash.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Erro ao reproduzir som:', e));
    } else {
      showNotification(result.message || 'Erro ao descartar item', 'error');
    }
  });

  // Mover a criação do botão de forja para renderInventorySlots
  // para garantir que seja criado quando o inventário estiver visível
  
  // Criar overlay de forja
  createForgeOverlay();
  
  // Listen for forge results from server
  socket.on('forgeResult', handleForgeResult);
}

// Function to hide all character containers
function hideAllCharacterContainers() {
  characterContainers = document.querySelectorAll('.character-container');
  characterContainers.forEach(container => {
    container.style.display = 'none';
  });
}

function renderCharacterSelection() {
  // Add early return if button doesn't exist
  if (!selectCharacterButton) {
    console.error('Select character button not found');
    return;
  }

  characterCards = document.querySelectorAll('.character-card');
  characterContainers = document.querySelectorAll('.character-container');

  // Hide all character containers initially
  hideAllCharacterContainers();
  
  // Update stat labels to abbreviations
  updateStatLabels();
  
  // Hide character layout unless the character is fully selected (saved)
  const characterLayout = document.querySelector('.character-layout');
  if (characterLayout) {
    // Check if player has a saved character in gameState (not just temporarily selected)
    const player = gameState.players.find(p => p.id === socket.id);
    const hasSavedCharacter = player && player.characterType;
    
    if (hasSavedCharacter) {
      characterLayout.classList.add('visible');
      
      // Show only the container of the saved character
      characterContainers.forEach(container => {
        const containerType = container.getAttribute('data-character-type');
        if (containerType === player.characterType) {
          container.style.display = 'flex';
          container.style.opacity = '1';
          
          // Initialize equipment slots with equipped items
          if (player.equipment) {
            renderEquippedItems(player, container);
          }
        } else {
          container.style.display = 'none';
        }
      });
      
      // Hide character options if player has saved character
      const characterOptions = document.querySelector('.character-options');
      if (characterOptions && !characterOptions.classList.contains('hidden')) {
        characterOptions.classList.add('hidden');
      }
      
      // Update button text
      updateSelectButtonText();
    } else {
      // No saved character, show selection options
      characterLayout.classList.remove('visible');
      
      // Show all cards for selection
      characterCards.forEach(card => {
        card.style.display = 'flex';
        card.style.opacity = '1';
      });
      
      // Restore display of character options
      const characterOptions = document.querySelector('.character-options');
      if (characterOptions) {
        characterOptions.classList.remove('hidden');
        characterOptions.style.display = 'flex';
      }
      
      // Highlight the temporarily selected card if any
      if (selectedCharacterType) {
        characterCards.forEach(card => {
          const cardType = card.getAttribute('data-character-type');
          if (cardType === selectedCharacterType) {
            card.classList.add('selected');
          } else {
            card.classList.remove('selected');
          }
        });
      }
      
      // Update button text
      updateSelectButtonText();
    }
  }

  // Adicionar eventos de clique aos cards APÓS atualizar a exibição
  // para garantir que todos os cards disponíveis tenham o evento
  addClickEventsToCards();

  // Update Select button state
  updateSelectButtonState();
  
  // Atualiza a exibição dos personagens dos outros jogadores
  updateOtherPlayersCharacters();
  
  // Setup equipment slots for drag and drop
  setupEquipmentSlots();
  
  // Atualizar tooltips dos personagens
  updateCharacterTooltips();
}

// Função separada para adicionar eventos de clique aos cards
function addClickEventsToCards() {
  // Remover eventos antigos primeiro para evitar duplicação
  characterCards.forEach(card => {
    const newCard = card.cloneNode(true);
    if (card.parentNode) {
      card.parentNode.replaceChild(newCard, card);
    }
  });
  
  // Buscar os cards novamente após substituição
  characterCards = document.querySelectorAll('.character-card');
  
  // Adicionar eventos somente aos cards não desabilitados
  characterCards.forEach(card => {
    // Não adicionar evento se já estiver com a classe disabled
    if (!card.classList.contains('disabled')) {
      card.addEventListener('click', () => {
        const characterType = card.getAttribute('data-character-type');
        selectCharacter(characterType);
      });
    }
  });
}

function selectCharacter(characterType) {
  selectedCharacterType = characterType;

  // Update UI to highlight the selected card, but don't show containers yet
  characterCards.forEach(card => {
    const cardType = card.getAttribute('data-character-type');
    
    if (cardType === characterType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
      // Don't hide other cards, just remove selection
    }
  });

  // Update button state
  updateSelectButtonState();
}

function updateSelectButtonState() {
  if (selectedCharacterType) {
    selectCharacterButton.disabled = false;
  } else {
    selectCharacterButton.disabled = true;
  }
}

function saveSelectedCharacter(characterType) {
  // Não salva mais no localStorage
  // selectedCharacterType já está atualizado
  
  // Emit update to server 
  if (socket && isOwnPlayer()) {
    socket.emit('updatePlayerCharacter', {
      characterType: characterType
    });
  }
  
  // Show character layout
  const characterLayout = document.querySelector('.character-layout');
  if (characterLayout) {
    characterLayout.classList.add('visible');
  }
  
  // Atualizar a exibição para mostrar os personagens dos outros jogadores
  updateOtherPlayersCharacters();
}

function renderInventorySlots() {
  inventoryGrid.innerHTML = '';
  
  // Get player's inventory
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player || !player.inventory) {
    // If no inventory yet, create some empty slots
    for (let i = 0; i < 10; i++) {
      createEmptySlot(i);
    }
    return;
  }
  
  // Find newly added items (added in the last 5 seconds)
  const now = Date.now();
  const recentlyAdded = player.inventory
    .filter(item => item.dateObtained && (now - item.dateObtained < 5000))
    .map(item => item.id);
  
  // Verificar se o inventário está cheio
  const inventoryFull = player.inventory.length >= 10;
  
  // Render inventory items (até o limite de 10)
  const itemsToRender = player.inventory.slice(0, 10);
  itemsToRender.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.setAttribute('data-inventory-slot', index);
    slot.setAttribute('data-item-id', item.id);
    slot.setAttribute('data-item-type', item.type);
    slot.setAttribute('data-item-rarity', item.rarity);
    slot.setAttribute('data-item-name', item.name);
    slot.setAttribute('draggable', 'true');
    
    // Style based on rarity
    const rarityColors = {
      normal: '#d4d4d4',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#a855f7',
      legendary: '#facc15'
    };
    
    const borderColor = rarityColors[item.rarity] || '#d4d4d4';
    slot.style.borderColor = borderColor;
    slot.style.boxShadow = `0 0 5px ${borderColor}`;
    
    // Highlight new items
    if (recentlyAdded.includes(item.id)) {
      slot.classList.add('new-item');
      // Add animation to highlight new items
      slot.style.animation = 'newItemGlow 2s ease-in-out infinite';
    }
    
    // Add item icon and styling
    const itemIcon = document.createElement('div');
    itemIcon.className = 'item-icon';
    
    // Choose icon based on equipment type
    const icons = {
      sword: '⚔️',
      bow: '🏹',
      staff: '🪄',
      helmet: '🪖',
      armor: '🛡️',
      boots: '👢',
      gloves: '🧤',
      ring: '💍',
      amulet: '📿'
    };
    
    const typeIcon = icons[item.type] || '❓';
    itemIcon.textContent = typeIcon;
    
    slot.appendChild(itemIcon);
    
    const tooltipContent = createTooltipContent(item);
    slot.setAttribute('data-tooltip', tooltipContent);
    
    // Add drag start event
    slot.addEventListener('dragstart', (e) => {
      const itemData = {
        itemId: item.id,
        type: item.type,
        name: item.name,
        rarity: item.rarity,
        slotIndex: index,
        sourceType: 'inventory'
      };
      
      console.log('Iniciando arrasto do item:', {
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        slotIndex: index,
        slot: slot.getAttribute('data-inventory-slot')
      });
      
      // Desabilitar tooltips durante o arrasto
      tooltipsEnabled = false;
      hideAllTooltips();
      
      // Armazenar informações do item que está sendo arrastado
      currentDraggedItem = itemData;
      
      // Serializar os dados e verificar se a conversão foi bem-sucedida
      try {
        const jsonData = JSON.stringify(itemData);
        if (!jsonData) {
          console.error('Falha ao serializar dados do item para arrasto');
          e.preventDefault(); // Cancelar o arrasto se os dados não puderem ser serializados
          return;
        }
        
        // Definir os dados de transferência
        e.dataTransfer.setData('text/plain', jsonData);
        e.dataTransfer.effectAllowed = 'move';
      } catch (error) {
        console.error('Erro ao configurar dataTransfer:', error);
        e.preventDefault(); // Cancelar o arrasto em caso de erro
        return;
      }
      
      slot.classList.add('dragging');
    });
    
    // Add dragend event
    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
      // Reabilitar tooltips após o arrasto
      setTimeout(() => {
        tooltipsEnabled = true;
      }, 100);
    });
    
    // Add dragover event for merging items
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      
      // Impedir arrasto sobre si mesmo
      if (currentDraggedItem && currentDraggedItem.slotIndex === index) {
        return;
      }
      
      // Verificar compatibilidade para fusão
      if (currentDraggedItem && currentDraggedItem.sourceType === 'inventory') {
        const canMerge = item.type === currentDraggedItem.type && 
                          item.name === currentDraggedItem.name && 
                          item.rarity === currentDraggedItem.rarity &&
                          item.rarity !== 'legendary';
        
        if (canMerge) {
          slot.classList.add('merge-valid');
          slot.classList.remove('merge-invalid');
          e.dataTransfer.dropEffect = 'move';
        } else {
          slot.classList.add('merge-invalid');
          slot.classList.remove('merge-valid');
          e.dataTransfer.dropEffect = 'none';
        }
      } else if (currentDraggedItem && currentDraggedItem.sourceType === 'equipment') {
        slot.classList.add('dragover');
        e.dataTransfer.dropEffect = 'move';
      }
    });
    
    // Add dragleave event
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('dragover');
      slot.classList.remove('merge-valid');
      slot.classList.remove('merge-invalid');
    });
    
    // Add drop event for item merging
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('dragover');
      slot.classList.remove('merge-valid');
      slot.classList.remove('merge-invalid');
      
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        
        // Verificar se os dados não estão vazios
        if (!rawData || rawData.trim() === '') {
          console.error('Dados de transferência vazios durante o drop');
          return;
        }
        
        const data = JSON.parse(rawData);
        console.log('Item solto:', data);
        
        // Check if another inventory item was dropped
        if (data.sourceType === 'inventory') {
          // Obter índice do slot atual e do slot arrastado para evitar fundir o mesmo item físico
          const currentSlotIndex = parseInt(slot.getAttribute('data-inventory-slot'));
          const draggedSlotIndex = data.slotIndex;
          
          // VERIFICAÇÃO: Impedir apenas arrastar para o mesmo slot físico
          // Não verificamos IDs de itens, pois queremos permitir fundir itens que são
          // iguais (mesmo tipo, nome e raridade), mesmo que tenham IDs diferentes
          if (currentSlotIndex === draggedSlotIndex) {
            console.log('Tentativa de arrastar item sobre ele mesmo (mesmo slot), ignorando');
            showNotification('Fusão falhou: Não é possível fundir um item consigo mesmo!', 'error');
            return;
          }
          
          // Check if the items are compatible for merging (same type, name, and rarity)
          const isSameType = data.type === item.type;
          const isSameName = data.name === item.name;
          const isSameRarity = data.rarity === item.rarity;
          const isLegendary = item.rarity === 'legendary';
          
          console.log('Verificando compatibilidade para fusão:');
          console.log(`Mesmo tipo: ${isSameType} (${data.type} vs ${item.type})`);
          console.log(`Mesmo nome: ${isSameName} (${data.name} vs ${item.name})`);
          console.log(`Mesma raridade: ${isSameRarity} (${data.rarity} vs ${item.rarity})`);
          console.log(`Lendário: ${isLegendary}`);
          console.log(`Slot origem: ${draggedSlotIndex}, Slot destino: ${currentSlotIndex}`);
          
          // IMPORTANTE: Se os itens têm mesmo tipo, nome e raridade, PERMITIR a fusão
          // mesmo que tenham características semelhantes - isso é ESPERADO para a fusão
          if (isSameType && isSameName && isSameRarity && !isLegendary) {
            console.log('Itens compatíveis, iniciando fusão...');
            // Add animation for merging
            slot.classList.add('merging');
            
            // Emit event to server for handling the merge
            socket.emit('mergeItems', {
              itemId1: item.id,
              itemId2: data.itemId
            });
            console.log('Evento mergeItems emitido:', item.id, data.itemId);
          } else {
            console.log('Itens incompatíveis para fusão');
            // Notificar o usuário se os itens não são compatíveis
            showNotification('Itens incompatíveis para fusão! Precisam ser do mesmo tipo, nome e raridade.', 'error');
          }
        } else if (data.sourceType === 'equipment') {
          // Handle equipment dropping on inventory slot as before
          handleUnequipItem(data.itemId, data.slotType, slot);
        }
      } catch (error) {
        console.error('Erro ao processar drop:', error);
      }
    });
    
    inventoryGrid.appendChild(slot);
  });
  
  // Fill remaining slots with empty slots (if any)
  const remainingSlots = 10 - itemsToRender.length;
  for (let i = 0; i < remainingSlots; i++) {
    createEmptySlot(itemsToRender.length + i);
  }
  
  // Adicionar indicador visual quando o inventário estiver cheio
  if (inventoryFull) {
    const inventorySection = document.querySelector('.inventory-section');
    if (inventorySection) {
      inventorySection.classList.add('inventory-full');
      
      // Verificar se já existe uma mensagem de inventário cheio
      let fullMessage = document.querySelector('.inventory-full-message');
      if (!fullMessage) {
        fullMessage = document.createElement('div');
        fullMessage.className = 'inventory-full-message';
        fullMessage.textContent = '⚠️ Inventário cheio!';
        inventorySection.insertBefore(fullMessage, inventoryGrid);
      }
    }
  } else {
    // Remover indicador visual e mensagem se o inventário não estiver mais cheio
    const inventorySection = document.querySelector('.inventory-section');
    if (inventorySection) {
      inventorySection.classList.remove('inventory-full');
      const fullMessage = document.querySelector('.inventory-full-message');
      if (fullMessage) {
        fullMessage.remove();
      }
    }
  }
  
  // Setup tooltips for inventory slots
  setupTooltips();
  
  return inventoryGrid;
}

function createEmptySlot(index) {
  const slot = document.createElement('div');
  slot.className = 'inventory-slot empty';
  slot.setAttribute('data-inventory-slot', index);
  
  // Create a more visually appealing empty slot indicator
  const emptySlot = document.createElement('span');
  emptySlot.className = 'empty-slot';
  slot.appendChild(emptySlot);
  
  // Add tooltip showing slot number
  slot.setAttribute('title', `Slot ${index+1}`);
  
  // Add drop event to empty inventory slots
  slot.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('text/plain')) {
      slot.classList.add('dragover');
    }
  });
  
  slot.addEventListener('dragleave', () => {
    slot.classList.remove('dragover');
  });
  
  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    slot.classList.remove('dragover');
    
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      
      // Verificar se os dados não estão vazios
      if (!rawData || rawData.trim() === '') {
        console.error('Dados de transferência vazios durante o drop em slot vazio');
        return;
      }
      
      const data = JSON.parse(rawData);
      
      // Only if coming from an equipment slot
      if (data.sourceType === 'equipment') {
        // Find the equipment slot to reset its appearance immediately
        const player = gameState.players.find(p => p.id === socket.id);
        if (player && player.characterType) {
          const characterContainer = document.querySelector(`.character-container[data-character-type="${player.characterType}"]`);
          if (characterContainer) {
            const equipmentSlot = characterContainer.querySelector(`.equipment-slot[data-slot="${data.slotType}"]`);
            if (equipmentSlot) {
              // Reset the slot to its empty state
              equipmentSlot.innerHTML = ''; // Clear contents
              equipmentSlot.className = 'equipment-slot'; // Reset classes
              equipmentSlot.style.borderColor = ''; // Reset border color
              equipmentSlot.style.boxShadow = ''; // Reset shadow
              equipmentSlot.removeAttribute('data-tooltip'); // Remove tooltip
              equipmentSlot.removeAttribute('title'); // Remove title
              equipmentSlot.removeAttribute('draggable'); // Remove draggable
              
              // Add empty slot indicator
              const emptySlot = document.createElement('span');
              emptySlot.className = 'empty-slot';
              equipmentSlot.appendChild(emptySlot);
            }
          }
        }
        
        handleUnequipItem(data.itemId, data.slotType, slot);
      }
    } catch (error) {
      console.error('Erro ao processar drop em slot vazio:', error);
    } finally {
      // Reabilitar tooltips mesmo em caso de erro
      tooltipsEnabled = true;
    }
  });
  
  inventoryGrid.appendChild(slot);
}

function setupEquipmentSlots() {
  const equipmentSlots = document.querySelectorAll('.equipment-slot');
  
  equipmentSlots.forEach(slot => {
    // Clear existing event listeners by cloning
    const newSlot = slot.cloneNode(true);
    if (slot.parentNode) {
      slot.parentNode.replaceChild(newSlot, slot);
    }
    
    // Set up new event listeners
    newSlot.addEventListener('dragover', (e) => {
      e.preventDefault();
      
      // Get the slot type
      const slotType = newSlot.getAttribute('data-slot');
      
      // Try to get data, but it might fail during dragover
      let isValidTarget = false;
      let draggedType = '';
      
      try {
        // We can't actually access dataTransfer data during dragover
        // So we check if it's the right type of data at least
        if (e.dataTransfer.types.includes('text/plain')) {
          // We'll have to assume it's an item for now
          // The full validation happens on drop
          isValidTarget = slotType === 'weapon';
        }
      } catch (error) {
        // This is expected during dragover
      }
      
      // Visual feedback
      if (isValidTarget) {
        newSlot.classList.add('valid-target');
        e.dataTransfer.dropEffect = 'move';
      } else {
        newSlot.classList.add('invalid-target');
        e.dataTransfer.dropEffect = 'none';
      }
    });
    
    newSlot.addEventListener('dragenter', (e) => {
      e.preventDefault();
      const slotType = newSlot.getAttribute('data-slot');
      
      // We can only know if it's valid on drop, but we'll show feedback based on slot type
      if (slotType === 'weapon') {
        newSlot.classList.add('dragover');
      }
    });
    
    newSlot.addEventListener('dragleave', () => {
      newSlot.classList.remove('dragover');
      newSlot.classList.remove('valid-target');
      newSlot.classList.remove('invalid-target');
    });
    
    newSlot.addEventListener('drop', (e) => {
      e.preventDefault();
      newSlot.classList.remove('dragover');
      newSlot.classList.remove('valid-target');
      newSlot.classList.remove('invalid-target');
      
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        
        // Verificar se os dados não estão vazios
        if (!rawData || rawData.trim() === '') {
          console.error('Dados de transferência vazios durante o drop em slot de equipamento');
          return;
        }
        
        const data = JSON.parse(rawData);
        const slotType = newSlot.getAttribute('data-slot');
        
        // Process appropriate drops
        if (data.sourceType === 'inventory') {
          const isWeapon = ['sword', 'bow', 'staff'].includes(data.type);
          
          if (isWeapon && slotType === 'weapon') {
            handleEquipItem(data.itemId, slotType, newSlot);
          } else {
            console.log('Item não pode ser equipado neste slot');
          }
        }
      } catch (error) {
        console.error('Erro ao processar drop em slot de equipamento:', error);
      } finally {
        // Reabilitar tooltips mesmo em caso de erro
        tooltipsEnabled = true;
      }
    });
    
    // For equipped items, allow them to be dragged back to inventory
    // and add click-to-unequip functionality
    if (newSlot.classList.contains('equipped')) {
      const itemIcon = newSlot.querySelector('.item-icon');
      if (itemIcon) {
        newSlot.setAttribute('draggable', 'true');
        
        // Add cursor pointer to indicate it's clickable
        newSlot.style.cursor = 'pointer';
        
        // Add a click event to unequip
        newSlot.addEventListener('click', () => {
          const player = gameState.players.find(p => p.id === socket.id);
          if (!player || !player.equipment) return;
          
          const slotType = newSlot.getAttribute('data-slot');
          const equippedItemId = player.equipment[slotType];
          
          if (equippedItemId) {
            // Find the item to get its name for the console log
            const item = player.inventory.find(item => item.id === equippedItemId);
            const itemName = item ? item.name : equippedItemId;
            
            // Check if we're in a drag operation (to avoid unequipping during drag)
            if (!newSlot.classList.contains('dragging')) {
              // Reset the slot immediately for better user feedback
              newSlot.innerHTML = '';
              newSlot.className = 'equipment-slot';
              newSlot.style.borderColor = '';
              newSlot.style.boxShadow = '';
              newSlot.removeAttribute('data-tooltip');
              newSlot.removeAttribute('title');
              newSlot.removeAttribute('draggable');
              
              // Add empty slot indicator
              const emptySlot = document.createElement('span');
              emptySlot.className = 'empty-slot';
              newSlot.appendChild(emptySlot);
              
              handleUnequipItem(equippedItemId, slotType);
              console.log(`Item ${itemName} desvinculado do slot ${slotType} por clique`);
            }
          }
        });
        
        // Update the dragstart event to track if dragging
        newSlot.addEventListener('dragstart', (e) => {
          const player = gameState.players.find(p => p.id === socket.id);
          if (!player || !player.equipment) return;
          
          const slotType = newSlot.getAttribute('data-slot');
          const equippedItemId = player.equipment[slotType];
          
          if (equippedItemId) {
            // Set a flag to prevent click from triggering during drag operations
            newSlot.classList.add('dragging');
            
            // Desabilitar tooltips durante o arrasto
            tooltipsEnabled = false;
            hideAllTooltips();
            
            const dragData = {
              itemId: equippedItemId,
              slotType: slotType,
              sourceType: 'equipment'
            };
            
            // Armazenar informações do item que está sendo arrastado para referência
            currentDraggedItem = dragData;
            
            try {
              const jsonData = JSON.stringify(dragData);
              if (!jsonData) {
                console.error('Falha ao serializar dados do equipamento para arrasto');
                e.preventDefault();
                return;
              }
              
              e.dataTransfer.setData('text/plain', jsonData);
              e.dataTransfer.effectAllowed = 'move';
            } catch (error) {
              console.error('Erro ao configurar dataTransfer para equipamento:', error);
              e.preventDefault();
              return;
            }
          }
        });
        
        newSlot.addEventListener('dragend', () => {
          newSlot.classList.remove('dragging');
        });
      }
    }
  });
}

function handleEquipItem(itemId, slotType, targetSlot) {
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player || !player.inventory) return;
  
  const item = player.inventory.find(item => item.id === itemId);
  if (!item) {
    console.log('Item não encontrado no inventário');
    return;
  }
  
  // Clear the slot
  targetSlot.innerHTML = '';
  
  // Create icon for the equipment
  const itemIcon = document.createElement('div');
  itemIcon.className = 'item-icon';
  
  // Choose icon based on equipment type
  const icons = {
    sword: '⚔️',
    bow: '🏹',
    staff: '🪄'
  };
  
  itemIcon.textContent = icons[item.type] || '📦';
  
  // Add tooltip with item details
  const rarityColors = {
    normal: '#d4d4d4',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a855f7',
    legendary: '#facc15'
  };
  
  const borderColor = rarityColors[item.rarity] || '#d4d4d4';
  targetSlot.style.borderColor = borderColor;
  targetSlot.style.boxShadow = `0 0 5px ${borderColor}`;
  
  const tooltipContent = `
    <div style="text-align: left; padding: 5px;">
      <div style="color: ${borderColor}; font-weight: bold; margin-bottom: 5px;">${item.name}</div>
      <div>Tipo: ${item.type}</div>
      <div>Nível Requerido: ${item.requiredLevel}</div>
      <div style="margin-top: 5px;">Stats:</div>
      <ul style="margin: 0; padding-left: 15px;">
        ${Object.entries(item.stats).map(([stat, value]) => {
          const formattedValue = value >= 0 ? `+${value * 100}%` : `${value * 100}%`;
          return `<li>${formatStatName(stat)}: ${formattedValue}</li>`;
        }).join('')}
      </ul>
      <div style="margin-top: 8px; color: #ff9800; font-style: italic; text-align: center;">
        Clique para desequipar
      </div>
    </div>
  `;
  
  targetSlot.appendChild(itemIcon);
  targetSlot.setAttribute('data-tooltip', tooltipContent);
  targetSlot.classList.add('equipped');
  targetSlot.setAttribute('draggable', 'true');
  
  // Save equipment to player state
  socket.emit('equipItem', {
    itemId: item.id,
    slot: slotType
  });
  
  console.log(`Equipamento equipado: ${item.name} no slot ${slotType}`);
  
  // Update the tooltips and setup equipment slots for drag and drop
  addTooltipsToSlots();
  setupEquipmentSlots();
}

function handleUnequipItem(itemId, slotType, targetSlot = null) {
  // Find the equipment slot to reset its appearance
  const player = gameState.players.find(p => p.id === socket.id);
  if (player && player.characterType) {
    const characterContainer = document.querySelector(`.character-container[data-character-type="${player.characterType}"]`);
    if (characterContainer) {
      const equipmentSlot = characterContainer.querySelector(`.equipment-slot[data-slot="${slotType}"]`);
      if (equipmentSlot) {
        // Reset the slot to its empty state
        equipmentSlot.innerHTML = ''; // Clear contents
        equipmentSlot.className = 'equipment-slot'; // Reset classes
        equipmentSlot.style.borderColor = ''; // Reset border color
        equipmentSlot.style.boxShadow = ''; // Reset shadow
        equipmentSlot.removeAttribute('data-tooltip'); // Remove tooltip
        equipmentSlot.removeAttribute('title'); // Remove title
        equipmentSlot.removeAttribute('draggable'); // Remove draggable
        
        // Add empty slot indicator
        const emptySlot = document.createElement('span');
        emptySlot.className = 'empty-slot';
        equipmentSlot.appendChild(emptySlot);
      }
    }
  }
  
  // Emit unequip event to server
  socket.emit('unequipItem', {
    itemId: itemId,
    slot: slotType
  });
  
  console.log(`Item ${itemId} desvinculado do slot ${slotType}`);
  
  // Refresh the inventory display
  setTimeout(() => {
    renderInventorySlots();
  }, 100);
}

// Função para esconder todos os tooltips
function hideAllTooltips() {
  // Remover tooltips antigos
  const oldTooltips = document.querySelectorAll('.tooltip-container');
  oldTooltips.forEach(tooltip => {
    tooltip.style.display = 'none';
  });
  
  // Remover tooltips novos
  const newTooltips = document.querySelectorAll('.item-tooltip');
  newTooltips.forEach(tooltip => tooltip.remove());
}

// Modificar a função addTooltipsToSlots para respeitar o estado de tooltipsEnabled
function addTooltipsToSlots() {
  // Remover tooltips antigos
  const oldTooltips = document.querySelectorAll('.tooltip-container');
  oldTooltips.forEach(tooltip => tooltip.remove());
  
  // Aplicar tooltips a todos os slots com data-tooltip
  const slots = document.querySelectorAll('[data-tooltip]');
  
  slots.forEach(slot => {
    slot.addEventListener('mouseenter', (e) => {
      if (!tooltipsEnabled) return; // Não mostrar tooltip se estiverem desabilitados
      
      const content = slot.getAttribute('data-tooltip');
      
      // Criar tooltip container
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip-container';
      tooltip.innerHTML = content;
      
      // Posicionar tooltip próximo ao slot
      document.body.appendChild(tooltip);
      
      const rect = slot.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 10}px`;
      tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      
      // Reposicionar se estiver fora da tela
      const viewportWidth = window.innerWidth;
      const tooltipRight = parseInt(tooltip.style.left) + tooltipRect.width;
      
      if (tooltipRight > viewportWidth) {
        tooltip.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
      }
      
      if (parseInt(tooltip.style.left) < 0) {
        tooltip.style.left = '10px';
      }
    });
    
    slot.addEventListener('mouseleave', () => {
      hideAllTooltips();
    });
  });
}

function formatStatName(stat) {
  const statNames = {
    clickPower: 'Poder de Clique',
    autoClicker: 'Auto Clicker',
    critChance: 'Chance de Crítico',
    coinBonus: 'Bônus de Moedas',
    teamSynergy: 'Sinergia de Equipe',
    doubleHitChance: 'Chance de Acerto Duplo',
    progressBoost: 'Bônus de Progresso',
    prestigeBonus: 'Bônus de Prestígio',
    aoeChance: 'Chance de Efeito em Área',
    powerUpDuration: 'Duração de Power-Ups',
    fragmentBonus: 'Bônus de Fragmentos'
  };
  
  return statNames[stat] || stat;
}

// Get current character info
export function getPlayerCharacter() {
  const player = gameState.players.find(p => p.id === socket.id);
  if (player && player.characterType) {
    const characterType = getCharacterType(player.characterType);
    if (characterType) {
      return {
        type: player.characterType,
        ...characterType
      };
    }
  }
  return null;
}

// Check if player has selected a character
export function hasSelectedCharacter() {
  return selectedCharacterType !== null;
}

// Get character bonus for a specific stat - now just returns what's in the player object
export function getCharacterBonus(bonusType) {
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player || !player.characterBonuses) return 1;
  
  return player.characterBonuses[bonusType] || 1;
}

// Função para atualizar a visualização de personagens de outros jogadores
function updateOtherPlayersCharacters() {
  // Primeiro, vamos coletar todos os personagens já selecionados pelos jogadores
  const selectedCharacters = {};
  
  gameState.players.forEach(player => {
    if (player.characterType) {
      selectedCharacters[player.characterType] = player.id;
    }
  });
  
  // Lista de todos os tipos de personagens para verificar quais ainda estão disponíveis
  const allCharacterTypes = Object.keys(getCharacterTypes());
  const availableCharacterTypes = allCharacterTypes.filter(type => !selectedCharacters[type]);
  
  // Agora, vamos atualizar a interface para cada jogador
  characterCards = document.querySelectorAll('.character-card');
  characterContainers = document.querySelectorAll('.character-container');
  
  // Get current player
  const currentPlayer = gameState.players.find(p => p.id === socket.id);
  const hasSavedCharacter = currentPlayer && currentPlayer.characterType;
  
  // Para o jogador atual, mostramos todos os personagens incluindo os dele
  // Atualizar a exibição dos containers para mostrar todos os personagens selecionados
  const characterLayout = document.querySelector('.character-layout');
  if (characterLayout) {
    // Ajustar o layout para mostrar múltiplos personagens
    const totalPlayers = Object.keys(selectedCharacters).length;
    if (totalPlayers > 0) {
      // Sempre mostrar em grid, independente se o jogador já escolheu ou não
      characterLayout.style.display = 'grid';
      
      // Se houver apenas 1 personagem selecionado, centralize-o
      if (totalPlayers === 1) {
        characterLayout.style.gridTemplateColumns = '1fr';
        characterLayout.style.maxWidth = '400px';
        characterLayout.style.margin = '0 auto';
      } else {
        // Caso contrário, mostre vários personagens em layout de grade
        characterLayout.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        characterLayout.style.gap = '20px';
        characterLayout.style.maxWidth = 'none';
      }
    }
    
    // Mostrar os containers dos personagens selecionados por qualquer jogador
    characterContainers.forEach(container => {
      const containerType = container.getAttribute('data-character-type');
      
      if (selectedCharacters[containerType]) {
        // Este personagem foi selecionado por algum jogador
        // Só mostrar containers se o jogador atual já salvou seu personagem
        if (hasSavedCharacter) {
          container.style.display = 'flex';
          container.style.opacity = '1';
          
          // Adicionar identificação do jogador que selecionou
          const playerId = selectedCharacters[containerType];
          const player = gameState.players.find(p => p.id === playerId);
          
          // Verificar se já existe uma identificação
          let playerLabel = container.querySelector('.player-identifier');
          if (!playerLabel) {
            playerLabel = document.createElement('div');
            playerLabel.className = 'player-identifier';
            container.appendChild(playerLabel);
          }
          
          // Destacar se é o jogador atual
          const isCurrentPlayer = playerId === socket.id;
          
          // Mostrar nome do jogador ao invés do ID
          if (player && player.name) {
            playerLabel.textContent = player.name;
          } else if (isCurrentPlayer) {
            playerLabel.textContent = 'Você';
          } else {
            const playerNumber = gameState.players.findIndex(p => p.id === playerId) + 1;
            playerLabel.textContent = `Jogador ${playerNumber}`;
          }
          
          playerLabel.classList.toggle('current-player', isCurrentPlayer);
        } else {
          // Se o jogador não salvou um personagem, esconde todos os containers
          container.style.display = 'none';
        }
      } else {
        // Este personagem não foi selecionado por nenhum jogador
        container.style.display = 'none';
      }
    });
  }
  
  // Atualizar a disponibilidade de todos os cards de personagens
  if (!hasSavedCharacter) {
    // Limpar primeiro todos os cards
    characterCards.forEach(card => {
      // Resetar o estado visual de todos os cards, mas manter a seleção temporária
      const cardType = card.getAttribute('data-character-type');
      const isTemporarilySelected = cardType === selectedCharacterType;
      
      card.style.display = 'flex'; // Mostrar todos os cards inicialmente
      card.style.opacity = '1';
      card.classList.remove('disabled');
      card.classList.toggle('selected', isTemporarilySelected);
    });
      
    // Depois, desabilitar os personagens já selecionados por outros jogadores
    characterCards.forEach(card => {
      const cardType = card.getAttribute('data-character-type');
        
      if (selectedCharacters[cardType] && selectedCharacters[cardType] !== socket.id) {
        // Este personagem já foi escolhido por outro jogador
        card.classList.add('disabled');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
          
        // Adicionar indicação visual de que está selecionado por outro jogador
        const playerInfo = document.createElement('div');
        playerInfo.className = 'other-player-selection';
          
        // Obter informações do jogador que selecionou o personagem
        const playerId = selectedCharacters[cardType];
        const player = gameState.players.find(p => p.id === playerId);
        
        // Usar o nome do jogador ao invés do número
        if (player && player.name) {
          playerInfo.textContent = `Selecionado por ${player.name}`;
        } else {
          const playerNumber = gameState.players.findIndex(p => p.id === playerId) + 1;
          playerInfo.textContent = `Selecionado por Jogador ${playerNumber}`;
        }
          
        if (!card.querySelector('.other-player-selection')) {
          card.appendChild(playerInfo);
        }
      }
    });
  }
}

// Function to update stat labels to their abbreviated versions
function updateStatLabels() {
  const statLabels = document.querySelectorAll('.character-card .stat-label');
  statLabels.forEach(label => {
    switch(label.textContent) {
      case 'Ataque':
        label.textContent = 'ATK';
        break;
      case 'Defesa':
        label.textContent = 'DEF';
        break;
      case 'Magia':
        label.textContent = 'MAG';
        break;
      case 'Agilidade':
        label.textContent = 'AGI';
        break;
    }
  });
}

// Function to update select button text based on player state
function updateSelectButtonText() {
  if (!selectCharacterButton) {
    console.error('Select character button not found');
    return;
  }

  const player = gameState.players?.find(p => p.id === socket.id);
  const hasCharacter = player && player.characterType;
  
  if (hasCharacter) {
    selectCharacterButton.textContent = 'Trocar Herói';
    selectCharacterButton.disabled = false;
    selectCharacterButton.setAttribute('data-mode', 'change');
  } else {
    selectCharacterButton.textContent = 'Selecionar';
    selectCharacterButton.setAttribute('data-mode', 'select');
    updateSelectButtonState();
  }
}

// Function to reset character selection and show selection options again
function resetCharacterSelection() {
  // Show character selection options
  const characterOptions = document.querySelector('.character-options');
  if (characterOptions) {
    characterOptions.classList.remove('hidden');
    characterOptions.style.display = 'flex';
  }
  
  // Hide character layout
  const characterLayout = document.querySelector('.character-layout');
  if (characterLayout) {
    characterLayout.classList.remove('visible');
  }
  
  // Show all cards for selection
  characterCards.forEach(card => {
    card.style.display = 'flex';
    card.style.opacity = '1';
    card.classList.remove('selected');
  });
  
  // Reset temporary selection
  selectedCharacterType = null;
  
  // Get current player from game state
  const player = gameState.players?.find(p => p.id === socket.id);
  if (player) {
    // Clear player's character
    const previousCharacter = player.characterType;
    player.characterType = null;
    player.characterBonuses = null;
    
    // Notify server about character change
    if (socket && isOwnPlayer()) {
      socket.emit('updatePlayerCharacter', {
        characterType: null
      });
      
      // Show notification about character change
      if (previousCharacter) {
        const characterName = getCharacterType(previousCharacter)?.name || previousCharacter;
        showNotification(`${characterName} removido. Selecione um novo personagem.`, 'info');
      }
    }
  }
  
  // Update button text and state
  updateSelectButtonText();
  
  // Add events to cards
  addClickEventsToCards();
  
  // Update other players' characters display
  updateOtherPlayersCharacters();
}

// Criar o overlay de forja
function createForgeOverlay() {
  // Verificar se já existe
  if (document.querySelector('.forge-overlay')) return;
  
  const forgeOverlay = document.createElement('div');
  forgeOverlay.className = 'forge-overlay';
  
  forgeOverlay.innerHTML = `
    <div class="forge-container">
      <button class="forge-close">✖</button>
      <h2 class="forge-title">Forja de Itens</h2>
      
      <div class="forge-item">
        <div class="forge-item-icon"></div>
        <div class="forge-item-name"></div>
        <div class="forge-item-rarity"></div>
        <div class="forge-stats"></div>
      </div>
      
      <div class="forge-info">
        <div class="forge-chance">
          <span>Chance de Sucesso:</span>
          <span class="forge-chance-value"></span>
        </div>
        <div class="forge-cost">
          <span>Custo:</span>
          <span class="forge-cost-value"></span>
        </div>
      </div>
      
      <div class="forge-result"></div>
      
      <div class="forge-buttons">
        <button class="forge-confirm">Forjar</button>
        <button class="forge-cancel">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(forgeOverlay);
  
  // Adicionar event listeners
  const closeButton = forgeOverlay.querySelector('.forge-close');
  const cancelButton = forgeOverlay.querySelector('.forge-cancel');
  const confirmButton = forgeOverlay.querySelector('.forge-confirm');
  
  closeButton.addEventListener('click', closeForgeOverlay);
  cancelButton.addEventListener('click', closeForgeOverlay);
  confirmButton.addEventListener('click', confirmForge);
  
  // Fechar overlay quando clicar fora do container
  forgeOverlay.addEventListener('click', (e) => {
    if (e.target === forgeOverlay) {
      closeForgeOverlay();
    }
  });
}

// Alterna o modo de forja
function toggleForgeMode() {
  // Buscar inventoryGrid diretamente pelo ID, que é mais confiável
  const inventoryGrid = document.getElementById('inventory-grid');
  const inventoryContainer = document.querySelector('.inventory-container, .inventory-section');
  forgeMode = !forgeMode;
  
  // Verificar se os elementos necessários existem
  if (!inventoryGrid && !inventoryContainer) {
    console.error('Não foi possível encontrar o contêiner de inventário');
    showForgeNotification('Erro ao ativar modo forja: contêiner de inventário não encontrado', 'error');
    return;
  }
  
  // Usar o contêiner que foi encontrado
  const targetContainer = inventoryGrid || inventoryContainer;
  
  if (forgeMode) {
    // Adicionar classe ao contêiner
    targetContainer.classList.add('forge-mode');
    
    // Atualizar aparência do botão de forja (verificar se existe primeiro)
    const forgeButton = document.querySelector('.forge-button');
    if (forgeButton) {
      forgeButton.classList.add('active');
      forgeButton.style.backgroundColor = '#ff5722';
    }
    
    // Adicionar event listeners para os slots de inventário no modo forja
    const inventorySlots = document.querySelectorAll('.inventory-slot:not(.empty)');
    inventorySlots.forEach(slot => {
      slot.addEventListener('click', handleItemForgeClick);
      
      // Garantir que o estilo do cursor seja aplicado diretamente
      slot.style.cursor = 'pointer';
      // Adicionar borda destacada para mostrar que está no modo forja
      slot.style.borderColor = '#ff9800';
      slot.style.boxShadow = '0 0 10px rgba(255, 152, 0, 0.5)';
    });
    
    showForgeNotification('Modo Forja ativado! Clique em um item para forjá-lo.', 'info');
  } else {
    // Remover classe do contêiner
    targetContainer.classList.remove('forge-mode');
    
    // Atualizar aparência do botão de forja (verificar se existe primeiro)
    const forgeButton = document.querySelector('.forge-button');
    if (forgeButton) {
      forgeButton.classList.remove('active');
      forgeButton.style.backgroundColor = '#ff9800';
    }
    
    // Remover event listeners
    const inventorySlots = document.querySelectorAll('.inventory-slot:not(.empty)');
    inventorySlots.forEach(slot => {
      slot.removeEventListener('click', handleItemForgeClick);
      
      // Restaurar o estilo original
      slot.style.cursor = '';
      // Restaurar cores originais com base na raridade do item
      const itemRarity = slot.getAttribute('data-item-rarity');
      if (itemRarity) {
        const rarityColors = {
          normal: '#d4d4d4',
          uncommon: '#4ade80',
          rare: '#60a5fa',
          epic: '#a855f7',
          legendary: '#facc15'
        };
        slot.style.borderColor = rarityColors[itemRarity] || '#d4d4d4';
        slot.style.boxShadow = `0 0 5px ${rarityColors[itemRarity] || '#d4d4d4'}`;
      }
    });
    
    showForgeNotification('Modo Forja desativado!', 'info');
  }
}

// Lidar com o clique em um item durante o modo forja
function handleItemForgeClick(e) {
  if (!forgeMode) return;
  
  const itemId = e.currentTarget.getAttribute('data-item-id');
  if (!itemId) return;
  
  const player = gameState.players?.find(p => p.id === socket.id);
  if (!player || !player.inventory) return;
  
  const item = player.inventory.find(item => item.id === itemId);
  if (!item) return;
  
  // Se for um item lendário, não pode ser forjado
  if (item.rarity === 'legendary') {
    showForgeNotification('Itens Lendários já possuem a raridade máxima!', 'error');
    return;
  }
  
  // Define o item selecionado para forja
  selectedForgeItem = item;
  
  // Exibir dados do item no overlay de forja
  openForgeOverlay(item);
}

// Abrir o overlay de forja com os dados do item
function openForgeOverlay(item) {
  const player = gameState.players?.find(p => p.id === socket.id);
  if (!player) return;
  
  const forgeOverlay = document.querySelector('.forge-overlay');
  
  // Mapear próxima raridade
  const raridadeAtual = item.rarity;
  let proximaRaridade;
  switch (raridadeAtual) {
    case 'normal': proximaRaridade = 'uncommon'; break;
    case 'uncommon': proximaRaridade = 'rare'; break;
    case 'rare': proximaRaridade = 'epic'; break;
    case 'epic': proximaRaridade = 'legendary'; break;
    default: return; // Não deve acontecer
  }
  
  // Mapear chance de sucesso
  let chanceDeSuccesso;
  switch (raridadeAtual) {
    case 'normal': chanceDeSuccesso = '25%'; break;
    case 'uncommon': chanceDeSuccesso = '15%'; break;
    case 'rare': chanceDeSuccesso = '5%'; break;
    case 'epic': chanceDeSuccesso = '0.1%'; break;
    default: chanceDeSuccesso = '0%';
  }
  
  // Calcular custo 
  let custoPercentual;
  switch (raridadeAtual) {
    case 'normal': custoPercentual = 0.30; break;
    case 'uncommon': custoPercentual = 0.35; break;
    case 'rare': custoPercentual = 0.40; break;
    case 'epic': custoPercentual = 0.50; break;
    default: custoPercentual = 0;
  }
  
  // Usar as moedas da equipe para o cálculo
  const teamCoins = gameState.teamCoins || 0;
  const custoEmMoedas = Math.floor(teamCoins * custoPercentual);
  
  // Ícones para os tipos de equipamento
  const icons = {
    sword: '⚔️',
    bow: '🏹',
    staff: '🪄'
  };
  
  // Cores para as raridades
  const rarityColors = {
    normal: '#d4d4d4',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a855f7',
    legendary: '#facc15'
  };
  
  // Nomes das raridades em português
  const rarityNames = {
    normal: 'Normal',
    uncommon: 'Incomum',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário'
  };
  
  // Preencher as informações no overlay
  const iconElement = forgeOverlay.querySelector('.forge-item-icon');
  const nameElement = forgeOverlay.querySelector('.forge-item-name');
  const rarityElement = forgeOverlay.querySelector('.forge-item-rarity');
  const statsElement = forgeOverlay.querySelector('.forge-stats');
  const chanceElement = forgeOverlay.querySelector('.forge-chance-value');
  const costElement = forgeOverlay.querySelector('.forge-cost-value');
  const resultElement = forgeOverlay.querySelector('.forge-result');
  
  // Esconder resultado anterior
  resultElement.style.display = 'none';
  resultElement.classList.remove('forge-success', 'forge-failure');
  
  iconElement.textContent = icons[item.type] || '📦';
  nameElement.textContent = item.name;
  nameElement.style.color = rarityColors[item.rarity];
  
  rarityElement.innerHTML = `
    <span style="color: ${rarityColors[item.rarity]};">${rarityNames[item.rarity]}</span> → 
    <span style="color: ${rarityColors[proximaRaridade]};">${rarityNames[proximaRaridade]}</span>
  `;
  
  // Mostrar stats
  statsElement.innerHTML = `
    <h3>Estatísticas</h3>
    <ul style="list-style: none; padding: 0; margin: 5px 0;">
      ${Object.entries(item.stats).map(([stat, value]) => {
        const formattedValue = value >= 0 ? `+${(value * 100).toFixed(0)}%` : `${(value * 100).toFixed(0)}%`;
        return `<li>${formatStatName(stat)}: ${formattedValue}</li>`;
      }).join('')}
    </ul>
  `;
  
  chanceElement.textContent = chanceDeSuccesso;
  costElement.textContent = `${custoEmMoedas.toLocaleString()} moedas (${(custoPercentual * 100).toFixed(0)}% do total)`;
  
  // Verificar se o jogador tem moedas suficientes
  const confirmButton = forgeOverlay.querySelector('.forge-confirm');
  if (teamCoins < custoEmMoedas) {
    confirmButton.disabled = true;
    confirmButton.textContent = 'Moedas Insuficientes';
    confirmButton.style.backgroundColor = '#777';
  } else {
    confirmButton.disabled = false;
    confirmButton.textContent = 'Forjar';
    confirmButton.style.backgroundColor = '#ff9800';
  }
  
  // Exibir o overlay
  forgeOverlay.style.display = 'flex';
}

// Fechar o overlay de forja
function closeForgeOverlay() {
  const forgeOverlay = document.querySelector('.forge-overlay');
  forgeOverlay.style.display = 'none';
  selectedForgeItem = null;
}

// Confirmar a forja
function confirmForge() {
  if (!selectedForgeItem) return;
  
  // Desativar o botão de confirmação para evitar cliques duplos
  const confirmButton = document.querySelector('.forge-confirm');
  confirmButton.disabled = true;
  confirmButton.textContent = 'Forjando...';
  
  // Mostrar animação de forja
  showForgeAnimation();
  
  // Enviar solicitação de forja para o servidor
  socket.emit('forgeItem', {
    itemId: selectedForgeItem.id
  });
}

// Animação de forja
function showForgeAnimation() {
  // Criar elementos de animação
  const animation = document.createElement('div');
  animation.className = 'forge-animation';
  
  const hammer = document.createElement('div');
  hammer.className = 'forge-hammer';
  hammer.textContent = '🔨';
  
  const sparks = document.createElement('div');
  sparks.className = 'forge-sparks';
  
  animation.appendChild(hammer);
  animation.appendChild(sparks);
  document.body.appendChild(animation);
  
  // Tentar reproduzir o som, mas não bloquear a animação se falhar
  try {
    // Verificar se o arquivo de som existe, se não, usar apenas a animação visual
    const audioPath = '/assets/sounds/hammer.mp3';
    
    // Verificar se o arquivo existe fazendo uma requisição HEAD
    fetch(audioPath, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          const hammerSound = new Audio(audioPath);
          hammerSound.volume = 0.3;
          hammerSound.play().catch(e => console.log('Não foi possível reproduzir o som de forja', e));
        }
      })
      .catch(error => {
        console.log('Arquivo de som não encontrado, prosseguindo com animação visual');
      });
  } catch (error) {
    console.log('Erro ao tentar reproduzir o som:', error);
  }
  
  // Reproduzir sons de pancada
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      // Efeito visual de impacto
      const impact = document.createElement('div');
      impact.className = 'forge-impact';
      impact.style.position = 'absolute';
      impact.style.width = '80px';
      impact.style.height = '80px';
      impact.style.borderRadius = '50%';
      impact.style.backgroundColor = 'rgba(255, 152, 0, 0.3)';
      impact.style.animation = 'impact 0.3s ease-out';
      animation.appendChild(impact);
      
      setTimeout(() => impact.remove(), 300);
    }, i * 350);
  }
  
  // Remover a animação após término
  setTimeout(() => {
    animation.remove();
  }, 1500);
}

// Lidar com o resultado da forja
function handleForgeResult(result) {
  const resultElement = document.querySelector('.forge-result');
  
  if (result.success) {
    // Forja bem-sucedida
    resultElement.textContent = result.message;
    resultElement.classList.add('forge-success');
    resultElement.classList.remove('forge-failure');
    
    // Atualizar o inventário
    setTimeout(() => {
      renderInventorySlots();
      closeForgeOverlay();
    }, 2000);
    
    // Notificar o sucesso
    showForgeNotification(`${result.message} O item foi aprimorado para ${result.newRarity.toUpperCase()}.`, 'success');
  } else {
    // Forja fracassada
    resultElement.textContent = result.message;
    resultElement.classList.add('forge-failure');
    resultElement.classList.remove('forge-success');
    
    // Atualizar o inventário
    setTimeout(() => {
      renderInventorySlots();
      closeForgeOverlay();
    }, 2000);
    
    // Notificar a falha
    if (result.message.includes('destruído')) {
      showForgeNotification(result.message, 'error');
    } else {
      showForgeNotification(result.message, 'warning');
    }
  }
  
  // Exibir o resultado
  resultElement.style.display = 'block';
}

// Substituir a função showNotification atual por uma função privada com nome único
function showForgeNotification(message, type = 'info') {
  // Verificar se já existe uma função global de notificação
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }
  
  // Remover notificações antigas do mesmo tipo para evitar acúmulo
  document.querySelectorAll(`.notification.${type}`).forEach(oldNotification => {
    oldNotification.remove();
  });
  
  // Implementação simplificada caso não exista
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.style.maxWidth = '300px';
  notification.style.animation = 'fadeIn 0.3s ease';
  
  // Definir cores de acordo com o tipo
  switch (type) {
    case 'success':
      notification.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
      notification.style.color = 'white';
      break;
    case 'error':
      notification.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
      notification.style.color = 'white';
      break;
    case 'warning':
      notification.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
      notification.style.color = 'white';
      break;
    default: // info
      notification.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
      notification.style.color = 'white';
  }
  
  // Adicionar ao DOM
  document.body.appendChild(notification);
  
  // Definir a animação e remover após um tempo
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Export the renderInventorySlots function so it can be called from other modules
export { renderInventorySlots };

// New function to render equipped items in equipment slots
function renderEquippedItems(player, container) {
  if (!player.equipment) return;
  
  // Remover tooltips órfãos que possam estar na tela
  document.querySelectorAll('.item-tooltip').forEach(tooltip => {
    tooltip.remove();
  });
  
  // Loop through each equipped item
  Object.entries(player.equipment).forEach(([slotType, itemId]) => {
    // Find the equipment slot in the container
    const equipmentSlot = container.querySelector(`.equipment-slot[data-slot="${slotType}"]`);
    if (!equipmentSlot) return;
    
    // Find the item in the player's inventory
    const item = player.inventory.find(item => item.id === itemId);
    if (!item) return;
    
    // Clear the slot and remove old event listeners using cloning
    const newSlot = equipmentSlot.cloneNode(false);
    if (equipmentSlot.parentNode) {
      equipmentSlot.parentNode.replaceChild(newSlot, equipmentSlot);
    }
    
    // Create icon for the equipment
    const itemIcon = document.createElement('div');
    itemIcon.className = 'item-icon';
    
    // Choose icon based on equipment type
    const icons = {
      sword: '⚔️',
      bow: '🏹',
      staff: '🪄'
    };
    
    itemIcon.textContent = icons[item.type] || '📦';
    
    // Add tooltip with item details
    const rarityColors = {
      normal: '#d4d4d4',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#a855f7',
      legendary: '#facc15'
    };
    
    const borderColor = rarityColors[item.rarity] || '#d4d4d4';
    newSlot.style.borderColor = borderColor;
    newSlot.style.boxShadow = `0 0 5px ${borderColor}`;
    
    const tooltipContent = `
      <div style="text-align: left; padding: 5px;">
        <div style="color: ${borderColor}; font-weight: bold; margin-bottom: 5px;">${item.name}</div>
        <div>Tipo: ${item.type}</div>
        <div>Nível Requerido: ${item.requiredLevel}</div>
        <div style="margin-top: 5px;">Stats:</div>
        <ul style="margin: 0; padding-left: 15px;">
          ${Object.entries(item.stats).map(([stat, value]) => {
            const formattedValue = value >= 0 ? `+${value * 100}%` : `${value * 100}%`;
            return `<li>${formatStatName(stat)}: ${formattedValue}</li>`;
          }).join('')}
        </ul>
        <div style="margin-top: 8px; color: #ff9800; font-style: italic; text-align: center;">
          Clique para desequipar
        </div>
      </div>
    `;
    
    newSlot.appendChild(itemIcon);
    newSlot.setAttribute('data-tooltip', tooltipContent);
    newSlot.classList.add('equipped');
    newSlot.setAttribute('draggable', 'true');
    // Also set a title attribute for native browser tooltip
    newSlot.setAttribute('title', `${item.name} (Clique para desequipar)`);
    
    // Add click event to unequip the item
    newSlot.addEventListener('click', () => {
      // Remover qualquer tooltip existente quando o item for desvinculado
      document.querySelectorAll('.item-tooltip').forEach(tooltip => {
        tooltip.remove();
      });
      
      handleUnequipItem(itemId, slotType);
      console.log(`Item ${item.name} desvinculado do slot ${slotType} por clique`);
    });
  });
  
  // Aplicar tooltips após renderizar todos os itens
  addTooltipsToSlots();
}

// Função para verificar compatibilidade de fusão durante o arrastar
function checkMergeCompatibility(sourceItem, targetItem) {
  if (!sourceItem || !targetItem) return false;
  
  // Verificar se os itens são do mesmo tipo, nome e raridade
  // Essa verificação permite fundir dois itens diferentes que têm as mesmas características
  // É INTENCIONAL permitir fundir itens com IDs diferentes desde que tenham:
  // - Mesmo tipo (ex: espada, arco)
  // - Mesmo nome (ex: "Espada de Fogo")
  // - Mesma raridade (ex: comum, raro)
  const isSameType = sourceItem.type === targetItem.type;
  const isSameName = sourceItem.name === targetItem.name;
  const isSameRarity = sourceItem.rarity === targetItem.rarity;
  
  // Itens lendários não podem ser fundidos
  const isLegendary = targetItem.rarity === 'legendary';
  
  return isSameType && isSameName && isSameRarity && !isLegendary;
}

// Função para mostrar animação de fusão
function showMergeAnimation(itemId) {
  const itemSlot = document.querySelector(`[data-item-id="${itemId}"]`);
  if (itemSlot) {
    itemSlot.classList.add('merge-success');
    setTimeout(() => {
      itemSlot.classList.remove('merge-success');
    }, 2000);
  }
}

// Adicionar estilo de hover para mostrar a classe do personagem no tooltip
function updateCharacterTooltips() {
  characterTypeSelector = document.querySelector('.character-options');
  if (!characterTypeSelector) return;
  
  const characterTypes = characterTypeSelector.querySelectorAll('.character-type');
  characterTypes.forEach(charType => {
    charType.addEventListener('mouseenter', () => {
      if (!tooltipsEnabled) return; // Não mostrar tooltip durante arrasto
      
      const type = charType.getAttribute('data-type');
      const characterInfo = getCharacterType(type);
      if (!characterInfo) return;
      
      // Criar tooltip com as informações do personagem
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip-container';
      tooltip.innerHTML = `
        <h3>${characterInfo.name}</h3>
        <p>${characterInfo.description}</p>
        <div class="character-stats">
          <div><strong>Bônus de Clique:</strong> +${(characterInfo.bonuses.clickPower - 1) * 100}%</div>
          <div><strong>Bônus de Auto-Clicker:</strong> +${(characterInfo.bonuses.autoClicker - 1) * 100}%</div>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      // Posicionar acima do elemento
      const rect = charType.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
    });
    
    charType.addEventListener('mouseleave', () => {
      hideAllTooltips();
    });
  });
}

// Função separada para adicionar o botão de forja
function addForgeButton() {
  // Remover botão existente para evitar duplicatas
  const existingButton = document.querySelector('.forge-button');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Remover também o rótulo existente se houver
  const existingLabel = document.querySelector('.forge-label');
  if (existingLabel) {
    existingLabel.remove();
  }
  
  console.log('Tentando adicionar botão de forja...');
  
  // Localizar o header e a seção de botões
  const headerButtons = document.querySelector('.character-selection-header .header-buttons');
  const closeButton = document.getElementById('close-character-selection');
  
  if (!headerButtons) {
    console.log('Header buttons não encontrado!');
    return;
  }
  
  // Criar o botão com estilos inline garantidos
  const forgeButton = document.createElement('button');
  forgeButton.className = 'forge-button';
  forgeButton.innerHTML = '<span style="font-size: 16px; margin-right: 5px;">🔨</span>FORJA';
  forgeButton.setAttribute('title', 'Modo Forja - Melhore a raridade dos seus itens');
  
  // Adicionar estilos inline para um visual mais destacado e temático
  Object.assign(forgeButton.style, {
    padding: '8px 16px',
    backgroundColor: '#ff6d00',
    color: 'white',
    border: '2px solid #ffcc80',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(255, 152, 0, 0.5)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s ease',
    letterSpacing: '1px',
    position: 'relative',
    overflow: 'hidden'
  });
  
  // Adicionar efeito de brilho no hover
  forgeButton.addEventListener('mouseover', function() {
    this.style.backgroundColor = '#ff9100';
    this.style.boxShadow = '0 0 15px rgba(255, 152, 0, 0.8)';
    this.style.transform = 'scale(1.05)';
  });
  
  forgeButton.addEventListener('mouseout', function() {
    this.style.backgroundColor = '#ff6d00';
    this.style.boxShadow = '0 0 10px rgba(255, 152, 0, 0.5)';
    this.style.transform = 'scale(1)';
  });
  
  // Criar pseudoelemento para efeito de fogo
  const fireEffect = document.createElement('div');
  fireEffect.className = 'forge-fire-effect';
  Object.assign(fireEffect.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    height: '5px',
    background: 'linear-gradient(to right, #ff9800, #ff5722, #ff9800)',
    animation: 'fireFlicker 1.5s infinite alternate'
  });
  forgeButton.appendChild(fireEffect);
  
  // Adicionar regra de animação para o efeito de fogo
  if (!document.getElementById('forge-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'forge-animations';
    styleSheet.textContent = `
      @keyframes fireFlicker {
        0% { opacity: 0.6; height: 3px; }
        100% { opacity: 1; height: 6px; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
  
  // Adicionar evento de clique
  forgeButton.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Botão de forja clicado!');
    
    // Efeito visual de clique
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 150);
    
    // Adicionar efeito sonoro de martelo, se disponível
    try {
      const hammerSound = new Audio('/assets/sounds/hammer_short.mp3');
      hammerSound.volume = 0.3;
      hammerSound.play().catch(e => console.log('Não foi possível reproduzir o som'));
    } catch (error) {
      console.log('Erro ao tentar reproduzir o som');
    }
    
    toggleForgeMode();
  });
  
  // Inserir o botão antes do botão de fechar
  headerButtons.insertBefore(forgeButton, closeButton);
  
  console.log('Botão de forja criado e adicionado ao header');
}

// Garantir que o botão seja adicionado sempre que a tela de personagem for aberta
document.addEventListener('DOMContentLoaded', function() {
  // Adicionar evento ao botão de abrir seleção de personagem
  const openCharacterBtn = document.getElementById('open-character-selection');
  if (openCharacterBtn) {
    openCharacterBtn.addEventListener('click', function() {
      // Pequeno delay para garantir que o overlay esteja visível
      setTimeout(addForgeButton, 100);
    });
  }
  
  // Verificar periodicamente se o overlay está visível
  setInterval(function() {
    const characterOverlay = document.getElementById('character-selection-overlay');
    if (characterOverlay && characterOverlay.classList.contains('active') && 
        !document.querySelector('.forge-button')) {
      addForgeButton();
    }
  }, 1000);
});

// Função para configurar a zona de lixeira
function setupTrashZone() {
  if (!trashZone) return;
  
  // Adicionar eventos para arrastar sobre a lixeira
  trashZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    trashZone.classList.add('dragover');
    e.dataTransfer.dropEffect = 'move';
  });
  
  trashZone.addEventListener('dragleave', () => {
    trashZone.classList.remove('dragover');
  });
  
  // Adicionar evento de drop na lixeira
  trashZone.addEventListener('drop', (e) => {
    e.preventDefault();
    trashZone.classList.remove('dragover');
    
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      
      if (!rawData || rawData.trim() === '') {
        console.error('Dados de transferência vazios durante o drop na lixeira');
        return;
      }
      
      const data = JSON.parse(rawData);
      console.log('Item arrastado para lixeira:', data);
      
      // Verificar se o item vem do inventário
      if (data.sourceType === 'inventory') {
        // Mostrar popup de confirmação
        showDiscardConfirmation(data);
      } else {
        showNotification('Apenas itens do inventário podem ser descartados', 'error');
      }
    } catch (error) {
      console.error('Erro ao processar drop na lixeira:', error);
    }
  });
}

// Função para mostrar popup de confirmação de descarte
function showDiscardConfirmation(itemData) {
  // Verificar se já existe um popup aberto e removê-lo
  const existingPopup = document.querySelector('.discard-confirmation');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Remover overlay existente se houver
  const existingOverlay = document.querySelector('.discard-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Criar overlay de fundo
  const overlay = document.createElement('div');
  overlay.className = 'discard-overlay';
  document.body.appendChild(overlay);
  
  // Criar o popup de confirmação
  const confirmationPopup = document.createElement('div');
  confirmationPopup.className = 'discard-confirmation';
  
  // Obter dados do item
  const player = gameState.players.find(p => p.id === socket.id);
  const item = player?.inventory?.find(i => i.id === itemData.itemId);
  
  if (!item) {
    showNotification('Item não encontrado no inventário', 'error');
    return;
  }
  
  // Definir ícones baseados no tipo de equipamento
  const icons = {
    sword: '⚔️',
    bow: '🏹',
    staff: '🪄',
    helmet: '🪖',
    armor: '🛡️',
    boots: '👢',
    gloves: '🧤',
    ring: '💍',
    amulet: '📿'
  };
  
  // Definir cores baseadas na raridade
  const rarityColors = {
    normal: '#d4d4d4',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a855f7',
    legendary: '#facc15'
  };
  
  const icon = icons[item.type] || '❓';
  const rarityColor = rarityColors[item.rarity] || '#d4d4d4';
  
  confirmationPopup.innerHTML = `
    <h3>Descartar Item</h3>
    <p>Tem certeza que deseja descartar este item?</p>
    <div class="item-preview">
      <div class="item-icon">${icon}</div>
      <div class="item-name" style="color: ${rarityColor}">${item.name}</div>
    </div>
    <p><span style="color: #ff5050;">⚠️ Atenção:</span> Esta ação não pode ser desfeita!</p>
    <div class="discard-buttons">
      <button class="cancel-discard">Cancelar</button>
      <button class="confirm-discard">Descartar</button>
    </div>
  `;
  
  // Adicionar o popup ao DOM
  document.body.appendChild(confirmationPopup);
  
  // Adicionar eventos aos botões
  const cancelButton = confirmationPopup.querySelector('.cancel-discard');
  const confirmButton = confirmationPopup.querySelector('.confirm-discard');
  
  cancelButton.addEventListener('click', () => {
    confirmationPopup.remove();
    overlay.remove();
  });
  
  confirmButton.addEventListener('click', () => {
    // Enviar solicitação de descarte para o servidor
    socket.emit('discardItem', { itemId: item.id });
    confirmationPopup.remove();
    overlay.remove();
  });
  
  // Adicionar evento para fechar ao clicar no overlay
  overlay.addEventListener('click', () => {
    confirmationPopup.remove();
    overlay.remove();
  });
}

// Função para criar o conteúdo do tooltip de um item
function createTooltipContent(item) {
  // Definir cores baseadas na raridade
  const rarityColors = {
    normal: '#d4d4d4',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a855f7',
    legendary: '#facc15'
  };
  
  const borderColor = rarityColors[item.rarity] || '#d4d4d4';
  
  return `
    <div style="text-align: left; padding: 5px;">
      <div style="color: ${borderColor}; font-weight: bold; margin-bottom: 5px;">${item.name}</div>
      <div>Tipo: ${item.type}</div>
      <div>Nível Requerido: ${item.requiredLevel}</div>
      <div style="margin-top: 5px;">Stats:</div>
      <ul style="margin: 0; padding-left: 15px;">
        ${Object.entries(item.stats).map(([stat, value]) => {
          const formattedValue = value >= 0 ? `+${value * 100}%` : `${value * 100}%`;
          return `<li>${formatStatName(stat)}: ${formattedValue}</li>`;
        }).join('')}
      </ul>
      <div style="margin-top: 8px; color: #ff9800; font-style: italic; text-align: center;">
        Arraste para equipar ou fundir
      </div>
    </div>
  `;
}

// Função para configurar tooltips para os slots de inventário
function setupTooltips() {
  const inventorySlots = document.querySelectorAll('.inventory-slot');
  
  inventorySlots.forEach(slot => {
    const tooltipContent = slot.getAttribute('data-tooltip');
    if (!tooltipContent) return;
    
    slot.addEventListener('mouseenter', (e) => {
      if (!tooltipsEnabled) return;
      
      const tooltip = document.createElement('div');
      tooltip.className = 'item-tooltip';
      tooltip.innerHTML = tooltipContent;
      
      document.body.appendChild(tooltip);
      
      const rect = slot.getBoundingClientRect();
      const tooltipWidth = 250; // Largura aproximada do tooltip
      
      // Posicionar o tooltip à direita ou à esquerda do item, dependendo da posição na tela
      const isRightSide = rect.left + rect.width + tooltipWidth > window.innerWidth;
      
      if (isRightSide) {
        tooltip.style.right = window.innerWidth - rect.left + 10 + 'px';
      } else {
        tooltip.style.left = rect.left + rect.width + 10 + 'px';
      }
      
      tooltip.style.top = rect.top + 'px';
    });
    
    slot.addEventListener('mouseleave', () => {
      hideAllTooltips();
    });
  });
}

// A função hideAllTooltips já está definida anteriormente no arquivo (linha 1143)
// Não é necessário redefini-la aqui