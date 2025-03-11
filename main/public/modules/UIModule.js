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

let notificationQueue = [];
let isNotificationShowing = false;

export function initUI() {
  socket.on('gameStateUpdate', handleGameStateUpdate);
  socket.on('notification', showNotification);
  // Add immediate initial render
  renderUpgrades();
}

export function handleGameStateUpdate(newState) {
  if (!newState) return;
  
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