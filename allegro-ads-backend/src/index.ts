import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'cookie-session'
import { authRouter } from './routes/auth'
import { adsRouter } from './routes/ads'
import { startTokenRefreshService } from './services/tokenRefresh'

const app = express()
app.set('trust proxy', 1)
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'], credentials: true }))

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  next()
})

app.use(express.json())
app.use(
  session({
    name: 'sess',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 60 * 60 * 1000,
  })
)

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/auth/allegro', authRouter)
app.use('/ads', adsRouter)

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`Backend listening on :${port}`)
  // Start automatic token refresh service
  startTokenRefreshService()
})


