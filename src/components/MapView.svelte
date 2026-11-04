<script lang="ts">
  import ItemIcon from './icons/ItemIcon.svelte';
  import Stars from './icons/Stars.svelte';
  import Siren from '@lucide/svelte/icons/siren';
  import { actions } from '../stores/app';
  import { DICTS, t } from '../i18n';
  import { CITIES } from '../game/data';
  import { distanceKm, travelCost } from '../game/engine';
  import type { GameState, Lang } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const d = $derived(DICTS[lang]);
  const last = $derived(game.day === game.maxDays);
</script>

{#if last}<div class="tip">⏰ {t(lang, 'lastDay')}</div>{/if}
<div class="h"><span>{t(lang, 'travelTo')}</span></div>
{#each [...CITIES].sort((a, b) => distanceKm(game.city, a.id) - distanceKm(game.city, b.id)) as c (c.id)}
  {@const here = c.id === game.city}
  <button class="row" class:pulse={game.tut === 1 && c.id === 'krk'} disabled={here || last} onclick={() => actions.askTravel(c.id)}>
    <ItemIcon name={here ? 'here' : 'city'} />
    <div class="grow">
      <div class="name">{d.cities[c.id]}</div>
      <div class="sub">{#if here}{t(lang, 'here')}{:else}{@const tc = travelCost(game, c.id)}{t(lang, tc.kind === 'fuel' ? 'fuel' : 'ticket', { p: tc.cost })} · {tc.km} km{/if}{game.rxUnlocked && c.clinic ? ' · ' + t(lang, 'clinicHere') : ''}</div>
    </div>
    <div class="pol" title={t(lang, 'polLvlTip', { n: c.police })}>
      <span class="cap"><Siren size={11} strokeWidth={2.4} /> {t(lang, 'polLvl')}</span>
      <Stars lvl={c.police} max={3} size={12} />
    </div>
  </button>
{/each}

<style>
  .pol { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .cap { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
</style>
