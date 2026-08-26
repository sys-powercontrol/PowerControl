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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
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
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        const userEmail = (firebaseUser.email || "").toLowerCase();
        const isMasterEmail = userEmail === "sys.powercontrol@gmail.com";
        const cacheKey = `user_profile_${firebaseUser.uid}`;

        // Helper to apply user data and save cache
        const applyUserData = (userData: ExtendedUser) => {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(userData));
          } catch (e) {
            console.warn("Could not save user profile to localStorage:", e);
          }
          api.updateCurrentUserData(userData);
          setUser(userData);
          setIsLoading(false);
        };

        // Load cached user profile if exists to ensure immediate render
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (isMasterEmail) {
              parsed.role = "master";
              parsed.is_active = true;
              parsed.permissions = DEFAULT_ROLE_PERMISSIONS.master;
            }
            applyUserData(parsed);
          } catch (e) {
            console.warn("Failed to parse cached user:", e);
          }
        }

        try {
          const userRef = doc(db, "users", firebaseUser.uid);

          // First try a single getDoc to minimize onSnapshot quota consumption
          try {
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              const userData: ExtendedUser = { id: firebaseUser.uid, ...data } as ExtendedUser;
              
              if (isMasterEmail && (userData.role !== "master" || !userData.is_active)) {
                try {
                  await updateDoc(userRef, { role: "master", is_active: true });
                } catch (e) {
                  console.warn("Could not update master doc:", e);
                }
                userData.role = "master";
                userData.is_active = true;
                userData.permissions = DEFAULT_ROLE_PERMISSIONS.master;
              }

              // Invalidate session immediately if user is deactivated
              if (!isMasterEmail && (userData.is_active === false || (userData as any).active === false)) {
                console.warn("User account is inactive. Revoking session...");
                try {
                  localStorage.removeItem(cacheKey);
                } catch (err) {
                  void err;
                }
                setUser(null);
                api.updateCurrentUserData(null);
                await signOut(auth);
                setIsLoading(false);
                return;
              }

              applyUserData(userData);
              return;
            } else {
              // Check legacy documents
              let legacyData: any = null;
              let legacyDocId: string | null = null;

              try {
                const legacyQuery = query(collection(db, "users"), where("email", "==", userEmail));
                const legacySnap = await getDocs(legacyQuery);
                if (!legacySnap.empty) {
                  legacyDocId = legacySnap.docs[0].id;
                  legacyData = legacySnap.docs[0].data();
                }
              } catch (e) {
                console.warn("Could not query legacy user document:", e);
              }

              const isAccountActive = isMasterEmail ? true : (legacyData?.is_active !== false && legacyData?.active !== false);
              if (!isMasterEmail && !isAccountActive) {
                console.warn("Legacy user account is inactive. Revoking session...");
                try {
                  localStorage.removeItem(cacheKey);
                } catch (err) {
                  void err;
                }
                setUser(null);
                api.updateCurrentUserData(null);
                await signOut(auth);
                setIsLoading(false);
                return;
              }

              const newUser: ExtendedUser = {
                id: firebaseUser.uid,
                email: userEmail,
                full_name: legacyData?.full_name || firebaseUser.displayName || userEmail.split("@")[0] || "Usuário",
                role: isMasterEmail ? "master" : (legacyData?.role || "user"),
                company_id: legacyData?.company_id || (legacyData?.company_ids?.[0] || null),
                company_ids: legacyData?.company_ids || (legacyData?.company_id ? [legacyData.company_id] : []),
                permissions: legacyData?.permissions || (isMasterEmail ? DEFAULT_ROLE_PERMISSIONS.master : (legacyData?.role === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin : DEFAULT_ROLE_PERMISSIONS.user)),
                created_at: legacyData?.created_at || serverTimestamp() as any,
                is_active: isAccountActive,
                avatar: legacyData?.avatar || firebaseUser.photoURL || null
              };

              try {
                await setDoc(userRef, newUser);
              } catch (e) {
                console.warn("Could not set user document (quota or offline):", e);
              }

              if (legacyDocId && legacyDocId !== firebaseUser.uid) {
                try {
                  await deleteDoc(doc(db, "users", legacyDocId));
                } catch (delErr) {
                  console.warn("Could not delete legacy user doc:", delErr);
                }
              }

              applyUserData(newUser);
              return;
            }
          } catch (fetchErr: any) {
            console.warn("Firestore getDoc error (falling back to local profile):", fetchErr?.message || fetchErr);
            
            // Build resilient user fallback
            const fallbackUser: ExtendedUser = {
              id: firebaseUser.uid,
              email: userEmail,
              full_name: firebaseUser.displayName || userEmail.split("@")[0] || "Usuário",
              role: isMasterEmail ? "master" : "admin",
              company_id: null,
              company_ids: [],
              permissions: isMasterEmail ? DEFAULT_ROLE_PERMISSIONS.master : DEFAULT_ROLE_PERMISSIONS.admin,
              created_at: new Date().toISOString() as any,
              is_active: true,
              avatar: firebaseUser.photoURL || null
            };

            applyUserData(fallbackUser);
          }
        } catch (error) {
          console.error("Critical error in AuthProvider:", error);
          const fallbackUser: ExtendedUser = {
            id: firebaseUser.uid,
            email: userEmail,
            full_name: firebaseUser.displayName || userEmail.split("@")[0] || "Usuário",
            role: isMasterEmail ? "master" : "admin",
            company_id: null,
            company_ids: [],
            permissions: isMasterEmail ? DEFAULT_ROLE_PERMISSIONS.master : DEFAULT_ROLE_PERMISSIONS.admin,
            created_at: new Date().toISOString() as any,
            is_active: true,
            avatar: firebaseUser.photoURL || null
          };
          applyUserData(fallbackUser);
        }
      } else {
        setUser(null);
        api.updateCurrentUserData(null);
        api.setCompanyId(null);
        api.setIsSystemAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubUserDoc) unsubUserDoc();
      unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: any) {
      console.warn("Firebase Auth sign in failed with code:", err.code);

      if (
        err.code === "auth/user-not-found" || 
        err.code === "auth/invalid-credential" || 
        err.code === "auth/invalid-login-credentials" ||
        err.code === "auth/wrong-password"
      ) {
        throw new Error("E-mail ou senha incorretos. Verifique suas credenciais.", { cause: err });
      } else if (err.code === "auth/too-many-requests") {
        throw new Error("Muitas tentativas incorretas. Aguarde alguns instantes e tente novamente.", { cause: err });
      } else if (err.code === "auth/user-disabled") {
        throw new Error("Esta conta foi desativada pelo administrador.", { cause: err });
      } else if (err.code === "auth/invalid-email") {
        throw new Error("Formato de e-mail inválido.", { cause: err });
      } else {
        throw new Error(err.message || "E-mail ou senha incorretos.", { cause: err });
      }
    }
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
    
    // Check user-specific permissions first if explicitly set
    if (Array.isArray((user as ExtendedUser).permissions) && (user as ExtendedUser).permissions!.length > 0) {
      return (user as ExtendedUser).permissions!.includes(permission);
    }
    
    // Fallback to role-based defaults
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.user || [];
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

