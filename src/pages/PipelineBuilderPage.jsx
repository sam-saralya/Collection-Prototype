import React, { useCallback, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, MarkerType,
  addEdge, useNodesState, useEdgesState, useReactFlow, useNodes, useEdges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUI } from '../store.jsx';
import { Button, Empty, Input, Select, Tag, Textarea, cx } from '../ui.jsx';
import { PIPELINE_ACTIONS, PIPELINE_ACTION_BY_KEY, SEGMENT_OPERATORS, DAYS_OF_WEEK, TEMPLATES } from '../data.js';
import { IVR_CALL_OUTCOMES, IVR_OPTIONS, IVR_OPTION_BY_KEY, IVR_SCRIPTS, IVR_SCRIPT_BY_ID } from '../lib.js';

// SMS and WhatsApp are "message channel" steps with real branching: both
// always split into delivered/not-delivered, and — when the chosen template
// carries a payment link — the delivered branch splits again into link
// clicked/not clicked. Automated Call (IVR) branches on the call outcome,
// and (once answered) again on what the borrower pressed — a wider,
// multi-way branch rather than a plain pass/fail one.
const MESSAGE_CHANNELS = {
  sms: { label: 'SMS', icon: '✉', templateChannel: 'SMS' },
  whatsapp: { label: 'WhatsApp', icon: '📤', templateChannel: 'WA' },
};
const templatesForChannel = (channel) => TEMPLATES.filter((t) => t.channel === MESSAGE_CHANNELS[channel].templateChannel && t.is_active);
const templateById = (id) => TEMPLATES.find((t) => t._id === id) || null;
const templateHasLink = (template) => !!template?.template_message?.includes('$link');
const DAY_LABEL_BY_KEY = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d.key, d.label]));

// The app already color-codes these outcomes elsewhere (Tag variants); reuse
// that grouping but collapse it to the 3 tones BranchRow understands —
// green outcomes render as clear wins, red ones as clear fails, everything
// else (amber/blue/purple/default) as a neutral "worth routing on" branch.
const PARTY_LABELS = { applicant: 'Applicant', co_applicant: 'Co-applicant', nominee: 'Nominee' };
const VARIANT_TONE = { green: 'emerald', red: 'rose', amber: 'amber', blue: 'amber', purple: 'amber', default: 'amber' };
const toneFor = (variant) => VARIANT_TONE[variant] || 'amber';

// Failure branches (feed a Retry step) render red, success branches green, so
// the shape of the flow is readable at a glance regardless of which side of
// the box the arrow leaves from. Neutral multi-way branches (IVR's keypad
// choices) fall back to slate.
const EDGE_COLOR_BY_HANDLE = {
  not_delivered: '#e11d48',
  link_not_clicked: '#e11d48',
  no_answer: '#e11d48',
  busy: '#e11d48',
  invalid: '#e11d48',
  delivered: '#059669',
  link_clicked: '#059669',
  answered: '#059669',
};
function styledEdges(edges) {
  return edges.map((e) => {
    const color = EDGE_COLOR_BY_HANDLE[e.sourceHandle] || '#94a3b8';
    return {
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
      style: { stroke: color, strokeWidth: 1.5 },
    };
  });
}

/* ════════════════════════════════════════════════════════════════════════
 * Pipeline builder — a full page (not a drawer): a flowchart canvas (React
 * Flow) with the step palette living in a persistent left sidebar, grouped
 * by kind (Communication), plus a manual Segmentation node and a Report node.
 * Drag any step onto the canvas in any order, wire them up by dragging
 * connections between step handles. Run the resulting chain from the
 * Pipelines list.
 * ════════════════════════════════════════════════════════════════════════ */

const newId = (p) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

const STEP_GROUPS = [
  { kind: 'contactability', label: 'Communication' },
];

// Every workflow starts from a Data input node — a generic entry point with
// no borrowers attached yet. It has no incoming edge, so it's always the
// graph root `linearize()` starts from, and it can't be deleted. It always
// runs against the whole portfolio when the workflow is run.
function makeSourceNode(x = -300) {
  return {
    id: newId('src'),
    type: 'source',
    position: { x, y: 140 },
    data: {},
    deletable: false,
  };
}
// Older/hand-built pipelines may not have a source node yet — backfill one
// wired to whatever was the graph root, so the canvas never opens broken.
function ensureSource(nodes, edges) {
  if (nodes.some((n) => n.type === 'source')) return { nodes, edges };
  if (nodes.length === 0) return { nodes: [makeSourceNode(40)], edges };
  const hasIncoming = new Set(edges.map((e) => e.target));
  const oldRoot = nodes.find((n) => !hasIncoming.has(n.id)) || nodes[0];
  const minX = nodes.reduce((m, n) => Math.min(m, n.position.x), 40);
  const src = makeSourceNode(minX - 340);
  return { nodes: [src, ...nodes], edges: [...edges, { id: newId('e'), source: src.id, target: oldRoot.id }] };
}

// Fields a Segment node can condition on: outputs of every action node
// upstream of it (walking incoming edges backwards), however the canvas is
// currently wired — order-dependent, and updates live as you rewire.
function ancestorActionFields(nodeId, nodes, edges) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const visited = new Set();
  const fields = [];
  function walk(id) {
    edges.filter((e) => e.target === id).forEach((e) => {
      if (visited.has(e.source)) return;
      visited.add(e.source);
      const n = byId[e.source];
      if (n?.type === 'action') {
        const action = PIPELINE_ACTION_BY_KEY[n.data.action];
        action.fields.forEach((f) => fields.push({ ...f, actionLabel: action.label }));
      }
      walk(e.source);
    });
  }
  walk(nodeId);
  return fields;
}

