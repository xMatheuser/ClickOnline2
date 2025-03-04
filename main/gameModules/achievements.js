const achievements = [
  // Categoria: Cliques
  {
    id: 'master-clicker',
    name: 'Mestre dos Cliques',
    description: 'Alcance um total de cliques manuais',
    category: 'clicks',
    unlockedLevels: [],
    levels: [
      { requirement: (gameState) => gameState.totalClicks >= 1000, boost: { type: 'clickMultiplier', value: 0.02 }, reward: 5 },
      { requirement: (gameState) => gameState.totalClicks >= 10000, boost: { type: 'clickMultiplier', value: 0.05 }, reward: 20 },
      { requirement: (gameState) => gameState.totalClicks >= 100000, boost: { type: 'clickMultiplier', value: 0.10 }, reward: 50 },
      { requirement: (gameState) => gameState.totalClicks >= 1000000, boost: { type: 'clickMultiplier', value: 0.15 }, reward: 150 }
    ]
  },
  // Categoria: Produção Automática
  {
    id: 'auto-efficiency',
    name: 'Eficiência Automática',
    description: 'Gere cliques automáticos acumulados',
    category: 'auto',
    unlockedLevels: [],
    levels: [
      { requirement: (gameState) => getAutoClicks(gameState) >= 5000, boost: { type: 'autoMultiplier', value: 0.05 }, reward: 10 },
      { requirement: (gameState) => getAutoClicks(gameState) >= 50000, boost: { type: 'autoMultiplier', value: 0.10 }, reward: 30 },
      { requirement: (gameState) => getAutoClicks(gameState) >= 500000, boost: { type: 'autoMultiplier', value: 0.20 }, reward: 100 }
    ]
  },
  // Categoria: Prestígio
  {
    id: 'prestige-master',
    name: 'Mestre do Prestígio',
    description: 'Realize resets via Prestígio',
    category: 'prestige',
    unlockedLevels: [],
    levels: [
      { requirement: (gameState) => gameState.players.some(p => p.prestige >= 1), boost: { type: 'prestigeCostReduction', value: 0.02 }, reward: 25 },
      { requirement: (gameState) => gameState.players.some(p => p.prestige >= 5), boost: { type: 'prestigeCostReduction', value: 0.10 }, reward: 75 },
      { requirement: (gameState) => gameState.players.some(p => p.prestige >= 10), boost: { type: 'prestigeCostReduction', value: 0.15 }, reward: 200 }
    ]
  },
  // Categoria: Power-Ups
  {
    id: 'powerup-user',
    name: 'Usuário de Power-Ups',
    description: 'Use Power-Ups várias vezes',
    category: 'powerups',
    unlockedLevels: [],
    levels: [
      { requirement: (gameState) => gameState.powerUpUses >= 10, boost: { type: 'powerUpDuration', value: 0.10 }, reward: 15 },
      { requirement: (gameState) => gameState.powerUpUses >= 50, boost: { type: 'powerUpDuration', value: 0.20 }, reward: 50 },
      { requirement: (gameState) => gameState.powerUpUses >= 100, boost: { type: 'powerUpDuration', value: 0.50 }, reward: 150 }
    ]
  },
  // Categoria: Upgrades
  {
    id: 'upgrade-collector',
    name: 'Colecionador de Upgrades',
    description: 'Desbloqueie upgrades',
    category: 'upgrades',
    unlockedLevels: [],
    levels: [
      { requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 3, boost: { type: 'upgradeEffect', value: 0.03 }, reward: 20 },
      { requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 10, boost: { type: 'upgradeEffect', value: 0.10 }, reward: 60 },
      { requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 20, boost: { type: 'upgradeEffect', value: 0.15 }, reward: 200 }
    ]
  }
];

// Função auxiliar para calcular cliques automáticos acumulados
function getAutoClicks(gameState) {
  const autoClicker = gameState.upgrades.find(u => u.id === 'auto-clicker');
  const autoClicker2 = gameState.upgrades.find(u => u.id === 'auto-clicker-2');
  const autoLevel = (autoClicker ? autoClicker.level : 0) + (autoClicker2 ? autoClicker2.level * 2 : 0);
  return autoLevel * (Date.now() - gameState.lastActiveTime) / 1000; // Estimativa simples
}

module.exports = achievements;