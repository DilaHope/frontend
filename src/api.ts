import axios from 'axios'
import type { RankingResponse } from './types'

// En dev : proxy Vite (/api → localhost:8000)
// En prod : URL directe du backend Render
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const BASE = IS_DEV ? '/api' : 'https://backend-yp86.onrender.com'

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise(r => setTimeout(r, 1000 * attempt)) // backoff 1s,2s,3s
    }
  }
  throw new Error('Max retries exceeded')
}

function getLocal(key: string): any {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null
    const parsed = JSON.parse(item)
    if (Date.now() - (parsed.timestamp || 0) > 5 * 60 * 1000) { // 5min cache
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setLocal(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {}
}

export async function fetchRanking(limit = 100): Promise<RankingResponse> {
  const local = getLocal(`ranking_${limit}`)
  if (local) return local as RankingResponse

  const data = await withRetry(() => axios.get<RankingResponse>(`${BASE}/ranking?limit=${limit}&offset=0`))
  setLocal(`ranking_${limit}`, data.data)
  return data.data
}

export async function fetchHealth(): Promise<{ status: string; cached_coins: number; last_update: string; is_updating: boolean }> {
  const local = getLocal('health')
  if (local) return local

  const data = await withRetry(() => axios.get(`${BASE}/health`))
  setLocal('health', data.data)
  return data.data
}
