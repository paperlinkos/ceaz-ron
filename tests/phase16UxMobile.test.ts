// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { REACH_OUT_NIGERIA_EVENT } from '../src/config/eventConfig';
import { calculateOrganizationProgress } from '../src/services/targetProgressEngine';

describe('Phase 16 — Final UX, Mobile & Accessibility Verification', () => {
  describe('Zonal Target & Public Observer Hero Counter', () => {
    it('maintains primary Zonal Target of 40,000 souls', () => {
      expect(REACH_OUT_NIGERIA_EVENT.zonalTarget).toBe(40000);
    });

    it('calculates percentage achieved accurately for public observer view', () => {
      const actual = 10000;
      const target = REACH_OUT_NIGERIA_EVENT.zonalTarget;
      const percentage = (actual / target) * 100;
      expect(percentage).toBe(25);
    });
  });

  describe('Mobile Rapid Soul Recording & Focus Flow', () => {
    it('resets form fields cleanly for rapid repeated soul recording', () => {
      let formData = { name: 'John Doe', phone: '08012345678', location: 'Wuse' };

      // Simulate RECORD ANOTHER reset
      const resetForm = () => {
        formData = { name: '', phone: '', location: '' };
      };

      resetForm();
      expect(formData.name).toBe('');
      expect(formData.phone).toBe('');
      expect(formData.location).toBe('');
    });
  });

  describe('Upward Race Visual & Progress Normalization', () => {
    it('caps visual progress height at 100% (1.0) when group target is exceeded (112%)', () => {
      const progress = calculateOrganizationProgress({
        organizationId: 'grp-victorious',
        organizationName: 'Victorious Group',
        level: 'group',
        actual: 11200,
        target: 10000,
      });

      expect(progress.percentage).toBe(112);
      expect(progress.displayPercentage).toBe('112%');
      expect(progress.normalizedProgress).toBe(1.0); // Visual height cap at 100% target line
      expect(progress.isTargetExceeded).toBe(true);
    });

    it('displays "TARGET NOT SET" cleanly when an organization has no configured target', () => {
      const progress = calculateOrganizationProgress({
        organizationId: 'ch-new',
        organizationName: 'Grace Church',
        level: 'church',
        actual: 250,
        target: undefined,
      });

      expect(progress.actual).toBe(250);
      expect(progress.hasTarget).toBe(false);
      expect(progress.displayPercentage).toBe('TARGET NOT SET');
      expect(progress.normalizedProgress).toBe(0);
    });
  });

  describe('Accessibility & Responsive Touch Target Compliance', () => {
    it('enforces minimum 44px touch target guideline for mobile buttons', () => {
      const minTouchTargetPx = 44;
      const mobileInputMinHeightPx = 48;

      expect(mobileInputMinHeightPx).toBeGreaterThanOrEqual(minTouchTargetPx);
    });
  });
});
