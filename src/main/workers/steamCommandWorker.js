const { workerData, parentPort } = require('worker_threads')
const { spawn } = require('child_process')

const { STEAMCMD_PATH, command } = workerData

const steamcmd = spawn(STEAMCMD_PATH, command)

steamcmd.stdout.on('data', (data) => {
  parentPort?.postMessage({ type: 'log', data: data.toString() })
})

steamcmd.stderr.on('data', (data) => {
  parentPort?.postMessage({ type: 'error', data: data.toString() })
})

steamcmd.on('close', (code) => {
  parentPort?.postMessage({ type: 'exit', code })
})
