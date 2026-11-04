import { describe, expect, it } from 'vitest';
import { BORROW, COLLECT, DODGE, RX, V, W } from '../src/game/data';
import {
  deposit, withdraw,
  borrow, borrowLimit, isBankrupt,
  buyVehicle, buyWeapon, canBuyVehicle, clinicVisit, finish, newGame, repay, resolvePolice, resolveRobbery,
  rxLeft, teleRenew, teleStatus, trade, tradeLimits, travel, used,
} from '../src/game/engine';
import { addEntry, BOARD_SIZE, forDiff } from '../src/game/leaderboard';
import { parseSave } from '../src/game/save';
import type { GameState } from '../src/game/types';

const afterTutorial = (seed = 42): GameState => ({ ...newGame('normal', seed), tut: 4 });

describe('nowa gra', () => {
  it('ustawia parametry poziomu trudności', () => {
    expect(newGame('easy', 1)).toMatchObject({ maxDays: 45, debt: 3000, tut: 0 });
    expect(newGame('hard', 1)).toMatchObject({ maxDays: 30, debt: 10000, tut: 4 });
  });
  it('jest deterministyczna dla tego samego seeda', () => {
    expect(newGame('normal', 7).prices).toEqual(newGame('normal', 7).prices);
  });
  it('samouczek: marihuana w Warszawie jest tania', () => {
    expect(newGame('normal', 1).prices.waw.weed).toBe(24);
  });
});

describe('handel', () => {
  it('kupno i sprzedaż zmieniają gotówkę i ekwipunek, wejście nie jest modyfikowane', () => {
    const s0 = newGame('normal', 3);
    const { s: s1 } = trade(s0, 'weed', 'buy', 10);
    expect(s0.inv.weed).toBeUndefined();
    expect(s1.inv.weed).toEqual({ qty: 10, avg: 24 });
    expect(s1.cash).toBe(2000 - 240);
    expect(s1.tut).toBe(1);
    const { s: s2 } = trade(s1, 'weed', 'sell', 10);
    expect(s2.inv.weed).toBeUndefined();
    expect(s2.cash).toBe(2000);
  });
  it('odrzuca transakcję ponad limit', () => {
    const s0 = newGame('normal', 3);
    expect(trade(s0, 'weed', 'buy', 1000).s).toBe(s0);
    expect(trade(s0, 'weed', 'sell', 1).s).toBe(s0);
  });
});

describe('podróż', () => {
  it('następny dzień, odsetki od długu, koszt biletu', () => {
    const s0 = afterTutorial();
    const { s } = travel(s0, 'krk');
    expect(s.day).toBe(2);
    expect(s.debt).toBe(Math.round(5000 * 1.07));
    expect(s.city).toBe('krk');
  });
  it('lichwiarz nie pisze, gdy dług jest spłacony', () => {
    let s = { ...afterTutorial(), debt: 0, day: 4 };
    s = travel(s, 'krk').s;
    expect(s.day).toBe(5);
    expect(s.chat.some((c) => c.from === 'zbychu')).toBe(false);
  });
  it('nie da się podróżować ostatniego dnia ani w trakcie kontroli', () => {
    const last = { ...afterTutorial(), day: 30 };
    expect(travel(last, 'krk').s).toBe(last);
    expect(finish(last).s.over).toBe(true);
  });
  it('recepta odblokowuje się od 3. dnia po samouczku', () => {
    let s = afterTutorial();
    s = travel(s, 'krk').s;
    s = travel(s, 'waw').s;
    expect(s.rxUnlocked).toBe(true);
  });
});

