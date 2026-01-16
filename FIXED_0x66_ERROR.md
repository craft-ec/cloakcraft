# Fixed: Error 0x66 - InstructionDidNotDeserialize

## Problem

After deploying the program with `queuePubkeyIndex` field added, the demo app showed:

```
Error processing Instruction 2: custom program error: 0x66
Program log: AnchorError occurred. Error Code: InstructionDidNotDeserialize.
Error Number: 102. Error Message: The program could not deserialize the given instruction.
```

## Root Cause

**IDL/Program Mismatch:**

The on-chain program had a 4-field struct:
```rust
pub struct CommitmentMerkleContext {
    pub merkle_tree_pubkey_index: u8,
    pub queue_pubkey_index: u8,      // ← Field added
    pub leaf_index: u32,
    pub root_index: u16,
}
```

But the IDL (used by SDK) only documented 3 fields:
```json
{
  "name": "merkle_tree_pubkey_index",
  "type": "u8"
},
{
  "name": "leaf_index",              // ← Missing queue_pubkey_index!
  "type": "u32"
},
{
  "name": "root_index",
  "type": "u16"
}
```

When the SDK serialized the instruction data, it used the 3-field layout. When the program tried to deserialize it, it expected 4 fields → **deserialization failed**.

## Solution

### Step 1: Regenerate IDL
```bash
anchor build
```

This regenerated `target/idl/cloakcraft.json` with all 4 fields correctly documented.

### Step 2: Rebuild SDK
```bash
cd packages/sdk
pnpm build
```

The SDK now serializes data with the correct 4-field layout.

### Step 3: Redeploy Program
```bash
solana config set --url "https://devnet.helius-rpc.com/?api-key=YOUR_KEY"
solana program deploy target/deploy/cloakcraft.so --program-id fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP
```

**Deployment Signature:** `2ggRwT5nyijFLWjdNygMYrg4B7y6DvUpMaTfSSvR5oVRNxvuuJ4E9EmrykWH4e8EzhC9EA5ewXh7VL41fGHDXZLF`

### Step 4: Rebuild Demo App
```bash
cd apps/demo
pnpm build
```

The demo app now uses the updated SDK.

## Verification

The IDL now correctly shows:
```json
{
  "name": "cloakcraft::instructions::generic::verify_commitment_exists::CommitmentMerkleContext",
  "type": {
    "kind": "struct",
    "fields": [
      { "name": "merkle_tree_pubkey_index", "type": "u8" },
      { "name": "queue_pubkey_index", "type": "u8" },     // ✅ Now present!
      { "name": "leaf_index", "type": "u32" },
      { "name": "root_index", "type": "u16" }
    ]
  }
}
```

## Status

✅ **Fixed!** All components are now synchronized:
- Program: 4 fields
- IDL: 4 fields documented
- SDK: serializes 4 fields
- Demo: uses updated SDK

The multi-phase unshield should now work correctly via the demo app UI.

---

**Date:** January 16, 2026
**Program ID:** `fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP`
**Latest Deployment:** `2ggRwT5nyijFLWjdNygMYrg4B7y6DvUpMaTfSSvR5oVRNxvuuJ4E9EmrykWH4e8EzhC9EA5ewXh7VL41fGHDXZLF`
