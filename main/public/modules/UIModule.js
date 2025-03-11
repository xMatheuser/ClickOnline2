import { socket, gameState, isOwnPlayer, updateGameState } from './CoreModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';
import { playSound } from './AudioModule.js';

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
}

function handleGameStateUpdate(newState) {
  updateGameState(newState);
  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (ownPlayer) {
    clicksDisplay.textContent = formatNumber(gameState.totalClicks || 0);
    levelDisplay.textContent = ownPlayer.level;
    teamCoinsDisplay.textContent = formatNumber(gameState.teamCoins);
    clickPowerDisplay.textContent = getClickValue(ownPlayer).toFixed(1);
    activePlayerDisplay.textContent = ownPlayer.name;
  }
  renderPlayers();
  renderContributions();
  renderUpgrades();
}

function getClickValue(player) {
  return player.clickValue || 1;
}

export function renderPlayers() {
  playerList.innerHTML = '';
  if (!gameState.players) return;
  gameState.players.forEach(player => {
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

export function renderContributions() {
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

export function renderUpgrades() {
  upgradesContainer.innerHTML = '';
  if (!gameState.upgrades || !gameState.players) return;

  const ownPlayer = gameState.players.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  gameState.upgrades.forEach(upgrade => {
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