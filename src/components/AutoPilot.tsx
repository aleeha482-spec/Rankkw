import { useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ImagePlus,
  Loader2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { AutoPilotDraft, SavedListing } from '../types';

interface AutoPilotProps {
  queue: AutoPilotDraft[];
  onAddDraft: (draft: AutoPilotDraft) => void;
  onApproveDraft: (draft: AutoPilotDraft) => void;
  onDeleteDraft: (id: string) => void;
  onEditInStudio: (listing: SavedListing) => void;
}

export function AutoPilot({
  queue,
  onAddDraft,
  onApproveDraft,
  onDeleteDraft,
  onEditInStudio,
}: AutoPilotProps) {
  const [workingName, setWorkingName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPhotoPreview(dataUrl);
      const idx = dataUrl.indexOf(',');
      if (idx !== -1) {
        setPhotoBase64(dataUrl.slice(idx + 1));
        setPhotoMime(file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  }

  async function runAutoPilot() {
    if (!workingName.trim() && !photoBase64) {
      setError('Upload a product photo or enter a short product name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingName,
          notes,
          imageBase64: photoBase64 ?? undefined,
          imageMimeType: photoMime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto Pilot failed to generate draft.');
      const draft: AutoPilotDraft = {
        ...(data as AutoPilotDraft),
        photoPreview,
      };
      onAddDraft(draft);
      setWorkingName('');
      setNotes('');
      setPhotoPreview(null);
      setPhotoBase64(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error running Auto Pilot.');
    } finally {
      setLoading(false);
    }
  }

  function copyDraft(draft: AutoPilotDraft) {
    const payload = `${draft.title}\n\nCategory: ${draft.suggestedCategory}\nSuggested Price: $${draft.suggestedPriceUsd.toFixed(2)}\n\nTags: ${draft.tags.join(', ')}\n\n${draft.description}`;
    navigator.clipboard.writeText(payload);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId((prev) => (prev === draft.id ? null : prev)), 1500);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Auto Pilot — Photo-to-Listing Automation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload a product photo and working title. Auto Pilot researches Etsy keywords, determines competitor pricing, and queues a complete listing draft for your review.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {photoPreview ? (
              <div className="relative h-full min-h-[150px] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-950">
                <img
                  src={photoPreview}
                  alt="Auto Pilot product upload"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover max-h-[180px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                  }}
                  aria-label="Remove product photo"
                  className="absolute top-2 right-2 w-7 h-7 rounded-md bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-full min-h-[150px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col items-center justify-center p-4 text-center transition-colors cursor-pointer"
              >
                <ImagePlus className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Upload Product Photo
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Auto-detects colors, materials &amp; aesthetic
                </span>
              </button>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Short Working Product Name
                </label>
                <input
                  type="text"
                  value={workingName}
                  onChange={(e) => setWorkingName(e.target.value)}
                  placeholder="e.g. Handmade Walnut Jewelry Box"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Quick Notes (dimensions, customization, shipping)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Solid walnut wood, velvet lining, laser engraved lid initials"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Drafts go into your Review Queue below before exporting.
              </span>
              <button
                type="button"
                onClick={runAutoPilot}
                disabled={loading}
                className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{loading ? 'Generating Draft...' : 'Run Auto Pilot'}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* Auto Pilot Review Queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Auto Pilot Draft Queue ({queue.length})
          </h2>
        </div>

        {queue.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No Auto Pilot drafts in queue yet
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Upload a photo or working name above to generate a complete Etsy listing with recommended pricing and 13 tags.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((draft) => (
              <article
                key={draft.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex gap-4 min-w-0">
                    {draft.photoPreview && (
                      <img
                        src={draft.photoPreview}
                        alt={draft.workingName}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            draft.status === 'Approved'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {draft.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{draft.suggestedCategory}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          Suggested ${draft.suggestedPriceUsd.toFixed(2)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {draft.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pricing insight: {draft.priceRationale}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {draft.status !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => onApproveDraft(draft)}
                        className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve &amp; Save</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onEditInStudio({
                          id: draft.id,
                          savedAt: draft.createdAt,
                          title: draft.title,
                          tags: draft.tags,
                          description: draft.description,
                          priceUsd: draft.suggestedPriceUsd,
                          category: draft.suggestedCategory,
                        })
                      }
                      className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer"
                    >
                      Refine in Studio
                    </button>

                    <button
                      type="button"
                      onClick={() => copyDraft(draft)}
                      className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      {copiedId === draft.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === draft.id ? 'Copied' : 'Copy All'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      aria-label="Discard draft"
                      className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      13 Tags ({draft.tags.length}):{' '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{draft.tags.join(', ')}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-4">
                    {draft.description}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
