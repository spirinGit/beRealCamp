import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

const navItems = [
  { to: '/leader/my-squads', icon: '🏕️', label: 'Загони' },
  { to: '/leader/child-history', icon: '📋', label: 'Історія' },
]

export function LeaderLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 max-w-lg mx-auto">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-gray-400">Лідер</p>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            ⛺ beRealCamp
          </span>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-gray-400 active:text-red-500">
            Вийти
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 z-10">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`
              }>
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
