import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import type { ListingOptimizationResponse } from '../types';
import { lintEtsyTags, lintEtsyTitle } from '../utils/etsyRules';
import { useAuth } from '../context/AuthContext';

export function ListingAudit() {
  const { logSearch } = useAuth();
  const [title, setTitle] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState(32);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAudit, setAiAudit] = useState<ListingOptimizationResponse | null>(null);

  const tags = useMemo(
    () =>
      tagsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 13),
    [tagsText]
  );

  const titleLint = useMemo(() => lintEtsyTitle(title), [title]);
  const tagsLint = useMemo(() => lintEtsyTags(tags), [tags]);

  const dimensions = useMemo(() => {
    const titleQuality = titleLint.score;
    const mobileFrontLoaded = title.trim().length > 0 && title.slice(0, 40).split(/\s+/).length >= 3 ? 95 : title.trim() ? 60 : 0;
    const tagRelevance = tagsLint.score;
    const descLength = description.trim().length;
    const descriptionQuality = descLength >= 280 ? 95 : descLength >= 120 ? 72 : descLength > 0 ? 42 : 0;

    const titleWords = new Set(title.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const tagWords = tags.join(' ').toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const matchedTagWords = tagWords.filter((w) => titleWords.has(w)).length;
    const keywordUsage = tags.length === 0 ? 0 : Math.min(100, Math.round(45 + (matchedTagWords / Math.max(1, tagWords.length)) * 85));

    let completenessChecks = 0;
    if (title.trim()) completenessChecks += 1;
    if (tags.length === 13) completenessChecks += 1;
    if (descLength >= 150) completenessChecks += 1;
    if (priceUsd > 0) completenessChecks += 1;
    const completeness = Math.round((completenessChecks / 4) * 100);

    const overall = Math.round(
      titleQuality * 0.22 +
        mobileFrontLoaded * 0.16 +
        tagRelevance * 0.22 +
        descriptionQuality * 0.16 +
        keywordUsage * 0.12 +
        completeness * 0.12
    );

    return {
      overall,
      items: [
        { label: 'Title Quality', score: titleQuality, detail: `${titleLint.charCount}/140 chars` },
        { label: 'Keyword Placement (First 40 Chars)', score: mobileFrontLoaded, detail: title.slice(0, 40) || 'Empty' },
        { label: 'Tag Relevance & 20-Char Fit', score: tagRelevance, detail: `${tags.length}/13 tags` },
        { label: 'Description Quality', score: descriptionQuality, detail: `${descLength} chars` },
        { label: 'Cross-Field Keyword Usage', score: keywordUsage, detail: `${matchedTagWords} shared keyword stems` },
        { label: 'Listing Completeness', score: completeness, detail: `${completenessChecks}/4 sections ready` },
      ],
    };
  }, [title, tags, description, priceUsd, titleLint, tagsLint]);

  async function runDeepAiAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && tags.length === 0) {
      setError('Enter your current listing title or tags to run an AI SEO audit.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/optimize-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'audit',
          currentTitle: title,
          currentTags: tags,
          currentDescription: description,
          priceUsd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed.');
      const typed = data as ListingOptimizationResponse;
      setAiAudit(typed);
      void logSearch('Listing Audit', title.trim() || tags[0], `Overall score ${dimensions.overall}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error running listing audit.');
    } finally {
      setLoading(false);
    }
  }

  // SVG Ring calculation
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (dimensions.overall / 100) * circ;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy Listing SEO Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live 6-point diagnostic audit inspecting Title Quality, Keyword Placement, Tag Relevance, Description Quality, Keyword Usage, and Completeness.
          </p>
        </div>

        <form onSubmit={runDeepAiAudit} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Listing Title ({title.length}/140)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Paste your Etsy listing title..."
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                13 Tags (comma separated · {tags.length}/13 detected)
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="e.g. ceramic coffee mug, handmade stoneware, gift for mom, ..."
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Product Description ({description.length} characters)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste your Etsy listing description..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-36">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Price (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                />
              </div>

              <div className="flex-1 flex items-end pt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{loading ? 'Running Deep Audit...' : 'Run Deep AI Audit'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Radial Score */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-5 flex flex-col items-center justify-center text-center space-y-3">
            <svg width="112" height="112" viewBox="0 0 112 112" aria-label={`SEO Score ${dimensions.overall} out of 100`}>
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="10"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={dimensions.overall >= 80 ? '#10B981' : dimensions.overall >= 50 ? '#7C3AED' : '#F59E0B'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 56 56)"
              />
              <text
                x="56"
                y="54"
                textAnchor="middle"
                className="fill-slate-900 dark:fill-white text-2xl font-bold font-mono"
              >
                {dimensions.overall}
              </text>
              <text x="56" y="72" textAnchor="middle" className="fill-slate-400 text-[11px] font-medium">
                / 100 SEO
              </text>
            </svg>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {dimensions.overall >= 80
                ? 'Strong Etsy Search Readiness'
                : dimensions.overall >= 50
                ? 'Needs Keyword & Tag Tuning'
                : 'Paste Listing Above to Score'}
            </div>
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* 6-Dimension Breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dimensions.items.map((dim) => (
          <div
            key={dim.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{dim.label}</span>
              <span className="font-mono tabular-nums font-bold text-violet-600 dark:text-violet-400">
                {dim.score}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  dim.score >= 80 ? 'bg-emerald-500' : dim.score >= 50 ? 'bg-violet-600' : 'bg-amber-500'
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 truncate">{dim.detail}</div>
          </div>
        ))}
      </section>

      {/* Live Linter Notes + Deep AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Rule-Based Etsy Checklist
          </h2>
          <div className="space-y-2">
            {titleLint.notes.map((n, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {n.severity === 'good' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span className="text-slate-600 dark:text-slate-300">{n.text}</span>
              </div>
            ))}
            {tagsLint.tagIssues.map((iss) => (
              <div key={`${iss.index}-${iss.tag}`} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">
                  Tag #{iss.index + 1} (&ldquo;{iss.tag}&rdquo;): {iss.issues.join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            AI Improvement Recommendations
          </h2>
          {aiAudit ? (
            <div className="space-y-3">
              {aiAudit.auditFindings.map((f, idx) => (
                <div key={idx} className="border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {f.area}: {f.finding}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Fix: {f.fix}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;Run Deep AI Audit&rdquo; above to get tailored SEO rewrite advice for your specific product and target buyers.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
