import { useEffect, useState, useMemo, useRef } from 'react'
import {
  createColumnHelper, flexRender,
  getCoreRowModel, getSortedRowModel,
  useReactTable, type SortingState,
} from '@tanstack/react-table'
import { fetchRanking, fetchHealth } from './api'
import type { Crypto } from './types'

const col = createColumnHelper<Crypto>()

const NARRATIVE_BG: Record<string, string> = {
  AI:'#581c87', GAMING:'#1e3a8a', RWA:'#713f12',
  MEME:'#831843', DEFI:'#14532d', LAYER1:'#7c2d12', LAYER2:'#164e63',
}
const NARRATIVE_TEXT: Record<string, string> = {
  AI:'#e9d5ff', GAMING:'#bfdbfe', RWA:'#fef08a',
  MEME:'#fbcfe8', DEFI:'#bbf7d0', LAYER1:'#fed7aa', LAYER2:'#a5f3fc',
}

const COLUMN_TOOLTIPS: Record<string, string> = {
  'Coin':          'Nom et symbole du projet crypto.',
  'Score':         'Score global 0–100. Plus il est élevé, plus le projet présente de signaux positifs.',
  'Narrative':     "Secteur dominant détecté automatiquement (AI, DeFi, Gaming…).",
  'Market Cap':    'Capitalisation boursière. On favorise les micro-caps (< 50M$).',
  'Prix':          'Prix unitaire actuel du token en USD.',
  'Volume 24h':    'Volume de transactions sur 24h. Un volume élevé par rapport à la cap = fort momentum.',
  'Liquidité DEX': 'Liquidité sur les DEX. Une bonne liquidité réduit le risque de manipulation.',
  'Âge paire':     'Jours depuis la création de la paire DEX. Paires < 7j = plus risquées.',
  'CEX Listing':   "Probabilité d'un listing sur Binance, Coinbase ou Kraken.",
  'Whales':        "Score d'accumulation par les gros portefeuilles.",
  'Manip.':        "Risque de manipulation / wash trading. Rouge = suspect.",
  'Twitter':       'Nombre de followers Twitter.',
  'Commits/mois':  'Commits GitHub sur le dernier mois.',
}

function ColHeader({ label }: { label: string }) {
  const tip = COLUMN_TOOLTIPS[label]
  return (
    <span className="relative inline-flex items-center group/th cursor-pointer">
      <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{label}</span>
      {tip && (
        <span className="t-tooltip pointer-events-none absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-56
          rounded-xl px-3 py-2 text-left text-xs font-normal normal-case whitespace-normal leading-relaxed
          border shadow-2xl opacity-0 group-hover/th:opacity-100 transition-opacity duration-150 z-[9999]">
          {tip}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0"
            style={{ borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderBottom:'4px solid var(--border)' }} />
        </span>
      )}
    </span>
  )
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums t-muted">{value.toFixed(2)}</span>
    </div>
  )
}

