<script lang="ts">
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import { DICTS, tm } from '../i18n';
  import type { GameState, Lang } from '../game/types';

  let { game, lang }: { game: GameState; lang: Lang } = $props();
  const d = $derived(DICTS[lang]);
  const msgs = $derived([...game.chat].reverse());
</script>

<div class="list">
  {#each msgs as m, i (msgs.length - i)}
    <div class="msg {m.from}">
      <div class="av">{#if m.from === 'news'}<Newspaper size={18} />{:else}{m.from === 'seba' ? 'S' : 'Z'}{/if}</div>
      <div class="bubble"><div class="who">{d.sender[m.from]}</div>{@html tm(lang, m)}</div>
    </div>
  {/each}
</div>

<style>
  .list { padding-top: 8px; }
  .msg { display: flex; gap: 10px; margin-bottom: 10px; }
  .av { width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; font-weight: 900; background: var(--card); color: var(--accent); }
  .msg.zbychu .av { color: var(--bad); }
  .msg.news .av { color: var(--accent2); }
  .bubble { background: var(--card); border-radius: 4px 16px 16px 16px; padding: 9px 12px; font-size: 14px; line-height: 1.4; }
  .who { font-size: 11px; color: var(--accent); font-weight: 800; margin-bottom: 2px; }
  .msg.news .bubble { background: #262236; }
  .msg.news .who { color: var(--accent2); }
  .msg.zbychu .who { color: var(--bad); }
</style>
