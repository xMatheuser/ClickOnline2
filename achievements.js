const achievements = [
  {
    id: 'first-level',
    name: 'Primeiro Nível',
    description: 'Complete o nível 1',
    unlocked: false,
    requirement: (gameState) => gameState.players.some(player => player.level > 1),
    reward: 5
  },
  {
    id: 'level-5',
    name: 'Persistente',
    description: 'Alcance o nível 5',
    unlocked: false,
    requirement: (gameState) => gameState.players.some(player => player.level >= 5),
    reward: 20
  },
  {
    id: 'level-10',
    name: 'Dedicado',
    description: 'Alcance o nível 10',
    unlocked: false,
    requirement: (gameState) => gameState.players.some(player => player.level >= 10),
    reward: 50
  },
  {
    id: 'level-25',
    name: 'Mestre Clicker',
    description: 'Alcance o nível 25',
    unlocked: false,
    requirement: (gameState) => gameState.players.some(player => player.level >= 25),
    reward: 150
  },
  {
    id: 'coins-100',
    name: 'Colecionador',
    description: 'Acumule 100 moedas',
    unlocked: false,
    requirement: (gameState) => gameState.teamCoins >= 100,
    reward: 10
  },
  {
    id: 'upgrade-max',
    name: 'Aprimorado',
    description: 'Maximize um upgrade',
    unlocked: false,
    requirement: (gameState) => gameState.upgrades.some(upgrade => upgrade.level >= upgrade.maxLevel),
    reward: 75
  },
  {
    id: 'team-goal',
    name: 'Esforço de Equipe',
    description: 'Atinja o primeiro objetivo da equipe',
    unlocked: false,
    requirement: (gameState) => gameState.teamLevel > 1,
    reward: 30
  },
  {
    id: 'team-players-3',
    name: 'Trabalho em Equipe',
    description: 'Tenha 3 jogadores na equipe',
    unlocked: false,
    requirement: (gameState) => gameState.players.length >= 3,
    reward: 25
  }
];

module.exports = achievements;
