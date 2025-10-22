import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { RootLayout } from './routes/RootLayout'
import { Dashboard } from './routes/Dashboard'
import { Integrations } from './routes/Integrations'
import { AllegroCallback } from './routes/AllegroCallback'
import { AllegroAds } from './routes/AllegroAds'
import { Schedules } from './routes/Schedules'
import { ErrorBoundary } from './components/ErrorBoundary'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'allegro-ads', element: <AllegroAds /> },
      { path: 'schedules', element: <Schedules /> },
      { path: 'integrations', element: <Integrations /> },
      { path: 'integrations/allegro/callback', element: <AllegroCallback /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
