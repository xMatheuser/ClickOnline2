import { showNotification } from './UIModule.js';
import { 
  SEEDS,
  GARDEN_UPGRADES,
  getSeedInfo, 
  getSeedIcon, 
  getSeedGrowthTime,
  getSlotUnlockCost,
  getCrystalUnlockCost,
  calculateGrowthTime,
  calculateHarvestYield
} from './GardenModuleClient.js';
import { socket, gameState, isOwnPlayer } from './CoreModule.js';

function checkGardenProgress() {
  const garden = gameState.laboratory.garden;
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
        const readyIndicator = document.querySelector(`.garden-slot[data-slot="${slotId}"] .ready-indicator`);
        if (readyIndicator) {
          readyIndicator.style.display = 'block';
        }
      }
    }
  }
}

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

  // Adicionar listener para atualizações do jardim
  socket.on('gardenUpdate', (laboratoryState) => {
    // Atualizar estado local
    gameState.laboratory = laboratoryState;
    
    // Atualizar interface
    updateGardenSlots();
    updateLabResources();
    updateSlotCost();
    checkGardenProgress();
    renderSeedOptions();
  });
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
      gameState.laboratory.garden.selectedSeed = option.dataset.seed;
    });
  });
  
  document.getElementById('buy-lab-slot').addEventListener('click', buyLabSlot);
  document.getElementById('buy-lab-crystal').addEventListener('click', buyLabCrystal);
  
  setInterval(checkGardenProgress, 1000);
}

function updateGardenSlots() {
  const gardenGrid = document.getElementById('laboratory-garden');
  gardenGrid.innerHTML = '';
  
  const garden = gameState.laboratory.garden;
  
  // Número total máximo de slots (desbloqueados + 1 bloqueado)
  const totalSlots = Math.min(garden.unlockedSlots + 1, 10);
  
  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = `garden-slot ${i >= garden.unlockedSlots ? 'locked' : ''}`;
    slot.dataset.slot = i;
    
    if (i < garden.unlockedSlots) {
      const existingPlant = garden.plants[i];
      
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
    const garden = gameState.laboratory.garden;
    
    if (garden.plants[slotId]?.ready) {
      harvestPlant(slotId);
    } else if (!garden.plants[slotId]) {
      plantSeed(slotId);
    }
  });
}

function plantSeed(slotId) {
  if (!isOwnPlayer()) {
    showNotification('Você só pode plantar quando for o jogador ativo!');
    return;
  }

  socket.emit('plantSeed', {
    slotId,
    seedType: gameState.laboratory.garden.selectedSeed
  });
}

function harvestPlant(slotId) {
  if (!isOwnPlayer()) {
    showNotification('Você só pode colher quando for o jogador ativo!');
    return;
  }

  socket.emit('harvestPlant', slotId);
}

function buyLabSlot() {
  if (!isOwnPlayer()) {
    showNotification('Você só pode comprar slots quando for o jogador ativo!');
    return;
  }

  // Emitir evento de compra
  socket.emit('buyLabUpgrade', { type: 'slot' });
}

function buyLabCrystal() {
  const garden = gameState.laboratory.garden;
  
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
  const garden = gameState.laboratory.garden;
  
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
    <div class="seed-option ${seed.id === gameState.laboratory.garden.selectedSeed ? 'selected' : ''} 
                           ${!seed.unlockedByDefault && !gameState.laboratory.garden.crystalUnlocked ? 'locked' : ''}"
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
      gameState.laboratory.garden.selectedSeed = option.dataset.seed;
    });
  });
}

// Adicionar esta nova função
function updateSlotCost() {
  const slotCostElement = document.querySelector('[data-item="slot"] .store-item-cost');
  if (!slotCostElement) return;
  
  const nextSlotNumber = gameState.laboratory.garden.unlockedSlots + 1;
  const cost = getSlotUnlockCost(nextSlotNumber);
  
  slotCostElement.textContent = `Custo: ${cost.sunflower} 🌻, ${cost.tulip} 🌷`;
}