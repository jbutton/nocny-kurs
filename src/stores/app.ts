/**
 * Stan aplikacji w TanStack Store: stan gry (z silnika) + stan interfejsu.
 * Komponenty Svelte czytają go przez `useSelector`, a zmieniają wyłącznie przez `actions`.
 */
import { createStore } from '@tanstack/svelte-store';
import * as E from '../game/engine';
import { addEntry, cleanNick, type BoardEntry } from '../game/leaderboard';
import { parseSave, SAVE_KEY } from '../game/save';
import type {
  CityId, Diff, GameState, ItemId, Lang, Msg, Outcome, PoliceChoice, RobberyChoice, Src, VehicleId, WeaponId,
} from '../game/types';
import { t } from '../i18n';

export type Tab = 'market' | 'map' | 'shop' | 'chat' | 'wallet';
export interface Sheet { item: ItemId; src: Src }
export type Dialog =
  | { kind: 'difficulty' }
  | { kind: 'newGame' }
  | { kind: 'travel'; to: CityId }
  | { kind: 'clinic' }
  | { kind: 'info'; title: string; body: Msg[] }
  | { kind: 'end'; score: number; diff: Diff; bankrupt?: boolean }
  | { kind: 'board'; diff: Diff; hl: number; afterEnd: boolean };
export interface Toast { id: number; msg: Msg; undo: boolean }

export interface AppState {
  game: GameState;
  lang: Lang;
  tab: Tab;
  sheet: Sheet | null;
  dialog: Dialog | null;
  toast: Toast | null;
  /** stan sprzed ostatniej transakcji (przycisk „Cofnij”) */
  undo: GameState | null;
  board: BoardEntry[];
  nick: string;
}

const LANG_KEY = 'ss_lang';
const BOARD_KEY = 'ss_board_v1';
const NICK_KEY = 'ss_nick';

// --- dostęp do localStorage (bezpieczny, gdy go nie ma) ---
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* brak miejsca / tryb prywatny */ } },
};
function readBoard(): BoardEntry[] {
  try { return JSON.parse(ls.get(BOARD_KEY) ?? '[]') as BoardEntry[]; } catch { return []; }
}

// język wynika z adresu strony (/ = PL, /en/ = EN), żeby wyszukiwarki i linki działały przewidywalnie
const pageLang = (): Lang => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'pl');
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const DOC_TITLE: Record<Lang, string> = {
  pl: 'Nocny Kurs – darmowa gra ekonomiczna w przeglądarce',
  en: 'Night Run – free browser trading game',
};

function initial(): AppState {
  const lang: Lang = pageLang();
  const saved = parseSave(ls.get(SAVE_KEY));
  const base = { lang, tab: 'market' as Tab, sheet: null, undo: null, board: readBoard(), nick: ls.get(NICK_KEY) ?? '' };
  if (saved) {
    const toast = saved.pending ? null : { id: Date.now(), msg: { key: 'resumed', vars: { d: saved.day, city: saved.city } }, undo: false };
    return { ...base, game: saved, dialog: null, toast };
  }
  return { ...base, game: E.newGame('normal'), dialog: { kind: 'difficulty' }, toast: null };
}

export const app = createStore<AppState>(initial());

// --- autozapis gry i języka przy każdej zmianie ---
let lastGame: GameState | null = null;
let lastLang: Lang | null = null;
app.subscribe((s) => {
  if (s.game !== lastGame) { lastGame = s.game; ls.set(SAVE_KEY, JSON.stringify(s.game)); }
  if (s.lang !== lastLang) {
    const changed = lastLang !== null;
    lastLang = s.lang;
    ls.set(LANG_KEY, s.lang);
    document.documentElement.lang = s.lang;
    if (changed) {
      // przełącznik PL/EN zmienia też adres i tytuł karty (bez przeładowania gry)
      history.replaceState(null, '', BASE + (s.lang === 'en' ? 'en/' : '') + location.hash);
      document.title = DOC_TITLE[s.lang];
    }
  }
});

const set = (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) =>
  app.setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

