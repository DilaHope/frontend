import { useEffect, useState, useMemo, useRef } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { fetchRanking, fetchHealth } from './api'
import type { Crypto } from './types'

const col = createColumnHelper<Crypto>()

const columns = [
  col.accessor('name', {
    header: 'Coin',
    cell: info => (
      <div className="flex items-center gap-2">
        {info.row.original.image && (
          <img src={info.row.original.image} alt="" width={22} height={22} className="rounded-full" />
        )}
        <span className="font-medium">{info.getValue()}</span>
        <span className="text-gray-500 text-xs">{info.row.original.symbol}</span>
      </div>
    ),
  }),
  col.accessor('score', {
    header: 'Score',
    cell: info => {
      const v = info.getValue()
      const color = v >= 50 ? 'text-green-400' : v >= 25 ? 'text-yellow-400' : 'text-red-400'
      return <span className={`font-bold ${color}`}>{v.toFixed(1)}</span>
    },
  }),
  col.accessor('market_cap', {
    header: 'Market Cap',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  col.accessor('price', {
    header: 'Prix',
    cell: info => info.getValue() != null ? `$${Number(info.getValue()).toFixed(6)}` : '—',
  }),
  col.accessor('volume_24h', {
    header: 'Volume 24h',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  col.accessor('liquidity_usd', {
    header: 'Liquidité DEX',
    cell: info => info.getValue() ? `$${Number(info.getValue()).toLocaleString()}` : '—',
  }),
  col.accessor('twitter_followers', {
    header: 'Twitter',
    cell: info => info.getValue() ? Number(info.getValue()).toLocaleString() : '—',
  }),
  col.accessor('github_stars', {
    header: 'GitHub ★',
    cell: info => info.getValue() ?? '—',
  }),
]

export default function App() {
  const [data, setData]             = useState<Crypto[]>([])
  const [lastUpdate, setLastUpdate] = useState('')
  const [cachedCount, setCachedCount] = useState(0)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [sorting, setSorting]       = useState<SortingState>([{ id: 'score', desc: true }])
  const [isLive, setIsLive]         = useState(false)
  const prevCountRef                = useRef(0)

  const load = async () => {
    try {
      const res = await fetchRanking(100)
      setData(res.top)
      setLastUpdate(res.last_update)
      setError('')
    } catch {
      setError('Backend inaccessible — les dernières données connues sont affichées.')
    }
  }

  const checkHealth = async () => {
    try {
      const h = await fetchHealth()
      setCachedCount(h.cached_coins)
      // Si le nombre de coins augmente → mise à jour en cours → polling rapide
      if (h.cached_coins !== prevCountRef.current) {
        prevCountRef.current = h.cached_coins
        setIsLive(true)
        load() // charge immédiatement les nouvelles données
      }
    } catch {
      setIsLive(false)
    }
  }

  useEffect(() => {
    load()
    // Polling santé toutes les 5s pour détecter les nouvelles données en temps réel
    const healthId = setInterval(checkHealth, 5_000)
    // Refresh complet toutes les 30s
    const dataId   = setInterval(load, 30_000)
    return () => {
      clearInterval(healthId)
      clearInterval(dataId)
    }
  }, [])

  const filtered = useMemo(
    () => data.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-blue-500 mb-1">Crypto Gem Ranking</h1>
        <p className="text-gray-400 text-sm">
          Small caps classées par potentiel — dernière mise à jour : <span className="text-gray-300">{lastUpdate || '—'}</span>
        </p>

        {/* Indicateur live */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-500">
            {isLive
              ? `Mise à jour en cours — ${cachedCount} coins chargés`
              : `${cachedCount} coins en cache`}
          </span>
        </div>
      </div>

      {/* Erreur non bloquante */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Barre de recherche + refresh */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Rechercher un coin..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={load}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
        >
          Rafraîchir
        </button>
      </div>

      {/* Tableau */}
      {data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {error ? 'Aucune donnée disponible.' : 'Chargement des gems...'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800 shadow-2xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="px-4 py-3 cursor-pointer select-none hover:text-gray-200 whitespace-nowrap"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-t border-gray-800 hover:bg-gray-800/60 transition-colors ${i < 3 ? 'bg-blue-950/20' : ''}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!data.length || (filtered.length === 0 && search) ? (
        <p className="text-center py-6 text-gray-500 text-sm">
          {search ? 'Aucun résultat pour cette recherche.' : ''}
        </p>
      ) : null}

      <p className="text-center text-gray-600 text-xs mt-6">
        ⚠️ Ceci n'est pas un conseil financier.{' '}
        <span className="relative inline-block group">
          <span className="text-cyan-400 cursor-help underline decoration-dotted">
            DYOR
          </span>
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-left text-gray-300 text-xs shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
            <span className="block font-semibold text-cyan-400 mb-1">"DYOR" — Do Your Own Research</span>
            Fais tes propres recherches. Les données affichées sont purement informatives et ne constituent pas un conseil d'investissement. L'auteur de ce classement ne peut être tenu responsable de pertes financières.
            <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-700" />
          </span>
        </span>.
      </p>
    </div>
  )
}
