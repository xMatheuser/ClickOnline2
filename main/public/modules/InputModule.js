import { socket, setUserInteraction } from './CoreModule.js';
import { showNotification } from './UIModule.js';

export let isSpacePressed = false;
export let clickCountThisSecond = 0;

const clickArea = document.getElementById('click-area');
const fullscreenButton = document.getElementById('fullscreen-toggle');

export function initInput() {
  clickArea.addEventListener('click', () => {
    setUserInteraction(true);
    socket.emit('click');
    clickCountThisSecond++;
  });

  clickArea.addEventListener('touchstart', (event) => {
    setUserInteraction(true);
    event.preventDefault();
    socket.emit('click');
    clickCountThisSecond++;
    clickArea.classList.add('active');
  });

  clickArea.addEventListener('touchend', () => {
    clickArea.classList.remove('active');
  });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !isSpacePressed) {
      setUserInteraction(true);
      event.preventDefault();
      isSpacePressed = true;
      socket.emit('click');
      clickCountThisSecond++;
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

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.log(`Erro ao entrar em fullscreen: ${err.message}`));
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}