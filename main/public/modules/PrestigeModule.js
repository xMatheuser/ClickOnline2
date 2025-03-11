import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';

const prestigeOverlay = document.getElementById('prestige-overlay');
const openPrestigeBtn = document.getElementById('open-prestige');
const closePrestigeBtn = document.getElementById('close-prestige');

export function initPrestige() {
  openPrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.add('active');
    updatePrestigeUI();
  });

  closePrestigeBtn.addEventListener('click', () => prestigeOverlay.classList.remove('active'));

  prestigeOverlay.addEventListener('click', (e) => {
    if (e.target === prestigeOverlay) prestigeOverlay.classList.remove('active');
  });

  document.getElementById('prestige-button').addEventListener('click', () => {
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
}

function updatePrestigeUI() {
  document.getElementById('fragments-count').textContent = gameState?.fragments || 0;
  document.getElementById('potential-fragments').textContent = calculatePrestigeReward();
  renderPrestigeUpgrades();
}

function calculatePrestigeReward() {
  const player = gameState.players.find(p => p.id === socket.id);
  if (!player) return 0;
  const fragmentMultiplierUpgrade = gameState.prestigeUpgrades.find(u => u.id === 'fragment-multiplier');
  const fragmentMultiplier = fragmentMultiplierUpgrade?.effect(fragmentMultiplierUpgrade.level) || 1;
  const baseFragments = Math.floor(Math.sqrt(player.level) * 2);
  return Math.floor(baseFragments * fragmentMultiplier);
}

function renderPrestigeUpgrades() {
  const container = document.getElementById('prestige-upgrades-container');
  if (!container || !gameState?.prestigeUpgrades) return;

  container.innerHTML = '';
  gameState.prestigeUpgrades.forEach(upgrade => {
    const price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    const canAfford = (gameState.fragments || 0) >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${!canBuy ? 'disabled' : ''}`;
    const effectValue = upgrade.effect(upgrade.level + 1);
    const tooltipText = `${upgrade.description} (Efeito: x${effectValue.toFixed(1)} no próximo nível)`;
    upgradeElement.setAttribute('data-tooltip', tooltipText);
    upgradeElement.innerHTML = `
      <div class="upgrade-info">
        <div><strong>${upgrade.name}</strong> <span class="upgrade-level">(Nível ${upgrade.level}/${upgrade.maxLevel})</span></div>
        <div>${upgrade.description}</div>
      </div>
      <button class="rpgui-button golden" ${!canBuy ? 'disabled' : ''}>${maxedOut ? 'MAX' : `${formatNumber(price)} 🔮`}</button>
    `;

    const buyButton = upgradeElement.querySelector('.rpgui-button.golden');
    buyButton.addEventListener('click', () => {
      if (!isOwnPlayer()) {
        showNotification('Você só pode comprar upgrades quando for o jogador ativo!');
        return;
      }
      socket.emit('buyPrestigeUpgrade', upgrade.id);
    });

    upgradeElement.addEventListener('mousemove', (event) => showTooltip(event, tooltipText));
    upgradeElement.addEventListener('mouseleave', hideTooltip);

    container.appendChild(upgradeElement);
  });
}