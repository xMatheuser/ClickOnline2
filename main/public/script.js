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
  tier2: [],
  tier3: []
};

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
const achievementsOverlay = document.getElementById('achievements-overlay');
const closeAchievementsBtn = document.getElementById('close-achievements');
const achievementsContent = document.getElementById('achievements-content');
const openAchievementsBtn = document.getElementById('open-achievements');
const laboratoryOverlay = document.getElementById('laboratory-overlay'); // Add this line

// Adicione após as outras declarações de constantes
const bonusStatsOverlay = document.getElementById('bonus-stats-overlay');
const openBonusStatsBtn = document.getElementById('open-bonus-stats');
const closeBonusStatsBtn = document.getElementById('close-bonus-stats');
const bonusStatsContent = document.getElementById('bonus-stats-content');

const levelUpSound = new Audio('/assets/sounds/levelUp.mp3');
const tickSound = new Audio('/assets/sounds/tick.mp3');
const achievementSound = new Audio('/assets/sounds/achievement.mp3');
levelUpSound.volume = 0.1;
tickSound.volume = 0.6;
achievementSound.volume = 0.2;

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
  achievementSound.volume = isMuted ? 0 : 0.2;
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
  const maxDelay = 180000;
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

  const topBarHeight = document.querySelector('.top-bar').offsetHeight || 60;
  const maxX = viewportWidth - buttonWidth - 20;
  const maxY = viewportHeight - buttonHeight - 20;
  const minY = topBarHeight + 10;

  const randomX = Math.floor(Math.random() * maxX) + 10;
  const randomY = Math.floor(Math.random() * (maxY - minY)) + minY;

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

// Adicionar após as variáveis globais
let laboratoryData = {
  researchPoints: 0,
  pointsPerSecond: 0,
  upgrades: [
    {
      id: 'automation',
      name: 'Automação Básica',
      description: 'Gera 1 ponto de pesquisa por segundo',
      baseCost: 10,
      level: 0,
      costMultiplier: 1.5,
      effect: 1
    },
    {
      id: 'efficiency',
      name: 'Eficiência de Pesquisa',
      description: 'Aumenta a geração de pontos em 50%',
      baseCost: 50,
      level: 0,
      costMultiplier: 2,
      effect: 0.5
    }
  ],
  garden: {
    selectedSeed: 'sunflower',
    unlockedSlots: 1,
    crystalUnlocked: false,
    resources: {
      sunflower: 0,
      tulip: 0,
      mushroom: 0,
      crystal: 0
    },
    plants: {}
  },
  seedData: {
    sunflower: { icon: '🌻', time: 30, yield: 2, name: 'Girassol' },
    tulip: { icon: '🌷', time: 60, yield: 5, name: 'Tulipa' },
    mushroom: { icon: '🍄', time: 90, yield: 8, name: 'Cogumelo' },
    crystal: { icon: '💎', time: 120, yield: 12, name: 'Cristal' }
  }
};

function initGame() {
  loadLaboratoryData(); // Carregar dados salvos
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

  activateClickFrenzyButton.style.display = 'none';
  if (!arePowerUpsUnlocked()) {
    activateClickFrenzyButton.classList.add('locked');
    activateClickFrenzyButton.title = 'Desbloqueie através do upgrade de prestígio';
  }

  renderUpgrades();
  renderAchievements();
  renderPrestigeUpgrades();
  scheduleFirstPowerUp();
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

  openAchievementsBtn.addEventListener('click', () => {
    userHasInteracted = true;
    achievementsOverlay.classList.add('active');
    newAchievements = 0;
    updateAchievementBadge();
    renderAchievementsScreen(); // Chame diretamente renderAchievementsScreen aqui
    updateAchievementStats();
  });

  closeAchievementsBtn.addEventListener('click', () => {
    achievementsOverlay.classList.remove('active');
  });

  achievementsOverlay.addEventListener('click', (e) => {
    if (e.target === achievementsOverlay) {
      achievementsOverlay.classList.remove('active');
    }
  });

  // Adicione após os outros event listeners em initGame()
  openBonusStatsBtn.addEventListener('click', () => {
    userHasInteracted = true;
    bonusStatsOverlay.classList.add('active');
    updateBonusStats();
  });

  closeBonusStatsBtn.addEventListener('click', () => {
    bonusStatsOverlay.classList.remove('active');
  });

  bonusStatsOverlay.addEventListener('click', (e) => {
    if (e.target === bonusStatsOverlay) {
      bonusStatsOverlay.classList.remove('active');
    }
  });

  const openLabButton = document.getElementById('open-laboratory');
  const closeLabButton = document.getElementById('close-laboratory');
  const laboratoryOverlay = document.getElementById('laboratory-overlay');

  openLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.add('active');
    updateLaboratoryUI();
  });

  closeLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.remove('active');
  });

  laboratoryOverlay.addEventListener('click', (e) => {
    if (e.target === laboratoryOverlay) {
      laboratoryOverlay.classList.remove('active');
    }
  });

  // Iniciar o loop do laboratório
  setInterval(updateLaboratory, 1000);
  initLaboratoryGarden();
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

function formatNumber(num) {
  if (num < 1000) return num.toFixed(0);
  
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const base = Math.floor(Math.log(num) / Math.log(1000));
  const suffix = suffixes[base] || `e${base*3}`;
  const formatted = (num / Math.pow(1000, base)).toFixed(2);
  
  return formatted + suffix;
}

let newAchievements = 0;

function updateAchievementBadge() {
  const existingBadge = openAchievementsBtn.querySelector('.achievement-badge');
  if (newAchievements > 0) {
    if (existingBadge) {
      existingBadge.textContent = newAchievements;
    } else {
      const badge = document.createElement('span');
      badge.className = 'achievement-badge';
      badge.textContent = newAchievements;
      openAchievementsBtn.appendChild(badge);
    }
  } else if (existingBadge) {
    existingBadge.remove();
  }
}

