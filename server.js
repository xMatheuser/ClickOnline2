const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const upgrades = require('./main/gameModules/upgrades');
const { achievements, achievementCategories } = require('./main/gameModules/achievements'); // Fix import
const powerUps = require('./main/gameModules/powerUps');
const prestigeUpgrades = require('./main/gameModules/prestigeUpgrades');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, 'main/public')));
app.use('/assets', express.static(path.join(__dirname, 'main/assets')));

let gameState = {
  players: [],
  teamLevel: 1,
  levelProgressRemaining: 100,
  clicks: 0,
  teamCoins: 0,
  upgrades: upgrades,
  achievements: achievements, // This is now the array
  achievementCategories: achievementCategories, // Add categories to gameState
  powerUps: powerUps,
  fragments: 0,
  prestigeUpgrades: prestigeUpgrades,
  totalClicks: 0,
  lastAutoClickerLevel: 0,
  powerUpUses: 0, // Novo campo para rastrear usos de power-ups
  lastActiveTime: Date.now(),
  bonusStats: {
    clickPower: 0,
    autoClicker: 0, 
    coinMultiplier: 0,
    progressBoost: 0,
    teamSynergy: 0,
    sharedRewards: 0,
    achievementBonus: 0,
    prestigeMultiplier: 0,
    powerUpBonus: 0
  },
  achievementBoosts: { // Boosts cumulativos
    clickMultiplier: 1,
    autoMultiplier: 1,
    prestigeCostReduction: 1,
    powerUpDuration: 1,
    upgradeEffect: 1
  }
};

let lastTotalCPS = 0;

function prepareGameStateForBroadcast(state) {
  // Adicionar flag para diferenciar tipos de atualizações
  const preparedState = JSON.parse(JSON.stringify(state, (key, value) => {
    if (typeof value === 'function') {
      return undefined;
    }
    return value;
  }));
  return preparedState;
}

function broadcastGameState(type = 'full') {
  gameState.players.forEach(player => {
    player.clickValue = calculateClickValue(player);
  });
  gameState.players.sort((a, b) => b.contribution - a.contribution);
  const preparedState = prepareGameStateForBroadcast(gameState);
  
  // Enviar apenas dados essenciais para atualizações de clique
  if (type === 'autoclick') {
    const essentialData = {
      type: 'autoclick',
      teamCoins: gameState.teamCoins,
      levelProgressRemaining: gameState.levelProgressRemaining,
      players: gameState.players.map(p => ({
        id: p.id,
        clicks: p.clicks,
        contribution: p.contribution,
        clickValue: p.clickValue
      })),
      totalClicks: gameState.totalClicks,
      clicks: gameState.clicks
    };
    io.emit('gameStateUpdate', essentialData);
  } else {
    preparedState.type = 'full';
    io.emit('gameStateUpdate', preparedState);
  }
}

function checkAchievements() {
  let newUnlocks = false;
  gameState.achievements.forEach(achievement => {
    achievement.levels.forEach((level, index) => {
      if (!achievement.unlockedLevels.includes(index) && level.requirement(gameState)) {
        achievement.unlockedLevels.push(index);
        applyAchievementBoost(level.boost);
        console.log(`[Conquista] ${achievement.name} Nível ${index + 1} desbloqueada`);
        newUnlocks = true;
      }
    });
  });
  if (newUnlocks) {
    broadcastGameState();
  }
}

function applyAchievementBoost(boost) {
  switch (boost.type) {
    case 'clickMultiplier':
      gameState.achievementBoosts.clickMultiplier += boost.value;
      break;
    case 'autoMultiplier':
      gameState.achievementBoosts.autoMultiplier += boost.value;
      break;
    case 'prestigeCostReduction':
      gameState.achievementBoosts.prestigeCostReduction -= boost.value;
      break;
    case 'powerUpDuration':
      gameState.achievementBoosts.powerUpDuration += boost.value;
      break;
    case 'upgradeEffect':
      gameState.achievementBoosts.upgradeEffect += boost.value;
      break;
  }
}

function isActivePlayer(socketId, playerId) {
  return socketId === playerId;
}

function applyOfflineClicks(totalClicks) {
  let remainingClicks = totalClicks;
  let levelsGained = 0;
  let coinsGained = 0;

  while (remainingClicks > 0) {
    const currentLevelTarget = gameState.teamLevel * 100;
    
    if (remainingClicks >= gameState.levelProgressRemaining) {
      remainingClicks -= gameState.levelProgressRemaining;
      levelsGained++;
      const coinsForThisLevel = 10 * gameState.teamLevel * getUpgradeEffect('coin-boost');
      coinsGained += coinsForThisLevel;
      gameState.teamLevel++;
      gameState.levelProgressRemaining = currentLevelTarget;
    } else {
      gameState.levelProgressRemaining -= remainingClicks;
      remainingClicks = 0;
    }
  }

  if (levelsGained > 0) {
    gameState.players.forEach(player => {
      player.level += levelsGained;
    });
  }

  gameState.teamCoins += coinsGained;

  return { levelsGained, coinsGained };
}

