import { H2 } from '@renderer/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { SteamSettings } from '@renderer/components/steam-settings'

export function Settings() {
  return (
    <div className="p-4">
      <H2 className="mb-6">Настройки</H2>
      <Card>
        <CardHeader>
          <CardTitle>Настройки Steam</CardTitle>
        </CardHeader>
        <CardContent>
          <SteamSettings />
        </CardContent>
      </Card>
    </div>
  )
}