function updateAchievementStats() {
  const statsContainer = document.getElementById('achievements-stats');
  if (!statsContainer || !gameState.achievements) return;

  const totalAchievements = gameState.achievements.reduce((sum, a) => sum + a.levels.length, 0);
  const unlockedAchievements = gameState.achievements.reduce((sum, a) => sum + a.unlockedLevels.length, 0);
  const percentage = ((unlockedAchievements / totalAchievements) * 100).toFixed(1);

  statsContainer.innerHTML = `
    <div class="achievements-stats">
      <div class="stat-item">
        <div class="stat-value">${unlockedAchievements}/${totalAchievements}</div>
        <div class="stat-label">Conquistas Desbloqueadas</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${percentage}%</div>
        <div class="stat-label">Completado</div>
      </div>
    </div>
  `;
}

let viewedAchievements = new Set();

socket.on('gameStateUpdate', (newState) => {
  // Se for atualização de clique automático, atualizar apenas os valores necessários
  if (newState.type === 'autoclick') {
    gameState.teamCoins = newState.teamCoins;
    gameState.levelProgressRemaining = newState.levelProgressRemaining;
    gameState.totalClicks = newState.totalClicks;
    gameState.clicks = newState.clicks;
    gameState.players = gameState.players.map(player => {
      const updatedPlayer = newState.players.find(p => p.id === player.id);
      if (updatedPlayer) {
        player.clicks = updatedPlayer.clicks;
        player.contribution = updatedPlayer.contribution;
        player.clickValue = updatedPlayer.clickValue;
      }
      return player;
    });

    // Atualizar apenas elementos essenciais da UI
    updateEssentialUI();
    return;
  }

  // Para atualizações completas, continuar com o comportamento atual
  const wasPowerUpsUnlocked = arePowerUpsUnlocked();
  const oldUpgradesState = lastUpgradesState;
  const oldAchievements = gameState.achievements || [];
  
  gameState = newState;
  lastUpgradesState = gameState.upgrades.map(u => ({ id: u.id, level: u.level }));

  if (gameState.prestigeUpgrades && Array.isArray(gameState.prestigeUpgrades)) {
    gameState.prestigeUpgrades = gameState.prestigeUpgrades.map(upgrade => {
      if (prestigeUpgradesTemplate[upgrade.id]) {
        return { ...upgrade, effect: prestigeUpgradesTemplate[upgrade.id].effect };
      }
      return upgrade;
    });
  }

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = formatNumber(gameState.totalClicks || 0);
    levelDisplay.textContent = ownPlayer.level;
    teamCoinsDisplay.textContent = formatNumber(gameState.teamCoins);
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

  const currentHP = gameState.levelProgressRemaining;
  const maxHP = gameState.teamLevel * 100;
  const hpPercentage = (currentHP / maxHP * 100).toFixed(0);
  teamSharedProgressBar.style.width = `${hpPercentage}%`;
  progressPercentage.textContent = `${Math.ceil(currentHP)}/${maxHP} HP`;

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

  // Verificar novas conquistas
  const newUnlocks = gameState.achievements.some(achievement => {
    const oldAchievement = oldAchievements.find(a => a.id === achievement.id);
    const newlyUnlocked = achievement.unlockedLevels.length > (oldAchievement?.unlockedLevels.length || 0);
    if (newlyUnlocked) {
      newAchievements++;
      return true;
    }
    return false;
  });

  if (newUnlocks) {
    showNotification('Nova conquista desbloqueada!');
    notification.classList.add('pulse');
    if (userHasInteracted && !isMuted) {
      achievementSound.play().catch(err => console.log('[Audio Error]:', err));
    }
    setTimeout(() => notification.classList.remove('pulse'), 1000);
    updateAchievementBadge();
  }

  if (!wasPowerUpsUnlocked && arePowerUpsUnlocked()) {
    console.log('[PowerUp] Sistema desbloqueado! Iniciando spawn...');
    activateClickFrenzyButton.classList.remove('locked');
    activateClickFrenzyButton.title = 'Power Up!';
    scheduleFirstPowerUp();
    showNotification('Power-Ups desbloqueados! Fique atento aos bônus temporários!');
  }

  if (gameState.achievements.some(a => a.unlockedLevels.length > (oldAchievements.find(ach => ach.id === a.id)?.unlockedLevels.length || 0))) {
    showNotification('Nova conquista desbloqueada!');
    notification.classList.add('pulse');
    setTimeout(() => notification.classList.remove('pulse'), 1000);
  }

  // Update achievements UI if overlay is open
  if (achievementsOverlay.classList.contains('active')) {
    renderAchievementsScreen(); // Use renderAchievementsScreen ao invés de renderAchievements
    updateAchievementStats();
  }

  renderPlayers();
  renderContributions();
  renderUpgrades();
  if (document.getElementById('achievements-container')) {
    renderAchievements();
  }
  teamGoalDisplay.textContent = gameState.teamLevel;

  if (prestigeOverlay.classList.contains('active')) {
    updatePrestigeUI();
  }

  if (bonusStatsOverlay.classList.contains('active')) {
    updateBonusStats();
  }
});

