export const SEEDS = {
    sunflower: {
      id: 'sunflower',
      name: 'Girassol',
      icon: '🌻',
      growthTime: 3000, // 30 segundos
      difficulty: '⭐⭐',
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
      growthTime: 60000, // 60 segundos
      difficulty: '⭐⭐⭐',
      unlockedByDefault: true,
      reward: {
        type: 'tulip',
        amount: 1
      }
    },
    mushroom: {
      id: 'mushroom',
      name: 'Cogumelo',
      icon: '🍄',
      growthTime: 90000, // 90 segundos
      difficulty: '⭐⭐⭐⭐',
      unlockedByDefault: true,
      reward: {
        type: 'mushroom',
        amount: 1
      }
    },
    crystal: {
      id: 'crystal',
      name: 'Cristal',
      icon: '💎',
      growthTime: 120000, // 120 segundos
      difficulty: '⭐⭐⭐⭐⭐',
      unlockedByDefault: false,
      reward: {
        type: 'crystal',
        amount: 1
      }
    }
};

export const GARDEN_UPGRADES = {
    growthSpeed: {
      id: 'growth-speed',
      name: 'Velocidade de Crescimento',
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
      description: 'Aumenta a quantidade de recursos colhidos em 25%',
      baseCost: { tulip: 8, mushroom: 3 },
      maxLevel: 5,
      getEffect: (level) => 1 + (level * 0.25), // 25% increase per level
      getCost: (level) => ({
        tulip: Math.floor(8 * Math.pow(2, level)),
        mushroom: Math.floor(3 * Math.pow(2, level))
      })
    },
    fertilizer: {
      id: 'fertilizer',
      name: 'Fertilizante Superior',
      description: 'Reduz em 20% o tempo de crescimento de todas as plantas',
      baseCost: { sunflower: 10, tulip: 8, mushroom: 5 },
      maxLevel: 5,
      getEffect: (level) => 1 - (level * 0.2), // 20% reduction per level
      getCost: (level) => ({
        sunflower: Math.floor(10 * Math.pow(1.5, level)),
        tulip: Math.floor(8 * Math.pow(1.5, level)),
        mushroom: Math.floor(5 * Math.pow(1.5, level))
      })
    }
};
