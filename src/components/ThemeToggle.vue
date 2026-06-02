<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="`Switch to ${nextThemeLabel} theme`"
    :title="`Switch to ${nextThemeLabel} theme`"
    @click="toggleTheme"
  >
    <span class="theme-toggle__track" aria-hidden="true">
      <span class="theme-toggle__knob">
        <span class="theme-toggle__glyph">{{ isDark ? 'D' : 'L' }}</span>
      </span>
    </span>
    <span class="theme-toggle__text">{{ themeLabel }}</span>
  </button>
</template>

<script setup>
import { useTheme } from '../composables/useTheme.js'

const { isDark, themeLabel, nextThemeLabel, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 5px 10px 5px 6px;
  border: 1px solid var(--lf-border-soft);
  border-radius: 999px;
  color: var(--lf-text);
  background: var(--lf-panel-plain);
  box-shadow: var(--lf-shadow-soft);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.theme-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--lf-border-strong);
  box-shadow: var(--lf-shadow-hover);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: var(--lf-focus), var(--lf-shadow-soft);
}

.theme-toggle__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 52px;
  height: 28px;
  padding: 3px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--lf-bg-soft), color-mix(in srgb, var(--lf-primary) 18%, var(--lf-card)));
  border: 1px solid var(--lf-border-soft);
}

.theme-toggle__knob {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--gradient-primary);
  color: #ffffff;
  box-shadow: 0 6px 18px var(--lf-primary-glow);
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.theme-toggle__glyph {
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
}

.theme-toggle__text {
  min-width: 34px;
  text-align: left;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lf-text-muted);
}

:root[data-theme='light'] .theme-toggle__knob {
  transform: translateX(24px);
}

:root[data-theme='light'] .theme-toggle__track {
  background: linear-gradient(135deg, #ffffff, #fff0f7);
}

@media (max-width: 760px) {
  .theme-toggle__text {
    display: none;
  }

  .theme-toggle {
    padding-right: 6px;
  }
}
</style>
