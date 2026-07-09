import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { useWorkerReward } from '../../features/rewards'

export function WorkerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: reward } = useWorkerReward()

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 max-w-lg mx-auto">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-gray-400">Воркер · {reward?.name ?? '...'}</p>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            ⛺ beRealCamp
          </span>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-gray-400 active:text-red-500">
            Вийти
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
