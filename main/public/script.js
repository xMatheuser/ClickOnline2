const socket = io('/');

let gameState = { players: [] };
let isSpacePressed = false;
let clickCountThisSecond = 0;
let lastClickCount = 0;
let lastTeamLevel = 1;
let lastUpgradesState = [];
let userHasInteracted = false;
let upgradeHistory = {
  tier1: [],
  tier2: []
};

// Estrutura dos prestigeUpgrades no cliente para restaurar funções
const prestigeUpgradesTemplate = {
  'fragment-multiplier': {
    id: 'fragment-multiplier',
    name: 'Multiplicador de Fragmentos',
    description: 'Aumenta a quantidade de fragmentos ganhos ao prestigiar',
    basePrice: 5,
    level: 0,
    maxLevel: 10,
    effect: level => 1 + level * 0.2,
    priceIncrease: 2
  }
};

const startScreen = document.getElementById('start-screen');
const startPlayerNameInput = document.getElementById('start-player-name');
const startGameButton = document.getElementById('start-game-button');
const startError = document.getElementById('start-error');
const gameContainer = document.getElementById('game-container');

const clicksDisplay = document.getElementById('clicks');
const levelDisplay = document.getElementById('level');
const targetDisplay = document.getElementById('target');
const teamCoinsDisplay = document.getElementById('team-coins');
const clickPowerDisplay = document.getElementById('click-power');
const clickArea = document.getElementById('click-area');
const upgradesContainer = document.getElementById('upgrades-container');
const achievementsContainer = document.getElementById('achievements-container');
const notification = document.getElementById('notification');
const powerupNotification = document.getElementById('powerup-notification');
const playerList = document.getElementById('player-list');
const activePlayerDisplay = document.getElementById('active-player');
const contributionContainer = document.getElementById('contribution-container');
const teamGoalDisplay = document.getElementById('team-goal');
const teamBonusMessage = document.getElementById('team-bonus-message');
const themeToggleButton = document.getElementById('theme-toggle');
const teamSharedProgressBar = document.getElementById('team-shared-progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const activateClickFrenzyButton = document.getElementById('activate-click-frenzy');
const tooltip = document.getElementById('tooltip');
const fullscreenButton = document.getElementById('fullscreen-toggle');
const muteButton = document.getElementById('mute-toggle');
const prestigeOverlay = document.getElementById('prestige-overlay');
const openPrestigeBtn = document.getElementById('open-prestige');
const closePrestigeBtn = document.getElementById('close-prestige');

const levelUpSound = new Audio('/assets/sounds/levelUp.mp3');
levelUpSound.volume = 0.1;
const tickSound = new Audio('/assets/sounds/tick.mp3');
tickSound.volume = 0.6;

let isMuted = localStorage.getItem('isMuted') === 'true';

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  themeToggleButton.textContent = isDarkMode ? 'Modo Claro' : 'Modo Noturno';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleButton.textContent = 'Modo Claro';
  } else {
    themeToggleButton.textContent = 'Modo Noturno';
  }
}

themeToggleButton.addEventListener('click', toggleTheme);

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('isMuted', isMuted);
  updateMuteButton();
  levelUpSound.volume = isMuted ? 0 : 0.1;
  tickSound.volume = isMuted ? 0 : 0.6;
}

function updateMuteButton() {
  const icon = muteButton.querySelector('.mute-icon');
  icon.textContent = isMuted ? '🔇' : '🔊';
}

