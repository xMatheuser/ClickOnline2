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
  if (!upgrade) return '';
  
  switch (upgrade.id) {
    case 'click-power':
    case 'click-power-2':
    case 'click-power-3':
      const clickBonus = upgrade.tier === 1 ? upgrade.level * 100 : 
                        upgrade.tier === 2 ? upgrade.level * 200 :
                        upgrade.level * 400;
      return `${upgrade.description}\n\nBônus Atual: +${clickBonus}% poder de clique`;
      
    case 'auto-clicker':
    case 'auto-clicker-2':
    case 'auto-clicker-3':
      const autoClicks = upgrade.tier === 1 ? upgrade.level :
                        upgrade.tier === 2 ? upgrade.level * 2 :
                        upgrade.level * 4;
      return `${upgrade.description}\n\nGera ${autoClicks} cliques automáticos por segundo`;
      
    case 'coin-boost':
    case 'coin-boost-2':
    case 'coin-boost-3':
      const coinBonus = (upgrade.tier === 1 ? upgrade.level * 20 :
                        upgrade.tier === 2 ? upgrade.level * 40 :
                        upgrade.level * 80);
      return `${upgrade.description}\n\nBônus Atual: +${coinBonus}% moedas`;
      
    case 'progress-boost':
    case 'progress-boost-2':
    case 'progress-boost-3':
      const progressReduction = (upgrade.tier === 1 ? upgrade.level * 5 :
                               upgrade.tier === 2 ? upgrade.level * 8 :
                               upgrade.level * 15);
      return `${upgrade.description}\n\nRedução Atual: -${progressReduction}% dificuldade`;
      
    case 'team-synergy':
    case 'team-synergy-2':
    case 'team-synergy-3':
      const playerCount = gameState?.players?.length || 0;
      const synergyBonus = upgrade.tier === 1 ? upgrade.level * playerCount * 10 :
                          upgrade.tier === 2 ? upgrade.level * playerCount * 20 :
                          upgrade.level * playerCount * 40;
      return `${upgrade.description}\n\nBônus Atual: +${synergyBonus}% (${playerCount} jogadores)`;
      
    case 'shared-rewards':
    case 'shared-rewards-2':
    case 'shared-rewards-3':
      const rewardBonus = upgrade.tier === 1 ? upgrade.level * 15 :
                         upgrade.tier === 2 ? upgrade.level * 30 :
                         upgrade.level * 50;
      return `${upgrade.description}\n\nRetorno Atual: +${rewardBonus}% moedas`;
      
    default:
      return upgrade.description;
  }
}
