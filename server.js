const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Estado global do jogo
let gameState = {
  players: [],
  teamLevel: 1,
  teamGoal: 5,
  clicks: 0,
  coins: 0
};

// Função para atualizar todos os clientes
function broadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  // Quando um jogador se conecta, enviar o estado atual do jogo
  socket.emit('gameStateUpdate', gameState);

  // Adicionar novo jogador
  socket.on('addPlayer', (playerData) => {
    if (!gameState.players.some(p => p.name === playerData.name)) {
      playerData.id = socket.id;
      playerData.clicks = 0;
      playerData.coins = 0;
      playerData.level = 1;
      playerData.contribution = 0;
      gameState.players.push(playerData);
      console.log(`Jogador ${playerData.name} adicionado`);
      io.emit('chatMessage', {
        text: `${playerData.name} entrou no jogo como ${playerData.role}!`,
        type: 'system'
      });
      broadcastGameState();
    }
  });

  // Processar clique
  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;

      if (gameState.clicks >= player.targetClicks) {
        levelUp(player);
      }

      broadcastGameState();
    }
  });

  // Comprar upgrade
  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      // Aqui você pode implementar a lógica de upgrades no servidor
      broadcastGameState();
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = gameState.players[playerIndex].name;
      gameState.players.splice(playerIndex, 1);
      io.emit('chatMessage', {
        text: `${playerName} saiu do jogo.`,
        type: 'system'
      });
      console.log(`Jogador ${playerName} desconectado`);
      broadcastGameState();
    }
  });
});

// Função para calcular o valor do clique (adaptada para o servidor)
function calculateClickValue(player) {
  let clickPower = 1; // Valor base
  if (player.role === 'clicker') clickPower *= 1.2; // Bônus de 20%
  return clickPower;
}

// Subir de nível
function levelUp(player) {
  player.level++;
  player.clicks = 0;
  player.targetClicks = Math.ceil(player.targetClicks * 1.25); // Aumentar dificuldade
  const coinsAwarded = player.level * 5;
  player.coins += coinsAwarded;
  gameState.coins += coinsAwarded;

  io.emit('chatMessage', {
    text: `${player.name} alcançou o nível ${player.level}! +${coinsAwarded} moedas`,
    type: 'system'
  });
}

app.use(express.static('public')); // Servir arquivos estáticos (HTML, CSS, JS)

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});