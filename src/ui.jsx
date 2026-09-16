import React, { useEffect } from 'react';

/* Verbatim copy of the production client's src/ui/index.jsx — the shared design
   system. Keep this identical to the source so the prototype looks like the
   real app. */

/* Utility to conditionally join class names. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* --------------------------------------------------------------- Card */
export function Card({ className = '', pad = false, children, ...rest }) {
  return (
    <div className={cx('card', pad && 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- Button */
const BTN_VARIANTS = {
  default: 'btn',
  primary: 'btn btn-primary',
  soft: 'btn btn-soft',
  danger: 'btn btn-danger',
};
export function Button({ variant = 'default', size, className = '', children, ...rest }) {
  return (
    <button className={cx(BTN_VARIANTS[variant] || BTN_VARIANTS.default, size === 'xs' && 'btn-xs', className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Tag */
const TAG_VARIANTS = {
  default: 'tag',
  green: 'tag tag-green',
  amber: 'tag tag-amber',
  red: 'tag tag-red',
  purple: 'tag tag-purple',
  blue: 'tag tag-blue',
};
export function Tag({ variant = 'default', className = '', children }) {
  return <span className={cx(TAG_VARIANTS[variant] || TAG_VARIANTS.default, className)}>{children}</span>;
}

/* -------------------------------------------------------------- Fields */
export function Field({ label, required, hint, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      <span className="field-label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-muted">{hint}</span>}
    </label>
  );
}
export const Input = React.forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={cx('input', className)} {...rest} />;
});
export const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx('select', className)} {...rest}>
      {children}
    </select>
  );
});
export const Textarea = React.forwardRef(function Textarea({ className = '', ...rest }, ref) {
  return <textarea ref={ref} className={cx('textarea', className)} {...rest} />;
});

/* --------------------------------------------------------- Page header */
export function PageHead({ title, subtitle, actions }) {
  if (!title && !subtitle) {
    return actions ? <div className="mb-5 flex flex-wrap justify-end gap-2.5">{actions}</div> : null;
  }
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
      <div>
        {title && <h1 className="m-0 text-[25px] font-bold tracking-[-.03em]">{title}</h1>}
        {subtitle && <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------- Section title */
export function SectionTitle({ title, note, children }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {children || (note && <span>{note}</span>)}
    </div>
  );
}

/* ---------------------------------------------------------- Empty state */
export function Empty({ children = 'Nothing here yet.', className = '' }) {
  return <div className={cx('empty', className)}>{children}</div>;
}

/* -------------------------------------------------------------- Banners */
export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
      {children}
    </div>
  );
}
export function InfoNote({ children, tone = 'amber' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={cx('mb-4 inline-flex items-start gap-2 rounded-[10px] border px-3.5 py-2.5 text-[11.5px]', tones[tone])}>
      <span className="text-amber-500">★</span>
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------- Spinner */
export function Spinner({ className = '' }) {
  return (
    <span
      className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

/* --------------------------------------------------------------- Toggle */
export function Toggle({ on, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex h-[21px] w-[38px] items-center rounded-full p-[3px] transition',
        on ? 'justify-end bg-ok' : 'justify-start bg-slate-300',
        disabled && 'opacity-50'
      )}
    >
      <span className="h-[15px] w-[15px] rounded-full bg-white shadow" />
    </button>
  );
}

/* ---------------------------------------------------------------- Modal */
export function Modal({ open, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={cx(
          'w-full max-h-[90vh] overflow-y-auto rounded-xl3 bg-white p-6 shadow-pop animate-pop-in',
          widths[size]
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Drawer */
export function Drawer({ open, onClose, children, width = 'lg' }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = {
    md: 'max-w-2xl',
    lg: 'max-w-[900px]',
    xl: 'max-w-[1180px]',
  };
  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-slate-900/50 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={cx(
          'flex h-full w-full flex-col overflow-y-auto bg-white shadow-pop animate-slide-in-right',
          widths[width]
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ title, subtitle, onClose, actions }) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
      <div className="min-w-0">
        <h2 className="m-0 truncate text-[18px] font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {actions}
        {onClose && (
          <Button size="xs" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        )}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="m-0 text-[18px] font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      </div>
      {onClose && (
        <Button size="xs" onClick={onClose} aria-label="Close">
          ✕
        </Button>
      )}
    </div>
  );
}
