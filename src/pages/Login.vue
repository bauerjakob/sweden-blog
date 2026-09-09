<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyDocumentMeta } from '@/composables/useDocumentMeta'
import { setSceneVars } from '@/composables/useAmbientDaylight'
import { login } from '@/stores/auth'

const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

onMounted(() => {
  setSceneVars({ '--day-page': '#0c1620', '--day-page-2': '#080f16' })
  applyDocumentMeta({ title: 'Sign in — Ett halvår i Sverige', description: 'Editor sign-in.' })
})

async function onSubmit() {
  error.value = null
  busy.value = true
  try {
    await login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e) {
    error.value = (e as Error).message || 'Sign-in failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="login__inner">
      <p class="login__eyebrow">Editor</p>
      <h1 class="login__title font-display">Sign in</h1>
      <p class="login__note">
        Only the site's owner needs this. Everyone else just reads.
      </p>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field__label">Username</span>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            required
            class="field__input"
          />
        </label>
        <label class="field">
          <span class="field__label">Password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="field__input"
          />
        </label>

        <p v-if="error" class="login__error" role="alert">{{ error }}</p>

        <button type="submit" class="login__submit" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login {
  --day-ink: #f2ede1;
  --day-ink-muted: #adc0c4;
  --day-hairline: rgba(242, 237, 225, 0.16);
  max-width: 30rem;
  margin: 0 auto;
  padding: clamp(3rem, 10vw, 6rem) clamp(1rem, 4vw, 2rem);
}
.login__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
  margin: 0 0 0.75rem;
}
.login__title {
  font-size: clamp(2.4rem, 8vw, 3.4rem);
  color: var(--day-ink);
  margin: 0 0 0.75rem;
}
.login__note {
  color: var(--day-ink-muted);
  margin: 0 0 2rem;
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field__label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--day-ink-muted);
}
.field__input {
  font: inherit;
  font-size: 1.0625rem;
  color: var(--day-ink);
  background: rgba(242, 237, 225, 0.05);
  border: 1px solid var(--day-hairline);
  border-radius: 6px;
  padding: 0.7rem 0.85rem;
}
.field__input:focus {
  border-color: var(--color-ochre);
}
.login__error {
  color: #e0954a;
  margin: 0;
  font-size: 0.9rem;
}
.login__submit {
  font: inherit;
  font-weight: 600;
  margin-top: 0.5rem;
  padding: 0.75rem 1.2rem;
  border: none;
  border-radius: 999px;
  background: var(--color-ochre);
  color: #1a1206;
  cursor: pointer;
}
.login__submit:disabled {
  opacity: 0.6;
  cursor: default;
}
.login__submit:hover:not(:disabled) {
  filter: brightness(1.06);
}
</style>
