const achievements = [
  // Categoria: Cliques
  {
    id: 'master-clicker',
    name: 'Mestre dos Cliques',
    description: 'Alcance um total de cliques manuais',
    category: 'clicks',
    icon: '🖱️',
    unlockedLevels: [],
    levels: [
      { 
        requirement: (gameState) => gameState.totalClicks >= 1000,
        description: 'Alcance 1.000 cliques totais',
        boost: { type: 'clickMultiplier', value: 0.02 }, // +2%
        reward: 5
      },
      { 
        requirement: (gameState) => gameState.totalClicks >= 10000,
        description: 'Alcance 10.000 cliques totais',
        boost: { type: 'clickMultiplier', value: 0.05 }, // +5%
        reward: 20
      },
      { 
        requirement: (gameState) => gameState.totalClicks >= 100000,
        description: 'Alcance 100.000 cliques totais',
        boost: { type: 'clickMultiplier', value: 0.10 }, // +10%
        reward: 50
      },
      { 
        requirement: (gameState) => gameState.totalClicks >= 1000000,
        description: 'Alcance 1.000.000 cliques totais',
        boost: { type: 'clickMultiplier', value: 0.15 }, // +15%
        reward: 150
      }
    ]
  },
  // Categoria: Produção Automática
  {
    id: 'auto-efficiency',
    name: 'Eficiência Automática',
    description: 'Gere cliques automáticos acumulados',
    category: 'auto',
    icon: '⚙️',
    unlockedLevels: [],
    levels: [
      { 
        requirement: (gameState) => getAutoClicks(gameState) >= 5000,
        description: '5.000 cliques automáticos',
        boost: { type: 'autoMultiplier', value: 0.05 }, // +5%
        reward: 10
      },
      { 
        requirement: (gameState) => getAutoClicks(gameState) >= 50000,
        description: '50.000 cliques automáticos',
        boost: { type: 'autoMultiplier', value: 0.10 }, // +10%
        reward: 30
      },
      { 
        requirement: (gameState) => getAutoClicks(gameState) >= 500000,
        description: '500.000 cliques automáticos',
        boost: { type: 'autoMultiplier', value: 0.20 }, // +20%
        reward: 100
      }
    ]
  },
  // Categoria: Prestígio
  {
    id: 'prestige-master',
    name: 'Mestre do Prestígio',
    description: 'Realize resets via Prestígio',
    category: 'prestige',
    icon: '⚡',
    unlockedLevels: [],
    levels: [
      { 
        requirement: (gameState) => gameState.players.some(p => p.prestige >= 1),
        description: 'Faça seu primeiro prestígio',
        boost: { type: 'prestigeCostReduction', value: 0.02 }, // -2%
        reward: 25
      },
      { 
        requirement: (gameState) => gameState.players.some(p => p.prestige >= 5),
        description: 'Alcance 5 prestígios',
        boost: { type: 'prestigeCostReduction', value: 0.10 }, // -10%
        reward: 75
      },
      { 
        requirement: (gameState) => gameState.players.some(p => p.prestige >= 10),
        description: 'Alcance 10 prestígios',
        boost: { type: 'prestigeCostReduction', value: 0.15 }, // -15%
        reward: 200
      }
    ]
  },
  // Categoria: Power-Ups
  {
    id: 'powerup-user',
    name: 'Usuário de Power-Ups',
    description: 'Use Power-Ups várias vezes',
    category: 'powerups',
    icon: '💫',
    unlockedLevels: [],
    levels: [
      { 
        requirement: (gameState) => gameState.powerUpUses >= 10,
        description: 'Use 10 power-ups',
        boost: { type: 'powerUpDuration', value: 0.10 }, // +10%
        reward: 15
      },
      { 
        requirement: (gameState) => gameState.powerUpUses >= 50,
        description: 'Use 50 power-ups',
        boost: { type: 'powerUpDuration', value: 0.20 }, // +20%
        reward: 50
      },
      { 
        requirement: (gameState) => gameState.powerUpUses >= 100,
        description: 'Use 100 power-ups',
        boost: { type: 'powerUpDuration', value: 0.50 }, // +50%
        reward: 150
      }
    ]
  },
  // Categoria: Upgrades
  {
    id: 'upgrade-collector',
    name: 'Colecionador de Upgrades',
    description: 'Desbloqueie upgrades',
    category: 'upgrades',
    icon: '📈',
    unlockedLevels: [],
    levels: [
      { 
        requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 3,
        description: 'Desbloqueie 3 upgrades',
        boost: { type: 'upgradeEffect', value: 0.03 }, // +3%
        reward: 20
      },
      { 
        requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 10,
        description: 'Desbloqueie 10 upgrades',
        boost: { type: 'upgradeEffect', value: 0.10 }, // +10%
        reward: 60
      },
      { 
        requirement: (gameState) => gameState.upgrades.filter(u => u.level > 0).length >= 20,
        description: 'Desbloqueie 20 upgrades',
        boost: { type: 'upgradeEffect', value: 0.15 }, // +15%
        reward: 200
      }
    ]
  }
];

// Categorias para agrupar as conquistas na interface
const achievementCategories = {
  clicks: { name: 'Cliques', icon: '🖱️' },
  auto: { name: 'Produção Automática', icon: '⚙️' },
  prestige: { name: 'Prestígio', icon: '⚡' },
  powerups: { name: 'Power-Ups', icon: '💫' },
  upgrades: { name: 'Melhorias', icon: '📈' }
};

// Função auxiliar para calcular cliques automáticos acumulados
function getAutoClicks(gameState) {
  const autoClicker = gameState.upgrades.find(u => u.id === 'auto-clicker');
  const autoClicker2 = gameState.upgrades.find(u => u.id === 'auto-clicker-2');
  const autoLevel = (autoClicker ? autoClicker.level : 0) + (autoClicker2 ? autoClicker2.level * 2 : 0);
  return autoLevel * (Date.now() - gameState.lastActiveTime) / 1000; // Estimativa simples
}

module.exports = { achievements, achievementCategories };