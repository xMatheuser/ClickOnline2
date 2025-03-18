import { socket, gameState, isOwnPlayer, updateGameState } from './CoreModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';
import { getVisibleUpgrades, calculateUpgradePrice, getUpgradeEffectDescription, calculateBulkPrice } from './UpgradeModule.js';
import { initHistory } from './HistoryModule.js';
import { playSound, levelUpSound, tickSound, achievementSound } from './AudioModule.js';
import { getClicksPerSecond } from './InputModule.js';
import { getCharacterBonus, hasSelectedCharacter, getPlayerCharacter } from './CharacterModule.js';

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
let viewedAchievements = new Set();
let lastRenderedUpgrades = null; // Para upgrades
let lastRenderedAchievements = null; // Para conquistas

export const bulkBuyOptions = [1, 10, 100, 'max'];
let selectedBulkBuy = 1;

export function initUI() {
  socket.on('gameStateUpdate', handleGameStateUpdate);
  socket.on('notification', showNotification);
  socket.on('teamLevelUp', (newLevel) => {
    playSound(levelUpSound);
  });
  socket.on('achievementUnlocked', () => {
    playSound(achievementSound);
    newAchievements++;
    updateAchievementBadge();
    if (achievementsOverlay.classList.contains('active')) {
      renderAchievementsScreen();
      lastRenderedAchievements = JSON.stringify(gameState.achievements);
    }
  });
  socket.on('autoClickDamage', (amount) => {
    if (!clickArea) return;
    
    const rect = clickArea.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    
    showDamageNumber(x, y, amount);
  });
  renderUpgrades(); // Renderização inicial dos upgrades

  openAchievementsBtn.addEventListener('click', () => {
    achievementsOverlay.classList.add('active');
    renderAchievementsScreen();
    lastRenderedAchievements = JSON.stringify(gameState.achievements);
    newAchievements = 0;
    updateAchievementBadge();
    
    // Disparar evento para notificar que um overlay foi aberto
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: true } }));
  });

  closeAchievementsBtn.addEventListener('click', () => {
    achievementsOverlay.classList.remove('active');
    
    // Disparar evento para notificar que um overlay foi fechado
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
  });

  achievementsOverlay.addEventListener('click', (e) => {
    if (e.target === achievementsOverlay) {
      achievementsOverlay.classList.remove('active');
      
      // Disparar evento para notificar que um overlay foi fechado
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
    }
  });

  openBonusStatsBtn.addEventListener('click', () => {
    bonusStatsOverlay.classList.add('active');
    renderBonusStats();
    
    // Disparar evento para notificar que um overlay foi aberto
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: true } }));
  });

  closeBonusStatsBtn.addEventListener('click', () => {
    bonusStatsOverlay.classList.remove('active');
    
    // Disparar evento para notificar que um overlay foi fechado
    document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
  });

  bonusStatsOverlay.addEventListener('click', (e) => {
    if (e.target === bonusStatsOverlay) {
      bonusStatsOverlay.classList.remove('active');
      
      // Disparar evento para notificar que um overlay foi fechado
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
    }
  });

  initHistory();

  setInterval(() => {
    updateClicksPerSecond();
    updateStatDisplays();
  }, 1000);

  // Add bulk buy buttons
  if (upgradesContainer) {
    const bulkBuyContainer = document.createElement('div');
    bulkBuyContainer.className = 'bulk-buy-container';
    
    bulkBuyOptions.forEach(amount => {
      const button = document.createElement('button');
      button.className = `bulk-buy-button ${amount === selectedBulkBuy ? 'active' : ''}`;
      button.textContent = amount === 'max' ? 'Máximo' : `x${amount}`;
      button.onclick = () => {
        selectedBulkBuy = amount;
        document.querySelectorAll('.bulk-buy-button').forEach(btn => 
          btn.classList.toggle('active', btn.textContent === button.textContent)
        );
        updateUpgradeButtons();
      };
      bulkBuyContainer.appendChild(button);
    });
    
    // Inserir no início do container de upgrades
    upgradesContainer.insertAdjacentElement('beforebegin', bulkBuyContainer);
  }

  initDraggableWindows();
}

