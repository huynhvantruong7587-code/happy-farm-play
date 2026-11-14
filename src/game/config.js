/** 数据驱动配置：作物、以及后续动物/建筑的占位结构 */

export const GAME = {
  name: '开心农场',
  version: 11,
  saveKey: 'happy-farm-h5-v1',
  cols: 6,
  rows: 4,
  startCoins: 80,
  startSeeds: { wheat: 3, carrot: 0, corn: 0, cabbage: 2 },
};

/** 经验：从 level 升到 level+1 所需经验 */
export function xpToNext(level) {
  return 20 + level * 15;
}

/**
 * 作物配置
 * growMs: 成熟所需毫秒（实时计时，离线也会继续生长）
 * unlockLevel: 达到该等级才可购买/种植
 */
export const CROPS = {
  wheat: {
    id: 'wheat',
    name: '小麦',
    emoji: '🌾',
    seedCost: 10,
    growMs: 2 * 60 * 1000,
    sellPrice: 18,
    xp: 5,
    unlockLevel: 1,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.7 },
      { at: 0.55, label: '拔节', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🌾', scale: 1.08 },
    ],
    soilTint: '#8B5A2B',
  },
  carrot: {
    id: 'carrot',
    name: '胡萝卜',
    emoji: '🥕',
    seedCost: 25,
    growMs: 5 * 60 * 1000,
    sellPrice: 48,
    xp: 12,
    unlockLevel: 2,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.7 },
      { at: 0.55, label: '生长', emoji: '🥬', scale: 0.88 },
      { at: 1, label: '成熟', emoji: '🥕', scale: 1.08 },
    ],
    soilTint: '#8A4F28',
  },
  corn: {
    id: 'corn',
    name: '玉米',
    emoji: '🌽',
    seedCost: 60,
    growMs: 10 * 60 * 1000,
    sellPrice: 120,
    xp: 22,
    unlockLevel: 3,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '抽穗', emoji: '🌿', scale: 0.95 },
      { at: 1, label: '成熟', emoji: '🌽', scale: 1.1 },
    ],
    soilTint: '#7A4A22',
  },
  cabbage: {
    id: 'cabbage', name: '白菜', emoji: '🥬',
    seedCost: 5, sellPrice: 9, xp: 3, unlockLevel: 1,
    growMs: 1 * 60 * 1000,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '生长', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🥬', scale: 1.08 },
    ],
    soilTint: '#84512b',
  },
  potato: {
    id: 'potato', name: '土豆', emoji: '🥔',
    seedCost: 20, sellPrice: 38, xp: 9, unlockLevel: 4,
    growMs: 3 * 60 * 1000,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '生长', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🥔', scale: 1.08 },
    ],
    soilTint: '#84512b',
  },
  tomato: {
    id: 'tomato', name: '番茄', emoji: '🍅',
    seedCost: 30, sellPrice: 58, xp: 13, unlockLevel: 5,
    growMs: 4 * 60 * 1000,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '生长', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🍅', scale: 1.08 },
    ],
    soilTint: '#84512b',
  },
  strawberry: {
    id: 'strawberry', name: '草莓', emoji: '🍓',
    seedCost: 45, sellPrice: 90, xp: 18, unlockLevel: 6,
    growMs: 6 * 60 * 1000,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '生长', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🍓', scale: 1.08 },
    ],
    soilTint: '#84512b',
  },
  pumpkin: {
    id: 'pumpkin', name: '南瓜', emoji: '🎃',
    seedCost: 55, sellPrice: 112, xp: 23, unlockLevel: 7,
    growMs: 8 * 60 * 1000,
    stages: [
      { at: 0, label: '刚种下', emoji: '🌱', scale: 0.62 },
      { at: 0.22, label: '发芽', emoji: '🌱', scale: 0.72 },
      { at: 0.55, label: '生长', emoji: '🌿', scale: 0.9 },
      { at: 1, label: '成熟', emoji: '🎃', scale: 1.08 },
    ],
    soilTint: '#84512b',
  },
};

export const CROP_LIST = Object.values(CROPS);

export const FEED = { id: 'feed', name: '饲料', emoji: '🥣', cost: 8 };
export const PRODUCTS = Object.fromEntries([
  ['pork','猪肉','🥩',85], ['beef','牛肉','🥩',110], ['hide','牛皮','🦬',35],
  ['egg','鸡蛋','🥚',18], ['chickenMeat','鸡肉','🍗',50],
  ['wool','羊毛','🧶',40], ['mutton','羊肉','🥩',65],
  ['crucianMeat','鲫鱼肉','🐟',45], ['carpMeat','鲤鱼肉','🐟',80], ['goldfishMeat','金鱼肉','🐠',130],
].map(([id,name,emoji,sellPrice]) => [id,{id,name,emoji,sellPrice}]));
export const ANIMALS = Object.fromEntries([
  ['chicken','小鸡','🐥','chicken',30,4,2,{egg:1}],
  ['pig','小猪','🐷','pig',40,5,1,{pork:1}],
  ['cow','牛犊','🐮','cow',70,8,2,{beef:1,hide:1}],
  ['sheep','羊羔','🐑','sheep',50,6,3,{wool:1}],
  ['crucian','鲫鱼苗','🐟','pond',20,3,1,{crucianMeat:1}],
  ['carp','鲤鱼苗','🐟','pond',40,6,2,{carpMeat:1}],
  ['goldfish','金鱼苗','🐠','pond',65,9,3,{goldfishMeat:1}],
].map(([id,name,emoji,zone,cost,minutes,unlockLevel,outputs]) =>
  [id,{id,name,emoji,zone,cost,growMs:minutes*60000,unlockLevel,outputs,xp:minutes*2}]));
export const ZONE_NAMES = { farm:'农田', chicken:'鸡舍', pig:'猪圈', cow:'牛棚', sheep:'羊圈', pond:'鱼塘' };
export const PEN_SIZES = { pig:3, cow:3, sheep:3, pond:4, chicken:4 };

/** 后续迭代：建筑（占位，暂不开放） */
export const BUILDINGS = {
  house: {
    id: 'house',
    name: '房子',
    emoji: '🏠',
    comingSoon: true,
    brief: '升级住所，提高仓库上限',
  },
  barn: {
    id: 'barn',
    name: '谷仓',
    emoji: '🏚️',
    comingSoon: true,
    brief: '存放更多作物与饲料',
  },

};

/** 后续迭代：玩家交易（占位） */
export const TRADING = {
  comingSoon: true,
  brief: '与其他玩家或走商交换作物、种子和材料',
};

export function formatMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatGrowTime(ms) {
  return formatMs(ms);
}
