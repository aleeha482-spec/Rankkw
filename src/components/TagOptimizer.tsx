import { useState } from 'react';
import { Check, Copy, Loader2, Plus, Tag } from 'lucide-react';
import type { TagOptimizerResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeEtsyTag } from '../utils/etsyRules';

interface TagOptimizerProps {
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
}

export function TagOptimizer({ tagCart, onAddTagToCart }: TagOptimizerProps) {
  const { logSearch } = useAuth();
  const [focusKeyword, setFocusKeyword] = useState('');
  const [currentTagsText, setCurrentTagsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TagOptimizerResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function runTagOptimizer(e: React.FormEvent) {
    e.preventDefault();
    if (!focusKeyword.trim()) {
      setError('Enter a focus keyword to generate 13 competing Etsy tags.');
      return;
    }
    setLoading(true);
    setError(null);
    const currentTags = currentTagsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/etsy/tag-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusKeyword: focusKeyword.trim(), currentTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to optimize tags.');
      const typed = data as TagOptimizerResponse;
      setResult(typed);
      void logSearch('Tag Optimizer', focusKeyword.trim(), `${typed.tags.length} tags generated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error optimizing tags.');
    } finally {
      setLoading(false);
    }
  }

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy 13-Tag Optimizer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter a focus keyword and optional current tags to generate 13 strictly &le;20-character Etsy tags with relevance scores and missing opportunity insights.
          </p>
        </div>

        <form onSubmit={runTagOptimizer} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Focus Keyword
            </label>
            <input
              type="text"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="e.g. engraved brass bookmark"
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Existing Tags (Optional, comma separated)
            </label>
            <input
              type="text"
              value={currentTagsText}
              onChange={(e) => setCurrentTagsText(e.target.value)}
              placeholder="e.g. brass bookmark, book lover gift, custom bookmark"
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              <span>{loading ? 'Optimizing...' : 'Generate 13 Tags'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-9 bg-slate-100 dark:bg-slate-800/60 rounded" />
          ))}
        </div>
      )}

      {!loading && result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 13 Tags Table */}
          <section className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Optimized 13 Tags for &ldquo;{result.focusKeyword}&rdquo;
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every tag verified &le;20 characters and multi-word.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyValue('all', result.tags.map((t) => t.tag).join(', '))}
                className="h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'all' ? 'Copied All 13 Tags' : 'Copy All 13 Tags'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.tags.map((t, idx) => {
                const clean = sanitizeEtsyTag(t.tag);
                const inCart = tagCart.some((c) => c.toLowerCase() === clean.toLowerCase());
                return (
                  <div key={t.tag} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{idx + 1}.</span>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{t.tag}</span>
                        <span className="font-mono tabular-nums text-[11px] text-slate-400">
                          {t.tag.length}/20
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 pl-5">
                        {t.reason}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pl-5 sm:pl-0">
                      <div className="text-right text-xs">
                        <div className="font-mono tabular-nums font-bold text-violet-600 dark:text-violet-400">
                          {t.relevanceScore}% rel
                        </div>
                        <div className="text-[11px] text-slate-400">{t.competitionLevel} comp</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyValue(`tag-${idx}`, t.tag)}
                        className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `tag-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === `tag-${idx}` ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAddTagToCart(clean)}
                        disabled={inCart || tagCart.length >= 13}
                        className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                          inCart
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
                            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-violet-600 disabled:opacity-40'
                        }`}
                      >
                        {inCart ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>{inCart ? 'In Cart' : 'Cart'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Insights & Missing Opportunities */}
          <div className="lg:col-span-4 space-y-6">
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Competing Listings Insight
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.competingListingsInsight}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Missing Keyword Opportunities
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.missingOpportunities.map((opp, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-violet-600 font-semibold">{i + 1}.</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <Tag className="w-8 h-8 text-violet-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Fill all 13 Etsy tag slots with high-intent buyer terms
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
            Generate 13 unique multi-word tags strictly under 20 characters with zero wasted slots or duplicate keywords.
          </p>
        </section>
      )}
    </div>
  );
}