export function handleGameStateUpdate(newState) {
  if (!newState) return;

  if (achievementsOverlay.classList.contains('active') && newState.type !== 'autoclick') {
    updateAchievementStats();
    if (shouldRenderAchievements(newState)) {
      renderAchievementsScreen();
      lastRenderedAchievements = JSON.stringify(newState.achievements);
    }
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
    updateUpgradeButtons(); // Atualiza botões para auto-clicks
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

      const currentHP = newState.levelProgressRemaining;
      const maxHP = newState.teamLevel * 100;
      const percentage = (currentHP / maxHP * 100).toFixed(0);
      teamSharedProgressBar.style.width = `${percentage}%`;
      progressPercentage.textContent = `${Math.ceil(currentHP)}/${maxHP} HP`;

      renderPlayers();
      renderContributions();

      if (shouldRenderUpgrades(newState)) {
        renderUpgrades();
        lastRenderedUpgrades = JSON.stringify(newState.upgrades);
      }
      updateUpgradeButtons(); // Atualiza botões para qualquer mudança no estado
    }
  }
  updateClicksPerSecond();
}

function shouldRenderUpgrades(newState) {
  if (newState.upgradesChanged === true) return true;
  const currentUpgrades = JSON.stringify(newState.upgrades);
  return lastRenderedUpgrades !== currentUpgrades;
}

function shouldRenderAchievements(newState) {
  if (newState.achievementsChanged === true) return true;
  const currentAchievements = JSON.stringify(newState.achievements);
  return lastRenderedAchievements !== currentAchievements;
}

function updateUpgradeButtons() {
  if (!gameState.upgrades || !gameState.players) return;

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  const visibleUpgrades = getVisibleUpgrades();
  visibleUpgrades.forEach(upgrade => {
    const { cost: totalPrice, levels: purchaseLevels } = calculateBulkPrice(upgrade, selectedBulkBuy);
    const canAfford = gameState.teamCoins >= totalPrice;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer() && purchaseLevels > 0;

    const upgradeElement = upgradesContainer.querySelector(`[data-id="${upgrade.id}"]`);
    if (upgradeElement) {
      const button = upgradeElement.querySelector('.rpgui-button.golden');
      const amountDisplay = upgradeElement.querySelector('.upgrade-amount');
      if (button) {
        button.disabled = !canBuy;
        button.textContent = maxedOut ? 'MAX' : formatNumber(totalPrice);
        upgradeElement.className = `upgrade-item ${!canBuy ? 'disabled' : ''}`;
      }
      if (amountDisplay) {
        amountDisplay.textContent = purchaseLevels > 1 ? `x${purchaseLevels}` : '';
        amountDisplay.className = `upgrade-amount ${purchaseLevels > 1 ? 'visible' : ''}`;
      }
    }
  });
}

function getClickValue(player) {
  // Apply character bonus if available
  let clickValue = player.clickValue || 1;
  if (player.characterBonuses && player.characterBonuses.clickPower) {
    clickValue *= player.characterBonuses.clickPower;
  }
  return clickValue;
}

