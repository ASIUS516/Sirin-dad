(function () {
  const state = {
    lang: localStorage.getItem('sd_lang') || 'az',
    settings: null,
    categories: [],
    products: [],
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
    renderPaymentBox();
  }

  els.langSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (btn) setLang(btn.dataset.lang);
  });

  async function loadData() {
    try {
      const [settingsRes, categoriesRes, productsRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);
      state.settings = settingsRes;
      state.categories = categoriesRes;
      state.products = productsRes;
      renderFooterInfo();
      renderPaymentBox();
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
  }

  function renderPaymentBox() {
    if (!state.settings) return;
    document.getElementById('checkoutCardNumber').textContent = state.settings.card_number || '—';
    const holder = state.settings.card_holder ? `${state.settings.card_holder} · ${state.settings.card_bank || ''}` : (state.settings.card_bank || '');
    document.getElementById('checkoutCardHolder').textContent = holder;
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
        <div class="product-card" style="animation-delay:${Math.min(i * 0.05, 0.4)}s">
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
      btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)));
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

      showToast(t('orderSuccess', state.lang));
      state.cart = [];
      saveCart();
      renderCart();
      els.checkoutForm.reset();
      closeDrawers();
    } catch (err) {
      showToast(t('orderError', state.lang));
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  setLang(state.lang);
  loadData();
})();
