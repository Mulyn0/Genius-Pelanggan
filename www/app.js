'use strict';
const BASE = 'https://billing.gns.biz.id/api/customer';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tgl = (s) => { if (!s) return '-'; const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
const stat = (s) => ({ paid: 'Lunas', unpaid: 'Belum bayar', pending: 'Menunggu', expired: 'Kedaluwarsa', cancelled: 'Dibatalkan' }[s] || s || '-');
const tstat = (s) => ({ open: 'Dibuka', in_progress: 'Diproses', resolved: 'Selesai', closed: 'Ditutup' }[s] || s || '-');
const S = { token: localStorage.getItem('gn_t') || '', tab: 'home', cfg: null, dash: null, inv: null, wifi: null, tix: null };
let seq = 0, tt;

const ICON = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  inv: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 20h.01',
  tix: 'M4 5h16v11H8l-4 4z',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'
};
const ic = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
const TABS = [['home', 'Beranda'], ['inv', 'Tagihan'], ['wifi', 'WiFi'], ['tix', 'Tiket'], ['me', 'Profil']];

function toast(m) { const t = $('#toast'); t.textContent = m; t.className = 'show'; clearTimeout(tt); tt = setTimeout(() => { t.className = ''; }, 3500); }

async function api(path, body) {
  const o = { headers: { 'Content-Type': 'application/json' } };
  if (S.token) o.headers.Authorization = 'Bearer ' + S.token;
  if (body !== undefined) { o.method = 'POST'; o.body = JSON.stringify(body); }
  let r, j;
  try { r = await fetch(BASE + path, o); j = await r.json(); }
  catch (e) { throw new Error('Tidak bisa terhubung ke server. Periksa internet Anda.'); }
  if (r.status === 401 && S.token) { logout(); throw new Error('Sesi berakhir, silakan masuk lagi.'); }
  if (!r.ok || j.success === false) throw new Error(j.message || (j.error && j.error.message) || 'Terjadi kesalahan.');
  return j.data !== undefined ? j.data : j;
}
async function load(k, p, f) { if (f || !S[k]) S[k] = await api(p); return S[k]; }
async function run(btn, fn) {
  const t = btn.textContent; btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = t; } }
}
function logout() { S.token = ''; localStorage.removeItem('gn_t'); S.dash = S.inv = S.wifi = S.tix = null; login(); }
function openUrl(u) { const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser; if (B) B.open({ url: u }); else window.open(u, '_blank'); }
function findUrl(o) {
  if (!o || typeof o !== 'object') return '';
  for (const k of ['paymentUrl', 'payment_url', 'checkoutUrl', 'checkout_url', 'redirectUrl', 'url', 'link', 'invoiceUrl']) if (typeof o[k] === 'string' && /^https?:/.test(o[k])) return o[k];
  for (const v of Object.values(o)) { const u = findUrl(v); if (u) return u; }
  return '';
}
function sheet(h) {
  const s = document.createElement('div'); s.className = 'sheet';
  s.innerHTML = `<div class="bk"></div><div class="pn" role="dialog" aria-modal="true">${h}<button class="ghost" data-x>Tutup</button></div>`;
  document.body.appendChild(s);
  s.close = () => s.remove();
  s.querySelector('.bk').onclick = s.close; s.querySelector('[data-x]').onclick = s.close;
  return s;
}

/* ---------- Masuk (OTP WhatsApp) ---------- */
function login(step, phone) {
  step = step || 'phone'; phone = phone || '';
  const name = S.cfg ? S.cfg.appName : 'GENIUS NET';
  $('#root').innerHTML = `<main class="login"><div class="logo">G</div><h1>${esc(name)}</h1><p class="mut">Pantau layanan dan tagihan internet Anda</p>` + (step === 'phone'
    ? `<label>Nomor WhatsApp<input id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" value="${esc(phone)}"></label><button class="btn" id="go">Kirim kode</button>`
    : `<p>Kode 6 digit dikirim ke WhatsApp <b>${esc(phone)}</b>.</p><label>Kode OTP<input id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="btn" id="go">Masuk</button><button class="ghost" id="re"></button><button class="ghost" id="bk">Ganti nomor</button>`) + '</main>';
  const go = $('#go');
  if (step === 'phone') {
    go.onclick = () => run(go, async () => {
      const p = $('#ph').value.trim();
      if (p.replace(/\D/g, '').length < 9) throw new Error('Nomor WhatsApp tidak valid.');
      await api('/auth/otp/request', { phone: p }); login('otp', p);
    });
    return;
  }
  let n = 60; const re = $('#re');
  const tick = () => { re.disabled = n > 0; re.textContent = n > 0 ? `Kirim ulang kode (${n})` : 'Kirim ulang kode'; if (n > 0) { n--; setTimeout(tick, 1000); } };
  tick();
  re.onclick = async () => { re.disabled = true; try { await api('/auth/otp/request', { phone }); n = 60; toast('Kode dikirim ulang.'); } catch (e) { toast(e.message); n = 0; } tick(); };
  $('#bk').onclick = () => login('phone', phone);
  go.onclick = () => run(go, async () => {
    const c = $('#otp').value.trim();
    if (!/^\d{6}$/.test(c)) throw new Error('Masukkan 6 digit kode.');
    const r = await api('/auth/otp/verify', { phone, otp: c });
    S.token = r.token; localStorage.setItem('gn_t', r.token); shell();
  });
}

