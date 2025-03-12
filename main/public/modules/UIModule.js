import { socket, gameState, isOwnPlayer, updateGameState } from './CoreModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';
import { getVisibleUpgrades, calculateUpgradePrice, getUpgradeEffectDescription } from './UpgradeModule.js';

export const clicksDisplay = document.getElementById('clicks');
export const levelDisplay = document.getElementById('level');
export const teamCoinsDisplay = document.getElementById('team-coins');
export const clickPowerDisplay = document.getElementById('click-power');
export const upgradesContainer = document.getElementById('upgrades-container');
export const achievementsContainer = document.getElementById('achievements-container');
export const notification = document.getElementById('notification');
export const playerList = document.getElementById('player-list');
export const activePlayerDisplay = document.getElementById('active-player');
export const contributionContainer = document.getElementById('contribution-container');
export const teamGoalDisplay = document.getElementById('team-goal');
export const teamSharedProgressBar = document.getElementById('team-shared-progress-bar');
export const progressPercentage = document.getElementById('progress-percentage');

export const openAchievementsBtn = document.getElementById('open-achievements');
export const closeAchievementsBtn = document.getElementById('close-achievements');
export const achievementsOverlay = document.getElementById('achievements-overlay');

export const openBonusStatsBtn = document.getElementById('open-bonus-stats');
export const closeBonusStatsBtn = document.getElementById('close-bonus-stats');
export const bonusStatsOverlay = document.getElementById('bonus-stats-overlay');

let notificationQueue = [];
let isNotificationShowing = false;
let newAchievements = 0;
let viewedAchievements = new Set(); // Add at the top with other state variables

export function initUI() {
  socket.on('gameStateUpdate', handleGameStateUpdate);
  socket.on('notification', showNotification);
  // Add immediate initial render
  renderUpgrades();

  // Add achievements buttons handling
  openAchievementsBtn.addEventListener('click', () => {
    achievementsOverlay.classList.add('active');
    renderAchievementsScreen(); // Change to use new render method
    newAchievements = 0;
    updateAchievementBadge();
  });

  closeAchievementsBtn.addEventListener('click', () => {
    achievementsOverlay.classList.remove('active');
  });

  achievementsOverlay.addEventListener('click', (e) => {
    if (e.target === achievementsOverlay) {
      achievementsOverlay.classList.remove('active');
    }
  });

  // Add bonus stats handling
  openBonusStatsBtn.addEventListener('click', () => {
    bonusStatsOverlay.classList.add('active');
    renderBonusStats();
  });

  closeBonusStatsBtn.addEventListener('click', () => {
    bonusStatsOverlay.classList.remove('active');
  });

  bonusStatsOverlay.addEventListener('click', (e) => {
    if (e.target === bonusStatsOverlay) {
      bonusStatsOverlay.classList.remove('active');
    }
  });
}

export function handleGameStateUpdate(newState) {
  if (!newState) return;

  // Update achievement stats if overlay is open
  if (achievementsOverlay.classList.contains('active')) {
    updateAchievementStats();
  }
  
  if (newState.type === 'autoclick') {
    updateGameState({
      ...gameState,
      teamCoins: newState.teamCoins,
      levelProgressRemaining: Math.max(0, newState.levelProgressRemaining),
      players: newState.players,
      totalClicks: newState.totalClicks,
      clicks: newState.clicks,
      upgrades: newState.upgrades || gameState.upgrades,
      teamLevel: newState.teamLevel || gameState.teamLevel
    });
    updateStatDisplays();
  } else {
    updateGameState(newState);
    const ownPlayer = newState.players?.find(player => player?.id === socket.id);
    if (ownPlayer) {
      clicksDisplay.textContent = formatNumber(newState.totalClicks || 0);
      levelDisplay.textContent = ownPlayer.level;
      teamCoinsDisplay.textContent = formatNumber(newState.teamCoins);
      clickPowerDisplay.textContent = getClickValue(ownPlayer).toFixed(1);
      activePlayerDisplay.textContent = ownPlayer.name;
      teamGoalDisplay.textContent = newState.teamLevel;

      // Update progress bar
      const currentHP = newState.levelProgressRemaining;
      const maxHP = newState.teamLevel * 100;
      const percentage = (currentHP / maxHP * 100).toFixed(0);
      teamSharedProgressBar.style.width = `${percentage}%`;
      progressPercentage.textContent = `${Math.ceil(currentHP)}/${maxHP} HP`;
    }
    renderPlayers();
    renderContributions();
    renderUpgrades();
  }
}

