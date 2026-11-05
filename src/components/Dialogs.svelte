<!-- Wszystkie okna dialogowe. Kontrola policji / napad mają pierwszeństwo, bo są częścią stanu gry. -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import Logo from './Logo.svelte';
  import Board from './Board.svelte';
  import Siren from '@lucide/svelte/icons/siren';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import HandCoins from '@lucide/svelte/icons/hand-coins';
  import Trophy from '@lucide/svelte/icons/trophy';
  import TrainFront from '@lucide/svelte/icons/train-front';
  import Ticket from '@lucide/svelte/icons/ticket';
  import Stethoscope from '@lucide/svelte/icons/stethoscope';
  import { actions, type Dialog } from '../stores/app';
  import { DICTS, fmt, t, tm } from '../i18n';
  import { C, DODGE, RX } from '../game/data';
  import { bestWeapon, borrowLimit, canVisitClinic, fuelShortfall, rankOf, travelCost } from '../game/engine';
  import Fuel from '@lucide/svelte/icons/fuel';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import { forDiff, NICK_MAX, type BoardEntry } from '../game/leaderboard';
  import type { Diff, GameState, Lang } from '../game/types';

  let { game, lang, dialog, board, nick }: { game: GameState; lang: Lang; dialog: Dialog | null; board: BoardEntry[]; nick: string } = $props();
  const d = $derived(DICTS[lang]);
  const P = $derived(game.pending);
  const diffs: Diff[] = ['easy', 'normal', 'hard'];
  let nickInput = $state('');
  $effect(() => { if (dialog?.kind === 'end') nickInput = nick; });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const INFO_ICON: Record<string, any> = { polTitle: Siren, robTitle: ShieldAlert, kanarTitle: Ticket, collTitle: HandCoins };
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
</script>

