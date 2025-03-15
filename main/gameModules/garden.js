export const SEEDS = {
    sunflower: {
      id: 'sunflower',
      name: 'Girassol',
      icon: '🌻',
      growthTime: 10000, // 30 segundos
      difficulty: '⭐',
      unlockedByDefault: true,
      reward: {
        type: 'sunflower',
        amount: 1
      }
    },
    tulip: {
      id: 'tulip',
      name: 'Tulipa',
      icon: '🌷',
      growthTime: 2000, // 60 segundos
      difficulty: '⭐',
      unlockedByDefault: false,
      reward: {
        type: 'tulip',
        amount: 1
      }
    },
    mushroom: {
      id: 'mushroom',
      name: 'Cogumelo',
      icon: '🍄',
      growthTime: 3000, // 90 segundos
      difficulty: '⭐⭐',
      unlockedByDefault: false,
      reward: {
        type: 'mushroom',
        amount: 1
      }
    },
    crystal: {
      id: 'crystal',
      name: 'Cristal',
      icon: '💎',
      growthTime: 4000, // 120 segundos
      difficulty: '⭐⭐⭐',
      unlockedByDefault: false,
      reward: {
        type: 'crystal',
        amount: 1
      }
    }
};

export const GARDEN_UPGRADES = {
    growthSpeed: { // PROIBIDO APAGAR
      id: 'growth-speed',
      name: 'Fertilizante',
      description: 'Reduz o tempo de crescimento das plantas em 10%',
      baseCost: { sunflower: 10, tulip: 5 },
      maxLevel: 10,
      getEffect: (level) => 1 - (level * 0.1), // 10% reduction per level
      getCost: (level) => ({
        sunflower: Math.floor(10 * Math.pow(1.5, level)),
        tulip: Math.floor(5 * Math.pow(1.5, level))
      })
    },
    harvestYield: {
      id: 'harvest-yield',
      name: 'Rendimento da Colheita',
      description: 'Aumenta a quantidade de recursos em 1',
      baseCost: { tulip: 8, mushroom: 3 },
      maxLevel: 5,
      getEffect: (level) => 1 + (level * 1), // 25% increase per level
      getCost: (level) => ({
        tulip: Math.floor(8 * Math.pow(2, level)),
        mushroom: Math.floor(3 * Math.pow(2, level))
      })
    },
    prunerPrecision: {
      id: 'pruner-precision',
      name: 'Podadora de Precisão',
      description: '20% de chance de dropar recurso extra.',
      baseCost: { sunflower: 10, crystal: 5 },
      maxLevel: 5,
      getEffect: (level) => level > 0 ? (level * 0.2) : 0, // 20% de chance quando ativada
      getCost: (level) => ({
        sunflower: 10,
        crystal: 5
      })
    },
    slot: {
      id: 'garden-slot',
      name: 'Novo Canteiro',
      description: 'Desbloqueie um novo slot para plantar mais recursos.',
      baseCost: { sunflower: 5, tulip: 3 },
      maxLevel: 10, // Equivalente ao maxSlots de antes
      getEffect: (level) => level, // O nível representa o número de slots
      getCost: (level) => {
        // Custo base aumenta com o número de slots
        const baseSunflower = 5;
        const baseTulip = 3;
        const multiplier = Math.pow(1.5, level);
        
        return {
          sunflower: Math.floor(baseSunflower * multiplier),
          tulip: Math.floor(baseTulip * multiplier)
        };
      }
    }
};

export const SEED_PROGRESSION = ['sunflower', 'tulip', 'mushroom', 'crystal'];

export const UNLOCK_COSTS = {
  tulip: { sunflower: 10 },
  mushroom: { tulip: 8, sunflower: 15 },
  crystal: { mushroom: 5, tulip: 12, sunflower: 20 }
};

export function getSeedUnlockCost(seedId) {
  return UNLOCK_COSTS[seedId];
}

export function canUnlockSeed(garden, seedId) {
  const cost = UNLOCK_COSTS[seedId];
  if (!cost) return false;

  return Object.entries(cost).every(([resource, amount]) => 
    garden.resources[resource] >= amount);
}

export function isSeedVisible(garden, seedId) {
  // Girassol sempre visível
  if (seedId === 'sunflower') return true;
  
  // Se a semente já foi desbloqueada, mantenha visível
  if (garden[`${seedId}Unlocked`]) return true;
  
  const index = SEED_PROGRESSION.indexOf(seedId);
  if (index <= 0) return false;
  
  const previousSeed = SEED_PROGRESSION[index - 1];
  return garden.resources[previousSeed] > 0;
}

export function processSeedUnlock(garden, seedId) {
  // Girassol sempre liberado
  if (seedId === 'sunflower') return true;
  
  if (garden[`${seedId}Unlocked`]) return false;
  
  const cost = UNLOCK_COSTS[seedId];
  if (!cost || !canUnlockSeed(garden, seedId)) return false;

  // Deduz os recursos
  Object.entries(cost).forEach(([resource, amount]) => {
    garden.resources[resource] -= amount;
  });

  // Desbloqueia a semente
  garden[`${seedId}Unlocked`] = true;
  return true;
}

export function calculateGrowthTime(baseTime, upgradeLevels) {
  // Garantir que upgradeLevels seja um objeto válido
  upgradeLevels = upgradeLevels || {};
  
  // Calcular o multiplicador de velocidade de crescimento
  const speedLevel = upgradeLevels.growthSpeed || 0;
  const speedMultiplier = GARDEN_UPGRADES.growthSpeed.getEffect(speedLevel);
  
  // Calcular o multiplicador do fertilizante
  const fertilizerLevel = upgradeLevels.fertilizer || 0;
  const fertilizerMultiplier = fertilizerLevel > 0 ? 
    GARDEN_UPGRADES.fertilizer.getEffect(fertilizerLevel) : 1;
  
  // Calcular o tempo de crescimento ajustado
  const adjustedTime = baseTime * speedMultiplier * fertilizerMultiplier;
  
  return adjustedTime;
}
  
export function calculateHarvestYield(baseAmount, upgradeLevels) {
  const yieldMultiplier = GARDEN_UPGRADES.harvestYield.getEffect(upgradeLevels.harvestYield || 0);
  return Math.floor(baseAmount * yieldMultiplier);
}
  
export function getSeedGrowthTime(seedId) {
  return SEEDS[seedId]?.growthTime || 30000;
}