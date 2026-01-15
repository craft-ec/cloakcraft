# CloakCraft Security Analysis: Light Protocol Integration

## Current Implementation Status

### ✅ What IS Verified (Nullifier Non-Inclusion)

**SDK Side** (`packages/sdk/src/instructions/transact.ts:220-221`):
```typescript
const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
```

**On-Chain Side** (`programs/cloakcraft/src/light_cpi/mod.rs:88-95`):
```rust
// Invoke Light System Program to create the compressed account
// This will fail if the address already exists (nullifier already spent)
LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
    .with_light_account(nullifier_account)
    .with_new_addresses(&[new_address_params])
    .invoke(light_cpi_accounts)
    .map_err(|_| CloakCraftError::NullifierAlreadySpent)?;
```

**What this does:**
- Gets a validity proof from Helius that the nullifier address doesn't exist
- Tries to create a compressed account at that address
- **If the address already exists, the transaction fails** → Prevents double-spending ✅

---

### ❌ What is NOT Verified (Commitment Inclusion)

**Critical TODO** (`packages/sdk/src/instructions/transact.ts:212-217`):
```typescript
// TODO: Fix transact to send TWO separate proofs:
// 1. Commitment inclusion proof (verify commitment exists on-chain)
// 2. Nullifier non-inclusion proof (verify nullifier doesn't exist)
//
// Currently transact is BROKEN - it does not verify commitment existence,
// allowing fake commitment attacks where someone can spend non-existent tokens.
```

**What is missing:**
- No verification that the input commitment actually exists in Light Protocol's state tree
- An attacker could claim to spend a commitment that was never deposited
- The system ONLY verifies:
  1. ✅ ZK proof is mathematically valid
  2. ✅ Nullifier hasn't been used before
  3. ❌ **Commitment actually exists** (MISSING!)

---

## Security Implications

### Critical Vulnerability: Fake Commitment Attack

**Attack Scenario:**
1. Attacker generates a random commitment hash (never actually deposited)
2. Attacker computes the correct nullifier for this fake commitment
3. Attacker generates a valid ZK proof (circuits can prove relationships between fake values)
4. Attacker submits transaction to spend the fake commitment

