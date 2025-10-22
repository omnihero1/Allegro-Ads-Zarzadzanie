import { Router } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '../firebase'
import https from 'https'

// Allegro OAuth endpoints (override via env if needed)
const AUTH_URL = process.env.ALLEGRO_AUTH_URL || 'https://allegro.pl/auth/oauth/authorize'
const TOKEN_URL = process.env.ALLEGRO_TOKEN_URL || 'https://allegro.pl/auth/oauth/token'
const DEFAULT_SCOPE = process.env.ALLEGRO_SCOPE || 'allegro:api:ads allegro:api:campaigns'
const PROMPT = process.env.ALLEGRO_PROMPT // e.g. 'confirm'

const CLIENT_ID = process.env.ALLEGRO_CLIENT_ID as string
const CLIENT_SECRET = process.env.ALLEGRO_CLIENT_SECRET as string
const REDIRECT_URI = process.env.ALLEGRO_REDIRECT_URI as string

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  // eslint-disable-next-line no-console
  console.warn('Missing Allegro OAuth env vars. Set ALLEGRO_CLIENT_ID/SECRET/REDIRECT_URI')
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generatePkce() {
  // Generate 40-character code verifier like in Python example
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let codeVerifier = ''
  for (let i = 0; i < 40; i++) {
    codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // Generate code challenge exactly like in Python
  const challenge = crypto.createHash('sha256').update(codeVerifier, 'utf8').digest()
  const codeChallenge = challenge.toString('base64url').replace(/=/g, '')
  
  return { codeVerifier, codeChallenge }
}

export const authRouter = Router()

// Device flow endpoints
authRouter.post('/device/start', async (req, res) => {
  try {
    const deviceRes = await axios.post(
      `https://allegro.pl/auth/oauth/device?client_id=${CLIENT_ID}`,
      {},
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    
    res.json(deviceRes.data)
  } catch (e: any) {
    console.error('Device flow start error:', e?.response?.data || e?.message)
    res.status(400).json({ error: 'Device flow start failed', details: e?.response?.data || e?.message })
  }
})

authRouter.post('/device/poll', async (req, res) => {
  try {
    const { device_code } = req.body
    
    const data = new URLSearchParams()
    data.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')
    data.set('device_code', device_code)
    
    const tokenRes = await axios.post(TOKEN_URL, data, {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    
    // Get user info
    const userInfo = await axios.get('https://api.allegro.pl/me', {
      headers: { 
        'Authorization': `Bearer ${tokenRes.data.access_token}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    })
    
    // Save to Firestore
    const accountData = {
      id: userInfo.data.id.toString(),
      name: userInfo.data.login,
      email: userInfo.data.email,
      status: 'active',
      tokens: tokenRes.data,
      lastRefresh: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    
    await db.collection('accounts').doc(accountData.id).set(accountData)
    
    res.json({ ok: true, account: accountData })
  } catch (e: any) {
    res.status(400).json({ error: 'Device flow poll failed', details: e?.response?.data || e?.message })
  }
})

authRouter.get('/start', (req, res) => {
  const { codeVerifier, codeChallenge } = generatePkce()
  const state = base64Url(crypto.randomBytes(16))

  // Store in session
  // @ts-expect-error cookie-session typing
  req.session.pkce = { codeVerifier, state }

  const url = new URL(AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  if (DEFAULT_SCOPE) url.searchParams.set('scope', DEFAULT_SCOPE)
  if (PROMPT) url.searchParams.set('prompt', PROMPT)
  // Always add prompt=confirm for better user experience
  url.searchParams.set('prompt', 'confirm')

  res.json({ authorizationUrl: url.toString() })
})

const callbackBody = z.object({ code: z.string(), state: z.string().optional() })

authRouter.post('/callback', async (req, res) => {
  const parse = callbackBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }
  const { code, state } = parse.data
  // @ts-expect-error cookie-session typing
  const sess = req.session.pkce as { codeVerifier: string; state: string } | undefined
  if (!sess) return res.status(400).json({ error: 'Missing session' })
  if (state && state !== sess.state) return res.status(400).json({ error: 'Invalid state' })

  const data = new URLSearchParams()
  data.set('grant_type', 'authorization_code')
  data.set('code', code)
  data.set('redirect_uri', REDIRECT_URI)
  data.set('code_verifier', sess.codeVerifier)
  // Remove client_id and client_secret from body - use Basic Auth

  try {
    console.log('Token request data:', data.toString())
    console.log('Token URL:', TOKEN_URL)
    console.log('Client ID:', CLIENT_ID)
    console.log('Code verifier:', sess.codeVerifier)
    console.log('Code verifier length:', sess.codeVerifier.length)
    
    // Use raw HTTPS request to have full control over headers
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    const body = data.toString()
    
    const tokenData = await new Promise<any>((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': `Basic ${credentials}`
        }
      }
      
      const request = https.request(TOKEN_URL, options, (response) => {
        let responseData = ''
        response.on('data', (chunk) => { responseData += chunk })
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(JSON.parse(responseData))
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${responseData}`))
          }
        })
      })
      
      request.on('error', reject)
      request.write(body)
      request.end()
    })
    // Get user info from Allegro API
    const userInfo = await axios.get('https://api.allegro.pl/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    // Save account and tokens to Firestore
    const accountData = {
      id: userInfo.data.id.toString(),
      name: userInfo.data.login,
      email: userInfo.data.email,
      status: 'active',
      tokens: tokenData,
      lastRefresh: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    await db.collection('accounts').doc(accountData.id).set(accountData)

    // @ts-expect-error cookie-session typing
    req.session.tokens = tokenData
    res.json({ ok: true })
  } catch (e: any) {
    res.status(400).json({ error: 'Token exchange failed', details: e?.response?.data || e?.message })
  }
})

