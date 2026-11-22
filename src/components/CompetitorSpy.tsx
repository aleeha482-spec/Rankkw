import { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import type { CompetitorAnalysisResponse } from '../types';
import { sanitizeEtsyTag } from '../utils/etsyRules';

interface CompetitorSpyProps {
  initialShop?: string;
  autoScanVersion?: number;
  trackedShops: string[];
  onToggleTrackShop: (name: string) => void;
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
  onExploreKeyword: (kw: string) => void;
}

export function CompetitorSpy({
  initialShop = '',
  autoScanVersion = 0,
  trackedShops,
  onToggleTrackShop,
  tagCart,
  onAddTagToCart,
  onExploreKeyword,
}: CompetitorSpyProps) {
  const [query, setQuery] = useState(initialShop);
  const [marketplace, setMarketplace] = useState('United States');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompetitorAnalysisResponse | null>(null);

  useEffect(() => {
    if (autoScanVersion > 0 && initialShop.trim()) {
      void runAnalysis(initialShop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScanVersion]);

  async function runAnalysis(overrideQuery?: string) {
    const target = (overrideQuery ?? query).trim();
    if (!target) {
      setError('Enter an Etsy shop name, Etsy URL, or competing product niche.');
      return;
    }
    if (overrideQuery) {
      setQuery(overrideQuery);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: target, marketplace }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze competitor.');
      }
      setResult(data as CompetitorAnalysisResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during competitor scan.');
    } finally {
      setLoading(false);
    }
  }

  const isTracked = result
    ? trackedShops.some((s) => s.toLowerCase() === result.targetName.toLowerCase())
    : false;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Competitor Shop &amp; Keyword Gap Spy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze competing Etsy shops or product niches using live web search to uncover pricing ranges, conversion drivers, and untapped keyword gaps.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAnalysis();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3"
        >
          <div className="lg:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Etsy shop name, listing URL, or niche (e.g. CaitlynMinimalist or custom neon sign)"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              aria-label="Target marketplace"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-600"
            >
              <option value="United States">US Etsy Market</option>
              <option value="United Kingdom">UK Etsy Market</option>
              <option value="Canada">Canada Etsy Market</option>
              <option value="European Union">EU Etsy Market</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              <span>{loading ? 'Scanning...' : 'Analyze Shop'}</span>
            </button>
          </div>
        </form>

        {/* Saved Competitors Strip */}
        {trackedShops.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Tracked Competitors:</span>
            {trackedShops.map((shop) => (
              <div
                key={shop}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1"
              >
                <button
                  type="button"
                  onClick={() => runAnalysis(shop)}
                  className="font-medium text-slate-700 dark:text-slate-200 hover:text-violet-600 cursor-pointer"
                >
                  {shop}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTrackShop(shop)}
                  aria-label={`Remove ${shop}`}
                  className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 animate-pulse">
          <div className="h-6 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 bg-slate-100 dark:bg-slate-800/60 rounded" />
            <div className="h-44 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        </section>
      )}

      {!loading && result && (
        <>
          {/* Competitor Summary Card */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {result.targetName}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                  {result.marketPositioning}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onToggleTrackShop(result.targetName)}
                className={`h-9 px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isTracked
                    ? 'border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isTracked ? 'Tracked Shop' : 'Track Shop'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Benchmark Price Range</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {result.estimatedPriceRange}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Est. Sales Velocity</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {result.estimatedMonthlyOrdersRange}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Keyword Gaps Uncovered</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {result.keywordGaps.length} Untapped Terms
                </div>
              </div>
            </div>
          </section>

          {/* Keyword Gaps & Competitor Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Untapped Keyword Gaps */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Untapped Keyword Gaps
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  High-intent terms competitors underutilize — add directly to your 13 tags.
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.keywordGaps.map((gap) => {
                  const tagClean = sanitizeEtsyTag(gap.keyword);
                  const inCart = tagCart.some((t) => t.toLowerCase() === tagClean.toLowerCase());
                  return (
                    <div key={gap.keyword} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {gap.keyword}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {gap.whyItMatters}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                          ~{Number(gap.estSearches || 350).toLocaleString()} searches/mo · {gap.difficulty} difficulty · {tagClean.length}/20 chars
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onExploreKeyword(gap.keyword)}
                          className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer"
                        >
                          Research
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddTagToCart(tagClean)}
                          disabled={inCart || tagCart.length >= 13}
                          className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                            inCart
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-violet-600'
                          }`}
                        >
                          {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{inCart ? 'In Tags' : 'Add Tag'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Competitor Core Keywords */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Competitor Core Keywords
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Primary terms driving traffic in this shop or niche.
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.topKeywordsUsed.map((row) => (
                  <div key={row.keyword} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {row.keyword}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.strength} · {row.gapOpportunity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onExploreKeyword(row.keyword)}
                      className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                    >
                      Explore →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Blueprints, Conversion Drivers & Action Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Conversion Drivers
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.conversionDrivers.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-mono text-slate-400">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Winning Listing Blueprints
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.winningListingBlueprints.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-mono text-slate-400">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Action Plan to Outrank
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.actionPlan.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-mono text-violet-600 font-semibold">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Grounded Web Sources */}
          {result.sources.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Live Web References Referenced
              </div>
              <div className="flex flex-wrap gap-3">
                {result.sources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <span className="truncate max-w-[260px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Reverse-engineer any Etsy competitor or niche
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1.5">
            Enter a shop name, listing URL, or product category to discover keyword gaps, benchmark pricing, and conversion tactics backed by live search grounding.
          </p>
        </section>
      )}
    </div>
  );
}
