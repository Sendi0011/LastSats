import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Canonical vault on testnet:
//   ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2.lastsats-vault-v6
//
// The vault hardcodes its sBTC token to the mock token's testnet principal.
// Clarinet resolves that principal from .cache/requirements, so the same
// contract can be exercised here in simnet. Every deposit must be funded from
// that mock token, which is why each test mints to the depositor first.

const VAULT = "lastsats-vault-v6";
const MOCK_TOKEN = "ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2.sbtc-mock-token";

const INTERVAL_30D = 4320;
const CAP_PER_VAULT = 5_000_000;
const CAP_PROTOCOL = 200_000_000;

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

function fund(amount: bigint, recipient: string) {
  return simnet.callPublicFn(
    MOCK_TOKEN,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function createVault(
  interval = INTERVAL_30D,
  amount = 100_000n,
  tier = 0n,
  guardian: ReturnType<typeof Cl.none> | ReturnType<typeof Cl.some> = Cl.none(),
  sender = wallet1
) {
  return simnet.callPublicFn(
    VAULT,
    "create-vault",
    [Cl.uint(interval), Cl.uint(amount), Cl.uint(tier), guardian],
    sender
  );
}

function addBeneficiary(
  vaultId: bigint,
  beneficiary: string,
  percentage: bigint,
  sender = wallet1
) {
  return simnet.callPublicFn(
    VAULT,
    "add-beneficiary",
    [Cl.uint(vaultId), Cl.principal(beneficiary), Cl.uint(percentage), Cl.uint(0n)],
    sender
  );
}

describe("LastSats Vault v6", () => {
  describe("vault creation", () => {
    it("creates a vault and escrows the deposit", () => {
      fund(1_000_000n, wallet1);
      const { result } = createVault();
      expect(result).toBeOk(Cl.uint(1));

      const stats = simnet.callReadOnlyFn(VAULT, "get-protocol-stats", [], wallet1);
      expect(stats.result).toBeTuple({
        "total-vaults": Cl.uint(1),
        "total-sbtc-protected": Cl.uint(100_000),
        "next-vault-id": Cl.uint(2),
      });
    });

    it("rejects an invalid heartbeat interval", () => {
      fund(1_000_000n, wallet1);
      const { result } = createVault(1000n);
      expect(result).toBeErr(Cl.uint(104));
    });

    it("rejects a zero deposit", () => {
      const { result } = createVault(INTERVAL_30D, 0n);
      expect(result).toBeErr(Cl.uint(103));
    });

    it("starts vault ids at 1, not 0", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = simnet.callReadOnlyFn(VAULT, "get-vault", [Cl.uint(1n)], wallet1);
      expect(result).toHaveClarityType(ClarityType.OptionalSome);
      const missing = simnet.callReadOnlyFn(VAULT, "get-vault", [Cl.uint(0n)], wallet1);
      expect(missing.result).toHaveClarityType(ClarityType.OptionalNone);
    });
  });

  describe("pre-audit deposit caps", () => {
    it(`rejects a deposit above the per-vault cap (${CAP_PER_VAULT})`, () => {
      fund(10_000_000n, wallet1);
      const { result } = createVault(INTERVAL_30D, BigInt(CAP_PER_VAULT) + 1n);
      expect(result).toBeErr(Cl.uint(103));
    });

    it("accepts a deposit exactly at the per-vault cap", () => {
      fund(10_000_000n, wallet1);
      const { result } = createVault(INTERVAL_30D, BigInt(CAP_PER_VAULT));
      expect(result).toBeOk(Cl.uint(1));
    });

    it(`rejects the deposit that would breach the protocol cap (${CAP_PROTOCOL})`, () => {
      const perVault = BigInt(CAP_PER_VAULT);
      const vaultsToFill = BigInt(CAP_PROTOCOL) / perVault; // 200M / 5M = 40
      fund(BigInt(CAP_PROTOCOL) + perVault, wallet1);

      for (let i = 0n; i < vaultsToFill; i++) {
        const { result } = createVault(INTERVAL_30D, perVault);
        expect(result).toBeOk(Cl.uint(i + 1n));
      }

      const stats = simnet.callReadOnlyFn(VAULT, "get-protocol-stats", [], wallet1);
      expect(stats.result).toBeTuple({
        "total-vaults": Cl.uint(vaultsToFill),
        "total-sbtc-protected": Cl.uint(BigInt(CAP_PROTOCOL)),
        "next-vault-id": Cl.uint(vaultsToFill + 1n),
      });

      // One more deposit would take the protocol total past the cap.
      const { result } = createVault(INTERVAL_30D, perVault);
      expect(result).toBeErr(Cl.uint(103));
    });
  });

  describe("beneficiary management", () => {
    it("adds a beneficiary and tracks the allocation", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = addBeneficiary(1n, wallet2, 5000n);
      expect(result).toBeOk(Cl.uint(1));
    });

    it("rejects a non-owner adding a beneficiary", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = addBeneficiary(1n, wallet2, 5000n, wallet2);
      expect(result).toBeErr(Cl.uint(100));
    });

    it("rejects the owner as a beneficiary", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = addBeneficiary(1n, wallet1, 5000n);
      expect(result).toBeErr(Cl.uint(105));
    });

    it("enforces the HODLER tier limit of 5 beneficiaries", () => {
      fund(1_000_000n, wallet1);
      createVault(INTERVAL_30D, 100_000n, 1n);

      for (let i = 0; i < 5; i++) {
        const { result } = addBeneficiary(1n, wallet3, 100n);
        expect(result).toBeOk(Cl.uint(i + 1));
      }
      const { result } = addBeneficiary(1n, wallet3, 100n);
      expect(result).toBeErr(Cl.uint(118));
    });

    it("enforces the FREE tier limit of 1 beneficiary", () => {
      fund(1_000_000n, wallet1);
      createVault(INTERVAL_30D, 100_000n, 0n);

      const first = addBeneficiary(1n, wallet2, 100n);
      expect(first.result).toBeOk(Cl.uint(1));
      const second = addBeneficiary(1n, wallet3, 100n);
      expect(second.result).toBeErr(Cl.uint(118));
    });

    it("rejects allocations summing past 100%", () => {
      fund(1_000_000n, wallet1);
      createVault(INTERVAL_30D, 100_000n, 1n);
      addBeneficiary(1n, wallet2, 6000n);
      const { result } = addBeneficiary(1n, wallet3, 5000n);
      expect(result).toBeErr(Cl.uint(114));
    });
  });

  describe("finalization", () => {
    it("finalizes at exactly 100%", () => {
      fund(1_000_000n, wallet1);
      createVault();
      addBeneficiary(1n, wallet2, 10000n);
      const { result } = simnet.callPublicFn(
        VAULT,
        "finalize-beneficiaries",
        [Cl.uint(1n)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects finalization below 100%", () => {
      fund(1_000_000n, wallet1);
      createVault();
      addBeneficiary(1n, wallet2, 5000n);
      const { result } = simnet.callPublicFn(
        VAULT,
        "finalize-beneficiaries",
        [Cl.uint(1n)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(115));
    });

    it("rejects adding a beneficiary after finalization", () => {
      fund(1_000_000n, wallet1);
      createVault(INTERVAL_30D, 100_000n, 1n);
      addBeneficiary(1n, wallet2, 10000n);
      simnet.callPublicFn(VAULT, "finalize-beneficiaries", [Cl.uint(1n)], wallet1);
      const { result } = addBeneficiary(1n, wallet3, 100n);
      expect(result).toBeErr(Cl.uint(117));
    });
  });

  describe("heartbeat", () => {
    it("records a heartbeat from the owner", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = simnet.callPublicFn(VAULT, "send-heartbeat", [Cl.uint(1n)], wallet1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects a heartbeat from anyone else", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = simnet.callPublicFn(VAULT, "send-heartbeat", [Cl.uint(1n)], wallet2);
      expect(result).toBeErr(Cl.uint(100));
    });
  });

  describe("event history", () => {
    it("records create, beneficiary and finalize events in order", () => {
      fund(1_000_000n, wallet1);
      createVault();
      addBeneficiary(1n, wallet2, 10000n);
      simnet.callPublicFn(VAULT, "finalize-beneficiaries", [Cl.uint(1n)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        VAULT,
        "get-vault-events",
        [Cl.uint(1n), Cl.uint(10n)],
        wallet1
      );
      expect(result).toHaveClarityType(ClarityType.List);
      const events = (result as any).value as any[];
      expect(events.map((e) => e.value["event-type"].value)).toEqual([
        "vault-created",
        "beneficiary-added",
        "vault-finalized",
      ]);
      expect(
        events.every((e) => e.value.sender.value === wallet1)
      ).toBe(true);
      expect(events.map((e) => e.value.data.value.value)).toEqual([
        "Vault created successfully",
        "Beneficiary added to vault",
        "Beneficiaries finalized",
      ]);
    });

    it("returns an empty list for an unknown vault", () => {
      const { result } = simnet.callReadOnlyFn(
        VAULT,
        "get-vault-events",
        [Cl.uint(999n), Cl.uint(10n)],
        wallet1
      );
      expect(result).toBeList([]);
    });

    it("returns an empty list when limit is zero", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = simnet.callReadOnlyFn(
        VAULT,
        "get-vault-events",
        [Cl.uint(1n), Cl.uint(0n)],
        wallet1
      );
      expect(result).toBeList([]);
    });

    it("returns only the most recent events when limit is below the history length", () => {
      fund(1_000_000n, wallet1);
      createVault();
      addBeneficiary(1n, wallet2, 10000n);
      simnet.callPublicFn(VAULT, "finalize-beneficiaries", [Cl.uint(1n)], wallet1);

      const { result } = simnet.callReadOnlyFn(
        VAULT,
        "get-vault-events",
        [Cl.uint(1n), Cl.uint(2n)],
        wallet1
      );
      const events = (result as any).value as any[];
      expect(events.map((e) => e.value["event-type"].value)).toEqual([
        "beneficiary-added",
        "vault-finalized",
      ]);
    });
  });

  describe("read-only surface", () => {
    it("reports the contract version", () => {
      const { result } = simnet.callReadOnlyFn(VAULT, "get-contract-version", [], wallet1);
      expect(result).toBeAscii("3.0.2");
    });

    it("reports an ACTIVE status for a fresh vault", () => {
      fund(1_000_000n, wallet1);
      createVault();
      const { result } = simnet.callReadOnlyFn(VAULT, "get-vault-status", [Cl.uint(1n)], wallet1);
      expect(result).toBeUint(0);
    });

    it("tracks the beneficiary count", () => {
      fund(1_000_000n, wallet1);
      createVault();
      addBeneficiary(1n, wallet2, 5000n);
      const { result } = simnet.callReadOnlyFn(
        VAULT,
        "get-beneficiary-count",
        [Cl.uint(1n)],
        wallet1
      );
      expect(result).toBeTuple({ count: Cl.uint(1) });
    });
  });
});
