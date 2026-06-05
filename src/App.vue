<template>
  <div class="app-wrap" :class="{ 'auth-layout': !isLoggedIn || hideGlobalNav }">
    <div class="diag"></div>
    <ParticlesBg v-if="isLoggedIn" />
    <template v-if="isLoggedIn && !hideGlobalNav">
      <Sidebar />
      <div class="main">
        <Header />
        <main class="content">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else-if="isLoggedIn">
      <RouterView />
    </template>
    <template v-else>
      <Navbar v-if="showNavbar" />
      <div class="guest-content">
        <RouterView />
      </div>
    </template>
    <GlobalModal />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/useUserStore.js'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import ParticlesBg from './components/ParticlesBg.vue'
import GlobalModal from './components/GlobalModal.vue'

const route = useRoute()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const showNavbar = computed(() => !route.meta?.hideGlobalNavbar)
const hideGlobalNav = computed(() => route.meta?.hideGlobalNavbar)
</script>

<style scoped>
.app-wrap {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.app-wrap.auth-layout {
  flex-direction: column;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.guest-content {
  flex: 1;
  overflow-y: auto;
}
</style>
