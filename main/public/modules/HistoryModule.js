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

  // Atualizar somente quando houver mudanças relevantes
  socket.on('gameStateUpdate', (newState) => {
    // Não renderizar se o overlay não estiver visível
    if (!historyOverlay.classList.contains('active')) return;
    
    // Ignorar updates automáticos
    if (newState.type === 'autoclick') return;
    if (newState.type === 'levelUp') return;
    
    // Verificar se houve mudança real no histórico de upgrades
    const currentUpgradeState = JSON.stringify(upgradeHistory);
    const lastUpgradeState = this.lastUpgradeState || '{}';
    
    if (currentUpgradeState !== lastUpgradeState) {
      this.lastUpgradeState = currentUpgradeState;
      renderFullHistory();
    }
  });
}

function renderFullHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  container.innerHTML = '';

  // Copy current achievements state to avoid losing it
  const savedAchievements = gameState.achievements;
  const savedCategories = gameState.achievementCategories;

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
          const effectText = getEffectText(upgrade, upgrade.level);
          
          return `
            <div class="history-upgrade-info">
              <div class="upgrade-details">
                <span class="upgrade-icon">${upgrade.icon || '🔰'}</span>
                <span class="upgrade-name">${upgrade.name}</span>
                <span class="upgrade-level">(${upgrade.level}/${upgrade.maxLevel})</span>
              </div>
              <div class="history-buff-info" title="${effectText}">
                <i class="fas fa-info-circle"></i>
              </div>
            </div>
          `;
        }).join('')}
      `;
      
      container.appendChild(tierElement);
    }
  });

  // Restore achievements after rendering history
  gameState.achievements = savedAchievements;
  gameState.achievementCategories = savedCategories;
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
