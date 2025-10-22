import axios from 'axios'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

export async function startDeviceFlow() {
  const { data } = await api.post('/auth/allegro/device/start')
  return data
}

export async function pollDeviceToken(deviceCode: string) {
  const { data } = await api.post('/auth/allegro/device/poll', { device_code: deviceCode })
  return data
}

