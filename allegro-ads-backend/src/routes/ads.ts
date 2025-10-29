import { Router } from 'express'
import axios from 'axios'
import { db } from '../firebase'

export const adsRouter = Router()

const ALLEGRO_API_URL = process.env.ALLEGRO_API_URL || 'https://api.allegro.pl'

// Helper to get account and access token
async function getAccountToken(accountId: string) {
  const accountDoc = await db.collection('accounts').doc(accountId).get()
  
  if (!accountDoc.exists) {
    throw new Error('Account not found')
  }
  
  const accountData = accountDoc.data()
  if (!accountData?.tokens?.access_token) {
    throw new Error('No access token found')
  }
  
  return {
    account: accountData,
    accessToken: accountData.tokens.access_token
  }
}

// Get agency clients
adsRouter.get('/clients', async (req, res) => {
  try {
    const { accountId, status = 'ACTIVE' } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const statusArray = (status as string).split(',')
    
    // Fetch all clients using pagination
    let allClients: any[] = []
    let offset = 0
    const limit = 1000 // Maximum allowed by API
    let hasMore = true
    
    console.log('Starting to fetch clients for account:', accountId)
    
    while (hasMore) {
      console.log(`Fetching clients: offset=${offset}, limit=${limit}`)
      
      const response = await axios.get(
        `${ALLEGRO_API_URL}/ads/clients`,
        {
          params: {
            status: statusArray,
            limit,
            offset
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.beta.v1+json'
          }
        }
      )
      
      const clients = response.data.clients || []
      const totalCount = response.data.totalCount || 0
      const count = response.data.count || 0
      
      console.log(`API Response:`, JSON.stringify({
        clientsReceived: clients.length,
        count: count,
        totalCount: totalCount,
        currentOffset: offset
      }))
      
      allClients = allClients.concat(clients)
      
      // Move offset by the number of items actually received
      offset += count
      
      // Check if there are more clients to fetch
      if (totalCount > 0 && allClients.length >= totalCount) {
        console.log('Reached totalCount - end of results')
        hasMore = false
      } else if (count === 0 || clients.length === 0) {
        console.log('No more clients received - end of results')
        hasMore = false
      } else {
        hasMore = true
      }
      
      console.log(`Progress: ${allClients.length}/${totalCount}, hasMore: ${hasMore}, next offset: ${offset}`)
    }
    
    console.log(`Finished fetching clients. Total clients: ${allClients.length}`)
    
    res.json({
      clients: allClients,
      count: allClients.length,
      totalCount: allClients.length
    })
  } catch (error: any) {
    console.error('Get clients error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get clients',
      details: error?.response?.data || error?.message
    })
  }
})

// Get campaigns
adsRouter.get('/campaigns', async (req, res) => {
  try {
    const { accountId, adsClientId, marketplaceId = 'allegro-pl', status = 'ACTIVE' } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const statusArray = (status as string).split(',')
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/campaigns`,
      {
        params: {
          marketplaceId,
          status: statusArray
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Get campaigns error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get campaigns',
      details: error?.response?.data || error?.message
    })
  }
})

// Get single campaign
adsRouter.get('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { account, accessToken } = await getAccountToken(accountId as string)
    const adsClientId = account.adsClientId || account.id
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/campaigns/${campaignId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Get campaign error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get campaign',
      details: error?.response?.data || error?.message
    })
  }
})

// Create campaign
adsRouter.post('/campaigns', async (req, res) => {
  try {
    const { accountId, adsClientId } = req.query
    const campaignData = req.body
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    console.log(`Creating campaign for client ${adsClientId}:`, JSON.stringify(campaignData))
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const response = await axios.post(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/campaigns`,
      campaignData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json',
          'Content-Type': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    console.log(`Campaign created successfully:`, response.data)
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Create campaign error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to create campaign',
      details: error?.response?.data || error?.message
    })
  }
})

// Update campaign
adsRouter.patch('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params
    const { accountId, adsClientId } = req.query
    const updateData = req.body
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    console.log(`Updating campaign ${campaignId} for client ${adsClientId}:`, updateData)
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const response = await axios.patch(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/campaigns/${campaignId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json',
          'Content-Type': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    console.log(`Campaign ${campaignId} updated successfully to status: ${updateData.status}`)
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Update campaign error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to update campaign',
      details: error?.response?.data || error?.message
    })
  }
})

