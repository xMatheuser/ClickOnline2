/**
 * WikiModule.js
 * Módulo responsável pela funcionalidade de Wiki do jogo.
 * Permite aos jogadores acessar informações detalhadas sobre todas as mecânicas do jogo.
 */
export default class WikiModule {
  constructor(socket, gameModules) {
    this.socket = socket;
    this.gameModules = gameModules;
    this.wikiData = null;
    this.currentArticle = null;
    this.currentCategory = null;
    
    // Referências aos elementos DOM
    this.wikiOverlay = document.getElementById('wiki-overlay');
    this.wikiCategories = document.getElementById('wiki-categories');
    this.wikiMain = document.getElementById('wiki-main');
    this.wikiSearch = document.getElementById('wiki-search');
    this.openWikiBtn = document.getElementById('open-wiki');
    this.closeWikiBtn = document.getElementById('close-wiki');
  }

  init() {
    this.createWikiData();
    this.setupEventListeners();
    this.renderCategories();
    this.addFlairToWiki();
  }

  createWikiData() {
    this.wikiData = {
      categories: [
        {
          id: 'basics',
          title: '🔰 Básicos do Jogo',
          articles: [
            {
              id: 'getting-started',
              title: 'Começando',
              content: `
                <h1>Começando no Jogo</h1>
                <p>Bem-vindo ao Coop! Este guia vai te ajudar a entender os conceitos básicos do jogo.</p>
                
                <h2>Como Jogar</h2>
                <p>O jogo é baseado em cliques e cooperação entre jogadores. Aqui estão os conceitos básicos:</p>
                <ul>
                  <li>Clique na área de clique para gerar moedas</li>
                  <li>Use as moedas para comprar upgrades</li>
                  <li>Trabalhe em equipe para derrotar bosses</li>
                  <li>Use o sistema de prestígio para reiniciar com bônus</li>
                </ul>

                <h2>Interface Principal</h2>
                <p>A interface do jogo é composta por várias janelas e elementos:</p>
                <ul>
                  <li><strong>Área de Clique:</strong> Onde você clica para gerar moedas</li>
                  <li><strong>Upgrades:</strong> Melhorias que aumentam sua produção</li>
                  <li><strong>Estatísticas:</strong> Mostra suas informações e progresso</li>
                  <li><strong>Jardim:</strong> Sistema de cultivo de recursos</li>
                </ul>
              `
            },
            {
              id: 'clicking',
              title: 'Sistema de Cliques',
              content: `
                <h1>Sistema de Cliques</h1>
                <p>O sistema de cliques é a base do jogo. Cada clique gera moedas que podem ser usadas para melhorar sua produção.</p>
                
                <h2>Como Funciona</h2>
                <p>Quando você clica:</p>
                <ul>
                  <li>Gera moedas baseadas no seu poder de clique</li>
                  <li>Contribui para o progresso do nível da equipe</li>
                  <li>Pode ativar power-ups especiais</li>
                </ul>

                <h2>Poder de Clique</h2>
                <p>Seu poder de clique pode ser aumentado através de:</p>
                <ul>
                  <li>Upgrades básicos</li>
                  <li>Power-ups temporários</li>
                  <li>Bônus de personagens</li>
                  <li>Melhorias do jardim</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'upgrades',
          title: '⬆️ Upgrades',
          articles: [
            {
              id: 'basic-upgrades',
              title: 'Upgrades Básicos',
              content: `
                <h1>Upgrades Básicos</h1>
                <p>Os upgrades básicos são melhorias permanentes que aumentam sua produção de moedas.</p>
                
                <h2>Tipos de Upgrades</h2>
                <ul>
                  <li><strong>Poder de Clique:</strong> Aumenta a quantidade de moedas por clique</li>
                  <li><strong>Auto-Clicker:</strong> Gera cliques automaticamente</li>
                  <li><strong>Multiplicador:</strong> Aumenta a produção total</li>
                </ul>

                <h2>Como Comprar</h2>
                <p>Para comprar upgrades:</p>
                <ol>
                  <li>Acumule moedas clicando</li>
                  <li>Abra a janela de upgrades</li>
                  <li>Selecione o upgrade desejado</li>
                  <li>Clique em comprar</li>
                </ol>
              `
            }
          ]
        },
        {
          id: 'prestige',
          title: '⚡ Sistema de Prestígio',
          articles: [
            {
              id: 'prestige-basics',
              title: 'Básicos do Prestígio',
              content: `
                <h1>Sistema de Prestígio</h1>
                <p>O sistema de prestígio permite que você reinicie o jogo com bônus especiais.</p>
                
                <h2>Como Funciona</h2>
                <p>Quando você prestigia:</p>
                <ul>
                  <li>Seu progresso é resetado</li>
                  <li>Você recebe fragmentos de prestígio</li>
                  <li>Pode desbloquear melhorias permanentes</li>
                </ul>

                <h2>Fragmentos de Prestígio</h2>
                <p>Os fragmentos podem ser usados para:</p>
                <ul>
                  <li>Desbloquear novas habilidades</li>
                  <li>Melhorar bônus existentes</li>
                  <li>Desbloquear novos personagens</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'garden',
          title: '🌻 Jardim',
          articles: [
            {
              id: 'garden-basics',
              title: 'Básicos do Jardim',
              content: `
                <h1>Sistema de Jardim</h1>
                <p>O jardim é um sistema de cultivo que fornece recursos especiais.</p>
                
                <h2>Como Funciona</h2>
                <p>No jardim você pode:</p>
                <ul>
                  <li>Plantar diferentes tipos de flores</li>
                  <li>Colher recursos automaticamente</li>
                  <li>Usar recursos para melhorias especiais</li>
                </ul>

                <h2>Tipos de Flores</h2>
                <ul>
                  <li><strong>Girassol:</strong> Gera moedas automaticamente</li>
                  <li><strong>Tulipa:</strong> Aumenta o poder de clique</li>
                  <li><strong>Rosa:</strong> Melhora a produção de fragmentos</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'power-ups',
          title: '🚀 Power-Ups',
          articles: [
            {
              id: 'power-up-basics',
              title: 'Básicos dos Power-Ups',
              content: `
                <h1>Sistema de Power-Ups</h1>
                <p>Power-ups são bônus temporários que aumentam sua produção.</p>
                
                <h2>Tipos de Power-Ups</h2>
                <ul>
                  <li><strong>Frenesi de Cliques:</strong> Aumenta o poder de clique</li>
                  <li><strong>Multiplicador de Moedas:</strong> Dobra a produção de moedas</li>
                  <li><strong>Auto-Clicker Turbo:</strong> Aumenta a velocidade do auto-clicker</li>
                </ul>

                <h2>Como Usar</h2>
                <p>Para ativar um power-up:</p>
                <ol>
                  <li>Espere o power-up aparecer</li>
                  <li>Clique no botão de ativação</li>
                  <li>Aproveite o bônus temporário</li>
                </ol>
              `
            }
          ]
        },
        {
          id: 'achievements',
          title: '🏆 Conquistas',
          articles: [
            {
              id: 'achievement-basics',
              title: 'Básicos das Conquistas',
              content: `
                <h1>Sistema de Conquistas</h1>
                <p>As conquistas são objetivos que recompensam seu progresso no jogo.</p>
                
                <h2>Tipos de Conquistas</h2>
                <ul>
                  <li><strong>Cliques:</strong> Baseadas em quantidade de cliques</li>
                  <li><strong>Upgrades:</strong> Relacionadas a melhorias compradas</li>
                  <li><strong>Prestígio:</strong> Baseadas em reinícios</li>
                </ul>

                <h2>Recompensas</h2>
                <p>Completar conquistas pode te dar:</p>
                <ul>
                  <li>Bônus permanentes</li>
                  <li>Fragmentos de prestígio</li>
                  <li>Desbloqueio de recursos especiais</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'bosses',
          title: '👹 Bosses',
          articles: [
            {
              id: 'boss-basics',
              title: 'Básicos dos Bosses',
              content: `
                <h1>Sistema de Bosses</h1>
                <p>Os bosses são desafios especiais que requerem cooperação entre jogadores.</p>
                
                <h2>Como Funciona</h2>
                <p>Durante uma luta contra boss:</p>
                <ul>
                  <li>Todos os jogadores trabalham juntos</li>
                  <li>O boss tem uma barra de vida compartilhada</li>
                  <li>Você tem um tempo limitado para derrotá-lo</li>
                </ul>

                <h2>Recompensas</h2>
                <p>Derrotar um boss pode te dar:</p>
                <ul>
                  <li>Moedas extras</li>
                  <li>Fragmentos de prestígio</li>
                  <li>Desbloqueio de recursos especiais</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'characters',
          title: '👤 Personagens',
          articles: [
            {
              id: 'character-basics',
              title: 'Básicos dos Personagens',
              content: `
                <h1>Sistema de Personagens</h1>
                <p>Os personagens são heróis especiais que fornecem bônus únicos.</p>
                
                <h2>Como Funciona</h2>
                <p>Com personagens você pode:</p>
                <ul>
                  <li>Desbloquear diferentes heróis</li>
                  <li>Ganhar bônus específicos</li>
                  <li>Melhorar suas habilidades</li>
                </ul>

                <h2>Tipos de Personagens</h2>
                <ul>
                  <li><strong>Guerreiro:</strong> Aumenta o poder de clique</li>
                  <li><strong>Mago:</strong> Melhora a produção de moedas</li>
                  <li><strong>Arqueiro:</strong> Aumenta a velocidade do auto-clicker</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'equipment',
          title: '⚔️ Equipamentos',
          articles: [
            {
              id: 'equipment-basics',
              title: 'Básicos dos Equipamentos',
              content: `
                <h1>Sistema de Equipamentos</h1>
                <p>Os equipamentos são itens que podem ser equipados para melhorar suas habilidades.</p>
                
                <h2>Tipos de Equipamentos</h2>
                <ul>
                  <li><strong>Armas:</strong> Aumentam o poder de clique</li>
                  <li><strong>Armaduras:</strong> Melhoram a produção de moedas</li>
                  <li><strong>Acessórios:</strong>Fornecem bônus especiais</li>
                </ul>

                <h2>Como Usar</h2>
                <p>Para equipar itens:</p>
                <ol>
                  <li>Abra o inventário</li>
                  <li>Selecione o equipamento</li>
                  <li>Clique em equipar</li>
                </ol>
              `
            }
          ]
        }
      ]
    };
  }

  setupEventListeners() {
    // Abrir wiki
    this.openWikiBtn.addEventListener('click', () => {
      this.wikiOverlay.classList.add('active');
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: true } }));
      
      // Mostrar o primeiro artigo automaticamente
      if (!this.currentArticle && this.wikiData.categories.length > 0) {
        const firstCategory = this.wikiData.categories[0];
        if (firstCategory.articles.length > 0) {
          this.showArticle(firstCategory.articles[0].id);
        }
      }
    });

    // Fechar wiki
    this.closeWikiBtn.addEventListener('click', () => {
      this.wikiOverlay.classList.remove('active');
      document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
    });

    // Fechar ao clicar fora
    this.wikiOverlay.addEventListener('click', (e) => {
      if (e.target === this.wikiOverlay) {
        this.wikiOverlay.classList.remove('active');
        document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
      }
    });

    // Pesquisa na wiki
    this.wikiSearch.addEventListener('input', (e) => {
      this.searchWiki(e.target.value);
    });
    
    // Adicionar suporte para tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.wikiOverlay.classList.contains('active')) {
        this.wikiOverlay.classList.remove('active');
        document.dispatchEvent(new CustomEvent('overlayStateChanged', { detail: { isOpen: false } }));
      }
    });
  }

  renderCategories() {
    this.wikiCategories.innerHTML = this.wikiData.categories
      .map((category, index) => `
        <div class="wiki-category" data-category-id="${category.id}" style="animation-delay: ${index * 0.1}s">
          ${category.title}
          ${category.articles.map((article, artIndex) => `
            <div class="wiki-article" data-article-id="${article.id}" style="animation-delay: ${(index * 0.1) + (artIndex * 0.05)}s">
              ${article.title}
            </div>
          `).join('')}
        </div>
      `).join('');

    // Adicionar eventos de clique e animações
    this.wikiCategories.querySelectorAll('.wiki-category').forEach(category => {
      category.classList.add('fade-in');
      
      category.addEventListener('click', (e) => {
        const categoryId = category.dataset.categoryId;
        this.showCategory(categoryId);
      });
    });

    this.wikiCategories.querySelectorAll('.wiki-article').forEach(article => {
      article.classList.add('fade-in');
      
      article.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Adicionar efeito de clique
        article.classList.add('pulse');
        setTimeout(() => article.classList.remove('pulse'), 300);
        
        const articleId = article.dataset.articleId;
        this.showArticle(articleId);
      });
    });
  }

  showCategory(categoryId) {
    const category = this.wikiData.categories.find(c => c.id === categoryId);
    if (!category) return;

    this.currentCategory = category;
    
    // Atualizar classes ativas
    this.wikiCategories.querySelectorAll('.wiki-category').forEach(cat => {
      cat.classList.toggle('active', cat.dataset.categoryId === categoryId);
    });

    // Mostrar primeiro artigo da categoria
    if (category.articles.length > 0) {
      this.showArticle(category.articles[0].id);
    }
  }

  showArticle(articleId) {
    let article = null;
    let category = null;

    // Encontrar o artigo em todas as categorias
    for (const cat of this.wikiData.categories) {
      const found = cat.articles.find(a => a.id === articleId);
      if (found) {
        article = found;
        category = cat;
        break;
      }
    }

    if (!article || !category) return;

    this.currentArticle = article;
    this.currentCategory = category;

    // Atualizar classes ativas
    this.wikiCategories.querySelectorAll('.wiki-article').forEach(art => {
      art.classList.toggle('active', art.dataset.articleId === articleId);
    });

    // Mostrar conteúdo do artigo com animação
    this.wikiMain.innerHTML = '';
    setTimeout(() => {
      this.wikiMain.innerHTML = `
        <div class="wiki-article-content">
          ${article.content}
        </div>
      `;
      
      // Adicionar animações para elementos dentro do artigo
      this.animateArticleContent();
    }, 50);
  }

  searchWiki(query) {
    if (!query) {
      this.renderCategories();
      return;
    }

    query = query.toLowerCase();
    const results = [];

    // Buscar em todas as categorias e artigos
    this.wikiData.categories.forEach(category => {
      category.articles.forEach(article => {
        if (
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
        ) {
          results.push({
            category: category,
            article: article
          });
        }
      });
    });

    // Mostrar resultados
    this.wikiCategories.innerHTML = `
      <div class="search-results-header">Resultados da pesquisa (${results.length})</div>
    `;
    
    results.forEach((result, index) => {
      const resultElement = document.createElement('div');
      resultElement.className = 'wiki-category';
      resultElement.innerHTML = `
        <div class="search-result-category">${result.category.title}</div>
        <div class="wiki-article search-result" data-article-id="${result.article.id}">
          ${result.article.title}
        </div>
      `;
      resultElement.style.animationDelay = `${index * 0.1}s`;
      resultElement.classList.add('fade-in');
      this.wikiCategories.appendChild(resultElement);
    });

    // Mostrar primeiro resultado
    if (results.length > 0) {
      this.showArticle(results[0].article.id);
    } else {
      this.wikiMain.innerHTML = `
        <div class="wiki-article-content no-results">
          <h1>Nenhum resultado encontrado</h1>
          <p>Tente pesquisar com termos diferentes.</p>
          <div class="no-results-icon">🔍</div>
        </div>
      `;
    }

    // Adicionar eventos de clique novamente
    this.wikiCategories.querySelectorAll('.wiki-article').forEach(article => {
      article.addEventListener('click', (e) => {
        e.stopPropagation();
        article.classList.add('pulse');
        setTimeout(() => article.classList.remove('pulse'), 300);
        
        const articleId = article.dataset.articleId;
        this.showArticle(articleId);
      });
    });
  }
  
  animateArticleContent() {
    // Animar título
    const title = this.wikiMain.querySelector('h1');
    if (title) {
      title.classList.add('slide-in-from-left');
    }
    
    // Animar subtítulos
    const subtitles = this.wikiMain.querySelectorAll('h2');
    subtitles.forEach((subtitle, index) => {
      subtitle.classList.add('slide-in-from-right');
      subtitle.style.animationDelay = `${0.2 + (index * 0.1)}s`;
    });
    
    // Animar parágrafos
    const paragraphs = this.wikiMain.querySelectorAll('p');
    paragraphs.forEach((paragraph, index) => {
      paragraph.classList.add('fade-in');
      paragraph.style.animationDelay = `${0.3 + (index * 0.1)}s`;
    });
    
    // Animar listas
    const lists = this.wikiMain.querySelectorAll('ul, ol');
    lists.forEach((list, index) => {
      list.classList.add('fade-in');
      list.style.animationDelay = `${0.4 + (index * 0.1)}s`;
      
      const items = list.querySelectorAll('li');
      items.forEach((item, itemIndex) => {
        item.classList.add('slide-in-from-left');
        item.style.animationDelay = `${0.5 + (index * 0.1) + (itemIndex * 0.05)}s`;
      });
    });
  }
  
  addFlairToWiki() {
    // Adicionar estilos dinâmicos
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .fade-in {
        animation: fadeIn 0.5s ease forwards;
        opacity: 0;
      }
      
      .slide-in-from-left {
        animation: slideInLeft 0.5s ease forwards;
        opacity: 0;
        transform: translateX(-20px);
      }
      
      .slide-in-from-right {
        animation: slideInRight 0.5s ease forwards;
        opacity: 0;
        transform: translateX(20px);
      }
      
      .pulse {
        animation: pulse 0.3s ease;
      }
      
      .search-results-header {
        padding: 10px;
        background-color: rgba(52, 152, 219, 0.2);
        border-radius: 5px;
        margin-bottom: 15px;
        font-weight: bold;
        color: #ecf0f1;
      }
      
      .search-result-category {
        font-size: 0.8em;
        color: #95a5a6;
        margin-bottom: 5px;
      }
      
      .search-result {
        background-color: rgba(52, 152, 219, 0.1);
        border-left: 3px solid #3498db;
      }
      
      .no-results {
        text-align: center;
      }
      
      .no-results-icon {
        font-size: 48px;
        margin: 20px 0;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// Adicionar função de inicialização exportada
export function initWiki(socket, gameModules) {
  const wikiModule = new WikiModule(socket, gameModules);
  wikiModule.init();
  return wikiModule;
} 