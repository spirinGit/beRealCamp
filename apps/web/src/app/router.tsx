import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MorePage } from '../pages/admin/MorePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { AuditPage } from '../pages/admin/AuditPage'
import { CampsPage } from '../pages/admin/CampsPage'
import { ChildrenPage } from '../pages/admin/ChildrenPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { EventsPage as AdminEventsPage } from '../pages/admin/EventsPage'
import { RewardsPage } from '../pages/admin/RewardsPage'
import { RulesPage } from '../pages/admin/RulesPage'
import { SquadsPage } from '../pages/admin/SquadsPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { PenaltyRulesPage } from '../pages/admin/PenaltyRulesPage'
import { PublicCampLinkPage } from '../pages/admin/PublicCampLinkPage'
import { PromoCodesPage } from '../pages/admin/PromoCodesPage'
import { ChildProfilePage } from '../pages/child/ChildProfilePage'
import { SearchPage } from '../pages/child/SearchPage'
import { ShopPage } from '../pages/child/ShopPage'
import { ChildHistoryPage } from '../pages/leader/ChildHistoryPage'
import { EvaluatePage } from '../pages/leader/EvaluatePage'
import { LeaderEventsPage } from '../pages/leader/EventsPage'
import { MySquadsPage } from '../pages/leader/MySquadsPage'
import { LeaderSchedulePage } from '../pages/leader/SchedulePage'
import { SpendCoinsPage } from '../pages/worker/SpendCoinsPage'
import { AdminLayout } from '../shared/ui/AdminLayout'
import { LeaderLayout } from '../shared/ui/LeaderLayout'
import { WorkerLayout } from '../shared/ui/WorkerLayout'
import { RequireAuth } from '../shared/ui/RequireAuth'
import { useAuth } from '../features/auth/AuthContext'

function roleHomePath(role: string | null | undefined) {
  switch (role) {
    case 'Administrator':
      return '/admin/camps'
    case 'Leader':
      return '/leader/my-squads'
    case 'Worker':
      return '/worker/spend-coins'
    default:
      return '/child/search'
  }
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }
  return <Navigate to="/login" replace />
}

function LoginRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }
  return <LoginPage />
}

export const appRouter = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginRedirect /> },

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
          { path: '/admin/penalty-rules', element: <PenaltyRulesPage /> },
          { path: '/admin/events', element: <AdminEventsPage /> },
          { path: '/admin/child-history', element: <ChildHistoryPage /> },
          { path: '/admin/promo-codes', element: <PromoCodesPage /> },
          { path: '/admin/rewards', element: <RewardsPage /> },
          { path: '/admin/audit', element: <AuditPage /> },
          { path: '/admin/more', element: <MorePage /> },
          { path: '/admin/public-link', element: <PublicCampLinkPage /> },
        ],
      },
      {
        element: <LeaderLayout />,
        children: [
          { path: '/leader/my-squads', element: <MySquadsPage /> },
          { path: '/leader/schedule', element: <LeaderSchedulePage /> },
          { path: '/leader/events', element: <LeaderEventsPage /> },
          { path: '/leader/evaluate', element: <EvaluatePage /> },
          { path: '/leader/child-history', element: <ChildHistoryPage /> },
        ],
      },
      {
        element: <WorkerLayout />,
        children: [
          { path: '/worker/spend-coins', element: <SpendCoinsPage /> },
        ],
      },
    ],
  },

  // Публічні роути (без авторизації)
  { path: '/child/search', element: <SearchPage /> },
  { path: '/child/profile', element: <ChildProfilePage /> },
  { path: '/child/shop', element: <ShopPage /> },
])
