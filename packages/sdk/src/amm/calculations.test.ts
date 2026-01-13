/**
 * AMM Calculations Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateSwapOutput,
  calculateMinOutput,
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  calculatePriceImpact,
  calculateSlippage,
  calculatePriceRatio,
} from './calculations';

describe('AMM Calculations', () => {
  describe('calculateSwapOutput', () => {
    it('should calculate swap output with 0.3% fee', () => {
      const inputAmount = 1000n;
      const reserveIn = 100000n;
      const reserveOut = 200000n;
      const feeBps = 30; // 0.3%

      const { outputAmount, priceImpact } = calculateSwapOutput(
        inputAmount,
        reserveIn,
        reserveOut,
        feeBps
      );

      // Expected output ≈ 1994 (with fee)
      expect(outputAmount).toBeGreaterThan(0n);
      expect(outputAmount).toBeLessThan(2000n);
      expect(priceImpact).toBeGreaterThan(0);
    });

    it('should return 0 for zero input', () => {
      const { outputAmount, priceImpact } = calculateSwapOutput(
        0n,
        100000n,
        200000n
      );

      expect(outputAmount).toBe(0n);
      expect(priceImpact).toBe(0);
    });

    it('should throw for zero reserves', () => {
      expect(() => {
        calculateSwapOutput(1000n, 0n, 200000n);
      }).toThrow('Pool has no liquidity');
    });
  });

  describe('calculateMinOutput', () => {
    it('should calculate minimum output with slippage', () => {
      const outputAmount = 10000n;
      const slippageBps = 50; // 0.5%

      const minOutput = calculateMinOutput(outputAmount, slippageBps);

      // minOutput = 10000 * (10000 - 50) / 10000 = 9950
      expect(minOutput).toBe(9950n);
    });

    it('should handle 0% slippage', () => {
      const outputAmount = 10000n;
      const minOutput = calculateMinOutput(outputAmount, 0);

      expect(minOutput).toBe(10000n);
    });

    it('should throw for invalid slippage', () => {
      expect(() => {
        calculateMinOutput(10000n, -1);
      }).toThrow('Slippage must be between 0 and 10000 bps');

      expect(() => {
        calculateMinOutput(10000n, 10001);
      }).toThrow('Slippage must be between 0 and 10000 bps');
    });
  });

  describe('calculateAddLiquidityAmounts', () => {
    it('should calculate optimal amounts maintaining ratio', () => {
      const desiredA = 10000n;
      const desiredB = 20000n;
      const reserveA = 50000n;
      const reserveB = 100000n;
      const lpSupply = 70710n; // sqrt(50000 * 100000)

      const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
        desiredA,
        desiredB,
        reserveA,
        reserveB,
        lpSupply
      );

      expect(depositA).toBe(10000n);
      expect(depositB).toBe(20000n);
      expect(lpAmount).toBeGreaterThan(0n);
    });

    it('should adjust amounts when ratio differs', () => {
      const desiredA = 10000n;
      const desiredB = 10000n; // Not 2:1 ratio
      const reserveA = 50000n;
      const reserveB = 100000n; // 2:1 ratio
      const lpSupply = 70710n;

      const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
        desiredA,
        desiredB,
        reserveA,
        reserveB,
        lpSupply
      );

      // Should use less of one token to maintain ratio
      expect(depositA).toBeLessThanOrEqual(desiredA);
      expect(depositB).toBeLessThanOrEqual(desiredB);
      expect(lpAmount).toBeGreaterThan(0n);
    });

    it('should handle bootstrap (first liquidity)', () => {
      const desiredA = 10000n;
      const desiredB = 20000n;

      const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
        desiredA,
        desiredB,
        0n, // No reserves yet
        0n,
        0n // No LP supply
      );

      expect(depositA).toBe(desiredA);
      expect(depositB).toBe(desiredB);
      // lpAmount = sqrt(10000 * 20000) = sqrt(200000000) ≈ 14142
      expect(lpAmount).toBeGreaterThan(14000n);
      expect(lpAmount).toBeLessThan(15000n);
    });
  });

  describe('calculateRemoveLiquidityOutput', () => {
    it('should calculate proportional output', () => {
      const lpAmount = 10000n;
      const lpSupply = 100000n; // 10% of supply
      const reserveA = 500000n;
      const reserveB = 1000000n;

      const { outputA, outputB } = calculateRemoveLiquidityOutput(
        lpAmount,
        lpSupply,
        reserveA,
        reserveB
      );

      // Should receive 10% of reserves
      expect(outputA).toBe(50000n);
      expect(outputB).toBe(100000n);
    });

    it('should return 0 for zero LP amount', () => {
      const { outputA, outputB } = calculateRemoveLiquidityOutput(
        0n,
        100000n,
        500000n,
        1000000n
      );

      expect(outputA).toBe(0n);
      expect(outputB).toBe(0n);
    });

    it('should throw for zero LP supply', () => {
      expect(() => {
        calculateRemoveLiquidityOutput(10000n, 0n, 500000n, 1000000n);
      }).toThrow('No LP tokens in circulation');
    });

    it('should throw if amount exceeds supply', () => {
      expect(() => {
        calculateRemoveLiquidityOutput(200000n, 100000n, 500000n, 1000000n);
      }).toThrow('LP amount exceeds total supply');
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact for small trades', () => {
      const inputAmount = 1000n;
      const reserveIn = 100000n;
      const reserveOut = 200000n;

      const impact = calculatePriceImpact(inputAmount, reserveIn, reserveOut);

      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThan(2); // 1% impact
    });

    it('should return 0 for zero input', () => {
      const impact = calculatePriceImpact(0n, 100000n, 200000n);
      expect(impact).toBe(0);
    });
  });

  describe('calculateSlippage', () => {
    it('should calculate slippage percentage', () => {
      const expectedOutput = 10000n;
      const minOutput = 9900n; // 1% slippage

      const slippage = calculateSlippage(expectedOutput, minOutput);

      expect(slippage).toBeCloseTo(1, 1);
    });

    it('should return 0 for no slippage', () => {
      const slippage = calculateSlippage(10000n, 10000n);
      expect(slippage).toBe(0);
    });
  });

  describe('calculatePriceRatio', () => {
    it('should calculate price ratio', () => {
      const reserveA = 100000n;
      const reserveB = 200000n;

      const ratio = calculatePriceRatio(reserveA, reserveB);

      expect(ratio).toBe(2); // 1 A = 2 B
    });

    it('should handle different decimals', () => {
      const reserveA = 1000000n; // 1 token with 6 decimals
      const reserveB = 1000000000n; // 1 token with 9 decimals

      const ratio = calculatePriceRatio(reserveA, reserveB, 6, 9);

      expect(ratio).toBe(1); // Equal value
    });

    it('should return 0 for zero reserve A', () => {
      const ratio = calculatePriceRatio(0n, 200000n);
      expect(ratio).toBe(0);
    });
  });
});
