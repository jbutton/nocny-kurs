<!--
  Panel kupna/sprzedaży. Tworzony raz na otwarcie (Game.svelte używa {#key}); suwak i przyciski
  zmieniają tylko lokalny stan, więc nic się nie przebudowuje ani nie miga.
-->
<script lang="ts">
  import CloseX from './CloseX.svelte';
  import ItemIcon from './icons/ItemIcon.svelte';
  import { actions, type Sheet } from '../stores/app';
  import { DICTS, fmt, t } from '../i18n';
  import { MED } from '../game/data';
  import { defaultMode, pharmRating, rating, rxLeft, showAvg, tradeLimits, tradeModes, used } from '../game/engine';
  import type { GameState, GoodId, Lang, TradeMode } from '../game/types';

  let { game, lang, sheet }: { game: GameState; lang: Lang; sheet: Sheet } = $props();
  const d = $derived(DICTS[lang]);
  const pharm = $derived(sheet.src === 'pharm');
  const modes = $derived(tradeModes(sheet.item, sheet.src));
  const L = $derived(tradeLimits(game, sheet.item, sheet.src));
  const it = $derived(game.inv[sheet.item] ?? { qty: 0, avg: 0 });

  // stan początkowy liczony raz przy otwarciu panelu
  const initMode = defaultMode(game, sheet.item, sheet.src);
  const initL = tradeLimits(game, sheet.item, sheet.src);
  let mode = $state<TradeMode>(initMode);
  let qty = $state(initMode === 'sell' ? initL.own : Math.min(10, initL.maxBuy));

  const max = $derived(mode === 'buy' ? L.maxBuy : L.own);
  const n = $derived(Math.min(qty, max));
  const total = $derived(n * L.p);
  const diff = $derived((L.p - it.avg) * n);
  const tag = $derived(
    pharm ? { cls: pharmRating(L.p), txt: t(lang, { cheap: 'pharmCheap', exp: 'pharmExp', norm: 'pharmNorm' }[pharmRating(L.p)]) }
      : sheet.item === MED.id ? { cls: 'med', txt: t(lang, 'medTag') }
      : { cls: rating(sheet.item as GoodId, L.p), txt: t(lang, rating(sheet.item as GoodId, L.p)) },
  );

  function setMode(m: TradeMode) {
    mode = m;
    qty = m === 'buy' ? Math.min(10, L.maxBuy) : L.own;
  }
  const clampQty = (v: number) => (qty = Math.max(0, Math.min(max, v)));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && actions.closeSheet()} />
<div class="overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && actions.closeSheet()}>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={pharm ? t(lang, 'pharmRow') : d.goods[sheet.item]}>
    <CloseX onclick={actions.closeSheet} />
    <div class="head">
      <ItemIcon name={pharm ? 'pharm' : sheet.item} />
      <div class="grow">
        <div class="name big">{pharm ? t(lang, 'pharmRow') : d.goods[sheet.item]}</div>
        <div class="sub">{fmt(lang, L.p)} zł · <span class="tag {tag.cls}">{tag.txt}</span></div>
      </div>
    </div>

    {#if modes.length > 1}
      <div class="seg">
        <button class="buy" class:on={mode === 'buy'} onclick={() => setMode('buy')}>{t(lang, 'buy')}</button>
        <button class="sell" class:on={mode === 'sell'} onclick={() => setMode('sell')}>{t(lang, 'sell')}</button>
      </div>
    {/if}

    <div class="qty">
      <button class="q" onclick={() => clampQty(n - 1)} aria-label="−1">−</button>
      <input type="range" min="0" {max} value={n} disabled={max === 0} oninput={(e) => clampQty(+e.currentTarget.value)} aria-label="qty" />
      <button class="q" onclick={() => clampQty(n + 1)} aria-label="+1">+</button>
      <div class="n">{n}</div>
      <button class="q" onclick={() => clampQty(max)}>{t(lang, 'max')}</button>
    </div>

    <div class="preview">
      {#if max === 0}
        {mode === 'buy' ? t(lang, pharm ? 'cantBuyRx' : 'cantBuy') : t(lang, 'nothing')}
      {:else if mode === 'buy'}
        <div>{t(lang, 'pCost')}: <b>{fmt(lang, total)} zł</b></div>
        <div>{t(lang, 'pCashLeft')}: {fmt(lang, game.cash - total)} zł</div>
        <div>{t(lang, 'pSpace')}: {used(game) + n}/{game.cap}</div>
        {#if pharm}<div>{t(lang, 'pRxLeft')}: {rxLeft(game) - n} g</div>{/if}
      {:else}
        <div>{t(lang, 'pGet')}: <b>{fmt(lang, total)} zł</b></div>
        {#if showAvg(game)}
          <div>{t(lang, 'pAvg')}: {fmt(lang, it.avg)} zł</div>
          {#if diff >= 0}<div>{t(lang, 'profit')}: <b class="pos">+{fmt(lang, diff)} zł</b> 🎉</div>
          {:else}<div>{t(lang, 'loss')}: <b class="neg">−{fmt(lang, -diff)} zł</b></div>{/if}
        {:else}
          <div class="dim">{t(lang, 'pHardHint')}</div>
        {/if}
        {#if sheet.item === MED.id}<div class="warn">⚠️ {t(lang, 'pSellMed')}</div>{/if}
      {/if}
    </div>

    <button class="btn center" disabled={n === 0} onclick={() => actions.trade(sheet.item, mode, n, sheet.src)}>
      {t(lang, mode === 'buy' ? 'doBuy' : 'doSell', { n, c: total })}
    </button>
  </div>
</div>

<style>
  .sheet { position: relative; width: 100%; background: var(--phone); border-radius: 26px 26px 0 0; padding: 18px 18px 26px; animation: up .2s ease-out; }
  .head { display: flex; align-items: center; gap: 12px; padding-right: 44px; }
  .big { font-size: 19px; }
  .seg { display: flex; background: var(--card); border-radius: 14px; padding: 4px; margin: 12px 0; }
  .seg button { flex: 1; border: 0; background: none; color: var(--muted); font-weight: 800; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 15px; }
  .seg .buy.on { background: var(--good); color: #06240f; }
  .seg .sell.on { background: var(--accent2); color: #0d1033; }
  .qty { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; }
  .qty input { flex: 1; accent-color: var(--accent); min-width: 0; }
  .n { font-size: 26px; font-weight: 900; min-width: 56px; text-align: center; }
  .q { border: 0; background: var(--card2); color: var(--text); border-radius: 10px; padding: 8px 10px; font-weight: 800; cursor: pointer; }
  .preview { background: var(--card); border-radius: 14px; padding: 12px 14px; margin: 10px 0 14px; font-size: 14px; line-height: 1.7; }
  .pos { color: var(--good); }
  .neg { color: var(--bad); }
  .dim { opacity: .7; }
  .warn { color: var(--warn); font-size: 12px; line-height: 1.4; margin-top: 6px; }
</style>