io.on('connection', (socket) => {
  console.log('[Conexão] Novo jogador conectado:', socket.id);
  
  if (gameState.players.length === 0) {
    const timeDiff = (Date.now() - gameState.lastActiveTime) / 1000;
    const manualOfflineClicks = Math.floor(lastTotalCPS * timeDiff);
    const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
    const autoClickerLevel = autoClickerUpgrade ? autoClickerUpgrade.level : 0;
    const autoClicksPerSecond = autoClickerLevel * gameState.achievementBoosts.autoMultiplier;
    const autoOfflineClicks = Math.floor(autoClicksPerSecond * timeDiff);
    const totalOfflineClicks = manualOfflineClicks + autoOfflineClicks;
    
    if (totalOfflineClicks > 0) {
      console.log(`[Progresso Offline] Calculando ${totalOfflineClicks} cliques (${manualOfflineClicks} manuais + ${autoOfflineClicks}) em ${timeDiff.toFixed(0)} segundos`);
      const progress = applyOfflineClicks(totalOfflineClicks);
      gameState.clicks += totalOfflineClicks;
      gameState.totalClicks += totalOfflineClicks;

      socket.emit('offlineProgress', {
        clicks: totalOfflineClicks,
        levels: progress.levelsGained,
        coins: progress.coinsGained,
        timeDiff: Math.floor(timeDiff)
      });
    }
  }

  const preparedState = prepareGameStateForBroadcast(gameState);
  socket.emit('gameStateUpdate', preparedState);

  socket.on('addPlayer', (playerData) => {
    if (gameState.players.length >= 3) {
      socket.emit('gameStateUpdate', prepareGameStateForBroadcast(gameState));
      socket.emit('notification', 'O limite de 3 jogadores foi atingido!');
      return;
    }

    if (!gameState.players.some(p => p.name === playerData.name)) {
      playerData.id = socket.id;
      playerData.clicks = 0;
      playerData.level = 1;
      playerData.contribution = 0;
      playerData.prestige = 0;
      playerData.prestigeMultiplier = 1;
      gameState.players.push(playerData);
      console.log(`[Novo Jogador] Jogador ${playerData.name} adicionado`);
      broadcastGameState();
      checkAchievements();
    } else {
      socket.emit('notification', 'Este nome já está em uso!');
    }
  });

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;
      gameState.totalClicks += clickValue;
      gameState.levelProgressRemaining -= clickValue;

      if (gameState.levelProgressRemaining <= 0) {
        levelUpTeam();
      }
      broadcastGameState();
      checkAchievements();
    }
  });

  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !isActivePlayer(socket.id, player.id)) {
      socket.emit('notification', 'Você só pode comprar upgrades quando for o jogador ativo!');
      return;
    }

    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      socket.emit('notification', 'Upgrade não encontrado!');
      return;
    }

    let price = getUpgradePrice(upgrade);
    if (gameState.teamCoins >= price && upgrade.level < upgrade.maxLevel) {
      gameState.teamCoins -= price;
      upgrade.level++;
      const sharedRewardBonus = getUpgradeEffect('shared-rewards');
      if (sharedRewardBonus > 0) {
        const sharedCoins = Math.round(price * sharedRewardBonus);
        gameState.teamCoins += sharedCoins;
      }
      broadcastGameState();
      checkAchievements();
    } else {
      socket.emit('notification', gameState.teamCoins < price ? `Moedas insuficientes!` : `${upgrade.name} já está no nível máximo!`);
    }
  });

  socket.on('prestige', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !isActivePlayer(socket.id, player.id)) {
      socket.emit('notification', 'Você só pode prestigiar quando for o jogador ativo!');
      return;
    }

    if (player.level >= 2) {
      const fragmentMultiplier = gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier')?.effect(gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier')?.level) || 1;
      const baseFragments = Math.floor(Math.sqrt(player.level) * 2);
      const fragmentsToGain = Math.floor(baseFragments * fragmentMultiplier * gameState.achievementBoosts.prestigeCostReduction);
      
      player.prestige = (player.prestige || 0) + 1;
      player.prestigeMultiplier = 1 + player.prestige * 0.1;
      player.clicks = 0;
      player.level = 1;
      player.contribution = 0;
      gameState.teamCoins = 0;
      gameState.teamLevel = 1;
      gameState.levelProgressRemaining = 100;
      gameState.upgrades.forEach(u => u.level = 0);
      gameState.fragments = (gameState.fragments || 0) + fragmentsToGain;
      
      io.to(player.id).emit('notification', `Prestígio ativado!\nMultiplicador: x${player.prestigeMultiplier.toFixed(1)}\nFragmentos ganhos: ${fragmentsToGain}`);
      broadcastGameState();
      checkAchievements();
    } else {
      socket.emit('notification', 'Você precisa estar pelo menos no nível 2 para prestigiar!');
    }
  });

  socket.on('activatePowerUp', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !isActivePlayer(socket.id, player.id)) {
      socket.emit('notification', 'Você só pode ativar power-ups quando for o jogador ativo!');
      return;
    }

    const powerupsUpgrade = gameState.prestigeUpgrades.find(u => u.id === 'powerups-unlock');
    if (!powerupsUpgrade || powerupsUpgrade.level === 0) {
      socket.emit('notification', 'Desbloqueie os Power-Ups através do upgrade de prestígio!');
      return;
    }

    const availablePowerUps = Object.entries(gameState.powerUps)
      .filter(([_, powerUp]) => !powerUp.active)
      .map(([id, powerUp]) => ({ id, ...powerUp }));

    if (availablePowerUps.length === 0) {
      socket.emit('notification', 'Todos os power-ups estão ativos!');
      return;
    }

    const randomPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
    const powerUpId = randomPowerUp.id;
    const powerUp = gameState.powerUps[powerUpId];

    powerUp.active = true;
    gameState.powerUpUses += 1; // Incrementar contador de usos
    console.log(`[Power-Up] ${player.name} ativou ${powerUp.name}`);
    io.to(player.id).emit('powerUpActivated', {
      name: powerUp.name,
      description: powerUp.description,
      duration: powerUp.duration * gameState.achievementBoosts.powerUpDuration,
      color: powerUp.color
    });
    broadcastGameState();
    checkAchievements();

    setTimeout(() => {
      powerUp.active = false;
      console.log(`[Power-Up] ${powerUp.name} expirou`);
      broadcastGameState();
    }, powerUp.duration * gameState.achievementBoosts.powerUpDuration);
  });

  socket.on('buyPrestigeUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !isActivePlayer(socket.id, player.id)) {
      socket.emit('notification', 'Você só pode comprar upgrades quando for o jogador ativo!');
      return;
    }

    const upgrade = gameState.prestigeUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      socket.emit('notification', 'Upgrade não encontrado!');
      return;
    }

    let price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    if (gameState.fragments >= price && upgrade.level < upgrade.maxLevel) {
      gameState.fragments -= price;
      upgrade.level++;
      broadcastGameState();
      socket.emit('notification', `Upgrade ${upgrade.name} comprado! Agora é nível ${upgrade.level}`);
    } else {
      socket.emit('notification', gameState.fragments < price ? `Fragmentos insuficientes!` : `${upgrade.name} já está no nível máximo!`);
    }
  });

  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = gameState.players[playerIndex].name;
      gameState.players.splice(playerIndex, 1);
      console.log(`[Desconexão] Jogador ${playerName} desconectado`);
      
      if (gameState.players.length === 0) {
        gameState.lastActiveTime = Date.now();
        const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
        gameState.lastAutoClickerLevel = autoClickerUpgrade ? autoClickerUpgrade.level : 0;
      }
      broadcastGameState();
    }
  });
});