authRouter.post('/refresh', async (req, res) => {
  try {
    const { accountId } = req.body
    
    // Get specific account or first account
    let accountDoc
    if (accountId) {
      accountDoc = await db.collection('accounts').doc(accountId).get()
      if (!accountDoc.exists) {
        return res.status(404).json({ error: 'Account not found' })
      }
    } else {
      const accountsSnapshot = await db.collection('accounts').limit(1).get()
      if (accountsSnapshot.empty) {
        return res.status(400).json({ error: 'No accounts found' })
      }
      accountDoc = accountsSnapshot.docs[0]
    }

    const accountData = accountDoc.data()!
    
    if (!accountData.tokens?.refresh_token) {
      return res.status(400).json({ error: 'No refresh token' })
    }

    const data = new URLSearchParams()
    data.set('grant_type', 'refresh_token')
    data.set('refresh_token', accountData.tokens.refresh_token)
    data.set('client_id', CLIENT_ID)
    data.set('client_secret', CLIENT_SECRET)

    const tokenRes = await axios.post(TOKEN_URL, data, {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
    })

    // Update tokens in Firestore
    await accountDoc.ref.update({
      tokens: tokenRes.data,
      lastRefresh: new Date().toISOString()
    })

    res.json({ ok: true })
  } catch (e: any) {
    res.status(400).json({ error: 'Refresh failed', details: e?.response?.data || e?.message })
  }
})

// Client Credentials flow - for application-only access
authRouter.post('/client-credentials', async (req, res) => {
  try {
    const data = new URLSearchParams()
    data.set('grant_type', 'client_credentials')
    
    const tokenRes = await axios.post(TOKEN_URL, data, {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
    })
    
    res.json({ 
      success: true, 
      token: tokenRes.data.access_token,
      expires_in: tokenRes.data.expires_in,
      scope: tokenRes.data.scope
    })
  } catch (e: any) {
    console.error('Client credentials error:', e?.response?.data || e?.message)
    res.status(400).json({ error: 'Client credentials failed', details: e?.response?.data || e?.message })
  }
})

authRouter.get('/accounts', async (req, res) => {
  try {
    const accountsSnapshot = await db.collection('accounts').get()
    const accounts = accountsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        status: data.status,
        lastRefresh: data.lastRefresh
      }
    })
    res.json({ accounts })
  } catch (error) {
    console.error('Get accounts error:', error)
    res.status(500).json({ error: 'Failed to get accounts' })
  }
})


