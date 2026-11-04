<!-- Wybór kwoty: szybkie przyciski (25/50/100%) + suwak + pole liczbowe -->
<script lang="ts">
  import { fmt, t } from '../i18n';
  import type { Lang } from '../game/types';

  let { max, value = $bindable(), lang }: { max: number; value: number; lang: Lang } = $props();
  const set = (v: number) => (value = Math.max(0, Math.min(max, Math.floor(v) || 0)));
  $effect(() => { if (value > max) value = max; });
</script>

<div class="picker">
  <div class="chips">
    {#each [0.25, 0.5] as f (f)}
      <button class:on={max > 0 && value === Math.floor(max * f)} disabled={max <= 0} onclick={() => set(max * f)}>{f * 100}%</button>
    {/each}
    <button class:on={max > 0 && value === max} disabled={max <= 0} onclick={() => set(max)}>{t(lang, 'all')}</button>
    <label class="field">
      <span class="sr">{t(lang, 'amount')}</span>
      <input type="number" inputmode="numeric" min="0" {max} value={value} disabled={max <= 0} oninput={(e) => set(+e.currentTarget.value)} />
      <span>zł</span>
    </label>
  </div>
  <input type="range" min="0" {max} step="1" value={value} disabled={max <= 0} oninput={(e) => set(+e.currentTarget.value)} aria-label={t(lang, 'amount')} />
  <div class="range"><span>0</span><span>{fmt(lang, max)} zł</span></div>
</div>

<style>
  .picker { margin-top: 10px; }
  .chips { display: flex; gap: 6px; align-items: center; }
  .chips button { border: 0; background: var(--card2); color: var(--text); border-radius: 10px; padding: 8px 10px; font-weight: 800; font-size: 13px; cursor: pointer; }
  .chips button.on { background: color-mix(in srgb, var(--accent) 25%, var(--card2)); color: var(--accent); }
  .chips button:disabled { opacity: .4; cursor: not-allowed; }
  .field { margin-left: auto; display: flex; align-items: center; gap: 4px; background: var(--card2); border-radius: 10px; padding: 0 10px; color: var(--muted); font-size: 13px; }
  .field input { width: 76px; background: none; border: 0; color: var(--text); font: inherit; font-weight: 800; font-size: 14px; padding: 8px 0; text-align: right; outline: none; }
  input[type=range] { width: 100%; margin: 12px 0 2px; accent-color: var(--accent); }
  .range { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
