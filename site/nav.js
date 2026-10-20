/* 9 Degrees East: the site menu. One file, used by every page: add <div id="site-nav"></div> and <script src="nav.js" defer></script>.
   Inspired by bp.com: a floating bar that grows into a panel. Opens on hover (desktop) or click/tap; Escape closes. */
(function () {
  var MAIL = 'tomfox@9degreeseast.com'; // the one place the contact address lives

  // Every item links to a page. Pages without content yet are blank shells, ready to fill in.
  var MENU = [
    { id: 'about', label: 'About', title: 'About 9 Degrees East', intro: 'A commercial advisory for low-carbon fuels, built on 28 years in energy and 20 structuring long-term supply deals.', href: 'about.html', c: '#F0C877',
      items: [
        { label: 'Who we are', href: 'about.html', blurb: 'The firm, the founder and the experience behind every deal.' },
        { label: 'Our history', href: 'our-history.html', blurb: 'How 9 Degrees East came to be, from power in Houston to eFuels in Chile.' },
        { label: 'Purpose, mission & values', href: 'purpose.html', blurb: 'Why we do this work, and the principles behind how we do it.' },
        { label: 'How we work', href: 'how-we-work.html', blurb: 'How an engagement runs, from first conversation to signed agreement.' },
        { label: 'Locations', href: 'locations.html', blurb: 'Based in London, working across Europe, the Americas and Asia.' }
      ] },
    { id: 'insights', label: 'Insights', title: 'Insights', intro: 'Market data, regulation and our own analysis.', href: 'insights.html', c: '#5EC8D8',
      items: [
        { label: 'Fuel Weather', href: 'fuel-weather.html', blurb: 'Price pressure and turbulence across five fuels, from public market data. Updated every Monday.', live: true },
        { label: 'Policy Tracker', href: 'policy-tracker.html', blurb: 'New rules and announcements from the US, EU, UK, China and global shipping, checked every week.', live: true },
        { label: 'Market Conditions', href: 'market-conditions.html', blurb: 'Our read on supply, demand and pricing across low-carbon fuel markets.' },
        { label: 'The 9DE Journal', href: 'journal.html', blurb: 'Articles and commentary from 9 Degrees East, including posts from Substack and LinkedIn.' }
      ] },
    { id: 'services', label: 'Products & Services', title: 'Products & Services', intro: 'Bankable supply agreements for eFuels, green methanol, SAF, renewable diesel and RNG.', href: 'services.html', c: '#A9A2F0',
      items: [
        { label: 'Offtake strategy', href: 'offtake-strategy.html', blurb: 'Who to sell to, on what terms, and how to sequence it for financing.' },
        { label: 'Deal structuring', href: 'deal-structuring.html', blurb: 'Price, volume, credit and sustainability terms that work for both sides.' },
        { label: 'Supply agreements', href: 'supply-agreements.html', blurb: 'Long-term, bankable contracts that hold up over the life of the project.' },
        { label: 'Regulatory advisory', href: 'regulatory-advisory.html', blurb: 'What RED, ReFuelEU, FuelEU, the RFS and LCFS mean for your contracts.' }
      ] }
  ];
  var here = location.pathname.split('/').pop() || 'index.html';

  var css = '\
  #site-nav { position: relative; z-index: 50; }\
  .sn { position: relative; margin: 20px auto 0; width: min(100% - 40px, 1220px); font-family: Manrope, system-ui, sans-serif; color: #EEF2F5; }\
  .sn-bar { position: relative; background: rgba(9,28,50,0.78); border: 1px solid rgba(160,190,220,0.18); border-radius: 14px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 10px 40px rgba(0,0,0,0.25); overflow: hidden; transition: border-color 300ms ease; }\
  .sn.open .sn-bar { border-color: rgba(160,190,220,0.3); }\
  .sn-row { display: flex; align-items: center; gap: 28px; height: 60px; padding: 0 12px 0 16px; }\
  .sn-logo { display: inline-flex; align-items: center; gap: 10px; color: #EEF2F5; text-decoration: none; flex: none; }\
  .sn-logo svg { width: 30px; height: 30px; }\
  .sn-logo span { font-size: 10px; font-weight: 600; letter-spacing: 0.24em; }\
  .sn-main { display: flex; align-items: center; gap: 4px; margin: 0; padding: 0; list-style: none; }\
  .sn-top { display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 12px; border: 0; border-radius: 8px; background: none; color: #C9D6E3; font: 500 13px Manrope, system-ui, sans-serif; cursor: pointer; text-decoration: none; transition: color 180ms ease, background 180ms ease; }\
  .sn-top:hover, .sn-top[aria-expanded="true"] { color: #EEF2F5; background: rgba(160,190,220,0.08); }\
  .sn-top .chev { width: 8px; height: 8px; border-right: 1.4px solid currentColor; border-bottom: 1.4px solid currentColor; transform: translateY(-2px) rotate(45deg); transition: transform 250ms ease; opacity: 0.7; }\
  .sn-top[aria-expanded="true"] .chev { transform: translateY(1px) rotate(-135deg); }\
  .sn-top.current { color: #EEF2F5; }\
  .sn-top.current::after { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #D8B66E; margin-left: 2px; }\
  .sn-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }\
  .sn-contact { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 8px; background: #D8B66E; color: #061527; font: 600 13px Manrope, system-ui, sans-serif; text-decoration: none; transition: background 180ms ease, transform 180ms ease; }\
  .sn-contact:hover { background: #E8C987; }\
  .sn-burger { display: none; width: 44px; height: 40px; border: 0; border-radius: 8px; background: none; cursor: pointer; position: relative; }\
  .sn-burger i, .sn-burger i::before, .sn-burger i::after { position: absolute; left: 13px; width: 18px; height: 1.5px; background: #EEF2F5; content: ""; transition: transform 250ms ease, opacity 200ms ease; }\
  .sn-burger i { top: 19px; } .sn-burger i::before { left: 0; top: -6px; } .sn-burger i::after { left: 0; top: 6px; }\
  .sn.mob-open .sn-burger i { background: transparent; } .sn.mob-open .sn-burger i::before { transform: translateY(6px) rotate(45deg); } .sn.mob-open .sn-burger i::after { transform: translateY(-6px) rotate(-45deg); }\
  .sn a:focus-visible, .sn button:focus-visible { outline: 2px solid #D8B66E; outline-offset: 2px; }\
  /* The panel: the bar grows downward */\
  .sn-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 380ms cubic-bezier(.2,.8,.2,1); }\
  .sn.open .sn-panel { grid-template-rows: 1fr; }\
  .sn-panel > div { overflow: hidden; }\
  .sn-sec { display: none; grid-template-columns: 1fr 1.25fr 1fr; gap: 32px; padding: 26px 28px 30px; border-top: 1px solid rgba(160,190,220,0.12); }\
  .sn-sec.on { display: grid; animation: snIn 360ms ease both; }\
  @keyframes snIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }\
  .sn-intro .k { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--c); }\
  .sn-intro .k::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }\
  .sn-intro h2 { margin: 0 0 10px; font: 400 34px/1.05 "Instrument Serif", Georgia, serif; letter-spacing: -0.01em; }\
  .sn-intro p { margin: 0 0 16px; font-size: 13.5px; line-height: 1.7; color: #A8B7C6; max-width: 300px; }\
  .sn-intro a { font-size: 12px; font-weight: 600; color: #D8B66E; text-decoration: none; } .sn-intro a:hover { text-decoration: underline; }\
  .sn-list { margin: 0; padding: 0; list-style: none; border-left: 1px solid rgba(160,190,220,0.12); }\
  .sn-list a, .sn-list span.soon { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 16px 11px 20px; font-size: 15px; color: #EEF2F5; text-decoration: none; border-radius: 0 8px 8px 0; transition: background 160ms ease, color 160ms ease, padding 200ms ease; }\
  .sn-list a::after { content: "→"; color: #D8B66E; opacity: 0; transform: translateX(-6px); transition: opacity 200ms ease, transform 200ms ease; }\
  .sn-list a:hover, .sn-list a.hot { background: rgba(160,190,220,0.07); padding-left: 24px; }\
  .sn-list a:hover::after, .sn-list a.hot::after { opacity: 1; transform: none; }\
  .sn-list span.soon { color: #6F87A3; cursor: default; }\
  .sn-list span.soon.hot { background: rgba(160,190,220,0.04); }\
  .sn-list .tag { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; padding: 3px 7px; border: 1px solid rgba(160,190,220,0.2); border-radius: 999px; color: #6F87A3; }\
  .sn-list .tag.live { color: #5EC8D8; border-color: rgba(94,200,216,0.4); }\
  .sn-prev { align-self: stretch; padding: 20px 22px; border-radius: 10px; background: rgba(6,21,39,0.55); border: 1px solid rgba(160,190,220,0.12); display: flex; flex-direction: column; gap: 10px; }\
  .sn-prev .pk { font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #6F87A3; }\
  .sn-prev h3 { margin: 0; font: 400 26px/1.1 "Instrument Serif", Georgia, serif; }\
  .sn-prev p { margin: 0; font-size: 13.5px; line-height: 1.7; color: #C9D6E3; }\
  .sn-prev .st { margin-top: auto; font-size: 11px; color: #A8B7C6; }\
  .sn-veil { position: fixed; inset: 0; background: rgba(3,10,20,0.45); opacity: 0; pointer-events: none; transition: opacity 300ms ease; z-index: -1; }\
  .sn.open ~ .sn-veil, .sn.mob-open ~ .sn-veil { opacity: 1; pointer-events: auto; }\
  /* Phones and tablets: a full panel with accordions */\
  .sn-mob { display: none; }\
  @media (max-width: 960px) {\
    .sn-main, .sn-panel { display: none; }\
    .sn-burger { display: block; }\
    .sn-row { gap: 12px; }\
    .sn-contact { height: 38px; padding: 0 14px; }\
    .sn.mob-open .sn-mob { display: block; }\
    .sn-mob { max-height: calc(100vh - 110px); overflow: auto; padding: 4px 16px 18px; border-top: 1px solid rgba(160,190,220,0.12); }\
    .sn-mob details { border-bottom: 1px solid rgba(160,190,220,0.12); }\
    .sn-mob summary { list-style: none; display: flex; justify-content: space-between; align-items: center; padding: 16px 4px; font: 400 26px "Instrument Serif", Georgia, serif; cursor: pointer; }\
    .sn-mob summary::-webkit-details-marker { display: none; }\
    .sn-mob summary::after { content: "+"; font: 300 22px Manrope, sans-serif; color: #D8B66E; transition: transform 250ms ease; }\
    .sn-mob details[open] summary::after { transform: rotate(45deg); }\
    .sn-mob ul { margin: 0 0 12px; padding: 0; list-style: none; }\
    .sn-mob li a, .sn-mob li span { display: flex; justify-content: space-between; align-items: center; padding: 11px 6px; font-size: 15px; color: #EEF2F5; text-decoration: none; }\
    .sn-mob li span { color: #6F87A3; }\
    .sn-mob .ov { color: #D8B66E !important; font-weight: 600; font-size: 13px !important; }\
  }\
  @media (max-width: 420px) { .sn-logo span { display: none; } .sn { width: calc(100% - 24px); margin-top: 12px; } }';

  function a(href, text, cls) { return href ? '<a class="' + (cls || '') + '" href="' + href + '">' + text + '</a>' : '<span class="soon ' + (cls || '') + '">' + text + '<span class="tag">Soon</span></span>'; }
  var logo = '<a class="sn-logo" href="./" aria-label="9 Degrees East home"><svg viewBox="0 0 100 100" fill="none" stroke-linecap="round" aria-hidden="true"><circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="2.6" stroke-dasharray="196.5 80" transform="rotate(120 50 50)"/><circle cx="46" cy="43" r="16" stroke="currentColor" stroke-width="8"/><path d="M60.5 49.8 L46.8 79" stroke="currentColor" stroke-width="8"/><circle cx="71" cy="25" r="5" stroke="#D8B66E" stroke-width="3.4"/></svg><span>9 DEGREES EAST</span></a>';
  var main = MENU.map(function (m) {
    var cur = (m.href === here || m.items.some(function (i) { return i.href === here; })) ? ' current' : '';
    return '<li><button class="sn-top' + cur + '" type="button" aria-expanded="false" aria-controls="sn-' + m.id + '" data-sec="' + m.id + '">' + m.label + '<i class="chev" aria-hidden="true"></i></button></li>';
  }).join('');
  var secs = MENU.map(function (m) {
    var first = m.items[0];
    return '<div class="sn-sec" id="sn-' + m.id + '" style="--c:' + m.c + '" role="region" aria-label="' + m.label + '">' +
      '<div class="sn-intro"><p class="k">' + m.label + '</p><h2>' + m.title + '</h2><p>' + m.intro + '</p>' + (m.href ? '<a href="' + m.href + '">' + 'Overview' + ' →</a>' : '<p style="font-size:12px;color:#6F87A3;margin:0">Pages coming soon</p>') + '</div>' +
      '<ul class="sn-list">' + m.items.map(function (i, n) {
        var tag = i.live ? '<span class="tag live">Live</span>' : '';
        return '<li data-i="' + n + '">' + (i.href ? '<a href="' + i.href + '">' + i.label + tag + '</a>' : a(null, i.label)) + '</li>';
      }).join('') + '</ul>' +
      '<div class="sn-prev" aria-live="polite"><span class="pk">' + (first.live ? 'Live · updated weekly' : m.label) + '</span><h3>' + first.label + '</h3><p>' + first.blurb + '</p><span class="st"></span></div></div>';
  }).join('');
  var mob = MENU.map(function (m) {
    return '<details><summary>' + m.label + '</summary><ul>' + (m.href ? '<li><a class="ov" href="' + m.href + '">' + 'Overview' + ' →</a></li>' : '') +
      m.items.map(function (i) { return '<li>' + (i.href ? '<a href="' + i.href + '">' + i.label + '</a>' : '<span>' + i.label + ' <small>Soon</small></span>') + '</li>'; }).join('') + '</ul></details>';
  }).join('');

  var root = document.getElementById('site-nav'); if (!root) return;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  root.innerHTML = '<nav class="sn" aria-label="Main"><div class="sn-bar"><div class="sn-row">' + logo + '<ul class="sn-main">' + main + '</ul><div class="sn-right"><a class="sn-contact" href="contact.html">Contact</a><button class="sn-burger" type="button" aria-label="Menu" aria-expanded="false"><i></i></button></div></div>' +
    '<div class="sn-panel"><div>' + secs + '</div></div><div class="sn-mob">' + mob + '</div></div></nav><div class="sn-veil"></div>';

  var nav = root.querySelector('.sn'), tops = [].slice.call(root.querySelectorAll('.sn-top')), veil = root.querySelector('.sn-veil');
  var openId = null, closeT = 0, openT = 0, fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function show(id) {
    clearTimeout(closeT); openId = id; nav.classList.add('open');
    tops.forEach(function (t) { t.setAttribute('aria-expanded', String(t.dataset.sec === id)); });
    root.querySelectorAll('.sn-sec').forEach(function (s) { s.classList.toggle('on', s.id === 'sn-' + id); });
  }
  function hide() { openId = null; nav.classList.remove('open'); tops.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); }); }
  function later() { clearTimeout(openT); clearTimeout(closeT); closeT = setTimeout(hide, 220); }
  tops.forEach(function (t) {
    t.addEventListener('click', function () { openId === t.dataset.sec ? hide() : show(t.dataset.sec); });
    if (fine) t.addEventListener('mouseenter', function () { clearTimeout(openT); var id = t.dataset.sec; openT = setTimeout(function () { show(id); }, openId ? 0 : 120); });
  });
  if (fine) { nav.addEventListener('mouseleave', later); nav.addEventListener('mouseenter', function () { clearTimeout(closeT); }); }
  veil.addEventListener('click', function () { hide(); nav.classList.remove('mob-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (openId || nav.classList.contains('mob-open'))) { var was = openId; hide(); nav.classList.remove('mob-open'); var t = tops.filter(function (x) { return x.dataset.sec === was; })[0]; if (t) t.focus(); } });
  // Preview follows whichever item is hovered or focused
  MENU.forEach(function (m) {
    var sec = root.querySelector('#sn-' + m.id), prev = sec.querySelector('.sn-prev'), lis = sec.querySelectorAll('.sn-list li');
    lis.forEach(function (li) {
      function pick() {
        var i = m.items[+li.dataset.i];
        sec.querySelectorAll('.sn-list .hot').forEach(function (x) { x.classList.remove('hot'); });
        li.firstChild.classList.add('hot');
        prev.innerHTML = '<span class="pk">' + (i.live ? 'Live · updated weekly' : m.label) + '</span><h3>' + i.label + '</h3><p>' + i.blurb + '</p>';
      }
      li.addEventListener('mouseenter', pick); li.addEventListener('focusin', pick);
    });
  });
  // Mobile
  var burger = root.querySelector('.sn-burger');
  burger.addEventListener('click', function () { var o = nav.classList.toggle('mob-open'); burger.setAttribute('aria-expanded', String(o)); });
  window.SITE_MAIL = MAIL;
})();

/* ===== Site footer, legal details and cookie preferences. Pages add <div id="site-footer"></div>. =====
   COMPANY holds the details the law requires on a UK business website. Fill in from Companies House; blanks are hidden. */
(function () {
  var COMPANY = {
    name: '9 Degrees East Limited',  // registered name, as on Companies House
    number: '11587380',              // Companies House number
    registeredIn: 'England and Wales',
    office: '61 Grange Road, London SE1 3BD, United Kingdom', // registered office. Companies House shows the full address incl. flat number; Tom to decide on a service address
    vat: '',                         // VAT number, if any (none supplied yet)
    ico: '',                         // ICO data protection registration number, if any (none supplied yet)
    incorporated: '25 September 2018',
    email: 'tomfox@9degreeseast.com'
  };
  window.NINE_COMPANY = COMPANY;

  // Consent for optional storage. 'prefs' = remembering choices such as the Policy Tracker region filter.
  var KEY = '9de-consent';
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  window.NINE_CONSENT = {
    prefs: function () { var c = read(); return !!(c && c.prefs); },
    open: function () { openPanel(); }
  };

  var css = '\
  .sf { margin-top: 40px; border-top: 1px solid rgba(160,190,220,0.14); background: linear-gradient(rgba(6,21,39,0), rgba(4,14,27,0.6)); font-family: Manrope, system-ui, sans-serif; color: #A8B7C6; }\
  .sf-in { width: min(100% - 80px, 1180px); margin: 0 auto; padding: 44px 0 26px; }\
  .sf-top { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 32px; padding-bottom: 34px; }\
  .sf-brand a { display: inline-flex; align-items: center; gap: 10px; color: #EEF2F5; text-decoration: none; }\
  .sf-brand svg { width: 30px; height: 30px; } .sf-brand span { font-size: 10px; font-weight: 600; letter-spacing: 0.24em; }\
  .sf-brand p { margin: 14px 0 0; max-width: 300px; font: 400 18px/1.4 "Instrument Serif", Georgia, serif; color: #C9D6E3; }\
  .sf-col h2 { margin: 0 0 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #D8B66E; }\
  .sf-col ul { margin: 0; padding: 0; list-style: none; }\
  .sf-col a { display: inline-block; padding: 5px 0; font-size: 13px; color: #C9D6E3; text-decoration: none; }\
  .sf-col a:hover { color: #EEF2F5; }\
  .sf-legal { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; padding-top: 18px; border-top: 1px solid rgba(160,190,220,0.12); font-size: 11.5px; }\
  .sf-links { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; padding: 0; list-style: none; }\
  .sf-links a, .sf-links button { padding: 0; border: 0; background: none; font: inherit; color: #A8B7C6; text-decoration: none; cursor: pointer; }\
  .sf-links a:hover, .sf-links button:hover { color: #EEF2F5; }\
  .sf-reg { margin: 12px 0 0; font-size: 10.5px; line-height: 1.6; color: #6F87A3; }\
  .sf a:focus-visible, .sf button:focus-visible, .cp button:focus-visible, .cp a:focus-visible, .cp input:focus-visible + .sw { outline: 2px solid #D8B66E; outline-offset: 3px; }\
  /* Cookie preferences panel */\
  .cp-veil { position: fixed; inset: 0; z-index: 90; background: rgba(3,10,20,0.6); display: flex; align-items: flex-end; justify-content: center; padding: 16px; opacity: 0; pointer-events: none; transition: opacity 250ms ease; }\
  .cp-veil.on { opacity: 1; pointer-events: auto; }\
  .cp { width: min(100%, 560px); margin-bottom: 4vh; background: rgba(9,28,50,0.96); border: 1px solid rgba(160,190,220,0.22); border-radius: 12px; padding: 24px 24px 20px; color: #EEF2F5; font-family: Manrope, system-ui, sans-serif; box-shadow: 0 20px 60px rgba(0,0,0,0.4); transform: translateY(12px); transition: transform 300ms ease; }\
  .cp-veil.on .cp { transform: none; }\
  .cp h2 { margin: 0 0 8px; font: 400 28px/1.1 "Instrument Serif", Georgia, serif; }\
  .cp > p { margin: 0 0 16px; font-size: 13.5px; line-height: 1.7; color: #C9D6E3; }\
  .cp-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 14px 0; border-top: 1px solid rgba(160,190,220,0.14); }\
  .cp-row b { display: block; font-size: 14px; margin-bottom: 4px; } .cp-row span { font-size: 12.5px; line-height: 1.6; color: #A8B7C6; }\
  .cp-row em { font-style: normal; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5EC8D8; white-space: nowrap; }\
  .cp label.tg { position: relative; flex: none; }\
  .cp label.tg input { position: absolute; opacity: 0; width: 1px; height: 1px; }\
  .cp .sw { display: block; width: 42px; height: 24px; border-radius: 999px; background: rgba(160,190,220,0.25); position: relative; cursor: pointer; transition: background 200ms ease; }\
  .cp .sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #EEF2F5; transition: transform 200ms ease; }\
  .cp input:checked + .sw { background: #D8B66E; } .cp input:checked + .sw::after { transform: translateX(18px); }\
  .cp-btns { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-top: 16px; }\
  .cp-btns a { font-size: 12px; color: #D8B66E; }\
  .cp-btns button { min-height: 42px; padding: 0 18px; border: 0; border-radius: 6px; background: #D8B66E; color: #061527; font: 600 13px Manrope, sans-serif; cursor: pointer; }\
  @media (max-width: 860px) { .sf-top { grid-template-columns: 1fr 1fr; } .sf-brand { grid-column: 1 / -1; } }\
  @media (max-width: 860px), (pointer: coarse) { .sf-brand a { min-height: 44px; } .sf-col a { display: flex; align-items: center; min-height: 44px; padding: 0; } .sf-col h2 { margin-bottom: 4px; } .sf-links { gap: 0 20px; } .sf-links a, .sf-links button { display: inline-flex; align-items: center; min-height: 44px; } }\
  @media (max-width: 520px) { .sf-in { width: calc(100% - 40px); } .sf-top { grid-template-columns: 1fr 1fr; gap: 24px; } }';

  var logo = '<svg viewBox="0 0 100 100" fill="none" stroke-linecap="round" aria-hidden="true"><circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="2.6" stroke-dasharray="196.5 80" transform="rotate(120 50 50)"/><circle cx="46" cy="43" r="16" stroke="currentColor" stroke-width="8"/><path d="M60.5 49.8 L46.8 79" stroke="currentColor" stroke-width="8"/><circle cx="71" cy="25" r="5" stroke="#D8B66E" stroke-width="3.4"/></svg>';
  function col(title, links) { return '<div class="sf-col"><h2>' + title + '</h2><ul>' + links.map(function (l) { return '<li><a href="' + l[1] + '">' + l[0] + '</a></li>'; }).join('') + '</ul></div>'; }
  function reg() {
    var bits = [];
    if (COMPANY.number) bits.push(COMPANY.name + ' is registered in ' + (COMPANY.registeredIn || 'England and Wales') + ', company number ' + COMPANY.number + '.');
    if (COMPANY.office) bits.push('Registered office: ' + COMPANY.office + '.');
    if (COMPANY.vat) bits.push('VAT number ' + COMPANY.vat + '.');
    return bits.length ? '<p class="sf-reg">' + bits.join(' ') + '</p>' : '';
  }

  function mount() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var root = document.getElementById('site-footer');
    if (root) {
      root.innerHTML = '<footer class="sf"><div class="sf-in"><div class="sf-top">' +
        '<div class="sf-brand"><a href="./" aria-label="9 Degrees East home">' + logo + '<span>9 DEGREES EAST</span></a><p>Commercial advisory for low-carbon fuels.</p></div>' +
        col('About', [['Who we are', 'about.html'], ['Our history', 'our-history.html'], ['Purpose, mission & values', 'purpose.html'], ['How we work', 'how-we-work.html'], ['Locations', 'locations.html']]) +
        col('Insights', [['Fuel Weather', 'fuel-weather.html'], ['Policy Tracker', 'policy-tracker.html'], ['Market Conditions', 'market-conditions.html'], ['The 9DE Journal', 'journal.html']]) +
        col('Services', [['Offtake strategy', 'offtake-strategy.html'], ['Deal structuring', 'deal-structuring.html'], ['Supply agreements', 'supply-agreements.html'], ['Regulatory advisory', 'regulatory-advisory.html']]) +
        '</div><div class="sf-legal"><span>© ' + new Date().getFullYear() + ' ' + COMPANY.name + '</span><ul class="sf-links">' +
        '<li><a href="legal-notice.html">Legal notice</a></li><li><a href="privacy.html">Privacy notice</a></li><li><button type="button" data-cookie-prefs>Cookie preferences</button></li><li><a href="accessibility.html">Accessibility</a></li><li><a href="contact.html">Contact us</a></li>' +
        '</ul></div>' + reg() + '</div></footer>';
    }
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-cookie-prefs]'); if (t) { e.preventDefault(); openPanel(); } });
    // Fill company details on the legal pages
    document.querySelectorAll('[data-company]').forEach(function (el) { var v = COMPANY[el.dataset.company]; if (v) el.textContent = v; else if (el.dataset.empty === 'hide') el.closest('[data-row]').hidden = true; });
  }

  var veil = null;
  function openPanel() {
    if (!veil) {
      veil = document.createElement('div'); veil.className = 'cp-veil';
      veil.innerHTML = '<div class="cp" role="dialog" aria-modal="true" aria-labelledby="cp-title"><h2 id="cp-title">Cookie preferences</h2>' +
        '<p>This site has no advertising or tracking cookies and no analytics. It keeps a few small notes in your browser, which are never shared with anyone.</p>' +
        '<div class="cp-row"><div><b>Essential</b><span>Remembers that you have seen the opening animation (until you close your browser) and the choices you make here. Needed for the site to work as designed.</span></div><em>Always on</em></div>' +
        '<div class="cp-row"><div><b>Preferences</b><span>Remembers choices you make, such as the region you picked on the Policy Tracker, for your next visit.</span></div><label class="tg"><input type="checkbox" id="cp-prefs"><span class="sw" aria-hidden="true"></span><span style="position:absolute;width:1px;height:1px;overflow:hidden">Remember my preferences</span></label></div>' +
        '<div class="cp-btns"><a href="cookies.html">Read the cookie notice</a><button type="button" id="cp-save">Save choices</button></div></div>';
      document.body.appendChild(veil);
      veil.addEventListener('click', function (e) { if (e.target === veil) closePanel(); });
      veil.querySelector('#cp-save').addEventListener('click', function () {
        var on = veil.querySelector('#cp-prefs').checked; write({ prefs: on, date: new Date().toISOString().slice(0, 10) });
        if (!on) { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('9de-') === 0 && k !== KEY) localStorage.removeItem(k); }); } catch (e) {} }
        closePanel();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && veil.classList.contains('on')) closePanel(); });
    }
    veil.querySelector('#cp-prefs').checked = window.NINE_CONSENT.prefs();
    veil.classList.add('on'); veil.querySelector('#cp-save').focus();
  }
  function closePanel() { if (veil) veil.classList.remove('on'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

/* ===== Scroll position: a page opened through a link starts at the top (some browsers and embedded
   previews keep the previous page's position). Back and forward still return to where you were. ===== */
(function () {
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  if (nav.type !== 'back_forward' && !location.hash) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    addEventListener('load', function () {
      if (!location.hash) window.scrollTo(0, 0);
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; // so Back returns here at the right spot
    });
  }
  // A link to the page you are already on scrolls smoothly back to the top
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var url = new URL(a.getAttribute('href'), location.href);
    if (url.pathname === location.pathname && !url.hash && url.origin === location.origin) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
})();