// Get ad groups
adsRouter.get('/adgroups', async (req, res) => {
  try {
    const { accountId, adsClientId, campaignId, marketplaceId = 'allegro-pl', status = 'ACTIVE' } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const statusArray = (status as string).split(',')
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups`,
      {
        params: {
          marketplaceId,
          status: statusArray,
          ...(campaignId && { campaignId })
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Get ad groups error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get ad groups',
      details: error?.response?.data || error?.message
    })
  }
})

// Get single ad group
adsRouter.get('/adgroups/:adGroupId', async (req, res) => {
  try {
    const { adGroupId } = req.params
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { account, accessToken } = await getAccountToken(accountId as string)
    const adsClientId = account.adsClientId || account.id
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups/${adGroupId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Get ad group error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get ad group',
      details: error?.response?.data || error?.message
    })
  }
})

// Create ad group
adsRouter.post('/adgroups', async (req, res) => {
  try {
    const { accountId, adsClientId } = req.query
    const adGroupData = req.body
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    console.log(`Creating ad group for client ${adsClientId}:`, JSON.stringify(adGroupData))
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const url = `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups`
    console.log(`POST URL: ${url}`)
    
    const response = await axios.post(
      url,
      adGroupData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json',
          'Content-Type': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    console.log(`Ad group created successfully:`, response.data)
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Create ad group error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to create ad group',
      details: error?.response?.data || error?.message
    })
  }
})

// Update ad group
adsRouter.patch('/adgroups/:adGroupId', async (req, res) => {
  try {
    const { adGroupId } = req.params
    const { accountId, adsClientId } = req.query
    const updateData = req.body
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    console.log(`Updating ad group ${adGroupId} for client ${adsClientId}:`, JSON.stringify(updateData))
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const url = `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups/${adGroupId}`
    console.log(`PATCH URL: ${url}`)
    console.log(`Request body:`, JSON.stringify(updateData))
    console.log(`Headers:`, {
      'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
      'Accept': 'application/vnd.allegro.beta.v1+json',
      'Content-Type': 'application/json'
    })
    
    const response = await axios.patch(
      url,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json',
          'Content-Type': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    console.log(`Ad group ${adGroupId} updated successfully to status: ${updateData.status}`)
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Update ad group error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to update ad group',
      details: error?.response?.data || error?.message
    })
  }
})

// Get ad group statistics
adsRouter.get('/adgroups/:adGroupId/statistics', async (req, res) => {
  try {
    const { adGroupId } = req.params
    const { accountId, adsClientId, 'date.gte': dateGte, 'date.lte': dateLte } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    if (!dateGte || !dateLte) {
      return res.status(400).json({ error: 'date.gte and date.lte are required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/adgroups/${adGroupId}/statistics`,
      {
        params: {
          'date.gte': dateGte,
          'date.lte': dateLte
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.beta.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Get ad group stats error:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get ad group statistics',
      details: error?.response?.data || error?.message
    })
  }
})

