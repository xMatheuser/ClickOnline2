import { socket, initStartScreen } from './modules/CoreModule.js';

const startScreen = document.getElementById('start-screen');
const startPlayerNameInput = document.getElementById('start-player-name');
const startGameButton = document.getElementById('start-game-button');
const gameContainer = document.getElementById('game-container');

function initGame() {
  startScreen.style.display = 'flex';
  gameContainer.style.display = 'none';

  startGameButton.addEventListener('click', () => {
    const playerName = startPlayerNameInput.value.trim();
    if (playerName) {
      socket.emit('addPlayer', { name: playerName });
      startScreen.style.display = 'none';
      gameContainer.style.display = 'block';
    }
  });
}

window.addEventListener('load', () => {
  initStartScreen();
  socket.on('connect', () => {
    console.log('Connected to server');
  });
});