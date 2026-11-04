<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import { actions } from '../stores/app';
  import { DICTS, t } from '../i18n';
  import type { Lang } from '../game/types';

  let { step, lang }: { step: number; lang: Lang } = $props();
</script>

<aside class="mentor">
  <div class="av">S</div>
  <div class="grow">
    <div class="who">{DICTS[lang].sender.seba}</div>
    <div class="txt">{@html t(lang, 'tut' + step)}</div>
  </div>
  <button class="skip" onclick={actions.skipTutorial} aria-label={t(lang, 'skip')}>{#if step === 3}<X size={16} />{:else}{t(lang, 'skip')}{/if}</button>
</aside>

<style>
  .mentor { position: absolute; left: 12px; right: 12px; bottom: 84px; background: #1f2a3a; border: 1px solid #2f4258; border-radius: 20px; padding: 12px 14px; display: flex; gap: 10px; z-index: 10; box-shadow: 0 10px 30px rgba(0, 0, 0, .4); animation: up .25s; }
  .av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--card); color: var(--accent); font-weight: 900; flex-shrink: 0; }
  .who { font-size: 12px; color: var(--accent); font-weight: 800; }
  .txt { font-size: 14px; line-height: 1.4; margin-top: 2px; }
  .skip { background: none; border: 0; color: var(--muted); font-size: 12px; cursor: pointer; align-self: flex-start; padding: 0 0 0 6px; }
</style>
