const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const upgrades = require('./main/gameModules/upgrades');
const achievements = require('./main/gameModules/achievements');
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

// console.log('[Debug] Prestige Upgrades inicializados:', prestigeUpgrades);

let gameState = {
  players: [],
  teamLevel: 1,
  teamClicksRemaining: 100,
  clicks: 0,
  teamCoins: 0,
  upgrades: upgrades,
  achievements: achievements,
  powerUps: powerUps,
  fragments: 0,
  prestigeUpgrades: prestigeUpgrades,
  totalClicks: 0, // Novo campo para persistir cliques totais
  lastAutoClickerLevel: 0, // Novo campo para rastrear nível do auto-clicker
};

let lastActiveTime = Date.now();
let lastTotalCPS = 0;

// Função para preparar gameState para envio, removendo funções
function prepareGameStateForBroadcast(state) {
  const preparedState = JSON.parse(JSON.stringify(state, (key, value) => {
    if (typeof value === 'function') {
      return undefined; // Remove funções do objeto
    }
    return value;
  }));
  return preparedState;
}

function broadcastGameState() {
  gameState.players.forEach(player => {
    player.clickValue = calculateClickValue(player);
  });
  gameState.players.sort((a, b) => b.contribution - a.contribution);
  const preparedState = prepareGameStateForBroadcast(gameState);
  io.emit('gameStateUpdate', preparedState);

  const totalClicks = gameState.players.reduce((sum, p) => sum + p.clicks, 0);
  lastTotalCPS = totalClicks / 60; // média de cliques por segundo
}

function checkAchievements() {
  let newUnlocks = false;
  gameState.achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.requirement(gameState)) {
      achievement.unlocked = true;
      gameState.teamCoins += achievement.reward;
      console.log(`[Conquista] ${achievement.name} desbloqueada. Recompensa: ${achievement.reward} moedas`);
      newUnlocks = true;
    }
  });
  if (newUnlocks) {
    broadcastGameState();
  }
}

function isActivePlayer(socketId, playerId) {
  return socketId === playerId;
}