function calculateClickValue(player) {
  let clickPower = 1 * (player.prestigeMultiplier || 1) * gameState.achievementBoosts.clickMultiplier;
  const clickPowerUpgrade = gameState.upgrades.find(u => u.id === 'click-power');
  if (clickPowerUpgrade) {
    clickPower += (clickPowerUpgrade.effect(clickPowerUpgrade.level) - 1) * gameState.achievementBoosts.upgradeEffect;
  }
  const teamSynergyBonus = getUpgradeEffect('team-synergy');
  if (teamSynergyBonus > 0) {
    clickPower *= (1 + teamSynergyBonus);
  }
  if (gameState.powerUps['click-frenzy'].active) {
    clickPower *= gameState.powerUps['click-frenzy'].multiplier;
  }
  if (gameState.powerUps['team-spirit'].active) {
    clickPower *= gameState.powerUps['team-spirit'].multiplier;
  }
  return clickPower;
}

function levelUpTeam() {
  gameState.teamLevel++;
  
  gameState.players.forEach(player => {
    player.level++;
    const coinsAwarded = 10 * gameState.teamLevel * getUpgradeEffect('coin-boost');
    gameState.teamCoins += coinsAwarded;
  });

  gameState.levelProgressRemaining = 100 * gameState.teamLevel;

  const teamBonus = gameState.teamLevel * 10;
  const bonusCoins = Math.round(gameState.teamCoins * (teamBonus / 100));
  gameState.teamCoins += bonusCoins;

  broadcastGameState();
  checkAchievements();
}

function getUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  return upgrade.effect(upgrade.level, gameState) * gameState.achievementBoosts.upgradeEffect;
}

// Modificar o setInterval do auto-clicker para usar o novo tipo
setInterval(() => {
  const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
  if (autoClickerUpgrade && autoClickerUpgrade.level > 0) {
    gameState.players.forEach(player => {
      const clickValue = calculateClickValue(player) * autoClickerUpgrade.effect(autoClickerUpgrade.level) * gameState.achievementBoosts.autoMultiplier;
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;
      gameState.totalClicks += clickValue;
      gameState.levelProgressRemaining -= clickValue;
      if (gameState.levelProgressRemaining <= 0) {
        levelUpTeam();
      }
    });
    broadcastGameState('autoclick');
  }
}, 1000);

setInterval(checkAchievements, 2000);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`[Inicialização] Servidor rodando na porta ${port}`);
});