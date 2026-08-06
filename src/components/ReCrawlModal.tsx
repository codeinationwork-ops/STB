import React, { useState } from "react";
import { fetchBrandProductsFromDb, applyDiffToFirestore } from "../lib/firestoreService";
import { calculateCatalogDiff, CatalogDiffResult } from "../lib/catalogDiff";
import { Product } from "../types";

interface ReCrawlModalProps {
  brandName: string;
  brandUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReCrawlModal: React.FC<ReCrawlModalProps> = ({
  brandName,
  brandUrl,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<"IDLE" | "CRAWLING" | "DIFF_READY" | "UPDATING" | "COMPLETE">("IDLE");
  const [diff, setDiff] = useState<CatalogDiffResult | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [log, setLog] = useState<string>("Ready to initiate re-crawl...");
  const [currentUrl, setCurrentUrl] = useState<string>(brandUrl || "");
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);

  // Handle Re-Crawl Trigger
  const handleStartReCrawl = async () => {
    setStatus("CRAWLING");
    const targetUrl = currentUrl && currentUrl.startsWith("http")
      ? currentUrl
      : `https://${(currentUrl || brandName).toLowerCase().replace(/[^a-z0-9.]/g, "")}.com`;

    setLog(`🚀 Crawling latest catalog from ${targetUrl}...`);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

      // 1. Send crawl request to backend (try /api/v1/crawl or /api/crawl)
      let response = await fetch("/api/v1/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: controller.signal
      });

      // Fallback if /api/v1/crawl returned 404
      if (response.status === 404) {
        response = await fetch("/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
          signal: controller.signal
        });
      }

      clearTimeout(fetchTimeout);

      // 2. Read raw response text first to safely inspect status and body
      const rawText = await response.text();

      if (!response.ok) {
        if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
          throw new Error(`Backend returned HTTP ${response.status} HTML error page instead of JSON.`);
        }
        throw new Error(`Backend HTTP ${response.status}: ${rawText || "Empty response body from server"}`);
      }

      if (!rawText || rawText.trim() === "") {
        throw new Error("Server returned an empty response. Verify backend crawler is running.");
      }

      // 3. Parse JSON safely
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Server returned non-JSON response: ${rawText.slice(0, 120)}...`);
      }

      const newlyCrawledProducts: Product[] = data.products || [];
      setLog(`📁 Crawl complete (${newlyCrawledProducts.length} items fetched). Comparing with DB...`);

      // 4. Fetch existing DB items for this brand
      const existingDbProducts = await fetchBrandProductsFromDb(brandName);

      // 5. Compute Differential Sync
      const diffResult = calculateCatalogDiff(existingDbProducts, newlyCrawledProducts);
      setDiff(diffResult);
      setStatus("DIFF_READY");
      setLog(`✅ Diff Analysis Complete! Found ${diffResult.totalChanges} modifications across catalog.`);
    } catch (error: any) {
      console.error("Re-crawl error:", error);
      if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
        setLog(`⏱️ Crawl request timed out after 5 minutes. Try re-crawling with a direct store collection URL.`);
      } else {
        setLog(`❌ ${error.message || error}`);
      }
      setStatus("IDLE");
    }
  };

  // Handle User Clicking "Apply Update"
  const handleConfirmUpdate = async () => {
    if (!diff || diff.totalChanges === 0) {
      onClose();
      return;
    }

    setStatus("UPDATING");
    setLog(`💾 Applying ${diff.totalChanges} updates to Firestore in throttled batches...`);

    try {
      await applyDiffToFirestore(
        diff.newProducts,
        diff.updatedProducts,
        (committed, total) => {
          const percent = Math.round((committed / total) * 100);
          setProgressPercent(percent);
          setLog(`💾 Updated ${committed} / ${total} products (${percent}%)`);
        }
      );

      setStatus("COMPLETE");
      setLog(`🎉 Catalog successfully updated!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (error: any) {
      setLog(`❌ Update failed: ${error.message || error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>Re-Crawl Catalog:</span>
            <span className="text-red-600 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100">{brandName}</span>
          </h3>
          <button
            onClick={onClose}
            disabled={status === "CRAWLING" || status === "UPDATING"}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Target URL Selector / Editor */}
        <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-gray-600 uppercase tracking-wider">
            <span>Target Store URL</span>
            {status === "IDLE" && !isEditingUrl && (
              <button
                type="button"
                onClick={() => setIsEditingUrl(true)}
                className="text-red-600 hover:text-red-700 hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>✏️</span> Change URL
              </button>
            )}
          </div>

          {isEditingUrl && status === "IDLE" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                placeholder="https://brand.com"
              />
              <button
                type="button"
                onClick={() => setIsEditingUrl(false)}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded-lg border border-gray-200 flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-2 truncate">
                <span className="text-gray-400">🌐</span>
                <span className="truncate font-medium">{currentUrl || `https://${brandName.toLowerCase()}.com`}</span>
              </div>
              {status === "IDLE" && (
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-0.5 rounded border border-gray-200 hover:border-red-200 bg-gray-50 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status & Log Box */}
        <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs shadow-inner leading-relaxed overflow-x-auto">
          {log}
        </div>

        {/* Diff Result Summary Screen (Shown after crawl) */}
        {status === "DIFF_READY" && diff && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center shadow-sm">
                <span className="block text-2xl font-black text-emerald-600">+{diff.newProducts.length}</span>
                <span className="text-xs text-emerald-800 font-semibold">New Products</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center shadow-sm">
                <span className="block text-2xl font-black text-amber-600">{diff.priceChangesCount}</span>
                <span className="text-xs text-amber-800 font-semibold">Price Changes</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center shadow-sm">
                <span className="block text-2xl font-black text-blue-600">{diff.stockChangesCount}</span>
                <span className="text-xs text-blue-800 font-semibold">Stock Updates</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-sm text-gray-700">
              {diff.totalChanges > 0 ? (
                <p>
                  Found <strong className="text-gray-900">{diff.totalChanges} modifications</strong> across the catalog. Unchanged items ({diff.unchangedCount}) will remain untouched.
                </p>
              ) : (
                <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                  <span className="text-lg">✓</span> Catalog is already 100% up to date! No changes detected.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar during database update */}
        {status === "UPDATING" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 font-mono">
              <span>SYNCING DIFFERENTIAL CHANGES</span>
              <span className="text-emerald-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <button
            onClick={onClose}
            disabled={status === "CRAWLING" || status === "UPDATING"}
            className="px-4 py-2 border rounded-xl font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Cancel
          </button>

          {status === "IDLE" && (
            <button
              onClick={handleStartReCrawl}
              className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center gap-2 shadow-md shadow-red-100"
            >
              <span>🔄</span>
              <span>Start Re-Crawl</span>
            </button>
          )}

          {status === "DIFF_READY" && (
            <button
              onClick={handleConfirmUpdate}
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-md shadow-emerald-100"
            >
              <span>{diff && diff.totalChanges > 0 ? "⚡" : "✓"}</span>
              <span>
                {diff && diff.totalChanges > 0
                  ? `Update (${diff.totalChanges} Changes)`
                  : "Keep Same & Close"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
