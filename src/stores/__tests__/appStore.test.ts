import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../appStore";
import type { FeatureCollection } from "geojson";

const mockStaticData = {
  countries: {
    GE: {
      code: "GE",
      name: "Géorgie",
      dailyBudgetLow: 20,
      dailyBudgetMid: 30,
      dailyBudgetHigh: 55,
      bestMonths: [4, 5, 6, 9, 10],
      recommendedDaysMin: 7,
      recommendedDaysMax: 14,
      safetyScore: 4,
      dataYear: 2022,
    },
  },
  pois: {
    GE: [{ id: "ge-tbilisi", name: "Tbilissi", daysMin: 2, daysMax: 3, type: "city" as const }],
  },
  geojson: {
    type: "FeatureCollection" as const,
    features: [],
  } as FeatureCollection,
};

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      countries: {},
      pois: {},
      geojson: null,
      wishlistItems: [],
    });
  });

  describe("setStaticData", () => {
    it("AC-3: stores countries, pois, and geojson", () => {
      useAppStore.getState().setStaticData(mockStaticData);

      const state = useAppStore.getState();
      expect(state.countries).toEqual(mockStaticData.countries);
      expect(state.pois).toEqual(mockStaticData.pois);
      expect(state.geojson).toEqual(mockStaticData.geojson);
    });

    it("AC-3: countries keyed by ISO-2 code", () => {
      useAppStore.getState().setStaticData(mockStaticData);
      expect(useAppStore.getState().countries["GE"]).toBeDefined();
    });

    it("AC-3: does not affect wishlistItems", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      useAppStore.getState().setStaticData(mockStaticData);
      expect(useAppStore.getState().wishlistItems).toHaveLength(1);
    });
  });

  describe("wishlist", () => {
    it("addToWishlist: adds item to empty wishlist", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      expect(useAppStore.getState().wishlistItems).toHaveLength(1);
      expect(useAppStore.getState().wishlistItems[0]!.poiId).toBe("ge-tbilisi");
    });

    it("addToWishlist: accumulates multiple items", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      useAppStore.getState().addToWishlist({ poiId: "ge-kazbegi", countryCode: "GE", daysMin: 1 });
      expect(useAppStore.getState().wishlistItems).toHaveLength(2);
    });

    it("removeFromWishlist: removes item by poiId", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      useAppStore.getState().addToWishlist({ poiId: "ge-kazbegi", countryCode: "GE", daysMin: 1 });
      useAppStore.getState().removeFromWishlist("ge-tbilisi");

      const items = useAppStore.getState().wishlistItems;
      expect(items).toHaveLength(1);
      expect(items[0]!.poiId).toBe("ge-kazbegi");
    });

    it("removeFromWishlist: no-op when poiId not found", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      useAppStore.getState().removeFromWishlist("nonexistent");
      expect(useAppStore.getState().wishlistItems).toHaveLength(1);
    });

    it("clearWishlist: empties wishlistItems", () => {
      useAppStore.getState().addToWishlist({ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 });
      useAppStore.getState().addToWishlist({ poiId: "ge-kazbegi", countryCode: "GE", daysMin: 1 });
      useAppStore.getState().clearWishlist();
      expect(useAppStore.getState().wishlistItems).toHaveLength(0);
    });
  });
});
