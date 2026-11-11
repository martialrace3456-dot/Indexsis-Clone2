// Simple hash function for contest passcodes
// This is client-side hashing for basic protection, not cryptographic security
export async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  const inputHash = await hashPasscode(passcode);
  return inputHash === hash;
}