/* ════════════════════════════════════════════════════════ flow node types */

// Dots stay invisible until there's a reason to notice them: hovering or
// selecting the node reveals every dot it has (so you can see where a new
// connection could go), and any dot that's already wired stays visible all
// the time regardless (so existing connections are never invisible). This
// needs to know, per handle, whether an edge actually uses it — hence
// useEdges() here rather than a plain CSS hover rule.
function useIsHandleConnected(nodeId, handleType, handleId) {
  const edges = useEdges();
  return edges.some((e) =>
    handleType === 'target'
      ? e.target === nodeId && (e.targetHandle || undefined) === handleId
      : e.source === nodeId && (e.sourceHandle || undefined) === handleId
  );
}
const POSITION_BY_SIDE = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };
function DotHandle({ nodeId, type, side, id, color, selected }) {
  const connected = useIsHandleConnected(nodeId, type, id);
  const visible = selected || connected;
  return (
    <Handle
      type={type}
      id={id}
      position={POSITION_BY_SIDE[side]}
      className={cx(
        '!h-2.5 !w-2.5 !border-2 !border-white transition-opacity duration-150',
        color,
        visible ? '!opacity-100' : '!opacity-0 group-hover:!opacity-100'
      )}
    />
  );
}

function SourceNode({ id, selected }) {
  return (
    <div className={cx('group relative w-52 rounded-[10px] border bg-amber-50 p-2.5 shadow-sm', selected ? 'border-amber-500 ring-2 ring-amber-300/50' : 'border-amber-300')}>
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[12px] text-white">📂</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Data input</div>
        </div>
      </div>
      {/* Root of the graph — source-only, but on all 4 sides so the first
          arrow can leave in whichever direction suits the layout. */}
      <SourceHandles nodeId={id} color="!bg-amber-500" selected={selected} sides={['right', 'bottom', 'left', 'top']} />
    </div>
  );
}

// Every non-branching node gets handles on all 4 sides split between target
// (left/top) and source (right/bottom) by default — the default (unlabeled)
// handle on each role's primary side keeps its position so old pipelines
// that never set sourceHandle/targetHandle still resolve to the same dot;
// the rest are purely extra places to grab a connection from or into.
function TargetHandles({ nodeId, color, selected, sides = ['left', 'top'] }) {
  return sides.map((side) => (
    <DotHandle key={side} nodeId={nodeId} type="target" side={side} id={side === 'left' ? undefined : `target-${side[0]}`} color={color} selected={selected} />
  ));
}
function SourceHandles({ nodeId, color, selected, sides = ['right', 'bottom'] }) {
  return sides.map((side) => (
    <DotHandle key={side} nodeId={nodeId} type="source" side={side} id={side === 'right' ? undefined : `source-${side[0]}`} color={color} selected={selected} />
  ));
}

function ActionNode({ id, data, selected }) {
  const action = PIPELINE_ACTION_BY_KEY[data.action];
  const partyText = action.parties
    ? action.parties.filter((p) => data.parties?.[p]).map((p) => PARTY_LABELS[p]).join(' + ') || 'No party selected'
    : null;
  return (
    <div className={cx('group relative w-52 rounded-[10px] border bg-white p-2.5 shadow-sm', selected ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
      <TargetHandles nodeId={id} color="!bg-slate-400" selected={selected} />
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px]">{action.icon}</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">{action.label}</div>
          {partyText && <div className="truncate text-[9.5px] text-muted">{partyText}</div>}
        </div>
      </div>
      <SourceHandles nodeId={id} color="!bg-slate-400" selected={selected} />
    </div>
  );
}

function SegmentNode({ id, data, selected }) {
  const segments = data.segments || [];
  return (
    <div className={cx('group relative w-52 rounded-[10px] border bg-brand-2/[.06] p-2.5 shadow-sm', selected ? 'border-brand-2 ring-2 ring-brand-2/30' : 'border-brand-2/40')}>
      <TargetHandles nodeId={id} color="!bg-brand-2" selected={selected} />
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-2 text-[11px] text-white">◆</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Segmentation</div>
          <div className="truncate text-[9.5px] text-muted">{segments.length} segment{segments.length === 1 ? '' : 's'}</div>
        </div>
      </div>
      <SourceHandles nodeId={id} color="!bg-brand-2" selected={selected} />
    </div>
  );
}

// A labeled outcome row used by branching nodes (SMS, Message delivered):
// the label sits inside the node body and its handle sits at the row's own
// right edge — `relative` on the row is what makes the handle (which React
// Flow always positions absolutely) anchor to *this row* instead of
// recentering on the whole node, so any number of outcomes can stack
// vertically without colliding or needing hand-computed offsets.
const BRANCH_TONE = {
  rose: { text: 'text-rose-600', dot: '!bg-rose-500' },
  emerald: { text: 'text-emerald-700', dot: '!bg-emerald-500' },
  amber: { text: 'text-amber-700', dot: '!bg-amber-500' },
};
// A single named outcome of a multi-branch step: label above, handle below —
// each anchored to *this column's own* position:relative wrapper (not a
// hand-computed offset) so any number of columns can sit side by side
// without colliding. Branches read left-to-right and hang downward, like a
// decision-tree fan-out, rather than stacking as a vertical list.
function BranchRow({ nodeId, label, tone, handleId, selected }) {
  const t = BRANCH_TONE[tone] || BRANCH_TONE.amber;
  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-center">
      <span className={cx('text-[9.5px] font-semibold leading-tight', t.text)}>{label}</span>
      <DotHandle nodeId={nodeId} type="source" side="bottom" id={handleId} color={t.dot} selected={selected} />
    </div>
  );
}
// The row of branch columns beneath a multi-branch node's header.
function BranchRail({ children, tone = 'line' }) {
  return <div className={cx('flex divide-x border-t', tone === 'emerald' ? 'divide-emerald-200 border-emerald-200' : 'divide-line border-line')}>{children}</div>;
}

