import { H2 } from '@renderer/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@renderer/components/ui/accordion'
import { SteamCmdSettings } from '@renderer/components/steam-cmd-settings'
import { SteamAccountSettings } from '@renderer/components/steam-account-settings'

export function Settings() {
  return (
    <div className="p-4">
      <H2 className="mb-6">Настройки</H2>
      <Card>
        <CardHeader>
          <CardTitle>Настройки Steam</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="steamcmd">
              <AccordionTrigger>Настройки SteamCMD</AccordionTrigger>
              <AccordionContent>
                <SteamCmdSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="steamaccount">
              <AccordionTrigger>Настройки аккаунта Steam</AccordionTrigger>
              <AccordionContent>
                <SteamAccountSettings />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
