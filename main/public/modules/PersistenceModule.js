import { gardenData } from './GardenModule.js';
import { showNotification } from './UIModule.js';

export function saveGameState() {
  try {
    localStorage.setItem('gardenData', JSON.stringify(gardenData));
    localStorage.setItem('lastSaveTime', Date.now().toString());
  } catch (e) {
    console.error('Error saving game state:', e);
  }
}

export function loadGameState() {
  try {
    const savedGardenData = localStorage.getItem('gardenData');
    if (savedGardenData) {
      Object.assign(gardenData, JSON.parse(savedGardenData));
    }
    const lastSaveTime = parseInt(localStorage.getItem('lastSaveTime') || '0');
    const timeDiff = Date.now() - lastSaveTime;
    if (timeDiff > 0) processOfflineProgress(timeDiff);
  } catch (e) {
    console.error('Error loading game state:', e);
  }
}

function processOfflineProgress(timeDiff) {
  const seconds = Math.floor(timeDiff / 1000);
  const pointsGained = gardenData.pointsPerSecond * seconds;
  gardenData.researchPoints += pointsGained;
  Object.entries(gardenData.garden.plants).forEach(([slotId, plant]) => {
    if (!plant.ready && Date.now() - plant.plantedAt >= plant.growthTime) {
      plant.ready = true;
    }
  });
  if (pointsGained > 0) {
    showNotification(`Progresso Offline:\n+${Math.floor(pointsGained)} pontos de pesquisa\nPlantações atualizadas!`);
  }
}

setInterval(saveGameState, 60000);
window.addEventListener('beforeunload', saveGameState);