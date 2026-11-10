<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Cleekin · Admin login', meta: [{ name: 'robots', content: 'noindex' }] })

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const { fetch: refreshSession } = useUserSession()

async function submit() {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/admin')
  } catch (err) {
    error.value = errorMessage(err, 'Couldn\'t log in. Try again.')
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <header class="login__header">
      <AppLogo />
      <span class="login__suffix outlined">'s dashboard</span>
    </header>

    <main class="login__main">
      <form class="card" novalidate @submit.prevent="submit">
        <h1 class="card__title outlined">Welcome back!</h1>
        <p class="card__sub">Log in to manage your frames.</p>

        <label class="field">
          <span class="field__label">Email</span>
          <input v-model="email" class="input" type="email" autocomplete="username" inputmode="email" required autofocus>
        </label>

        <label class="field">
          <span class="field__label">Password</span>
          <span class="field__wrap">
            <input v-model="password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required>
            <button type="button" class="field__eye" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" :size="20" aria-hidden="true" />
              <Eye v-else :size="20" aria-hidden="true" />
            </button>
          </span>
        </label>

        <p v-if="error" class="card__error" role="alert">{{ error }}</p>

        <AppButton type="submit" :loading="loading" class="card__submit">Log in</AppButton>
      </form>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.login__header {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 60px var(--page-gutter) 0;
}

.login__suffix {
  --stroke: 2px;
  padding-bottom: 12px;
  color: var(--c-pink-dark);
  font-size: 32px;
}

.login__main {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 32px var(--page-gutter);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(440px, 100%);
  padding: 32px;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-l);
  background: var(--c-white);
}

.card__title {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 32px;
}

.card__sub {
  margin-top: -8px;
  margin-bottom: 8px;
  font-size: 14px;
  letter-spacing: 0.06em;
  opacity: 0.75;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field__label {
  color: var(--c-pink-dark);
  font-size: 14px;
}

.field__wrap { position: relative; }

.input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius-m);
  background: var(--c-white);
  font-size: 16px;
  letter-spacing: 0.1em;
}

.field__wrap .input { padding-right: 52px; }

.field__eye {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transform: translateY(-50%);
}

.card__error {
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: #fff1f1;
  color: var(--c-danger-border);
  font-size: 14px;
  letter-spacing: 0.04em;
}

.card__submit { margin-top: 8px; }

@media (max-width: 600px) {
  .login__header { padding-top: 24px; }
  .login__suffix { font-size: 22px; padding-bottom: 6px; }
  .card { padding: 24px 20px; }
  .card__title { font-size: 26px; }
}
</style>
