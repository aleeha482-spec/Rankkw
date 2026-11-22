import { useState } from 'react';
import { Check, Flame, Heart, Loader2, Plus, Search } from 'lucide-react';
import type { HotProductItem, HotProductsResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeEtsyTag } from '../utils/etsyRules';

interface HotProductsProps {
  tagCart: string[];
  onAddTagToCart: (tag: string) => void;
  onExploreKeyword: (kw: string) => void;
}

const VISUAL_MAP: Record<HotProductItem['visualGroup'], string> = {
  jewelry: '/src/assets/images/hot_product_jewelry_1795345582019.jpg',
  leather: '/src/assets/images/hot_product_leather_1795345582570.jpg',
  ceramic: '/src/assets/images/hot_product_ceramic_1795345582028.jpg',
  printable: '/src/assets/images/hot_product_printable_1795345583174.jpg',
};

export function HotProducts({
  tagCart,
  onAddTagToCart,
  onExploreKeyword,
}: HotProductsProps) {
  const { workspace, saveFavoriteProduct, removeFavoriteProduct, logSearch } = useAuth();
  const [category, setCategory] = useState('All Categories');
  const [priceTier, setPriceTier] = useState('Any');
  const [competition, setCompetition] = useState('Low to Medium');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotProductsResponse | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  async function runDiscovery() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/hot-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, priceTier, competition, keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to discover hot products.');
      const typed = data as HotProductsResponse;
      setResult(typed);
      void logSearch('Find Hot Products', keyword.trim() || category, `${typed.products.length} products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error discovering products.');
    } finally {
      setLoading(false);
    }
  }

  function findFavoriteRecord(title: string) {
    return workspace.favoriteProducts.find(
      (f) => f.title.toLowerCase() === title.toLowerCase()
    );
  }

  async function toggleFavorite(prod: HotProductItem) {
    const existing = findFavoriteRecord(prod.title);
    if (existing) {
      await removeFavoriteProduct(existing.id);
    } else {
      await saveFavoriteProduct({
        title: prod.title,
        category: prod.category,
        priceUsd: prod.priceUsd,
        demandLevel: prod.demandLevel,
        competitionLevel: prod.competitionLevel,
        relatedKeywords: prod.relatedKeywords,
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Find Hot Etsy Products
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover winning Etsy product opportunities filtered by category, price range, and competition level — save top picks directly to your workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="All Categories">All Categories</option>
              <option value="Jewelry & Accessories">Jewelry &amp; Accessories</option>
              <option value="Personalized Leather & Gifts">Personalized Leather &amp; Gifts</option>
              <option value="Home & Ceramic Decor">Home &amp; Ceramic Decor</option>
              <option value="Digital Downloads & Printables">Digital Downloads &amp; Printables</option>
              <option value="Wedding & Events">Wedding &amp; Events</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Price Tier
            </label>
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="Any">Any Price</option>
              <option value="Under $20">Under $20</option>
              <option value="$20 - $55">$20 – $55</option>
              <option value="$55+">$55+ High Ticket</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Competition
            </label>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="Low Only">Low Only</option>
              <option value="Low to Medium">Low to Medium</option>
              <option value="High Demand (Any)">High Demand (Any)</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Optional Theme / Material
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. minimalist, Mother's Day"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={() => void runDiscovery()}
              disabled={loading}
              className="w-full h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              <span>{loading ? 'Scanning...' : 'Find Products'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && result && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {result.products.map((prod) => {
            const imgSrc = VISUAL_MAP[prod.visualGroup] ?? VISUAL_MAP.ceramic;
            const isFav = Boolean(findFavoriteRecord(prod.title));
            const imgBroken = Boolean(brokenImages[prod.title]);

            return (
              <article
                key={prod.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between hover:border-violet-400 transition-colors"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-100 to-slate-100 dark:from-violet-950/50 dark:to-slate-900 overflow-hidden">
                    {!imgBroken ? (
                      <img
                        src={imgSrc}
                        alt={prod.title}
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [prod.title]: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400 p-4 text-center">
                        {prod.category}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(prod)}
                      aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
                      className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors cursor-pointer ${
                        isFav
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-violet-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="truncate">{prod.category}</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                        ${Number(prod.priceUsd).toFixed(2)}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {prod.title}
                    </h2>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {prod.demandLevel} Demand
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{prod.competitionLevel} Comp</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{prod.opportunityScore}/100</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {prod.whyTrending}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-medium text-slate-400">
                    Related Tags (click to add):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {prod.relatedKeywords.slice(0, 4).map((rawKw) => {
                      const tag = sanitizeEtsyTag(rawKw);
                      const inCart = tagCart.some((t) => t.toLowerCase() === tag.toLowerCase());
                      return (
                        <button
                          key={rawKw}
                          type="button"
                          onClick={() => onAddTagToCart(tag)}
                          disabled={inCart || tagCart.length >= 13}
                          className={`px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 border cursor-pointer ${
                            inCart
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
                          }`}
                        >
                          {inCart ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => onExploreKeyword(prod.relatedKeywords[0] || prod.title)}
                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-violet-600 dark:text-violet-400 inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Research Demand</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !result && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <Flame className="w-8 h-8 text-violet-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Discover winning Etsy products in any niche
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1">
            Select your target category and competition filter above to uncover trending product concepts and save favorites to your database.
          </p>
        </section>
      )}
    </div>
  );
}