// Adicionar nova função para atualizar apenas elementos essenciais
function updateEssentialUI() {
  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = formatNumber(gameState.totalClicks || 0);
    teamCoinsDisplay.textContent = formatNumber(gameState.teamCoins);
    clickPowerDisplay.textContent = getClickValue(ownPlayer).toFixed(1);
  }

  const currentHP = gameState.levelProgressRemaining;
  const maxHP = gameState.teamLevel * 100;
  const percentage = (currentHP / maxHP * 100).toFixed(0);
  
  // If there was auto-click damage
  if (lastProgress && lastProgress > currentHP) {
    const damage = lastProgress - currentHP;
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 60 + 20;
    showDamageNumber(damage, x, y);
  }
  
  lastProgress = currentHP;
  
  teamSharedProgressBar.style.width = `${percentage}%`;
  progressPercentage.textContent = `${Math.ceil(currentHP)}/${maxHP} HP`;

  if (document.activeElement?.closest('.contribution-container')) {
    renderContributions();
  }
}

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
  const totalContribution = sortedPlayers.reduce((sum, p) => sum + p.contribution, 0) || 0;
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
      <div>${formatNumber(player.contribution)} cliques (${percentage.toFixed(1)}%)</div>
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

  const tier1Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 1);
  const tier1Completed = tier1Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier1Completed && upgradeHistory.tier1.length === 0) {
    upgradeHistory.tier1 = JSON.parse(JSON.stringify(tier1Upgrades));
  }

  const tier2Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 2);
  const tier2Completed = tier2Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier2Completed && upgradeHistory.tier2.length === 0) {
    upgradeHistory.tier2 = JSON.parse(JSON.stringify(tier2Upgrades));
  }

  const tier3Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 3);
  const tier3Completed = tier3Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier3Completed && upgradeHistory.tier3.length === 0) {
    upgradeHistory.tier3 = JSON.parse(JSON.stringify(tier3Upgrades));
  }

  const visibleUpgrades = gameState.upgrades
    .filter(upgrade => {
      if (tier2Completed) {
        return upgrade.tier === 3 && !tier3Completed;
      }
      if (tier1Completed) {
        return upgrade.tier === 2 && !tier2Completed;
      }
      return upgrade.tier === 1;
    })
    .sort((a, b) => gameState.upgrades.indexOf(a) - gameState.upgrades.indexOf(b));

  visibleUpgrades.forEach(upgrade => {
    let price = calculateUpgradePrice(upgrade);
    const canAfford = gameState.teamCoins >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${(!canBuy) ? 'disabled' : ''}`;
    upgradeElement.setAttribute('data-id', upgrade.id); // Add data-id attribute
    const tooltipText = getUpgradeEffectDescription(upgrade);
    upgradeElement.setAttribute('data-tooltip', tooltipText);
    upgradeElement.innerHTML = `
      <div class="upgrade-info">
        <div><strong>${upgrade.icon} ${upgrade.name}</strong> <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span></div>
        <div>${upgrade.description}</div>
      </div>
      <button class="rpgui-button golden" ${(!canBuy) ? 'disabled' : ''}>${maxedOut ? 'MAX' : formatNumber(price)}</button>
    `;

    const buyButton = upgradeElement.querySelector('.rpgui-button.golden');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      socket.emit('buyUpgrade', upgrade.id);
    });

    upgradeElement.addEventListener('mousemove', (event) => {
      showTooltip(event, tooltipText);
    });
    upgradeElement.addEventListener('mouseleave', hideTooltip);

    upgradesContainer.appendChild(upgradeElement);
  });
}

// Modificar renderAchievements para preservar tooltips
function renderAchievements() {
  if (document.querySelector('.tooltip:hover')) {
    return; // Não atualizar se houver um tooltip ativo
  }

  // Se estivermos no overlay de conquistas, use o novo layout em blocos
  if (achievementsOverlay.classList.contains('active')) {
    renderAchievementsScreen(); // Não atualizar se houver um tooltip ativo
    return;
  }

  // Caso contrário, use o layout antigo para a visualização em lista
  const container = document.getElementById('achievements-container');
  if (!container || !gameState.achievements) return;

  container.innerHTML = '';

  // Agrupar conquistas por categoria
  const groupedAchievements = {};
  gameState.achievements.forEach(achievement => {
    const category = achievement.category || 'other';
    if (!groupedAchievements[category]) {
      groupedAchievements[category] = [];
    }
    groupedAchievements[category].push(achievement);
  });

  // Renderizar cada categoria
  Object.entries(groupedAchievements).forEach(([category, achievements]) => {
    const categoryInfo = gameState.achievementCategories[category];
    
    const categoryElement = document.createElement('div');
    categoryElement.className = 'achievement-category';
    categoryElement.innerHTML = `<h3>${categoryInfo.icon} ${categoryInfo.name}</h3>`;

    achievements.forEach(achievement => {
      const unlockedCount = achievement.unlockedLevels.length;
      const maxLevel = achievement.levels.length;
      const nextLevel = achievement.levels[unlockedCount] || achievement.levels[maxLevel - 1];
      
      const achievementElement = document.createElement('div');
      achievementElement.className = `achievement-item ${unlockedCount === maxLevel ? 'completed' : unlockedCount > 0 ? 'unlocked' : 'locked'}`;
      achievementElement.innerHTML = `
        <div class="achievement-info">
          <div class="achievement-header">
            <strong>${achievement.name}</strong>
            <span class="achievement-progress">${unlockedCount}/${maxLevel}</span>
          </div>
          <div class="achievement-description">
            ${achievement.description}
            ${nextLevel ? `<br>Próximo nível: ${nextLevel.description}` : ''}
          </div>
          ${unlockedCount > 0 ? `
            <div class="achievement-boost">
              Bônus atual: +${(achievement.levels[unlockedCount-1].boost.value * 100).toFixed(0)}% ${achievement.levels[unlockedCount-1].boost.type}
            </div>
          ` : ''}
          <div class="achievement-progress-bar">
            <div class="progress-fill" style="width: ${(unlockedCount / maxLevel * 100)}%"></div>
          </div>
        </div>
      `;
      
      categoryElement.appendChild(achievementElement);
    });

    achievementsContainer.appendChild(categoryElement);
  });
}

function renderAchievementsScreen() {
  // Primeiro, limpe o conteúdo atual
  const achievementsContent = document.getElementById('achievements-content');
  achievementsContent.innerHTML = `
    <div class="achievements-summary">
      <div id="achievements-stats"></div>
    </div>
    <div class="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; padding: 15px;"></div>
  `;

  const gridContainer = achievementsContent.querySelector('.achievements-grid');
  if (!gameState.achievements) return;

  const sortedAchievements = [...gameState.achievements].sort((a, b) => {
    const catA = gameState.achievementCategories[a.category].name;
    const catB = gameState.achievementCategories[b.category].name;
    return catA.localeCompare(catB);
  });

  sortedAchievements.forEach(achievement => {
    achievement.levels.forEach((level, levelIndex) => {
      const categoryInfo = gameState.achievementCategories[achievement.category];
      const isUnlocked = achievement.unlockedLevels.includes(levelIndex);
      const isNew = !viewedAchievements.has(`${achievement.id}_${levelIndex}`) && isUnlocked;

      const block = document.createElement('div');
      block.className = `achievement-block ${isUnlocked ? '' : 'locked'}`;
      block.innerHTML = `
        <div class="achievement-icon">${categoryInfo.icon}</div>
        <div class="achievement-name">${achievement.name} ${levelIndex + 1}</div>
        ${isNew ? '<div class="achievement-new-badge">NOVO!</div>' : ''}
        <div class="achievement-info-overlay">
          <h4>${achievement.name} - Nível ${levelIndex + 1}</h4>
          ${isUnlocked ? `
            <p class="achievement-boost">
              +${(level.boost.value * 100).toFixed(0)}%
              ${level.boost.type}
            </p>
          ` : `
            <p class="achievement-requirement">${level.description}</p>
          `}
        </div>
        <div class="achievement-progress-bar">
          <div class="achievement-progress-fill" style="width: ${isUnlocked ? '100%' : '0%'}"></div>
        </div>
      `;

      block.addEventListener('mouseenter', () => {
        if (isNew) {
          viewedAchievements.add(`${achievement.id}_${levelIndex}`);
          const badge = block.querySelector('.achievement-new-badge');
          if (badge) {
            badge.style.opacity = '0';
            setTimeout(() => badge.remove(), 300);
          }
        }
      });

      gridContainer.appendChild(block);
    });
  });

  updateAchievementStats();
}

// Adicione estas variáveis após as outras declarações de variáveis no início do arquivo
let notificationQueue = [];
let isNotificationShowing = false;
let lastNotification = '';  // Adicionar variável para rastrear última notificação

// Substitua a função showNotification existente
function showNotification(message) {
  console.log('[ShowNotification]', message); // Debug log
  message = message.replace(/🪙/g, '<span class="coin-icon"></span>');
  notificationQueue.push(message);

  if (!isNotificationShowing) {
    showNextNotification();
  }
}

function showNextNotification() {
  if (notificationQueue.length === 0) {
    isNotificationShowing = false;
    return;
  }

  isNotificationShowing = true;
  const message = notificationQueue.shift();
  
  notification.classList.remove('show');
  notification.innerHTML = message.replace(/\n/g, '<br>');
  
  // Dispara um reflow para garantir que a animação funcione
  void notification.offsetWidth;
  
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      isNotificationShowing = false;
      showNextNotification();
    }, 300);
  }, 5000);
}

socket.on('notification', (message) => {
  console.log('[Notification]', message); // Debug log
  showNotification(message);
});

initStartScreen();

function updatePrestigeUI() {
  document.getElementById('fragments-count').textContent = gameState?.fragments || 0;
  document.getElementById('potential-fragments').textContent = calculatePrestigeReward();
  renderPrestigeUpgrades();
}

function calculatePrestigeReward() {
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return 0;

  const fragmentMultiplierUpgrade = gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier');
  const fragmentMultiplier = fragmentMultiplierUpgrade && typeof fragmentMultiplierUpgrade.effect === 'function'
    ? fragmentMultiplierUpgrade.effect(fragmentMultiplierUpgrade.level)
    : 1;
  const baseFragments = Math.floor(Math.sqrt(player.level) * 2);
  return Math.floor(baseFragments * fragmentMultiplier);
}

function renderPrestigeUpgrades() {
  const container = document.getElementById('prestige-upgrades-container');
  if (!container) return;

  container.innerHTML = '';
  if (!gameState?.prestigeUpgrades || gameState.prestigeUpgrades.length === 0) {
    container.innerHTML = '<p>Nenhum upgrade de prestígio disponível.</p>';
    return;
  }

  gameState.prestigeUpgrades.forEach(upgrade => {
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
      <button class="rpgui-button golden" ${(!canBuy) ? 'disabled' : ''}>${maxedOut ? 'MAX' : `${formatNumber(price)} 🔮`}</button>
    `;

    const buyButton = upgradeElement.querySelector('.rpgui-button.golden');
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
      const clickBonus = upgrade.tier === 1 ? upgrade.level * 100 : upgrade.level * 200;
      return `Aumenta o poder de clique em ${clickBonus}%`;
    case 'auto-clicker':
    case 'auto-clicker-2':
      const autoClicks = upgrade.tier === 1 ? upgrade.level : upgrade.level * 2;
      return `Gera ${autoClicks} cliques automáticos por segundo`;
    case 'coin-boost':
    case 'coin-boost-2':
      const coinBonus = upgrade.tier === 1 ? upgrade.level * 20 : upgrade.level * 40;
      return `Aumenta as moedas ganhas em ${coinBonus}%`;
    case 'progress-boost':
    case 'progress-boost-2':
      const progressBonus = upgrade.tier === 1 ? upgrade.level * 5 : upgrade.level * 8;
      return `Reduz a dificuldade de progresso em ${progressBonus}%`;
    case 'team-synergy':
    case 'team-synergy-2':
      const playerCount = gameState?.players?.length || 0;
      return upgrade.level * (playerCount * (upgrade.tier === 1 ? 0.1 : 0.2));
    case 'shared-rewards':
    case 'shared-rewards-2':
      const rewardBonus = upgrade.tier === 1 ? upgrade.level * 15 : upgrade.level * 30;
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

  if (upgradeHistory.tier1.length > 0) {
    const tier1Section = document.createElement('div');
    tier1Section.className = 'history-tier';
    tier1Section.innerHTML = `
      <div class="history-tier-title">Tier 1 (Completado)</div>
      ${upgradeHistory.tier1.map(upgrade => `
        <div class="upgrade-item">
          <div class="history-upgrade-info">
            <div class="upgrade-info">
              <div><strong>${upgrade.icon} ${upgrade.name}</strong> (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
              <div>${upgrade.description}</div>
            </div>
            <button class="buff-info-button" data-upgrade-id="${upgrade.id}" data-tier="1">ℹ️</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(tier1Section);
  }

  if (upgradeHistory.tier2.length > 0) {
    const tier2Section = document.createElement('div');
    tier2Section.className = 'history-tier';
    tier2Section.innerHTML = `
      <div class="history-tier-title">Tier 2 (Completado)</div>
      ${upgradeHistory.tier2.map(upgrade => `
        <div class="upgrade-item">
          <div class="history-upgrade-info">
            <div class="upgrade-info">
              <div><strong>${upgrade.icon} ${upgrade.name}</strong> (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
              <div>${upgrade.description}</div>
            </div>
            <button class="buff-info-button" data-upgrade-id="${upgrade.id}" data-tier="2">ℹ️</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(tier2Section);
  }

  if (upgradeHistory.tier3.length > 0) {
    const tier3Section = document.createElement('div');
    tier3Section.className = 'history-tier';
    tier3Section.innerHTML = `
      <div class="history-tier-title">Tier 3 (Completado)</div>
      ${upgradeHistory.tier3.map(upgrade => `
        <div class="upgrade-item">
          <div class="history-upgrade-info">
            <div class="upgrade-info">
              <div><strong>${upgrade.icon} ${upgrade.name}</strong> (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
              <div>${upgrade.description}</div>
            </div>
            <button class="buff-info-button" data-upgrade-id="${upgrade.id}" data-tier="3">ℹ️</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(tier3Section);
  }

  const buffButtons = container.querySelectorAll('.buff-info-button');
  buffButtons.forEach(button => {
    let activeTooltip = null;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const upgradeId = button.dataset.upgradeId;
      const tier = parseInt(button.dataset.tier);
      const upgrade = tier === 1 ? upgradeHistory.tier1.find(u => u.id === upgradeId) :
                     tier === 2 ? upgradeHistory.tier2.find(u => u.id === upgradeId) :
                                 upgradeHistory.tier3.find(u => u.id === upgradeId);
      if (activeTooltip) {
        hideBuffTooltip(activeTooltip);
        activeTooltip = null;
      } else {
        const buffDescription = getUpgradeBuffDescription(upgrade);
        activeTooltip = showBuffTooltip(e, buffDescription);
      }
    });

    document.addEventListener('click', () => {
      if (activeTooltip) {
        hideBuffTooltip(activeTooltip);
        activeTooltip = null;
      }
    });
  });
}

socket.on('prestige', () => {
  upgradeHistory = {
    tier1: [],
    tier2: [],
    tier3: []
  };
  viewedAchievements.clear(); // Limpar todos os níveis visualizados
});

function updateBonusStats() {
  if (!bonusStatsContent || !gameState.players) return;

  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return;

  const prestigeBonus = ((player.prestigeMultiplier || 1) - 1) * 100;
  const clickPowerBonus = (getUpgradeEffect('click-power') - 1) * 100;
  const autoClickerBonus = getUpgradeEffect('auto-clicker') * gameState.achievementBoosts.autoMultiplier;
  const coinBoostBonus = (getUpgradeEffect('coin-boost') - 1) * 100;
  const teamSynergyBonus = getUpgradeEffect('team-synergy') * 100;
  const sharedRewardsBonus = getUpgradeEffect('shared-rewards') * 100;

  const bonusCategories = {
    basic: {
      title: "Bônus Básicos",
      items: [
        { name: "Poder de Clique", value: clickPowerBonus.toFixed(1) + "%" },
        { name: "Cliques Automáticos/s", value: autoClickerBonus.toFixed(1) },
        { name: "Multiplicador de Moedas", value: coinBoostBonus.toFixed(1) + "%" }
      ]
    },
    team: {
      title: "Bônus de Equipe",
      items: [
        { name: "Sinergia de Equipe", value: teamSynergyBonus.toFixed(1) + "%" },
        { name: "Recompensas Compartilhadas", value: sharedRewardsBonus.toFixed(1) + "%" }
      ]
    },
    achievements: {
      title: "Bônus de Conquistas",
      items: [
        { name: "Multiplicador de Clique", value: ((gameState.achievementBoosts.clickMultiplier - 1) * 100).toFixed(1) + "%" },
        { name: "Multiplicador Automático", value: ((gameState.achievementBoosts.autoMultiplier - 1) * 100).toFixed(1) + "%" },
        { name: "Redução Custo Prestígio", value: ((1 - gameState.achievementBoosts.prestigeCostReduction) * 100).toFixed(1) + "%" },
        { name: "Duração Power-Ups", value: ((gameState.achievementBoosts.powerUpDuration - 1) * 100).toFixed(1) + "%" },
        { name: "Efeito de Upgrades", value: ((gameState.achievementBoosts.upgradeEffect - 1) * 100).toFixed(1) + "%" }
      ]
    },
    prestige: {
      title: "Bônus de Prestígio",
      items: [
        { name: "Multiplicador de Prestígio", value: prestigeBonus.toFixed(1) + "%" },
      ]
    }
  };

  bonusStatsContent.innerHTML = Object.values(bonusCategories).map(category => `
    <div class="bonus-category">
      <h3>${category.title}</h3>
      ${category.items.map(item => `
        <div class="bonus-item">
          <span class="bonus-name">${item.name}</span>
          <span class="bonus-value">${item.value}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function getUpgradeEffectValue(upgrade) {
  if (!upgrade) return 0;
  
  switch (upgrade.id) {
    case 'click-power':
    case 'click-power-2':
      return upgrade.level + 1;
    case 'auto-clicker':
    case 'auto-clicker-2':
      return upgrade.level * (upgrade.tier === 1 ? 1 : 2);
    case 'coin-boost':
    case 'coin-boost-2':
      return 1 + upgrade.level * (upgrade.tier === 1 ? 0.2 : 0.4);
    case 'progress-boost':
    case 'progress-boost-2':
      return 1.25 - (upgrade.level * (upgrade.tier === 1 ? 0.05 : 0.08));
    case 'team-synergy':
    case 'team-synergy-2':
      const playerCount = gameState?.players?.length || 0;
      return upgrade.level * (playerCount * (upgrade.tier === 1 ? 0.1 : 0.2));
    case 'shared-rewards':
    case 'shared-rewards-2':
      return upgrade.level * (upgrade.tier === 1 ? 0.15 : 0.3);
    default:
      return 0;
  }
}

function getUpgradeEffect(upgradeId) {
  const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  const effectValue = getUpgradeEffectValue(upgrade);
  return effectValue * (gameState.achievementBoosts?.upgradeEffect || 1);
}

function showDamageNumber(damage, x, y) {
  const damageContainer = document.getElementById('damage-container');
  const damageElement = document.createElement('div');
  damageElement.className = 'damage-number';
  damageElement.textContent = `+${Math.ceil(damage)}`;
  
  // Position the damage number randomly within the progress bar
  damageElement.style.left = `${x}%`;
  damageElement.style.top = `${y}%`;

  damageContainer.appendChild(damageElement);

  // Start animation in next frame for smooth transition
  requestAnimationFrame(() => {
    damageElement.classList.add('animate');
  });

  // Remove element after animation
  damageElement.addEventListener('animationend', () => {
    damageElement.remove();
  });
}

// Modify socket.on('click') to show damage numbers
socket.on('click', () => {
  const player = gameState.players.find(p => p.id === socket.id);
  if (player) {
    const clickValue = calculateClickValue(player);
    
    // Calculate random position within the progress bar
    const x = Math.random() * 80 + 10; // Keep numbers between 10% and 90%
    const y = Math.random() * 60 + 20; // Keep numbers between 20% and 80%
    
    showDamageNumber(clickValue, x, y);
  }
});

// Add variable to track last progress
let lastProgress = null;

// ...existing code...

socket.on('bossSpawn', (bossData) => {
  showBossFight(bossData);
  startBossTimer(bossData.timeLimit);
});

socket.on('bossUpdate', (data) => {
  updateBossHealth(data.health, data.maxHealth);
  showBossDamage(data.damage, data.playerName);
});

socket.on('bossResult', (result) => {
  if (result.victory) {
    showNotification(`Boss derrotado por ${result.killedBy}!\nRecompensa: ${result.coins} moedas\nPoder de clique multiplicado por ${result.multiplier}x por ${result.duration/1000} segundos!`);
  } else {
    showNotification(`Boss não foi derrotado a tempo!\nPenalidade: ${formatNumber(result.penalty)} moedas perdidas...`);
  }
  hideBossFight();
});

function startBossTimer(duration) {
  const timerDisplay = document.querySelector('.boss-timer');
  const startTime = Date.now();
  
  const timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    
    timerDisplay.textContent = seconds;
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
    }
  }, 100);
}

function showBossFight(bossData) {
  const bossOverlay = document.querySelector('.boss-overlay');
  const bossContainer = document.querySelector('.boss-container');
  const bossImage = document.querySelector('.boss-image');

  bossOverlay.classList.add('active');
  startParticleEffect(bossData.particles);
  updateBossHealth(bossData.health, bossData.maxHealth);
  
  // Carregar imagem do boss
  bossImage.src = bossData.image;
  bossImage.onerror = () => {
    console.error('Erro ao carregar imagem do boss:', bossData.image);
    bossImage.src = 'assets/bosses/default_boss.png'; // Fallback image
  };

  // Permitir cliques na área do boss
  bossContainer.onclick = (e) => {
    if (!isOwnPlayer()) return;
    
    // Add click animation
    bossContainer.classList.add('clicked');
    setTimeout(() => bossContainer.classList.remove('clicked'), 200);
    
    socket.emit('click');
    const rect = bossContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    showDamageNumber(calculateClickValue(gameState.players.find(p => p.id === socket.id)), x, y);
  };
}

function updateBossHealth(current, max) {
  const healthFill = document.querySelector('.boss-health-fill');
  const healthText = document.querySelector('.boss-health-text');
  const percentage = (current / max * 100).toFixed(2);
  
  healthFill.style.width = `${percentage}%`;
  healthText.textContent = `${Math.ceil(current).toLocaleString()} / ${Math.ceil(max).toLocaleString()} HP`;
}

function showBossDamage(damage, playerName) {
  const container = document.querySelector('.boss-container');
  const damageEl = document.createElement('div');
  damageEl.className = 'boss-damage';
  damageEl.textContent = `${playerName}: -${Math.ceil(damage)}`;
  
  // Random position around boss
  const x = Math.random() * 200 - 100;
  const y = Math.random() * 100 - 50;
  
  damageEl.style.left = `calc(50% + ${x}px)`;
  damageEl.style.top = `calc(50% + ${y}px)`;
  
  container.appendChild(damageEl);
  setTimeout(() => damageEl.remove(), 1000);
}

function startParticleEffect(config) {
  const container = document.querySelector('.boss-container');
  
  setInterval(() => {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.backgroundColor = config.color;
    particle.style.width = '4px';
    particle.style.height = '4px';
    
    const startX = Math.random() * container.offsetWidth;
    particle.style.left = `${startX}px`;
    particle.style.top = '-4px';
    
    container.appendChild(particle);
    
    let posY = -4;
    const interval = setInterval(() => {
      posY += config.speed;
      particle.style.top = `${posY}px`;
      
      if (posY > container.offsetHeight) {
        clearInterval(interval);
        particle.remove();
      }
    }, 16);
  }, 100);
}

function hideBossFight() {
  const bossOverlay = document.querySelector('.boss-overlay');
  bossOverlay.classList.remove('active');
}

// ...existing code...

// Add purchase animation
socket.on('upgradePurchased', (upgradeId) => {
  const el = document.querySelector(`[data-id="${upgradeId}"]`);
  if (el) {
    el.classList.add('purchased');
    setTimeout(() => el.classList.remove('purchased'), 500);
  }
});

// ...existing code...

function updateLaboratory() {
  laboratoryData.researchPoints += laboratoryData.pointsPerSecond;
  if (laboratoryOverlay.classList.contains('active')) {
    updateLaboratoryUI();
  }
  saveLaboratoryData(); // Salvar após cada atualização
}

function updateLaboratoryUI() {
  const researchPoints = document.getElementById('research-points');
  const researchPerSecond = document.getElementById('research-per-second');
  const upgradesContainer = document.getElementById('laboratory-upgrades');
  
  researchPoints.textContent = Math.floor(laboratoryData.researchPoints);
  researchPerSecond.textContent = laboratoryData.pointsPerSecond.toFixed(1);
  
  upgradesContainer.innerHTML = laboratoryData.upgrades.map(upgrade => {
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    return `
      <div class="laboratory-upgrade" onclick="buyLabUpgrade('${upgrade.id}')">
        <h3>${upgrade.name} (Nível ${upgrade.level})</h3>
        <p>${upgrade.description}</p>
        <p>Custo: ${cost} pontos</p>
      </div>
    `;
  }).join('');
}

function buyLabUpgrade(upgradeId) {
  const upgrade = laboratoryData.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return;
  
  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
  
  if (laboratoryData.researchPoints >= cost) {
    laboratoryData.researchPoints -= cost;
    upgrade.level++;
    
    // Atualizar pontos por segundo
    if (upgradeId === 'automation') {
      laboratoryData.pointsPerSecond += upgrade.effect;
    } else if (upgradeId === 'efficiency') {
      laboratoryData.pointsPerSecond *= (1 + upgrade.effect);
    }
    
    updateLaboratoryUI();
  }
}

// Adicionar após a definição do laboratoryData
function saveLaboratoryData() {
  localStorage.setItem('laboratoryData', JSON.stringify(laboratoryData));
}

function loadLaboratoryData() {
  const saved = localStorage.getItem('laboratoryData');
  if (saved) {
    laboratoryData = JSON.parse(saved);
  }
}

function initLaboratoryGarden() {
  const gardenGrid = document.getElementById('laboratory-garden');
  const seedOptions = document.querySelectorAll('.seed-option');
  
  // Inicializar slots
  updateGardenSlots();
  
  // Event listeners para as sementes
  seedOptions.forEach(option => {
    option.addEventListener('click', () => {
      if (option.classList.contains('locked')) return;
      seedOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      laboratoryData.garden.selectedSeed = option.dataset.seed;
    });
  });
  
  // Event listeners para os botões da loja
  document.getElementById('buy-lab-slot').addEventListener('click', buyLabSlot);
  document.getElementById('buy-lab-crystal').addEventListener('click', buyLabCrystal);
  
  // Iniciar loop de verificação
  setInterval(checkGardenProgress, 1000);
}

// ...existing code...
function updateGardenSlots() {
  const gardenGrid = document.getElementById('laboratory-garden');
  gardenGrid.innerHTML = '';
  
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = `garden-slot ${i >= laboratoryData.garden.unlockedSlots ? 'locked' : ''}`;
    slot.dataset.slot = i;
    
    if (i < laboratoryData.garden.unlockedSlots) {
      slot.innerHTML = `
        <div class="plant-placeholder">Clique para plantar</div>
        <div class="progress-bar"></div>
        <div class="ready-indicator">Pronto!</div>
      `;
      setupGardenSlot(slot);
    } else {
      slot.innerHTML = `
        <div class="lock-icon">🔒</div>
        <div class="plant-placeholder">Slot Bloqueado</div>
      `;
    }
    
    gardenGrid.appendChild(slot);
  }
}
// ...existing code...

