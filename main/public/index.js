import { initStartScreen } from './modules/CoreModule.js';
import { initHistory } from './modules/HistoryModule.js';
import { initSplitButtonVisibility } from './modules/SplitButtonModule.js';
import { initCharacterSelection } from './modules/CharacterModule.js';
import { initWiki } from './modules/WikiModule.js';

window.onload = function() {
  initStartScreen();
  initHistory();
  initSplitButtonVisibility();
  initCharacterSelection();
  initWiki();
};