// Get offers
adsRouter.get('/offers', async (req, res) => {
  try {
    const { accountId, adsClientId, marketplaceId = 'allegro-pl', name, categoryId, priceGte, priceLte } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    if (!adsClientId) {
      return res.status(400).json({ error: 'adsClientId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    // Fetch all offers using pagination (max 30 per request according to API)
    let allOffers: any[] = []
    let offset = 0
    const limit = 30 // Maximum allowed by API
    let hasMore = true
    
    console.log('Starting to fetch offers for adsClient:', adsClientId)
    
    while (hasMore) {
      console.log(`Fetching offers: offset=${offset}, limit=${limit}`)
      
      const response = await axios.get(
        `${ALLEGRO_API_URL}/ads/clients/${adsClientId}/sponsored/offers`,
        {
          params: {
            marketplaceId,
            limit,
            offset,
            ...(name && { name }),
            ...(categoryId && { 'category.id': categoryId }),
            ...(priceGte && { 'price.amount.gte': priceGte }),
            ...(priceLte && { 'price.amount.lte': priceLte })
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.beta.v1+json'
          }
        }
      )
      
      const offers = response.data.offers || []
      const totalCount = response.data.totalCount || 0
      const count = response.data.count || 0
      
      console.log(`Offers API Response:`, JSON.stringify({
        offersReceived: offers.length,
        count: count,
        totalCount: totalCount,
        currentOffset: offset
      }))
      
      allOffers = allOffers.concat(offers)
      
      // Move offset by the number of items actually received
      offset += count
      
      // Check if there are more offers to fetch
      if (totalCount > 0 && allOffers.length >= totalCount) {
        console.log('Reached totalCount - end of offers')
        hasMore = false
      } else if (count === 0 || offers.length === 0) {
        console.log('No more offers received - end of results')
        hasMore = false
      } else {
        hasMore = true
      }
      
      console.log(`Offers progress: ${allOffers.length}/${totalCount}, hasMore: ${hasMore}, next offset: ${offset}`)
      
      // Safety limit to prevent infinite loops (max 60000 according to API docs)
      if (offset > 60000) {
        console.log('Reached maximum offset limit (60000)')
        hasMore = false
      }
    }
    
    console.log(`Finished fetching offers. Total offers: ${allOffers.length}`)
    
    res.json({
      offers: allOffers,
      count: allOffers.length,
      totalCount: allOffers.length
    })
  } catch (error: any) {
    console.error('Get offers error (full):', JSON.stringify({
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
      url: error?.config?.url,
      params: error?.config?.params
    }, null, 2))
    res.status(error?.response?.status || 500).json({
      error: 'Failed to get offers',
      details: error?.response?.data || error?.message
    })
  }
})

// Get agency clients from Advertising Agencies API
adsRouter.get('/agency-clients', async (req, res) => {
  try {
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/advertising-agencies/clients`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Failed to fetch agency clients:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch agency clients',
      details: error?.response?.data || error?.message
    })
  }
})

// Get agency client statistics (graphic ads & branded accounts)
adsRouter.get('/agency-statistics', async (req, res) => {
  try {
    const { accountId, clientId, dateFrom, dateTo } = req.query
    
    if (!accountId || !clientId) {
      return res.status(400).json({ error: 'accountId and clientId are required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    // Default to last 7 days if dates not provided (API limit)
    const now = new Date()
    const defaultDateTo = new Date(now)
    defaultDateTo.setDate(defaultDateTo.getDate() - 1) // Yesterday
    const defaultDateFrom = new Date(defaultDateTo)
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 6) // 6 days before yesterday (7 days total)
    
    const gte = dateFrom || defaultDateFrom.toISOString().split('T')[0]
    const lte = dateTo || defaultDateTo.toISOString().split('T')[0]
    
    console.log(`Fetching agency statistics for client ${clientId}: ${gte} to ${lte}`)
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/advertising-agencies/clients/${clientId}/statistics`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        },
        params: {
          'types': ['SPONSORED_OFFER', 'GRAPHIC_AD'],
          'statistics.gte': gte,
          'statistics.lte': lte
        }
      }
    )
    
    res.json(response.data)
  } catch (error: any) {
    console.error('Failed to fetch agency statistics:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch agency statistics',
      details: error?.response?.data || error?.message
    })
  }
})

// DEBUG: Get schedules from Firestore (for debugging)
adsRouter.get('/debug-schedules', async (req, res) => {
  try {
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const schedulesSnapshot = await db.collection('schedules')
      .where('accountId', '==', accountId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    
    const schedules = schedulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log('DEBUG: Schedules from Firestore:')
    schedules.forEach((s: any) => {
      console.log(`  ${s.name}: changeValue=${s.changeValue} (type: ${typeof s.changeValue}), changeMode=${s.changeMode}`)
    })
    
    res.json({ schedules })
  } catch (error: any) {
    console.error('DEBUG: Failed to fetch schedules:', error?.message)
    res.status(500).json({
      error: 'Failed to fetch schedules',
      details: error?.message
    })
  }
})

// TEST: Get raw orders from Allegro (for debugging)
adsRouter.get('/test-orders', async (req, res) => {
  try {
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    console.log(`TEST: Fetching raw orders for account ${accountId}`)
    
    const response = await axios.get(
      `${ALLEGRO_API_URL}/order/checkout-forms`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        },
        params: {
          offset: 0,
          limit: 10
        }
      }
    )
    
    console.log(`TEST: Got response, count: ${response.data.count}, totalCount: ${response.data.totalCount}`)
    console.log(`TEST: Number of orders: ${response.data.checkoutForms?.length || 0}`)
    
    res.json({
      count: response.data.count,
      totalCount: response.data.totalCount,
      ordersReturned: response.data.checkoutForms?.length || 0,
      firstOrder: response.data.checkoutForms?.[0] || null
    })
  } catch (error: any) {
    console.error('TEST: Failed to fetch orders:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch test orders',
      details: error?.response?.data || error?.message
    })
  }
})

