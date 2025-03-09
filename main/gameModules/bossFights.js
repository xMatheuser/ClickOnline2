const bosses = {
  iceTitan: {
    name: 'Ice Titan',
    level: 5,
    baseHealth: 5000,
    healthMultiplier: 2.5,
    image: 'assets/gifs/dragon.jpg', // Update image path
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
