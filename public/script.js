// Conectar ao servidor
const socket = io('/');

// Estado local mínimo
let activePlayerIndex = -1;
let gameState = { players: [] };
let isSpacePressed = false;

// Elementos DOM
const clicksDisplay = document.getElementById('clicks');
const levelDisplay = document.getElementById('level');
const targetDisplay = document.getElementById('target');
const teamCoinsDisplay = document.getElementById('team-coins');
const clickPowerDisplay = document.getElementById('click-power');
const clickArea = document.getElementById('click-area');
const gameContainer = document.querySelector('.game-container');
const upgradesContainer = document.getElementById('upgrades-container');
const achievementsContainer = document.getElementById('achievements-container');
const notification = document.getElementById('notification');
const powerupNotification = document.getElementById('powerup-notification');
const playerList = document.getElementById('player-list');
const playerNameInput = document.getElementById('player-name');
const addPlayerButton = document.getElementById('add-player');
const switchPlayerButton = document.getElementById('switch-player');
const activePlayerDisplay = document.getElementById('active-player');
const contributionContainer = document.getElementById('contribution-container');
const teamGoalDisplay = document.getElementById('team-goal');
const teamBonusMessage = document.getElementById('team-bonus-message');
const themeToggleButton = document.getElementById('theme-toggle');
const teamSharedProgressBar = document.getElementById('team-shared-progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const prestigeDisplay = document.getElementById('prestige');
const prestigeButton = document.getElementById('prestige-button');
const activateClickFrenzyButton = document.getElementById('activate-click-frenzy');
const tooltip = document.getElementById('tooltip');

// Função para alternar o modo noturno
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  themeToggleButton.textContent = isDarkMode ? 'Modo Claro' : 'Modo Noturno';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Carregar tema salvo no localStorage
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleButton.textContent = 'Modo Claro';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleButton.textContent = 'Modo Noturno';
  }
}

// Adicionar evento ao botão de alternância de tema
themeToggleButton.addEventListener('click', toggleTheme);

// Função para mostrar tooltip
function showTooltip(event, text) {
  tooltip.textContent = text;
  tooltip.style.display = 'block';
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;
}

// Função para esconder tooltip
function hideTooltip() {
  tooltip.style.display = 'none';
}

// Verificar se o jogador ativo é o "dono" deste cliente
function isOwnPlayer() {
  const activePlayer = gameState.players[activePlayerIndex];
  return activePlayer && activePlayer.id === socket.id;
}

// Função para mostrar notificação de power-up
function showPowerupNotification(powerUpInfo) {
  powerupNotification.textContent = `${powerUpInfo.name} ativado! ${powerUpInfo.description} por ${powerUpInfo.duration/1000} segundos!`;
  powerupNotification.style.backgroundColor = powerUpInfo.color;
  powerupNotification.classList.add('show');
  setTimeout(() => powerupNotification.classList.remove('show'), 10000);
}

// Função para posicionar o botão flutuante aleatoriamente
function spawnFloatingPowerUp() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const buttonWidth = activateClickFrenzyButton.offsetWidth;
  const buttonHeight = activateClickFrenzyButton.offsetHeight;

  const maxX = viewportWidth - buttonWidth - 20;
  const maxY = viewportHeight - buttonHeight - 20;

  const randomX = Math.floor(Math.random() * maxX) + 10;
  const randomY = Math.floor(Math.random() * maxY) + 10;

  activateClickFrenzyButton.style.left = `${randomX}px`;
  activateClickFrenzyButton.style.top = `${randomY}px`;
  activateClickFrenzyButton.style.display = 'block';

  // Escolher uma cor aleatória dos power-ups disponíveis
  const availableColors = Object.values(gameState.powerUps).map(p => p.color);
  const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
  activateClickFrenzyButton.style.backgroundColor = randomColor;
  
  // Esconder após exatamente 5 segundos
  setTimeout(() => {
    if (activateClickFrenzyButton.style.display === 'block') {
      activateClickFrenzyButton.style.display = 'none';
      scheduleNextSpawn();
    }
  }, 5000); // 5 segundos fixos
}

