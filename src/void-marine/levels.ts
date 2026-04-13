export type BossType = 'mech' | 'brute' | 'drone' | 'wyrm' | 'overlord';
export type HazardType = 'lava' | null;

export interface LevelDef {
  name: string;
  subtitle: string;
  bg: number;
  groundColor: number;
  groundTop: number;
  groundDetail: number;
  platColor: number;
  platTop: number;
  platDetail: number;
  arenaWall: number;
  arenaWallInner: number;
  enemyTint: number | null;
  enemySpeedMult: number;
  enemyShootMult: number;
  starColor: number;
  starAlphaBase: number;
  slippery: boolean;
  hazard: HazardType;
  bossPool: BossType[];
  levelWidth: number;
  powerupX: number | null;
  music: null;
}

export const LEVELS: LevelDef[] = [
  {
    name: 'VOID STATION',
    subtitle: 'THE HUNT BEGINS',
    bg: 0x0a0a12,
    groundColor: 0x334433,
    groundTop: 0x445544,
    groundDetail: 0x2a3a2a,
    platColor: 0x556655,
    platTop: 0x667766,
    platDetail: 0x4a5a4a,
    arenaWall: 0x442222,
    arenaWallInner: 0x553333,
    enemyTint: null,
    enemySpeedMult: 1,
    enemyShootMult: 1,
    starColor: 0xffffff,
    starAlphaBase: 0.2,
    slippery: false,
    hazard: null,
    bossPool: ['mech', 'brute', 'drone'],
    levelWidth: 160,
    powerupX: 50,
    music: null,
  },
  {
    name: 'LAVA DEPTHS',
    subtitle: 'DESCENT INTO FIRE',
    bg: 0x1a0800,
    groundColor: 0x553322,
    groundTop: 0x774422,
    groundDetail: 0x442211,
    platColor: 0x664433,
    platTop: 0x885533,
    platDetail: 0x553322,
    arenaWall: 0x662200,
    arenaWallInner: 0x883300,
    enemyTint: 0xff8844,
    enemySpeedMult: 1.3,
    enemyShootMult: 0.8,
    starColor: 0xff6600,
    starAlphaBase: 0.1,
    slippery: false,
    hazard: 'lava',
    bossPool: ['wyrm'],
    levelWidth: 140,
    powerupX: null,
    music: null,
  },
  {
    name: 'ICE CITADEL',
    subtitle: 'THE FROZEN THRONE',
    bg: 0x081020,
    groundColor: 0x445566,
    groundTop: 0x88aacc,
    groundDetail: 0x334455,
    platColor: 0x5577aa,
    platTop: 0x99bbdd,
    platDetail: 0x446688,
    arenaWall: 0x334466,
    arenaWallInner: 0x5577aa,
    enemyTint: 0x88ccff,
    enemySpeedMult: 1.1,
    enemyShootMult: 0.7,
    starColor: 0xaaddff,
    starAlphaBase: 0.3,
    slippery: true,
    hazard: null,
    bossPool: ['overlord'],
    levelWidth: 130,
    powerupX: null,
    music: null,
  },
];

export const BOSS_NAMES: Record<BossType, string> = {
  mech: 'SIEGE ENGINE',
  brute: 'VOID CRUSHER',
  drone: 'DEATH WING',
  wyrm: 'MAGMA WYRM',
  overlord: 'CRYO OVERLORD',
};

export const BOSS_HP: Record<BossType, number> = {
  mech: 30,
  brute: 25,
  drone: 14,
  wyrm: 35,
  overlord: 28,
};
