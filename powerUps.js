const powerUps = {
    'click-frenzy': { 
        active: false, 
        duration: 30000,
        multiplier: 2,
        name: 'Click Frenzy',
        description: 'Dobra o poder de clique',
        color: '#ff4500'
    },
    'gold-rush': {
        active: false,
        duration: 20000,
        multiplier: 3,
        name: 'Gold Rush',
        description: 'Triplica as moedas ganhas',
        color: '#ffd700'
    },
    'speed-demon': {
        active: false,
        duration: 15000,
        multiplier: 4,
        name: 'Speed Demon',
        description: 'Quadruplica a velocidade do auto-clicker',
        color: '#ff1493'
    },
    'team-spirit': {
        active: false,
        duration: 25000,
        multiplier: 2.5,
        name: 'Team Spirit',
        description: 'Aumenta o bônus de sinergia da equipe',
        color: '#32cd32'
    }
};

module.exports = powerUps;
