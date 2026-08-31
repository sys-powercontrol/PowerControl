import { auth, db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  orderBy, 
  limit, 
  startAfter,
  OrderByDirection, 
  onSnapshot, 
  QueryConstraint, 
  Query, 
  DocumentData, 
  QuerySnapshot, 
  QueryDocumentSnapshot,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  average,
  count,
  increment
} from "firebase/firestore";
import { User, AuditLog } from "../types";
import { offlineStore } from "./offlineStore";
import { queryClient } from "./queryClient";

let currentCompanyId: string | null = null;
let isSystemAdminStatus = false;
let currentUserData: User | null = null;

let companyResolvers: Array<(id: string) => void> = [];

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

const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'fiscal_token',
  'secret',
  'secret_key',
  'master_key',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'credit_card',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'private_key',
  'certificate_password'
]);

export const sanitizeLogPayload = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogPayload(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
      sanitized[key] = '********';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Helper for local caching to survive quota limitations
const getCacheKey = (path: string, params?: any) => `api_cache_${path}_${JSON.stringify(params || {})}`;

const getFromLocalCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToLocalCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save to localStorage cache:", e);
  }
};

// Purge any occurrence of a deleted item across all localStorage cached collections
const removeFromLocalCacheAcrossKeys = (entity: string, id: string) => {
  try {
    const prefix = `api_cache_${entity}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(prefix) || key === `api_cache_${entity}`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((item: any) => item?.id !== id);
              if (filtered.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
              }
            } else if (parsed && typeof parsed === "object" && (parsed.id === id || (parsed as any).items)) {
              if (parsed.id === id) {
                localStorage.removeItem(key);
              } else if (Array.isArray((parsed as any).items)) {
                const filtered = (parsed as any).items.filter((item: any) => item?.id !== id);
                if (filtered.length !== (parsed as any).items.length) {
                  localStorage.setItem(key, JSON.stringify({ ...parsed, items: filtered }));
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not purge deleted item from all localStorage keys:", e);
  }
};

export interface PageResult<T = any> {
  items: T[];
  lastDoc: any | null;
  hasMore: boolean;
  totalCount?: number;
}


export const api = {
  updateCurrentUserData: (userData: User | null) => {
    currentUserData = userData;
    if (userData) {
      isSystemAdminStatus = userData.role === 'master';
      const userCompanyIds = Array.isArray(userData.company_ids) && userData.company_ids.length > 0
        ? userData.company_ids
        : (userData.company_id ? [userData.company_id] : []);
      
      if (userData.role === 'master') {
        // Master can keep current selection or null for global
      } else if (userData.is_active && userCompanyIds.length > 0) {
        if (!currentCompanyId || !userCompanyIds.includes(currentCompanyId)) {
          api.setCompanyId(userCompanyIds[0]);
        }
      } else {
        currentCompanyId = null;
      }
    } else {
      currentCompanyId = null;
      isSystemAdminStatus = false;
    }
  },
  setCompanyId: (id: string | null) => {
    if (id && currentUserData && currentUserData.role !== 'master') {
      const userCompanyIds = Array.isArray(currentUserData.company_ids) && currentUserData.company_ids.length > 0
        ? currentUserData.company_ids
        : (currentUserData.company_id ? [currentUserData.company_id] : []);
      
      if (userCompanyIds.length > 0 && !userCompanyIds.includes(id)) {
        console.warn(`Tentativa de acesso não autorizado à empresa ${id}. Redirecionando para empresa padrão.`);
        currentCompanyId = userCompanyIds[0];
        companyResolvers.forEach(resolve => resolve(userCompanyIds[0]));
        companyResolvers = [];
        return;
      }
    }
    currentCompanyId = id;
    if (id) {
      companyResolvers.forEach(resolve => resolve(id));
      companyResolvers = [];
    }
  },
  getCompanyId: () => currentCompanyId,
  // Helper to wait for company ID with timeout
  waitForCompany: async (timeout = 800): Promise<string | null> => {
    if (currentCompanyId) return currentCompanyId;
    
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        resolve(currentCompanyId);
      }, timeout);

      companyResolvers.push((id) => {
        clearTimeout(timer);
        resolve(id);
      });
    });
  },
  setIsSystemAdmin: (isMaster: boolean) => {
    isSystemAdminStatus = isMaster;
  },
  getCurrentUser: () => currentUserData,
  findUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    } catch (e) {
      console.warn("findUserByEmail error:", e);
      return null;
    }
  },
  get: async <T = any>(entityPath: string, paramsOrId?: Record<string, any> | string): Promise<T | T[]> => {
    const cacheKey = getCacheKey(entityPath, paramsOrId);

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
            try {
              await updateDoc(doc(db, "users", user.uid), { role: "master" });
            } catch (e) {
              console.warn("Could not update master role:", e);
            }
            userData.role = "master";
            currentUserData.role = "master";
          }
          if (userData.company_id || (Array.isArray(userData.company_ids) && userData.company_ids.length > 0)) {
            const initialCompanyId = userData.company_id || userData.company_ids[0];
            if (initialCompanyId && (userData.role === "master" || userData.is_active)) {
              api.setCompanyId(initialCompanyId);
            }
          }
          saveToLocalCache(cacheKey, currentUserData);
          return currentUserData as T;
        } else {
          const newUser = {
            email: user.email || '',
            full_name: user.displayName || user.email?.split("@")[0] || "Usuário",
            role: isMasterEmail ? "master" : "user",
            company_id: null,
            company_ids: [],
            created_at: serverTimestamp(),
            is_active: isMasterEmail ? true : false,
            avatar: user.photoURL || null
          };
          try {
            await setDoc(doc(db, "users", user.uid), newUser);
          } catch (e) {
            console.warn("Could not setDoc for me:", e);
          }
          currentUserData = { id: user.uid, ...newUser } as User;
          saveToLocalCache(cacheKey, currentUserData);
          return currentUserData as T;
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn("Firestore error in get('me') - using cached fallback:", error.message);
        }
        const cached = getFromLocalCache<User>(cacheKey);
        if (cached) {
          currentUserData = cached;
          return cached as T;
        }
        // Fallback
        currentUserData = {
          id: user.uid,
          email: user.email || '',
          full_name: user.displayName || user.email?.split("@")[0] || "Usuário",
          role: isMasterEmail ? "master" : "user",
          company_id: null,
          company_ids: [],
          is_active: isMasterEmail ? true : false,
          avatar: user.photoURL || null,
          created_at: new Date().toISOString()
        } as User;
        return currentUserData as T;
      }
    }

    const pathSegments = entityPath.split("/");
    const isDocumentPath = pathSegments.length % 2 === 0;
    const baseEntity = pathSegments[0];
    const isCompanyEntity = baseEntity === "companies";

    if (typeof paramsOrId === "string" || isDocumentPath) {
      const targetId = typeof paramsOrId === "string" ? paramsOrId : pathSegments[pathSegments.length - 1];
      
      // Access security check for specific company document
      if (isCompanyEntity && !isSystemAdminStatus && currentUserData && currentUserData.role !== 'master') {
        const userCompanyIds = Array.isArray(currentUserData.company_ids) && currentUserData.company_ids.length > 0
          ? currentUserData.company_ids
          : (currentUserData.company_id ? [currentUserData.company_id] : []);
        
        if (targetId && !userCompanyIds.includes(targetId)) {
          throw new Error("Acesso negado: você não tem permissão para acessar esta empresa.");
        }
      }

      let docRef;
      if (typeof paramsOrId === "string") {
        docRef = doc(db, entityPath, paramsOrId);
      } else {
        docRef = doc(db, entityPath);
      }
      
      try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const cached = getFromLocalCache<T>(cacheKey);
          if (cached) return cached;
          throw new Error("Not found");
        }
        const data = docSnap.data();
        const result = { id: docSnap.id, ...(typeof data === 'object' && data !== null ? data : {}) } as T;
        saveToLocalCache(cacheKey, result);
        return result;
      } catch (err: any) {
        console.warn(`Firestore getDoc fallback for ${entityPath}:`, err?.message || err);
        const cached = getFromLocalCache<T>(cacheKey);
        if (cached) return cached;
        throw err;
      }
    } else {
      try {
        let q: Query<DocumentData> = collection(db, entityPath);
        const conditions: QueryConstraint[] = [];

        if (paramsOrId && typeof paramsOrId === "object") {
          Object.keys(paramsOrId).forEach(key => {
            if (paramsOrId[key] !== undefined && key !== "_all" && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit") {
              conditions.push(where(key, "==", paramsOrId[key]));
            }
          });
        }

        const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

        if (entityPath === "users") {
          if (paramsOrId && (paramsOrId._all || paramsOrId.all) && isSystemAdminStatus) {
            const snap = await getDocs(collection(db, "users"));
            const results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
            saveToLocalCache(cacheKey, results);
            return results;
          }

          const companyId = currentCompanyId || await api.waitForCompany(2000);
          if (!companyId) {
            if (isSystemAdminStatus || currentUserData?.role === "master") {
              const snap = await getDocs(collection(db, "users"));
              const results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
              saveToLocalCache(cacheKey, results);
              return results;
            }
            console.warn(`Race condition avoided: Cannot query users without company_id. Throwing to trigger retry.`);
            throw new Error("Pendente de company_id");
          }

          const [q1Snap, q2Snap, q3Snap] = await Promise.all([
            getDocs(query(collection(db, "users"), where("company_ids", "array-contains", companyId))).catch(() => ({ docs: [] } as any)),
            getDocs(query(collection(db, "users"), where("company_id", "==", companyId))).catch(() => ({ docs: [] } as any)),
            getDocs(query(collection(db, "employees"), where("company_id", "==", companyId))).catch(() => ({ docs: [] } as any))
          ]);

          const userMap = new Map<string, any>();
          q1Snap.docs.forEach((d: any) => userMap.set(d.id, { id: d.id, ...d.data() }));
          q2Snap.docs.forEach((d: any) => userMap.set(d.id, { id: d.id, ...d.data() }));
          q3Snap.docs.forEach((d: any) => {
            if (!userMap.has(d.id)) {
              userMap.set(d.id, { id: d.id, ...d.data() });
            }
          });

          let combined = Array.from(userMap.values());

          if (paramsOrId && typeof paramsOrId === "object") {
            Object.keys(paramsOrId).forEach(key => {
              if (paramsOrId[key] !== undefined && key !== "_all" && key !== "all" && key !== "_orderBy" && key !== "_orderDir" && key !== "_limit") {
                combined = combined.filter(item => item[key] === paramsOrId[key]);
              }
            });
          }

          saveToLocalCache(cacheKey, combined);
          return combined as T[];
        }

        if (requiresIsolation) {
          const companyId = await api.waitForCompany(2000);
          if (!companyId) {
            console.warn(`Race condition avoided: Cannot query ${entityPath} without company_id. Throwing to trigger retry.`);
            throw new Error("Pendente de company_id");
          }
          conditions.push(where("company_id", "==", companyId));
        } else if (isSystemAdminStatus && !paramsOrId?.company_id && (currentCompanyId || await api.waitForCompany(500)) && !(paramsOrId && (paramsOrId._all || paramsOrId.all)) && !isCompanyEntity) {
          conditions.push(where("company_id", "==", currentCompanyId));
        }

        const queryConstraints: QueryConstraint[] = [...conditions];
        
        if (paramsOrId && typeof paramsOrId === "object") {
          // Server-side date range constraints
          if (paramsOrId._dateField && paramsOrId._startDate) {
            queryConstraints.push(where(paramsOrId._dateField, ">=", paramsOrId._startDate));
          }
          if (paramsOrId._dateField && paramsOrId._endDate) {
            queryConstraints.push(where(paramsOrId._dateField, "<=", paramsOrId._endDate));
          }

          if (paramsOrId._orderBy) {
            queryConstraints.push(orderBy(paramsOrId._orderBy as string, (paramsOrId._orderDir as OrderByDirection) || "asc"));
          }
          if (paramsOrId._startAfter) {
            queryConstraints.push(startAfter(paramsOrId._startAfter));
          }
          if (paramsOrId._limit) {
            queryConstraints.push(limit(paramsOrId._limit as number));
          }
        }

        if (queryConstraints.length > 0) {
          q = query(q, ...queryConstraints);
        }

        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            name: data.name || data.trade_name || data.fantasy_name || "Minha Empresa",
            ...(typeof data === 'object' && data !== null ? data : {}) 
          };
        }) as T[];

        // Filter company list for non-master users to only assigned & active companies
        if (isCompanyEntity && !isSystemAdminStatus && currentUserData && currentUserData.role !== 'master') {
          const userCompanyIds = Array.isArray(currentUserData.company_ids) && currentUserData.company_ids.length > 0
            ? currentUserData.company_ids
            : (currentUserData.company_id ? [currentUserData.company_id] : []);
          
          const filtered = (results as any[]).filter((c: any) => 
            c.is_active !== false && userCompanyIds.includes(c.id)
          );

          if (filtered.length < userCompanyIds.length) {
            const loadedIds = new Set(filtered.map(c => c.id));
            const missingIds = userCompanyIds.filter(id => !loadedIds.has(id));
            
            if (missingIds.length > 0) {
              const extraDocs = await Promise.all(
                missingIds.map(async (id) => {
                  try {
                    const snap = await getDoc(doc(db, "companies", id));
                    if (snap.exists()) {
                      const d = snap.data();
                      return { 
                        id: snap.id, 
                        name: d.name || d.trade_name || d.fantasy_name || "Minha Empresa",
                        ...d 
                      };
                    }
                  } catch (e) {
                    console.warn("Could not fetch company doc directly:", id, e);
                  }
                  return null;
                })
              );
              const extraValid = extraDocs.filter(Boolean).filter((c: any) => c.is_active !== false);
              const finalCompanies = [...filtered, ...extraValid] as T[];
              saveToLocalCache(cacheKey, finalCompanies);
              return finalCompanies;
            }
          }

          saveToLocalCache(cacheKey, filtered);
          return filtered as T[];
        }

        saveToLocalCache(cacheKey, results);
        return results;
      } catch (err: any) {
        console.warn(`Firestore getDocs fallback for ${entityPath}:`, err?.message || err);
        const cached = getFromLocalCache<T[]>(cacheKey);
        if (cached) return cached;
        return [] as T[];
      }
    }
  },
  post: async <T = any>(entity: string, data: Partial<T> | Record<string, any>): Promise<T> => {
    const payload = cleanObject({ ...data }) as Record<string, any>;
    
    if (currentCompanyId && entity !== "companies" && entity !== "users") {
      if (!isSystemAdminStatus || !payload.company_id) {
        payload.company_id = currentCompanyId;
      }
    }

    if (!payload.created_at) {
      payload.created_at = serverTimestamp();
    }

    const generatedId = (payload.id as string) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const docId = (payload.id as string) || generatedId;
    const itemWithId = { id: docId, ...payload } as T;

    try {
      const newDocRef = doc(collection(db, entity), docId);
      await setDoc(newDocRef, payload);
    } catch (e: any) {
      console.warn(`Firestore post to ${entity} error (fallback to local state):`, e?.message || e);
    }

    // Invalidate local cache for entity
    try {
      const listCacheKey = getCacheKey(entity, undefined);
      const cachedList = getFromLocalCache<any[]>(listCacheKey) || [];
      const updatedList = [itemWithId, ...cachedList.filter(item => item.id !== docId)];
      saveToLocalCache(listCacheKey, updatedList);
    } catch (e) {
      console.warn("Could not update local cache after post:", e);
    }

    return itemWithId;
  },
  put: async <T = any>(entity: string, id: string, data: Partial<T> | Record<string, any>): Promise<T> => {
    const payload = cleanObject(data) as Record<string, any>;
    const itemWithId = { id, ...payload } as T;

    try {
      const docRef = doc(db, entity, id);
      await updateDoc(docRef, payload);
    } catch (e: any) {
      console.warn(`Firestore put to ${entity}/${id} error (fallback to local state):`, e?.message || e);
    }

    if (entity === "users" && currentUserData && (currentUserData.id === id || (currentUserData as any).uid === id)) {
      api.updateCurrentUserData({ ...currentUserData, ...payload });
    }

    // Invalidate and update local cache for entity
    try {
      const listCacheKey = getCacheKey(entity, undefined);
      const cachedList = getFromLocalCache<any[]>(listCacheKey) || [];
      const updatedList = cachedList.map(item => item.id === id ? { ...item, ...payload } : item);
      saveToLocalCache(listCacheKey, updatedList);
    } catch (e) {
      console.warn("Could not update local cache after put:", e);
    }

    return itemWithId;
  },
  delete: async (entity: string, id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, entity, id);
      await deleteDoc(docRef);
    } catch (e: any) {
      console.warn(`Firestore delete on ${entity}/${id} error:`, e?.message || e);
    }

    if (entity !== "audit_logs") {
      api.log({
        action: 'DELETE',
        entity,
        entity_id: id,
        description: `Exclusão de registro em ${entity} (ID: ${id})`
      }).catch(() => {});
    }

    // 1. Purge from all localStorage cache keys
    removeFromLocalCacheAcrossKeys(entity, id);

    // 2. Purge from IndexedDB offline storage queues if present
    try {
      await offlineStore.removeRecordFromAllStores(id);
    } catch (e) {
      console.warn(`Could not remove ${id} from offlineStore:`, e);
    }

    // 3. Purge from TanStack Query in-memory and persistent cache
    try {
      // Invalidate queries for this entity
      queryClient.invalidateQueries({ queryKey: [entity] });
      // Optimistically remove/filter out the deleted record from active query caches
      queryClient.setQueriesData({ queryKey: [entity] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.filter((item: any) => item?.id !== id);
        }
        if (typeof oldData === "object" && Array.isArray(oldData.items)) {
          return {
            ...oldData,
            items: oldData.items.filter((item: any) => item?.id !== id)
          };
        }
        if (typeof oldData === "object" && oldData.id === id) {
          return null;
        }
        return oldData;
      });
      // Remove individual query entry if cached by specific ID
      queryClient.removeQueries({ queryKey: [entity, id] });
    } catch (e) {
      console.warn(`Could not purge ${entity}/${id} from queryClient:`, e);
    }

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

      try {
        const unsub = onSnapshot(
          q, 
          (snapshot: QuerySnapshot<DocumentData>) => {
            const data = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() }));
            callback(data as T[]);
          },
          (error) => {
            console.warn(`Subscription onSnapshot notice for ${entityPath}:`, error?.message || error);
            // Fallback to local cache if quota limit or network issue
            const cached = getFromLocalCache<T[]>(getCacheKey(entityPath, params));
            if (cached) callback(cached);
          }
        );

        unsubscribe = unsub;
      } catch (err) {
        console.warn(`Error setting up onSnapshot for ${entityPath}:`, err);
        const cached = getFromLocalCache<T[]>(getCacheKey(entityPath, params));
        if (cached) callback(cached);
      }
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

    const sanitizedData = sanitizeLogPayload(data);

    const logData = {
      ...sanitizedData,
      user_id: userContext?.id || (user as any).uid || (user as any).id,
      user_name: userContext?.full_name || (userContext as any)?.email || currentUserData?.full_name || (user as any).email || "Sistema",
      timestamp: serverTimestamp(),
      company_id: sanitizedData.company_id || userContext?.company_id || currentCompanyId
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

  // Server-side Count aggregation (Only 1 document read charged by Firestore)
  count: async (entityPath: string, params?: Record<string, any>): Promise<number> => {
    try {
      let q: Query<DocumentData> = collection(db, entityPath);
      const conditions: QueryConstraint[] = [];

      const isCompanyEntity = entityPath === "companies";
      const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

      const companyId = requiresIsolation 
        ? (currentCompanyId || await api.waitForCompany(2000))
        : (isSystemAdminStatus && !params?._all && !isCompanyEntity ? (currentCompanyId || await api.waitForCompany(500)) : null);

      if (requiresIsolation && !companyId) return 0;
      if (companyId) {
        conditions.push(where("company_id", "==", companyId));
      }

      if (params && typeof params === "object") {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && !key.startsWith("_")) {
            conditions.push(where(key, "==", params[key]));
          }
        });
        if (params._dateField && params._startDate) {
          conditions.push(where(params._dateField, ">=", params._startDate));
        }
        if (params._dateField && params._endDate) {
          conditions.push(where(params._dateField, "<=", params._endDate));
        }
      }

      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (err) {
      console.warn(`api.count fallback for ${entityPath}:`, err);
      // Fallback: estimate from local cache if possible
      const cached = getFromLocalCache<any[]>(getCacheKey(entityPath, params));
      return cached ? cached.length : 0;
    }
  },

  // Server-side Aggregations (sum, average, count) - (Only 1 document read charged by Firestore)
  aggregate: async (
    entityPath: string, 
    specs: { sum?: string[]; average?: string[]; count?: boolean },
    params?: Record<string, any>
  ): Promise<{ sums: Record<string, number>; averages: Record<string, number>; count: number }> => {
    try {
      let q: Query<DocumentData> = collection(db, entityPath);
      const conditions: QueryConstraint[] = [];

      const isCompanyEntity = entityPath === "companies";
      const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

      const companyId = requiresIsolation 
        ? (currentCompanyId || await api.waitForCompany(2000))
        : (isSystemAdminStatus && !params?._all && !isCompanyEntity ? (currentCompanyId || await api.waitForCompany(500)) : null);

      if (requiresIsolation && !companyId) {
        return { sums: {}, averages: {}, count: 0 };
      }
      if (companyId) {
        conditions.push(where("company_id", "==", companyId));
      }

      if (params && typeof params === "object") {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && !key.startsWith("_")) {
            conditions.push(where(key, "==", params[key]));
          }
        });
        if (params._dateField && params._startDate) {
          conditions.push(where(params._dateField, ">=", params._startDate));
        }
        if (params._dateField && params._endDate) {
          conditions.push(where(params._dateField, "<=", params._endDate));
        }
      }

      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }

      const aggMap: Record<string, any> = {};
      if (specs.count !== false) {
        aggMap.totalCount = count();
      }
      if (specs.sum) {
        specs.sum.forEach(field => {
          aggMap[`sum_${field}`] = sum(field);
        });
      }
      if (specs.average) {
        specs.average.forEach(field => {
          aggMap[`avg_${field}`] = average(field);
        });
      }

      const snapshot = await getAggregateFromServer(q, aggMap);
      const data = snapshot.data();

      const sums: Record<string, number> = {};
      if (specs.sum) {
        specs.sum.forEach(field => {
          sums[field] = Number(data[`sum_${field}`]) || 0;
        });
      }

      const averages: Record<string, number> = {};
      if (specs.average) {
        specs.average.forEach(field => {
          averages[field] = Number(data[`avg_${field}`]) || 0;
        });
      }

      return {
        sums,
        averages,
        count: Number(data.totalCount) || 0
      };
    } catch (err) {
      console.warn(`api.aggregate fallback for ${entityPath}:`, err);
      return { sums: {}, averages: {}, count: 0 };
    }
  },

  // Resilient Cursor-based Pagination
  getPage: async <T = any>(
    entityPath: string, 
    options: {
      pageSize?: number;
      cursorDoc?: QueryDocumentSnapshot<DocumentData> | null;
      params?: Record<string, any>;
      orderByField?: string;
      orderDir?: OrderByDirection;
      dateField?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PageResult<T>> => {
    const pageSize = options.pageSize || 25;
    try {
      let q: Query<DocumentData> = collection(db, entityPath);
      const conditions: QueryConstraint[] = [];

      const isCompanyEntity = entityPath === "companies";
      const requiresIsolation = !isSystemAdminStatus && !isCompanyEntity;

      const companyId = requiresIsolation 
        ? (currentCompanyId || await api.waitForCompany(2000))
        : (isSystemAdminStatus && !options.params?._all && !isCompanyEntity ? (currentCompanyId || await api.waitForCompany(500)) : null);

      if (requiresIsolation && !companyId) {
        return { items: [], lastDoc: null, hasMore: false, totalCount: 0 };
      }
      if (companyId) {
        conditions.push(where("company_id", "==", companyId));
      }

      if (options.params && typeof options.params === "object") {
        Object.keys(options.params).forEach(key => {
          if (options.params![key] !== undefined && !key.startsWith("_")) {
            conditions.push(where(key, "==", options.params![key]));
          }
        });
      }

      if (options.dateField && options.startDate) {
        conditions.push(where(options.dateField, ">=", options.startDate));
      }
      if (options.dateField && options.endDate) {
        conditions.push(where(options.dateField, "<=", options.endDate));
      }

      const queryConstraints: QueryConstraint[] = [...conditions];

      const sortField = options.orderByField || options.dateField || "created_at";
      const sortDir = options.orderDir || "desc";
      queryConstraints.push(orderBy(sortField, sortDir));

      if (options.cursorDoc) {
        queryConstraints.push(startAfter(options.cursorDoc));
      }

      // Fetch +1 to detect if there is a next page
      queryConstraints.push(limit(pageSize + 1));

      q = query(q, ...queryConstraints);
      const snapshot = await getDocs(q);

      const hasMore = snapshot.docs.length > pageSize;
      const docsToReturn = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
      const lastDoc = docsToReturn.length > 0 ? docsToReturn[docsToReturn.length - 1] : null;

      const items = docsToReturn.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as T[];

      return {
        items,
        lastDoc,
        hasMore
      };
    } catch (err: any) {
      console.warn(`api.getPage fallback for ${entityPath}:`, err?.message || err);
      return { items: [], lastDoc: null, hasMore: false };
    }
  },

  // Daily Summary Rollups (reads 30 documents instead of thousands of raw sales/expenses)
  getDailySummaries: async (
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Array<{
    id: string;
    date: string;
    company_id: string;
    sales_count: number;
    sales_total: number;
    sales_cost_total: number;
    purchases_total: number;
    expenses_total: number;
    receipts_total: number;
  }>> => {
    try {
      const q = query(
        collection(db, "companies", companyId, "daily_summaries"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    } catch (e) {
      console.warn("api.getDailySummaries error (trying root fallback):", e);
      try {
        const qRoot = query(
          collection(db, "daily_summaries"),
          where("company_id", "==", companyId),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(qRoot);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      } catch (e2) {
        console.warn("Root daily_summaries fallback error:", e2);
        return [];
      }
    }
  },

  // Increments / updates a daily rollup doc
  updateDailySummary: async (
    companyId: string,
    date: string,
    deltas: {
      sales_count?: number;
      sales_total?: number;
      sales_cost_total?: number;
      purchases_total?: number;
      expenses_total?: number;
      receipts_total?: number;
    }
  ): Promise<void> => {
    if (!companyId || !date) return;
    const summaryRef = doc(db, "companies", companyId, "daily_summaries", date);
    const updatePayload: Record<string, any> = {
      date,
      company_id: companyId,
      updated_at: serverTimestamp()
    };

    if (deltas.sales_count !== undefined) updatePayload.sales_count = increment(deltas.sales_count);
    if (deltas.sales_total !== undefined) updatePayload.sales_total = increment(deltas.sales_total);
    if (deltas.sales_cost_total !== undefined) updatePayload.sales_cost_total = increment(deltas.sales_cost_total);
    if (deltas.purchases_total !== undefined) updatePayload.purchases_total = increment(deltas.purchases_total);
    if (deltas.expenses_total !== undefined) updatePayload.expenses_total = increment(deltas.expenses_total);
    if (deltas.receipts_total !== undefined) updatePayload.receipts_total = increment(deltas.receipts_total);

    try {
      await setDoc(summaryRef, updatePayload, { merge: true });
    } catch (err) {
      console.warn("Could not update daily summary:", err);
    }
  }
};
