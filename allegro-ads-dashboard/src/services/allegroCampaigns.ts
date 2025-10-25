import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

export interface Campaign {
  id: string
  marketplaceId: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
}

export interface AdGroup {
  id: string
  campaignId: string
  marketplaceId: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  bidding: {
    maxCpc: {
      amount: number
      currency: string
    }
  }
  name: string
  display: {
    start: string
    end: string
  }
  placements: {
    ids: string[]
  }
  budget: {
    daily: {
      amount: number
      currency: string
    }
    total: {
      amount: number
      currency: string
    }
  }
  offers?: {
    offerIds: string[]
  }
}

export interface Offer {
  id: number
  name: string
  category: {
    id: number
  }
  price: {
    amount: number
    currency: string
  }
  marketplaceId: string
  imageUrl: string
  advertisable: boolean
}

export interface AdsClient {
  id: string
  name: string
  type: 'SINGLE_SELLER' | 'MULTI_SELLER'
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE'
}

export interface AdGroupStats {
  stats: Array<{
    ad: {
      name: string
      offerId: number | string
    }
    dailyStats: Array<{
      day: string
      stats: {
        interest: number
        clicks: number
        totalCost: {
          amount: number | string  // API returns as string
          currency: string
        }
        views: number
        ctr: number | string  // API returns as string
        soldQuantity: number
        sold: {
          amount: number | string  // API returns as string
          currency: string
        }
        averageCpc: {
          amount: number | string  // API returns as string
          currency: string
        }
        rateOfReturn: number | string  // API returns as string
      }
    }>
  }>
}

// Get agency clients
export async function getAdsClients(
  accountId: string,
  status: string[] = ['ACTIVE']
) {
  const response = await api.get<{ clients: AdsClient[]; count: number; totalCount: number }>(
    '/ads/clients',
    {
      params: { accountId, status: status.join(',') }
    }
  )
  return response.data
}

// Get all campaigns for a client
export async function getCampaigns(
  accountId: string,
  adsClientId: string,
  marketplaceId: string = 'allegro-pl',
  status: string[] = ['ACTIVE']
) {
  const response = await api.get<{ campaigns: Campaign[]; count: number; totalCount: number }>(
    '/ads/campaigns',
    {
      params: { accountId, adsClientId, marketplaceId, status: status.join(',') }
    }
  )
  return response.data
}

// Get single campaign
export async function getCampaign(accountId: string, campaignId: string) {
  const response = await api.get<Campaign>(`/ads/campaigns/${campaignId}`, {
    params: { accountId }
  })
  return response.data
}

// Get ad groups for a client
export async function getAdGroups(
  accountId: string,
  adsClientId: string,
  campaignId?: string,
  marketplaceId: string = 'allegro-pl',
  status: string[] = ['ACTIVE']
) {
  const response = await api.get<{ adGroups: AdGroup[]; count: number; totalCount: number }>(
    '/ads/adgroups',
    {
      params: { accountId, adsClientId, campaignId, marketplaceId, status: status.join(',') }
    }
  )
  return response.data
}

// Get single ad group
export async function getAdGroup(accountId: string, adGroupId: string) {
  const response = await api.get<AdGroup>(`/ads/adgroups/${adGroupId}`, {
    params: { accountId }
  })
  return response.data
}

// Get ad group statistics
export async function getAdGroupStats(
  accountId: string,
  adsClientId: string,
  adGroupId: string,
  dateGte: string,
  dateLte: string
) {
  const response = await api.get<AdGroupStats>(`/ads/adgroups/${adGroupId}/statistics`, {
    params: { accountId, adsClientId, 'date.gte': dateGte, 'date.lte': dateLte }
  })
  return response.data
}

// Get offers for a client
export async function getOffers(
  accountId: string,
  adsClientId: string,
  marketplaceId: string = 'allegro-pl',
  filters?: {
    name?: string
    categoryId?: number
    priceGte?: number
    priceLte?: number
  }
) {
  const response = await api.get<{ offers: Offer[]; count: number; totalCount: number }>(
    '/ads/offers',
    {
      params: {
        accountId,
        adsClientId,
        marketplaceId,
        ...filters
      }
    }
  )
  return response.data
}

