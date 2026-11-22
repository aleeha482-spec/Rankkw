import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import type { KeywordItem, KeywordResearchResponse } from '../types';
import { exportToCsv, sanitizeEtsyTag } from '../utils/etsyRules';
import { useAuth } from '../context/AuthContext';
import { Sparkline } from './Sparkline';

interface KeywordExplorerProps {
  seedQuery: string;
  autoSearchVersion?: number;
  onSeedQueryChange: (val: string) => void;
  result: KeywordResearchResponse | null;
  onResultChange: (res: KeywordResearchResponse | null) => void;
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
  onSendKeywordToOptimizer: (kw: string) => void;
}

const QUICK_EXAMPLES = [
  'personalized leather wallet',
  'minimalist gold stacking ring',
  'printable wedding welcome sign',
  'custom embroidered sweatshirt',
  'handmade ceramic coffee mug',
];

const PAGE_SIZE = 10;

export function KeywordExplorer({
  seedQuery,
  autoSearchVersion = 0,
  onSeedQueryChange,
  result,
  onResultChange,
  tagCart,
  onAddTagToCart,
  onSendKeywordToOptimizer,
}: KeywordExplorerProps) {
  const { workspace, saveKeyword, logSearch } = useAuth();
  const [marketplace, setMarketplace] = useState('United States');
  const [intent, setIntent] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'fits_tag' | 'low_comp' | 'high_opp'>('all');
  const [sortBy, setSortBy] = useState<'opportunity' | 'searches' | 'competition' | 'price'>('opportunity');
  const [page, setPage] = useState(1);
  const [copiedKw, setCopiedKw] = useState<string | null>(null);
  const [savingKw, setSavingKw] = useState<string | null>(null);

  async function runSearch(overrideSeed?: string) {
    const query = (overrideSeed ?? seedQuery).trim();
    if (!query) {
      setError('Enter a product keyword or phrase to research.');
      return;
    }
    if (overrideSeed) {
      onSeedQueryChange(overrideSeed);
    }
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const res = await fetch('/api/etsy/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedKeyword: query, marketplace, intent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to research keywords.');
      }
      const typed = data as KeywordResearchResponse;
      onResultChange(typed);
      void logSearch('Keyword Research', query, `${typed.keywords.length} keywords · avg ${typed.seedSummary.avgMonthlySearches}/mo`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while fetching keywords.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSearchVersion > 0 && seedQuery.trim()) {
      void runSearch(seedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchVersion]);

  const filteredKeywords = useMemo(() => {
    if (!result?.keywords) return [];
    let list = [...result.keywords];
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      list = list.filter((k) => k.keyword.toLowerCase().includes(q));
    }
    if (activeFilter === 'fits_tag') {
      list = list.filter((k) => k.fitsEtsyTag);
    } else if (activeFilter === 'low_comp') {
      list = list.filter((k) => k.competitionLabel === 'Low');
    } else if (activeFilter === 'high_opp') {
      list = list.filter((k) => k.opportunityScore >= 70);
    }

    list.sort((a, b) => {
      if (sortBy === 'searches') return b.monthlySearches - a.monthlySearches;
      if (sortBy === 'competition') return a.competitionScore - b.competitionScore;
      if (sortBy === 'price') return b.avgPriceUsd - a.avgPriceUsd;
      return b.opportunityScore - a.opportunityScore;
    });
    return list;
  }, [result, filterText, activeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredKeywords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedKeywords = useMemo(
    () => filteredKeywords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredKeywords, safePage]
  );

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKw(text);
    setTimeout(() => setCopiedKw((prev) => (prev === text ? null : prev)), 1500);
  }

  async function handleSaveKeyword(item: KeywordItem) {
    setSavingKw(item.keyword);
    try {
      await saveKeyword({
        keyword: item.keyword,
        monthlySearches: item.monthlySearches,
        competitionLabel: item.competitionLabel,
        opportunityScore: item.opportunityScore,
        avgPriceUsd: item.avgPriceUsd.toFixed(2),
        trend: item.trend,
      });
    } finally {
      setSavingKw(null);
    }
  }

  function handleExportCsv() {
    if (!filteredKeywords.length) return;
    exportToCsv(
      `craftrank-keywords-${(result?.seedSummary.keyword || 'export').replace(/\s+/g, '-')}.csv`,
      [
        'Keyword',
        'Length',
        'Fits 20-Char Tag',
        'Est Monthly Searches',
        'Est Competition',
        'Est Competing Listings',
        'Opportunity Score',
        'Avg Price USD',
        'Trend',
        'Buyer Intent',
      ],
      filteredKeywords.map((k: KeywordItem) => [
        k.keyword,
        k.keyword.length,
        k.fitsEtsyTag ? 'Yes' : 'No',
        k.monthlySearches,
        k.competitionLabel,
        k.competingListingsEst,
        k.opportunityScore,
        k.avgPriceUsd,
        k.trend,
        k.buyerIntent,
      ])
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Console */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Etsy Keyword Explorer
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Uncover high-intent buyer search terms, estimated demand, competition density, and 20-character ready Etsy tags. Unlimited searches.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-3"
          >
            <div className="lg:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={seedQuery}
                onChange={(e) => onSeedQueryChange(e.target.value)}
                placeholder="Enter product or seed keyword (e.g. engraved brass bookmark)"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                aria-label="Target marketplace"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
              >
                <option value="United States">US Market</option>
                <option value="United Kingdom">UK Market</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="European Union">EU Market</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                aria-label="Buyer intent filter"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
              >
                <option value="All">All Buyer Intent</option>
                <option value="Gift Buyers">Gift Buyers</option>
                <option value="Personalized / Custom">Personalized</option>
                <option value="Digital Downloads">Digital Downloads</option>
                <option value="Wedding & Events">Wedding & Events</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{loading ? 'Analyzing...' : 'Find Keywords'}</span>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Try:</span>
            {QUICK_EXAMPLES.map((ex, i) => (
              <span key={ex} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runSearch(ex)}
                  className="hover:text-violet-600 dark:hover:text-violet-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 transition-colors cursor-pointer"
                >
                  {ex}
                </button>
                {i < QUICK_EXAMPLES.length - 1 && (
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                )}
              </span>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
              >
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
            ))}
          </div>
        </section>
      )}

      {/* Populated Results */}
      {!loading && result && (
        <>
          {/* 4-Column Seed KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Monthly Searches (Estimated)
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {result.seedSummary.avgMonthlySearches.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Trend: {result.seedSummary.trendDirection} · {result.seedSummary.seasonalPeak}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Competition Level (Estimated)
              </div>
              <div
                className={`mt-1.5 text-2xl font-bold ${
                  result.seedSummary.competitionLabel === 'Low'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : result.seedSummary.competitionLabel === 'High'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {result.seedSummary.competitionLabel}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                ~{result.seedSummary.competingListingsEst.toLocaleString()} competing listings
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Keyword Opportunity
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {result.seedSummary.opportunityScore}
                <span className="text-sm font-normal text-slate-400"> / 100</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                CTR: {result.seedSummary.ctrPotential}
                {result.seedSummary.viewsToFavoritesRatio && (
                  <> · Views-to-Favs: {result.seedSummary.viewsToFavoritesRatio}</>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Avg Listing Price (Estimated)
                </div>
                <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  ${result.seedSummary.avgPriceUsd.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSendKeywordToOptimizer(result.seedSummary.keyword)}
                className="mt-2 text-left text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Build listing for this keyword →
              </button>
            </div>
          </section>

          {/* High-Density Keyword Data Table */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      ['all', `All (${result.keywords.length})`],
                      ['fits_tag', 'Fits 20-Char Tag'],
                      ['low_comp', 'Low Competition'],
                      ['high_opp', 'Opportunity 70+'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveFilter(key);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeFilter === key
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => {
                    setFilterText(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter keywords..."
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
                />

                <div className="inline-flex items-center gap-1.5">
                  <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    aria-label="Sort keywords"
                    className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="opportunity">Sort: Opportunity</option>
                    <option value="searches">Sort: Search Volume</option>
                    <option value="competition">Sort: Lowest Competition</option>
                    <option value="price">Sort: Avg Price</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Keyword Phrase</th>
                    <th className="py-2.5 px-3 text-right">Est. Searches/mo</th>
                    <th className="py-2.5 px-3">Trend</th>
                    <th className="py-2.5 px-3">Competition</th>
                    <th className="py-2.5 px-3 text-right">Opportunity</th>
                    <th className="py-2.5 px-3 text-right">Avg Price</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {pagedKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No keywords match your current filter. Try clearing the filter above.
                      </td>
                    </tr>
                  ) : (
                    pagedKeywords.map((item) => {
                      const sanitized = sanitizeEtsyTag(item.keyword);
                      const inCart = tagCart.some((t) => t.toLowerCase() === sanitized.toLowerCase());
                      const isSaved = workspace.savedKeywords.some(
                        (s) => s.keyword.toLowerCase() === item.keyword.toLowerCase()
                      );

                      return (
                        <tr
                          key={item.keyword}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {item.keyword}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono tabular-nums">{item.keyword.length}/20 chars</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.fitsEtsyTag ? 'Tag-ready' : 'Title phrase'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.buyerIntent}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                            {item.monthlySearches.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Sparkline data={item.sparkline} trend={item.trend} />
                              <span className="text-xs text-slate-600 dark:text-slate-300">
                                {item.trend}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div
                              className={`text-xs font-semibold ${
                                item.competitionLabel === 'Low'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.competitionLabel === 'High'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {item.competitionLabel}
                            </div>
                            <div className="text-xs font-mono tabular-nums text-slate-400">
                              ~{item.competingListingsEst.toLocaleString()} listings
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.opportunityScore >= 75
                                      ? 'bg-emerald-500'
                                      : item.opportunityScore >= 50
                                      ? 'bg-violet-500'
                                      : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${item.opportunityScore}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 w-6">
                                {item.opportunityScore}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            ${item.avgPriceUsd.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => void handleSaveKeyword(item)}
                                disabled={isSaved || savingKw === item.keyword}
                                title={isSaved ? 'Saved in Bank' : 'Save keyword to Bank'}
                                className={`h-8 px-2.5 rounded-md border text-xs inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                                  isSaved
                                    ? 'border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                                <span>{isSaved ? 'Saved' : 'Save'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopy(item.keyword)}
                                title="Copy keyword"
                                className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                {copiedKw === item.keyword ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => onAddTagToCart(sanitized)}
                                disabled={inCart || tagCart.length >= 13}
                                title={
                                  inCart
                                    ? 'Already in your 13-tag cart'
                                    : tagCart.length >= 13
                                    ? '13-tag cart is full'
                                    : `Add "${sanitized}" to 13-tag cart`
                                }
                                className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                  inCart
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-violet-600 dark:hover:bg-violet-500 dark:hover:text-white disabled:opacity-40'
                                }`}
                              >
                                {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                <span>{inCart ? 'In Tags' : 'Tag'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {filteredKeywords.length > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing{' '}
                  <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredKeywords.length)}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {filteredKeywords.length}
                  </strong>{' '}
                  keywords
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="font-mono tabular-nums px-2">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Empty Initial State */}
      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Search any product niche to reveal 24 buyer keywords
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1.5">
            Every search returns monthly demand estimates, competing listing counts, 20-character tag compatibility, and instant 1-click tag building — with zero credits or limits.
          </p>
        </section>
      )}
    </div>
  );
}
