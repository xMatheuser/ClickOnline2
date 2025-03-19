// Definição das raridades de equipamentos
const RARITY = {
  NORMAL: {
    id: 'normal',
    name: 'Normal',
    color: '#d4d4d4',
    dropChance: 0.50, // 50% chance para equipamentos normais
    statMultiplier: 1.0
  },
  UNCOMMON: {
    id: 'uncommon',
    name: 'Incomum',
    color: '#4ade80', // Verde
    dropChance: 0.25, // 25% chance para equipamentos incomuns
    statMultiplier: 1.2
  },
  RARE: {
    id: 'rare',
    name: 'Raro',
    color: '#60a5fa', // Azul
    dropChance: 0.15, // 15% chance para equipamentos raros
    statMultiplier: 1.5
  },
  EPIC: {
    id: 'epic',
    name: 'Épico',
    color: '#a855f7', // Roxo
    dropChance: 0.07, // 7% chance para equipamentos épicos
    statMultiplier: 2.0
  },
  LEGENDARY: {
    id: 'legendary',
    name: 'Lendário',
    color: '#facc15', // Amarelo
    dropChance: 0.03, // 3% chance para equipamentos lendários
    statMultiplier: 3.0
  }
};

// Definição dos tipos de equipamentos por classe
const EQUIPMENT_TYPES = {
  SWORD: {
    id: 'sword',
    name: 'Espada',
    icon: '⚔️',
    class: 'warrior',
    slot: 'weapon',
    baseStat: 'clickPower'
  },
  BOW: {
    id: 'bow',
    name: 'Arco',
    icon: '🏹',
    class: 'archer',
    slot: 'weapon',
    baseStat: 'autoClicker'
  },
  STAFF: {
    id: 'staff',
    name: 'Cajado',
    icon: '🪄',
    class: 'mage',
    slot: 'weapon',
    baseStat: 'autoClicker'
  }
};

