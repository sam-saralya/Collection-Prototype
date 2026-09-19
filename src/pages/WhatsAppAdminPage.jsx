import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { WA_COLLECTION_TEMPLATES } from '../data.js';

const LANGS = [
  ['hi', 'Hindi'], ['en_IN', 'English India'], ['en', 'English'], ['mr', 'Marathi'], ['gu', 'Gujarati'],
  ['ta', 'Tamil'], ['te', 'Telugu'], ['kn', 'Kannada'], ['ml', 'Malayalam'], ['bn', 'Bengali'], ['pa', 'Punjabi'],
];
const HEADER_TYPES = [['none', 'None (text only)'], ['text', 'Text header'], ['image', 'Image'], ['video', 'Video'], ['document', 'Document / PDF']];
const BTN_TYPES = [['quick_reply', 'Quick Reply'], ['url', 'URL button'], ['phone', 'Phone number']];
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function renderPreview(body, vars) {
  if (!body) return '';
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = vars[n];
    return v && String(v).trim() ? String(v).trim() : `{{${n}}}`;
  });
}
function countVarsInBody(body) {
  if (!body) return 0;
  const nums = (body.match(/\{\{(\d+)\}\}/g) || []).map((m) => parseInt(m.replace(/[{}]/g, ''), 10));
  return nums.length ? Math.max(...nums) : 0;
}