function showTooltip(event, text) {
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

function isOwnPlayer() {
  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  return !!ownPlayer;
}

function showPowerupNotification(powerUpInfo) {
  powerupNotification.textContent = `${powerUpInfo.name} ativado! ${powerUpInfo.description} por ${powerUpInfo.duration/1000} segundos!`;
  powerupNotification.style.backgroundColor = powerUpInfo.color;
  powerupNotification.classList.add('show');
  setTimeout(() => powerupNotification.classList.remove('show'), 10000);
}

function arePowerUpsUnlocked() {
  const powerupsUpgrade = gameState?.prestigeUpgrades?.find(u => u.id === 'powerups-unlock');
  return powerupsUpgrade?.level > 0;
}

function scheduleFirstPowerUp() {
  if (!arePowerUpsUnlocked()) {
    console.log('[PowerUp] Sistema bloqueado - Compre o upgrade de prestígio');
    return;
  }

  const minDelay = 60000;
  const maxDelay = 18000;
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  console.log(`[PowerUp] Próximo power-up em ${(randomDelay/1000).toFixed(0)} segundos`);
  setTimeout(spawnFloatingPowerUp, randomDelay);
}

function spawnFloatingPowerUp() {
  if (!arePowerUpsUnlocked()) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const buttonWidth = activateClickFrenzyButton.offsetWidth;
  const buttonHeight = activateClickFrenzyButton.offsetHeight;

  const topBarHeight = document.querySelector('.top-bar').offsetHeight || 60; // Altura da top-bar, fallback para 60px
  const maxX = viewportWidth - buttonWidth - 20;
  const maxY = viewportHeight - buttonHeight - 20;
  const minY = topBarHeight + 10; // Margem mínima abaixo da top-bar

  const randomX = Math.floor(Math.random() * maxX) + 10;
  const randomY = Math.floor(Math.random() * (maxY - minY)) + minY; // Ajusta o intervalo de Y

  activateClickFrenzyButton.style.left = `${randomX}px`;
  activateClickFrenzyButton.style.top = `${randomY}px`;
  activateClickFrenzyButton.style.display = 'block';

  const availableColors = Object.values(gameState.powerUps).map(p => p.color);
  const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
  activateClickFrenzyButton.style.backgroundColor = randomColor;

  setTimeout(() => {
    if (activateClickFrenzyButton.style.display === 'block') {
      activateClickFrenzyButton.style.display = 'none';
      scheduleNextSpawn();
    }
  }, 5000);
}

function scheduleNextSpawn() {
  const minDelay = 60000;
  const maxDelay = 180000;
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  console.log(`[PowerUp] Próximo power-up em ${(randomDelay/1000).toFixed(0)} segundos`);
  setTimeout(spawnFloatingPowerUp, randomDelay);
}

function startGame() {
  const playerName = startPlayerNameInput.value.trim();
  if (playerName === '') {
    startError.textContent = 'Por favor, insira um nome!';
    return;
  }
  socket.emit('addPlayer', { name: playerName });
  
  startScreen.style.opacity = '0';
  gameContainer.style.display = 'block';
  
  setTimeout(() => {
    startScreen.style.display = 'none';
    gameContainer.style.opacity = '1';
    document.querySelector('.top-bar').classList.add('visible');
    initGame();
  }, 500);
}

function initStartScreen() {
  loadTheme();
  startGameButton.addEventListener('click', () => {
    userHasInteracted = true;
    startGame();
  });
  startPlayerNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      userHasInteracted = true;
      startGame();
    }
  });
}

