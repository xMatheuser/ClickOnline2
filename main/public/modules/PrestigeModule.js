import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';

const prestigeOverlay = document.getElementById('prestige-overlay');
const openPrestigeBtn = document.getElementById('open-prestige');
const closePrestigeBtn = document.getElementById('close-prestige');

export function initPrestige() {
  // Socket listeners no início para garantir que os upgrades sejam renderizados
  socket.on('gameStateUpdate', (newState) => {
    updatePrestigeUI();
    // Só renderiza os upgrades se não for uma atualização de auto-click
    if (newState.type !== 'autoclick') {
      renderPrestigeUpgrades();
    }
  });

  openPrestigeBtn.addEventListener('click', () => {
    prestigeOverlay.classList.add('active');
    updatePrestigeUI();
    renderPrestigeUpgrades();
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
  const ownPlayer = gameState.players?.find(player => player.id === socket.id);
  if (!ownPlayer) return;

  const fragmentsCount = document.getElementById('fragments-count');
  const potentialFragments = document.getElementById('potential-fragments');
  
  if (fragmentsCount) {
    fragmentsCount.textContent = formatNumber(gameState.fragments || 0);
  }
  
  if (potentialFragments) {
    const reward = calculatePrestigeReward(ownPlayer.level || 1);
    potentialFragments.textContent = formatNumber(reward);
  }
}

function calculatePrestigeReward() {
  const base = Math.floor(gameState.teamLevel / 10);
  const fragmentMultiplierUpgrade = gameState.prestigeUpgrades?.find(u => u.id === 'fragment-multiplier');
  
  // Use the effect value directly instead of calling it as a function
  const multiplier = fragmentMultiplierUpgrade ? (1 + fragmentMultiplierUpgrade.effect) : 1;
  
  return Math.max(1, Math.floor(base * multiplier));
}

function renderPrestigeUpgrades() {
  const container = document.getElementById('prestige-upgrades-container');
  if (!container || !gameState?.prestigeUpgrades) return;

  // Garante que o container está visível
  container.style.display = 'block';
  
  container.innerHTML = '';
  gameState.prestigeUpgrades.forEach(upgrade => {
    const price = Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
    const canAfford = (gameState.fragments || 0) >= price;
    const maxedOut = upgrade.level >= upgrade.maxLevel;
    const canBuy = canAfford && !maxedOut && isOwnPlayer();

    const upgradeElement = document.createElement('div');
    upgradeElement.className = `upgrade-item ${!canBuy ? 'disabled' : ''}`;
    
    const currentEffect = upgrade.effect ? upgrade.effect(upgrade.level) : 0;
    const nextEffect = upgrade.effect ? upgrade.effect(upgrade.level + 1) : 0;
    const tooltipText = `${upgrade.description}\nAtual: x${currentEffect.toFixed(1)}\nPróximo: x${nextEffect.toFixed(1)}`;
    
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