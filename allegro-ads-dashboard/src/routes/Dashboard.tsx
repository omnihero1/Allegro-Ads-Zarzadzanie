import { useState, useEffect } from 'react'
import { getAccounts } from '../services/allegroAuth'
import { getDashboardStats, type DashboardStats } from '../services/dashboard'
import './Dashboard.css'

interface Account {
  id: string
  name: string
  email: string
  status: string
}

// Mock data - później zastąpimy API
const mockStats = {
  salesTotal: 145678.50,
  salesAds: 87234.20,
  costsTotal: 23456.80,
  ordersTotal: 1245,
  ordersAds: 678,
  costsAds: 18900.00
}

const mockDailyData = [
  { date: '2025-10-18', salesTotal: 12345, salesAds: 7234 },
  { date: '2025-10-19', salesTotal: 15678, salesAds: 8456 },
  { date: '2025-10-20', salesTotal: 14234, salesAds: 7891 },
  { date: '2025-10-21', salesTotal: 16789, salesAds: 9123 },
  { date: '2025-10-22', salesTotal: 18234, salesAds: 10234 },
  { date: '2025-10-23', salesTotal: 19456, salesAds: 11456 },
  { date: '2025-10-24', salesTotal: 20234, salesAds: 12890 }
]

const mockTopProductsTotal = [
  { name: 'Rolki Wrotki Łyżwy 4w1 Regulowane RAVEN Spirit Black/White 37-40', sales: 8234.50, orders: 34 },
  { name: 'Rower biegowy RAVEN BIKE 12" Pink', sales: 7456.20, orders: 28 },
  { name: 'Hulajnoga RAVEN Straight Blue', sales: 6789.00, orders: 42 },
  { name: 'Skateboard RAVEN Energy Pro', sales: 5678.30, orders: 26 },
  { name: 'Łyżworolki RAVEN Profession Black', sales: 4567.80, orders: 19 },
  { name: 'Deskorolka RAVEN Flip 31"', sales: 4234.50, orders: 22 },
  { name: 'Rower BMX RAVEN Street Pro', sales: 3890.20, orders: 15 },
  { name: 'Hulajnoga RAVEN Jump XL', sales: 3456.70, orders: 18 },
  { name: 'Rolki inline RAVEN Carbon Speed', sales: 3123.40, orders: 12 },
  { name: 'Longboard RAVEN Cruise 42"', sales: 2890.60, orders: 14 }
]

const mockTopProductsAds = [
  { name: 'Rolki Wrotki Łyżwy 4w1 Regulowane RAVEN Spirit Black/White 37-40', sales: 6234.50, orders: 28 },
  { name: 'Rower biegowy RAVEN BIKE 12" Pink', sales: 5456.20, orders: 22 },
  { name: 'Łyżworolki RAVEN Profession Black', sales: 3567.80, orders: 15 },
  { name: 'Hulajnoga RAVEN Straight Blue', sales: 3289.00, orders: 20 },
  { name: 'Skateboard RAVEN Energy Pro', sales: 2878.30, orders: 14 },
  { name: 'Deskorolka RAVEN Flip 31"', sales: 2634.50, orders: 16 },
  { name: 'Rower BMX RAVEN Street Pro', sales: 2390.20, orders: 11 },
  { name: 'Rolki inline RAVEN Carbon Speed', sales: 2123.40, orders: 9 },
  { name: 'Hulajnoga RAVEN Jump XL', sales: 1956.70, orders: 12 },
  { name: 'Longboard RAVEN Cruise 42"', sales: 1790.60, orders: 10 }
]

