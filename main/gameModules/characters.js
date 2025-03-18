// Character types and their attributes
const CHARACTER_TYPES = {
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
      clickPower: 1.3, // 30% mais força por clique
      autoClicker: 0.9, // 10% menos eficiente em auto-clickers
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
      autoClicker: 1.0, // Eficiencia normal em auto-clickers
    }
  },
  mage: {
    name: 'Mago',
    icon: '🪄',
    description: 'Especialista em magias, o Mago tem alto poder mágico e conhecimento arcano.',
    stats: {
      attack: 1,
      defense: 1,
      magic: 3,
      agility: 2
    },
    bonuses: {
      clickPower: 0.9, // 10% menos força por clique
      autoClicker: 1.3, // 30% mais eficiente em auto-clickers
    }
  }
};

/**
 * Get a character's bonus for a specific attribute
 * @param {Object} player - The player object
 * @param {string} bonusType - The type of bonus to get
 * @returns {number} - The bonus value or 1 if not found (neutral multiplier)
 */
function getCharacterBonus(player, bonusType) {
  if (!player || !player.characterType || !CHARACTER_TYPES[player.characterType]) {
    return 1; // Neutral multiplier if no character
  }
  
  const bonuses = CHARACTER_TYPES[player.characterType].bonuses;
  return bonuses[bonusType] || 1;
}

/**
 * Apply character bonuses to player object
 * @param {Object} player - The player object to apply bonuses to
 * @returns {Object} - The player object with updated bonuses
 */
function applyCharacterBonuses(player) {
  if (!player || !player.characterType || !CHARACTER_TYPES[player.characterType]) {
    // Reset bonuses if no valid character
    player.characterBonuses = {};
    return player;
  }
  
  // Apply character bonuses
  const bonuses = CHARACTER_TYPES[player.characterType].bonuses;
  player.characterBonuses = { ...bonuses };
  
  return player;
}

/**
 * Update player character data
 * @param {Object} player - The player object to update
 * @param {string} characterType - The character type to set
 * @returns {Object} - The updated player object
 */
function updatePlayerCharacter(player, characterType) {
  if (!player) return null;
  
  // If characterType is null, clear character data
  if (characterType === null) {
    player.characterType = null;
    player.characterBonuses = {};
    return player;
  }
  
  // Validate character type
  if (!CHARACTER_TYPES[characterType]) {
    return player;
  }
  
  // Update player data
  player.characterType = characterType;
  
  // Apply bonuses
  return applyCharacterBonuses(player);
}

/**
 * Get character type data
 * @param {string} characterType - The character type to get data for
 * @returns {Object|null} - The character type data or null if not found
 */
function getCharacterData(characterType) {
  return CHARACTER_TYPES[characterType] || null;
}

/**
 * Get all character types for client
 * @returns {Object} - All character types data
 */
function getAllCharacterTypes() {
  return CHARACTER_TYPES;
}

module.exports = {
  CHARACTER_TYPES,
  getCharacterBonus,
  applyCharacterBonuses,
  updatePlayerCharacter,
  getCharacterData,
  getAllCharacterTypes
};
