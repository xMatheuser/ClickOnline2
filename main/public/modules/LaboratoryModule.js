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
  updateSlotCost();
  updateCrystalCost();
  updateFertilizerCost();
  updateHarvestAllButton();
  renderSeedOptions();
});

// Listen for initial garden data
socket.on('gardenInit', ({ seeds, upgrades, garden }) => {
  laboratoryData.seeds = seeds;
  
  // Reconstruir as funções a partir das strings
  laboratoryData.gardenUpgrades = {};
  Object.entries(upgrades).forEach(([key, upgrade]) => {
    try {
      // Reconstruir as funções getEffect e getCost
      const getEffectFn = upgrade.getEffectStr ? 
        new Function('return ' + upgrade.getEffectStr)() : 
        (level) => 1; // Função padrão
      
      const getCostFn = upgrade.getCostStr ? 
        new Function('return ' + upgrade.getCostStr)() : 
        (level) => ({}); // Função padrão
      
      laboratoryData.gardenUpgrades[key] = {
        ...upgrade,
        getEffect: getEffectFn,
        getCost: getCostFn
      };
    } catch (error) {
      console.error(`[Jardim] Erro ao reconstruir funções para upgrade ${key}:`, error);
      // Fallback para funções padrão
      laboratoryData.gardenUpgrades[key] = {
        ...upgrade,
        getEffect: (level) => 1,
        getCost: (level) => ({})
      };
    }
  });
  
  laboratoryData.garden = garden;
  
  console.log('[Jardim] Dados iniciais recebidos:', {
    seeds: Object.keys(seeds),
    upgrades: Object.keys(laboratoryData.gardenUpgrades),
    garden: {
      unlockedSlots: garden.unlockedSlots,
      crystalUnlocked: garden.crystalUnlocked,
      resources: garden.resources,
      upgrades: garden.upgrades
    }
  });
  
  updateGardenSlots();
  updateLabResources();
  updateSlotCost();
  updateCrystalCost();
  updateFertilizerCost();
  updateHarvestAllButton();
  renderSeedOptions();
});

export function initLaboratory() {
  const openLabButton = document.getElementById('open-laboratory');
  const closeLabButton = document.getElementById('close-laboratory');
  const laboratoryOverlay = document.getElementById('laboratory-overlay');

  if (!openLabButton || !closeLabButton || !laboratoryOverlay) {
    console.error('Elementos do laboratório não encontrados');
    return;
  }

  openLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.add('active');
    
    // Atualiza a interface do jardim
    updateGardenSlots();
    updateLabResources();
    updateSlotCost();
    updateCrystalCost();
    updateFertilizerCost();
    updateHarvestAllButton();
    checkGardenProgress();
    renderSeedOptions();
    
    console.log('Laboratório aberto');
  });

  closeLabButton.addEventListener('click', () => {
    laboratoryOverlay.classList.remove('active');
    console.log('Laboratório fechado');
  });

  laboratoryOverlay.addEventListener('click', (e) => {
    if (e.target === laboratoryOverlay) laboratoryOverlay.classList.remove('active');
  });

  // Inicializa o jardim
  initLaboratoryGarden();
  
  // Solicita dados atualizados do servidor
  socket.emit('requestGardenUpdate');
  
  console.log('Laboratório inicializado');
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
  
  // Adiciona event listener para o botão do fertilizante
  const buyFertilizerButton = document.getElementById('buy-lab-fertilizer');
  if (buyFertilizerButton) {
    buyFertilizerButton.addEventListener('click', buyLabFertilizer);
  }
  
  // Adiciona event listener para o botão "Colher Tudo"
  const harvestAllButton = document.getElementById('harvest-all-button');
  if (harvestAllButton) {
    harvestAllButton.addEventListener('click', harvestAllPlants);
  }
  
  setInterval(checkGardenProgress, 1000);
}

