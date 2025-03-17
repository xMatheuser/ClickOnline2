import { initStartScreen } from './modules/CoreModule.js';
import { initHistory } from './modules/HistoryModule.js';
import { initSplitButtonVisibility } from './modules/SplitButtonModule.js';

window.addEventListener('load', () => {
  initStartScreen();
  initHistory();
  initSplitButtonVisibility();
});