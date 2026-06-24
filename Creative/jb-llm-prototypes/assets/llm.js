// llm.js — drop-in browser helper for LLM calls from an HTML prototype.
//
// Exposes window.llm.complete(...), mirroring the hosted window.claude.complete
// signature so prototype code stays portable:
//
//   const text = await window.llm.complete("Summarize this: ...");
//   const text = await window.llm.complete({
//     messages: [{ role: 'user', content: '...' }],
//     system: 'You are terse.',     // optional
//     max_tokens: 512,              // optional
//   });
//
// Always resolves to a STRING (the model's text). Throws on error.
//
// The request goes to the local llm-proxy (POST /api/complete) — the API key
// lives only in the proxy's .env, never here. Serve this prototype THROUGH the
// proxy (run `node llm-proxy.mjs` in this folder and open the printed URL) so
// the /api/complete path resolves. To point elsewhere, set window.LLM_ENDPOINT
// before this script loads.
(function () {
  const ENDPOINT = (typeof window !== 'undefined' && window.LLM_ENDPOINT) || '/api/complete';

  async function complete(input, opts = {}) {
    // Accept a bare string OR an options object ({prompt|messages, system, ...}).
    const body = typeof input === 'string' ? { prompt: input, ...opts } : { ...input, ...opts };

    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `llm.complete: could not reach the proxy at ${ENDPOINT}. ` +
        `Is it running? (node llm-proxy.mjs)  [${err.message}]`
      );
    }

    let data = {};
    try { data = await res.json(); } catch { /* leave {} */ }
    if (!res.ok) throw new Error(`llm.complete: ${data.error || res.status + ' ' + res.statusText}`);
    return data.text ?? '';
  }

  window.llm = { complete };
})();