function updateGardenSlots() {
  const gardenGrid = document.getElementById('laboratory-garden');
  const existingSlots = gardenGrid.children;
  
  // Número total máximo de slots (desbloqueados + 1 bloqueado)
  const totalSlots = Math.min(laboratoryData.garden.unlockedSlots + 1, 10);
  
  // Atualiza slots existentes
  for (let i = 0; i < existingSlots.length; i++) {
    const slot = existingSlots[i];
    const isLocked = i >= laboratoryData.garden.unlockedSlots;
    
    // Atualiza classe locked
    slot.className = `garden-slot ${isLocked ? 'locked' : ''}`;
    
    if (!isLocked) {
      const existingPlant = laboratoryData.garden.plants[i];
      
      if (existingPlant) {
        // Atualiza planta existente
        let plantElement = slot.querySelector('.plant');
        const progressBar = slot.querySelector('.progress-bar');
        const readyIndicator = slot.querySelector('.ready-indicator');
        
        // Se não existir o elemento da planta, recria o conteúdo do slot
        if (!plantElement) {
          slot.innerHTML = `
            <div class="plant">${getSeedIcon(existingPlant.type)}</div>
            <div class="progress-bar"></div>
            <div class="ready-indicator" style="display: ${existingPlant.ready ? 'block' : 'none'}">Pronto!</div>
          `;
          setupGardenSlot(slot);
        } else {
          plantElement.textContent = getSeedIcon(existingPlant.type);
          if (readyIndicator) {
            readyIndicator.style.display = existingPlant.ready ? 'block' : 'none';
          }
        }
      } else {
        // Slot vazio
        slot.innerHTML = `
          <div class="plant-placeholder">Clique para plantar</div>
          <div class="progress-bar"></div>
          <div class="ready-indicator">Pronto!</div>
        `;
        setupGardenSlot(slot);
      }
    } else {
      // Slot bloqueado
      slot.innerHTML = `
        <div class="lock-icon">🔒</div>
        <div class="plant-placeholder">Slot Bloqueado</div>
      `;
    }
  }
  
  // Adiciona novos slots se necessário
  for (let i = existingSlots.length; i < totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = `garden-slot ${i >= laboratoryData.garden.unlockedSlots ? 'locked' : ''}`;
    slot.dataset.slot = i;
    
    if (i < laboratoryData.garden.unlockedSlots) {
      const existingPlant = laboratoryData.garden.plants[i];
      
      if (existingPlant) {
        slot.innerHTML = `
          <div class="plant">${getSeedIcon(existingPlant.type)}</div>
          <div class="progress-bar"></div>
          <div class="ready-indicator" style="display: ${existingPlant.ready ? 'block' : 'none'}">Pronto!</div>
        `;
      } else {
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
  
  // Remove slots extras se necessário
  while (gardenGrid.children.length > totalSlots) {
    gardenGrid.removeChild(gardenGrid.lastChild);
  }
  
  // Atualiza o botão "Colher Tudo" após atualizar os slots
  updateHarvestAllButton();
}

function setupGardenSlot(slot) {
  // Garante que o slot tenha o atributo data-slot
  if (!slot.dataset.slot && slot.parentElement) {
    const index = Array.from(slot.parentElement.children).indexOf(slot);
    if (index >= 0) {
      slot.dataset.slot = index;
    }
  }
  
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
  
  // Atualiza localmente para feedback imediato
  const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
  if (slot) {
    slot.innerHTML = `
      <div class="plant">${getSeedIcon(seedType)}</div>
      <div class="progress-bar" style="width: 0%"></div>
      <div class="ready-indicator" style="display: none">Pronto!</div>
    `;
    setupGardenSlot(slot);
  }
  
  // Envia para o servidor
  socket.emit('plantSeed', { slotId, seedType });
}

function harvestPlant(slotId) {
  socket.emit('harvestPlant', slotId);
}

function harvestAllPlants() {
  const garden = laboratoryData.garden;
  let readyPlantsFound = false;
  
  // Verifica se há plantas prontas para colher
  for (const slotId in garden.plants) {
    if (garden.plants[slotId].ready) {
      readyPlantsFound = true;
      break;
    }
  }
  
  if (readyPlantsFound) {
    socket.emit('harvestAllPlants');
    console.log('Solicitação para colher todas as plantas enviada');
    // O botão será atualizado quando o servidor enviar a atualização do jardim
  } else {
    console.log('Não há plantas prontas para colher');
  }
}

function buyLabSlot() {
  socket.emit('buyGardenUpgrade', { upgradeId: 'slot' });
}

function unlockSeed(seedId) {
  socket.emit('buyGardenUpgrade', { upgradeId: `unlock_${seedId}` });
}

function buyLabFertilizer() {
  socket.emit('buyGardenUpgrade', { upgradeId: 'fertilizer' });
}

function checkGardenProgress() {
  const garden = laboratoryData.garden;
  let updated = false;
  
  for (const slotId in garden.plants) {
    const plant = garden.plants[slotId];
    if (!plant.ready) {
      const elapsed = Date.now() - plant.plantedAt;
      const progress = Math.min(100, (elapsed / plant.growthTime) * 100);
      
      // Atualiza a barra de progresso
      const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
      const progressBar = slot?.querySelector('.progress-bar');
      const readyIndicator = slot?.querySelector('.ready-indicator');
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      // Verifica se a planta está pronta
      if (elapsed >= plant.growthTime && !plant.ready) {
        plant.ready = true;
        updated = true;
        
        if (readyIndicator) {
          readyIndicator.style.display = 'block';
        }
      }
    }
  }
  
  // Se alguma planta foi atualizada para pronta, atualiza a interface
  if (updated) {
    updateGardenSlots();
    updateHarvestAllButton();
  }
}

// Função para atualizar o botão "Colher Tudo"
function updateHarvestAllButton() {
  const harvestAllButton = document.getElementById('harvest-all-button');
  if (!harvestAllButton) return;
  
  const garden = laboratoryData.garden;
  let readyPlantsCount = 0;
  
  // Conta quantas plantas estão prontas para colheita
  for (const slotId in garden.plants) {
    if (garden.plants[slotId].ready) {
      readyPlantsCount++;
    }
  }
  
  // Atualiza o texto do botão com o contador
  if (readyPlantsCount > 0) {
    harvestAllButton.innerHTML = `<span class="harvest-icon">🌿</span> Colher Tudo (${readyPlantsCount})`;
    harvestAllButton.classList.add('has-ready-plants');
    harvestAllButton.disabled = false;
    harvestAllButton.title = `Colher ${readyPlantsCount} ${readyPlantsCount === 1 ? 'planta pronta' : 'plantas prontas'}`;
  } else {
    harvestAllButton.innerHTML = `<span class="harvest-icon">🌿</span> Colher Tudo`;
    harvestAllButton.classList.remove('has-ready-plants');
    harvestAllButton.disabled = true;
    harvestAllButton.title = 'Não há plantas prontas para colher';
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

// Modify renderSeedOptions to include unlock buttons
function renderSeedOptions() {
  const seedSelector = document.querySelector('.seed-selector');
  if (!seedSelector) return;
  
  const garden = laboratoryData.garden;
  
  seedSelector.innerHTML = Object.values(laboratoryData.seeds)
    .filter(seed => seed.visible || garden[`${seed.id}Unlocked`]) // Mostrar se visível ou desbloqueada
    .map(seed => {
      const isLocked = !garden[`${seed.id}Unlocked`];
      const unlockButton = isLocked && seed.unlockCost ? `
        <button class="unlock-seed-button" data-seed="${seed.id}">
          (${Object.entries(seed.unlockCost)
            .map(([res, amt]) => `${amt} ${laboratoryData.seeds[res].icon}`)
            .join(', ')})
        </button>
      ` : '';

      return `
        <div class="seed-option ${seed.id === garden.selectedSeed ? 'selected' : ''} 
                               ${isLocked ? 'locked' : ''}"
             data-seed="${seed.id}">
          <span class="seed-icon">${seed.icon}</span>
          <div>
            <div>${seed.name}</div>
            <div class="time-info">${seed.growthTime/1000}s • ${seed.difficulty}</div>
            ${unlockButton}
          </div>
        </div>
      `;
    }).join('');

  // Add event listeners for seed selection and unlocking
  seedSelector.querySelectorAll('.seed-option').forEach(option => {
    if (!option.classList.contains('locked')) {
      option.addEventListener('click', () => {
        seedSelector.querySelectorAll('.seed-option').forEach(opt => 
          opt.classList.remove('selected'));
        option.classList.add('selected');
        garden.selectedSeed = option.dataset.seed;
      });
    }

    const unlockButton = option.querySelector('.unlock-seed-button');
    if (unlockButton) {
      unlockButton.addEventListener('click', (e) => {
        e.stopPropagation();
        unlockSeed(unlockButton.dataset.seed);
      });
    }
  });
}

// Adicionar esta nova função
function updateSlotCost() {
  const slotElement = document.querySelector('[data-item="slot"]');
  if (!slotElement) return;
  
  const costElement = slotElement.querySelector('.store-item-cost');
  const buyButton = slotElement.querySelector('.buy-button');
  
  if (!costElement || !buyButton) return;
  
  const garden = laboratoryData.garden;
  
  // Se atingiu o máximo de slots
  if (garden.unlockedSlots >= 10) {
    costElement.textContent = 'Máximo de slots atingido';
    buyButton.disabled = true;
    buyButton.textContent = 'Máximo';
    return;
  } else {
    buyButton.disabled = false;
    buyButton.textContent = 'Comprar';
  }
  
  const nextSlotNumber = garden.unlockedSlots + 1;
  const cost = getSlotUnlockCost(nextSlotNumber);
  
  // Verifica se o jogador tem recursos suficientes
  const hasEnoughResources = 
    garden.resources.sunflower >= cost.sunflower &&
    garden.resources.tulip >= cost.tulip;
  
  // Atualiza o visual do botão com base nos recursos
  if (!hasEnoughResources) {
    buyButton.classList.add('insufficient');
  } else {
    buyButton.classList.remove('insufficient');
  }
  
  costElement.textContent = `Custo: ${cost.sunflower} 🌻, ${cost.tulip} 🌷`;
  
  // Atualiza o custo do crystal e fertilizante
  updateCrystalCost();
  updateFertilizerCost();
}

// Função para atualizar o custo do crystal
function updateCrystalCost() {
  const crystalElement = document.querySelector('[data-item="crystal"]');
  if (!crystalElement) return;
  
  const costElement = crystalElement.querySelector('.store-item-cost');
  const buyButton = crystalElement.querySelector('.buy-button');
  
  if (!costElement || !buyButton) return;
  
  const garden = laboratoryData.garden;
  
  // Se já tem o crystal desbloqueado
  if (garden.crystalUnlocked) {
    costElement.textContent = 'Desbloqueado';
    buyButton.disabled = true;
    buyButton.textContent = 'Desbloqueado';
    crystalElement.classList.add('purchased');
    return;
  } else {
    buyButton.disabled = false;
    buyButton.textContent = 'Comprar';
    crystalElement.classList.remove('purchased');
  }
  
  // Definir custo do crystal
  const cost = {
    sunflower: 50,
    tulip: 30,
    mushroom: 20
  };
  
  // Verifica se o jogador tem recursos suficientes
  const hasEnoughResources = 
    garden.resources.sunflower >= cost.sunflower &&
    garden.resources.tulip >= cost.tulip &&
    garden.resources.mushroom >= cost.mushroom;
  
  // Atualiza o visual do botão com base nos recursos
  if (!hasEnoughResources) {
    buyButton.classList.add('insufficient');
  } else {
    buyButton.classList.remove('insufficient');
  }
  
  costElement.textContent = `Custo: ${cost.sunflower} 🌻, ${cost.tulip} 🌷, ${cost.mushroom} 🍄`;
}

// Função para atualizar o custo e nível do fertilizante
function updateFertilizerCost() {
  const fertilizerElement = document.querySelector('[data-item="fertilizer"]');
  if (!fertilizerElement) return;
  
  const costElement = fertilizerElement.querySelector('.store-item-cost');
  const titleElement = fertilizerElement.querySelector('.store-item-title');
  const buyButton = fertilizerElement.querySelector('.buy-button');
  
  if (!costElement || !titleElement || !buyButton) return;
  
  const garden = laboratoryData.garden;
  const currentLevel = garden.upgrades?.fertilizer || 0;
  
  // Atualiza o título para mostrar o nível atual
  titleElement.textContent = `Fertilizante Superior ${currentLevel > 0 ? `Nível ${currentLevel}` : ''}`;
  
  // Adiciona classe visual para indicar que o upgrade foi comprado
  if (currentLevel > 0) {
    fertilizerElement.classList.add('purchased');
  } else {
    fertilizerElement.classList.remove('purchased');
  }
  
  // Se atingiu o nível máximo
  if (currentLevel >= 5) {
    costElement.textContent = 'Nível Máximo';
    buyButton.disabled = true;
    buyButton.textContent = 'Máximo';
    return;
  } else {
    buyButton.disabled = false;
    buyButton.textContent = 'Comprar';
  }
  
  // Calcula o custo para o próximo nível
  const nextLevel = currentLevel + 1;
  const baseCost = { sunflower: 10, tulip: 8, mushroom: 5 };
  const cost = {
    sunflower: Math.floor(baseCost.sunflower * Math.pow(1.5, currentLevel)),
    tulip: Math.floor(baseCost.tulip * Math.pow(1.5, currentLevel)),
    mushroom: Math.floor(baseCost.mushroom * Math.pow(1.5, currentLevel))
  };
  
  // Verifica se o jogador tem recursos suficientes
  const hasEnoughResources = 
    garden.resources.sunflower >= cost.sunflower &&
    garden.resources.tulip >= cost.tulip &&
    garden.resources.mushroom >= cost.mushroom;
  
  // Atualiza o visual do botão com base nos recursos
  if (!hasEnoughResources) {
    buyButton.classList.add('insufficient');
  } else {
    buyButton.classList.remove('insufficient');
  }
  
  costElement.textContent = `Custo: ${cost.sunflower} 🌻, ${cost.tulip} 🌷, ${cost.mushroom} 🍄`;
}

// Novo sistema de custos para slots
function getSlotUnlockCost(nextSlotNumber) {
  return {
    sunflower: 5 * nextSlotNumber,
    tulip: 3 * nextSlotNumber
  };
}

function getSeedIcon(seedId) {
  return laboratoryData.seeds[seedId]?.icon || '❓';
}

// Função para calcular o tempo de crescimento ajustado
function calculateAdjustedGrowthTime(baseTime) {
  const garden = laboratoryData.garden;
  const upgrades = garden.upgrades || {};
  
  // Calcular multiplicador de velocidade
  let speedMultiplier = 1;
  const speedLevel = upgrades.growthSpeed || 0;
  if (speedLevel > 0 && laboratoryData.gardenUpgrades?.growthSpeed?.getEffect) {
    try {
      speedMultiplier = laboratoryData.gardenUpgrades.growthSpeed.getEffect(speedLevel);
    } catch (error) {
      console.error('[Jardim] Erro ao calcular efeito de velocidade:', error);
      // Fallback para cálculo manual
      speedMultiplier = 1 - (speedLevel * 0.1);
    }
  }
  
  // Calcular multiplicador de fertilizante
  let fertilizerMultiplier = 1;
  const fertilizerLevel = upgrades.fertilizer || 0;
  if (fertilizerLevel > 0 && laboratoryData.gardenUpgrades?.fertilizer?.getEffect) {
    try {
      fertilizerMultiplier = laboratoryData.gardenUpgrades.fertilizer.getEffect(fertilizerLevel);
    } catch (error) {
      console.error('[Jardim] Erro ao calcular efeito de fertilizante:', error);
      // Fallback para cálculo manual
      fertilizerMultiplier = 1 - (fertilizerLevel * 0.2);
    }
  }
  
  // Calcular tempo ajustado
  const totalMultiplier = speedMultiplier * fertilizerMultiplier;
  const adjustedTime = baseTime * totalMultiplier;
  
  return adjustedTime;
}