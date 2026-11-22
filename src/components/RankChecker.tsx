import { useState } from 'react';
import { ExternalLink, Loader2, Target } from 'lucide-react';
import type { RankCheckerResponse, RankHistoryEntry } from '../types';

interface RankCheckerProps {
  history: RankHistoryEntry[];
  onRecordHistory: (entry: RankHistoryEntry) => void;
  onOptimizeListing: (idea: string) => void;
}

export function RankChecker({
  history,
  onRecordHistory,
  onOptimizeListing,
}: RankCheckerProps) {
  const [shopOrListing, setShopOrListing] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankCheckerResponse | null>(null);

  async function runRankCheck() {
    const keywords = keywordsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!shopOrListing.trim()) {
      setError('Enter your Etsy shop name, listing title, or listing URL.');
      return;
    }
    if (keywords.length === 0) {
      setError('Enter at least 1 target keyword (comma or newline separated).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/rank-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopOrListing: shopOrListing.trim(), keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check rank.');
      const typed = data as RankCheckerResponse;
      setResult(typed);
      onRecordHistory({
        id: `${Date.now()}`,
        target: typed.shopOrListing,
        checkedAt: typed.checkedAt,
        avgPosition: typed.avgPosition,
        pageOneCount: typed.pageOneCount,
        totalKeywords: typed.rows.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error checking rank.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy Rank Checker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Check where your Etsy shop or listing ranks across up to 12 target keywords using live web search visibility and Page-1 competition analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Your Etsy Shop Name, Listing Title, or URL
            </label>
            <input
              type="text"
              value={shopOrListing}
              onChange={(e) => setShopOrListing(e.target.value)}
              placeholder="e.g. OakAndBrassStudio or etsy.com/listing/..."
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Target Keywords (comma or line separated)
            </label>
            <input
              type="text"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="e.g. leather wallet, engraved wallet, gift for dad"
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={runRankCheck}
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              <span>{loading ? 'Checking...' : 'Check Rank'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className="h-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Average Rank Position</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                #{result.avgPosition}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Page-1 Keywords</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {result.pageOneCount} / {result.rows.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Target Checked</div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                  {result.shopOrListing}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOptimizeListing(result.shopOrListing)}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Boost Rank →
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Keyword</th>
                    <th className="py-2.5 px-3 text-right">Est. Position</th>
                    <th className="py-2.5 px-3 text-right">Page</th>
                    <th className="py-2.5 px-3">Visibility</th>
                    <th className="py-2.5 px-3">Page-1 Title Benchmark &amp; Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {result.rows.map((row) => (
                    <tr key={row.keyword} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.keyword}
                        <div className="text-xs text-slate-400 mt-0.5">
                          {row.competitionLevel} competition
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        #{row.estimatedPosition}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Page {row.estimatedPage}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-semibold ${
                            row.visibilityStatus.startsWith('Page 1')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.visibilityStatus === 'Page 2-3'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {row.visibilityStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 max-w-md">
                        <div className="text-slate-400 truncate">Top title: {row.topCompetitorTitle}</div>
                        <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                          Fix: {row.quickFix}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {result.sources.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap gap-3 items-center text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Live Search Checks:</span>
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

      {/* History Log */}
      {history.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recent Rank Check History
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {history.slice(0, 6).map((h) => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{h.target}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(h.checkedAt).toLocaleString()}
                  </span>
                </div>
                <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  Avg #{h.avgPosition} · {h.pageOneCount}/{h.totalKeywords} on Page 1
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
