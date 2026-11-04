export type Lang = 'pl' | 'en';
export type Diff = 'easy' | 'normal' | 'hard';
export type GoodId = 'weed' | 'hash' | 'shrooms' | 'speed' | 'mefa' | 'ecstasy' | 'coke' | 'heroin';
/** Towar w ekwipunku: towary uliczne + susz apteczny */
export type ItemId = GoodId | 'medweed';
export type CityId = 'waw' | 'krk' | 'gda' | 'szc' | 'wro' | 'poz' | 'lod' | 'kat';
/** Skąd kupujemy: ulica albo apteka (tylko susz apteczny, na receptę) */
export type Src = 'street' | 'pharm';
export type TradeMode = 'buy' | 'sell';
export type Rating = 'cheap' | 'norm' | 'exp';

/**
 * Komunikat do przetłumaczenia. Logika gry nigdy nie produkuje gotowego tekstu,
 * tylko klucz + zmienne; `good` i `city` to identyfikatory, liczby formatuje UI.
 */
export interface Msg {
  key: string;
  vars?: Record<string, string | number>;
}
export type Sender = 'seba' | 'zbychu' | 'news';
export interface ChatMsg extends Msg {
  from: Sender;
}

export interface Holding {
  qty: number;
  avg: number;
}
export interface Rx {
  limit: number;
  used: number;
  /** ostatni dzień ważności (włącznie) */
  until: number;
  /** dzień wizyty stacjonarnej, od niego liczy się okno teleporady */
  visit: number;
}
export interface MarketEvent {
  good: GoodId;
  city: CityId;
  mult: number;
  days: number;
}
export interface PharmacyOffer {
  price: number;
  stock: boolean;
}
export type VehicleId = 'backpack' | 'bigpack' | 'scooter' | 'car' | 'van';
export type WeaponId = 'spray' | 'bat' | 'gun';
export type PoliceChoice = 'run' | 'dump' | 'bribe' | 'bluff';
export type RobberyChoice = 'give' | 'run' | 'fight';
export interface PolicePending {
  kind: 'police';
  illegal: number;
  legal: number;
  runP: number;
  bribeC: number;
  bribeP: number;
  canBluff: boolean;
}
/** Napad na trasie */
export interface RobberyPending {
  kind: 'robbery';
  runP: number;
  /** 0 = brak broni */
  fightP: number;
}
export type Pending = PolicePending | RobberyPending;

export interface GameState {
  v: 1;
  seed: number;
  diff: Diff;
  day: number;
  maxDays: number;
  cash: number;
  bank: number;
  debt: number;
  heat: number;
  city: CityId;
  cap: number;
  vehicle: VehicleId;
  weapon: WeaponId | null;
  inv: Partial<Record<ItemId, Holding>>;
  events: MarketEvent[];
  /** nasycenie rynku sprzedażą gracza, klucz: city+good */
  sat: Record<string, number>;
  prices: Record<CityId, Record<GoodId, number>>;
  pharm: Record<CityId, PharmacyOffer>;
  chat: ChatMsg[];
  unread: number;
  /** krok samouczka: 0..3 aktywny, 4 = zakończony */
  tut: number;
  rx: Rx | null;
  rxUnlocked: boolean;
  shortage: number;
  canada: number;
  teleOff: number;
  traded: boolean;
  /** trwająca kontrola policji; zapisana w stanie, więc odświeżenie strony jej nie omija */
  pending: Pending | null;
  over: boolean;
  debtPaidMsg: boolean;
  /** Zbychu już ostrzegł przed windykacją */
  collectWarned: boolean;
}

/** Efekty uboczne dla UI (toast, okno z informacją, koniec gry) */
export type Fx =
  | { t: 'toast'; msg: Msg; undo?: boolean }
  | { t: 'info'; title: string; body: Msg[] }
  | { t: 'end'; reason?: 'bankrupt' };

export interface Outcome {
  s: GameState;
  fx: Fx[];
}