function setupGardenSlot(slot) {
  slot.addEventListener('click', () => {
    const slotId = slot.dataset.slot;
    const garden = laboratoryData.garden;
    
    if (garden.plants[slotId]?.ready) {
      harvestPlant(slotId);
    } else if (!garden.plants[slotId]) {
      plantSeed(slotId);
    }
  });
}

// ...existing code...
function plantSeed(slotId) {
  const garden = laboratoryData.garden;
  const seedType = garden.selectedSeed;
  const seed = laboratoryData.seedData[seedType];
  
  if (seedType === 'crystal' && !garden.crystalUnlocked) {
    showNotification('Desbloqueie a semente de cristal primeiro!');
    return;
  }
  
  const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
  const growthTime = seed.time * 1000;
  
  slot.innerHTML = `
    <div class="plant">${seed.icon}</div>
    <div class="progress-bar"></div>
    <div class="ready-indicator">Pronto!</div>
  `;
  
  garden.plants[slotId] = {
    type: seedType,
    plantedAt: Date.now(),
    growthTime,
    ready: false
  };

  // Inicia o progresso em 0
  const progressBar = slot.querySelector('.progress-bar');
  progressBar.style.width = '0%';

  // Atualiza o progresso a cada 100ms
  const updateProgress = () => {
    const plant = garden.plants[slotId];
    if (!plant || plant.ready) return;

    const now = Date.now();
    const elapsed = now - plant.plantedAt;
    const progress = (elapsed / plant.growthTime) * 100;
    
    if (progress >= 100) {
      progressBar.style.width = '100%';
      plant.ready = true;
      slot.querySelector('.ready-indicator').style.display = 'block';
      showNotification(`${seed.name} está pronto para colheita!`);
    } else {
      progressBar.style.width = `${progress}%`;
      requestAnimationFrame(updateProgress);
    }
  };

  // Inicia a atualização do progresso
  requestAnimationFrame(updateProgress);
}
// ...existing code...

