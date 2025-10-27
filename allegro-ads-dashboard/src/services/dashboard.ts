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
    sales: number
    orders: number
    offerId: string
  }>
  dateFrom: string
  dateTo: string
  ordersProcessed: number
}

// Get dashboard statistics (total sales and orders)
export async function getDashboardStats(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<DashboardStats> {
  console.log('Getting dashboard stats:', { accountId, dateFrom, dateTo })
  
  const response = await api.get('/ads/dashboard-stats', {
    params: {
      accountId,
      dateFrom,
      dateTo
    }
  })
  
  console.log('Dashboard stats response:', response.data)
  return response.data
}

