import { laboratoryData } from './LaboratoryModule.js';
import { showNotification } from './UIModule.js';

export function saveGameState() {
  try {
    localStorage.setItem('laboratoryData', JSON.stringify(laboratoryData));
    localStorage.setItem('lastSaveTime', Date.now().toString());
  } catch (e) {
    console.error('Error saving game state:', e);
  }
}

export function loadGameState() {
  try {
    const savedLaboratoryData = localStorage.getItem('laboratoryData');
    if (savedLaboratoryData) {
      Object.assign(laboratoryData, JSON.parse(savedLaboratoryData));
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
  const pointsGained = laboratoryData.pointsPerSecond * seconds;
  laboratoryData.researchPoints += pointsGained;
  Object.entries(laboratoryData.garden.plants).forEach(([slotId, plant]) => {
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