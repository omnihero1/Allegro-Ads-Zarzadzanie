import { db } from '../firebase'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'

export interface Schedule {
  id: string
  accountId: string
  adsClientId: string
  name: string
  isActive: boolean
  
  // Time
  timeMode: 'allDay' | 'specific'
  startTime?: string
  endTime?: string
  daysOfWeek: number[] // 0=Sunday, 1=Monday, etc.
  
  // Actions
  actionType: 'cpc' | 'budget' | 'status'
  changeMode: 'percentage' | 'amount'
  changeValue: number
  statusValue?: 'ACTIVE' | 'PAUSED'
  
  // Ad Groups
  adGroupIds: string[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastExecuted?: Date
  executionLog: ExecutionLogEntry[]
}

export interface ExecutionLogEntry {
  timestamp: Date
  success: boolean
  message: string
  affectedAdGroupIds?: string[]
  error?: string
}

export interface CreateScheduleData {
  accountId: string
  adsClientId: string
  name: string
  isActive: boolean
  timeMode: 'allDay' | 'specific'
  startTime?: string
  endTime?: string
  daysOfWeek: number[]
  actionType: 'cpc' | 'budget' | 'status'
  changeMode: 'percentage' | 'amount'
  changeValue: number
  statusValue?: 'ACTIVE' | 'PAUSED'
  adGroupIds: string[]
}

export interface UpdateScheduleData {
  name?: string
  isActive?: boolean
  timeMode?: 'allDay' | 'specific'
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
  actionType?: 'cpc' | 'budget' | 'status'
  changeMode?: 'percentage' | 'amount'
  changeValue?: number
  statusValue?: 'ACTIVE' | 'PAUSED'
  adGroupIds?: string[]
}

const SCHEDULES_COLLECTION = 'schedules'

/**
 * Get all schedules for an account
 */
export async function getSchedules(accountId: string): Promise<Schedule[]> {
  const q = query(
    collection(db, SCHEDULES_COLLECTION),
    where('accountId', '==', accountId),
    orderBy('createdAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastExecuted: data.lastExecuted?.toDate(),
      executionLog: (data.executionLog || []).map((log: any) => ({
        ...log,
        timestamp: log.timestamp?.toDate() || new Date()
      }))
    } as Schedule
  })
}

/**
 * Get single schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<Schedule | null> {
  const docRef = doc(db, SCHEDULES_COLLECTION, scheduleId)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    return null
  }
  
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    lastExecuted: data.lastExecuted?.toDate(),
    executionLog: (data.executionLog || []).map((log: any) => ({
      ...log,
      timestamp: log.timestamp?.toDate() || new Date()
    }))
  } as Schedule
}

/**
 * Create new schedule
 */
export async function createSchedule(data: CreateScheduleData): Promise<string> {
  const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    executionLog: []
  })
  
  return docRef.id
}

/**
 * Update schedule
 */
export async function updateSchedule(
  scheduleId: string, 
  data: UpdateScheduleData
): Promise<void> {
  const docRef = doc(db, SCHEDULES_COLLECTION, scheduleId)
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const docRef = doc(db, SCHEDULES_COLLECTION, scheduleId)
  await deleteDoc(docRef)
}

/**
 * Toggle schedule active state
 */
export async function toggleSchedule(scheduleId: string, isActive: boolean): Promise<void> {
  await updateSchedule(scheduleId, { isActive })
}

/**
 * Get day name from number
 */
export function getDayName(day: number): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
  return days[day] || ''
}

/**
 * Get action type display name
 */
export function getActionTypeDisplay(actionType: string): string {
  const types: Record<string, string> = {
    cpc: 'Stawka CPC',
    budget: 'Budżet dzienny',
    status: 'Status kampanii'
  }
  return types[actionType] || actionType
}

/**
 * Get change mode display name
 */
export function getChangeModeDisplay(mode: string): string {
  const modes: Record<string, string> = {
    percentage: 'Procentowo',
    amount: 'Kwotowo'
  }
  return modes[mode] || mode
}

