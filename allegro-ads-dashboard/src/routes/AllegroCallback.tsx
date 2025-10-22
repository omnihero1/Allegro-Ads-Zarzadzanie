import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { exchangeCodeForTokens } from '../services/allegroAuth'

export function AllegroCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Przetwarzanie…')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code) {
      setMessage('Brak kodu autoryzacyjnego w adresie URL.')
      return
    }
    ;(async () => {
      try {
        await exchangeCodeForTokens({ code, state: state ?? undefined })
        setMessage('Autoryzacja zakończona sukcesem. Przekierowanie…')
        setTimeout(() => navigate('/integrations'), 1200)
      } catch (e: any) {
        const details = e?.response?.data ? JSON.stringify(e.response.data) : e?.message
        setMessage(`Nie udało się wymienić kodu na tokeny. ${details || ''}`)
      }
    })()
  }, [searchParams, navigate])

  return (
    <div>
      <h1>Allegro Ads</h1>
      <p>{message}</p>
    </div>
  )
}


