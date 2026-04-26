import { auth, db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, orderBy, limit, OrderByDirection, onSnapshot, QueryConstraint, Query, DocumentData, QuerySnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { User, AuditLog } from "../types";

let currentCompanyId: string | null = null;
let isSystemAdminStatus = false;
let currentUserData: User | null = null;

// Race condition protection: Deferred promise for company ID
let companyResolver: ((id: string) => void) | null = null;
const companyPromise = new Promise<string>((resolve) => {
  companyResolver = resolve;
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanObject = (obj: unknown): Record<string, unknown> | unknown => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = { ...(obj as Record<string, unknown>) };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
};

export const api = {
  setCompanyId: (id: string | null) => {
    currentCompanyId = id;
    if (id && companyResolver) {
      companyResolver(id);
    }
  },
  getCompanyId: () => currentCompanyId,
  // Helper to wait for company ID with timeout
  waitForCompany: async (timeout = 500): Promise<string | null> => {
    if (currentCompanyId) return currentCompanyId;
    
    return Promise.race([
      companyPromise,
      wait(timeout).then(() => null)
    ]);
  },
  setIsSystemAdmin: (isMaster: boolean) => {
    isSystemAdminStatus = isMaster;
  },
  getCurrentUser: () => currentUserData,
  findUserByEmail: async (email: string): Promise<User | null> => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },
  get: async <T = any>(entityPath: string, paramsOrId?: Record<string, any> | string): Promise<T | T[]> => {
    if (entityPath === "me") {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      
      const isMasterEmail = user.email?.toLowerCase() === "sys.powercontrol@gmail.com";
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentUserData = { id: user.uid, ...userData } as User;
          if (isMasterEmail && userData.role !== "master") {
            await updateDoc(doc(db, "users", user.uid), { role: "master" });
            userData.role = "master";
            currentUserData.role = "master";
          }
          if (userData.company_id) {
            api.setCompanyId(userData.company_id);
          }
          return currentUserData as T;
        } else {
          const newUser = {
            email: user.email || '',
            full_name: user.email?.split("@")[0] || "Usuário",
            role: isMasterEmail ? "master" : "user",
            company_id: null,
            created_at: serverTimestamp(),
            is_active: true,
          };
          await setDoc(doc(db, "users", user.uid), newUser);
          currentUserData = { id: user.uid, ...newUser } as User;
          return currentUserData as T;
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Firestore error in get('me'):", error.message);
        }
        // Fallback
        currentUserData = {
          id: user.uid,
          email: user.email || '',
          full_name: user.email?.split("@")[0] || "Usuário",
          role: isMasterEmail ? "master" : "user",
          company_id: null,
          is_active: true,
          created_at: new Date().toISOString()
        } as User;
        return currentUserData as T;
      }
    }

    const pathSegments = entityPath.split("/");
    const isDocumentPath = pathSegments.length % 2 === 0;

    if (typeof paramsOrId === "string" || isDocumentPath) {
      let docRef;
      if (typeof paramsOrId === "string") {
        docRef = doc(db, entityPath, paramsOrId);
      } else {
        docRef = doc(db, entityPath);
      }
      
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Not found");
      const data = docSnap.data();
      return { id: docSnap.id, ...(typeof data === 'object' && data !== null ? data : {}) } as T;
    } else {
      let q: Query<DocumentData> = collection(db, entityPath);
      const conditions: QueryConstraint[] = [];

      if (paramsOrId && typeof paramsOrId === "object") {
        Object.keys(paramsOrId).forEach(key => {
          if (paramsOrId[key] !== undefined && key !== "_all" && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit") {
            conditions.push(where(key, "==", paramsOrId[key]));
          }
        });
      }

      const baseEntity = pathSegments[0];
      const isCompanyEntity = baseEntity === "companies";

      const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

      if (requiresIsolation) {
        const companyId = await api.waitForCompany(2000);
        if (!companyId) {
          console.warn(`Race condition avoided: Cannot query ${entityPath} without company_id. Throwing to trigger retry.`);
          throw new Error("Pendente de company_id");
        }
        conditions.push(where("company_id", "==", companyId));
      } else if (isSystemAdminStatus && (currentCompanyId || await api.waitForCompany(500)) && !(paramsOrId && paramsOrId._all) && !isCompanyEntity) {
        conditions.push(where("company_id", "==", currentCompanyId));
      }

      const queryConstraints: QueryConstraint[] = [...conditions];
      
      if (paramsOrId && typeof paramsOrId === "object") {
        if (paramsOrId._orderBy) {
          queryConstraints.push(orderBy(paramsOrId._orderBy as string, (paramsOrId._orderDir as OrderByDirection) || "asc"));
        }
        if (paramsOrId._limit) {
          queryConstraints.push(limit(paramsOrId._limit as number));
        }
      }

      if (queryConstraints.length > 0) {
        q = query(q, ...queryConstraints);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...(typeof data === 'object' && data !== null ? data : {}) };
      }) as T[];
    }
  },
  post: async <T = any>(entity: string, data: Partial<T> | Record<string, any>): Promise<T> => {
    const payload = cleanObject({ ...data }) as Record<string, any>;
    
    if (!payload.company_id && currentCompanyId && entity !== "companies" && entity !== "users") {
      payload.company_id = currentCompanyId;
    }

    if (!payload.created_at) {
      payload.created_at = serverTimestamp();
    }

    const newDocRef = doc(collection(db, entity));
    await setDoc(newDocRef, payload);
    return { id: newDocRef.id, ...payload } as T;
  },
  put: async <T = any>(entity: string, id: string, data: Partial<T> | Record<string, any>): Promise<T> => {
    const docRef = doc(db, entity, id);
    const payload = cleanObject(data) as Record<string, any>;
    await updateDoc(docRef, payload);
    return { id, ...payload } as T;
  },
  delete: async (entity: string, id: string): Promise<boolean> => {
    const docRef = doc(db, entity, id);
    await deleteDoc(docRef);
    return true;
  },
  subscribe: <T = any>(entityPath: string, params: Record<string, any> | null, callback: (data: T[]) => void) => {
    let q: Query<DocumentData> = collection(db, entityPath);
    const conditions: QueryConstraint[] = [];

    if (params && typeof params === "object") {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit" && key !== "_all") {
          conditions.push(where(key, "==", params[key]));
        }
      });
    }

    const pathSegments = entityPath.split("/");
    const baseEntity = pathSegments[0];
    const isCompanyEntity = baseEntity === "companies";

    const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    const setupSubscription = async () => {
      const waitTime = requiresIsolation ? 2000 : (isSystemAdminStatus && !params?._all ? 500 : 0);
      const companyId = waitTime > 0 ? await api.waitForCompany(waitTime) : currentCompanyId;

      if (isCancelled) return;

      if (requiresIsolation && !companyId) {
        console.warn(`Race condition avoided in subscribe: Cannot query ${entityPath} without company_id.`);
        // Note: For subscriptions, yielding nothing is better than erroring out the whole tree, 
        // but it might never re-subscribe. However, 2000ms is generous enough for auth initialization.
        return;
      }

      if ((requiresIsolation || (isSystemAdminStatus && !params?._all && !isCompanyEntity)) && companyId) {
        conditions.push(where("company_id", "==", companyId));
      }

      const queryConstraints: QueryConstraint[] = [...conditions];
      if (params?._orderBy) {
        queryConstraints.push(orderBy(params._orderBy as string, (params._orderDir as OrderByDirection) || "asc"));
      }
      if (params?._limit) {
        queryConstraints.push(limit(params._limit as number));
      }

      if (queryConstraints.length > 0) {
        q = query(q, ...queryConstraints);
      }

      const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() }));
        callback(data as T[]);
      });

      unsubscribe = unsub;
    };

    setupSubscription();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  },
  log: async (data: Partial<AuditLog>, userContext?: User): Promise<void> => {
    const user = userContext ? userContext : auth.currentUser;
    if (!user) return;

    const logData = {
      ...data,
      user_id: userContext?.id || (user as any).uid || (user as any).id,
      user_name: userContext?.full_name || (userContext as any)?.email || currentUserData?.full_name || (user as any).email || "Sistema",
      timestamp: serverTimestamp(),
      company_id: data.company_id || userContext?.company_id || currentCompanyId
    };

    try {
      const newLogRef = doc(collection(db, "audit_logs"));
      await setDoc(newLogRef, logData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error creating audit log:", error.message);
      }
    }
  },
};
