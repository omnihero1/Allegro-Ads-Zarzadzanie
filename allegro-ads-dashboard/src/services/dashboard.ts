import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

export interface DashboardStats {
  salesTotal: number
  ordersTotal: number
  topProducts: Array<{
    name: string
    sku?: string
    sales: number
    orders: number
    offerId: string
  }>
  dateFrom: string
  dateTo: string
  ordersProcessed: number
  // Ads statistics
  salesAds?: number
  ordersAds?: number
  costsAds?: number
  // Daily data for chart
  dailyData?: Array<{
    date: string
    salesTotal: number
    salesAds: number
  }>
  // Top products from Ads
  topProductsAds?: Array<{
    offerId: string
    name: string
    sales: number
    orders: number
  }>
}

// Get dashboard statistics (total sales and orders)
export async function getDashboardStats(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<DashboardStats> {
  console.log('Getting dashboard stats:', { accountId, dateFrom, dateTo })
  
  // Convert ISO strings to YYYY-MM-DD format if provided
  const from = dateFrom ? dateFrom.split('T')[0] : undefined
  const to = dateTo ? dateTo.split('T')[0] : undefined
  
  // Fetch orders stats
  const ordersResponse = await api.get('/orders/dashboard-stats', {
    params: {
      accountId,
      dateFrom: from,
      dateTo: to
    }
  })
  
  console.log('Dashboard stats response:', ordersResponse.data)
  
  // Fetch account mapping to get agency client ID
  let agencyClientMapping = null
  try {
    const mappingResponse = await api.get(`/account-mapping/${accountId}`)
    agencyClientMapping = mappingResponse.data?.mapping
    console.log('Account mapping:', agencyClientMapping)
  } catch (error) {
    console.warn('No account mapping found for', accountId)
  }

  // Fetch advertising stats
  let adsStats = {
    salesAds: 0,
    ordersAds: 0,
    costsAds: 0
  }
  
  let adsDailyStats: any[] = []
  
  try {
    // If we have agency mapping, use it to fetch client-specific stats
    if (agencyClientMapping?.agencyAccountId && agencyClientMapping?.agencyClientId) {
      console.log('Fetching Ads stats for agency client:', agencyClientMapping.agencyClientId)
      
      const adsResponse = await api.get('/advertising-stats/client-stats', {
        params: {
          accountId: agencyClientMapping.agencyAccountId,
          clientId: agencyClientMapping.agencyClientId,
          dateFrom: from,
          dateTo: to
        }
      })
      
      console.log('Advertising stats response (client-specific):', adsResponse.data)
      
      if (adsResponse.data?.summary) {
        adsStats = {
          salesAds: adsResponse.data.summary.totalAttributionValue || 0,
          ordersAds: adsResponse.data.summary.totalAttributionCount || 0,
          costsAds: adsResponse.data.summary.totalCost || 0
        }
      }
      
      // Get daily stats for chart
      adsDailyStats = adsResponse.data?.dailyStats || []
    } else {
      // Fallback: try to fetch all stats for this account (if it's an agency account)
      console.log('Fetching Ads stats for account:', accountId)
      
      const adsResponse = await api.get('/advertising-stats/account-summary', {
        params: {
          accountId,
          dateFrom: from,
          dateTo: to
        }
      })
      
      console.log('Advertising stats response (account summary):', adsResponse.data)
      
      if (adsResponse.data?.summary) {
        adsStats = {
          salesAds: adsResponse.data.summary.totalAttributionValue || 0,
          ordersAds: adsResponse.data.summary.totalAttributionCount || 0,
          costsAds: adsResponse.data.summary.totalCost || 0
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch advertising stats, using defaults:', error)
    // Continue with zero values for ads stats
  }
  
  // Transform response to match interface
  const data = ordersResponse.data
  
  // Merge daily sales data with ads data
  const salesPerDay = data.salesPerDay || []
  const dailyDataMap = new Map<string, { salesTotal: number; salesAds: number }>()
  
  // Add sales data
  salesPerDay.forEach((day: any) => {
    dailyDataMap.set(day.date, {
      salesTotal: day.sales || 0,
      salesAds: 0
    })
  })
  
  // Add ads data
  adsDailyStats.forEach((adDay: any) => {
    const date = adDay.day
    const existing = dailyDataMap.get(date)
    if (existing) {
      existing.salesAds = adDay.combined?.totalAttributionValue || 0
    } else {
      dailyDataMap.set(date, {
        salesTotal: 0,
        salesAds: adDay.combined?.totalAttributionValue || 0
      })
    }
  })
  
  // Convert to array and sort by date
  const dailyData = Array.from(dailyDataMap.entries())
    .map(([date, values]) => ({
      date,
      salesTotal: values.salesTotal,
      salesAds: values.salesAds
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  console.log('Merged daily data for chart:', dailyData)
  
  // Fetch top products from Ads
  let topProductsAds: any[] = []
  try {
    if (agencyClientMapping?.agencyAccountId && agencyClientMapping?.agencyClientId) {
      console.log('Fetching top products from Ads for client:', agencyClientMapping.agencyClientId)
      
      const adsTopProductsResponse = await api.get('/advertising-stats/top-products', {
        params: {
          accountId: agencyClientMapping.agencyAccountId,
          clientId: agencyClientMapping.agencyClientId,
          dateFrom: from,
          dateTo: to
        }
      })
      
      console.log('Top products from Ads response:', adsTopProductsResponse.data)
      topProductsAds = (adsTopProductsResponse.data?.topProducts || []).map((p: any) => ({
        offerId: p.offerId,
        name: p.adName || 'Nieznany produkt',
        sales: p.sales || 0,
        orders: p.orders || 0
      }))
    }
  } catch (error) {
    console.warn('Failed to fetch top products from Ads:', error)
  }
  
  return {
    salesTotal: data.summary?.totalSales || 0,
    ordersTotal: data.summary?.totalOrders || 0,
    topProducts: (data.topProducts || []).map((p: any) => ({
      name: p.offerName || p.name || 'Nieznany produkt',
      sku: p.offerSku || p.sku,
      sales: p.sales,
      orders: p.quantity,
      offerId: p.offerId
    })),
    dateFrom: from || '',
    dateTo: to || '',
    ordersProcessed: data.summary?.totalOrders || 0,
    ...adsStats,
    dailyData,
    topProductsAds
  }
}

