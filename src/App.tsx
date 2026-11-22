import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Calculator,
  Check,
  Compass,
  Copy,
  Flame,
  FolderHeart,
  Globe,
  LayoutDashboard,
  Layers,
  Loader2,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Target,
  TrendingUp,
  User as UserIcon,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { AuthPages } from './components/AuthPages';
import { AutoPilot } from './components/AutoPilot';
import { CompetitorSpy } from './components/CompetitorSpy';
import { DashboardOverview } from './components/DashboardOverview';
import { HotProducts } from './components/HotProducts';
import { KeywordExplorer } from './components/KeywordExplorer';
import { PublicPages } from './components/LandingPages';
import { ListingAudit } from './components/ListingAudit';
import { ListingOptimizer, type OptimizerDraftPayload } from './components/ListingOptimizer';
import { ListingsResearch } from './components/ListingsResearch';
import { NicheFinder } from './components/NicheFinder';
import { ProfileSettings } from './components/ProfileSettings';
import { ProfitCalculator } from './components/ProfitCalculator';
import { RankChecker } from './components/RankChecker';
import { RankLift } from './components/RankLift';
import { SavedBank } from './components/SavedBank';
import { ShopAnalytics } from './components/ShopAnalytics';
import { TagOptimizer } from './components/TagOptimizer';
import { TopSellers } from './components/TopSellers';
import { TrendsDemand } from './components/TrendsDemand';
import { useAuth } from './context/AuthContext';
import type {
  AutoPilotDraft,
  KeywordResearchResponse,
  RankHistoryEntry,
  SavedListing,
  WorkspaceView,
} from './types';
import { sanitizeEtsyTag } from './utils/etsyRules';

const STORAGE_KEYS = {
  tagCart: 'craftrank_tag_cart_v1',
  autoPilotQueue: 'craftrank_autopilot_v1',
  theme: 'craftrank_theme_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const PUBLIC_VIEWS = new Set<WorkspaceView>([
  'home',
  'features',
  'live-tool',
  'login',
  'register',
]);

