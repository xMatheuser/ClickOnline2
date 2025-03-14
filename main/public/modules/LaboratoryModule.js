import { 
  GARDEN_UPGRADES,
  getSeedIcon, 
  getSlotUnlockCost} from './GardenModule.js';
import socket from './SocketManager.js';

export let laboratoryData = {
  garden: {
    selectedSeed: 'sunflower',
    unlockedSlots: 1,
    crystalUnlocked: false,
    resources: { sunflower: 0, tulip: 0, mushroom: 0, crystal: 0 },
    plants: {},
    upgrades: {}
  },
  seeds: {}, // Will be populated from server
  gardenUpgrades: {} // Will be populated from server
};

// Listen for garden updates from server
socket.on('gardenUpdate', (garden) => {
  laboratoryData.garden = {
    ...laboratoryData.garden,
    ...garden
  };
  updateGardenSlots();
  updateLabResources();
});

// Listen for initial garden data
socket.on('gardenInit', ({ seeds, upgrades, garden }) => {
  laboratoryData.seeds = seeds;
  laboratoryData.gardenUpgrades = upgrades;
  laboratoryData.garden = garden;
  updateGardenSlots();
  updateLabResources();
  renderSeedOptions();
});

export function initLaboratory() {
  const openLabButton = document.getElementById('open-laboratory');
  const closeLabButton = document.getElementById('close-laboratory');
  const laboratoryOverlay = document.getElementById('laboratory-overlay');

  openLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.add('active');
    updateGardenSlots();
    updateLabResources();
    updateSlotCost(); // Adicionar esta linha
    checkGardenProgress();
    renderSeedOptions();
  });

  closeLabButton.addEventListener('click', () => laboratoryOverlay.classList.remove('active'));

  laboratoryOverlay.addEventListener('click', (e) => {
    if (e.target === laboratoryOverlay) laboratoryOverlay.classList.remove('active');
  });

  initLaboratoryGarden();
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
      const existingPlant = laboratoryData.garden.plants[i];
      
      if (existingPlant) {
        // Se há uma planta existente, restaura seu visual
        slot.innerHTML = `
          <div class="plant">${getSeedIcon(existingPlant.type)}</div>
          <div class="progress-bar"></div>
          <div class="ready-indicator" style="display: ${existingPlant.ready ? 'block' : 'none'}">Pronto!</div>
        `;
      } else {
        // Slot vazio
        slot.innerHTML = `
          <div class="plant-placeholder">Clique para plantar</div>
          <div class="progress-bar"></div>
          <div class="ready-indicator">Pronto!</div>
        `;
      }
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
  const seedType = laboratoryData.garden.selectedSeed;
  socket.emit('plantSeed', { slotId, seedType });
}

function harvestPlant(slotId) {
  socket.emit('harvestPlant', slotId);
}

function buyLabSlot() {
  socket.emit('buyGardenUpgrade', { upgradeId: 'slot' });
}

function buyLabCrystal() {
  socket.emit('buyGardenUpgrade', { upgradeId: 'crystal' });
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
    }
  }
}

// Adicione esta função se ainda não existir
function updateLabResources() {
  const garden = laboratoryData.garden;
  
  // Atualiza cada contador de recurso usando os recursos compartilhados
  Object.entries(garden.resources).forEach(([type, amount]) => {
    const counter = document.getElementById(`lab-${type}-count`);
    if (counter) {
      counter.textContent = amount;
    }
  });
}

function renderSeedOptions() {
  const seedSelector = document.querySelector('.seed-selector');
  seedSelector.innerHTML = Object.values(laboratoryData.seeds).map(seed => `
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

// Adicionar esta nova função
function updateSlotCost() {
  const slotCostElement = document.querySelector('[data-item="slot"] .store-item-cost');
  if (!slotCostElement) return;
  
  const nextSlotNumber = laboratoryData.garden.unlockedSlots + 1;
  const cost = getSlotUnlockCost(nextSlotNumber);
  
  slotCostElement.textContent = `Custo: ${cost.sunflower} 🌻, ${cost.tulip} 🌷`;
}