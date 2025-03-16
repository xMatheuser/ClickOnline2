import { initInput } from './InputModule.js';
import { initUI } from './UIModule.js';
import { initAudio } from './AudioModule.js';
import { initPrestige } from './PrestigeModule.js';
import { initPowerUps } from './PowerUpModule.js';
import { initBoss } from './BossModule.js';
import { initLaboratory } from './LaboratoryModule.js';
import { loadGameState } from './PersistenceModule.js';
import { initTheme } from './ThemeModule.js';

const socket = io();
let gameState = { 
  players: [],
  gardens: {
    sharedGarden: {
      unlockedSlots: 1,
      resources: {},
      plants: {},
      upgrades: {},
      unlockedResources: {
        sunflower: true
      }
    }
  }
};
let lastReceivedState = {};

export { socket, gameState };

export let userHasInteracted = false;
export let upgradeHistory = { tier1: [], tier2: [], tier3: [] };

const startScreen = document.getElementById('start-screen');
const startPlayerNameInput = document.getElementById('start-player-name');
const startGameButton = document.getElementById('start-game-button');
const startError = document.getElementById('start-error');
const newPlayerSection = document.getElementById('new-player-section');
const savedPlayersSection = document.getElementById('saved-players-section');
const savedPlayersList = document.getElementById('saved-players-list');
const newPlayerButton = document.getElementById('new-player-button');

function loadSavedPlayers() {
  const savedPlayers = JSON.parse(localStorage.getItem('savedPlayers') || '[]');
  return savedPlayers;
}

function savePlayer(playerName) {
  const savedPlayers = loadSavedPlayers();
  if (!savedPlayers.includes(playerName)) {
    savedPlayers.push(playerName);
    localStorage.setItem('savedPlayers', JSON.stringify(savedPlayers));
  }
}

function deletePlayer(playerName) {
  const savedPlayers = loadSavedPlayers();
  const index = savedPlayers.indexOf(playerName);
  if (index > -1) {
    savedPlayers.splice(index, 1);
    localStorage.setItem('savedPlayers', JSON.stringify(savedPlayers));
  }
}

function renderSavedPlayers() {
  const savedPlayers = loadSavedPlayers();
  if (savedPlayers.length > 0) {
    savedPlayersSection.style.display = 'block';
    newPlayerSection.style.display = 'none';
    
    savedPlayersList.innerHTML = savedPlayers
      .map(player => `
        <div class="saved-player-item">
          <span>${player}</span>
          <button class="delete-player" data-player="${player}">×</button>
        </div>
      `).join('');
  } else {
    savedPlayersSection.style.display = 'none';
    newPlayerSection.style.display = 'block';
  }
}

export function initStartScreen() {
  console.log('Initializing start screen...');
  initTheme();
  
  if (!startGameButton || !startPlayerNameInput || !startError) {
    console.error('Failed to find required start screen elements');
    return;
  }

  renderSavedPlayers();

  savedPlayersList.addEventListener('click', (e) => {
    const playerItem = e.target.closest('.saved-player-item');
    const deleteButton = e.target.closest('.delete-player');
    
    if (deleteButton) {
      const playerName = deleteButton.dataset.player;
      deletePlayer(playerName);
      renderSavedPlayers();
    } else if (playerItem) {
      const playerName = playerItem.querySelector('span').textContent;
      startPlayerNameInput.value = playerName;
      setUserInteraction(true);
      startGame();
    }
  });

  newPlayerButton.addEventListener('click', () => {
    savedPlayersSection.style.display = 'none';
    newPlayerSection.style.display = 'block';
    startPlayerNameInput.value = '';
    startPlayerNameInput.focus();
  });

  // Modificar o evento de início do jogo para salvar o jogador
  startGameButton.addEventListener('click', () => {
    console.log('Start button clicked');
    const playerName = startPlayerNameInput.value.trim();
    if (playerName) {
      savePlayer(playerName);
      setUserInteraction(true);
      startGame();
    }
  });

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('gameStateUpdate', (newState) => {
    if (!newState?.players) {
      console.error('Invalid game state received');
      return;
    }
    
    updateGameState(newState);
    import('./UIModule.js').then(module => {
      module.handleGameStateUpdate(newState);
    }).catch(error => {
      console.error('Error updating UI:', error);
    });
  });

  startScreen.style.display = 'flex';
  document.querySelectorAll('.floating-window').forEach(window => {
    window.style.display = 'none';
  });

  startPlayerNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      console.log('Enter pressed in name input');
      setUserInteraction(true);  
      startGame();
    }
  });
}

