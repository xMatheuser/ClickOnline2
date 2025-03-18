import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';

export const openCharacterSelectionBtn = document.getElementById('open-character-selection');
export const closeCharacterSelectionBtn = document.getElementById('close-character-selection');
export const characterSelectionOverlay = document.getElementById('character-selection-overlay');
export const characterSelectionContent = document.getElementById('character-selection-content');
export const selectCharacterButton = document.getElementById('select-character-button');
export const inventoryToggle = document.getElementById('inventory-toggle');
export const inventoryGrid = document.getElementById('inventory-grid');

// Character data
export const characterTypes = {
  warrior: {
    name: 'Guerreiro',
    icon: '⚔️',
    description: 'Especialista em combate corpo a corpo, o Guerreiro tem alto poder de ataque.',
    stats: {
      attack: 3,
      defense: 2,
      magic: 1,
      agility: 2
    },
    bonuses: {
      clickPower: 1.25, // 25% mais força por clique
      autoClicker: 0.9, // 10% menos eficiente em auto-clickers
      criticalChance: 0.1 // 10% de chance de crítico
    }
  },
  archer: {
    name: 'Arqueiro',
    icon: '🏹',
    description: 'Especialista em ataques à distância, o Arqueiro tem alta precisão e velocidade.',
    stats: {
      attack: 2,
      defense: 1,
      magic: 2,
      agility: 3
    },
    bonuses: {
      clickPower: 1.0, // Força normal por clique
      autoClicker: 1.2, // 20% mais eficiente em auto-clickers
      doubleAttackChance: 0.15 // 15% de chance de ataque duplo
    }
  },
  mage: {
    name: 'Mago',
    icon: '🔮',
    description: 'Especialista em magias, o Mago tem alto poder mágico e conhecimento arcano.',
    stats: {
      attack: 1,
      defense: 1,
      magic: 3,
      agility: 2
    },
    bonuses: {
      clickPower: 0.9, // 10% menos força por clique
      autoClicker: 1.5, // 50% mais eficiente em auto-clickers
      aoeChance: 0.1 // 10% de chance de dano em área
    }
  }
};

// Current selected character
let selectedCharacterType = null;
let characterCards;
let characterContainers;

export function initCharacterSelection() {
  // Load the player's character type from localStorage
  const savedCharacterType = localStorage.getItem('selectedCharacterType');
  if (savedCharacterType && characterTypes[savedCharacterType]) {
    selectedCharacterType = savedCharacterType;
  }

  // Add "Select Character" button event
  openCharacterSelectionBtn.addEventListener('click', () => {
    characterSelectionOverlay.classList.add('active');
    
    // Não restauramos mais o layout ao abrir o overlay
    // Mantemos o estado de seleção do personagem conforme estava

    // Solicita atualização dos personagens selecionados ao servidor
    socket.emit('requestCharacterUpdate');
    
    renderCharacterSelection();
    
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
    const isExpanded = inventoryGrid.classList.toggle('expanded');
    inventoryToggle.textContent = isExpanded ? '▲' : '▼';
  });

  // Initialize with inventory slots
  renderInventorySlots(20);

  // Character selection button
  selectCharacterButton.addEventListener('click', () => {
    if (selectedCharacterType) {
      saveSelectedCharacter(selectedCharacterType);
      
      // Esconde o card selecionado também usando classes CSS
      const characterOptions = document.querySelector('.character-options');
      if (characterOptions) {
        characterOptions.classList.add('hidden');
      }
      
      // Show notification
      showNotification(`Personagem ${characterTypes[selectedCharacterType].name} selecionado!`, 'success');

      // Deixar overlay aberto para que o jogador possa ver os outros personagens
      // Atualiza a exibição para mostrar os personagens dos outros jogadores
      updateOtherPlayersCharacters();
    }
  });

  // Apply character bonuses if a character is already selected
  applyCharacterBonuses();
  
  // Listen for character updates from server
  socket.on('playerCharacterUpdate', (data) => {
    if (data.playerId && data.characterType) {
      const player = gameState.players.find(p => p.id === data.playerId);
      if (player) {
        player.characterType = data.characterType;
        player.characterBonuses = characterTypes[data.characterType].bonuses;
        
        // Renderiza toda a tela de seleção para garantir que as opções sejam atualizadas
        renderCharacterSelection();
      }
    }
  });
}

