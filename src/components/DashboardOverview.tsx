import {
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  Compass,
  Flame,
  FolderHeart,
  History,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { AutoPilotDraft, WorkspaceView } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardOverviewProps {
  onNavigate: (view: WorkspaceView) => void;
  tagCart: string[];
  autoPilotQueue: AutoPilotDraft[];
  onQuickSearch: (keyword: string) => void;
}

const TOOL_CARDS: {
  id: WorkspaceView;
  title: string;
  desc: string;
  group: string;
  icon: typeof Search;
}[] = [
  {
    id: 'keywords',
    title: 'Keyword Research',
    desc: 'Search volume, competing listings, CTR potential, pagination & CSV export.',
    group: 'Research',
    icon: Search,
  },
  {
    id: 'competitor',
    title: 'Competitor Analysis',
    desc: 'Uncover competitor core keywords, keyword gaps & winning listing blueprints.',
    group: 'Tracking',
    icon: Users,
  },
  {
    id: 'trends',
    title: 'Trends & Demand',
    desc: 'Rising search terms, seasonal demand curves vs prior year & momentum categories.',
    group: 'Research',
    icon: TrendingUp,
  },
  {
    id: 'topsellers',
    title: 'Top Sellers',
    desc: 'Rank leading Etsy shops by lifetime sales, reviews, rating & winning products.',
    group: 'Research',
    icon: Award,
  },
  {
    id: 'hotproducts',
    title: 'Find Hot Products',
    desc: 'Discover trending Etsy products by price tier and competition, save to favorites.',
    group: 'Discovery',
    icon: Flame,
  },
  {
    id: 'tagoptimizer',
    title: 'Tag Optimizer',
    desc: 'Generate 13 <=20-char Etsy tags with relevance scores & missing opportunities.',
    group: 'SEO Tools',
    icon: Tag,
  },
  {
    id: 'autopilot',
    title: 'Auto Pilot',
    desc: 'Upload a photo and name — auto-research keywords, set pricing & draft listings.',
    group: 'Automation',
    icon: Zap,
  },
  {
    id: 'ranklift',
    title: 'Rank Lift',
    desc: 'Diagnose weak listing copy and generate a before-and-after SEO upgrade.',
    group: 'AI Suite',
    icon: Layers,
  },
  {
    id: 'listingpro',
    title: 'Etsy Listing Pro',
    desc: 'Full multimodal product listing architect with live 13-tag & title linter.',
    group: 'AI Suite',
    icon: Sparkles,
  },
  {
    id: 'audit',
    title: 'Listing Audit',
    desc: '6-point visual SEO health scorecard with itemized improvement fixes.',
    group: 'Audit',
    icon: ShieldCheck,
  },
  {
    id: 'shopanalytics',
    title: 'Shop Analytics',
    desc: 'Views, favorites, orders, revenue & conversion rate via Etsy CSV or API.',
    group: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'rankchecker',
    title: 'Rank Checker',
    desc: 'Track where your shop or listing ranks on Etsy across target keywords.',
    group: 'Tracking',
    icon: Target,
  },
  {
    id: 'category',
    title: 'Category Report',
    desc: 'Macro price brackets, top shared category tags & low-competition niches.',
    group: 'Research',
    icon: Compass,
  },
  {
    id: 'calculator',
    title: 'Etsy Fee Calculator',
    desc: 'Exact 6.5% transaction, payment, Offsite Ads fees & break-even ROAS.',
    group: 'Profit',
    icon: Calculator,
  },
  {
    id: 'saved',
    title: 'Saved Bank',
    desc: 'Manage saved keywords, listings, favorite products & 13-tag cart CSVs.',
    group: 'Workspace',
    icon: FolderHeart,
  },
];

export function DashboardOverview({
  onNavigate,
  tagCart,
  autoPilotQueue,
  onQuickSearch,
}: DashboardOverviewProps) {
  const { profile, workspace } = useAuth();

  // Build simple activity bar series from searchHistory by tool
  const toolCounts = workspace.searchHistory.reduce<Record<string, number>>((acc, item) => {
    acc[item.toolName] = (acc[item.toolName] || 0) + 1;
    return acc;
  }, {});
  const chartEntries = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxToolCount = chartEntries.length ? Math.max(...chartEntries.map((c) => c[1]), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {profile?.displayName
                ? `Welcome back, ${profile.displayName}`
                : 'CraftRank Etsy SEO Workspace'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              {profile?.shopName
                ? `Shop: ${profile.shopName} · ${profile.etsyMarketplace} · `
                : ''}
              All 15 SEO, keyword, listing, and profit tools unlocked free forever with zero credits or daily caps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('keywords')}
              className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Keyword Research</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('autopilot')}
              className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Zap className="w-4 h-4 text-violet-600" />
              <span>Launch Auto Pilot</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Fast Launch:</span>
          {[
            'personalized leather wallet',
            'custom pet portrait gift',
            'minimalist gold ring',
            'printable wedding invite',
          ].map((kw, i, arr) => (
            <span key={kw} className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => onQuickSearch(kw)}
                className="hover:text-violet-600 dark:hover:text-violet-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 cursor-pointer"
              >
                {kw}
              </button>
              {i < arr.length - 1 && <span aria-hidden="true">·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* 4-Column PostgreSQL Workspace Summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('keywords')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-400 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Searches Logged</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {workspace.searchHistory.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Unlimited research runs
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-400 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved Keywords</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
            {workspace.savedKeywords.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tagCart.length}/13 tags in active cart
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('competitor')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-400 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tracked Competitors</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {workspace.trackedCompetitors.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {workspace.rankHistory.length} rank checks logged
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-400 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Analyzed &amp; Saved Listings</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {workspace.savedListings.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {workspace.favoriteProducts.length} hot products · {autoPilotQueue.length} drafts
          </div>
        </button>
      </section>

      {/* Search History + Analytics Activity + Keyword Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-600" />
              <span>Recent Search History</span>
            </h2>
            <span className="text-xs text-slate-400">Synced</span>
          </div>

          {workspace.searchHistory.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              Your keyword, trend, competitor, and listing research history will appear here as you run tools.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {workspace.searchHistory.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onQuickSearch(item.query)}
                      className="font-semibold text-slate-800 dark:text-slate-200 hover:text-violet-600 truncate block text-left cursor-pointer"
                    >
                      {item.query}
                    </button>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.toolName} {item.summary ? `· ${item.summary}` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            <span>Workspace Activity by Tool</span>
          </h2>

          {chartEntries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              Run searches across Keyword Research, Trends, or Rank Lift to visualize your research distribution.
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {chartEntries.map(([tool, count]) => (
                <div key={tool} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{tool}</span>
                    <span className="font-mono tabular-nums text-slate-500">{count} runs</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full"
                      style={{ width: `${Math.min(100, (count / maxToolCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Top Saved Opportunities
          </h2>
          {workspace.savedKeywords.length === 0 ? (
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 py-2">
              <p>No saved keywords yet. Save low-competition phrases from Keyword Research.</p>
              <button
                type="button"
                onClick={() => onNavigate('keywords')}
                className="font-semibold text-violet-600 hover:underline cursor-pointer"
              >
                Explore keywords →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {workspace.savedKeywords.slice(0, 5).map((kw) => (
                <div key={kw.id} className="py-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onQuickSearch(kw.keyword)}
                    className="font-medium text-slate-800 dark:text-slate-200 hover:text-violet-600 truncate text-left cursor-pointer"
                  >
                    {kw.keyword}
                  </button>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600 shrink-0">
                    {kw.opportunityScore}/100
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Complete Toolkit Directory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            <span>All Etsy SEO &amp; Seller Tools</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">15 tools · Unlimited free access</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TOOL_CARDS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onNavigate(tool.id)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-violet-500 transition-colors flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{tool.group}</span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>

                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-violet-600 inline-flex items-center gap-1">
                  <span>Open tool</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
