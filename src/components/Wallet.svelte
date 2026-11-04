<script lang="ts">
  import HandCoins from '@lucide/svelte/icons/hand-coins';
  import Landmark from '@lucide/svelte/icons/landmark';
  import FileText from '@lucide/svelte/icons/file-text';
  import Backpack from '@lucide/svelte/icons/backpack';
  import AmountPicker from './AmountPicker.svelte';
  import { actions } from '../stores/app';
  import { fmt, t } from '../i18n';
  import { RX } from '../game/data';
  import { borrowLimit, collectAt, rxValid, stashValue, teleStatus } from '../game/engine';
  import type { GameState, Lang } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const tele = $derived(teleStatus(game));
  let debtMode = $state<'repay' | 'borrow'>('repay');
  const maxRepay = $derived(debtMode === 'repay' ? Math.min(game.cash, game.debt) : borrowLimit(game));
  let repayAmt = $state(0);
  let bankMode = $state<'deposit' | 'withdraw'>('deposit');
  let bankAmt = $state(0);
  const maxBank = $derived(bankMode === 'deposit' ? game.cash : game.bank);
  // domyślnie proponujemy pełną kwotę; po operacji (zmiana max) odświeżamy propozycję
  // spłata: domyślnie całość; pożyczka: domyślnie 0 (żeby nie pożyczyć za dużo jednym kliknięciem)
  $effect(() => { repayAmt = debtMode === 'repay' ? maxRepay : 0; });
  $effect(() => { bankAmt = maxBank; });
</script>

<div class="pad"></div>
<div class="wcard">
  <div class="sub lbl"><HandCoins size={14} /> {t(lang, 'zbychuDebt')}</div>
  <div class="big" style="color:var(--bad)">{fmt(lang, game.debt)} zł</div>
  <div class="note">{t(lang, 'debtNote')} {t(lang, 'collectNote', { c: collectAt(game) })}</div>
  <div class="seg" style="margin-top:10px">
    <button class:on={debtMode === 'repay'} onclick={() => (debtMode = 'repay')}>{t(lang, 'repayTab')}</button>
    <button class:on={debtMode === 'borrow'} onclick={() => (debtMode = 'borrow')}>{t(lang, 'borrowTab')}</button>
  </div>
  {#if debtMode === 'borrow'}
    <div class="note" style="margin-top:8px">{maxRepay > 0 ? t(lang, 'borrowLimit', { c: maxRepay }) : t(lang, 'borrowNone')}</div>
  {/if}
  <AmountPicker max={maxRepay} bind:value={repayAmt} {lang} />
  {#if debtMode === 'repay'}
    <button class="btn center" style="margin-top:10px" disabled={repayAmt <= 0} onclick={() => actions.repay(repayAmt)}>{t(lang, 'repay', { c: repayAmt })}</button>
  {:else}
    <button class="btn sec center" style="margin-top:10px" disabled={repayAmt <= 0} onclick={() => actions.borrow(repayAmt)}>{t(lang, 'borrowAmt', { c: repayAmt })}</button>
  {/if}
</div>

{#if game.rxUnlocked}
  <div class="wcard">
    <div class="sub lbl"><FileText size={14} /> {t(lang, 'rxCard')}</div>
    {#if !game.rx}
      <div class="note" style="margin-top:6px">{t(lang, 'rxNone')}</div>
    {:else}
      {#if rxValid(game)}
        <div class="bar"><div style="width:{(100 * game.rx.used) / game.rx.limit}%"></div></div>
        <div class="note">{t(lang, 'rxInfo', { u: game.rx.used, l: game.rx.limit, d: game.rx.until })}</div>
      {:else}
        <div class="note" style="margin-top:6px;color:var(--warn)">{t(lang, 'rxExpired')}</div>
      {/if}
      {#if tele === 'off'}
        <div class="note" style="margin-top:8px">{t(lang, 'teleOff', { n: game.teleOff })}</div>
      {:else if tele === 'window'}
        <div class="note" style="margin-top:8px">{t(lang, 'teleNo', { w: RX.teleWindow })}</div>
      {:else}
        <button class="btn sec center" style="margin-top:10px" disabled={tele !== 'ok'} onclick={actions.teleRenew}>{t(lang, 'tele', { c: RX.tele })}</button>
      {/if}
    {/if}
  </div>
{/if}

<div class="wcard">
  <div class="sub lbl"><Landmark size={14} /> {t(lang, 'bank')}</div>
  <div class="big">{fmt(lang, game.bank)} zł</div>
  <div class="note" style="margin-bottom:10px">{t(lang, 'bankNote')}</div>
  <div class="seg">
    <button class:on={bankMode === 'deposit'} onclick={() => (bankMode = 'deposit')}>{t(lang, 'deposit')}</button>
    <button class:on={bankMode === 'withdraw'} onclick={() => (bankMode = 'withdraw')}>{t(lang, 'withdraw')}</button>
  </div>
  <AmountPicker max={maxBank} bind:value={bankAmt} {lang} />
  <button class="btn sec center" style="margin-top:10px" disabled={bankAmt <= 0}
    onclick={() => (bankMode === 'deposit' ? actions.deposit(bankAmt) : actions.withdraw(bankAmt))}>
    {t(lang, bankMode === 'deposit' ? 'depositAmt' : 'withdrawAmt', { c: bankAmt })}
  </button>
</div>

<div class="wcard">
  <div class="sub lbl"><Backpack size={14} /> {t(lang, 'inv')}</div>
  <div class="big">{fmt(lang, stashValue(game))} zł</div>
</div>

<style>
  .pad { height: 8px; }
  .seg { display: flex; background: var(--card2); border-radius: 12px; padding: 3px; }
  .seg button { flex: 1; border: 0; background: none; color: var(--muted); font-weight: 800; padding: 8px; border-radius: 9px; cursor: pointer; }
  .seg button.on { background: var(--accent); color: #0b1b19; }
  .lbl { display: flex; align-items: center; gap: 6px; }
  .bar { height: 8px; background: var(--card2); border-radius: 99px; overflow: hidden; margin: 8px 0; }
  .bar div { height: 100%; background: var(--accent); }
</style>