function initGame() {
  clickArea.addEventListener('click', () => {
    userHasInteracted = true;
    socket.emit('click');
    clickCountThisSecond += 1;
  });

  clickArea.addEventListener('touchstart', (event) => {
    userHasInteracted = true;
    event.preventDefault();
    socket.emit('click');
    clickCountThisSecond += 1;
    clickArea.classList.add('active');
  });

  clickArea.addEventListener('touchend', () => {
    clickArea.classList.remove('active');
  });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !isSpacePressed) {
      userHasInteracted = true;
      event.preventDefault();
      isSpacePressed = true;
      socket.emit('click');
      clickCountThisSecond += 1;
      clickArea.classList.add('active');
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.code === 'KeyP') {
      isSpacePressed = false;
      clickArea.classList.remove('active');
    }
  });

  document.getElementById('prestige-button').addEventListener('click', () => {
    userHasInteracted = true;
    if (!isOwnPlayer()) {
      showNotification('Você só pode prestigiar quando for o jogador ativo!');
      return;
    }
    const player = gameState.players.find(player => player.id === socket.id);
    if (player && player.level < 2) {
      showNotification('Você precisa estar pelo menos no nível 2 para prestigiar!');
      return;
    }
    socket.emit('prestige');
  });

  activateClickFrenzyButton.addEventListener('click', () => {
    userHasInteracted = true;
    if (!isOwnPlayer()) {
      showNotification('Você só pode ativar power-ups quando for o jogador ativo!');
      return;
    }
    socket.emit('activatePowerUp');
    activateClickFrenzyButton.style.display = 'none';
    scheduleNextSpawn();
  });

  fullscreenButton.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    const icon = fullscreenButton.querySelector('.fullscreen-icon');
    icon.textContent = document.fullscreenElement ? '⛶' : '⛶';
    icon.style.transform = document.fullscreenElement ? 'rotate(0deg)' : 'rotate(90deg)';
  });

  muteButton.addEventListener('click', toggleMute);
  updateMuteButton();

  levelUpSound.volume = isMuted ? 0 : 0.1;
  tickSound.volume = isMuted ? 0 : 0.6;

  // Atualizar visibilidade inicial do botão
  activateClickFrenzyButton.style.display = 'none';
  if (!arePowerUpsUnlocked()) {
    activateClickFrenzyButton.classList.add('locked');
    activateClickFrenzyButton.title = 'Desbloqueie através do upgrade de prestígio';
  }

  renderUpgrades();
  renderAchievements();
  renderPrestigeUpgrades();
  scheduleFirstPowerUp(); // Vai verificar se está desbloqueado antes de agendar
  setInterval(updateClicksPerSecond, 1000);

  openPrestigeBtn.addEventListener('click', () => {
    userHasInteracted = true;
    console.log('[Debug] Abrindo popup de prestígio');
    prestigeOverlay.classList.add('active');
    updatePrestigeUI();
  });

  closePrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.remove('active');
  });

  prestigeOverlay.addEventListener('click', (e) => {
    if (e.target === prestigeOverlay) {
      prestigeOverlay.classList.remove('active');
    }
  });

  const showHistoryBtn = document.getElementById('show-history');
  const historyOverlay = document.getElementById('history-overlay');
  const closeHistoryBtn = document.getElementById('close-history');

  showHistoryBtn.addEventListener('click', () => {
    historyOverlay.classList.add('active');
    renderUpgradeHistory();
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyOverlay.classList.remove('active');
  });

  historyOverlay.addEventListener('click', (e) => {
    if (e.target === historyOverlay) {
      historyOverlay.classList.remove('active');
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Erro ao entrar em fullscreen: ${err.message}`);
    });
    fullscreenButton.querySelector('.fullscreen-icon').textContent = '⛶';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      fullscreenButton.querySelector('.fullscreen-icon').textContent = '⛶';
    }
  }
}

function updateClicksPerSecond() {
  const totalClicks = gameState.players.reduce((sum, player) => sum + player.clicks, 0);
  const clicksThisSecond = totalClicks - lastClickCount + clickCountThisSecond;
  targetDisplay.textContent = clicksThisSecond.toFixed(1);
  lastClickCount = totalClicks;
  clickCountThisSecond = 0;
}

socket.on('gameStateUpdate', (newState) => {
  const wasPowerUpsUnlocked = arePowerUpsUnlocked();

  const oldUpgradesState = lastUpgradesState;
  gameState = newState;
  lastUpgradesState = gameState.upgrades.map(u => ({ id: u.id, level: u.level }));

  // Restaurar funções effect nos prestigeUpgrades
  if (gameState.prestigeUpgrades && Array.isArray(gameState.prestigeUpgrades)) {
    gameState.prestigeUpgrades = gameState.prestigeUpgrades.map(upgrade => {
      if (prestigeUpgradesTemplate[upgrade.id]) {
        return {
          ...upgrade,
          effect: prestigeUpgradesTemplate[upgrade.id].effect
        };
      }
      return upgrade;
    });
  }

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = Math.floor(gameState.totalClicks || 0); // Usar totalClicks ao invés da soma
    levelDisplay.textContent = ownPlayer.level;
    teamCoinsDisplay.textContent = Math.floor(gameState.teamCoins);
    clickPowerDisplay.textContent = getClickValue(ownPlayer).toFixed(1);
    const isAnyPowerUpActive = Object.values(gameState.powerUps).some(p => p.active);
    activateClickFrenzyButton.disabled = isAnyPowerUpActive || !isOwnPlayer();
    activePlayerDisplay.textContent = ownPlayer.name;
  } else {
    clicksDisplay.textContent = 0;
    levelDisplay.textContent = 1;
    teamCoinsDisplay.textContent = 0;
    clickPowerDisplay.textContent = 1;
    teamSharedProgressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    activePlayerDisplay.textContent = '-';
  }

  const teamProgress = (gameState.levelProgressRemaining / (gameState.teamLevel * 100)) * 100;
  const percentage = Math.max(0, Math.min(100, teamProgress)).toFixed(0);
  teamSharedProgressBar.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;

  if (gameState.teamLevel > lastTeamLevel) {
    if (userHasInteracted) levelUpSound.play().catch(err => console.log('[Audio Error] Não foi possível tocar levelUpSound:', err));
    lastTeamLevel = gameState.teamLevel;
  }

  if (oldUpgradesState.length > 0) {
    const upgradePurchased = gameState.upgrades.some((upgrade, index) => {
      const oldUpgrade = oldUpgradesState.find(u => u.id === upgrade.id);
      return oldUpgrade && upgrade.level > oldUpgrade.level;
    });
    if (upgradePurchased && userHasInteracted) {
      tickSound.play().catch(err => console.log('[Audio Error] Não foi possível tocar tickSound:', err));
    }
  }

  // Verificar se Power-Ups foram desbloqueados nesta atualização
  if (!wasPowerUpsUnlocked && arePowerUpsUnlocked()) {
    console.log('[PowerUp] Sistema desbloqueado! Iniciando spawn...');
    activateClickFrenzyButton.classList.remove('locked');
    activateClickFrenzyButton.title = 'Power Up!';
    scheduleFirstPowerUp();
    showNotification('Power-Ups desbloqueados! Fique atento aos bônus temporários!');
  }

  renderPlayers();
  renderContributions();
  renderUpgrades();
  renderAchievements();
  teamGoalDisplay.textContent = gameState.teamLevel;

  if (prestigeOverlay.classList.contains('active')) {
    updatePrestigeUI();
  }
});

socket.on('powerUpActivated', (powerUpInfo) => {
  showPowerupNotification(powerUpInfo);
});

socket.on('offlineProgress', (progress) => {
  const hours = Math.floor(progress.timeDiff / 3600);
  const minutes = Math.floor((progress.timeDiff % 3600) / 60);
  
  let message = `Bem-vindo de volta! Durante sua ausência de ${hours}h${minutes}m:\n`;
  message += `→ ${progress.clicks.toLocaleString()} cliques gerados\n`;
  message += `→ ${progress.levels} níveis ganhos\n`;
  message += `→ ${progress.coins.toLocaleString()} moedas acumuladas`;
  
  showNotification(message);
});

function getClickValue(player) {
  return player.clickValue || 1;
}

function renderPlayers() {
  playerList.innerHTML = '';
  if (!gameState.players) return;
  gameState.players.forEach((player) => {
    const playerTag = document.createElement('div');
    playerTag.className = 'player-tag';
    playerTag.setAttribute('data-active', player.id === socket.id ? 'true' : 'false');
    const initials = player.name.slice(0, 2).toUpperCase();
    playerTag.innerHTML = `
      <div class="player-avatar" style="background-color: #007bff">${initials}</div>
      ${player.name}
    `;
    playerList.appendChild(playerTag);
  });
}

function renderContributions() {
  contributionContainer.innerHTML = '<h3>Ranking de Contribuição</h3>';
  if (!gameState.players || gameState.players.length === 0) {
    contributionContainer.innerHTML += '<div>Adicione jogadores para ver as contribuições</div>';
    return;
  }
  const sortedPlayers = [...gameState.players].sort((a, b) => b.contribution - a.contribution);
  const totalContribution = sortedPlayers.reduce((sum, p) => sum + p.contribution, 1) || 1;
  sortedPlayers.forEach((player, index) => {
    const percentage = (player.contribution / totalContribution * 100) || 0;
    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';
    const contributionElement = document.createElement('div');
    contributionElement.className = 'player-contribution';
    contributionElement.innerHTML = `
      <div>
        <div class="player-avatar" style="background-color: #007bff">${player.name.slice(0, 2).toUpperCase()}</div>
        ${medal} ${player.name} (Nv. ${player.level})
      </div>
      <div>${Math.floor(player.contribution)} cliques (${percentage.toFixed(1)}%)</div>
    `;
    const barContainer = document.createElement('div');
    barContainer.className = 'contribution-bar';
    const barFill = document.createElement('div');
    barFill.className = 'contribution-fill';
    barFill.style.width = `${percentage}%`;
    barFill.style.backgroundColor = '#007bff';
    barContainer.appendChild(barFill);
    contributionElement.appendChild(barContainer);
    contributionContainer.appendChild(contributionElement);
  });
}

function calculateUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

function getUpgradeEffectDescription(upgrade) {
  switch (upgrade.id) {
    case 'click-power':
      return `${upgrade.description} (+${upgrade.level * 100}% cliques no nível atual)`;
    case 'auto-clicker':
      return `${upgrade.description} (+${upgrade.level * 100}% cliques automáticos por segundo)`;
    case 'coin-boost':
      return `${upgrade.description} (+${(upgrade.level * 20).toFixed(0)}% moedas por nível)`;
    case 'progress-boost':
      return `${upgrade.description} (-${(upgrade.level * 5).toFixed(0)}% dificuldade de meta)`;
    case 'team-synergy':
      const playerCount = gameState.players.length;
      return `${upgrade.description} (+${(upgrade.level * playerCount * 10).toFixed(0)}% poder de clique)`;
    case 'shared-rewards':
      return `${upgrade.description} (+${(upgrade.level * 15).toFixed(0)}% moedas compartilhadas)`;
    default:
      return upgrade.description;
  }
}

function renderUpgrades() {
  upgradesContainer.innerHTML = '';
  if (!gameState.upgrades || !gameState.players) return;

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  // Check if tier 1 is completed
  const tier1Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 1);
  const tier1Completed = tier1Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  // Move completed tier 1 upgrades to history if tier 2 is available
  if (tier1Completed && upgradeHistory.tier1.length === 0) {
    upgradeHistory.tier1 = JSON.parse(JSON.stringify(tier1Upgrades));
  }

  // Check if tier 2 is completed
  const tier2Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 2);
  const tier2Completed = tier2Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier2Completed && upgradeHistory.tier2.length === 0) {
    upgradeHistory.tier2 = JSON.parse(JSON.stringify(tier2Upgrades));
  }

  // Show only active upgrades that are not completed
  const visibleUpgrades = gameState.upgrades
    .filter(upgrade => {
      // If tier 1 is completed, only show tier 2
      if (tier1Completed) {
        return upgrade.tier === 2 && !tier2Completed;
      }
      // Otherwise, only show tier 1
      return upgrade.tier === 1;
    })
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier;
      return gameState.upgrades.indexOf(a) - gameState.upgrades.indexOf(b);
    });

  visibleUpgrades.forEach(upgrade => {
    let price = calculateUpgradePrice(upgrade);
    const canAfford = gameState.teamCoins >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${(!canBuy) ? 'disabled' : ''}`;
    const tooltipText = getUpgradeEffectDescription(upgrade);
    upgradeElement.setAttribute('data-tooltip', tooltipText);
    upgradeElement.innerHTML = `
      <div class="upgrade-info">
        <div><strong>${upgrade.name}</strong> <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span></div>
        <div>${upgrade.description}</div>
      </div>
      <button class="buy-button" ${(!canBuy) ? 'disabled' : ''}>${maxedOut ? 'MAX' : `${price}<span class="coin-icon"></span>`}</button>
    `;

    const buyButton = upgradeElement.querySelector('.buy-button');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      console.log(`[Client] Tentando comprar ${upgrade.name}. Moedas do time: ${gameState.teamCoins}, Preço: ${price}, Pode comprar? ${canAfford}`);
      socket.emit('buyUpgrade', upgrade.id);
    });
    buyButton.addEventListener('touchstart', (event) => {
      event.preventDefault();
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      console.log(`[Client Touch] Tentando comprar ${upgrade.name}. Moedas do time: ${gameState.teamCoins}, Preço: ${price}`);
      socket.emit('buyUpgrade', upgrade.id);
    });

    upgradeElement.addEventListener('mousemove', (event) => {
      showTooltip(event, tooltipText);
    });
    upgradeElement.addEventListener('mouseleave', hideTooltip);

    upgradesContainer.appendChild(upgradeElement);
  });
}

