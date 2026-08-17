/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { api } from "./api";

import { PermissionId, DEFAULT_ROLE_PERMISSIONS } from "./permissions";
import { User } from "../types";

export interface ExtendedUser extends User {
  permissions?: PermissionId[];
  mfa_enabled?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  hasPermission: (permission: PermissionId) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from backend
          let userData = null;
          try {
            userData = await api.get("me");
          } catch (error) {
            console.error("Error fetching user data from backend:", error);
            // Fallback user object if backend fails
            userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              full_name: firebaseUser.email?.split("@")[0] || "Usuário",
              role: firebaseUser.email?.toLowerCase() === "sys.powercontrol@gmail.com" ? "master" : "user",
              is_active: firebaseUser.email?.toLowerCase() === "sys.powercontrol@gmail.com",
              company_id: null
            };
          }
          
          if (userData) {
            const userCompanyIds = Array.isArray(userData.company_ids) && userData.company_ids.length > 0
              ? userData.company_ids
              : (userData.company_id ? [userData.company_id] : []);

            if (userData.role === "master") {
              if (userData.company_id) {
                api.setCompanyId(userData.company_id);
              }
            } else if (userData.is_active && userCompanyIds.length > 0) {
              const activeCompany = api.getCompanyId();
              if (!activeCompany || !userCompanyIds.includes(activeCompany)) {
                api.setCompanyId(userCompanyIds[0]);
              }
            } else {
              api.setCompanyId(null);
            }
            api.setIsSystemAdmin(userData.role === "master");
            setUser(userData);
          }
          setIsLoading(false);
        } catch (error) {
          console.error("Critical error in AuthProvider:", error);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        api.setCompanyId(null);
        api.setIsSystemAdmin(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (data: any) => {
    const { email, password, full_name, phone, cpf, invite_id } = data;
    
    let inviteData = null;
    if (invite_id) {
      try {
        const invite = await api.get("invites", invite_id);
        if (invite.status === "PENDING" && new Date(invite.expires_at) > new Date()) {
          inviteData = invite;
        }
      } catch (error) {
        console.error("Error validating invite during registration:", error);
      }
    }

    const isSystemAdmin = email?.toLowerCase() === "sys.powercontrol@gmail.com";
    
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error("Este e-mail já está em uso por outra conta.", { cause: err });
      } else if (err.code === "auth/weak-password") {
        throw new Error("A senha deve conter no mínimo 6 caracteres.", { cause: err });
      } else if (err.code === "auth/invalid-email") {
        throw new Error("E-mail informado é inválido.", { cause: err });
      }
      throw err;
    }

    const uid = userCredential.user.uid;
    
    const rawUserData: Record<string, any> = {
      email,
      full_name: full_name || email?.split("@")[0] || "Usuário",
      phone: phone || null,
      cpf: cpf || null,
      role: inviteData ? inviteData.role : (isSystemAdmin ? "master" : "user"),
      is_active: inviteData ? true : (isSystemAdmin ? true : false),
      company_id: inviteData ? inviteData.company_id : null,
      company_ids: inviteData ? [inviteData.company_id] : [],
      created_at: serverTimestamp()
    };

    const userData: Record<string, any> = {};
    Object.keys(rawUserData).forEach(key => {
      if (rawUserData[key] !== undefined) {
        userData[key] = rawUserData[key];
      }
    });

    await setDoc(doc(db, "users", uid), userData);

    if (inviteData) {
      await api.put("invites", invite_id, { status: "ACCEPTED" });
      api.setCompanyId(inviteData.company_id);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        throw new Error("Login com Google cancelado pelo usuário.", { cause: err });
      } else if (err.code === "auth/account-exists-with-different-credential") {
        throw new Error("Já existe uma conta cadastrada com este e-mail.", { cause: err });
      }
      throw err;
    }
    const googleUser = result.user;

    if (googleUser) {
      const isMasterEmail = googleUser.email?.toLowerCase() === "sys.powercontrol@gmail.com";
      const userRef = doc(db, "users", googleUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const rawUserData: Record<string, any> = {
          email: googleUser.email || "",
          full_name: googleUser.displayName || googleUser.email?.split("@")[0] || "Usuário",
          role: isMasterEmail ? "master" : "user",
          is_active: isMasterEmail ? true : false,
          company_id: null,
          company_ids: [],
          avatar: googleUser.photoURL || null,
          created_at: serverTimestamp()
        };
        const userData: Record<string, any> = {};
        Object.keys(rawUserData).forEach(key => {
          if (rawUserData[key] !== undefined) {
            userData[key] = rawUserData[key];
          }
        });
        await setDoc(userRef, userData);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const hasPermission = (permission: PermissionId) => {
    if (!user) return false;
    if (user.role === 'master') return true;
    
    // Check user-specific permissions first
    if ((user as ExtendedUser).permissions?.includes(permission)) return true;
    
    // Fallback to role-based defaults if no specific permissions are set
    // In a real app, we'd fetch company.role_permissions here, but for now we use defaults
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

