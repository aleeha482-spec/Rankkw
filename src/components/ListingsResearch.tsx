import { useState } from 'react';
import { Check, Layers, Loader2, Plus, Search } from 'lucide-react';
import type { ListingsResearchResponse } from '../types';
import { sanitizeEtsyTag } from '../utils/etsyRules';

interface ListingsResearchProps {
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
  onInspectShop: (shopName: string) => void;
}

export function ListingsResearch({
  tagCart,
  onAddTagToCart,
  onInspectShop,
}: ListingsResearchProps) {
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('Any');
  const [sortFocus, setSortFocus] = useState('Best Performing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ListingsResearchResponse | null>(null);

  async function runResearch(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError('Enter a product keyword to inspect top Etsy listings.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/listings-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, priceFilter, sortFocus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze listings.');
      setResult(data as ListingsResearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error analyzing listings.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy Listings Research
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect active competitor listings side-by-side: views, favorites, estimated monthly sales, listing age, price spread, and shared tag patterns.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runResearch();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3"
        >
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search niche listings (e.g. linen apron, custom dog collar, resin coaster)"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              aria-label="Price bracket"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="Any">Any Price</option>
              <option value="Under $20">Under $20</option>
              <option value="$20 - $50">$20 – $50</option>
              <option value="$50+">$50+ Premium</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={sortFocus}
              onChange={(e) => setSortFocus(e.target.value)}
              aria-label="Listing sort focus"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="Best Performing">Best Performing</option>
              <option value="Newest Rising">Newest Rising</option>
              <option value="Highest Favorites">Most Favorited</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              <span>{loading ? 'Inspecting...' : 'Analyze Listings'}</span>
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
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
            ))}
          </div>
          <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
        </div>
      )}

      {!loading && result && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Average Price</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                ${Number(result.avgPriceUsd).toFixed(2)}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-400">
                Range: {result.priceRange}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Median Price</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                ${Number(result.medianPriceUsd).toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Sweet-spot benchmark</div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Avg Monthly Views</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {Number(result.avgMonthlyViews).toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">Top-10 listing average</div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Market Gaps Found</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {result.marketGaps.length}
              </div>
              <div className="mt-1 text-xs text-slate-400">Differentiation angles</div>
            </div>
          </section>

          {/* Shared Tags + Market Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Most Frequently Used Tags in Top Listings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click Add to save directly into your 13-tag cart.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.topCommonTags.map((t) => {
                  const clean = sanitizeEtsyTag(t.tag);
                  const inCart = tagCart.some((c) => c.toLowerCase() === clean.toLowerCase());
                  return (
                    <div
                      key={t.tag}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {clean}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-400">
                          Used by {t.frequencyPercent}% · {clean.length}/20 chars
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddTagToCart(clean)}
                        disabled={inCart || tagCart.length >= 13}
                        className={`h-7 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                          inCart
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-violet-600'
                        }`}
                      >
                        {inCart ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>{inCart ? 'Added' : 'Add'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Uncovered Market Gaps
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.marketGaps.map((gap, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-violet-600 font-semibold">{i + 1}.</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Competing Listings Table */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Top Competing Listings Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Listing &amp; Tag Structure</th>
                    <th className="py-2.5 px-3">Shop</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Est. Sales/mo</th>
                    <th className="py-2.5 px-3 text-right">Views / Favs</th>
                    <th className="py-2.5 px-4 text-right">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {result.listings.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900 dark:text-slate-100 leading-snug">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {item.bestsellerBadge && (
                            <span className="font-semibold text-violet-600 dark:text-violet-400 mr-1.5">
                              Bestseller ·
                            </span>
                          )}
                          <span>{item.whyItRanks}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Tags: {item.tagsUsed.join(' · ')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => onInspectShop(item.shopName)}
                          className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-violet-600 underline decoration-slate-300 underline-offset-2 whitespace-nowrap cursor-pointer"
                        >
                          {item.shopName}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        ${Number(item.priceUsd).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(item.estMonthlySales).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                        {Number(item.estViews).toLocaleString()} / {Number(item.estFavorites).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-500">
                        {item.listingAgeMonths} mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <Layers className="w-8 h-8 text-violet-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Inspect active Etsy listings in any niche
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
            See pricing distribution, estimated views-to-favorites performance, listing age, and shared tags across top listings.
          </p>
        </section>
      )}
    </div>
  );
}
