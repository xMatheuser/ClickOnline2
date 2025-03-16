import socket from './SocketManager.js';

// Adicionar variável para rastrear plantas prontas para colheita
let readyPlantsCount = 0;

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
  console.log('[Jardim] Recebendo atualização do jardim:', {
    garden: {
      unlockedSlots: garden.unlockedSlots,
      resources: garden.resources,
      upgrades: garden.upgrades
    }
  });
  
  laboratoryData.garden = {
    ...laboratoryData.garden,
    ...garden
  };
  updateGardenSlots();
  updateLabResources();
  updateStoreItems(); // Atualizar os itens da loja
  updateHarvestAllButton();
  updateGardenBadge();
  renderSeedOptions();
});

// Listen for initial garden data
socket.on('gardenInit', ({ seeds, upgrades, garden }) => {
  laboratoryData.seeds = seeds;
  
  console.log('[Jardim] Recebendo dados iniciais:', {
    seeds: Object.keys(seeds),
    upgrades: Object.keys(upgrades),
    upgradesWithFunctions: Object.entries(upgrades).map(([key, upgrade]) => ({
      key,
      hasGetEffectStr: !!upgrade.getEffectStr,
      hasGetCostStr: !!upgrade.getCostStr
    }))
  });
  
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
      
      console.log(`[Jardim] Reconstruiu funções para upgrade ${key}:`, {
        getEffectFn: getEffectFn.toString(),
        getCostFn: getCostFn.toString()
      });
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
  updateStoreItems(); // Renderizar os itens da loja
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
    laboratoryOverlay.style.display = 'flex';
    updateGardenSlots();
    updateLabResources();
    updateStoreItems(); // Atualizar os itens da loja quando abrir o laboratório
    updateHarvestAllButton();
    renderSeedOptions();
  });

  closeLabButton.addEventListener('click', () => {
    laboratoryOverlay.style.display = 'none';
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
  
  // Adiciona event listener para o botão "Colher Tudo"
  const harvestAllButton = document.getElementById('harvest-all-button');
  if (harvestAllButton) {
    harvestAllButton.addEventListener('click', harvestAllPlants);
  }
  
  // Verifica o progresso das plantas a cada segundo
  setInterval(checkGardenProgress, 1000);
  
  // Atualiza o badge do jardim a cada 5 segundos (caso o servidor não envie atualizações)
  setInterval(updateGardenBadge, 5000);

  // Adiciona tooltip para os itens da loja
  setupTooltips();
}

// Função para configurar tooltips
function setupTooltips() {
  // Cria o elemento de tooltip se não existir
  let tooltip = document.getElementById('tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
  }
  
  // Adiciona eventos de tooltip para os itens da loja
  document.addEventListener('mouseover', (e) => {
    const storeItem = e.target.closest('.store-item');
    if (storeItem) {
      const desc = storeItem.querySelector('.store-item-desc')?.textContent;
      if (!desc) return;
      
      tooltip.textContent = desc;
      tooltip.style.display = 'block';
      
      // Posiciona o tooltip próximo ao cursor
      const updateTooltipPosition = (e) => {
        // Position tooltip next to cursor
        const x = e.pageX + 10;
        const y = e.pageY + 10;
        
        // Keep tooltip within viewport
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (x + tooltipRect.width > viewportWidth) {
          tooltip.style.left = (x - tooltipRect.width - 20) + 'px';
        } else {
          tooltip.style.left = x + 'px';
        }
        
        if (y + tooltipRect.height > viewportHeight) {
          tooltip.style.top = (y - tooltipRect.height - 20) + 'px';
        } else {
          tooltip.style.top = y + 'px';
        }
      };
      
      updateTooltipPosition(e);
      storeItem.addEventListener('mousemove', updateTooltipPosition);
      
      storeItem.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        storeItem.removeEventListener('mousemove', updateTooltipPosition);
      }, { once: true });
    }
  });
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
        // Calcula os tempos de crescimento para esta planta
        const seedInfo = laboratoryData.seeds[existingPlant.type];
        const originalTime = seedInfo ? seedInfo.growthTime / 1000 : 30;
        const adjustedTime = existingPlant.growthTime / 1000;
        
        // Cria o elemento de informação de tempo
        let timeInfo = '';
        if (adjustedTime < originalTime) {
          timeInfo = `
            <div class="plant-time-info">
              <span class="time-original">${originalTime}s</span> → 
              <span class="time-reduced">${adjustedTime.toFixed(1)}s</span>
            </div>
          `;
        } else {
          timeInfo = `
            <div class="plant-time-info">
              <span>${originalTime}s</span>
            </div>
          `;
        }
        
        // Atualiza planta existente
        let plantElement = slot.querySelector('.plant');
        const progressBar = slot.querySelector('.progress-bar');
        const readyIndicator = slot.querySelector('.ready-indicator');
        
        // Se não existir o elemento da planta, recria o conteúdo do slot
        if (!plantElement) {
          slot.innerHTML = `
            <div class="plant">${getSeedIcon(existingPlant.type)}</div>
            ${timeInfo}
            <div class="progress-bar"></div>
            <div class="ready-indicator" style="display: ${existingPlant.ready ? 'block' : 'none'}">Pronto!</div>
          `;
          setupGardenSlot(slot);
        } else {
          plantElement.textContent = getSeedIcon(existingPlant.type);
          
          // Atualiza ou adiciona a informação de tempo
          let timeInfoElement = slot.querySelector('.plant-time-info');
          if (!timeInfoElement) {
            const progressBarElement = slot.querySelector('.progress-bar');
            if (progressBarElement) {
              progressBarElement.insertAdjacentHTML('beforebegin', timeInfo);
            }
          }
          
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
        // Calcula os tempos de crescimento para esta planta
        const seedInfo = laboratoryData.seeds[existingPlant.type];
        const originalTime = seedInfo ? seedInfo.growthTime / 1000 : 30;
        const adjustedTime = existingPlant.growthTime / 1000;
        
        // Cria o elemento de informação de tempo
        let timeInfo = '';
        if (adjustedTime < originalTime) {
          timeInfo = `
            <div class="plant-time-info">
              <span class="time-original">${originalTime}s</span> → 
              <span class="time-reduced">${adjustedTime.toFixed(1)}s</span>
            </div>
          `;
        } else {
          timeInfo = `
            <div class="plant-time-info">
              <span>${originalTime}s</span>
            </div>
          `;
        }
        
        slot.innerHTML = `
          <div class="plant">${getSeedIcon(existingPlant.type)}</div>
          ${timeInfo}
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
  const seedInfo = laboratoryData.seeds[seedType];
  
  if (!seedInfo) return;
  
  // Calcular os tempos de crescimento
  const originalTime = seedInfo.growthTime / 1000;
  const adjustedTime = calculateAdjustedGrowthTime(seedInfo.growthTime) / 1000;
  
  // Atualiza localmente para feedback imediato
  const slot = document.querySelector(`.garden-slot[data-slot="${slotId}"]`);
  if (slot) {
    // Criar uma string de tooltip que mostre os tempos
    let timeInfo = '';
    if (adjustedTime < originalTime) {
      timeInfo = `
        <div class="plant-time-info">
          <span class="time-original">${originalTime}s</span> → 
          <span class="time-reduced">${adjustedTime.toFixed(1)}s</span>
        </div>
      `;
    } else {
      timeInfo = `
        <div class="plant-time-info">
          <span>${originalTime}s</span>
        </div>
      `;
    }
    
    slot.innerHTML = `
      <div class="plant">${getSeedIcon(seedType)}</div>
      ${timeInfo}
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
  // Atualizar o badge após a colheita será feito quando o servidor enviar a atualização do jardim
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
    // O botão e o badge serão atualizados quando o servidor enviar a atualização do jardim
  } else {
    console.log('Não há plantas prontas para colher');
  }
}

