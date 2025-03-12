import { socket, setUserInteraction, gameState } from './CoreModule.js';
import { showNotification, showDamageNumber } from './UIModule.js';

export let isSpacePressed = false;
export let clickCountThisSecond = 0;

const clickArea = document.getElementById('click-area');
const fullscreenButton = document.getElementById('fullscreen-toggle');

let clicksLastSecond = 0;

export function getClicksPerSecond() {
  return clicksLastSecond;
}

export function initInput() {
  clickArea.addEventListener('click', () => {
    handleClick();
  });

  clickArea.addEventListener('touchstart', (event) => {
    event.preventDefault();
    handleClick();
    clickArea.classList.add('active');
  });

  clickArea.addEventListener('touchend', () => {
    clickArea.classList.remove('active');
  });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !isSpacePressed) {
      event.preventDefault();
      isSpacePressed = true;
      handleClick();
      clickArea.classList.add('active');
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.code === 'KeyP') {
      isSpacePressed = false;
      clickArea.classList.remove('active');
    }
  });

  fullscreenButton.addEventListener('click', toggleFullscreen);
}

function handleClick() {
  setUserInteraction(true);
  socket.emit('click');
  clicksLastSecond++;
  setTimeout(() => clicksLastSecond--, 1000);

  const rect = clickArea.getBoundingClientRect();
  const player = gameState.players.find(p => p.id === socket.id);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.log(`Erro ao entrar em fullscreen: ${err.message}`));
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}