function MetaGuide({ onClose }) {
  const steps = [
    { n: 1, title: 'Compose it here', body: 'Name, language, category, body with {{1}}, {{2}} …, optional header / footer / buttons.' },
    { n: 2, title: 'Add sample values', body: 'Meta needs a sample for every {{N}} placeholder — the default values you set here are used.' },
    { n: 3, title: 'Submit to Meta', body: 'One click. Saralya sends it to Meta through the API on your behalf — you never touch WhatsApp Manager.' },
    { n: 4, title: 'Meta reviews', body: 'Usually a few minutes, up to 24h. Status shows here: In review → Approved or Rejected.' },
    { n: 5, title: 'If rejected', body: 'The rejection reason is shown. Edit the template and resubmit — no limit on attempts.' },
    { n: 6, title: 'Once approved', body: 'Mark it available and it appears on the WhatsApp Send screen for your team.' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-[18px] font-bold">How template approval works</h2>
          <button className="btn btn-xs" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{s.n}</span>
              <div>
                <p className="m-0 text-[12px] font-semibold text-ink">{s.title}</p>
                <p className="m-0 mt-0.5 text-[11px] text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function VariableRow({ n, val, desc, colMapping, onVal, onDesc, onCol }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2 rounded-xl border border-line bg-slate-50 p-3">
      <div>
        <span className="field-label">{'{{' + n + '}}'} Default value</span>
        <input className="input text-[12px]" value={val} onChange={(e) => onVal(e.target.value)} placeholder={`Default for {{${n}}}`} />
      </div>
      <div>
        <span className="field-label">Description (shown in UI)</span>
        <input className="input text-[12px]" value={desc} onChange={(e) => onDesc(e.target.value)} placeholder="e.g. Customer name" />
      </div>
      <div>
        <span className="field-label">
          xlsx column name <span className="ml-1 font-normal text-muted">(per-row personalisation)</span>
        </span>
        <input className="input text-[12px]" value={colMapping} onChange={(e) => onCol(e.target.value)} placeholder="e.g. name" />
      </div>
    </div>
  );
}

function TemplateForm({ initial, onSave, onCancel, isNew = false }) {
  const { showToast } = useUI();
  const [templateKey, setTemplateKey] = useState(initial?.templateKey || '');
  const [label, setLabel] = useState(initial?.label || '');
  const [metaName, setMetaName] = useState(initial?.metaTemplateName || '');
  const [metaNameTouched, setMetaNameTouched] = useState(!isNew);
  const [language, setLanguage] = useState(initial?.language || 'hi');
  const [category, setCategory] = useState(initial?.category || 'UTILITY');
  const [isActive, setIsActive] = useState(initial?.isActive !== false);
  const [previewTpl, setPreviewTpl] = useState(initial?.previewTemplate || '');
  const [headerType, setHeaderType] = useState(initial?.headerType || 'none');
  const [headerText, setHeaderText] = useState(initial?.headerText || '');
  const [headerMediaUrl, setHeaderMediaUrl] = useState(initial?.headerMediaUrl || '');
  const [footerText, setFooterText] = useState(initial?.footerText || '');
  const varCount = countVarsInBody(previewTpl);
  const [varVals, setVarVals] = useState(() => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), initial?.variables?.[String(i + 1)] || ''])));
  const [varDescs, setVarDescs] = useState(() => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), initial?.variableDescriptions?.[String(i + 1)] || ''])));
  const [varCols, setVarCols] = useState(() => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), initial?.variableColumnMapping?.[String(i + 1)] || ''])));
  const [buttons, setButtons] = useState(initial?.buttons || []);

  const setVar = (k, setter) => (v) => setter((prev) => ({ ...prev, [k]: v }));
  const preview = renderPreview(previewTpl, varVals);
  const allFilled = preview && !preview.includes('{{');

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="field-label mb-3 text-[11px] uppercase tracking-wide text-brand">Step 1 · Basic info</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Label <span className="font-normal text-muted">(shown to your team)</span></span>
            <input
              className="input"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (isNew && !metaNameTouched) {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                  setMetaName(slug);
                  setTemplateKey(slug);
                }
              }}
              placeholder="e.g. Collection Reminder (Hindi)"
            />
          </label>
          <label className="block">
            <span className="field-label">Template name <span className="font-normal text-muted">(sent to Meta — lowercase, underscores)</span></span>
            <input
              className="input font-mono"
              value={metaName}
              onChange={(e) => {
                setMetaNameTouched(true);
                const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                setMetaName(v);
                setTemplateKey(v);
              }}
              placeholder="e.g. collection_reminder_hindi"
            />
          </label>
          <label className="block">
            <span className="field-label">Language</span>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l} ({v})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="UTILITY">Utility (transactional — lower cost)</option>
              <option value="MARKETING">Marketing (promotional — higher cost)</option>
              <option value="AUTHENTICATION">Authentication (OTP)</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-auto" />
            <span className="text-[12px] text-ink">Available to send <span className="text-muted">(after Meta approves)</span></span>
          </label>
        </div>
      </div>

      <div className="card p-4">
        <div className="field-label mb-3 text-[11px] uppercase tracking-wide text-brand">Step 2 · Header & footer</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Header type</span>
            <select className="select" value={headerType} onChange={(e) => setHeaderType(e.target.value)}>
              {HEADER_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {headerType === 'text' && (
            <label className="block">
              <span className="field-label">Header text</span>
              <input className="input" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="e.g. Important notice" />
            </label>
          )}
          {['image', 'video', 'document'].includes(headerType) && (
            <label className="block">
              <span className="field-label">Media URL <span className="font-normal text-muted">(public HTTPS)</span></span>
              <input type="url" className="input" value={headerMediaUrl} onChange={(e) => setHeaderMediaUrl(e.target.value)} placeholder="https://..." />
            </label>
          )}
          <label className="block">
            <span className="field-label">Footer text <span className="font-normal text-muted">(optional)</span></span>
            <input className="input" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. Please contact us if you have any queries." />
          </label>
        </div>
      </div>

      <div className="card p-4">
        <div className="field-label mb-3 text-[11px] uppercase tracking-wide text-brand">Step 3 · Template body & variables</div>
        <label className="mb-4 block">
          <span className="field-label">Template body <span className="font-normal text-muted">(paste from Meta — use {'{{1}}'}, {'{{2}}'} …)</span></span>
          <textarea rows={4} className="textarea" value={previewTpl} onChange={(e) => setPreviewTpl(e.target.value)} placeholder={'नमस्ते {{1}}, your payment link: {{2}}'} />
          {varCount > 0 && (
            <p className="mt-1 text-[10px] text-muted">
              Detected {varCount} variable{varCount !== 1 ? 's' : ''}: {Array.from({ length: varCount }, (_, i) => `{{${i + 1}}}`).join(', ')}
            </p>
          )}
        </label>
        {varCount > 0 && (
          <div className="flex flex-col gap-2">
            <div className="mb-1 text-[11px] font-semibold text-ink">Configure each variable — default value, description for the UI, and optionally a mapped xlsx column.</div>
            {Array.from({ length: varCount }, (_, i) => {
              const k = String(i + 1);
              return (
                <VariableRow
                  key={k}
                  n={k}
                  val={varVals[k] || ''}
                  desc={varDescs[k] || ''}
                  colMapping={varCols[k] || ''}
                  onVal={setVar(k, setVarVals)}
                  onDesc={setVar(k, setVarDescs)}
                  onCol={setVar(k, setVarCols)}
                />
              );
            })}
          </div>
        )}
        {previewTpl && (
          <div className={`mt-3 whitespace-pre-line rounded-[10px] border px-3.5 py-3 text-[12px] ${allFilled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className={`field-label mb-1 ${allFilled ? 'text-emerald-700' : 'text-amber-700'}`}>{allFilled ? '✓ Preview — all variables filled' : 'Preview (unfilled shown as {{N}})'}</div>
            <p className="m-0 leading-relaxed text-ink">{preview}</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="field-label text-[11px] uppercase tracking-wide text-brand">
            Step 4 · Buttons <span className="font-normal normal-case text-muted">(optional — up to 3)</span>
          </div>
          {buttons.length < 3 && (
            <button className="btn btn-xs" onClick={() => setButtons((b) => [...b, { type: 'quick_reply', text: '', url: '' }])}>
              + Add button
            </button>
          )}
        </div>
        {buttons.length === 0 && <p className="text-[11px] text-muted">No buttons — template is text-only.</p>}
        {buttons.map((btn, i) => (
          <div key={i} className="mb-2 flex items-end gap-2">
            <label className="block flex-1">
              {i === 0 && <span className="field-label">Type</span>}
              <select
                className="select text-[12px]"
                value={btn.type}
                onChange={(e) => {
                  const b = [...buttons];
                  b[i] = { ...b[i], type: e.target.value };
                  setButtons(b);
                }}
              >
                {BTN_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-[2]">
              {i === 0 && <span className="field-label">Button text</span>}
              <input
                className="input text-[12px]"
                value={btn.text}
                onChange={(e) => {
                  const b = [...buttons];
                  b[i] = { ...b[i], text: e.target.value };
                  setButtons(b);
                }}
                placeholder="e.g. Pay now"
              />
            </label>
            {btn.type === 'url' && (
              <label className="block flex-[2]">
                {i === 0 && <span className="field-label">URL</span>}
                <input
                  type="url"
                  className="input text-[12px]"
                  value={btn.url || ''}
                  onChange={(e) => {
                    const b = [...buttons];
                    b[i] = { ...b[i], url: e.target.value };
                    setButtons(b);
                  }}
                  placeholder="https://..."
                />
              </label>
            )}
            <button className="btn btn-xs btn-danger mb-0.5 self-end" onClick={() => setButtons((b) => b.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="btn flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary flex-[2] py-3 text-[13px]"
          onClick={() => {
            if (!label || !metaName) return showToast('Label and template name are required.');
            if (!previewTpl.trim()) return showToast('Add the message body before submitting.');
            const variables = {}, variableDescriptions = {}, variableColumnMapping = {};
            for (let i = 1; i <= varCount; i++) {
              variables[i] = varVals[i] || '';
              variableDescriptions[i] = varDescs[i] || '';
              variableColumnMapping[i] = varCols[i] || '';
            }
            onSave({
              templateKey: templateKey || 'tpl_' + Date.now(),
              label,
              metaTemplateName: metaName,
              language,
              category,
              isActive,
              previewTemplate: previewTpl,
              headerType,
              headerText,
              footerText,
              buttons,
              variableCount: varCount,
              variables,
              variableDescriptions,
              variableColumnMapping,
              sampleXlsxColumns: ['mobile', ...new Set(Object.values(variableColumnMapping).filter(Boolean))],
              metaStatus: 'PENDING',
              submittedAt: new Date().toISOString(),
              rejectionReason: null,
              updatedAt: new Date().toISOString(),
            });
          }}
        >
          {isNew ? '➤ Submit to Meta for approval' : '➤ Save & resubmit to Meta'}
        </button>
      </div>
    </div>
  );
}

const STATUS = {
  APPROVED: { label: 'Approved', cls: 'tag-green' },
  PENDING: { label: 'In review', cls: 'tag-amber' },
  REJECTED: { label: 'Rejected', cls: 'tag-red' },
  DRAFT: { label: 'Draft', cls: '' },
};

function TemplateCard({ template, onSaved }) {
  const [expanded, setExpanded] = useState(template.metaStatus === 'REJECTED');
  const [editing, setEditing] = useState(false);
  const vars = template.variables || {};
  const colMap = template.variableColumnMapping || {};
  const preview = renderPreview(template.previewTemplate || '', vars);
  const st = STATUS[template.metaStatus] || STATUS.DRAFT;
  const approved = template.metaStatus === 'APPROVED';
  const sendable = approved && template.isActive;

  return (
    <div className={`card overflow-hidden transition ${approved ? '' : 'opacity-80'}`}>
      <div className="flex cursor-pointer items-center gap-3 px-4 py-3.5" onClick={() => !editing && setExpanded((e) => !e)}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
            {template.label}
            <span className={`tag text-[9px] ${st.cls}`}>{st.label}</span>
            <span className="tag text-[9px]">{template.category || 'UTILITY'}</span>
            {sendable && <span className="tag tag-green text-[9px]">✓ Sendable</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted">
            <span>Name: <code className="text-[9px]">{template.metaTemplateName}</code></span>
            <span>Lang: <b>{template.language}</b></span>
            <span>Vars: {template.variableCount || 0}</span>
            {template.metaStatus === 'PENDING' && template.submittedAt && <span>Submitted: {fmtDate(template.submittedAt)}</span>}
            {template.updatedAt && <span>Updated: {fmtDate(template.updatedAt)}</span>}
          </div>
        </div>
        {!editing && <span className="select-none text-muted">{expanded ? '▲' : '▼'}</span>}
      </div>

      {expanded && !editing && (
        <div className="flex flex-col gap-3 border-t border-line p-4">
          {template.metaStatus === 'PENDING' && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11.5px] text-amber-800">
              ⏳ Submitted to Meta{template.submittedAt ? ` on ${fmtDate(template.submittedAt)}` : ''}. Meta usually
              responds within 24h — this status updates automatically. You can't send it until it's approved.
            </div>
          )}
          {template.metaStatus === 'REJECTED' && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[11.5px] text-red-700">
              <b>Meta rejected this template.</b>
              <p className="mt-1">{template.rejectionReason || 'No reason given.'}</p>
              <button className="btn btn-xs btn-primary mt-2" onClick={() => setEditing(true)}>
                ✏️ Edit &amp; resubmit
              </button>
            </div>
          )}
          {template.previewTemplate && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
              <div className="field-label mb-1.5 text-amber-700">Template body</div>
              <p className="m-0 whitespace-pre-line text-[12px] leading-relaxed text-ink">{template.previewTemplate}</p>
            </div>
          )}
          {template.variableCount > 0 && (
            <table className="tbl text-[11px]">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Default</th>
                  <th>Description</th>
                  <th>xlsx column</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: template.variableCount }, (_, i) => {
                  const k = String(i + 1);
                  return (
                    <tr key={k}>
                      <td className="font-mono">{`{{${k}}}`}</td>
                      <td>{vars[k] || <em className="text-muted">empty</em>}</td>
                      <td className="text-muted">{template.variableDescriptions?.[k] || '—'}</td>
                      <td className="font-mono text-muted">{colMap[k] || <em>none</em>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {preview && !preview.includes('{{') && (
            <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <div className="field-label mb-1 text-emerald-700">What recipient receives (with defaults)</div>
              <p className="m-0 whitespace-pre-line text-[12px] leading-relaxed text-ink">{preview}</p>
            </div>
          )}
          <button className="btn btn-xs self-start" onClick={() => setEditing(true)}>
            ✏️ Edit this template
          </button>
        </div>
      )}

      {expanded && editing && (
        <div className="border-t border-line p-4">
          <TemplateForm
            initial={template}
            isNew={false}
            onSave={(t) => {
              setEditing(false);
              onSaved(t);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function WhatsAppAdminPage() {
  const { showToast } = useUI();
  const [templates, setTemplates] = useState(WA_COLLECTION_TEMPLATES);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const counts = {
    approved: templates.filter((t) => t.metaStatus === 'APPROVED').length,
    pending: templates.filter((t) => t.metaStatus === 'PENDING').length,
    rejected: templates.filter((t) => t.metaStatus === 'REJECTED').length,
  };

  return (
    <div>
      {/* TODO: WhatsApp templates flow is NOT final — will finalize after consulting Shudhanshu. */}
      <div className="mb-4 rounded-[10px] border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-[14px] font-extrabold uppercase tracking-wide text-amber-800">
        TODO — WhatsApp templates: will finalize after consulting Shudhanshu
      </div>
      {showGuide && <MetaGuide onClose={() => setShowGuide(false)} />}

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[25px] font-bold tracking-tight">Message templates</h1>
          <p className="m-0 mt-1 text-[12px] text-muted">
            Create your own WhatsApp templates and submit them to Meta — Saralya handles the submission on your behalf.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-xs" onClick={() => setShowGuide(true)}>
            ❓ How approval works
          </button>
          <button className="btn btn-primary btn-xs" onClick={() => setShowCreate((c) => !c)}>
            {showCreate ? '✕ Cancel' : '✦ New template'}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="tag tag-green">{counts.approved} approved</span>
        <span className="tag tag-amber">{counts.pending} in review</span>
        <span className="tag tag-red">{counts.rejected} rejected</span>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[11.5px] text-blue-800">
        <span className="mt-0.5 text-blue-400">ℹ</span>
        <span>
          The body you write here <b>is</b> the message Meta reviews and sends. Use {'{{1}}'}, {'{{2}}'} … for the parts
          that change per borrower and map them to your upload's column names. A template can only be sent once Meta marks
          it <b>Approved</b>.
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {showCreate && (
          <div className="card border-2 border-dashed border-brand p-5">
            <div className="mb-4 text-[14px] font-bold text-brand">✦ New template</div>
            <TemplateForm
              isNew
              onSave={(t) => {
                setShowCreate(false);
                setTemplates((list) => [t, ...list]);
                showToast(`"${t.label}" submitted to Meta for approval`, 'success');
              }}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        )}

        {templates.map((t) => (
          <TemplateCard
            key={t.templateKey}
            template={t}
            onSaved={(next) => {
              setTemplates((list) => list.map((x) => (x.templateKey === next.templateKey ? next : x)));
              showToast(`"${next.label}" resubmitted to Meta`, 'success');
            }}
          />
        ))}
      </div>
    </div>
  );
}