// Lista de todos os equipamentos disponíveis no jogo
const EQUIPMENT = {
  // Espadas (Guerreiro)
  sword_normal_1: {
    id: 'sword_normal_1',
    name: 'Espada de Ferro',
    description: 'Uma espada básica feita de ferro.',
    type: EQUIPMENT_TYPES.SWORD,
    rarity: RARITY.NORMAL,
    stats: {
      clickPower: 0.1 // +10% de poder de clique
    },
    requiredLevel: 1
  },
  sword_uncommon_1: {
    id: 'sword_uncommon_1',
    name: 'Espada de Aço',
    description: 'Uma espada resistente de aço bem forjado.',
    type: EQUIPMENT_TYPES.SWORD,
    rarity: RARITY.UNCOMMON,
    stats: {
      clickPower: 0.2 // +20% de poder de clique
    },
    requiredLevel: 5
  },
  sword_rare_1: {
    id: 'sword_rare_1',
    name: 'Lâmina Infundida',
    description: 'Uma lâmina infundida com energia mágica.',
    type: EQUIPMENT_TYPES.SWORD,
    rarity: RARITY.RARE,
    stats: {
      clickPower: 0.35, // +35% de poder de clique
      critChance: 0.05 // +5% de chance de crítico
    },
    requiredLevel: 10
  },
  sword_epic_1: {
    id: 'sword_epic_1',
    name: 'Destruidora de Dragões',
    description: 'Forjada com escamas de dragão, esta espada emana poder ancestral.',
    type: EQUIPMENT_TYPES.SWORD,
    rarity: RARITY.EPIC,
    stats: {
      clickPower: 0.5, // +50% de poder de clique
      critChance: 0.1, // +10% de chance de crítico
      coinBonus: 0.1 // +10% de moedas obtidas
    },
    requiredLevel: 20
  },
  sword_legendary_1: {
    id: 'sword_legendary_1',
    name: 'Excalibur',
    description: 'A lendária espada dos reis, emana uma luz divina.',
    type: EQUIPMENT_TYPES.SWORD,
    rarity: RARITY.LEGENDARY,
    stats: {
      clickPower: 1.0, // +100% de poder de clique
      critChance: 0.2, // +20% de chance de crítico
      coinBonus: 0.2, // +20% de moedas obtidas
      teamSynergy: 0.1 // +10% de sinergia de equipe
    },
    requiredLevel: 30
  },

  // Arcos (Arqueiro)
  bow_normal_1: {
    id: 'bow_normal_1',
    name: 'Arco de Caça',
    description: 'Um arco simples usado para caça.',
    type: EQUIPMENT_TYPES.BOW,
    rarity: RARITY.NORMAL,
    stats: {
      autoClicker: 0.1 // +10% de eficiência de auto-clicker
    },
    requiredLevel: 1
  },
  bow_uncommon_1: {
    id: 'bow_uncommon_1',
    name: 'Arco Longo',
    description: 'Um arco longo de bom alcance e precisão.',
    type: EQUIPMENT_TYPES.BOW,
    rarity: RARITY.UNCOMMON,
    stats: {
      autoClicker: 0.2 // +20% de eficiência de auto-clicker
    },
    requiredLevel: 5
  },
  bow_rare_1: {
    id: 'bow_rare_1',
    name: 'Arco Élfico',
    description: 'Um arco gracioso feito pelos mestres elfos.',
    type: EQUIPMENT_TYPES.BOW,
    rarity: RARITY.RARE,
    stats: {
      autoClicker: 0.35, // +35% de eficiência de auto-clicker
      doubleHitChance: 0.05 // +5% de chance de acerto duplo
    },
    requiredLevel: 10
  },
  bow_epic_1: {
    id: 'bow_epic_1',
    name: 'Arco do Vento',
    description: 'Este arco dispara flechas com a velocidade e força de uma tempestade.',
    type: EQUIPMENT_TYPES.BOW,
    rarity: RARITY.EPIC,
    stats: {
      autoClicker: 0.5, // +50% de eficiência de auto-clicker
      doubleHitChance: 0.1, // +10% de chance de acerto duplo
      progressBoost: 0.1 // +10% de progresso de nível
    },
    requiredLevel: 20
  },
  bow_legendary_1: {
    id: 'bow_legendary_1',
    name: 'Arco Celestial',
    description: 'Forjado com luz das estrelas, este arco parece disparar cometas.',
    type: EQUIPMENT_TYPES.BOW,
    rarity: RARITY.LEGENDARY,
    stats: {
      autoClicker: 1.0, // +100% de eficiência de auto-clicker
      doubleHitChance: 0.2, // +20% de chance de acerto duplo
      progressBoost: 0.2, // +20% de progresso de nível
      prestigeBonus: 0.1 // +10% de bônus de prestígio
    },
    requiredLevel: 30
  },

  // Cajados (Mago)
  staff_normal_1: {
    id: 'staff_normal_1',
    name: 'Cajado de Aprendiz',
    description: 'Um cajado básico usado por magos iniciantes.',
    type: EQUIPMENT_TYPES.STAFF,
    rarity: RARITY.NORMAL,
    stats: {
      autoClicker: 0.15 // +15% de eficiência de auto-clicker
    },
    requiredLevel: 1
  },
  staff_uncommon_1: {
    id: 'staff_uncommon_1',
    name: 'Cajado de Carvalho',
    description: 'Um cajado feito de madeira de carvalho antigo, canaliza magia com mais eficiência.',
    type: EQUIPMENT_TYPES.STAFF,
    rarity: RARITY.UNCOMMON,
    stats: {
      autoClicker: 0.25 // +25% de eficiência de auto-clicker
    },
    requiredLevel: 5
  },
  staff_rare_1: {
    id: 'staff_rare_1',
    name: 'Cajado de Cristal',
    description: 'Um cajado com um cristal mágico no topo que amplifica o poder arcano.',
    type: EQUIPMENT_TYPES.STAFF,
    rarity: RARITY.RARE,
    stats: {
      autoClicker: 0.4, // +40% de eficiência de auto-clicker
      aoeChance: 0.05 // +5% de chance de efeito em área
    },
    requiredLevel: 10
  },
  staff_epic_1: {
    id: 'staff_epic_1',
    name: 'Cajado das Tempestades',
    description: 'Este cajado permite ao usuário controlar as forças da natureza.',
    type: EQUIPMENT_TYPES.STAFF,
    rarity: RARITY.EPIC,
    stats: {
      autoClicker: 0.6, // +60% de eficiência de auto-clicker
      aoeChance: 0.1, // +10% de chance de efeito em área
      powerUpDuration: 0.15 // +15% de duração de power-ups
    },
    requiredLevel: 20
  },
  staff_legendary_1: {
    id: 'staff_legendary_1',
    name: 'Cajado do Arcano',
    description: 'Um artefato ancestral de poder inimaginável, dizem que foi criado pelos deuses.',
    type: EQUIPMENT_TYPES.STAFF,
    rarity: RARITY.LEGENDARY,
    stats: {
      autoClicker: 1.2, // +120% de eficiência de auto-clicker
      aoeChance: 0.2, // +20% de chance de efeito em área
      powerUpDuration: 0.3, // +30% de duração de power-ups
      fragmentBonus: 0.15 // +15% de fragmentos obtidos
    },
    requiredLevel: 30
  }
};

