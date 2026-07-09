import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../pages/auth/LoginPage'
import { AuditPage } from '../pages/admin/AuditPage'
import { CampsPage } from '../pages/admin/CampsPage'
import { ChildrenPage } from '../pages/admin/ChildrenPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { RewardsPage } from '../pages/admin/RewardsPage'
import { RulesPage } from '../pages/admin/RulesPage'
import { SquadsPage } from '../pages/admin/SquadsPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { ChildProfilePage } from '../pages/child/ChildProfilePage'
import { SearchPage } from '../pages/child/SearchPage'
import { ShopPage } from '../pages/child/ShopPage'
import { ChildHistoryPage } from '../pages/leader/ChildHistoryPage'
import { EvaluatePage } from '../pages/leader/EvaluatePage'
import { MySquadsPage } from '../pages/leader/MySquadsPage'
import { SpendCoinsPage } from '../pages/worker/SpendCoinsPage'
import { AdminLayout } from '../shared/ui/AdminLayout'
import { LeaderLayout } from '../shared/ui/LeaderLayout'
import { RequireAuth } from '../shared/ui/RequireAuth'

export const appRouter = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },

  // Захищені admin роути з Layout
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <DashboardPage /> },
          { path: '/admin/camps', element: <CampsPage /> },
          { path: '/admin/users', element: <UsersPage /> },
          { path: '/admin/squads', element: <SquadsPage /> },
          { path: '/admin/children', element: <ChildrenPage /> },
          { path: '/admin/rules', element: <RulesPage /> },
          { path: '/admin/rewards', element: <RewardsPage /> },
          { path: '/admin/audit', element: <AuditPage /> },
        ],
      },
      {
        element: <LeaderLayout />,
        children: [
          { path: '/leader/my-squads', element: <MySquadsPage /> },
          { path: '/leader/evaluate', element: <EvaluatePage /> },
          { path: '/leader/child-history', element: <ChildHistoryPage /> },
        ],
      },
      { path: '/worker/spend-coins', element: <SpendCoinsPage /> },
    ],
  },

  // Публічні роути (без авторизації)
  { path: '/child/search', element: <SearchPage /> },
  { path: '/child/profile', element: <ChildProfilePage /> },
  { path: '/child/shop', element: <ShopPage /> },
])

