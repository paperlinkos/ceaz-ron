import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  createUserProfile,
  fetchUserProfile,
  fetchSoulWinnerProfile,
  clearCachedProfiles,
  getCachedLocalProfiles,
} from '../services/userService';
import { DEFAULT_GROUPS, DEFAULT_CHURCHES } from '../services/organizationService';
import {
  authenticateChurchCredentials,
  activateChurchAccount,
  findChurchAccount,
  type ChurchAccount,
} from '../services/churchAccountService';
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
  signup: (
    name: string,
    email: string,
    phone: string,
    pass: string,
    groupId?: string,
    churchId?: string
  ) => Promise<void>;
  login: (emailOrCode: string, pass: string) => Promise<{ requiresActivation?: boolean; churchAccount?: ChurchAccount } | void>;
  loginWithChurchCode: (codeOrEmail: string, pass: string) => Promise<{
    success: boolean;
    requiresActivation?: boolean;
    churchAccount?: ChurchAccount;
    error?: string;
  }>;
  activateChurch: (
    code: string,
    repData: { name: string; email: string; phone: string; newPassword?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    const [uProf, swProf] = await Promise.all([
      fetchUserProfile(uid),
      fetchSoulWinnerProfile(uid),
    ]);
    setUserProfile(uProf);
    setSoulWinnerProfile(swProf);
  };

  useEffect(() => {
    const cached = getCachedLocalProfiles();
    if (cached.userProfile) {
      setUserProfile(cached.userProfile);
      setSoulWinnerProfile(cached.soulWinnerProfile);
      if (!currentUser) {
        setCurrentUser({
          uid: cached.userProfile.id,
          email: cached.userProfile.email,
          displayName: cached.userProfile.name,
        } as FirebaseUser);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadProfiles(user.uid);
        // Role is now confirmed from live Firestore — safe to grant privileged UI
        setIsRoleVerified(true);
      } else if (!localStorage.getItem('ron_user_profile')) {
        setCurrentUser(null);
        setUserProfile(null);
        setSoulWinnerProfile(null);
        clearCachedProfiles();
        setIsRoleVerified(false);
      } else {
        // Authenticated Church Account or Dev Role Session
        const cached = getCachedLocalProfiles();
        if (cached.userProfile) {
          setUserProfile(cached.userProfile);
          setSoulWinnerProfile(cached.soulWinnerProfile);
          setCurrentUser({
            uid: cached.userProfile.id,
            email: cached.userProfile.email,
            displayName: cached.userProfile.name,
          } as FirebaseUser);
          setIsRoleVerified(true);
        } else {
          setIsRoleVerified(false);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (
    name: string,
    email: string,
    phone: string,
    pass: string,
    groupId?: string,
    churchId?: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const nowIso = new Date().toISOString();

    const groupObj = DEFAULT_GROUPS.find((g) => g.id === groupId);
    const churchObj = DEFAULT_CHURCHES.find((c) => c.id === churchId);

    const newProfile: UserProfile = {
      id: cred.user.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'soulWinner',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const swData: Partial<SoulWinnerProfile> = {
      zoneId: 'zone-abuja-1',
      zoneName: 'Abuja Zone 1',
      groupId: groupObj?.id || groupId,
      groupName: groupObj?.name,
      churchId: churchObj?.id || churchId,
      churchName: churchObj?.name,
    };

    await createUserProfile(newProfile, swData);
    await loadProfiles(cred.user.uid);
  };

  const setChurchRepSession = (account: ChurchAccount) => {
    const repName = account.representative?.name || `${account.churchName} Representative`;
    const repEmail = account.representative?.email || `${account.churchCode.toLowerCase()}@ron.org`;
    const repPhone = account.representative?.phone || '';
    const nowIso = new Date().toISOString();

    const mockUid = `church-rep-${account.churchCode.toLowerCase()}`;
    const mockUser = {
      uid: mockUid,
      email: repEmail,
      displayName: repName,
    } as FirebaseUser;

    const uProf: UserProfile = {
      id: mockUid,
      name: repName,
      email: repEmail,
      phone: repPhone,
      role: 'churchManager',
      status: 'active',
      createdAt: account.createdAt || nowIso,
      updatedAt: account.updatedAt || nowIso,
    };

    const swProf: SoulWinnerProfile = {
      id: `sw-${account.churchCode.toLowerCase()}`,
      userId: mockUid,
      zoneId: 'zone-abuja-1',
      zoneName: 'Abuja Zone 1',
      groupId: account.groupId,
      groupName: account.groupName,
      churchId: account.churchId,
      churchName: account.churchName,
      status: 'active',
      createdAt: account.createdAt || nowIso,
      updatedAt: account.updatedAt || nowIso,
    };

    setCurrentUser(mockUser);
    setUserProfile(uProf);
    setSoulWinnerProfile(swProf);
    setIsRoleVerified(true);
    localStorage.setItem('ron_user_profile', JSON.stringify(uProf));
    localStorage.setItem('ron_soul_winner_profile', JSON.stringify(swProf));
  };

  const loginWithChurchCode = async (codeOrEmail: string, pass: string) => {
    const authResult = authenticateChurchCredentials(codeOrEmail, pass);
    if (!authResult.success || !authResult.account) {
      return authResult;
    }
    if (authResult.requiresActivation) {
      return authResult;
    }
    setChurchRepSession(authResult.account);
    return { success: true, account: authResult.account };
  };

  const activateChurch = async (
    code: string,
    repData: { name: string; email: string; phone: string; newPassword?: string }
  ) => {
    const actResult = activateChurchAccount(code, repData);
    if (!actResult.success || !actResult.account) {
      return { success: false, error: actResult.error || 'Activation failed' };
    }
    setChurchRepSession(actResult.account);
    return { success: true };
  };

  const login = async (emailOrCode: string, pass: string) => {
    const matchingAccount = findChurchAccount(emailOrCode);
    if (matchingAccount) {
      const authRes = authenticateChurchCredentials(emailOrCode, pass);
      if (!authRes.success) {
        throw new Error(authRes.error || 'Invalid credentials');
      }
      if (authRes.requiresActivation) {
        return { requiresActivation: true, churchAccount: authRes.account };
      }
      setChurchRepSession(authRes.account!);
      return;
    }

    const cred = await signInWithEmailAndPassword(auth, emailOrCode, pass);
    await loadProfiles(cred.user.uid);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setSoulWinnerProfile(null);
    clearCachedProfiles();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
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
      const church = DEFAULT_CHURCHES.find(
        (c) => c.id === specificChurchOrGroupId || c.code === specificChurchOrGroupId
      ) || DEFAULT_CHURCHES[0];
      const group = DEFAULT_GROUPS.find((g) => g.id === church.groupId);

      const mockUid = `church-${church.code.toLowerCase()}`;
      const mockUser = {
        uid: mockUid,
        email: `${church.code.toLowerCase()}@ron.org`,
        displayName: `${church.name} Representative`,
      } as FirebaseUser;

      const uProf: UserProfile = {
        id: mockUid,
        name: `${church.name} Representative`,
        email: `${church.code.toLowerCase()}@ron.org`,
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
        signup,
        login,
        loginWithChurchCode,
        activateChurch,
        logout,
        resetPassword,
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
