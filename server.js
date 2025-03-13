const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const upgrades = require('./main/gameModules/upgrades');
const { achievements, achievementCategories } = require('./main/gameModules/achievements'); // Fix import
const powerUps = require('./main/gameModules/powerUps');
const prestigeUpgrades = require('./main/gameModules/prestigeUpgrades');
const bosses = require('./main/gameModules/bossFights');

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
  teamCoins: 100000,
  upgrades: upgrades,
  achievements: achievements, // This is now the array
  achievementCategories: achievementCategories, // Add categories to gameState
  powerUps: powerUps,
  fragments: 100000,
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
  },
  activeBoss: null,
  nextBossLevel: 5, // Primeiro boss aparece no nível 5
  bossSpawnInterval: 10, // Intervalo de níveis entre cada boss
  isInBossFight: false // Add flag for boss fight state
};

let lastTotalCPS = 0;

function prepareGameStateForBroadcast(state) {
  // Criar uma cópia sem o timer e outras propriedades circulares
  const preparedState = JSON.parse(JSON.stringify(state, (key, value) => {
    // Ignorar propriedades que podem causar circularidade
    if (key === 'timer' || key === '_idleNext' || key === '_idlePrev') {
      return undefined;
    }
    if (typeof value === 'function') {
      return undefined;
    }
    return value;
  }));
  return preparedState;
}

let lastBroadcastState = {}; // Armazenar último estado enviado

function getStateDelta(currentState, lastState) {
  const delta = {};
  
  // Comparar apenas campos essenciais
  const fieldsToCheck = [
    'teamCoins', 'levelProgressRemaining', 'totalClicks',
    'clicks', 'teamLevel', 'fragments'
  ];

  for (const field of fieldsToCheck) {
    if (currentState[field] !== lastState[field]) {
      delta[field] = currentState[field];
    }
  }

  // Verificar mudanças em players
  if (currentState.players) {
    delta.players = currentState.players.map(player => ({
      id: player.id,
      clicks: player.clicks,
      contribution: player.contribution,
      clickValue: player.clickValue
    }));
  }

  return delta;
}

function broadcastGameState(type = 'full') {
  gameState.players.forEach(player => {
    player.clickValue = calculateClickValue(player);
  });
  
  if (type === 'autoclick') {
    const delta = getStateDelta(gameState, lastBroadcastState);
    if (Object.keys(delta).length > 0) {
      delta.type = 'delta';
      io.emit('gameStateUpdate', delta);
    }
  } else {
    const preparedState = prepareGameStateForBroadcast(gameState);
    preparedState.type = 'full';
    io.emit('gameStateUpdate', preparedState);
    lastBroadcastState = JSON.parse(JSON.stringify(gameState));
  }
}