// Get dashboard statistics (orders and sales data)
adsRouter.get('/dashboard-stats', async (req, res) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    
    const { accessToken } = await getAccountToken(accountId as string)
    
    // Use provided dates or default to last 7 days
    let from: string | undefined
    let to: string | undefined
    
    if (dateFrom && dateTo) {
      from = dateFrom as string
      to = dateTo as string
      console.log(`Fetching dashboard stats for account ${accountId}: ${from} to ${to}`)
    } else {
      const now = new Date()
      const defaultDateTo = new Date(now)
      const defaultDateFrom = new Date(defaultDateTo)
      defaultDateFrom.setDate(defaultDateFrom.getDate() - 7)
      
      from = defaultDateFrom.toISOString()
      to = defaultDateTo.toISOString()
      console.log(`Fetching dashboard stats for account ${accountId} (default 7 days): ${from} to ${to}`)
    }
    
    // Fetch checkout forms (orders) from Allegro API
    // https://developer.allegro.pl/documentation/#operation/getListOfOrdersUsingGET
    let allOrders: any[] = []
    let offset = 0
    const limit = 100
    let hasMore = true
    
    while (hasMore) {
      const params: any = {
        offset,
        limit
      }
      
      // Add date filters if provided
      if (from) {
        params['boughtAt.gte'] = from
      }
      if (to) {
        params['boughtAt.lte'] = to
      }
      
      console.log('Request params:', params)
      
      const response = await axios.get(
        `${ALLEGRO_API_URL}/order/checkout-forms`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json'
          },
          params
        }
      )
      
      const orders = response.data.checkoutForms || []
      allOrders = allOrders.concat(orders)
      
      hasMore = orders.length === limit
      offset += limit
      
      console.log(`Fetched ${orders.length} orders, total: ${allOrders.length}`)
      console.log(`Response count: ${response.data.count}, total available: ${response.data.totalCount}`)
      
      // Safety limit
      if (allOrders.length > 10000) {
        console.warn('Reached safety limit of 10000 orders')
        break
      }
    }
    
    // Log first order to understand structure
    if (allOrders.length > 0) {
      console.log('=== SAMPLE ORDER STRUCTURE ===')
      console.log('First order:', JSON.stringify(allOrders[0], null, 2))
      console.log('Summary:', allOrders[0].summary)
      console.log('Line items:', allOrders[0].lineItems)
    }
    
    // Calculate statistics
    let salesTotal = 0
    let ordersTotal = allOrders.length
    const productSales: { [key: string]: { name: string; sales: number; orders: number; offerId: string } } = {}
    
    allOrders.forEach((order, idx) => {
      // Sum up total sales
      if (order.summary?.totalToPay?.amount) {
        const orderValue = parseFloat(order.summary.totalToPay.amount)
        salesTotal += orderValue
        if (idx < 3) {
          console.log(`Order ${idx + 1} value: ${orderValue} ${order.summary.totalToPay.currency}`)
        }
      } else {
        console.warn(`Order ${idx + 1} missing totalToPay amount`)
      }
      
      // Track product sales
      if (order.lineItems) {
        order.lineItems.forEach((item: any) => {
          const offerId = item.offer?.id
          const offerName = item.offer?.name || 'Unknown'
          const itemPrice = parseFloat(item.price?.amount || 0)
          const quantity = item.quantity || 1
          const itemTotal = itemPrice * quantity
          
          if (idx < 3) {
            console.log(`  - Product: ${offerName}, Price: ${itemPrice}, Qty: ${quantity}, Total: ${itemTotal}`)
          }
          
          if (offerId) {
            if (!productSales[offerId]) {
              productSales[offerId] = {
                name: offerName,
                sales: 0,
                orders: 0,
                offerId
              }
            }
            productSales[offerId].sales += itemTotal
            productSales[offerId].orders += quantity
          }
        })
      }
    })
    
    // Sort products by sales and get top 10
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
    
    console.log(`Calculated stats: ${ordersTotal} orders, ${salesTotal.toFixed(2)} PLN total sales`)
    
    res.json({
      salesTotal,
      ordersTotal,
      topProducts,
      dateFrom: from,
      dateTo: to,
      ordersProcessed: allOrders.length
    })
  } catch (error: any) {
    console.error('Failed to fetch dashboard statistics:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error?.response?.data || error?.message
    })
  }
})

// ===== ADVERTISING STATISTICS ENDPOINTS =====

// Get advertising agency clients
adsRouter.get('/advertising-agency/clients', async (req, res) => {
  try {
    const { accountId } = req.query
    
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }

    const { accessToken } = await getAccountToken(accountId as string)

    const response = await axios.get(
      `${ALLEGRO_API_URL}/advertising-agencies/clients`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
        },
      }
    )

    res.json({
      clients: response.data.clients || [],
      count: response.data.clients?.length || 0,
    })
  } catch (error: any) {
    console.error('Failed to fetch agency clients:', error?.response?.data || error?.message)
    res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch agency clients',
      details: error?.response?.data || error?.message
    })
  }
})