io.on('connection', (socket) => {
  console.log('[Conexão] Novo jogador conectado:', socket.id);
  
  if (gameState.players.length === 0) {
    const timeDiff = (Date.now() - lastActiveTime) / 1000; // segundos
    
    // Calcular cliques manuais offline
    const manualOfflineClicks = Math.floor(lastTotalCPS * timeDiff);
    
    // Calcular cliques automáticos offline
    const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
    const autoClickerLevel = autoClickerUpgrade ? autoClickerUpgrade.level : 0;
    const autoClicksPerSecond = autoClickerLevel; // 1 clique por segundo por nível
    const autoOfflineClicks = Math.floor(autoClicksPerSecond * timeDiff);
    
    const totalOfflineClicks = manualOfflineClicks + autoOfflineClicks;
    
    if (totalOfflineClicks > 0) {
      console.log(`[Progresso Offline] Servidor ganhou ${totalOfflineClicks} cliques (${manualOfflineClicks} manuais + ${autoOfflineClicks} automáticos) em ${timeDiff.toFixed(0)} segundos`);
      gameState.clicks += totalOfflineClicks;
      gameState.totalClicks += totalOfflineClicks; // Atualizar cliques totais
      gameState.teamClicksRemaining -= totalOfflineClicks;

      while (gameState.teamClicksRemaining <= 0) {
        levelUpTeam();
      }
    }
  }

  const preparedState = prepareGameStateForBroadcast(gameState);
  socket.emit('gameStateUpdate', preparedState);

  socket.on('addPlayer', (playerData) => {
    if (gameState.players.length >= 3) {
      socket.emit('gameStateUpdate', prepareGameStateForBroadcast(gameState));
      socket.emit('notification', 'O limite de 3 jogadores foi atingido!');
      console.log(`[Erro] Tentativa de adicionar jogador falhou: Limite de 3 jogadores atingido`);
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
      console.log(`[Erro] Tentativa de adicionar jogador duplicado: ${playerData.name}`);
    }
  });

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;
      gameState.totalClicks += clickValue; // Atualizar cliques totais
      gameState.teamClicksRemaining -= clickValue;

      console.log(`[Clique] Jogador: ${player.name}, Valor do clique: ${clickValue}, Cliques totais: ${player.clicks}, Contribuição: ${player.contribution}, Cliques restantes da equipe: ${gameState.teamClicksRemaining}`);

      if (gameState.teamClicksRemaining <= 0) {
        console.log('[Equipe] Nível da equipe aumentado!');
        levelUpTeam();
      }
      broadcastGameState();
      checkAchievements();
    } else {
      console.log('[Erro] Jogador não encontrado para clique:', socket.id);
    }
  });

  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('[Erro] Jogador não encontrado para compra de upgrade:', socket.id);
      socket.emit('notification', 'Jogador não encontrado!');
      return;
    }

    if (!isActivePlayer(socket.id, player.id)) {
      console.log(`[Erro] ${player.name} não é o jogador ativo para este cliente`);
      socket.emit('notification', 'Você só pode comprar upgrades quando for o jogador ativo!');
      return;
    }

    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      console.log(`[Erro] Upgrade ${upgradeId} não encontrado`);
      socket.emit('notification', 'Upgrade não encontrado!');
      return;
    }

    let price = getUpgradePrice(upgrade);
    console.log(`[Upgrade] Jogador: ${player.name} tentando comprar ${upgrade.name} nível ${upgrade.level + 1} por ${price} moedas. Moedas do time: ${gameState.teamCoins}`);

    if (gameState.teamCoins >= price && upgrade.level < upgrade.maxLevel) {
      gameState.teamCoins -= price;
      upgrade.level++;
      console.log(`[Upgrade] Compra bem-sucedida: ${upgrade.name} agora é nível ${upgrade.level}`);

      const sharedRewardBonus = getUpgradeEffect('shared-rewards');
      if (sharedRewardBonus > 0) {
        const sharedCoins = Math.round(price * sharedRewardBonus);
        gameState.teamCoins += sharedCoins;
        console.log(`[Recompensa Compartilhada] Time recebeu ${sharedCoins} moedas`);
      }

      broadcastGameState();
      checkAchievements();
    } else {
      if (gameState.teamCoins < price) {
        console.log(`[Erro] Moedas insuficientes para o time: ${gameState.teamCoins}/${price}`);
        socket.emit('notification', `Moedas insuficientes! Necessário: ${price}, Disponível: ${gameState.teamCoins}`);
      } else if (upgrade.level >= upgrade.maxLevel) {
        console.log(`[Erro] Upgrade ${upgrade.name} já está no nível máximo`);
        socket.emit('notification', `${upgrade.name} já está no nível máximo!`);
      }
    }
  });

  socket.on('prestige', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('[Erro] Jogador não encontrado para prestígio:', socket.id);
      socket.emit('notification', 'Jogador não encontrado!');
      return;
    }

    if (!isActivePlayer(socket.id, player.id)) {
      console.log(`[Erro] ${player.name} não é o jogador ativo para este cliente`);
      socket.emit('notification', 'Você só pode prestigiar quando for o jogador ativo!');
      return;
    }

    if (player.level >= 2) {
      player.prestige = (player.prestige || 0) + 1;
      player.prestigeMultiplier = 1 + player.prestige * 0.1;
      player.clicks = 0;
      player.level = 1;
      player.contribution = 0;
      gameState.teamCoins = 0;
      gameState.upgrades.forEach(u => u.level = 0);
      io.to(player.id).emit('notification', `Prestígio ativado! Multiplicador: x${player.prestigeMultiplier.toFixed(1)}`);
      console.log(`[Prestígio] ${player.name} ativou prestígio ${player.prestige}`);
    }

    const fragmentMultiplier = gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier')?.effect(gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier')?.level) || 1;
    const baseFragments = Math.floor(Math.sqrt(player.level) * 2);
    const fragmentsToGain = Math.floor(baseFragments * fragmentMultiplier);
    gameState.fragments = (gameState.fragments || 0) + fragmentsToGain;
    
    player.level = 1;
    player.clicks = 0;
    player.contribution = 0;
    gameState.teamCoins = 0;
    gameState.upgrades.forEach(u => u.level = 0);
    
    socket.emit('notification', `Prestígio realizado! Ganhou ${fragmentsToGain} fragmentos!`);
    broadcastGameState();
  });

  socket.on('activatePowerUp', (powerUpId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('[Erro] Jogador não encontrado para ativar power-up:', socket.id);
      socket.emit('notification', 'Jogador não encontrado!');
      return;
    }

    if (!isActivePlayer(socket.id, player.id)) {
      console.log(`[Erro] ${player.name} não é o jogador ativo para este cliente`);
      socket.emit('notification', 'Você só pode ativar power-ups quando for o jogador ativo!');
      return;
    }

    const powerUp = gameState.powerUps[powerUpId];
    if (!powerUp) {
      console.log(`[Erro] Power-up ${powerUpId} não encontrado`);
      socket.emit('notification', 'Power-up não encontrado!');
      return;
    }

    if (!powerUp.active) {
      powerUp.active = true;
      console.log(`[Power-Up] ${player.name} ativou ${powerUpId}`);
      io.to(player.id).emit('notification', `${powerUpId} ativado por ${powerUp.duration/1000} segundos!`);
      broadcastGameState();

      setTimeout(() => {
        powerUp.active = false;
        console.log(`[Power-Up] ${powerUpId} expirou`);
        broadcastGameState();
      }, powerUp.duration);
    } else {
      console.log(`[Erro] ${powerUpId} já está ativo`);
      socket.emit('notification', `${powerUpId} já está ativo!`);
    }
  });

  socket.on('activatePowerUp', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !isActivePlayer(socket.id, player.id)) {
      socket.emit('notification', 'Você só pode ativar power-ups quando for o jogador ativo!');
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
    console.log(`[Power-Up] ${player.name} ativou ${powerUp.name}`);
    io.to(player.id).emit('powerUpActivated', {
        name: powerUp.name,
        description: powerUp.description,
        duration: powerUp.duration,
        color: powerUp.color
    });
    broadcastGameState();

    setTimeout(() => {
      powerUp.active = false;
      console.log(`[Power-Up] ${powerUp.name} expirou`);
      broadcastGameState();
    }, powerUp.duration);
  });

  socket.on('buyPrestigeUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('[Erro] Jogador não encontrado para compra de upgrade de prestígio:', socket.id);
      socket.emit('notification', 'Jogador não encontrado!');
      return;
    }

    if (!isActivePlayer(socket.id, player.id)) {
      console.log(`[Erro] ${player.name} não é o jogador ativo para este cliente`);
      socket.emit('notification', 'Você só pode comprar upgrades quando for o jogador ativo!');
      return;
    }

    const upgrade = gameState.prestigeUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      console.log(`[Erro] Upgrade de prestígio ${upgradeId} não encontrado`);
      socket.emit('notification', 'Upgrade não encontrado!');
      return;
    }

    let price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    console.log(`[Upgrade de Prestígio] Jogador: ${player.name} tentando comprar ${upgrade.name} nível ${upgrade.level + 1} por ${price} fragmentos. Fragmentos disponíveis: ${gameState.fragments}`);

    if (gameState.fragments >= price && upgrade.level < upgrade.maxLevel) {
      gameState.fragments -= price;
      upgrade.level++;
      console.log(`[Upgrade de Prestígio] Compra bem-sucedida: ${upgrade.name} agora é nível ${upgrade.level}`);
      broadcastGameState();
      socket.emit('notification', `Upgrade ${upgrade.name} comprado! Agora é nível ${upgrade.level}`);
    } else {
      if (gameState.fragments < price) {
        console.log(`[Erro] Fragmentos insuficientes: ${gameState.fragments}/${price}`);
        socket.emit('notification', `Fragmentos insuficientes! Necessário: ${price}, Disponível: ${gameState.fragments}`);
      } else if (upgrade.level >= upgrade.maxLevel) {
        console.log(`[Erro] Upgrade ${upgrade.name} já está no nível máximo`);
        socket.emit('notification', `${upgrade.name} já está no nível máximo!`);
      }
    }
  });

  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = gameState.players[playerIndex].name;
      gameState.players.splice(playerIndex, 1);
      console.log(`[Desconexão] Jogador ${playerName} desconectado`);
      
      if (gameState.players.length === 0) {
        lastActiveTime = Date.now();
        const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
        gameState.lastAutoClickerLevel = autoClickerUpgrade ? autoClickerUpgrade.level : 0;
        console.log('[Servidor] Último jogador saiu, registrando tempo:', lastActiveTime);
      }
      
      broadcastGameState();
    }
  });
});

