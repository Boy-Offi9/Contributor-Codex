window.Codex = (() => {
  const API_BASE = 'https://contributor-codex.vercel.app';
  const GITHUB_API = 'https://api.github.com';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

  const enc = encodeURIComponent;

  function apiUrl(path, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    const qs = query.toString();
    return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  }

  function message(text, isError = false) {
    const el = document.createElement('span');
    el.className = `msg${isError ? ' err' : ''}`;
    el.textContent = text;
    return el;
  }

  function setStatus(el, text, isError = false) {
    el.textContent = text || '';
    el.classList.toggle('err', Boolean(isError));
  }

  function loadImage(target, src, options = {}) {
    const {
      alt = '',
      loading = 'generating…',
      failure = "couldn't load this preview — try again in a minute",
      onLoad,
      onError,
    } = options;
    target.replaceChildren(message(loading));
    const img = new Image();
    img.alt = alt;
    img.decoding = 'async';
    img.onload = () => {
      target.replaceChildren(img);
      if (onLoad) onLoad(img);
    };
    img.onerror = () => {
      target.replaceChildren(message(failure, true));
      if (onError) onError();
    };
    img.src = src;
    return img;
  }

  async function copyText(button, text, labels = {}) {
    const { done = 'Copied ✓', fail = 'Copy failed' } = labels;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    clearTimeout(button._resetTimer);
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    button.textContent = ok ? done : fail;
    button._resetTimer = setTimeout(() => { button.textContent = button.dataset.label; }, 1500);
    return ok;
  }

  async function ghFetch(path, token) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${GITHUB_API}${path}`, { headers });
    if (!res.ok) {
      const err = new Error(`${res.status} ${res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  function describeGhError(err, notFound) {
    if (err.status === 404) return notFound;
    if (err.status === 403) return 'Rate limited by GitHub — add a token above and try again.';
    return `Failed to load: ${err.message}`;
  }

  function onEnter(el, handler) {
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') handler(event);
    });
  }

  return { API_BASE, $, $$, esc, enc, apiUrl, message, setStatus, loadImage, copyText, ghFetch, describeGhError, onEnter };
})();
