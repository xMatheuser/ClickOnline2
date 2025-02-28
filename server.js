const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Estado global do jogo
let gameState = {
  players: [],
  teamLevel: 1,
  teamGoal: 5,
  clicks: 0,
  coins: 0,
  upgrades: [
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
      effect: level => 1 + level * 0.2, // 20% de aumento por nível
      priceIncrease: 1.8
    },
    {
      id: 'progress-boost',
      name: 'Boost de Progresso',
      description: 'Reduz o aumento da dificuldade entre níveis',
      basePrice: 100,
      level: 0,
      maxLevel: 3,
      effect: level => 1.25 - (level * 0.05), // Reduz de 1.25 para 1.10
      priceIncrease: 2.5
    },
    {
      id: 'team-synergy',
      name: 'Sinergia de Equipe',
      description: 'Aumenta o poder de clique baseado no número de jogadores',
      basePrice: 40,
      level: 0,
      maxLevel: 5,
      effect: level => level * (gameState.players.length * 0.1), // 10% por jogador por nível
      priceIncrease: 1.7
    },
    {
      id: 'shared-rewards',
      name: 'Recompensas Compartilhadas',
      description: 'Jogadores inativos recebem uma porcentagem das moedas ganhas',
      basePrice: 75,
      level: 0,
      maxLevel: 3,
      effect: level => level * 0.15, // 15% por nível
      priceIncrease: 2.2
    }
  ],
  achievements: [
    {
      id: 'first-level',
      name: 'Primeiro Nível',
      description: 'Complete o nível 1',
      unlocked: false,
      requirement: () => gameState.players.some(player => player.level > 1),
      reward: 5
    },
    {
      id: 'level-5',
      name: 'Persistente',
      description: 'Alcance o nível 5',
      unlocked: false,
      requirement: () => gameState.players.some(player => player.level >= 5),
      reward: 20
    },
    {
      id: 'level-10',
      name: 'Dedicado',
      description: 'Alcance o nível 10',
      unlocked: false,
      requirement: () => gameState.players.some(player => player.level >= 10),
      reward: 50
    },
    {
      id: 'level-25',
      name: 'Mestre Clicker',
      description: 'Alcance o nível 25',
      unlocked: false,
      requirement: () => gameState.players.some(player => player.level >= 25),
      reward: 150
    },
    {
      id: 'coins-100',
      name: 'Colecionador',
      description: 'Acumule 100 moedas',
      unlocked: false,
      requirement: () => gameState.coins >= 100,
      reward: 10
    },
    {
      id: 'upgrade-max',
      name: 'Aprimorado',
      description: 'Maximize um upgrade',
      unlocked: false,
      requirement: () => gameState.upgrades.some(upgrade => upgrade.level >= upgrade.maxLevel),
      reward: 75
    },
    {
      id: 'team-goal',
      name: 'Esforço de Equipe',
      description: 'Atinja o primeiro objetivo da equipe',
      unlocked: false,
      requirement: () => gameState.teamLevel > 1,
      reward: 30
    },
    {
      id: 'team-players-3',
      name: 'Trabalho em Equipe',
      description: 'Tenha 3 ou mais jogadores na equipe',
      unlocked: false,
      requirement: () => gameState.players.length >= 3,
      reward: 25
    }
  ]
};

// Função para atualizar todos os clientes
function broadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

