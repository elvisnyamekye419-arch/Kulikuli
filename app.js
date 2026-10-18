/* KuliKuli Ghana books: storage, pages, reports. Data lives in this browser (localStorage). */
const KEY = 'kulikuli_books_v1', INVESTOR_RATE = 0.3;
let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!db || !Array.isArray(db.sales) || !Array.isArray(db.expenses)) db = { sales: [], expenses: [] };
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const $ = s => document.querySelector(s);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ghs = n => 'GHS ' + (+n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const total = s => s.qty * s.price;
const isPaid = s => s.status === 'Paid';
const fdate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/* Navigation and backup buttons */
function chrome() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = [['index.html', 'Sales'], ['expenses.html', 'Expenses'], ['payments.html', 'Payment status'], ['reports.html', 'Reports']];
  $('#nav').innerHTML = '<div class="brand">KuliKuli Ghana<small>MF Empowerment &amp; Trading Center</small></div>' +
    links.map(([h, t]) => `<a href="${h}" class="${here === h ? 'on' : ''}">${t}</a>`).join('') + '<a href="#" id="lo" class="out">Log out</a>';
  $('#lo').onclick = e => { e.preventDefault(); Auth.out(); };
  $('#foot').innerHTML = '<button class="ghost" id="bk">Download backup</button><label class="btn ghost">Restore backup<input type="file" id="rs" accept=".json" hidden></label><a class="btn ghost" href="login.html?change=1">Change password</a><span>Records are saved in this browser only. Download a backup often.</span>';
  $('#bk').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: 'application/json' }));
    a.download = 'kulikuli-backup-' + today() + '.json'; a.click();
  };
  $('#rs').onchange = e => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.sales) || !Array.isArray(d.expenses)) throw 0;
        if (confirm('Replace all records on this device with the backup file?')) { db = d; save(); location.reload(); }
      } catch (x) { alert('That file is not a KuliKuli backup.'); }
    };
    r.readAsText(e.target.files[0]);
  };
}

/* Shared entry page: form, month filter, search, edit and delete */
function listPage(o) {
  const f = $('#f'), E = f.elements, m = $('#m'), q = $('#q'); let edit = null;
  m.value = today().slice(0, 7);
  const rows = () => db[o.key].filter(x => (!m.value || x.date.startsWith(m.value)) && o.text(x).toLowerCase().includes(q.value.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  const draw = () => {
    const r = rows();
    $('#body').innerHTML = r.map(o.row).join('') || `<tr><td colspan="${o.cols}" class="empty">Nothing recorded for this selection yet. Add an entry above.</td></tr>`;
    $('#sum').textContent = o.sum(r);
  };
  const reset = () => {
    edit = null; f.reset(); E.date.value = today(); $('#cancel').hidden = true; $('.save').textContent = 'Save';
    f.dispatchEvent(new Event('input'));
  };
  const soft = () => {
    edit = null; (o.clear || []).forEach(n => E[n].value = ''); $('#cancel').hidden = true; $('.save').textContent = 'Save';
    f.dispatchEvent(new Event('input')); E[o.clear[0]].focus();
  };
  f.onsubmit = e => {
    e.preventDefault();
    const again = o.again && o.again();
    const r = o.read(E), old = edit && db[o.key].find(x => x.id === edit);
    if (old) { if (old.paidOn && r.status === 'Paid') r.paidOn = old.paidOn; Object.assign(old, r); }
    else db[o.key].push({ id: uid(), ...r });
    save(); again ? soft() : reset(); draw();
  };
  $('#cancel').onclick = reset; m.oninput = q.oninput = draw;
  $('#body').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const x = db[o.key].find(i => i.id === b.dataset.id);
    if (b.dataset.a === 'del') { if (confirm('Delete this entry? This cannot be undone.')) { db[o.key] = db[o.key].filter(i => i !== x); save(); draw(); } }
    else { edit = x.id; Object.keys(x).forEach(k => { if (E[k]) E[k].value = x[k]; }); $('.save').textContent = 'Update'; $('#cancel').hidden = false; f.dispatchEvent(new Event('input')); f.scrollIntoView({ behavior: 'smooth' }); }
  };
  reset(); draw();
}
const actions = id => `<td class="acts"><button data-a="edit" data-id="${id}">Edit</button><button data-a="del" data-id="${id}">Delete</button></td>`;

/* Sales page */
function salesPage() {
  const f = $('#f'), E = f.elements;
  f.oninput = () => { $('#tot').textContent = ghs(E.qty.value * E.price.value); };
  E.pay.onchange = () => { E.status.value = E.pay.value === 'Credit' ? 'Unpaid' : 'Paid'; };
  let again = false;
  $('#more').onclick = () => { again = true; f.requestSubmit(); };
  $('.save').onclick = () => { again = false; };
  listPage({
    key: 'sales', cols: 10, clear: ['product', 'qty', 'price', 'notes'],
    again: () => { const a = again; again = false; return a; },
    text: x => `${x.customer} ${x.product} ${x.notes}`,
    read: E => ({ date: E.date.value, customer: E.customer.value.trim(), channel: E.channel.value, product: E.product.value.trim(), qty: +E.qty.value, price: +E.price.value, pay: E.pay.value, status: E.status.value, paidOn: E.status.value === 'Paid' ? E.date.value : '', notes: E.notes.value.trim() }),
    row: x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.customer)}</td><td>${esc(x.channel)}</td><td>${esc(x.product)}</td><td class="n">${x.qty}</td><td class="n">${x.price.toFixed(2)}</td><td class="n">${total(x).toFixed(2)}</td><td>${esc(x.pay)}</td><td><span class="tag ${isPaid(x) ? 'Paid' : 'Unpaid'}">${isPaid(x) ? 'Paid' : 'Unpaid'}</span></td>${actions(x.id)}</tr>`,
    sum: r => `${r.length} sales, ${ghs(sum(r, total))} total, ${ghs(sum(r.filter(x => !isPaid(x)), total))} unpaid`
  });
}

/* Expenses page */
function expensesPage() {
  listPage({
    key: 'expenses', cols: 6,
    text: x => `${x.item} ${x.cat} ${x.notes}`,
    read: E => ({ date: E.date.value, item: E.item.value.trim(), amount: +E.amount.value, cat: E.cat.value, notes: E.notes.value.trim() }),
    row: x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.item)}</td><td>${esc(x.cat)}</td><td class="n">${x.amount.toFixed(2)}</td><td>${esc(x.notes)}</td>${actions(x.id)}</tr>`,
    sum: r => `${r.length} entries, ${ghs(sum(r, x => x.amount))} spent`
  });
}

