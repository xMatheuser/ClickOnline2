const prestigeUpgrades = [
    {
        id: 'fragment-multiplier',
        name: 'Multiplicador de Fragmentos',
        description: 'Aumenta a quantidade de fragmentos ganhos ao prestigiar',
        basePrice: 5,
        level: 0,
        maxLevel: 10,
        effect: level => 1 + level * 0.2,
        priceIncrease: 2
    },
    {
        id: 'powerups-unlock',
        name: 'Ativar Power-Ups',
        description: 'Desbloqueia o sistema de Power-Ups, permitindo bônus temporários poderosos',
        basePrice: 50,
        level: 0,
        maxLevel: 1,
        effect: level => level > 0, // Retorna true se desbloqueado
        priceIncrease: 1
    },
    {
        id: 'powerup-duration',
        name: 'Duração de Power-Ups',
        description: 'Aumenta a duração dos Power-Ups em 10% por nível',
        basePrice: 25,
        level: 0,
        maxLevel: 5,
        effect: level => 1 + level * 0.1, // 10% por nível
        priceIncrease: 2,
        requires: 'powerups-unlock' // Requer que o powerups-unlock seja comprado
    },
    {
        id: 'garden-unlock',
        name: 'Desbloquear Jardim',
        description: 'Desbloqueia o sistema de jardim, permitindo cultivar recursos especiais',
        basePrice: 100,
        level: 0,
        maxLevel: 1,
        effect: level => level > 0, // Returns true if unlocked
        priceIncrease: 1
    }
];

module.exports = prestigeUpgrades;