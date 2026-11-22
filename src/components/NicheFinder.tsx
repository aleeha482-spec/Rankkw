import { useState } from 'react';
import { Check, Compass, Loader2, Plus, Search } from 'lucide-react';
import type { CategoryReportResponse } from '../types';
import { sanitizeEtsyTag } from '../utils/etsyRules';

interface NicheFinderProps {
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
  onExploreKeyword: (kw: string) => void;
  onBuildListing: (idea: string) => void;
}

const CATEGORIES = [
  'Jewelry & Accessories',
  'Home & Living Decor',
  'Digital Downloads & Printables',
  'Personalized Gifts',
  'Apparel & Print on Demand',
  'Wedding & Party Supplies',
  'Craft Supplies & Tools',
  'Art & Wall Prints',
];

export function NicheFinder({
  tagCart,
  onAddTagToCart,
  onExploreKeyword,
  onBuildListing,
}: NicheFinderProps) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [maxCompetition, setMaxCompetition] = useState('Low to Medium');
  const [priceTier, setPriceTier] = useState('Mid ($25 - $75)');
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CategoryReportResponse | null>(null);

  async function findNiches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, maxCompetition, priceTier, focus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load category report.');
      }
      setResult(data as CategoryReportResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading category report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Category Report &amp; Niche Finder
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Macro category pricing distribution, top shared category tags, and low-saturation Etsy sub-niches ready to launch.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Etsy Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Competition Ceiling
            </label>
            <select
              value={maxCompetition}
              onChange={(e) => setMaxCompetition(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-600"
            >
              <option value="Low Only">Low Only</option>
              <option value="Low to Medium">Low to Medium</option>
              <option value="Any (High Volume)">Any (High Volume)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Price Tier
            </label>
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-600"
            >
              <option value="Digital / Under $15">Under $15</option>
              <option value="Mid ($25 - $75)">$25 – $75</option>
              <option value="Premium ($80+)">$80+ High Ticket</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Craft / Skill Focus
            </label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. laser engraving, Canva"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={findNiches}
              disabled={loading}
              className="w-full h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
              <span>{loading ? 'Generating...' : 'Run Report'}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-3"
            >
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* Macro Category Report */}
          {result.macroMetrics && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Macro Category Report
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {result.marketNote}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-slate-400">Avg Price</div>
                    <div className="font-mono tabular-nums font-bold text-base text-slate-900 dark:text-slate-100">
                      ${Number(result.macroMetrics.avgPriceUsd).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Median</div>
                    <div className="font-mono tabular-nums font-bold text-base text-slate-900 dark:text-slate-100">
                      ${Number(result.macroMetrics.medianPriceUsd).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Avg Favorites</div>
                    <div className="font-mono tabular-nums font-bold text-base text-slate-900 dark:text-slate-100">
                      {Number(result.macroMetrics.avgFavoritesPerListing).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Price Bracket Distribution
                  </div>
                  {result.macroMetrics.priceBrackets.map((b) => (
                    <div key={b.label} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">{b.label}</span>
                        <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {b.sharePercent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full"
                          style={{ width: `${Math.min(100, b.sharePercent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Top Shared Category Tags
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    High-performing tags frequently shared by top-ranked listings in {result.category}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.macroMetrics.topCategoryTags.map((rawTag) => {
                    const clean = sanitizeEtsyTag(rawTag);
                    const inCart = tagCart.some((c) => c.toLowerCase() === clean.toLowerCase());
                    return (
                      <div
                        key={rawTag}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {clean}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-400">
                            {clean.length}/20 chars
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
                          <span>{inCart ? 'In Tags' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Sub-Niche Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.niches.map((niche) => (
              <article
                key={niche.nicheName}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {niche.nicheName}
                      </h2>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            niche.competitionLevel === 'Low'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : niche.competitionLevel === 'High'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {niche.competitionLevel} Competition
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Demand: {niche.demandLevel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">${Number(niche.avgPriceUsd).toFixed(2)} avg</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {niche.opportunityScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Opportunity</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {niche.whyNow} <span className="text-slate-400">({niche.seasonalWindow})</span>
                  </p>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Product Angles:</div>
                    <ul className="space-y-1 list-disc pl-4">
                      {niche.productAngles.map((ang, i) => (
                        <li key={i}>{ang}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {niche.seedKeywords.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => onExploreKeyword(kw)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-xs text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>{kw}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onBuildListing(`${niche.nicheName} — ${niche.productAngles[0] || ''}`)}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Create Listing →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Generate a Category Report &amp; Sub-Niche Matrix
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1.5">
            Inspect category price brackets, top common tags, and profitable low-saturation niches in one report.
          </p>
        </section>
      )}
    </div>
  );
}
