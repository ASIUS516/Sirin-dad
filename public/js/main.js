(function () {
  const state = {
    lang: localStorage.getItem('sd_lang') || 'az',
    settings: null,
    categories: [],
    products: [],
    cards: [],
    selectedCardId: null,
    activeCategory: 'all',
    cart: JSON.parse(sessionStorage.getItem('sd_cart') || '[]'),
  };

  const els = {
    langSwitch: document.getElementById('langSwitch'),
    categoriesStrip: document.getElementById('categoriesStrip'),
    productGrid: document.getElementById('productGrid'),
    cartBtn: document.getElementById('cartBtn'),
    cartCount: document.getElementById('cartCount'),
    cartDrawer: document.getElementById('cartDrawer'),
    checkoutDrawer: document.getElementById('checkoutDrawer'),
    overlay: document.getElementById('overlay'),
    cartBody: document.getElementById('cartBody'),
    cartFooter: document.getElementById('cartFooter'),
    cartTotal: document.getElementById('cartTotal'),
    checkoutTotal: document.getElementById('checkoutTotal'),
    checkoutForm: document.getElementById('checkoutForm'),
    toast: document.getElementById('toast'),
  };

  function fieldByLang(obj, prefix) {
    return obj[`${prefix}_${state.lang}`] || obj[`${prefix}_az`] || '';
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  function saveCart() {
    sessionStorage.setItem('sd_cart', JSON.stringify(state.cart));
  }

  function applyTranslations() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, state.lang);
    });
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('sd_lang', lang);
    document.querySelectorAll('#langSwitch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    applyTranslations();
    renderCategories();
    renderProducts();
    renderCart();
    renderFooterInfo();
    renderLocation();
    renderPaymentCards();
  }

  els.langSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (btn) setLang(btn.dataset.lang);
  });

  async function loadData() {
    try {
      const [settingsRes, categoriesRes, productsRes, cardsRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/cards').then((r) => r.json()).catch(() => []),
      ]);
      state.settings = settingsRes;
      state.categories = categoriesRes;
      state.products = productsRes;
      state.cards = Array.isArray(cardsRes) ? cardsRes : [];
      if (state.cards.length > 0) state.selectedCardId = state.cards[0].id;
      renderFooterInfo();
      renderLocation();
      renderPaymentCards();
      renderCategories();
      renderProducts();
    } catch (err) {
      console.error(err);
      els.productGrid.innerHTML = `<div class="empty-state">Xəta baş verdi, səhifəni yeniləyin.</div>`;
    }
  }

  function renderFooterInfo() {
  if (!state.settings) return;
  document.getElementById('footerPhone').textContent = state.settings.phone || '—';
  const addr = fieldByLang(state.settings, 'address');
  document.getElementById('footerAddress').textContent = addr || '—';
  document.getElementById('footerAddressLine').style.display = addr ? '' : 'none';
  const hours = state.settings.working_hours;
  document.getElementById('footerHours').textContent = hours || '—';
  document.getElementById('footerHoursLine').style.display = hours ? '' : 'none';
  renderSocialLinks();
}

const SOCIAL_ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.1-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .78.8-2.92-.19-.3A7.9 7.9 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.38-5.86c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.4-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 1.94 1.6 3.44 3.5 3.66v2.62a6.6 6.6 0 0 1-3.5-1.02v6.4c0 3-2.44 5.34-5.4 5.06-2.6-.24-4.6-2.4-4.6-5.06 0-2.86 2.4-5.14 5.28-5.06.24 0 .48.02.72.06v2.7a2.5 2.5 0 0 0-.72-.1c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.6-1.14 2.6-2.6V3h2.12z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l6 3-6 3V9z"/></svg>',
};

