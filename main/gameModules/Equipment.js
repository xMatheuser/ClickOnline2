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

// Export everything
module.exports = {
  RARITY,
  EQUIPMENT_TYPES,
  EQUIPMENT
};