function unlockSeed(seedId) {
  socket.emit('buyGardenUpgrade', { upgradeId: `unlock_${seedId}` });
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
    updateGardenBadge(); // Atualiza o badge quando uma planta fica pronta
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
    const resourceItem = document.querySelector(`[data-resource="${type}"]`);
    if (!resourceItem) return;
    
    // Aplica a mesma lógica de visibilidade das sementes
    const isVisible = laboratoryData.seeds[type].visible || garden[`${type}Unlocked`];
    resourceItem.style.display = isVisible ? 'flex' : 'none';
    
    // Atualiza o contador se o recurso estiver visível
    const counter = resourceItem.querySelector('.resource-count');
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
      
      // Verificar se tem recursos suficientes para desbloquear
      let hasEnoughResources = false;
      if (isLocked && seed.unlockCost) {
        hasEnoughResources = Object.entries(seed.unlockCost).every(([resource, amount]) => 
          garden.resources[resource] >= amount
        );
      }
      
      const unlockButton = isLocked && seed.unlockCost ? `
        <button class="unlock-seed-button ${hasEnoughResources ? 'can-unlock' : 'insufficient'}" data-seed="${seed.id}">
          (${Object.entries(seed.unlockCost)
            .map(([res, amt]) => `${amt} ${laboratoryData.seeds[res].icon}`)
            .join(', ')})
        </button>
      ` : '';

      // Calcular tempo ajustado se houver upgrades
      const originalTime = seed.growthTime / 1000;
      const hasUpgrades = garden.upgrades && (garden.upgrades.growthSpeed > 0 || (garden.upgrades.fertilizer && garden.upgrades.fertilizer > 0));
      const adjustedTime = hasUpgrades ? calculateAdjustedGrowthTime(seed.growthTime) / 1000 : originalTime;
      
      // Construir a exibição do tempo
      let timeDisplay = '';
      if (hasUpgrades && adjustedTime < originalTime) {
        timeDisplay = `
          <span class="time-info">
            <span class="time-original">${originalTime}s</span> → 
            <span class="time-reduced">${adjustedTime.toFixed(1)}s</span> • ${seed.difficulty}
          </span>
        `;
      } else {
        timeDisplay = `<span class="time-info">${originalTime}s • ${seed.difficulty}</span>`;
      }

      return `
        <div class="seed-option ${seed.id === garden.selectedSeed ? 'selected' : ''} 
                               ${isLocked ? 'locked' : ''} 
                               ${isLocked && hasEnoughResources ? 'can-unlock' : ''}"
             data-seed="${seed.id}">
          <span class="seed-icon">${seed.icon}</span>
          <div>
            <div>${seed.name}</div>
            ${timeDisplay}
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

// Função para atualizar o custo do slot
function updateSlotCost() {
  const slotElement = document.querySelector('[data-item="slot"]');
  if (!slotElement) return;
  
  const costElement = slotElement.querySelector('.store-item-cost');
  const titleElement = slotElement.querySelector('.store-item-title');
  const buyButton = slotElement.querySelector('.buy-button');
  
  if (!costElement || !titleElement || !buyButton) return;
  
  const garden = laboratoryData.garden;
  const upgrade = laboratoryData.gardenUpgrades.slot;
  
  // Se o upgrade não estiver disponível
  if (!upgrade) {
    costElement.textContent = 'Erro: Upgrade não encontrado';
    buyButton.disabled = true;
    return;
  }
  
  const currentLevel = garden.upgrades?.slot || 0;
  
  // Atualiza o título para mostrar o nível atual
  if (currentLevel > 0) {
    titleElement.textContent = `${upgrade.name} (${garden.unlockedSlots}/${upgrade.maxLevel})`;
  } else {
    titleElement.textContent = upgrade.name;
  }
  
  // Se já atingiu o número máximo de slots
  if (currentLevel >= upgrade.maxLevel) {
    costElement.textContent = 'Máximo de Slots';
    buyButton.disabled = true;
    buyButton.textContent = 'Máximo';
    slotElement.classList.add('purchased');
    return;
  } else {
    buyButton.disabled = false;
    buyButton.textContent = 'Comprar';
    slotElement.classList.remove('purchased');
  }
  
  // Calcular o custo do próximo slot
  const cost = upgrade.getCost(currentLevel);
  
  // Verificar se o jogador tem recursos suficientes
  const hasEnoughResources = Object.entries(cost).every(([resource, amount]) => 
    garden.resources[resource] >= amount
  );
  
  // Atualizar o visual do botão com base nos recursos
  if (!hasEnoughResources) {
    buyButton.classList.add('insufficient');
  } else {
    buyButton.classList.remove('insufficient');
  }
  
  // Formatar o texto do custo
  let costText = 'Custo: ';
  Object.entries(cost).forEach(([resource, amount], index) => {
    if (index > 0) costText += ', ';
    
    const emoji = resource === 'sunflower' ? '🌻' : 
                 resource === 'tulip' ? '🌷' : 
                 resource === 'mushroom' ? '🍄' : 
                 resource === 'crystal' ? '💎' : '';
    
    costText += `${amount} ${emoji}`;
  });
  
  costElement.textContent = costText;
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
  const upgrade = laboratoryData.gardenUpgrades.fertilizer;
  
  // Se o upgrade não estiver disponível
  if (!upgrade) {
    costElement.textContent = 'Erro: Upgrade não encontrado';
    buyButton.disabled = true;
    return;
  }
  
  const currentLevel = garden.upgrades?.fertilizer || 0;
  
  // Atualiza o título para mostrar o nível atual
  titleElement.textContent = `${upgrade.name} ${currentLevel > 0 ? `Nível ${currentLevel}` : ''}`;
  
  // Adiciona classe visual para indicar que o upgrade foi comprado
  if (currentLevel > 0) {
    fertilizerElement.classList.add('purchased');
  } else {
    fertilizerElement.classList.remove('purchased');
  }
  
  // Se atingiu o nível máximo
  if (currentLevel >= upgrade.maxLevel) {
    costElement.textContent = 'Nível Máximo';
    buyButton.disabled = true;
    buyButton.textContent = 'Máximo';
    return;
  } else {
    buyButton.disabled = false;
    buyButton.textContent = 'Comprar';
  }
  
  // Calcula o custo para o próximo nível
  try {
    const cost = upgrade.getCost(currentLevel);
    console.log('[Jardim] Custo calculado:', cost);
    
    // Verifica se o jogador tem recursos suficientes
    const hasEnoughResources = Object.entries(cost).every(([resource, amount]) => 
      garden.resources[resource] >= amount
    );
    
    // Atualiza o visual do botão com base nos recursos
    if (!hasEnoughResources) {
      buyButton.classList.add('insufficient');
    } else {
      buyButton.classList.remove('insufficient');
    }
    
    // Formatar o texto de custo
    const costText = Object.entries(cost)
      .map(([resource, amount]) => {
        const icon = resource === 'sunflower' ? '🌻' : 
                    resource === 'tulip' ? '🌷' : 
                    resource === 'mushroom' ? '🍄' : 
                    resource === 'crystal' ? '💎' : '';
        return `${amount} ${icon}`;
      })
      .join(', ');
    
    console.log('[Jardim] Texto de custo:', costText);
    costElement.textContent = `Custo: ${costText}`;
  } catch (error) {
    console.error('[Jardim] Erro ao calcular custo do fertilizante:', error);
    costElement.textContent = 'Erro ao calcular custo';
    buyButton.disabled = true;
  }
}

function getSeedIcon(seedId) {
  return laboratoryData.seeds[seedId]?.icon || '❓';
}

// Função para calcular o tempo de crescimento ajustado com base nos upgrades
function calculateAdjustedGrowthTime(baseTime) {
  const garden = laboratoryData.garden;
  const upgrades = garden.upgrades || {};
  
  // Obter os upgrades relevantes
  const gardenUpgrades = laboratoryData.gardenUpgrades;
  
  // Calcular o multiplicador de velocidade de crescimento
  let speedMultiplier = 1;
  if (upgrades.growthSpeed && gardenUpgrades.growthSpeed) {
    speedMultiplier = gardenUpgrades.growthSpeed.getEffect(upgrades.growthSpeed);
  }
  
  // Calcular o multiplicador do fertilizante
  let fertilizerMultiplier = 1;
  if (upgrades.fertilizer && gardenUpgrades.fertilizer) {
    fertilizerMultiplier = gardenUpgrades.fertilizer.getEffect(upgrades.fertilizer);
  }
  
  // Calcular o tempo de crescimento ajustado
  const adjustedTime = baseTime * speedMultiplier * fertilizerMultiplier;
  
  return adjustedTime;
}

// Função para atualizar o badge no botão do Jardim
function updateGardenBadge() {
  const openLabButton = document.getElementById('open-laboratory');
  if (!openLabButton) return;
  
  // Conta quantas plantas estão prontas para colheita
  readyPlantsCount = 0;
  const garden = laboratoryData.garden;
  
  for (const slotId in garden.plants) {
    if (garden.plants[slotId].ready) {
      readyPlantsCount++;
    }
  }
  
  // Atualiza o badge
  const existingBadge = openLabButton.querySelector('.garden-badge');
  if (readyPlantsCount > 0) {
    if (existingBadge) {
      existingBadge.textContent = readyPlantsCount;
    } else {
      const badge = document.createElement('span');
      badge.className = 'garden-badge';
      badge.textContent = readyPlantsCount;
      openLabButton.appendChild(badge);
    }
  } else if (existingBadge) {
    existingBadge.remove();
  }
}

// Função para renderizar dinamicamente os itens da loja
function updateStoreItems() {
  const storeGrid = document.querySelector('.store-grid');
  if (!storeGrid) {
    console.error('[Jardim] Elemento .store-grid não encontrado');
    return;
  }
  
  storeGrid.innerHTML = '';
  
  const { gardenUpgrades } = laboratoryData;
  const garden = laboratoryData.garden;
  
  if (!gardenUpgrades || Object.keys(gardenUpgrades).length === 0) {
    console.warn('[Jardim] Nenhum upgrade disponível');
    return;
  }
  
  // Ordenar upgrades: primeiro os não maximizados, depois os maximizados
  const sortedUpgrades = Object.entries(gardenUpgrades).sort(([idA, upgradeA], [idB, upgradeB]) => {
    const levelA = garden.upgrades?.[idA] || 0;
    const levelB = garden.upgrades?.[idB] || 0;
    const isMaxA = levelA >= upgradeA.maxLevel;
    const isMaxB = levelB >= upgradeB.maxLevel;
    
    if (isMaxA === isMaxB) return 0;
    return isMaxA ? 1 : -1;
  });
  
  sortedUpgrades.forEach(([upgradeId, upgrade]) => {
    const currentLevel = garden.upgrades?.[upgradeId] || 0;
    
    const storeItem = document.createElement('div');
    storeItem.className = 'store-item';
    storeItem.dataset.item = upgradeId;
    
    const titleElement = document.createElement('div');
    titleElement.className = 'store-item-title';
    titleElement.textContent = currentLevel > 0 ? 
      `${upgrade.name} Nível ${currentLevel}` : 
      upgrade.name;
    storeItem.appendChild(titleElement);
    
    const descElement = document.createElement('div');
    descElement.className = 'store-item-desc';
    descElement.textContent = upgrade.description;
    storeItem.appendChild(descElement);
    
    const costElement = document.createElement('div');
    costElement.className = 'store-item-cost';
    costElement.textContent = 'Carregando...';
    storeItem.appendChild(costElement);
    
    const buyButton = document.createElement('button');
    buyButton.className = 'buy-button';
    buyButton.id = `buy-lab-${upgradeId}`;
    buyButton.textContent = 'Comprar';
    storeItem.appendChild(buyButton);
    
    storeGrid.appendChild(storeItem);
    
    buyButton.addEventListener('click', () => {
      socket.emit('buyGardenUpgrade', { upgradeId });
    });
  });

  sortedUpgrades.forEach(([upgradeId]) => {
    updateGenericUpgradeCost(upgradeId);
  });
}

// Função para atualizar o custo e nível de upgrades genéricos
function updateGenericUpgradeCost(upgradeId) {
  const upgradeElement = document.querySelector(`[data-item="${upgradeId}"]`);
  if (!upgradeElement) return;
  
  const costElement = upgradeElement.querySelector('.store-item-cost');
  const titleElement = upgradeElement.querySelector('.store-item-title');
  const buyButton = upgradeElement.querySelector('.buy-button');
  
  if (!costElement || !titleElement || !buyButton) return;
  
  const garden = laboratoryData.garden;
  const upgrade = laboratoryData.gardenUpgrades[upgradeId];
  
  if (!upgrade) {
    costElement.textContent = 'Erro: Upgrade não encontrado';
    buyButton.disabled = true;
    return;
  }
  
  const currentLevel = garden.upgrades?.[upgradeId] || 0;
  
  titleElement.textContent = currentLevel > 0 ? 
    `${upgrade.name} Nível ${currentLevel}` : 
    upgrade.name;
  
  if (currentLevel > 0) {
    upgradeElement.classList.add('purchased');
  } else {
    upgradeElement.classList.remove('purchased');
  }
  
  if (currentLevel >= upgrade.maxLevel) {
    costElement.textContent = 'Nível Máximo';
    buyButton.disabled = true;
    buyButton.textContent = 'Máximo';
    return;
  }
  
  buyButton.disabled = false;
  buyButton.textContent = 'Comprar';
  
  try {
    const cost = upgrade.getCost(currentLevel);
    const hasEnoughResources = Object.entries(cost).every(([resource, amount]) => 
      garden.resources[resource] >= amount
    );
    
    buyButton.classList.toggle('insufficient', !hasEnoughResources);
    
    const costText = Object.entries(cost)
      .map(([resource, amount]) => {
        const emoji = resource === 'sunflower' ? '🌻' : 
                     resource === 'tulip' ? '🌷' : 
                     resource === 'mushroom' ? '🍄' : 
                     resource === 'crystal' ? '💎' : '';
        return `${amount} ${emoji}`;
      })
      .join(', ');
    
    costElement.textContent = `Custo: ${costText}`;
  } catch (error) {
    console.error(`[Jardim] Erro ao calcular custo do upgrade ${upgradeId}:`, error);
    costElement.textContent = 'Erro ao calcular custo';
    buyButton.disabled = true;
  }
}