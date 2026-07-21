import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // Редірект залежно від ролі
      const stored = localStorage.getItem('camp_user')
      const role = stored ? (JSON.parse(stored)?.role as string | null) : user?.role ?? null
      navigate(roleHomePath(role), { replace: true })
    } catch {
      setError('Невірний email або пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">⛺ beRealCamp</h1>
        <p className="text-gray-500 mt-1 text-sm">Система оцінювання</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="admin@camp.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Вхід...' : 'Увійти'}
        </button>
      </form>
    </div>
  )
}

function roleHomePath(role: string | null) {
  switch (role) {
    case 'Administrator': return '/admin/camps'
    case 'Leader': return '/leader/my-squads'
    case 'Worker': return '/worker/spend-coins'
    default: return '/child/search'
  }
}
