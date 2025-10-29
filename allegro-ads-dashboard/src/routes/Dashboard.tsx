import { useState, useEffect, useRef } from 'react'
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
  { name: 'Rolki Wrotki Łyżwy 4w1 Regulowane RAVEN Spirit Black/White 37-40', sales: 8234.50, orders: 34, offerId: '123456789' },
  { name: 'Rower biegowy RAVEN BIKE 12" Pink', sales: 7456.20, orders: 28, offerId: '123456790' },
  { name: 'Hulajnoga RAVEN Straight Blue', sales: 6789.00, orders: 42, offerId: '123456791' },
  { name: 'Skateboard RAVEN Energy Pro', sales: 5678.30, orders: 26, offerId: '123456792' },
  { name: 'Łyżworolki RAVEN Profession Black', sales: 4567.80, orders: 19, offerId: '123456793' },
  { name: 'Deskorolka RAVEN Flip 31"', sales: 4234.50, orders: 22, offerId: '123456794' },
  { name: 'Rower BMX RAVEN Street Pro', sales: 3890.20, orders: 15, offerId: '123456795' },
  { name: 'Hulajnoga RAVEN Jump XL', sales: 3456.70, orders: 18, offerId: '123456796' },
  { name: 'Rolki inline RAVEN Carbon Speed', sales: 3123.40, orders: 12, offerId: '123456797' },
  { name: 'Longboard RAVEN Cruise 42"', sales: 2890.60, orders: 14, offerId: '123456798' }
]

const mockTopProductsAds = [
  { name: 'Rolki Wrotki Łyżwy 4w1 Regulowane RAVEN Spirit Black/White 37-40', sales: 6234.50, orders: 28, offerId: '123456789' },
  { name: 'Rower biegowy RAVEN BIKE 12" Pink', sales: 5456.20, orders: 22, offerId: '123456790' },
  { name: 'Łyżworolki RAVEN Profession Black', sales: 3567.80, orders: 15, offerId: '123456793' },
  { name: 'Hulajnoga RAVEN Straight Blue', sales: 3289.00, orders: 20, offerId: '123456791' },
  { name: 'Skateboard RAVEN Energy Pro', sales: 2878.30, orders: 14, offerId: '123456792' },
  { name: 'Deskorolka RAVEN Flip 31"', sales: 2634.50, orders: 16, offerId: '123456794' },
  { name: 'Rower BMX RAVEN Street Pro', sales: 2390.20, orders: 11, offerId: '123456795' },
  { name: 'Rolki inline RAVEN Carbon Speed', sales: 2123.40, orders: 9, offerId: '123456797' },
  { name: 'Hulajnoga RAVEN Jump XL', sales: 1956.70, orders: 12, offerId: '123456796' },
  { name: 'Longboard RAVEN Cruise 42"', sales: 1790.60, orders: 10, offerId: '123456798' }
]

