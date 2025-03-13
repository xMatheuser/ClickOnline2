import { initStartScreen } from './modules/CoreModule.js';
import { initHistory } from './modules/HistoryModule.js';

window.addEventListener('load', () => {
  initStartScreen();
  initHistory();
});