/**
 * Stan aplikacji w TanStack Store: stan gry (z silnika) + stan interfejsu.
 * Komponenty Svelte czytają go przez `useSelector`, a zmieniają wyłącznie przez `actions`.
 */
import { createStore } from '@tanstack/svelte-store';
import * as E from '../game/engine';
import { act, probe, type Act } from '../game/replay';
import { rankedAct } from '../game/run';
import { addEntry, cleanNick, type BoardEntry } from '../game/leaderboard';
import { parseSave, SAVE_KEY } from '../game/save';
import type {
  CityId, Diff, GameState, ItemId, Lang, Msg, Outcome, PoliceChoice, RobberyChoice, Src, VehicleId, WeaponId,
} from '../game/types';
import { t } from '../i18n';
import { finishRun, onlineEnabled, queryClient, RunLost, startRun, stepRun } from '../lib/api';

export type Tab = 'market' | 'map' | 'shop' | 'chat' | 'wallet';
export interface Sheet { item: ItemId; src: Src }
export type Dialog =
  | { kind: 'difficulty' }
  | { kind: 'newGame' }
  | { kind: 'travel'; to: CityId }
  | { kind: 'clinic' }
  | { kind: 'info'; title: string; body: Msg[] }
  | { kind: 'end'; score: number; diff: Diff; bankrupt?: boolean }
  | { kind: 'board'; diff: Diff; hl: number; afterEnd: boolean; scope: BoardScope; online?: OnlineStatus }
  /** serwer rankingu nie odpowiedział przy ruchu z losowaniem; `lost` = tej gry nie da się już dokończyć w rankingu */
  | { kind: 'offline'; lost: boolean; retry: () => void };
export type BoardScope = 'online' | 'local';
/** Stan wysyłki wyniku do rankingu online (widoczny w oknie rankingu po zakończeniu gry) */
export type OnlineStatus =
  | { status: 'sending' } | { status: 'ok'; id: number; place: number } | { status: 'error'; reason: string }
  /** gra rozegrana bez serwera: wynik tylko na tym urządzeniu */
  | { status: 'unranked' };
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
  /** czekamy na serwer rankingu (blokuje przyciski) */
  busy: boolean;
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
  const base = { lang, tab: 'market' as Tab, sheet: null, undo: null, board: readBoard(), nick: ls.get(NICK_KEY) ?? '', busy: false };
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
/**
 * Ruch gracza: silnik + dziennik ruchów. W grze rankingowej ruch z losowaniem najpierw idzie na serwer
 * (zapis decyzji + losowość), więc jest asynchroniczny; w tym czasie przyciski są zablokowane.
 */
function move(a: Act, extra: Partial<AppState> = {}) {
  const s = g();
  if (app.state.busy) return;
  const done = (o: Outcome) => { if (o.s !== s) apply(o, extra); };
  if (!s.run || probe(s, a) !== 'random') return done(act(s, a));
  set({ busy: true });
  rankedAct(s, a, stepRun).then(
    (o) => { set({ busy: false }); if (g() === s) done(o); },
    (e: unknown) => {
      set({ busy: false });
      if (g() !== s) return;
      set({ dialog: { kind: 'offline', lost: e instanceof RunLost, retry: () => move(a, extra) } });
    },
  );
}