function harvestPlant(slotId) {
  const garden = laboratoryData.garden;
  const plant = garden.plants[slotId];
  const seed = laboratoryData.seedData[plant.type];
  
  garden.resources[plant.type] += seed.yield;
  delete garden.plants[slotId];
  
  const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
  slot.innerHTML = `
    <div class="plant-placeholder">Clique para plantar</div>
    <div class="progress-bar"></div>
    <div class="ready-indicator">Pronto!</div>
  `;
  
  updateLabResources();
  showNotification(`Colheu ${seed.yield} ${seed.name}!`);
}

function checkGardenProgress() {
  const garden = laboratoryData.garden;
  
  for (const slotId in garden.plants) {
    const plant = garden.plants[slotId];
    if (!plant.ready) {
      const progress = (Date.now() - plant.plantedAt) / plant.growthTime;
      if (progress >= 1) {
        plant.ready = true;
        const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
        slot.querySelector('.ready-indicator').style.display = 'block';
      }
    }
  }
}

function updateLabResources() {
  const resources = laboratoryData.garden.resources;
  Object.keys(resources).forEach(type => {
    const element = document.getElementById(`lab-${type}-count`);
    if (element) element.textContent = resources[type];
  });
}

function buyLabSlot() {
  const garden = laboratoryData.garden;
  
  if (garden.unlockedSlots >= 4) {
    showNotification('Todos os slots já estão desbloqueados!');
    return;
  }
  
  if (garden.resources.sunflower >= 5 && garden.resources.tulip >= 3) {
    garden.resources.sunflower -= 5;
    garden.resources.tulip -= 3;
    garden.unlockedSlots++;
    updateGardenSlots();
    updateLabResources();
    showNotification('Novo slot de plantio desbloqueado!');
  } else {
    showNotification('Recursos insuficientes!');
  }
}

