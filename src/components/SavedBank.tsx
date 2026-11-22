import { useState } from 'react';
import { Bookmark, Check, Copy, Download, FolderHeart, Heart, Search, Trash2, Upload } from 'lucide-react';
import type { SavedListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../utils/etsyRules';

interface SavedBankProps {
  tagCart: string[];
  onRemoveTagFromCart: (tag: string) => void;
  onClearTagCart: () => void;
  onSendTagsToOptimizer: () => void;
  onLoadListingToOptimizer: (listing: SavedListing) => void;
  onExploreKeyword: (kw: string) => void;
}

export function SavedBank({
  tagCart,
  onRemoveTagFromCart,
  onClearTagCart,
  onSendTagsToOptimizer,
  onLoadListingToOptimizer,
  onExploreKeyword,
}: SavedBankProps) {
  const { workspace, deleteListing, deleteKeyword, removeFavoriteProduct } = useAuth();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mappedListings: SavedListing[] = workspace.savedListings.map((row) => {
    let parsedTags: string[] = [];
    try {
      const parsed = JSON.parse(row.tagsJson);
      if (Array.isArray(parsed)) parsedTags = parsed.map(String);
    } catch {
      parsedTags = [];
    }
    return {
      id: String(row.id),
      savedAt: row.createdAt,
      title: row.title,
      tags: parsedTags,
      description: row.description,
      priceUsd: Number(row.priceUsd) || 0,
      category: row.category,
    };
  });

  const filtered = mappedListings.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  function copyString(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
  }

  function handleExportAllCsv() {
    if (!mappedListings.length) return;
    exportToCsv(
      'craftrank-saved-listings.csv',
      ['Title', 'Category', 'Price USD', 'Tags (Comma Separated)', 'Description', 'Saved At'],
      mappedListings.map((l) => [
        l.title,
        l.category,
        l.priceUsd,
        l.tags.join(', '),
        l.description,
        l.savedAt,
      ])
    );
  }

  function handleExportKeywordsCsv() {
    if (!workspace.savedKeywords.length) return;
    exportToCsv(
      'craftrank-saved-keywords.csv',
      ['Keyword', 'Est Monthly Searches', 'Competition', 'Opportunity Score', 'Avg Price USD', 'Trend'],
      workspace.savedKeywords.map((k) => [
        k.keyword,
        k.monthlySearches,
        k.competitionLabel,
        k.opportunityScore,
        k.avgPriceUsd,
        k.trend,
      ])
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Saved Bank — Keywords, Listings &amp; Hot Products
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Synced automatically to your PostgreSQL account across sessions and devices — export CSVs anytime with zero limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {workspace.savedKeywords.length > 0 && (
            <button
              type="button"
              onClick={handleExportKeywordsCsv}
              className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Keywords CSV</span>
            </button>
          )}
          {mappedListings.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllCsv}
              className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Listings CSV</span>
            </button>
          )}
        </div>
      </section>

      {/* Active 13-Tag Scratchpad */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Active 13-Tag Cart ({tagCart.length} / 13)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tags collected from Keyword Explorer, Tag Optimizer, and Competitor Spy appear here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyString('cart', tagCart.join(', '))}
              disabled={tagCart.length === 0}
              className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {copiedId === 'cart' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'cart' ? 'Copied' : 'Copy Comma-Separated'}</span>
            </button>

            <button
              type="button"
              onClick={onSendTagsToOptimizer}
              disabled={tagCart.length === 0}
              className="h-8 px-3 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open in Listing Pro</span>
            </button>

            {tagCart.length > 0 && (
              <button
                type="button"
                onClick={onClearTagCart}
                className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:text-red-600 text-xs text-slate-500 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {tagCart.length === 0 ? (
          <div className="text-xs text-slate-400 py-3">
            Your tag cart is empty. Click &ldquo;Tag&rdquo; on any keyword in Keyword Research or Tag Optimizer.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagCart.map((tag) => (
              <div
                key={tag}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200">{tag}</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">{tag.length}/20</span>
                <button
                  type="button"
                  onClick={() => onRemoveTagFromCart(tag)}
                  aria-label={`Remove ${tag}`}
                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Keywords from PostgreSQL */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-violet-600" />
          <span>Saved Keywords ({workspace.savedKeywords.length})</span>
        </h2>

        {workspace.savedKeywords.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            Save high-opportunity keywords from Keyword Research to monitor them here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {workspace.savedKeywords.map((kw) => (
              <div key={kw.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onExploreKeyword(kw.keyword)}
                    className="font-semibold text-sm text-slate-900 dark:text-white hover:text-violet-600 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span>{kw.keyword}</span>
                  </button>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                    ~{kw.monthlySearches.toLocaleString()}/mo · {kw.competitionLabel} comp · Opp {kw.opportunityScore}/100 · ${kw.avgPriceUsd} avg
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteKeyword(kw.id)}
                  aria-label={`Delete ${kw.keyword}`}
                  className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Favorite Hot Products from PostgreSQL */}
      {workspace.favoriteProducts.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Heart className="w-4 h-4 text-violet-600" />
            <span>Favorite Hot Products ({workspace.favoriteProducts.length})</span>
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {workspace.favoriteProducts.map((fav) => (
              <div key={fav.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{fav.title}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {fav.category} · ${fav.priceUsd} · {fav.demandLevel} Demand · {fav.competitionLevel} Comp
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void removeFavoriteProduct(fav.id)}
                  aria-label={`Remove ${fav.title}`}
                  className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Saved Listings Library */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved Etsy Listings ({mappedListings.length})
          </h2>
          {mappedListings.length > 0 && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved titles or tags..."
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-600 sm:w-64"
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <FolderHeart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {mappedListings.length === 0 ? 'No saved listings yet' : 'No saved listings match your search'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Optimize or create a listing in Etsy Listing Pro, Auto Pilot, or Rank Lift and click &ldquo;Save&rdquo; to store it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">${item.priceUsd.toFixed(2)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{item.tags.length} tags</span>
                      <span aria-hidden="true">·</span>
                      <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        copyString(item.id, `${item.title}\n\nTags: ${item.tags.join(', ')}\n\n${item.description}`)
                      }
                      className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy All'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadListingToOptimizer(item)}
                      className="h-8 px-2.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-violet-600 cursor-pointer"
                    >
                      Edit in Studio
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteListing(Number(item.id))}
                      aria-label="Delete saved listing"
                      className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.tags.length > 0 && (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-400">Tags: </span>
                    {item.tags.join(' · ')}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
