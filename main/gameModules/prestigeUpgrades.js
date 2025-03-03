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
    }
];

module.exports = prestigeUpgrades;