function buyLabCrystal() {
  const garden = laboratoryData.garden;
  
  if (garden.crystalUnlocked) {
    showNotification('Semente de Cristal já desbloqueada!');
    return;
  }
  
  if (garden.resources.sunflower >= 8 && garden.resources.tulip >= 5 && garden.resources.mushroom >= 3) {
    garden.resources.sunflower -= 8;
    garden.resources.tulip -= 5;
    garden.resources.mushroom -= 3;
    garden.crystalUnlocked = true;
    
    const crystalSeed = document.querySelector('.seed-option[data-seed="crystal"]');
    crystalSeed.classList.remove('locked');
    updateLabResources();
    showNotification('Semente de Cristal desbloqueada!');
  } else {
    showNotification('Recursos insuficientes!');
  }
}

// ...existing code...

// Adicionar bem no fim do arquivo, após a última função buyLabCrystal()

// Power-up activation logic
let lastPowerUpSpawn = 0;

function showPowerupTimer() {
  const now = Date.now();
  const timeSinceLastSpawn = now - lastPowerUpSpawn;
  const nextSpawnTime = Math.max(0, (lastPowerUpSpawn + powerUpInterval) - now);
  const seconds = Math.ceil(nextSpawnTime / 1000);
  
  if (seconds > 0) {
    powerupTimerDisplay.textContent = `Próximo em ${seconds}s`;
    powerupTimerDisplay.style.display = 'block';
  } else {
    powerupTimerDisplay.style.display = 'none';
  }
}

