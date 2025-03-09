const upgrades = [
  // Tier 1 Upgrades
  {
    id: 'click-power',
    name: 'Poder de Clique I',
    description: 'Aumenta o valor de cada clique',
    basePrice: 10,
    level: 0,
    maxLevel: 10,
    effect: level => level + 1,
    priceIncrease: 1.5,
    tier: 1
  },
  {
    id: 'auto-clicker',
    name: 'Auto Clicker I',
    description: 'Clica automaticamente a cada segundo',
    basePrice: 50,
    level: 0,
    maxLevel: 5,
    effect: level => level,
    priceIncrease: 2,
    tier: 1
  },
  {
    id: 'coin-boost',
    name: 'Boost de Moedas I',
    description: 'Aumenta as moedas ganhas por nível',
    basePrice: 30,
    level: 0,
    maxLevel: 5,
    effect: level => 1 + level * 0.2,
    priceIncrease: 1.8,
    tier: 1
  },
  {
    id: 'progress-boost',
    name: 'Boost de Progresso I',
    description: 'Reduz o aumento da dificuldade entre níveis',
    basePrice: 100,
    level: 0,
    maxLevel: 3,
    effect: level => 1.25 - (level * 0.05),
    priceIncrease: 2.5,
    tier: 1
  },
  {
    id: 'team-synergy',
    name: 'Sinergia de Equipe I',
    description: 'Aumenta o poder de clique baseado no número de jogadores',
    basePrice: 40,
    level: 0,
    maxLevel: 5,
    effect: (level, gameState) => level * (gameState?.players?.length * 0.1 || 0),
    priceIncrease: 1.7,
    tier: 1
  },
  {
    id: 'shared-rewards',
    name: 'Recompensas Compartilhadas I',
    description: 'Aumenta as moedas do time quando um upgrade é comprado',
    basePrice: 75,
    level: 0,
    maxLevel: 3,
    effect: level => level * 0.15,
    priceIncrease: 2.2,
    tier: 1
  },

  // Tier 2 Upgrades (Versões melhoradas)
  {
    id: 'click-power-2',
    name: 'Poder de Clique II',
    description: 'Versão mais poderosa do aumento de clique',
    basePrice: 500,
    level: 0,
    maxLevel: 15,
    effect: level => (level + 1) * 2,
    priceIncrease: 1.6,
    tier: 2,
    requires: 'click-power'
  },
  {
    id: 'auto-clicker-2',
    name: 'Auto Clicker II',
    description: 'Clica duas vezes por segundo',
    basePrice: 1000,
    level: 0,
    maxLevel: 8,
    effect: level => level * 2,
    priceIncrease: 2.2,
    tier: 2,
    requires: 'auto-clicker'
  },
  {
    id: 'coin-boost-2',
    name: 'Boost de Moedas II',
    description: 'Versão melhorada do boost de moedas',
    basePrice: 800,
    level: 0,
    maxLevel: 8,
    effect: level => 1 + level * 0.4,
    priceIncrease: 2,
    tier: 2,
    requires: 'coin-boost'
  },
  {
    id: 'progress-boost-2',
    name: 'Boost de Progresso II',
    description: 'Redução mais eficiente da dificuldade',
    basePrice: 2000,
    level: 0,
    maxLevel: 5,
    effect: level => 1.25 - (level * 0.08),
    priceIncrease: 2.8,
    tier: 2,
    requires: 'progress-boost'
  },
  {
    id: 'team-synergy-2',
    name: 'Sinergia de Equipe II',
    description: 'Sinergia de equipe mais poderosa',
    basePrice: 1200,
    level: 0,
    maxLevel: 8,
    effect: (level, gameState) => level * (gameState?.players?.length * 0.2 || 0),
    priceIncrease: 1.9,
    tier: 2,
    requires: 'team-synergy'
  },
  {
    id: 'shared-rewards-2',
    name: 'Recompensas Compartilhadas II',
    description: 'Versão melhorada das recompensas compartilhadas',
    basePrice: 1500,
    level: 0,
    maxLevel: 5,
    effect: level => level * 0.3,
    priceIncrease: 2.4,
    tier: 2,
    requires: 'shared-rewards'
  },

  // Tier 3 Upgrades (Versões Supremas)
  {
    id: 'click-power-3',
    name: 'Poder de Clique Supremo',
    description: 'Versão definitiva do poder de clique',
    basePrice: 5000,
    level: 0,
    maxLevel: 10,
    effect: level => (level + 1) * 4,
    priceIncrease: 2.0,
    tier: 3,
    requires: 'click-power-2'
  },
  {
    id: 'auto-clicker-3',
    name: 'Auto Clicker Supremo',
    description: 'Clica quatro vezes por segundo',
    basePrice: 8000,
    level: 0,
    maxLevel: 5,
    effect: level => level * 4,
    priceIncrease: 2.8,
    tier: 3,
    requires: 'auto-clicker-2'
  },
  {
    id: 'coin-boost-3',
    name: 'Boost de Moedas Supremo',
    description: 'Multiplicador máximo de moedas',
    basePrice: 6000,
    level: 0,
    maxLevel: 5,
    effect: level => 1 + level * 0.8,
    priceIncrease: 2.5,
    tier: 3,
    requires: 'coin-boost-2'
  },
  {
    id: 'progress-boost-3',
    name: 'Boost de Progresso Supremo',
    description: 'Redução suprema da dificuldade',
    basePrice: 15000,
    level: 0,
    maxLevel: 3,
    effect: level => 1.25 - (level * 0.15),
    priceIncrease: 3.2,
    tier: 3,
    requires: 'progress-boost-2'
  },
  {
    id: 'team-synergy-3',
    name: 'Sinergia de Equipe Suprema',
    description: 'Sinergia de equipe definitiva',
    basePrice: 10000,
    level: 0,
    maxLevel: 5,
    effect: (level, gameState) => level * (gameState?.players?.length * 0.4 || 0),
    priceIncrease: 2.4,
    tier: 3,
    requires: 'team-synergy-2'
  },
  {
    id: 'shared-rewards-3',
    name: 'Recompensas Compartilhadas Supremas',
    description: 'Sistema definitivo de recompensas',
    basePrice: 12000,
    level: 0,
    maxLevel: 3,
    effect: level => level * 0.5,
    priceIncrease: 3.0,
    tier: 3,
    requires: 'shared-rewards-2'
  }
];

module.exports = upgrades;
