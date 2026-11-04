/**
 * Silnik gry: czyste funkcje (stan → nowy stan + efekty). Bez DOM, bez localStorage, bez Math.random.
 * Każda akcja klonuje stan wejściowy, więc wejście nigdy nie jest modyfikowane (cofanie ruchu = poprzedni stan).
 */
import { basePrice, BORROW, C, CITIES, COLLECT, DIFFS, DODGE, ECON, FARE, FUEL_PRICE, GOODS, GUN_FINE, LOSS, PROTECT, RESALE, MED, MED_PREMIUM, ROBBERY_CHANCE, RX, START, V, W } from './data';
import { pick, rng } from './rng';
import type {
  CityId, Diff, Fx, GameState, GoodId, ItemId, Msg, Outcome, PoliceChoice, Rating, RobberyChoice, Sender, Src, TradeMode,
  VehicleId, WeaponId,
} from './types';

const clone = <T>(x: T): T => structuredClone(x);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const m = (key: string, vars?: Msg['vars']): Msg => ({ key, vars });

// ---------------------------------------------------------------- nowa gra
export function newGame(diff: Diff, seed = Date.now() | 0): GameState {
  const D = DIFFS[diff];
  const s: GameState = {
    v: 1, seed, seed0: seed, diff, day: 1, maxDays: D.days, cash: START.cash, bank: 0, debt: D.debt, heat: START.heat,
    city: START.city, cap: START.cap, vehicle: 'backpack', weapons: [], inv: {}, events: [], sat: {},
    prices: {} as GameState['prices'], pharm: {} as GameState['pharm'],
    chat: [], unread: 0, tut: D.tut ? 0 : 4, rx: null, rxUnlocked: false,
    shortage: 0, canada: 0, teleOff: 0, traded: false, pending: null, over: false, debtPaidMsg: false, collectWarned: false, log: [],
  };
  genPrices(s);
  if (D.tut) {
    s.prices.waw.weed = 24; // samouczek: marihuana tania na start
    addChat(s, 'seba', 'tut0');
  }
  return s;
}

function genPrices(s: GameState) {
  for (const c of CITIES) {
    const row = {} as Record<GoodId, number>;
    for (const g of GOODS) {
      const mod = c.cheap.includes(g.id) ? 0.7 : c.exp.includes(g.id) ? 1.35 : 1;
      const noise = 1 + (rng(s) * 2 - 1) * (g.vol + 0.1);
      const ev = s.events.filter((e) => e.good === g.id && e.city === c.id).reduce((acc, e) => acc * e.mult, 1);
      const sat = 1 - (s.sat[c.id + g.id] ?? 0);
      row[g.id] = clamp(Math.round(basePrice(g.id) * mod * noise * ev * sat), Math.round(g.min * 0.3), g.max * 3);
    }
    s.prices[c.id] = row;
    // apteka: duży rozrzut cen między miastami (jak w rzeczywistości), czasem brak towaru
    s.pharm[c.id] = { price: Math.round((20 + rng(s) * 65) * (s.canada ? 0.6 : 1)), stock: !s.shortage && rng(s) < 0.75 };
  }
}

function addChat(s: GameState, from: Sender, key: string, vars?: Msg['vars']) {
  s.chat.push({ from, key, vars });
  s.unread++;
}

// ---------------------------------------------------------------- odczyty
export const used = (s: GameState) => Object.values(s.inv).reduce((a, x) => a + (x?.qty ?? 0), 0);
export const showAvg = (s: GameState) => DIFFS[s.diff].showAvg;

export function priceOf(s: GameState, item: ItemId, src: Src = 'street'): number {
  if (src === 'pharm') return s.pharm[s.city].price;
  if (item === MED.id) return Math.round(s.prices[s.city].weed * MED_PREMIUM);
  return s.prices[s.city][item];
}
export function rating(g: GoodId, p: number): Rating {
  const r = p / basePrice(g);
  return r < 0.85 ? 'cheap' : r > 1.15 ? 'exp' : 'norm';
}
export const pharmRating = (p: number): Rating => (p < 40 ? 'cheap' : p > 65 ? 'exp' : 'norm');

