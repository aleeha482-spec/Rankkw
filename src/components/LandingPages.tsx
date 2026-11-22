import { useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  CheckCircle2,
  Compass,
  Flame,
  Layers,
  Loader2,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { KeywordResearchResponse, WorkspaceView } from '../types';
import { Sparkline } from './Sparkline';
import { ProfitCalculator } from './ProfitCalculator';
import { useAuth } from '../context/AuthContext';

interface PublicShellProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onStartKeywordSearch: (kw: string) => void;
}

const FEATURE_CATEGORIES = [
  {
    group: 'Keyword & Market Intelligence',
    items: [
      {
        id: 'keywords' as WorkspaceView,
        title: 'Keyword Research',
        desc: 'Uncover buyer search volume, competing listings, CTR potential, views-to-favorites ratios, and 20-char tag compatibility with CSV export.',
        icon: Search,
      },
      {
        id: 'trends' as WorkspaceView,
        title: 'Trends & Demand',
        desc: 'Track rising Etsy search terms, seasonal demand curves vs. prior year, and breakout category momentum backed by live search grounding.',
        icon: TrendingUp,
      },
      {
        id: 'hotproducts' as WorkspaceView,
        title: 'Find Hot Products',
        desc: 'Discover high-demand, low-competition Etsy product concepts filtered by price tier and category, with 1-click favorites saving.',
        icon: Flame,
      },
      {
        id: 'topsellers' as WorkspaceView,
        title: 'Top Sellers Leaderboard',
        desc: 'Benchmark leading Etsy shops by lifetime sales, reviews, star rating, country, shop age, and flagship products.',
        icon: Award,
      },
      {
        id: 'category' as WorkspaceView,
        title: 'Category Report & Niches',
        desc: 'Explore macro price brackets, most shared tags, and unsaturated sub-niches across Etsy categories.',
        icon: Compass,
      },
      {
        id: 'competitor' as WorkspaceView,
        title: 'Competitor Analysis',
        desc: 'Reverse-engineer competing Etsy shops to reveal their core traffic keywords, untapped keyword gaps, and conversion blueprints.',
        icon: Users,
      },
    ],
  },
  {
    group: 'AI Listing Creation & Optimization',
    items: [
      {
        id: 'autopilot' as WorkspaceView,
        title: 'Auto Pilot',
        desc: 'Upload a product image and working name to research keywords, suggest pricing, and draft a complete publish-ready Etsy listing.',
        icon: Zap,
      },
      {
        id: 'tagoptimizer' as WorkspaceView,
        title: 'Tag Optimizer',
        desc: 'Generate 13 unique multi-word Etsy tags strictly <= 20 characters with relevance scores, competition levels, and missing opportunities.',
        icon: Tag,
      },
      {
        id: 'aititletags' as WorkspaceView,
        title: 'AI Title & Tags',
        desc: 'Generate front-loaded mobile-friendly 140-char titles, 13 tags, category suggestions, and buyer-ready descriptions.',
        icon: Sparkles,
      },
      {
        id: 'ranklift' as WorkspaceView,
        title: 'Rank Lift',
        desc: 'Paste an existing Etsy listing URL or copy to inspect weaknesses and view a side-by-side before-and-after SEO rewrite.',
        icon: Layers,
      },
      {
        id: 'audit' as WorkspaceView,
        title: 'Listing Audit',
        desc: 'Visual SEO health scorecard auditing Title Quality, Keyword Placement, Tag Relevance, Description Quality, and Completeness.',
        icon: ShieldCheck,
      },
      {
        id: 'rankchecker' as WorkspaceView,
        title: 'Rank Checker',
        desc: 'Check where your shop or listing ranks across up to 12 target keywords and save historical rank snapshots.',
        icon: Target,
      },
    ],
  },
  {
    group: 'Shop Analytics & Margin Protection',
    items: [
      {
        id: 'shopanalytics' as WorkspaceView,
        title: 'Shop Analytics',
        desc: 'Track Views, Favorites, Orders, Revenue, and Conversion Rate via Etsy CSV import or Etsy Open API v3 connection.',
        icon: BarChart3,
      },
      {
        id: 'calculator' as WorkspaceView,
        title: 'Etsy Fee Calculator',
        desc: 'Calculate exact 6.5% transaction, listing, payment processing, Offsite Ads fees, and Etsy Ads break-even ROAS.',
        icon: Calculator,
      },
    ],
  },
];