function getClickValue(player) {
  return player.clickValue || 1;
}

export function renderPlayers() {
  if (!playerList) return;
  playerList.innerHTML = '';
  
  if (!gameState?.players?.length) return;

  gameState.players.forEach(player => {
    if (!player?.name) return; // Skip invalid players
    
    try {
      const playerTag = document.createElement('div');
      playerTag.className = 'player-tag';
      playerTag.setAttribute('data-active', player.id === socket.id ? 'true' : 'false');
      
      // Safe string operations with null checks
      const initials = player.name?.slice(0, 2)?.toUpperCase() || '??';
      
      playerTag.innerHTML = `
        <div class="player-avatar" style="background-color: #007bff">${initials}</div>
        ${player.name}
      `;
      playerList.appendChild(playerTag);
    } catch (error) {
      console.error('Error rendering player:', error);
    }
  });
}

export function renderContributions() {
  if (!contributionContainer) return;
  contributionContainer.innerHTML = '<h3>Ranking de Contribuição</h3>';
  
  if (!gameState?.players?.length) {
    contributionContainer.innerHTML += '<div>Adicione jogadores para ver as contribuições</div>';
    return;
  }

  const validPlayers = gameState.players.filter(p => p && p.name && typeof p.contribution === 'number');
  if (!validPlayers.length) return;

  const sortedPlayers = [...validPlayers].sort((a, b) => b.contribution - a.contribution);
  const totalContribution = sortedPlayers.reduce((sum, p) => sum + (p.contribution || 0), 0);

  sortedPlayers.forEach((player, index) => {
    try {
      const percentage = totalContribution > 0 ? (player.contribution / totalContribution * 100) : 0;
      const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';
      const initials = player.name?.slice(0, 2)?.toUpperCase() || '??';
      
      const contributionElement = document.createElement('div');
      contributionElement.className = 'player-contribution';
      contributionElement.innerHTML = `
        <div>
          <div class="player-avatar" style="background-color: #007bff">${initials}</div>
          ${medal} ${player.name} (Nv. ${player.level || 1})
        </div>
        <div>${formatNumber(player.contribution || 0)} cliques (${percentage.toFixed(1)}%)</div>
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
    } catch (error) {
      console.error('Error rendering contribution for player:', player, error);
    }
  });
}

export function renderUpgrades() {
  upgradesContainer.innerHTML = '';
  if (!gameState.upgrades || !gameState.players) return;

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  const visibleUpgrades = getVisibleUpgrades();
  
  visibleUpgrades.forEach(upgrade => {
    const price = calculateUpgradePrice(upgrade);
    const canAfford = gameState.teamCoins >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${!canBuy ? 'disabled' : ''}`;
    upgradeElement.setAttribute('data-id', upgrade.id);
    const tooltipText = getUpgradeEffectDescription(upgrade);
    upgradeElement.setAttribute('data-tooltip', tooltipText);
    upgradeElement.innerHTML = `
      <div class="upgrade-info">
        <div><strong>${upgrade.icon} ${upgrade.name}</strong> <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span></div>
        <div>${upgrade.description}</div>
      </div>
      <button class="rpgui-button golden" ${!canBuy ? 'disabled' : ''}>${maxedOut ? 'MAX' : formatNumber(price)}</button>
    `;

    const buyButton = upgradeElement.querySelector('.rpgui-button.golden');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      socket.emit('buyUpgrade', upgrade.id);
    });

    upgradeElement.addEventListener('mousemove', (event) => showTooltip(event, tooltipText));
    upgradeElement.addEventListener('mouseleave', hideTooltip);

    upgradesContainer.appendChild(upgradeElement);
  });
}