// Função para verificar conquistas
function checkAchievements() {
  let newUnlocks = false;
  gameState.achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.requirement()) {
      achievement.unlocked = true;
      gameState.coins += achievement.reward;
      gameState.players.forEach(player => {
        player.coins += achievement.reward;
      });
      io.emit('chatMessage', {
        text: `Equipe desbloqueou "${achievement.name}"! +${achievement.reward} moedas`,
        type: 'system'
      });
      newUnlocks = true;
    }
  });
  if (newUnlocks) {
    broadcastGameState();
  }
}

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);
  socket.emit('gameStateUpdate', gameState);

  socket.on('addPlayer', (playerData) => {
    if (!gameState.players.some(p => p.name === playerData.name)) {
      playerData.id = socket.id;
      playerData.clicks = 0;
      playerData.coins = 0;
      playerData.level = 1;
      playerData.contribution = 0;
      gameState.players.push(playerData);
      console.log(`Jogador ${playerData.name} adicionado`);
      io.emit('chatMessage', {
        text: `${playerData.name} entrou no jogo como ${playerData.role}!`,
        type: 'system'
      });
      broadcastGameState();
      checkAchievements();
    }
  });

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;

      if (player.clicks >= (player.targetClicks || 10)) {
        levelUp(player);
      }
      broadcastGameState();
      checkAchievements();
    }
  });

  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
      if (!upgrade) return;

      let price = getUpgradePrice(upgrade);
      const upgraderDiscount = gameState.players.some(p => p.role === 'upgrader') && upgrade.level < upgrade.maxLevel
        ? gameState.players.filter(p => p.role === 'upgrader').reduce((sum, p) => sum + (p.bonus?.value || -0.15), 0)
        : 0;
      price = Math.round(price * (1 + upgraderDiscount));

      if (player.coins >= price && upgrade.level < upgrade.maxLevel) {
        player.coins -= price;
        upgrade.level++;

        if (upgrade.id === 'click-power') {
          gameState.players.forEach(p => {
            if (p.role === 'clicker') {
              p.bonus = { type: 'clickPower', value: 0.2 + upgrade.effect(upgrade.level) };
            }
          });
        }

        io.emit('chatMessage', {
          text: `${player.name} comprou ${upgrade.name} nível ${upgrade.level}!`,
          type: 'player'
        });

        // Distribuir recompensas compartilhadas após a compra
        const sharedRewardBonus = getUpgradeEffect('shared-rewards');
        if (sharedRewardBonus > 0) {
          gameState.players.forEach(p => {
            if (p.id !== socket.id) {
              const sharedCoins = Math.round(price * sharedRewardBonus);
              p.coins += sharedCoins;
              io.emit('chatMessage', {
                text: `${p.name} recebeu ${sharedCoins} moedas compartilhadas!`,
                type: 'system'
              });
            }
          });
        }

        broadcastGameState();
        checkAchievements();
      }
    }
  });

  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = gameState.players[playerIndex].name;
      gameState.players.splice(playerIndex, 1);
      io.emit('chatMessage', {
        text: `${playerName} saiu do jogo.`,
        type: 'system'
      });
      console.log(`Jogador ${playerName} desconectado`);
      broadcastGameState();
    }
  });
});

function calculateClickValue(player) {
  let clickPower = 1;
  if (player.role === 'clicker') {
    clickPower *= (1 + (player.bonus?.value || 0.2));
  }
  const clickPowerUpgrade = gameState.upgrades.find(u => u.id === 'click-power');
  if (clickPowerUpgrade) {
    clickPower += clickPowerUpgrade.effect(clickPowerUpgrade.level) - 1;
  }
  const teamSynergyBonus = getUpgradeEffect('team-synergy');
  if (teamSynergyBonus > 0) {
    clickPower *= (1 + teamSynergyBonus);
  }
  return clickPower;
}

function levelUp(player) {
  player.level++;
  player.clicks = 0;
  
  // Ajustar a dificuldade com o boost de progresso
  const difficultyCurve = getUpgradeEffect('progress-boost') || 1.25;
  player.targetClicks = Math.ceil((player.targetClicks || 10) * difficultyCurve);

  // Calcular moedas ganhas com o boost de moedas
  const coinBoost = getUpgradeEffect('coin-boost') || 1;
  const coinsAwarded = Math.round(player.level * 5 * coinBoost);
  player.coins += coinsAwarded;
  gameState.coins += coinsAwarded;

  io.emit('chatMessage', {
    text: `${player.name} alcançou o nível ${player.level}! +${coinsAwarded} moedas`,
    type: 'system'
  });

  // Distribuir recompensas compartilhadas para jogadores inativos
  const sharedRewardBonus = getUpgradeEffect('shared-rewards');
  if (sharedRewardBonus > 0) {
    gameState.players.forEach(p => {
      if (p.id !== player.id) {
        const sharedCoins = Math.round(coinsAwarded * sharedRewardBonus);
        p.coins += sharedCoins;
        io.emit('chatMessage', {
          text: `${p.name} recebeu ${sharedCoins} moedas compartilhadas!`,
          type: 'system'
        });
      }
    });
  }

  const highestLevel = gameState.players.reduce((max, p) => Math.max(max, p.level), 0);
  if (highestLevel >= gameState.teamGoal) {
    gameState.teamLevel++;
    gameState.teamGoal += 5;
    io.emit('chatMessage', {
      text: `Equipe atingiu o nível ${gameState.teamLevel}! Todos ganham +${gameState.teamLevel * 10}% de moedas!`,
      type: 'system'
    });
    gameState.players.forEach(player => {
      player.coins += Math.round(player.coins * (gameState.teamLevel * 0.1));
    });
  }
}

function getUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  return upgrade.effect(upgrade.level);
}

// Iniciar timer do auto-clicker
setInterval(() => {
  const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
  if (autoClickerUpgrade && autoClickerUpgrade.level > 0) {
    gameState.players.forEach(player => {
      const clickValue = calculateClickValue(player) * autoClickerUpgrade.effect(autoClickerUpgrade.level);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;

      if (player.clicks >= (player.targetClicks || 10)) {
        levelUp(player);
      }
    });
    broadcastGameState();
    checkAchievements();
  }
}, 1000);

// Verificar conquistas periodicamente
setInterval(checkAchievements, 2000);

// Configurar porta para o Render
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