export function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('7d')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  
  // Load accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getAccounts()
        const accountsList = data.accounts || []
        setAccounts(accountsList)
        if (accountsList.length > 0) {
          setSelectedAccount(accountsList[0].id)
        }
      } catch (err) {
        console.error('Failed to load accounts:', err)
      }
    }
    loadAccounts()
  }, [])
  
  // Set default custom dates (last 7 days)
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    setCustomDateTo(today.toISOString().split('T')[0])
    setCustomDateFrom(weekAgo.toISOString().split('T')[0])
  }, [])
  
  // Load stats when account or date range changes
  useEffect(() => {
    if (!selectedAccount) return
    
    async function loadStats() {
      setLoading(true)
      try {
        let dateFrom: string | undefined
        let dateTo: string | undefined
        
        if (dateRange === 'custom') {
          dateFrom = customDateFrom ? new Date(customDateFrom).toISOString() : undefined
          dateTo = customDateTo ? new Date(customDateTo).toISOString() : undefined
        } else {
          const today = new Date()
          dateTo = today.toISOString()
          const daysAgo = new Date(today)
          const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
          daysAgo.setDate(daysAgo.getDate() - days)
          dateFrom = daysAgo.toISOString()
        }
        
        const data = await getDashboardStats(selectedAccount, dateFrom, dateTo)
        setStats(data)
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadStats()
  }, [selectedAccount, dateRange, customDateFrom, customDateTo])
  
  // Use real stats or fallback to mock data
  const salesTotal = stats?.salesTotal || mockStats.salesTotal
  const ordersTotal = stats?.ordersTotal || mockStats.ordersTotal
  const topProducts = stats?.topProducts || mockTopProductsTotal
  
  // Calculate percentages (using mock data for Ads until we implement Ads endpoint)
  const adsPercentage = ((mockStats.salesAds / salesTotal) * 100).toFixed(1)
  const ordersAdsPercentage = ((mockStats.ordersAds / ordersTotal) * 100).toFixed(1)
  const roasAds = ((mockStats.salesAds / mockStats.costsAds) * 100).toFixed(2)
  
  const handleDateRangeChange = (range: '7d' | '30d' | '90d' | 'custom') => {
    setDateRange(range)
    setShowCustomDates(range === 'custom')
  }
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-controls">
          <div className="account-selector">
            <label htmlFor="account-select">Konto:</label>
            <select 
              id="account-select"
              value={selectedAccount} 
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="account-select"
              disabled={accounts.length === 0}
            >
              {accounts.length === 0 && (
                <option value="">Ładowanie kont...</option>
              )}
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name || account.email}
                </option>
              ))}
            </select>
          </div>
          
          <div className="date-controls">
            <div className="date-range-selector">
              <button 
                className={dateRange === '7d' ? 'active' : ''}
                onClick={() => handleDateRangeChange('7d')}
              >
                Ostatnie 7 dni
              </button>
              <button 
                className={dateRange === '30d' ? 'active' : ''}
                onClick={() => handleDateRangeChange('30d')}
              >
                Ostatnie 30 dni
              </button>
              <button 
                className={dateRange === '90d' ? 'active' : ''}
                onClick={() => handleDateRangeChange('90d')}
              >
                Ostatnie 90 dni
              </button>
              <button 
                className={dateRange === 'custom' ? 'active' : ''}
                onClick={() => handleDateRangeChange('custom')}
              >
                Własny zakres
              </button>
            </div>
            
            {showCustomDates && (
              <div className="custom-date-inputs">
                <div className="date-input-group">
                  <label htmlFor="date-from">Od:</label>
                  <input 
                    type="date" 
                    id="date-from"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label htmlFor="date-to">Do:</label>
                  <input 
                    type="date" 
                    id="date-to"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="date-input"
                  />
                </div>
                <button className="apply-dates-btn">Zastosuj</button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Cards - Row 1 */}
      {loading && (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          Ładowanie danych...
        </div>
      )}
      
      {!loading && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Sprzedaż Total</div>
            <div className="stat-value">{salesTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
            <div className="stat-meta">Wszystkie zamówienia</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-label">Sprzedaż Ads</div>
            <div className="stat-value">{mockStats.salesAds.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
            <div className="stat-meta">{adsPercentage}% z total</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Koszty Total</div>
            <div className="stat-value">{mockStats.costsTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
            <div className="stat-meta">Wszystkie wydatki</div>
          </div>
          
          {/* Stats Cards - Row 2 */}
          <div className="stat-card">
            <div className="stat-label">Ilość zamówień Total</div>
            <div className="stat-value">{ordersTotal.toLocaleString('pl-PL')}</div>
            <div className="stat-meta">Wszystkie zamówienia</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-label">Ilość zamówień Ads</div>
            <div className="stat-value">{mockStats.ordersAds.toLocaleString('pl-PL')}</div>
            <div className="stat-meta">{ordersAdsPercentage}% z total</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-label">Koszty Ads</div>
            <div className="stat-value">{mockStats.costsAds.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
            <div className="stat-meta">ROAS: {roasAds}%</div>
          </div>
        </div>
      )}
      
      {/* Sales Chart */}
      <div className="chart-section">
        <h2>Sprzedaż w czasie</h2>
        <div className="chart-container">
          <SalesChart data={mockDailyData} />
        </div>
      </div>
      
      {/* Top Products Tables */}
      <div className="tables-row">
        <div className="table-container">
          <h2>Top 10 produktów (Total)</h2>
          <table className="products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nazwa produktu</th>
                <th>Sprzedaż</th>
                <th>Zamówienia</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    Brak danych o produktach
                  </td>
                </tr>
              )}
              {topProducts.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="product-name">{product.name}</td>
                  <td>{product.sales.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</td>
                  <td>{product.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="table-container">
          <h2>Top 10 produktów (Ads)</h2>
          <table className="products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nazwa produktu</th>
                <th>Sprzedaż</th>
                <th>Zamówienia</th>
              </tr>
            </thead>
            <tbody>
              {mockTopProductsAds.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="product-name">{product.name}</td>
                  <td>{product.sales.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</td>
                  <td>{product.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Simple Line Chart Component
function SalesChart({ data }: { data: typeof mockDailyData }) {
  const maxSales = Math.max(...data.map(d => d.salesTotal))
  const chartHeight = 300
  const chartPadding = 40
  
  // Calculate points for lines
  const pointsTotal = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = chartHeight - ((d.salesTotal / maxSales) * (chartHeight - chartPadding))
    return `${x},${y}`
  }).join(' ')
  
  const pointsAds = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = chartHeight - ((d.salesAds / maxSales) * (chartHeight - chartPadding))
    return `${x},${y}`
  }).join(' ')
  
  return (
    <div className="line-chart">
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color total"></span>
          <span>Sprzedaż Total</span>
        </div>
        <div className="legend-item">
          <span className="legend-color ads"></span>
          <span>Sprzedaż Ads</span>
        </div>
      </div>
      
      <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="chart-svg">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1="0"
            y1={chartHeight - (ratio * (chartHeight - chartPadding))}
            x2="100"
            y2={chartHeight - (ratio * (chartHeight - chartPadding))}
            stroke="#e0e0e0"
            strokeWidth="0.2"
          />
        ))}
        
        {/* Lines */}
        <polyline
          points={pointsTotal}
          fill="none"
          stroke="#2196F3"
          strokeWidth="0.8"
        />
        <polyline
          points={pointsAds}
          fill="none"
          stroke="#4CAF50"
          strokeWidth="0.8"
        />
        
        {/* Points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100
          const yTotal = chartHeight - ((d.salesTotal / maxSales) * (chartHeight - chartPadding))
          const yAds = chartHeight - ((d.salesAds / maxSales) * (chartHeight - chartPadding))
          
          return (
            <g key={i}>
              <circle cx={x} cy={yTotal} r="1" fill="#2196F3" />
              <circle cx={x} cy={yAds} r="1" fill="#4CAF50" />
            </g>
          )
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="chart-labels">
        {data.map((d, i) => (
          <div key={i} className="chart-label">
            {new Date(d.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
          </div>
        ))}
      </div>
    </div>
  )
}
