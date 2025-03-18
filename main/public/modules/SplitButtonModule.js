// SplitButtonModule.js
// Este módulo garante que o split-button fique oculto quando qualquer overlay estiver ativo

export function initSplitButtonVisibility() {
  const splitButton = document.querySelector('.split-button');
  if (!splitButton) return;

  // Função para verificar se algum overlay está ativo
  function checkOverlays() {
    // Verificar overlays que usam a classe 'active'
    const anyOverlayActive = document.querySelector('.prestige-overlay.active, .achievements-overlay.active, .bonus-stats-overlay.active, .history-overlay.active, .boss-overlay.active, .character-selection-overlay.active');
    
    // Verificar especificamente o garden overlay que pode usar display:flex
    const gardenOverlay = document.querySelector('.garden-overlay');
    const isGardenActive = gardenOverlay && 
      (gardenOverlay.classList.contains('active') || 
       gardenOverlay.style.display === 'flex' || 
       getComputedStyle(gardenOverlay).display === 'flex');
    
    if (anyOverlayActive || isGardenActive) {
      // Ocultar o botão quando um overlay estiver ativo
      splitButton.style.display = 'none';
    } else {
      // Mostrar o botão quando nenhum overlay estiver ativo
      splitButton.style.display = 'flex';
    }
  }

  // Adicionar um observer para monitorar mudanças no elemento body
  // Isso detectará quando overlays são adicionados ou removidos
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' || mutation.type === 'childList') {
        checkOverlays();
      }
    });
  });

  // Iniciar a observação do elemento body
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true
  });

  // Escutar o evento personalizado para mudanças de estado do overlay
  document.addEventListener('overlayStateChanged', (event) => {
    if (event.detail && event.detail.isOpen !== undefined) {
      if (event.detail.isOpen) {
        // Um overlay foi aberto
        splitButton.style.display = 'none';
      } else {
        // Um overlay foi fechado
        // Verificar se ainda há outros overlays abertos
        checkOverlays();
      }
    }
  });

  // Também verificar quando overlays são mostrados ou escondidos
  const overlays = [
    '.prestige-overlay',
    '.achievements-overlay',
    '.bonus-stats-overlay',
    '.garden-overlay',
    '.history-overlay',
    '.boss-overlay'
  ];

  overlays.forEach(selector => {
    const overlay = document.querySelector(selector);
    if (overlay) {
      // Quando o overlay é mostrado ou escondido
      overlay.addEventListener('transitionend', checkOverlays);
      
      // Verificar também quando classes são adicionadas/removidas
      overlay.addEventListener('classlist', checkOverlays);
      
      // Verificar imediatamente quando o overlay é clicado
      overlay.addEventListener('click', () => {
        // Pequeno atraso para garantir que a classe 'active' já foi atualizada
        setTimeout(checkOverlays, 50);
      });
    }
  });
  
  // Verificar estado inicial
  checkOverlays();
} 