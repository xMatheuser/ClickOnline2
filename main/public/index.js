import { initStartScreen } from './modules/CoreModule.js';
import { initHistory } from './modules/HistoryModule.js';
import { initSplitButtonVisibility } from './modules/SplitButtonModule.js';
import { initCharacterSelection } from './modules/CharacterModule.js';

window.addEventListener('load', () => {
  initStartScreen();
  initHistory();
  initSplitButtonVisibility();
  initCharacterSelection();
});