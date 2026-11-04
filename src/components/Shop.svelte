<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import ItemIcon from './icons/ItemIcon.svelte';
  import { actions } from '../stores/app';
  import { DICTS, fmt, t } from '../i18n';
  import { VEHICLES, WEAPONS } from '../game/data';
  import { canBuyVehicle, canBuyWeapon, fightChance, vehicleIndex } from '../game/engine';
  import { PROTECT } from '../game/data';
  import type { GameState, Lang } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const d = $derived(DICTS[lang]);
</script>

<div class="sec-h">{t(lang, 'shopTransport')}</div>
<p class="note intro">{t(lang, 'shopTransportNote')}</p>
{#each VEHICLES as v (v.id)}
  {@const owned = v.id === game.vehicle}
  {@const below = vehicleIndex(v.id) < vehicleIndex(game.vehicle)}
  {#if !below}
    <div class="item" class:owned>
      <ItemIcon name={v.id} />
      <div class="grow">
        <div class="name">{d.gear[v.id]}</div>
        <div class="sub">{t(lang, 'capLbl', { n: v.cap })} · {t(lang, 'runLbl', { p: v.run })}{v.police > 1 ? ' · ' + t(lang, 'vanLbl') : ''}</div>
      </div>
      {#if owned}
        <span class="badge"><Check size={14} /> {t(lang, 'owned')}</span>
      {:else}
        <button class="buy" disabled={!canBuyVehicle(game, v.id)} onclick={() => actions.buyVehicle(v.id)}>{fmt(lang, v.price)} zł</button>
      {/if}
    </div>
  {/if}
{/each}

<div class="sec-h">{t(lang, 'shopProtect')}</div>
<p class="note intro">{t(lang, 'shopProtectNote', { b: PROTECT.perExtra })}</p>
<div class="protect" class:none={!game.weapons.length}>{t(lang, game.weapons.length ? 'protectNow' : 'protectNone', { p: fightChance(game) })}</div>
{#each WEAPONS as w (w.id)}
  {@const owned = game.weapons.includes(w.id)}
  <div class="item" class:owned>
    <ItemIcon name={w.id} />
    <div class="grow">
      <div class="name">{d.gear[w.id]}</div>
      <div class="sub">{t(lang, 'fightLbl', { p: w.fight })}{w.legal ? '' : ' · '}{#if !w.legal}<span class="illegal">{t(lang, 'illegalLbl')}</span>{/if}</div>
    </div>
    {#if owned}
      <span class="badge"><Check size={14} /> {t(lang, 'owned')}</span>
    {:else}
      <button class="buy" disabled={!canBuyWeapon(game, w.id)} onclick={() => actions.buyWeapon(w.id)}>{fmt(lang, w.price)} zł</button>
    {/if}
  </div>
{/each}

<style>
  .intro { margin: 0 4px 10px; }
  .protect { margin: 0 4px 10px; font-weight: 800; color: var(--accent); font-size: 14px; }
  .protect.none { color: var(--muted); font-weight: 700; }
  .item { display: flex; align-items: center; gap: 12px; background: var(--card); border-radius: var(--radius); padding: 12px 14px; margin-bottom: 8px; border: 2px solid transparent; }
  .item.owned { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
  .buy { border: 0; background: var(--accent); color: #0b1b19; font-weight: 800; border-radius: 12px; padding: 9px 12px; cursor: pointer; white-space: nowrap; }
  .buy:disabled { background: var(--card2); color: var(--muted); cursor: not-allowed; }
  .badge { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-weight: 800; font-size: 12px; }
  .illegal { color: var(--bad); font-weight: 700; }
</style>