export function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateRange, setDateRange] = useState<'twoDaysAgo' | 'currentMonth' | '7d' | '30d' | '90d' | 'custom'>('currentMonth')
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
  
  // Set default custom dates (current month)
  useEffect(() => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    setCustomDateTo(today.toISOString().split('T')[0])
    setCustomDateFrom(firstDayOfMonth.toISOString().split('T')[0])
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
          // Use local date at midnight (start of day)
          dateFrom = customDateFrom ? `${customDateFrom}T00:00:00.000Z` : undefined
          // Use local date at end of day
          dateTo = customDateTo ? `${customDateTo}T23:59:59.999Z` : undefined
        } else if (dateRange === 'twoDaysAgo') {
          // Two days ago (przedwczoraj)
          const today = new Date()
          const twoDaysAgo = new Date(today)
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
          
          const year = twoDaysAgo.getFullYear()
          const month = String(twoDaysAgo.getMonth() + 1).padStart(2, '0')
          const day = String(twoDaysAgo.getDate()).padStart(2, '0')
          
          dateFrom = `${year}-${month}-${day}T00:00:00.000Z`
          dateTo = `${year}-${month}-${day}T23:59:59.999Z`
        } else if (dateRange === 'currentMonth') {
          const today = new Date()
          const year = today.getFullYear()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          
          // First day of current month at 00:00:00
          dateFrom = `${year}-${month}-01T00:00:00.000Z`
          // Today at end of day
          dateTo = `${year}-${month}-${day}T23:59:59.999Z`
        } else {
          const today = new Date()
          const year = today.getFullYear()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          dateTo = `${year}-${month}-${day}T23:59:59.999Z`
          
          const daysAgo = new Date(today)
          const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
          daysAgo.setDate(daysAgo.getDate() - days)
          
          const yearFrom = daysAgo.getFullYear()
          const monthFrom = String(daysAgo.getMonth() + 1).padStart(2, '0')
          const dayFrom = String(daysAgo.getDate()).padStart(2, '0')
          dateFrom = `${yearFrom}-${monthFrom}-${dayFrom}T00:00:00.000Z`
        }
        
        console.log(`Loading stats: ${dateFrom} to ${dateTo}`)
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
  
  // Use real Ads stats from API
  const salesAds = stats?.salesAds || 0
  const ordersAds = stats?.ordersAds || 0
  const costsAds = stats?.costsAds || 0
  
  // Use real top products from Ads or fallback to mock
  const topProductsAds = stats?.topProductsAds && stats.topProductsAds.length > 0 
    ? stats.topProductsAds 
    : mockTopProductsAds
  
  // Calculate percentages
  const adsPercentage = salesTotal > 0 ? ((salesAds / salesTotal) * 100).toFixed(1) : '0.0'
  const ordersAdsPercentage = ordersTotal > 0 ? ((ordersAds / ordersTotal) * 100).toFixed(1) : '0.0'
  const roasAds = costsAds > 0 ? ((salesAds / costsAds) * 100).toFixed(2) : '0.00'
  
  const handleDateRangeChange = (range: 'twoDaysAgo' | 'currentMonth' | '7d' | '30d' | '90d' | 'custom') => {
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
                  {account.name} ({account.email})
                </option>
              ))}
            </select>
          </div>
          
          <div className="date-controls">
            <div className="date-range-selector">
              <button 
                className={dateRange === 'twoDaysAgo' ? 'active' : ''}
                onClick={() => handleDateRangeChange('twoDaysAgo')}
              >
                Przedwczoraj
              </button>
              <button 
                className={dateRange === 'currentMonth' ? 'active' : ''}
                onClick={() => handleDateRangeChange('currentMonth')}
              >
                Bieżący miesiąc
              </button>
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
            <div className="stat-value">{salesAds.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
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
            <div className="stat-value">{ordersAds.toLocaleString('pl-PL')}</div>
            <div className="stat-meta">{ordersAdsPercentage}% z total</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-label">Koszty Ads</div>
            <div className="stat-value">{costsAds.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
            <div className="stat-meta">ROAS: {roasAds}%</div>
          </div>
        </div>
      )}
      
      {/* Sales Chart */}
      <div className="chart-section">
        <h2>Sprzedaż w czasie</h2>
        <div className="chart-container">
          <SalesChart data={stats?.dailyData && stats.dailyData.length > 0 ? stats.dailyData : mockDailyData} />
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
                <th>Numer oferty</th>
                <th>Sprzedaż</th>
                <th>Zamówienia</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    Brak danych o produktach
                  </td>
                </tr>
              )}
              {topProducts.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="product-name">{product.name}</td>
                  <td className="product-offer-id">{product.offerId || '-'}</td>
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
                <th>Numer oferty</th>
                <th>Sprzedaż</th>
                <th>Zamówienia</th>
              </tr>
            </thead>
            <tbody>
              {topProductsAds.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    Brak danych o produktach Ads
                  </td>
                </tr>
              )}
              {topProductsAds.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="product-name">{product.name}</td>
                  <td className="product-offer-id">{product.offerId || '-'}</td>
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

// Enhanced Line Chart Component with smooth curves
function SalesChart({ data }: { data: typeof mockDailyData }) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [svgWidth, setSvgWidth] = useState(1000)
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth
        if (width > 0) {
          setSvgWidth(width)
        }
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  if (data.length === 0) return <div>Brak danych</div>
  
  const maxSales = Math.max(...data.map(d => Math.max(d.salesTotal, d.salesAds)), 1)
  const chartHeight = 300
  const chartPadding = 40
  const leftMargin = 80 // Pixels for Y-axis
  const rightMargin = 2 // Minimal right margin for better chart stretch
  const chartWidth = svgWidth // Use actual SVG width
  
  // Helper function to create smooth curve using Catmull-Rom spline
  const createSmoothPath = (points: Array<{x: number, y: number}>) => {
    if (points.length < 2) return ''
    if (points.length === 2) {
      return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
    }
    
    let path = `M ${points[0].x},${points[0].y}`
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      
      // Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }
    
    return path
  }
  
  // Calculate points for lines based on actual dates (not just index)
  const usableWidth = chartWidth - leftMargin - rightMargin
  
  // Get date range
  const firstDate = new Date(data[0].date).getTime()
  const lastDate = new Date(data[data.length - 1].date).getTime()
  const dateRange = lastDate - firstDate
  
  const pointsDataTotal = data.map((d) => {
    // Calculate X position based on actual date, not index
    const currentDate = new Date(d.date).getTime()
    const dateProgress = dateRange > 0 ? (currentDate - firstDate) / dateRange : 0
    
    return {
      x: leftMargin + dateProgress * usableWidth,
      y: chartHeight - ((d.salesTotal / maxSales) * (chartHeight - chartPadding))
    }
  })
  
  const pointsDataAds = data.map((d) => {
    // Calculate X position based on actual date, not index
    const currentDate = new Date(d.date).getTime()
    const dateProgress = dateRange > 0 ? (currentDate - firstDate) / dateRange : 0
    
    return {
      x: leftMargin + dateProgress * usableWidth,
      y: chartHeight - ((d.salesAds / maxSales) * (chartHeight - chartPadding))
    }
  })
  
  const pathTotal = createSmoothPath(pointsDataTotal)
  const pathAds = createSmoothPath(pointsDataAds)
  
  // Calculate Y-axis labels
  const yAxisSteps = 5
  const yAxisLabels = Array.from({ length: yAxisSteps }, (_, i) => {
    const value = (maxSales / (yAxisSteps - 1)) * i
    return {
      value: Math.round(value),
      y: chartHeight - ((value / maxSales) * (chartHeight - chartPadding))
    }
  })
  
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
      
      <div style={{ position: 'relative', width: '100%', height: '300px' }}>
        <svg ref={svgRef} className="chart-svg" style={{ width: '100%', height: '100%' }}>
          {/* Y-axis labels as SVG text */}
          {yAxisLabels.map((label, i) => (
            <text
              key={`y-label-${i}`}
              x={leftMargin - 10}
              y={label.y}
              textAnchor="end"
              dominantBaseline="middle"
              style={{ 
                fontSize: '11px', 
                fill: 'var(--text-tertiary)',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              {label.value.toLocaleString('pl-PL')} zł
            </text>
          ))}
          
          {/* Grid lines */}
          {yAxisLabels.map((label, i) => (
            <line
              key={`grid-${i}`}
              x1={leftMargin}
              y1={label.y}
              x2={chartWidth - rightMargin}
              y2={label.y}
              style={{ stroke: 'var(--border-color)' }}
              strokeWidth="0.5"
            />
          ))}
          
          {/* Smooth Lines */}
          <path
            d={pathTotal}
            fill="none"
            stroke="#2196F3"
            strokeWidth="2.5"
            style={{ transition: 'all 0.3s ease' }}
          />
          <path
            d={pathAds}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2.5"
            style={{ transition: 'all 0.3s ease' }}
          />
          
          {/* Interactive Points */}
          {data.map((_d, i) => {
            const pointTotal = pointsDataTotal[i]
            const pointAds = pointsDataAds[i]
            const isHovered = hoveredPoint === i
            
            return (
              <g key={i}>
                {/* Invisible larger hitbox for easier hovering */}
                <circle
                  cx={pointTotal.x}
                  cy={pointTotal.y}
                  r="10"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <circle
                  cx={pointTotal.x}
                  cy={pointTotal.y}
                  r={isHovered ? "5" : "3"}
                  fill="#2196F3"
                  style={{ transition: 'r 0.2s', pointerEvents: 'none' }}
                />
                <circle
                  cx={pointAds.x}
                  cy={pointAds.y}
                  r={isHovered ? "5" : "3"}
                  fill="#4CAF50"
                  style={{ transition: 'r 0.2s', pointerEvents: 'none' }}
                />
              </g>
            )
          })}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${(pointsDataTotal[hoveredPoint].x / chartWidth) * 100}%`,
              top: `${Math.min(pointsDataTotal[hoveredPoint].y, pointsDataAds[hoveredPoint].y) / chartHeight * 100 - 15}%`,
              transform: 'translate(-50%, -100%)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              {new Date(data[hoveredPoint].date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long' })}
            </div>
            <div style={{ color: '#2196F3', fontSize: '12px' }}>
              Total: {data[hoveredPoint].salesTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
            </div>
            <div style={{ color: '#4CAF50', fontSize: '12px' }}>
              Ads: {data[hoveredPoint].salesAds.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
            </div>
          </div>
        )}
      </div>
      
      {/* X-axis labels */}
      <div className="chart-labels">
        {data.map((d, i) => {
          // Show first, last, and every nth label to avoid crowding
          const step = Math.ceil(data.length / 8) // Show ~8 labels max
          const showLabel = i === 0 || i === data.length - 1 || i % step === 0
          // Position label at same X coordinate as data point
          const labelPosition = ((pointsDataTotal[i].x / chartWidth) * 100).toFixed(2)
          return (
            <div 
              key={i} 
              className="chart-label" 
              style={{ 
                opacity: showLabel ? 1 : 0,
                position: 'absolute',
                left: `${labelPosition}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {new Date(d.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