function normalizeSocial(platform, raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const stripAt = (s) => s.replace(/^@/, '').replace(/\/+$/, '');

  if (platform === 'instagram') {
    let handle = value;
    const m = value.match(/instagram\.com\/([^/?#]+)/i);
    if (m) handle = m[1];
    handle = stripAt(handle);
    return { label: `@${handle}`, href: https://instagram.com/${handle} };
  }
  if (platform === 'tiktok') {
    let handle = value;
    const m = value.match(/tiktok\.com\/@?([^/?#]+)/i);
    if (m) handle = m[1];
    handle = stripAt(handle);
    return { label: @${handle}, href: https://www.tiktok.com/@${handle} };
  }
  if (platform === 'youtube') {
    if (/^https?:\/\//i.test(value)) {
      const label = value.replace(/^https?:\/\/(www\.)?youtube\.com\//i, '');
      return { label: @${stripAt(label)}, href: value };
    }
    const handle = stripAt(value);
    return { label: @${handle}, href: https://youtube.com/@${handle} };
  }
  if (platform === 'whatsapp') {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return null;
    return { label: value.startsWith('+') ? value : +${digits}, href: https://wa.me/${digits} };
  }
  return null;
}

function renderSocialLinks() {
  const wrap = document.getElementById('footerSocial');
  if (!wrap || !state.settings) return;
  const platforms = ['whatsapp', 'instagram', 'tiktok', 'youtube'];
  const html = platforms
    .map((p) => {
      const info = normalizeSocial(p, state.settings[p]);
      if (!info) return '';
      return <a class="social-link social-${p}" href="${info.href}" target="_blank" rel="noopener">
        <span class="social-icon">${SOCIAL_ICONS[p]}</span>
        <span class="social-label">${info.label}</span>
      </a>;
    })
    .join('');
  wrap.innerHTML = html;
}

  function renderLocation() {
    if (!state.settings) return;
    const wrap = document.getElementById('footerLocation');
    const lat = parseFloat(state.settings.location_lat);
    const lng = parseFloat(state.settings.location_lng);

    if (!wrap) return;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const openLink = state.settings.location_link || `https://www.google.com/maps?q=${lat},${lng}`;
      const embedSrc = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      wrap.innerHTML = `
        <div class="footer-map">
          <iframe src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Şirin Dad — məkan"></iframe>
        </div>
        <a class="map-link" href="${openLink}" target="_blank" rel="noopener">📍 ${t('openInMaps', state.lang)}</a>
      `;
    } else {
      wrap.innerHTML = `<div class="location-soon">📍 ${t('locationComingSoon', state.lang)}</div>`;
    }
  }

  function renderPaymentCards() {
    const listEl = document.getElementById('paymentCardsList');
    const hiddenInput = document.getElementById('paymentCardIdInput');
    if (!listEl) return;

    if (!state.cards || state.cards.length === 0) {
      listEl.innerHTML = `<div class="no-cards-msg">${t('noCardsAvailable', state.lang)}</div>`;
      if (hiddenInput) hiddenInput.value = '';
      return;
    }

    listEl.innerHTML = `
      <div class="choose-card-label">${t('choosePaymentCard', state.lang)}</div>
      ${state.cards
        .map(
          (c) => `
        <label class="payment-card-option ${state.selectedCardId === c.id ? 'selected' : ''}" data-card-id="${c.id}">
          <input type="radio" name="payment_card_radio" value="${c.id}" ${state.selectedCardId === c.id ? 'checked' : ''}>
          <div class="pco-body">
            <div class="pco-bank">${escapeHtml(c.bank_name)}</div>
            <div class="pco-number">${escapeHtml(c.card_number)}</div>
            ${c.card_holder ? `<div class="pco-holder">${escapeHtml(c.card_holder)}</div>` : ''}
          </div>
          <div class="pco-check">✓</div>
        </label>`
        )
        .join('')}
    `;

    if (hiddenInput) hiddenInput.value = state.selectedCardId || '';

    listEl.querySelectorAll('.payment-card-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        state.selectedCardId = Number(opt.dataset.cardId);
        renderPaymentCards();
      });
    });
  }

  function renderCategories() {
    const allLabel = t('allCategories', state.lang);
    let html = `<button class="cat-chip ${state.activeCategory === 'all' ? 'active' : ''}" data-cat="all">${allLabel}</button>`;
    html += state.categories
      .map((c) => `<button class="cat-chip ${state.activeCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${fieldByLang(c, 'name')}</button>`)
      .join('');
    els.categoriesStrip.innerHTML = html;
    els.categoriesStrip.querySelectorAll('.cat-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.activeCategory = chip.dataset.cat === 'all' ? 'all' : Number(chip.dataset.cat);
        renderCategories();
        renderProducts();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderProducts() {
    const filtered = state.activeCategory === 'all'
      ? state.products
      : state.products.filter((p) => p.category_id === state.activeCategory);

    if (filtered.length === 0) {
      els.productGrid.innerHTML = `<div class="empty-state">${t('noProducts', state.lang)}</div>`;
      return;
    }

    els.productGrid.innerHTML = filtered
      .map((p, i) => {
        const img = p.images && p.images[0] ? p.images[0] : '';
        return `
        <div class="product-card" style="animation-delay:${Math.min(i * 0.05, 0.4)}s" data-id="${p.id}">
          ${img ? `<img class="product-photo" src="${img}" alt="${escapeHtml(fieldByLang(p, 'name'))}" loading="lazy">` : `<div class="product-photo"></div>`}
          <div class="product-body">
            <h3>${escapeHtml(fieldByLang(p, 'name'))}</h3>
            <p>${escapeHtml(fieldByLang(p, 'desc'))}</p>
            <div class="product-footer">
              <span class="price">${p.price.toFixed(2)} AZN</span>
              <button class="add-btn" data-id="${p.id}" aria-label="${t('addToCart', state.lang)}">+</button>
            </div>
          </div>
        </div>`;
      })
      .join('');

    els.productGrid.querySelectorAll('.add-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(Number(btn.dataset.id));
      });
    });

    els.productGrid.querySelectorAll('.product-card').forEach((card) => {
      card.addEventListener('click', () => {
        window.location.href = `/product/${card.dataset.id}`;
      });
    });
  }

  function addToCart(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    const existing = state.cart.find((i) => i.id === productId);
    if (existing) existing.qty += 1;
    else state.cart.push({ id: productId, qty: 1 });
    saveCart();
    renderCart();
    els.cartBtn.classList.remove('bump');
    void els.cartBtn.offsetWidth;
    els.cartBtn.classList.add('bump');
    showToast(`${fieldByLang(product, 'name')} — ${t('addToCart', state.lang)}`);
  }

  function changeQty(productId, delta) {
    const item = state.cart.find((i) => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== productId);
    saveCart();
    renderCart();
  }

  function cartTotal() {
    return state.cart.reduce((sum, item) => {
      const product = state.products.find((p) => p.id === item.id);
      return product ? sum + product.price * item.qty : sum;
    }, 0);
  }

  function renderCart() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    els.cartCount.style.display = count > 0 ? 'flex' : 'none';
    els.cartCount.textContent = count;

    if (state.cart.length === 0) {
      els.cartBody.innerHTML = `<div class="empty-state">${t('cartEmpty', state.lang)}</div>`;
      els.cartFooter.style.display = 'none';
      return;
    }

    els.cartBody.innerHTML = state.cart
      .map((item) => {
        const product = state.products.find((p) => p.id === item.id);
        if (!product) return '';
        const img = product.images && product.images[0] ? product.images[0] : '';
        return `
        <div class="cart-item">
          ${img ? `<img src="${img}" alt="">` : ''}
          <div class="cart-item-info">
            <h4>${escapeHtml(fieldByLang(product, 'name'))}</h4>
            <div>${product.price.toFixed(2)} AZN</div>
            <div class="qty-control">
              <button data-act="minus" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button data-act="plus" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>`;
      })
      .join('');

    els.cartBody.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        changeQty(Number(btn.dataset.id), btn.dataset.act === 'plus' ? 1 : -1);
      });
    });

    els.cartFooter.style.display = '';
    const total = cartTotal();
    els.cartTotal.textContent = `${total.toFixed(2)} AZN`;
    els.checkoutTotal.textContent = `${total.toFixed(2)} AZN`;
  }

  function openDrawer(drawer) {
    els.overlay.classList.add('open');
    drawer.classList.add('open');
  }
  function closeDrawers() {
    els.overlay.classList.remove('open');
    els.cartDrawer.classList.remove('open');
    els.checkoutDrawer.classList.remove('open');
  }

  els.cartBtn.addEventListener('click', () => openDrawer(els.cartDrawer));
  document.getElementById('closeCart').addEventListener('click', closeDrawers);
  document.getElementById('closeCheckout').addEventListener('click', closeDrawers);
  els.overlay.addEventListener('click', closeDrawers);

  document.getElementById('goToCheckout').addEventListener('click', () => {
    if (state.cart.length === 0) return;
    els.cartDrawer.classList.remove('open');
    openDrawer(els.checkoutDrawer);
  });

  els.checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(els.checkoutForm);
    const payload = {
      customer_name: formData.get('customer_name'),
      customer_phone: formData.get('customer_phone'),
      customer_address: formData.get('customer_address'),
      comment: formData.get('comment'),
      payment_last4: formData.get('payment_last4'),
      payment_note: formData.get('payment_note'),
      payment_card_id: state.selectedCardId || null,
      items: state.cart,
    };

    const submitBtn = els.checkoutForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');

      state.cart = [];
      saveCart();
      renderCart();
      els.checkoutForm.reset();
      closeDrawers();
      showOrderSuccess(data.id);
    } catch (err) {
      showToast(t('orderError', state.lang));
    } finally {
      submitBtn.disabled = false;
    }
  });

  function showOrderSuccess(orderId) {
    document.getElementById('successOrderId').textContent = orderId;
    document.getElementById('successOverlay').classList.add('open');
    document.getElementById('successModal').classList.add('open');
  }
  function closeOrderSuccess() {
    document.getElementById('successOverlay').classList.remove('open');
    document.getElementById('successModal').classList.remove('open');
  }
  document.getElementById('closeSuccessModal').addEventListener('click', closeOrderSuccess);
  document.getElementById('successOverlay').addEventListener('click', (e) => {
    // only close if this click wasn't meant for the cart/checkout overlay logic
    if (document.getElementById('successModal').classList.contains('open')) closeOrderSuccess();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  setLang(state.lang);
  loadData();
})();
