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
      characterSelectionOverlay.classList.remove('active');
      
      // Dispatch event for overlay state change
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
    } else {
      showNotification('Por favor, selecione um personagem primeiro!');
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
      }
    }
  });
}

function renderCharacterSelection() {
  characterCards = document.querySelectorAll('.character-card');
  characterContainers = document.querySelectorAll('.character-container');

  // Clear any previous selections
  characterCards.forEach(card => {
    card.classList.remove('selected');
    if (card.getAttribute('data-character-type') === selectedCharacterType) {
      card.classList.add('selected');
    }

    // Add click event to select character
    card.addEventListener('click', () => {
      const characterType = card.getAttribute('data-character-type');
      selectCharacter(characterType);
    });
  });

  // Set the selected character container
  characterContainers.forEach(container => {
    container.classList.remove('selected');
    if (container.getAttribute('data-character-type') === selectedCharacterType) {
      container.classList.add('selected');
    }
  });

  // Update Select button state
  updateSelectButtonState();
}

function selectCharacter(characterType) {
  selectedCharacterType = characterType;

  // Update UI to show selection
  characterCards.forEach(card => {
    card.classList.remove('selected');
    if (card.getAttribute('data-character-type') === characterType) {
      card.classList.add('selected');
    }
  });

  characterContainers.forEach(container => {
    container.classList.remove('selected');
    if (container.getAttribute('data-character-type') === characterType) {
      container.classList.add('selected');
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
  
  // Apply character bonuses
  applyCharacterBonuses();
  
  // Update player data on server
  if (isOwnPlayer()) {
    socket.emit('updatePlayerCharacter', { characterType });
  }
  
  showNotification(`Você escolheu ${characterTypes[characterType].name} como seu personagem!`);
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