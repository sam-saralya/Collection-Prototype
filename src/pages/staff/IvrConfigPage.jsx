import React, { useState } from 'react';
import { useStaff } from './store.jsx';
import { Card, Button, SectionTitle, Field, Input, Select, Textarea } from '../../ui.jsx';
import { IVR_SCRIPTS, IVR_OPTIONS } from '../../lib.js';

const PROVIDERS = ['Exotel', 'Knowlarity', 'Twilio', 'MyOperator'];
const blankScript = () => ({ id: 'scr_' + Date.now(), name: '', language: 'Hindi + English', body: '', digits: [['1', 'will_pay']] });
const defaultCfg = () => ({
  provider: 'Exotel',
  account_sid: '',
  caller_id: '',
  webhook: 'https://api.saralya.in/ivr/callback',
  scripts: IVR_SCRIPTS.map((s) => ({ ...s, digits: s.digits.map((d) => [...d]) })),
});

export default function IvrConfigPage() {
  const { organizations, showToast } = useStaff();
  const [orgId, setOrgId] = useState(organizations[0]?._id || '');
  const [cfgByOrg, setCfgByOrg] = useState({});

  const org = organizations.find((o) => o._id === orgId);
  const cfg = cfgByOrg[orgId] || defaultCfg();

  const patch = (p) => setCfgByOrg((m) => ({ ...m, [orgId]: { ...cfg, ...p } }));
  const patchScript = (i, p) => patch({ scripts: cfg.scripts.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const patchDigit = (si, di, field, val) =>
    patchScript(si, {
      digits: cfg.scripts[si].digits.map((row, j) => (j === di ? (field === 'd' ? [val, row[1]] : [row[0], val]) : row)),
    });
  const addDigit = (si) => patchScript(si, { digits: [...cfg.scripts[si].digits, ['', 'will_pay']] });
  const removeDigit = (si, di) => patchScript(si, { digits: cfg.scripts[si].digits.filter((_, j) => j !== di) });
  const addScript = () => patch({ scripts: [...cfg.scripts, blankScript()] });
  const removeScript = (i) => patch({ scripts: cfg.scripts.filter((_, j) => j !== i) });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <b className="text-[12px]">Configure IVR for</b>
        <Select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-56 text-xs">
          {organizations.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>

      <Card pad className="mb-4">
        <SectionTitle title="IVR provider" note="the calling account for this tenant" />
        <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
          <Field label="Provider">
            <Select value={cfg.provider} onChange={(e) => patch({ provider: e.target.value })}>
              {PROVIDERS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Account SID / ID">
            <Input value={cfg.account_sid} onChange={(e) => patch({ account_sid: e.target.value })} placeholder="e.g. sugamfin1" />
          </Field>
          <Field label="Caller ID / DID number">
            <Input value={cfg.caller_id} onChange={(e) => patch({ caller_id: e.target.value })} placeholder="e.g. 08047123456" />
          </Field>
          <Field label="Callback webhook">
            <Input value={cfg.webhook} onChange={(e) => patch({ webhook: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card pad>
        <SectionTitle title={`IVR scripts · ${org?.name || ''}`} note={`${cfg.scripts.length} script${cfg.scripts.length === 1 ? '' : 's'}`}>
          <Button onClick={addScript}>＋ Add script</Button>
        </SectionTitle>

        <div className="grid gap-4">
          {cfg.scripts.map((s, si) => (
            <div key={s.id} className="rounded-[10px] border border-line p-3">
              <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
                <Field label="Script name">
                  <Input value={s.name} onChange={(e) => patchScript(si, { name: e.target.value })} placeholder="Standard collections reminder" />
                </Field>
                <Field label="Language">
                  <Input value={s.language} onChange={(e) => patchScript(si, { language: e.target.value })} />
                </Field>
              </div>
              <Field label="Spoken message" hint="Placeholders: {name}, {loan_id}, {amount}.">
                <Textarea rows={3} value={s.body} onChange={(e) => patchScript(si, { body: e.target.value })} />
              </Field>

              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Keypad → captured response</div>
              <div className="mt-1.5 grid gap-1.5">
                {s.digits.map(([d, key], di) => (
                  <div key={di} className="flex items-center gap-2">
                    <Input
                      value={d}
                      onChange={(e) => patchDigit(si, di, 'd', e.target.value)}
                      className="w-14 py-1.5 text-center text-[12px]"
                      placeholder="1"
                    />
                    <span className="text-muted">→</span>
                    <Select value={key} onChange={(e) => patchDigit(si, di, 'key', e.target.value)} className="flex-1 text-xs">
                      {IVR_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    <button onClick={() => removeDigit(si, di)} className="text-[12px] text-danger">
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addDigit(si)}
                  className="w-fit rounded-lg border border-dashed border-line px-2 py-1 text-[11px] font-semibold text-brand"
                >
                  + key
                </button>
              </div>

              <div className="mt-2 text-right">
                <button onClick={() => removeScript(si)} className="text-[11px] font-semibold text-danger">
                  Remove script
                </button>
              </div>
            </div>
          ))}
          {cfg.scripts.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-line p-6 text-center text-[12px] text-muted">
              No IVR scripts for this tenant yet.
            </div>
          )}
        </div>

        <Button variant="primary" className="mt-4" onClick={() => showToast(`IVR configuration saved for ${org?.name}`, 'success')}>
          Save IVR configuration
        </Button>
      </Card>
    </div>
  );
}
