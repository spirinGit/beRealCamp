import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { appRouter } from './app/router'
import './index.css'

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  )
}
