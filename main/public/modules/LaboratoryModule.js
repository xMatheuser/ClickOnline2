import { showNotification } from './UIModule.js';
import { 
  SEEDS,
  getSeedInfo, 
  getSeedIcon, 
  getSeedGrowthTime,
  getSlotUnlockCost,
  getCrystalUnlockCost,
  calculateGrowthTime,
  calculateHarvestYield
} from './GardenModule.js';

export let laboratoryData = {
  researchPoints: 0,
  pointsPerSecond: 0,
  upgrades: [
    { id: 'automation', name: 'Automação Básica', description: 'Gera 1 ponto de pesquisa por segundo', baseCost: 10, level: 0, costMultiplier: 1.5, effect: 1 },
    { id: 'efficiency', name: 'Eficiência de Pesquisa', description: 'Aumenta a geração de pontos em 50%', baseCost: 50, level: 0, costMultiplier: 2, effect: 0.5 }
  ],
  garden: {
    selectedSeed: 'sunflower',
    unlockedSlots: 1,
    crystalUnlocked: false,
    resources: { sunflower: 1000, tulip: 1000, mushroom: 1000, crystal: 1000 },
    plants: {},
    upgrades: {
      growthSpeed: 0,
      harvestYield: 0
    }
  }
};

export function initLaboratory() {
  const openLabButton = document.getElementById('open-laboratory');
  const closeLabButton = document.getElementById('close-laboratory');
  const laboratoryOverlay = document.getElementById('laboratory-overlay');

  openLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.add('active');
    updateLaboratoryUI();
    updateGardenSlots();
    updateLabResources();
    checkGardenProgress(); // Atualiza imediatamente o progresso das plantas
    renderSeedOptions(); // Adicione essa função para renderizar as sementes
  });

  closeLabButton.addEventListener('click', () => laboratoryOverlay.classList.remove('active'));

  laboratoryOverlay.addEventListener('click', (e) => {
    if (e.target === laboratoryOverlay) laboratoryOverlay.classList.remove('active');
  });

  setInterval(updateLaboratory, 1000);
  initLaboratoryGarden();
}

function updateLaboratory() {
  laboratoryData.researchPoints += laboratoryData.pointsPerSecond;
  if (document.getElementById('laboratory-overlay').classList.contains('active')) {
    updateLaboratoryUI();
  }
}

function updateLaboratoryUI() {
  const researchPoints = document.getElementById('research-points');
  const researchPerSecond = document.getElementById('research-per-second');
  const upgradesContainer = document.getElementById('laboratory-upgrades');
  
  // Guard against null elements
  if (researchPoints) {
    researchPoints.textContent = Math.floor(laboratoryData.researchPoints);
  }
  
  if (researchPerSecond) {
    researchPerSecond.textContent = laboratoryData.pointsPerSecond.toFixed(1);
  }
  
  if (upgradesContainer) {
    upgradesContainer.innerHTML = laboratoryData.upgrades.map(upgrade => {
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
      return `
        <div class="laboratory-upgrade" onclick="buyLabUpgrade('${upgrade.id}')">
          <h3>${upgrade.name} (Nível ${upgrade.level})</h3>
          <p>${upgrade.description}</p>
          <p>Custo: ${cost} pontos</p>
        </div>
      `;
    }).join('');
  }
}

export function buyLabUpgrade(upgradeId) {
  const upgrade = laboratoryData.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return;
  
  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
  
  if (laboratoryData.researchPoints >= cost) {
    laboratoryData.researchPoints -= cost;
    upgrade.level++;
    
    if (upgradeId === 'automation') {
      laboratoryData.pointsPerSecond += upgrade.effect;
    } else if (upgradeId === 'efficiency') {
      laboratoryData.pointsPerSecond *= (1 + upgrade.effect);
    }
    
    updateLaboratoryUI();
  }
}

function initLaboratoryGarden() {
  const gardenGrid = document.getElementById('laboratory-garden');
  const seedOptions = document.querySelectorAll('.seed-option');
  
  updateGardenSlots();
  
  seedOptions.forEach(option => {
    option.addEventListener('click', () => {
      if (option.classList.contains('locked')) return;
      seedOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      laboratoryData.garden.selectedSeed = option.dataset.seed;
    });
  });
  
  document.getElementById('buy-lab-slot').addEventListener('click', buyLabSlot);
  document.getElementById('buy-lab-crystal').addEventListener('click', buyLabCrystal);
  
  setInterval(checkGardenProgress, 1000);
}

function updateGardenSlots() {
  const gardenGrid = document.getElementById('laboratory-garden');
  gardenGrid.innerHTML = '';
  
  // Número total máximo de slots (desbloqueados + 1 bloqueado)
  const totalSlots = Math.min(laboratoryData.garden.unlockedSlots + 1, 10);
  
  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = `garden-slot ${i >= laboratoryData.garden.unlockedSlots ? 'locked' : ''}`;
    slot.dataset.slot = i;
    
    if (i < laboratoryData.garden.unlockedSlots) {
      slot.innerHTML = `
        <div class="plant-placeholder">Clique para plantar</div>
        <div class="progress-bar"></div>
        <div class="ready-indicator">Pronto!</div>
      `;
      setupGardenSlot(slot);
    } else {
      slot.innerHTML = `
        <div class="lock-icon">🔒</div>
        <div class="plant-placeholder">Slot Bloqueado</div>
      `;
    }
    
    gardenGrid.appendChild(slot);
  }
}

