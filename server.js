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
        id: 'first-level',
        name: 'Primeiro Nível',
        description: 'Complete o nível 1',
        unlocked: false,
        requirement: () => level > 1,
        reward: 5
      },
      {
        id: 'level-5',
        name: 'Persistente',
        description: 'Alcance o nível 5',
        unlocked: false,
        requirement: () => level >= 5,
        reward: 20
      },
      {
        id: 'level-10',
        name: 'Dedicado',
        description: 'Alcance o nível 10',
        unlocked: false,
        requirement: () => level >= 10,
        reward: 50
      },
      {
        id: 'level-25',
        name: 'Mestre Clicker',
        description: 'Alcance o nível 25',
        unlocked: false,
        requirement: () => level >= 25,
        reward: 150
      },
      {
        id: 'coins-100',
        name: 'Colecionador',
        description: 'Acumule 100 moedas',
        unlocked: false,
        requirement: () => coins >= 100,
        reward: 10
      },
      {
        id: 'upgrade-max',
        name: 'Aprimorado',
        description: 'Maximize um upgrade',
        unlocked: false,
        requirement: () => upgrades.some(upgrade => upgrade.level >= upgrade.maxLevel),
        reward: 75
      },
      {
        id: 'team-goal',
        name: 'Esforço de Equipe',
        description: 'Atinja o primeiro objetivo da equipe',
        unlocked: false,
        requirement: () => teamLevel > 1,
        reward: 30
      },
      {
        id: 'team-players-3',
        name: 'Trabalho em Equipe',
        description: 'Tenha 3 ou mais jogadores na equipe',
        unlocked: false,
        requirement: () => players.length >= 3,
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
          // Atualizar o clickPower dos jogadores
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
        broadcastGameState();
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
  return clickPower;
}

function levelUp(player) {
  player.level++;
  player.clicks = 0;
  player.targetClicks = Math.ceil((player.targetClicks || 10) * 1.25);
  const coinsAwarded = player.level * 5;
  player.coins += coinsAwarded;
  gameState.coins += coinsAwarded;
  io.emit('chatMessage', {
    text: `${player.name} alcançou o nível ${player.level}! +${coinsAwarded} moedas`,
    type: 'system'
  });

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