/** Wpina wynik akcji silnika: nowy stan gry + efekty (toast / okno / koniec gry) */
function apply(o: Outcome, extra: Partial<AppState> = {}) {
  set((s) => {
    const next: Partial<AppState> = { game: o.s, ...extra };
    for (const fx of o.fx) {
      if (fx.t === 'toast') next.toast = { id: Date.now() + Math.random(), msg: fx.msg, undo: !!fx.undo };
      if (fx.t === 'info') next.dialog = { kind: 'info', title: fx.title, body: fx.body };
      if (fx.t === 'end') next.dialog = { kind: 'end', score: E.score(o.s), diff: o.s.diff, bankrupt: fx.reason === 'bankrupt' };
    }
    if (next.game && next.game.unread && (extra.tab ?? s.tab) === 'chat') next.game = E.markChatRead(next.game);
    return next;
  });
}
const g = () => app.state.game;

export const actions = {
  setLang: (lang: Lang) => set({ lang }),
  go: (tab: Tab) => set((s) => ({ tab, sheet: null, game: tab === 'chat' ? E.markChatRead(s.game) : s.game })),
  openSheet: (item: ItemId, src: Src = 'street') => set({ sheet: { item, src } }),
  closeSheet: () => set({ sheet: null }),
  closeDialog: () => set({ dialog: null }),
  dismissToast: (id: number) => set((s) => (s.toast?.id === id ? { toast: null } : {})),
  skipTutorial: () => set((s) => ({ game: E.skipTutorial(s.game) })),

  trade: (item: ItemId, mode: 'buy' | 'sell', n: number, src: Src) => {
    const prev = g();
    const o = E.trade(prev, item, mode, n, src);
    if (o.s !== prev) apply(o, { sheet: null, undo: prev });
  },
  undo: () => set((s) => (s.undo ? { game: s.undo, undo: null, toast: null } : {})),

  askTravel: (to: CityId) => set({ dialog: { kind: 'travel', to } }),
  travel: (to: CityId, dodge = false) => {
    const o = E.travel(g(), to, dodge);
    apply(o, { dialog: null, sheet: null, tab: 'market', undo: null });
    if (o.s.day > o.s.maxDays) actions.finish();
  },
  borrowAndTravel: (to: CityId) => {
    const o = E.borrowAndTravel(g(), to);
    if (o.s !== g()) apply(o, { dialog: null, sheet: null, tab: 'market', undo: null });
  },
  sellVehicle: () => apply(E.sellVehicle(g())),
  finish: () => apply(E.finish(g()), { sheet: null }),
  police: (c: PoliceChoice) => apply(E.resolvePolice(g(), c)),
  robbery: (c: RobberyChoice) => apply(E.resolveRobbery(g(), c)),

  askClinic: () => set({ dialog: { kind: 'clinic' } }),
  clinicVisit: () => apply(E.clinicVisit(g()), { dialog: null }),
  teleRenew: () => apply(E.teleRenew(g())),
  repay: (amount: number) => apply(E.repay(g(), amount)),
  borrow: (amount: number) => apply(E.borrow(g(), amount)),
  deposit: (amount: number) => apply(E.deposit(g(), amount)),
  withdraw: (amount: number) => apply(E.withdraw(g(), amount)),
  buyVehicle: (id: VehicleId) => apply(E.buyVehicle(g(), id)),
  buyWeapon: (id: WeaponId) => apply(E.buyWeapon(g(), id)),

  askNewGame: () => set({ dialog: { kind: 'newGame' } }),
  askDifficulty: () => set({ dialog: { kind: 'difficulty' } }),
  startGame: (diff: Diff) =>
    set({ game: E.newGame(diff), dialog: null, sheet: null, toast: null, undo: null, tab: 'market' }),

  showBoard: (diff: Diff, hl = 0, afterEnd = false) => set({ dialog: { kind: 'board', diff, hl, afterEnd } }),
  saveScore: (rawNick: string) => {
    const s = app.state;
    if (s.dialog?.kind !== 'end') return;
    const name = cleanNick(rawNick, t(s.lang, 'anon'));
    const entry: BoardEntry = { id: Date.now(), name, score: s.dialog.score, diff: s.dialog.diff, date: new Date().toISOString().slice(0, 10) };
    const board = addEntry(s.board, entry);
    ls.set(BOARD_KEY, JSON.stringify(board));
    ls.set(NICK_KEY, name);
    set({ board, nick: name, dialog: { kind: 'board', diff: entry.diff, hl: entry.id, afterEnd: true } });
  },
};
