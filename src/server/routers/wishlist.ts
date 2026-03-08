import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { protectedProcedure } from "../middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve the user's wishlist ID (one wishlist per user, created on signup). */
async function getWishlistId(supabaseUser: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabaseUser
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not resolve wishlist",
    });
  }

  return data.id;
}

export const wishlistRouter = router({
  /**
   * List wishlist items. Public procedure:
   * - No token => return []
   * - Valid token => fetch items ordered by position, map to camelCase
   */
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.accessToken) return [];

    const {
      data: { user },
      error: authError,
    } = await ctx.supabaseUser.auth.getUser();

    if (authError || !user) return [];

    const wishlistId = await getWishlistId(ctx.supabaseUser, user.id);

    const { data: items, error } = await ctx.supabaseUser
      .from("wishlist_items")
      .select("poi_id, country_code, days_min, position")
      .eq("wishlist_id", wishlistId)
      .order("position", { ascending: true });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch wishlist items",
      });
    }

    return (items ?? []).map((item) => ({
      poiId: item.poi_id,
      countryCode: item.country_code,
      daysMin: item.days_min,
      position: item.position,
    }));
  }),

  /**
   * Add (upsert) an item to the wishlist.
   * On conflict (same poi_id in same wishlist), updates silently.
   */
  add: protectedProcedure
    .input(
      z.object({
        poiId: z.string().min(1),
        countryCode: z.string().length(2),
        daysMin: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);

      // Get current count for position
      const { data: existing } = await ctx.supabaseUser
        .from("wishlist_items")
        .select("id")
        .eq("wishlist_id", wishlistId);

      const position = existing?.length ?? 0;

      const { error } = await ctx.supabaseUser.from("wishlist_items").upsert(
        {
          wishlist_id: wishlistId,
          poi_id: input.poiId,
          country_code: input.countryCode,
          days_min: input.daysMin,
          position,
        },
        { onConflict: "wishlist_id,poi_id" },
      );

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add wishlist item",
        });
      }

      return { success: true };
    }),

  /**
   * Remove an item from the wishlist by poi_id.
   */
  remove: protectedProcedure
    .input(z.object({ poiId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);

      const { error } = await ctx.supabaseUser
        .from("wishlist_items")
        .delete()
        .eq("wishlist_id", wishlistId)
        .eq("poi_id", input.poiId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove wishlist item",
        });
      }

      return { success: true };
    }),

  /**
   * Update days_min for an existing wishlist item.
   */
  update: protectedProcedure
    .input(
      z.object({
        poiId: z.string().min(1),
        daysMin: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);

      const { error } = await ctx.supabaseUser
        .from("wishlist_items")
        .update({ days_min: input.daysMin })
        .eq("wishlist_id", wishlistId)
        .eq("poi_id", input.poiId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update wishlist item",
        });
      }

      return { success: true };
    }),

  /**
   * Reorder wishlist items. Each poi_id gets position = its index in the array.
   */
  reorder: protectedProcedure
    .input(z.object({ poiIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const wishlistId = await getWishlistId(ctx.supabaseUser, ctx.user.id);

      // Update position for each poi_id
      const updates = input.poiIds.map((poiId, index) =>
        ctx.supabaseUser
          .from("wishlist_items")
          .update({ position: index })
          .eq("wishlist_id", wishlistId)
          .eq("poi_id", poiId),
      );

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);

      if (failed?.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reorder wishlist items",
        });
      }

      return { success: true };
    }),
});
