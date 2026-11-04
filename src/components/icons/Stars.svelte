<!-- Poziom poszukiwania: zapalone gwiazdki -->
<script lang="ts">
  import Star from '@lucide/svelte/icons/star';
  let { lvl, max = 5, size = 15 }: { lvl: number; max?: number; size?: number } = $props();
</script>
<span class="stars" aria-label="{lvl}/{max}">
  {#each Array(max) as _, i (i)}
    <span class:on={i < lvl}><Star {size} strokeWidth={2} fill={i < lvl ? 'currentColor' : 'none'} /></span>
  {/each}
</span>
<style>
  .stars { display: inline-flex; gap: 2px; color: var(--line-strong); }
  .on { color: var(--warn); }
</style>
