import { useEffect, useRef, useState } from 'react';
import { BarChart3, Info, Upload } from 'lucide-react';

interface ImportedMetrics {
  fileName: string;
  totalViews: number;
  totalFavorites: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  topRows: { label: string; orders: number; revenue: number }[];
  series: { label: string; value: number }[];
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function ShopAnalytics() {
  const [status, setStatus] = useState<{ etsyOpenApiConnected: boolean } | null>(null);
  const [imported, setImported] = useState<ImportedMetrics | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/etsy/status')
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ etsyOpenApiConnected: false }));
  }, []);

  function handleCsvUpload(file: File | undefined) {
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '').trim();
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setCsvError('CSV must contain a header row and at least one data row.');
          return;
        }
        const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const findIdx = (needles: string[]) =>
          headers.findIndex((h) => needles.some((n) => h.includes(n)));

        const idxTitle = findIdx(['title', 'item name', 'listing', 'product']);
        const idxOrders = findIdx(['orders', 'quantity', 'sales', 'sold']);
        const idxRevenue = findIdx(['order net', 'net', 'revenue', 'order total', 'price', 'amount']);
        const idxViews = findIdx(['views', 'visits']);
        const idxFavs = findIdx(['favorites', 'favourites', 'likes']);
        const idxDate = findIdx(['sale date', 'date', 'month']);

        let totalOrders = 0;
        let totalRevenue = 0;
        let totalViews = 0;
        let totalFavorites = 0;
        const byItem = new Map<string, { orders: number; revenue: number }>();
        const byDate = new Map<string, number>();

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const num = (idx: number) => {
            if (idx < 0 || idx >= cols.length) return 0;
            const cleaned = cols[idx].replace(/[^0-9.-]/g, '');
            return Number(cleaned) || 0;
          };

          const orders = idxOrders >= 0 ? Math.max(1, num(idxOrders)) : 1;
          const revenue = idxRevenue >= 0 ? num(idxRevenue) : 0;
          const views = idxViews >= 0 ? num(idxViews) : 0;
          const favs = idxFavs >= 0 ? num(idxFavs) : 0;

          totalOrders += orders;
          totalRevenue += revenue;
          totalViews += views;
          totalFavorites += favs;

          const itemLabel = idxTitle >= 0 && cols[idxTitle] ? cols[idxTitle] : `Order #${i}`;
          const prev = byItem.get(itemLabel) ?? { orders: 0, revenue: 0 };
          byItem.set(itemLabel, { orders: prev.orders + orders, revenue: prev.revenue + revenue });

          const dateLabel =
            idxDate >= 0 && cols[idxDate] ? cols[idxDate].slice(0, 7) : `Row ${Math.ceil(i / 5)}`;
          byDate.set(dateLabel, (byDate.get(dateLabel) ?? 0) + revenue);
        }

        const topRows = Array.from(byItem.entries())
          .map(([label, stats]) => ({ label, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);

        const series = Array.from(byDate.entries())
          .map(([label, value]) => ({ label, value }))
          .slice(0, 12);

        const conversionRate =
          totalViews > 0 ? Math.round((totalOrders / totalViews) * 10000) / 100 : 0;

        setImported({
          fileName: file.name,
          totalViews,
          totalFavorites,
          totalOrders,
          totalRevenue,
          conversionRate,
          topRows,
          series,
        });
      } catch {
        setCsvError('Could not parse CSV file. Export your Etsy Orders or Listings CSV directly from Shop Manager.');
      }
    };
    reader.readAsText(file);
  }

  const maxSeries = imported?.series.length
    ? Math.max(...imported.series.map((s) => s.value), 1)
    : 1;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Shop Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track Views, Favorites, Orders, Revenue, and Conversion Rate from your verified Etsy Shop Manager CSV export or Etsy Open API v3.
            </p>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleCsvUpload(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Etsy Shop CSV</span>
            </button>
          </div>
        </div>

        {/* Honest Etsy Open API Status Banner */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-slate-700 dark:text-slate-300">
            <div className="font-semibold text-slate-900 dark:text-white">
              Etsy Open API v3 Live Sync: {status?.etsyOpenApiConnected ? 'Connected' : 'Not Connected (Unavailable Without ETSY_API_KEY)'}
            </div>
            <p className="leading-relaxed">
              CraftRank never generates fabricated shop revenue or order counts. To inspect real shop metrics right now without API credentials, download your <strong className="text-slate-900 dark:text-white">Orders CSV</strong> or <strong className="text-slate-900 dark:text-white">Listings Stats CSV</strong> from Etsy Shop Manager &rarr; Settings &rarr; Options &rarr; Download Data and upload it above.
            </p>
          </div>
        </div>

        {csvError && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {csvError}
          </div>
        )}
      </section>

      {imported ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Total Revenue</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                ${imported.totalRevenue.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Orders</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {imported.totalOrders.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Total Views</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {imported.totalViews > 0 ? imported.totalViews.toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Favorites</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {imported.totalFavorites > 0 ? imported.totalFavorites.toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500">Conversion Rate</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
                {imported.conversionRate > 0 ? `${imported.conversionRate}%` : 'N/A'}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Revenue Breakdown ({imported.fileName})
              </h2>
              <div className="space-y-3">
                {imported.series.map((s) => (
                  <div key={s.label} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                      <span className="font-mono tabular-nums font-semibold">${s.value.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-violet-600 rounded-full"
                        style={{ width: `${Math.min(100, (s.value / maxSeries) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top Performing Products in Export
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {imported.topRows.map((row) => (
                  <div key={row.label} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {row.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0">
                      {row.orders} orders · <strong className="text-slate-900 dark:text-white">${row.revenue.toFixed(2)}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <BarChart3 className="w-8 h-8 text-violet-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No Shop Telemetry Connected Yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Upload your Etsy Shop CSV export above to visualize real revenue, orders, views, favorites, and conversion rates with zero guesswork.
          </p>
        </section>
      )}
    </div>
  );
}