const NAV_GROUPS: {
  groupLabel: string;
  items: { id: WorkspaceView; label: string; icon: typeof Search }[];
}[] = [
  {
    groupLabel: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    groupLabel: 'Research & Discovery',
    items: [
      { id: 'keywords', label: 'Keyword Research', icon: Search },
      { id: 'listings', label: 'Listings Research', icon: Layers },
      { id: 'competitor', label: 'Competitor Analysis', icon: Users },
      { id: 'trends', label: 'Trends & Demand', icon: TrendingUp },
      { id: 'topsellers', label: 'Top Sellers', icon: Award },
      { id: 'hotproducts', label: 'Find Hot Products', icon: Flame },
      { id: 'category', label: 'Category Report', icon: Compass },
    ],
  },
  {
    groupLabel: 'SEO & AI Listing Suite',
    items: [
      { id: 'tagoptimizer', label: 'Tag Optimizer', icon: Tag },
      { id: 'autopilot', label: 'Auto Pilot', icon: Zap },
      { id: 'ranklift', label: 'Rank Lift', icon: Layers },
      { id: 'listingpro', label: 'Etsy Listing Pro', icon: Sparkles },
      { id: 'aititletags', label: 'AI Title & Tags', icon: Sparkles },
      { id: 'audit', label: 'Listing Audit', icon: ShieldCheck },
    ],
  },
  {
    groupLabel: 'Analytics & Workspace',
    items: [
      { id: 'shopanalytics', label: 'Shop Analytics', icon: BarChart3 },
      { id: 'rankchecker', label: 'Rank Checker', icon: Target },
      { id: 'calculator', label: 'Etsy Fee Calculator', icon: Calculator },
      { id: 'saved', label: 'Saved Bank', icon: FolderHeart },
    ],
  },
  {
    groupLabel: 'Account',
    items: [
      { id: 'profile', label: 'User Profile', icon: UserIcon },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function App() {
  const {
    user,
    authLoading,
    profile,
    workspace,
    feeSettings,
    saveListing,
    trackCompetitor,
    removeCompetitor,
    recordRank,
    logSearch,
  } = useAuth();

  const [activeView, setActiveView] = useState<WorkspaceView>('home');
  const [returnToView, setReturnToView] = useState<WorkspaceView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = readStorage<string>(STORAGE_KEYS.theme, 'light');
    return saved === 'dark';
  });

  // Shared cross-tool state
  const [seedQuery, setSeedQuery] = useState('');
  const [autoSearchVersion, setAutoSearchVersion] = useState(0);
  const [keywordResult, setKeywordResult] = useState<KeywordResearchResponse | null>(null);

  const [competitorTarget, setCompetitorTarget] = useState('');
  const [competitorScanVersion, setCompetitorScanVersion] = useState(0);

  const [tagCart, setTagCart] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.tagCart, [])
  );
  const [autoPilotQueue, setAutoPilotQueue] = useState<AutoPilotDraft[]>(() =>
    readStorage<AutoPilotDraft[]>(STORAGE_KEYS.autoPilotQueue, [])
  );

  const [optimizerDraft, setOptimizerDraft] = useState<OptimizerDraftPayload | null>(null);
  const [copiedCart, setCopiedCart] = useState(false);

  // Sync dark theme class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(darkMode ? 'dark' : 'light'));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tagCart, JSON.stringify(tagCart));
  }, [tagCart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.autoPilotQueue, JSON.stringify(autoPilotQueue));
  }, [autoPilotQueue]);

  // Redirect signed-in user off login/register straight to target dashboard view
  useEffect(() => {
    if (!authLoading && user && (activeView === 'login' || activeView === 'register')) {
      setActiveView(returnToView || 'dashboard');
    }
  }, [user, authLoading, activeView, returnToView]);

  function navigateTo(view: WorkspaceView) {
    const isPublic = PUBLIC_VIEWS.has(view) || (view === 'calculator' && !user);
    if (!isPublic && !user) {
      setReturnToView(view);
      setActiveView('login');
      return;
    }
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAddTagToCart(raw: string) {
    const clean = sanitizeEtsyTag(raw).toLowerCase();
    if (!clean) return;
    setTagCart((prev) => {
      if (prev.length >= 13) return prev;
      if (prev.some((t) => t.toLowerCase() === clean)) return prev;
      return [...prev, clean];
    });
  }

  function handleRemoveTagFromCart(tag: string) {
    setTagCart((prev) => prev.filter((t) => t !== tag));
  }

  const trackedShopNames = workspace.trackedCompetitors.map((c) => c.shopName);

  function handleToggleTrackShop(shopName: string) {
    const clean = shopName.trim();
    if (!clean) return;
    const existing = workspace.trackedCompetitors.find(
      (c) => c.shopName.toLowerCase() === clean.toLowerCase()
    );
    if (existing) {
      void removeCompetitor(existing.id);
    } else {
      void trackCompetitor({ shopName: clean });
    }
  }

  function handleSaveListingToDb(listing: Omit<SavedListing, 'id' | 'savedAt'>) {
    void saveListing({
      title: listing.title,
      tags: listing.tags,
      description: listing.description,
      priceUsd: listing.priceUsd,
      category: listing.category,
      sourceTool: activeView,
    });
  }

  function handleAddAutoPilotDraft(draft: AutoPilotDraft) {
    setAutoPilotQueue((prev) => [draft, ...prev]);
    void logSearch('Auto Pilot', draft.workingName, `Drafted ${draft.tags.length} tags`);
  }

  function handleApproveAutoPilotDraft(draft: AutoPilotDraft) {
    setAutoPilotQueue((prev) =>
      prev.map((d) => (d.id === draft.id ? { ...d, status: 'Approved' } : d))
    );
    void saveListing({
      title: draft.title,
      tags: draft.tags,
      description: draft.description,
      priceUsd: draft.suggestedPriceUsd,
      category: draft.suggestedCategory,
      sourceTool: 'autopilot',
      status: 'approved',
    });
  }

  function handleDeleteAutoPilotDraft(id: string) {
    setAutoPilotQueue((prev) => prev.filter((d) => d.id !== id));
  }

  function handleRecordRankHistory(entry: RankHistoryEntry) {
    void recordRank({
      target: entry.target,
      avgPosition: entry.avgPosition,
      pageOneCount: entry.pageOneCount,
      totalKeywords: entry.totalKeywords,
    });
    void logSearch('Rank Checker', entry.target, `Avg #${entry.avgPosition}`);
  }

  function jumpToOptimizerWithIdea(idea: string) {
    setOptimizerDraft({
      version: Date.now(),
      mode: 'generate',
      productIdea: idea,
    });
    navigateTo('listingpro');
  }

  function jumpToOptimizerWithCartTags() {
    setOptimizerDraft({
      version: Date.now(),
      mode: 'audit',
      tags: tagCart,
    });
    navigateTo('listingpro');
  }

  function jumpToOptimizerWithSavedListing(listing: SavedListing) {
    setOptimizerDraft({
      version: Date.now(),
      mode: 'audit',
      title: listing.title,
      tags: listing.tags,
      description: listing.description,
      priceUsd: listing.priceUsd,
      category: listing.category,
    });
    navigateTo('listingpro');
  }

  function jumpToKeywordExplorer(kw: string) {
    setSeedQuery(kw);
    setAutoSearchVersion((v) => v + 1);
    navigateTo('keywords');
  }

  function jumpToCompetitorSpy(shopName: string) {
    setCompetitorTarget(shopName);
    setCompetitorScanVersion((v) => v + 1);
    navigateTo('competitor');
  }

  function copyCartTags() {
    if (!tagCart.length) return;
    navigator.clipboard.writeText(tagCart.join(', '));
    setCopiedCart(true);
    setTimeout(() => setCopiedCart(false), 1500);
  }

  // Initial Firebase auth check spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
          <span>Loading CraftRank...</span>
        </div>
      </div>
    );
  }

  // Dedicated Login & Register Pages
  if (activeView === 'login' || activeView === 'register') {
    return (
      <AuthPages
        mode={activeView}
        onSwitchMode={(m) => setActiveView(m)}
        onSuccess={() => setActiveView(returnToView || 'dashboard')}
        onNavigatePublic={(v) => navigateTo(v)}
      />
    );
  }

  // Public Marketing & Free Calculator / Live Keyword Preview
  if (
    activeView === 'home' ||
    activeView === 'features' ||
    activeView === 'live-tool' ||
    (activeView === 'calculator' && !user)
  ) {
    return (
      <PublicPages
        activeView={activeView}
        onNavigate={navigateTo}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onStartKeywordSearch={jumpToKeywordExplorer}
      />
    );
  }

  // Guard: If somehow on a protected route without user, render Login
  if (!user) {
    return (
      <AuthPages
        mode="login"
        onSwitchMode={(m) => setActiveView(m)}
        onSuccess={() => setActiveView(returnToView || 'dashboard')}
        onNavigatePublic={(v) => navigateTo(v)}
      />
    );
  }

  const activeNav = ALL_NAV_ITEMS.find((n) => n.id === activeView) ?? ALL_NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Brand Wordmark */}
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
                C
              </span>
              <span>CraftRank</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grouped Navigation */}
          <nav className="space-y-4" aria-label="Workspace tools">
            {NAV_GROUPS.map((group) => (
              <div key={group.groupLabel} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {group.groupLabel}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === 'saved' && workspace.savedListings.length > 0 && (
                        <span className="font-mono tabular-nums text-xs text-slate-400">
                          {workspace.savedListings.length}
                        </span>
                      )}
                      {item.id === 'autopilot' && autoPilotQueue.length > 0 && (
                        <span className="font-mono tabular-nums text-xs text-slate-400">
                          {autoPilotQueue.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Active 13-Tag Scratchpad + Theme Switch */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">13-Tag Cart</span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {tagCart.length}/13
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-600 transition-all"
                style={{ width: `${Math.min(100, (tagCart.length / 13) * 100)}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={copyCartTags}
                disabled={tagCart.length === 0}
                className="flex-1 h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                {copiedCart ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCart ? 'Copied' : 'Copy Tags'}</span>
              </button>
              <button
                type="button"
                onClick={jumpToOptimizerWithCartTags}
                disabled={tagCart.length === 0}
                className="flex-1 h-7 px-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 text-[11px] font-semibold hover:bg-violet-600 dark:hover:bg-violet-500 dark:hover:text-white whitespace-nowrap cursor-pointer"
              >
                Use Tags
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between cursor-pointer"
          >
            <span>{darkMode ? 'Light Appearance' : 'Dark Appearance'}</span>
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm truncate">
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-700 hidden sm:inline cursor-pointer"
              >
                Dashboard
              </button>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hidden sm:inline-flex h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center">
                {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="hidden md:inline max-w-[120px] truncate">
                {profile?.displayName || user.email}
              </span>
            </button>
          </div>
        </header>

        {/* Active Tool Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {activeView === 'dashboard' && (
            <DashboardOverview
              onNavigate={navigateTo}
              tagCart={tagCart}
              autoPilotQueue={autoPilotQueue}
              onQuickSearch={jumpToKeywordExplorer}
            />
          )}

          {activeView === 'keywords' && (
            <KeywordExplorer
              seedQuery={seedQuery}
              autoSearchVersion={autoSearchVersion}
              onSeedQueryChange={setSeedQuery}
              result={keywordResult}
              onResultChange={setKeywordResult}
              tagCart={tagCart}
              onAddTagToCart={handleAddTagToCart}
              onSendKeywordToOptimizer={jumpToOptimizerWithIdea}
            />
          )}

          {activeView === 'listings' && (
            <ListingsResearch
              tagCart={tagCart}
              onAddTagToCart={handleAddTagToCart}
              onInspectShop={jumpToCompetitorSpy}
            />
          )}

          {activeView === 'competitor' && (
            <CompetitorSpy
              initialShop={competitorTarget}
              autoScanVersion={competitorScanVersion}
              trackedShops={trackedShopNames}
              onToggleTrackShop={handleToggleTrackShop}
              tagCart={tagCart}
              onAddTagToCart={handleAddTagToCart}
              onExploreKeyword={jumpToKeywordExplorer}
            />
          )}

          {activeView === 'trends' && <TrendsDemand onExploreKeyword={jumpToKeywordExplorer} />}

          {activeView === 'topsellers' && (
            <TopSellers
              trackedShops={trackedShopNames}
              onToggleTrackShop={handleToggleTrackShop}
              onExploreKeyword={jumpToKeywordExplorer}
            />
          )}

          {activeView === 'hotproducts' && (
            <HotProducts
              tagCart={tagCart}
              onAddTagToCart={handleAddTagToCart}
              onExploreKeyword={jumpToKeywordExplorer}
            />
          )}

          {activeView === 'tagoptimizer' && (
            <TagOptimizer tagCart={tagCart} onAddTagToCart={handleAddTagToCart} />
          )}

          {activeView === 'autopilot' && (
            <AutoPilot
              queue={autoPilotQueue}
              onAddDraft={handleAddAutoPilotDraft}
              onApproveDraft={handleApproveAutoPilotDraft}
              onDeleteDraft={handleDeleteAutoPilotDraft}
              onEditInStudio={jumpToOptimizerWithSavedListing}
            />
          )}

          {activeView === 'ranklift' && <RankLift />}

          {activeView === 'listingpro' && (
            <ListingOptimizer
              draftPayload={optimizerDraft}
              tagCart={tagCart}
              onSaveListing={handleSaveListingToDb}
              heading="Etsy Listing Pro"
              subtitle="End-to-end multimodal listing studio with 3 SEO titles, 13 verified tags, description architect, and live Etsy rule compliance."
            />
          )}

          {activeView === 'aititletags' && (
            <ListingOptimizer
              draftPayload={optimizerDraft}
              tagCart={tagCart}
              onSaveListing={handleSaveListingToDb}
              heading="AI Title & Tags Generator"
              subtitle="Generate front-loaded mobile-ready 140-character titles, 13 <=20-char tags, suggested categories, and buyer descriptions."
            />
          )}

          {activeView === 'audit' && <ListingAudit />}

          {activeView === 'shopanalytics' && <ShopAnalytics />}

          {activeView === 'rankchecker' && (
            <RankChecker
              history={workspace.rankHistory}
              onRecordHistory={handleRecordRankHistory}
              onOptimizeListing={jumpToOptimizerWithIdea}
            />
          )}

          {activeView === 'category' && (
            <NicheFinder
              tagCart={tagCart}
              onAddTagToCart={handleAddTagToCart}
              onExploreKeyword={jumpToKeywordExplorer}
              onBuildListing={jumpToOptimizerWithIdea}
            />
          )}

          {activeView === 'calculator' && <ProfitCalculator feeSettings={feeSettings} />}

          {activeView === 'saved' && (
            <SavedBank
              tagCart={tagCart}
              onRemoveTagFromCart={handleRemoveTagFromCart}
              onClearTagCart={() => setTagCart([])}
              onSendTagsToOptimizer={jumpToOptimizerWithCartTags}
              onLoadListingToOptimizer={jumpToOptimizerWithSavedListing}
              onExploreKeyword={jumpToKeywordExplorer}
            />
          )}

          {(activeView === 'profile' || activeView === 'settings') && (
            <ProfileSettings
              initialTab={activeView}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
