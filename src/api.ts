import axios from 'axios'
import type { RankingResponse } from './types'

// En dev, Vite proxy /api → http://127.0.0.1:8000
const BASE = '/api'

export async function fetchRanking(limit = 100): Promise<RankingResponse> {
  const { data } = await axios.get<RankingResponse>(`${BASE}/ranking?limit=${limit}`)
  return data
}

export async function fetchHealth(): Promise<{ status: string; cached_coins: number; last_update: string }> {
  const { data } = await axios.get(`${BASE}/health`)
  return data
}
