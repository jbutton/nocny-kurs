<script lang="ts">
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Trophy from '@lucide/svelte/icons/trophy';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Banknote from '@lucide/svelte/icons/banknote';
  import HandCoins from '@lucide/svelte/icons/hand-coins';
  import Backpack from '@lucide/svelte/icons/backpack';
  import Stars from './icons/Stars.svelte';
  import { actions } from '../stores/app';
  import { DICTS, fmt, t } from '../i18n';
  import { used } from '../game/engine';
  import type { GameState, Lang } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const d = $derived(DICTS[lang]);
  const lvl = $derived(Math.min(5, Math.floor(game.heat / 20)));
</script>

<header class="status">
  <div class="top">
    <div class="where">
      <div class="city"><MapPin size={20} strokeWidth={2.4} /> {d.cities[game.city]}</div>
      <div class="day">{t(lang, 'day', { d: Math.min(game.day, game.maxDays), m: game.maxDays })} · {d.diffName[game.diff]}</div>
    </div>
    <div class="tools">
      <button class="iconbtn" title={t(lang, 'board')} aria-label={t(lang, 'board')} onclick={() => actions.showBoard(game.diff)}><Trophy size={17} /></button>
      <button class="iconbtn" title={t(lang, 'newGame')} aria-label={t(lang, 'newGame')} onclick={actions.askNewGame}><RotateCcw size={17} /></button>
      <div class="lang">
        <button class:on={lang === 'pl'} onclick={() => actions.setLang('pl')}>PL</button>
        <button class:on={lang === 'en'} onclick={() => actions.setLang('en')}>EN</button>
      </div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="l"><Banknote size={14} /> {t(lang, 'cash')}</div><div class="v">{fmt(lang, game.cash)} zł</div></div>
    <div class="stat"><div class="l"><HandCoins size={14} /> {t(lang, 'debt')}</div><div class="v debt">{fmt(lang, game.debt)} zł</div></div>
    <div class="stat"><div class="l"><Backpack size={14} /> {t(lang, 'bag')}</div><div class="v">{used(game)}/{game.cap}</div></div>
  </div>
  <div class="police" title={t(lang, 'policeTip')}>
    <Stars {lvl} /> <span>{d.police[lvl]}</span>
  </div>
</header>

<style>
  .status { padding: 18px 18px 12px; background: linear-gradient(180deg, #1d2130, var(--phone)); }
  .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
  .where { min-width: 0; }
  .city { font-size: 22px; font-weight: 800; letter-spacing: -.3px; display: flex; align-items: center; gap: 6px; color: var(--text); }
  .city :global(svg) { color: var(--accent); }
  .day { font-size: 13px; color: var(--muted); }
  .tools { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
  .iconbtn { border: 0; background: var(--card); color: var(--muted); width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; cursor: pointer; }
  .iconbtn:hover { color: var(--text); }
  .lang { display: flex; background: var(--card); border-radius: 999px; padding: 3px; }
  .lang button { border: 0; background: none; color: var(--muted); font-weight: 700; font-size: 12px; padding: 5px 9px; border-radius: 999px; cursor: pointer; }
  .lang button.on { background: var(--accent); color: #0b1b19; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .stat { background: var(--card); border-radius: 14px; padding: 8px 10px; }
  .l { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
  .v { font-size: 15px; font-weight: 800; margin-top: 2px; white-space: nowrap; }
  .v.debt { color: var(--bad); }
  .police { display: flex; align-items: center; gap: 10px; margin-top: 8px; background: var(--card); border-radius: 14px; padding: 8px 10px; font-size: 12px; color: var(--muted); cursor: help; }
</style>
