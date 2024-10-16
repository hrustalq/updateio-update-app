import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@renderer/components/ui/card'

interface ErrorLog {
  error: {
    classId?: number
    code?: number
    methodId?: number
  }
  level: string
  message: string
  service: string
  timestamp: string
}

export const ErrorCard: React.FC<{ error: ErrorLog }> = ({ error }) => {
  const date = new Date(error.timestamp)
  const formattedDate = `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ошибка в сервисе: {error.service}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Уровень:</strong> {error.level === 'error' ? 'Ошибка' : error.level}
        </p>
        <p>
          <strong>Сообщение:</strong> {error.message}
        </p>
        {error?.error?.code !== undefined && (
          <p>
            <strong>Код ошибки:</strong> {error?.error?.code}
          </p>
        )}
        {error.error?.methodId !== undefined && (
          <p>
            <strong>Метод ID:</strong> {error.error?.methodId}
          </p>
        )}
        {error.error?.classId !== undefined && (
          <p>
            <strong>Класс ID:</strong> {error.error?.classId}
          </p>
        )}
        <p>
          <strong>Время:</strong> {formattedDate}
        </p>
      </CardContent>
    </Card>
  )
}
