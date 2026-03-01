import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CountriesMap, PoisMap } from '@/lib/data'
import type { FeatureCollection } from 'geojson'

export type WishlistItem = {
  poiId: string
  countryCode: string
  daysMin: number
}

type AppStore = {
  // Static data (loaded once, never mutated)
  countries: CountriesMap
  pois: PoisMap
  geojson: FeatureCollection | null
  setStaticData: (data: { countries: CountriesMap; pois: PoisMap; geojson: FeatureCollection }) => void

  // Anonymous wishlist (persisted to localStorage)
  wishlistItems: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (poiId: string) => void
  clearWishlist: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      countries: {},
      pois: {},
      geojson: null,
      setStaticData: (data) => set(data),

      wishlistItems: [],
      addToWishlist: (item) =>
        set((s) => ({ wishlistItems: [...s.wishlistItems, item] })),
      removeFromWishlist: (poiId) =>
        set((s) => ({ wishlistItems: s.wishlistItems.filter((i) => i.poiId !== poiId) })),
      clearWishlist: () => set({ wishlistItems: [] }),
    }),
    {
      name: 'whereto-store',
      partialize: (state) => ({ wishlistItems: state.wishlistItems }),
    },
  ),
)
