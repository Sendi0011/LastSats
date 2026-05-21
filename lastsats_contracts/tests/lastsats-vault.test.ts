
import { describe, expect, it, beforeEach } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("LastSats Vault Contract", () => {
  beforeEach(() => {
    // Reset simnet state before each test
    simnet.setEpoch("3.0");
  });

  describe("Vault Creation", () => {
    it("should create a vault successfully", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [
          Cl.uint(4320), // 30 days in blocks
          Cl.uint(100000000), // 1 sBTC in micro-sBTC
          Cl.uint(0), // Free tier
          Cl.none(), // No guardian
        ],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject invalid heartbeat intervals", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [
          Cl.uint(1000), // Invalid interval
          Cl.uint(100000000),
          Cl.uint(0),
          Cl.none(),
        ],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(104)); // ERR-INVALID-INTERVAL
    });

    it("should reject zero amount", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [
          Cl.uint(4320),
          Cl.uint(0), // Zero amount
          Cl.uint(0),
          Cl.none(),
        ],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(103)); // ERR-INVALID-AMOUNT
    });
  });

  describe("Beneficiary Management", () => {
    beforeEach(() => {
      // Create a vault for testing
      simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [Cl.uint(4320), Cl.uint(100000000), Cl.uint(1), Cl.none()],
        wallet1
      );
    });

    it("should add beneficiary successfully", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [
          Cl.uint(1), // vault-id
          Cl.principal(wallet2), // beneficiary
          Cl.uint(5000), // 50% in basis points
          Cl.uint(0), // No time lock
        ],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject unauthorized beneficiary addition", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(5000), Cl.uint(0)],
        wallet2 // Wrong caller
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
    });

    it("should enforce tier beneficiary limits", () => {
      // Add first beneficiary (free tier allows only 1)
      simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(10000), Cl.uint(0)],
        wallet1
      );

      // Try to add second beneficiary (should fail for free tier)
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet3), Cl.uint(5000), Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(118)); // ERR-TIER-LIMIT
    });

    it("should enforce 100% allocation limit", () => {
      // Add beneficiary with 60%
      simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(6000), Cl.uint(0)],
        wallet1
      );

      // Try to add another with 50% (total would be 110%)
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet3), Cl.uint(5000), Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(114)); // ERR-PCT-EXCEEDS-100
    });
  });

  describe("Finalization", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [Cl.uint(4320), Cl.uint(100000000), Cl.uint(1), Cl.none()],
        wallet1
      );
    });

    it("should finalize with exactly 100% allocation", () => {
      // Add beneficiary with 100%
      simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(10000), Cl.uint(0)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "finalize-beneficiaries",
        [Cl.uint(1)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject finalization with less than 100%", () => {
      // Add beneficiary with only 50%
      simnet.callPublicFn(
        "lastsats-vault",
        "add-beneficiary",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(5000), Cl.uint(0)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "finalize-beneficiaries",
        [Cl.uint(1)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(115)); // ERR-PCT-NOT-100
    });
  });

  describe("Heartbeat", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [Cl.uint(4320), Cl.uint(100000000), Cl.uint(1), Cl.none()],
        wallet1
      );
    });

    it("should send heartbeat successfully", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "send-heartbeat",
        [Cl.uint(1)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject unauthorized heartbeat", () => {
      const { result } = simnet.callPublicFn(
        "lastsats-vault",
        "send-heartbeat",
        [Cl.uint(1)],
        wallet2 // Wrong caller
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Read-only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "lastsats-vault",
        "create-vault",
        [Cl.uint(4320), Cl.uint(100000000), Cl.uint(1), Cl.some(Cl.principal(wallet3))],
        wallet1
      );
    });

    it("should get vault data correctly", () => {
      const { result } = simnet.callReadOnlyFn(
        "lastsats-vault",
        "get-vault",
        [Cl.uint(1)],
        wallet1
      );
      expect(result).toBeSome();
    });

    it("should get vault status correctly", () => {
      const { result } = simnet.callReadOnlyFn(
        "lastsats-vault",
        "get-vault-status",
        [Cl.uint(1)],
        wallet1
      );
      expect(result).toBeUint(0); // ACTIVE status
    });

    it("should get protocol stats", () => {
      const { result } = simnet.callReadOnlyFn(
        "lastsats-vault",
        "get-protocol-stats",
        [],
        wallet1
      );
      expect(result).toBeTuple({
        "total-vaults": Cl.uint(1),
        "total-sbtc-protected": Cl.uint(100000000),
        "next-vault-id": Cl.uint(2),
      });
    });
  });
});
