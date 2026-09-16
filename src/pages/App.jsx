import React, { useEffect, useState } from 'react';
import { UIProvider, useUI } from '../store.jsx';
import AppShell from '../components/AppShell.jsx';

import JourneyPage from './JourneyPage.jsx';
import PipelinesPage from './PipelinesPage.jsx';
import PipelineBuilderPage from './PipelineBuilderPage.jsx';
import ViewPortfolioPage from './ViewPortfolioPage.jsx';
import WorklistsPage from './WorklistsPage.jsx';
import ContactabilityPage from './ContactabilityPage.jsx';
import EnrichPortfolioPage from './EnrichPortfolioPage.jsx';
import CohortIntelligencePage from './CohortIntelligencePage.jsx';
import BorrowerPage from './BorrowerPage.jsx';
import TemplatesPage from './TemplatesPage.jsx';
import WorkflowsPage from './WorkflowsPage.jsx';
import JourneysPage from './JourneysPage.jsx';
import LinkAnalyticsPage from './LinkAnalyticsPage.jsx';
import WhatsAppSendPage from './WhatsAppSendPage.jsx';
import WhatsAppAdminPage from './WhatsAppAdminPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import StaffConsolePage from './StaffConsolePage.jsx';
import OrgAdminPage from './OrgAdminPage.jsx';
import OrgManagerPage from './OrgManagerPage.jsx';
import LoginPage from './LoginPage.jsx';
import BorrowerPortalPage from './BorrowerPortalPage.jsx';

const PAGES = {
  journey: JourneyPage,
  pipelines: PipelinesPage,
  pipelineBuilder: PipelineBuilderPage,
  viewPortfolio: ViewPortfolioPage,
  worklists: WorklistsPage,
  contactability: ContactabilityPage,
  enrich: EnrichPortfolioPage,
  cohorts: CohortIntelligencePage,
  borrower: BorrowerPage,
  templates: TemplatesPage,
  workflows: WorkflowsPage,
  journeys: JourneysPage,
  linkAnalytics: LinkAnalyticsPage,
  whatsapp: WhatsAppSendPage,
  whatsappAdmin: WhatsAppAdminPage,
  settings: SettingsPage,
};

function Console() {
  const { section } = useUI();
  const Page = PAGES[section] || CohortIntelligencePage;
  return (
    <AppShell>
      <Page />
    </AppShell>
  );
}

// Prototype-only: a small switcher so the PM can preview the screens that live
// OUTSIDE the console (login, the public borrower portal, the Saralya staff
// console). None of this exists in the real app.
function ViewSwitcher({ view, setView }) {
  const opts = [
    ['console', 'Console'],
    ['staff', 'Staff console'],
    ['orgAdmin', 'Org Admin'],
    ['orgManager', 'Org Manager'],
    ['login', 'Login'],
    ['portal', 'Borrower portal'],
  ];
  return (
    <div className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-white/95 p-1 text-[11px] font-bold shadow-pop backdrop-blur">
      <span className="px-2 text-[9px] uppercase tracking-wide text-muted">Preview</span>
      {opts.map(([k, l]) => (
        <button
          key={k}
          onClick={() => setView(k)}
          className={
            'rounded-full px-2.5 py-1.5 transition ' +
            (view === k ? 'bg-gradient-to-br from-brand to-brand-2 text-white' : 'text-slate-600 hover:bg-slate-100')
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const VIEWS = ['console', 'staff', 'orgAdmin', 'orgManager', 'login', 'portal'];
const viewFromHash = () => {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  return VIEWS.includes(h) ? h : 'console';
};

export default function App() {
  // The preview view is mirrored to the URL hash (#/staff, #/login, #/portal)
  // so a particular screen can be bookmarked or linked, and the pill just sets
  // the hash.
  const [view, setView] = useState(viewFromHash);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (v) => {
    window.location.hash = v === 'console' ? '/' : `/${v}`;
    setView(v);
  };

  return (
    <UIProvider>
      {view === 'console' && <Console />}
      {view === 'staff' && <StaffConsolePage />}
      {view === 'orgAdmin' && <OrgAdminPage />}
      {view === 'orgManager' && <OrgManagerPage />}
      {view === 'login' && <LoginPage />}
      {view === 'portal' && <BorrowerPortalPage />}
      <ViewSwitcher view={view} setView={go} />
    </UIProvider>
  );
}
