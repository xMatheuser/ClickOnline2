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
  const startScreen = document.getElementById('start-screen');
  const startGameButton = document.getElementById('start-game-button');
  const startPlayerNameInput = document.getElementById('start-player-name');
  const startError = document.getElementById('start-error');
  const gameContainer = document.getElementById('game-container');
  
  if (!startGameButton || !startPlayerNameInput || !startError || !gameContainer) {
    console.error('Failed to find required start screen elements');
    return;
  }

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
  }, 500);
}

export function initGame() {
  initInput();
  initUI();
  initAudio();
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
  gameState = newState;
}

export function setUserInteraction(value) {
  userHasInteracted = value;
}