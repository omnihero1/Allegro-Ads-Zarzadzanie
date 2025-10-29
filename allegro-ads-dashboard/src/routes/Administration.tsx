import { useState, useEffect } from 'react'
import { getAccounts } from '../services/allegroAuth'
import './Administration.css'

const API_URL = import.meta.env.VITE_BACKEND_URL

interface AllegroAccount {
  id: string
  email: string
  name: string
  status: string
}

interface AgencyClient {
  id: string
  name: string
}


interface SyncResult {
  accountId: string
  status: 'success' | 'error'
  ordersCount: number
  message: string
  dateRange?: {
    from: string
    to: string
  }
  error?: string
}

interface StatsSyncResult {
  accountId: string
  clientId: string
  status: 'success' | 'error'
  statsCount: number
  message: string
  dateRange?: {
    from: string
    to: string
  }
  types?: string[]
  error?: string
}

export function Administration() {
  // Orders sync state
  const [accounts, setAccounts] = useState<AllegroAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Advertising stats sync state
  const [statsAccountId, setStatsAccountId] = useState<string>('')
  const [agencyClients, setAgencyClients] = useState<AgencyClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [statsDateFrom, setStatsDateFrom] = useState<string>('')
  const [statsDateTo, setStatsDateTo] = useState<string>('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsLoadingClients, setStatsLoadingClients] = useState(false)
  const [statsSyncResult, setStatsSyncResult] = useState<StatsSyncResult | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsTypes, setStatsTypes] = useState<string[]>(['SPONSORED_OFFER', 'GRAPHIC_AD'])

  // Offers sync state
  const [offersAccountId, setOffersAccountId] = useState<string>('')
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState<string | null>(null)
  const [offersSyncResult, setOffersSyncResult] = useState<{
    accountId: string
    status: string
    offersCount: number
    message: string
    error?: string
  } | null>(null)

  // Account mapping state
  const [mappings, setMappings] = useState<Array<{
    salesAccountId: string
    salesAccountName: string
    agencyAccountId: string
    agencyAccountName: string
    agencyClientId: string
    agencyClientName: string
  }>>([])
  const [newMapping, setNewMapping] = useState({
    salesAccountId: '',
    agencyAccountId: '',
    agencyClientId: ''
  })
  const [mappingAgencyClients, setMappingAgencyClients] = useState<AgencyClient[]>([])
  const [mappingLoading, setMappingLoading] = useState(false)
  const [mappingError, setMappingError] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
    
    // Set default dates (last 7 days)
    const today = new Date()
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    setDateFrom(lastWeek.toISOString().split('T')[0])
    setDateTo(today.toISOString().split('T')[0])
  }, [])

  // Load mappings when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0) {
      loadMappings()
    }
  }, [accounts])

  async function loadAccounts() {
    try {
      const data = await getAccounts()
      setAccounts(data.accounts || [])
      
      // Select first account by default
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccountId(data.accounts[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      setError('Nie udało się załadować listy kont')
    }
  }

  async function handleSyncOrders() {
    if (!selectedAccountId) {
      setError('Wybierz konto')
      return
    }
    
    if (!dateFrom || !dateTo) {
      setError('Wybierz zakres dat')
      return
    }

    // Validate date range (max 30 days)
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 30) {
      setError('Maksymalny zakres to 30 dni')
      return
    }
    
    if (daysDiff < 0) {
      setError('Data "od" musi być wcześniejsza niż data "do"')
      return
    }

    setLoading(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch(`${API_URL}/orders/sync-range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accountId: selectedAccountId,
          dateFrom,
          dateTo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Synchronizacja nie powiodła się')
      }

      if (data.result) {
        setSyncResult({
          accountId: selectedAccountId,
          status: data.result.status,
          ordersCount: data.result.ordersCount || 0,
          message: data.message || '',
          dateRange: data.result.dateRange,
          error: data.result.error,
        })
      } else {
        setSyncResult({
          accountId: selectedAccountId,
          status: 'success',
          ordersCount: 0,
          message: data.message || 'Synchronizacja rozpoczęta',
        })
      }
    } catch (err: any) {
      console.error('Sync error:', err)
      setError(err.message || 'Nie udało się zsynchronizować zamówień')
    } finally {
      setLoading(false)
    }
  }

  // Load agency clients when stats account changes
  useEffect(() => {
    if (statsAccountId) {
      loadAgencyClients()
      // Set default dates for stats (last 30 days, ending YESTERDAY)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1) // Allegro API only accepts up to yesterday
      const lastMonth = new Date(yesterday)
      lastMonth.setDate(lastMonth.getDate() - 29) // 30 days total including yesterday
      setStatsDateFrom(lastMonth.toISOString().split('T')[0])
      setStatsDateTo(yesterday.toISOString().split('T')[0])
    }
  }, [statsAccountId])

  async function loadAgencyClients() {
    if (!statsAccountId) return

    setStatsLoadingClients(true)
    setStatsError(null)

    try {
      console.log('Loading clients for account:', statsAccountId)
      
      // Use new advertising-stats endpoint
      const response = await fetch(
        `${API_URL}/advertising-stats/clients?accountId=${statsAccountId}`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load agency clients')
      }

      const data = await response.json()
      console.log('Loaded clients:', data)
      
      setAgencyClients(data.clients || [])
      
      if (data.clients && data.clients.length > 0) {
        console.log('Auto-selecting first client:', data.clients[0])
        setSelectedClientId(data.clients[0].id)
      } else {
        console.warn('No clients loaded! Setting selectedClientId to empty')
        setSelectedClientId('')
      }
    } catch (err: any) {
      console.error('Failed to load agency clients:', err)
      setStatsError(err.message || 'Nie udało się załadować klientów agencji')
      setAgencyClients([])
      setSelectedClientId('')
    } finally {
      setStatsLoadingClients(false)
    }
  }

  // Load existing account mappings
  async function loadMappings() {
    try {
      const mappingsData: typeof mappings = []
      
      for (const account of accounts) {
        const response = await fetch(`${API_URL}/account-mapping/${account.id}`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.hasMapping && data.mapping) {
            const agencyAccount = accounts.find(a => a.id === data.mapping.agencyAccountId)
            
            // Get client name
            let clientName = data.mapping.agencyClientId
            try {
              const clientsResponse = await fetch(
                `${API_URL}/advertising-stats/clients?accountId=${data.mapping.agencyAccountId}`,
                { credentials: 'include' }
              )
              if (clientsResponse.ok) {
                const clientsData = await clientsResponse.json()
                const client = clientsData.clients?.find((c: any) => c.id === data.mapping.agencyClientId)
                if (client) clientName = client.name
              }
            } catch (e) {
              console.warn('Failed to fetch client name:', e)
            }
            
            mappingsData.push({
              salesAccountId: account.id,
              salesAccountName: `${account.name} (${account.email})`,
              agencyAccountId: data.mapping.agencyAccountId,
              agencyAccountName: agencyAccount ? `${agencyAccount.name} (${agencyAccount.email})` : data.mapping.agencyAccountId,
              agencyClientId: data.mapping.agencyClientId,
              agencyClientName: clientName
            })
          }
        }
      }
      
      setMappings(mappingsData)
    } catch (err) {
      console.error('Failed to load mappings:', err)
    }
  }

  // Load agency clients when agency account changes in mapping form
  useEffect(() => {
    if (newMapping.agencyAccountId) {
      loadMappingAgencyClients()
    } else {
      setMappingAgencyClients([])
      setNewMapping(prev => ({ ...prev, agencyClientId: '' }))
    }
  }, [newMapping.agencyAccountId])

  async function loadMappingAgencyClients() {
    if (!newMapping.agencyAccountId) return

    setMappingLoading(true)
    setMappingError(null)

    try {
      const response = await fetch(
        `${API_URL}/advertising-stats/clients?accountId=${newMapping.agencyAccountId}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Failed to load agency clients')
      }

      const data = await response.json()
      setMappingAgencyClients(data.clients || [])
      
      if (data.clients && data.clients.length > 0) {
        setNewMapping(prev => ({ ...prev, agencyClientId: data.clients[0].id }))
      }
    } catch (err: any) {
      console.error('Failed to load agency clients:', err)
      setMappingError(err.message || 'Nie udało się załadować klientów agencji')
      setMappingAgencyClients([])
    } finally {
      setMappingLoading(false)
    }
  }

  async function handleCreateMapping() {
    if (!newMapping.salesAccountId || !newMapping.agencyAccountId || !newMapping.agencyClientId) {
      setMappingError('Wypełnij wszystkie pola')
      return
    }

    setMappingLoading(true)
    setMappingError(null)

    try {
      const response = await fetch(`${API_URL}/account-mapping/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          salesAccountId: newMapping.salesAccountId,
          agencyAccountId: newMapping.agencyAccountId,
          agencyClientId: newMapping.agencyClientId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Nie udało się utworzyć mapowania')
      }

      // Reload mappings
      await loadMappings()
      
      // Reset form
      setNewMapping({
        salesAccountId: '',
        agencyAccountId: '',
        agencyClientId: ''
      })
      setMappingAgencyClients([])
      
      alert('✅ Mapowanie utworzone pomyślnie!')
    } catch (err: any) {
      console.error('Failed to create mapping:', err)
      setMappingError(err.message || 'Nie udało się utworzyć mapowania')
    } finally {
      setMappingLoading(false)
    }
  }

  async function handleDeleteMapping(salesAccountId: string) {
    if (!confirm('Czy na pewno chcesz usunąć to mapowanie?')) {
      return
    }

    setMappingLoading(true)
    setMappingError(null)

    try {
      const response = await fetch(`${API_URL}/account-mapping/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ salesAccountId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Nie udało się usunąć mapowania')
      }

      // Reload mappings
      await loadMappings()
      
      alert('✅ Mapowanie usunięte')
    } catch (err: any) {
      console.error('Failed to delete mapping:', err)
      setMappingError(err.message || 'Nie udało się usunąć mapowania')
    } finally {
      setMappingLoading(false)
    }
  }

  async function handleSyncAdvertisingStats() {
    if (!statsAccountId) {
      setStatsError('Wybierz konto')
      return
    }

    if (!selectedClientId) {
      setStatsError('Wybierz klienta')
      return
    }

    if (!statsDateFrom || !statsDateTo) {
      setStatsError('Wybierz zakres dat')
      return
    }

    // Validate date range
    const from = new Date(statsDateFrom)
    const to = new Date(statsDateTo)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999) // End of yesterday
    
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

    // Check if 'to' date is not in the future (must be yesterday or earlier)
    if (to > yesterday) {
      setStatsError('Data "do" nie może być późniejsza niż wczoraj. API Allegro nie zwraca dzisiejszych statystyk.')
      return
    }

    if (daysDiff > 390) {
      setStatsError('Maksymalny zakres to 13 miesięcy (390 dni)')
      return
    }

    if (daysDiff < 0) {
      setStatsError('Data "od" musi być wcześniejsza niż data "do"')
      return
    }

    if (statsTypes.length === 0) {
      setStatsError('Wybierz przynajmniej jeden typ kampanii')
      return
    }

    setStatsLoading(true)
    setStatsError(null)
    setStatsSyncResult(null)

    try {
      const response = await fetch(`${API_URL}/advertising-stats/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accountId: statsAccountId,
          clientId: selectedClientId,
          dateFrom: statsDateFrom,
          dateTo: statsDateTo,
          types: statsTypes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Synchronizacja nie powiodła się')
      }

      if (data.result) {
        setStatsSyncResult({
          accountId: statsAccountId,
          clientId: selectedClientId,
          status: data.result.status,
          statsCount: data.result.statsCount || 0,
          message: data.message || '',
          dateRange: data.result.dateRange,
          types: data.result.types,
          error: data.result.error,
        })
      }
    } catch (err: any) {
      console.error('Advertising stats sync error:', err)
      setStatsError(err.message || 'Nie udało się zsynchronizować statystyk')
    } finally {
      setStatsLoading(false)
    }
  }

  // Handle offers sync
  async function handleOffersSync() {
    if (!offersAccountId) {
      setOffersError('Wybierz konto')
      return
    }

    setOffersLoading(true)
    setOffersError(null)
    setOffersSyncResult(null)

    try {
      const response = await fetch(`${API_URL}/admin/sync-offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accountId: offersAccountId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Synchronizacja nie powiodła się')
      }

      if (data.result) {
        setOffersSyncResult({
          accountId: offersAccountId,
          status: data.result.status,
          offersCount: data.result.offersCount || 0,
          message: data.message || '',
          error: data.result.error,
        })
      }
    } catch (err: any) {
      console.error('Offers sync error:', err)
      setOffersError(err.message || 'Nie udało się zsynchronizować ofert')
    } finally {
      setOffersLoading(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <div className="administration-page">
      <div className="page-header">
        <h1>Administracja</h1>
        <p className="page-subtitle">Zarządzanie danymi i synchronizacja</p>
      </div>

      <div className="admin-sections">
        {/* Orders Sync Section */}
        <section className="admin-card">
          <div className="card-header">
            <h2>Synchronizacja zamówień</h2>
            <span className="card-badge">Orders</span>
          </div>

          <p className="card-description">
            Pobierz zamówienia z Allegro API dla wybranego konta i zakresu dat.
            Zamówienia zostaną zapisane w bazie danych i będą dostępne w Dashboardzie.
          </p>

          <div className="sync-form">
            <div className="form-group">
              <label htmlFor="account-select">Konto Allegro</label>
              <select
                id="account-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={loading}
                className="form-select"
              >
                {accounts.length === 0 ? (
                  <option value="">Brak dostępnych kont</option>
                ) : (
                  accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.email})
                    </option>
                  ))
                )}
              </select>
              {selectedAccount && (
                <small className="form-hint">
                  ID konta: {selectedAccount.id} | Status: {selectedAccount.status}
                </small>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date-from">Data od</label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  max={dateTo || undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="date-to">Data do</label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  min={dateFrom || undefined}
                />
              </div>
            </div>

            <div className="form-info">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5h2v2H7V5zm0 3h2v5H7V8z"/>
              </svg>
              <span>Maksymalny zakres: 30 dni. Synchronizacja dużych zakresów może zająć kilka minut.</span>
            </div>

            {error && (
              <div className="alert alert-error">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                </svg>
                {error}
              </div>
            )}

            {syncResult && (
              <div className={`alert ${syncResult.status === 'success' ? 'alert-success' : 'alert-error'}`}>
                <div className="alert-header">
                  {syncResult.status === 'success' ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11l-3-3 1.5-1.5L9 10l4.5-4.5L15 7l-6 6z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                    </svg>
                  )}
                  <strong>{syncResult.message}</strong>
                </div>
                <div className="alert-details">
                  <p>Pobrano zamówień: <strong>{syncResult.ordersCount}</strong></p>
                  {syncResult.dateRange && (
                    <p className="date-range">
                      Zakres: {new Date(syncResult.dateRange.from).toLocaleDateString('pl-PL')} - {new Date(syncResult.dateRange.to).toLocaleDateString('pl-PL')}
                    </p>
                  )}
                  {syncResult.error && (
                    <p className="error-details">Błąd: {syncResult.error}</p>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              onClick={handleSyncOrders}
              disabled={loading || !selectedAccountId || !dateFrom || !dateTo}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Synchronizacja w toku...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a6 6 0 00-6 6h2a4 4 0 118 0h-2l3 3 3-3h-2a6 6 0 00-6-6z"/>
                  </svg>
                  Uruchom synchronizację
                </>
              )}
            </button>
          </div>
        </section>

        {/* Advertising Statistics Sync Section */}
        <section className="admin-card">
          <div className="card-header">
            <h2>Synchronizacja statystyk reklamowych</h2>
            <span className="card-badge">Statistics</span>
          </div>

          <p className="card-description">
            Pobierz statystyki kampanii reklamowych (Sponsored Offers i Graphic Ads) dla wybranych klientów agencji.
            Dane zostaną zapisane w bazie i będą dostępne w Dashboardzie i raportach.
          </p>

          <div className="sync-form">
            <div className="form-group">
              <label htmlFor="stats-account-select">Konto agencji Allegro</label>
              <select
                id="stats-account-select"
                value={statsAccountId}
                onChange={(e) => setStatsAccountId(e.target.value)}
                disabled={statsLoading}
                className="form-select"
              >
                <option value="">Wybierz konto...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
            </div>

            {statsAccountId && (
              <>
                <div className="form-group">
                  <label htmlFor="client-select">Klient agencji</label>
                  <select
                    id="client-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={statsLoading || statsLoadingClients}
                    className="form-select"
                  >
                    {statsLoadingClients ? (
                      <option value="">Ładowanie klientów...</option>
                    ) : agencyClients.length === 0 ? (
                      <option value="">Brak klientów agencji</option>
                    ) : (
                      agencyClients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedClientId && (
                    <small className="form-hint">
                      ID klienta: {selectedClientId}
                    </small>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="stats-date-from">Data od</label>
                    <input
                      id="stats-date-from"
                      type="date"
                      value={statsDateFrom}
                      onChange={(e) => setStatsDateFrom(e.target.value)}
                      disabled={statsLoading}
                      className="form-input"
                      max={statsDateTo || undefined}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stats-date-to">Data do</label>
                    <input
                      id="stats-date-to"
                      type="date"
                      value={statsDateTo}
                      onChange={(e) => setStatsDateTo(e.target.value)}
                      disabled={statsLoading}
                      className="form-input"
                      min={statsDateFrom || undefined}
                    />
                  </div>
                </div>
                <small className="form-hint" style={{ display: 'block', marginTop: '-8px', marginBottom: '12px', color: '#666' }}>
                  ⚠️ Data "do" nie może być późniejsza niż wczoraj. API Allegro nie zwraca dzisiejszych statystyk.
                </small>

                <div className="form-group">
                  <label>Typy kampanii</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={statsTypes.includes('SPONSORED_OFFER')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStatsTypes([...statsTypes, 'SPONSORED_OFFER'])
                          } else {
                            setStatsTypes(statsTypes.filter(t => t !== 'SPONSORED_OFFER'))
                          }
                        }}
                        disabled={statsLoading}
                      />
                      <span>Sponsored Offers (oferty sponsorowane)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={statsTypes.includes('GRAPHIC_AD')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStatsTypes([...statsTypes, 'GRAPHIC_AD'])
                          } else {
                            setStatsTypes(statsTypes.filter(t => t !== 'GRAPHIC_AD'))
                          }
                        }}
                        disabled={statsLoading}
                      />
                      <span>Graphic Ads (reklamy graficzne)</span>
                    </label>
                  </div>
                </div>

                <div className="form-info">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5h2v2H7V5zm0 3h2v5H7V8z"/>
                  </svg>
                  <span>Maksymalny zakres: 13 miesięcy. Synchronizacja może zająć kilka minut w zależności od ilości danych.</span>
                </div>

                {statsError && (
                  <div className="alert alert-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                    </svg>
                    {statsError}
                  </div>
                )}

                {statsSyncResult && (
                  <div className={`alert ${statsSyncResult.status === 'success' ? 'alert-success' : 'alert-error'}`}>
                    <div className="alert-header">
                      {statsSyncResult.status === 'success' ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11l-3-3 1.5-1.5L9 10l4.5-4.5L15 7l-6 6z"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                        </svg>
                      )}
                      <strong>{statsSyncResult.message}</strong>
                    </div>
                    <div className="alert-details">
                      <p>Pobrano rekordów statystyk: <strong>{statsSyncResult.statsCount}</strong></p>
                      {statsSyncResult.dateRange && (
                        <p className="date-range">
                          Zakres: {new Date(statsSyncResult.dateRange.from).toLocaleDateString('pl-PL')} - {new Date(statsSyncResult.dateRange.to).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                      {statsSyncResult.types && statsSyncResult.types.length > 0 && (
                        <p>Typy: {statsSyncResult.types.join(', ')}</p>
                      )}
                      {statsSyncResult.error && (
                        <p className="error-details">Błąd: {statsSyncResult.error}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-large"
                  onClick={handleSyncAdvertisingStats}
                  disabled={statsLoading || !statsAccountId || !selectedClientId || !statsDateFrom || !statsDateTo || statsTypes.length === 0}
                >
                  {statsLoading ? (
                    <>
                      <span className="spinner"></span>
                      Synchronizacja w toku...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a6 6 0 00-6 6h2a4 4 0 118 0h-2l3 3 3-3h-2a6 6 0 00-6-6z"/>
                      </svg>
                      Uruchom synchronizację
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </section>

        {/* Offers Sync Section */}
        <section className="admin-card">
          <div className="card-header">
            <h2>Synchronizacja ofert</h2>
            <span className="card-badge">Offers</span>
          </div>

          <p className="card-description">
            Pobierz wszystkie oferty z Allegro API dla wybranego konta.
            Oferty zostaną zapisane w bazie danych z aktualną datą snapshot.
          </p>

          <div className="sync-form">
            <div className="form-group">
              <label htmlFor="offers-account-select">Konto Allegro</label>
              <select
                id="offers-account-select"
                value={offersAccountId}
                onChange={(e) => setOffersAccountId(e.target.value)}
                disabled={offersLoading}
                className="form-select"
              >
                {accounts.length === 0 ? (
                  <option value="">Brak dostępnych kont</option>
                ) : (
                  <>
                    <option value="">Wybierz konto</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.email})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="alert alert-info" style={{ marginTop: '16px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-8H9v6h2V5z"/>
              </svg>
              <div>
                <strong>Informacja:</strong> Synchronizacja pobiera wszystkie aktywne oferty z konta.
                Proces może potrwać kilka sekund w zależności od liczby ofert.
              </div>
            </div>

            {offersError && (
              <div className="alert alert-error">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                </svg>
                {offersError}
              </div>
            )}

            {offersSyncResult && (
              <div className={`alert ${offersSyncResult.status === 'success' ? 'alert-success' : 'alert-error'}`}>
                <div className="alert-header">
                  {offersSyncResult.status === 'success' ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11l-3-3 1.5-1.5L9 10l4.5-4.5L15 7l-6 6z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                    </svg>
                  )}
                  <strong>{offersSyncResult.message}</strong>
                </div>
                <div className="alert-details">
                  <p>Pobrano ofert: <strong>{offersSyncResult.offersCount}</strong></p>
                  {offersSyncResult.error && (
                    <p className="error-details">Błąd: {offersSyncResult.error}</p>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              onClick={handleOffersSync}
              disabled={offersLoading || !offersAccountId}
            >
              {offersLoading ? (
                <>
                  <span className="spinner"></span>
                  Synchronizacja w toku...
                </>
              ) : (
                'Synchronizuj oferty'
              )}
            </button>
          </div>
        </section>

        {/* Account Mapping Section */}
        <section className="admin-card">
          <div className="card-header">
            <h2>Mapowanie kont (Sales ↔ Ads)</h2>
            <span className="card-badge">Mapping</span>
          </div>

          <p className="card-description">
            Połącz konto sprzedażowe z kontem reklamowym klienta agencji, aby wyświetlić pełne dane w Dashboard.
            <br />
            <strong>Przykład:</strong> AS_Nespresso (sprzedaż) + AS_Nespresso (klient Omnihero Ads)
          </p>

          {/* Existing Mappings Table */}
          {mappings.length > 0 && (
            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>Aktualne mapowania:</h3>
              <table className="mappings-table">
                <thead>
                  <tr>
                    <th>Konto sprzedażowe</th>
                    <th>Konto agencji</th>
                    <th>Klient</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, index) => (
                    <tr key={index}>
                      <td>{mapping.salesAccountName}</td>
                      <td>{mapping.agencyAccountName}</td>
                      <td>{mapping.agencyClientName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDeleteMapping(mapping.salesAccountId)}
                          disabled={mappingLoading}
                          title="Usuń mapowanie"
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New Mapping Form */}
          <div className="mapping-form" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>Dodaj nowe mapowanie:</h3>
            
            {mappingError && (
              <div className="error-message">
                {mappingError}
              </div>
            )}

            <div className="form-group">
              <label>Konto sprzedażowe (Sales)</label>
              <select 
                className="form-select"
                value={newMapping.salesAccountId}
                onChange={(e) => setNewMapping(prev => ({ ...prev, salesAccountId: e.target.value }))}
                disabled={mappingLoading}
              >
                <option value="">Wybierz konto sprzedażowe...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
              <small className="form-hint">
                To konto z którego pobieramy zamówienia i sprzedaż Total
              </small>
            </div>

            <div className="form-group">
              <label>Konto agencji (Ads)</label>
              <select 
                className="form-select"
                value={newMapping.agencyAccountId}
                onChange={(e) => setNewMapping(prev => ({ ...prev, agencyAccountId: e.target.value }))}
                disabled={mappingLoading}
              >
                <option value="">Wybierz konto agencji...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
              <small className="form-hint">
                Konto agencji przez które zarządzamy reklamami klienta
              </small>
            </div>

            <div className="form-group">
              <label>Klient agencji</label>
              <select 
                className="form-select"
                value={newMapping.agencyClientId}
                onChange={(e) => setNewMapping(prev => ({ ...prev, agencyClientId: e.target.value }))}
                disabled={mappingLoading || !newMapping.agencyAccountId}
              >
                {mappingLoading ? (
                  <option value="">Ładowanie klientów...</option>
                ) : !newMapping.agencyAccountId ? (
                  <option value="">Najpierw wybierz konto agencji...</option>
                ) : mappingAgencyClients.length === 0 ? (
                  <option value="">Brak klientów agencji</option>
                ) : (
                  mappingAgencyClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))
                )}
              </select>
              <small className="form-hint">
                Klient którego statystyki Ads chcemy połączyć z kontem sprzedażowym
              </small>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-primary"
                onClick={handleCreateMapping}
                disabled={mappingLoading || !newMapping.salesAccountId || !newMapping.agencyAccountId || !newMapping.agencyClientId}
              >
                {mappingLoading ? (
                  <>
                    <span className="spinner"></span>
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h6v2H4v8h4v2H2V3zm12 10H8v-2h4V3h-4V1h6v12z"/>
                      <path d="M5 7h6v2H5z"/>
                    </svg>
                    Połącz konta
                  </>
                )}
              </button>
            </div>

            <div className="info-box">
              <strong>💡 Jak to działa:</strong>
              <ul>
                <li>Po połączeniu kont, Dashboard automatycznie wyświetli:</li>
                <li style={{ marginLeft: '20px' }}>• <strong>Sprzedaż Total</strong> z konta sprzedażowego</li>
                <li style={{ marginLeft: '20px' }}>• <strong>Sprzedaż Ads</strong> z konta reklamowego klienta</li>
                <li style={{ marginLeft: '20px' }}>• <strong>Koszty Ads</strong> z kampanii klienta</li>
                <li style={{ marginTop: '8px' }}>Dzięki temu zobaczysz kompletny obraz sprzedaży dla jednego klienta!</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