function renderAchievements() {
  achievementsContainer.innerHTML = '';
  if (!gameState.achievements) return;

  gameState.achievements.forEach(achievement => {
    const achievementElement = document.createElement('div');
    achievementElement.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    achievementElement.innerHTML = `
      <div class="achievement-info">
        <div><strong>${achievement.name}</strong></div>
        <div>${achievement.description}</div>
        <div>${achievement.unlocked ? 'Concluído ✓' : `Recompensa: ${achievement.reward} 🪙`}</div>
      </div>
    `;
    achievementsContainer.appendChild(achievementElement);
  });
}

function showNotification(message) {
  // Substituir o emoji de moeda pelo novo ícone
  message = message.replace(/🪙/g, '<span class="coin-icon"></span>');
  notification.innerHTML = message.replace(/\n/g, '<br>');
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 10000); // Aumentar tempo para 10s
}

initStartScreen();

function updatePrestigeUI() {
  console.log('[Debug] Atualizando UI de prestígio');
  document.getElementById('fragments-count').textContent = gameState?.fragments || 0;
  document.getElementById('potential-fragments').textContent = calculatePrestigeReward();
  renderPrestigeUpgrades();
}

function calculatePrestigeReward() {
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return 0;

  // Aplicar o multiplicador de fragmentos ao calcular a recompensa
  const fragmentMultiplierUpgrade = gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier');
  const fragmentMultiplier = fragmentMultiplierUpgrade && typeof fragmentMultiplierUpgrade.effect === 'function'
    ? fragmentMultiplierUpgrade.effect(fragmentMultiplierUpgrade.level)
    : 1;
  const baseFragments = Math.floor(Math.sqrt(player.level) * 2);
  return Math.floor(baseFragments * fragmentMultiplier);
}

