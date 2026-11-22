import { useState } from 'react';
import { Award, Bookmark, ExternalLink, Loader2, Search } from 'lucide-react';
import type { TopSellersResponse } from '../types';

interface TopSellersProps {
  trackedShops: string[];
  onToggleTrackShop: (name: string) => void;
  onExploreKeyword: (kw: string) => void;
}

export function TopSellers({
  trackedShops,
  onToggleTrackShop,
  onExploreKeyword,
}: TopSellersProps) {
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopSellersResponse | null>(null);

  async function runTopSellers(overrideNiche?: string) {
    const target = (overrideNiche ?? niche).trim();
    if (!target) {
      setError('Enter a product niche or category to rank top Etsy shops.');
      return;
    }
    if (overrideNiche) setNiche(overrideNiche);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/top-sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: target, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rank top sellers.');
      setResult(data as TopSellersResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading top sellers.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Top Etsy Sellers Leaderboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Rank leading Etsy shops in any niche by lifetime sales, reviews, star rating, country, shop age, and flagship products.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runTopSellers();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3"
        >
          <div className="lg:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Enter niche (e.g. minimalist gold jewelry, digital planners, wooden signs)"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Shop country"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="All Countries">All Countries</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Europe">Europe</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              <span>{loading ? 'Ranking...' : 'Find Top Shops'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          {result.marketTakeaway && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Leader Takeaway: </span>
              {result.marketTakeaway}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4 w-12">#</th>
                    <th className="py-2.5 px-3">Shop &amp; Flagship Product</th>
                    <th className="py-2.5 px-3">Country</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Sales</th>
                    <th className="py-2.5 px-3 text-right">Reviews / Rating</th>
                    <th className="py-2.5 px-3 text-right">Listings</th>
                    <th className="py-2.5 px-3 text-right">Avg Price</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {result.shops.map((shop) => {
                    const tracked = trackedShops.some(
                      (s) => s.toLowerCase() === shop.shopName.toLowerCase()
                    );
                    return (
                      <tr key={`${shop.rank}-${shop.shopName}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-400">
                          {shop.rank}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {shop.shopName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {shop.specialty} · Best seller:{' '}
                            <button
                              type="button"
                              onClick={() => onExploreKeyword(shop.topWinningProduct)}
                              className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                            >
                              {shop.topWinningProduct}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                          {shop.country} · {shop.shopAgeYears}y
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(shop.lifetimeSales).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                          {Number(shop.reviewCount).toLocaleString()} ({Number(shop.rating).toFixed(1)}★)
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                          {Number(shop.activeListings).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                          ${Number(shop.avgPriceUsd).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleTrackShop(shop.shopName)}
                            className={`h-8 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                              tracked
                                ? 'border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>{tracked ? 'Tracked' : 'Track'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {result.sources.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap gap-3 items-center text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Live Sources:</span>
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
          <Award className="w-8 h-8 text-violet-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Discover the highest-volume Etsy shops in your niche
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
            Compare lifetime transactions, review velocity, catalog size, and pricing benchmarks across leading competitors.
          </p>
        </section>
      )}
    </div>
  );
}
