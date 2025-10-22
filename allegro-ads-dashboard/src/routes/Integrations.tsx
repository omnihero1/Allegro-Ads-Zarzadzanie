import { useEffect, useState } from 'react'
import { refreshAllegroToken, getAccounts } from '../services/allegroAuth'
import { startDeviceFlow, pollDeviceToken } from '../services/deviceFlow'

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
    <div>
      <h1>Integracje</h1>
      <p>Połącz swoje konto Allegro Ads, aby zarządzać kampaniami.</p>
      
      {!deviceCode && (
        <button onClick={startDevice} disabled={loading}>
          {loading ? 'Rozpoczynanie…' : 'Połącz z Allegro Ads'}
        </button>
      )}
      
      {deviceCode && verificationUrl && (
        <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h3>Autoryzacja Device Flow</h3>
          <p>1. Otwórz poniższy link w przeglądarce:</p>
          <a href={verificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
            {verificationUrl}
          </a>
          {userCode && (
            <>
              <p>2. Wprowadź kod:</p>
              <div style={{ fontSize: '24px', fontWeight: 'bold', padding: '8px', backgroundColor: '#f5f5f5' }}>
                {userCode}
              </div>
            </>
          )}
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            Czekamy na autoryzację...
          </p>
        </div>
      )}
      
      {error && <p style={{ color: 'tomato', marginTop: '12px' }}>{error}</p>}

      {accounts.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2>Połączone konta</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Konto</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ostatnie odświeżenie</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <div>{account.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{account.email}</div>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: account.status === 'active' ? '#d4edda' : account.status === 'expired' ? '#f8d7da' : '#fff3cd',
                      color: account.status === 'active' ? '#155724' : account.status === 'expired' ? '#721c24' : '#856404'
                    }}>
                      {account.status === 'active' ? 'Aktywne' : account.status === 'expired' ? 'Wygasło' : 'Błąd'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {new Date(account.lastRefresh).toLocaleString('pl-PL')}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button 
                      onClick={() => onRefreshToken(account.id)}
                      disabled={refreshing === account.id}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: refreshing === account.id ? 'not-allowed' : 'pointer'
                      }}
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


