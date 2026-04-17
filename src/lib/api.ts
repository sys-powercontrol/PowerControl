import { auth, db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, orderBy, limit, OrderByDirection, onSnapshot } from "firebase/firestore";

let currentCompanyId: string | null = null;
let isSystemAdminStatus = false;
let currentUserData: any = null;

const cleanObject = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = { ...obj };
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
  },
  getCompanyId: () => currentCompanyId,
  setIsSystemAdmin: (isMaster: boolean) => {
    isSystemAdminStatus = isMaster;
  },
  setSessionId: (id: string | null) => {
    // No longer used
  },
  getCurrentUser: () => currentUserData,
  findUserByEmail: async (email: string) => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
  get: async (entityPath: string, paramsOrId?: any): Promise<any> => {
    if (entityPath === "me") {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      
      const isMasterEmail = user.email?.toLowerCase() === "sys.powercontrol@gmail.com";
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentUserData = { id: user.uid, ...userData };
          if (isMasterEmail && userData.role !== "master") {
            await updateDoc(doc(db, "users", user.uid), { role: "master" });
            userData.role = "master";
            currentUserData.role = "master";
          }
          return currentUserData;
        } else {
          const newUser = {
            email: user.email,
            role: isMasterEmail ? "master" : "user",
            created_at: serverTimestamp(),
            active: true,
          };
          await setDoc(doc(db, "users", user.uid), newUser);
          currentUserData = { id: user.uid, ...newUser };
          return currentUserData;
        }
      } catch (error) {
        console.error("Firestore error in get('me'):", error);
        // Fallback
        currentUserData = {
          id: user.uid,
          email: user.email,
          full_name: user.email?.split("@")[0] || "Usuário",
          role: isMasterEmail ? "master" : "user",
          company_id: null
        };
        return currentUserData;
      }
    }

    // Handle entityPath like "companies/123"
    const pathSegments = entityPath.split("/");
    const isDocumentPath = pathSegments.length % 2 === 0;

    if (typeof paramsOrId === "string" || isDocumentPath) {
      let docRef;
      if (typeof paramsOrId === "string") {
        docRef = doc(db, entityPath, paramsOrId);
      } else {
        // e.g. entityPath = "companies/123"
        docRef = doc(db, entityPath);
      }
      
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Not found");
      const data = docSnap.data();
      return { id: docSnap.id, ...(typeof data === 'object' && data !== null ? data : {}) };
    } else {
      let q = collection(db, entityPath) as any;
      const conditions: any[] = [];

      if (paramsOrId && typeof paramsOrId === "object") {
        Object.keys(paramsOrId).forEach(key => {
          if (paramsOrId[key] !== undefined && key !== "_all" && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit") {
            conditions.push(where(key, "==", paramsOrId[key]));
          }
        });
      }

      const baseEntity = pathSegments[0];
      const isUserEntity = baseEntity === "users";
      const isCompanyEntity = baseEntity === "companies";

      const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

      if (requiresIsolation) {
        if (!currentCompanyId) {
          console.error(`Blocked cross-tenant data leak. Missing company_id for entity ${entityPath}.`);
          throw new Error("Sessão inválida: Identificador de empresa ausente. Faça login novamente.");
        }
        conditions.push(where("company_id", "==", currentCompanyId));
      } else if (isSystemAdminStatus && currentCompanyId && !(paramsOrId && paramsOrId._all) && !isCompanyEntity) {
        conditions.push(where("company_id", "==", currentCompanyId));
      }

      const queryConstraints: any[] = [...conditions];
      
      if (paramsOrId && typeof paramsOrId === "object") {
        if (paramsOrId._orderBy) {
          queryConstraints.push(orderBy(paramsOrId._orderBy, (paramsOrId._orderDir as OrderByDirection) || "asc"));
        }
        if (paramsOrId._limit) {
          queryConstraints.push(limit(paramsOrId._limit));
        }
      }

      if (queryConstraints.length > 0) {
        q = query(q, ...queryConstraints);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...(typeof data === 'object' && data !== null ? data : {}) };
      });
    }
  },
  post: async (entity: string, data: any) => {
    const payload = cleanObject({ ...data });
    
    if (!payload.company_id && currentCompanyId && entity !== "companies" && entity !== "users") {
      payload.company_id = currentCompanyId;
    }

    if (!payload.created_at) {
      payload.created_at = serverTimestamp();
    }

    // For users, we might want to use a specific ID (like auth UID) if provided, but here we just add to collection
    // Wait, if it's users, we shouldn't just add to collection because we need the ID to match auth UID.
    // But the frontend usually doesn't create users this way except in register.
    // Let's handle it generally.
    const newDocRef = doc(collection(db, entity));
    await setDoc(newDocRef, payload);
    return { id: newDocRef.id, ...payload };
  },
  put: async (entity: string, id: string, data: any) => {
    const docRef = doc(db, entity, id);
    const payload = cleanObject(data);
    await updateDoc(docRef, payload);
    return { id, ...payload };
  },
  delete: async (entity: string, id: string) => {
    const docRef = doc(db, entity, id);
    await deleteDoc(docRef);
    return true;
  },
  subscribe: (entityPath: string, params: any, callback: (data: any[]) => void) => {
    let q = collection(db, entityPath) as any;
    const conditions: any[] = [];

    if (params && typeof params === "object") {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit") {
          conditions.push(where(key, "==", params[key]));
        }
      });
    }

    const pathSegments = entityPath.split("/");
    const baseEntity = pathSegments[0];
    const isCompanyEntity = baseEntity === "companies";

    const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

    if (requiresIsolation) {
      if (!currentCompanyId) {
        console.error(`Blocked cross-tenant data leak in subscribe. Missing company_id for entity ${entityPath}.`);
        throw new Error("Sessão inválida: Identificador de empresa ausente na assinatura de dados. Atualize a página.");
      }
      conditions.push(where("company_id", "==", currentCompanyId));
    } else if (isSystemAdminStatus && currentCompanyId && !(params && params._all) && !isCompanyEntity) {
      conditions.push(where("company_id", "==", currentCompanyId));
    }

    const queryConstraints: any[] = [...conditions];
    if (params?._orderBy) {
      queryConstraints.push(orderBy(params._orderBy, (params._orderDir as OrderByDirection) || "asc"));
    }
    if (params?._limit) {
      queryConstraints.push(limit(params._limit));
    }

    if (queryConstraints.length > 0) {
      q = query(q, ...queryConstraints);
    }

    return onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  },
  log: async (data: any, userContext?: any) => {
    const user = userContext ? userContext : auth.currentUser;
    if (!user) return;

    const logData = {
      ...data,
      user_id: userContext?.id || user.uid || user.id,
      user_name: userContext?.full_name || userContext?.email || currentUserData?.full_name || user.email || "Sistema",
      timestamp: serverTimestamp(),
      company_id: data.company_id || userContext?.company_id || currentCompanyId
    };

    try {
      const newLogRef = doc(collection(db, "audit_logs"));
      await setDoc(newLogRef, logData);
    } catch (error) {
      console.error("Error creating audit log:", error);
    }
  },
};
