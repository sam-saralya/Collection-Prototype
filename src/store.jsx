import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PIPELINES } from './data.js';

// A tiny stand-in for the production app's four React contexts + router.
// Pages call `useUI()` exactly as they do in the real client; here it is backed
// by plain state instead of URL routing and an API.

// Grouped console navigation.
export const NAV_GROUPS = [
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
      { key: 'workflows', label: 'EMI Reminders', icon: '⌁' },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { key: 'templates', label: 'Message Templates', icon: '✦' },
      { key: 'whatsappAdmin', label: 'WhatsApp Templates', icon: '✎' },
    ],
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
  const [worklists, setWorklists] = useState([]);
  const [focusWorklist, setFocusWorklist] = useState(null);
  const addWorklist = useCallback((wl) => setWorklists((w) => [wl, ...w]), []);
  const removeWorklist = useCallback((id) => setWorklists((w) => w.filter((x) => x.id !== id)), []);

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
      focusWorklist,
      setFocusWorklist,
      pipelines,
      pipelineDraft,
      openPipelineBuilder,
      closePipelineBuilder,
      savePipeline,
      removePipeline,
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
      focusWorklist,
      pipelines,
      pipelineDraft,
      openPipelineBuilder,
      closePipelineBuilder,
      savePipeline,
      removePipeline,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
