/* Simple password lock. Loaded in the <head> of every page so it runs before the page shows.
   This keeps casual visitors out; it is not strong security (see notes in the chat). */
(function () {
  const AK = 'kulikuli_auth', SK = 'kulikuli_session';
  const onLogin = /login\.html$/.test(location.pathname);
  window.Auth = {
    has: () => !!localStorage.getItem(AK),
    ok: () => sessionStorage.getItem(SK) === '1',
    async hash(pw, salt) {
      const text = salt + pw;
      if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
      }
      let h = 5381; for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
      return 'x' + h;
    },
    async set(pw) { const salt = Math.random().toString(36).slice(2); localStorage.setItem(AK, JSON.stringify({ salt, h: await this.hash(pw, salt) })); },
    async check(pw) { const a = JSON.parse(localStorage.getItem(AK) || 'null'); return !!a && a.h === await this.hash(pw, a.salt); },
    start: () => sessionStorage.setItem(SK, '1'),
    out: () => { sessionStorage.removeItem(SK); location.replace('login.html'); },
    reset: () => { localStorage.removeItem(AK); localStorage.removeItem('kulikuli_books_v1'); sessionStorage.removeItem(SK); }
  };
  if (!onLogin && !Auth.ok()) location.replace('login.html');
})();
