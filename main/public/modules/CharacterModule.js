import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';

export const openCharacterSelectionBtn = document.getElementById('open-character-selection');
export const closeCharacterSelectionBtn = document.getElementById('close-character-selection');
export const characterSelectionOverlay = document.getElementById('character-selection-overlay');
export const characterSelectionContent = document.getElementById('character-selection-content');
export const selectCharacterButton = document.getElementById('select-character-button');
export const inventoryToggle = document.getElementById('inventory-toggle');
export const inventoryGrid = document.getElementById('inventory-grid');

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
  renderInventorySlots(5);
  
  // Make inventory expanded by default
  inventoryGrid.classList.add('expanded');
  inventoryToggle.textContent = '▲';

  // Character selection button
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
}

// Function to hide all character containers
function hideAllCharacterContainers() {
  characterContainers = document.querySelectorAll('.character-container');
  characterContainers.forEach(container => {
    container.style.display = 'none';
  });
}

function renderCharacterSelection() {
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

function renderInventorySlots(count) {
  inventoryGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.setAttribute('data-inventory-slot', i);
    
    // Create a more visually appealing empty slot indicator
    const emptySlot = document.createElement('span');
    emptySlot.className = 'empty-slot';
    slot.appendChild(emptySlot);
    
    // Add tooltip showing slot number
    slot.setAttribute('title', `Slot ${i+1}`);
    
    inventoryGrid.appendChild(slot);
  }
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