describe('recepta i apteka', () => {
  const withRx = () => {
    let s: GameState = { ...afterTutorial(), rxUnlocked: true, cash: 10000 };
    s = clinicVisit(s).s;
    s.pharm.waw = { price: 30, stock: true };
    return s;
  };
  it('wizyta w klinice daje receptę', () => {
    const s = withRx();
    expect(s.rx).toMatchObject({ limit: RX.limit, used: 0, until: 1 + RX.valid });
    expect(s.cash).toBe(10000 - RX.visit);
  });
  it('apteka: zakup ograniczony limitem recepty', () => {
    const s = withRx();
    expect(tradeLimits(s, 'medweed', 'pharm').maxBuy).toBe(RX.limit);
    const s2 = trade(s, 'medweed', 'buy', RX.limit, 'pharm').s;
    expect(rxLeft(s2)).toBe(0);
    expect(tradeLimits(s2, 'medweed', 'pharm').maxBuy).toBe(0);
  });
  it('kontrola z samym legalnym suszem: bez konsekwencji', () => {
    const s = trade(withRx(), 'medweed', 'buy', 10, 'pharm').s;
    // wymuszamy kontrolę: wysoki heat i wiele prób
    let hit = false;
    for (let seed = 0; seed < 200 && !hit; seed++) {
      const r = travel({ ...s, seed, heat: 100 }, 'krk');
      const info = r.fx.find((f) => f.t === 'info');
      if (info && info.t === 'info' && info.body[0].key === 'polLegal') hit = true;
    }
    expect(hit).toBe(true);
  });
  it('wyrzucenie towaru: znika połowa nielegalnego, susz na receptę zostaje', () => {
    let s = trade(withRx(), 'medweed', 'buy', 10, 'pharm').s;
    s = { ...s, inv: { ...s.inv, weed: { qty: 5, avg: 20 } }, pending: { kind: 'police', illegal: 5, legal: 10, runP: 50, bribeC: 300, bribeP: 50, canBluff: true } };
    const r = resolvePolice(s, 'dump');
    expect(r.s.inv.weed?.qty).toBe(2); // 5 − ceil(2.5)
    expect(r.s.inv.medweed?.qty).toBe(10);
    expect(r.s.pending).toBeNull();
  });
  it('teleporada działa tylko w oknie od wizyty', () => {
    const s = withRx();
    expect(teleStatus({ ...s, day: s.rx!.visit + RX.teleWindow })).toBe('ok');
    expect(teleStatus({ ...s, day: s.rx!.visit + RX.teleWindow + 1 })).toBe('window');
    const r = teleRenew({ ...s, day: 5 });
    expect(r.s.rx).toMatchObject({ used: 0, until: 5 + RX.valid, visit: 1 });
  });
});

describe('sklep i napad', () => {
  it('transport tylko w górę, zwiększa pojemność', () => {
    const s = { ...afterTutorial(), cash: 30000 };
    expect(canBuyVehicle(s, 'backpack')).toBe(false);
    const s2 = buyVehicle(s, 'car').s;
    expect(s2.cap).toBe(V.car.cap);
    expect(s2.cash).toBe(30000 - V.car.price);
    expect(canBuyVehicle(s2, 'scooter')).toBe(false);
  });
  it('broń zastępuje poprzednią', () => {
    let s = { ...afterTutorial(), cash: 10000 };
    s = buyWeapon(s, 'spray').s;
    s = buyWeapon(s, 'gun').s;
    expect(s.weapon).toBe('gun');
    expect(s.cash).toBe(10000 - W.spray.price - W.gun.price);
  });
  it('policja konfiskuje nielegalną broń przy złapaniu', () => {
    let s: GameState = { ...afterTutorial(), cash: 10000, weapon: 'gun', inv: { weed: { qty: 5, avg: 20 } } };
    s.pending = { kind: 'police', illegal: 5, legal: 0, runP: 0, bribeC: 300, bribeP: 50, canBluff: false };
    const r = resolvePolice(s, 'run'); // runP 0 → złapany
    expect(r.s.weapon).toBeNull();
    expect(r.s.inv.weed?.qty).toBe(2); // zabrali połowę
  });
  it('napad: oddanie ćwierci towaru, nieudana ucieczka = połowa', () => {
    const s: GameState = { ...afterTutorial(), inv: { weed: { qty: 5, avg: 20 }, coke: { qty: 1, avg: 500 } }, pending: { kind: 'robbery', runP: 50, fightP: 0 } };
    const r = resolveRobbery(s, 'give');
    expect(r.s.inv).toEqual({ weed: { qty: 3, avg: 20 } }); // 5 − ceil(1.25), 1 − ceil(0.25)
    const fail = resolveRobbery({ ...s, pending: { kind: 'robbery', runP: 0, fightP: 0 } }, 'run');
    expect(fail.s.inv).toEqual({ weed: { qty: 2, avg: 20 } });
    expect(resolveRobbery(s, 'fight').s).toBe(s); // bez broni nie da się walczyć
  });
});

