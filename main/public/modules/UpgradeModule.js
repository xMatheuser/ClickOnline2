import { gameState, upgradeHistory } from './CoreModule.js';

export function getVisibleUpgrades() {
  if (!gameState.upgrades || !gameState.players) return [];

  const tier1Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 1);
  const tier1Completed = tier1Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier1Completed && upgradeHistory.tier1.length === 0) {
    upgradeHistory.tier1 = JSON.parse(JSON.stringify(tier1Upgrades));
  }

  const tier2Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 2);
  const tier2Completed = tier2Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier2Completed && upgradeHistory.tier2.length === 0) {
    upgradeHistory.tier2 = JSON.parse(JSON.stringify(tier2Upgrades));
  }

  const tier3Upgrades = gameState.upgrades.filter(upgrade => upgrade.tier === 3);
  const tier3Completed = tier3Upgrades.every(upgrade => upgrade.level >= upgrade.maxLevel);

  if (tier3Completed && upgradeHistory.tier3.length === 0) {
    upgradeHistory.tier3 = JSON.parse(JSON.stringify(tier3Upgrades));
  }

  return gameState.upgrades
    .filter(upgrade => {
      if (tier2Completed) {
        return upgrade.tier === 3 && !tier3Completed;
      }
      if (tier1Completed) {
        return upgrade.tier === 2 && !tier2Completed;
      }
      return upgrade.tier === 1;
    })
    .sort((a, b) => gameState.upgrades.indexOf(a) - gameState.upgrades.indexOf(b));
}

export function calculateUpgradePrice(upgrade) {
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.priceIncrease, upgrade.level));
}

export function getUpgradeEffectDescription(upgrade) {
  // ...existing effect description code...
}
