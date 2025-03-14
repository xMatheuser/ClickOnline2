import { gameState } from './CoreModule.js';
import { showNotification } from './UIModule.js';

export function saveGameState() {
  try {
    localStorage.setItem('laboratoryData', JSON.stringify(gameState.laboratory));
    localStorage.setItem('lastSaveTime', Date.now().toString());
  } catch (e) {
    console.error('Error saving game state:', e);
  }
}

export function loadGameState() {
  try {
    const savedLaboratoryData = localStorage.getItem('laboratoryData');
    if (savedLaboratoryData) {
      gameState.laboratory = JSON.parse(savedLaboratoryData);
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
  const garden = gameState.laboratory.garden;
  
  // Update plants that grew while offline
  Object.entries(garden.plants).forEach(([slotId, plant]) => {
    if (!plant.ready && Date.now() - plant.plantedAt >= plant.growthTime) {
      plant.ready = true;
    }
  });
  
  showNotification(`Progresso Offline:\nPlantações atualizadas!`);
}

setInterval(saveGameState, 60000);
window.addEventListener('beforeunload', saveGameState);