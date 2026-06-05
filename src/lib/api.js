const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed'
    throw new Error(message)
  }
  return payload
}

export function apiBaseUrl() {
  return API_BASE_URL
}
