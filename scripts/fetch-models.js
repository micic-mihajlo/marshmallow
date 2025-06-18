#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function fetchAndOrganizeModels() {
  try {
    console.log('🔍 Fetching models from OpenRouter...');
    
    const response = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.data;
    
    console.log(`📊 Found ${models.length} models`);
    
    // Organize and clean the model data
    const organizedModels = models.map(model => {
      // Calculate cost per 1M tokens for easier comparison
      const promptCostPer1M = parseFloat(model.pricing?.prompt || 0) * 1000000;
      const completionCostPer1M = parseFloat(model.pricing?.completion || 0) * 1000000;
      
      // Determine provider from model ID
      const provider = model.id.split('/')[0] || 'unknown';
      
      // Check if model supports various features
      const supportsImages = model.architecture?.input_modalities?.includes('image') || false;
      const supportsText = model.architecture?.input_modalities?.includes('text') || false;
      const outputsText = model.architecture?.output_modalities?.includes('text') || false;
      
      // Automatically set BYOK requirement for expensive models
      const requiresBYOK = promptCostPer1M > 1 || completionCostPer1M > 1;
      
      return {
        id: model.id,
        name: model.name,
        provider: provider,
        description: model.description || '',
        created: model.created,
        
        // Pricing (in USD)
        pricing: {
          prompt: parseFloat(model.pricing?.prompt || 0),
          completion: parseFloat(model.pricing?.completion || 0),
          image: parseFloat(model.pricing?.image || 0),
          request: parseFloat(model.pricing?.request || 0),
          promptPer1M: promptCostPer1M,
          completionPer1M: completionCostPer1M,
        },
        
        // Capabilities
        capabilities: {
          supportsText,
          supportsImages,
          outputsText,
          contextLength: model.context_length || 0,
          tokenizer: model.architecture?.tokenizer || 'unknown',
        },
        
        // Moderation and limits
        moderation: {
          isModerated: model.top_provider?.is_moderated || false,
        },
        
        // Additional info
        huggingFaceId: model.hugging_face_id || null,
        supportedParameters: model.supported_parameters || [],
        perRequestLimits: model.per_request_limits || {},
        
        // Flags for admin decisions
        requiresBYOK: requiresBYOK, // Auto-set based on cost
        isEnabled: true,     // Default to enabled
        notes: requiresBYOK ? 'Auto-flagged: High cost model (>$1/1M tokens)' : '',
      };
    });
    
    // Sort by provider, then by name
    organizedModels.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });
    
    // Generate summary statistics
    const stats = {
      totalModels: organizedModels.length,
      providers: [...new Set(organizedModels.map(m => m.provider))].sort(),
      byProvider: {},
      priceRanges: {
        promptMin: Math.min(...organizedModels.map(m => m.pricing.prompt).filter(p => p > 0)),
        promptMax: Math.max(...organizedModels.map(m => m.pricing.prompt)),
        completionMin: Math.min(...organizedModels.map(m => m.pricing.completion).filter(p => p > 0)),
        completionMax: Math.max(...organizedModels.map(m => m.pricing.completion)),
      },
      capabilities: {
        withImages: organizedModels.filter(m => m.capabilities.supportsImages).length,
        textOnly: organizedModels.filter(m => !m.capabilities.supportsImages).length,
        moderated: organizedModels.filter(m => m.moderation.isModerated).length,
      }
    };
    
    // Count models by provider
    organizedModels.forEach(model => {
      stats.byProvider[model.provider] = (stats.byProvider[model.provider] || 0) + 1;
    });
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save the organized data
    const outputPath = path.join(outputDir, 'openrouter-models.json');
    const output = {
      fetchedAt: new Date().toISOString(),
      stats,
      models: organizedModels
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    // Also create a CSV for easy viewing
    const csvPath = path.join(outputDir, 'openrouter-models.csv');
    const csvHeaders = [
      'ID', 'Name', 'Provider', 'Description', 'Prompt Cost (per 1M)', 'Completion Cost (per 1M)',
      'Context Length', 'Supports Images', 'Is Moderated', 'Requires BYOK', 'Enabled'
    ];
    
    const csvRows = organizedModels.map(model => [
      model.id,
      `"${model.name.replace(/"/g, '""')}"`,
      model.provider,
      `"${(model.description || '').replace(/"/g, '""')}"`,
      model.pricing.promptPer1M.toFixed(4),
      model.pricing.completionPer1M.toFixed(4),
      model.capabilities.contextLength,
      model.capabilities.supportsImages ? 'Yes' : 'No',
      model.moderation.isModerated ? 'Yes' : 'No',
      model.requiresBYOK ? 'Yes' : 'No',
      model.isEnabled ? 'Yes' : 'No'
    ]);
    
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    fs.writeFileSync(csvPath, csvContent);
    
    console.log('✅ Model data organized and saved:');
    console.log(`📄 JSON: ${outputPath}`);
    console.log(`📊 CSV:  ${csvPath}`);
    console.log('');
    console.log('📈 Summary:');
    console.log(`   Total models: ${stats.totalModels}`);
    console.log(`   Providers: ${stats.providers.length} (${stats.providers.slice(0, 5).join(', ')}${stats.providers.length > 5 ? '...' : ''})`);
    console.log(`   With images: ${stats.capabilities.withImages}`);
    console.log(`   Moderated: ${stats.capabilities.moderated}`);
    console.log(`   BYOK Required: ${organizedModels.filter(m => m.requiresBYOK).length}`);
    console.log(`   Price range (prompt): $${stats.priceRanges.promptMin.toFixed(6)} - $${stats.priceRanges.promptMax.toFixed(6)} per token`);
    
    return { outputPath, csvPath, stats };
    
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fetchAndOrganizeModels();
}

module.exports = { fetchAndOrganizeModels }; 