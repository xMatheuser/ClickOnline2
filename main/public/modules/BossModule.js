import { socket, gameState } from './CoreModule.js';
import { showNotification } from './UIModule.js';

export function initBoss() {
  const surrenderButton = document.getElementById('surrender-boss');
  
  surrenderButton.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja desistir? Você perderá moedas!')) {
      socket.emit('surrenderBoss');
    }
  });

  socket.on('bossSpawn', showBossFight);
  socket.on('bossUpdate', updateBoss);
  socket.on('bossResult', (result) => {
    if (result.surrendered) {
      showNotification(`${result.surrenderedBy} desistiu da luta! Penalidade: ${result.penalty} moedas`);
    }
    handleBossResult(result);
  });
}

function showBossFight(bossData) {
  const bossOverlay = document.querySelector('.boss-overlay');
  const bossContainer = document.querySelector('.boss-container');
  const bossImage = document.querySelector('.boss-image');

  bossOverlay.classList.add('active');
  startParticleEffect(bossData.particles);
  updateBossHealth(bossData.health, bossData.maxHealth);

  bossImage.src = bossData.image;
  bossImage.onerror = () => {
    console.error('Erro ao carregar imagem do boss:', bossData.image);
    bossImage.src = 'assets/bosses/default_boss.png';
  };

  bossContainer.onclick = (e) => {
    socket.emit('click');
  };
}

function updateBoss({ health, maxHealth, damage, playerName }) {
  updateBossHealth(health, maxHealth);
  showBossDamage(damage, playerName);
}

function handleBossResult(result) {
  if (result.victory) {
    showNotification(`Boss derrotado por ${result.killedBy}!\nRecompensa: ${result.coins} moedas\nPoder de clique multiplicado por ${result.multiplier}x por ${result.duration / 1000} segundos!`);
  } else {
    showNotification(`Boss não foi derrotado a tempo!\nPenalidade: ${result.penalty} moedas perdidas...`);
  }
  hideBossFight();
}

function updateBossHealth(current, max) {
  const healthFill = document.querySelector('.boss-health-fill');
  const healthText = document.querySelector('.boss-health-text');
  const percentage = (current / max * 100).toFixed(2);
  healthFill.style.width = `${percentage}%`;
  healthText.textContent = `${Math.ceil(current).toLocaleString()} / ${Math.ceil(max).toLocaleString()} HP`;
}

function showBossDamage(damage, playerName) {
  const container = document.querySelector('.boss-container');
  const damageEl = document.createElement('div');
  damageEl.className = 'boss-damage';
  damageEl.textContent = `${playerName}: -${Math.ceil(damage)}`;
  const x = Math.random() * 200 - 100;
  const y = Math.random() * 100 - 50;
  damageEl.style.left = `calc(50% + ${x}px)`;
  damageEl.style.top = `calc(50% + ${y}px)`;
  container.appendChild(damageEl);
  setTimeout(() => damageEl.remove(), 1000);
}

function startParticleEffect(config) {
  const container = document.querySelector('.boss-container');
  setInterval(() => {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.backgroundColor = config.color;
    particle.style.width = '4px';
    particle.style.height = '4px';
    const startX = Math.random() * container.offsetWidth;
    particle.style.left = `${startX}px`;
    particle.style.top = '-4px';
    container.appendChild(particle);
    let posY = -4;
    const interval = setInterval(() => {
      posY += config.speed;
      particle.style.top = `${posY}px`;
      if (posY > container.offsetHeight) {
        clearInterval(interval);
        particle.remove();
      }
    }, 16);
  }, 100);
}

function hideBossFight() {
  const bossOverlay = document.querySelector('.boss-overlay');
  bossOverlay.classList.remove('active');
}