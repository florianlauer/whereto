import { useWishlist } from "@/hooks/useWishlist";

type Props = {
  onClear: () => void;
  onOpen: () => void;
};

export function WishlistCounter({ onClear, onOpen }: Props) {
  const { wishlistItems } = useWishlist();
  if (wishlistItems.length === 0) return null;

  const totalDays = wishlistItems.reduce((acc, i) => acc + i.daysMin, 0);
  const label = `${wishlistItems.length} POI${wishlistItems.length > 1 ? "s" : ""} · ~${totalDays}j`;

  return (
    <div className="flex items-center justify-between border-t border-white/8 px-6 py-3">
      <button onClick={onOpen} className="flex items-center gap-2 transition hover:opacity-75">
        <span className="text-sm">🧳</span>
        <span className="text-sm font-medium text-white underline-offset-2 hover:underline">
          {label}
        </span>
      </button>
      <button onClick={onClear} className="text-xs text-gray-500 transition hover:text-white">
        Effacer
      </button>
    </div>
  );
}