/* ---------- Kerangka ---------- */
function shell() {
  $('#root').innerHTML = `<div id="app"><header><b id="ttl"></b><button class="icon" id="rf" aria-label="Muat ulang">↻</button></header><main id="view"></main><nav>${TABS.map(([k, l]) => `<button data-t="${k}" aria-label="${l}">${ic(k)}<span>${l}</span></button>`).join('')}</nav></div>`;
  document.querySelectorAll('nav button').forEach((b) => { b.onclick = () => show(b.dataset.t); });
  $('#rf').onclick = () => show(S.tab, true);
  show('home');
}
async function show(t, force) {
  S.tab = t; const my = ++seq; const ok = () => my === seq;
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  $('#ttl').textContent = TABS.find((x) => x[0] === t)[1];
  const v = $('#view'); v.scrollTop = 0;
  const key = { home: 'dash', inv: 'inv', wifi: 'wifi', tix: 'tix', me: 'dash' }[t];
  if (force || !S[key]) v.innerHTML = '<p class="mut c">Memuat…</p>';
  try { await { home: vHome, inv: vInv, wifi: vWifi, tix: vTix, me: vMe }[t](v, force, ok); }
  catch (e) { if (ok() && v.isConnected) { v.innerHTML = `<p class="c">${esc(e.message)}</p><button class="btn" onclick="show('${t}',true)">Coba lagi</button>`; } }
}

/* ---------- Beranda ---------- */
async function vHome(v, f, ok) {
  const d = await load('dash', '/dashboard', f); if (!ok()) return;
  const p = d.profile, k = d.package || {}, b = d.billing || {}, o = d.ont || {}, u = b.latestUnpaidInvoice;
  const sus = p.status === 'suspended';
  v.innerHTML = `<section class="hero"><p class="mut">Halo,</p><h2>${esc(p.name)}</h2><span class="chip ${sus ? 'bad' : 'ok'}">${sus ? 'Terisolir' : 'Layanan aktif'}</span><div class="pk"><div><small>Paket</small><b>${esc(k.name || '-')}</b></div><div><small>Per bulan</small><b>${rp(k.price)}</b></div></div></section>`
    + (sus ? '<p class="note bad">Layanan Anda sedang terisolir. Bayar tagihan agar internet aktif kembali.</p>' : '')
    + `<section class="card"><h3>Tagihan</h3>` + (b.unpaidCount > 0
      ? `<p class="big">${rp(b.totalUnpaidAmount)}</p><p class="mut">${b.unpaidCount} tagihan belum dibayar</p><button class="btn" id="pay">Bayar sekarang</button>`
      : '<p class="ok-t">✓ Semua tagihan lunas</p>') + '</section>'
    + (o.available ? `<section class="card"><div class="rowx"><h3>Perangkat</h3><span class="chip ${o.online ? 'ok' : 'bad'}">${o.online ? 'Online' : 'Offline'}</span></div><dl><div><dt>Nama WiFi</dt><dd>${esc(o.ssid)}</dd></div><div><dt>Sinyal (Rx)</dt><dd>${esc(o.rxPower)}</dd></div></dl></section>` : '');
  const pay = $('#pay'); if (pay) pay.onclick = () => (u && u.id ? payFlow(u) : show('inv'));
}