export const actions = {
  setLang: (lang: Lang) => set({ lang }),
  go: (tab: Tab) => set((s) => ({ tab, sheet: null, game: tab === 'chat' ? E.markChatRead(s.game) : s.game })),
  openSheet: (item: ItemId, src: Src = 'street') => set({ sheet: { item, src } }),
  closeSheet: () => set({ sheet: null }),
  closeDialog: () => set({ dialog: null }),
  dismissToast: (id: number) => set((s) => (s.toast?.id === id ? { toast: null } : {})),
  skipTutorial: () => move(['sk']),

  trade: (item: ItemId, mode: 'buy' | 'sell', n: number, src: Src) => move(['t', item, mode, n, src], { sheet: null, undo: g() }),
  undo: () => set((s) => (s.undo ? { game: s.undo, undo: null, toast: null } : {})),

  askTravel: (to: CityId) => set({ dialog: { kind: 'travel', to } }),
  travel: (to: CityId, dodge = false) => move(['v', to, dodge], { dialog: null, sheet: null, tab: 'market', undo: null }),
  borrowAndTravel: (to: CityId) => move(['bt', to], { dialog: null, sheet: null, tab: 'market', undo: null }),
  sellVehicle: () => move(['sv']),
  finish: () => move(['f'], { sheet: null }),
  police: (c: PoliceChoice) => move(['p', c]),
  robbery: (c: RobberyChoice) => move(['r', c]),

  askClinic: () => set({ dialog: { kind: 'clinic' } }),
  clinicVisit: () => move(['c'], { dialog: null }),
  teleRenew: () => move(['tr']),
  repay: (amount: number) => move(['rp', amount]),
  borrow: (amount: number) => move(['b', amount]),
  deposit: (amount: number) => move(['d', amount]),
  withdraw: (amount: number) => move(['w', amount]),
  buyVehicle: (id: VehicleId) => move(['bv', id]),
  buyWeapon: (id: WeaponId) => move(['bw', id]),
  /** Brak serwera: gra toczy się dalej offline (wynik tylko na tym urządzeniu) */
  playOffline: () => {
    const d = app.state.dialog;
    set((s) => ({ game: { ...s.game, run: null }, dialog: null }));
    if (d?.kind === 'offline') d.retry();
  },
  retryOnline: () => {
    const d = app.state.dialog;
    set({ dialog: null });
    if (d?.kind === 'offline') d.retry();
  },

  askNewGame: () => set({ dialog: { kind: 'newGame' } }),
  askDifficulty: () => set({ dialog: { kind: 'difficulty' } }),
  /** Nowa gra: z serwerem rankingu (seed od serwera), a gdy go brak — offline */
  startGame: (diff: Diff) => {
    if (app.state.busy) return;
    const fresh = { dialog: null, sheet: null, toast: null, undo: null, tab: 'market' as Tab };
    if (!onlineEnabled()) return set({ game: E.newGame(diff), ...fresh });
    set({ busy: true });
    startRun(diff).then(
      (r) => set({ game: { ...E.newGame(diff, r.seed), run: { id: r.id, synced: 0 } }, ...fresh, busy: false }),
      () => set({
        game: E.newGame(diff), ...fresh, busy: false,
        toast: { id: Date.now(), msg: { key: 'offlineStart' }, undo: false },
      }),
    );
  },

  showBoard: (diff: Diff, hl = 0, afterEnd = false, scope: BoardScope = onlineEnabled() ? 'online' : 'local') =>
    set((s) => ({ dialog: { kind: 'board', diff, hl, afterEnd, scope, online: s.dialog?.kind === 'board' ? s.dialog.online : undefined } })),
  saveScore: (rawNick: string) => {
    const s = app.state;
    if (s.dialog?.kind !== 'end') return;
    const name = cleanNick(rawNick, t(s.lang, 'anon'));
    const entry: BoardEntry = { id: Date.now(), name, score: s.dialog.score, diff: s.dialog.diff, date: new Date().toISOString().slice(0, 10) };
    const board = addEntry(s.board, entry);
    ls.set(BOARD_KEY, JSON.stringify(board));
    ls.set(NICK_KEY, name);
    const g0 = s.game;
    // do rankingu online trafia tylko gra rozegrana z serwerem (losowość od serwera)
    const run = onlineEnabled() ? g0.run : null;
    set({
      board, nick: name,
      dialog: {
        kind: 'board', diff: entry.diff, hl: entry.id, afterEnd: true, scope: run ? 'online' : 'local',
        online: run ? { status: 'sending' } : onlineEnabled() ? { status: 'unranked' } : undefined,
      },
    });
    if (!run) return;
    void finishRun(run.id, run.synced, g0.log.slice(run.synced), name).then((r) => {
      const online: OnlineStatus = r.ok ? { status: 'ok', id: r.id, place: r.place } : { status: 'error', reason: r.reason };
      set((st) => (st.dialog?.kind === 'board' ? { dialog: { ...st.dialog, online } } : {}));
      if (r.ok) void queryClient.invalidateQueries({ queryKey: ['scores'] });
    });
  },
};
