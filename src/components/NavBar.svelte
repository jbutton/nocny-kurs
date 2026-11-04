<script lang="ts">
  import Store from '@lucide/svelte/icons/store';
  import MapIcon from '@lucide/svelte/icons/map';
  import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import Wallet from '@lucide/svelte/icons/wallet';
  import { actions, type Tab } from '../stores/app';
  import { t } from '../i18n';
  import type { GameState, Lang } from '../game/types';

  let { tab, game, lang }: { tab: Tab; game: GameState; lang: Lang } = $props();
  const items = [
    { id: 'market', icon: Store },
    { id: 'map', icon: MapIcon },
    { id: 'shop', icon: ShoppingBag },
    { id: 'chat', icon: MessageCircle },
    { id: 'wallet', icon: Wallet },
  ] as const;
  const pulse = (id: Tab) => (game.tut === 1 && id === 'map' && tab !== 'map') || (game.tut === 2 && id === 'market' && tab !== 'market');
</script>

<nav class="nav">
  {#each items as it (it.id)}
    {@const Icon = it.icon}
    <button class:on={tab === it.id} class:pulse={pulse(it.id)} onclick={() => actions.go(it.id)} aria-current={tab === it.id ? 'page' : undefined}>
      <Icon size={22} strokeWidth={tab === it.id ? 2.4 : 2} />
      <span>{t(lang, it.id)}</span>
      {#if it.id === 'chat' && game.unread && tab !== 'chat'}<span class="badge">{game.unread}</span>{/if}
    </button>
  {/each}
</nav>

<style>
  .nav { display: flex; border-top: 1px solid var(--line); background: #141720; padding: 6px 6px calc(10px + env(safe-area-inset-bottom)); }
  button { flex: 1; border: 0; background: none; color: var(--muted); padding: 7px 0 5px; font-size: 11px; font-weight: 700; cursor: pointer; position: relative; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  button.on { color: var(--accent); }
  button.pulse { animation: pulse 1.4s infinite; background: rgba(94, 234, 212, .08); }
  .badge { position: absolute; top: 1px; right: 18%; background: var(--bad); color: #fff; font-size: 10px; border-radius: 999px; padding: 1px 6px; }
</style>