/* ---------- Tagihan & bayar ---------- */
async function vInv(v, f, ok) {
  const L = await load('inv', '/invoices', f); if (!ok()) return;
  v.innerHTML = L.length ? `<ul class="list" style="margin:0">${L.map((i, x) => `<li><button class="row" data-i="${x}"><div><b>${BLN[i.periodMonth - 1] || ''} ${esc(i.periodYear)}</b><small>${esc(i.invoiceNo)}</small></div><div class="r"><b>${rp(i.amount)}</b><br><span class="chip ${i.status === 'paid' ? 'ok' : 'warn'}">${stat(i.status)}</span></div></button></li>`).join('')}</ul>` : '<p class="mut c">Belum ada tagihan.</p>';
  v.querySelectorAll('.row').forEach((b) => { b.onclick = () => invSheet(L[b.dataset.i]); });
}
function invSheet(i) {
  const paid = i.status === 'paid';
  const s = sheet(`<h3>${esc(i.invoiceNo)}</h3><p class="big">${rp(i.amount)}</p><dl><div><dt>Periode</dt><dd>${BLN[i.periodMonth - 1] || ''} ${esc(i.periodYear)}</dd></div><div><dt>Status</dt><dd>${stat(i.status)}</dd></div><div><dt>Dibuat</dt><dd>${tgl(i.createdAt)}</dd></div>${paid ? `<div><dt>Dibayar</dt><dd>${tgl(i.paidAt)}</dd></div>` : ''}</dl>`
    + (paid ? '' : '<button class="btn" id="py">Bayar</button><button class="btn alt" id="ck">Cek status pembayaran</button>'));
  const py = s.querySelector('#py'); if (py) py.onclick = () => { s.close(); payFlow(i); };
  const ck = s.querySelector('#ck');
  if (ck) ck.onclick = () => run(ck, async () => {
    const r = await api(`/invoices/${i.id}/check-status`);
    toast('Status: ' + stat(r && (r.status || r.invoiceStatus)));
    S.inv = S.dash = null; s.close(); show(S.tab, true);
  });
}
function payFlow(inv) {
  const g = (S.cfg && S.cfg.gateways) || {};
  const online = ['duitku', 'tripay', 'midtrans', 'xendit'].filter((k) => g[k]);
  const wa = (S.dash && S.dash.isp && S.dash.isp.adminPhone) || (S.cfg && S.cfg.adminPhone) || '';
  const s = sheet(`<h3>Bayar ${esc(inv.invoiceNo || 'tagihan')}</h3><p class="big">${rp(inv.amount)}</p>`
    + online.map((k) => `<button class="btn" data-g="${k}">Bayar online (${k[0].toUpperCase() + k.slice(1)})</button>`).join('')
    + (g.qrisStatic ? '<button class="btn alt" data-q>Bayar dengan QRIS</button>' : '')
    + (!online.length && !g.qrisStatic ? '<p class="mut">Pembayaran online belum tersedia. Hubungi admin.</p>' : ''));
  s.querySelectorAll('[data-g]').forEach((b) => { b.onclick = () => run(b, async () => {
    const r = await api(`/invoices/${inv.id}/pay`, { gateway: b.dataset.g, paymentGateway: b.dataset.g, method: b.dataset.g });
    const u = findUrl(r); s.close(); S.inv = S.dash = null;
    if (u) { openUrl(u); toast('Selesaikan pembayaran di halaman yang terbuka.'); } else toast((r && r.message) || 'Pembayaran dibuat. Cek status tagihan.');
  }); });
  const q = s.querySelector('[data-q]');
  if (q) q.onclick = () => {
    s.close();
    const t = sheet(`<h3>QRIS ${esc(inv.invoiceNo || '')}</h3><img class="qr" alt="Kode QRIS" src="${BASE}/invoices/${inv.id}/qris-image?token=${encodeURIComponent(S.token)}"><p class="mut">Bayar sebesar <b>${rp(inv.amount)}</b>, lalu konfirmasi ke admin.</p><button class="btn" id="cf">Konfirmasi via WhatsApp</button>`);
    t.querySelector('#cf').onclick = () => openUrl(`https://wa.me/${String(wa).replace(/\D/g, '')}?text=${encodeURIComponent(`Halo, saya sudah bayar ${inv.invoiceNo || 'tagihan'} sebesar ${rp(inv.amount)} via QRIS.`)}`);
  };
}