export function showNotification(message) {
  message = message.replace(/🪙/g, '<span class="coin-icon"></span>');
  notificationQueue.push(message);
  if (!isNotificationShowing) showNextNotification();
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

export function updateUpgradesUI() {
  const upgradesContainer = document.getElementById('upgrades-container');
  if (!upgradesContainer) return;
  
  const visibleUpgrades = renderUpgrades(upgradesContainer);
  // Render visible upgrades
  visibleUpgrades.forEach(upgrade => {
    // ...existing upgrade rendering code...
  });
}

function updateStatDisplays() {
  const ownPlayer = gameState.players?.find(player => player?.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = formatNumber(gameState.totalClicks || 0);
    teamCoinsDisplay.textContent = formatNumber(gameState.teamCoins);
    
    // Safe update of progress bar
    const currentHP = Math.max(0, gameState.levelProgressRemaining || 0);
    const maxHP = (gameState.teamLevel || 1) * 100;
    const percentage = Math.min(100, Math.max(0, (currentHP / maxHP * 100))).toFixed(0);
    
    if (teamSharedProgressBar) {
      teamSharedProgressBar.style.width = `${percentage}%`;
    }
    if (progressPercentage) {
      progressPercentage.textContent = `${Math.ceil(currentHP)}/${maxHP} HP`;
    }
  }
}

function updateAchievementStats() {
  const statsContainer = document.getElementById('achievements-stats');
  if (!statsContainer || !gameState.achievements) return;

  const totalAchievements = gameState.achievements.reduce((sum, a) => sum + a.levels.length, 0);
  const unlockedAchievements = gameState.achievements.reduce((sum, a) => sum + (a.unlockedLevels?.length || 0), 0);
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

// Remove or comment out old renderAchievements function
// function renderAchievements() { ... }

function renderAchievementsScreen() {
  // First, clear current content
  const achievementsContent = document.getElementById('achievements-content');
  achievementsContent.innerHTML = `
    <div class="achievements-summary">
      <div id="achievements-stats"></div>
    </div>
    <div class="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; padding: 15px;"></div>
  `;

  // Update achievement stats first
  updateAchievementStats();

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
}

function renderBonusStats() {
  const container = document.getElementById('bonus-stats-content');
  if (!container || !gameState?.bonusStats) return;

  const stats = [
    { key: 'clickPower', name: 'Poder de Clique', icon: '👆' },
    { key: 'autoClicker', name: 'Auto Clicker', icon: '🤖' },
    { key: 'coinMultiplier', name: 'Multiplicador de Moedas', icon: '💰' },
    { key: 'progressBoost', name: 'Boost de Progresso', icon: '🚀' },
    { key: 'teamSynergy', name: 'Sinergia de Time', icon: '🤝' },
    { key: 'sharedRewards', name: 'Recompensas Compartilhadas', icon: '🎁' },
    { key: 'prestigeMultiplier', name: 'Multiplicador de Prestígio', icon: '⭐' },
    { key: 'powerUpBonus', name: 'Bônus de Power-Up', icon: '💪' }
  ];

  container.innerHTML = `
    <div class="bonus-stats-grid">
      ${stats.map(stat => `
        <div class="bonus-stat-item">
          <div class="stat-icon">${stat.icon}</div>
          <div class="stat-info">
            <div class="stat-name">${stat.name}</div>
            <div class="stat-value">+${(gameState.bonusStats[stat.key] * 100).toFixed(1)}%</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}