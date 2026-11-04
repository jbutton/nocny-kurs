<script lang="ts">
  import ItemIcon from './icons/ItemIcon.svelte';
  import LastDay from './LastDay.svelte';
  import { actions } from '../stores/app';
  import { DICTS, fmt, t } from '../i18n';
  import { GOODS, C, MED, RX } from '../game/data';
  import { pharmRating, priceOf, rating, rxLeft, rxValid, showAvg } from '../game/engine';
  import type { GameState, Lang, Rating } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const d = $derived(DICTS[lang]);
  const ph = $derived(game.pharm[game.city]);
  const med = $derived(game.inv[MED.id]);
  const canPharm = $derived(ph.stock && rxValid(game));
  const pharmKey = (r: Rating) => (r === 'cheap' ? 'pharmCheap' : r === 'exp' ? 'pharmExp' : 'pharmNorm');
</script>

{#if game.day === game.maxDays}<LastDay {lang} />{/if}
<div class="h"><span>{t(lang, 'pricesIn', { city: game.city })}</span><span>{t(lang, 'tapHint')}</span></div>
{#if game.rxUnlocked}<div class="sec-h">{t(lang, 'street')}</div>{/if}

{#each GOODS as g (g.id)}
  {@const p = game.prices[game.city][g.id]}
  {@const r = rating(g.id, p)}
  {@const it = game.inv[g.id]}
  <button class="row" class:pulse={(game.tut === 0 && g.id === 'weed') || (game.tut === 2 && g.id === 'weed' && it)} onclick={() => actions.openSheet(g.id)}>
    <ItemIcon name={g.id} />
    <div class="grow">
      <div class="name">{d.goods[g.id]}</div>
      {#if it}<div class="sub own">{showAvg(game) ? t(lang, 'have', { n: it.qty, a: it.avg }) : t(lang, 'haveQty', { n: it.qty })}</div>{/if}
    </div>
    <div class="price">{fmt(lang, p)} zł<br /><span class="tag {r}">{t(lang, r)}</span></div>
  </button>
{/each}

{#if med}
  <button class="row" onclick={() => actions.openSheet(MED.id)}>
    <ItemIcon name="medweed" />
    <div class="grow"><div class="name">{d.goods.medweed}</div><div class="sub own">{t(lang, 'medSub', { n: med.qty })}</div></div>
    <div class="price">{fmt(lang, priceOf(game, MED.id))} zł<br /><span class="tag med">{t(lang, 'medTag')}</span></div>
  </button>
{/if}

{#if game.rxUnlocked}
  <div class="sec-h">{t(lang, 'pharmSec')}</div>
  <button class="row alt" disabled={!canPharm} onclick={() => actions.openSheet(MED.id, 'pharm')}>
    <ItemIcon name="pharm" />
    <div class="grow">
      <div class="name">{t(lang, 'pharmRow')}</div>
      <div class="sub">{!ph.stock ? t(lang, 'pharmOut') : !rxValid(game) ? t(lang, 'pharmNoRx') : t(lang, 'pharmSub', { n: rxLeft(game) })}</div>
    </div>
    <div class="price">
      {#if ph.stock}{fmt(lang, ph.price)} zł<br /><span class="tag {pharmRating(ph.price)}">{t(lang, pharmKey(pharmRating(ph.price)))}</span>{:else}—{/if}
    </div>
  </button>
  {#if C[game.city].clinic}
    <button class="row alt" onclick={actions.askClinic}>
      <ItemIcon name="clinic" />
      <div class="grow"><div class="name">{t(lang, 'clinicRow')}</div><div class="sub">{t(lang, 'clinicSub', { c: RX.visit, l: RX.limit })}</div></div>
      <div class="price">›</div>
    </button>
  {/if}
{/if}


