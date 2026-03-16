import axios from 'axios'
import type { RankingResponse } from './types'

// En dev : proxy Vite vers localhost:8000
// En prod : window.__API_URL__ injecté via index.html ou fallback /api
declare const __API_URL__: string | undefined
const BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__)
  ? __API_URL__
  : '/api'

export async function fetchRanking(limit = 100): Promise<RankingResponse> {
  const { data } = await axios.get<RankingResponse>(`${BASE}/ranking?limit=${limit}`)
  return data
}

export async function fetchHealth(): Promise<{ status: string; cached_coins: number; last_update: string; is_updating: boolean }> {
  const { data } = await axios.get(`${BASE}/health`)
  return data
}
