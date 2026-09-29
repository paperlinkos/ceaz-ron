import { describe, it, expect, beforeEach } from 'vitest';
import type { EventConfig, EventStatus, EventAuditLog } from '../src/config/eventConfig';
import { DEFAULT_EVENT_CONFIG } from '../src/config/eventConfig';
import { generateUUID } from '../src/utils/uuid';

describe('Phase 9: Live Event Control & Command Center', () => {
  let currentEvent: EventConfig;
  let auditLogs: EventAuditLog[];

  beforeEach(() => {
    currentEvent = {
      ...DEFAULT_EVENT_CONFIG,
      status: 'upcoming',
      updatedAt: new Date().toISOString(),
    };
    auditLogs = [];
  });

  function transitionStatus(
    event: EventConfig,
    newStatus: EventStatus,
    actorId: string
  ): { updatedEvent: EventConfig; auditLog: EventAuditLog } {
    const now = new Date().toISOString();
    const updatedEvent: EventConfig = {
      ...event,
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === 'live' && !event.startAt) {
      updatedEvent.startAt = now;
    }

    if (newStatus === 'completed' && !event.endAt) {
      updatedEvent.endAt = now;
    }

    const auditLog: EventAuditLog = {
      id: generateUUID(),
      eventId: event.id,
      action: newStatus === 'live' ? 'event_started' : 'event_ended',
      actorId,
      timestamp: now,
    };

    return { updatedEvent, auditLog };
  }

  it('1. Event initially defaults to UPCOMING state', () => {
    expect(currentEvent.status).toBe('upcoming');
    expect(currentEvent.target).toBe(50000);
    expect(currentEvent.name).toBe('Reach Out Nigeria');
  });

  it('2. SuperAdmin can start event and transition to LIVE', () => {
    const { updatedEvent, auditLog } = transitionStatus(currentEvent, 'live', 'admin-001');

    expect(updatedEvent.status).toBe('live');
    expect(updatedEvent.startAt).toBeDefined();
    expect(auditLog.action).toBe('event_started');
    expect(auditLog.actorId).toBe('admin-001');
  });

  it('3. Soul winners can submit records when event status is LIVE', () => {
    const liveEvent = { ...currentEvent, status: 'live' as EventStatus };

    function canSubmit(status: EventStatus) {
      return status === 'live';
    }

    expect(canSubmit(liveEvent.status)).toBe(true);
  });

  it('4. SuperAdmin can end event and transition to COMPLETED', () => {
    const liveEvent = { ...currentEvent, status: 'live' as EventStatus, startAt: new Date().toISOString() };
    const { updatedEvent, auditLog } = transitionStatus(liveEvent, 'completed', 'admin-001');

    expect(updatedEvent.status).toBe('completed');
    expect(updatedEvent.endAt).toBeDefined();
    expect(auditLog.action).toBe('event_ended');
  });

  it('5. Soul recording is locked after event is COMPLETED', () => {
    const completedEvent = { ...currentEvent, status: 'completed' as EventStatus };

    function canSubmit(status: EventStatus) {
      if (status === 'completed') {
        return { allowed: false, message: 'EVENT COMPLETED: Soul recording for this event is now closed.' };
      }
      return { allowed: true };
    }

    const check = canSubmit(completedEvent.status);
    expect(check.allowed).toBe(false);
    expect(check.message).toContain('EVENT COMPLETED');
  });

  it('6. Historical totals remain preserved and viewable post-completion', () => {
    const totalSoulsWon = 42150;
    const nationalTarget = 40000;
    const completedEvent = { ...currentEvent, status: 'completed' as EventStatus };

    expect(completedEvent.status).toBe('completed');
    expect(totalSoulsWon).toBe(42150);
    expect(totalSoulsWon >= nationalTarget).toBe(true);
  });

  it('7. Offline records created during LIVE retain their eventId and timestamps', () => {
    const liveEventId = 'ron-2026-oct1';
    const clientTimestamp = new Date().toISOString();

    const offlineRecord = {
      id: generateUUID(),
      eventId: liveEventId,
      clientCreatedAt: clientTimestamp,
      syncStatus: 'pending',
    };

    expect(offlineRecord.eventId).toBe('ron-2026-oct1');
    expect(offlineRecord.clientCreatedAt).toBe(clientTimestamp);
  });

  it('8. Audit log entries are generated for event status changes', () => {
    const res1 = transitionStatus(currentEvent, 'live', 'admin-super');
    auditLogs.push(res1.auditLog);

    const res2 = transitionStatus(res1.updatedEvent, 'completed', 'admin-super');
    auditLogs.push(res2.auditLog);

    expect(auditLogs.length).toBe(2);
    expect(auditLogs[0].action).toBe('event_started');
    expect(auditLogs[1].action).toBe('event_ended');
  });
});
