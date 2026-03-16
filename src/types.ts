export interface Crypto {
  id: string
  name: string
  symbol: string
  price: number | null
  market_cap: number
  volume_24h: number
  liquidity: number
  dex_volume_24h: number
  pair_age_days: number
  tvl: number
  score: number
  twitter_followers?: number
  github_stars?: number
  github_commits_month?: number
  dominant_narrative?: string
  narrative_score?: number
  whale_activity_score?: number
  cex_listing_potential_score?: number
  manipulation_score?: number
  image?: string
}

export interface RankingResponse {
  last_update: string
  count: number
  top: Crypto[]
}
