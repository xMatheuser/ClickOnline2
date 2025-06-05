/**
 * WikiModule.js
 * Módulo responsável pela funcionalidade de Wiki do jogo.
 * Permite aos jogadores acessar informações detalhadas sobre todas as mecânicas do jogo.
 */
import { socket, gameState } from './CoreModule.js';

export default class WikiModule {
  constructor() {
    this.socket = socket;
    this.gameState = gameState;
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
                
                <h2>Mecânicas Base</h2>
                <ul>
                  <li>Cada clique gera moedas base + bônus</li>
                  <li>Auto-clicker gera 1 clique a cada segundo inicialmente</li>
                  <li>Níveis são ganhos a cada 100% de progresso</li>
                </ul>

                <h2>Fórmulas Básicas</h2>
                <ul>
                  <li>Moedas por clique = Base (1) × Multiplicadores × Bônus de Personagem</li>
                  <li>Progresso do nível = (Total de Cliques × 100) / Meta do Nível</li>
                  <li>Auto-clicker = (Cliques/s Base) × Melhorias × Bônus</li>
                </ul>

                <h2>Contribuição em Equipe</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Ação</th>
                    <th>Contribuição</th>
                  </tr>
                  <tr>
                    <td>Clique Manual</td>
                    <td>100% do valor</td>
                  </tr>
                  <tr>
                    <td>Auto-clicker</td>
                    <td>50% do valor</td>
                  </tr>
                  <tr>
                    <td>Boss Damage</td>
                    <td>200% do valor</td>
                  </tr>
                </table>
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
              title: 'Sistema de Upgrades',
              content: `
                <h1>Sistema de Upgrades</h1>
                
                <h2>Tipos de Upgrades e Benefícios</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Upgrade</th>
                    <th>Efeito Base</th>
                    <th>Crescimento</th>
                  </tr>
                  <tr>
                    <td>Poder de Clique</td>
                    <td>+100% por nível</td>
                    <td>×2 a cada 10 níveis</td>
                  </tr>
                  <tr>
                    <td>Auto-Clicker</td>
                    <td>+1 clique/s</td>
                    <td>+50% a cada nível</td>
                  </tr>
                  <tr>
                    <td>Multiplicador</td>
                    <td>×2 todos bônus</td>
                    <td>×1.5 por nível</td>
                  </tr>
                </table>

                <h2>Fórmulas de Custo</h2>
                <ul>
                  <li>Custo Base × (1.15 ^ Nível atual)</li>
                  <li>Custos dobram a cada 25 níveis</li>
                  <li>Compra em massa tem 2% desconto por item</li>
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
              title: 'Sistema de Personagens',
              content: `
                <h1>Sistema de Personagens</h1>

                <h2>Classes e Bônus</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Classe</th>
                    <th>Bônus Principal</th>
                    <th>Bônus Secundário</th>
                  </tr>
                  <tr>
                    <td>Guerreiro</td>
                    <td>+200% Poder de Clique</td>
                    <td>+50% Dano Boss</td>
                  </tr>
                  <tr>
                    <td>Mago</td>
                    <td>+150% Moedas</td>
                    <td>+100% Power-up</td>
                  </tr>
                  <tr>
                    <td>Arqueiro</td>
                    <td>+300% Auto-click</td>
                    <td>+75% Crítico</td>
                  </tr>
                </table>

                <h2>Sistema de Equipamentos</h2>
                <p>Cada personagem pode equipar:</p>
                <ul>
                  <li>1 Arma (100% do bônus base)</li>
                  <li>1 Armadura (75% do bônus base)</li>
                  <li>2 Acessórios (50% do bônus base cada)</li>
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
              id: 'garden-mechanics',
              title: 'Mecânicas do Jardim',
              content: `
                <h1>Sistema do Jardim</h1>

                <h2>Plantas e Recursos</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Planta</th>
                    <th>Tempo Base</th>
                    <th>Recurso</th>
                    <th>Efeito</th>
                  </tr>
                  <tr>
                    <td>Girassol</td>
                    <td>30s</td>
                    <td>Sol</td>
                    <td>+10% Moedas</td>
                  </tr>
                  <tr>
                    <td>Tulipa</td>
                    <td>60s</td>
                    <td>Energia</td>
                    <td>+20% Click</td>
                  </tr>
                  <tr>
                    <td>Rosa</td>
                    <td>120s</td>
                    <td>Essência</td>
                    <td>+15% Todos</td>
                  </tr>
                </table>

                <h2>Melhorias do Jardim</h2>
                <ul>
                  <li>Slots: 500 moedas base, dobra a cada slot</li>
                  <li>Velocidade: -5% tempo por nível (máx 75%)</li>
                  <li>Fertilizante: +25% recursos por nível</li>
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
              id: 'boss-mechanics',
              title: 'Mecânicas de Boss',
              content: `
                <h1>Sistema de Bosses</h1>

                <h2>Propriedades do Boss</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Nível</th>
                    <th>Vida</th>
                    <th>Tempo</th>
                    <th>Recompensa</th>
                  </tr>
                  <tr>
                    <td>1-10</td>
                    <td>1000 × Nível</td>
                    <td>60s</td>
                    <td>100% bônus</td>
                  </tr>
                  <tr>
                    <td>11-25</td>
                    <td>2500 × Nível</td>
                    <td>90s</td>
                    <td>150% bônus</td>
                  </tr>
                  <tr>
                    <td>26+</td>
                    <td>5000 × Nível</td>
                    <td>120s</td>
                    <td>200% bônus</td>
                  </tr>
                </table>

                <h2>Dano e Contribuição</h2>
                <ul>
                  <li>Dano Base = Poder de Clique × 2</li>
                  <li>Crítico = 150% dano (chance base 10%)</li>
                  <li>Bônus em Equipe = +20% por jogador</li>
                </ul>

                <h2>Recompensas de Boss</h2>
                <ul>
                  <li>Moedas = Dano Total × Multiplicador</li>
                  <li>Fragmentos = 1 por 10% de dano</li>
                  <li>Itens = 5% chance base por derrota</li>
                </ul>
              `
            }
          ]
        },
        {
          id: 'equipment-systems',
          title: '⚔️ Sistemas de Equipamento',
          articles: [
            {
              id: 'fusion-system',
              title: 'Sistema de Fusão',
              content: `
                <h1>Sistema de Fusão de Itens</h1>
                <p>O sistema de fusão permite combinar dois itens idênticos para criar uma versão mais poderosa.</p>

                <h2>Requisitos para Fusão</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Critério</th>
                    <th>Requisito</th>
                  </tr>
                  <tr>
                    <td>Tipo</td>
                    <td>Deve ser o mesmo (ex: espada com espada)</td>
                  </tr>
                  <tr>
                    <td>Nome</td>
                    <td>Deve ser idêntico</td>
                  </tr>
                  <tr>
                    <td>Raridade</td>
                    <td>Deve ser a mesma</td>
                  </tr>
                  <tr>
                    <td>Estado</td>
                    <td>Não pode ser item lendário</td>
                  </tr>
                </table>

                <h2>Progressão de Raridade</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Fusão</th>
                    <th>Resultado</th>
                    <th>Bônus de Stats</th>
                  </tr>
                  <tr>
                    <td>Normal + Normal</td>
                    <td>Incomum</td>
                    <td>×1.5 stats base</td>
                  </tr>
                  <tr>
                    <td>Incomum + Incomum</td>
                    <td>Raro</td>
                    <td>×2.0 stats base</td>
                  </tr>
                  <tr>
                    <td>Raro + Raro</td>
                    <td>Épico</td>
                    <td>×2.5 stats base</td>
                  </tr>
                  <tr>
                    <td>Épico + Épico</td>
                    <td>Lendário</td>
                    <td>×3.0 stats base</td>
                  </tr>
                </table>
              `
            },
            {
              id: 'forge-system',
              title: 'Sistema de Forja',
              content: `
                <h1>Sistema de Forja</h1>
                <p>A forja permite tentar melhorar um item para uma raridade superior, com risco de perda.</p>

                <h2>Chances de Sucesso</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Raridade Atual</th>
                    <th>Chance Base</th>
                    <th>Custo (% das Moedas)</th>
                  </tr>
                  <tr>
                    <td>Normal → Incomum</td>
                    <td>25%</td>
                    <td>30% das moedas</td>
                  </tr>
                  <tr>
                    <td>Incomum → Raro</td>
                    <td>15%</td>
                    <td>35% das moedas</td>
                  </tr>
                  <tr>
                    <td>Raro → Épico</td>
                    <td>5%</td>
                    <td>40% das moedas</td>
                  </tr>
                  <tr>
                    <td>Épico → Lendário</td>
                    <td>0.1%</td>
                    <td>50% das moedas</td>
                  </tr>
                </table>

                <h2>Sistema de Risco</h2>
                <ul>
                  <li>Em caso de falha, o item é <strong>destruído</strong></li>
                  <li>Itens equipados precisam ser desequipados antes da forja</li>
                  <li>O custo é baseado no total de moedas da equipe</li>
                  <li>As moedas são consumidas independente do resultado</li>
                </ul>

                <h2>Melhorias de Estatísticas</h2>
                <table class="wiki-table">
                  <tr>
                    <th>Resultado</th>
                    <th>Multiplicador</th>
                    <th>Bônus Extra</th>
                  </tr>
                  <tr>
                    <td>Incomum</td>
                    <td>×1.5</td>
                    <td>+1 Stat Aleatório</td>
                  </tr>
                  <tr>
                    <td>Raro</td>
                    <td>×2.0</td>
                    <td>+2 Stats Aleatórios</td>
                  </tr>
                  <tr>
                    <td>Épico</td>
                    <td>×2.5</td>
                    <td>+3 Stats Aleatórios</td>
                  </tr>
                  <tr>
                    <td>Lendário</td>
                    <td>×3.0</td>
                    <td>Todos os Stats</td>
                  </tr>
                </table>

                <h2>Dicas</h2>
                <ul>
                  <li>Recomenda-se fazer backup de itens importantes através da fusão</li>
                  <li>Use itens de menor valor para testar sua sorte</li>
                  <li>Colete fragmentos em batalhas contra bosses</li>
                  <li>Aguarde ter fragmentos suficientes antes de tentar</li>
                </ul>
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
export function initWiki() {
  const wikiModule = new WikiModule();
  wikiModule.init();
  return wikiModule;
}