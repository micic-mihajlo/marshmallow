#!/usr/bin/env node

/**
 * Script to update existing models in Convex database with BYOK fields
 * This fetches current OpenRouter models and updates the database
 */

const fs = require('fs');
const path = require('path');

// Load the fetched models data
const modelsDataPath = path.join(__dirname, '..', 'data', 'openrouter-models.json');

if (!fs.existsSync(modelsDataPath)) {
  console.error('❌ Models data not found at:', modelsDataPath);
  console.log('Please run: node scripts/fetch-models.js first');
  process.exit(1);
}

const modelsData = JSON.parse(fs.readFileSync(modelsDataPath, 'utf8'));

console.log(`📊 Loaded ${modelsData.length} models from OpenRouter API`);

// Generate Convex mutation calls to update models
const updateStatements = modelsData.map(model => {
  const promptCostPer1M = parseFloat(model.pricing?.prompt || 0) * 1000000;
  const completionCostPer1M = parseFloat(model.pricing?.completion || 0) * 1000000;
  const requiresBYOK = promptCostPer1M > 1 || completionCostPer1M > 1;

  return {
    slug: model.id,
    requiresBYOK,
    promptCostPer1M,
    completionCostPer1M,
    cost: { prompt: promptCostPer1M, completion: completionCostPer1M }
  };
});

const byokRequired = updateStatements.filter(m => m.requiresBYOK);
const regularModels = updateStatements.filter(m => !m.requiresBYOK);

console.log(`\n📋 BYOK Analysis:`);
console.log(`   🔒 Models requiring BYOK: ${byokRequired.length} (${(byokRequired.length/updateStatements.length*100).toFixed(1)}%)`);
console.log(`   🆓 Regular models: ${regularModels.length} (${(regularModels.length/updateStatements.length*100).toFixed(1)}%)`);

console.log(`\n💰 Most expensive models requiring BYOK:`);
byokRequired
  .sort((a, b) => (b.promptCostPer1M + b.completionCostPer1M) - (a.promptCostPer1M + a.completionCostPer1M))
  .slice(0, 5)
  .forEach(model => {
    console.log(`   • ${model.slug}: $${model.promptCostPer1M.toFixed(2)}/$${model.completionCostPer1M.toFixed(2)} per 1M tokens`);
  });

console.log(`\n✅ Affordable models (no BYOK required):`);
regularModels
  .slice(0, 10)
  .forEach(model => {
    console.log(`   • ${model.slug}: $${model.promptCostPer1M.toFixed(2)}/$${model.completionCostPer1M.toFixed(2)} per 1M tokens`);
  });

// Generate the mutation calls for Convex
console.log(`\n🔧 To update your Convex database, run this in your admin dashboard or via Convex CLI:`);
console.log(`\nMethod 1: Use the admin seeding function (if you have admin access):`);
console.log(`convex run seedModels:seedOpenRouterModelsFromAPI '{"overwrite": true}'`);

console.log(`\nMethod 2: Manual database updates (if needed):`);
console.log(`The following models should be updated with BYOK requirements:\n`);

// Output as manageable chunks
const chunks = [];
for (let i = 0; i < updateStatements.length; i += 50) {
  chunks.push(updateStatements.slice(i, i + 50));
}

chunks.forEach((chunk, index) => {
  console.log(`// Chunk ${index + 1}/${chunks.length}`);
  console.log(`const updateChunk${index + 1} = ${JSON.stringify(chunk, null, 2)};`);
  console.log('');
});

console.log(`\n📝 You can copy this data to use in a Convex function to update models.`);
console.log(`\n🚀 Next steps:`);
console.log(`1. Try running the seeding function with admin access`);
console.log(`2. Or use the generated update data in a custom Convex function`);
console.log(`3. After update, the BYOK warnings should be accurate`); 