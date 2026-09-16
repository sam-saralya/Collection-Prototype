import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Field, Input, Tag, cx } from '../ui.jsx';
import { ORGANIZATION } from '../data.js';

const TABS = [
  ['general', 'General'],
  ['documents', 'Documents'],
  ['dlt', 'DLT'],
  ['waba', 'WABA'],
];

function toForm(o) {
  return {
    name: o.name || '',
    website: o.website || '',
    address_line1: o.address_line1 || '',
    city: o.city || '',
    state: o.state || '',
    postal_code: o.postal_code || '',
    sms_principal_entity_id: o.sms?.principal_entity_id || '',
    sms_sender_id: o.sms?.sender_id || '',
    whatsapp_phone_number_id: o.whatsapp?.phone_number_id || '',
    whatsapp_api_version: o.whatsapp?.api_version || '',
    whatsapp_default_language: o.whatsapp?.default_language || '',
    whatsapp_display_name: o.whatsapp?.display_name || '',
    sms_access_key: '',
    whatsapp_access_token: '',
  };
}

function DocField({ label, stored, file, onPick, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
          className="text-[12px] file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold hover:file:bg-slate-200"
        />
        {file ? (
          <Tag variant="amber">{file.name} — not saved yet</Tag>
        ) : stored?.path ? (
          <span className="text-[12px] font-semibold text-brand underline">{stored.original_name || 'View current file'}</span>
        ) : (
          <span className="text-[11px] text-muted">Nothing uploaded</span>
        )}
      </div>
    </Field>
  );
}

export default function OrganizationPage() {
  const { showToast } = useUI();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(toForm(ORGANIZATION));
  const [files, setFiles] = useState({});
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pick = (key) => (file) => setFiles((f) => ({ ...f, [key]: file }));

  const accessKeySet = Boolean(ORGANIZATION.sms?.access_key_set || form.sms_access_key.trim());
  const waTokenSet = Boolean(ORGANIZATION.whatsapp?.access_token_set || form.whatsapp_access_token.trim());

  return (
    <div>
      <PageHead
        actions={
          <Button type="submit" form="org-form" variant="primary">
            Save changes
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              tab === k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <form
        id="org-form"
        onSubmit={(e) => {
          e.preventDefault();
          showToast('Organization saved', 'success');
        }}
      >
        {tab === 'general' && (
          <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
            <Card pad>
              <SectionTitle title="Identity" />
              <div className="grid gap-3">
                <Field label="Organization name" required>
                  <Input value={form.name} onChange={set('name')} />
                </Field>
                <Field label="Website">
                  <Input type="url" placeholder="https://example.com" value={form.website} onChange={set('website')} />
                </Field>
                <DocField label="Logo" stored={ORGANIZATION.logo} file={files.logo} onPick={pick('logo')} hint="PNG, JPEG or WEBP, up to 5MB." />
              </div>
            </Card>

            <Card pad>
              <SectionTitle title="Address" />
              <div className="grid gap-3">
                <Field label="Address line 1">
                  <Input value={form.address_line1} onChange={set('address_line1')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <Input value={form.city} onChange={set('city')} />
                  </Field>
                  <Field label="State / province">
                    <Input value={form.state} onChange={set('state')} />
                  </Field>
                </div>
                <Field label="Zip / PIN code">
                  <Input value={form.postal_code} onChange={set('postal_code')} />
                </Field>
              </div>
            </Card>
          </div>
        )}

        {tab === 'documents' && (
          <Card pad>
            <SectionTitle title="Documents" />
            <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
              Scans or photos of your statutory paperwork. Stored for the Saralya team to reference — nothing in the
              engine reads them.
            </p>
            <div className="grid grid-cols-2 gap-3 max-[980px]:grid-cols-1">
              {[
                ['pan_card', 'PAN card'],
                ['gst_certificate', 'GST certificate'],
                ['udyam_certificate', 'Udyam registration certificate'],
              ].map(([key, label]) => (
                <DocField key={key} label={label} stored={ORGANIZATION.documents?.[key]} file={files[key]} onPick={pick(key)} hint="Image or PDF, up to 5MB." />
              ))}
            </div>
          </Card>
        )}

        {tab === 'dlt' && (
          <Card pad>
            <SectionTitle title="SMS On-boarding Form" />
            <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
              Your DLT registration and the provider key it was registered on. All three are needed together: with any of
              them missing, messages go out under Saralya’s registration instead.
            </p>
            <div className="grid max-w-md gap-3">
              <Field label="Principal entity ID" hint="The PE ID your registrar issued, 19 digits.">
                <Input placeholder="e.g. 1201178293431218138" value={form.sms_principal_entity_id} onChange={set('sms_principal_entity_id')} />
              </Field>
              <Field label="Sender ID" hint="The 6-character header borrowers see.">
                <Input placeholder="e.g. SARLYA" value={form.sms_sender_id} onChange={set('sms_sender_id')} />
              </Field>
              <Field label="Access key" hint={accessKeySet ? 'An access key is saved. Paste a new one to replace it; leave blank to keep it.' : "Your Pinnacle account's access key."}>
                <Input type="password" autoComplete="off" placeholder={accessKeySet ? '••••••••' : 'e.g. c1a9f0b2d3e4'} value={form.sms_access_key} onChange={set('sms_access_key')} />
              </Field>
            </div>
          </Card>
        )}

        {tab === 'waba' && (
          <Card pad>
            <SectionTitle title="WhatsApp On-boarding Form" />
            <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
              Your Meta Cloud API number. The phone number ID and access token are one credential — both are needed
              before this organization sends on its own number.
            </p>
            <div className="grid max-w-md gap-3">
              <Field label="Phone number ID" hint="From WhatsApp Manager — the number's ID, not the number itself.">
                <Input placeholder="e.g. 1301529993035011" value={form.whatsapp_phone_number_id} onChange={set('whatsapp_phone_number_id')} />
              </Field>
              <Field label="Access token" hint={waTokenSet ? 'A token is saved. Paste a new one to replace it; leave blank to keep it.' : 'A permanent system-user token from Meta Business Manager.'}>
                <Input type="password" autoComplete="off" placeholder={waTokenSet ? '••••••••' : 'e.g. EAAG9ZBx1cBPQBO7...'} value={form.whatsapp_access_token} onChange={set('whatsapp_access_token')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="API version" hint="Blank uses the platform default.">
                  <Input placeholder="e.g. v21.0" value={form.whatsapp_api_version} onChange={set('whatsapp_api_version')} />
                </Field>
                <Field label="Default language" hint="Overridden per approved template.">
                  <Input placeholder="e.g. en_IN" value={form.whatsapp_default_language} onChange={set('whatsapp_default_language')} />
                </Field>
              </div>
              <Field label="Display name" hint="The business name borrowers see on WhatsApp.">
                <Input placeholder="e.g. Saralya Finance" value={form.whatsapp_display_name} onChange={set('whatsapp_display_name')} />
              </Field>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
