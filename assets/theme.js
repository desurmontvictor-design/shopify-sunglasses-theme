/* ================================================================
   CLAIRZAL — v2 JS · Inspiré Celine / Oliver Peoples
   ================================================================ */
'use strict';

(() => {

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const fmt = c => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100);
const esc = s => { const d = document.createElement('div'); d.append(document.createTextNode(s)); return d.innerHTML; };

/* ── Header – apparition au scroll ─────────────────────────── */
const hdr = $('#site-header');
if (hdr) {
  const onScroll = () => hdr.classList.toggle('solid', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Overlay nav ────────────────────────────────────────────── */
const burger  = $('#burger-btn');
const overlay = $('#overlay-nav');
const oClose  = $('#overlay-close');

const openNav = () => {
  overlay?.classList.add('open');
  overlay?.setAttribute('aria-hidden','false');
  burger?.setAttribute('aria-expanded','true');
  document.body.style.overflow = 'hidden';
};
const closeNav = () => {
  overlay?.classList.remove('open');
  overlay?.setAttribute('aria-hidden','true');
  burger?.setAttribute('aria-expanded','false');
  document.body.style.overflow = '';
};

burger?.addEventListener('click', openNav);
oClose?.addEventListener('click', closeNav);
$$('.overlay-nav a').forEach(a => a.addEventListener('click', closeNav));

/* ── Cart drawer ────────────────────────────────────────────── */
const cdrawer = $('#cdrawer');
const cBody   = $('#cdrawer-body');
const cFoot   = $('#cdrawer-foot');
const cSub    = $('#cdrawer-subtotal');
const cDot    = $('#cart-dot');

const openCart  = () => {
  cdrawer?.classList.add('open');
  cdrawer?.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  syncCart();
};
const closeCart = () => {
  cdrawer?.classList.remove('open');
  cdrawer?.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
};

$('#cart-btn')?.addEventListener('click', openCart);
$('#cdrawer-close')?.addEventListener('click', closeCart);
$('#cdrawer-veil')?.addEventListener('click', closeCart);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCart(); closeNav(); }
});

/* ── Fetch cart ─────────────────────────────────────────────── */
const syncCart = async () => {
  try {
    const cart = await fetch('/cart.js').then(r => r.json());
    renderDrawer(cart);
  } catch(e) { console.warn('Cart sync error', e); }
};

const renderDrawer = cart => {
  // badge
  if (cDot) {
    cDot.textContent = cart.item_count;
    cDot.classList.toggle('on', cart.item_count > 0);
  }
  if (!cBody) return;

  if (!cart.item_count) {
    cBody.innerHTML = '<p class="cdrawer__empty">Votre panier est vide.</p>';
    if (cFoot) cFoot.style.display = 'none';
    return;
  }

  if (cFoot) { cFoot.style.display = 'flex'; }
  if (cSub)  { cSub.textContent = fmt(cart.total_price); }

  cBody.innerHTML = cart.items.map(it => `
    <div class="ditem">
      <img class="ditem__img" src="${it.image}" alt="${esc(it.title)}">
      <div>
        <div class="ditem__name">${esc(it.product_title.toUpperCase())}</div>
        ${it.variant_title !== 'Default Title' ? `<div class="ditem__var">${esc(it.variant_title)}</div>` : ''}
        <div class="ditem__price">${fmt(it.final_line_price)}</div>
        <button class="ditem__rm" data-key="${it.key}">RETIRER</button>
      </div>
    </div>
  `).join('');

  $$('.ditem__rm', cBody).forEach(btn =>
    btn.addEventListener('click', () => changeCart(btn.dataset.key, 0))
  );
};

/* ── Add to cart ────────────────────────────────────────────── */
const addToCart = async (id, qty = 1) => {
  const r = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, quantity: qty })
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.description || 'Erreur panier'); }
  await syncCart();
  openCart();
};

const changeCart = async (key, qty) => {
  await fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: key, quantity: qty })
  });
  syncCart();
};

/* ── Quick add (collection cards) ──────────────────────────── */
document.addEventListener('click', async e => {
  const btn = e.target.closest('.pcard__add[data-id]');
  if (!btn) return;
  e.preventDefault();
  const orig = btn.textContent;
  btn.textContent = '…';
  try {
    await addToCart(btn.dataset.id);
    btn.textContent = 'AJOUTÉ ✓';
    setTimeout(() => btn.textContent = orig, 2000);
  } catch {
    btn.textContent = orig;
  }
});

