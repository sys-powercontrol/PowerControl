import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { api } from "./api";

import { PermissionId, DEFAULT_ROLE_PERMISSIONS } from "./permissions";
import { User } from "../types";

export interface ExtendedUser extends User {
  permissions?: PermissionId[];
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
  const unsubscribeDocRef = useRef<(() => void) | null>(null);

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
              company_id: null
            };
          }
          
          if (userData) {
            if (userData.company_id) {
              api.setCompanyId(userData.company_id);
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
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const userData = {
      email,
      full_name,
      phone,
      cpf,
      role: inviteData ? inviteData.role : (isSystemAdmin ? "master" : "user"),
      is_active: true,
      company_id: inviteData ? inviteData.company_id : null,
      created_at: serverTimestamp()
    };

    await setDoc(doc(db, "users", uid), userData);

    if (inviteData) {
      await api.put("invites", invite_id, { status: "ACCEPTED" });
      api.setCompanyId(inviteData.company_id);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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

