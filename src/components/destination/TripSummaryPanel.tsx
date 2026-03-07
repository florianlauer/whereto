import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import type { WishlistItem } from "@/stores/appStore";

type Props = {
  onClose: () => void;
};

export function TripSummaryPanel({ onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const countries = useAppStore((s) => s.countries);
  const pois = useAppStore((s) => s.pois);
  const removeFromWishlist = useAppStore((s) => s.removeFromWishlist);
  const clearWishlist = useAppStore((s) => s.clearWishlist);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Fermer automatiquement quand la wishlist se vide
  useEffect(() => {
    if (wishlistItems.length === 0) handleClose();
  }, [wishlistItems.length, handleClose]);

  // Regrouper par pays
  const groups = Object.entries(
    wishlistItems.reduce<Record<string, WishlistItem[]>>((acc, item) => {
      if (!acc[item.countryCode]) acc[item.countryCode] = [];
      acc[item.countryCode].push(item);
      return acc;
    }, {}),
  );

  // Totaux globaux
  const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0);
  const totalBudgetMin = groups.reduce((acc, [code, items]) => {
    const days = items.reduce((s, i) => s + i.daysMin, 0);
    return acc + days * (countries[code]?.dailyBudgetLow ?? 0);
  }, 0);
  const totalBudgetMax = groups.reduce((acc, [code, items]) => {
    const days = items.reduce((s, i) => s + i.daysMin, 0);
    return acc + days * (countries[code]?.dailyBudgetHigh ?? 0);
  }, 0);
  const totalPoiLabel = `${wishlistItems.length} POI${wishlistItems.length > 1 ? "s" : ""} · ~${totalDays}j`;
  const totalBudgetLabel = `${totalBudgetMin}€ – ${totalBudgetMax}€`;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Récapitulatif de voyage"
      tabIndex={-1}
      className={[
        "fixed left-0 top-0 bottom-0 z-20 flex w-[360px] max-w-full flex-col",
        "border-r border-white/10 bg-[#0a0b0f]/96 shadow-[8px_0_40px_rgba(0,0,0,0.6)]",
        "backdrop-blur-xl backdrop-saturate-[180%]",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus:outline-none",
        visible ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Accent bar */}
      <div
        className="h-[2px] w-full"
        style={{ background: "linear-gradient(90deg, #f97316, #f59e0b, transparent)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
            Récapitulatif
          </p>
          <h2 className="text-xl font-bold tracking-tight text-white">Mon Voyage</h2>
        </div>
        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 pb-4 scrollbar-none">
          <div className="space-y-0">
            {groups.map(([code, items], index) => {
              const country = countries[code];
              if (!country) return null;
              const countryPois = pois[code] ?? [];
              const countryDays = items.reduce((acc, i) => acc + i.daysMin, 0);
              const budgetMin = countryDays * country.dailyBudgetLow;
              const budgetMax = countryDays * country.dailyBudgetHigh;
              const flightsUrl = `https://www.google.com/flights#search;t=${code}`;

              return (
                <div key={code} className={index > 0 ? "border-t border-white/10 pt-5 mt-5" : ""}>
                  {/* Entête pays */}
                  <div className="mb-3">
                    {country.region && (
                      <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-gray-500">
                        {country.region}
                      </p>
                    )}
                    <p className="text-base font-bold tracking-tight text-white">{country.name}</p>
                  </div>

                  {/* POIs sélectionnés */}
                  <ul className="mb-3 space-y-0.5">
                    {items.map((item) => {
                      const poi = countryPois.find((p) => p.id === item.poiId);
                      if (!poi) return null;
                      return (
                        <li
                          key={item.poiId}
                          className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                            <span className="truncate text-sm text-gray-300">{poi.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs tabular-nums text-gray-600">
                              {poi.daysMin === poi.daysMax
                                ? `${poi.daysMin}j`
                                : `${poi.daysMin}–${poi.daysMax}j`}
                            </span>
                            <button
                              onClick={() => removeFromWishlist(item.poiId)}
                              className="flex h-6 w-6 items-center justify-center text-gray-700 transition hover:text-red-400"
                              aria-label={`Retirer ${poi.name}`}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path
                                  d="M7 1L1 7M1 1l6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Sous-total + budget estimé */}
                  <div className="mb-3 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-gray-600">
                        ~{countryDays} jours
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {budgetMin}€ – {budgetMax}€
                      </span>
                    </div>
                  </div>

                  {/* Lien vols */}
                  <a
                    href={flightsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 transition-all hover:border-white/20 hover:bg-white/5"
                  >
                    <span className="text-sm transition group-hover:scale-110 inline-block">✈</span>
                    <span className="text-xs font-medium text-gray-300 transition group-hover:text-white">
                      Vols — {country.name}
                    </span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      className="ml-auto shrink-0 text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-gray-300"
                    >
                      <path
                        d="M3 2l4 3-4 3"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fade-out bas */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-[#0a0b0f]/96 to-transparent" />
      </div>

      {/* Footer sticky — totaux globaux */}
      <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base">🧳</span>
          <div>
            <p className="text-xs text-gray-500">{totalPoiLabel}</p>
            <p className="text-sm font-semibold tabular-nums text-white">{totalBudgetLabel}</p>
          </div>
        </div>
        <button
          onClick={() => {
            clearWishlist();
            handleClose();
          }}
          className="ml-3 shrink-0 text-xs text-gray-500 transition hover:text-red-400"
        >
          Effacer tout
        </button>
      </div>
    </div>
  );
}
