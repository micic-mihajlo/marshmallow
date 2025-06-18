// Client-side encryption utilities for BYOK API keys
// Uses Web Crypto API for secure encryption/decryption

/**
 * Derives a user-specific encryption key from their Clerk ID
 * This ensures each user has a unique encryption key
 */
export async function deriveUserKey(clerkId: string): Promise<CryptoKey> {
  // Create a salt from the user's Clerk ID
  const encoder = new TextEncoder();
  const saltData = encoder.encode(`marshmallow-byok-${clerkId}`);
  
  // Hash the salt to get consistent 256-bit key material
  const keyMaterial = await crypto.subtle.digest('SHA-256', saltData);
  
  // Import as AES-GCM key
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an API key using AES-GCM
 */
export async function encryptApiKey(
  apiKey: string,
  clerkId: string
): Promise<{ encrypted: string; iv: string; hash: string }> {
  try {
    // Derive user-specific key
    const key = await deriveUserKey(clerkId);
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the API key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Create hash for existence checks (without revealing the key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv.buffer),
      hash: arrayBufferToBase64(hashBuffer),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypts an API key using AES-GCM
 */
export async function decryptApiKey(
  encryptedData: string,
  iv: string,
  clerkId: string
): Promise<string> {
  try {
    // Derive user-specific key
    const key = await deriveUserKey(clerkId);
    
    // Convert base64 back to ArrayBuffer
    const encrypted = base64ToArrayBuffer(encryptedData);
    const ivBuffer = base64ToArrayBuffer(iv);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encrypted
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Validates that an API key can be encrypted and decrypted successfully
 */
export async function validateEncryption(
  apiKey: string,
  clerkId: string
): Promise<boolean> {
  try {
    const { encrypted, iv } = await encryptApiKey(apiKey, clerkId);
    const decrypted = await decryptApiKey(encrypted, iv, clerkId);
    return decrypted === apiKey;
  } catch {
    return false;
  }
}

/**
 * Creates a hash of an API key for existence checks
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Utility: Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility: Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Securely clears a string from memory (best effort)
 * Note: JavaScript doesn't provide true memory clearing, but this helps
 */
export function clearString(str: string): void {
  // This is a best-effort attempt to clear the string
  // In practice, JavaScript strings are immutable and may remain in memory
  if (typeof str === 'string' && str.length > 0) {
    // Overwrite the string variable (though the original may still exist)
    str = '\0'.repeat(str.length);
  }
}

/**
 * Generates a secure random string for testing encryption
 */
export function generateTestKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Basic API key validation - just check it's not empty
 * Let the provider APIs do the real validation
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Just check it's not empty and has reasonable length
  const cleanKey = apiKey.trim();
  return cleanKey.length >= 10; // Very basic check
}

/**
 * Gets user-friendly provider name
 */
export function getProviderDisplayName(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google AI';
    case 'openrouter':
      return 'OpenRouter';
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

/**
 * Gets instructions for obtaining API keys from different providers
 */
export function getApiKeyInstructions(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'openai':
      return 'Get your API key from https://platform.openai.com/api-keys';
    case 'anthropic':
      return 'Get your API key from https://console.anthropic.com/';
    case 'google':
      return 'Get your API key from https://makersuite.google.com/app/apikey';
    case 'openrouter':
      return 'Get your API key from https://openrouter.ai/keys';
    default:
      return 'Check your provider\'s documentation for API key instructions';
  }
} 