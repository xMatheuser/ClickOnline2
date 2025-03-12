import { socket, gameState, isOwnPlayer } from './CoreModule.js';
import { showNotification } from './UIModule.js';

const activateClickFrenzyButton = document.getElementById('activate-click-frenzy');

export function initPowerUps() {
  activateClickFrenzyButton.addEventListener('click', () => {
    if (!isOwnPlayer()) {
      showNotification('Você só pode ativar power-ups quando for o jogador ativo!');
      return;
    }
    socket.emit('activatePowerUp');
    activateClickFrenzyButton.style.display = 'none';
    scheduleNextSpawn();
  });

  socket.on('powerUpActivated', showPowerupNotification);
  scheduleFirstPowerUp();
}

function arePowerUpsUnlocked() {
  const powerupsUpgrade = gameState?.prestigeUpgrades?.find(u => u.id === 'powerups-unlock');
  return powerupsUpgrade?.level > 0;
}

function scheduleFirstPowerUp() {
  if (!arePowerUpsUnlocked()) {
    console.log('[PowerUp] Sistema bloqueado - Compre o upgrade de prestígio');
    return;
  }
  const randomDelay = 15000; // 15 segundos fixos
  console.log(`[PowerUp] Próximo power-up em ${(randomDelay / 1000).toFixed(0)} segundos`);
  setTimeout(spawnFloatingPowerUp, randomDelay);
}

function spawnFloatingPowerUp() {
  if (!arePowerUpsUnlocked()) return;
  
  // Posiciona o botão aleatoriamente na tela
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const buttonWidth = activateClickFrenzyButton.offsetWidth;
  const buttonHeight = activateClickFrenzyButton.offsetHeight;
  const topBarHeight = document.querySelector('.top-bar').offsetHeight || 60;
  
  const randomX = Math.floor(Math.random() * (viewportWidth - buttonWidth - 20)) + 10;
  const randomY = Math.floor(Math.random() * (viewportHeight - buttonHeight - 20 - topBarHeight)) + topBarHeight + 10;

  activateClickFrenzyButton.style.left = `${randomX}px`;
  activateClickFrenzyButton.style.top = `${randomY}px`;
  activateClickFrenzyButton.style.display = 'block';

  // Escolhe uma cor aleatória dos power-ups disponíveis
  const availableColors = Object.values(gameState.powerUps).map(p => p.color);
  const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
  activateClickFrenzyButton.style.backgroundColor = randomColor;

  // Remove o botão após 60 segundos se não for clicado
  setTimeout(() => {
    if (activateClickFrenzyButton.style.display === 'block') {
      activateClickFrenzyButton.style.display = 'none';
      scheduleNextSpawn();
    }
  }, 60000); // 60 segundos
}

function scheduleNextSpawn() {
  const randomDelay = 15000; // 15 segundos fixos
  console.log(`[PowerUp] Próximo power-up em ${(randomDelay / 1000).toFixed(0)} segundos`);
  setTimeout(spawnFloatingPowerUp, randomDelay);
}

function showPowerupNotification(powerUpInfo) {
  const powerupNotification = document.getElementById('powerup-notification');
  powerupNotification.textContent = `${powerUpInfo.name} ativado! ${powerUpInfo.description} por ${powerUpInfo.duration / 1000} segundos!`;
  powerupNotification.style.backgroundColor = powerUpInfo.color;
  powerupNotification.classList.add('show');
  setTimeout(() => powerupNotification.classList.remove('show'), 10000);
}