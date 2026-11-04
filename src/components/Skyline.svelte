<!--
  Tło na komputerze: nocna panorama aktualnego miasta (wektorowe sylwetki, migające okna).
  Telefon zasłania środek ekranu, więc budynki-symbole stoją po bokach (x < 500 albo x > 1100).
  Na telefonie panorama jest ukryta — tam gra zajmuje cały ekran.
-->
<script lang="ts" module>
  import type { CityId } from '../game/types';

  type Block = { x: number; w: number; h: number };
  type Shape = { d: string; dx?: number };
  interface Art {
    seed: number;
    /** sylwetki budynków-symboli */
    shapes: Shape[];
    /** elementy liniowe (np. koło wyciągowe kopalni) */
    lines?: Shape[];
    /** prostokąty do rozmieszczenia okien w budynkach-symbolach */
    boxes: Block[];
    /** zakresy x zajęte przez symbole — tam nie stawiamy zwykłych bloków */
    keep: [number, number][];
  }

  export const GROUND = 420;

  // deterministyczny „losowy” generator, żeby panorama była zawsze taka sama
  function prng(seed: number) {
    return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  }
  function blocks(seed: number, from: number, to: number, minH: number, maxH: number, keep: [number, number][] = []): Block[] {
    const r = prng(seed);
    const out: Block[] = [];
    for (let x = from; x < to; ) {
      const w = 40 + Math.floor(r() * 70);
      if (!keep.some(([a, b]) => x + w > a && x < b)) out.push({ x, w, h: minH + Math.floor(r() * (maxH - minH)) });
      x += w + Math.floor(r() * 6);
    }
    return out;
  }
  function windows(seed: number, bs: Block[], density = 0.16) {
    const r = prng(seed);
    const out: { x: number; y: number; d: number; o: number }[] = [];
    for (const b of bs) {
      for (let y = GROUND - b.h + 12; y < GROUND - 14; y += 14) {
        for (let x = b.x + 8; x < b.x + b.w - 8; x += 11) {
          if (r() < density) out.push({ x, y, d: r() * 12, o: 0.35 + r() * 0.55 });
        }
      }
    }
    return out;
  }
  const shift = (bs: Block[], dx: number) => bs.map((b) => ({ ...b, x: b.x + dx }));

  const ART: Record<CityId, Art> = {
    // Warszawa: Pałac Kultury (lewo), Złota 44, Varso, Warsaw Spire (prawo)
    waw: {
      seed: 7,
      shapes: [
        { dx: -370, d: 'M600 420V330h20v-12h20v-58h12v-12h18v-48h10v-14h10V110h8v-12h4V22l2-8 2 8v76h4v12h8v76h10v14h10v48h18v12h12v58h20v12h20v90z' },
        { dx: -370, d: 'M612 330v-26h8v26zM800 330v-26h8v26zM648 260v-20h6v20zM766 260v-20h6v20z' },
        { dx: 250, d: 'M880 420V128q26-22 50-58V420z' },
        { dx: 250, d: 'M982 420V96l24-16 24 16v324zM1005 80V8h2v72z' },
        { dx: 250, d: 'M1150 420V128l40-28 40 28v292z' },
        { d: 'M1190 420V250h34V420zM1290 420V220h96V420z' },
      ],
      boxes: [
        ...shift([{ x: 600, w: 208, h: 90 }, { x: 640, w: 128, h: 160 }, { x: 670, w: 68, h: 220 }, { x: 690, w: 28, h: 300 }], -370),
        ...shift([{ x: 882, w: 46, h: 290 }, { x: 984, w: 44, h: 340 }, { x: 1152, w: 76, h: 300 }], 250),
        { x: 1190, w: 34, h: 170 }, { x: 1290, w: 96, h: 200 },
      ],
      keep: [[220, 450], [1110, 1490]],
    },
    // Kraków: Wawel na wzgórzu (lewo), Kościół Mariacki z dwiema wieżami (prawo)
    krk: {
      seed: 17,
      shapes: [
        { d: 'M60 420Q250 300 500 420z' },
        { d: 'M170 390V300h14v-22l8-14 8 14v22h40v-30h70v-20l18-26 18 26v20h30v-14h12v14h26v-24l9-16 9 16v24h16V390z' },
        { d: 'M284 270q16-34 32 0z' },
        { d: 'M1240 420V176l7-16v-26l15-34 15 34v26l7 16V420z' },
        { d: 'M1269 100V40l-3-8h12l-3 8v60z' },
        { d: 'M1284 420V250l58-40 58 40V420z' },
        { d: 'M1400 420V206q19-36 38 0V420z' },
      ],
      boxes: [{ x: 172, w: 230, h: 66 }, { x: 1242, w: 40, h: 240 }, { x: 1286, w: 112, h: 166 }, { x: 1402, w: 34, h: 210 }],
      keep: [[60, 500], [1230, 1450]],
    },
    // Gdańsk: dźwigi stoczniowe (lewo), Żuraw i kamieniczki ze schodkowymi szczytami (prawo)
    gda: {
      seed: 23,
      shapes: [
        { d: 'M190 420V170h12V420zM150 170h170v10H150zM300 180v60h4v-60zM292 240h20v8h-20z' },
        { d: 'M380 420V210h10V420zM350 210h120v8H350zM455 218v40h4v-40z' },
        { d: 'M1150 420V230h28v-26l70-52h44v86h34V420z' },
        { d: 'M1250 152h40v-24h-40z' },
        { d: 'M1330 420V300h8v-14h8v-14h8v-14h8v14h8v14h8v14h8V420zM1390 420V310h8v-12h8v-12h8v-12h8v12h8v12h8v12h8V420zM1450 420V290h8v-14h8v-14h8v14h8v14h8V420z' },
      ],
      boxes: [{ x: 1152, w: 140, h: 190 }, { x: 1330, w: 56, h: 120 }, { x: 1390, w: 56, h: 110 }, { x: 1450, w: 40, h: 130 }],
      keep: [[140, 480], [1140, 1500]],
    },
    // Szczecin: Wały Chrobrego (lewo), Pazim i katedra (prawo)
    szc: {
      seed: 29,
      shapes: [
        { d: 'M90 420V360H490V420z' },
        { d: 'M170 360V292h230v68zM255 292V210h60v82zM255 210q30-50 60 0zM283 170V140h4v30z' },
        { d: 'M1230 420V96h66V420zM1236 96V76h54v20z' },
        { d: 'M1376 420V210l18-120 18 120V420zM1412 420V280h80V420z' },
      ],
      boxes: [{ x: 172, w: 226, h: 60 }, { x: 257, w: 56, h: 140 }, { x: 1232, w: 62, h: 320 }, { x: 1378, w: 32, h: 200 }, { x: 1414, w: 76, h: 136 }],
      keep: [[90, 490], [1220, 1500]],
    },
    // Wrocław: gotycki ratusz z wieżą (lewo), Sky Tower (prawo)
    wro: {
      seed: 31,
      shapes: [
        { d: 'M170 420V300l28-40 28 40 28-40 28 40 28-40 28 40 28-40 28 40V420z' },
        { d: 'M330 300V150h40v150zM330 150l20-40 20 40zM348 110V60h4v50z' },
        { d: 'M1270 420V50h70v30h10V420zM1290 50V24h30v26z' },
        { d: 'M1360 420V250h60V420zM1190 420V270h70V420z' },
      ],
      boxes: [{ x: 172, w: 196, h: 116 }, { x: 332, w: 36, h: 268 }, { x: 1272, w: 76, h: 366 }, { x: 1362, w: 56, h: 166 }, { x: 1192, w: 66, h: 146 }],
      keep: [[160, 410], [1180, 1430]],
    },
    // Poznań: renesansowy ratusz z wieżą (lewo), biurowiec Bałtyk (prawo)
    poz: {
      seed: 37,
      shapes: [
        { d: 'M170 420V300h270V420zM170 300v-16h270v16z' },
        { d: 'M284 284V190h42v94zM290 190v-30h30v30zM296 160l9-44 9 44z' },
        { d: 'M1210 420V190l46-36h64V420z' },
        { d: 'M1340 420V270h90V420z' },
      ],
      boxes: [{ x: 172, w: 266, h: 116 }, { x: 286, w: 38, h: 226 }, { x: 1212, w: 106, h: 226 }, { x: 1342, w: 86, h: 146 }],
      keep: [[160, 450], [1200, 1440]],
    },
    // Łódź: kominy fabryk i dachy szedowe (lewo), kamienice Piotrkowskiej (prawo)
    lod: {
      seed: 41,
      shapes: [
        { d: 'M110 420V340l34-30v30l34-30v30l34-30v30l34-30v30l34-30v30l34-30v110z' },
        { d: 'M224 310L230 110h14L250 310zM330 340L335 160h12L352 340zM420 420L425 190h10L440 420z' },
        { d: 'M1180 420V280h60v-20h20v20h60V420zM1330 420V300l40-24 40 24V420zM1420 420V270h70V420z' },
      ],
      boxes: [{ x: 1182, w: 136, h: 136 }, { x: 1332, w: 76, h: 116 }, { x: 1422, w: 66, h: 146 }],
      keep: [[100, 460], [1170, 1500]],
    },
    // Katowice: Spodek (lewo), szyb kopalni z kołem wyciągowym (prawo)
    kat: {
      seed: 43,
      shapes: [
        { d: 'M150 420V392h40l-20-14q130-80 260 0l-20 14h40V420z' },
        { d: 'M210 392l20-40h8l-14 40zM392 392l-20-40h-8l14 40z' },
        { d: 'M1240 420L1278 200h14L1330 420h-14L1285 236 1254 420z' },
        { d: 'M1340 420V300h120V420zM1360 300v-40h20v40z' },
      ],
      lines: [{ d: 'M1261 200a24 24 0 1 0 48 0a24 24 0 1 0-48 0M1261 200h48M1285 176v48' }],
      boxes: [{ x: 1342, w: 116, h: 116 }],
      keep: [[140, 460], [1230, 1470]],
    },
  };

  /** Gotowe dane rysunku dla miasta */
  function scene(id: CityId) {
    const a = ART[id];
    const back = blocks(a.seed, 0, 1600, 60, 170);
    const front = blocks(a.seed + 1, 0, 1600, 50, 160, a.keep);
    return { ...a, back, front, wins: windows(a.seed + 2, [...front, ...a.boxes]) };
  }
  const SCENES = Object.fromEntries((Object.keys(ART) as CityId[]).map((id) => [id, scene(id)])) as Record<CityId, ReturnType<typeof scene>>;