export function PublicPages({
  activeView,
  onNavigate,
  darkMode,
  onToggleDarkMode,
  onStartKeywordSearch,
}: PublicShellProps) {
  const { user, feeSettings } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [heroQuery, setHeroQuery] = useState('');
  const [liveQuery, setLiveQuery] = useState('');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<KeywordResearchResponse | null>(null);

  async function runLivePreview(seed?: string) {
    const q = (seed ?? liveQuery).trim();
    if (!q) {
      setLiveError('Enter an Etsy product keyword to preview live metrics.');
      return;
    }
    if (seed) setLiveQuery(seed);
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/etsy/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedKeyword: q, marketplace: 'United States', intent: 'All' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run keyword preview.');
      setLiveResult(data as KeywordResearchResponse);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Network error running preview.');
    } finally {
      setLiveLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white text-sm font-bold flex items-center justify-center">
              C
            </span>
            <span>CraftRank</span>
          </button>

          {/* Center: 4 Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Primary navigation">
            {(
              [
                ['home', 'Home'],
                ['features', 'Features'],
                ['live-tool', 'Live Keyword Tool'],
                ['calculator', 'Etsy Fee Calculator'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeView === id
                    ? 'text-violet-600 dark:text-violet-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle color theme"
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="h-9 px-3.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
            {(
              [
                ['home', 'Home'],
                ['features', 'Features'],
                ['live-tool', 'Live Keyword Tool'],
                ['calculator', 'Etsy Fee Calculator'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onNavigate(id);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold"
                >
                  Open Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('login');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('register');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold"
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Public Content */}
      <main className="flex-1">
        {activeView === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-slate-50 dark:from-violet-950/25 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    100% Free Etsy SEO Platform · No Credits · No Subscriptions
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                    Rank Higher on Etsy. Find Winning Products Faster.
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Every Etsy SEO research, 13-tag optimization, competitor spy, rank tracking, and listing automation tool in one clean SaaS workspace — unlocked without paywalls or daily limits.
                  </p>

                  {/* Hero Quick Keyword Search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!heroQuery.trim()) {
                        onNavigate('live-tool');
                        return;
                      }
                      if (user) {
                        onStartKeywordSearch(heroQuery.trim());
                      } else {
                        setLiveQuery(heroQuery.trim());
                        onNavigate('live-tool');
                        void runLivePreview(heroQuery.trim());
                      }
                    }}
                    className="flex flex-col sm:flex-row gap-2.5 max-w-xl"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={heroQuery}
                        onChange={(e) => setHeroQuery(e.target.value)}
                        placeholder="Search any Etsy keyword (e.g. minimalist gold ring)"
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-12 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
                    >
                      <span>Analyze Keyword</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Unlimited keyword &amp; tag searches
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Cloud SQL saved workspace
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Zero subscriptions forever
                    </span>
                  </div>
                </div>

                {/* Right: Bespoke Studio Visual */}
                <div className="lg:col-span-6">
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl shadow-violet-950/5">
                    <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-950 dark:to-slate-900">
                      <img
                        src="/src/assets/images/hero_etsy_studio_1795345582096.jpg"
                        alt="Artisan Etsy seller studio workspace and craft curation"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="pt-3 px-2 pb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Built for independent Etsy makers, printables &amp; gift shops
                      </span>
                      <span className="font-mono tabular-nums text-violet-700 dark:text-violet-400 font-semibold">
                        14 Full SEO Tools
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Core Capabilities Preview */}
            <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Every Etsy SEO Workflow Under One Roof
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  From discovering unsaturated niches to drafting 13 rule-compliant tags and auditing live listings, CraftRank replaces expensive multi-tier subscriptions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    id: 'keywords' as WorkspaceView,
                    title: 'Keyword Research & CSV Export',
                    desc: 'Monthly search demand estimates, competing listings count, opportunity scoring, and 20-char tag validation.',
                    icon: Search,
                  },
                  {
                    id: 'tagoptimizer' as WorkspaceView,
                    title: '13-Tag Optimizer & Rank Lift',
                    desc: 'Eliminate weak tags, check character limits automatically, and compare before-and-after listing SEO scores.',
                    icon: Tag,
                  },
                  {
                    id: 'autopilot' as WorkspaceView,
                    title: 'Auto Pilot Photo-to-Listing',
                    desc: 'Upload a product photo and working title to draft category, price recommendation, title, 13 tags, and description.',
                    icon: Zap,
                  },
                  {
                    id: 'competitor' as WorkspaceView,
                    title: 'Competitor Spy & Top Sellers',
                    desc: 'Inspect winning Etsy shops, pricing spreads, review velocity, and keyword gaps competitors miss.',
                    icon: Users,
                  },
                  {
                    id: 'trends' as WorkspaceView,
                    title: 'Trends, Demand & Hot Products',
                    desc: 'Spot rising seasonal search momentum early and save promising product opportunities straight to your bank.',
                    icon: TrendingUp,
                  },
                  {
                    id: 'calculator' as WorkspaceView,
                    title: 'Etsy Fee & Ads ROI Calculator',
                    desc: 'Factor 6.5% transaction fees, payment fees, Offsite Ads attribution, and Etsy Ads break-even ROAS accurately.',
                    icon: Calculator,
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4 hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(card.id)}
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 self-start cursor-pointer"
                      >
                        <span>Explore {card.title}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Transparent Data Methodology */}
            <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Honest Data Labeling
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Clear Separation Between Estimated Intelligence &amp; Verified Shop Metrics
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    CraftRank never fabricates private Etsy seller telemetry. Keyword search volumes, competition counts, and rank snapshots are clearly labeled as <strong className="text-slate-900 dark:text-white">Estimated</strong> using AI marketplace analysis and live web search grounding. When viewing Shop Analytics, import your real Etsy Shop CSV export or connect your Etsy Open API v3 key for <strong className="text-slate-900 dark:text-white">Verified</strong> shop data.
                  </p>
                </div>
                <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                  <button
                    type="button"
                    onClick={() => onNavigate(user ? 'dashboard' : 'register')}
                    className="h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{user ? 'Go to Workspace' : 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('live-tool')}
                    className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Try Live Keyword Preview
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeView === 'features' && (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Complete Platform Directory
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                All 14 Etsy Seller &amp; SEO Tools — Unlocked Free
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300">
                No credit counters, no feature gating, and no subscription tiers. Sign in once to sync saved keywords, tracked competitors, listings, and favorite products to your PostgreSQL workspace.
              </p>
            </div>

            {FEATURE_CATEGORIES.map((cat) => (
              <div key={cat.group} className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
                  {cat.group}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-violet-400 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.id)}
                          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 self-start cursor-pointer"
                        >
                          <span>Launch {item.title}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {activeView === 'live-tool' && (
          <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Live Etsy Keyword Tool
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Test any Etsy product keyword right now. Sign in free to save keywords, export CSVs, and access all 14 SEO tools.
                  </p>
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Create Free Account
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runLivePreview();
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={liveQuery}
                    onChange={(e) => setLiveQuery(e.target.value)}
                    placeholder="Try 'personalized leather wallet' or 'ceramic matcha bowl'"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={liveLoading}
                  className="h-11 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {liveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{liveLoading ? 'Analyzing...' : 'Preview Keywords'}</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Quick test:</span>
                {['personalized leather wallet', 'custom pet portrait', 'printable wedding invite'].map((ex, i, arr) => (
                  <span key={ex} className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void runLivePreview(ex)}
                      className="hover:text-violet-600 underline underline-offset-2 cursor-pointer"
                    >
                      {ex}
                    </button>
                    {i < arr.length - 1 && <span aria-hidden="true">·</span>}
                  </span>
                ))}
              </div>

              {liveError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                  {liveError}
                </div>
              )}
            </div>

            {liveLoading && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
                ))}
              </div>
            )}

            {!liveLoading && liveResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-xs text-slate-500">Est. Searches/mo</div>
                    <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                      {liveResult.seedSummary.avgMonthlySearches.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-xs text-slate-500">Est. Competition</div>
                    <div className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {liveResult.seedSummary.competitionLabel}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-xs text-slate-500">Opportunity Score</div>
                    <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                      {liveResult.seedSummary.opportunityScore}/100
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-xs text-slate-500">Avg Price (Est.)</div>
                    <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                      ${liveResult.seedSummary.avgPriceUsd.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Top Preview Keywords (Estimated Metrics)
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartKeywordSearch(liveResult.seedSummary.keyword)}
                      className="font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      Open full 24-keyword table &amp; CSV export →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-500">
                          <th className="py-2.5 px-4">Keyword</th>
                          <th className="py-2.5 px-3 text-right">Est. Searches</th>
                          <th className="py-2.5 px-3">Trend</th>
                          <th className="py-2.5 px-3">Competition</th>
                          <th className="py-2.5 px-4 text-right">Opportunity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {liveResult.keywords.slice(0, 8).map((k) => (
                          <tr key={k.keyword}>
                            <td className="py-2.5 px-4 font-medium">{k.keyword}</td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              {k.monthlySearches.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <Sparkline data={k.sparkline} trend={k.trend} />
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold">{k.competitionLabel}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                              {k.opportunityScore}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeView === 'calculator' && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProfitCalculator feeSettings={feeSettings} />
          </section>
        )}
      </main>

      {/* Clean SaaS Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-slate-900 dark:text-white">CraftRank</span>
            <span aria-hidden="true">·</span>
            <span>Free Etsy SEO &amp; Product Research Suite</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => onNavigate('features')} className="hover:text-violet-600 cursor-pointer">
              Features
            </button>
            <button type="button" onClick={() => onNavigate('live-tool')} className="hover:text-violet-600 cursor-pointer">
              Live Keyword Tool
            </button>
            <button type="button" onClick={() => onNavigate('calculator')} className="hover:text-violet-600 cursor-pointer">
              Fee Calculator
            </button>
            <button type="button" onClick={() => onNavigate(user ? 'dashboard' : 'login')} className="hover:text-violet-600 cursor-pointer">
              {user ? 'Dashboard' : 'Sign In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
