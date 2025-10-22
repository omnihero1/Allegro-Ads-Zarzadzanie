import axios from 'axios'
import { db } from '../firebase'

const TOKEN_URL = process.env.ALLEGRO_TOKEN_URL || 'https://allegro.pl/auth/oauth/token'
const CLIENT_ID = process.env.ALLEGRO_CLIENT_ID as string
const CLIENT_SECRET = process.env.ALLEGRO_CLIENT_SECRET as string

// Refresh tokens that will expire in the next 30 minutes
const REFRESH_THRESHOLD = 30 * 60 * 1000 // 30 minutes in milliseconds

export async function autoRefreshTokens() {
  try {
    const accountsSnapshot = await db.collection('accounts').get()
    
    for (const doc of accountsSnapshot.docs) {
      const accountData = doc.data()
      
      if (!accountData.tokens?.refresh_token || !accountData.tokens?.expires_in) {
        continue
      }
      
      // Calculate when token expires
      const lastRefresh = new Date(accountData.lastRefresh || accountData.createdAt).getTime()
      const expiresIn = accountData.tokens.expires_in * 1000 // Convert to milliseconds
      const expiresAt = lastRefresh + expiresIn
      const now = Date.now()
      
      // Check if token will expire soon
      if (expiresAt - now < REFRESH_THRESHOLD) {
        console.log(`Auto-refreshing token for account ${accountData.id}`)
        
        try {
          const data = new URLSearchParams()
          data.set('grant_type', 'refresh_token')
          data.set('refresh_token', accountData.tokens.refresh_token)
          
          const tokenRes = await axios.post(TOKEN_URL, data, {
            auth: { username: CLIENT_ID, password: CLIENT_SECRET },
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
          
          // Update tokens in Firestore
          await doc.ref.update({
            tokens: tokenRes.data,
            lastRefresh: new Date().toISOString(),
            status: 'active'
          })
          
          console.log(`Successfully refreshed token for account ${accountData.id}`)
        } catch (error: any) {
          console.error(`Failed to refresh token for account ${accountData.id}:`, error?.response?.data || error?.message)
          
          // Mark account as error if refresh fails
          await doc.ref.update({
            status: 'error'
          })
        }
      }
    }
  } catch (error) {
    console.error('Auto-refresh tokens error:', error)
  }
}

// Run auto-refresh every 10 minutes
export function startTokenRefreshService() {
  // Run immediately on startup
  autoRefreshTokens()
  
  // Then run every 10 minutes
  setInterval(autoRefreshTokens, 10 * 60 * 1000)
  
  console.log('Token refresh service started - checking every 10 minutes')
}