// Create campaign
export async function createCampaign(
  accountId: string,
  adsClientId: string,
  data: { 
    name: string
    status?: 'ACTIVE' | 'PAUSED'
  }
) {
  const response = await api.post<Campaign>(
    '/ads/campaigns',
    data,
    {
      params: { accountId, adsClientId },
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  return response.data
}

// Update campaign
export async function updateCampaign(
  accountId: string,
  adsClientId: string,
  campaignId: string,
  data: { name?: string; status?: 'ACTIVE' | 'PAUSED' }
) {
  const response = await api.patch<Campaign>(
    `/ads/campaigns/${campaignId}`, 
    data, 
    {
      params: { accountId, adsClientId },
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  return response.data
}

// Create ad group (with optional campaign creation)
export async function createAdGroup(
  accountId: string,
  adsClientId: string,
  data: {
    campaign: { campaignId: string } | { name: string } // Either existing or new campaign
    marketplaceId?: string
    name: string
    status?: 'ACTIVE' | 'PAUSED'
    bidding: {
      maxCpc: {
        amount: string
        currency: string
      }
    }
    display: {
      start: string
      end?: string
    }
    placements: {
      ids: string[]
    }
    budget: {
      daily: {
        amount: string
        currency: string
      }
      total?: {
        amount: string
        currency: string
      }
    }
    offers: {
      offerIds: string[]
    }
  }
) {
  const response = await api.post<AdGroup>(
    '/ads/adgroups',
    data,
    {
      params: { accountId, adsClientId },
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  return response.data
}

// Update ad group
export async function updateAdGroup(
  accountId: string,
  adsClientId: string,
  adGroupId: string,
  data: { 
    status?: 'ACTIVE' | 'PAUSED'
    name?: string
    budget?: {
      daily?: {
        amount: string
        currency: string
      }
      total?: {
        amount: string
        currency: string
      }
    }
    bidding?: {
      maxCpc?: {
        amount: string
        currency: string
      }
    }
    placements?: {
      ids: string[]
    }
    offers?: {
      offerIds: string[]
    }
    display?: {
      start: string
      end?: string
    }
  }
) {
  console.log('updateAdGroup called with:', { accountId, adsClientId, adGroupId, data })
  
  // Let axios automatically set Content-Type for JSON
  const response = await api.patch<AdGroup>(
    `/ads/adgroups/${adGroupId}`, 
    data,
    {
      params: { accountId, adsClientId }
    }
  )
  
  console.log('updateAdGroup response:', response.data)
  return response.data
}

// Agency API interfaces
export interface AgencyClient {
  id: string
  name: string
}

export interface GraphicAdStatistics {
  campaign: {
    id: string
    name: string
  }
  adGroup: {
    id: string
    name: string
  }
  ad: {
    id: string
    name: string
  }
  dayData: Array<{
    day: string
    data: {
      interest: number
      clicks: number
      totalCost: string
      views: number
      ctr: string
      totalAttributionCount: number
      totalAttributionValue: string
      effectiveCpm?: string
      rateOfReturn: string
      uniqueReach?: number
      attributedToCoreValue?: string
    }
  }>
}

export interface AgencyStatistics {
  sponsoredOffers: Array<any>
  graphicAds: GraphicAdStatistics[]
}

// Get agency clients
export async function getAgencyClients(accountId: string) {
  console.log('Getting agency clients for account:', accountId)
  
  const response = await api.get('/ads/agency-clients', {
    params: { accountId }
  })
  
  console.log('Agency clients response:', response.data)
  return response.data
}

// Get agency statistics (graphic ads + branded accounts)
export async function getAgencyStatistics(
  accountId: string, 
  clientId: string, 
  dateFrom?: string, 
  dateTo?: string
) {
  console.log('Getting agency statistics:', { accountId, clientId, dateFrom, dateTo })
  
  const response = await api.get('/ads/agency-statistics', {
    params: { 
      accountId, 
      clientId,
      dateFrom,
      dateTo
    }
  })
  
  console.log('Agency statistics response:', response.data)
  return response.data as AgencyStatistics
}