{#if P?.kind === 'police'}
  <Modal title={t(lang, 'polTitle')} icon={Siren} tone="bad">
    <div class="body">{t(lang, 'polText', { n: P.illegal })}{#if P.legal}<br /><br />{t(lang, 'polTextRx', { m: P.legal })}{/if}</div>
    <button class="btn" onclick={() => actions.police('run')}>{t(lang, 'run')}<small>{t(lang, 'runSub', { p: P.runP })}</small></button>
    <button class="btn sec" onclick={() => actions.police('dump')}>{t(lang, 'dump')}<small>{t(lang, 'dumpSub')}</small></button>
    <button class="btn sec" disabled={game.cash < P.bribeC} onclick={() => actions.police('bribe')}>{t(lang, 'bribe', { c: P.bribeC })}<small>{t(lang, 'bribeSub', { p: P.bribeP })}</small></button>
    {#if P.canBluff}<button class="btn sec" onclick={() => actions.police('bluff')}>{t(lang, 'bluff')}<small>{t(lang, 'bluffSub', { p: RX.bluffChance })}</small></button>{/if}
  </Modal>
{:else if P?.kind === 'robbery'}
  <Modal title={t(lang, 'robTitle')} icon={ShieldAlert} tone="bad">
    <div class="body">{t(lang, 'robText')}</div>
    <button class="btn sec" onclick={() => actions.robbery('give')}>{t(lang, 'robGiveBtn')}<small>{t(lang, 'robGiveSub')}</small></button>
    <button class="btn sec" onclick={() => actions.robbery('run')}>{t(lang, 'robRun')}<small>{t(lang, 'robRunSub', { p: P.runP })}</small></button>
    {#if P.fightP && bestWeapon(game)}
      <button class="btn" onclick={() => actions.robbery('fight')}>{t(lang, 'robFight', { w: bestWeapon(game) ?? '' })}<small>{t(lang, 'robFightSub', { p: P.fightP })}</small></button>
    {:else}
      <p class="note">{t(lang, 'robNoWeapon')}</p>
    {/if}
  </Modal>
{:else if dialog?.kind === 'info'}
  <Modal title={t(lang, dialog.title)} icon={INFO_ICON[dialog.title]} tone={dialog.title === 'polTitle' || dialog.title === 'robTitle' || dialog.title === 'collTitle' ? 'bad' : 'warn'} onclose={actions.closeDialog}>
    <div class="body">{#each dialog.body as m, i (i)}{#if i}<br /><br />{/if}{@html tm(lang, m)}{/each}</div>
    <button class="btn center" onclick={actions.closeDialog}>{t(lang, 'ok')}</button>
  </Modal>
{:else if dialog?.kind === 'travel'}
  <Modal title={t(lang, 'travelTitle', { city: dialog.to })} icon={TrainFront} onclose={actions.closeDialog}>
    {@const tc = travelCost(game, dialog.to)}
    {@const ticket = tc.cost}
    {@const byCar = tc.kind === 'fuel'}
    {@const canPay = game.cash >= ticket}
    <div class="body">{t(lang, 'travelText', { i: game.debt * 0.07 })}{#if !canPay}<br /><br /><b class="warn">{t(lang, byCar ? 'noFuel' : 'noTicket', { p: ticket })}</b>{/if}</div>
    {#if canPay}
      <button class="btn center iconed" onclick={() => dialog?.kind === 'travel' && actions.travel(dialog.to)}>{#if byCar}<Fuel size={18} strokeWidth={2.4} />{:else}<TrainFront size={18} strokeWidth={2.4} />{/if} {t(lang, byCar ? 'goFuel' : 'goTicket', { p: ticket })}</button>
    {/if}
    {#if !byCar}
      <button class="btn" class:sec={canPay} onclick={() => dialog?.kind === 'travel' && actions.travel(dialog.to, true)}>{t(lang, 'dodge')}<small>{t(lang, 'dodgeSub', { f: DODGE.fine })}</small></button>
    {:else if !canPay}
      {@const need = fuelShortfall(game, dialog.to)}
      {#if borrowLimit(game) >= need}
        <button class="btn" onclick={() => dialog?.kind === 'travel' && actions.borrowAndTravel(dialog.to)}>{t(lang, 'borrowFuel', { n: need })}<small>{t(lang, 'borrowFuelSub')}</small></button>
      {:else}
        <p class="note">{t(lang, 'noFuelHelp')}</p>
      {/if}
    {/if}
    <button class="btn sec center" onclick={actions.closeDialog}>{t(lang, 'cancel')}</button>
  </Modal>
{:else if dialog?.kind === 'clinic'}
  <Modal title={t(lang, 'clinicTitle')} icon={Stethoscope} onclose={actions.closeDialog}>
    <div class="body">{@html t(lang, 'clinicText', { c: RX.visit, l: RX.limit, v: RX.valid, tc: RX.tele, w: RX.teleWindow })}</div>
    <button class="btn center" disabled={!canVisitClinic(game)} onclick={actions.clinicVisit}>{t(lang, 'clinicGo', { c: RX.visit })}</button>
    <button class="btn sec center" onclick={actions.closeDialog}>{t(lang, 'cancel')}</button>
  </Modal>
{:else if dialog?.kind === 'newGame'}
  <Modal title={t(lang, 'newGameTitle')} onclose={actions.closeDialog}>
    <div class="body">{t(lang, 'newGameText', { d: game.day })}</div>
    <button class="btn center" onclick={actions.askDifficulty}>{t(lang, 'newGameYes')}</button>
    <button class="btn sec center" onclick={actions.closeDialog}>{t(lang, 'cancel')}</button>
  </Modal>
{:else if dialog?.kind === 'difficulty'}
  <Modal title={t(lang, 'diffTitle')}>
    {#snippet header()}<div class="logo-wrap"><Logo {lang} size="sm" /></div>{/snippet}
    <div class="body">{@html t(lang, 'diffText')}</div>
    {#each diffs as df (df)}
      <button class="btn" class:sec={df !== 'normal'} onclick={() => actions.startGame(df)}>{t(lang, df)}<small>{t(lang, df + 'Sub')}</small></button>
    {/each}
  </Modal>
{:else if dialog?.kind === 'end'}
  <Modal title={dialog.bankrupt ? t(lang, 'bankruptTitle') : t(lang, 'endTitle')} icon={dialog.bankrupt ? HandCoins : Trophy} tone={dialog.bankrupt ? 'bad' : 'warn'}>
    <div class="body">
      {#if dialog.bankrupt}<p>{t(lang, 'bankruptText')}</p>{/if}
      <div class="score" class:neg={dialog.score <= 0}>{fmt(lang, dialog.score)} zł</div>
      {@html t(lang, 'endText', { r: d.ranks[rankOf(dialog.score)] })}
    </div>
    {#if dialog.score > 0}
      <label class="note" for="nick">{t(lang, 'nickLabel')}</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input id="nick" class="nick" maxlength={NICK_MAX} placeholder={t(lang, 'nickPh')} bind:value={nickInput} autofocus
        onkeydown={(e) => e.key === 'Enter' && actions.saveScore(nickInput)} />
      <button class="btn center iconed" onclick={() => actions.saveScore(nickInput)}><Trophy size={18} strokeWidth={2.4} /> {t(lang, 'saveScore')}</button>
      <button class="btn sec center" onclick={actions.askDifficulty}>{t(lang, 'skipSave')}</button>
    {:else}
      <button class="btn center" onclick={actions.askDifficulty}>{t(lang, 'again')}</button>
    {/if}
  </Modal>
{:else if dialog?.kind === 'board'}
  <Board {dialog} {lang} {board} />
{:else if dialog?.kind === 'offline'}
  <Modal title={t(lang, 'offlineTitle')} icon={WifiOff} tone="warn">
    <div class="body">{t(lang, dialog.lost ? 'runLostText' : 'offlineText')}</div>
    {#if !dialog.lost}<button class="btn center" onclick={actions.retryOnline}>{t(lang, 'retry')}</button>{/if}
    <button class="btn center" class:sec={!dialog.lost} onclick={actions.playOffline}>{t(lang, 'playOffline')}</button>
  </Modal>
{/if}

<style>
  .warn { color: var(--warn); }
  .iconed { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .logo-wrap { display: flex; justify-content: center; margin: 2px 0 14px; }
  .score { font-size: 34px; font-weight: 900; color: var(--good); margin-bottom: 8px; }
  .score.neg { color: var(--bad); }
  .nick { width: 100%; margin-top: 8px; background: var(--card); border: 2px solid var(--line); border-radius: 14px; padding: 12px 14px; color: var(--text); font: inherit; font-size: 16px; font-weight: 700; outline: none; }
  .nick:focus { border-color: var(--accent); }
  .tabs { display: flex; gap: 6px; margin: 4px 0 12px; }
  .tabs button { flex: 1; border: 0; background: var(--card); color: var(--muted); font-weight: 800; padding: 8px 4px; border-radius: 10px; cursor: pointer; font-size: 12px; }
  .tabs button.on { background: var(--accent); color: #0b1b19; }
  .place { margin-bottom: 10px; color: var(--muted); }
  .brow { display: flex; align-items: center; gap: 10px; background: var(--card); border-radius: 12px; padding: 9px 12px; margin-bottom: 6px; }
  .brow.me { outline: 2px solid var(--accent); background: #1d2f2d; }
  .pl { width: 28px; text-align: center; font-weight: 900; }
  .nm { flex: 1; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm small { display: block; font-weight: 600; color: var(--muted); font-size: 11px; }
  .sc { font-weight: 900; }
</style>
