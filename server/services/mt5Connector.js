import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class BrokerConnector {
  async connect() {
    throw new Error('connect() must be implemented.')
  }

  async getAccountInfo() {
    throw new Error('getAccountInfo() must be implemented.')
  }

  async getOpenPositions() {
    throw new Error('getOpenPositions() must be implemented.')
  }

  async getOrders() {
    throw new Error('getOrders() must be implemented.')
  }

  async getDeals() {
    throw new Error('getDeals() must be implemented.')
  }

  async getSymbols() {
    throw new Error('getSymbols() must be implemented.')
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented.')
  }
}

export class Mt5PythonConnector extends BrokerConnector {
  constructor({ pythonBin = process.platform === 'win32' ? 'py' : 'python3', timeoutMs = 90000 } = {}) {
    super()
    this.pythonBin = pythonBin
    this.timeoutMs = timeoutMs
    this.snapshot = null
  }

  async connect({ login, password, server, days = 30, terminalPath = '' }) {
    const scriptPath = path.join(__dirname, '..', 'mt5_fetch.py')
    const args = [
      scriptPath,
      '--login',
      String(login || ''),
      '--password',
      String(password || ''),
      '--server',
      String(server || ''),
      '--days',
      String(days || 30)
    ]
    if (terminalPath) args.push('--terminal-path', String(terminalPath))
    this.snapshot = await runPythonJson(this.pythonBin, args, this.timeoutMs)
    return this.snapshot
  }

  async getAccountInfo() {
    return this.snapshot?.account || null
  }

  async getOpenPositions() {
    return this.snapshot?.openPositions || this.snapshot?.positions || []
  }

  async getOrders() {
    return this.snapshot?.pendingOrders || this.snapshot?.orders || []
  }

  async getDeals() {
    return this.snapshot?.historyDeals || this.snapshot?.deals || []
  }

  async getSymbols() {
    const rows = [...(await this.getOpenPositions()), ...(await this.getDeals())]
    return [...new Set(rows.map((item) => item.symbol).filter(Boolean))]
  }

  async disconnect() {
    this.snapshot = null
    return { ok: true }
  }
}

function runPythonJson(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('MT5 connector timed out.'))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '')
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '')
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) return reject(new Error(stderr.trim() || 'MT5 connector failed.'))
      const jsonLine = String(stdout || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reverse()
        .find((line) => line.startsWith('{') && line.endsWith('}'))
      if (!jsonLine) return reject(new Error('MT5 connector returned no JSON payload.'))
      try {
        const payload = JSON.parse(jsonLine)
        if (payload?.ok === false) return reject(new Error(payload.error || 'MT5 connector returned an error.'))
        return resolve(payload)
      } catch {
        return reject(new Error('MT5 connector returned invalid JSON.'))
      }
    })
  })
}
