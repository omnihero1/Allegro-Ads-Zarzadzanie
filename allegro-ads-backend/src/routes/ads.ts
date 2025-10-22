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

