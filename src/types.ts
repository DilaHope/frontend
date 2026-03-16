export interface Crypto {
  id: string
  name: string
  symbol: string
  market_cap: number
  price: number | null
  volume_24h: number
  score: number
  twitter_followers?: number
  github_stars?: number
  liquidity_usd?: number
  image?: string
}

export interface RankingResponse {
  last_update: string
  count: number
  top: Crypto[]
}
