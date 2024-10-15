import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import {
  AlertCircle,
  Menu,
  PlusCircle,
  Gamepad,
  BarChart2,
  ChevronRight,
  ChevronDown,
  ListIcon,
  RefreshCw,
  Download,
  Moon,
  Sun,
  ToggleLeftIcon,
  ToggleRight,
  Bell,
  Sliders,
  Settings
} from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from './ui/sheet'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@renderer/lib/utils'
import React from 'react'
import { useTheme } from '@renderer/hooks/use-theme' // Убедитесь, что путь к theme-provider корректен

// Update the menuItems structure
const menuItems = [
  {
    label: 'Обновления',
    icon: Gamepad,
    description: 'Управление играми, обновлениями и установками.',
    quickActions: [
      { label: 'Добавить игру', to: '/games/add', icon: PlusCircle },
      { label: 'Запустить обновление', to: '/games/update', icon: RefreshCw }
    ],
    subItems: [
      { to: '/games/list', label: 'Список игр', icon: ListIcon },
      { to: '/games/updates', label: 'Обновления', icon: RefreshCw },
      { to: '/games/installations', label: 'Установки', icon: Download }
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

export const BurgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null)
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1)
  const [isMouseInteraction, setIsMouseInteraction] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const submenuItemsRef = useRef<(HTMLAnchorElement | null)[]>([])
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenDesktopMenu(null)
        setFocusedItemIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (openDesktopMenu && focusedItemIndex === -1 && !isMouseInteraction) {
      setFocusedItemIndex(0)
    }
  }, [focusedItemIndex, openDesktopMenu, isMouseInteraction])

  useEffect(() => {
    if (focusedItemIndex !== -1 && submenuItemsRef.current[focusedItemIndex]) {
      submenuItemsRef.current[focusedItemIndex]?.focus()
    }
  }, [focusedItemIndex])

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setOpenDesktopMenu(label)
    setFocusedItemIndex(-1)
    setIsMouseInteraction(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenDesktopMenu(null)
      setFocusedItemIndex(-1)
      setIsMouseInteraction(false)
    }, 300)
  }

  const handleKeyDown = (event: React.KeyboardEvent, label: string) => {
    setIsMouseInteraction(false)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpenDesktopMenu(openDesktopMenu === label ? null : label)
      setFocusedItemIndex(-1)
    } else if (openDesktopMenu === label) {
      const currentItem = menuItems.find((item) => item.label === label)
      const totalItems =
        (currentItem?.quickActions?.length || 0) + (currentItem?.subItems?.length || 0)

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setFocusedItemIndex((prevIndex) => (prevIndex + 1) % totalItems)
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedItemIndex((prevIndex) => (prevIndex - 1 + totalItems) % totalItems)
          break
        case 'Tab':
          if (!event.shiftKey) {
            event.preventDefault()
            setFocusedItemIndex((prevIndex) => (prevIndex + 1) % totalItems)
          } else {
            event.preventDefault()
            setFocusedItemIndex((prevIndex) => (prevIndex - 1 + totalItems) % totalItems)
          }
          break
        case 'Escape':
          event.preventDefault()
          setOpenDesktopMenu(null)
          setFocusedItemIndex(-1)
          break
      }
    }
  }

  return (
    <div className="relative lg:flex items-center flex-1 lg:flex-grow-[3]" ref={menuRef}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTitle hidden>Навигация</SheetTitle>
        <SheetDescription hidden>Навигация</SheetDescription>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-full size-10">
            <Menu className="size-8" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-none p-0 flex flex-col">
          <nav className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Меню</h2>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence initial={false} mode="wait">
                {activeSubmenu ? (
                  <motion.div
                    key="submenu"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'tween', duration: 0.2 }}
                    className="absolute inset-0 bg-background overflow-y-auto"
                  >
                    <div className="p-4 border-b flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveSubmenu(null)}
                        className="mr-2"
                      >
                        <ChevronRight className="rotate-180" />
                      </Button>
                      <h2 className="text-lg font-semibold">{activeSubmenu}</h2>
                    </div>
                    <ul className="p-4">
                      {menuItems
                        .find((item) => item.label === activeSubmenu)
                        ?.subItems?.map((subItem) => (
                          <li key={subItem.label} className="mb-2">
                            <Link
                              to={subItem.to}
                              className="flex items-center p-2 rounded-md hover:bg-accent"
                              onClick={() => {
                                setActiveSubmenu(null)
                                setIsOpen(false)
                              }}
                            >
                              <subItem.icon className="mr-3 h-5 w-5" />
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mainmenu"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'tween', duration: 0.2 }}
                    className="absolute inset-0 bg-background overflow-y-auto"
                  >
                    <ul>
                      {menuItems.map((item) => (
                        <li key={item.label} className="border-b last:border-b-0">
                          <button
                            className="w-full p-4 flex items-center justify-between hover:bg-accent"
                            onClick={() => setActiveSubmenu(item.label)}
                          >
                            <span className="flex items-center">
                              <item.icon className="mr-3 h-5 w-5" />
                              {item.label}
                            </span>
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="p-4 border-t absolute inset-x-0 bottom-10">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between px-4"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <span className="flex items-center">
                  {theme === 'dark' ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  {theme === 'dark' ? 'Темная тема' : 'Светлая тема'}
                </span>
                {theme === 'dark' ? (
                  <ToggleLeftIcon className="size-5" />
                ) : (
                  <ToggleRight className="size-5" />
                )}
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop menu */}
      <nav className="hidden lg:flex lg:flex-1 max-w-full" aria-label="Главное меню">
        <ul className="w-full flex justify-around" role="menubar">
          {menuItems.map((item) => (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
              role="none"
            >
              <button
                className="text-base font-medium px-4 py-2 hover:bg-accent rounded-md transition-colors flex items-center"
                onClick={() =>
                  setOpenDesktopMenu(openDesktopMenu === item.label ? null : item.label)
                }
                onKeyDown={(e) => handleKeyDown(e, item.label)}
                aria-haspopup="true"
                aria-expanded={openDesktopMenu === item.label}
                role="menuitem"
              >
                <item.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                {item.label}
                <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {openDesktopMenu === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 w-[500px] mt-2"
                    style={{ transform: 'translateX(-25%)' }}
                    role="menu"
                    aria-label={`Подменю ${item.label}`}
                  >
                    <div className="grid gap-3 p-5 bg-popover rounded-md shadow-md lg:grid-cols-[.75fr_1fr] border border-border">
                      <div className="row-span-3">
                        <h3
                          className="font-medium leading-none mb-2 flex items-center"
                          id={`${item.label}-heading`}
                        >
                          <item.icon className="mr-2 h-5 w-5" aria-hidden="true" />
                          {item.label}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                        {item.quickActions?.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="outline"
                            className={cn(
                              'w-full justify-start mb-2',
                              focusedItemIndex === actionIndex &&
                                !isMouseInteraction &&
                                'ring-2 ring-ring ring-offset-2 ring-offset-background'
                            )}
                            asChild
                          >
                            <Link
                              to={action.to}
                              role="menuitem"
                              ref={(el) => (submenuItemsRef.current[actionIndex] = el)}
                              tabIndex={focusedItemIndex === actionIndex ? 0 : -1}
                              onKeyDown={(e) => handleKeyDown(e, item.label)}
                            >
                              <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                              {action.label}
                            </Link>
                          </Button>
                        ))}
                      </div>
                      <ul
                        className="col-span-1"
                        role="menu"
                        aria-labelledby={`${item.label}-heading`}
                      >
                        {item.subItems?.map((subItem, subIndex) => (
                          <ListItem
                            key={subItem.label}
                            title={subItem.label}
                            href={subItem.to}
                            icon={subItem.icon}
                            role="menuitem"
                            ref={(el) =>
                              (submenuItemsRef.current[
                                (item.quickActions?.length || 0) + subIndex
                              ] = el)
                            }
                            tabIndex={
                              focusedItemIndex === (item.quickActions?.length || 0) + subIndex
                                ? 0
                                : -1
                            }
                            onKeyDown={(e) => handleKeyDown(e, item.label)}
                            className={cn(
                              focusedItemIndex === (item.quickActions?.length || 0) + subIndex &&
                                !isMouseInteraction &&
                                'ring-2 ring-ring ring-offset-2 ring-offset-background'
                            )}
                          />
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

interface ListItemProps extends React.ComponentPropsWithoutRef<'a'> {
  title: string
  href: string
  icon?: React.ElementType
}

const ListItem = React.forwardRef<React.ElementRef<'a'>, ListItemProps>(
  ({ className, title, href, icon: Icon, ...props }, ref) => {
    return (
      <li role="none">
        <Link
          ref={ref}
          to={href}
          className={cn(
            'block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          role="menuitem"
          {...props}
        >
          <div className="text-sm font-medium leading-none flex items-center">
            {Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />}
            {title}
          </div>
        </Link>
      </li>
    )
  }
)
ListItem.displayName = 'ListItem'