function calculateClickValue(player) {
  let clickPower = 1 * (player.prestigeMultiplier || 1);
  const clickPowerUpgrade = gameState.upgrades.find(u => u.id === 'click-power');
  if (clickPowerUpgrade) {
    clickPower += clickPowerUpgrade.effect(clickPowerUpgrade.level) - 1;
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
  console.log(`[Click Value] Calculado para ${player.name}: ${clickPower}`);
  return clickPower;
}

function levelUpTeam() {
  gameState.teamLevel++;
  
  gameState.players.forEach(player => {
    player.level++;
    const coinsAwarded = 10 * gameState.teamLevel * getUpgradeEffect('coin-boost');
    gameState.teamCoins += coinsAwarded;
    console.log(`[Level Up] Jogador: ${player.name} subiu para nível ${player.level}. Time ganhou ${coinsAwarded} moedas.`);
  });

  gameState.teamClicksRemaining = 100 * gameState.teamLevel;

  const teamBonus = gameState.teamLevel * 10;
  const bonusCoins = Math.round(gameState.teamCoins * (teamBonus / 100));
  gameState.teamCoins += bonusCoins;
  console.log(`[Bônus Equipe] Time recebeu bônus de ${teamBonus}%: ${bonusCoins} moedas. Total agora é ${gameState.teamCoins}`);

  broadcastGameState();
  checkAchievements();
}

function getUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  return upgrade.effect(upgrade.level);
}

setInterval(() => {
  const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
  if (autoClickerUpgrade && autoClickerUpgrade.level > 0) {
    gameState.players.forEach(player => {
      const clickValue = calculateClickValue(player) * autoClickerUpgrade.effect(autoClickerUpgrade.level);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;
      gameState.totalClicks += clickValue; // Atualizar cliques totais
      gameState.teamClicksRemaining -= clickValue;
      console.log(`[Auto-Clicker] Jogador: ${player.name}, Cliques automáticos: ${clickValue}, Cliques restantes da equipe: ${gameState.teamClicksRemaining}`);

      if (gameState.teamClicksRemaining <= 0) {
        console.log('[Auto-Clicker] Nível da equipe aumentado!');
        levelUpTeam();
      }
    });
    broadcastGameState();
    checkAchievements();
  }
}, 1000);

setInterval(checkAchievements, 2000);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`[Inicialização] Servidor rodando na porta ${port}`);
});