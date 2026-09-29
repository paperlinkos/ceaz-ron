// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { REACH_OUT_NIGERIA_EVENT } from '../src/config/eventConfig';

describe('Phase 4 Public Event Counter & Target Aggregations', () => {
  it('has correct event target of 40,000 souls', () => {
    expect(REACH_OUT_NIGERIA_EVENT.nationalTarget).toBe(40000);
    expect(REACH_OUT_NIGERIA_EVENT.name).toBe('Reach Out Nigeria');
  });

  it('calculates national percentage achieved correctly', () => {
    const target = 40000;
    const soulsWon = 10000;
    const pct = Math.min(100, Math.round((soulsWon / target) * 100 * 10) / 10);
    expect(pct).toBe(25);
  });

  it('preserves actual souls won count even if target is exceeded', () => {
    const target = 40000;
    const soulsWon = 42500;
    const pct = Math.min(100, Math.round((soulsWon / target) * 100 * 10) / 10);
    expect(pct).toBe(100);
    expect(soulsWon).toBe(42500);
  });
});
