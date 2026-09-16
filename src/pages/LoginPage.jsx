import React, { useState } from 'react';
import { Card, Button, Field, Input } from '../ui.jsx';

const MIN_PASSWORD = 8;

// login → (first login with a temporary password) → forced password change → console
export default function LoginPage() {
  const [mode, setMode] = useState('login'); // login | register | firstchange | done
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstLogin, setFirstLogin] = useState(false);

  // forced-change fields
  const [temp, setTemp] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;
  const canChange = temp.length > 0 && next.length >= MIN_PASSWORD && next === confirm && next !== temp;

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4">
      <Card pad className="w-[400px] max-w-[92vw]">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 font-black text-white shadow-brand">
            S
          </div>
          <div>
            <b className="text-lg">Saralya</b>
            <div className="text-[11px] text-muted">Collections OS</div>
          </div>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <>
            <h2 className="m-0 text-xl font-bold">{mode === 'login' ? 'Welcome back' : 'Set up your account'}</h2>
            <p className="mb-5 mt-1 text-[13px] text-muted">
              {mode === 'login' ? 'Sign in to run and review collection scoring.' : 'Register to start using Saralya.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // A first login with the emailed temporary password can't reach the
                // console — the admin is sent to set their own password first.
                if (mode === 'login' && firstLogin) {
                  setTemp(password);
                  setMode('firstchange');
                } else {
                  setMode('done');
                }
              }}
              className="space-y-3"
            >
              {mode === 'register' && (
                <Field label="Full name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
                </Field>
              )}
              <Field label="Email" required>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </Field>
              <Field label={mode === 'login' && firstLogin ? 'Temporary password (from your invite email)' : 'Password'} required hint={mode === 'register' ? 'Minimum 8 characters' : undefined}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </Field>

              {mode === 'login' && (
                <label className="flex items-center gap-2 text-[11.5px] text-muted">
                  <input type="checkbox" checked={firstLogin} onChange={(e) => setFirstLogin(e.target.checked)} />
                  This is my first login — I have a temporary password
                </label>
              )}

              <Button variant="primary" type="submit" className="w-full py-3">
                {mode === 'login' ? (firstLogin ? 'Continue' : 'Sign in') : 'Create account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-[13px] text-muted">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button className="font-semibold text-brand" onClick={() => setMode('register')}>
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button className="font-semibold text-brand" onClick={() => setMode('login')}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {mode === 'firstchange' && (
          <>
            <h2 className="m-0 text-xl font-bold">Set a new password</h2>
            <p className="mb-4 mt-1 text-[13px] leading-relaxed text-muted">
              Your account was created with a temporary password. Choose your own password to continue — you won't be
              able to reach the console until you do.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canChange) setMode('done');
              }}
              className="space-y-3"
            >
              <Field label="Temporary password" required>
                <Input type="password" value={temp} onChange={(e) => setTemp(e.target.value)} />
              </Field>
              <Field label="New password" required hint={`At least ${MIN_PASSWORD} characters, and different from the temporary one.`}>
                <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
              </Field>
              <Field label="Confirm new password" required>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              {mismatch && <div className="text-[11px] text-danger">Those two passwords don't match.</div>}
              <Button variant="primary" type="submit" className="w-full py-3" disabled={!canChange}>
                Set password &amp; continue
              </Button>
            </form>
          </>
        )}

        {mode === 'done' && (
          <>
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
            <h2 className="m-0 text-center text-xl font-bold">You're in</h2>
            <p className="mb-4 mt-1 text-center text-[13px] text-muted">
              (Prototype — this is where the real app would drop you into the console.)
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setMode('login');
                setPassword('');
                setTemp('');
                setNext('');
                setConfirm('');
                setFirstLogin(false);
              }}
            >
              Back to sign in
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
