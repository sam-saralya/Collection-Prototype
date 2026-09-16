import React from 'react';
import StaffShell from '../components/StaffShell.jsx';
import { StaffProvider, useStaff } from './staff/store.jsx';
import OrganizationsPage from './staff/OrganizationsPage.jsx';
import OnboardOrgPage from './staff/OnboardOrgPage.jsx';
import PricingPage from './staff/PricingPage.jsx';
import IvrConfigPage from './staff/IvrConfigPage.jsx';
import WhatsAppMetaPage from './staff/WhatsAppMetaPage.jsx';
import { ComingSoon } from './staff/shared.jsx';

function Section() {
  const { section } = useStaff();
  switch (section) {
    case 'organizations':
      return <OrganizationsPage />;
    case 'onboard':
      return <OnboardOrgPage />;
    case 'billing':
      return <PricingPage />;
    case 'ivr':
      return <IvrConfigPage />;
    case 'whatsapp':
      return <WhatsAppMetaPage />;
    case 'audit':
      return (
        <ComingSoon title="Audit log is on the way">
          A filterable timeline of who did what, when, and against which tenant — including the break-glass password
          reveals from the Organizations page.
        </ComingSoon>
      );
    case 'health':
      return (
        <ComingSoon title="Delivery & health is on the way">
          Bounce rates, provider incidents, DLT rejections and a per-tenant sending health score.
        </ComingSoon>
      );
    case 'platform':
      return (
        <ComingSoon title="Platform settings is on the way">
          The Saralya-owned defaults every tenant falls back to, plus feature flags and rollout controls.
        </ComingSoon>
      );
    default:
      return <OrganizationsPage />;
  }
}

export default function StaffConsolePage() {
  return (
    <StaffProvider>
      <StaffShell>
        <Section />
      </StaffShell>
    </StaffProvider>
  );
}
