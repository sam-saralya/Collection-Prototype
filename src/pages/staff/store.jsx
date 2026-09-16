import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useUI } from '../../store.jsx';
import { ALL_ORGANIZATIONS, genPassword } from '../../data.js';

// A small store scoped to the Saralya super-admin ("staff") console.
// It owns the section nav and the in-memory list of tenant organizations that
// the Organizations page and the Onboard page both work with.

export const STAFF_NAV = [
  { key: 'organizations', label: 'Organizations', icon: '◫' },
  { key: 'onboard', label: 'Onboard organization', icon: '＋' },
  { key: 'billing', label: 'Pricing & billing', icon: '₹' },
  { key: 'ivr', label: 'IVR & scripts', icon: '☎' },
  { key: 'whatsapp', label: 'WhatsApp / Meta', icon: '💬' },
  { key: 'audit', label: 'Audit log', icon: '❋' },
  { key: 'health', label: 'Delivery & health', icon: '☰' },
  { key: 'platform', label: 'Platform settings', icon: '⚙' },
];

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const { showToast } = useUI();
  const [section, setSection] = useState('organizations');
  const [organizations, setOrganizations] = useState(ALL_ORGANIZATIONS);
  // The org shown in the "just created" success panel on the Onboard page.
  const [lastCreated, setLastCreated] = useState(null);

  const patchOrg = useCallback((id, patch) => {
    setOrganizations((list) => list.map((o) => (o._id === id ? { ...o, ...patch } : o)));
  }, []);
  const patchOb = useCallback((id, obPatch) => {
    setOrganizations((list) => list.map((o) => (o._id === id ? { ...o, onboarding: { ...o.onboarding, ...obPatch } } : o)));
    setLastCreated((c) => (c && c._id === id ? { ...c, onboarding: { ...c.onboarding, ...obPatch } } : c));
  }, []);

  const resendInvite = useCallback(
    (org) => {
      const ob = org.onboarding;
      if (!ob) return;
      patchOb(org._id, {
        invite_email_status: 'sent',
        invite_error: null,
        invite_sent_at: new Date().toISOString(),
        invite_attempts: (ob.invite_attempts || 1) + 1,
      });
      showToast(`Invite re-sent to ${ob.invite_email_to}`, 'success');
      setTimeout(() => patchOb(org._id, { invite_email_status: 'delivered' }), 1400);
    },
    [patchOb, showToast]
  );

  const toggleActive = useCallback(
    (org) => {
      patchOrg(org._id, { is_active: org.is_active === false });
      showToast(org.is_active === false ? 'Organization reinstated' : 'Organization suspended', 'success');
    },
    [patchOrg, showToast]
  );

  // Called by the Onboard page. `payload` carries the full company profile,
  // documents and plan; only a slice is surfaced in the prototype UI, the rest
  // is just stored on the org object to show the shape.
  const createOrg = useCallback(
    (payload) => {
      const id = 'org_' + Date.now();
      const org = {
        _id: id,
        name: (payload.trade_name || payload.legal_name).trim(),
        legal_name: payload.legal_name.trim(),
        is_active: true,
        created_at: new Date().toISOString(),
        admin: {
          name: payload.admin_name.trim(),
          email: payload.admin_email.trim(),
          phone: payload.admin_phone,
          designation: payload.admin_designation,
          isActive: true,
        },
        sms: {},
        profile: {
          website: payload.website,
          entity_type: payload.entity_type,
          cin: payload.cin,
          gstin: payload.gstin,
          pan: payload.pan,
          address: {
            line1: payload.addr_line1,
            line2: payload.addr_line2,
            city: payload.addr_city,
            state: payload.addr_state,
            pin: payload.addr_pin,
            country: payload.addr_country,
          },
        },
        documents: payload.documents, // { msa:{name}, nda:{name}, ... }
        plan: { tier: payload.plan_tier, billing_email: payload.billing_email, go_live: payload.go_live, notes: payload.notes },
        onboarding: {
          invite_email_status: 'sent',
          invite_email_to: payload.admin_email.trim(),
          invite_sent_at: new Date().toISOString(),
          invite_error: null,
          invite_attempts: 1,
          first_login_at: null,
          password_status: 'temporary',
          temp_password: genPassword(),
        },
      };
      setOrganizations((list) => [org, ...list]);
      setLastCreated(org);
      showToast(`${org.name} created — invite emailed to ${org.admin.email}`, 'success');
      setTimeout(() => patchOb(id, { invite_email_status: 'delivered' }), 1600);
      return org;
    },
    [patchOb, showToast]
  );

  const value = useMemo(
    () => ({
      section,
      setSection,
      organizations,
      lastCreated,
      setLastCreated,
      patchOrg,
      patchOb,
      resendInvite,
      toggleActive,
      createOrg,
      showToast,
    }),
    [section, organizations, lastCreated, patchOrg, patchOb, resendInvite, toggleActive, createOrg, showToast]
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within StaffProvider');
  return ctx;
}
