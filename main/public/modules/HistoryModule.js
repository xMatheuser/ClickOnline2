import { socket, gameState, upgradeHistory } from './CoreModule.js';
import { formatNumber } from './UtilsModule.js';

const historyOverlay = document.getElementById('history-overlay');
const closeHistoryBtn = document.getElementById('close-history');
const showHistoryBtn = document.getElementById('show-history');

export function initHistory() {
  showHistoryBtn.addEventListener('click', () => {
    historyOverlay.classList.add('active');
    renderFullHistory();
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyOverlay.classList.remove('active');
  });

  historyOverlay.addEventListener('click', (e) => {
    if (e.target === historyOverlay) {
      historyOverlay.classList.remove('active');
    }
  });

  // Move socket event listener inside init
  socket.on('gameStateUpdate', () => {
    if (historyOverlay.classList.contains('active')) {
      renderFullHistory();
    }
  });
}

function renderFullHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  container.innerHTML = '';

  const tiers = [
    { name: 'Tier 1', upgrades: upgradeHistory.tier1 || [] },
    { name: 'Tier 2', upgrades: upgradeHistory.tier2 || [] },
    { name: 'Tier 3', upgrades: upgradeHistory.tier3 || [] }
  ];

  const hasAnyUpgrades = tiers.some(tier => tier.upgrades.length > 0);

  if (!hasAnyUpgrades) {
    container.innerHTML = '<div class="history-empty">Complete um tier de upgrades para ver o histórico.</div>';
    return;
  }

  tiers.forEach(tier => {
    if (tier.upgrades.length > 0) {
      const tierElement = document.createElement('div');
      tierElement.className = 'history-tier';
      
      tierElement.innerHTML = `
        <div class="history-tier-title">${tier.name}</div>
        ${tier.upgrades.map(upgrade => {
          const currentEffect = upgrade.effect ? upgrade.effect(upgrade.level) : 0;
          const effectText = getEffectText(upgrade, currentEffect);
          
          return `
            <div class="history-upgrade-info">
              <div class="upgrade-details">
                <span class="upgrade-icon">${upgrade.icon || '🔰'}</span>
                <span class="upgrade-name">${upgrade.name}</span>
                <span class="upgrade-level">(${upgrade.level}/${upgrade.maxLevel})</span>
              </div>
              <button class="buff-info-button" data-tooltip="${effectText}">
                <i class="fas fa-info-circle"></i>
              </button>
            </div>
          `;
        }).join('')}
      `;
      
      container.appendChild(tierElement);
    }
  });

  // Update tooltip listeners for buff info buttons
  const infoButtons = container.querySelectorAll('.buff-info-button');
  infoButtons.forEach(button => {
    const tooltip = button.getAttribute('data-tooltip');
    button.addEventListener('mousemove', (e) => showTooltip(e, tooltip));
    button.addEventListener('mouseleave', hideTooltip);
  });
}

function getEffectText(upgrade, effect) {
  switch (upgrade.id) {
    case 'click-power':
    case 'click-power-2':
      return `Aumenta o poder de clique em ${effect.toFixed(1)}x`;
    case 'auto-clicker':
    case 'auto-clicker-2':
      return `${effect.toFixed(1)} cliques automáticos por segundo`;
    case 'coin-boost':
    case 'coin-boost-2':
      return `Aumenta as moedas ganhas em ${((effect - 1) * 100).toFixed(0)}%`;
    case 'team-synergy':
    case 'team-synergy-2':
      return `Bônus de equipe: +${(effect * 100).toFixed(0)}% por jogador`;
    case 'shared-rewards':
    case 'shared-rewards-2':
      return `${(effect * 100).toFixed(0)}% das moedas gastas são retornadas`;
    case 'progress-boost':
    case 'progress-boost-2':
      return `Progresso mais rápido: ${((1 - effect) * 100).toFixed(0)}%`;
    default:
      return upgrade.description;
  }
}