/* ── Product form ───────────────────────────────────────────── */
const pdpForm  = $('#pdp-form');
const pdpATC   = $('#pdp-atc');
const pdpBuy   = $('#pdp-buynow');
const varInput = $('#pdp-variant');
const pdpPrice = $('#pdp-price');

const variantsData = (() => {
  try { return JSON.parse($('#variants-json')?.textContent || 'null'); }
  catch { return null; }
})();

const getOpts = () => {
  const o = {};
  $$('[data-opt]').forEach(g => {
    const active = g.querySelector('.on');
    if (active) o[parseInt(g.dataset.opt)] = active.dataset.val;
  });
  return o;
};

const findVariant = opts =>
  variantsData?.find(v =>
    Object.entries(opts).every(([i, val]) => v[`option${+i+1}`] === val)
  ) ?? null;

const applyVariant = v => {
  if (!v) return;
  if (varInput)  varInput.value = v.id;
  if (pdpPrice)  pdpPrice.innerHTML = v.compare_at_price > v.price
    ? `<s>${fmt(v.compare_at_price)}</s> ${fmt(v.price)}`
    : fmt(v.price);
  if (pdpATC) {
    pdpATC.disabled     = !v.available;
    pdpATC.textContent  = v.available ? 'AJOUTER AU PANIER' : 'ÉPUISÉ';
  }
  if (pdpBuy)  pdpBuy.href = `/checkout?variant=${v.id}`;
};

$$('[data-opt]').forEach(group => {
  group.querySelectorAll('.swatch, .vpill').forEach(el => {
    el.addEventListener('click', () => {
      group.querySelectorAll('.swatch, .vpill').forEach(x => x.classList.remove('on'));
      el.classList.add('on');
      applyVariant(findVariant(getOpts()));
    });
  });
});

pdpForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!varInput?.value) return;
  const orig = pdpATC?.textContent;
  if (pdpATC) { pdpATC.textContent = '…'; pdpATC.disabled = true; }
  try {
    await addToCart(varInput.value);
    if (pdpATC) pdpATC.textContent = 'AJOUTÉ ✓';
    setTimeout(() => { if (pdpATC) { pdpATC.textContent = orig; pdpATC.disabled = false; } }, 2000);
  } catch(err) {
    alert(err.message);
    if (pdpATC) { pdpATC.textContent = orig; pdpATC.disabled = false; }
  }
});

/* ── Product gallery ────────────────────────────────────────── */
const mainImg = $('#pdp-img');
$$('.pdp__thumb').forEach(t => {
  const activate = () => {
    $$('.pdp__thumb').forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    if (mainImg) mainImg.src = t.dataset.src;
  };
  t.addEventListener('click', activate);
  t.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') activate(); });
});

/* ── Cart page qty ──────────────────────────────────────────── */
$$('.qty-m, .qty-p').forEach(btn => {
  btn.addEventListener('click', async () => {
    const key   = btn.dataset.key;
    const input = document.querySelector(`input[data-key="${key}"]`);
    if (!input) return;
    const d   = btn.classList.contains('qty-p') ? 1 : -1;
    const qty = Math.max(0, parseInt(input.value) + d);
    input.value = qty;
    if (qty === 0) document.getElementById(`ci-${key}`)?.remove();
    await changeCart(key, qty);
  });
});

$$('.cart-item__rm').forEach(btn =>
  btn.addEventListener('click', async () => {
    document.getElementById(`ci-${btn.dataset.key}`)?.remove();
    await changeCart(btn.dataset.key, 0);
  })
);

/* ── Accordion ──────────────────────────────────────────────── */
$$('.acc__hd').forEach(hd => {
  hd.addEventListener('click', () => {
    const item   = hd.closest('.acc__item');
    const wasOpen = item.classList.contains('open');
    $$('.acc__item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ── Reveal on scroll ───────────────────────────────────────── */
const revEls = $$('.reveal');
if ('IntersectionObserver' in window && revEls.length) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.classList.add('in'); obs.unobserve(target); }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -48px 0px' });
  revEls.forEach(el => obs.observe(el));
}

/* ── Filter pills (collection, purely visual) ───────────────── */
$$('.coll-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.coll-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
  });
});

/* ── Init ───────────────────────────────────────────────────── */
syncCart();

})();
