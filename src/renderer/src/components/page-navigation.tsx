import React, { useEffect } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@renderer/components/ui/bread-crumb'
import { useRouter } from '@tanstack/react-router'
import { menuItems } from '@renderer/consts/menu-items'

// Вспомогательная функция для поиска метки по пути
const findLabelByPath = (path: string): string => {
  for (const item of menuItems) {
    if (item.subItems) {
      const subItem = item.subItems.find((subItem) => subItem.to === path)
      if (subItem) return subItem.label
    }
    if (item.quickActions) {
      const quickAction = item.quickActions.find((action) => action.to === path)
      if (quickAction) return quickAction.label
    }
  }
  return path // Возвращаем исходный путь, если метка не найдена
}

export const PageNavigation: React.FC = () => {
  const matches = useMatches()
  const router = useRouter()

  const handleBackForward = (direction: 'back' | 'forward') => {
    if (direction === 'back') {
      router.history.back()
    } else if (direction === 'forward') {
      router.history.forward()
    }
  }

  useEffect(() => {
    const handleMouseButton = (e: MouseEvent) => {
      if (e.button === 3) {
        handleBackForward('back')
      } else if (e.button === 4) {
        handleBackForward('forward')
      }
    }

    window.addEventListener('mouseup', handleMouseButton)

    return () => {
      window.removeEventListener('mouseup', handleMouseButton)
    }
  }, [])

  return (
    <nav className="flex backdrop-blur-sm items-center justify-between py-2 px-4 border-t fixed bottom-0 inset-x-0">
      <Breadcrumb>
        <BreadcrumbList>
          {matches
            .filter((match) => match.pathname !== '/')
            .map((match, index, array) => (
              <React.Fragment key={match.pathname}>
                <BreadcrumbItem>
                  {index === array.length - 1 ? (
                    <BreadcrumbPage>{findLabelByPath(match.pathname)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={match.pathname}>{findLabelByPath(match.pathname)}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < array.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleBackForward('back')}
          title="Назад"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleBackForward('forward')}
          title="Вперед"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
