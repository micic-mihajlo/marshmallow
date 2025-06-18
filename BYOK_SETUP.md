# Bring Your Own Key (BYOK) Setup

This feature allows users to use their own OpenRouter API keys instead of the system default, providing unlimited usage and enhanced privacy.

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# BYOK Encryption Key - Generate a secure random string
BYOK_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Important**: Use a secure, random 32+ character string for the encryption key. This key is used to encrypt/decrypt user API keys in the database.

Example generation:
```bash
# Generate a secure key
openssl rand -hex 32
```

### 2. Database Schema

The user schema already includes the `apiKey` field:

```typescript
users: defineTable({
  // ... other fields
  apiKey: v.optional(v.string()), // encrypted user's OpenRouter API key
})
```

No database migration is required as this field already exists.

## How It Works

### 1. API Key Storage
- User API keys are encrypted using AES-256-CBC before storage
- Each key uses a unique IV (Initialization Vector) for security
- Keys are stored in the format: `IV:EncryptedData`

### 2. API Key Usage
- The chat system first checks if the user has their own API key
- If found, it decrypts and uses the user's key
- If not found or decryption fails, it falls back to the system default

### 3. User Interface
- Users can access BYOK settings through the "Bring Your Own Key" button in the chat header
- The interface shows current status (using own key vs system default)
- Users can add, update, or remove their API keys
- A status indicator shows which key is being used

## Security Features

- **Encryption**: All API keys are encrypted at rest using AES-256-CBC
- **Unique IVs**: Each encryption uses a unique initialization vector
- **Fallback**: System gracefully falls back to default key if user key fails
- **No Plaintext**: API keys are never stored in plaintext

## User Benefits

- **Unlimited Usage**: Based on user's OpenRouter account limits
- **Direct Billing**: Charges go directly to user's OpenRouter account
- **Enhanced Privacy**: User's API usage is not mixed with system usage
- **Full Model Access**: Access to all models available in user's OpenRouter account

## Getting Your OpenRouter API Key

1. Visit [OpenRouter Dashboard](https://openrouter.ai/keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key (starts with `sk-or-v1-`)
5. Paste it into the BYOK settings in the chat interface

## Troubleshooting

### Common Issues

1. **Encryption Key Not Set**
   - Error: "BYOK_ENCRYPTION_KEY environment variable is required"
   - Solution: Set the `BYOK_ENCRYPTION_KEY` environment variable

2. **Invalid API Key**
   - Error: API requests fail with authentication errors
   - Solution: Verify the OpenRouter API key is correct and has sufficient credits

3. **Decryption Fails**
   - Error: "Failed to decrypt API key"
   - Solution: The system will automatically fall back to the default key

### Debug Information

Enable debug logging to see which API key is being used:
- Look for "[Chat] Using user's own API key" in the console
- Check for fallback messages if decryption fails

## Development Notes

- The `byok.ts` file uses the "use node" directive for crypto operations
- Encryption/decryption happens in Convex actions (not queries/mutations)
- The UI components are fully reactive to API key status changes 