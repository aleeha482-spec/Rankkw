import { useState } from 'react';
import { ArrowRight, BookmarkPlus, Check, Copy, Layers, Loader2 } from 'lucide-react';
import type { RankLiftResponse } from '../types';
import { useAuth } from '../context/AuthContext';

export function RankLift() {
  const { saveListing, logSearch } = useAuth();
  const [listingUrl, setListingUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentTagsText, setCurrentTagsText] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankLiftResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function runRankLift(e: React.FormEvent) {
    e.preventDefault();
    if (!listingUrl.trim() && !currentTitle.trim()) {
      setError('Enter an Etsy listing URL or your current listing title.');
      return;
    }
    setLoading(true);
    setError(null);
    const currentTags = currentTagsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/etsy/rank-lift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUrl: listingUrl.trim(),
          currentTitle: currentTitle.trim(),
          currentTags,
          currentDescription: currentDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rank Lift analysis failed.');
      const typed = data as RankLiftResponse;
      setResult(typed);
      void logSearch(
        'Rank Lift',
        currentTitle.trim() || listingUrl.trim(),
        `Score ${typed.beforeScore} -> ${typed.afterScore}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error running Rank Lift.');
    } finally {
      setLoading(false);
    }
  }

  function copyField(key: string, val: string) {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
  }

  async function handleSaveImproved() {
    if (!result) return;
    setSaving(true);
    try {
      await saveListing({
        title: result.improvedTitle,
        tags: result.improvedTags,
        description: result.rewrittenDescription,
        priceUsd: 29.99,
        category: 'Rank Lift Upgraded',
        seoScore: result.afterScore,
        sourceTool: 'ranklift',
        status: 'optimized',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Rank Lift — Before &amp; After Listing Upgrade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add an existing Etsy listing URL or paste your current title, tags, and description to diagnose weak spots and generate a side-by-side SEO upgrade.
          </p>
        </div>

        <form onSubmit={runRankLift} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Etsy Listing URL (Optional)
              </label>
              <input
                type="text"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://www.etsy.com/listing/123456789/..."
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Current Etsy Title
              </label>
              <input
                type="text"
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                placeholder="e.g. Handmade Leather Wallet Brown Gift"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Current Tags (comma separated)
              </label>
              <textarea
                rows={2}
                value={currentTagsText}
                onChange={(e) => setCurrentTagsText(e.target.value)}
                placeholder="leather wallet, mens gift, brown wallet"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Current Description (Optional)
              </label>
              <textarea
                rows={2}
                value={currentDescription}
                onChange={(e) => setCurrentDescription(e.target.value)}
                placeholder="Paste your current product description..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            <span>{loading ? 'Analyzing & Rewriting...' : 'Run Rank Lift Comparison'}</span>
          </button>
        </form>
      </section>

      {loading && (
        <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-6 space-y-3" />
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* Score Jump Banner */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-500">Before Rank Lift</div>
                <div className="text-3xl font-bold font-mono tabular-nums text-amber-600">
                  {result.beforeScore}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </div>
              </div>

              <ArrowRight className="w-6 h-6 text-violet-600 shrink-0" />

              <div>
                <div className="text-xs text-slate-500">After Rank Lift</div>
                <div className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {result.afterScore}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveImproved()}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Upgraded Listing'}</span>
            </button>
          </section>

          {/* Before & After Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Before Diagnostics */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Before — Weaknesses &amp; Missing Keywords
              </h2>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-red-600 dark:text-red-400">Weaknesses Found</div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {result.weaknessesFound.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Missing High-Intent Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-medium text-amber-800 dark:text-amber-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Original Title
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {currentTitle || '(Inferred from URL / listing context)'}
                </p>
              </div>
            </section>

            {/* After Upgrade */}
            <section className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold text-violet-700 dark:text-violet-400">
                After — Upgraded Title, 13 Tags &amp; Description
              </h2>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Improved Title ({result.improvedTitle.length}/140)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField('title', result.improvedTitle)}
                    className="text-violet-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'title' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'title' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {result.improvedTitle}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    13 Optimized Tags
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField('tags', result.improvedTags.join(', '))}
                    className="text-violet-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'tags' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'tags' ? 'Copied All' : 'Copy All'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {result.improvedTags.join(' · ')}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Rewritten Description
                  </span>
                  <button
                    type="button"
                    onClick={() => copyField('desc', result.rewrittenDescription)}
                    className="text-violet-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'desc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'desc' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line max-h-48 overflow-y-auto">
                  {result.rewrittenDescription}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