// SMS and WhatsApp are both "message channel" steps: always exactly two
// outcomes — Delivered / Not delivered — shown as branch columns rather than
// dots-with-floating-labels. Delivered leads to a separate "Message
// delivered" state box (below), not link-tracking handles directly on this
// node; that's where any link-click branching (and, later, other
// delivered-only follow-ups) lives instead. Bottom is reserved for those two
// branch columns, so the generic target side gets left/top/right instead of
// just left/top, keeping all 4 sides usable.
function MessageNode({ id, channel, data, selected }) {
  const cfg = MESSAGE_CHANNELS[channel];
  const templates = templatesForChannel(channel);
  const templateId = data.templateId || templates[0]?._id;
  const template = templates.find((t) => t._id === templateId);
  const parties = data.parties || {};
  const partyText = [parties.applicant && 'Applicant', parties.co_applicant && 'Co-applicant'].filter(Boolean).join(' + ') || 'No party selected';
  return (
    <div className={cx('group relative w-56 overflow-hidden rounded-[10px] border bg-white shadow-sm', selected ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
      <TargetHandles nodeId={id} color="!bg-slate-400" selected={selected} sides={['left', 'top', 'right']} />
      <div className="flex items-center gap-2 p-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px]">{cfg.icon}</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">{cfg.label}</div>
          <div className="truncate text-[9.5px] text-muted">{partyText}</div>
        </div>
      </div>
      <div className="truncate px-2.5 pb-2 text-[9.5px] text-muted">{template ? template.template_id : 'No template selected'}</div>
      <BranchRail>
        <BranchRow nodeId={id} label="Not delivered" tone="rose" handleId="not_delivered" selected={selected} />
        <BranchRow nodeId={id} label="Delivered" tone="emerald" handleId="delivered" selected={selected} />
      </BranchRail>
    </div>
  );
}
function SmsNode(props) { return <MessageNode {...props} channel="sms" />; }
function WhatsAppNode(props) { return <MessageNode {...props} channel="whatsapp" />; }

// The "Message delivered" state — what a message step's Delivered branch
// feeds into, regardless of channel. It's a real node (not just a handle) so
// it can grow other exits later (export, a follow-up channel, …) via its own
// generic handle on the right, on top of whatever it's showing today (that
// handle is free either way now — link outcomes hang off the bottom as
// branch columns, not off the right, so there's no conflict when there IS a
// link). It has no settings of its own: whether it offers Link not
// clicked/Link clicked is read live off whichever upstream step feeds it —
// by template id, not by channel — via useNodes/useEdges, so the two can
// never drift out of sync. The red (failure) branch always renders on the
// left, same convention as SMS's Not delivered/Delivered.
function DeliveredNode({ id, selected }) {
  const nodes = useNodes();
  const edges = useEdges();
  const incoming = edges.find((e) => e.target === id && e.sourceHandle === 'delivered');
  const sourceNode = incoming ? nodes.find((n) => n.id === incoming.source) : null;
  const template = sourceNode ? templateById(sourceNode.data?.templateId) : null;
  const hasLink = templateHasLink(template);
  return (
    <div className={cx('group relative w-56 overflow-hidden rounded-[10px] border bg-emerald-50 shadow-sm', selected ? 'border-emerald-500 ring-2 ring-emerald-300/50' : 'border-emerald-300')}>
      <TargetHandles nodeId={id} color="!bg-emerald-500" selected={selected} />
      <div className="flex items-center gap-2 p-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-[12px] text-white">✓</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Message delivered</div>
          <div className="truncate text-[9.5px] text-muted">{template ? `via ${template.template_id}` : 'from a message step'}</div>
        </div>
      </div>
      {hasLink && (
        <BranchRail tone="emerald">
          <BranchRow nodeId={id} label="Link not clicked" tone="rose" handleId="link_not_clicked" selected={selected} />
          <BranchRow nodeId={id} label="Link clicked" tone="emerald" handleId="link_clicked" selected={selected} />
        </BranchRail>
      )}
      <DotHandle nodeId={id} type="source" side="right" id={undefined} color="!bg-emerald-500" selected={selected} />
    </div>
  );
}

// Automated Call is a wider multi-branch than the message channels: every
// possible call outcome gets its own branch column (not just pass/fail),
// reusing the same labels the rest of the app already shows for these
// (IVR_CALL_OUTCOMES in lib.js). Only "Answered" leads onward — into Call
// answered, below. Wider than the other nodes so 4 columns stay legible.
function IvrNode({ id, data, selected }) {
  const parties = data.parties || {};
  const partyText = [parties.applicant && 'Applicant', parties.co_applicant && 'Co-applicant'].filter(Boolean).join(' + ') || 'No party selected';
  return (
    <div className={cx('group relative w-80 overflow-hidden rounded-[10px] border bg-white shadow-sm', selected ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
      <TargetHandles nodeId={id} color="!bg-slate-400" selected={selected} sides={['left', 'top', 'right']} />
      <div className="flex items-center gap-2 p-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px]">☎</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Automated Call</div>
          <div className="truncate text-[9.5px] text-muted">{partyText}</div>
        </div>
      </div>
      <BranchRail>
        {IVR_CALL_OUTCOMES.map((o) => (
          <BranchRow key={o.key} nodeId={id} label={o.label} tone={o.key === 'answered' ? 'emerald' : toneFor(o.variant)} handleId={o.key} selected={selected} />
        ))}
      </BranchRail>
    </div>
  );
}

// The "Call answered" state — what an Automated Call step's Answered branch
// feeds into. Every keypad outcome the IVR script can capture (IVR_OPTIONS in
// lib.js) gets its own branch column; unlike message Delivered, this isn't
// template-dependent, so all 7 always show. Plus a generic handle on the
// right for whatever else should happen once someone's picked up, regardless
// of what they pressed. Wider still, to keep 7 columns legible.
function CallAnsweredNode({ id, selected }) {
  return (
    <div className={cx('group relative w-[30rem] overflow-hidden rounded-[10px] border bg-emerald-50 shadow-sm', selected ? 'border-emerald-500 ring-2 ring-emerald-300/50' : 'border-emerald-300')}>
      <TargetHandles nodeId={id} color="!bg-emerald-500" selected={selected} />
      <div className="flex items-center gap-2 p-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-[12px] text-white">✓</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Call answered</div>
          <div className="truncate text-[9.5px] text-muted">branches on keypad choice</div>
        </div>
      </div>
      <BranchRail tone="emerald">
        {IVR_OPTIONS.map((o) => (
          <BranchRow key={o.key} nodeId={id} label={o.label} tone={toneFor(o.variant)} handleId={o.key} selected={selected} />
        ))}
      </BranchRail>
      <DotHandle nodeId={id} type="source" side="right" id="source-b" color="!bg-emerald-500" selected={selected} />
    </div>
  );
}

// Retry is a terminal state — it's where a failed branch ends up, not a step
// that leads anywhere else, so unlike every other node it gets no source
// handle at all (nothing can be dragged out of it) — instead all 4 sides are
// available as targets, since incoming is the only direction that applies.
function RetryNode({ id, data, selected }) {
  return (
    <div className={cx('group relative w-52 rounded-[10px] border bg-amber-50 p-2.5 shadow-sm', selected ? 'border-amber-500 ring-2 ring-amber-300/50' : 'border-amber-300')}>
      <TargetHandles nodeId={id} color="!bg-amber-500" selected={selected} sides={['left', 'top', 'right', 'bottom']} />
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[12px] text-white">🔁</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Retry</div>
          <div className="truncate text-[9.5px] text-muted">
            {(data.schedule || []).length > 0
              ? `${data.schedule.map((s) => `${DAY_LABEL_BY_KEY[s.day]} ${s.time}`).join(', ')} · ${data.durationDays ?? 3}d`
              : 'No slots yet'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Report is a terminal step too: it collects every borrower who reaches it
// and turns them into a named report when the workflow runs.
function ReportNode({ id, data, selected }) {
  return (
    <div className={cx('group relative w-52 rounded-[10px] border bg-sky-50 p-2.5 shadow-sm', selected ? 'border-sky-500 ring-2 ring-sky-300/50' : 'border-sky-300')}>
      <TargetHandles nodeId={id} color="!bg-sky-500" selected={selected} sides={['left', 'top', 'right', 'bottom']} />
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500 text-[12px] text-white">📄</span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold leading-tight">Generate report</div>
          <div className="truncate text-[9.5px] text-muted">{data.reportName?.trim() || 'Unnamed report'}</div>
        </div>
      </div>
    </div>
  );
}

const NODE_TYPES = {
  report: ReportNode,
  source: SourceNode,
  action: ActionNode,
  sms: SmsNode,
  whatsapp: WhatsAppNode,
  delivered: DeliveredNode,
  ivr: IvrNode,
  call_answered: CallAnsweredNode,
  retry: RetryNode,
  segment: SegmentNode,
};

/* ═══════════════════════════════════════════════════ left rail — palette */

function ActionGroup({ group, onAdd }) {
  return (
    <div>
      <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">{group.label}</div>
      <div className="space-y-1.5">
        {PIPELINE_ACTIONS.filter((a) => a.kind === group.kind).map((a) => (
          <button
            key={a.key}
            className="flex w-full items-center gap-2 rounded-[10px] border border-line bg-white px-2.5 py-2 text-left text-[11.5px] font-semibold text-slate-600 shadow-sm hover:border-brand hover:text-brand"
            onClick={() => onAdd('action', a.key)}
            title={a.desc}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px]">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPalette({ onAdd }) {
  return (
    <div className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line p-3">
      <ActionGroup group={STEP_GROUPS.find((g) => g.kind === 'contactability')} onAdd={onAdd} />
      <div>
        <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">Flow control</div>
        <button
          className="flex w-full items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-2.5 py-2 text-left text-[11.5px] font-semibold text-amber-700 shadow-sm hover:border-amber-500"
          onClick={() => onAdd('retry')}
          title="Re-attempt a failed step on a schedule — drag a red 'not delivered'/'link not clicked' arrow onto empty canvas to add one already wired up"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[12px] text-white">🔁</span>
          Retry
        </button>
      </div>
      <div>
        <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">Output</div>
        <button
          className="flex w-full items-center gap-2 rounded-[10px] border border-sky-300 bg-sky-50 px-2.5 py-2 text-left text-[11.5px] font-semibold text-sky-700 shadow-sm hover:border-sky-500"
          onClick={() => onAdd('report')}
          title="Generate a report of every borrower who reaches this step"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500 text-[12px] text-white">📄</span>
          Generate report
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ inspector — a node */

function SourceInspector() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-[13px] text-white">📂</span>
        <div>
          <b className="text-[13px]">Data input</b>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted">
        The start of the workflow. It runs against the whole portfolio.
      </p>
    </div>
  );
}

function MessageInspector({ node, channel, onChange, onTemplateChange, onDelete }) {
  const cfg = MESSAGE_CHANNELS[channel];
  const templates = templatesForChannel(channel);
  const templateId = node.data.templateId || templates[0]?._id;
  const template = templates.find((t) => t._id === templateId);
  const parties = node.data.parties || {};
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[15px]">{cfg.icon}</span>
        <div>
          <b className="text-[13px]">{cfg.label}</b>
          <div className="text-[10px] capitalize text-muted">contactability</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
        <span className="field-label">Send to</span>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" className="accent-brand" checked={!!parties.applicant} onChange={(e) => onChange({ parties: { ...parties, applicant: e.target.checked } })} />
          Applicant
        </label>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" className="accent-brand" checked={!!parties.co_applicant} onChange={(e) => onChange({ parties: { ...parties, co_applicant: e.target.checked } })} />
          Co-applicant
        </label>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" className="accent-brand" checked={!!parties.nominee} onChange={(e) => onChange({ parties: { ...parties, nominee: e.target.checked } })} />
          Nominee
        </label>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <span className="field-label">Message template</span>
        <Select className="w-full text-[11.5px]" value={templateId || ''} onChange={(e) => onTemplateChange(e.target.value)}>
          {templates.map((t) => (
            <option key={t._id} value={t._id}>{t.template_id}</option>
          ))}
        </Select>
        {template && <p className="text-[10.5px] leading-snug text-muted">{template.template_message}</p>}
      </div>

      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}
function SmsInspector(props) { return <MessageInspector {...props} channel="sms" />; }
function WhatsAppInspector(props) { return <MessageInspector {...props} channel="whatsapp" />; }

function DeliveredInspector({ node, nodes, edges, onDelete }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-[13px] text-white">✓</span>
        <div>
          <b className="text-[13px]">Message delivered</b>
          <div className="text-[10px] text-muted">state, not a setting — fed by a message step's Delivered branch</div>
        </div>
      </div>
      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

function IvrInspector({ node, onChange, onDelete }) {
  const parties = node.data.parties || {};
  const scriptId = node.data.scriptId || IVR_SCRIPTS[0]?.id;
  const script = IVR_SCRIPT_BY_ID[scriptId];
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[15px]">☎</span>
        <div>
          <b className="text-[13px]">Automated Call</b>
          <div className="text-[10px] capitalize text-muted">contactability</div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
        <span className="field-label">Call</span>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" className="accent-brand" checked={!!parties.applicant} onChange={(e) => onChange({ parties: { ...parties, applicant: e.target.checked } })} />
          Applicant
        </label>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" className="accent-brand" checked={!!parties.co_applicant} onChange={(e) => onChange({ parties: { ...parties, co_applicant: e.target.checked } })} />
          Co-applicant
        </label>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <span className="field-label">IVR script</span>
        <Select className="w-full text-[11.5px]" value={scriptId} onChange={(e) => onChange({ scriptId: e.target.value })}>
          {IVR_SCRIPTS.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.language}</option>
          ))}
        </Select>
        {script && (
          <>
            <p className="mt-1.5 rounded-[8px] bg-slate-50 px-2.5 py-2 text-[11px] italic leading-relaxed text-slate-600">
              “{script.body}”
            </p>
            <div className="mt-1.5 grid gap-1">
              {script.digits.map(([d, key]) => {
                const o = IVR_OPTION_BY_KEY[key];
                return (
                  <div key={d} className="flex items-center gap-2 rounded-[8px] border border-line px-2 py-1 text-[11px]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold">{d}</span>
                    <span className="text-muted">→</span>
                    {o ? <Tag variant={o.variant}>{o.label}</Tag> : key}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

function CallAnsweredInspector({ onDelete }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-[13px] text-white">✓</span>
        <div>
          <b className="text-[13px]">Call answered</b>
          <div className="text-[10px] text-muted">state, not a setting — fed by an Automated Call step's Answered branch</div>
        </div>
      </div>
      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

const DAY_ORDER = Object.fromEntries(DAYS_OF_WEEK.map((d, i) => [d.key, i]));
const sortSchedule = (schedule) =>
  [...schedule].sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time));

function RetryInspector({ node, onChange, onDelete }) {
  const data = node.data;
  const schedule = data.schedule || [];
  const [day, setDay] = useState(DAYS_OF_WEEK[0].key);
  const [time, setTime] = useState('10:00');

  const addSlot = () => onChange({ schedule: sortSchedule([...schedule, { day, time }]) });
  const removeSlot = (i) => onChange({ schedule: schedule.filter((_, si) => si !== i) });

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-[13px] text-white">🔁</span>
        <div>
          <b className="text-[13px]">Retry</b>
          <div className="text-[10px] text-muted">re-attempt on a schedule</div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <span className="field-label">Add a day &amp; time</span>
        <div className="flex items-center gap-1.5">
          <Select className="text-[11.5px]" value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </Select>
          <Input type="time" className="h-8 w-28 text-[11.5px]" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button size="xs" variant="primary" onClick={addSlot}>+ Add</Button>
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-line pt-3">
        <span className="field-label">Schedule</span>
        {schedule.length === 0 ? (
          <div className="text-[10.5px] text-muted">No slots yet — add at least one day &amp; time above.</div>
        ) : (
          <div className="space-y-1">
            {schedule.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[11.5px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 text-[9px] font-bold">{i + 1}</span>
                <span className="font-semibold">{DAY_LABEL_BY_KEY[slot.day]}</span>
                <span className="text-muted">·</span>
                <span>{slot.time}</span>
                <button className="ml-auto text-danger" onClick={() => removeSlot(i)} title="Remove slot">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <div className="flex items-center gap-1.5">
          <span className="field-label">Repeat -</span>
          <Input
            type="number"
            min={1}
            className="h-8 w-20 text-[11.5px]"
            value={data.durationDays ?? 3}
            onChange={(e) => onChange({ durationDays: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

function ReportInspector({ node, onChange, onDelete }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 text-[13px] text-white">📄</span>
        <div>
          <b className="text-[13px]">Generate report</b>
          <div className="text-[10px] text-muted">collects every borrower who reaches this step</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <span className="field-label">Report name</span>
        <Input className="w-full text-[11.5px]" value={node.data.reportName || ''} onChange={(e) => onChange({ reportName: e.target.value })} placeholder="e.g. SMS not delivered" />
      </div>
      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <span className="field-label">Report description</span>
        <Textarea rows={3} className="w-full text-[11.5px]" value={node.data.reportDescription || ''} onChange={(e) => onChange({ reportDescription: e.target.value })} placeholder="e.g. Needs a doorstep visit before month end" />
        <p className="text-[10.5px] leading-snug text-muted">When the workflow runs, a report with this name and description is created under Reports.</p>
      </div>
      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

function ActionInspector({ node, onChange, onDelete }) {
  const action = PIPELINE_ACTION_BY_KEY[node.data.action];
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[15px]">{action.icon}</span>
        <div>
          <b className="text-[13px]">{action.label}</b>
          <div className="text-[10px] capitalize text-muted">{action.kind}</div>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted">{action.desc}</p>
      {action.parties && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
          <span className="field-label">Run for</span>
          {action.parties.map((p) => (
            <label key={p} className="flex items-center gap-1.5 font-semibold">
              <input
                type="checkbox"
                className="accent-brand"
                checked={!!node.data.parties?.[p]}
                onChange={(e) => onChange({ parties: { ...node.data.parties, [p]: e.target.checked } })}
              />
              {PARTY_LABELS[p]}
            </label>
          ))}
        </div>
      )}
      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

function SegmentInspector({ node, nodes, edges, onChange, onDelete }) {
  const fields = ancestorActionFields(node.id, nodes, edges);
  const segments = node.data.segments || [];

  function updateSegment(sgId, patch) {
    onChange({ segments: segments.map((sg) => (sg.id === sgId ? { ...sg, ...patch } : sg)) });
  }
  function addSegment() {
    onChange({ segments: [...segments, { id: newId('sg'), name: `Segment ${segments.length + 1}`, conditions: [] }] });
  }
  function removeSegment(sgId) {
    onChange({ segments: segments.filter((sg) => sg.id !== sgId) });
  }
  function addCondition(sgId) {
    const sg = segments.find((s) => s.id === sgId);
    updateSegment(sgId, { conditions: [...sg.conditions, { field: fields[0]?.key || '', op: 'eq', value: '' }] });
  }
  function updateCondition(sgId, ci, patch) {
    const sg = segments.find((s) => s.id === sgId);
    updateSegment(sgId, { conditions: sg.conditions.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });
  }
  function removeCondition(sgId, ci) {
    const sg = segments.find((s) => s.id === sgId);
    updateSegment(sgId, { conditions: sg.conditions.filter((_, i) => i !== ci) });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-2 text-[13px] text-white">◆</span>
        <b className="text-[13px]">Segmentation</b>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted">
        {fields.length === 0
          ? 'Connect an action step into this one first — its outputs become available here.'
          : `Fields available from ${new Set(fields.map((f) => f.actionLabel)).size} upstream step(s).`}
      </p>
      <div className="mt-3 space-y-2">
        {segments.map((sg) => (
          <div key={sg.id} className="rounded-lg border border-line bg-white p-2">
            <div className="flex items-center gap-1.5">
              <Input className="h-7 flex-1 text-[11.5px] font-semibold" value={sg.name} onChange={(e) => updateSegment(sg.id, { name: e.target.value })} />
              <button className="text-[10px] font-semibold text-muted hover:text-danger" onClick={() => removeSegment(sg.id)}>✕</button>
            </div>
            <div className="mt-1.5 space-y-1.5">
              {sg.conditions.map((c, ci) => (
                <div key={ci} className="space-y-1 rounded border border-dashed border-line p-1.5">
                  <Select className="h-7 w-full text-[10.5px]" value={c.field} disabled={fields.length === 0} onChange={(e) => updateCondition(sg.id, ci, { field: e.target.value })}>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </Select>
                  <div className="flex items-center gap-1">
                    <Select className="h-7 w-14 text-[10.5px]" value={c.op} onChange={(e) => updateCondition(sg.id, ci, { op: e.target.value })}>
                      {SEGMENT_OPERATORS.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </Select>
                    <Input className="h-7 flex-1 text-[10.5px]" value={c.value} onChange={(e) => updateCondition(sg.id, ci, { value: e.target.value })} placeholder="value" />
                    <button className="text-[10px] text-muted hover:text-danger" onClick={() => removeCondition(sg.id, ci)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="text-[10.5px] font-semibold text-brand disabled:text-slate-300" disabled={fields.length === 0} onClick={() => addCondition(sg.id)}>
                + condition
              </button>
              {sg.conditions.length > 1 && <div className="text-[9.5px] text-muted">all conditions must match (AND)</div>}
            </div>
          </div>
        ))}
        <button className="text-[11px] font-semibold text-brand" onClick={addSegment}>+ Add segment</button>
        {segments.length === 0 && <div className="text-[11px] text-muted">No segments yet.</div>}
      </div>
      <Button size="xs" variant="danger" className="mt-4" onClick={onDelete}>
        Delete step
      </Button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ page */

// Wrapped in a provider because dragging a "not delivered"/"link not
// clicked" arrow out onto empty canvas (to auto-create a wired-up Retry
// step) needs `useReactFlow()`'s screenToFlowPosition, which only works
// inside a ReactFlowProvider.
export default function PipelineBuilderPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

// Handles that auto-spawn a connected step, already wired up, when their
// arrow is dropped on empty canvas instead of onto an existing node.
const SPAWN_NODE_FOR_HANDLE = {
  not_delivered: 'retry', link_not_clicked: 'retry', delivered: 'delivered',
  no_answer: 'retry', busy: 'retry', answered: 'call_answered',
};
// Steps whose "next node" is a deliberate, named choice (a multi-branch or a
// terminal state) rather than a single generic exit — addNode's tail
// auto-wire skips these when picking what a newly-added node chains after.
const NO_AUTO_TAIL_TYPES = ['sms', 'whatsapp', 'delivered', 'ivr', 'call_answered', 'retry', 'report'];
function newRetryData() {
  return { schedule: DAYS_OF_WEEK.map((d) => ({ day: d.key, time: '10:00' })), durationDays: 3 };
}
function newNodeData(type) {
  if (type === 'retry') return newRetryData();
  if (type === 'report') return { reportName: '' };
  return {};
}

function Builder() {
  const { pipelineDraft, closePipelineBuilder, savePipeline, removePipeline } = useUI();
  const initial = pipelineDraft && pipelineDraft !== 'new' ? pipelineDraft : null;
  const { screenToFlowPosition } = useReactFlow();

  const seeded = useState(() => ensureSource(initial?.nodes || [], initial?.edges || []))[0];

  const [name, setName] = useState(initial?.name || '');
  const [nodes, setNodes, onNodesChange] = useNodesState(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seeded.edges);
  const [selectedId, setSelectedId] = useState(null);

  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  // Drag a source handle out and release over empty canvas → if it's one of
  // the handles in SPAWN_NODE_FOR_HANDLE, drop the matching step right
  // there, pre-wired (SMS's Not delivered/a Delivered node's Link not
  // clicked → Retry; SMS's Delivered → a Message delivered node).
  const onConnectEnd = useCallback((event, connectionState) => {
    if (connectionState.isValid) return;
    const handleId = connectionState.fromHandle?.id;
    const spawnType = SPAWN_NODE_FOR_HANDLE[handleId];
    const sourceNodeId = connectionState.fromNode?.id;
    if (!sourceNodeId || !spawnType) return;
    if (!event.target?.classList?.contains('react-flow__pane')) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    const position = screenToFlowPosition({ x: point.clientX, y: point.clientY });
    const id = newId('n');
    setNodes((nds) => nds.concat({ id, type: spawnType, position, data: newNodeData(spawnType) }));
    setEdges((eds) => eds.concat({ id: newId('e'), source: sourceNodeId, sourceHandle: handleId, target: id, targetHandle: 'target-t' }));
    setSelectedId(id);
  }, [screenToFlowPosition, setNodes, setEdges]);

  // Click an arrow to remove that connection — no separate select-then-delete
  // step, and no confirmation (same as deleting a node from its inspector).
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [setEdges]);

  // Steps that always bring a paired "state" node along with them, already
  // wired to their success handle — that state is inherent to taking the
  // action at all (like the pipeline's Source node always existing), not
  // something to discover via a drag. Keyed by the action key from the
  // palette; value is { handle, type: the paired node's type }.
  const PAIRED_STATE_FOR_ACTION = {
    sms: { handle: 'delivered', type: 'delivered', data: () => ({ parties: { applicant: true, co_applicant: false }, templateId: templatesForChannel('sms')[0]?._id }) },
    whatsapp: { handle: 'delivered', type: 'delivered', data: () => ({ parties: { applicant: true, co_applicant: false }, templateId: templatesForChannel('whatsapp')[0]?._id }) },
    ivr: { handle: 'answered', type: 'call_answered', data: () => ({ parties: { applicant: true, co_applicant: false }, scriptId: IVR_SCRIPTS[0]?.id }) },
  };

  function addNode(kind, actionKey) {
    const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x), -260);
    // Multi-branch/state steps have no single generic exit safe to blind-wire
    // into — skip them when picking what the newly-added node chains after.
    const tail = nodes.find((n) => !NO_AUTO_TAIL_TYPES.includes(n.type) && !edges.some((e) => e.source === n.id));
    const id = newId('n');
    const position = { x: maxX + 300, y: 140 };

    const paired = PAIRED_STATE_FOR_ACTION[actionKey];
    if (paired) {
      const stateId = newId('n');
      setNodes((nds) => nds.concat(
        { id, type: actionKey, position, data: paired.data() },
        // Below and to the right, not directly beside — its handle hangs off
        // the *bottom* of this node now, so the paired state should read as
        // a child in the branch tree, not a same-row neighbour. Leaves room
        // to the lower-left for a Retry step off Not delivered, if dragged.
        { id: stateId, type: paired.type, position: { x: position.x + 60, y: position.y + 230 }, data: {} }
      ));
      setEdges((eds) => {
        const next = tail ? eds.concat({ id: newId('e'), source: tail.id, target: id }) : eds;
        return next.concat({ id: newId('e'), source: id, sourceHandle: paired.handle, target: stateId, targetHandle: 'target-t' });
      });
      setSelectedId(id);
      return;
    }

    let type = kind;
    let data;
    if (kind === 'segment') {
      data = { segments: [] };
    } else if (kind === 'retry') {
      data = newRetryData();
    } else if (kind === 'report') {
      data = newNodeData('report');
    } else {
      type = 'action';
      data = { action: actionKey, ...(PIPELINE_ACTION_BY_KEY[actionKey].parties ? { parties: { applicant: true, co_applicant: false } } : {}) };
    }
    setNodes((nds) => [...nds, { id, type, position, data }]);
    if (tail) setEdges((eds) => [...eds, { id: newId('e'), source: tail.id, target: id }]);
    setSelectedId(id);
  }
  function updateSelected(patchData) {
    setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patchData } } : n)));
  }
  // Switching a message step (SMS or WhatsApp) to a template with a
  // different link/no-link shape retires whichever handles no longer exist
  // on the "Message delivered" node(s) it feeds, so a stray edge can't point
  // at a dot that's vanished (the message step's own two handles are fixed
  // and never change with the template).
  function updateMessageTemplate(templateId) {
    const hasLink = templateHasLink(templateById(templateId));
    const deliveredIds = edges.filter((e) => e.source === selectedId && e.sourceHandle === 'delivered').map((e) => e.target);
    setEdges((eds) => eds.filter((e) => {
      if (!deliveredIds.includes(e.source)) return true;
      if (hasLink) return true;
      return e.sourceHandle !== 'link_clicked' && e.sourceHandle !== 'link_not_clicked';
    }));
    updateSelected({ templateId });
  }
  function deleteSelected() {
    if (nodes.find((n) => n.id === selectedId)?.type === 'source') return;
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) || null;
  const canSave = name.trim() && nodes.some((n) => n.type !== 'source');

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-white px-4 py-2">
        <Button size="xs" onClick={closePipelineBuilder}>← Back</Button>
        <div className="mx-1 h-5 w-px bg-line" />
        <span className="shrink-0 text-[11.5px] font-bold text-ink">{initial ? 'Edit workflow' : 'New workflow'}</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name…"
          className="h-8 max-w-[220px] py-0 text-[12px]"
        />
        <span className="hidden truncate text-[10.5px] text-muted sm:block">
          Drag steps from the left onto the canvas, wire them up by dragging between the dots, click an arrow to delete it.
        </span>
        <div className="flex-1" />
        {initial && (
          <button
            className="text-[10.5px] font-semibold text-muted hover:text-danger"
            onClick={() => {
              removePipeline(initial.id);
              closePipelineBuilder();
            }}
          >
            Delete workflow
          </button>
        )}
        <Button
          size="xs"
          variant="primary"
          disabled={!canSave}
          onClick={() => savePipeline({ id: initial?.id || newId('pl'), name: name.trim(), createdAt: initial?.createdAt || new Date().toISOString(), nodes, edges })}
        >
          Save workflow
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <StepPalette onAdd={addNode} />
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges(edges)}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onEdgeClick={onEdgeClick}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <div className="w-72 shrink-0 overflow-y-auto border-l border-line p-3">
          {!selectedNode ? (
            <Empty>Click a step on the canvas to configure it.</Empty>
          ) : selectedNode.type === 'source' ? (
            <SourceInspector node={selectedNode} onChange={updateSelected} />
          ) : selectedNode.type === 'action' ? (
            <ActionInspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} />
          ) : selectedNode.type === 'sms' ? (
            <SmsInspector node={selectedNode} onChange={updateSelected} onTemplateChange={updateMessageTemplate} onDelete={deleteSelected} />
          ) : selectedNode.type === 'whatsapp' ? (
            <WhatsAppInspector node={selectedNode} onChange={updateSelected} onTemplateChange={updateMessageTemplate} onDelete={deleteSelected} />
          ) : selectedNode.type === 'delivered' ? (
            <DeliveredInspector node={selectedNode} nodes={nodes} edges={edges} onDelete={deleteSelected} />
          ) : selectedNode.type === 'ivr' ? (
            <IvrInspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} />
          ) : selectedNode.type === 'call_answered' ? (
            <CallAnsweredInspector onDelete={deleteSelected} />
          ) : selectedNode.type === 'report' ? (
            <ReportInspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} />
          ) : selectedNode.type === 'retry' ? (
            <RetryInspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected} />
          ) : (
            <SegmentInspector node={selectedNode} nodes={nodes} edges={edges} onChange={updateSelected} onDelete={deleteSelected} />
          )}
        </div>
      </div>
    </div>
  );
}
