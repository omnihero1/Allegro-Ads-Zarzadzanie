export interface Schedule {
  id: string
  accountId: string // ID konta Allegro
  adsClientId: string // ID klienta agencyjnego
  name: string // "Kampania Wieczorna"
  isActive: boolean
  
  // Czas
  timeMode: 'allDay' | 'specific'
  startTime?: string // "18:00"
  endTime?: string // "22:00"
  daysOfWeek: number[] // [1,2,3,4,5] = Pon-Pią, 0=Niedziela
  
  // Akcje
  actionType: 'cpc' | 'budget' | 'status'
  changeMode: 'percentage' | 'amount' // dla CPC/budżetu
  changeValue: number // np. 20 (dla 20% lub 20 PLN)
  statusValue?: 'ACTIVE' | 'PAUSED' // dla zmiany statusu
  
  // Grupy reklam (puste = wszystkie grupy)
  adGroupIds: string[]
  
  // Metadata
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  lastExecuted?: FirebaseFirestore.Timestamp
  executionLog: ExecutionLogEntry[]
}

export interface ExecutionLogEntry {
  timestamp: FirebaseFirestore.Timestamp
  success: boolean
  message: string
  affectedAdGroupIds?: string[]
  error?: string
}

export interface AdGroup {
  id: string
  name: string
  campaignId: string
  status: 'ACTIVE' | 'PAUSED'
  bidding?: {
    maxCpc?: {
      amount: string
      currency: string
    }
  }
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
}