// Função para agendar o próximo aparecimento aleatório
function scheduleNextSpawn() {
    const minDelay = 60000; // 1 minuto em milissegundos
    const maxDelay = 180000; // 3 minutos em milissegundos
    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
    console.log(`[PowerUp] Próximo power-up em ${(randomDelay/1000).toFixed(0)} segundos`);
    setTimeout(spawnFloatingPowerUp, randomDelay);
}

// Inicializar jogo
function initGame() {
  loadTheme();

  clickArea.addEventListener('click', () => {
    socket.emit('click');
  });

  clickArea.addEventListener('touchstart', (event) => {
    event.preventDefault();
    socket.emit('click');
    clickArea.classList.add('active');
  });

  clickArea.addEventListener('touchend', () => {
    clickArea.classList.remove('active');
  });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !isSpacePressed) {
      event.preventDefault();
      isSpacePressed = true;
      socket.emit('click');
      clickArea.classList.add('active');
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.code === 'KeyP') {
      isSpacePressed = false;
      clickArea.classList.remove('active');
    }
  });

  addPlayerButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName === '') {
      showNotification('Por favor, insira um nome para o jogador');
      return;
    }
    if (gameState.players && gameState.players.length >= 3) {
      showNotification('O limite de 3 jogadores foi atingido!');
      playerNameInput.value = '';
      return;
    }
    socket.emit('addPlayer', { name: playerName });
    playerNameInput.value = '';
  });

  switchPlayerButton.addEventListener('click', switchPlayer);

  prestigeButton.addEventListener('click', () => {
    if (!isOwnPlayer()) {
      showNotification('Você só pode prestigiar quando for o jogador ativo!');
      return;
    }
    socket.emit('prestige');
  });

  activateClickFrenzyButton.addEventListener('click', () => {
    if (!isOwnPlayer()) {
      showNotification('Você só pode ativar power-ups quando for o jogador ativo!');
      return;
    }
    socket.emit('activatePowerUp');
    activateClickFrenzyButton.style.display = 'none';
    const powerUpName = gameState.powerUps['click-frenzy'].name;
    const powerUpDesc = gameState.powerUps['click-frenzy'].description;
    showPowerupNotification(`${powerUpName} ativado! ${powerUpDesc} por 30 segundos!`);
    scheduleNextSpawn();
  });

  renderUpgrades();
  renderAchievements();

  // Iniciar o ciclo de spawn do power-up
  scheduleNextSpawn();
}

// Atualizar o estado do jogo
socket.on('gameStateUpdate', (newState) => {
  gameState = newState;

  if (activePlayerIndex === -1 && gameState.players && gameState.players.length > 0) {
    const ownPlayerIndex = gameState.players.findIndex(player => player.id === socket.id);
    activePlayerIndex = ownPlayerIndex !== -1 ? ownPlayerIndex : 0;
  }

  if (gameState.players && gameState.players.length > 0 && activePlayerIndex >= 0) {
    const activePlayer = gameState.players[activePlayerIndex];
    if (activePlayer) {
      clicksDisplay.textContent = Math.floor(activePlayer.clicks);
      levelDisplay.textContent = activePlayer.level;
      teamCoinsDisplay.textContent = Math.floor(gameState.teamCoins);
      clickPowerDisplay.textContent = calculateClickValue(activePlayer).toFixed(1);
      targetDisplay.textContent = '-';
      prestigeDisplay.textContent = activePlayer.prestige || 0;
      prestigeButton.style.display = activePlayer.level >= 25 && isOwnPlayer() ? 'block' : 'none';
      // Remover verificação de moedas para o power-up
      const isPowerUpActive = gameState.powerUps['click-frenzy'].active;
      activateClickFrenzyButton.disabled = isPowerUpActive || !isOwnPlayer();
    }
    const teamProgress = (gameState.teamClicksRemaining / (gameState.teamLevel * 100)) * 100;
    const percentage = Math.max(0, Math.min(100, teamProgress)).toFixed(0);
    teamSharedProgressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
  } else {
    clicksDisplay.textContent = 0;
    levelDisplay.textContent = 1;
    teamCoinsDisplay.textContent = 0;
    clickPowerDisplay.textContent = 1;
    prestigeDisplay.textContent = 0;
    teamSharedProgressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    activePlayerDisplay.textContent = '-';
    prestigeButton.style.display = 'none';
  }

  renderPlayers();
  renderContributions();
  renderUpgrades();
  renderAchievements();
  teamGoalDisplay.textContent = gameState.teamGoal;
});

