import axios from 'axios'

// NOTE: In a real app, client_secret must NEVER be exposed in frontend.
// We'll call a backend endpoint to generate the PKCE and auth URL and to exchange tokens.

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

export async function startAllegroOAuth(): Promise<string> {
  const { data } = await api.get('/auth/allegro/start')
  return data.authorizationUrl as string
}

export async function exchangeCodeForTokens(params: { code: string; state?: string }) {
  await api.post('/auth/allegro/callback', params)
}

export async function refreshAllegroToken(accountId?: string) {
  await api.post('/auth/allegro/refresh', { accountId })
}

export async function getAccounts() {
  const { data } = await api.get('/auth/allegro/accounts')
  return data
}


