import {
  AlertCircle,
  BarChart2,
  Bell,
  Home,
  ListIcon,
  PanelBottomOpen,
  PlusCircle,
  RefreshCw,
  Settings,
  Sliders
} from 'lucide-react'

export const menuItems = [
  {
    label: 'Главная',
    icon: Home,
    description: 'Управление играми, обновлениями и установками.',
    quickActions: [{ label: 'Добавить игру', to: '/games/add', icon: PlusCircle }],
    subItems: [
      { to: '/', label: 'Панель управления', icon: PanelBottomOpen },
      { to: '/games', label: 'Список игр', icon: ListIcon },
      { to: '/games/updates', label: 'Обновления', icon: RefreshCw }
    ]
  },
  {
    label: 'Мониторинг',
    icon: BarChart2,
    description: 'Мониторинг состояния и статистика.',
    quickActions: [],
    subItems: [
      { to: '/monitoring/alerts', label: 'Оповещения', icon: Bell },
      { to: '/error-logs', label: 'Логи ошибок', icon: AlertCircle }
    ]
  },
  {
    label: 'Настройки',
    icon: Settings,
    description: 'Управление настройками системы.',
    subItems: [{ to: '/settings/', label: 'Общие настройки', icon: Sliders }]
  }
]
