import { useState } from 'react';
import { ExternalLink, Loader2, Search, TrendingUp } from 'lucide-react';
import type { TrendsDemandResponse } from '../types';
import { useAuth } from '../context/AuthContext';

interface TrendsDemandProps {
  onExploreKeyword: (kw: string) => void;
}

export function TrendsDemand({ onExploreKeyword }: TrendsDemandProps) {
  const { logSearch } = useAuth();
  const [topic, setTopic] = useState('personalized handmade gifts');
  const [timeframe, setTimeframe] = useState('12 Months');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrendsDemandResponse | null>(null);

  async function runTrends(overrideTopic?: string) {
    const q = (overrideTopic ?? topic).trim();
    if (!q) {
      setError('Enter a product niche, season, or Etsy category to analyze trends.');
      return;
    }
    if (overrideTopic) setTopic(overrideTopic);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: q, timeframe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze trends.');
      const typed = data as TrendsDemandResponse;
      setResult(typed);
      void logSearch('Trends & Demand', q, `${typed.risingSearchTerms.length} rising terms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading trends.');
    } finally {
      setLoading(false);
    }
  }

  // Dual-line SVG chart geometry
  const curve = result?.monthlyDemandCurve ?? [];
  const chartW = 680;
  const chartH = 210;
  const padX = 32;
  const padY = 20;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  function buildPolyline(values: number[]) {
    if (values.length < 2) return '';
    return values
      .map((val, idx) => {
        const x = padX + (idx / (values.length - 1)) * innerW;
        const y = padY + innerH - (Math.max(0, Math.min(100, val)) / 100) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy Trends &amp; Seasonal Demand
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect rising Etsy search terms, seasonal demand curves vs. prior year, and high-momentum categories backed by live web search grounding.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runTrends();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3"
        >
          <div className="lg:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter niche or seasonal theme (e.g. minimalist jewelry, fall home decor)"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="12 Months">Last 12 Months (YoY)</option>
              <option value="Q4 Holiday Peak">Q4 Holiday Peak</option>
              <option value="Spring & Wedding">Spring &amp; Wedding</option>
              <option value="Evergreen Year-Round">Evergreen Year-Round</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              <span>{loading ? 'Analyzing...' : 'Analyze Trends'}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">Explore:</span>
          {['custom wedding signs', 'crochet plushies', 'digital planners', 'linen kitchenware'].map((ex, i, arr) => (
            <span key={ex} className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runTrends(ex)}
                className="hover:text-violet-600 underline underline-offset-2 cursor-pointer"
              >
                {ex}
              </button>
              {i < arr.length - 1 && <span aria-hidden="true">·</span>}
            </span>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
          <div className="h-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
        </div>
      )}

      {!loading && result && (
        <>
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Monthly Search Demand Index — Current vs. Prior Year (Estimated)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {result.summary}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                  <span className="w-3 h-0.5 bg-violet-600 inline-block" /> Current Year
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block" /> Prior Year
                </span>
              </div>
            </div>

            {curve.length >= 2 && (
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[540px] h-52">
                  {[25, 50, 75, 100].map((tick) => {
                    const y = padY + innerH - (tick / 100) * innerH;
                    return (
                      <g key={tick}>
                        <line
                          x1={padX}
                          y1={y}
                          x2={chartW - padX}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={6}
                          y={y + 4}
                          className="fill-slate-400 text-[10px] font-mono"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  <polyline
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    points={buildPolyline(curve.map((c) => Number(c.priorYear) || 0))}
                  />
                  <polyline
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolyline(curve.map((c) => Number(c.interest) || 0))}
                  />

                  {curve.map((pt, idx) => {
                    const x = padX + (idx / (curve.length - 1)) * innerW;
                    const y = padY + innerH - (Math.max(0, Math.min(100, Number(pt.interest) || 0)) / 100) * innerH;
                    return (
                      <g key={pt.month}>
                        <circle cx={x} cy={y} r="3.5" fill="#7C3AED" />
                        <text
                          x={x}
                          y={chartH - 3}
                          textAnchor="middle"
                          className="fill-slate-500 text-[10px] font-mono"
                        >
                          {pt.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Rising Terms */}
            <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Rising Etsy Search Terms
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.risingSearchTerms.map((row) => (
                  <div key={row.term} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {row.term}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.category} · Est. {Number(row.estMonthlySearches).toLocaleString()} searches/mo
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {row.growthLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => onExploreKeyword(row.term)}
                        className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Keywords →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Popular Categories & Takeaways */}
            <div className="lg:col-span-5 space-y-6">
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  High-Momentum Categories
                </h2>
                <div className="space-y-3">
                  {result.popularCategories.map((cat) => (
                    <div key={cat.category} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.category}</span>
                        <span className="font-mono tabular-nums text-slate-500">
                          ${Number(cat.avgPriceUsd).toFixed(2)} avg · {cat.momentum}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full"
                          style={{ width: `${Math.min(100, Number(cat.demandScore) || 60)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Seasonal Strategy Notes
                </h2>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.seasonalTakeaways.map((note, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-mono text-violet-600 font-semibold">{idx + 1}.</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {result.sources.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap gap-3 items-center text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Search Grounded Sources:</span>
              {result.sources.map((s) => (
                <a
                  key={s.uri}
                  href={s.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <span className="truncate max-w-[240px]">{s.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </section>
          )}
        </>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <TrendingUp className="w-8 h-8 text-violet-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Track rising buyer demand before the season peaks
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
            Enter a product category or niche above to inspect YoY demand curves and breakout Etsy search phrases.
          </p>
        </section>
      )}
    </div>
  );
}
