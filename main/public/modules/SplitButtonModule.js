// SplitButtonModule.js
export function initSplitButtonVisibility() {
  console.log('[SplitButtonModule] Inicializando...');
  const splitButton = document.querySelector('.split-button');
  if (!splitButton) {
    console.error('[SplitButtonModule] Elemento .split-button não encontrado!');
    return;
  }

  const mainButton = document.getElementById('layout-menu-toggle');
  const splitContent = document.querySelector('.split-content');
  
  if (!mainButton || !splitContent) {
    console.error('[SplitButtonModule] Elementos necessários não encontrados:', {
      mainButton: !!mainButton,
      splitContent: !!splitContent
    });
    return;
  }

  console.log('[SplitButtonModule] Botões configurados, adicionando eventos');

  // Função para abrir o menu
  function openMenu() {
    console.log('[SplitButtonModule] Abrindo menu');
    splitContent.style.visibility = 'visible';
    splitContent.style.opacity = '1';
    splitContent.style.transform = 'translateY(0)';
    splitContent.style.pointerEvents = 'all';
    mainButton.setAttribute('aria-expanded', 'true');
    splitContent.setAttribute('aria-hidden', 'false');
  }

  // Função para fechar o menu
  function closeMenu() {
    console.log('[SplitButtonModule] Fechando menu');
    splitContent.style.opacity = '0';
    splitContent.style.transform = 'translateY(10px)';
    splitContent.style.pointerEvents = 'none';
    setTimeout(() => {
      splitContent.style.visibility = 'hidden';
    }, 300); // Tempo para animação, ajuste conforme CSS
    mainButton.setAttribute('aria-expanded', 'false');
    splitContent.setAttribute('aria-hidden', 'true');
  }

  // Verifica se o menu está aberto com base na visibilidade
  function isMenuOpen() {
    return splitContent.style.visibility === 'visible';
  }

  // Evento de clique no botão principal
  mainButton.addEventListener('click', (e) => {
    console.log('[SplitButtonModule] Botão principal clicado!');
    e.preventDefault();
    e.stopPropagation();
    
    mainButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      mainButton.style.transform = '';
    }, 100);
    
    if (isMenuOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Fechar o menu ao clicar em itens
  const menuItems = splitContent.querySelectorAll('button');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      console.log('[SplitButtonModule] Item do menu clicado, fechando menu');
      setTimeout(closeMenu, 50);
    });
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (isMenuOpen() && 
        !splitButton.contains(e.target) && 
        e.target !== mainButton) {
      console.log('[SplitButtonModule] Clique fora detectado, fechando...');
      closeMenu();
    }
  });

  // Fechar com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen()) {
      console.log('[SplitButtonModule] Tecla Escape pressionada, fechando menu');
      closeMenu();
      e.preventDefault();
    }
  });

  // Estado inicial: menu fechado
  splitContent.style.visibility = 'hidden';
  splitContent.style.opacity = '0';
  splitContent.style.pointerEvents = 'none';

  // Verificar overlays com debounce
  let debounceTimeout;
  function checkOverlays() {
    try {
      const anyOverlayActive = document.querySelector('.prestige-overlay.active, .achievements-overlay.active, .bonus-stats-overlay.active, .history-overlay.active, .boss-overlay.active, .character-selection-overlay.active, .wiki-overlay.active');
      const gardenOverlay = document.querySelector('.garden-overlay');
      const isGardenActive = gardenOverlay && 
        (gardenOverlay.classList.contains('active') || 
         gardenOverlay.style.display === 'flex' || 
         getComputedStyle(gardenOverlay).display === 'flex');
      
      const isAnyOverlayActive = anyOverlayActive || isGardenActive;
      const currentDisplay = splitButton.style.display || 'flex';

      if (isAnyOverlayActive && currentDisplay !== 'none') {
        console.log('[SplitButtonModule] Overlay ativo detectado, ocultando botão');
        splitButton.style.display = 'none';
        if (isMenuOpen()) {
          closeMenu();
        }
      } else if (!isAnyOverlayActive && currentDisplay !== 'flex') {
        console.log('[SplitButtonModule] Nenhum overlay ativo, mostrando botão');
        splitButton.style.display = 'flex';
      }
    } catch (error) {
      console.error('[SplitButtonModule] Erro ao verificar overlays:', error);
    }
  }

  function debounceCheckOverlays() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(checkOverlays, 100);
  }

  setTimeout(checkOverlays, 100);

  // Observer otimizado
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach((mutation) => {
      if (
        (mutation.type === 'attributes' && 
         (mutation.attributeName === 'class' || mutation.attributeName === 'style')) ||
        (mutation.type === 'childList' && 
         mutation.target.matches('.prestige-overlay, .achievements-overlay, .bonus-stats-overlay, .history-overlay, .boss-overlay, .character-selection-overlay, .wiki-overlay, .garden-overlay'))
      ) {
        shouldCheck = true;
      }
    });
    if (shouldCheck) {
      console.log('[SplitButtonModule] Mudanças relevantes detectadas, verificando overlays');
      debounceCheckOverlays();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['class', 'style']
  });

  // Eventos para botões de overlay
  const overlayButtons = [
    '#open-prestige', '#open-character-selection', '#open-garden',
    '#open-achievements', '#open-bonus-stats', '#open-wiki', '#show-history'
  ];
  
  overlayButtons.forEach(selector => {
    const button = document.querySelector(selector);
    if (button) {
      button.addEventListener('click', () => {
        console.log(`[SplitButtonModule] Botão ${selector} clicado`);
        debounceCheckOverlays();
      });
    }
  });

  const closeButtons = [
    '#close-prestige', '#close-character-selection', '#close-garden',
    '#close-achievements', '#close-bonus-stats', '#close-wiki', '#close-history'
  ];
  
  closeButtons.forEach(selector => {
    const button = document.querySelector(selector);
    if (button) {
      button.addEventListener('click', () => {
        console.log(`[SplitButtonModule] Botão ${selector} clicado`);
        debounceCheckOverlays();
      });
    }
  });

  // Verificação final após carregamento
  window.addEventListener('load', () => {
    console.log('[SplitButtonModule] Página carregada, verificando estado');
    if (!isMenuOpen()) {
      splitContent.style.visibility = 'hidden';
      splitContent.style.opacity = '0';
      splitContent.style.pointerEvents = 'none';
    }
    debounceCheckOverlays();
  });
}