// Thin client for the prototype's persistence server (server/index.js).
// One JSON blob in, one JSON blob out — no schema, no error surfacing to the
// user; if the server isn't running the app just falls back to dummy data.

export async function loadPersisted() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function savePersisted(blob) {
  fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blob),
  }).catch(() => {});
}
