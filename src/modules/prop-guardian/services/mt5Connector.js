import { apiRequest } from '../../../lib/api.js'
import { mockConnectorSnapshot } from '../data/mockPropGuardianData.js'

export class BrokerConnector {
  async connect() {
    throw new Error('connect() must be implemented by a broker connector.')
  }

  async getAccountInfo() {
    throw new Error('getAccountInfo() must be implemented by a broker connector.')
  }

  async getOpenPositions() {
    throw new Error('getOpenPositions() must be implemented by a broker connector.')
  }

  async getOrders() {
    throw new Error('getOrders() must be implemented by a broker connector.')
  }

  async getDeals() {
    throw new Error('getDeals() must be implemented by a broker connector.')
  }

  async getSymbols() {
    throw new Error('getSymbols() must be implemented by a broker connector.')
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by a broker connector.')
  }
}

export class MockMt5Connector extends BrokerConnector {
  constructor(snapshot = mockConnectorSnapshot) {
    super()
    this.snapshot = snapshot
  }

  async connect() {
    return { ok: true, source: this.snapshot.source, fetchedAt: this.snapshot.fetchedAt }
  }

  async getAccountInfo() {
    return this.snapshot.account
  }

  async getOpenPositions() {
    return this.snapshot.openPositions || []
  }

  async getOrders() {
    return this.snapshot.pendingOrders || []
  }

  async getDeals() {
    return this.snapshot.historyDeals || []
  }

  async getSymbols() {
    return [...new Set([...(this.snapshot.openPositions || []), ...(this.snapshot.historyDeals || [])].map((item) => item.symbol))]
  }

  async disconnect() {
    return { ok: true }
  }
}

export class ExnessMt5Connector extends BrokerConnector {
  async connect(credentials) {
    return apiRequest('/api/trading/exness/connect-and-sync', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async getSnapshot() {
    return apiRequest('/api/trading/exness/analysis')
  }

  async getAccountInfo() {
    const payload = await this.getSnapshot()
    return payload?.tradeBook?.account || payload?.analysis?.account || null
  }

  async getOpenPositions() {
    const payload = await this.getSnapshot()
    return payload?.tradeBook?.openPositions || []
  }

  async getOrders() {
    const payload = await this.getSnapshot()
    return payload?.tradeBook?.orders || []
  }

  async getDeals() {
    const payload = await this.getSnapshot()
    return payload?.tradeBook?.trades || []
  }

  async getSymbols() {
    const deals = await this.getDeals()
    return [...new Set(deals.map((trade) => trade.symbol).filter(Boolean))]
  }

  async getAgentStatus() {
    try {
      const status = await apiRequest('/api/trading/exness/status')
      return status?.realtimeAgent || null
    } catch {
      return null
    }
  }

  async getConnectorToken() {
    return apiRequest('/api/trading/exness/connector-token', { method: 'POST' })
  }

  async disconnect() {
    return apiRequest('/api/trading/exness/connect', { method: 'DELETE' })
  }
}

export function createBrokerConnector(provider = 'mock') {
  if (provider === 'exness') return new ExnessMt5Connector()
  return new MockMt5Connector()
}
