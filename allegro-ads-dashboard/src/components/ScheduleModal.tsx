import { useState, useEffect } from 'react'
import { 
  createSchedule, 
  updateSchedule,
  type Schedule,
  type CreateScheduleData,
  type UpdateScheduleData
} from '../services/schedules'
import { 
  getCampaigns, 
  getAdGroups, 
  getAdsClients,
  type Campaign,
  type AdGroup 
} from '../services/allegroCampaigns'
import './ScheduleModal.css'

interface ScheduleModalProps {
  schedule: Schedule | null
  accountId: string
  onClose: () => void
  onSave: () => void
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Poniedziałek' },
  { value: 2, label: 'Wtorek' },
  { value: 3, label: 'Środa' },
  { value: 4, label: 'Czwartek' },
  { value: 5, label: 'Piątek' },
  { value: 6, label: 'Sobota' },
  { value: 0, label: 'Niedziela' },
]

export function ScheduleModal({ schedule, accountId, onClose, onSave }: ScheduleModalProps) {
  // Form state
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [timeMode, setTimeMode] = useState<'allDay' | 'specific'>('allDay')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5])
  const [actionType, setActionType] = useState<'cpc' | 'budget' | 'status'>('cpc')
  const [changeMode, setChangeMode] = useState<'percentage' | 'amount'>('percentage')
  const [changeValue, setChangeValue] = useState(0)
  const [statusValue, setStatusValue] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<string[]>([])

  // Data loading state
  const [adsClients, setAdsClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [adGroups, setAdGroups] = useState<AdGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load form data if editing
  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setIsActive(schedule.isActive)
      setTimeMode(schedule.timeMode)
      setStartTime(schedule.startTime || '09:00')
      setEndTime(schedule.endTime || '18:00')
      setDaysOfWeek(schedule.daysOfWeek)
      setActionType(schedule.actionType)
      setChangeMode(schedule.changeMode)
      setChangeValue(schedule.changeValue)
      setStatusValue(schedule.statusValue || 'ACTIVE')
      setSelectedAdGroupIds(schedule.adGroupIds)
      setSelectedClient(schedule.adsClientId)
    }
  }, [schedule])

  // Load ads clients
  useEffect(() => {
    loadAdsClients()
  }, [accountId])

  // Load campaigns when client changes
  useEffect(() => {
    if (selectedClient) {
      loadCampaigns()
    }
  }, [selectedClient])

  // Load ad groups when campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      loadAdGroups()
    }
  }, [selectedCampaign])

  async function loadAdsClients() {
    try {
      const data = await getAdsClients(accountId)
      setAdsClients(data.clients || [])
      
      // Auto-select if editing
      if (schedule && schedule.adsClientId) {
        setSelectedClient(schedule.adsClientId)
      } else if (data.clients && data.clients.length > 0) {
        setSelectedClient(data.clients[0].id)
      }
    } catch (err) {
      console.error('Failed to load ads clients:', err)
    }
  }

  async function loadCampaigns() {
    if (!selectedClient) return
    
    setLoading(true)
    try {
      const data = await getCampaigns(accountId, selectedClient, 'allegro-pl', ['ACTIVE', 'PAUSED'])
      setCampaigns(data.campaigns || [])
      
      if (data.campaigns && data.campaigns.length > 0) {
        setSelectedCampaign(data.campaigns[0].id)
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAdGroups() {
    if (!selectedClient || !selectedCampaign) return
    
    setLoading(true)
    try {
      const statusArray = ['ACTIVE', 'PAUSED']
      const data = await getAdGroups(accountId, selectedClient, 'allegro-pl', statusArray.join(','))
      
      // Filter by selected campaign
      const filtered = data.adGroups.filter((ag: AdGroup) => ag.campaignId === selectedCampaign)
      setAdGroups(filtered)
    } catch (err) {
      console.error('Failed to load ad groups:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleDay(day: number) {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  function toggleAdGroup(adGroupId: string) {
    setSelectedAdGroupIds(prev => 
      prev.includes(adGroupId)
        ? prev.filter(id => id !== adGroupId)
        : [...prev, adGroupId]
    )
  }

  function selectAllDays() {
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])
  }

  function selectWeekdays() {
    setDaysOfWeek([1, 2, 3, 4, 5])
  }

  function selectAllAdGroups() {
    setSelectedAdGroupIds(adGroups.map(ag => ag.id))
  }

  function deselectAllAdGroups() {
    setSelectedAdGroupIds([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validation
    if (!name.trim()) {
      setError('Nazwa harmonogramu jest wymagana')
      return
    }
    
    if (!selectedClient) {
      setError('Wybierz klienta agencyjnego')
      return
    }
    
    if (daysOfWeek.length === 0) {
      setError('Wybierz przynajmniej jeden dzień tygodnia')
      return
    }
    
    if (timeMode === 'specific' && (!startTime || !endTime)) {
      setError('Podaj godziny rozpoczęcia i zakończenia')
      return
    }
    
    if (actionType !== 'status' && changeValue === 0) {
      setError('Podaj wartość zmiany')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const scheduleData: CreateScheduleData | UpdateScheduleData = {
        name: name.trim(),
        isActive,
        timeMode,
        startTime: timeMode === 'specific' ? startTime : undefined,
        endTime: timeMode === 'specific' ? endTime : undefined,
        daysOfWeek,
        actionType,
        changeMode,
        changeValue,
        statusValue: actionType === 'status' ? statusValue : undefined,
        adGroupIds: selectedAdGroupIds
      }
      
      if (schedule) {
        // Update existing
        await updateSchedule(schedule.id, scheduleData)
      } else {
        // Create new
        await createSchedule({
          ...scheduleData,
          accountId,
          adsClientId: selectedClient
        } as CreateScheduleData)
      }
      
      onSave()
    } catch (err: any) {
      console.error('Failed to save schedule:', err)
      setError('Nie udało się zapisać harmonogramu: ' + (err.message || 'Nieznany błąd'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{schedule ? 'Edytuj Harmonogram' : 'Nowy Harmonogram'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            
            {/* Basic Info */}
            <div className="form-section">
              <h3>Podstawowe informacje</h3>
              
              <div className="form-group">
                <label>Nazwa harmonogramu *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Kampania Wieczorna"
                  required
                />
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Aktywny
                </label>
              </div>
            </div>
            
            {/* Client Selection */}
            <div className="form-section">
              <h3>Klient agencyjny</h3>
              
              <div className="form-group">
                <label>Klient *</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  required
                  disabled={!!schedule}
                >
                  <option value="">-- Wybierz klienta --</option>
                  {adsClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.id}
                    </option>
                  ))}
                </select>
                {schedule && (
                  <small className="help-text">Nie można zmienić klienta dla istniejącego harmonogramu</small>
                )}
              </div>
            </div>
            
            {/* Time Settings */}
            <div className="form-section">
              <h3>Czas działania</h3>
              
              <div className="form-group">
                <label className="radio-group">
                  <input
                    type="radio"
                    checked={timeMode === 'allDay'}
                    onChange={() => setTimeMode('allDay')}
                  />
                  Cały dzień
                </label>
                <label className="radio-group">
                  <input
                    type="radio"
                    checked={timeMode === 'specific'}
                    onChange={() => setTimeMode('specific')}
                  />
                  Konkretne godziny
                </label>
              </div>
              
              {timeMode === 'specific' && (
                <div className="time-inputs">
                  <div className="form-group">
                    <label>Od</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Do</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Days of Week */}
            <div className="form-section">
              <h3>Dni tygodnia</h3>
              
              <div className="quick-actions">
                <button type="button" onClick={selectAllDays}>Wszystkie</button>
                <button type="button" onClick={selectWeekdays}>Pn-Pt</button>
              </div>
              
              <div className="days-grid">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.value} className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Action Type */}
            <div className="form-section">
              <h3>Rodzaj akcji</h3>
              
              <div className="form-group">
                <label>Akcja *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  required
                >
                  <option value="cpc">Zmiana stawki CPC</option>
                  <option value="budget">Zmiana budżetu dziennego</option>
                  <option value="status">Zmiana statusu</option>
                </select>
              </div>
              
              {actionType === 'status' ? (
                <div className="form-group">
                  <label>Nowy status *</label>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value as any)}
                    required
                  >
                    <option value="ACTIVE">Aktywny</option>
                    <option value="PAUSED">Wstrzymany</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Tryb zmiany *</label>
                    <select
                      value={changeMode}
                      onChange={(e) => setChangeMode(e.target.value as any)}
                      required
                    >
                      <option value="percentage">Procentowo (%)</option>
                      <option value="amount">Kwotowo (PLN)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Wartość zmiany *</label>
                    <input
                      type="number"
                      value={changeValue}
                      onChange={(e) => setChangeValue(parseFloat(e.target.value))}
                      step={changeMode === 'percentage' ? '1' : '0.01'}
                      required
                    />
                    <small className="help-text">
                      {changeMode === 'percentage' 
                        ? 'Wartości dodatnie zwiększą, ujemne zmniejszą (np. 20 = +20%, -15 = -15%)'
                        : 'Wartości dodatnie zwiększą, ujemne zmniejszą (np. 5.50 = +5.50 PLN)'
                      }
                    </small>
                  </div>
                </>
              )}
            </div>
            
            {/* Ad Groups Selection */}
            {selectedClient && selectedCampaign && (
              <div className="form-section">
                <h3>Grupy reklam</h3>
                
                <div className="form-group">
                  <label>Kampania</label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => {
                      setSelectedCampaign(e.target.value)
                      setSelectedAdGroupIds([])
                    }}
                  >
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="quick-actions">
                  <button type="button" onClick={selectAllAdGroups}>Zaznacz wszystkie</button>
                  <button type="button" onClick={deselectAllAdGroups}>Odznacz wszystkie</button>
                </div>
                
                <div className="help-text" style={{ marginBottom: '12px' }}>
                  {selectedAdGroupIds.length === 0 
                    ? '⚠️ Brak wybranych grup - harmonogram będzie działał dla WSZYSTKICH grup w kampanii'
                    : `Wybrano: ${selectedAdGroupIds.length} grup`
                  }
                </div>
                
                {loading ? (
                  <div className="loading-inline">Ładowanie grup...</div>
                ) : adGroups.length === 0 ? (
                  <div className="empty-state-inline">Brak grup reklam w wybranej kampanii</div>
                ) : (
                  <div className="adgroups-list">
                    {adGroups.map(adGroup => (
                      <label key={adGroup.id} className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={selectedAdGroupIds.includes(adGroup.id)}
                          onChange={() => toggleAdGroup(adGroup.id)}
                        />
                        <div className="adgroup-info">
                          <div className="adgroup-name">{adGroup.name}</div>
                          <div className="adgroup-status">{adGroup.status}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Anuluj
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