describe('portfel', () => {
  it('częściowa spłata długu i częściowe operacje bankowe', () => {
    let s = { ...afterTutorial(), cash: 3000 };
    s = repay(s, 1000).s;
    expect(s).toMatchObject({ cash: 2000, debt: 4000 });
    expect(repay(s, 99999).s).toMatchObject({ cash: 0, debt: 2000 }); // przycięte do gotówki
    s = deposit(s, 500).s;
    expect(s).toMatchObject({ cash: 1500, bank: 500 });
    s = withdraw(s, 200).s;
    expect(s).toMatchObject({ cash: 1700, bank: 300 });
    expect(deposit(s, 0).s).toBe(s);
  });
  it('spłata długu: podziękowanie tylko raz', () => {
    let s = { ...afterTutorial(), cash: 20000 };
    s = repay(s).s;
    expect(s.debt).toBe(0);
    expect(s.chat.filter((c) => c.key === 'zbychuPaid')).toHaveLength(1);
    expect(repay(s).s).toBe(s);
  });
});

describe('brak kasy: gapa, pożyczka, windykacja, bankructwo', () => {
  it('bez pieniędzy na bilet można jechać tylko na gapę', () => {
    const s = { ...afterTutorial(), cash: 10 };
    expect(travel(s, 'krk').s).toBe(s);
    const r = travel(s, 'krk', true);
    expect(r.s.day).toBe(2);
  });
  it('kanar: mandat dopisany do długu, gdy brak gotówki', () => {
    let found = false;
    for (let seed = 0; seed < 100 && !found; seed++) {
      const s = { ...afterTutorial(seed), cash: 0 };
      const r = travel(s, 'krk', true);
      const info = r.fx.find((f) => f.t === 'info');
      if (info && info.t === 'info' && info.title === 'kanarTitle') {
        expect(r.s.debt).toBe(Math.round((5000 + DODGE.fine) * 1.07)); // mandat też obrasta odsetkami
        found = true;
      }
    }
    expect(found).toBe(true);
  });
  it('pożyczka zwiększa gotówkę i dług, z limitem', () => {
    const s = afterTutorial();
    const lim = borrowLimit(s);
    expect(lim).toBe(BORROW.capMult * 5000 - 5000);
    const r = borrow(s, 1000).s;
    expect(r).toMatchObject({ cash: 3000, debt: 6000 });
    expect(borrow(s, 10 ** 9).s.debt).toBe(5000 + lim);
  });
  it('windykatorzy przychodzą przy dużym długu (najpierw ostrzeżenie)', () => {
    let s: GameState = { ...afterTutorial(), debt: 5000 * COLLECT.atMult + 1000, cash: 5000 };
    s = travel(s, 'krk').s; // dzień 2: ostrzeżenie
    expect(s.collectWarned).toBe(true);
    const before = s.cash;
    s = travel(s, 'waw').s; // dzień 3: windykacja
    expect(s.day % COLLECT.every).toBe(0);
    expect(s.cash).toBeLessThan(before);
  });
  it('bankructwo: brak gotówki, towaru i limitu pożyczki', () => {
    const broke = { ...afterTutorial(), cash: 0, bank: 0, inv: {}, debt: 5000 * BORROW.capMult };
    expect(isBankrupt(broke)).toBe(true);
    expect(isBankrupt({ ...broke, debt: 5000 })).toBe(false); // może jeszcze pożyczyć
  });
});

describe('ranking i zapis', () => {
  it('top N na poziom, posortowany', () => {
    let b = [] as ReturnType<typeof forDiff>;
    for (let i = 0; i < 15; i++) b = addEntry(b, { id: i, name: 'x' + i, score: i * 100, diff: 'normal', date: '2026-11-04' });
    b = addEntry(b, { id: 99, name: 'e', score: 1, diff: 'easy', date: '2026-11-04' });
    expect(forDiff(b, 'normal')).toHaveLength(BOARD_SIZE);
    expect(forDiff(b, 'normal')[0].score).toBe(1400);
    expect(forDiff(b, 'easy')).toHaveLength(1);
  });
  it('zapis: odrzuca zakończoną grę i śmieci', () => {
    const s = newGame('normal', 1);
    expect(parseSave(JSON.stringify(s))?.seed).toBe(s.seed);
    expect(parseSave(JSON.stringify({ ...s, over: true }))).toBeNull();
    expect(parseSave('{zepsute')).toBeNull();
  });
  it('used liczy wszystkie towary', () => {
    expect(used({ ...newGame('normal', 1), inv: { weed: { qty: 3, avg: 1 }, medweed: { qty: 2, avg: 1 } } })).toBe(5);
  });
});
