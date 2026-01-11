import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("cloakcraft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Program is deployed", async () => {
    // This is a basic smoke test to verify the program is deployed
    const provider = anchor.getProvider();
    expect(provider).to.exist;
  });
});
