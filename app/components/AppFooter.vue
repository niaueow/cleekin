<template>
  <footer class="footer outlined">©niaueow 2026</footer>
</template>

<style scoped>
.footer {
  --stroke: 4px;
  padding: 24px var(--page-gutter) max(24px, env(safe-area-inset-bottom));
  color: var(--c-purple);
  font-size: 20px;
  letter-spacing: 0.12em;
  text-align: center;
}

@media (max-width: 600px) {
  .footer { font-size: 15px; padding-top: 16px; }
}
</style>
