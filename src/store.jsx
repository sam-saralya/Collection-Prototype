import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PIPELINES, REPORTS, DEFAULT_WORKLISTS } from './data.js';
import { loadPersisted, savePersisted } from './persist.js';

// A tiny stand-in for the production app's four React contexts + router.
// Pages call `useUI()` exactly as they do in the real client; here it is backed
// by plain state instead of URL routing and an API.

// Grouped console navigation.
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: '▦' },
      { key: 'analytics', label: 'Analytics', icon: '◈' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { key: 'viewPortfolio', label: 'View Portfolio', icon: '≣' },
      { key: 'enrich', label: 'Enrich Portfolio', icon: '⊕' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { key: 'pipelines', label: 'Collection Workflow', icon: '⛓' },
      { key: 'ptp', label: 'Promise to Pay', icon: '☑' },
      { key: 'ptpReminders', label: 'PTP Reminders', icon: '🔔' },
      { key: 'workflows', label: 'EMI Reminders', icon: '⌁' },
    ],
  },
  {
    label: 'Reports',
    items: [{ key: 'reports', label: 'Reports', icon: '▤' }],
  },
  {
    label: 'Settings',
    items: [{ key: 'settings', label: 'Account & Settings', icon: '⚙' }],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const DEFAULT_SECTION = 'pipelines';

// The borrower profile is a standalone view, not a child of any one section —
// it's opened from Cohort Intelligence, View Portfolio, Contactability, Enrich,
// User Analytics… Closing it returns you to wherever you opened it from; this is
// the fallback when there's no origin (e.g. a fresh deep-link).
const BORROWER_FALLBACK = 'viewPortfolio';
const originFor = (prev) => (prev && prev !== 'borrower' ? prev : BORROWER_FALLBACK);

// The pipeline builder is also a standalone view (not a sidebar drawer) — it's
// only ever opened from the Pipelines list, so closing it always returns there.

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [section, setSectionState] = useState(DEFAULT_SECTION);
  const [borrowerHandle, setBorrowerHandle] = useState(null);
  const [focusCategory, setFocusCategory] = useState(null);
  const [toast, setToast] = useState(null);
  const [prev, setPrev] = useState(DEFAULT_SECTION);

  // Worklists — named, filter-defined slices of the loan book built on View
  // Portfolio. Shared here so Contactability / Enrich can run on them too.
  const [worklists, setWorklists] = useState(DEFAULT_WORKLISTS);
  const [focusWorklist, setFocusWorklist] = useState(null);
  const addWorklist = useCallback((wl) => setWorklists((w) => [wl, ...w]), []);
  const removeWorklist = useCallback((id) => setWorklists((w) => w.filter((x) => x.id !== id)), []);
  const removeWorklistMembers = useCallback((id, borrowerIds) => {
    const drop = new Set(borrowerIds);
    setWorklists((w) =>
      w.map((x) => {
        if (x.id !== id) return x;
        const rowIds = x.rowIds.filter((r) => !drop.has(r));
        return { ...x, rowIds, count: rowIds.length };
      })
    );
  }, []);

  // Reports — snapshots of the borrowers who reached a particular outcome
  // partway through a workflow run (created from the run drawer on the
  // Workflows page), then worked by hand: assigned to someone, tracked
  // through a status, remarked on. Shown on their own Reports page.
  const [reports, setReports] = useState(REPORTS);
  const addReport = useCallback((r) => setReports((rs) => [r, ...rs]), []);
  const removeReport = useCallback((id) => setReports((rs) => rs.filter((r) => r.id !== id)), []);
  const setReportStatus = useCallback((id, status) => setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r))), []);
  const updateReportAssignment = useCallback(
    (reportId, borrowerId, patch) =>
      setReports((rs) =>
        rs.map((r) =>
          r.id === reportId
            ? { ...r, assignments: { ...r.assignments, [borrowerId]: { ...r.assignments[borrowerId], ...patch } } }
            : r
        )
      ),
    []
  );

  // Pipelines — lifted up here (rather than local to PipelinesPage) because
  // the builder is now its own full page/section, so the list needs to
  // survive navigating away to it and back.
  const [pipelines, setPipelines] = useState(PIPELINES);
  const [pipelineDraft, setPipelineDraft] = useState(null); // 'new' | pipeline object | null

  const openPipelineBuilder = useCallback((draft) => {
    setPipelineDraft(draft);
    setSectionState('pipelineBuilder');
    window.scrollTo({ top: 0 });
  }, []);
  const closePipelineBuilder = useCallback(() => {
    setSectionState('pipelines');
    setPipelineDraft(null);
    window.scrollTo({ top: 0 });
  }, []);
  const savePipeline = useCallback((pipeline) => {
    setPipelines((ps) => (ps.some((p) => p.id === pipeline.id) ? ps.map((p) => (p.id === pipeline.id ? pipeline : p)) : [pipeline, ...ps]));
    setSectionState('pipelines');
    setPipelineDraft(null);
    window.scrollTo({ top: 0 });
  }, []);
  const removePipeline = useCallback((id) => setPipelines((ps) => ps.filter((p) => p.id !== id)), []);

  // Per-borrower "log an update" entries (payment/PTP/remarks) from the
  // borrower detail view — keyed by borrower handle so they persist across
  // navigating away and back.
  const [borrowerUpdates, setBorrowerUpdates] = useState({});
  const addBorrowerUpdate = useCallback(
    (handle, entry) =>
      setBorrowerUpdates((bu) => ({ ...bu, [handle]: [entry, ...(bu[handle] || [])] })),
    []
  );

  // Persistence: hydrate the bits above from the SQLite-backed server on
  // mount, then push them back on every change (debounced). Nothing here is
  // validated server-side — it's just a JSON blob that survives a reload.
  const hydrated = useRef(false);
  useEffect(() => {
    loadPersisted().then((saved) => {
      if (saved && typeof saved === 'object') {
        if (saved.worklists) setWorklists(saved.worklists);
        if (saved.reports) setReports(saved.reports);
        if (saved.pipelines) setPipelines(saved.pipelines);
        if (saved.borrowerUpdates) setBorrowerUpdates(saved.borrowerUpdates);
      }
      hydrated.current = true;
    });
  }, []);

  const saveTimer = useRef(null);
  useEffect(() => {
    if (!hydrated.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePersisted({ worklists, reports, pipelines, borrowerUpdates });
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [worklists, reports, pipelines, borrowerUpdates]);

  const goTo = useCallback((key, category = null) => {
    setFocusCategory(category);
    setSectionState(key);
    setBorrowerHandle(null);
    window.scrollTo({ top: 0 });
  }, []);

  const openBorrower = useCallback((borrowerOrHandle) => {
    const handle =
      borrowerOrHandle && typeof borrowerOrHandle === 'object'
        ? borrowerOrHandle.refId || borrowerOrHandle._id
        : borrowerOrHandle;
    if (!handle) return;
    setPrev((p) => (section === 'borrower' ? p : section));
    setSectionState('borrower');
    setBorrowerHandle(String(handle).toUpperCase());
    window.scrollTo({ top: 0 });
  }, [section]);

  const closeBorrower = useCallback(() => {
    setSectionState(originFor(prev));
    setBorrowerHandle(null);
    window.scrollTo({ top: 0 });
  }, [prev]);

  const showToast = useCallback((msg, tone = 'default') => {
    setToast({ msg, tone });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(
    () => ({
      section,
      navSection: section === 'borrower' ? originFor(prev) : section === 'pipelineBuilder' ? 'pipelines' : section,
      borrowerHandle,
      setSection: goTo,
      goTo,
      focusCategory,
      setFocusCategory,
      toast,
      showToast,
      openBorrower,
      closeBorrower,
      prefetchedBorrower: null,
      worklists,
      addWorklist,
      removeWorklist,
      removeWorklistMembers,
      focusWorklist,
      setFocusWorklist,
      reports,
      addReport,
      removeReport,
      setReportStatus,
      updateReportAssignment,
      pipelines,
      pipelineDraft,
      openPipelineBuilder,
      closePipelineBuilder,
      savePipeline,
      removePipeline,
      borrowerUpdates,
      addBorrowerUpdate,
    }),
    [
      section,
      prev,
      borrowerHandle,
      goTo,
      focusCategory,
      toast,
      showToast,
      openBorrower,
      closeBorrower,
      worklists,
      addWorklist,
      removeWorklist,
      removeWorklistMembers,
      focusWorklist,
      reports,
      addReport,
      removeReport,
      setReportStatus,
      updateReportAssignment,
      pipelines,
      pipelineDraft,
      openPipelineBuilder,
      closePipelineBuilder,
      savePipeline,
      removePipeline,
      borrowerUpdates,
      addBorrowerUpdate,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
