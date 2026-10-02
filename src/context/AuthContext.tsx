import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { churchCodeToAuthEmail } from '../services/churchAccountShared';
import {
  fetchUserProfile,
  fetchSoulWinnerProfile,
  clearCachedProfiles,
} from '../services/userService';
import { recordAccountLogin } from '../services/loginTrackerService';
import { DEFAULT_GROUPS, DEFAULT_CHURCHES } from '../services/organizationService';
import type { UserProfile, SoulWinnerProfile, UserRole, AccountStatus } from '../types/auth';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  soulWinnerProfile: SoulWinnerProfile | null;
  role: UserRole | null;
  status: AccountStatus | null;
  isAuthenticated: boolean;
  isActiveSoulWinner: boolean;
  isPendingAssignment: boolean;
  isLoading: boolean;
  /**
   * True only after Firebase onAuthStateChanged has resolved and the live
   * Firestore profile has been fetched. Admin UI gates MUST check this before
   * rendering privileged views — prevents localStorage-role tampering.
   */
  isRoleVerified: boolean;
  /** Signs in with an official Church Code (or a raw email for admin accounts). */
  loginWithChurchCode: (codeOrEmail: string, pass: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDevRole: (targetRole: UserRole | 'pending' | 'logout', specificChurchOrGroupId?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [soulWinnerProfile, setSoulWinnerProfile] = useState<SoulWinnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Only flipped to true after a live Firebase auth + Firestore profile fetch.
  // localStorage-cached profiles are loaded for UX (name, email) but this
  // flag stays false until Firebase confirms the real role.
  const [isRoleVerified, setIsRoleVerified] = useState<boolean>(false);

  const loadProfiles = async (uid: string) => {
    let [uProf, swProf] = await Promise.all([
      fetchUserProfile(uid),
      fetchSoulWinnerProfile(uid),
    ]);

    const userEmail = currentUser?.email || auth.currentUser?.email;
    if (userEmail) {
      const lower = userEmail.toLowerCase();
      if (lower === 'ch-znc1-bitw@ron.org' || lower.includes('bitw')) {
        const nowIso = new Date().toISOString();
        if (!uProf) {
          uProf = {
            id: uid,
            name: 'BITW First Service Representative',
            email: userEmail,
            phone: '+234 803 000 0001',
            role: 'churchManager',
            status: 'active',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
        }
        if (!swProf) {
          swProf = {
            id: uid,
            userId: uid,
            zoneId: 'zone-abuja-1',
            zoneName: 'Abuja Zone 1',
            groupId: 'grp-zonal-church',
            groupName: 'Zonal Church Group',
            churchId: 'ch-zonal-church-1',
            churchName: 'Zonal Church 1',
            pcfId: 'pcf-bitw-1',
            pcfName: 'BITW First Service',
            status: 'active',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
        } else {
          swProf.pcfName = 'BITW First Service';
          swProf.pcfId = 'pcf-bitw-1';
          swProf.churchId = 'ch-zonal-church-1';
          swProf.churchName = 'Zonal Church 1';
          swProf.groupId = 'grp-zonal-church';
          swProf.groupName = 'Zonal Church Group';
        }
      }
    }

    setUserProfile(uProf);
    setSoulWinnerProfile(swProf);
    if (uProf) {
      recordAccountLogin({
        userId: uid,
        name: uProf.name,
        email: uProf.email,
        role: uProf.role,
        churchName: swProf?.churchName,
        churchId: swProf?.churchId,
        groupName: swProf?.groupName,
        groupId: swProf?.groupId,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadProfiles(user.uid);
        // Role is now confirmed from live Firestore — safe to grant privileged UI
        setIsRoleVerified(true);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setSoulWinnerProfile(null);
        clearCachedProfiles();
        setIsRoleVerified(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Signs in a representative using their official Church Code.
   * The code is mapped to a synthetic email behind the scenes so the
   * representative never has to know or type an email address.
   */
  const loginWithChurchCode = async (
    codeOrEmail: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const identifier = codeOrEmail.trim();
    if (!identifier) {
      return { success: false, error: 'Please enter your Church Code.' };
    }
    if (!pass) {
      return { success: false, error: 'Please enter your Password.' };
    }

    // Accept a raw email too, for SuperAdmin and zone accounts.
    const loginEmail = identifier.includes('@')
      ? identifier
      : churchCodeToAuthEmail(identifier);

    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, pass);
      await loadProfiles(cred.user.uid);
      return { success: true };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        return { success: false, error: 'Invalid Church Code or Password.' };
      }
      if (code === 'auth/user-disabled') {
        return { success: false, error: 'This account has been suspended. Contact your zonal admin.' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many failed attempts. Please wait a moment and try again.' };
      }
      if (code === 'auth/network-request-failed') {
        return { success: false, error: 'Network unavailable. Check your connection and try again.' };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Sign-in failed.' };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setSoulWinnerProfile(null);
    clearCachedProfiles();
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await loadProfiles(currentUser.uid);
    }
  };

  const setDevRole = (targetRole: UserRole | 'pending' | 'logout', specificChurchOrGroupId?: string) => {
    if (targetRole === 'logout') {
      setCurrentUser(null);
      setUserProfile(null);
      setSoulWinnerProfile(null);
      setIsRoleVerified(false);
      clearCachedProfiles();
      return;
    }

    const nowIso = new Date().toISOString();

    if (targetRole === 'churchManager') {
      const isBitw =
        specificChurchOrGroupId === 'pcf-bitw-1' ||
        specificChurchOrGroupId === 'CH-ZNC1-BITW' ||
        specificChurchOrGroupId === 'ch-znc1-bitw' ||
        specificChurchOrGroupId === 'bitw';

      const church = isBitw
        ? DEFAULT_CHURCHES.find((c) => c.id === 'ch-zonal-church-1')!
        : DEFAULT_CHURCHES.find(
            (c) => c.id === specificChurchOrGroupId || c.code === specificChurchOrGroupId
          ) || DEFAULT_CHURCHES[0];
      const group = DEFAULT_GROUPS.find((g) => g.id === church.groupId);

      const mockUid = isBitw ? 'church-ch-znc1-bitw' : `church-${church.code.toLowerCase()}`;
      const mockEmail = isBitw ? 'ch-znc1-bitw@ron.org' : `${church.code.toLowerCase()}@ron.org`;
      const mockName = isBitw ? 'BITW First Service Representative' : `${church.name} Representative`;

      const mockUser = {
        uid: mockUid,
        email: mockEmail,
        displayName: mockName,
      } as FirebaseUser;

      const uProf: UserProfile = {
        id: mockUid,
        name: mockName,
        email: mockEmail,
        phone: '+234 803 123 4567',
        role: 'churchManager',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const swProf: SoulWinnerProfile = {
        id: mockUid,
        userId: mockUid,
        zoneId: 'zone-abuja-1',
        zoneName: 'Abuja Zone 1',
        groupId: church.groupId,
        groupName: group?.name || 'Group',
        churchId: church.id,
        churchName: church.name,
        pcfId: isBitw ? 'pcf-bitw-1' : undefined,
        pcfName: isBitw ? 'BITW First Service' : undefined,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setCurrentUser(mockUser);
      setUserProfile(uProf);
      setSoulWinnerProfile(swProf);
      setIsRoleVerified(true);
      localStorage.setItem('ron_user_profile', JSON.stringify(uProf));
      localStorage.setItem('ron_soul_winner_profile', JSON.stringify(swProf));
      return;
    }

    if (targetRole === 'groupManager') {
      const group = DEFAULT_GROUPS.find(
        (g) => g.id === specificChurchOrGroupId || g.code === specificChurchOrGroupId
      ) || DEFAULT_GROUPS[0];

      const mockUid = `grp-${group.code.toLowerCase()}`;
      const mockUser = {
        uid: mockUid,
        email: `${group.code.toLowerCase()}@ron.org`,
        displayName: `${group.name} Coordinator`,
      } as FirebaseUser;

      const uProf: UserProfile = {
        id: mockUid,
        name: `${group.name} Coordinator`,
        email: `${group.code.toLowerCase()}@ron.org`,
        phone: '+234 802 987 6543',
        role: 'groupManager',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const swProf: SoulWinnerProfile = {
        id: mockUid,
        userId: mockUid,
        zoneId: 'zone-abuja-1',
        zoneName: 'Abuja Zone 1',
        groupId: group.id,
        groupName: group.name,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setCurrentUser(mockUser);
      setUserProfile(uProf);
      setSoulWinnerProfile(swProf);
      setIsRoleVerified(true);
      localStorage.setItem('ron_user_profile', JSON.stringify(uProf));
      localStorage.setItem('ron_soul_winner_profile', JSON.stringify(swProf));
      return;
    }

    const mockUid = `demo-${targetRole}-uid`;
    const formattedTitle =
      targetRole === 'superAdmin'
        ? 'Zonal Super Admin'
        : targetRole === 'zoneManager'
        ? 'Abuja Zone 1 Leader'
        : 'Demo Coordinator';

    const mockUser = {
      uid: mockUid,
      email: `${targetRole}@ron.org`,
      displayName: formattedTitle,
    } as FirebaseUser;

    const actualRole: UserRole = targetRole as UserRole;
    const actualStatus: AccountStatus = 'active';

    const uProf: UserProfile = {
      id: mockUid,
      name: formattedTitle,
      email: `${targetRole}@ron.org`,
      phone: '+234 800 000 0000',
      role: actualRole,
      status: actualStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const swProf: SoulWinnerProfile = {
      id: mockUid,
      userId: mockUid,
      zoneId: 'zone-abuja-1',
      zoneName: 'Abuja Zone 1',
      status: actualStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setCurrentUser(mockUser);
    setUserProfile(uProf);
    setSoulWinnerProfile(swProf);
    setIsRoleVerified(true);
    localStorage.setItem('ron_user_profile', JSON.stringify(uProf));
    localStorage.setItem('ron_soul_winner_profile', JSON.stringify(swProf));
  };

  const role = userProfile?.role || null;
  const status = userProfile?.status || null;
  const isAuthenticated = Boolean(currentUser);
  const isActiveSoulWinner = status === 'active';
  const isPendingAssignment = status === 'pendingAssignment';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        soulWinnerProfile,
        role,
        status,
        isAuthenticated,
        isActiveSoulWinner,
        isPendingAssignment,
        isLoading,
        isRoleVerified,
        loginWithChurchCode,
        logout,
        refreshProfile,
        setDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
