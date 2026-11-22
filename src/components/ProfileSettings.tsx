import { useEffect, useState } from 'react';
import { Check, Loader2, LogOut, Moon, Save, ShieldCheck, Store, Sun } from 'lucide-react';
import { DEFAULT_FEE_SETTINGS, useAuth } from '../context/AuthContext';

interface ProfileSettingsProps {
  initialTab: 'profile' | 'settings';
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function ProfileSettings({
  initialTab,
  darkMode,
  onToggleDarkMode,
}: ProfileSettingsProps) {
  const { user, profile, updateProfile, feeSettings, setFeeSettings, logout, workspace } = useAuth();
  const [tab, setTab] = useState<'profile' | 'settings'>(initialTab);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [shopName, setShopName] = useState(profile?.shopName ?? '');
  const [etsyMarketplace, setEtsyMarketplace] = useState(profile?.etsyMarketplace ?? 'United States');
  const [currency, setCurrency] = useState(profile?.currency ?? 'USD');
  const [savingProfile, setSavingProfile] = useState(false);

  const [feesDraft, setFeesDraft] = useState(feeSettings);
  const [apiStatus, setApiStatus] = useState<{
    etsyOpenApiConnected: boolean;
    searchGroundingEnabled: boolean;
  } | null>(null);
  const [savedFeeBadge, setSavedFeeBadge] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setShopName(profile.shopName || '');
      setEtsyMarketplace(profile.etsyMarketplace || 'United States');
      setCurrency(profile.currency || 'USD');
    }
  }, [profile]);

  useEffect(() => {
    fetch('/api/etsy/status')
      .then((r) => r.json())
      .then((d) => setApiStatus(d))
      .catch(() => setApiStatus(null));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName,
        shopName,
        etsyMarketplace,
        currency,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  function handleSaveFees(e: React.FormEvent) {
    e.preventDefault();
    setFeeSettings(feesDraft);
    setSavedFeeBadge(true);
    setTimeout(() => setSavedFeeBadge(false), 1800);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Account Profile &amp; Workspace Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your shop details, default marketplace preferences, custom Etsy fee assumptions, and data sync status.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            User Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Settings &amp; Fees
          </button>
        </div>
      </section>

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Seller Profile Details
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Account Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email ?? profile?.email ?? ''}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Etsy Shop Name
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. OakAndBrassStudio"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Default Marketplace
                  </label>
                  <select
                    value={etsyMarketplace}
                    onChange={(e) => setEtsyMarketplace(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="European Union">European Union</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (CA$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => void logout()}
                  className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-red-600 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          </section>

          <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-violet-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Synced Workspace Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Saved Keywords</div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {workspace.savedKeywords.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Saved Listings</div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {workspace.savedListings.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Tracked Competitors</div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {workspace.trackedCompetitors.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Favorite Products</div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {workspace.favoriteProducts.length}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 p-3.5 text-xs text-slate-600 dark:text-slate-300">
              All tools and exports on this account are <strong className="text-violet-700 dark:text-violet-300">100% Free Forever</strong> with zero credit limits or subscriptions.
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Fee Calculator Configuration */}
          <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Etsy Fee Calculator Assumptions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customize Etsy transaction, listing renewal, and payment processing fee overrides used by the Fee Calculator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFeesDraft(DEFAULT_FEE_SETTINGS);
                  setFeeSettings(DEFAULT_FEE_SETTINGS);
                }}
                className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
              >
                Reset Etsy US Defaults
              </button>
            </div>

            <form onSubmit={handleSaveFees} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Transaction Fee (%)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={30}
                    value={feesDraft.transactionFeePercent}
                    onChange={(e) =>
                      setFeesDraft((p) => ({ ...p, transactionFeePercent: Number(e.target.value) || 0 }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Listing Renewal Fee ($)
                  </label>
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={5}
                    value={feesDraft.listingFeeFixed}
                    onChange={(e) =>
                      setFeesDraft((p) => ({ ...p, listingFeeFixed: Number(e.target.value) || 0 }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Payment Processing (%)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={15}
                    value={feesDraft.paymentPercent}
                    onChange={(e) =>
                      setFeesDraft((p) => ({ ...p, paymentPercent: Number(e.target.value) || 0 }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Payment Fixed Fee ($)
                  </label>
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={5}
                    value={feesDraft.paymentFixed}
                    onChange={(e) =>
                      setFeesDraft((p) => ({ ...p, paymentFixed: Number(e.target.value) || 0 }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                {savedFeeBadge ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{savedFeeBadge ? 'Saved Fee Settings' : 'Save Fee Defaults'}</span>
              </button>
            </form>
          </section>

          {/* Appearance & API Integration Status */}
          <section className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Interface Appearance
              </h2>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {darkMode ? 'Dark Workspace Theme' : 'Light Workspace Theme'}
                </span>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>Switch to {darkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Data Source &amp; Etsy API Status
                </h2>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Live Search Grounding</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {apiStatus?.searchGroundingEnabled ? 'Active' : 'Checking...'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Etsy Open API v3 (Shop Telemetry)</span>
                  <span
                    className={`font-semibold ${
                      apiStatus?.etsyOpenApiConnected
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {apiStatus?.etsyOpenApiConnected ? 'Connected' : 'Not Connected (CSV Available)'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
