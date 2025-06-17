# Admin Portal Setup Guide

This guide will help you set up and use the admin portal for your chat application.

## Features

The admin portal provides:

1. **Metrics Dashboard** - View app usage statistics, token consumption, and costs
2. **Models Management** - Add, edit, and remove AI models
3. **Model Settings** - Configure which features are enabled for each model
4. **Security Settings** - (Coming soon)

## Setup Instructions

### 1. Start Convex Development Server

First, make sure your Convex development server is running:

```bash
npx convex dev
```

### 2. Seed Sample Models (Optional)

To get started quickly with some sample models, you can seed the database:

1. Open the Convex dashboard or use the Convex CLI
2. Run the seed function:

```bash
npx convex run seedModels:seedSampleModels
```

This will create sample models from popular providers (Anthropic, OpenAI, Google, Meta) with their capabilities and pricing information.

### 3. Access the Admin Portal

Navigate to `/admin` in your application to access the admin portal.

## Using the Admin Portal

### Metrics Dashboard

- View total users, messages, and token usage
- See estimated costs based on model pricing
- Monitor model usage statistics
- Track user activity over time

### Models Management

- **Add New Model**: Click "Add Model" to configure a new AI model
- **Edit Model**: Click the edit button to modify model details
- **Delete Model**: Remove models you no longer need
- **Model Capabilities**: Configure what features each model supports:
  - File Upload
  - Image Upload
  - Vision capabilities
  - Streaming support

### Model Settings

- **Enable/Disable Models**: Toggle which models are available to users
- **Feature Permissions**: Control which features users can access per model
- **Usage Limits**: Set token limits and rate limits per user
- **View Capabilities**: See what each model natively supports

## Model Configuration

When adding a new model, you'll need to provide:

- **Name**: Display name for the model
- **Slug**: Unique identifier (e.g., "anthropic/claude-3-haiku")
- **Provider**: The company providing the model
- **Description**: Brief description of the model's purpose
- **Capabilities**: What features the model supports
- **Limits**: Maximum tokens and cost per 1K tokens

## Sample Models Included

The seed function includes these popular models:

- **Claude 3 Haiku** - Fast, efficient model with multimodal capabilities
- **Claude 3.5 Sonnet** - Balanced model with strong reasoning
- **GPT-4o** - OpenAI's flagship multimodal model
- **GPT-4o Mini** - Smaller, faster version of GPT-4o
- **Gemini 1.5 Pro** - Google's advanced model with large context
- **Llama 3.1 70B** - Meta's open-source model

## Security Considerations

- The admin portal should only be accessible to authorized administrators
- Consider implementing proper authentication and authorization
- Monitor usage and costs regularly
- Set appropriate rate limits to prevent abuse

## Troubleshooting

### Models not appearing
- Make sure Convex is running (`npx convex dev`)
- Check that the schema has been pushed to Convex
- Verify the seed function ran successfully

### Settings not saving
- Check the browser console for errors
- Ensure you have proper permissions in Convex
- Verify the model settings functions are deployed

### Metrics not loading
- Ensure there's data in your database (users, conversations, messages)
- Check that the metrics functions are working
- Consider running the daily metrics storage function

## Next Steps

1. Customize the model list for your specific use case
2. Implement proper authentication for the admin portal
3. Set up automated daily metrics collection
4. Configure monitoring and alerting for usage and costs
5. Add custom security settings as needed 