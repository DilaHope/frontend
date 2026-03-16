import axios from 'axios'
import type { RankingResponse } from './types'

// En dev : proxy Vite (/api → localhost:8000)
// En prod : URL directe du backend Render
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const BASE = IS_DEV ? '/api' : 'https://backend-yp86.onrender.com'

export async function fetchRanking(limit = 100): Promise<RankingResponse> {
  const { data } = await axios.get<RankingResponse>(`${BASE}/ranking?limit=${limit}`)
  return data
}

export async function fetchHealth(): Promise<{ status: string; cached_coins: number; last_update: string; is_updating: boolean }> {
  const { data } = await axios.get(`${BASE}/health`)
  return data
}
