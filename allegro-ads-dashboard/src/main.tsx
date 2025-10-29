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
import { Administration } from './routes/Administration'
import { Offers } from './routes/Offers'
import { Login } from './routes/Login'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'allegro-ads', element: <AllegroAds /> },
      { path: 'offers', element: <Offers /> },
      { path: 'schedules', element: <Schedules /> },
      { path: 'integrations', element: <Integrations /> },
      { path: 'integrations/allegro/callback', element: <AllegroCallback /> },
      { path: 'administration', element: <Administration /> },
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