function handlePowerUpActivation() {
  const now = Date.now();
  
  // Don't spawn if recently spawned
  if (now - lastPowerUpSpawn < powerUpInterval) return;
  
  lastPowerUpSpawn = now;
  spawnFloatingPowerUp();
}

// Handle boss fight particles cleanup
function cleanupBossParticles() {
  const container = document.querySelector('.boss-container');
  if (!container) return;
  
  const particles = container.querySelectorAll('.particle');
  particles.forEach(particle => particle.remove());
}

// Save data handling
function saveGameState() {
  try {
    localStorage.setItem('laboratoryData', JSON.stringify(laboratoryData));
    localStorage.setItem('lastSaveTime', Date.now().toString());
  } catch (e) {
    console.error('Error saving game state:', e);
  }
}

function loadGameState() {
  try {
    const savedLaboratoryData = localStorage.getItem('laboratoryData');
    if (savedLaboratoryData) {
      laboratoryData = JSON.parse(savedLaboratoryData);
    }
    
    const lastSaveTime = parseInt(localStorage.getItem('lastSaveTime') || '0');
    const now = Date.now();
    const timeDiff = now - lastSaveTime;
    
    if (timeDiff > 0) {
      processOfflineProgress(timeDiff);
    }
  } catch (e) {
    console.error('Error loading game state:', e);
  }
}

function processOfflineProgress(timeDiff) {
  const seconds = Math.floor(timeDiff / 1000);
  
  // Process laboratory progress
  const pointsGained = laboratoryData.pointsPerSecond * seconds;
  laboratoryData.researchPoints += pointsGained;
  
  // Process garden growth
  Object.entries(laboratoryData.garden.plants).forEach(([slotId, plant]) => {
    if (!plant.ready) {
      const elapsedTime = Date.now() - plant.plantedAt;
      if (elapsedTime >= plant.growthTime) {
        plant.ready = true;
      }
    }
  });
  
  if (pointsGained > 0) {
    showNotification(`Progresso Offline:\n+${Math.floor(pointsGained)} pontos de pesquisa\nPlantações atualizadas!`);
  }
}

// Auto-save every minute
setInterval(saveGameState, 60000);

// Clean up on window unload
window.addEventListener('beforeunload', () => {
  saveGameState();
  cleanupBossParticles();
});

// Initialize game state on load
window.addEventListener('load', () => {
  loadGameState();
  initStartScreen();
});