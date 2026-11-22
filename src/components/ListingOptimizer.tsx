import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Copy,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { ListingOptimizationResponse, SavedListing } from '../types';
import { lintEtsyTags, lintEtsyTitle, sanitizeEtsyTag } from '../utils/etsyRules';

export interface OptimizerDraftPayload {
  version: number;
  mode?: 'generate' | 'audit';
  productIdea?: string;
  title?: string;
  tags?: string[];
  description?: string;
  priceUsd?: number;
  category?: string;
}

interface ListingOptimizerProps {
  draftPayload?: OptimizerDraftPayload | null;
  tagCart: string[];
  onSaveListing: (listing: Omit<SavedListing, 'id' | 'savedAt'>) => void;
  heading?: string;
  subtitle?: string;
}

export function ListingOptimizer({
  draftPayload,
  tagCart,
  onSaveListing,
  heading = 'AI Title & Tags Generator',
  subtitle = 'Build new listings from a product note or photo, or audit an existing Etsy listing against real 140-char title and 20-char tag rules.',
}: ListingOptimizerProps) {
  const [mode, setMode] = useState<'generate' | 'audit'>('generate');
  const [productIdea, setProductIdea] = useState('');
  const [category, setCategory] = useState('Handmade & Gifts');
  const [targetAudience, setTargetAudience] = useState('');
  const [priceUsd, setPriceUsd] = useState(34);

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!draftPayload) return;
    if (draftPayload.mode) setMode(draftPayload.mode);
    if (draftPayload.productIdea !== undefined) setProductIdea(draftPayload.productIdea);
    if (draftPayload.title !== undefined) setTitle(draftPayload.title);
    if (draftPayload.tags !== undefined) setTags(draftPayload.tags.slice(0, 13));
    if (draftPayload.description !== undefined) setDescription(draftPayload.description);
    if (draftPayload.priceUsd !== undefined) setPriceUsd(draftPayload.priceUsd);
    if (draftPayload.category !== undefined) setCategory(draftPayload.category);
  }, [draftPayload?.version]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ListingOptimizationResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const titleLint = useMemo(() => lintEtsyTitle(title), [title]);
  const tagsLint = useMemo(() => lintEtsyTags(tags), [tags]);

  const combinedLiveScore = useMemo(() => {
    const descScore = description.trim().length > 180 ? 100 : description.trim().length > 50 ? 65 : 20;
    return Math.round(titleLint.score * 0.4 + tagsLint.score * 0.45 + descScore * 0.15);
  }, [titleLint.score, tagsLint.score, description]);

  function copyText(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 1500);
  }

  function handleAddTags(rawInput: string) {
    const parts = rawInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setTags((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (next.length >= 13) break;
        const clean = p.toLowerCase();
        if (!next.some((existing) => existing.toLowerCase() === clean)) {
          next.push(clean);
        }
      }
      return next;
    });
    setNewTagInput('');
  }

  function handleReplaceTag(index: number, nextValue: string) {
    setTags((prev) => prev.map((t, i) => (i === index ? nextValue.toLowerCase() : t)));
  }

  function handleRemoveTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImportFromCart() {
    if (!tagCart.length) return;
    setTags((prev) => {
      const next = [...prev];
      for (const t of tagCart) {
        if (next.length >= 13) break;
        const clean = sanitizeEtsyTag(t).toLowerCase();
        if (clean && !next.some((ex) => ex.toLowerCase() === clean)) {
          next.push(clean);
        }
      }
      return next;
    });
  }

  function handlePhotoSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPhotoPreview(dataUrl);
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx !== -1) {
        setPhotoBase64(dataUrl.slice(commaIdx + 1));
        setPhotoMime(file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  }

  async function runOptimization() {
    setError(null);
    if (mode === 'generate' && !productIdea.trim() && !photoBase64) {
      setError('Describe your product or upload a product photo to generate an SEO listing.');
      return;
    }
    if (mode === 'audit' && !title.trim() && tags.length === 0) {
      setError('Enter your current Etsy title or tags so we can audit and rewrite them.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/etsy/optimize-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          productIdea,
          currentTitle: title,
          currentTags: tags,
          currentDescription: description,
          priceUsd,
          targetAudience,
          category,
          imageBase64: photoBase64 ?? undefined,
          imageMimeType: photoMime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Optimization failed.');
      }
      const typed = data as ListingOptimizationResponse;
      setAiResult(typed);

      // Auto-populate empty fields or when generating from scratch
      if (mode === 'generate' || !title.trim()) {
        if (typed.titleOptions[0]?.title) {
          setTitle(typed.titleOptions[0].title);
        }
      }
      if (mode === 'generate' || tags.length === 0) {
        setTags(typed.optimizedTags.map((t) => t.tag).slice(0, 13));
      }
      if (mode === 'generate' || !description.trim()) {
        if (typed.optimizedDescription?.fullText) {
          setDescription(typed.optimizedDescription.fullText);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize listing.');
    } finally {
      setLoading(false);
    }
  }

  function handleSaveCurrentListing() {
    if (!title.trim() && tags.length === 0) return;
    onSaveListing({
      title: title.trim() || productIdea.trim() || 'Untitled Etsy Listing',
      tags: tags.slice(0, 13),
      description: description.trim(),
      priceUsd,
      category,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {heading}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setMode('generate')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'generate'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Create New Listing
            </button>
            <button
              type="button"
              onClick={() => setMode('audit')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Audit &amp; Rank Lift
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Editor & Instant Linter */}
        <div className="xl:col-span-7 space-y-6">
          {/* Product Brief / Photo Input */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                01. Product Brief &amp; Photo
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Optional photo auto-detects materials &amp; style
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Product Idea / Key Features
                  </label>
                  <textarea
                    rows={3}
                    value={productIdea}
                    onChange={(e) => setProductIdea(e.target.value)}
                    placeholder="e.g. Handmade full-grain Italian leather bifold wallet, personalized brass monogram initials, gift box for Father's Day or groomsmen"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Target Buyer
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Groomsmen, Mom"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                </div>
              </div>

              {/* Product Image Upload */}
              <div className="sm:col-span-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                />
                {photoPreview ? (
                  <div className="relative h-full min-h-[140px] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img
                      src={photoPreview}
                      alt="Uploaded product reference"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover max-h-[175px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoBase64(null);
                      }}
                      title="Remove photo"
                      className="absolute top-2 right-2 w-7 h-7 rounded-md bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full min-h-[140px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col items-center justify-center p-3 text-center transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-5 h-5 text-slate-400 mb-1.5" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Upload Product Photo
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Optional visual SEO scan
                    </span>
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={runOptimization}
                disabled={loading}
                className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span>
                  {loading
                    ? 'Optimizing Listing...'
                    : mode === 'generate'
                    ? 'Generate SEO Title, 13 Tags & Description'
                    : 'Run AI Rank Lift & Audit'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentListing}
                disabled={!title.trim() && tags.length === 0}
                className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {savedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <BookmarkPlus className="w-4 h-4" />}
                <span>{savedToast ? 'Saved to Bank' : 'Save Listing'}</span>
              </button>
            </div>
          </section>

          {/* Live Title Workspace */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  02. Listing Title
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Front-load primary keywords in the first 40 characters for mobile searchers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    titleLint.charCount > 140
                      ? 'text-red-600'
                      : titleLint.charCount >= 80
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {titleLint.charCount} / 140 chars
                </span>
                <button
                  type="button"
                  onClick={() => copyText('title', title)}
                  disabled={!title.trim()}
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedField === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'title' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Paste or generate your Etsy listing title (max 140 characters)..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />

            {titleLint.mobilePreview && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs">
                <span className="font-medium text-slate-500 dark:text-slate-400">Mobile Search Preview: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {titleLint.mobilePreview}
                </span>
                {title.length > 40 && <span className="text-slate-400">...</span>}
              </div>
            )}

            <div className="space-y-1.5">
              {titleLint.notes.map((n, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {n.severity === 'good' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        n.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                      }`}
                    />
                  )}
                  <span className="text-slate-600 dark:text-slate-300">{n.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Live 13-Tag Slot Grid + Spell Checker */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  03. 13-Tag Workbench &amp; Spell Check
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tagsLint.count}/13 slots used · {tagsLint.multiWordCount} multi-word phrases · Avg length{' '}
                  <span className="font-mono tabular-nums">{tagsLint.avgLength}</span>/20 chars
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {tagCart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportFromCart}
                    className="h-8 px-2.5 rounded-md border border-violet-200 dark:border-violet-900/60 bg-violet-50 dark:bg-violet-950/30 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import Tag Cart ({tagCart.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => copyText('tags', tags.join(', '))}
                  disabled={tags.length === 0}
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedField === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'tags' ? 'Copied All' : 'Copy Comma-Separated'}</span>
                </button>

                {tags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTags([])}
                    title="Clear all tags"
                    className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 inline-flex items-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Add tag input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTags(newTagInput);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Type a tag or paste comma-separated tags (e.g. leather wallet, gift for dad)..."
                disabled={tags.length >= 13}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={tags.length >= 13 || !newTagInput.trim()}
                className="h-9 px-3.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Add Tag
              </button>
            </form>

            {/* Interactive 13 Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tags.map((tag, idx) => {
                const overLimit = tag.length > 20;
                const issue = tagsLint.tagIssues.find((i) => i.index === idx);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                      overLimit
                        ? 'border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30'
                        : issue
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950'
                    }`}
                  >
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 w-4 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleReplaceTag(idx, e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <span
                      className={`font-mono tabular-nums text-[11px] shrink-0 ${
                        overLimit ? 'text-red-600 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {tag.length}/20
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      aria-label={`Remove tag ${tag}`}
                      className="text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tag Spell & Redundancy Findings */}
            {tagsLint.tagIssues.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Tag Lint &amp; Spell Check Warnings
                </div>
                {tagsLint.tagIssues.map((iss) => (
                  <div key={`${iss.index}-${iss.tag}`} className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <span>
                      Tag #{iss.index + 1} (&ldquo;{iss.tag}&rdquo;): {iss.issues.join(' · ')}
                    </span>
                    {iss.suggestion && (
                      <button
                        type="button"
                        onClick={() => handleReplaceTag(iss.index, iss.suggestion!)}
                        className="text-xs font-semibold text-violet-700 dark:text-violet-400 underline cursor-pointer"
                      >
                        Fix to &ldquo;{iss.suggestion}&rdquo;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Description Editor */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  04. Listing Description
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Etsy indexes the first 160 characters for Google meta descriptions and buyer conversion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('desc', description)}
                disabled={!description.trim()}
                className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedField === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'desc' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <textarea
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write or generate a scannable, conversion-focused Etsy product description..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
            />
          </section>
        </div>

        {/* Right: Live Diagnostics & AI Output Panel */}
        <div className="xl:col-span-5 space-y-6">
          {/* Live Listing Health Meter */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Live Etsy SEO Readiness
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Updates instantaneously as you edit
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    combinedLiveScore >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : combinedLiveScore >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500'
                  }`}
                >
                  {combinedLiveScore}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Title Health</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {titleLint.score}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">13-Tag Score</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {tagsLint.score}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Slots Filled</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {tagsLint.count} / 13
                </div>
              </div>
            </div>
          </section>

          {/* AI Generated Recommendations */}
          {loading ? (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 animate-pulse">
              <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </section>
          ) : aiResult ? (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
              {/* Title Options */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  AI Title Variations (Choose Best Angle)
                </h3>
                <div className="space-y-2">
                  {aiResult.titleOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{opt.strategy}</span>
                        <span className="font-mono tabular-nums">{opt.title.length}/140</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-snug">
                        {opt.title}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setTitle(opt.title)}
                          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                        >
                          Use This Title
                        </button>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={() => copyText(`opt-title-${i}`, opt.title)}
                          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedField === `opt-title-${i}` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 13 Tags with Intent */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Optimized 13 Tags
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTags(aiResult.optimizedTags.map((t) => t.tag).slice(0, 13))}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Apply All 13</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  {aiResult.optimizedTags.map((t, idx) => (
                    <div key={t.tag} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {idx + 1}. {t.tag}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {t.searchIntent} · Est. {t.competitionEst} comp
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                        {t.tag.length}/20
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attributes */}
              {aiResult.recommendedAttributes && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Recommended Etsy Attributes
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400">Materials: </span>
                      {aiResult.recommendedAttributes.materials?.join(', ')}
                    </div>
                    <div>
                      <span className="text-slate-400">Occasion: </span>
                      {aiResult.recommendedAttributes.occasion}
                    </div>
                    <div>
                      <span className="text-slate-400">Style: </span>
                      {aiResult.recommendedAttributes.style}
                    </div>
                    <div>
                      <span className="text-slate-400">Color: </span>
                      {aiResult.recommendedAttributes.primaryColor}
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Findings */}
              {aiResult.auditFindings?.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Listing Audit Insights
                  </h3>
                  <div className="space-y-2">
                    {aiResult.auditFindings.map((f, i) => (
                      <div key={i} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {f.area} — {f.finding}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          Action: {f.fix}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                AI Optimization Suggestions Appear Here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Enter your product details (or paste your existing Etsy listing) and click Generate to receive 3 SEO titles, 13 verified tags, and a buyer-converting description.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
