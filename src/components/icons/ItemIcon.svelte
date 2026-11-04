<!--
  Ikona w kolorowym kafelku: towary, apteka, klinika, miasta, sprzęt.
  Każdy rodzaj ma swój kolor akcentu, ikony są liniowe (Lucide).
-->
<script lang="ts" module>
  import Cannabis from '@lucide/svelte/icons/cannabis';
  import Cuboid from '@lucide/svelte/icons/cuboid';
  import Zap from '@lucide/svelte/icons/zap';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Pill from '@lucide/svelte/icons/pill';
  import Snowflake from '@lucide/svelte/icons/snowflake';
  import Droplet from '@lucide/svelte/icons/droplet';
  import BriefcaseMedical from '@lucide/svelte/icons/briefcase-medical';
  import PillBottle from '@lucide/svelte/icons/pill-bottle';
  import Stethoscope from '@lucide/svelte/icons/stethoscope';
  import Building from '@lucide/svelte/icons/building';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Backpack from '@lucide/svelte/icons/backpack';
  import Motorbike from '@lucide/svelte/icons/motorbike';
  import Car from '@lucide/svelte/icons/car';
  import Truck from '@lucide/svelte/icons/truck';
  import SprayCan from '@lucide/svelte/icons/spray-can';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import Mushroom from './Mushroom.svelte';
  import Bat from './Bat.svelte';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ICONS: Record<string, { c: any; color: string }> = {
    weed: { c: Cannabis, color: '#4ade80' },
    hash: { c: Cuboid, color: '#d6a46a' },
    shrooms: { c: Mushroom, color: '#fb923c' },
    speed: { c: Zap, color: '#facc15' },
    mefa: { c: FlaskConical, color: '#a78bfa' },
    ecstasy: { c: Pill, color: '#f472b6' },
    coke: { c: Snowflake, color: '#7dd3fc' },
    heroin: { c: Droplet, color: '#f87171' },
    medweed: { c: BriefcaseMedical, color: '#5eead4' },
    pharm: { c: PillBottle, color: '#5eead4' },
    clinic: { c: Stethoscope, color: '#5eead4' },
    city: { c: Building, color: '#94a3b8' },
    here: { c: MapPin, color: '#5eead4' },
    backpack: { c: Backpack, color: '#94a3b8' },
    bigpack: { c: Backpack, color: '#60a5fa' },
    scooter: { c: Motorbike, color: '#f59e0b' },
    car: { c: Car, color: '#38bdf8' },
    van: { c: Truck, color: '#a3e635' },
    spray: { c: SprayCan, color: '#fb923c' },
    bat: { c: Bat, color: '#d6a46a' },
    gun: { c: Crosshair, color: '#f87171' },
  };
</script>

<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const it = $derived(ICONS[name] ?? ICONS.city);
  const Comp = $derived(it.c);
</script>

<span class="ico" style="--c:{it.color}" aria-hidden="true"><Comp {size} strokeWidth={2} /></span>

<style>
  .ico {
    width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px;
    color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  }
</style>