export const rxValid = (s: GameState) => !!s.rx && s.day <= s.rx.until;
export const rxLeft = (s: GameState) => (rxValid(s) && s.rx ? s.rx.limit - s.rx.used : 0);
export const legalQty = (s: GameState) => (rxValid(s) ? s.inv[MED.id]?.qty ?? 0 : 0);
export const stashValue = (s: GameState) =>
  (Object.entries(s.inv) as [ItemId, { qty: number }][]).reduce((a, [g, x]) => a + x.qty * priceOf(s, g), 0);
export const score = (s: GameState) => s.cash + s.bank - s.debt;
export const rankOf = (sc: number) => (sc <= 0 ? 0 : sc < 20000 ? 1 : sc < 100000 ? 2 : sc < 500000 ? 3 : sc < 2e6 ? 4 : 5);

/** Jakie tryby handlu są możliwe: apteka tylko kupno, susz apteczny na ulicy tylko sprzedaż */
export function tradeModes(item: ItemId, src: Src): TradeMode[] {
  if (src === 'pharm') return ['buy'];
  if (item === MED.id) return ['sell'];
  return ['buy', 'sell'];
}
export function tradeLimits(s: GameState, item: ItemId, src: Src) {
  const p = priceOf(s, item, src);
  const own = s.inv[item]?.qty ?? 0;
  let maxBuy = tradeModes(item, src).includes('buy') ? Math.max(0, Math.min(Math.floor(s.cash / p), s.cap - used(s))) : 0;
  if (src === 'pharm') maxBuy = s.pharm[s.city].stock ? Math.min(maxBuy, rxLeft(s)) : 0;
  return { p, own, maxBuy };
}
/** Domyślny tryb po otwarciu panelu: sprzedaj, jeśli masz towar i nie jest tu tani */
export function defaultMode(s: GameState, item: ItemId, src: Src): TradeMode {
  const modes = tradeModes(item, src);
  if (modes.length === 1) return modes[0];
  return s.inv[item] && rating(item as GoodId, priceOf(s, item)) !== 'cheap' ? 'sell' : 'buy';
}

// ---------------------------------------------------------------- handel
export function trade(prev: GameState, item: ItemId, mode: TradeMode, n: number, src: Src = 'street'): Outcome {
  const L = tradeLimits(prev, item, src);
  if (n <= 0 || !tradeModes(item, src).includes(mode) || n > (mode === 'buy' ? L.maxBuy : L.own)) return { s: prev, fx: [] };
  const s = clone(prev);
  const p = L.p;
  const it = (s.inv[item] ??= { qty: 0, avg: 0 });
  if (mode === 'buy') {
    it.avg = (it.avg * it.qty + p * n) / (it.qty + n);
    it.qty += n;
    s.cash -= p * n;
    if (src === 'pharm' && s.rx) s.rx.used += n;
    else if (n > ECON.bigTrade) s.heat = Math.min(100, s.heat + 5);
  } else {
    it.qty -= n;
    s.cash += p * n;
    if (it.qty === 0) delete s.inv[item];
    // Cena w ciągu dnia się nie zmienia. Sprzedaż „nasyca” rynek i obniża cenę dopiero od kolejnych dni
    // (genPrices; efekt maks. 50%, słabnie o połowę co dzień, cena nigdy poniżej 30% minimum).
    const mk: GoodId = item === MED.id ? 'weed' : item; // sprzedaż suszu aptecznego nasyca rynek ulicznej marihuany
    const k = s.city + mk;
    s.sat[k] = Math.min(ECON.satMax, (s.sat[k] ?? 0) + n * ECON.satPerUnit);
    if (item === MED.id) s.heat = Math.min(100, s.heat + 3);
    else if (n > ECON.bigTrade) s.heat = Math.min(100, s.heat + 5);
  }
  s.traded = true;
  if (s.tut === 0 && mode === 'buy' && item === 'weed') { s.tut = 1; addChat(s, 'seba', 'tut1'); }
  else if (s.tut === 2 && mode === 'sell') { s.tut = 3; addChat(s, 'seba', 'tut3'); }
  return { s, fx: [{ t: 'toast', msg: m(mode === 'buy' ? 'bought' : 'sold', { n, good: item }), undo: true }] };
}