// Colonnes desktop complètes
const columns = [
  col.accessor('name', {
    header: () => <ColHeader label="Coin" />,
    cell: info => (
      <div className="flex items-center gap-2">
        {info.row.original.image && <img src={info.row.original.image} alt="" width={20} height={20} className="rounded-full shrink-0" />}
        <div>
          <div className="font-medium text-xs leading-tight t-text">{info.getValue()}</div>
          <div className="text-[10px] t-sub">{info.row.original.symbol}</div>
        </div>
      </div>
    ),
  }),
  col.accessor('score', {
    header: () => <ColHeader label="Score" />,
    cell: info => {
      const v = info.getValue()
      const c = v >= 50 ? '#4ade80' : v >= 25 ? '#facc15' : '#f87171'
      return <span style={{ color: c, fontWeight: 700 }}>{v.toFixed(1)}</span>
    },
  }),
  col.accessor('dominant_narrative', {
    header: () => <ColHeader label="Narrative" />,
    cell: info => {
      const n = info.getValue()
      if (!n) return <span className="t-sub">—</span>
      return (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: NARRATIVE_BG[n] || '#1e293b', color: NARRATIVE_TEXT[n] || '#cbd5e1' }}>
          {n}
        </span>
      )
    },
  }),
  col.accessor('market_cap', {
    header: () => <ColHeader label="Market Cap" />,
    cell: info => <span className="text-xs t-text">${info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('price', {
    header: () => <ColHeader label="Prix" />,
    cell: info => <span className="text-xs t-text">{info.getValue() != null ? `${Number(info.getValue()).toFixed(6)}` : '—'}</span>,
  }),
  col.accessor('volume_24h', {
    header: () => <ColHeader label="Volume 24h" />,
    cell: info => <span className="text-xs t-text">${info.getValue().toLocaleString()}</span>,
  }),
  col.accessor('liquidity', {
    header: () => <ColHeader label="Liquidité DEX" />,
    cell: info => <span className="text-xs t-text">{info.getValue() ? `$${Number(info.getValue()).toLocaleString()}` : '—'}</span>,
  }),
  col.accessor('pair_age_days', {
    header: () => <ColHeader label="Âge paire" />,
    cell: info => { const d = info.getValue(); return <span className="text-xs t-text">{!d || d === 999 ? '—' : `${d}j`}</span> },
  }),
  col.accessor('cex_listing_potential_score', {
    header: () => <ColHeader label="CEX Listing" />,
    cell: info => { const v = info.getValue(); return v == null ? <span className="t-sub text-xs">—</span> : <ScoreBar value={v} color="bg-yellow-500" /> },
  }),
  col.accessor('whale_activity_score', {
    header: () => <ColHeader label="Whales" />,
    cell: info => { const v = info.getValue(); return v == null ? <span className="t-sub text-xs">—</span> : <ScoreBar value={v} color="bg-purple-500" /> },
  }),
  col.accessor('manipulation_score', {
    header: () => <ColHeader label="Manip." />,
    cell: info => {
      const v = info.getValue()
      if (v == null) return <span className="t-sub text-xs">—</span>
      const c = v > 0.5 ? '#f87171' : v > 0.2 ? '#facc15' : '#4ade80'
      return <span style={{ color: c }} className="text-xs font-semibold">{(v * 100).toFixed(0)}%</span>
    },
  }),
  col.accessor('twitter_followers', {
    header: () => <ColHeader label="Twitter" />,
    cell: info => <span className="text-xs t-text">{info.getValue() ? Number(info.getValue()).toLocaleString() : '—'}</span>,
  }),
  col.accessor('github_commits_month', {
    header: () => <ColHeader label="Commits/mois" />,
    cell: info => <span className="text-xs t-text">{info.getValue() ?? '—'}</span>,
  }),
]

// Colonnes tablette (6 colonnes essentielles)
const tabletColumns = [
  columns[0], // Coin
  columns[1], // Score
  columns[2], // Narrative
  columns[3], // Market Cap
  columns[5], // Volume 24h
  columns[10], // Manip.
]

// Vue carte pour mobile
function CoinCard({ coin, rank }: { coin: Crypto; rank: number }) {
  const n = coin.dominant_narrative
  const scoreColor = coin.score >= 50 ? '#4ade80' : coin.score >= 25 ? '#facc15' : '#f87171'
  const manipColor = coin.manipulation_score != null
    ? (coin.manipulation_score > 0.5 ? '#f87171' : coin.manipulation_score > 0.2 ? '#facc15' : '#4ade80')
    : null
  return (
    <div className="t-card rounded-xl border t-border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs t-sub w-5 text-right shrink-0">#{rank}</span>
          {coin.image && <img src={coin.image} alt="" width={28} height={28} className="rounded-full shrink-0" />}
          <div>
            <div className="font-semibold text-sm t-text">{coin.name}</div>
            <div className="text-[10px] t-sub uppercase">{coin.symbol}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {n && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: NARRATIVE_BG[n] || '#1e293b', color: NARRATIVE_TEXT[n] || '#cbd5e1' }}>
              {n}
            </span>
          )}
          <span style={{ color: scoreColor, fontWeight: 700, fontSize: '1rem' }}>{coin.score.toFixed(1)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between"><span className="t-sub">Market Cap</span><span className="t-text">${coin.market_cap.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="t-sub">Prix</span><span className="t-text">{coin.price != null ? `$${Number(coin.price).toFixed(6)}` : '—'}</span></div>
        <div className="flex justify-between"><span className="t-sub">Volume 24h</span><span className="t-text">${coin.volume_24h.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="t-sub">Liquidité</span><span className="t-text">{coin.liquidity ? `$${Number(coin.liquidity).toLocaleString()}` : '—'}</span></div>
        <div className="flex justify-between"><span className="t-sub">Manip.</span>
          <span style={{ color: manipColor || 'var(--text-muted)' }} className="font-semibold">
            {coin.manipulation_score != null ? `${(coin.manipulation_score * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="flex justify-between"><span className="t-sub">Âge paire</span><span className="t-text">{!coin.pair_age_days || coin.pair_age_days === 999 ? '—' : `${coin.pair_age_days}j`}</span></div>
      </div>
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => (localStorage.getItem('theme') || 'dark') === 'dark')
  const [data, setData]               = useState<Crypto[]>([])
  const [lastUpdate, setLastUpdate]   = useState('')
  const [cachedCount, setCachedCount] = useState(0)
  const [isUpdating, setIsUpdating]   = useState(false)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [sorting, setSorting]         = useState<SortingState>([{ id: 'score', desc: true }])
  const [page, setPage]               = useState(1)
  const PAGE_SIZE = 14
  const prevCountRef = useRef(0)

  // Détection breakpoint
  const [isMobile, setIsMobile]   = useState(() => window.innerWidth < 768)
  const [isTablet, setIsTablet]   = useState(() => window.innerWidth >= 768 && window.innerWidth < 1024)
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const load = async () => {
    try { const res = await fetchRanking(100); setData(res.top); setLastUpdate(res.last_update); setError('') }
    catch { setError('Backend inaccessible — dernières données connues affichées.') }
  }

  const checkHealth = async () => {
    try {
      const h = await fetchHealth()
      setCachedCount(h.cached_coins)
      setIsUpdating((h as any).is_updating ?? false)
      if (h.cached_coins !== prevCountRef.current) { prevCountRef.current = h.cached_coins; load() }
    } catch { setIsUpdating(false) }
  }

  useEffect(() => {
    load()
    const hId = setInterval(checkHealth, 5_000)
    const dId = setInterval(load, 30_000)
    const kaId = setInterval(() => fetchHealth().catch(() => {}), 10 * 60 * 1000)
    return () => { clearInterval(hId); clearInterval(dId); clearInterval(kaId) }
  }, [])

  const filtered = useMemo(() =>
    data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  useEffect(() => { setPage(1) }, [search])

  const activeColumns = isTablet ? tabletColumns : columns
  const table = useReactTable({
    data: paginated, columns: activeColumns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  })

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.backgroundColor = next ? '#0f172a' : '#f8fafc'
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <div className="t-bg min-h-screen flex flex-col px-3 py-3 md:px-4 w-full max-w-[1600px] mx-auto"
      style={{ height: isMobile ? 'auto' : '100vh', overflow: isMobile ? 'auto' : 'hidden' }}>

      {/* Header */}
      <div className="mb-2 shrink-0 flex items-center justify-between">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight" style={{ color: '#3b82f6' }}>Crypto Gem Ranking</h1>
        <button onClick={toggleTheme}
          className="t-btn px-3 py-1.5 rounded-lg border text-xs font-medium transition hover:opacity-80 md:hidden">
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {error && (
        <div className="mb-2 p-2 rounded-lg border text-xs shrink-0"
          style={{ backgroundColor: 'rgba(234,179,8,0.1)', borderColor: '#ca8a04', color: '#ca8a04' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Barre de contrôles */}
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0 flex-wrap">
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="t-input px-3 py-1.5 rounded-lg text-sm border focus:outline-none"
            style={{ width: isMobile ? '40vw' : '15vw', minWidth: '100px', backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          <button onClick={load} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            {isMobile ? '↻' : 'Rafraîchir'}
          </button>
        </div>

        <p className="text-xs t-muted text-center hidden md:block">
          Small caps — mise à jour : <span className="t-text">{lastUpdate || '—'}</span>
          <span className="ml-3 inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isUpdating ? `Scoring en cours — ${cachedCount} coins` : `${cachedCount} coins en cache`}</span>
          </span>
        </p>

        <button onClick={toggleTheme}
          className="t-btn px-3 py-1.5 rounded-lg border text-xs font-medium transition hover:opacity-80 hidden md:block">
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Status mobile */}
      {isMobile && (
        <p className="text-xs t-muted mb-2 shrink-0">
          Màj : <span className="t-text">{lastUpdate || '—'}</span>
          <span className="ml-2 inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isUpdating ? `Scoring — ${cachedCount}` : `${cachedCount} coins`}</span>
          </span>
        </p>
      )}

      {/* Vue mobile : cards */}
      {isMobile ? (
        <div className="flex flex-col gap-2 pb-4">
          {data.length === 0 ? (
            <div className="flex items-center justify-center py-12 t-muted">
              {error ? 'Aucune donnée disponible.' : 'Chargement des gems...'}
            </div>
          ) : (
            paginated.map((coin, i) => (
              <CoinCard key={coin.id} coin={coin} rank={(page - 1) * PAGE_SIZE + i + 1} />
            ))
          )}
        </div>
      ) : (
        /* Vue tablette/desktop : tableau */
        <div className="flex-1 min-h-0 rounded-xl border shadow-lg overflow-hidden t-border"
          style={{ borderColor: 'var(--border)' }}>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full t-muted">
              {error ? 'Aucune donnée disponible.' : 'Chargement des gems...'}
            </div>
          ) : (
            <div className="h-full overflow-y-auto overflow-x-hidden t-card">
              <table className="w-full text-sm text-left table-fixed">
                <colgroup>
                  {isTablet
                    ? ['22%','10%','12%','18%','18%','12%'].map((w,i) => <col key={i} style={{ width: w }} />)
                    : ['14%','6%','7%','10%','8%','10%','10%','6%','9%','8%','6%','7%','9%'].map((w,i) => <col key={i} style={{ width: w }} />)
                  }
                </colgroup>
                <thead className="sticky top-0 t-head" style={{ zIndex: 100 }}>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="t-border-b">
                      {hg.headers.map(h => (
                        <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                          className="px-3 py-2.5 cursor-pointer select-none text-xs uppercase text-left">
                          <span className="flex items-center gap-0.5">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <span style={{ color: 'var(--cyan)', fontSize: '10px' }}>
                              {h.column.getIsSorted() === 'asc' ? '↑' : h.column.getIsSorted() === 'desc' ? '↓' : ''}
                            </span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className={`t-hover t-border-b ${i < 3 ? 't-row-top' : 't-row'}`}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-3 py-2 text-left overflow-hidden text-ellipsis">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && search && <p className="text-center py-2 t-muted text-xs shrink-0">Aucun résultat.</p>}

      {/* Footer + pagination */}
      <div className="shrink-0 flex items-center justify-between mt-2 flex-wrap gap-2">
        <p className="t-sub text-xs">
          ⚠️ Ceci n'est pas un conseil financier.{' '}
          <span className="relative inline-block group">
            <span className="cursor-help underline decoration-dotted" style={{ color: 'var(--cyan)' }}>DYOR</span>
            <span className="t-tooltip pointer-events-none absolute bottom-[calc(100%+8px)] left-0 w-64
              rounded-xl px-3 py-2.5 text-left text-xs whitespace-normal leading-relaxed border shadow-2xl
              opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[9999]">
              <span className="block font-semibold mb-1" style={{ color: 'var(--cyan)' }}>"DYOR" — Do Your Own Research</span>
              Fais tes propres recherches. Les données sont informatives, pas des conseils d'investissement.
            </span>
          </span>.
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded text-xs t-muted hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 rounded text-xs t-muted hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition">‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`e-${i}`} className="px-1 t-sub text-xs">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className="min-w-[28px] px-2 py-1 rounded text-xs font-medium transition"
                    style={{ backgroundColor: page === p ? '#2563eb' : 'transparent', color: page === p ? '#fff' : 'var(--text-muted)' }}>
                    {p}
                  </button>
              )}

            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs t-muted hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs t-muted hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition">»</button>

            <span className="ml-2 text-xs t-sub tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
