import { socket, gameState, upgradeHistory } from './CoreModule.js';
import { formatNumber } from './UtilsModule.js';

const historyOverlay = document.getElementById('history-overlay');
const closeHistoryBtn = document.getElementById('close-history');
const showHistoryBtn = document.getElementById('show-history');

export function initHistory() {
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

function renderUpgradeHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  container.innerHTML = '';
  let hasHistory = false;

  ['tier1', 'tier2', 'tier3'].forEach((tier, index) => {
    if (upgradeHistory[tier]?.length > 0) {
      hasHistory = true;
      const tierElement = document.createElement('div');
      tierElement.className = 'history-tier';
      tierElement.innerHTML = `
        <div class="history-tier-title">Tier ${index + 1}</div>
        ${upgradeHistory[tier].map(upgrade => `
          <div class="history-upgrade-info">
            <div>${upgrade.icon} ${upgrade.name} (Nível ${upgrade.level}/${upgrade.maxLevel})</div>
            <div>${formatNumber(upgrade.basePrice)} 🪙</div>
          </div>
        `).join('')}
      `;
      container.appendChild(tierElement);
    }
  });

  if (!hasHistory) {
    container.innerHTML = '<div class="history-empty">Nenhum upgrade completado ainda.</div>';
  }
}
