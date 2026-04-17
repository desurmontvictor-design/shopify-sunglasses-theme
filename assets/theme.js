/* ================================================================
   CLAIRZAL — Theme JS
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Helpers ─────────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const fmt = (cents) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const esc = (s) => { const d = document.createElement('div'); d.append(document.createTextNode(s)); return d.innerHTML; };

  /* ── Header scroll ──────────────────────────────────────── */
  const header = $('#site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 10 ? '0 1px 20px rgba(0,21,50,0.06)' : 'none';
    }, { passive: true });
  }

  /* ── Mobile nav ─────────────────────────────────────────── */
  const burger = $('#burger');
  const mobileNav = $('#mobile-nav');
  const mobileClose = $('#mobile-nav-close');

  const openMobileNav = () => {
    mobileNav?.classList.add('open');
    mobileNav?.setAttribute('aria-hidden', 'false');
    burger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMobileNav = () => {
    mobileNav?.classList.remove('open');
    mobileNav?.setAttribute('aria-hidden', 'true');
    burger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  burger?.addEventListener('click', openMobileNav);
  mobileClose?.addEventListener('click', closeMobileNav);
  $$('.mobile-nav a').forEach(a => a.addEventListener('click', closeMobileNav));

  /* ── Cart Drawer ─────────────────────────────────────────── */
  const cartDrawer = $('#cart-drawer');
  const cartToggle = $('#cart-toggle');
  const cartClose = $('#cart-close');
  const cartOverlay = $('#cart-overlay');
  const cartBody = $('#cart-drawer-body');
  const cartFoot = $('#cart-drawer-foot');
  const cartBadge = $('#cart-badge');
  const drawerSubtotal = $('#drawer-subtotal');

  const openCart = () => {
    cartDrawer?.classList.add('open');
    cartDrawer?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    fetchCart();
  };
  const closeCart = () => {
    cartDrawer?.classList.remove('open');
    cartDrawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  cartToggle?.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCart(); closeMobileNav(); }
  });

  /* ── Fetch & render cart ─────────────────────────────────── */
  const fetchCart = async () => {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      renderCart(cart);
    } catch (err) { console.error('Cart fetch failed', err); }
  };

  const renderCart = (cart) => {
    if (!cartBody) return;

    // Update badge
    if (cartBadge) {
      cartBadge.textContent = cart.item_count;
      cartBadge.classList.toggle('show', cart.item_count > 0);
    }

    if (cart.item_count === 0) {
      cartBody.innerHTML = '<p class="cart-drawer__empty">Votre panier est vide.</p>';
      if (cartFoot) cartFoot.style.display = 'none';
      return;
    }

    if (cartFoot) {
      cartFoot.style.display = 'block';
      if (drawerSubtotal) drawerSubtotal.textContent = fmt(cart.total_price);
    }

    cartBody.innerHTML = cart.items.map(item => `
      <div class="drawer-item" data-key="${item.key}">
        <img class="drawer-item__img" src="${item.image}" alt="${esc(item.title)}">
        <div style="flex:1;">
          <div class="drawer-item__name">${esc(item.product_title.toUpperCase())}</div>
          ${item.variant_title !== 'Default Title' ? `<div class="drawer-item__variant">${esc(item.variant_title)}</div>` : ''}
          <div class="drawer-item__price">${fmt(item.final_line_price)}</div>
          <button class="drawer-item__remove" data-key="${item.key}" type="button">RETIRER</button>
        </div>
      </div>
    `).join('');

    // Remove listeners
    $$('.drawer-item__remove', cartBody).forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.key));
    });
  };

  /* ── Add to cart ─────────────────────────────────────────── */
  const addToCart = async (variantId, qty = 1) => {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.description || 'Erreur lors de l\'ajout au panier');
    }
    await fetchCart();
    openCart();
  };

  const removeFromCart = async (key) => {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: 0 })
    });
    fetchCart();
  };

  /* ── Product form ───────────────────────────────────────── */
  const productForm = $('#product-form');
  const addToCartBtn = $('#add-to-cart-btn');
  const buyNowBtn = $('#buy-now-btn');

  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const variantId = $('#variant-id')?.value;
      if (!variantId) return;

      const original = addToCartBtn?.textContent;
      if (addToCartBtn) { addToCartBtn.textContent = '…'; addToCartBtn.disabled = true; }
      try {
        await addToCart(variantId);
        if (addToCartBtn) { addToCartBtn.textContent = 'AJOUTÉ ✓'; }
        setTimeout(() => {
          if (addToCartBtn) { addToCartBtn.textContent = original; addToCartBtn.disabled = false; }
        }, 2000);
      } catch (err) {
        if (addToCartBtn) { addToCartBtn.textContent = 'ÉPUISÉ'; addToCartBtn.disabled = false; }
        alert(err.message);
      }
    });
  }

  /* ── Variant selection ──────────────────────────────────── */
  const variantsData = (() => {
    const el = $('#product-variants-json');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  })();

  const getSelectedOptions = () => {
    const opts = {};
    $$('[data-option]').forEach(group => {
      const idx = parseInt(group.dataset.option);
      const active = group.querySelector('.active');
      if (active) opts[idx] = active.dataset.value;
    });
    return opts;
  };

  const findVariant = (opts) => {
    if (!variantsData) return null;
    return variantsData.find(v =>
      Object.entries(opts).every(([i, val]) => v[`option${parseInt(i) + 1}`] === val)
    );
  };

  const updateVariantUI = (variant) => {
    const idInput = $('#variant-id');
    const priceEl = $('#product-price');
    const btn = $('#add-to-cart-btn');
    const buyNow = $('#buy-now-btn');

    if (idInput && variant) idInput.value = variant.id;
    if (priceEl && variant) priceEl.textContent = fmt(variant.price);
    if (btn && variant) {
      btn.disabled = !variant.available;
      btn.textContent = variant.available ? 'AJOUTER AU PANIER' : 'ÉPUISÉ';
    }
    if (buyNow && variant) {
      buyNow.href = `/checkout?variant=${variant.id}`;
    }
  };

  $$('.variant-swatches, .variant-buttons').forEach(group => {
    group.querySelectorAll('.swatch, .variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.swatch, .variant-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const opts = getSelectedOptions();
        const variant = findVariant(opts);
        if (variant) updateVariantUI(variant);
      });
    });
  });

  /* ── Product Gallery ─────────────────────────────────────── */
  const mainImg = $('#main-product-img');
  $$('.product-gallery__thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      $$('.product-gallery__thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.dataset.src;
    });
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') thumb.click();
    });
  });

  /* ── Cart page qty controls ──────────────────────────────── */
  $$('.qty-minus, .qty-plus').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const input = document.querySelector(`input[data-key="${key}"]`);
      if (!input) return;
      const delta = btn.classList.contains('qty-plus') ? 1 : -1;
      const newQty = Math.max(0, parseInt(input.value) + delta);
      input.value = newQty;
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: newQty })
      });
      if (newQty === 0) {
        document.getElementById(`cart-item-${key}`)?.remove();
      }
      fetchCart();
    });
  });

  $$('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: 0 })
      });
      document.getElementById(`cart-item-${key}`)?.remove();
      fetchCart();
    });
  });

  /* ── Accordion ───────────────────────────────────────────── */
  $$('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion__item');
      const isOpen = item.classList.contains('open');
      $$('.accordion__item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── Fade-up on scroll ───────────────────────────────────── */
  const fadeEls = $$('.fade-up');
  if ('IntersectionObserver' in window && fadeEls.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(el => obs.observe(el));
  }

  /* ── Init cart badge ─────────────────────────────────────── */
  fetchCart();

});
