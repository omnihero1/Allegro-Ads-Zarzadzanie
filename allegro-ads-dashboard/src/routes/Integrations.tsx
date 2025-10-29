import { useEffect, useState } from 'react'
import { refreshAllegroToken, getAccounts } from '../services/allegroAuth'
import { startDeviceFlow, pollDeviceToken } from '../services/deviceFlow'
import './Integrations.css'

interface Account {
  id: string
  name: string
  email: string
  status: 'active' | 'expired' | 'error'
  lastRefresh: string
}

export function Integrations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [userCode, setUserCode] = useState<string | null>(null)

  const startDevice = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await startDeviceFlow()
      setDeviceCode(data.device_code)
      setVerificationUrl(data.verification_uri_complete || data.verification_uri)
      setUserCode(data.user_code)
      
      // Start polling for token
      pollForToken(data.device_code, data.interval || 5)
    } catch (e: any) {
      setError('Nie udało się rozpocząć autoryzacji Device flow.')
    } finally {
      setLoading(false)
    }
  }
  
  const pollForToken = async (deviceCode: string, interval: number) => {
    const poll = async () => {
      try {
        const result = await pollDeviceToken(deviceCode)
        if (result.ok) {
          setDeviceCode(null)
          setVerificationUrl(null)
          setUserCode(null)
          await loadAccounts()
          setError(null)
        }
      } catch (e: any) {
        const errorCode = e?.response?.data?.details?.error || e?.response?.data?.error
        if (errorCode === 'authorization_pending') {
          // Continue polling
          setTimeout(poll, interval * 1000)
        } else if (errorCode === 'slow_down') {
          // Slow down polling
          setTimeout(poll, (interval + 5) * 1000)
        } else {
          console.error('Poll error:', e?.response?.data)
          setError('Autoryzacja nie powiodła się lub wygasła.')
          setDeviceCode(null)
        }
      }
    }
    
    setTimeout(poll, interval * 1000)
  }

  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data.accounts || [])
    } catch (e) {
      console.error('Failed to load accounts:', e)
      setAccounts([])
    }
  }

  useEffect(() => {
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const onRefreshToken = async (accountId: string) => {
    setRefreshing(accountId)
    try {
      await refreshAllegroToken(accountId)
      await loadAccounts()
    } catch (e) {
      setError('Nie udało się odświeżyć tokenu.')
    } finally {
      setRefreshing(null)
    }
  }

  return (
    <div className="integrations">
      <div className="integrations-header">
        <h1>Integracje</h1>
        <p>Połącz swoje konto Allegro Ads, aby zarządzać kampaniami.</p>
      </div>
      
      {!deviceCode && (
        <button className="connect-btn" onClick={startDevice} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Rozpoczynanie…
            </>
          ) : (
            'Połącz z Allegro Ads'
          )}
        </button>
      )}
      
      {deviceCode && verificationUrl && (
        <div className="device-flow-card">
          <h3>Autoryzacja Device Flow</h3>
          <p>1. Otwórz poniższy link w przeglądarce:</p>
          <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="verification-link">
            Otwórz stronę autoryzacji Allegro
          </a>
          {userCode && (
            <>
              <p>2. Wprowadź kod:</p>
              <div className="user-code-display">
                {userCode}
              </div>
            </>
          )}
          <p className="waiting-text">
            <span className="spinner"></span>
            Czekamy na autoryzację...
          </p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}

      {accounts.length > 0 && (
        <div className="accounts-section">
          <h2>Połączone konta</h2>
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Status</th>
                <th>Ostatnie odświeżenie</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div className="account-name">{account.name}</div>
                    <div className="account-email">{account.email}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${account.status}`}>
                      {account.status === 'active' ? 'Aktywne' : account.status === 'expired' ? 'Wygasło' : 'Błąd'}
                    </span>
                  </td>
                  <td className="last-refresh">
                    {new Date(account.lastRefresh).toLocaleString('pl-PL')}
                  </td>
                  <td>
                    <button 
                      className="refresh-btn"
                      onClick={() => onRefreshToken(account.id)}
                      disabled={refreshing === account.id}
                    >
                      {refreshing === account.id ? 'Odświeżanie...' : 'Odśwież token'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


