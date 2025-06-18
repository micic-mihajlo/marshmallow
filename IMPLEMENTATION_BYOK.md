# BYOK (Bring-Your-Own-Key) Implementation Plan

## Overview
Add secure per-user API key management allowing users to use their own provider keys (OpenAI, Anthropic, Google, etc.) alongside the existing OpenRouter integration.

## Architecture Goals
- **Security First**: End-to-end encryption of user keys
- **Seamless UX**: Smart model selection based on available keys
- **Cost Transparency**: Clear billing attribution (user keys vs app keys)
- **Fallback Resilience**: Graceful degradation when user keys fail
- **Provider Flexibility**: Support major AI providers directly

## 1. Data Model & Security (Convex Schema)

### New Tables

```typescript
// Provider API Keys (encrypted storage)
providerKeys: {
  userId: v.id("users"),
  provider: v.string(), // "openai" | "anthropic" | "google" | "openrouter"
  keyHash: v.string(), // SHA-256 hash for existence checks
  keyCipher: v.string(), // Encrypted API key
  iv: v.string(), // Initialization vector for encryption
  isActive: v.boolean(),
  createdAt: v.number(),
  lastUsed: v.optional(v.number()),
  lastValidated: v.optional(v.number()),
  validationStatus: v.optional(v.string()), // "valid" | "invalid" | "expired"
}

// BYOK Usage Tracking
byokUsage: {
  userId: v.id("users"),
  provider: v.string(),
  modelSlug: v.string(),
  tokensUsed: v.number(),
  costUSD: v.number(),
  requestId: v.string(),
  timestamp: v.number(),
  success: v.boolean(),
  errorCode: v.optional(v.string()),
}

// Rate Limiting
userRateLimits: {
  userId: v.id("users"),
  provider: v.string(),
  windowStart: v.number(),
  requestCount: v.number(),
  tokenCount: v.number(),
  lastReset: v.number(),
}
```

### Security Architecture

1. **Client-Side Encryption**
   - Use Web Crypto API for key derivation
   - Derive user-specific encryption key from authentication
   - Encrypt API keys before sending to Convex

2. **Server-Side Handling**
   - Store only encrypted keys and IVs in database
   - Decrypt keys only in memory during API calls
   - Immediately zero out decrypted keys after use

3. **Key Derivation Strategy**
   ```typescript
   // Derive user-specific encryption key
   const userSalt = await crypto.subtle.digest('SHA-256', 
     new TextEncoder().encode(userId + clerkId)
   );
   const encryptionKey = await crypto.subtle.importKey(
     'raw', userSalt, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
   );
   ```

## 2. UI/UX Implementation

### Settings Page Enhancements

1. **API Keys Management Tab**
   - Provider selection dropdown
   - Secure key input (masked, validation)
   - Key status indicators (valid/invalid/expired)
   - Usage statistics per provider
   - Cost breakdown (user vs app keys)

2. **Model Selector Enhancements**
   - Visual indicators: "🔑 GPT-4 (Your Key)" vs "GPT-4 (App)"
   - Provider grouping with key status
   - Clear cost implications
   - Key requirement warnings

3. **Security Warnings & Notifications**
   - Key validation status
   - Rate limit notifications
   - Billing alerts
   - Security best practices

### Model Selection Logic

```typescript
interface ModelOption {
  id: string;
  name: string;
  provider: string;
  keySource: 'user' | 'app' | 'unavailable';
  costPer1k: number;
  userHasKey: boolean;
  requiresKey: boolean;
}
```

## 3. Backend Implementation

### API Route Structure

```
/api/byok/
├── keys/
│   ├── POST - Add/update provider key
│   ├── GET - List user's provider keys (metadata only)
│   ├── DELETE - Remove provider key
│   └── validate/ - Validate key with provider
├── usage/
│   ├── GET - User's BYOK usage statistics
│   └── limits/ - Rate limit status
└── proxy/
    └── POST - Proxy chat requests with user keys
```

### Chat Proxy Enhancement

```typescript
// Enhanced chat routing logic
async function routeChatRequest({
  userId,
  modelId,
  messages,
  stream
}) {
  const [provider, model] = parseModelId(modelId);
  
  // 1. Check for user's provider key
  const userKey = await getUserProviderKey(userId, provider);
  
  if (userKey && await validateKey(userKey)) {
    // Direct provider call with user key
    return callProviderDirect(provider, model, messages, userKey, stream);
  }
  
  // 2. Fallback to OpenRouter with app keys
  return callOpenRouter(modelId, messages, stream);
}
```

### Provider Integrations

1. **OpenAI Direct**
   ```typescript
   const openai = new OpenAI({
     apiKey: decryptedUserKey,
     baseURL: 'https://api.openai.com/v1'
   });
   ```

