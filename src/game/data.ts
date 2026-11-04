import type { CityId, Diff, GoodId, VehicleId, WeaponId } from './types';

export interface Good {
  id: GoodId;
  min: number;
  max: number;
  /** zmienność ceny */
  vol: number;
  e: string;
}
export interface City {
  id: CityId;
  cheap: GoodId[];
  exp: GoodId[];
  /** poziom policji 1..3 */
  police: number;
  ticket: number;
  clinic?: boolean;
}

export const GOODS: Good[] = [
  { id: 'weed', min: 20, max: 80, vol: 0.15, e: '🌿' },
  { id: 'hash', min: 40, max: 140, vol: 0.15, e: '🟫' },
  { id: 'shrooms', min: 50, max: 200, vol: 0.25, e: '🍄' },
  { id: 'speed', min: 30, max: 150, vol: 0.25, e: '⚡' },
  { id: 'mefa', min: 40, max: 220, vol: 0.35, e: '🧪' },
  { id: 'ecstasy', min: 30, max: 160, vol: 0.25, e: '💊' },
  { id: 'coke', min: 250, max: 900, vol: 0.25, e: '❄️' },
  { id: 'heroin', min: 400, max: 1400, vol: 0.35, e: '🥀' },
];

export const CITIES: City[] = [
  { id: 'waw', cheap: [], exp: ['coke', 'ecstasy'], police: 3, ticket: 60, clinic: true },
  { id: 'krk', cheap: [], exp: ['weed', 'ecstasy'], police: 2, ticket: 50, clinic: true },
  { id: 'gda', cheap: ['coke'], exp: ['speed'], police: 2, ticket: 70, clinic: true },
  { id: 'szc', cheap: ['coke', 'heroin'], exp: [], police: 1, ticket: 80 },
  { id: 'wro', cheap: ['ecstasy'], exp: ['speed'], police: 2, ticket: 60, clinic: true },
  { id: 'poz', cheap: ['weed'], exp: ['coke'], police: 1, ticket: 55, clinic: true },
  { id: 'lod', cheap: ['speed', 'mefa'], exp: [], police: 1, ticket: 40 },
  { id: 'kat', cheap: ['speed'], exp: ['weed', 'mefa'], police: 2, ticket: 50 },
];

export const DIFFS: Record<Diff, { days: number; debt: number; police: number; tut: boolean; showAvg: boolean }> = {
  easy: { days: 45, debt: 3000, police: 0.5, tut: true, showAvg: true },
  normal: { days: 30, debt: 5000, police: 1, tut: true, showAvg: true },
  hard: { days: 30, debt: 10000, police: 1.5, tut: false, showAvg: false },
};

export const START = { cash: 2000, heat: 5, cap: 100, city: 'waw' as CityId };
export const ECON = {
  debtRate: 0.07,
  bankRate: 0.01,
  /** spadek ceny o ten ułamek za każdą sprzedaną sztukę */
  satPerUnit: 0.004,
  satMax: 0.5,
  bigTrade: 50,
  newsChance: 0.35,
  rxNewsChance: 0.1,
};

/** Transport: pojemność, szansa ucieczki przed policją/napadem, mnożnik szansy kontroli */
export interface Vehicle { id: VehicleId; price: number; cap: number; run: number; police: number }
export const VEHICLES: Vehicle[] = [
  { id: 'backpack', price: 0, cap: 100, run: 50, police: 1 },
  { id: 'bigpack', price: 1500, cap: 150, run: 45, police: 1 }, // cięższy = trudniej uciec
  { id: 'scooter', price: 8000, cap: 200, run: 65, police: 1 },
  { id: 'car', price: 25000, cap: 350, run: 55, police: 1 },
  { id: 'van', price: 70000, cap: 700, run: 35, police: 1.25 },
];
/** Ochrona przed napadem. Nielegalna broń: przy złapaniu przez policję konfiskata + dodatkowa grzywna */
export interface Weapon { id: WeaponId; price: number; fight: number; legal: boolean }
export const WEAPONS: Weapon[] = [
  { id: 'spray', price: 300, fight: 40, legal: true },
  { id: 'bat', price: 800, fight: 55, legal: true },
  { id: 'gun', price: 6000, fight: 80, legal: false },
];
export const GUN_FINE = 1000;
/** Ochrona się sumuje: najlepszy przedmiot + bonus za każdy kolejny, z limitem */
export const PROTECT = { perExtra: 5, max: 90 };
/** Jazda na gapę: szansa na kanara i wysokość mandatu */
export const DODGE = { chance: 0.3, fine: 150 };
/** Pożyczka od Zbycha: limit długu = max(capMult × dług startowy, worthMult × majątek) */
export const BORROW = { capMult: 3, worthMult: 2 };
/** Windykacja: powyżej atMult × długu startowego, co `every` dni zabierają część gotówki albo towaru */
export const COLLECT = { atMult: 2, every: 3, cashShare: 0.3, stashShare: 0.5 };
export const ROBBERY_CHANCE = 0.07; // × mnożnik poziomu trudności (jak kontrole policji)
/** Ile towaru tracisz: pewna opcja (wyrzuć/oddaj) vs porażka (złapany, nieudana ucieczka/walka) */
export const LOSS = { policeDump: 0.5, policeCaught: 0.5, policeFine: 0.2, robGive: 0.25, robFail: 0.5, robFightCash: 0.2 };
export const V = Object.fromEntries(VEHICLES.map((v) => [v.id, v])) as Record<VehicleId, Vehicle>;
export const W = Object.fromEntries(WEAPONS.map((w) => [w.id, w])) as Record<WeaponId, Weapon>;

/** Susz apteczny: na ulicy schodzi za cenę marihuany × MED_PREMIUM */
export const MED = { id: 'medweed' as const, e: '🏥' };
export const MED_PREMIUM = 1.4;
export const RX = { visit: 250, tele: 150, limit: 30, valid: 10, teleWindow: 10, unlockDay: 3, bluffChance: 35 };

export const G = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<GoodId, Good>;
export const C = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<CityId, City>;
export const basePrice = (g: GoodId) => (G[g].min + G[g].max) / 2;