function checkAchievements() {
  let newUnlocks = false;
  gameState.achievements.forEach(achievement => {
    achievement.levels.forEach((level, index) => {
      if (!achievement.unlockedLevels.includes(index) && level.requirement(gameState)) {
        achievement.unlockedLevels.push(index);
        applyAchievementBoost(level.boost);
        
        // Emitir notificação específica para a conquista
        io.emit('notification', `🏆 Nova Conquista: ${achievement.name} Nível ${index + 1}!\n+${(level.boost.value * 100).toFixed(0)}% ${level.boost.type}`);
        
        // Emitir evento para tocar o som e atualizar badge
        io.emit('achievementUnlocked');
        
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
    try {
      if (gameState.players.length >= 3) {
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
    } catch (error) {
      console.error('[Error] Failed to add player:', error);
      socket.emit('notification', 'Erro ao adicionar jogador');
    }
  });

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      
      if (gameState.isInBossFight) {
        // Only apply damage to boss during boss fight
        if (gameState.activeBoss) {
          const oldHealth = gameState.activeBoss.health;
          gameState.activeBoss.health -= clickValue;
          
          io.emit('bossUpdate', {
            health: gameState.activeBoss.health,
            maxHealth: gameState.activeBoss.maxHealth,
            damage: clickValue,
            playerId: socket.id,
            playerName: player.name
          });

          if (gameState.activeBoss.health <= 0 && oldHealth > 0) {
            const boss = gameState.activeBoss;
            if (boss.timerId) {
              clearTimeout(boss.timerId);
            }
            gameState.teamCoins += boss.rewards.coins;
            gameState.isInBossFight = false; // Reset flag when boss is defeated
            
            // Limpar o timer usando o ID armazenado
            if (boss.timerId) {
              clearTimeout(boss.timerId);
            }

            gameState.teamCoins += boss.rewards.coins;
            
            // Aplicar buff temporário de poder de clique para todos
            gameState.players.forEach(p => {
              p.temporaryMultipliers = p.temporaryMultipliers || [];
              p.temporaryMultipliers.push({
                type: 'clickPower',
                value: boss.rewards.clickPowerMultiplier,
                duration: boss.rewards.clickPowerDuration,
                expiresAt: Date.now() + boss.rewards.clickPowerDuration
              });
            });

            io.emit('bossResult', { 
              victory: true,
              coins: boss.rewards.coins,
              multiplier: boss.rewards.clickPowerMultiplier,
              duration: boss.rewards.clickPowerDuration,
              killedBy: player.name
            });
            
            gameState.activeBoss = null;
            broadcastGameState();
            return;
          }
        }
      } else {
        // Normal game progression when not in boss fight
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
      // Add emit for purchase animation
      io.emit('upgradePurchased', upgradeId);
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
      
      // Armazenar multiplicadores atuais
      const currentMultipliers = gameState.players.map(p => ({
        id: p.id,
        prestige: (p.prestige || 0) + 1,
        prestigeMultiplier: 1 + ((p.prestige || 0) + 1) * 0.1
      }));
  
      // Resetar estado global do jogo
      gameState.teamCoins = 0;
      gameState.teamLevel = 1;
      gameState.levelProgressRemaining = 100;
      gameState.upgrades.forEach(u => u.level = 0);
      
      // Atualizar jogadores com novos valores de prestígio
      gameState.players.forEach(p => {
        const multiplier = currentMultipliers.find(m => m.id === p.id);
        p.prestige = multiplier.prestige; 
        p.prestigeMultiplier = multiplier.prestigeMultiplier;
        p.clicks = 0;
        p.level = 1;
        p.contribution = 0;
      });
  
      // Emitir eventos na ordem correta
      io.emit('prestige');
      io.emit('notification', `${player.name} ativou o prestígio!\nMultiplicador Global: x${player.prestigeMultiplier.toFixed(1)}\nFragmentos ganhos: ${fragmentsToGain}`);
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

  socket.on('surrenderBoss', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !gameState.activeBoss) return;
  
    const penalty = Math.floor(gameState.teamCoins * gameState.activeBoss.penalty.coinLossPercentage);
    gameState.teamCoins = Math.max(0, gameState.teamCoins - penalty);
    gameState.isInBossFight = false;
  
    if (gameState.activeBoss.timerId) {
      clearTimeout(gameState.activeBoss.timerId);
    }
  
    io.emit('bossResult', { 
      victory: false,
      penalty: penalty,
      surrendered: true,
      surrenderedBy: player.name
    });
    
    gameState.activeBoss = null;
    broadcastGameState();
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
  
  // Adicionar bônus temporários
  if (player.temporaryMultipliers) {
    player.temporaryMultipliers.forEach(buff => {
      if (buff.type === 'clickPower' && buff.expiresAt > Date.now()) {
        clickPower *= buff.value;
      }
    });
  }

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
  
  // Emitir evento específico de level up
  io.emit('teamLevelUp', gameState.teamLevel);
  
  // Checar se deve spawnar um boss
  if (gameState.teamLevel >= gameState.nextBossLevel) {
    spawnBoss();
  }
  
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

// Adicionar nova função para gerenciar o spawn do boss
function spawnBoss() {
  if (gameState.activeBoss) return; // Não spawnar se já houver um boss ativo

  const boss = { ...bosses.iceTitan }; // Deep copy do template do boss
  // Nova fórmula: HP = 10000 + 1500 * (1 - 0.5^(N-1))
  const N = Math.floor(gameState.teamLevel / 5); // N é o número do boss (a cada 5 níveis)
  boss.health = boss.baseHealth + boss.bonusHealth * (1 - Math.pow(0.5, N - 1));
  boss.maxHealth = boss.health;
  boss.startTime = Date.now();
  boss.timeLimit = 60000; // 60 segundos para derrotar o boss
  
  // Criar o boss primeiro
  gameState.activeBoss = boss;
  gameState.nextBossLevel += gameState.bossSpawnInterval;
  gameState.isInBossFight = true; // Add flag for boss fight state

  // Enviar para todos os jogadores
  io.emit('bossSpawn', {
    name: boss.name,
    health: boss.health,
    maxHealth: boss.maxHealth,
    image: boss.image,
    particles: boss.particles,
    timeLimit: boss.timeLimit,
    startTime: boss.startTime // Adicionar startTime
  });

  // Armazenar o timer separadamente do objeto boss
  const bossTimer = setTimeout(() => {
    if (gameState.activeBoss) {
      const penalty = Math.floor(gameState.teamCoins * boss.penalty.coinLossPercentage);
      gameState.teamCoins -= penalty;
      gameState.isInBossFight = false; // Reset flag when boss fight ends
      io.emit('bossResult', { 
        victory: false,
        penalty: penalty
      });
      gameState.activeBoss = null;
      broadcastGameState();
    }
  }, boss.timeLimit);

  // Armazenar apenas o ID do timer
  boss.timerId = bossTimer[Symbol.toPrimitive]();
}

function getUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  return upgrade.effect(upgrade.level, gameState) * gameState.achievementBoosts.upgradeEffect;
}

// Update the autoClicker interval
setInterval(() => {
  try {
    const autoClickerUpgrade = gameState.upgrades.find(u => u.id === 'auto-clicker');
    if (!autoClickerUpgrade?.level || gameState.isInBossFight || !gameState.players.length) return;

      let totalDamage = 0;
    const autoClickValue = autoClickerUpgrade.effect(autoClickerUpgrade.level) * 
                         gameState.achievementBoosts.autoMultiplier;

    // Create a snapshot of players to avoid modification issues
    const currentPlayers = [...gameState.players];
    
    currentPlayers.forEach(player => {
      if (!player?.id) return;
      const clickValue = calculateClickValue(player) * autoClickValue;
      
      // Find and update player in original array
      const playerInState = gameState.players.find(p => p.id === player.id);
      if (playerInState) {
        playerInState.clicks += clickValue;
        playerInState.contribution += clickValue;
        
        // Emitir evento de dano automático para o cliente
        io.to(player.id).emit('autoClickDamage', clickValue);
      }
      
      totalDamage += clickValue;
    });

    // Update global stats
    gameState.clicks += totalDamage;
    gameState.totalClicks += totalDamage;
    gameState.levelProgressRemaining -= totalDamage;

    if (gameState.levelProgressRemaining <= 0) {
      levelUpTeam();
    } else {
      const updateData = {
        type: 'autoclick',
        teamCoins: gameState.teamCoins,
        fragments: gameState.fragments, // Adicionar fragments
        levelProgressRemaining: Math.max(0, gameState.levelProgressRemaining),
        players: gameState.players,
        totalClicks: gameState.totalClicks,
        clicks: gameState.clicks,
        upgrades: gameState.upgrades,
        teamLevel: gameState.teamLevel // Add team level to update data
      };
      io.emit('gameStateUpdate', updateData);
    }
  } catch (error) {
    console.error('[AutoClicker Error]:', error);
  }
}, 1000); // Reduzir para 100ms para atualizações mais frequentes

setInterval(checkAchievements, 2000);

// Adicionar lógica para remover buffs expirados
setInterval(() => {
  const now = Date.now();
  let buffRemoved = false;
  
  gameState.players.forEach(player => {
    if (player.temporaryMultipliers) {
      player.temporaryMultipliers = player.temporaryMultipliers.filter(buff => {
        const active = buff.expiresAt > now;
        if (!active) buffRemoved = true;
        return active;
      });
    }
  });

  if (buffRemoved) {
    broadcastGameState();
  }
}, 1000);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`[Inicialização] Servidor rodando na porta ${port}`);
});