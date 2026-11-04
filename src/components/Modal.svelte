<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { title, onclose, children, header, icon, tone = 'accent', wide = false }: { title: string; onclose?: () => void; children: Snippet; header?: Snippet; icon?: Component<any>; tone?: 'accent' | 'bad' | 'warn'; wide?: boolean } = $props();
  const Icon = $derived(icon);
</script>

<div class="overlay center" role="presentation" onclick={(e) => onclose && e.target === e.currentTarget && onclose()}>
  <div class="modal" class:wide role="dialog" aria-modal="true" aria-label={title}>
    {@render header?.()}
    <h2>{#if Icon}<span class="ti {tone}"><Icon size={20} strokeWidth={2.4} /></span>{/if}{title}</h2>
    {@render children()}
  </div>
</div>

<style>
  .modal { width: 100%; max-height: 100%; overflow-y: auto; background: var(--phone); border-radius: 26px; padding: 22px; animation: up .2s ease-out; border: 1px solid var(--line); }
  h2 { margin: 0 0 8px; font-size: 21px; display: flex; align-items: center; gap: 10px; }
  .ti { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; }
  .ti.accent { color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
  .ti.bad { color: var(--bad); background: color-mix(in srgb, var(--bad) 15%, transparent); }
  .ti.warn { color: var(--warn); background: color-mix(in srgb, var(--warn) 15%, transparent); }
  .modal :global(.body) { color: var(--muted); margin: 0 0 12px; line-height: 1.45; }
</style>
