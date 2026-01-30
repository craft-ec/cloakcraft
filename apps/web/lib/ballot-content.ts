/**
 * Ballot metadata stored on IPFS
 * This contains human-readable information about the ballot and its options
 */

export interface BallotOptionContent {
  /** Short label for the option (e.g., "Yes", "No", "Candidate A") */
  label: string;
  /** Detailed description of what this option means */
  description?: string;
}

export interface BallotContent {
  /** Schema version for future compatibility */
  version: 1;
  /** Title of the ballot/proposal */
  title: string;
  /** Full description of what is being voted on */
  description: string;
  /** Array of options - index matches on-chain option index */
  options: BallotOptionContent[];
  /** Optional category/tags */
  category?: string;
  /** Optional external links (governance forum, etc.) */
  links?: Array<{
    label: string;
    url: string;
  }>;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Creator's wallet address */
  creator?: string;
}

/**
 * Create a ballot content object with validation
 */
export function createBallotContent(params: {
  title: string;
  description: string;
  options: BallotOptionContent[];
  category?: string;
  links?: Array<{ label: string; url: string }>;
  creator?: string;
}): BallotContent {
  // Validate inputs
  if (!params.title || params.title.trim().length === 0) {
    throw new Error("Ballot title is required");
  }
  if (!params.description || params.description.trim().length === 0) {
    throw new Error("Ballot description is required");
  }
  if (!params.options || params.options.length < 2) {
    throw new Error("At least 2 options are required");
  }
  if (params.options.length > 10) {
    throw new Error("Maximum 10 options allowed");
  }

  // Validate each option has a label
  for (let i = 0; i < params.options.length; i++) {
    if (!params.options[i].label || params.options[i].label.trim().length === 0) {
      throw new Error(`Option ${i + 1} must have a label`);
    }
  }

  return {
    version: 1,
    title: params.title.trim(),
    description: params.description.trim(),
    options: params.options.map((opt) => ({
      label: opt.label.trim(),
      description: opt.description?.trim() || undefined,
    })),
    category: params.category?.trim() || undefined,
    links: params.links,
    createdAt: new Date().toISOString(),
    creator: params.creator,
  };
}

/**
 * Validate that content matches the BallotContent schema
 */
export function validateBallotContent(
  content: unknown
): content is BallotContent {
  if (!content || typeof content !== "object") return false;

  const c = content as Record<string, unknown>;

  if (c.version !== 1) return false;
  if (typeof c.title !== "string" || c.title.length === 0) return false;
  if (typeof c.description !== "string" || c.description.length === 0)
    return false;
  if (!Array.isArray(c.options) || c.options.length < 2) return false;

  for (const opt of c.options) {
    if (!opt || typeof opt !== "object") return false;
    if (typeof (opt as Record<string, unknown>).label !== "string") return false;
  }

  return true;
}