function setupGardenSlot(slot) {
  slot.addEventListener('click', () => {
    const slotId = slot.dataset.slot;
    const garden = laboratoryData.garden;
    
    if (garden.plants[slotId]?.ready) {
      harvestPlant(slotId);
    } else if (!garden.plants[slotId]) {
      plantSeed(slotId);
    }
  });
}

function plantSeed(slotId) {
  const garden = laboratoryData.garden;
  const seedType = garden.selectedSeed;
  const seedInfo = getSeedInfo(seedType);
  const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
  
  const adjustedGrowthTime = calculateGrowthTime(
    getSeedGrowthTime(seedType),
    garden.upgrades
  );
  
  slot.innerHTML = `
    <div class="plant">${getSeedIcon(seedType)}</div>
    <div class="progress-bar"></div>
    <div class="ready-indicator">Pronto!</div>
  `;
  
  garden.plants[slotId] = {
    type: seedType,
    plantedAt: Date.now(),
    growthTime: adjustedGrowthTime,
    ready: false
  };
}

function harvestPlant(slotId) {
  const garden = laboratoryData.garden;
  const plant = garden.plants[slotId];
  const seedInfo = getSeedInfo(plant.type);
  
  if (plant.ready) {
    const harvestAmount = calculateHarvestYield(
      seedInfo.reward.amount,
      garden.upgrades
    );
    
    garden.resources[plant.type] += harvestAmount;
    const resourceCount = document.getElementById(`lab-${plant.type}-count`);
    if (resourceCount) {
      resourceCount.textContent = garden.resources[plant.type];
    }
    showNotification(`+${harvestAmount} ${getSeedIcon(plant.type)}`);
  }
  
  // Limpa o slot
  delete garden.plants[slotId];
  slot.innerHTML = `
    <div class="plant-placeholder">Clique para plantar</div>
    <div class="progress-bar"></div>
    <div class="ready-indicator">Pronto!</div>
  `;
  
  // Atualiza os recursos mostrados
  updateLabResources();
}

function checkGardenProgress() {
  const garden = laboratoryData.garden;
  for (const slotId in garden.plants) {
    const plant = garden.plants[slotId];
    if (!plant.ready) {
      const elapsed = Date.now() - plant.plantedAt;
      const progress = Math.min(100, (elapsed / plant.growthTime) * 100);
      
      // Atualiza a barra de progresso
      const progressBar = document.querySelector(`.garden-slot[data-slot="${slotId}"] .progress-bar`);
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }

      if (elapsed >= plant.growthTime) {
        plant.ready = true;
        document.querySelector(`.garden-slot[data-slot="${slotId}"] .ready-indicator`).style.display = 'block';
      }
    }
  }
}

function buyLabSlot() {
  const garden = laboratoryData.garden;
  
  if (garden.unlockedSlots >= 10) {
    showNotification('Todos os slots já estão desbloqueados!');
    return;
  }
  
  const cost = getSlotUnlockCost(garden.unlockedSlots + 1);
  
  if (garden.resources.sunflower >= cost.sunflower && garden.resources.tulip >= cost.tulip) {
    garden.resources.sunflower -= cost.sunflower;
    garden.resources.tulip -= cost.tulip;
    garden.unlockedSlots++;
    updateGardenSlots();
    updateLabResources();
    showNotification('Novo slot de plantio desbloqueado!');
  } else {
    showNotification('Recursos insuficientes!');
  }
}

function buyLabCrystal() {
  const garden = laboratoryData.garden;
  
  if (garden.crystalUnlocked) {
    showNotification('Semente de Cristal já desbloqueada!');
    return;
  }
  
  const cost = getCrystalUnlockCost();
  
  if (garden.resources.sunflower >= cost.sunflower && 
      garden.resources.tulip >= cost.tulip && 
      garden.resources.mushroom >= cost.mushroom) {
    garden.resources.sunflower -= cost.sunflower;
    garden.resources.tulip -= cost.tulip;
    garden.resources.mushroom -= cost.mushroom;
    garden.crystalUnlocked = true;
    
    const crystalSeed = document.querySelector('.seed-option[data-seed="crystal"]');
    crystalSeed.classList.remove('locked');
    updateLabResources();
    showNotification('Semente de Cristal desbloqueada!');
  } else {
    showNotification('Recursos insuficientes!');
  }
}

// Adicione esta função se ainda não existir
function updateLabResources() {
  const garden = laboratoryData.garden;
  
  // Atualiza cada contador de recurso
  Object.entries(garden.resources).forEach(([type, amount]) => {
    const counter = document.getElementById(`lab-${type}-count`);
    if (counter) {
      counter.textContent = amount;
    }
  });
}

function renderSeedOptions() {
  const seedSelector = document.querySelector('.seed-selector');
  seedSelector.innerHTML = Object.values(SEEDS).map(seed => `
    <div class="seed-option ${seed.id === laboratoryData.garden.selectedSeed ? 'selected' : ''} 
                           ${!seed.unlockedByDefault && !laboratoryData.garden.crystalUnlocked ? 'locked' : ''}"
         data-seed="${seed.id}">
      <span class="seed-icon">${seed.icon}</span>
      <div>
        <div>${seed.name}</div>
        <div class="time-info">${seed.growthTime/1000}s • ${seed.difficulty}</div>
      </div>
    </div>
  `).join('');

  // Reattach event listeners
  seedSelector.querySelectorAll('.seed-option').forEach(option => {
    option.addEventListener('click', () => {
      if (option.classList.contains('locked')) return;
      seedSelector.querySelectorAll('.seed-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      laboratoryData.garden.selectedSeed = option.dataset.seed;
    });
  });
}