import axios from 'axios'
import type { RankingResponse } from './types'

// En dev : proxy Vite vers localhost:8000
// En prod : VITE_API_URL = https://ton-backend.onrender.com
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api'

export async function fetchRanking(limit = 100): Promise<RankingResponse> {
  const { data } = await axios.get<RankingResponse>(`${BASE}/ranking?limit=${limit}`)
  return data
}

export async function fetchHealth(): Promise<{ status: string; cached_coins: number; last_update: string; is_updating: boolean }> {
  const { data } = await axios.get(`${BASE}/health`)
  return data
}
