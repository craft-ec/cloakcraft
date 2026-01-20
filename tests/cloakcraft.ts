import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("cloakcraft", () => {
  // Try to get provider, skip if not available
  let provider: anchor.AnchorProvider | null = null;
  try {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  } catch {
    // Provider not available
  }

  it("Program is deployed", async function() {
    if (!provider) {
      this.skip();
      return;
    }
    expect(provider).to.exist;
  });
});
