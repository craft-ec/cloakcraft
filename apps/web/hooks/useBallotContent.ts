"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BallotContent,
  BallotOptionContent,
  createBallotContent,
} from "@/lib/ballot-content";
import { IPFS_GATEWAY } from "@/lib/filebase";

export interface UploadState {
  isUploading: boolean;
  error: string | null;
}

export interface ContentUploadResult {
  cid: string;
  url: string;
  size: number;
}

/**
 * Generate upload auth signature
 * Message format: "CloakCraft Upload: {timestamp}"
 */
async function generateUploadAuth(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<{ wallet: string; signature: string; timestamp: number }> {
  const timestamp = Date.now();
  const message = `CloakCraft Upload: ${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);

  const signatureBytes = await signMessage(messageBytes);
  const signature = Buffer.from(signatureBytes).toString("base64");

  return { wallet: walletAddress, signature, timestamp };
}

/**
 * Hook for uploading ballot content to IPFS
 * Requires wallet connection for authentication
 */
export function useBallotUpload() {
  const { publicKey, signMessage } = useWallet();
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
  });

  /**
   * Upload ballot content to IPFS
   */
  const uploadBallot = useCallback(
    async (data: {
      title: string;
      description: string;
      options: BallotOptionContent[];
      category?: string;
      links?: Array<{ label: string; url: string }>;
    }): Promise<ContentUploadResult | null> => {
      if (!publicKey || !signMessage) {
        setState({ isUploading: false, error: "Wallet not connected" });
        return null;
      }

      setState({ isUploading: true, error: null });

      try {
        // Generate auth signature
        const auth = await generateUploadAuth(publicKey.toBase58(), signMessage);

        const content = createBallotContent({
          title: data.title,
          description: data.description,
          options: data.options,
          category: data.category,
          links: data.links,
          creator: publicKey.toBase58(),
        });

        const response = await fetch("/api/ballot/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, auth }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Upload failed");
        }

        const result = await response.json();
        setState({ isUploading: false, error: null });

        return {
          cid: result.cid,
          url: result.url,
          size: result.size,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setState({ isUploading: false, error: message });
        return null;
      }
    },
    [publicKey, signMessage]
  );

  /**
   * Reset error state
   */
  const reset = useCallback(() => {
    setState({ isUploading: false, error: null });
  }, []);

  return {
    ...state,
    uploadBallot,
    reset,
  };
}

// Simple in-memory cache for IPFS content
const contentCache = new Map<string, BallotContent>();

/**
 * Hook for fetching ballot content from IPFS
 */
export function useBallotContentFetch(cid: string | undefined) {
  const [content, setContent] = useState<BallotContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cid) {
      setContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Skip if already fetched this CID
    if (fetchedRef.current === cid) {
      return;
    }

    // Check cache first
    const cached = contentCache.get(cid);
    if (cached) {
      setContent(cached);
      setIsLoading(false);
      setError(null);
      fetchedRef.current = cid;
      return;
    }

    // Fetch from IPFS
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = cid.startsWith("http") ? cid : `${IPFS_GATEWAY}${cid}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch content");
        }

        const data = await response.json();
        
        // Cache the content
        contentCache.set(cid, data);
        
        setContent(data);
        fetchedRef.current = cid;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fetch failed";
        setError(message);
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [cid]);

  return {
    content,
    isLoading,
    error,
    getUrl: (cid: string) =>
      cid ? (cid.startsWith("http") ? cid : `${IPFS_GATEWAY}${cid}`) : "",
  };
}

/**
 * Hook for fetching content imperatively (for use in callbacks)
 */
export function useBallotContentFetcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch ballot content from IPFS by CID
   */
  const fetchContent = useCallback(
    async (cid: string): Promise<BallotContent | null> => {
      if (!cid) return null;

      // Check cache first
      const cached = contentCache.get(cid);
      if (cached) {
        return cached;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = cid.startsWith("http") ? cid : `${IPFS_GATEWAY}${cid}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch content");
        }

        const data = await response.json();

        // Cache the content
        contentCache.set(cid, data);

        setIsLoading(false);
        return data as BallotContent;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fetch failed";
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  return {
    isLoading,
    error,
    fetchContent,
    getUrl: (cid: string) =>
      cid ? (cid.startsWith("http") ? cid : `${IPFS_GATEWAY}${cid}`) : "",
  };
}