/* ---------- WiFi ---------- */
function devCard(L) {
  L = Array.isArray(L) ? L : [];
  return `<section class="card"><div class="rowx"><h3>Perangkat terhubung</h3><span class="chip ok">${L.length}</span></div>` + (L.length
    ? `<ul class="dev">${L.map((d) => `<li><div><b>${esc(d.name || 'Perangkat tanpa nama')}</b><small>${esc(d.ip || '-')} · ${esc(d.mac || '-')}</small>${d.signal ? `<small>Sinyal ${esc(d.signal)}</small>` : ''}</div>${d.type ? `<span class="chip">${esc(d.type)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="mut">Tidak ada perangkat terdeteksi saat ini.</p>') + '</section>';
}
async function vWifi(v, f, ok) {
  const w = await load('wifi', '/wifi', f); if (!ok()) return;
  v.innerHTML = `<section class="card"><div class="rowx"><h3>Perangkat</h3><span class="chip ${w.online ? 'ok' : 'bad'}">${w.online ? 'Online' : 'Offline'}</span></div><dl><div><dt>Nama WiFi</dt><dd>${esc(w.ssid)}</dd></div><div><dt>Perangkat terhubung</dt><dd>${esc(w.connectedDevices)}</dd></div><div><dt>Sinyal (Rx)</dt><dd>${esc(w.rxPower)}</dd></div><div><dt>Suhu</dt><dd>${esc(w.temperature)}</dd></div></dl></section>`
    + devCard(w.devices)
    + '<section class="card"><h3>Ganti nama WiFi</h3><input id="ns" maxlength="32" placeholder="Nama WiFi baru" aria-label="Nama WiFi baru"><button class="btn" id="bs">Simpan nama</button></section>'
    + '<section class="card"><h3>Ganti password WiFi</h3><input id="np" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter" aria-label="Password WiFi baru"><button class="btn" id="bp">Simpan password</button></section>'
    + '<section class="card"><h3>Mulai ulang perangkat</h3><p class="mut">Internet terputus sekitar 2 menit.</p><button class="btn warn" id="br">Reboot</button></section>';
  $('#bs').onclick = (e) => run(e.target, async () => {
    const s = $('#ns').value.trim(); if (!s) throw new Error('Isi nama WiFi baru.');
    await api('/wifi/change-ssid', { ssid: s, newSsid: s }); S.wifi = null; toast('Nama WiFi diganti. Sambungkan ulang perangkat Anda.');
  });
  $('#bp').onclick = (e) => run(e.target, async () => {
    const p = $('#np').value; if (p.length < 8) throw new Error('Password minimal 8 karakter.');
    await api('/wifi/change-password', { password: p, newPassword: p }); $('#np').value = ''; toast('Password WiFi diganti. Sambungkan ulang perangkat Anda.');
  });
  $('#br').onclick = (e) => { if (confirm('Mulai ulang perangkat sekarang?')) run(e.target, async () => { await api('/wifi/reboot', {}); toast('Perangkat sedang dimulai ulang.'); }); };
}

/* ---------- Tiket ---------- */
async function vTix(v, f, ok) {
  const L = await load('tix', '/tickets', f); if (!ok()) return;
  v.innerHTML = '<button class="btn" id="nt" style="margin:0">Buat tiket baru</button>' + (L.length
    ? `<ul class="list">${L.map((t) => `<li class="row"><div><b>${esc(t.title)}</b><small>${esc(t.ticketNo)} · ${tgl(t.createdAt)}</small><small>${esc(t.description)}</small></div><span class="chip ${t.status === 'resolved' ? 'ok' : 'warn'}">${tstat(t.status)}</span></li>`).join('')}</ul>`
    : '<p class="mut c">Belum ada tiket.</p>');
  $('#nt').onclick = () => {
    const s = sheet('<h3>Buat tiket</h3><label>Jenis masalah<select id="tt"><option>Koneksi Terputus / Tidak Bisa Konek</option><option>Lampu PON Merah / Los Sinyal</option><option>Internet Lambat</option><option>Lainnya</option></select></label><label>Ceritakan masalahnya<textarea id="td" rows="4" maxlength="500"></textarea></label><button class="btn" id="ts">Kirim tiket</button>');
    const b = s.querySelector('#ts');
    b.onclick = () => run(b, async () => {
      const d = s.querySelector('#td').value.trim(); if (d.length < 5) throw new Error('Jelaskan masalahnya sedikit lebih rinci.');
      const title = s.querySelector('#tt').value;
      await api('/tickets/create', { title, description: d, category: title });
      s.close(); S.tix = null; toast('Tiket terkirim. Tim kami segera menghubungi Anda.'); show('tix', true);
    });
  };
}

/* ---------- Profil ---------- */
async function vMe(v, f, ok) {
  const d = await load('dash', '/dashboard', f); if (!ok()) return;
  const p = d.profile, k = d.package || {}, isp = d.isp || {};
  v.innerHTML = `<section class="card"><dl><div><dt>Nama</dt><dd>${esc(p.name)}</dd></div><div><dt>Nomor WhatsApp</dt><dd>${esc(p.phone)}</dd></div><div><dt>Akun internet</dt><dd>${esc(p.pppoeUsername)}</dd></div><div><dt>Paket</dt><dd>${esc(k.name || '-')}</dd></div><div><dt>Alamat</dt><dd>${esc(String(p.address || '-').replace(/\s+/g, ' '))}</dd></div></dl></section>`
    + `<section class="card"><h3>${esc(isp.name || 'GENIUS NET')}</h3><p class="mut">Butuh bantuan? Hubungi kami.</p><button class="btn alt" id="wa">Chat WhatsApp admin</button></section><button class="btn alt" id="lo">Keluar</button><p class="mut c">GENIUS NET Pelanggan 1.0</p>`;
  $('#wa').onclick = () => openUrl('https://wa.me/' + String(isp.adminPhone || isp.phone || '').replace(/\D/g, ''));
  $('#lo').onclick = () => { if (confirm('Keluar dari akun ini?')) logout(); };
}

(async () => { try { S.cfg = await api('/config'); } catch (e) { /* tetap lanjut */ } S.token ? shell() : login(); })();
