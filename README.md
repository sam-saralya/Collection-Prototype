# Saralya Collections — UI Prototype

A **dummy-data copy of the Saralya Collections console** for design iteration.
No backend, no auth, no API calls — every screen renders from hard-coded data in
`src/data.js`. Use it to lay out how each page should look, then hand the
prototype + notes to the developers as the spec.

## Run it

```bash
cd prototype
npm install
npm run dev        # http://localhost:5180
```

`npm run build` + `npm run preview` for a production build.

## What's in here

The **exact** design system from the real client, copied verbatim so the
prototype looks pixel-identical:

| Prototype file | Copied from |
| --- | --- |
| `src/ui.jsx` | `client/src/ui/index.jsx` (Card, Button, Tag, Field, Modal, Drawer…) |
| `src/styles.css` | `client/src/styles/index.css` |
| `tailwind.config.js` | `client/tailwind.config.js` (all the brand tokens) |
| `src/lib.js` | merge of `client/src/utils/*` (format, categories, score defs…) |

## Structure

```
src/
  data.js            ← ALL dummy data. Edit here to change what every page shows.
  lib.js             ← formatting helpers + the 9-box category vocabulary
  ui.jsx             ← shared design-system components (do not diverge from source)
  store.jsx          ← tiny stand-in for the app's contexts + router (useUI hook)
  App.jsx            ← page switch + a "Preview" toggle (bottom-left) for the
                       screens that live outside the console
  components/        ← AppShell, Sidebar, Topbar, Toast, NineBox, BorrowerDetail, TeamCard
  pages/             ← one file per screen, same names as the real client
```

## Navigating the prototype

- **Sidebar** switches console pages, exactly like the real app.
- **Bottom-center "Preview" pill** (or the URL hash) jumps to the screens that
  aren't in the customer sidebar:
  - `#/staff` — **Saralya staff console** (its own dark sidebar: Organizations,
    Onboard organization, Billing, Audit log, Delivery & health, Platform settings)
  - `#/login` — sign-in / register, plus the **first-login forced password change**
    (tick "This is my first login" and continue)
  - `#/portal` — the public mobile page a borrower opens from an SMS link
    (walk it: mobile → OTP `any 6 digits` → loan details → confirm → settlement scheme)
- Click any borrower row (Cohort Intelligence, Link Analytics) to open the full
  **borrower detail** page.

### Staff console — organization onboarding

The staff console (`#/staff`) has its own sidebar since it will keep growing.
Onboarding is a **full page** (`Onboard organization` in the staff sidebar), not a
modal: first admin, company details, registered address, **MSA + NDA + KYC document
uploads**, plan & notes. On create it generates a one-time password, "emails" it to
the admin, and the tenant shows under **Onboarding** with:

- live email-delivery status (queued → sent → delivered / failed),
- **Resend invite** when a send fails,
- a guarded **Reveal password** (break-glass, for when mail is down),
- and the tenant only leaves "Onboarding" once the admin has done the forced
  first-login password change.

Staff files: `src/pages/staff/` (`store.jsx`, `shared.jsx`, `OrganizationsPage.jsx`,
`OnboardOrgPage.jsx`) + `src/components/StaffShell.jsx`.

## Console pages (grouped sidebar)

Sidebar groups are defined in `src/store.jsx` (`NAV_GROUPS`). Default landing is
**Cohort Intelligence**.

**Portfolio** — `ViewPortfolioPage.jsx` (the whole imported loan book — KPIs +
filterable table, with an **Upload portfolio** button opening
`ImportPortfolioDialog.jsx` — drop-zone + sample-file download + run/progress; this
replaced the standalone Portfolio Import page), `ContactabilityPage.jsx` (run IVR
sweeps on applicant / co-applicant,
aggregate response graphs — pick-up split + IVR-option breakdown — and a
per-borrower response table), `EnrichPortfolioPage.jsx` (bureau pulls per party +
address / alt-number / employer enrichment, cost estimate, coverage bars),
`CohortIntelligencePage.jsx` (2×2 grid + filterable borrower table). Click a
row → `BorrowerPage.jsx` + `BorrowerDetail.jsx` (full loan sheet, score breakdown).
IVR/enrichment vocab lives in `src/lib.js` (`IVR_CALL_OUTCOMES`, `IVR_OPTIONS`,
`DPD_BUCKETS`); the per-borrower fields are seeded in `data.js` `makeBorrower`.

**Engagement** — `WorkflowsPage.jsx` (cadence timeline drawer, subworkflows,
simulate), `JourneysPage.jsx` (follow-up builder, funnel + disposition report),
**User Analytics** = `LinkAnalyticsPage.jsx` (drop-off funnel, devices, per-borrower).

**Messaging** — `TemplatesPage.jsx`, `WhatsAppAdminPage.jsx`, `WhatsAppSendPage.jsx`.

**Settings** — just `SettingsPage.jsx` (profile + change password). Projects was
removed; Organization moved to the Org Admin console.

Outside the sidebar: `StaffConsolePage.jsx` (`#/staff`), `OrgAdminPage.jsx`
(`#/orgAdmin`) — its own dark shell, currently renders `OrganizationPage.jsx`
(+ `TeamCard.jsx`); Users/Billing marked "soon". `OrgManagerPage.jsx`
(`#/orgManager`) — still an empty stub. `LoginPage.jsx` (`#/login`),
`BorrowerPortalPage.jsx` (`#/portal`).

## How to change a page's look

1. Edit the JSX in `src/pages/<Page>.jsx`.
2. Need different sample data? Edit the relevant export in `src/data.js`.
3. New shared widget? Add it to `src/ui.jsx` so every page can use it.

All mutations (save / delete / send) are stubbed — they update local component
state and pop a toast, nothing leaves the browser.
