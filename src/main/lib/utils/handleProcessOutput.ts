import { logInfo } from '@/services/loggerService'
import { HandleSteamCmdOutputOptions, HandleProcessCmdOutputTrigger } from '@shared/models'

export function handleProcessOutput(
  data: Buffer,
  triggers?: HandleProcessCmdOutputTrigger[],
  options?: HandleSteamCmdOutputOptions
): void {
  let buffer = ''

  buffer += data.toString('utf-8')
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    logInfo(`SteamCMD output: ${line}`, {
      service: options?.service
    })

    if (triggers) {
      for (const trigger of triggers) {
        if (line.includes(trigger.search)) {
          trigger.action(trigger.ctx)
        }
      }
    }
  }
}
