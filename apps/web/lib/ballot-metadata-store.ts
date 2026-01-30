/**
 * Local storage for ballot metadata CID mappings
 * 
 * Since the on-chain ballot doesn't store the IPFS CID directly,
 * we maintain a local mapping of ballotId -> metadataCid.
 * 
 * In production, this could be:
 * - Stored in a database (Supabase, etc.)
 * - Derived from on-chain events
 * - Stored in a decentralized registry
 */

const STORAGE_KEY = 'cloakcraft:ballot-metadata';

interface BallotMetadataMapping {
  [ballotIdHex: string]: string; // ballotId (hex) -> metadataCid
}

/**
 * Get the stored metadata mappings from localStorage
 */
function getStoredMappings(): BallotMetadataMapping {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save metadata mappings to localStorage
 */
function saveMappings(mappings: BallotMetadataMapping): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (error) {
    console.error('Failed to save ballot metadata mapping:', error);
  }
}

/**
 * Convert a ballot ID (Uint8Array) to hex string
 */
export function ballotIdToHex(ballotId: Uint8Array): string {
  return Buffer.from(ballotId).toString('hex');
}

/**
 * Save the metadata CID for a ballot
 */
export function saveBallotMetadataCid(ballotId: Uint8Array, metadataCid: string): void {
  const mappings = getStoredMappings();
  const key = ballotIdToHex(ballotId);
  mappings[key] = metadataCid;
  saveMappings(mappings);
}

/**
 * Get the metadata CID for a ballot
 */
export function getBallotMetadataCid(ballotId: Uint8Array): string | null {
  const mappings = getStoredMappings();
  const key = ballotIdToHex(ballotId);
  return mappings[key] || null;
}

/**
 * Get all stored ballot metadata CIDs
 */
export function getAllBallotMetadataCids(): BallotMetadataMapping {
  return getStoredMappings();
}

/**
 * Remove a ballot metadata mapping
 */
export function removeBallotMetadataCid(ballotId: Uint8Array): void {
  const mappings = getStoredMappings();
  const key = ballotIdToHex(ballotId);
  delete mappings[key];
  saveMappings(mappings);
}

/**
 * Clear all ballot metadata mappings
 */
export function clearAllBallotMetadataCids(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
