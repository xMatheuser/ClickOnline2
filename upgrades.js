const upgrades = [
  {
    id: 'click-power',
    name: 'Poder de Clique',
    description: 'Aumenta o valor de cada clique',
    basePrice: 10,
    level: 0,
    maxLevel: 10,
    effect: level => level + 1,
    priceIncrease: 1.5
  },
  {
    id: 'auto-clicker',
    name: 'Auto Clicker',
    description: 'Clica automaticamente a cada segundo',
    basePrice: 50,
    level: 0,
    maxLevel: 5,
    effect: level => level,
    priceIncrease: 2
  },
  {
    id: 'coin-boost',
    name: 'Boost de Moedas',
    description: 'Aumenta as moedas ganhas por nível',
    basePrice: 30,
    level: 0,
    maxLevel: 5,
    effect: level => 1 + level * 0.2,
    priceIncrease: 1.8
  },
  {
    id: 'progress-boost',
    name: 'Boost de Progresso',
    description: 'Reduz o aumento da dificuldade entre níveis',
    basePrice: 100,
    level: 0,
    maxLevel: 3,
    effect: level => 1.25 - (level * 0.05),
    priceIncrease: 2.5
  },
  {
    id: 'team-synergy',
    name: 'Sinergia de Equipe',
    description: 'Aumenta o poder de clique baseado no número de jogadores',
    basePrice: 40,
    level: 0,
    maxLevel: 5,
    effect: (level, gameState) => level * (gameState?.players?.length * 0.1 || 0),
    priceIncrease: 1.7
  },
  {
    id: 'shared-rewards',
    name: 'Recompensas Compartilhadas',
    description: 'Aumenta as moedas do time quando um upgrade é comprado',
    basePrice: 75,
    level: 0,
    maxLevel: 3,
    effect: level => level * 0.15,
    priceIncrease: 2.2
  }
];

module.exports = upgrades;
