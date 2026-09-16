import React, { useMemo, useState } from 'react';
import { Card, Button, PageHead, SectionTitle, Field, Input, Select, Textarea, Tag, InfoNote, cx } from '../../ui.jsx';
import { useStaff } from './store.jsx';
import { JustCreatedCard } from './shared.jsx';

const ENTITY_TYPES = ['Private Limited', 'Public Limited', 'LLP', 'Partnership Firm', 'NBFC', 'Bank / SFB', 'Section 8 / NGO', 'Other'];
const PLAN_TIERS = ['Pilot', 'Standard', 'Enterprise'];
const STATES = ['Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

// The documents collected at onboarding. MSA and NDA are required to activate a
// tenant; the rest are KYC paperwork the Saralya team keeps on file.
const DOCS = [
  { key: 'msa', label: 'Master Services Agreement (MSA)', required: true, hint: 'Signed PDF. Required before the tenant goes live.' },
  { key: 'nda', label: 'Non-Disclosure Agreement (NDA)', required: true, hint: 'Signed PDF. Required before the tenant goes live.' },
  { key: 'incorporation', label: 'Certificate of Incorporation', required: false, hint: 'CoI / partnership deed.' },
  { key: 'pan_card', label: 'Company PAN card', required: false },
  { key: 'gst_cert', label: 'GST registration certificate', required: false },
  { key: 'rbi_license', label: 'RBI / regulatory licence', required: false, hint: 'For NBFCs and banks.' },
];

function DocRow({ doc, file, onPick, onClear }) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5', file ? 'border-emerald-200 bg-emerald-50/50' : doc.required ? 'border-amber-200 bg-amber-50/40' : 'border-line bg-white')}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold">
          {doc.label}
          {doc.required && <Tag variant="amber">Required</Tag>}
        </div>
        {doc.hint && <div className="mt-0.5 text-[10.5px] text-muted">{doc.hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        {file ? (
          <>
            <Tag variant="green">✓ {file.name}</Tag>
            <button type="button" onClick={onClear} className="text-[11px] font-semibold text-red-600 underline">
              Remove
            </button>
          </>
        ) : (
          <label className="btn btn-xs cursor-pointer">
            Upload
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
}

const EMPTY = {
  legal_name: '',
  trade_name: '',
  website: '',
  entity_type: '',
  cin: '',
  gstin: '',
  pan: '',
  addr_line1: '',
  addr_line2: '',
  addr_city: '',
  addr_state: '',
  addr_pin: '',
  addr_country: 'India',
  admin_name: '',
  admin_email: '',
  admin_phone: '',
  admin_designation: '',
  plan_tier: 'Pilot',
  billing_email: '',
  go_live: '',
  notes: '',
};

export default function OnboardOrgPage() {
  const { createOrg, setSection, lastCreated, setLastCreated, resendInvite, organizations } = useStaff();
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState({});
  const [touched, setTouched] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pick = (key) => (file) => setFiles((f) => ({ ...f, [key]: file }));
  const clear = (key) => () => setFiles((f) => ({ ...f, [key]: null }));

  const emailOk = /\S+@\S+\.\S+/.test(form.admin_email);
  const missing = useMemo(() => {
    const m = [];
    if (!form.legal_name.trim()) m.push('Legal name');
    if (!form.admin_name.trim()) m.push('Admin name');
    if (!emailOk) m.push('Admin email');
    if (!files.msa) m.push('MSA document');
    if (!files.nda) m.push('NDA document');
    return m;
  }, [form, emailOk, files]);
  const canSubmit = missing.length === 0;

  // The org currently in the success panel — refetch from the live list so the
  // email-status chip updates when "delivered" lands.
  const created = lastCreated ? organizations.find((o) => o._id === lastCreated._id) || lastCreated : null;

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    const documents = {};
    DOCS.forEach((d) => {
      if (files[d.key]) documents[d.key] = { name: files[d.key].name, uploaded_at: new Date().toISOString() };
    });
    createOrg({ ...form, documents });
    setForm(EMPTY);
    setFiles({});
    setTouched(false);
    window.scrollTo({ top: 0 });
  }

  if (created) {
    return (
      <div>
        <div className="max-w-2xl">
          <JustCreatedCard created={created} onResend={() => resendInvite(created)} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setLastCreated(null);
                setSection('organizations');
              }}
            >
              Go to Organizations
            </Button>
            <Button onClick={() => setLastCreated(null)}>Onboard another</Button>
          </div>

          <div className="mt-6 rounded-xl2 border border-line bg-white p-5">
            <SectionTitle title="What happens next" />
            <ol className="space-y-2.5 text-[12px] text-slate-600">
              {[
                'The admin receives the invite email with a one-time password.',
                'On first login they are forced to set their own password before the console opens.',
                'MSA / NDA and KYC documents are attached to the tenant record for the Saralya team.',
                'The tenant appears under Onboarding until the admin has signed in and changed their password.',
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHead
        title="Onboard an organization"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setSection('organizations')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Create &amp; send invite
            </Button>
          </div>
        }
      />

      {touched && missing.length > 0 && (
        <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Still needed before this tenant can be created: <b>{missing.join(', ')}</b>.
        </div>
      )}

      <div className="grid max-w-[900px] gap-4">
        {/* First admin — the email drives the invite, so it comes first. */}
        <Card pad>
          <SectionTitle title="First admin" />
          <p className="mb-3 text-[11.5px] leading-relaxed text-muted">
            The person who will run this tenant. A one-time password is generated and emailed to them — there is no
            password to type here, and they must change it on first login.
          </p>
          <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
            <Field label="Full name" required>
              <Input value={form.admin_name} onChange={set('admin_name')} autoFocus />
            </Field>
            <Field label="Email" required hint="The invite and temporary password go here.">
              <Input type="email" value={form.admin_email} onChange={set('admin_email')} placeholder="admin@company.in" />
            </Field>
            <Field label="Phone">
              <Input value={form.admin_phone} onChange={set('admin_phone')} placeholder="+91 " />
            </Field>
            <Field label="Designation">
              <Input value={form.admin_designation} onChange={set('admin_designation')} placeholder="Head of Collections" />
            </Field>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          {/* Company */}
          <Card pad>
            <SectionTitle title="Company details" />
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                <Field label="Registered legal name" required>
                  <Input value={form.legal_name} onChange={set('legal_name')} placeholder="Kaveri Finserv Private Limited" autoFocus />
                </Field>
                <Field label="Trade / display name" hint="Shown in the console and to borrowers. Defaults to the legal name.">
                  <Input value={form.trade_name} onChange={set('trade_name')} placeholder="Kaveri Finserv" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                <Field label="Website">
                  <Input type="url" value={form.website} onChange={set('website')} placeholder="https://kaverifinserv.in" />
                </Field>
                <Field label="Entity type">
                  <Select value={form.entity_type} onChange={set('entity_type')}>
                    <option value="">Select…</option>
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <Field label="CIN / registration no.">
                  <Input value={form.cin} onChange={set('cin')} placeholder="U65999KA2019PTC…" />
                </Field>
                <Field label="GSTIN">
                  <Input value={form.gstin} onChange={set('gstin')} placeholder="29ABCDE1234F1Z5" />
                </Field>
                <Field label="Company PAN">
                  <Input value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F" />
                </Field>
              </div>
            </div>
          </Card>

          {/* Address */}
          <Card pad>
            <SectionTitle title="Registered address" />
            <div className="grid gap-3">
              <Field label="Address line 1">
                <Input value={form.addr_line1} onChange={set('addr_line1')} />
              </Field>
              <Field label="Address line 2">
                <Input value={form.addr_line2} onChange={set('addr_line2')} />
              </Field>
              <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2">
                <Field label="City">
                  <Input value={form.addr_city} onChange={set('addr_city')} />
                </Field>
                <Field label="State">
                  <Select value={form.addr_state} onChange={set('addr_state')}>
                    <option value="">Select…</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="PIN code">
                  <Input value={form.addr_pin} onChange={set('addr_pin')} />
                </Field>
                <Field label="Country">
                  <Input value={form.addr_country} onChange={set('addr_country')} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Agreements & documents */}
          <Card pad>
            <SectionTitle title="Agreements & documents" note="MSA and NDA required" />
            <p className="mb-3 text-[11.5px] leading-relaxed text-muted">
              Upload the signed MSA and NDA and any KYC paperwork. These are stored against the tenant for the Saralya
              team — nothing in the engine reads them. (Prototype: files are recorded by name only.)
            </p>
            <div className="grid gap-2">
              {DOCS.map((doc) => (
                <DocRow key={doc.key} doc={doc} file={files[doc.key]} onPick={pick(doc.key)} onClear={clear(doc.key)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          {/* Plan & notes */}
          <Card pad>
            <SectionTitle title="Plan & internal notes" />
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <Field label="Plan">
                  <Select value={form.plan_tier} onChange={set('plan_tier')}>
                    {PLAN_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Billing email" hint="Defaults to the admin's email.">
                  <Input type="email" value={form.billing_email} onChange={set('billing_email')} />
                </Field>
                <Field label="Target go-live date">
                  <Input type="date" value={form.go_live} onChange={set('go_live')} />
                </Field>
              </div>
              <Field label="Internal notes" hint="Never shown to the customer.">
                <Textarea rows={3} value={form.notes} onChange={set('notes')} />
              </Field>
            </div>
          </Card>

          <InfoNote tone="blue">
            After create: the tenant shows under <b>Onboarding</b> with its email-delivery status, a <b>Resend invite</b>
            action, and a break-glass <b>Reveal password</b> for when email is down.
          </InfoNote>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button type="button" onClick={() => setSection('organizations')}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          Create &amp; send invite
        </Button>
      </div>
    </form>
  );
}