export function renderPlayers() {
  if (!playerList) return;
  playerList.innerHTML = '';
  
  if (!gameState?.players?.length) return;

  gameState.players.forEach(player => {
    if (!player?.name) return;
    
    try {
      const playerTag = document.createElement('div');
      playerTag.className = 'player-tag';
      playerTag.setAttribute('data-active', player.id === socket.id ? 'true' : 'false');
      
      // Add character icon if available
      let characterIcon = '';
      if (player.characterType) {
        const charIcon = player.characterType === 'warrior' ? '⚔️' : 
                         player.characterType === 'archer' ? '🏹' : 
                         player.characterType === 'mage' ? '🔮' : '';
        if (charIcon) {
          characterIcon = `<span class="character-icon-small">${charIcon}</span>`;
        }
      }
      
      const initials = player.name?.slice(0, 2)?.toUpperCase() || '??';
      
      playerTag.innerHTML = `
        <div class="player-avatar" style="background-color: #007bff">${initials}</div>
        ${player.name} ${characterIcon}
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
    const { cost: totalPrice, levels: purchaseLevels } = calculateBulkPrice(upgrade, selectedBulkBuy);
    const canAfford = gameState.teamCoins >= totalPrice;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer() && purchaseLevels > 0;

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${!canBuy ? 'disabled' : ''}`;
    upgradeElement.setAttribute('data-id', upgrade.id);
    const tooltipText = getUpgradeEffectDescription(upgrade);

    upgradeElement.innerHTML = `
      <div class="upgrade-header">
        <div class="upgrade-name">
          ${upgrade.icon} ${upgrade.name}
        </div>
        <div class="upgrade-purchase">
          <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span>
          ${!maxedOut ? `<div class="upgrade-amount ${purchaseLevels > 1 ? 'visible' : ''}">${purchaseLevels > 1 ? `x${purchaseLevels}` : ''}</div>` : ''}
          <button class="rpgui-button golden" ${!canBuy ? 'disabled' : ''}>${maxedOut ? 'MAX' : formatNumber(totalPrice)}</button>
        </div>
      </div>
    `;

    const buyButton = upgradeElement.querySelector('.rpgui-button.golden');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      playSound(tickSound);
      socket.emit('buyUpgrade', { id: upgrade.id, amount: selectedBulkBuy });
    });

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

export function showNotification(message, allowHTML = false) {
  // Replace coin icon regardless
  message = message.replace(/🪙/g, '<span class="coin-icon"></span>');
  
  // If HTML isn't allowed, escape HTML tags
  if (!allowHTML) {
    message = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
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
}

function updateStatDisplays() {
  const ownPlayer = gameState.players?.find(player => player?.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = formatNumber(gameState.totalClicks || 0);
    teamCoinsDisplay.textContent = formatNumber(gameState.teamCoins);
    
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

function renderAchievementsScreen() {
  const achievementsContent = document.getElementById('achievements-content');
  achievementsContent.innerHTML = `
    <div class="achievements-summary">
      <div id="achievements-stats"></div>
    </div>
    <div class="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; padding: 15px;"></div>
  `;

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
      block.className = `achievement-block ${isUnlocked ? 'pulse' : 'locked'}`;
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
  const container = document.getElementById('bonus-stats-content');
  if (!container || !gameState.players) return;

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

function getUpgradeEffectValue(upgrade) {
  if (!upgrade) return 0;
  
  // Apply character bonus for auto-clicker upgrades
  let characterBonus = 1;
  if (upgrade.id.includes('auto-clicker')) {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player && player.characterBonuses && player.characterBonuses.autoClicker) {
      characterBonus = player.characterBonuses.autoClicker;
    }
  }
  
  switch (upgrade.id) {
    case 'click-power':
    case 'click-power-2':
      return upgrade.level + 1;
    case 'auto-clicker':
    case 'auto-clicker-2':
      return (upgrade.level * (upgrade.tier === 1 ? 1 : 2)) * characterBonus;
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

  const offsetX = (Math.random() - 0.5) * 40;
  const offsetY = (Math.random() - 0.5) * 40;
  
  damageNumber.style.left = `${x + offsetX}px`;
  damageNumber.style.top = `${y + offsetY}px`;
  
  damageContainer.appendChild(damageNumber);
  requestAnimationFrame(() => damageNumber.classList.add('animate'));

  setTimeout(() => damageNumber.remove(), 1000);
}

function handleClick(x, y) {
  if (!isOwnPlayer()) return;
  
  playSound(tickSound);
  
  const player = gameState.players.find(p => p.id === socket.id);
  const clickValue = getClickValue(player);
  
  showDamageNumber(x, y, clickValue);
}

if (clickArea) {
  clickArea.addEventListener('click', (e) => {
    const rect = clickArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleClick(x, y);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'p' && isOwnPlayer()) {
    const rect = clickArea.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    handleClick(x, y);
  }
});

function updateClicksPerSecond() {
  if (!clicksPerSecondDisplay || !gameState?.upgrades) return;
  
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return;

  const autoClicker = gameState.upgrades.find(u => u.id === 'auto-clicker');
  const autoClicker2 = gameState.upgrades.find(u => u.id === 'auto-clicker-2');
  const autoClicker3 = gameState.upgrades.find(u => u.id === 'auto-clicker-3');
  
  // Apply character bonus for auto-clicker if available
  let characterBonus = 1;
  if (player.characterBonuses && player.characterBonuses.autoClicker) {
    characterBonus = player.characterBonuses.autoClicker;
  }
  
  const autoClicksPerSecond = (
    (autoClicker?.level || 0) + 
    ((autoClicker2?.level || 0) * 2) +
    ((autoClicker3?.level || 0) * 4)
  ) * characterBonus;
  
  const manualClicksPerSecond = getClicksPerSecond();
  
  const clickValue = getClickValue(player);
  const totalDamagePerSecond = (autoClicksPerSecond + manualClicksPerSecond) * clickValue;
  
  clicksPerSecondDisplay.textContent = totalDamagePerSecond.toFixed(1);
}

let isEditMode = false;

function initDraggableWindows() {
  const draggables = document.querySelectorAll('.draggable');
  const SNAP_THRESHOLD = 20;
  const editorToggle = document.getElementById('editor-toggle');
  const saveLayout = document.getElementById('save-layout');
  const restoreLayout = document.getElementById('restore-layout');
  
  // Criar guias de alinhamento
  const guides = {
    vertical: document.createElement('div'),
    horizontal: document.createElement('div')
  };

  guides.vertical.className = 'alignment-guide vertical';
  guides.horizontal.className = 'alignment-guide horizontal';
  document.body.appendChild(guides.vertical);
  document.body.appendChild(guides.horizontal);

  // Carregar layout salvo
  loadWindowLayouts();

  editorToggle.addEventListener('click', () => {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);
    editorToggle.classList.toggle('active', isEditMode);
    saveLayout.disabled = true;
  });

  saveLayout.addEventListener('click', () => {
    saveWindowLayouts();
    saveLayout.disabled = true;
  });

  // Add restore button handler
  restoreLayout.addEventListener('click', () => {
    setDefaultPositions();
    saveLayout.disabled = false;
    showNotification('Layout restaurado com sucesso!');
  });

  draggables.forEach(draggable => {
    let isDragging = false;
    let isResizing = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let initialWidth;
    let initialHeight;
    let initialLeft;
    let initialTop;
    let resizeDirection;

    // Criar resizers para todos os lados e cantos
    const directions = ['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw'];
    directions.forEach(dir => {
      const resizer = document.createElement('div');
      resizer.className = `resizer ${dir}`;
      resizer.setAttribute('data-direction', dir);
      draggable.appendChild(resizer);

      resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        resizeDirection = dir;
        initialWidth = draggable.offsetWidth;
        initialHeight = draggable.offsetHeight;
        initialLeft = draggable.offsetLeft;
        initialTop = draggable.offsetTop;
        initialX = e.clientX;
        initialY = e.clientY;
        draggable.classList.add('resizing');
      });
    });

    // Evento para drag da janela
    draggable.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('resizer')) return;
      if (e.target.closest('button') || 
          e.target.closest('input') || 
          e.target.closest('.click-area') ||
          e.target.closest('.upgrade-item') ||
          e.target.closest('.contribution-bar')) return;
      
      isDragging = true;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      draggable.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        resize(e);
      } else if (isDragging) {
        drag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        draggable.classList.remove('dragging');
        // Garantir que as guias sempre somem ao soltar
        guides.vertical.style.display = 'none';
        guides.horizontal.style.display = 'none';
      }
      if (isResizing) draggable.classList.remove('resizing');
      isResizing = false;
      isDragging = false;
    });

    function resize(e) {
      if (!isEditMode || !isResizing) return;

      const dx = e.clientX - initialX;
      const dy = e.clientY - initialY;
      
      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newLeft = initialLeft;
      let newTop = initialTop;

      // Cálculos baseados na direção
      switch (resizeDirection) {
        case 'e':
          newWidth = initialWidth + dx;
          break;
        case 'w':
          newWidth = initialWidth - dx;
          newLeft = initialLeft + dx;
          break;
        case 'n':
          newHeight = initialHeight - dy;
          newTop = initialTop + dy;
          break;
        case 's':
          newHeight = initialHeight + dy;
          break;
        case 'se':
          newWidth = initialWidth + dx;
          newHeight = initialHeight + dy;
          break;
        case 'sw':
          newWidth = initialWidth - dx;
          newHeight = initialHeight + dy;
          newLeft = initialLeft + dx;
          break;
        case 'ne':
          newWidth = initialWidth + dx;
          newHeight = initialHeight - dy;
          newTop = initialTop + dy;
          break;
        case 'nw':
          newWidth = initialWidth - dx;
          newHeight = initialHeight - dy;
          newLeft = initialLeft + dx;
          newTop = initialTop + dy;
          break;
      }

      // Aplicar limites mínimos e máximos
      newWidth = Math.min(Math.max(200, newWidth), window.innerWidth * 0.9);
      newHeight = Math.min(Math.max(150, newHeight), window.innerHeight * 0.9);

      // Atualizar dimensões e posição
      draggable.style.width = `${newWidth}px`;
      draggable.style.height = `${newHeight}px`;
      
      // Atualizar posição apenas se mudou
      if (newLeft !== initialLeft) {
        draggable.style.left = `${newLeft}px`;
      }
      if (newTop !== initialTop) {
        draggable.style.top = `${newTop}px`;
      }
      saveLayout.disabled = false;
    }

    function dragStart(e) {
      if (!isEditMode || e.target.classList.contains('resizer')) return;
      if (e.target.closest('button') || 
          e.target.closest('input') || 
          e.target.closest('.click-area') ||
          e.target.closest('.upgrade-item') ||
          e.target.closest('.contribution-bar')) return;

      isDragging = true;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      draggable.classList.add('dragging');
    }

    function drag(e) {
      if (!isEditMode || !isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Encontrar pontos de alinhamento
      const rect = draggable.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Esconder guias inicialmente
      guides.vertical.style.display = 'none';
      guides.horizontal.style.display = 'none';

      // Checar alinhamento com outras janelas
      draggables.forEach(other => {
        if (other === draggable) return;

        const otherRect = other.getBoundingClientRect();
        const otherCenterX = otherRect.left + otherRect.width / 2;
        const otherCenterY = otherRect.top + otherRect.height / 2;

        // Mostrar guias quando próximas do alinhamento
        if (Math.abs(centerX - otherCenterX) < SNAP_THRESHOLD) {
          guides.vertical.style.left = `${otherCenterX}px`;
          guides.vertical.style.display = 'block';
        }

        if (Math.abs(centerY - otherCenterY) < SNAP_THRESHOLD) {
          guides.horizontal.style.top = `${otherCenterY}px`;
          guides.horizontal.style.display = 'block';
        }
      });

      // Atualizar posição normalmente, sem snap
      draggable.style.transform = `translate(${currentX}px, ${currentY}px)`;
      xOffset = currentX;
      yOffset = currentY;
      saveLayout.disabled = false;
    }

    function dragEnd() {
      if (isDragging) {
        draggable.classList.remove('dragging');
        guides.vertical.style.display = 'none';
        guides.horizontal.style.display = 'none';
      }
      isResizing = false;
      isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  });
}

function saveWindowLayouts() {
  const layouts = {};
  document.querySelectorAll('.floating-window').forEach(window => {
    const id = window.id;
    layouts[id] = {
      width: window.style.width,
      height: window.style.height,
      transform: window.style.transform,
      left: window.style.left, 
      top: window.style.top
    };
  });
  localStorage.setItem('windowLayouts', JSON.stringify(layouts));
  showNotification('Layout salvo com sucesso!');
}

function setDefaultPositions() {
  const defaultPositions = {
    'click-window': {width: "590px", height: "281px", transform: "translate(166px, -39px)", left: "1092px", top: "483px"},
    'contribution-window': {width: "589px", height: "374px", transform: "translate(-13px, -479px)", top: "546px"},
    'level-window': {width: "744px", height: "197px", transform: "translate(477px, 354px)", top: "172px"},
    'players-window': {width: "1339px", height: "196px", transform: "translate(478px, 692px)", top: "36px"},
    'stats-window': {width: "743px", height: "455px", transform: "translate(477px, 42px)"},
    'upgrades-window': {width: "513px", height: "858.6px", transform: "translate(-39px, 41px)"}
  };

  Object.entries(defaultPositions).forEach(([id, style]) => {
    const window = document.getElementById(id);
    if (!window) return;
    Object.entries(style).forEach(([prop, value]) => {
      if (value) window.style[prop] = value;
    });
  });
}

function loadWindowLayouts() {
  try {
    const layouts = JSON.parse(localStorage.getItem('windowLayouts'));
    if (!layouts) {
      setDefaultPositions();
      return;
    }
    Object.entries(layouts).forEach(([id, style]) => {
      const window = document.getElementById(id);
      if (!window) return;

      Object.entries(style).forEach(([prop, value]) => {
        if (value) window.style[prop] = value;
      });
    });
  } catch (error) {
    console.error('Erro ao carregar layouts:', error);
    setDefaultPositions();
  }
}