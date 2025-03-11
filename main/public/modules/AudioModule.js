export const levelUpSound = new Audio('/assets/sounds/levelUp.mp3');
export const tickSound = new Audio('/assets/sounds/tick.mp3');
export const achievementSound = new Audio('/assets/sounds/achievement.mp3');
let isMuted = localStorage.getItem('isMuted') === 'true';
const muteButton = document.getElementById('mute-toggle');

export function initAudio() {
  levelUpSound.volume = isMuted ? 0 : 0.1;
  tickSound.volume = isMuted ? 0 : 0.6;
  achievementSound.volume = isMuted ? 0 : 0.2;

  muteButton.addEventListener('click', toggleMute);
  updateMuteButton();
}

export function playSound(sound) {
  if (!isMuted) sound.play().catch(err => console.log('[Audio Error]:', err));
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('isMuted', isMuted);
  updateMuteButton();
  levelUpSound.volume = isMuted ? 0 : 0.1;
  tickSound.volume = isMuted ? 0 : 0.6;
  achievementSound.volume = isMuted ? 0 : 0.2;
}

function updateMuteButton() {
  const icon = muteButton.querySelector('.mute-icon');
  icon.textContent = isMuted ? '🔇' : '🔊';
}