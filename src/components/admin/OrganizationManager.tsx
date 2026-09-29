import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Search,
  AlertTriangle,
  FileCheck,
  FolderTree,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getZones,
  createZone,
  updateZoneStatus,
  getGroups,
  createGroup,
  updateGroupStatus,
  getChurches,
  createChurch,
  updateChurchStatus,
  getPCFs,
  createPCF,
  updatePCFStatus,
} from '../../services/organizationService';
import { TargetManagementView } from './TargetManagementView';
import { CampaignSettingsView } from './CampaignSettingsView';
import { ReconciliationView } from './ReconciliationView';
import { DuplicateResolutionsView } from './DuplicateResolutionsView';
import type { Zone, Group, Church, PCF, EntityStatus } from '../../types/organization';

export const OrganizationManager: React.FC = () => {
  const { userProfile: currentUser, role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';

  const [activeTab, setActiveTab] = useState<'tree' | 'zones' | 'groups' | 'churches' | 'pcfs' | 'search' | 'targets' | 'settings' | 'reconciliation' | 'resolutions'>('tree');


  const [zones, setZones] = useState<Zone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [pcfs, setPcfs] = useState<PCF[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Tree Expansion state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Creation Form states
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');

  // Confirmation Modal for Deactivation
  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    type: 'zone' | 'group' | 'church' | 'pcf' | null;
    id: string | null;
    name: string;
    currentStatus: EntityStatus;
  }>({ isOpen: false, type: null, id: null, name: '', currentStatus: 'active' });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [zList, gList, cList, pList] = await Promise.all([
        getZones(),
        getGroups(),
        getChurches(),
        getPCFs(),
      ]);
      setZones(zList);
      setGroups(gList);
      setChurches(cList);
      setPcfs(pList);
    } catch (err) {
      console.error('Failed to load organization data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="account-card empty-card">
        <ShieldAlert size={36} className="text-error" />
        <h3 className="account-title">Access Restricted</h3>
        <p className="account-lead">
          Organizational management is restricted to authorized Super Administrators only.
        </p>
      </div>
    );
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !code) {
      setError('Name and unique code are required.');
      return;
    }

    const actorId = currentUser?.id || 'superAdmin';
    setIsSubmitting(true);

    try {
      if (activeTab === 'zones') {
        await createZone(name, code, actorId);
        setSuccess(`Zone "${name}" created successfully.`);
      } else if (activeTab === 'groups') {
        if (!selectedZoneId) {
          setError('Please select a valid parent Zone.');
          setIsSubmitting(false);
          return;
        }
        await createGroup(name, code, selectedZoneId, actorId);
        setSuccess(`Group "${name}" created successfully under selected Zone.`);
      } else if (activeTab === 'churches') {
        if (!selectedGroupId) {
          setError('Please select a valid parent Group.');
          setIsSubmitting(false);
          return;
        }
        await createChurch(name, code, selectedGroupId, actorId);
        setSuccess(`Church "${name}" created successfully under selected Group.`);
      } else if (activeTab === 'pcfs') {
        if (!selectedChurchId) {
          setError('Please select a valid parent Church.');
          setIsSubmitting(false);
          return;
        }
        await createPCF(name, code, selectedChurchId, actorId);
        setSuccess(`PCF "${name}" created successfully under selected Church.`);
      }

      setName('');
      setCode('');
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!deactivateModal.id || !deactivateModal.type) return;
    setIsSubmitting(true);

    const actorId = currentUser?.id || 'superAdmin';
    const nextStatus: EntityStatus = deactivateModal.currentStatus === 'active' ? 'inactive' : 'active';

    try {
      if (deactivateModal.type === 'zone') {
        await updateZoneStatus(deactivateModal.id, nextStatus, actorId);
      } else if (deactivateModal.type === 'group') {
        await updateGroupStatus(deactivateModal.id, nextStatus, actorId);
      } else if (deactivateModal.type === 'church') {
        await updateChurchStatus(deactivateModal.id, nextStatus, actorId);
      } else if (deactivateModal.type === 'pcf') {
        await updatePCFStatus(deactivateModal.id, nextStatus, actorId);
      }

      setSuccess(`Updated status for "${deactivateModal.name}" to ${nextStatus}.`);
      setDeactivateModal({ isOpen: false, type: null, id: null, name: '', currentStatus: 'active' });
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search Results Calculation
  const searchResults = () => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase().trim();
    const results: Array<{
      type: 'Zone' | 'Group' | 'Church' | 'PCF';
      name: string;
      code: string;
      status: EntityStatus;
      path: string;
    }> = [];

    zones.forEach((z) => {
      if (z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)) {
        results.push({ type: 'Zone', name: z.name, code: z.code, status: z.status, path: z.name });
      }
    });

    groups.forEach((g) => {
      if (g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q)) {
        const pz = zones.find((z) => z.id === g.zoneId);
        results.push({
          type: 'Group',
          name: g.name,
          code: g.code,
          status: g.status,
          path: `${g.name} → Zone: ${pz?.name || 'Unknown'}`,
        });
      }
    });

    churches.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
        const pg = groups.find((g) => g.id === c.groupId);
        const pz = zones.find((z) => z.id === pg?.zoneId);
        results.push({
          type: 'Church',
          name: c.name,
          code: c.code,
          status: c.status,
          path: `${c.name} → Group: ${pg?.name || 'Unknown'} → Zone: ${pz?.name || 'Unknown'}`,
        });
      }
    });

    pcfs.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
        const pc = churches.find((c) => c.id === p.churchId);
        const pg = groups.find((g) => g.id === pc?.groupId);
        const pz = zones.find((z) => z.id === pg?.zoneId);
        results.push({
          type: 'PCF',
          name: p.name,
          code: p.code,
          status: p.status,
          path: `${p.name} → Church: ${pc?.name || 'Unknown'} → Group: ${pg?.name || 'Unknown'} → Zone: ${pz?.name || 'Unknown'}`,
        });
      }
    });

    return results;
  };

  return (
    <div className="account-card">
      <div className="form-header">
        <h2 className="form-title">
          <Building size={24} className="inline-icon" /> Organization Structure Manager
        </h2>
        <p className="form-lead">
          Manage campaign Zone → Group → Church → PCF hierarchy and targets.
        </p>
      </div>

      {/* ADMIN SUB-TABS */}
      <div className="admin-subtabs">
        <button
          onClick={() => { setActiveTab('tree'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'tree' ? 'subtab-active' : ''}`}
        >
          <FolderTree size={14} className="inline-icon" /> Tree View
        </button>
        <button
          onClick={() => { setActiveTab('zones'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'zones' ? 'subtab-active' : ''}`}
        >
          Zones ({zones.length})
        </button>
        <button
          onClick={() => { setActiveTab('groups'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'groups' ? 'subtab-active' : ''}`}
        >
          Groups ({groups.length})
        </button>
        <button
          onClick={() => { setActiveTab('churches'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'churches' ? 'subtab-active' : ''}`}
        >
          Churches ({churches.length})
        </button>
        <button
          onClick={() => { setActiveTab('search'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'search' ? 'subtab-active' : ''}`}
        >
          <Search size={14} className="inline-icon" /> Search
        </button>
        <button
          onClick={() => { setActiveTab('targets'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'targets' ? 'subtab-active' : ''}`}
        >
          <Building size={14} className="inline-icon" /> TARGETS
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'settings' ? 'subtab-active' : ''}`}
          style={{ color: activeTab === 'settings' ? '#00ff87' : '#cbd5e1' }}
        >
          <Sliders size={14} className="inline-icon" /> SETTINGS
        </button>
        <button
          onClick={() => { setActiveTab('reconciliation'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'reconciliation' ? 'subtab-active' : ''}`}
        >
          <FileCheck size={14} className="inline-icon" /> RECONCILIATION
        </button>
        <button
          onClick={() => { setActiveTab('resolutions'); setError(''); setSuccess(''); }}
          className={`subtab-btn ${activeTab === 'resolutions' ? 'subtab-active' : ''}`}
          style={{ color: activeTab === 'resolutions' ? '#FFD700' : '#cbd5e1' }}
        >
          <ShieldAlert size={14} className="inline-icon" /> RESOLUTIONS
        </button>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-box">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {activeTab === 'resolutions' ? (
        <DuplicateResolutionsView />
      ) : activeTab === 'reconciliation' ? (
        <ReconciliationView />
      ) : activeTab === 'settings' ? (
        <CampaignSettingsView />
      ) : activeTab === 'targets' ? (
        <TargetManagementView />

      ) : activeTab === 'search' ? (
        <div className="search-org-section">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Zone, Group, Church, or PCF by name or code..."
              className="form-input"
            />
          </div>

          <div className="search-results-list">
            {searchQuery && searchResults().length === 0 ? (
              <p className="empty-text">No matching organizations found.</p>
            ) : (
              searchResults().map((res, i) => (
                <div key={i} className="search-result-item">
                  <div className="sr-top">
                    <span className="type-badge">{res.type}</span>
                    <span className="sr-name">{res.name} ({res.code})</span>
                    <span className={`status-pill status-${res.status}`}>{res.status}</span>
                  </div>
                  <div className="sr-path">Hierarchy Path: {res.path}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'tree' ? (
        <div className="org-tree-section">
          <h4 className="hierarchy-heading">CAMPAIGN ORGANIZATIONAL TREE</h4>
          {isLoading ? (
            <p className="loading-text">Loading organizational tree...</p>
          ) : zones.length === 0 ? (
            <p className="empty-text">No Zones created yet. Use the Zones tab to create the first Zone.</p>
          ) : (
            <div className="tree-root-box">
              {zones.map((z) => {
                const zExpanded = expandedNodes[z.id] !== false; // default expanded
                const childGroups = groups.filter((g) => g.zoneId === z.id);

                return (
                  <div key={z.id} className="tree-node tree-zone-node">
                    <div className="tree-node-row" onClick={() => toggleNode(z.id)}>
                      {zExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="node-title">ZONE: {z.name} ({z.code})</span>
                      <span className={`status-pill status-${z.status}`}>{z.status}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeactivateModal({
                            isOpen: true,
                            type: 'zone',
                            id: z.id,
                            name: z.name,
                            currentStatus: z.status,
                          });
                        }}
                        className="btn-xs btn-text"
                      >
                        {z.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>

                    {zExpanded && (
                      <div className="tree-children-container">
                        {childGroups.length === 0 ? (
                          <div className="tree-empty-hint">No Groups under this Zone.</div>
                        ) : (
                          childGroups.map((g) => {
                            const gExpanded = expandedNodes[g.id] !== false;
                            const childChurches = churches.filter((c) => c.groupId === g.id);

                            return (
                              <div key={g.id} className="tree-node tree-group-node">
                                <div className="tree-node-row" onClick={() => toggleNode(g.id)}>
                                  {gExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <span className="node-title">GROUP: {g.name} ({g.code})</span>
                                  <span className={`status-pill status-${g.status}`}>{g.status}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeactivateModal({
                                        isOpen: true,
                                        type: 'group',
                                        id: g.id,
                                        name: g.name,
                                        currentStatus: g.status,
                                      });
                                    }}
                                    className="btn-xs btn-text"
                                  >
                                    {g.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                  </button>
                                </div>

                                {gExpanded && (
                                  <div className="tree-children-container">
                                    {childChurches.length === 0 ? (
                                      <div className="tree-empty-hint">No Churches under this Group.</div>
                                    ) : (
                                      childChurches.map((c) => {
                                        const cExpanded = expandedNodes[c.id] !== false;
                                        const childPcfs = pcfs.filter((p) => p.churchId === c.id);

                                        return (
                                          <div key={c.id} className="tree-node tree-church-node">
                                            <div className="tree-node-row" onClick={() => toggleNode(c.id)}>
                                              {cExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                              <span className="node-title">CHURCH: {c.name} ({c.code})</span>
                                              <span className={`status-pill status-${c.status}`}>{c.status}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeactivateModal({
                                                    isOpen: true,
                                                    type: 'church',
                                                    id: c.id,
                                                    name: c.name,
                                                    currentStatus: c.status,
                                                  });
                                                }}
                                                className="btn-xs btn-text"
                                              >
                                                {c.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                              </button>
                                            </div>

                                            {cExpanded && childPcfs.length > 0 && (
                                              <div className="tree-children-container">
                                                {childPcfs.map((p) => (
                                                  <div key={p.id} className="tree-node tree-pcf-node">
                                                    <span className="bullet-dot">•</span>
                                                    <span className="node-title">PCF: {p.name} ({p.code})</span>
                                                    <span className={`status-pill status-${p.status}`}>{p.status}</span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setDeactivateModal({
                                                          isOpen: true,
                                                          type: 'pcf',
                                                          id: p.id,
                                                          name: p.name,
                                                          currentStatus: p.status,
                                                        })
                                                      }
                                                      className="btn-xs btn-text"
                                                    >
                                                      {p.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* HIERARCHICAL CREATION FORM */}
          <form onSubmit={handleSubmit} className="record-form">
            <h4 className="hierarchy-heading">
              <Plus size={16} />
              Create New {activeTab === 'zones' ? 'Zone' : activeTab === 'groups' ? 'Group' : activeTab === 'churches' ? 'Church' : 'PCF'}
            </h4>

            {activeTab === 'groups' && (
              <div className="form-group">
                <label className="form-label">Parent Zone *</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">-- Select Parent Zone --</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'churches' && (
              <div className="form-group">
                <label className="form-label">Parent Group *</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">-- Select Parent Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'pcfs' && (
              <div className="form-group">
                <label className="form-label">Parent Church *</label>
                <select
                  value={selectedChurchId}
                  onChange={(e) => setSelectedChurchId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">-- Select Parent Church --</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${
                  activeTab === 'zones'
                    ? 'Abuja Zone 1'
                    : activeTab === 'groups'
                    ? 'Group Alpha'
                    : activeTab === 'churches'
                    ? 'Central Church'
                    : 'Grace PCF'
                }`}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Code (Unique Identifier) *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ZN-ABJ1, GRP-ALP, CH-CENT, PCF-GRC"
                className="form-input"
                required
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="submit-button">
              <span>Create Entity</span>
            </button>
          </form>

          {/* READOUT LIST */}
          <div className="hierarchy-section">
            <h4 className="hierarchy-heading">Existing {activeTab.toUpperCase()}</h4>
            {isLoading ? (
              <p className="loading-text">Loading items...</p>
            ) : (
              <div className="hierarchy-tree">
                {activeTab === 'zones' && zones.map((z) => (
                  <div key={z.id} className="hierarchy-node">
                    <span className="node-label">{z.code}</span>
                    <span className="node-value">{z.name}</span>
                    <span className={`status-pill status-${z.status}`}>{z.status}</span>
                  </div>
                ))}

                {activeTab === 'groups' && groups.map((g) => {
                  const pZone = zones.find((z) => z.id === g.zoneId);
                  return (
                    <div key={g.id} className="hierarchy-node">
                      <div>
                        <span className="node-value">{g.name}</span> ({g.code})
                        <div className="text-dim-sm">Zone: {pZone?.name || g.zoneId}</div>
                      </div>
                      <span className={`status-pill status-${g.status}`}>{g.status}</span>
                    </div>
                  );
                })}

                {activeTab === 'churches' && churches.map((c) => {
                  const pGrp = groups.find((g) => g.id === c.groupId);
                  return (
                    <div key={c.id} className="hierarchy-node">
                      <div>
                        <span className="node-value">{c.name}</span> ({c.code})
                        <div className="text-dim-sm">Group: {pGrp?.name || c.groupId}</div>
                      </div>
                      <span className={`status-pill status-${c.status}`}>{c.status}</span>
                    </div>
                  );
                })}

                {activeTab === 'pcfs' && pcfs.map((p) => {
                  const pCh = churches.find((c) => c.id === p.churchId);
                  return (
                    <div key={p.id} className="hierarchy-node">
                      <div>
                        <span className="node-value">{p.name}</span> ({p.code})
                        <div className="text-dim-sm">Church: {pCh?.name || p.churchId}</div>
                      </div>
                      <span className={`status-pill status-${p.status}`}>{p.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* DEACTIVATION CONFIRMATION MODAL */}
      {deactivateModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <AlertTriangle size={36} className="text-warning mx-auto" />
            <h3 className="modal-title text-center">
              {deactivateModal.currentStatus === 'active' ? 'DEACTIVATE ORGANIZATION?' : 'REACTIVATE ORGANIZATION?'}
            </h3>
            <p className="modal-subtitle text-center">
              Organization: <strong>{deactivateModal.name}</strong> ({deactivateModal.type?.toUpperCase()})
            </p>
            <div className="historical-notice-box">
              <strong>HISTORICAL DATA NOTICE:</strong> Historical soul-winning records and targets attached to this organization will remain strictly preserved.
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                onClick={() => setDeactivateModal({ isOpen: false, type: null, id: null, name: '', currentStatus: 'active' })}
                disabled={isSubmitting}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={isSubmitting}
                className={deactivateModal.currentStatus === 'active' ? 'danger-button' : 'submit-button'}
              >
                {isSubmitting ? 'PROCESSING...' : 'CONFIRM STATUS CHANGE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
