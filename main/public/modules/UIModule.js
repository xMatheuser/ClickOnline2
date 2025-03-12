import { socket, gameState, isOwnPlayer, updateGameState } from './CoreModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';
import { getVisibleUpgrades, calculateUpgradePrice, getUpgradeEffectDescription } from './UpgradeModule.js';
import { initHistory } from './HistoryModule.js';
import { playSound, levelUpSound, tickSound, achievementSound } from './AudioModule.js';
import { getClicksPerSecond } from './InputModule.js';

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
export const clickArea = document.getElementById('click-area');

export const openAchievementsBtn = document.getElementById('open-achievements');
export const closeAchievementsBtn = document.getElementById('close-achievements');
export const achievementsOverlay = document.getElementById('achievements-overlay');

export const openBonusStatsBtn = document.getElementById('open-bonus-stats');
export const closeBonusStatsBtn = document.getElementById('close-bonus-stats');
export const bonusStatsOverlay = document.getElementById('bonus-stats-overlay');

export const clicksPerSecondDisplay = document.getElementById('target');
let lastClickTime = Date.now();
let clicksLastSecond = 0;

let notificationQueue = [];
let isNotificationShowing = false;
let newAchievements = 0;
let viewedAchievements = new Set(); // Add at the top with other state variables

export function initUI() {
  socket.on('gameStateUpdate', handleGameStateUpdate);
  socket.on('notification', showNotification);
  socket.on('teamLevelUp', (newLevel) => {
    playSound(levelUpSound);
  });
  socket.on('achievementUnlocked', () => {
    playSound(achievementSound);
    newAchievements++; // Incrementar contador de novas conquistas
    updateAchievementBadge(); // Atualizar badge
  });
  socket.on('autoClickDamage', (amount) => {
    if (!clickArea) return;
    
    const rect = clickArea.getBoundingClientRect();
    const x = Math.random() * rect.width; // Posição aleatória
    const y = Math.random() * rect.height;
    
    showDamageNumber(x, y, amount);
  });
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

  // Add history initialization
  initHistory();

  // Adicionar intervalo de atualização da interface
  setInterval(() => {
    updateClicksPerSecond();
    updateStatDisplays();
  }, 1000);

  // Remover este listener
  /*socket.on('click', () => {
    clicksLastSecond++;
    setTimeout(() => clicksLastSecond--, 1000);
  });*/
}

export function handleGameStateUpdate(newState) {
  if (!newState) return;

  // Remover verificação de level up daqui já que agora temos um evento específico
  const oldLevel = gameState.teamLevel;

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
  updateClicksPerSecond();
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
      playSound(tickSound); // Mudado de levelUpSound para tickSound
      socket.emit('buyUpgrade', upgrade.id);
    });

    // Adicionar eventos para o tooltip
    upgradeElement.addEventListener('mouseenter', (event) => {
      showTooltip(event, tooltipText);
    });

    upgradeElement.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    upgradeElement.addEventListener('mousemove', (event) => {
      const tooltip = document.getElementById('tooltip');
      if (tooltip.style.display === 'block') {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
      }
    });

    upgradesContainer.appendChild(upgradeElement);
  });
}

export function showNotification(message) {
  // Removido o som de achievementSound das notificações genéricas
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

      // Remover o som daqui - ele será tocado pelo evento 'achievementUnlocked'
      // if (isNew && !viewedAchievements.has(`${achievement.id}_${levelIndex}`)) {
      //   playSound(achievementSound);
      // }

      const block = document.createElement('div');
      block.className = `achievement-block ${isUnlocked ? 'pulse' : 'locked'}`; // Adicionar animação pulse
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
        { name: "Multiplicador de Prestígio", value: prestigeBonus.toFixed(1) + "%" }
      ]
    }
  };

  container.innerHTML = Object.values(bonusCategories).map(category => `
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
        { name: "Multiplicador de Prestígio", value: prestigeBonus.toFixed(1) + "%" }
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

export function showDamageNumber(x, y, amount) {
  const damageContainer = document.querySelector('.damage-container');
  if (!damageContainer) return;

  const damageNumber = document.createElement('div');
  damageNumber.className = 'damage-number';
  damageNumber.textContent = formatNumber(amount);

  // Posiciona o número de dano aleatoriamente próximo ao ponto de clique
  const offsetX = (Math.random() - 0.5) * 40;
  const offsetY = (Math.random() - 0.5) * 40;
  
  damageNumber.style.left = `${x + offsetX}px`;
  damageNumber.style.top = `${y + offsetY}px`;
  
  damageContainer.appendChild(damageNumber);
  requestAnimationFrame(() => damageNumber.classList.add('animate'));

  // Remove o elemento após a animação
  setTimeout(() => damageNumber.remove(), 1000);
}

// Adicionar função para centralizar a lógica de clique
function handleClick(x, y) {
  if (!isOwnPlayer()) return;
  
  playSound(tickSound);
  
  const player = gameState.players.find(p => p.id === socket.id);
  const clickValue = getClickValue(player);
  
  showDamageNumber(x, y, clickValue);
}

// Modifique o evento de clique do clickArea
if (clickArea) {
  clickArea.addEventListener('click', (e) => {
    const rect = clickArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleClick(x, y);
  });
}

// Modifique o evento de tecla P
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'p' && isOwnPlayer()) {
    const rect = clickArea.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    handleClick(x, y);
  }
});

// ...existing code...
function updateClicksPerSecond() {
  if (!clicksPerSecondDisplay || !gameState?.upgrades) return;
  
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return;

  const autoClicker = gameState.upgrades.find(u => u.id === 'auto-clicker');
  const autoClicker2 = gameState.upgrades.find(u => u.id === 'auto-clicker-2');
  const autoClicker3 = gameState.upgrades.find(u => u.id === 'auto-clicker-3');
  
  const autoClicksPerSecond = 
    (autoClicker?.level || 0) + 
    ((autoClicker2?.level || 0) * 2) +
    ((autoClicker3?.level || 0) * 4);
  
  // Usar função do InputModule
  const manualClicksPerSecond = getClicksPerSecond();
  
  const clickValue = getClickValue(player);
  const totalDamagePerSecond = (autoClicksPerSecond + manualClicksPerSecond) * clickValue;
  
  clicksPerSecondDisplay.textContent = totalDamagePerSecond.toFixed(1);
}
// ...existing code...