const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

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
  socket.emit('gameStateUpdate', gameState);

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

  socket.on('click', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const clickValue = calculateClickValue(player);
      player.clicks += clickValue;
      player.contribution += clickValue;
      gameState.clicks += clickValue;

      if (player.clicks >= (player.targetClicks || 10)) {
        levelUp(player);
      }
      broadcastGameState();
    }
  });

  socket.on('buyUpgrade', (upgradeId) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      // Implementar lógica de upgrades aqui no futuro
      broadcastGameState();
    }
  });

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

function calculateClickValue(player) {
  let clickPower = 1;
  if (player.role === 'clicker') clickPower *= 1.2;
  return clickPower;
}

function levelUp(player) {
  player.level++;
  player.clicks = 0;
  player.targetClicks = Math.ceil((player.targetClicks || 10) * 1.25);
  const coinsAwarded = player.level * 5;
  player.coins += coinsAwarded;
  gameState.coins += coinsAwarded;
  io.emit('chatMessage', {
    text: `${player.name} alcançou o nível ${player.level}! +${coinsAwarded} moedas`,
    type: 'system'
  });
}

// Configurar porta para o Render
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