**What happens:**
- ✅ ZK proof verifies (it's mathematically correct for the fake values)
- ✅ Nullifier non-inclusion verifies (it's a fresh nullifier)
- ❌ System doesn't check if commitment exists
- 🚨 **Result: Attacker withdraws tokens they never deposited!**

**Severity:** CRITICAL - Allows minting tokens out of thin air

---

## Why This Vulnerability Exists

### Light Protocol Design
Light Protocol provides two types of validity proofs:

1. **Non-Inclusion Proof** (Implemented ✅)
   - Proves an address doesn't exist in the address tree
   - Used for nullifiers to prevent double-spending
   - Format: `getValidityProof([addressToVerifyNotExists])`

2. **Inclusion Proof** (NOT Implemented ❌)
   - Proves an address/commitment DOES exist in the state tree
   - Should be used to verify input commitments are real
   - Required format: Query commitment account from Light indexer

### Why It's Not Implemented Yet

From the codebase structure:
- Commitments are stored via separate `store_commitment` instructions
- They live in Light Protocol's compressed state
- To verify inclusion, the SDK would need to:
  1. Query Helius indexer for the commitment account
  2. Get its merkle proof of inclusion
  3. Pass this proof to the on-chain program
  4. Program verifies the commitment is in the tree

**Current workaround:** None - this is a known vulnerability in development

---

## Current Partial Mitigations

### 1. ZK Circuit Verification (Partial Protection)

The ZK circuit verifies:
```
✅ nullifier = hash(spending_key, commitment)
✅ commitment = hash(stealth_pubkey, token_mint, amount, randomness)
✅ Balance equation: input_amount = output1 + output2 + unshield
```

**What this proves:**
- Attacker must know a valid spending key
- Nullifier is correctly derived
- Math is internally consistent

**What this DOESN'T prevent:**
- Attacker can generate fake but internally consistent values
- No proof the commitment was actually created on-chain
- Example: Attacker generates random spending_key → derives commitment → creates valid proof

### 2. Feature Flag (`skip-zk-verify`)

```rust
#[cfg(not(feature = "skip-zk-verify"))]
{
    verify_proof(&proof, &vk_data, &public_inputs)?;
}
```

In production, ZK verification is enabled, providing some protection.
However, this only verifies mathematical correctness, not on-chain existence.

### 3. Nullifier Database (Prevents Double-Spend)

Even with fake commitments, the attacker can only spend each fake commitment once.
The nullifier database prevents using the same nullifier twice.

**Why this is insufficient:**
- Attacker can generate unlimited fake commitments
- Each fake commitment = one withdrawal
- Total loss = unlimited until pool is drained

---

## How AMM/Swap Operations Are Affected

### Swap (`swap/swap` circuit)
**Risk:** CRITICAL
- Attacker can swap fake commitment → real tokens
- No verification that input commitment exists
- Drains pool liquidity

### Add Liquidity (`swap/add_liquidity` circuit)
**Risk:** CRITICAL
- Attacker submits fake Token A and Token B commitments
- Receives real LP tokens
- Can withdraw real tokens later

### Remove Liquidity (`swap/remove_liquidity` circuit)
**Risk:** CRITICAL
- Attacker submits fake LP token commitment
- Receives real Token A and Token B
- Direct theft from pool

### All operations share the same vulnerability: no commitment inclusion proof

---

## Recommended Fixes

### Option 1: Add Commitment Inclusion Verification (Proper Fix)

**SDK Changes** (`transact.ts`):
```typescript
// Get commitment from Light indexer
const commitmentAccount = await lightProtocol.getCommitmentAccount(
  poolPda,
  inputCommitment
);

// Get inclusion proof
const inclusionProof = await lightProtocol.getInclusionProof(
  commitmentAccount.address
);

// Send BOTH proofs
const lightParams = {
  commitmentInclusionProof: inclusionProof,  // NEW
  nullifierNonInclusionProof: nullifierProof, // EXISTING
  // ...
};
```

**On-Chain Changes** (`transact.rs`):
```rust
// Verify commitment exists
verify_commitment_inclusion(
    ctx.remaining_accounts,
    params.commitment_inclusion_proof,
    commitment_address,
)?;

// Then verify nullifier doesn't exist (existing code)
create_spend_nullifier_account(...)?;
```

**Complexity:** High - Requires Light Protocol integration updates

---

### Option 2: Commitment Registry (Simpler Alternative)

Add an on-chain mapping of valid commitments:

```rust
#[account]
pub struct CommitmentRegistry {
    pub commitments: HashMap<[u8; 32], bool>,
}

// In transact:
require!(
    commitment_registry.commitments.contains(&input_commitment),
    Error::InvalidCommitment
);
```

**Pros:**
- Simpler implementation
- No Light Protocol changes needed

**Cons:**
- Costs more rent
- Less scalable than Light Protocol
- Defeats purpose of using compressed accounts

---

### Option 3: Trusted Commitment Database (Temporary)

Use a centralized database to track valid commitments:

**SDK Side:**
```typescript
// Before generating proof, verify commitment exists
const isValid = await api.verifyCommitment(commitment, pool);
if (!isValid) throw new Error("Invalid commitment");
```

**Pros:**
- Quick to implement
- Can be used until proper fix is ready

**Cons:**
- Centralized (not trustless)
- Relayer can censor transactions
- Not production-ready

---

## Testing Status

### What IS tested:
- ✅ Nullifier prevents double-spend (tested via scanner)
- ✅ ZK proofs verify correctly
- ✅ AMM math is correct

### What is NOT tested:
- ❌ Fake commitment detection
- ❌ Commitment inclusion verification
- ❌ Security against malicious actors

### Recommended Test:
```typescript
// Should FAIL in production
test("rejects fake commitment", async () => {
  const fakeCommitment = randomBytes(32);
  const validProof = generateProofForFakeCommitment(fakeCommitment);

  await expect(
    client.transfer({
      inputs: [{ commitment: fakeCommitment, ... }],
      ...
    })
  ).rejects.toThrow("Commitment not found");
});
```

Currently, this test would PASS (allowing the fake commitment) 🚨

---

## Production Readiness Assessment

| Feature | Status | Risk Level |
|---------|--------|------------|
| **Nullifier Double-Spend Prevention** | ✅ Implemented | LOW |
| **ZK Proof Verification** | ✅ Implemented | LOW |
| **Commitment Inclusion Verification** | ❌ NOT Implemented | **CRITICAL** |
| **AMM Pool Security** | ❌ Vulnerable | **CRITICAL** |
| **Transfer Security** | ❌ Vulnerable | **CRITICAL** |

**Overall:** ⚠️ **NOT PRODUCTION READY** - Critical security vulnerability

---

## Immediate Action Items

1. **DO NOT use in production** until commitment inclusion is verified
2. **Add warning banner** to demo app about security status
3. **Implement Option 1** (proper Light Protocol integration) for production
4. **Use Option 3** (trusted DB) for short-term testing only
5. **Add security tests** for fake commitment detection
6. **Audit circuit logic** to ensure it enforces all constraints

---

## Timeline Estimate

- **Option 1 (Proper Fix):** 2-3 weeks development + audit
- **Option 2 (Registry):** 1 week development + testing
- **Option 3 (Temporary):** 2-3 days development

**Recommendation:** Implement Option 3 immediately for continued testing, then work on Option 1 for production launch.