// ---------------------------------------------------------------- podróż
/**
 * Podróż do innego miasta. `dodge` = jazda na gapę: bez biletu, z ryzykiem mandatu.
 * Bez pieniędzy na bilet można jechać tylko na gapę.
 */
/** Koszt podróży: bilet na pociąg albo paliwo do własnego pojazdu */
/** Odległość drogowa między miastami w km (w linii prostej × FARE.road, zaokrąglona do 5 km) */
export function distanceKm(a: CityId, b: CityId): number {
  if (a === b) return 0;
  const R = 6371, rad = Math.PI / 180;
  const A = C[a], B = C[b];
  const dLat = (B.lat - A.lat) * rad, dLon = (B.lon - A.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * rad) * Math.cos(B.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round((2 * R * Math.asin(Math.sqrt(h)) * FARE.road) / 5) * 5;
}
/** Cena biletu na pociąg zależy od odległości */
export const ticketPrice = (a: CityId, b: CityId) => Math.round(FARE.base + FARE.perKm * distanceKm(a, b));
/** Koszt podróży z obecnego miasta: bilet albo paliwo (km × spalanie × cena litra) */
export function travelCost(s: GameState, to: CityId): { kind: 'ticket' | 'fuel'; cost: number; km: number } {
  const fuel = V[s.vehicle].fuel;
  const ticket = ticketPrice(s.city, to);
  const km = distanceKm(s.city, to);
  return fuel ? { kind: 'fuel', cost: Math.round((km * fuel * FUEL_PRICE) / 100), km } : { kind: 'ticket', cost: ticket, km };
}
export function travel(prev: GameState, to: CityId, dodge = false): Outcome {
  if (to === prev.city || prev.day >= prev.maxDays || prev.pending || prev.over) return { s: prev, fx: [] };
  const c = C[to];
  const cost = travelCost(prev, to).cost;
  if (!dodge && prev.cash < cost) return { s: prev, fx: [] };
  if (dodge && V[prev.vehicle].fuel) return { s: prev, fx: [] }; // własnym pojazdem nie da się jechać na gapę
  const s = clone(prev);
  const fx: Fx[] = [];
  if (!dodge) s.cash -= cost;
  else if (rng(s) < DODGE.chance) {
    // kanar: płacisz z gotówki, a jak nie masz — Zbychu płaci za ciebie i dopisuje do długu
    if (s.cash >= DODGE.fine) { s.cash -= DODGE.fine; fx.push({ t: 'info', title: 'kanarTitle', body: [m('kanarPaid', { f: DODGE.fine })] }); }
    else { s.debt += DODGE.fine; fx.push({ t: 'info', title: 'kanarTitle', body: [m('kanarDebt', { f: DODGE.fine })] }); }
  } else fx.push({ t: 'toast', msg: m('dodgeOk') });
  s.city = to;
  s.day++;
  s.debt = Math.round(s.debt * (1 + ECON.debtRate));
  s.bank = Math.round(s.bank * (1 + ECON.bankRate));
  if (s.debt > collectAt(s)) {
    if (!s.collectWarned) { s.collectWarned = true; addChat(s, 'zbychu', 'zbychuWarn', { c: collectAt(s) }); }
    else if (s.day % COLLECT.every === 0) fx.push(collectors(s));
  }
  s.heat = Math.max(0, s.heat - (s.traded ? 2 : 10));
  s.traded = false;
  for (const k in s.sat) s.sat[k] *= 0.5;
  s.events = s.events.map((e) => ({ ...e, days: e.days - 1 })).filter((e) => e.days > 0);
  s.shortage = Math.max(0, s.shortage - 1);
  s.canada = Math.max(0, s.canada - 1);
  s.teleOff = Math.max(0, s.teleOff - 1);

  // wydarzenia rynkowe
  const roll = rng(s);
  if (s.rxUnlocked && roll < ECON.rxNewsChance) {
    const k = rng(s);
    const key = k < 0.34 ? 'evShort' : k < 0.67 ? 'evCanada' : 'evMinistry';
    if (key === 'evShort') { s.shortage = 2; for (const ci of CITIES) s.events.push({ good: 'weed', city: ci.id, mult: 1.5, days: 2 }); }
    if (key === 'evCanada') s.canada = 3;
    if (key === 'evMinistry') s.teleOff = 5;
    addChat(s, 'news', key);
    fx.push({ t: 'toast', msg: m(key) });
  } else if (roll < ECON.newsChance) {
    const g = pick(s, GOODS).id;
    const ci = pick(s, CITIES).id;
    const up = rng(s) < 0.5;
    s.events.push({ good: g, city: ci, mult: up ? 2.6 : 0.35, days: 2 });
    const key = up ? 'newsUp' : 'newsDown';
    addChat(s, 'news', key, { good: g, city: ci });
    fx.push({ t: 'toast', msg: m(key, { good: g, city: ci }) });
  }
  genPrices(s);

  // samouczek, odblokowanie recepty, przypomnienia lichwiarza
  if (s.tut <= 1 && to === 'krk' && s.inv.weed) s.prices.krk.weed = 76;
  if (s.tut === 1 && to === 'krk') { s.tut = 2; addChat(s, 'seba', 'tut2'); }
  if (!s.rxUnlocked && s.tut >= 3 && s.day >= RX.unlockDay) { s.rxUnlocked = true; addChat(s, 'seba', 'rxIntro'); }
  if (s.day % 5 === 0 && s.debt > 0) addChat(s, 'zbychu', s.debt > 15000 ? 'zbychu2' : 'zbychu1', { d: s.debt });

  // kontrola policji albo napad (nie w trakcie samouczka, tylko gdy coś wieziesz)
  if (s.tut >= 3 && used(s) > 0) {
    const chance = (0.06 + s.heat * 0.004 + c.police * 0.02) * DIFFS[s.diff].police * V[s.vehicle].police;
    if (rng(s) < chance) fx.push(...startPolice(s));
    else if (rng(s) < ROBBERY_CHANCE * DIFFS[s.diff].police) s.pending = { kind: 'robbery', runP: V[s.vehicle].run, fightP: fightChance(s) };
  }
  return bankruptCheck({ s, fx });
}

/** Ostatni dzień: gracz kończy grę ręcznie */
export function finish(prev: GameState): Outcome {
  if (prev.over) return { s: prev, fx: [] };
  const s = clone(prev);
  s.over = true;
  return { s, fx: [{ t: 'end' }] };
}

// ---------------------------------------------------------------- policja
function startPolice(s: GameState): Fx[] {
  const legal = legalQty(s);
  const illegal = used(s) - legal;
  if (illegal <= 0) return [{ t: 'info', title: 'polTitle', body: [m('polLegal')] }];
  const value = stashValue(s) - legal * priceOf(s, MED.id);
  s.pending = {
    kind: 'police', illegal, legal,
    runP: V[s.vehicle].run,
    bribeC: Math.round(200 + value * 0.1),
    bribeP: Math.max(20, Math.round(75 - s.heat / 2)),
    canBluff: rxValid(s) && !!s.inv.weed,
  };
  return [];
}
/** Zabiera nielegalny towar; susz apteczny na ważną receptę zostaje */
/**
 * Zabiera ułamek `share` każdego towaru (zaokrąglając w górę).
 * `keepLegal`: susz apteczny na ważną receptę zostaje nietknięty. Zwraca true, jeśli coś legalnego ocalało.
 */
function loseShare(s: GameState, share: number, keepLegal: boolean): boolean {
  const legal = keepLegal && legalQty(s) > 0;
  for (const [k, h] of Object.entries(s.inv) as [ItemId, { qty: number; avg: number }][]) {
    if (legal && k === MED.id) continue;
    h.qty -= Math.ceil(h.qty * share);
    if (h.qty <= 0) delete s.inv[k];
  }
  return legal;
}
export function resolvePolice(prev: GameState, choice: PoliceChoice): Outcome {
  const P = prev.pending;
  if (!P || P.kind !== 'police') return { s: prev, fx: [] };
  if (choice === 'bribe' && prev.cash < P.bribeC) return { s: prev, fx: [] };
  if (choice === 'bluff' && !P.canBluff) return { s: prev, fx: [] };
  const s = clone(prev);
  s.pending = null;
  const body: Msg[] = [];
  const caught = (mult = 1, key = 'caught') => {
    const f = Math.round(s.cash * LOSS.policeFine * mult);
    s.cash -= f;
    s.heat = Math.min(100, s.heat + 15);
    body.push(m(key, { f }));
    if (loseShare(s, LOSS.policeCaught, true)) body.push(m('keptMed'));
    const illegal = s.weapons.filter((w) => !W[w].legal);
    if (illegal.length) { s.weapons = s.weapons.filter((w) => W[w].legal); s.cash = Math.max(0, s.cash - GUN_FINE); body.push(m('gunLost', { f: GUN_FINE })); }
  };
  if (choice === 'run') {
    if (rng(s) * 100 < P.runP) { s.heat = Math.min(100, s.heat + 10); body.push(m('okRun')); } else caught();
  } else if (choice === 'dump') {
    body.push(m('dumped'));
    if (loseShare(s, LOSS.policeDump, true)) body.push(m('keptMed'));
  } else if (choice === 'bribe') {
    s.cash -= P.bribeC;
    if (rng(s) * 100 < P.bribeP) body.push(m('bribed')); else caught();
  } else {
    if (rng(s) * 100 < RX.bluffChance) body.push(m('bluffOk')); else caught(2, 'bluffFail');
  }
  return bankruptCheck({ s, fx: [{ t: 'info', title: 'polTitle', body }] });
}

// ---------------------------------------------------------------- napad
export function resolveRobbery(prev: GameState, choice: RobberyChoice): Outcome {
  const P = prev.pending;
  if (!P || P.kind !== 'robbery') return { s: prev, fx: [] };
  if (choice === 'fight' && !P.fightP) return { s: prev, fx: [] };
  const s = clone(prev);
  s.pending = null;
  const body: Msg[] = [];
  const lose = (cashShare: number, key: string) => {
    const f = Math.round(s.cash * cashShare);
    s.cash -= f;
    loseShare(s, LOSS.robFail, false);
    body.push(m(key, { f }));
  };
  if (choice === 'give') {
    loseShare(s, LOSS.robGive, false);
    body.push(m('robGive'));
  } else if (choice === 'run') {
    if (rng(s) * 100 < P.runP) body.push(m('robRunOk')); else lose(0, 'robRunFail');
  } else {
    if (rng(s) * 100 < P.fightP) body.push(m('robFightOk'));
    else {
      lose(LOSS.robFightCash, 'robFightFail');
      // napastnicy zabierają najlepszą broń
      const best = bestWeapon(s);
      if (best) { s.weapons = s.weapons.filter((w) => w !== best); body.push(m('robLostWeapon', { w: best })); }
    }
  }
  return bankruptCheck({ s, fx: [{ t: 'info', title: 'robTitle', body }] });
}

// ---------------------------------------------------------------- sklep
export const vehicleIndex = (id: VehicleId) => Object.keys(V).indexOf(id);
/** Transport kupujemy tylko „w górę” — każdy następny ma więcej miejsca */
export function canBuyVehicle(s: GameState, id: VehicleId) {
  return vehicleIndex(id) > vehicleIndex(s.vehicle) && s.cash >= V[id].price;
}
export function buyVehicle(prev: GameState, id: VehicleId): Outcome {
  if (!canBuyVehicle(prev, id)) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash -= V[id].price;
  s.vehicle = id;
  s.cap = V[id].cap;
  return { s, fx: [{ t: 'toast', msg: m('boughtGear', { item: id }) }] };
}
/** Odsprzedaż pojazdu (powrót do zwykłego plecaka) */
export const vehicleResale = (s: GameState) => (s.vehicle === 'backpack' ? 0 : Math.floor(V[s.vehicle].price * RESALE));
/** Ile towaru trzeba się pozbyć, żeby zmieścić się w zwykłym plecaku */
export const overflowIfSold = (s: GameState) => Math.max(0, used(s) - V.backpack.cap);
export const canSellVehicle = (s: GameState) => vehicleResale(s) > 0 && overflowIfSold(s) === 0;
export function sellVehicle(prev: GameState): Outcome {
  if (!canSellVehicle(prev)) return { s: prev, fx: [] };
  const s = clone(prev);
  const sold = s.vehicle;
  s.cash += vehicleResale(prev);
  s.vehicle = 'backpack';
  s.cap = V.backpack.cap;
  return { s, fx: [{ t: 'toast', msg: m('soldGear', { item: sold, c: vehicleResale(prev) }) }] };
}
/** Brakuje na paliwo: pożycz brakującą kwotę od Zbycha i jedź */
export function fuelShortfall(s: GameState, to: CityId) {
  return Math.max(0, travelCost(s, to).cost - s.cash);
}
export function borrowAndTravel(prev: GameState, to: CityId): Outcome {
  const need = fuelShortfall(prev, to);
  if (need <= 0 || borrowLimit(prev) < need) return { s: prev, fx: [] };
  const b = borrow(prev, need);
  const t = travel(b.s, to);
  return t.s === b.s ? { s: prev, fx: [] } : { s: t.s, fx: [...b.fx, ...t.fx] };
}
export const canBuyWeapon = (s: GameState, id: WeaponId) => !s.weapons.includes(id) && s.cash >= W[id].price;
/** Najlepszy posiadany przedmiot ochrony */
export function bestWeapon(s: GameState): WeaponId | null {
  return s.weapons.reduce<WeaponId | null>((b, w) => (!b || W[w].fight > W[b].fight ? w : b), null);
}
/** Szansa obrony: najlepszy przedmiot + bonus za każdy kolejny (z limitem); 0 bez ochrony */
export function fightChance(s: GameState): number {
  const best = bestWeapon(s);
  if (!best) return 0;
  return Math.min(PROTECT.max, W[best].fight + PROTECT.perExtra * (s.weapons.length - 1));
}
export function buyWeapon(prev: GameState, id: WeaponId): Outcome {
  if (!canBuyWeapon(prev, id)) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash -= W[id].price;
  s.weapons = [...s.weapons, id]; // przedmioty się sumują
  return { s, fx: [{ t: 'toast', msg: m('boughtGear', { item: id }) }] };
}

// ---------------------------------------------------------------- recepta
export const canVisitClinic = (s: GameState) => !!C[s.city].clinic && s.cash >= RX.visit;
export function clinicVisit(prev: GameState): Outcome {
  if (!prev.rxUnlocked || !canVisitClinic(prev)) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash -= RX.visit;
  s.rx = { limit: RX.limit, used: 0, until: s.day + RX.valid, visit: s.day };
  addChat(s, 'seba', 'rxGot');
  return { s, fx: [{ t: 'toast', msg: m('rxInfo', { u: 0, l: RX.limit, d: s.rx.until }) }] };
}
export type TeleStatus = 'ok' | 'none' | 'off' | 'window' | 'cash';
export function teleStatus(s: GameState): TeleStatus {
  if (!s.rx) return 'none';
  if (s.teleOff) return 'off';
  if (s.day - s.rx.visit > RX.teleWindow) return 'window';
  if (s.cash < RX.tele) return 'cash';
  return 'ok';
}
export function teleRenew(prev: GameState): Outcome {
  if (teleStatus(prev) !== 'ok' || !prev.rx) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash -= RX.tele;
  // wizyta stacjonarna się nie zmienia: okno teleporady liczy się od niej
  s.rx = { ...s.rx!, used: 0, until: s.day + RX.valid };
  return { s, fx: [{ t: 'toast', msg: m('teleDone', { d: s.rx.until }) }] };
}

// ---------------------------------------------------------------- dług: pożyczki, windykacja, bankructwo
const startDebt = (s: GameState) => DIFFS[s.diff].debt;
export const collectAt = (s: GameState) => startDebt(s) * COLLECT.atMult;
/** Ile jeszcze można pożyczyć od Zbycha */
export function borrowLimit(s: GameState): number {
  const worth = s.cash + s.bank + stashValue(s);
  const cap = Math.max(BORROW.capMult * startDebt(s), BORROW.worthMult * worth);
  return Math.max(0, Math.floor(cap - s.debt));
}
export function borrow(prev: GameState, amount: number): Outcome {
  const x = amountIn(amount, borrowLimit(prev));
  if (x <= 0 || prev.over) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash += x;
  s.debt += x;
  s.debtPaidMsg = false;
  return { s, fx: [{ t: 'toast', msg: m('borrowed', { c: x }) }] };
}
/** Windykatorzy: zabierają część gotówki, a gdy jej brak — połowę towaru. Zabrane idzie na poczet długu. */
function collectors(s: GameState): Fx {
  const cash = Math.floor(Math.min(s.debt, s.cash * COLLECT.cashShare));
  addChat(s, 'zbychu', 'collChat');
  if (cash >= 100) {
    s.cash -= cash;
    s.debt -= cash;
    return { t: 'info', title: 'collTitle', body: [m('collCash', { c: cash })] };
  }
  let value = 0;
  for (const [k, h] of Object.entries(s.inv) as [ItemId, { qty: number; avg: number }][]) {
    const take = Math.ceil(h.qty * COLLECT.stashShare);
    value += take * priceOf(s, k) * 0.5; // windykator „wycenia” towar po połowie ceny
    h.qty -= take;
    if (h.qty <= 0) delete s.inv[k];
  }
  value = Math.floor(Math.min(value, s.debt));
  s.debt -= value;
  return { t: 'info', title: 'collTitle', body: [m(value > 0 ? 'collStash' : 'collNothing', { c: value })] };
}
/** Bankrut: brak gotówki, banku, towaru i możliwości pożyczki — nie da się już nic zrobić */
export function isBankrupt(s: GameState): boolean {
  if (s.pending || s.over) return false;
  const cheapest = Math.min(...Object.values(s.prices[s.city]));
  return s.cash + s.bank < cheapest && used(s) === 0 && borrowLimit(s) < cheapest && vehicleResale(s) === 0;
}
function bankruptCheck(o: Outcome): Outcome {
  if (!isBankrupt(o.s)) return o;
  o.s.over = true;
  return { s: o.s, fx: [...o.fx.filter((f) => f.t !== 'info'), { t: 'end', reason: 'bankrupt' }] };
}

// ---------------------------------------------------------------- portfel
/** Kwota przycięta do zakresu 0..max, w pełnych złotych */
const amountIn = (amount: number, max: number) => Math.max(0, Math.min(Math.floor(amount), max));

/** Spłata długu: dowolna kwota (domyślnie tyle, ile się da) */
export function repay(prev: GameState, amount = Infinity): Outcome {
  const x = amountIn(amount, Math.min(prev.cash, prev.debt));
  if (x <= 0) return { s: prev, fx: [] };
  const s = clone(prev);
  s.cash -= x;
  s.debt -= x;
  const fx: Fx[] = [];
  if (s.debt === 0 && !s.debtPaidMsg) {
    s.debtPaidMsg = true;
    addChat(s, 'zbychu', 'zbychuPaid');
    fx.push({ t: 'toast', msg: m('zbychuPaid') });
  }
  return { s, fx };
}
export function deposit(prev: GameState, amount = Infinity): Outcome {
  const x = amountIn(amount, prev.cash);
  if (x <= 0) return { s: prev, fx: [] };
  return { s: { ...clone(prev), bank: prev.bank + x, cash: prev.cash - x }, fx: [] };
}
export function withdraw(prev: GameState, amount = Infinity): Outcome {
  const x = amountIn(amount, prev.bank);
  if (x <= 0) return { s: prev, fx: [] };
  return { s: { ...clone(prev), cash: prev.cash + x, bank: prev.bank - x }, fx: [] };
}

// ---------------------------------------------------------------- drobne
export function skipTutorial(prev: GameState): GameState {
  return { ...prev, tut: 4 };
}
export function markChatRead(prev: GameState): GameState {
  return prev.unread ? { ...prev, unread: 0 } : prev;
}
