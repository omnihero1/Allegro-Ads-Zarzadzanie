import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase'

const ALLOWED_DOMAIN = 'omnihero.pl'

/**
 * Sign in with Google (restricted to @omnihero.pl domain)
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account',
      hd: ALLOWED_DOMAIN // Hint to use specific domain
    })
    
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    
    // Verify email domain
    if (!user.email || !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await firebaseSignOut(auth)
      return {
        success: false,
        error: `Dostęp ograniczony do domeny @${ALLOWED_DOMAIN}`
      }
    }
    
    console.log('User signed in:', user.email)
    return { success: true }
  } catch (error: any) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: error.message || 'Nie udało się zalogować'
    }
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth)
    console.log('User signed out')
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    // Verify domain on every auth state change
    if (user && user.email && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      console.warn('Unauthorized domain:', user.email)
      firebaseSignOut(auth)
      callback(null)
      return
    }
    
    callback(user)
  })
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const user = auth.currentUser
  if (!user || !user.email) return false
  return user.email.endsWith(`@${ALLOWED_DOMAIN}`)
}