</script>

<script lang="ts">
  import { fade } from 'svelte/transition';

  let { city, wanted }: { city: CityId; wanted: number } = $props();
  const sc = $derived(SCENES[city]);
</script>

<div class="sky" aria-hidden="true">
  <div class="glow"></div>
  <!-- księżyc na niebie (sierp z poświatą) -->
  <svg class="moon" viewBox="0 0 100 100"><path d="M62 8a42 42 0 1 0 30 70A36 36 0 1 1 62 8z" /></svg>
  {#if wanted >= 3}<div class="sirens" class:hot={wanted >= 4}></div>{/if}
  {#key city}
    <svg class="city" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" in:fade={{ duration: 900 }} out:fade={{ duration: 600 }}>
      <g class="back">{#each sc.back as b, i (i)}<rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />{/each}</g>
      <g class="front">
        {#each sc.front as b, i (i)}<rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />{/each}
        {#each sc.shapes as p, i (i)}<path d={p.d} transform={p.dx ? `translate(${p.dx} 0)` : undefined} />{/each}
      </g>
      {#if sc.lines}<g class="lines">{#each sc.lines as p, i (i)}<path d={p.d} />{/each}</g>{/if}
      <g class="wins">{#each sc.wins as w, i (i)}<rect x={w.x} y={w.y} width="4" height="6" style="--d:{w.d}s;--o:{w.o}" />{/each}</g>
    </svg>
  {/key}
</div>

<style>
  .sky { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .glow {
    position: absolute; inset: 0;
    background:
      radial-gradient(900px 380px at 50% 100%, rgba(129, 140, 248, .18), transparent 70%),
      radial-gradient(600px 260px at 20% 100%, rgba(94, 234, 212, .08), transparent 70%);
  }
  .moon { position: absolute; top: 7vh; right: 11vw; width: 96px; height: 96px; fill: #e8edf7; opacity: .9;
    filter: drop-shadow(0 0 18px rgba(232, 237, 247, .45)) drop-shadow(0 0 60px rgba(129, 140, 248, .35)); }
  .city { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 46vh; }
  .back rect { fill: #161a28; }
  .front rect, .front path { fill: #0b0d14; }
  .lines path { fill: none; stroke: #0b0d14; stroke-width: 6; }
  .wins rect { fill: #fcd34d; opacity: var(--o); animation: flicker 14s var(--d) infinite steps(1); }
  @keyframes flicker { 0%, 100% { opacity: var(--o); } 37% { opacity: .08; } 41% { opacity: var(--o); } 73% { opacity: .15; } 76% { opacity: var(--o); } }

  /* poziom poszukiwania ≥ 3: niebiesko-czerwone światła radiowozów w tle */
  .sirens { position: absolute; inset: auto 0 0 0; height: 70vh; animation: sirens 1.6s infinite; opacity: .75; }
  .sirens.hot { opacity: 1; animation-duration: 1s; }
  @keyframes sirens {
    0%, 100% { background: radial-gradient(700px 360px at 18% 100%, rgba(59, 130, 246, .45), transparent 70%); }
    50% { background: radial-gradient(700px 360px at 82% 100%, rgba(239, 68, 68, .45), transparent 70%); }
  }
  @media (max-width: 480px) { .sky { display: none; } }
  @media (prefers-reduced-motion: reduce) { .wins rect, .sirens { animation: none; } }
</style>
