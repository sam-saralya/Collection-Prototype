import React, { useEffect, useRef, useState } from 'react';
import { useUI } from '../store.jsx';
import { WA_CONFIG_STATUS, WA_COLLECTION_TEMPLATES, WA_META_TEMPLATES, WA_HISTORY, WA_BATCH_DETAIL } from '../data.js';

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtDur = (ms) => (!ms ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const nowIST = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const goodHr = () => {
  const h = new Date().getHours();
  return h >= 9 && h < 21;
};
const BODY_LIMIT = 1024;

function parseManual(raw) {
  const seen = new Set();
  const nums = [];
  for (const t of raw.split(/[,\n]+/)) {
    let n = t.trim().replace(/[^0-9]/g, '');
    if (n.length === 12 && n.startsWith('91')) n = n.slice(2);
    if (n.length < 10 || seen.has(n)) continue;
    seen.add(n);
    nums.push(n);
  }
  return nums;
}
function renderPreview(body, vars) {
  if (!body) return '';
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => (vars[n] && String(vars[n]).trim() ? String(vars[n]).trim() : `{{${n}}}`));
}

function TemplatePicker({ templates, selected, onSelect }) {
  const configured = templates.filter((t) => t.isActive);
  return (
    <div className="flex flex-col gap-1.5">
      {configured.map((t) => (
        <button
          key={t.templateKey}
          className={`rounded-xl border px-3 py-2.5 text-left transition ${selected?.templateKey === t.templateKey ? 'border-brand bg-blue-50' : 'border-line bg-white hover:border-brand/40'}`}
          onClick={() => onSelect(t)}
        >
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-ink">{t.label}</div>
            <div className="flex items-center gap-1">
              <span className="tag text-[9px]">{t.language}</span>
              {t.variableCount > 0 && <span className="tag text-[9px]">{t.variableCount} var</span>}
            </div>
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            <code>{t.metaTemplateName}</code>
            {t.sampleXlsxColumns?.length > 1 && <span className="ml-2">xlsx: {t.sampleXlsxColumns.join(', ')}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

function VariableConfigurator({ template, varVals, onVarChange }) {
  if (!template || template.variableCount === 0) return null;
  const descs = template.variableDescriptions || {};
  const colMap = template.variableColumnMapping || {};
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <div className="field-label">Variable values — controlled by you</div>
      {Array.from({ length: template.variableCount }, (_, i) => {
        const k = String(i + 1);
        const col = colMap[k];
        return (
          <div key={k} className="rounded-xl border border-line bg-slate-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="field-label text-[11px]">{`{{${k}}}`} — {descs[k] || `Variable ${k}`}</span>
              {col && <span className="tag tag-blue text-[9px]">auto: <code>xlsx[{col}]</code></span>}
            </div>
            {col ? (
              <div className="text-[11px] text-muted">
                Value read from the <code>{col}</code> column in your xlsx. <span className="text-ink">Default fallback:</span>{' '}
                <input className="input ml-1 inline-block w-auto px-2 py-0.5 text-[11px]" value={varVals[k] || ''} onChange={(e) => onVarChange(k, e.target.value)} placeholder="fallback" />
              </div>
            ) : (
              <input className="input text-[12px]" value={varVals[k] || ''} onChange={(e) => onVarChange(k, e.target.value)} placeholder={descs[k] || `Value for {{${k}}}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultTable({ results, filter, setFilter, search, setSearch }) {
  if (!results?.length) return null;
  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;
  const visible = results.filter((r) => {
    if (filter === 'sent' && !r.success) return false;
    if (filter === 'failed' && r.success) return false;
    if (search.length >= 2 && !r.mobile.includes(search)) return false;
    return true;
  });
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-2">
        {[['all', 'All', results.length], ['sent', 'Sent ✓', sent], ['failed', 'Failed ✗', failed]].map(([k, l, c]) => (
          <button key={k} onClick={() => setFilter(k)} className={`btn btn-xs ${filter === k ? 'btn-primary' : ''}`}>
            {l} <span className="ml-1 opacity-60">{c}</span>
          </button>
        ))}
        <input className="input ml-auto max-w-[160px] text-xs" placeholder="Search mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Message ID</th>
              <th>Hint</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 300).map((r, i) => (
              <tr key={r.mobile + i}>
                <td className="text-[10px] text-muted">{i + 1}</td>
                <td className="font-mono text-[11px]">{r.mobile}</td>
                <td>
                  <span className={`tag ${r.success ? 'tag-green' : 'tag-red'}`}>{r.success ? 'SENT' : 'FAIL'}</span>
                  {r.metaCode && <span className="ml-1 text-[9px] text-muted">#{r.metaCode}</span>}
                </td>
                <td className="max-w-[100px] truncate font-mono text-[10px] text-muted">{r.messageId || '—'}</td>
                <td className="max-w-[200px] truncate text-[10px] text-danger">{r.errorHint || r.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function WhatsAppSendPage() {
  const { showToast } = useUI();
  const fileInputRef = useRef(null);
  const [sendMode, setSendMode] = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [varVals, setVarVals] = useState({});
  const [messageText, setMessageText] = useState('');
  const [freeTemplateName, setFreeTemplateName] = useState(WA_META_TEMPLATES[0].name);
  const [freeLanguage, setFreeLanguage] = useState('en_IN');
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [manualRaw, setManualRaw] = useState('');
  const [manualParsed, setManualParsed] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(WA_HISTORY);
  const [activeDetail, setActiveDetail] = useState(null);
  const [rtFilter, setRtFilter] = useState('all');
  const [rtSearch, setRtSearch] = useState('');
  const [istTime, setIstTime] = useState(nowIST);
  const [goodTime, setGoodTime] = useState(goodHr);

  const cfgStatus = WA_CONFIG_STATUS;

  useEffect(() => {
    const t = setInterval(() => {
      setIstTime(nowIST());
      setGoodTime(goodHr());
    }, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setManualParsed(parseManual(manualRaw)), [manualRaw]);

  function selectTemplate(t) {
    setSelectedTemplate(t);
    setVarVals({ ...(t.variables || {}) });
  }

  const previewBody = selectedTemplate ? renderPreview(selectedTemplate.previewTemplate || '', varVals) : '';
  const previewComplete = previewBody && !previewBody.includes('{{');
  const charOver = messageText.length > BODY_LIMIT;
  const contacts = inputMode === 'manual' ? manualParsed.length > 0 : !!file;
  const canSend = !sending && contacts && (sendMode === 'template' ? !!selectedTemplate : messageText.trim() && !charOver);

  function executeSend() {
    setShowConfirm(false);
    setSending(true);
    setSendProgress(5);
    const ticker = setInterval(() => setSendProgress((p) => (p >= 88 ? 88 : p + 8)), 250);
    setTimeout(() => {
      clearInterval(ticker);
      setSendProgress(100);
      const total = inputMode === 'manual' ? manualParsed.length : 240;
      const failed = Math.round(total * 0.08);
      const res = {
        batchId: 'wab_' + Date.now(),
        fileName: inputMode === 'manual' ? 'manual.csv' : file?.name,
        totalNumbers: total,
        sent: total - failed,
        failed,
        durationMs: 38000,
        results: Array.from({ length: total }, (_, i) => ({
          mobile: (inputMode === 'manual' ? manualParsed[i] : '9' + String(600000000 + i * 137)) || '9000000000',
          success: i % 12 !== 0,
          messageId: i % 12 !== 0 ? 'wamid.' + i : '',
          metaCode: i % 12 === 0 ? '131026' : '',
          errorHint: i % 12 === 0 ? 'Number not on WhatsApp / blocked business' : '',
        })),
      };
      setResult(res);
      setHistory((h) => [
        { _id: res.batchId, fileName: res.fileName, messageText: sendMode === 'template' ? selectedTemplate.metaTemplateName : messageText, totalNumbers: total, sent: res.sent, failed, batchStatus: 'completed', createdAt: new Date().toISOString() },
        ...h,
      ]);
      setSending(false);
      showToast(`Done — ${res.sent} sent, ${failed} failed`);
    }, 1400);
  }


  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[25px] font-bold tracking-tight">WhatsApp bulk send</h1>
        </div>
        <span className={`tag ${cfgStatus.configured ? 'tag-green' : 'tag-red'}`}>
          {cfgStatus.configured ? `● CONNECTED · ${cfgStatus.mode === 'proxy' ? 'CJServices' : 'Direct API'}` : '● NOT CONFIGURED'}
        </span>
      </div>

      <div className="mb-4 inline-flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11.5px] text-amber-800">
        <span>★</span>
        <span>
          <b>Cold outreach:</b> use Approved template. Error #133010 = not on WhatsApp · #131026 = unreachable/blocked.
        </span>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="section-title mb-3">
              <h2>1 · Choose template</h2>
            </div>
            <div className="mb-3 flex gap-2">
              {[
                ['template', '📋 Configured template'],
                ['freetext-template', '📝 Any Meta template'],
                ['text', '✏️ Free-form text'],
              ].map(([v, l]) => (
                <button key={v} className={`btn flex-1 text-[11px] ${sendMode === v ? 'btn-primary' : ''}`} onClick={() => setSendMode(v)}>
                  {l}
                </button>
              ))}
            </div>

            {sendMode === 'template' && (
              <>
                <TemplatePicker templates={WA_COLLECTION_TEMPLATES} selected={selectedTemplate} onSelect={selectTemplate} />
                {selectedTemplate && (
                  <>
                    {selectedTemplate.previewTemplate && (
                      <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
                        <div className="field-label mb-1.5 text-[10px] uppercase tracking-wide text-amber-700">Template body · {selectedTemplate.metaTemplateName}</div>
                        <p className="m-0 whitespace-pre-line text-[12px] leading-relaxed text-ink">{renderPreview(selectedTemplate.previewTemplate, varVals)}</p>
                      </div>
                    )}
                    <VariableConfigurator template={selectedTemplate} varVals={varVals} onVarChange={(k, v) => setVarVals((p) => ({ ...p, [k]: v }))} />
                    {previewComplete && (
                      <div className="mt-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                        <div className="field-label mb-1 text-[10px] text-emerald-700">✓ All variables filled — this is what each recipient receives (with defaults)</div>
                        <p className="m-0 whitespace-pre-line text-[12px] leading-relaxed text-ink">{previewBody}</p>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button className="btn btn-xs" onClick={() => showToast('Defaults saved.')}>
                        💾 Save as defaults
                      </button>
                      <span className="text-[10px] text-muted">Saves current values as defaults for all users.</span>
                    </div>
                  </>
                )}
              </>
            )}

            {sendMode === 'freetext-template' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="field-label">Template name</span>
                    <select className="select" value={freeTemplateName} onChange={(e) => setFreeTemplateName(e.target.value)}>
                      {WA_META_TEMPLATES.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} · {t.language} · {t.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="field-label">Language</span>
                    <select className="select" value={freeLanguage} onChange={(e) => setFreeLanguage(e.target.value)}>
                      {[['en_IN', 'English India'], ['hi', 'Hindi'], ['mr', 'Marathi'], ['bn', 'Bengali'], ['ta', 'Tamil']].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l} ({v})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="field-label">Body parameter — fills {'{{1}}'} in the template</span>
                  <textarea rows={4} className={`textarea ${charOver ? 'border-danger' : ''}`} placeholder="e.g. Dear Customer, your EMI of ₹5,000 is due on 5th Aug." value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                  <div className="mt-1 text-right text-[10px] text-muted">{messageText.length}/{BODY_LIMIT}</div>
                </label>
              </div>
            )}

            {sendMode === 'text' && (
              <>
                <div className="mb-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  <b>24-hour window only.</b> Recipient must have messaged you first in the last 24 hours.
                </div>
                <label className="block">
                  <span className="field-label">Message text</span>
                  <textarea rows={5} className="textarea" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message here…" />
                </label>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="section-title mb-3">
              <h2>2 · Contact numbers</h2>
              <button className="btn btn-xs" onClick={() => showToast('Sample xlsx downloaded', 'success')}>
                ⬇ {selectedTemplate ? 'Template xlsx' : 'Sample xlsx'}
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              {[['file', '📁 Upload xlsx/csv'], ['manual', '✏️ Enter manually']].map(([v, l]) => (
                <button key={v} className={`btn flex-1 ${inputMode === v ? 'btn-primary' : ''}`} onClick={() => setInputMode(v)}>
                  {l}
                </button>
              ))}
            </div>
            {inputMode === 'file' && (
              <div
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-brand bg-blue-50' : 'border-line hover:border-brand/40'}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  setFile(e.dataTransfer.files[0]);
                }}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                {!file ? (
                  <>
                    <p className="mb-1 text-[13px] font-semibold text-ink">Drop xlsx / csv here or click to browse</p>
                    <p className="mb-2 text-[11px] text-muted">Columns: mobile, phone, contact, number — auto-detected. Duplicates removed.</p>
                    <button className="btn btn-primary btn-xs" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Choose file
                    </button>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] text-ink">
                    📄 {file.name} <span className="text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="ml-1 font-black text-danger"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}
            {inputMode === 'manual' && (
              <label className="block">
                <span className="field-label">
                  Mobile numbers <span className="font-normal text-muted">(comma or new line separated)</span>
                </span>
                <textarea rows={5} className="textarea font-mono text-[12px]" value={manualRaw} onChange={(e) => setManualRaw(e.target.value)} placeholder={'9667036762\n9971841989\n9717433825'} />
                {manualRaw.trim() && (
                  <p className={`mt-1 text-[11px] font-semibold ${manualParsed.length > 0 ? 'text-ok' : 'text-danger'}`}>
                    {manualParsed.length > 0 ? `✓ ${manualParsed.length} valid unique numbers` : '✗ No valid numbers found'}
                  </p>
                )}
              </label>
            )}
          </div>

          <div className="card p-5">
            <div className="section-title mb-3">
              <h2>3 · Send</h2>
            </div>
            <button className="btn btn-primary w-full py-3 text-[13px]" disabled={!canSend} onClick={() => setShowConfirm(true)}>
              {sending ? '⏳ Sending…' : '📤 Review & Send'}
            </button>
            <p className={`mt-2 text-center text-[10px] ${goodTime ? 'text-ok' : 'text-amber'}`}>
              {goodTime ? `● IST ${istTime} — good time (9 AM – 9 PM)` : `⚠ IST ${istTime} — outside 9 AM – 9 PM`}
            </p>
            {sending && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded bg-slate-200">
                  <div className="h-full rounded bg-brand transition-all" style={{ width: sendProgress + '%' }} />
                </div>
                <p className="mt-1 text-center text-[11px] text-muted">Delivering via Meta Cloud API…</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {result && (
            <div className="card p-5">
              <div className="section-title mb-3">
                <h2>Send results</h2>
                <div className="flex gap-2">
                  <button className="btn btn-xs" onClick={() => showToast('Exported', 'success')}>
                    ⬇ Export
                  </button>
                  {result.failed > 0 && (
                    <button className="btn btn-xs" onClick={() => showToast(`Retry done — ${result.failed} sent`, 'success')}>
                      ↺ Retry {result.failed}
                    </button>
                  )}
                </div>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-2">
                {[
                  ['Total', fmt(result.totalNumbers), 'text-ink'],
                  ['Sent', fmt(result.sent), 'text-ok'],
                  ['Failed', fmt(result.failed), result.failed > 0 ? 'text-danger' : 'text-muted'],
                  ['Time', fmtDur(result.durationMs), 'text-muted'],
                ].map(([l, v, c]) => (
                  <div key={l} className="card p-2.5 text-center">
                    <div className="field-label">{l}</div>
                    <div className={`mt-0.5 text-[18px] font-black ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-200">
                  <div className="h-full rounded bg-ok" style={{ width: pct(result.sent, result.totalNumbers) + '%' }} />
                </div>
                <span className="text-[11px] font-bold text-ok">{pct(result.sent, result.totalNumbers)}%</span>
              </div>
              <ResultTable results={result.results} filter={rtFilter} setFilter={setRtFilter} search={rtSearch} setSearch={setRtSearch} />
            </div>
          )}

          <div className="card p-5">
            <div className="section-title mb-3">
              <h2>Send history</h2>
              <span className="text-[10px] text-muted">{fmt(history.length)} total</span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Template / msg</th>
                  <th>#</th>
                  <th>OK</th>
                  <th>Fail</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b._id} className="cursor-pointer" onClick={() => setActiveDetail(WA_BATCH_DETAIL)}>
                    <td className="max-w-[70px] truncate text-[10px]" title={b.fileName}>{b.fileName}</td>
                    <td className="max-w-[100px] truncate text-[10px] text-muted">{b.messageText}</td>
                    <td className="text-[11px]">{fmt(b.totalNumbers)}</td>
                    <td className="text-[11px] font-bold text-ok">{fmt(b.sent)}</td>
                    <td className={`text-[11px] ${b.failed > 0 ? 'font-bold text-danger' : 'text-muted'}`}>{fmt(b.failed)}</td>
                    <td>
                      <span className={`tag ${b.batchStatus === 'completed' ? 'tag-green' : 'tag-blue'}`}>{b.batchStatus === 'completed' ? 'DONE' : 'SENDING'}</span>
                    </td>
                    <td className="text-[10px] text-muted">{fmtDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h2 className="m-0 text-[18px] font-bold">Confirm send</h2>
              <button className="btn btn-xs" onClick={() => setShowConfirm(false)}>
                ✕
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-[12px]">
              {[
                ['Template', sendMode === 'template' ? selectedTemplate?.metaTemplateName : freeTemplateName || 'free text'],
                ['Language', sendMode === 'template' ? selectedTemplate?.language : freeLanguage],
                ['Recipients', inputMode === 'manual' ? `${fmt(manualParsed.length)} numbers (manual)` : file?.name || '?'],
                ['Category', sendMode === 'template' ? selectedTemplate?.category || 'UTILITY' : 'UTILITY'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line p-2.5">
                  <div className="field-label">{k}</div>
                  <div className="truncate text-[11px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
            {sendMode === 'template' && previewComplete && (
              <div className="mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="field-label mb-1 text-emerald-700">Message preview (with default values)</div>
                <p className="m-0 whitespace-pre-line text-[11px] text-ink">{previewBody}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn flex-1" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary flex-[2] py-3 text-[13px]" onClick={executeSend}>
                📤 Yes, send now
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setActiveDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="m-0 text-[18px] font-bold">Batch detail</h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  {activeDetail.fileName} · {fmtDate(activeDetail.createdAt)}
                </p>
              </div>
              <button className="btn btn-xs" onClick={() => setActiveDetail(null)}>
                ✕ Close
              </button>
            </div>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                ['Total', fmt(activeDetail.totalNumbers)],
                ['Sent', fmt(activeDetail.sent)],
                ['Failed', fmt(activeDetail.failed)],
                ['Time', fmtDur(activeDetail.durationMs)],
              ].map(([l, v]) => (
                <div key={l} className="card p-2.5 text-center">
                  <div className="field-label">{l}</div>
                  <div className="mt-0.5 text-[17px] font-black text-ink">{v}</div>
                </div>
              ))}
            </div>
            <ResultTable results={activeDetail.results || []} filter={rtFilter} setFilter={setRtFilter} search={rtSearch} setSearch={setRtSearch} />
          </div>
        </div>
      )}
    </div>
  );
}
