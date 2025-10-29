import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import './Offers.css'

interface Offer {
  id: string
  offerId: string
  accountId: string
  name: string
  primaryImage?: {
    url: string
  }
  external?: {
    id: string
  }
  category: {
    id: string
  }
  sellingMode: {
    price: {
      amount: string
      currency: string
    }
  }
  stock: {
    available: number
    sold?: number
  }
  stats?: {
    watchersCount?: number
    visitsCount?: number
  }
  publication: {
    status: string
  }
  snapshotDate: string
}

interface AllegroAccount {
  id: string
  name: string
  email: string
  status: string
}

type SortField = 'price' | 'available' | 'sold' | 'watchers' | 'visits' | null
type SortOrder = 'asc' | 'desc'

export function Offers() {
  const [accounts, setAccounts] = useState<AllegroAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // Load offers when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadOffers(selectedAccount)
    }
  }, [selectedAccount])

  async function loadAccounts() {
    try {
      const accountsSnapshot = await getDocs(
        query(
          collection(db, 'allegroAccounts'),
          where('status', '==', 'active')
        )
      )

      const accountsList = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AllegroAccount[]

      setAccounts(accountsList)

      // Auto-select first account
      if (accountsList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsList[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      setError('Nie udało się załadować kont')
    }
  }

  async function loadOffers(accountId: string) {
    setLoading(true)
    setError(null)

    try {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]

      console.log(`Loading offers for account ${accountId} from ${dateFrom}`)

      // Query offers from last 30 days
      const offersQuery = query(
        collection(db, 'offers'),
        where('accountId', '==', accountId),
        where('snapshotDate', '>=', dateFrom),
        orderBy('snapshotDate', 'desc'),
        limit(1000)
      )

      const offersSnapshot = await getDocs(offersQuery)

      // Group by offerId and take the latest snapshot
      const offersMap = new Map<string, Offer>()

      offersSnapshot.docs.forEach(doc => {
        const offerData = { id: doc.id, ...doc.data() } as Offer

        const existingOffer = offersMap.get(offerData.offerId)

        if (!existingOffer || offerData.snapshotDate > existingOffer.snapshotDate) {
          offersMap.set(offerData.offerId, offerData)
        }
      })

      const offersList = Array.from(offersMap.values())

      console.log(`Loaded ${offersList.length} unique offers`)

      setOffers(offersList)
    } catch (err: any) {
      console.error('Failed to load offers:', err)
      setError('Nie udało się załadować ofert')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'status-badge active'
      case 'INACTIVE':
        return 'status-badge inactive'
      case 'ENDED':
        return 'status-badge ended'
      default:
        return 'status-badge'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Aktywna'
      case 'INACTIVE':
        return 'Nieaktywna'
      case 'ENDED':
        return 'Zakończona'
      default:
        return status
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending
      setSortField(field)
      setSortOrder('desc')
    }
  }

  function getSortedOffers(): Offer[] {
    if (!sortField) return offers

    return [...offers].sort((a, b) => {
      let aValue = 0
      let bValue = 0

      switch (sortField) {
        case 'price':
          aValue = parseFloat(a.sellingMode.price.amount)
          bValue = parseFloat(b.sellingMode.price.amount)
          break
        case 'available':
          aValue = a.stock.available
          bValue = b.stock.available
          break
        case 'sold':
          aValue = a.stock.sold || 0
          bValue = b.stock.sold || 0
          break
        case 'watchers':
          aValue = a.stats?.watchersCount || 0
          bValue = b.stats?.watchersCount || 0
          break
        case 'visits':
          aValue = a.stats?.visitsCount || 0
          bValue = b.stats?.visitsCount || 0
          break
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  const sortedOffers = getSortedOffers()

  return (
    <div className="offers-page">
      <div className="page-header">
        <h1>Oferty Allegro</h1>
        <p className="page-description">
          Przeglądaj oferty z ostatnich 30 dni
        </p>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Konto Allegro</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            disabled={accounts.length === 0}
          >
            {accounts.length === 0 && (
              <option value="">Brak aktywnych kont</option>
            )}
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Ładowanie ofert...</p>
        </div>
      )}

      {!loading && !error && offers.length === 0 && selectedAccount && (
        <div className="no-data">
          <p>Brak ofert z ostatnich 30 dni dla wybranego konta.</p>
        </div>
      )}

      {!loading && !error && offers.length > 0 && (
        <div className="offers-table-container">
          <div className="table-info">
            <span className="offers-count">
              Znaleziono: <strong>{offers.length}</strong> ofert
            </span>
            <span className="date-range">
              (ostatnie 30 dni)
            </span>
          </div>

          <div className="table-wrapper">
            <table className="offers-table">
              <thead>
                <tr>
                  <th>Miniatura</th>
                  <th>Nazwa</th>
                  <th>ID Oferty</th>
                  <th>ID Zewn.</th>
                  <th>Kategoria ID</th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('price')}
                  >
                    Cena {sortField === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('available')}
                  >
                    Dostępne {sortField === 'available' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('sold')}
                  >
                    Sprzedane {sortField === 'sold' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('watchers')}
                  >
                    Lubią {sortField === 'watchers' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('visits')}
                  >
                    Wizyty {sortField === 'visits' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Publikacja</th>
                </tr>
              </thead>
              <tbody>
                {sortedOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="thumbnail-cell">
                      {offer.primaryImage?.url ? (
                        <img
                          src={offer.primaryImage.url}
                          alt={offer.name}
                          className="offer-thumbnail"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="no-image">
                          <span>🖼️</span>
                        </div>
                      )}
                    </td>
                    <td className="offer-name">
                      <span title={offer.name}>{offer.name}</span>
                    </td>
                    <td className="offer-id">{offer.offerId}</td>
                    <td className="external-id">
                      {offer.external?.id || '-'}
                    </td>
                    <td className="category-id">{offer.category.id}</td>
                    <td className="price">
                      {parseFloat(offer.sellingMode.price.amount).toLocaleString('pl-PL', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} {offer.sellingMode.price.currency}
                    </td>
                    <td className="stock-available">
                      {offer.stock.available}
                    </td>
                    <td className="stock-sold">
                      {offer.stock.sold || 0}
                    </td>
                    <td className="watchers">
                      {offer.stats?.watchersCount || 0}
                    </td>
                    <td className="visits">
                      {offer.stats?.visitsCount || 0}
                    </td>
                    <td className="status-cell">
                      <span className={getStatusBadgeClass(offer.publication.status)}>
                        {getStatusLabel(offer.publication.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