2. **Anthropic Direct**
   ```typescript
   const anthropic = new Anthropic({
     apiKey: decryptedUserKey
   });
   ```

3. **Google Gemini Direct**
   ```typescript
   const genAI = new GoogleGenerativeAI(decryptedUserKey);
   ```

## 4. Security Measures

### Encryption Implementation

1. **Client-Side Encryption**
   ```typescript
   async function encryptApiKey(apiKey: string, userId: string) {
     const key = await deriveUserKey(userId);
     const iv = crypto.getRandomValues(new Uint8Array(12));
     const encrypted = await crypto.subtle.encrypt(
       { name: 'AES-GCM', iv },
       key,
       new TextEncoder().encode(apiKey)
     );
     return { encrypted: arrayBufferToBase64(encrypted), iv: arrayBufferToBase64(iv) };
   }
   ```

2. **Server-Side Decryption**
   ```typescript
   async function decryptApiKey(encryptedData: string, iv: string, userId: string) {
     const key = await deriveUserKey(userId);
     const decrypted = await crypto.subtle.decrypt(
       { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
       key,
       base64ToArrayBuffer(encryptedData)
     );
     return new TextDecoder().decode(decrypted);
   }
   ```

### Rate Limiting & Cost Controls

1. **Per-Provider Rate Limits**
   - Default: 100 requests/hour per provider
   - Configurable per user/admin
   - Token-based limits for expensive models

2. **Cost Protection**
   - Daily spending caps per provider
   - Real-time cost tracking
   - Automatic key disabling on limits

3. **Key Validation**
   - Periodic validation (daily)
   - Real-time validation on errors
   - Automatic fallback on invalid keys

## 5. Migration & Rollout Plan

### Phase 1: Core Infrastructure
- [ ] Database schema updates
- [ ] Encryption/decryption utilities
- [ ] Basic API key storage
- [ ] Admin controls

### Phase 2: Provider Integrations
- [ ] OpenAI direct integration
- [ ] Anthropic direct integration
- [ ] Google Gemini integration
- [ ] Provider validation endpoints

### Phase 3: UI/UX Implementation
- [ ] Settings page API keys tab
- [ ] Model selector enhancements
- [ ] Usage dashboard updates
- [ ] Security warnings/notifications

### Phase 4: Advanced Features
- [ ] Rate limiting implementation
- [ ] Cost tracking & alerts
- [ ] Usage analytics
- [ ] Bulk key management

### Phase 5: Security Hardening
- [ ] Security audit
- [ ] Penetration testing
- [ ] Key rotation mechanisms
- [ ] Incident response procedures

## 6. Testing Strategy

### Security Testing
- [ ] Encryption/decryption correctness
- [ ] Key storage security audit
- [ ] Memory leak prevention (key zeroing)
- [ ] Input validation & sanitization

### Functional Testing
- [ ] Provider API integration tests
- [ ] Fallback mechanism testing
- [ ] Rate limiting behavior
- [ ] Cost calculation accuracy

### User Experience Testing
- [ ] Key management workflow
- [ ] Model selection UX
- [ ] Error handling & messaging
- [ ] Performance impact assessment

## 7. Monitoring & Observability

### Metrics to Track
- BYOK adoption rate
- Provider key validation success rates
- Fallback usage patterns
- Cost savings per user
- Security incident frequency

### Alerting
- Failed key validations
- Unusual usage patterns
- Rate limit breaches
- Cost threshold alerts

## 8. Documentation & Support

### User Documentation
- [ ] BYOK setup guide
- [ ] Provider key acquisition instructions
- [ ] Security best practices
- [ ] Troubleshooting guide

### Developer Documentation
- [ ] API documentation
- [ ] Security architecture overview
- [ ] Integration examples
- [ ] Monitoring playbooks

## 9. Risk Assessment & Mitigations

### High Risk Areas
1. **Key Storage Security** - Mitigated by client-side encryption
2. **Memory Leaks** - Mitigated by explicit key zeroing
3. **Provider API Changes** - Mitigated by version pinning & monitoring
4. **Cost Runaway** - Mitigated by rate limits & spending caps

### Compliance Considerations
- Data residency requirements
- API key handling policies
- Audit trail requirements
- User consent & transparency

## 10. Success Criteria

### Technical Metrics
- Zero plaintext key storage
- < 100ms overhead for BYOK requests
- 99.9% key encryption/decryption success
- Zero security incidents

### Business Metrics
- 20%+ user adoption within 3 months
- 30%+ reduction in app-level API costs
- Improved user satisfaction scores
- Reduced support tickets for rate limits

---

This implementation plan provides a comprehensive roadmap for secure, user-friendly BYOK functionality while maintaining the existing OpenRouter integration as a reliable fallback. 