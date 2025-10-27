import { useState, useEffect } from 'react'
import { 
  getSchedules, 
  deleteSchedule, 
  toggleSchedule,
  getDayName,
  getActionTypeDisplay,
  type Schedule 
} from '../services/schedules'
import { getAccounts } from '../services/allegroAuth'
import { getAdsClients, getAdGroups } from '../services/allegroCampaigns'
import { ScheduleModal } from '../components/ScheduleModal'
import './Schedules.css'

export function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  
  // Cache for client and ad group names
  const [adsClientsCache, setAdsClientsCache] = useState<Map<string, string>>(new Map())
  const [adGroupsCache, setAdGroupsCache] = useState<Map<string, string>>(new Map())

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // Load schedules when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadSchedules()
    }
  }, [selectedAccount])
  
  // Debug: Log schedules when they change
  useEffect(() => {
    if (schedules.length > 0) {
      console.log('=== SCHEDULES DEBUG ===')
      schedules.forEach(s => {
        console.log(`${s.name}: changeValue=${s.changeValue} (type: ${typeof s.changeValue}), changeMode=${s.changeMode}`)
      })
    }
  }, [schedules])

  async function loadAccounts() {
    try {
      const data = await getAccounts()
      setAccounts(data.accounts || [])
      
      // Auto-select first account
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      setError('Nie udało się załadować kont')
    }
  }

  async function loadSchedules() {
    if (!selectedAccount) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getSchedules(selectedAccount)
      setSchedules(data)
      
      // Load names for clients and ad groups
      await loadNamesForSchedules(data)
    } catch (err: any) {
      console.error('Failed to load schedules:', err)
      setError('Nie udało się załadować harmonogramów')
    } finally {
      setLoading(false)
    }
  }
  
  async function loadNamesForSchedules(schedules: Schedule[]) {
    const clientsMap = new Map<string, string>()
    const adGroupsMap = new Map<string, string>()
    
    // Get unique adsClientIds
    const uniqueClientIds = [...new Set(schedules.map(s => s.adsClientId))]
    
    try {
      // Load ads clients names
      const adsClientsData = await getAdsClients(selectedAccount)
      adsClientsData.clients?.forEach((client: any) => {
        clientsMap.set(client.id, client.name)
      })
      
      // Load ad groups for each unique client
      for (const clientId of uniqueClientIds) {
        try {
          const adGroupsData = await getAdGroups(
            selectedAccount,
            clientId,
            '',  // no specific campaign
            'allegro-pl',
            ['ACTIVE', 'PAUSED']
          )
          
          adGroupsData.adGroups?.forEach((ag: any) => {
            adGroupsMap.set(ag.id, ag.name)
          })
        } catch (err) {
          console.error(`Failed to load ad groups for client ${clientId}:`, err)
        }
      }
      
      setAdsClientsCache(clientsMap)
      setAdGroupsCache(adGroupsMap)
    } catch (err) {
      console.error('Failed to load names:', err)
    }
  }

  async function handleToggle(scheduleId: string, currentState: boolean) {
    try {
      await toggleSchedule(scheduleId, !currentState)
      await loadSchedules()
    } catch (err: any) {
      console.error('Failed to toggle schedule:', err)
      alert('Nie udało się zmienić statusu harmonogramu')
    }
  }

  async function handleDelete(scheduleId: string, scheduleName: string) {
    if (!confirm(`Czy na pewno chcesz usunąć harmonogram "${scheduleName}"?`)) {
      return
    }
    
    try {
      await deleteSchedule(scheduleId)
      await loadSchedules()
    } catch (err: any) {
      console.error('Failed to delete schedule:', err)
      alert('Nie udało się usunąć harmonogramu')
    }
  }

  function openCreateModal() {
    setEditingSchedule(null)
    setShowModal(true)
  }

  function openEditModal(schedule: Schedule) {
    setEditingSchedule(schedule)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSchedule(null)
  }

  async function handleModalSave() {
    closeModal()
    await loadSchedules()
  }

  if (accounts.length === 0) {
    return (
      <div className="schedules-page">
        <div className="empty-state">
          <h2>Brak połączonych kont Allegro</h2>
          <p>Przejdź do <a href="/integrations">Integracji</a>, aby połączyć konto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="schedules-page">
      <div className="page-header">
        <h1>Harmonogramy Ads</h1>
        <button className="btn-create" onClick={openCreateModal}>
          + Dodaj Harmonogram
        </button>
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Konto Allegro:</label>
          <select 
            value={selectedAccount} 
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Ładowanie harmonogramów...</div>
      ) : schedules.length === 0 ? (
        <div className="empty-state">
          <p>Brak harmonogramów. Kliknij "Dodaj Harmonogram" aby utworzyć pierwszy.</p>
        </div>
      ) : (
        <div className="schedules-table-container">
          <table className="schedules-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Status</th>
                <th>Klient</th>
                <th>Grupy reklam</th>
                <th>Czas działania</th>
                <th>Dni tygodnia</th>
                <th>Akcja</th>
                <th>Wartość</th>
                <th>Ostatnie wykonanie</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <tr key={schedule.id}>
                  <td>
                    <strong>{schedule.name}</strong>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${schedule.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(schedule.id, schedule.isActive)}
                      title={schedule.isActive ? 'Kliknij aby wyłączyć' : 'Kliknij aby włączyć'}
                    >
                      {schedule.isActive ? '🟢 Aktywny' : '🔴 Nieaktywny'}
                    </button>
                  </td>
                  <td>
                    {adsClientsCache.get(schedule.adsClientId) || schedule.adsClientId}
                  </td>
                  <td>
                    {schedule.adGroupIds.length === 0 ? (
                      <span className="text-secondary">Wszystkie</span>
                    ) : (
                      <div style={{ maxWidth: '200px' }}>
                        {schedule.adGroupIds.map((agId, idx) => (
                          <div key={agId} style={{ fontSize: '0.9em' }}>
                            {idx < 3 ? (
                              adGroupsCache.get(agId) || agId
                            ) : idx === 3 ? (
                              `+ ${schedule.adGroupIds.length - 3} więcej`
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {schedule.timeMode === 'allDay' ? (
                      'Cały dzień'
                    ) : (
                      `${schedule.startTime} - ${schedule.endTime}`
                    )}
                  </td>
                  <td>
                    {schedule.daysOfWeek.length === 7 ? (
                      'Codziennie'
                    ) : (
                      schedule.daysOfWeek.map(day => getDayName(day).substring(0, 3)).join(', ')
                    )}
                  </td>
                  <td>
                    {getActionTypeDisplay(schedule.actionType)}
                    {schedule.actionType === 'status' && schedule.statusValue && (
                      <div className="text-secondary">→ {schedule.statusValue}</div>
                    )}
                  </td>
                  <td>
                    {schedule.actionType !== 'status' && (
                      <>
                        {schedule.changeValue > 0 ? '+' : ''}{schedule.changeValue}
                        {schedule.changeMode === 'percentage' ? '%' : ' PLN'}
                      </>
                    )}
                  </td>
                  <td>
                    {schedule.lastExecuted ? (
                      <span title={schedule.lastExecuted.toLocaleString()}>
                        {schedule.lastExecuted.toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-secondary">Nigdy</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(schedule)}
                        title="Edytuj"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(schedule.id, schedule.name)}
                        title="Usuń"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ScheduleModal
          schedule={editingSchedule}
          accountId={selectedAccount}
          onClose={closeModal}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}

