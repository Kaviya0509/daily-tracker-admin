import {
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  type DocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MenteeReport, ReportFilters, DashboardStats, UserProfile } from "@/types";

const REPORTS_COLLECTION = "menteeReports";
const USERS_COLLECTION = "users";

export const DEFAULT_MENTEES: UserProfile[] = [];

export const DEFAULT_REPORTS: MenteeReport[] = [];

const SYNC_API = "http://localhost:5050/api/reports";
const MENTEES_SYNC_API = "http://localhost:5050/api/mentees";

async function fetchFromBridge<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // bridge offline or timeout
  }
  return null;
}

async function syncToBridge(method: string, url: string, payload?: any) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // ignore
  }
}

export const getAllReports = async (
  filters: ReportFilters,
  pageSize: number = 25,
  _lastDoc?: DocumentSnapshot
): Promise<{ reports: MenteeReport[]; lastDocument: DocumentSnapshot | null; total: number }> => {
  let firestoreReports: MenteeReport[] = [];
  try {
    const q = query(collection(db, REPORTS_COLLECTION), limit(pageSize * 2));
    const snapshot = await getDocs(q);
    firestoreReports = snapshot.docs.map((docSnap) => ({
      reportId: docSnap.id,
      ...docSnap.data(),
    })) as MenteeReport[];
  } catch (err) {
    console.warn("Could not fetch reports from Firestore directly:", err);
  }

  // Fetch reports from live bridge
  const bridgeReports = (await fetchFromBridge<MenteeReport[]>(SYNC_API)) || [];

  // Merge real reports (prioritizing Firestore documents, then live bridge)
  const combinedMap = new Map<string, MenteeReport>();

  // Add Firestore reports first
  for (const r of firestoreReports) {
    combinedMap.set(r.reportId, r);
  }

  // Add live bridge reports
  for (const r of bridgeReports) {
    if (!combinedMap.has(r.reportId)) {
      combinedMap.set(r.reportId, r);
    }
  }

  // ONLY if there are absolutely zero real reports, use demo fallback
  if (combinedMap.size === 0) {
    for (const r of DEFAULT_REPORTS) {
      combinedMap.set(r.reportId, r);
    }
  }

  const combined = Array.from(combinedMap.values());

  // Client-side filtering (robust, handles any filter combinations)
  let filtered = combined.filter((r) => {
    if (filters.startDate && r.reportDate < filters.startDate) return false;
    if (filters.endDate && r.reportDate > filters.endDate) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.menteeUid && r.menteeUid !== filters.menteeUid) return false;
    if (filters.search) {
      const qLower = filters.search.toLowerCase();
      const match =
        r.menteeName.toLowerCase().includes(qLower) ||
        r.currentTask.toLowerCase().includes(qLower) ||
        r.shortDescription.toLowerCase().includes(qLower) ||
        (r.managerLead && r.managerLead.toLowerCase().includes(qLower));
      if (!match) return false;
    }
    return true;
  });

  // Sort descending by date
  filtered.sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  return { reports: filtered.slice(0, pageSize), lastDocument: null, total: filtered.length };
};

export const getReportById = async (reportId: string): Promise<MenteeReport | null> => {
  // Check bridge first for latest data
  const bridgeReports = await fetchFromBridge<MenteeReport[]>(SYNC_API);
  if (bridgeReports) {
    const found = bridgeReports.find((r) => r.reportId === reportId);
    if (found) return found;
  }

  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { reportId: docSnap.id, ...docSnap.data() } as MenteeReport;
    }
  } catch {
    // ignore
  }

  // Fallback to default reports
  const fallback = DEFAULT_REPORTS.find((r) => r.reportId === reportId);
  return fallback || null;
};

export const updateReport = async (
  reportId: string,
  data: Partial<MenteeReport>
): Promise<void> => {
  // Update Firestore
  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch {
    // Firestore might reject or be offline
  }

  // Sync to live bridge
  await syncToBridge("PUT", `${SYNC_API}/${encodeURIComponent(reportId)}`, data);

  // Update in-memory fallback
  const idx = DEFAULT_REPORTS.findIndex((r) => r.reportId === reportId);
  if (idx !== -1) {
    DEFAULT_REPORTS[idx] = { ...DEFAULT_REPORTS[idx], ...data, updatedAt: Timestamp.now() };
  }
};

export const deleteReport = async (reportId: string): Promise<void> => {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(docRef);
  } catch {
    // ignore
  }

  await syncToBridge("DELETE", `${SYNC_API}/${encodeURIComponent(reportId)}`);

  const idx = DEFAULT_REPORTS.findIndex((r) => r.reportId === reportId);
  if (idx !== -1) {
    DEFAULT_REPORTS.splice(idx, 1);
  }
};

export const getReportsForExport = async (
  filters: ReportFilters
): Promise<MenteeReport[]> => {
  const result = await getAllReports(filters, 500);
  return result.reports;
};

export const getDashboardStats = async (date: string): Promise<DashboardStats> => {
  const mentees = await getActiveMentees();
  const totalActiveMentees = mentees.length;

  const reportsResult = await getAllReports(
    {
      search: "",
      startDate: "",
      endDate: "",
      menteeUid: "",
      status: "",
    },
    200
  );

  const todayReports = reportsResult.reports.filter((r) => r.reportDate === date);
  const reportsSubmittedToday = todayReports.length;
  const inProgress = todayReports.filter((r) => r.status === "In Progress").length;
  const blocked = todayReports.filter((r) => r.status === "Blocked").length;
  const completed = todayReports.filter((r) => r.status === "Completed").length;

  const submittedUids = new Set(todayReports.map((r) => r.menteeUid));
  const missingToday = Math.max(0, totalActiveMentees - submittedUids.size);

  return {
    totalActiveMentees,
    reportsSubmittedToday,
    inProgress,
    blocked,
    completed,
    missingToday,
  };
};

export const getActiveMentees = async (): Promise<UserProfile[]> => {
  let firestoreMentees: UserProfile[] = [];
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("role", "==", "mentee"),
      where("active", "==", true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.size > 0) {
      firestoreMentees = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...docSnap.data(),
      })) as UserProfile[];
    }
  } catch {
    // ignore
  }

  const bridgeMentees = (await fetchFromBridge<UserProfile[]>(MENTEES_SYNC_API)) || [];
  const realMentees = [...firestoreMentees, ...bridgeMentees];
  const menteeMap = new Map<string, UserProfile>();

  if (realMentees.length > 0) {
    for (const m of realMentees) {
      menteeMap.set(m.uid, m);
    }
  } else {
    for (const m of DEFAULT_MENTEES) {
      menteeMap.set(m.uid, m);
    }
  }

  return Array.from(menteeMap.values());
};

export const addMentee = async (
  mentee: Omit<UserProfile, "uid" | "createdAt">
): Promise<UserProfile> => {
  const uid = `mentee_${Date.now()}`;
  const newMentee: UserProfile = {
    ...mentee,
    uid,
    createdAt: Timestamp.now(),
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), newMentee);
  } catch {
    // continue
  }

  await syncToBridge("POST", MENTEES_SYNC_API, newMentee);

  DEFAULT_MENTEES.unshift(newMentee);
  return newMentee;
};