// Adicionar listener para o evento powerUpActivated
socket.on('powerUpActivated', (powerUpInfo) => {
  showPowerupNotification(powerUpInfo);
});

// Função para alternar entre jogadores
function switchPlayer() {
  if (!gameState.players || gameState.players.length === 0) {
    showNotification('Não há jogadores para alternar!');
    return;
  }
  activePlayerIndex = (activePlayerIndex + 1) % gameState.players.length;
  updateActivePlayer();
  updateDisplays();
}

// Atualizar o jogador ativo
function updateActivePlayer() {
  const playerTags = document.querySelectorAll('.player-tag');
  playerTags.forEach((tag, index) => {
    tag.setAttribute('data-active', index === activePlayerIndex ? 'true' : 'false');
  });
  if (gameState.players && gameState.players.length > 0 && activePlayerIndex >= 0) {
    activePlayerDisplay.textContent = gameState.players[activePlayerIndex]?.name || '-';
  } else {
    activePlayerDisplay.textContent = '-';
  }
}

// Calcular o valor do clique
function calculateClickValue(player) {
  let clickPower = 1 * (player.prestigeMultiplier || 1);
  if (gameState.powerUps && gameState.powerUps['click-frenzy']?.active) {
    clickPower *= gameState.powerUps['click-frenzy'].multiplier;
  }
  return clickPower;
}

// Atualizar as exibições
function updateDisplays() {
  if (gameState.players && gameState.players.length > 0 && activePlayerIndex >= 0) {
    const activePlayer = gameState.players[activePlayerIndex];
    if (activePlayer) {
      clicksDisplay.textContent = Math.floor(activePlayer.clicks);
      levelDisplay.textContent = activePlayer.level;
      teamCoinsDisplay.textContent = Math.floor(gameState.teamCoins);
      clickPowerDisplay.textContent = calculateClickValue(activePlayer).toFixed(1);
      targetDisplay.textContent = '-';
      prestigeDisplay.textContent = activePlayer.prestige || 0;
      prestigeButton.style.display = activePlayer.level >= 25 && isOwnPlayer() ? 'block' : 'none';
    }
  } else {
    clicksDisplay.textContent = 0;
    levelDisplay.textContent = 1;
    teamCoinsDisplay.textContent = 0;
    clickPowerDisplay.textContent = 1;
    prestigeDisplay.textContent = 0;
  }
}

// Renderizar a lista de jogadores
function renderPlayers() {
  playerList.innerHTML = '';
  if (!gameState.players) return;
  gameState.players.forEach((player, index) => {
    const playerTag = document.createElement('div');
    playerTag.className = 'player-tag';
    playerTag.setAttribute('data-active', index === activePlayerIndex ? 'true' : 'false');
    const initials = player.name.slice(0, 2).toUpperCase();
    playerTag.innerHTML = `
      <div class="player-avatar" style="background-color: #007bff">${initials}</div>
      ${player.name}
    `;
    playerList.appendChild(playerTag);
  });
}

// Renderizar as contribuições dos jogadores com leaderboard
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

// Calcular o preço do upgrade
function calculateUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

// Calcular o efeito do upgrade para tooltip
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

// Renderizar os upgrades com tooltips
function renderUpgrades() {
  upgradesContainer.innerHTML = '';
  if (!gameState.upgrades || !gameState.players || activePlayerIndex < 0) return;

  const activePlayer = gameState.players[activePlayerIndex];
  if (!activePlayer) return;

  const allTier1MaxedOut = gameState.upgrades
    .filter(upgrade => upgrade.tier === 1)
    .every(upgrade => upgrade.level >= upgrade.maxLevel);

  const visibleUpgrades = gameState.upgrades
    .filter(upgrade => {
      if (upgrade.tier === 1) return true;
      if (upgrade.tier === 2) return allTier1MaxedOut;
      return false;
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
      <button class="buy-button" ${(!canBuy) ? 'disabled' : ''}>${maxedOut ? 'MAX' : price + ' 🪙'}</button>
    `;

    const buyButton = upgradeElement.querySelector('.buy-button');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
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

// Renderizar as conquistas
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

// Mostrar notificação
function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

// Inicializar o jogo
initGame();