function renderCharacterSelection() {
  characterCards = document.querySelectorAll('.character-card');
  characterContainers = document.querySelectorAll('.character-container');

  // Se já tiver um personagem selecionado, mantém o layout para o seu personagem
  if (selectedCharacterType) {
    // Verifica se as opções já estão escondidas
    const characterOptions = document.querySelector('.character-options');
    if (characterOptions && !characterOptions.classList.contains('hidden')) {
      characterOptions.classList.add('hidden');
    }

    // Esconde os cards não selecionados
    characterCards.forEach(card => {
      const cardType = card.getAttribute('data-character-type');
      if (cardType === selectedCharacterType) {
        card.classList.add('selected');
        card.style.opacity = '1';
        card.style.display = 'flex';
      } else {
        card.classList.remove('selected');
        card.style.opacity = '0';
        card.style.display = 'none';
      }
    });
  } else {
    // Caso não tenha personagem selecionado, mostra todos os cards e containers
    characterCards.forEach(card => {
      card.style.display = 'flex';
      card.style.opacity = '1';
      card.classList.remove('selected');
    });
    
    // Restaura a exibição da seção de opções de personagens
    const characterOptions = document.querySelector('.character-options');
    if (characterOptions) {
      characterOptions.classList.remove('hidden');
      characterOptions.style.display = 'flex';
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

  // Update UI to show selection
  characterCards.forEach(card => {
    const cardType = card.getAttribute('data-character-type');
    
    if (cardType === characterType) {
      card.classList.add('selected');
    } else {
      // Em vez de apenas remover a classe 'selected', esconde os cards não selecionados
      card.classList.remove('selected');
      
      // Usando opacity + setTimeout para uma transição suave
      card.style.opacity = '0';
      setTimeout(() => {
        card.style.display = 'none';
      }, 300);
    }
  });

  characterContainers.forEach(container => {
    const containerType = container.getAttribute('data-character-type');
    
    if (containerType === characterType) {
      container.classList.add('selected');
    } else {
      // Esconde os containers de personagens não selecionados
      container.classList.remove('selected');
      
      // Usando opacity + setTimeout para uma transição suave
      container.style.opacity = '0';
      setTimeout(() => {
        container.style.display = 'none';
      }, 300);
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
  // Save to localStorage
  localStorage.setItem('selectedCharacterType', characterType);
  
  selectedCharacterType = characterType;
  
  // Update the player's character type in the game state
  if (gameState.player) {
    gameState.player.characterType = characterType;
    gameState.player.characterBonuses = characterTypes[characterType].bonuses;
    
    // Emit update to server if it's the player's own character
    if (socket && isOwnPlayer(gameState.player.id)) {
      socket.emit('updatePlayerCharacter', {
        characterType: characterType
      });
    }
  }

  // Apply character bonuses
  applyCharacterBonuses();
  
  // Atualizar a exibição para mostrar os personagens dos outros jogadores
  updateOtherPlayersCharacters();
}

function applyCharacterBonuses() {
  if (!selectedCharacterType || !characterTypes[selectedCharacterType]) return;
  
  // Apply character bonuses to game state
  const player = gameState.players.find(p => p.id === socket.id);
  if (player) {
    const bonuses = characterTypes[selectedCharacterType].bonuses;
    player.characterType = selectedCharacterType;
    player.characterBonuses = bonuses;
    
    // Update local game state
    socket.emit('updatePlayerData', { characterType: selectedCharacterType, characterBonuses: bonuses });
  }
}

function renderInventorySlots(count) {
  inventoryGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.setAttribute('data-inventory-slot', i);
    slot.innerHTML = '<span class="empty-slot"></span>';
    inventoryGrid.appendChild(slot);
  }
}

// Get current character info
export function getPlayerCharacter() {
  const player = gameState.players.find(p => p.id === socket.id);
  if (player && player.characterType && characterTypes[player.characterType]) {
    return {
      type: player.characterType,
      ...characterTypes[player.characterType]
    };
  }
  return null;
}

// Check if player has selected a character
export function hasSelectedCharacter() {
  return selectedCharacterType !== null;
}

// Get character bonus for a specific stat
export function getCharacterBonus(bonusType) {
  if (!selectedCharacterType || !characterTypes[selectedCharacterType]) return 1;
  
  const bonuses = characterTypes[selectedCharacterType].bonuses;
  return bonuses[bonusType] || 1;
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
  const allCharacterTypes = Object.keys(characterTypes);
  const availableCharacterTypes = allCharacterTypes.filter(type => !selectedCharacters[type]);
  
  // Agora, vamos atualizar a interface para cada jogador
  characterCards = document.querySelectorAll('.character-card');
  characterContainers = document.querySelectorAll('.character-container');
  
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
      
      // Se o jogador não escolheu um personagem, esconder os cards
      if (selectedCharacterType) {
        const characterOptions = document.querySelector('.character-options');
        if (characterOptions) {
          characterOptions.classList.add('hidden');
        }
      } else {
        // Garantir que as opções estejam visíveis quando o jogador não tem personagem
        const characterOptions = document.querySelector('.character-options');
        if (characterOptions) {
          characterOptions.classList.remove('hidden');
          characterOptions.style.display = 'flex';
        }
      }
    }
    
    // Mostrar os containers dos personagens selecionados por qualquer jogador
    characterContainers.forEach(container => {
      const containerType = container.getAttribute('data-character-type');
      
      if (selectedCharacters[containerType]) {
        // Este personagem foi selecionado por algum jogador
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
        const playerNumber = gameState.players.findIndex(p => p.id === playerId) + 1;
        playerLabel.textContent = isCurrentPlayer ? 'SEU PERSONAGEM' : `PERSONAGEM DE ${playerNumber}`;
        playerLabel.classList.toggle('current-player', isCurrentPlayer);
      } else if (totalPlayers === 0) {
        // Nenhum personagem selecionado, mostrar todos os containers
        container.style.display = 'flex';
        container.style.opacity = '1';
      } else {
        // Este personagem não foi selecionado, esconder o container
        container.style.display = 'none';
      }
    });
  }
  
  // Atualizar a disponibilidade de todos os cards de personagens
  if (!selectedCharacterType) {
    // Limpar primeiro todos os cards
    characterCards.forEach(card => {
      // Resetar o estado visual de todos os cards
      card.style.display = 'none'; // Inicialmente escondido
      card.classList.remove('disabled');
    });
      
    // Primeiro, destacar claramente quais personagens ainda estão disponíveis
    availableCharacterTypes.forEach(availableType => {
      const availableCard = Array.from(characterCards).find(card => 
        card.getAttribute('data-character-type') === availableType
      );
        
      if (availableCard) {
        // Este personagem está disponível para seleção
        availableCard.style.display = 'flex';
        availableCard.style.opacity = '1';
        availableCard.style.pointerEvents = 'auto';
        availableCard.style.cursor = 'pointer';
        
        // Adicionar um destaque visual para personagens disponíveis
        availableCard.classList.add('available');
      }
    });
      
    // Depois, lidar com os personagens já selecionados
    characterCards.forEach(card => {
      const cardType = card.getAttribute('data-character-type');
        
      if (selectedCharacters[cardType] && selectedCharacters[cardType] !== socket.id) {
        // Este personagem já foi escolhido por outro jogador
        card.classList.add('disabled');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        card.style.display = 'flex'; // Mostrar, mas desativado
          
        // Adicionar indicação visual de que está selecionado por outro jogador
        const playerInfo = document.createElement('div');
        playerInfo.className = 'other-player-selection';
          
        const playerNumber = gameState.players.findIndex(p => p.id === selectedCharacters[cardType]) + 1;
        playerInfo.textContent = `Selecionado por ${playerNumber}`;
          
        if (!card.querySelector('.other-player-selection')) {
          card.appendChild(playerInfo);
        }
      }
    });
  }
} 