/* Payment status page: separate checker where unpaid sales are marked as paid */
function paymentsPage() {
  const s = $('#s'), q = $('#q'), pd = $('#pd'), ab = $('#all'); let shown = []; pd.value = today();
  const draw = () => {
    const all = db.sales, un = all.filter(x => !isPaid(x));
    $('#cards').innerHTML = [[ghs(sum(un, total)), 'still to collect'], [new Set(un.map(x => x.customer.trim().toLowerCase())).size, 'customers owing'], [ghs(sum(all.filter(isPaid), total)), 'collected so far']].map(([b, t]) => `<div class="card stat"><b>${b}</b>${t}</div>`).join('');
    const r = all.filter(x => (s.value === 'All' || (s.value === 'Unpaid') === !isPaid(x)) && `${x.customer} ${x.notes}`.toLowerCase().includes(q.value.toLowerCase())).sort((a, b) => a.date.localeCompare(b.date));
    shown = r.filter(x => !isPaid(x));
    ab.hidden = new Set(shown.map(x => x.customer.trim().toLowerCase())).size !== 1;
    if (!ab.hidden) ab.textContent = `Mark all ${shown.length} sale${shown.length === 1 ? '' : 's'} of ${shown[0].customer.trim()} as paid (${ghs(sum(shown, total))})`;
    $('#body').innerHTML = r.map(x => {
      const days = Math.max(0, Math.floor((new Date(today()) - new Date(x.date)) / 864e5));
      return `<tr><td>${fdate(x.date)}</td><td>${esc(x.customer)}</td><td>${esc(x.pay)}</td><td class="n">${total(x).toFixed(2)}</td><td><span class="tag ${isPaid(x) ? 'Paid' : 'Unpaid'}">${isPaid(x) ? 'Paid' : 'Unpaid'}</span></td><td>${isPaid(x) ? 'Paid on ' + fdate(x.paidOn || x.date) : days + ' day' + (days === 1 ? '' : 's') + ' owing'}</td><td class="acts">${isPaid(x) ? `<button data-id="${x.id}" data-a="undo">Mark unpaid</button>` : `<button class="go" data-id="${x.id}" data-a="paid">Mark as paid</button>`}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="empty">No sales match this view.</td></tr>';
  };
  $('#body').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const x = db.sales.find(i => i.id === b.dataset.id);
    if (b.dataset.a === 'paid') { x.status = 'Paid'; x.paidOn = pd.value || today(); } else { x.status = 'Unpaid'; x.paidOn = ''; }
    save(); draw();
  };
  ab.onclick = () => {
    if (!confirm(`Mark ${shown.length} sale(s) of ${shown[0].customer.trim()} as paid on ${fdate(pd.value || today())}?`)) return;
    shown.forEach(x => { x.status = 'Paid'; x.paidOn = pd.value || today(); }); save(); draw();
  };
  s.oninput = q.oninput = draw; draw();
}

/* Reports page */
function reportsPage() {
  const t = $('#type'), m = $('#m'), y = $('#y'); m.value = today().slice(0, 7); y.value = today().slice(0, 4);
  const calc = p => {
    const S = db.sales.filter(x => x.date.startsWith(p)), X = db.expenses.filter(x => x.date.startsWith(p));
    const got = sum(db.sales.filter(x => isPaid(x) && (x.paidOn || x.date).startsWith(p)), total);
    const sales = sum(S, total), exp = sum(X, x => x.amount), net = got - exp;
    return { S, X, sales, got, out: sum(S.filter(x => !isPaid(x)), total), exp, net, inv: Math.max(net, 0) * INVESTOR_RATE };
  };
  const cls = n => n < 0 ? 'bad' : 'good';
  const draw = () => {
    const yearly = t.value === 'y', p = yearly ? y.value : m.value; if (!p) return;
    const title = yearly ? `Yearly report: ${p}` : `Monthly report: ${MONTHS[+p.slice(5) - 1]} ${p.slice(0, 4)}`;
    let h = `<div class="rhead"><h2>KuliKuli Ghana</h2><p>MF Empowerment &amp; Trading Center, Kpalsi, Tamale</p><h3>${title}</h3><p>Printed on ${fdate(today())}</p></div>`;
    if (yearly) {
      let T = { sales: 0, got: 0, out: 0, exp: 0, net: 0, inv: 0 };
      h += '<div class="scroll"><table><thead><tr><th>Month<th class="n">Sales<th class="n">Collected<th class="n">Unpaid<th class="n">Expenses<th class="n">Net profit<th class="n">Investor share</tr></thead><tbody>' +
        MONTHS.map((n, i) => { const c = calc(`${p}-${String(i + 1).padStart(2, '0')}`); Object.keys(T).forEach(k => T[k] += c[k]);
          return `<tr><td>${n}</td><td class="n">${c.sales.toFixed(2)}</td><td class="n">${c.got.toFixed(2)}</td><td class="n">${c.out.toFixed(2)}</td><td class="n">${c.exp.toFixed(2)}</td><td class="n ${cls(c.net)}">${c.net.toFixed(2)}</td><td class="n">${c.inv.toFixed(2)}</td></tr>`; }).join('') +
        `<tr class="tot"><td>Full year</td><td class="n">${T.sales.toFixed(2)}</td><td class="n">${T.got.toFixed(2)}</td><td class="n">${T.out.toFixed(2)}</td><td class="n">${T.exp.toFixed(2)}</td><td class="n ${cls(T.net)}">${T.net.toFixed(2)}</td><td class="n">${T.inv.toFixed(2)}</td></tr></tbody></table></div>`;
    } else {
      const c = calc(p), cat = {}; c.X.forEach(x => cat[x.cat] = (cat[x.cat] || 0) + x.amount);
      const owing = c.S.filter(x => !isPaid(x)).sort((a, b) => a.date.localeCompare(b.date));
      h += `<table><tbody><tr><td>Total sales made (${c.S.length})</td><td class="n">${ghs(c.sales)}</td></tr><tr><td>Money collected</td><td class="n">${ghs(c.got)}</td></tr><tr><td>Sales still unpaid</td><td class="n">${ghs(c.out)}</td></tr><tr><td>Total expenditure</td><td class="n">${ghs(c.exp)}</td></tr><tr class="tot"><td>Net profit (collected minus expenditure)</td><td class="n ${cls(c.net)}">${ghs(c.net)}</td></tr><tr><td>Investor share (${INVESTOR_RATE * 100}% of net profit)</td><td class="n">${ghs(c.inv)}</td></tr></tbody></table>`;
      h += '<h3>Expenditure by category</h3><table><tbody>' + (Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${ghs(v)}</td></tr>`).join('') || '<tr><td class="empty">No expenses recorded.</td></tr>') + '</tbody></table>';
      h += '<h3>Customers who still owe</h3><table><tbody>' + (owing.map(x => `<tr><td>${esc(x.customer)}</td><td>${fdate(x.date)}</td><td class="n">${ghs(total(x))}</td></tr>`).join('') || '<tr><td class="empty">No unpaid sales for this month.</td></tr>') + '</tbody></table>';
    }
    $('#report').innerHTML = h + '<p class="note">Sales are counted on the sale date. Collected money is counted on the date it was paid.</p>';
  };
  t.onchange = () => { $('#ml').hidden = t.value === 'y'; $('#yl').hidden = t.value !== 'y'; draw(); };
  m.oninput = y.oninput = draw; $('#print').onclick = () => window.print(); draw();
}

chrome();
({ sales: salesPage, exp: expensesPage, pay: paymentsPage, rep: reportsPage })[document.body.dataset.page]();
