#!/usr/bin/env node

/**
 * Script to fix existing usageTracking records with incorrect cost calculations
 * The original code was multiplying costs by 0.000001, making them nearly zero
 * This script corrects those records by dividing costInUSD by 0.000001 (multiplying by 1000000)
 */

console.log('🔧 Starting usage cost correction script...');

// This script would need to be run via Convex mutations
// For now, it provides the logic that can be adapted to Convex

console.log(`
⚠️  USAGE COST CORRECTION NEEDED ⚠️

Your existing usage tracking records have incorrect cost calculations due to a bug
where costs were multiplied by 0.000001, making them nearly zero.

To fix this, you need to run a Convex mutation that:

1. Queries all usageTracking records where costInUSD is very small but costInCredits > 0
2. Updates costInUSD = costInCredits (since OpenRouter returns costs directly in USD)

Example Convex mutation to add to convex/usageTracking.ts:

export const fixUsageCosts = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all usage records with incorrect costs
    const records = await ctx.db
      .query("usageTracking")
      .filter((q) => 
        q.and(
          q.gt(q.field("costInCredits"), 0),
          q.lt(q.field("costInUSD"), 0.001) // Very small USD cost indicates the bug
        )
      )
      .collect();

    console.log(\`Found \${records.length} records to fix\`);

    let fixed = 0;
    for (const record of records) {
      await ctx.db.patch(record._id, {
        costInUSD: record.costInCredits, // Fix: OpenRouter returns USD directly
      });
      fixed++;
    }

    return { totalRecords: records.length, fixed };
  },
});

Run this mutation via the Convex dashboard or add it temporarily to your code.
`);

console.log('✅ Script completed. Please implement the Convex mutation shown above.'); 