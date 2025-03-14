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
let gameState = { players: [] };
let lastReceivedState = {};

export { socket, gameState };

export let userHasInteracted = false;
export let upgradeHistory = { tier1: [], tier2: [], tier3: [] };

const startScreen = document.getElementById('start-screen');
const startPlayerNameInput = document.getElementById('start-player-name');
const startGameButton = document.getElementById('start-game-button');
const startError = document.getElementById('start-error');
const gameContainer = document.getElementById('game-container');

export function initStartScreen() {
  console.log('Initializing start screen...');
  // Inicializa o tema antes de tudo
  initTheme();
  
  const startScreen = document.getElementById('start-screen');
  const startGameButton = document.getElementById('start-game-button');
  const startPlayerNameInput = document.getElementById('start-player-name');
  const startError = document.getElementById('start-error');
  const gameContainer = document.getElementById('game-container');
  
  if (!startGameButton || !startPlayerNameInput || !startError || !gameContainer) {
    console.error('Failed to find required start screen elements');
    return;
  }

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
  gameContainer.style.display = 'none';

  startGameButton.addEventListener('click', () => {
    console.log('Start button clicked');
    setUserInteraction(true);
    startGame();
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
      // Atualização completa
      gameState = update;
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
  const startPlayerNameInput = document.getElementById('start-player-name');
  const startError = document.getElementById('start-error');
  const startScreen = document.getElementById('start-screen');
  const gameContainer = document.getElementById('game-container');

  if (!startPlayerNameInput || !startError || !startScreen || !gameContainer) {
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
  gameContainer.style.display = 'block';
  
  setTimeout(() => {
    startScreen.style.display = 'none';
    gameContainer.style.opacity = '1';
    document.querySelector('.top-bar').classList.add('visible');
    initGame();
    // Add initial UI render after game initialization
    import('./UIModule.js').then(module => {
      module.renderUpgrades();
    });
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