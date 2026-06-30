/**
 * AES-256-GCM payload encryption (Web Crypto API).
 * DevTools Network tab shows ciphertext only — key is still in the JS bundle.
 */

const ENCRYPTION_ENABLED = import.meta.env.VITE_ENABLE_PAYLOAD_ENCRYPTION === 'true';
const RAW_KEY = import.meta.env.VITE_API_PAYLOAD_KEY || '';

let cryptoKeyPromise = null;

async function getKeyBytes() {
  if (!RAW_KEY) return null;
  try {
    const binary = atob(RAW_KEY);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length === 32) return bytes;
  } catch {
    /* use SHA-256 fallback */
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(RAW_KEY));
  return new Uint8Array(hash);
}

async function getCryptoKey() {
  if (!cryptoKeyPromise) {
    cryptoKeyPromise = (async () => {
      const bytes = await getKeyBytes();
      if (!bytes) return null;
      return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ]);
    })();
  }
  return cryptoKeyPromise;
}

export function isPayloadEncryptionEnabled() {
  return ENCRYPTION_ENABLED && Boolean(RAW_KEY);
}

export async function encryptPayload(data) {
  const key = await getCryptoKey();
  if (!key) throw new Error('Encryption key not configured');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  let binary = '';
  combined.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export async function decryptPayload(cipherText) {
  const key = await getCryptoKey();
  if (!key) throw new Error('Encryption key not configured');

  const raw = typeof cipherText === 'string' ? cipherText : String(cipherText);
  const binary = atob(raw.trim());
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) combined[i] = binary.charCodeAt(i);

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

export async function parseEncryptedResponse(data) {
  const text = typeof data === 'string' ? data : String(data);
  const json = await decryptPayload(text);
  return JSON.parse(json);
}