export function initSocket() {
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('gameStateUpdate', (update) => {
    if (update.type === 'delta') {
      // Aplicar apenas as mudanças
      Object.assign(gameState, update);
      lastReceivedState = {...gameState};
    } else {
      // Preserve garden data
      const savedGardens = gameState.gardens;
      // Atualização completa
      gameState = update;
      // Restore garden data if not present in update
      if (!gameState.gardens) {
        gameState.gardens = savedGardens;
      }
      lastReceivedState = {...update};
    }

    import('./UIModule.js').then(module => {
      module.handleGameStateUpdate(gameState);
    });
  });

  socket.on('notification', (message) => {
    import('./UIModule.js').then(module => {
      module.showNotification(message);
    });
  });

  socket.on('prestige', () => {
    console.log('Prestige event received');
    // Preservar dados importantes
    const savedAchievements = gameState.achievements;
    const savedStats = gameState.bonusStats;
    const savedBoosts = gameState.achievementBoosts;
    const savedCategories = gameState.achievementCategories;
    const savedPrestige = {}; // Preservar dados de prestígio atualizados
    
    // Atualizar e salvar dados de prestígio
    gameState.players.forEach(p => {
      savedPrestige[p.id] = {
        prestige: (p.prestige || 0) + 1,
        prestigeMultiplier: 1 + ((p.prestige || 0) + 1) * 0.1
      };
    });
    
    // Resetar upgrades
    gameState.upgrades.forEach(u => u.level = 0);
    upgradeHistory = { tier1: [], tier2: [], tier3: [] };
    
    // Restaurar e atualizar todos os dados preservados
    gameState.achievements = savedAchievements;
    gameState.bonusStats = savedStats;
    gameState.achievementBoosts = savedBoosts;
    gameState.achievementCategories = savedCategories;
    
    // Atualizar dados de prestígio para cada jogador
    gameState.players.forEach(p => {
      if (p.id && savedPrestige[p.id]) {
        p.prestige = savedPrestige[p.id].prestige;
        p.prestigeMultiplier = savedPrestige[p.id].prestigeMultiplier;
      }
    });
  });

  socket.on('bossResult', (result) => {
    // Preservar dados antes da atualização
    const savedAchievements = gameState.achievements;
    const savedStats = gameState.bonusStats;
    const savedBoosts = gameState.achievementBoosts;
    const savedCategories = gameState.achievementCategories;
  
    // Processar resultado
    if (result.surrendered) {
      gameState.isInBossFight = false;
      gameState.activeBoss = null;
      
      // Restaurar dados preservados
      gameState.achievements = savedAchievements;
      gameState.bonusStats = savedStats;
      gameState.achievementBoosts = savedBoosts;
      gameState.achievementCategories = savedCategories;

      broadcastGameState();
    }
    
    broadcastGameState();
  });
}

function broadcastGameState() {
  // Preservar dados importantes
  const savedAchievements = gameState.achievements;
  const savedStats = gameState.bonusStats;
  const savedBoosts = gameState.achievementBoosts;
  const savedCategories = gameState.achievementCategories;
  
  // Emitir estado para todos
  socket.emit('gameStateUpdate', gameState);
  
  // Restaurar dados preservados
  gameState.achievements = savedAchievements;
  gameState.bonusStats = savedStats;
  gameState.achievementBoosts = savedBoosts;
  gameState.achievementCategories = savedCategories;
}

export function startGame() {
  console.log('Starting game...');
  if (!startPlayerNameInput || !startError || !startScreen) {
    console.error('Failed to find required game elements');
    return;
  }

  const playerName = startPlayerNameInput.value.trim();
  if (playerName === '') {
    startError.textContent = 'Por favor, insira um nome!';
    return;
  }
  socket.emit('addPlayer', { name: playerName });
  
  startScreen.style.opacity = '0';
  document.querySelectorAll('.floating-window').forEach(window => {
    window.style.display = 'block';
  });
  
  // Exibir o split button
  const splitButton = document.querySelector('.split-button');
  if (splitButton) {
    splitButton.style.display = 'flex';
    
    // Adicionar listener para o toggle do menu
    const menuToggle = splitButton.querySelector('#layout-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        splitButton.classList.toggle('active');
      });
      
      // Fechar menu ao clicar fora
      document.addEventListener('click', (e) => {
        if (!splitButton.contains(e.target)) {
          splitButton.classList.remove('active');
        }
      });
    }
  }
  
  setTimeout(() => {
    startScreen.style.display = 'none';
    document.querySelectorAll('.floating-window').forEach(window => {
      window.style.opacity = '1';
    });
    document.querySelector('.top-bar').classList.add('visible');
    initGame();
  }, 500);
}

export function initGame() {
  initSocket();
  initInput();
  initUI();
  initAudio(); // Garantir que esta linha está presente e na ordem correta
  initPrestige();
  initPowerUps();
  initBoss();
  initLaboratory();
  initTheme();
}

export function isOwnPlayer() {
  return gameState.players.some(player => player.id === socket.id);
}

export function updateGameState(newState) {
  // Preservar dados importantes
  const savedAchievements = gameState.achievements;
  const savedStats = gameState.bonusStats;
  const savedBoosts = gameState.achievementBoosts;
  const savedCategories = gameState.achievementCategories;
  const savedPrestige = {}; // Preservar dados de prestígio
  
  // Salvar dados de prestígio para cada jogador
  if (gameState.players) {
    gameState.players.forEach(player => {
      if (player.id) {
        savedPrestige[player.id] = {
          prestige: player.prestige || 0,
          prestigeMultiplier: player.prestigeMultiplier || 1
        };
      }
    });
  }
  
  // Atualizar estado
  gameState = newState;
  
  // Restaurar dados preservados
  if (!gameState.achievements) gameState.achievements = savedAchievements;
  if (!gameState.bonusStats) gameState.bonusStats = savedStats;
  if (!gameState.achievementBoosts) gameState.achievementBoosts = savedBoosts;
  if (!gameState.achievementCategories) gameState.achievementCategories = savedCategories;

  // Restaurar dados de prestígio para cada jogador
  if (gameState.players) {
    gameState.players.forEach(player => {
      if (player.id && savedPrestige[player.id]) {
        player.prestige = savedPrestige[player.id].prestige;
        player.prestigeMultiplier = savedPrestige[player.id].prestigeMultiplier;
      }
    });
  }
}

export function setUserInteraction(value) {
  userHasInteracted = value;
}