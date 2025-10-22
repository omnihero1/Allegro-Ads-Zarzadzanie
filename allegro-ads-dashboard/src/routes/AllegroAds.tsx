import { useState, useEffect } from 'react'
import { getAccounts } from '../services/allegroAuth'
import {
  getAdsClients,
  getCampaigns,
  getAdGroups,
  getAdGroupStats,
  getOffers,
  updateCampaign,
  updateAdGroup,
  createAdGroup,
  type AdsClient,
  type Campaign,
  type AdGroup,
  type Offer,
  type AdGroupStats as AdGroupStatsType
} from '../services/allegroCampaigns'
import './AllegroAds.css'

interface Account {
  id: string
  name: string
  email: string
  status: string
}

export function AllegroAds() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  
  const [adsClients, setAdsClients] = useState<AdsClient[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adGroups, setAdGroups] = useState<AdGroup[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [stats, setStats] = useState<Map<string, AdGroupStatsType>>(new Map())
  
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('')
  
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Budget editing modal state
  const [editingBudget, setEditingBudget] = useState<{
    adGroupId: string
    adGroupName: string
    currentAmount: string
    currency: string
  } | null>(null)
  const [newBudgetAmount, setNewBudgetAmount] = useState('')

  // Max CPC editing modal state
  const [editingMaxCpc, setEditingMaxCpc] = useState<{
    adGroupId: string
    adGroupName: string
    currentAmount: string
    currency: string
  } | null>(null)
  const [newMaxCpcAmount, setNewMaxCpcAmount] = useState('')

  // Placements editing modal state
  const [editingPlacements, setEditingPlacements] = useState<{
    adGroupId: string
    adGroupName: string
    currentPlacements: string[]
  } | null>(null)
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([])
  
  // Available placements
  const availablePlacements = [
    { id: 'listing', name: 'Wyniki wyszukiwania' },
    { id: 'mainpage', name: 'Strona główna' },
    { id: 'showitem', name: 'Strona oferty' },
    { id: 'leftpanel', name: 'Panel boczny' },
    { id: 'category', name: 'Strona kategorii' },
    { id: 'offer', name: 'Oferta' }
  ]

  // Offers editing modal state
  const [editingOffers, setEditingOffers] = useState<{
    adGroupId: string
    adGroupName: string
    currentOfferIds: string[]
  } | null>(null)
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([])
  const [offerSearchQuery, setOfferSearchQuery] = useState('')

  // Name editing modal state
  const [editingName, setEditingName] = useState<{
    type: 'campaign' | 'adGroup'
    id: string
    currentName: string
  } | null>(null)
  const [newName, setNewName] = useState('')

  // Display period editing modal state
  const [editingDisplay, setEditingDisplay] = useState<{
    adGroupId: string
    adGroupName: string
    currentStart: string
    currentEnd: string | undefined
  } | null>(null)
  const [newDisplayStart, setNewDisplayStart] = useState('')
  const [newDisplayEnd, setNewDisplayEnd] = useState('')

  // Total budget editing modal state
  const [editingTotalBudget, setEditingTotalBudget] = useState<{
    adGroupId: string
    adGroupName: string
    currentAmount: string
    currency: string
  } | null>(null)
  const [newTotalBudgetAmount, setNewTotalBudgetAmount] = useState('')

  // Create campaign wizard state
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [newCampaignData, setNewCampaignData] = useState({
    // Step 1: Campaign selection
    selectedCampaignId: '', // Use existing campaign
    newCampaignName: '', // Or create new (if API allows)
    useExistingCampaign: true,
    // Step 2: Ad Group
    adGroupName: '',
    displayStart: new Date().toISOString().split('T')[0],
    displayEnd: '',
    dailyBudget: '',
    totalBudget: '',
    maxCpc: '',
    placements: ['listing', 'mainpage'] as string[],
    // Step 3: Offers
    selectedOfferIds: [] as string[]
  })
  const [wizardOfferSearch, setWizardOfferSearch] = useState('')
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // Load clients when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadAdsClients()
    } else {
      setAdsClients([])
      setSelectedClient('')
    }
  }, [selectedAccount])

  async function loadAccounts() {
    try {
      const data = await getAccounts()
      setAccounts(data.accounts || [])
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      setError('Nie udało się załadować kont')
      setAccounts([]) // Set empty array on error
    }
  }

  async function loadAdsClients() {
    if (!selectedAccount) return

    setLoadingClients(true)
    setError(null)

    try {
      console.log('Loading clients for account:', selectedAccount)
      const data = await getAdsClients(selectedAccount, ['ACTIVE', 'PENDING'])
      console.log('Loaded clients:', data)
      console.log('Clients array:', data.clients)
      
      setAdsClients(data.clients || [])
      if (data.clients && data.clients.length > 0) {
        console.log('Auto-selecting first client:', data.clients[0])
        setSelectedClient(data.clients[0].id)
      } else {
        console.warn('No clients loaded! Setting selectedClient to empty')
        setSelectedClient('')
      }
    } catch (err: any) {
      console.error('Failed to load clients:', err)
      setError('Nie udało się załadować klientów agencji')
      setAdsClients([])
      setSelectedClient('')
    } finally {
      setLoadingClients(false)
    }
  }

  async function loadData() {
    if (!selectedAccount) {
      setError('Wybierz konto Allegro')
      return
    }

    if (!selectedClient) {
      setError('Wybierz klienta')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Load campaigns
      const campaignsData = await getCampaigns(selectedAccount, selectedClient, 'allegro-pl', ['ACTIVE', 'PAUSED'])
      setCampaigns(campaignsData.campaigns)

      // Load ad groups
      const adGroupsData = await getAdGroups(selectedAccount, selectedClient, undefined, 'allegro-pl', ['ACTIVE', 'PAUSED'])
      setAdGroups(adGroupsData.adGroups)

      // Load stats for each ad group in batches to avoid rate limiting
      const statsMap = new Map<string, AdGroupStatsType>()
      const BATCH_SIZE = 3 // Process 3 ad groups at a time
      const BATCH_DELAY = 1000 // 1 second delay between batches
      
      for (let i = 0; i < adGroupsData.adGroups.length; i += BATCH_SIZE) {
        const batch = adGroupsData.adGroups.slice(i, i + BATCH_SIZE)
        
        // Fetch stats for all ad groups in this batch in parallel
        await Promise.all(
          batch.map(async (adGroup) => {
            try {
              const adGroupStats = await getAdGroupStats(selectedAccount, selectedClient, adGroup.id, dateFrom, dateTo)
              statsMap.set(adGroup.id, adGroupStats)
            } catch (err) {
              console.warn(`Failed to load stats for ad group ${adGroup.id}`, err)
            }
          })
        )
        
        // Update stats after each batch so user sees progress
        setStats(new Map(statsMap))
        
        // Wait before next batch (except for the last one)
        if (i + BATCH_SIZE < adGroupsData.adGroups.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }

      // Load offers (non-critical - continue even if it fails)
      try {
        const offersData = await getOffers(selectedAccount, selectedClient, 'allegro-pl')
        setOffers(offersData.offers)
      } catch (offersErr: any) {
        console.error('Failed to load offers (non-critical):', offersErr?.response?.data || offersErr?.message)
        setOffers([]) // Continue without offers
      }
    } catch (err: any) {
      console.error('Failed to load data:', err)
      setError(err?.response?.data?.details?.message || err?.message || 'Nie udało się załadować danych')
    } finally {
      setLoading(false)
    }
  }

  async function handleCampaignStatusChange(campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') {
    if (!selectedClient) {
      alert('Brak wybranego klienta')
      return
    }
    
    try {
      await updateCampaign(selectedAccount, selectedClient, campaignId, { status: newStatus })
      // Reload campaigns
      await loadData()
      alert(`Kampania ${newStatus === 'ACTIVE' ? 'włączona' : 'wstrzymana'} pomyślnie!`)
    } catch (err: any) {
      console.error('Failed to update campaign:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować kampanii: ${errorMsg}`)
    }
  }

  async function handleAdGroupStatusChange(adGroupId: string, newStatus: 'ACTIVE' | 'PAUSED') {
    if (!selectedClient) {
      alert('Brak wybranego klienta')
      return
    }
    
    // Validate selectedClient - should be UUID format, not a number
    if (/^\d+$/.test(selectedClient)) {
      alert(`BŁĄD: Wybrany klient (${selectedClient}) jest nieprawidłowy! To wygląda jak user ID zamiast adsClientId. Wybierz klienta z listy ponownie.`)
      console.error('Invalid adsClientId - looks like user ID:', selectedClient)
      console.error('Available clients:', adsClients)
      return
    }
    
    console.log('handleAdGroupStatusChange:', { 
      selectedAccount, 
      selectedClient, 
      adGroupId, 
      newStatus,
      adsClients: adsClients.map(c => ({ id: c.id, name: c.name }))
    })
    
    try {
      await updateAdGroup(selectedAccount, selectedClient, adGroupId, { status: newStatus })
      // Reload ad groups
      await loadData()
      alert(`Grupa reklam ${newStatus === 'ACTIVE' ? 'włączona' : 'wstrzymana'} pomyślnie!`)
    } catch (err: any) {
      console.error('Failed to update ad group:', err)
      console.error('Error details:', err?.response?.data)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować grupy reklam: ${errorMsg}`)
    }
  }

  function openBudgetEditModal(adGroup: AdGroup) {
    setEditingBudget({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentAmount: adGroup.budget?.daily?.amount?.toString() || '0',
      currency: adGroup.budget?.daily?.currency || 'PLN'
    })
    setNewBudgetAmount(adGroup.budget?.daily?.amount?.toString() || '0')
  }

  function closeBudgetEditModal() {
    setEditingBudget(null)
    setNewBudgetAmount('')
  }

  async function saveBudgetChange() {
    if (!editingBudget || !selectedClient) {
      return
    }

    const amount = parseFloat(newBudgetAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Wprowadź poprawną kwotę budżetu (liczba większa od 0)')
      return
    }

    // Find the current ad group to get total budget if it exists
    const currentAdGroup = adGroups.find(ag => ag.id === editingBudget.adGroupId)
    if (!currentAdGroup) {
      alert('Nie znaleziono grupy reklam')
      return
    }

    try {
      // We need to send both daily and total budget together
      const budgetData: any = {
        daily: {
          amount: amount.toFixed(2),
          currency: editingBudget.currency
        }
      }
      
      // Include total budget if it exists
      if (currentAdGroup.budget?.total) {
        budgetData.total = {
          amount: currentAdGroup.budget.total.amount.toString(),
          currency: currentAdGroup.budget.total.currency
        }
      }

      await updateAdGroup(selectedAccount, selectedClient, editingBudget.adGroupId, {
        budget: budgetData
      })
      
      // Reload data
      await loadData()
      alert(`Budżet dzienny zaktualizowany pomyślnie!`)
      closeBudgetEditModal()
    } catch (err: any) {
      console.error('Failed to update budget:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować budżetu: ${errorMsg}`)
    }
  }

  function openMaxCpcEditModal(adGroup: AdGroup) {
    setEditingMaxCpc({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentAmount: adGroup.bidding?.maxCpc?.amount?.toString() || '0',
      currency: adGroup.bidding?.maxCpc?.currency || 'PLN'
    })
    setNewMaxCpcAmount(adGroup.bidding?.maxCpc?.amount?.toString() || '0')
  }

  function closeMaxCpcEditModal() {
    setEditingMaxCpc(null)
    setNewMaxCpcAmount('')
  }

  async function saveMaxCpcChange() {
    if (!editingMaxCpc || !selectedClient) {
      return
    }

    const amount = parseFloat(newMaxCpcAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Wprowadź poprawną stawkę Max CPC (liczba większa od 0)')
      return
    }

    try {
      await updateAdGroup(selectedAccount, selectedClient, editingMaxCpc.adGroupId, {
        bidding: {
          maxCpc: {
            amount: amount.toFixed(2),
            currency: editingMaxCpc.currency
          }
        }
      })
      
      // Reload data
      await loadData()
      alert(`Max CPC zaktualizowane pomyślnie!`)
      closeMaxCpcEditModal()
    } catch (err: any) {
      console.error('Failed to update Max CPC:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować Max CPC: ${errorMsg}`)
    }
  }

  function openPlacementsEditModal(adGroup: AdGroup) {
    const currentPlacements = adGroup.placements?.ids || []
    setEditingPlacements({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentPlacements
    })
    setSelectedPlacements([...currentPlacements])
  }

  function closePlacementsEditModal() {
    setEditingPlacements(null)
    setSelectedPlacements([])
  }

  function togglePlacement(placementId: string) {
    setSelectedPlacements(prev => {
      if (prev.includes(placementId)) {
        return prev.filter(id => id !== placementId)
      } else {
        return [...prev, placementId]
      }
    })
  }

  async function savePlacementsChange() {
    if (!editingPlacements || !selectedClient) {
      return
    }

    if (selectedPlacements.length === 0) {
      alert('Wybierz co najmniej jedno miejsce emisji')
      return
    }

    try {
      await updateAdGroup(selectedAccount, selectedClient, editingPlacements.adGroupId, {
        placements: {
          ids: selectedPlacements
        }
      })
      
      // Reload data
      await loadData()
      alert(`Miejsca emisji zaktualizowane pomyślnie!`)
      closePlacementsEditModal()
    } catch (err: any) {
      console.error('Failed to update placements:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować miejsc emisji: ${errorMsg}`)
    }
  }

  function openOffersEditModal(adGroup: AdGroup) {
    const currentOfferIds = adGroup.offers?.offerIds?.map(id => id.toString()) || []
    setEditingOffers({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentOfferIds
    })
    setSelectedOfferIds([...currentOfferIds])
    setOfferSearchQuery('')
  }

  function closeOffersEditModal() {
    setEditingOffers(null)
    setSelectedOfferIds([])
    setOfferSearchQuery('')
  }

  function toggleOffer(offerId: string) {
    setSelectedOfferIds(prev => {
      if (prev.includes(offerId)) {
        return prev.filter(id => id !== offerId)
      } else {
        return [...prev, offerId]
      }
    })
  }

  async function saveOffersChange() {
    if (!editingOffers || !selectedClient) {
      return
    }

    if (selectedOfferIds.length === 0) {
      alert('Wybierz co najmniej jedną ofertę')
      return
    }

    try {
      await updateAdGroup(selectedAccount, selectedClient, editingOffers.adGroupId, {
        offers: {
          offerIds: selectedOfferIds
        }
      })
      
      // Reload data
      await loadData()
      alert(`Oferty zaktualizowane pomyślnie!`)
      closeOffersEditModal()
    } catch (err: any) {
      console.error('Failed to update offers:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować ofert: ${errorMsg}`)
    }
  }

  function openNameEditModal(type: 'campaign' | 'adGroup', id: string, currentName: string) {
    setEditingName({ type, id, currentName })
    setNewName(currentName)
  }

  function closeNameEditModal() {
    setEditingName(null)
    setNewName('')
  }

  async function saveNameChange() {
    if (!editingName || !selectedClient) {
      return
    }

    const trimmedName = newName.trim()
    if (!trimmedName) {
      alert('Nazwa nie może być pusta')
      return
    }

    if (trimmedName === editingName.currentName) {
      closeNameEditModal()
      return
    }

    try {
      if (editingName.type === 'campaign') {
        await updateCampaign(selectedAccount, selectedClient, editingName.id, {
          name: trimmedName
        })
        alert('Nazwa kampanii zaktualizowana pomyślnie!')
      } else {
        await updateAdGroup(selectedAccount, selectedClient, editingName.id, {
          name: trimmedName
        })
        alert('Nazwa grupy reklam zaktualizowana pomyślnie!')
      }
      
      // Reload data
      await loadData()
      closeNameEditModal()
    } catch (err: any) {
      console.error('Failed to update name:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować nazwy: ${errorMsg}`)
    }
  }

  function openDisplayEditModal(adGroup: AdGroup) {
    setEditingDisplay({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentStart: adGroup.display?.start || '',
      currentEnd: adGroup.display?.end
    })
    setNewDisplayStart(adGroup.display?.start || '')
    setNewDisplayEnd(adGroup.display?.end || '')
  }

  function closeDisplayEditModal() {
    setEditingDisplay(null)
    setNewDisplayStart('')
    setNewDisplayEnd('')
  }

  async function saveDisplayChange() {
    if (!editingDisplay || !selectedClient) {
      return
    }

    if (!newDisplayStart) {
      alert('Data rozpoczęcia jest wymagana')
      return
    }

    // Validate dates
    const startDate = new Date(newDisplayStart)
    const endDate = newDisplayEnd ? new Date(newDisplayEnd) : null

    if (endDate && endDate < startDate) {
      alert('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia')
      return
    }

    try {
      const displayData: { start: string; end?: string } = {
        start: newDisplayStart
      }
      
      if (newDisplayEnd) {
        displayData.end = newDisplayEnd
      }

      await updateAdGroup(selectedAccount, selectedClient, editingDisplay.adGroupId, {
        display: displayData
      })
      
      // Reload data
      await loadData()
      alert('Okres emisji zaktualizowany pomyślnie!')
      closeDisplayEditModal()
    } catch (err: any) {
      console.error('Failed to update display period:', err)
      const errorMsg = err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować okresu emisji: ${errorMsg}`)
    }
  }

  function openTotalBudgetEditModal(adGroup: AdGroup) {
    // Get currency from daily budget if total budget doesn't exist
    const currency = adGroup.budget?.total?.currency || adGroup.budget?.daily?.currency || 'PLN'
    const currentAmount = adGroup.budget?.total?.amount?.toString() || ''
    
    setEditingTotalBudget({
      adGroupId: adGroup.id,
      adGroupName: adGroup.name,
      currentAmount: currentAmount || 'nie ustawiono',
      currency: currency
    })
    setNewTotalBudgetAmount(currentAmount)
  }

  function closeTotalBudgetEditModal() {
    setEditingTotalBudget(null)
    setNewTotalBudgetAmount('')
  }

  async function saveTotalBudgetChange() {
    if (!editingTotalBudget || !selectedClient) {
      return
    }

    const amount = parseFloat(newTotalBudgetAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Wprowadź poprawną kwotę budżetu (liczba większa od 0)')
      return
    }

    // Find the current ad group to get daily budget
    const currentAdGroup = adGroups.find(ag => ag.id === editingTotalBudget.adGroupId)
    if (!currentAdGroup) {
      alert('Nie znaleziono grupy reklam')
      return
    }

    try {
      // We need to send both daily and total budget together
      const budgetData: any = {}
      
      // Include daily budget if it exists
      if (currentAdGroup.budget?.daily) {
        budgetData.daily = {
          amount: currentAdGroup.budget.daily.amount.toString(),
          currency: currentAdGroup.budget.daily.currency
        }
      }
      
      // Add the new total budget
      budgetData.total = {
        amount: amount.toFixed(2),
        currency: editingTotalBudget.currency
      }

      await updateAdGroup(selectedAccount, selectedClient, editingTotalBudget.adGroupId, {
        budget: budgetData
      })
      
      // Reload data
      await loadData()
      alert(`Budżet całkowity zaktualizowany pomyślnie!`)
      closeTotalBudgetEditModal()
    } catch (err: any) {
      console.error('Failed to update total budget:', err)
      console.error('Error response:', err?.response?.data)
      const errorMsg = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się zaktualizować budżetu całkowitego: ${errorMsg}`)
    }
  }

  // Create campaign wizard functions
  function openCreateWizard() {
    if (!selectedClient) {
      alert('Najpierw wybierz klienta agencyjnego')
      return
    }
    setShowCreateWizard(true)
    setWizardStep(1)
    setNewCampaignData({
      selectedCampaignId: campaigns.length > 0 ? campaigns[0].id : '',
      newCampaignName: '',
      useExistingCampaign: campaigns.length > 0,
      adGroupName: '',
      displayStart: new Date().toISOString().split('T')[0],
      displayEnd: '',
      dailyBudget: '',
      totalBudget: '',
      maxCpc: '',
      placements: ['listing', 'mainpage'],
      selectedOfferIds: []
    })
  }

  function closeCreateWizard() {
    setShowCreateWizard(false)
    setWizardStep(1)
    setCreatingCampaign(false)
  }

  function toggleWizardPlacement(placementId: string) {
    setNewCampaignData(prev => ({
      ...prev,
      placements: prev.placements.includes(placementId)
        ? prev.placements.filter(p => p !== placementId)
        : [...prev.placements, placementId]
    }))
  }

  function toggleWizardOffer(offerId: string) {
    setNewCampaignData(prev => ({
      ...prev,
      selectedOfferIds: prev.selectedOfferIds.includes(offerId)
        ? prev.selectedOfferIds.filter(id => id !== offerId)
        : [...prev.selectedOfferIds, offerId]
    }))
  }

  async function createCampaignAndAdGroup() {
    if (!selectedClient || !selectedAccount) {
      alert('Brak wybranego klienta lub konta')
      return
    }

    // Validation
    if (newCampaignData.useExistingCampaign && !newCampaignData.selectedCampaignId) {
      alert('Wybierz kampanię')
      return
    }
    if (!newCampaignData.useExistingCampaign && !newCampaignData.newCampaignName.trim()) {
      alert('Wprowadź nazwę nowej kampanii')
      return
    }
    if (!newCampaignData.adGroupName.trim()) {
      alert('Wprowadź nazwę grupy reklam')
      return
    }
    if (!newCampaignData.dailyBudget || parseFloat(newCampaignData.dailyBudget) <= 0) {
      alert('Wprowadź poprawny budżet dzienny')
      return
    }
    if (!newCampaignData.maxCpc || parseFloat(newCampaignData.maxCpc) <= 0) {
      alert('Wprowadź poprawną stawkę Max CPC')
      return
    }
    if (newCampaignData.placements.length === 0) {
      alert('Wybierz przynajmniej jedno miejsce docelowe')
      return
    }
    if (newCampaignData.selectedOfferIds.length === 0) {
      alert('Wybierz przynajmniej jedną ofertę')
      return
    }
    if (!newCampaignData.displayStart) {
      alert('Wprowadź datę rozpoczęcia')
      return
    }

    setCreatingCampaign(true)

    try {
      // Prepare campaign object (either existing or new)
      const campaign = newCampaignData.useExistingCampaign
        ? { campaignId: newCampaignData.selectedCampaignId }
        : { name: newCampaignData.newCampaignName }

      // Create ad group (with or without new campaign)
      const adGroupPayload = {
        campaign: campaign,
        marketplaceId: 'allegro-pl',
        name: newCampaignData.adGroupName,
        status: 'ACTIVE' as const,
        bidding: {
          maxCpc: {
            amount: parseFloat(newCampaignData.maxCpc).toFixed(2),
            currency: 'PLN'
          }
        },
        display: {
          start: newCampaignData.displayStart,
          ...(newCampaignData.displayEnd && { end: newCampaignData.displayEnd })
        },
        placements: {
          ids: newCampaignData.placements
        },
        budget: {
          daily: {
            amount: parseFloat(newCampaignData.dailyBudget).toFixed(2),
            currency: 'PLN'
          },
          ...(newCampaignData.totalBudget && parseFloat(newCampaignData.totalBudget) > 0 && {
            total: {
              amount: parseFloat(newCampaignData.totalBudget).toFixed(2),
              currency: 'PLN'
            }
          })
        },
        offers: {
          offerIds: newCampaignData.selectedOfferIds
        }
      }

      console.log('Creating ad group with payload:', adGroupPayload)

      const adGroup = await createAdGroup(selectedAccount, selectedClient, adGroupPayload)

      console.log('Ad group created:', adGroup)

      // Reload data to see new campaign (if created) and ad group
      await loadData()
      
      const successMsg = newCampaignData.useExistingCampaign
        ? `Grupa reklam "${adGroup.name}" utworzona pomyślnie!`
        : `Kampania "${newCampaignData.newCampaignName}" i grupa reklam "${adGroup.name}" utworzone pomyślnie!`
      
      alert(successMsg)
      closeCreateWizard()
    } catch (err: any) {
      console.error('Failed to create ad group:', err)
      console.error('Error response:', err?.response?.data)
      const errorMsg = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.details?.message || err?.message || 'Nieznany błąd'
      alert(`Nie udało się utworzyć grupy reklam: ${errorMsg}`)
    } finally {
      setCreatingCampaign(false)
    }
  }

  // Filter ad groups by selected campaign
  const filteredAdGroups = selectedCampaign
    ? adGroups.filter(ag => ag.campaignId === selectedCampaign)
    : adGroups

  // Get offers for selected ad group
  const selectedAdGroupData = adGroups.find(ag => ag.id === selectedAdGroup)
  const adGroupOfferIds = selectedAdGroupData?.offers?.offerIds || []
  
  // Match loaded offers with ad group offer IDs
  const matchedOffers = offers.filter(offer => 
    adGroupOfferIds.includes(offer.id.toString())
  )
  
  // For offers not loaded, try to get data from statistics
  const unmatchedOfferIds = adGroupOfferIds.filter(
    id => !matchedOffers.find(o => o.id.toString() === id)
  )
  
  const placeholderOffers = unmatchedOfferIds.map(id => {
    // Try to get name from statistics
    const adGroupStats = selectedAdGroup ? stats.get(selectedAdGroup) : null
    const statData = adGroupStats?.stats?.find(stat => 
      stat.ad.offerId.toString() === id.toString()
    )
    
    const name = statData?.ad.name || `Oferta ${id} (szczegóły niedostępne)`
    
    return {
      id: parseInt(id),
      name: name,
      category: { id: 0 },
      price: { amount: 0, currency: 'PLN' },
      marketplaceId: 'allegro-pl',
      imageUrl: '',
      advertisable: false // Not in offers API = probably not advertisable
    }
  })
  
  const filteredOffers = selectedAdGroup 
    ? [...matchedOffers, ...placeholderOffers]
    : []

  // Filter offers for modal based on search query
  const filteredOffersForModal = offers.filter(offer => {
    if (!offerSearchQuery) return true
    const query = offerSearchQuery.toLowerCase()
    return (
      offer.name.toLowerCase().includes(query) ||
      offer.id.toString().includes(query)
    )
  })

  // Calculate aggregated stats for ad group
  function getAggregatedStats(adGroupId: string) {
    const adGroupStats = stats.get(adGroupId)
    if (!adGroupStats?.stats) return null

    const totals = {
      interest: 0,
      clicks: 0,
      views: 0,
      totalCost: 0,
      soldQuantity: 0,
      sold: 0,
      currency: 'PLN'
    }

    adGroupStats.stats.forEach(stat => {
      stat.dailyStats.forEach(daily => {
        totals.interest += daily.stats.interest || 0
        totals.clicks += daily.stats.clicks || 0
        totals.views += daily.stats.views || 0
        
        // API returns amounts as strings, so parse them
        const totalCostAmount = daily.stats.totalCost?.amount
        totals.totalCost += totalCostAmount ? parseFloat(totalCostAmount.toString()) : 0
        
        totals.soldQuantity += daily.stats.soldQuantity || 0
        
        const soldAmount = daily.stats.sold?.amount
        totals.sold += soldAmount ? parseFloat(soldAmount.toString()) : 0
        
        // Use currency from the first stat if available
        if (daily.stats.totalCost?.currency && totals.currency === 'PLN') {
          totals.currency = daily.stats.totalCost.currency
        }
      })
    })

    const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0
    const avgCpc = totals.clicks > 0 ? totals.totalCost / totals.clicks : 0
    const rateOfReturn = totals.totalCost > 0 ? (totals.sold / totals.totalCost) * 100 : 0

    return { ...totals, ctr, avgCpc, rateOfReturn }
  }

  // Calculate stats for a specific offer in an ad group
  function getOfferStats(adGroupId: string, offerId: number | string) {
    const adGroupStats = stats.get(adGroupId)
    if (!adGroupStats?.stats) return null

    // Find stats for this specific offer
    const offerStat = adGroupStats.stats.find(stat => 
      stat.ad.offerId.toString() === offerId.toString()
    )
    
    if (!offerStat) return null

    const totals = {
      interest: 0,
      clicks: 0,
      views: 0,
      totalCost: 0,
      soldQuantity: 0,
      sold: 0,
      currency: 'PLN'
    }

    offerStat.dailyStats.forEach(daily => {
      totals.interest += daily.stats.interest || 0
      totals.clicks += daily.stats.clicks || 0
      totals.views += daily.stats.views || 0
      
      const totalCostAmount = daily.stats.totalCost?.amount
      totals.totalCost += totalCostAmount ? parseFloat(totalCostAmount.toString()) : 0
      
      totals.soldQuantity += daily.stats.soldQuantity || 0
      
      const soldAmount = daily.stats.sold?.amount
      totals.sold += soldAmount ? parseFloat(soldAmount.toString()) : 0
      
      if (daily.stats.totalCost?.currency && totals.currency === 'PLN') {
        totals.currency = daily.stats.totalCost.currency
      }
    })

    const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0
    const avgCpc = totals.clicks > 0 ? totals.totalCost / totals.clicks : 0
    const rateOfReturn = totals.totalCost > 0 ? (totals.sold / totals.totalCost) * 100 : 0

    return { ...totals, ctr, avgCpc, rateOfReturn }
  }

  // Calculate aggregated stats for campaign (sum of all ad groups)
  function getCampaignAggregatedStats(campaignId: string) {
    const campaignAdGroups = adGroups.filter(ag => ag.campaignId === campaignId)
    
    const totals = {
      interest: 0,
      clicks: 0,
      views: 0,
      totalCost: 0,
      soldQuantity: 0,
      sold: 0,
      currency: 'PLN',
      adGroupCount: campaignAdGroups.length
    }

    campaignAdGroups.forEach(adGroup => {
      const adGroupAggregated = getAggregatedStats(adGroup.id)
      if (adGroupAggregated) {
        totals.interest += adGroupAggregated.interest
        totals.clicks += adGroupAggregated.clicks
        totals.views += adGroupAggregated.views
        totals.totalCost += adGroupAggregated.totalCost
        totals.soldQuantity += adGroupAggregated.soldQuantity
        totals.sold += adGroupAggregated.sold
        
        if (adGroupAggregated.currency && totals.currency === 'PLN') {
          totals.currency = adGroupAggregated.currency
        }
      }
    })

    const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0
    const avgCpc = totals.clicks > 0 ? totals.totalCost / totals.clicks : 0
    const rateOfReturn = totals.totalCost > 0 ? (totals.sold / totals.totalCost) * 100 : 0

    return { ...totals, ctr, avgCpc, rateOfReturn }
  }

  return (
    <div className="allegro-ads">
      <h1>Allegro Ads - Zarządzanie Kampaniami</h1>

      {/* Account and Date Selection */}
      <div className="filters">
        <div className="filter-group">
          <label>Konto Allegro:</label>
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            <option value="">Wybierz konto</option>
            {accounts?.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Klient agencji {adsClients.length > 0 && `(${adsClients.length})`}:</label>
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            disabled={!selectedAccount || loadingClients}
          >
            <option value="">
              {loadingClients ? 'Ładowanie...' : 'Wybierz klienta'}
            </option>
            {adsClients?.map(client => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.type})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Data od:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo}
          />
        </div>

        <div className="filter-group">
          <label>Data do:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button onClick={loadData} disabled={loading || !selectedAccount || !selectedClient}>
          {loading ? 'Ładowanie...' : 'Załaduj dane'}
        </button>

        <button onClick={openCreateWizard} disabled={!selectedClient} className="btn-create">
          ➕ Nowa grupa reklam
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {accounts?.length === 0 && !loading && (
        <div className="empty-state">
          <p>Brak połączonych kont Allegro. Przejdź do <a href="/integrations">Integracji</a>, aby połączyć konto.</p>
        </div>
      )}

      {/* Campaigns Table */}
      {campaigns.length > 0 && (
        <div className="section">
          <h2>Kampanie ({campaigns.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Status</th>
                <th>Marketplace</th>
                <th>Grupy reklam</th>
                <th>Wyświetlenia</th>
                <th>Kliknięcia</th>
                <th>CTR %</th>
                <th>Zainteresowanie</th>
                <th>Koszt</th>
                <th>Śr. CPC</th>
                <th>Sprzedaż</th>
                <th>ROAS %</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => {
                const campaignStats = getCampaignAggregatedStats(campaign.id)
                return (
                  <tr
                    key={campaign.id}
                    className={selectedCampaign === campaign.id ? 'selected' : ''}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{campaign.name}</span>
                        <button
                          onClick={() => openNameEditModal('campaign', campaign.id, campaign.name)}
                          className="icon-button"
                          title="Edytuj nazwę kampanii"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${campaign.status.toLowerCase()}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td>{campaign.marketplaceId}</td>
                    <td>{campaignStats?.adGroupCount || 0}</td>
                    <td>{campaignStats?.views || '-'}</td>
                    <td>{campaignStats?.clicks || '-'}</td>
                    <td>{campaignStats && typeof campaignStats.ctr === 'number' ? campaignStats.ctr.toFixed(2) : '-'}</td>
                    <td>{campaignStats?.interest || '-'}</td>
                    <td>{campaignStats && typeof campaignStats.totalCost === 'number' ? `${campaignStats.totalCost.toFixed(2)} ${campaignStats.currency}` : '-'}</td>
                    <td>{campaignStats && typeof campaignStats.avgCpc === 'number' ? `${campaignStats.avgCpc.toFixed(2)} ${campaignStats.currency}` : '-'}</td>
                    <td>{campaignStats && typeof campaignStats.sold === 'number' ? `${campaignStats.sold.toFixed(2)} ${campaignStats.currency}` : '-'}</td>
                    <td>{campaignStats && typeof campaignStats.rateOfReturn === 'number' ? campaignStats.rateOfReturn.toFixed(2) : '-'}</td>
                    <td>
                      <select
                        value={campaign.status}
                        onChange={(e) => handleCampaignStatusChange(campaign.id, e.target.value as 'ACTIVE' | 'PAUSED')}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAUSED">PAUSED</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ad Groups Table */}
      {filteredAdGroups.length > 0 && (
        <div className="section">
          <h2>
            Grupy Reklam {selectedCampaign && `(Kampania: ${campaigns.find(c => c.id === selectedCampaign)?.name})`} ({filteredAdGroups.length})
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Status</th>
                <th>Okres</th>
                <th>Budżet dzienny</th>
                <th>Budżet całkowity</th>
                <th>Max CPC</th>
                <th>Miejsca docelowe</th>
                <th>Liczba ofert</th>
                <th>Wyświetlenia</th>
                <th>Kliknięcia</th>
                <th>CTR %</th>
                <th>Zainteresowanie</th>
                <th>Koszt</th>
                <th>Śr. CPC</th>
                <th>Sprzedaż</th>
                <th>ROAS %</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdGroups.map(adGroup => {
                const aggregated = getAggregatedStats(adGroup.id)
                return (
                  <tr
                    key={adGroup.id}
                    className={selectedAdGroup === adGroup.id ? 'selected' : ''}
                    onClick={() => setSelectedAdGroup(adGroup.id)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{adGroup.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openNameEditModal('adGroup', adGroup.id, adGroup.name)
                          }}
                          className="icon-button"
                          title="Edytuj nazwę grupy reklam"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td title="Kliknij wiersz aby zobaczyć oferty">
                      <span className={`status-badge ${adGroup.status.toLowerCase()}`}>
                        {adGroup.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {adGroup.display?.start || '-'} / {adGroup.display?.end || '-'}
                        </span>
                        {adGroup.display?.start && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openDisplayEditModal(adGroup); }}
                            className="icon-button"
                            title="Edytuj okres emisji"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {adGroup.budget?.daily?.amount ? `${adGroup.budget.daily.amount} ${adGroup.budget.daily.currency}` : '-'}
                        </span>
                        {adGroup.budget?.daily?.amount && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openBudgetEditModal(adGroup); }}
                            className="icon-button"
                            title="Edytuj budżet dzienny"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {adGroup.budget?.total?.amount ? `${adGroup.budget.total.amount} ${adGroup.budget.total.currency}` : '-'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openTotalBudgetEditModal(adGroup); }}
                          className="icon-button"
                          title="Edytuj budżet całkowity"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {adGroup.bidding?.maxCpc?.amount ? `${adGroup.bidding.maxCpc.amount} ${adGroup.bidding.maxCpc.currency}` : '-'}
                        </span>
                        {adGroup.bidding?.maxCpc?.amount && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openMaxCpcEditModal(adGroup); }}
                            className="icon-button"
                            title="Edytuj Max CPC"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {adGroup.placements?.ids?.join(', ') || '-'}
                        </span>
                        {adGroup.placements?.ids && adGroup.placements.ids.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openPlacementsEditModal(adGroup); }}
                            className="icon-button"
                            title="Edytuj miejsca emisji"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{adGroup.offers?.offerIds?.length || 0}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openOffersEditModal(adGroup); }}
                          className="icon-button"
                          title="Edytuj oferty w grupie"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated?.views || '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated?.clicks || '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated && typeof aggregated.ctr === 'number' ? aggregated.ctr.toFixed(2) : '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated?.interest || '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated && typeof aggregated.totalCost === 'number' ? `${aggregated.totalCost.toFixed(2)} ${aggregated.currency}` : '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated && typeof aggregated.avgCpc === 'number' ? `${aggregated.avgCpc.toFixed(2)} ${aggregated.currency}` : '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated && typeof aggregated.sold === 'number' ? `${aggregated.sold.toFixed(2)} ${aggregated.currency}` : '-'}</td>
                    <td title="Kliknij aby zobaczyć oferty">{aggregated && typeof aggregated.rateOfReturn === 'number' ? aggregated.rateOfReturn.toFixed(2) : '-'}</td>
                    <td>
                      <select
                        value={adGroup.status}
                        onChange={(e) => handleAdGroupStatusChange(adGroup.id, e.target.value as 'ACTIVE' | 'PAUSED')}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAUSED">PAUSED</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Offers Table */}
      {selectedAdGroup && (
        <div className="section">
          <h2>
            Oferty (Grupa: {adGroups.find(ag => ag.id === selectedAdGroup)?.name}) ({filteredOffers.length})
          </h2>
          {filteredOffers.length === 0 && (
            <p style={{ padding: 20, color: 'var(--text-secondary)' }}>
              Brak ofert w tej grupie reklam. Oferty: {adGroupOfferIds.join(', ') || 'brak'}
            </p>
          )}
          {filteredOffers.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Zdjęcie</th>
                <th>ID</th>
                <th>Nazwa</th>
                <th>Kategoria</th>
                <th>Cena</th>
                <th>Wyświetlenia</th>
                <th>Kliknięcia</th>
                <th>CTR %</th>
                <th>Zainteresowanie</th>
                <th>Koszt</th>
                <th>Śr. CPC</th>
                <th>Sprzedaż (szt.)</th>
                <th>Sprzedaż (zł)</th>
                <th>ROAS %</th>
                <th>Możliwość reklamowania</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map(offer => {
                const offerMetrics = selectedAdGroup ? getOfferStats(selectedAdGroup, offer.id) : null
                return (
                  <tr key={offer.id}>
                    <td>
                      {offer.imageUrl ? (
                        <img 
                          src={offer.imageUrl} 
                          alt={offer.name} 
                          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const placeholder = document.createElement('div')
                              placeholder.style.width = '50px'
                              placeholder.style.height = '50px'
                              placeholder.style.background = '#f0f0f0'
                              placeholder.style.borderRadius = '4px'
                              placeholder.style.display = 'flex'
                              placeholder.style.alignItems = 'center'
                              placeholder.style.justifyContent = 'center'
                              placeholder.style.fontSize = '10px'
                              placeholder.style.color = '#999'
                              placeholder.textContent = 'Brak'
                              parent.appendChild(placeholder)
                            }
                          }}
                        />
                      ) : (
                        <div style={{ width: 50, height: 50, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>
                          Brak
                        </div>
                      )}
                    </td>
                    <td>{offer.id}</td>
                    <td>{offer.name}</td>
                    <td>{offer.category?.id > 0 ? offer.category.id : '-'}</td>
                    <td>
                      {offer.price?.amount && offer.price.amount > 0 
                        ? `${offer.price.amount} ${offer.price.currency}` 
                        : '-'}
                    </td>
                    <td>{offerMetrics?.views || '-'}</td>
                    <td>{offerMetrics?.clicks || '-'}</td>
                    <td>{offerMetrics && typeof offerMetrics.ctr === 'number' ? offerMetrics.ctr.toFixed(2) : '-'}</td>
                    <td>{offerMetrics?.interest || '-'}</td>
                    <td>{offerMetrics && typeof offerMetrics.totalCost === 'number' ? `${offerMetrics.totalCost.toFixed(2)} ${offerMetrics.currency}` : '-'}</td>
                    <td>{offerMetrics && typeof offerMetrics.avgCpc === 'number' ? `${offerMetrics.avgCpc.toFixed(2)} ${offerMetrics.currency}` : '-'}</td>
                    <td>{offerMetrics?.soldQuantity || '-'}</td>
                    <td>{offerMetrics && typeof offerMetrics.sold === 'number' ? `${offerMetrics.sold.toFixed(2)} ${offerMetrics.currency}` : '-'}</td>
                    <td>{offerMetrics && typeof offerMetrics.rateOfReturn === 'number' ? offerMetrics.rateOfReturn.toFixed(2) : '-'}</td>
                    <td>
                      <span className={`status-badge ${offer.advertisable ? 'active' : 'paused'}`}>
                        {offer.advertisable ? 'TAK' : 'NIE'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
        </div>
      )}

      {!loading && campaigns.length === 0 && selectedAccount && (
        <div className="empty-state">
          <p>Brak kampanii dla wybranego konta. Kliknij "Załaduj dane" aby odświeżyć.</p>
        </div>
      )}

      {/* Budget Edit Modal */}
      {editingBudget && (
        <div className="modal-overlay" onClick={closeBudgetEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj budżet dzienny</h3>
              <button className="modal-close" onClick={closeBudgetEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingBudget.adGroupName}</p>
              <p><strong>Aktualny budżet:</strong> {editingBudget.currentAmount} {editingBudget.currency}</p>
              
              <div className="form-group">
                <label htmlFor="newBudget">Nowy budżet dzienny ({editingBudget.currency}):</label>
                <input
                  id="newBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  placeholder="Wprowadź kwotę"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeBudgetEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveBudgetChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Max CPC Edit Modal */}
      {editingMaxCpc && (
        <div className="modal-overlay" onClick={closeMaxCpcEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj Max CPC</h3>
              <button className="modal-close" onClick={closeMaxCpcEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingMaxCpc.adGroupName}</p>
              <p><strong>Aktualna stawka Max CPC:</strong> {editingMaxCpc.currentAmount} {editingMaxCpc.currency}</p>
              
              <div className="form-group">
                <label htmlFor="newMaxCpc">Nowa stawka Max CPC ({editingMaxCpc.currency}):</label>
                <input
                  id="newMaxCpc"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newMaxCpcAmount}
                  onChange={(e) => setNewMaxCpcAmount(e.target.value)}
                  placeholder="Wprowadź stawkę"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeMaxCpcEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveMaxCpcChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placements Edit Modal */}
      {editingPlacements && (
        <div className="modal-overlay" onClick={closePlacementsEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj miejsca emisji</h3>
              <button className="modal-close" onClick={closePlacementsEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingPlacements.adGroupName}</p>
              <p style={{ marginBottom: 20 }}>
                <strong>Aktualnie wybrane:</strong> {editingPlacements.currentPlacements.join(', ') || 'Brak'}
              </p>
              
              <div className="form-group">
                <label>Wybierz miejsca emisji:</label>
                <div className="checkbox-group">
                  {availablePlacements.map(placement => (
                    <label key={placement.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedPlacements.includes(placement.id)}
                        onChange={() => togglePlacement(placement.id)}
                      />
                      <span>{placement.name}</span>
                    </label>
                  ))}
                </div>
                <p className="help-text">
                  Wybrano: {selectedPlacements.length} {selectedPlacements.length === 1 ? 'miejsce' : 'miejsc'}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closePlacementsEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={savePlacementsChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offers Edit Modal */}
      {editingOffers && (
        <div className="modal-overlay" onClick={closeOffersEditModal}>
          <div className="modal-content offers-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj oferty w grupie</h3>
              <button className="modal-close" onClick={closeOffersEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingOffers.adGroupName}</p>
              <p style={{ marginBottom: 20 }}>
                <strong>Aktualnie wybrane oferty:</strong> {editingOffers.currentOfferIds.length}
              </p>
              
              <div className="form-group">
                <label htmlFor="offerSearch">Wyszukaj oferty:</label>
                <input
                  id="offerSearch"
                  type="text"
                  value={offerSearchQuery}
                  onChange={(e) => setOfferSearchQuery(e.target.value)}
                  placeholder="Szukaj po nazwie lub ID..."
                  className="search-input"
                />
              </div>

              <div className="form-group">
                <label>Dostępne oferty ({filteredOffersForModal.length}):</label>
                <div className="offers-list">
                  {filteredOffersForModal.length === 0 ? (
                    <p className="help-text">Brak ofert do wyświetlenia</p>
                  ) : (
                    filteredOffersForModal.map(offer => (
                      <label key={offer.id} className="offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedOfferIds.includes(offer.id.toString())}
                          onChange={() => toggleOffer(offer.id.toString())}
                        />
                        <div className="offer-info">
                          {offer.imageUrl && (
                            <img 
                              src={offer.imageUrl} 
                              alt={offer.name}
                              className="offer-thumbnail"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          )}
                          <div className="offer-details">
                            <div className="offer-name">{offer.name}</div>
                            <div className="offer-meta">
                              ID: {offer.id} | Cena: {offer.price?.amount} {offer.price?.currency}
                              {!offer.advertisable && <span className="not-advertisable"> (niedostępna do promowania)</span>}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="help-text">
                  Wybrano: {selectedOfferIds.length} {selectedOfferIds.length === 1 ? 'ofertę' : 'ofert'}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeOffersEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveOffersChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Edit Modal */}
      {editingName && (
        <div className="modal-overlay" onClick={closeNameEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj nazwę {editingName.type === 'campaign' ? 'kampanii' : 'grupy reklam'}</h3>
              <button className="modal-close" onClick={closeNameEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Aktualna nazwa:</strong> {editingName.currentName}</p>
              
              <div className="form-group">
                <label htmlFor="newName">Nowa nazwa:</label>
                <input
                  id="newName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Wprowadź nową nazwę"
                  autoFocus
                  maxLength={100}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeNameEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveNameChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display Period Edit Modal */}
      {editingDisplay && (
        <div className="modal-overlay" onClick={closeDisplayEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj okres emisji</h3>
              <button className="modal-close" onClick={closeDisplayEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingDisplay.adGroupName}</p>
              <p style={{ marginBottom: 20 }}>
                <strong>Aktualny okres:</strong> {editingDisplay.currentStart} - {editingDisplay.currentEnd || 'bez daty końcowej'}
              </p>
              
              <div className="form-group">
                <label htmlFor="displayStart">Data rozpoczęcia:</label>
                <input
                  id="displayStart"
                  type="date"
                  value={newDisplayStart}
                  onChange={(e) => setNewDisplayStart(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="displayEnd">Data zakończenia (opcjonalna):</label>
                <input
                  id="displayEnd"
                  type="date"
                  value={newDisplayEnd}
                  onChange={(e) => setNewDisplayEnd(e.target.value)}
                  min={newDisplayStart}
                />
                <p className="help-text">Pozostaw puste aby emisja trwała bezterminowo</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeDisplayEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveDisplayChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Total Budget Edit Modal */}
      {editingTotalBudget && (
        <div className="modal-overlay" onClick={closeTotalBudgetEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edytuj budżet całkowity</h3>
              <button className="modal-close" onClick={closeTotalBudgetEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Grupa reklam:</strong> {editingTotalBudget.adGroupName}</p>
              <p><strong>Aktualny budżet całkowity:</strong> {editingTotalBudget.currentAmount} {editingTotalBudget.currency}</p>
              
              <div className="form-group">
                <label htmlFor="newTotalBudget">Nowy budżet całkowity ({editingTotalBudget.currency}):</label>
                <input
                  id="newTotalBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTotalBudgetAmount}
                  onChange={(e) => setNewTotalBudgetAmount(e.target.value)}
                  placeholder="Wprowadź kwotę"
                  autoFocus
                />
                <p className="help-text">Maksymalny budżet całkowity na całą kampanię</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeTotalBudgetEditModal}>
                Anuluj
              </button>
              <button className="btn-primary" onClick={saveTotalBudgetChange}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Wizard Modal */}
      {showCreateWizard && (
        <div className="modal-overlay wizard-overlay" onClick={closeCreateWizard}>
          <div className="modal-content wizard-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nowa grupa reklam - Krok {wizardStep} z 3</h3>
              <button className="modal-close" onClick={closeCreateWizard}>×</button>
            </div>

            <div className="modal-body wizard-body">
              {/* Step 1: Campaign Selection */}
              {wizardStep === 1 && (
                <div className="wizard-step">
                  <h4>1. Wybór kampanii</h4>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        checked={newCampaignData.useExistingCampaign}
                        onChange={() => setNewCampaignData(prev => ({ ...prev, useExistingCampaign: true }))}
                      />
                      <span>Użyj istniejącej kampanii</span>
                    </label>
                  </div>

                  {newCampaignData.useExistingCampaign && (
                    <div className="form-group">
                      <label htmlFor="selectedCampaign">Wybierz kampanię *</label>
                      <select
                        id="selectedCampaign"
                        value={newCampaignData.selectedCampaignId}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, selectedCampaignId: e.target.value }))}
                        autoFocus
                      >
                        <option value="">Wybierz kampanię...</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} ({campaign.status})
                          </option>
                        ))}
                      </select>
                      {campaigns.length === 0 && (
                        <p className="help-text" style={{ color: 'orange' }}>
                          Brak kampanii. Utwórz pierwszą kampanię w panelu Allegro lub spróbuj utworzyć nową poniżej.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        checked={!newCampaignData.useExistingCampaign}
                        onChange={() => setNewCampaignData(prev => ({ ...prev, useExistingCampaign: false }))}
                      />
                      <span>Utwórz nową kampanię wraz z grupą reklam</span>
                    </label>
                  </div>

                  {!newCampaignData.useExistingCampaign && (
                    <div className="form-group">
                      <label htmlFor="newCampaignName">Nazwa nowej kampanii *</label>
                      <input
                        id="newCampaignName"
                        type="text"
                        value={newCampaignData.newCampaignName}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, newCampaignName: e.target.value }))}
                        placeholder="np. Kampania wiosenna 2025"
                      />
                      <p className="help-text">
                        Kampania i grupa reklam zostaną utworzone jednocześnie
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Ad Group Configuration */}
              {wizardStep === 2 && (
                <div className="wizard-step">
                  <h4>2. Konfiguracja grupy reklam</h4>
                  
                  <div className="form-group">
                    <label htmlFor="adGroupName">Nazwa grupy reklam *</label>
                    <input
                      id="adGroupName"
                      type="text"
                      value={newCampaignData.adGroupName}
                      onChange={(e) => setNewCampaignData(prev => ({ ...prev, adGroupName: e.target.value }))}
                      placeholder="np. Promocja rowery górskie"
                      autoFocus
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="displayStart">Data rozpoczęcia *</label>
                      <input
                        id="displayStart"
                        type="date"
                        value={newCampaignData.displayStart}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, displayStart: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="displayEnd">Data zakończenia (opcjonalnie)</label>
                      <input
                        id="displayEnd"
                        type="date"
                        value={newCampaignData.displayEnd}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, displayEnd: e.target.value }))}
                        min={newCampaignData.displayStart}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="dailyBudget">Budżet dzienny (PLN) *</label>
                      <input
                        id="dailyBudget"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCampaignData.dailyBudget}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, dailyBudget: e.target.value }))}
                        placeholder="np. 50.00"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="totalBudget">Budżet całkowity (PLN) (opcjonalnie)</label>
                      <input
                        id="totalBudget"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCampaignData.totalBudget}
                        onChange={(e) => setNewCampaignData(prev => ({ ...prev, totalBudget: e.target.value }))}
                        placeholder="np. 1000.00"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxCpc">Max CPC (PLN) *</label>
                    <input
                      id="maxCpc"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newCampaignData.maxCpc}
                      onChange={(e) => setNewCampaignData(prev => ({ ...prev, maxCpc: e.target.value }))}
                      placeholder="np. 2.50"
                    />
                    <p className="help-text">Maksymalna stawka za kliknięcie</p>
                  </div>

                  <div className="form-group">
                    <label>Miejsca docelowe *</label>
                    <div className="checkbox-group">
                      {['listing', 'mainpage', 'offer', 'category'].map(placement => (
                        <label key={placement} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newCampaignData.placements.includes(placement)}
                            onChange={() => toggleWizardPlacement(placement)}
                          />
                          <span>
                            {placement === 'listing' && 'Listing (wyniki wyszukiwania)'}
                            {placement === 'mainpage' && 'Strona główna'}
                            {placement === 'offer' && 'Strona oferty'}
                            {placement === 'category' && 'Strona kategorii'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Offer Selection */}
              {wizardStep === 3 && (
                <div className="wizard-step">
                  <h4>3. Wybór ofert</h4>
                  
                  <div className="form-group">
                    <label htmlFor="wizardOfferSearch">Szukaj oferty</label>
                    <input
                      id="wizardOfferSearch"
                      type="text"
                      className="search-input"
                      value={wizardOfferSearch}
                      onChange={(e) => setWizardOfferSearch(e.target.value)}
                      placeholder="Wpisz nazwę oferty lub ID..."
                    />
                  </div>

                  <div className="offers-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <p>
                      Wybrano: <strong>{newCampaignData.selectedOfferIds.length}</strong> ofert
                    </p>
                    {offers
                      .filter(offer => 
                        offer.advertisable &&
                        (wizardOfferSearch === '' || 
                         offer.name.toLowerCase().includes(wizardOfferSearch.toLowerCase()) ||
                         offer.id.toString().includes(wizardOfferSearch))
                      )
                      .map(offer => (
                        <label key={offer.id} className="offer-checkbox-label">
                          <input
                            type="checkbox"
                            checked={newCampaignData.selectedOfferIds.includes(offer.id.toString())}
                            onChange={() => toggleWizardOffer(offer.id.toString())}
                          />
                          <img 
                            src={offer.imageUrl} 
                            alt={offer.name}
                            className="offer-thumbnail"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50"%3E%3Crect fill="%23ddd" width="50" height="50"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                            }}
                          />
                          <div className="offer-details">
                            <div><strong>{offer.name}</strong></div>
                            <div>ID: {offer.id} | {offer.price.amount} {offer.price.currency}</div>
                          </div>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer wizard-footer">
              <div className="wizard-steps">
                <span className={wizardStep === 1 ? 'active' : ''}>1</span>
                <span className={wizardStep === 2 ? 'active' : ''}>2</span>
                <span className={wizardStep === 3 ? 'active' : ''}>3</span>
              </div>
              
              <div className="wizard-buttons">
                {wizardStep > 1 && (
                  <button 
                    className="btn-secondary" 
                    onClick={() => setWizardStep(prev => prev - 1)}
                    disabled={creatingCampaign}
                  >
                    ← Wstecz
                  </button>
                )}
                
                {wizardStep < 3 ? (
                  <button 
                    className="btn-primary" 
                    onClick={() => setWizardStep(prev => prev + 1)}
                    disabled={
                      (wizardStep === 1 && newCampaignData.useExistingCampaign && !newCampaignData.selectedCampaignId) ||
                      (wizardStep === 1 && !newCampaignData.useExistingCampaign && !newCampaignData.newCampaignName.trim()) ||
                      (wizardStep === 2 && (!newCampaignData.adGroupName.trim() || !newCampaignData.dailyBudget || !newCampaignData.maxCpc || newCampaignData.placements.length === 0))
                    }
                  >
                    Dalej →
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={createCampaignAndAdGroup}
                    disabled={creatingCampaign || newCampaignData.selectedOfferIds.length === 0}
                  >
                    {creatingCampaign ? 'Tworzenie...' : 'Utwórz grupę reklam'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

