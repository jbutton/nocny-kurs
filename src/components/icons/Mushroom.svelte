<!-- Grzyb w stylu Lucide (Lucide nie ma takiej ikony) -->
<script lang="ts">
  let { size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number } = $props();
</script>
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 12a9 8.5 0 0 1 18 0z" />
  <path d="M9.5 12v6.5a2.5 2.5 0 0 0 5 0V12" />
  <path d="M8 8.5h.01M15 7h.01M12 5.5h.01" />
</svg>
