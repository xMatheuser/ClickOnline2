import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';
import { formatNumber, showTooltip, hideTooltip } from './UtilsModule.js';

const prestigeOverlay = document.getElementById('prestige-overlay');
const openPrestigeBtn = document.getElementById('open-prestige');
const closePrestigeBtn = document.getElementById('close-prestige');

// Cache do último estado para comparação
let lastPrestigeState = {
  fragments: 0,
  prestigeUpgrades: []
};

export function initPrestige() {
  socket.on('gameStateUpdate', (newState) => {
    // Ignora atualizações de clique e auto-clique
    if (newState.type === 'click' || newState.type === 'autoclick') {
      // Atualiza apenas o UI básico se necessário
      if (prestigeOverlay.classList.contains('active')) {
        updatePrestigeUI();
      }
      return;
    }

    // Para outros tipos de atualização, verifica se houve mudança relevante
    const shouldUpdateUI = hasPrestigeStateChanged();
    if (shouldUpdateUI) {
      updatePrestigeUI();
      renderPrestigeUpgrades();
      updatePrestigeStateCache();
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

function hasPrestigeStateChanged() {
  // Ignora se o estado do jogo ainda não está disponível
  if (!gameState) return false;

  // Verifica mudanças nos fragments
  if ((gameState.fragments || 0) !== lastPrestigeState.fragments) {
    return true;
  }

  // Verifica mudanças nos prestigeUpgrades
  const currentUpgrades = gameState.prestigeUpgrades || [];
  if (currentUpgrades.length !== lastPrestigeState.prestigeUpgrades.length) {
    return true;
  }

  // Verifica se algum upgrade mudou de nível
  return currentUpgrades.some((upgrade, index) => {
    const lastUpgrade = lastPrestigeState.prestigeUpgrades[index];
    return !lastUpgrade || upgrade.level !== lastUpgrade.level;
  });
}

function updatePrestigeStateCache() {
  lastPrestigeState = {
    fragments: gameState.fragments || 0,
    prestigeUpgrades: gameState.prestigeUpgrades ? 
      JSON.parse(JSON.stringify(gameState.prestigeUpgrades)) : []
  };
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
  
  // Calcular o multiplicador corretamente
  const multiplier = fragmentMultiplierUpgrade ? 
    (1 + fragmentMultiplierUpgrade.level * 0.2) : 1; // usa a mesma fórmula do prestigeUpgrades.js
  
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
    
    // Tratamento especial para diferentes tipos de upgrade
    let currentEffect, nextEffect, tooltipText;
    
    if (upgrade.id === 'powerups-unlock') {
      currentEffect = upgrade.level > 0 ? 'Desbloqueado' : 'Bloqueado';
      nextEffect = 'Desbloqueado';
      tooltipText = `${upgrade.description}\nStatus: ${currentEffect}`;
    } else if (upgrade.id === 'fragment-multiplier') {
      // Use a mesma fórmula do calculatePrestigeReward
      currentEffect = 1 + upgrade.level * 0.2;
      nextEffect = !maxedOut ? (1 + (upgrade.level + 1) * 0.2) : currentEffect;
      tooltipText = `${upgrade.description}\nAtual: x${currentEffect.toFixed(1)}\n${!maxedOut ? `Próximo: x${nextEffect.toFixed(1)}` : ''}`;
    } else {
      currentEffect = upgrade.effect(upgrade.level);
      nextEffect = !maxedOut ? upgrade.effect(upgrade.level + 1) : currentEffect;
      tooltipText = `${upgrade.description}\nAtual: x${currentEffect.toFixed(1)}\n${!maxedOut ? `Próximo: x${nextEffect.toFixed(1)}` : ''}`;
    }
    
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