// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createZone,
  createGroup,
  createChurch,
  createPCF,
  resolvePCFHierarchy,
} from '../src/services/organizationService';

describe('Phase 3 Organization Hierarchy & Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    // Simulate offline mode for isolated unit testing
    vi.stubGlobal('navigator', { onLine: false });
  });

  it('creates Zones, Groups, Churches, and PCFs with hierarchy integrity', async () => {
    const zone = await createZone('Abuja Zone 1', 'ZN-ABJ1');
    expect(zone.id).toContain('zone_');

    const group = await createGroup('Group Alpha', 'GRP-ALP', zone.id);
    expect(group.zoneId).toBe(zone.id);

    const church = await createChurch('Central Church', 'CH-CENT', group.id);
    expect(church.groupId).toBe(group.id);

    const pcf = await createPCF('Grace PCF', 'PCF-GRC', church.id);
    expect(pcf.churchId).toBe(church.id);

    const resolved = await resolvePCFHierarchy(pcf.id);
    expect(resolved.pcf.name).toBe('Grace PCF');
    expect(resolved.church.name).toBe('Central Church');
    expect(resolved.group.name).toBe('Group Alpha');
    expect(resolved.zone.name).toBe('Abuja Zone 1');
  });

  it('rejects creating a Group without a valid Zone', async () => {
    await expect(createGroup('Orphan Group', 'GRP-ORPH', 'non_existent_zone')).rejects.toThrow(
      'Hierarchy Error: Selected Zone does not exist.'
    );
  });

  it('rejects creating a Church without a valid Group', async () => {
    await expect(createChurch('Orphan Church', 'CH-ORPH', 'non_existent_group')).rejects.toThrow(
      'Hierarchy Error: Selected Group does not exist.'
    );
  });

  it('rejects creating a PCF without a valid Church', async () => {
    await expect(createPCF('Orphan PCF', 'PCF-ORPH', 'non_existent_church')).rejects.toThrow(
      'Hierarchy Error: Selected Church does not exist.'
    );
  });

  it('prevents duplicate unique codes within the same scope', async () => {
    await createZone('Lagos Zone', 'ZN-LOS');
    await expect(createZone('Duplicate Zone', 'ZN-LOS')).rejects.toThrow('already exists');
  });
});
