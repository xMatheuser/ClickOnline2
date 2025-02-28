const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const gameState = {
  players: [],
  upgrades: [
    {
      id: 'click-power',
      name: 'Poder de Clique',
      description: 'Aumenta o poder de clique em +1 por nível',
      basePrice: 10,
      level: 0,
      maxLevel: 10,
      effect: level => level + 1,
      priceIncrease: 1.5
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
    }
  ],
  achievements: [
    {
      id: 'first-level',
      name: 'Primeiro Nível',
      description: 'Alcance o nível 2',
      condition: () => gameState.players.some(player => player.level >= 2),
      reward: 20,
      unlocked: false
    },
    {
      id: 'team-player',
      name: 'Jogador de Equipe',
      description: 'Tenha 3 jogadores na equipe',
      condition: () => gameState.players.length >= 3,
      reward: 50,
      unlocked: false
    }
  ],
  teamLevel: 1,
  teamGoal: 5,
  teamCoins: 0 // Novo campo para moedas compartilhadas
};

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  return upgrade ? upgrade.effect(upgrade.level) : 0;
}

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
  const clickValue = calculateClickValue(player);
  const adjustedClicks = player.clicks * clickValue;

  if (adjustedClicks >= player.targetClicks) {
    player.level++;
    player.clicks = 0;
    player.targetClicks = Math.ceil(player.targetClicks * 1.5);
    gameState.teamCoins += player.level * 5; // Adiciona moedas ao total compartilhado

    const highestLevel = gameState.players.reduce((max, p) => Math.max(max, p.level), 0);
    if (highestLevel >= gameState.teamGoal) {
      gameState.teamLevel++;
      gameState.teamGoal += 5;
      io.emit('chatMessage', {
        text: `Equipe atingiu o nível ${gameState.teamLevel}! Todos ganham +${gameState.teamLevel * 10}% de moedas!`,
        type: 'system'
      });
      gameState.teamCoins += Math.round(gameState.teamCoins * (gameState.teamLevel * 0.1));
    }

    io.emit('chatMessage', {
      text: `${player.name} subiu para o nível ${player.level}!`,
      type: 'player'
    });
  }
}

function checkAchievements() {
  gameState.achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.condition()) {
      achievement.unlocked = true;
      gameState.teamCoins += achievement.reward; // Adiciona a recompensa ao total compartilhado
      io.emit('chatMessage', {
        text: `Conquista desbloqueada: ${achievement.name}! Recompensa: ${achievement.reward} moedas`,
        type: 'system'
      });
    }
  });
}

io.on('connection', (socket) => {
  socket.on('addPlayer', ({ name, role }) => {
    if (gameState.players.some(player => player.name === name)) {
      socket.emit('chatMessage', {
        text: `O nome ${name} já está em uso!`,
        type: 'system'
      });
      return;
    }

    const bonuses = {
      clicker: { value: 0.2 },
      upgrader: { value: -0.15 },
      supporter: { value: 0.1 }
    };

    const newPlayer = {
      id: socket.id,
      name,
      role,
      bonus: bonuses[role],
      level: 1,
      clicks: 0,
      contribution: 0,
      targetClicks: 10
    };

    gameState.players.push(newPlayer);
    io.emit('chatMessage', {
      text: `${name} entrou no jogo como ${role}!`,
      type: 'player'
    });
    io.emit('gameStateUpdate', gameState);
  });

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) return;

    player.clicks++;
    player.contribution++;

    levelUp(player);
    checkAchievements();
    io.emit('gameStateUpdate', gameState);
  });

  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) return;

    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.level >= upgrade.maxLevel) return;

    let price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    const upgraderDiscount = gameState.players.some(p => p.role === 'upgrader') && upgrade.level < upgrade.maxLevel
      ? gameState.players.filter(p => p.role === 'upgrader').reduce((sum, p) => sum + (p.bonus?.value || -0.15), 0)
      : 0;
    price = Math.round(price * (1 + upgraderDiscount));

    if (gameState.teamCoins < price) {
      socket.emit('chatMessage', {
        text: `Moedas insuficientes! Precisa de ${price} moedas.`,
        type: 'system'
      });
      return;
    }

    gameState.teamCoins -= price; // Subtrai do total compartilhado
    upgrade.level++;
    io.emit('chatMessage', {
      text: `${player.name} comprou ${upgrade.name} nível ${upgrade.level}!`,
      type: 'player'
    });
    io.emit('gameStateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = gameState.players[playerIndex];
      io.emit('chatMessage', {
        text: `${player.name} saiu do jogo.`,
        type: 'system'
      });
      gameState.players.splice(playerIndex, 1);
      io.emit('gameStateUpdate', gameState);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