function renderPrestigeUpgrades() {
  const container = document.getElementById('prestige-upgrades-container');
  console.log('[Debug] Container encontrado:', container);
  if (!container) return;

  console.log('[Debug] Prestige Upgrades:', gameState?.prestigeUpgrades);
  container.innerHTML = '';
  if (!gameState?.prestigeUpgrades || gameState.prestigeUpgrades.length === 0) {
    console.log('[Debug] Nenhum prestigeUpgrades encontrado em gameState');
    container.innerHTML = '<p>Nenhum upgrade de prestígio disponível.</p>';
    return;
  }

  gameState.prestigeUpgrades.forEach(upgrade => {
    console.log('[Debug] Renderizando upgrade:', upgrade);
    if (!upgrade || !upgrade.id || !upgrade.name || !upgrade.description || !upgrade.basePrice || typeof upgrade.level === 'undefined' || !upgrade.maxLevel || !upgrade.priceIncrease) {
      console.error('[Error] Upgrade de prestígio inválido:', upgrade);
      return;
    }

    const price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    const canAfford = (gameState.fragments || 0) >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${(!canBuy) ? 'disabled' : ''}`;
    const effectValue = typeof upgrade.effect === 'function' ? upgrade.effect(upgrade.level + 1) : 1;
    const tooltipText = `${upgrade.description} (Efeito: x${effectValue.toFixed(1)} no próximo nível)`;
    upgradeElement.setAttribute('data-tooltip', tooltipText);
    upgradeElement.innerHTML = `
      <div class="upgrade-info">
        <div><strong>${upgrade.name}</strong> <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span></div>
        <div>${upgrade.description}</div>
      </div>
      <button class="buy-button" ${(!canBuy) ? 'disabled' : ''}>${maxedOut ? 'MAX' : `${price}<span class="coin-icon"></span>`}</button>
    `;

    const buyButton = upgradeElement.querySelector('.buy-button');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      socket.emit('buyPrestigeUpgrade', upgrade.id);
    });
    buyButton.addEventListener('touchstart', (event) => {
      event.preventDefault();
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      socket.emit('buyPrestigeUpgrade', upgrade.id);
    });

    upgradeElement.addEventListener('mousemove', (event) => {
      showTooltip(event, tooltipText);
    });
    upgradeElement.addEventListener('mouseleave', hideTooltip);

    container.appendChild(upgradeElement);
  });
}

function getUpgradeBuffDescription(upgrade) {
  switch (upgrade.id) {
    case 'click-power':
    case 'click-power-2':
      const clickBonus = upgrade.tier === 1 ? 
        upgrade.level * 100 : 
        upgrade.level * 200;
      return `Aumenta o poder de clique em ${clickBonus}%`;
    
    case 'auto-clicker':
    case 'auto-clicker-2':
      const autoClicks = upgrade.tier === 1 ? 
        upgrade.level : 
        upgrade.level * 2;
      return `Gera ${autoClicks} cliques automáticos por segundo`;
    
    case 'coin-boost':
    case 'coin-boost-2':
      const coinBonus = upgrade.tier === 1 ? 
        upgrade.level * 20 : 
        upgrade.level * 40;
      return `Aumenta as moedas ganhas em ${coinBonus}%`;
    
    case 'progress-boost':
    case 'progress-boost-2':
      const progressBonus = upgrade.tier === 1 ? 
        upgrade.level * 5 : 
        upgrade.level * 8;
      return `Reduz a dificuldade de progresso em ${progressBonus}%`;
    
    case 'team-synergy':
    case 'team-synergy-2':
      const synergyBonus = upgrade.tier === 1 ? 
        upgrade.level * 10 : 
        upgrade.level * 20;
      return `Aumenta o poder de clique em ${synergyBonus}% por jogador`;
    
    case 'shared-rewards':
    case 'shared-rewards-2':
      const rewardBonus = upgrade.tier === 1 ? 
        upgrade.level * 15 : 
        upgrade.level * 30;
      return `Retorna ${rewardBonus}% do custo dos upgrades em moedas`;
    
    default:
      return upgrade.description;
  }
}

function showBuffTooltip(event, text) {
  const tooltip = document.createElement('div');
  tooltip.className = 'buff-tooltip';
  tooltip.textContent = text;
  
  document.body.appendChild(tooltip);
  
  const rect = event.target.getBoundingClientRect();
  tooltip.style.left = `${rect.right + 10}px`;
  tooltip.style.top = `${rect.top - 10}px`;
  
  requestAnimationFrame(() => tooltip.classList.add('visible'));
  
  return tooltip;
}

function hideBuffTooltip(tooltip) {
  tooltip.classList.remove('visible');
  setTimeout(() => tooltip.remove(), 200);
}

function renderUpgradeHistory() {
  const container = document.getElementById('history-container');
  container.innerHTML = '';

  // Render Tier 1 History
  if (upgradeHistory.tier1.length > 0) {
    const tier1Section = document.createElement('div');
    tier1Section.className = 'history-tier';
    tier1Section.innerHTML = `
      <div class="history-tier-title">Tier 1 (Completado)</div>
      ${upgradeHistory.tier1.map(upgrade => `
        <div class="upgrade-item">
          <div class="history-upgrade-info">
            <div class="upgrade-info">
              <div><strong>${upgrade.name}</strong> (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
              <div>${upgrade.description}</div>
            </div>
            <button class="buff-info-button" data-upgrade-id="${upgrade.id}" data-tier="1">ℹ️</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(tier1Section);
  }

  // Render Tier 2 History
  if (upgradeHistory.tier2.length > 0) {
    const tier2Section = document.createElement('div');
    tier2Section.className = 'history-tier';
    tier2Section.innerHTML = `
      <div class="history-tier-title">Tier 2 (Completado)</div>
      ${upgradeHistory.tier2.map(upgrade => `
        <div class="upgrade-item">
          <div class="history-upgrade-info">
            <div class="upgrade-info">
              <div><strong>${upgrade.name}</strong> (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
              <div>${upgrade.description}</div>
            </div>
            <button class="buff-info-button" data-upgrade-id="${upgrade.id}" data-tier="2">ℹ️</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(tier2Section);
  }

  // Add event listeners for buff info buttons
  const buffButtons = container.querySelectorAll('.buff-info-button');
  buffButtons.forEach(button => {
    let activeTooltip = null;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const upgradeId = button.dataset.upgradeId;
      const tier = parseInt(button.dataset.tier);
      const upgrade = tier === 1 ? 
        upgradeHistory.tier1.find(u => u.id === upgradeId) :
        upgradeHistory.tier2.find(u => u.id === upgradeId);

      if (activeTooltip) {
        hideBuffTooltip(activeTooltip);
        activeTooltip = null;
      } else {
        const buffDescription = getUpgradeBuffDescription(upgrade);
        activeTooltip = showBuffTooltip(e, buffDescription);
      }
    });

    // Hide tooltip when clicking outside
    document.addEventListener('click', () => {
      if (activeTooltip) {
        hideBuffTooltip(activeTooltip);
        activeTooltip = null;
      }
    });
  });
}

socket.on('prestige', () => {
  // Reset upgrade history on prestige
  upgradeHistory = {
    tier1: [],
    tier2: []
  };
  // ...existing prestige code...
});