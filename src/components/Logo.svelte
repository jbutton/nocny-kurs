<!-- Logo w stylu neonu: „NOCNY KURS” / „NIGHT RUN” zależnie od języka -->
<script lang="ts">
  import type { Lang } from '../game/types';
  let { lang, size = 'lg' }: { lang: Lang; size?: 'lg' | 'sm' } = $props();
  const words = $derived(lang === 'pl' ? ['Nocny', 'Kurs'] : ['Night', 'Run']);
</script>

<div class="logo {size}" role="img" aria-label={words.join(' ')}>
  <span class="text">
    <span class="w1">{words[0]}</span>
    <span class="w2">{words[1]}</span>
    <span class="road" aria-hidden="true"></span>
  </span>
</div>

<style>
  .logo { display: inline-flex; align-items: center; font-family: 'Bungee', ui-rounded, system-ui, sans-serif; text-transform: uppercase; line-height: 1; user-select: none; }
  .lg { font-size: 32px; }
  .sm { font-size: 22px; }
  .text { position: relative; display: inline-flex; gap: .3em; padding-bottom: .28em; }
  .w1 { color: #e6fffb; text-shadow: 0 0 4px #5eead4, 0 0 12px rgba(94, 234, 212, .8), 0 0 28px rgba(94, 234, 212, .45); }
  .w2 { color: #ffe4f1; text-shadow: 0 0 4px #f472b6, 0 0 12px rgba(244, 114, 182, .8), 0 0 28px rgba(244, 114, 182, .45); animation: neon 7s infinite; }
  /* przerywana linia drogi pod napisem */
  .road { position: absolute; left: 0; right: 0; bottom: 0; height: .09em; border-radius: 2px;
    background: repeating-linear-gradient(90deg, #fbbf24 0 .45em, transparent .45em .8em); opacity: .85;
    box-shadow: 0 0 8px rgba(251, 191, 36, .5); animation: drive 1.6s linear infinite; }
  @keyframes drive { to { background-position: -.8em 0; } }
  /* neon czasem „mrugnie”, jak prawdziwy szyld */
  @keyframes neon { 0%, 91%, 93%, 95%, 100% { opacity: 1; } 92%, 94% { opacity: .35; } }
  @media (prefers-reduced-motion: reduce) { .w2, .road { animation: none; } }
</style>
