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
    }
];

module.exports = prestigeUpgrades;