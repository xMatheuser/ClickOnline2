const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const upgrades = require('./upgrades');
const achievements = require('./achievements');
const powerUps = require('./powerUps');

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
  teamClicksRemaining: 100,
  clicks: 0,
  teamCoins: 0, // Moedas unificadas do time
  upgrades: upgrades,
  achievements: achievements,
  powerUps: powerUps
};

// Função para atualizar todos os clientes
function broadcastGameState() {
  gameState.players.sort((a, b) => b.contribution - a.contribution);
  io.emit('gameStateUpdate', gameState);
}

// Função para verificar conquistas
function checkAchievements() {
  let newUnlocks = false;
  gameState.achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.requirement(gameState)) {
      achievement.unlocked = true;
      gameState.teamCoins += achievement.reward; // Adicionar ao teamCoins
      console.log(`[Conquista] ${achievement.name} desbloqueada. Recompensa: ${achievement.reward} moedas`);
      newUnlocks = true;
    }
  });
  if (newUnlocks) {
    broadcastGameState();
  }
}

// Verificar se o jogador é o ativo no cliente que enviou o pedido
function isActivePlayer(socketId, playerId) {
  return socketId === playerId;
}

io.on('connection', (socket) => {
  console.log('[Conexão] Novo jogador conectado:', socket.id);
  socket.emit('gameStateUpdate', gameState);

  socket.on('addPlayer', (playerData) => {
    if (gameState.players.length >= 3) {
      socket.emit('gameStateUpdate', gameState);
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
      gameState.teamClicksRemaining -= clickValue;

      console.log(`[Clique] Jogador: ${player.name}, Valor do clique: ${clickValue}, Cliques totais: ${player.clicks}, Contribuição: ${player.contribution}, Cliques restantes da equipe: ${gameState.teamClicksRemaining}`);

      if (gameState.teamClicksRemaining <= 0) {
        console.log('[Equipe] Objetivo da equipe atingido! Subindo nível de todos os jogadores.');
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

    if (player.level >= 25) {
      player.prestige = (player.prestige || 0) + 1;
      player.prestigeMultiplier = 1 + player.prestige * 0.1;
      player.clicks = 0;
      player.level = 1;
      player.contribution = 0;
      gameState.teamCoins = 0; // Resetar moedas do time no prestígio
      gameState.upgrades.forEach(u => u.level = 0);
      io.to(player.id).emit('notification', `Prestígio ativado! Multiplicador: x${player.prestigeMultiplier.toFixed(1)}`);
      console.log(`[Prestígio] ${player.name} ativou prestígio ${player.prestige}`);
      broadcastGameState();
    }
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

  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = gameState.players[playerIndex].name;
      gameState.players.splice(playerIndex, 1);
      console.log(`[Desconexão] Jogador ${playerName} desconectado`);
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
  console.log(`[Click Value] Calculado para ${player.name}: ${clickPower}`);
  return clickPower;
}

function levelUpTeam() {
  gameState.teamLevel++;
  
  gameState.players.forEach(player => {
    player.level++;
    const coinsAwarded = 10 * gameState.teamLevel * getUpgradeEffect('coin-boost'); // Aplicar boost de moedas
    gameState.teamCoins += coinsAwarded;
    console.log(`[Level Up] Jogador: ${player.name} subiu para nível ${player.level}. Time ganhou ${coinsAwarded} moedas.`);
  });

  const highestLevel = gameState.players.reduce((max, p) => Math.max(max, p.level), 0);
  console.log(`[Progresso Equipe] Nível mais alto: ${highestLevel}, Objetivo atual: ${gameState.teamGoal}`);
  if (highestLevel === gameState.teamGoal) {
    gameState.teamGoal++;
    console.log(`[Objetivo Equipe] Novo objetivo: Nível ${gameState.teamGoal}`);
  }

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

// Iniciar timer do auto-clicker
setInterval(() => {
  const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
  if (autoClickerUpgrade && autoClickerUpgrade.level > 0) {
    gameState.players.forEach(player => {
      const clickValue = calculateClickValue(player) * autoClickerUpgrade.effect(autoClickerUpgrade.level);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;
      gameState.teamClicksRemaining -= clickValue;
      console.log(`[Auto-Clicker] Jogador: ${player.name}, Cliques automáticos: ${clickValue}, Cliques restantes da equipe: ${gameState.teamClicksRemaining}`);

      if (gameState.teamClicksRemaining <= 0) {
        console.log('[Auto-Clicker] Objetivo da equipe atingido! Subindo nível de todos os jogadores.');
        levelUpTeam();
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
  console.log(`[Inicialização] Servidor rodando na porta ${port}`);
});