// Sistema de Forja
const FORGE_SYSTEM = {
  // Chances de sucesso para cada transição de raridade
  SUCCESS_CHANCES: {
    normal_to_uncommon: 0.25,    // 25% de chance (Normal para Incomum)
    uncommon_to_rare: 0.15,      // 15% de chance (Incomum para Raro)
    rare_to_epic: 0.05,          // 5% de chance (Raro para Épico)
    epic_to_legendary: 0.001     // 0.1% de chance (Épico para Lendário)
  },
  
  // Custo em moedas (porcentagem das moedas totais do jogador)
  COSTS: {
    normal_to_uncommon: 0.30,    // 30% das moedas (Normal para Incomum)
    uncommon_to_rare: 0.35,      // 35% das moedas (Incomum para Raro)
    rare_to_epic: 0.40,          // 40% das moedas (Raro para Épico)
    epic_to_legendary: 0.50      // 50% das moedas (Épico para Lendário)
  },
  
  // Mapeamento de raridades para o próximo nível
  NEXT_RARITY: {
    'normal': 'uncommon',
    'uncommon': 'rare',
    'rare': 'epic',
    'epic': 'legendary'
  }
};

// Função para tentar forjar um item
function attemptForge(player, itemId) {
  // Verificar se o jogador existe
  if (!player) return { success: false, message: 'Jogador não encontrado' };
  
  // Verificar se o item existe no inventário do jogador
  const itemIndex = player.inventory.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return { success: false, message: 'Item não encontrado no inventário' };
  
  const item = player.inventory[itemIndex];
  const currentRarity = item.rarity;
  
  // Verificar se a raridade atual pode ser aprimorada
  if (currentRarity === 'legendary') {
    return { success: false, message: 'Este item já possui a raridade máxima' };
  }
  
  // Determinar a próxima raridade
  const nextRarity = FORGE_SYSTEM.NEXT_RARITY[currentRarity];
  if (!nextRarity) {
    return { success: false, message: 'Não foi possível determinar a próxima raridade' };
  }
  
  // Determinar o custo da forja
  const forgeCostPercentage = FORGE_SYSTEM.COSTS[`${currentRarity}_to_${nextRarity}`];
  const forgeCost = Math.floor(player.coins * forgeCostPercentage);
  
  // Verificar se o jogador tem moedas suficientes
  if (player.coins < forgeCost) {
    return { 
      success: false, 
      message: 'Moedas insuficientes', 
      requiresCoins: forgeCost,
      currentCoins: player.coins
    };
  }
  
  // Deduzir o custo das moedas do jogador
  player.coins -= forgeCost;
  
  // Determinar a chance de sucesso
  const successChance = FORGE_SYSTEM.SUCCESS_CHANCES[`${currentRarity}_to_${nextRarity}`];
  
  // Testar a sorte!
  const roll = Math.random();
  const isSuccess = roll <= successChance;
  
  if (isSuccess) {
    // Sucesso! Atualizar a raridade do item
    const newItem = {
      ...item,
      rarity: nextRarity,
      
      // Obter o novo multiplicador de estatísticas da raridade
      stats: {}
    };
    
    // Obter multiplicador da nova raridade
    const statMultiplier = RARITY[nextRarity.toUpperCase()].statMultiplier;
    const oldStatMultiplier = RARITY[currentRarity.toUpperCase()].statMultiplier;
    
    // Aplicar o multiplicador em cada estatística
    for (const [stat, value] of Object.entries(item.stats)) {
      // Calcular o novo valor baseado no multiplicador da nova raridade
      // Tomamos como base o valor atual dividido pelo multiplicador da raridade atual
      // e então multiplicamos pelo novo multiplicador
      const baseStatValue = value / oldStatMultiplier;
      newItem.stats[stat] = baseStatValue * statMultiplier;
    }
    
    // Substituir o item no inventário
    player.inventory[itemIndex] = newItem;
    
    return {
      success: true,
      message: 'Forja bem-sucedida!',
      oldRarity: currentRarity,
      newRarity: nextRarity,
      itemId: item.id,
      cost: forgeCost
    };
  } else {
    // Falha! Remover o item do inventário
    player.inventory.splice(itemIndex, 1);
    
    // Verificar se o item estava equipado e removê-lo
    if (player.equipment) {
      for (const [slot, equippedItemId] of Object.entries(player.equipment)) {
        if (equippedItemId === itemId) {
          delete player.equipment[slot];
          break;
        }
      }
    }
    
    return {
      success: false,
      message: 'Forja fracassada! O item foi destruído.',
      oldRarity: currentRarity,
      attemptedRarity: nextRarity,
      cost: forgeCost
    };
  }
}

// Export everything
module.exports = {
  RARITY,
  EQUIPMENT_TYPES,
  EQUIPMENT,
  FORGE_SYSTEM,
  attemptForge
};