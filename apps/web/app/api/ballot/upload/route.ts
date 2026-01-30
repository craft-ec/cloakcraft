import { NextRequest, NextResponse } from "next/server";
import { createFilebaseClient } from "@/lib/filebase";
import { validateBallotContent, type BallotContent } from "@/lib/ballot-content";
import nacl from "tweetnacl";
import bs58 from "bs58";

// Initialize Filebase client from environment variables
const filebase =
  process.env.FILEBASE_KEY &&
  process.env.FILEBASE_SECRET &&
  process.env.FILEBASE_BUCKET
    ? createFilebaseClient({
        accessKey: process.env.FILEBASE_KEY,
        secretKey: process.env.FILEBASE_SECRET,
        bucket: process.env.FILEBASE_BUCKET,
      })
    : null;

// Simple rate limiting (in production use Redis)
const uploadTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_UPLOADS_PER_WINDOW = 10;

function checkRateLimit(wallet: string): boolean {
  const now = Date.now();
  const timestamps = uploadTimestamps.get(wallet) || [];
  
  // Filter to recent timestamps
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  
  if (recent.length >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }
  
  recent.push(now);
  uploadTimestamps.set(wallet, recent);
  return true;
}

/**
 * Verify a signed message from a Solana wallet
 */
function verifySignature(
  wallet: string,
  signature: string,
  timestamp: number
): boolean {
  try {
    // Check timestamp is recent (within 5 minutes)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return false;
    }

    const message = `CloakCraft Upload: ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = bs58.decode(wallet);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * POST /api/ballot/upload
 * Upload ballot metadata to IPFS via Filebase
 *
 * Body: {
 *   content: BallotContent,
 *   auth: { wallet: string, signature: string, timestamp: number }
 * }
 * Returns: { cid: string, url: string, size: number }
 */
export async function POST(request: NextRequest) {
  if (!filebase) {
    return NextResponse.json(
      { error: "Storage not configured. Set FILEBASE_KEY, FILEBASE_SECRET, FILEBASE_BUCKET." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { content, auth } = body as {
      content: BallotContent;
      auth?: { wallet: string; signature: string; timestamp: number };
    };

    // Require authentication
    if (!auth || !auth.wallet || !auth.signature || !auth.timestamp) {
      return NextResponse.json(
        { error: "Authentication required. Provide wallet, signature, and timestamp." },
        { status: 401 }
      );
    }

    // Verify signature
    if (!verifySignature(auth.wallet, auth.signature, auth.timestamp)) {
      return NextResponse.json(
        { error: "Invalid signature or timestamp expired" },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(auth.wallet)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Validate content
    if (!content) {
      return NextResponse.json(
        { error: "Missing content" },
        { status: 400 }
      );
    }

    if (!validateBallotContent(content)) {
      return NextResponse.json(
        { error: "Invalid ballot content. Required: title, description, options (min 2)" },
        { status: 400 }
      );
    }

    // Upload to IPFS
    const result = await filebase.uploadJSON(
      content as unknown as Record<string, unknown>,
      `ballot-${Date.now()}`
    );

    return NextResponse.json({
      success: true,
      cid: result.cid,
      url: result.url,
      size: result.size,
    });
  } catch (error) {
    console.error("Ballot upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ballot/upload
 * Check if storage is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: !!filebase,
    provider: "filebase",
  });
}
