const bosses = {
  iceTitan: {
    name: 'Ice Titan',
    level: 50,
    baseHealth: 50, // Alterado para 10000 conforme nova fórmula
    bonusHealth: 0, // Novo parâmetro para o bônus de HP
    healthMultiplier: 2.5,
    image: 'assets/gifs/dragon.png', // Update image path
    particles: {
      color: '#ADD8E6',
      count: 50,
      speed: 2
    },
    rewards: {
      coins: 1000,
      clickPowerMultiplier: 2,
      clickPowerDuration: 180000 // 3 minutes
    },
    penalty: {
      coinLossPercentage: 0.5
    }
  }
};

module.exports = bosses;
