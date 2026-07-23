import { useNavigate } from 'react-router-dom'

const sections = [
  {
    to: '/admin/rewards',
    icon: '🛍️',
    title: 'Магазин',
    description: 'Точки обслуговування, позиції, воркери',
  },
  {
    to: '/admin/rules',
    icon: '⭐',
    title: 'Правила нарахування',
    description: 'Пресети коінів для лідерів',
  },
  {
    to: '/admin/penalty-rules',
    icon: '🚫',
    title: 'Правила покарання',
    description: 'За що та скільки балів віднімати',
  },
  {
    to: '/admin/events',
    icon: '🎯',
    title: 'Події',
    description: 'Створення подій, перевірка і історія',
  },
  {
    to: '/admin/child-history',
    icon: '📋',
    title: 'Історія дітей',
    description: 'Транзакції, пошук і перегляд балансу',
  },
  {
    to: '/admin/promo-codes',
    icon: '🎟️',
    title: 'Коди',
    description: 'Бонус-коди зі статусами активації',
  },
  {
    to: '/admin/public-link',
    icon: '🔗',
    title: 'Посилання для дітей',
    description: 'Публічний URL, QR-код і PDF для поточного табору',
  },
]

export function MorePage() {
  const navigate = useNavigate()

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Інше</h1>
        <p className="text-sm text-gray-400 mt-0.5">Налаштування табору</p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <button
            key={s.to}
            onClick={() => navigate(s.to)}
            className="w-full bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl flex-shrink-0">
              {s.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-base">{s.title}</p>
              <p className="text-sm text-gray-400 mt-0.5">{s.description}</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
