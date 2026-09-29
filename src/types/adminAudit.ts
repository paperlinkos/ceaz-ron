export type AdminAuditAction =
  | 'organization_created'
  | 'organization_updated'
  | 'organization_deactivated'
  | 'user_assigned'
  | 'user_reassigned'
  | 'role_changed'
  | 'user_suspended'
  | 'user_reactivated'
  | 'organization_bulk_imported'
  | 'soul_winner_bulk_imported'
  | 'targets_reset_official_pdf'
  | 'target_updated';

export interface AdminAuditLog {
  id: string;
  action: AdminAuditAction;
  actorId: string;
  targetId: string;
  details?: string;
  timestamp: string;
}
