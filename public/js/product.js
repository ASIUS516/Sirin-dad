(function () {
  const productId = window.location.pathname.split('/product/')[1];

  const state = {
    lang: localStorage.getItem('sd_lang') || 'az',
    product: null,
    activeImg: 0,
    qty: 1,
    cart: JSON.parse(sessionStorage.getItem('sd_cart') || '[]'),
  };

  const els = {
    langSwitch: document.getElementById('langSwitch'),
    productWrap: document.getElementById('productWrap'),
    cartBtn: document.getElementById('cartBtn'),
    cartCount: document.getElementById('cartCount'),
    cartDrawer: document.getElementById('cartDrawer'),
    overlay: document.getElementById('overlay'),
    cartBody: document.getElementById('cartBody'),
    cartFooter: document.getElementById('cartFooter'),
    cartTotal: document.getElementById('cartTotal'),
    toast: document.getElementById('toast'),
  };

  function fieldByLang(obj, prefix) {
    return obj[`${prefix}_${state.lang}`] || obj[`${prefix}_az`] || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
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
      el.textContent = t(el.getAttribute('data-i18n'), state.lang);
    });
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('sd_lang', lang);
    document.querySelectorAll('#langSwitch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    applyTranslations();
    renderProduct();
    renderCart();
  }

  els.langSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (btn) setLang(btn.dataset.lang);
  });

  async function loadProduct() {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('not found');
      state.product = await res.json();
      renderProduct();
    } catch (err) {
      els.productWrap.innerHTML = `<div class="empty-state">${t('productNotFound', state.lang)}</div>`;
    }
  }

  function renderProduct() {
    const p = state.product;
    if (!p) return;
    const images = p.images && p.images.length ? p.images : [''];

    els.productWrap.innerHTML = `
      <div class="product-detail">
        <div class="pd-gallery">
          <div class="pd-main-img">
            <img id="pdMainImg" src="${images[state.activeImg]}" alt="${escapeHtml(fieldByLang(p, 'name'))}">
            ${images.length > 1 ? `
              <button class="pd-arrow pd-arrow-left" id="pdPrev">‹</button>
              <button class="pd-arrow pd-arrow-right" id="pdNext">›</button>
            ` : ''}
          </div>
          ${images.length > 1 ? `
            <div class="pd-thumbs">
              ${images.map((img, i) => `<img class="pd-thumb ${i === state.activeImg ? 'active' : ''}" data-i="${i}" src="${img}">`).join('')}
            </div>
            <div class="pd-dots">
              ${images.map((_, i) => `<span class="pd-dot ${i === state.activeImg ? 'active' : ''}" data-i="${i}"></span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="pd-info">
          <h1>${escapeHtml(fieldByLang(p, 'name'))}</h1>
          <div class="pd-price">${p.price.toFixed(2)} AZN</div>
          <p class="pd-desc">${escapeHtml(fieldByLang(p, 'desc'))}</p>
          <div class="pd-qty-row">
            <span data-i18n="quantity">${t('quantity', state.lang)}</span>
            <div class="qty-control">
              <button id="pdQtyMinus">−</button>
              <span id="pdQtyVal">${state.qty}</span>
              <button id="pdQtyPlus">+</button>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%" id="pdAddToCart">${t('addToCart', state.lang)}</button>
        </div>
      </div>
    `;

    // Gallery interactions
    const mainImg = document.getElementById('pdMainImg');
    let touchStartX = null;

    function setActiveImg(i) {
      state.activeImg = (i + images.length) % images.length;
      mainImg.src = images[state.activeImg];
      document.querySelectorAll('.pd-thumb').forEach((t) => t.classList.toggle('active', Number(t.dataset.i) === state.activeImg));
      document.querySelectorAll('.pd-dot').forEach((d) => d.classList.toggle('active', Number(d.dataset.i) === state.activeImg));
    }

    document.getElementById('pdPrev')?.addEventListener('click', () => setActiveImg(state.activeImg - 1));
    document.getElementById('pdNext')?.addEventListener('click', () => setActiveImg(state.activeImg + 1));
    document.querySelectorAll('.pd-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => setActiveImg(Number(thumb.dataset.i)));
    });
    document.querySelectorAll('.pd-dot').forEach((dot) => {
      dot.addEventListener('click', () => setActiveImg(Number(dot.dataset.i)));
    });

    mainImg.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
    mainImg.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 40) setActiveImg(state.activeImg + (diff < 0 ? 1 : -1));
      touchStartX = null;
    });

    // Quantity
    document.getElementById('pdQtyMinus').addEventListener('click', () => {
      if (state.qty > 1) state.qty -= 1;
      document.getElementById('pdQtyVal').textContent = state.qty;
    });
    document.getElementById('pdQtyPlus').addEventListener('click', () => {
      state.qty += 1;
      document.getElementById('pdQtyVal').textContent = state.qty;
    });

    document.getElementById('pdAddToCart').addEventListener('click', () => {
      const existing = state.cart.find((i) => i.id === p.id);
      if (existing) existing.qty += state.qty;
      else state.cart.push({ id: p.id, qty: state.qty });
      saveCart();
      renderCart();
      showToast(`${fieldByLang(p, 'name')} — ${t('addToCart', state.lang)}`);
    });
  }

  function cartTotal() {
    // needs product price lookup; fetch all products once for cart rendering
    return state.cart.reduce((sum, item) => sum + (item.qty * (item.id === state.product?.id ? state.product.price : 0)), 0);
  }

  async function renderCart() {
    const count = state.cart.reduce((s, i) => s + i.qty, 0);
    els.cartCount.style.display = count > 0 ? 'flex' : 'none';
    els.cartCount.textContent = count;

    if (state.cart.length === 0) {
      els.cartBody.innerHTML = `<div class="empty-state">${t('cartEmpty', state.lang)}</div>`;
      els.cartFooter.style.display = 'none';
      return;
    }

    // Fetch full product list to render names/images/prices for all cart items
    const allProducts = await fetch('/api/products').then((r) => r.json());
    els.cartBody.innerHTML = state.cart
      .map((item) => {
        const product = allProducts.find((p) => p.id === item.id);
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

    const total = allProducts.reduce((sum, product) => {
      const item = state.cart.find((i) => i.id === product.id);
      return item ? sum + product.price * item.qty : sum;
    }, 0);

    els.cartBody.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.cart.find((i) => i.id === Number(btn.dataset.id));
        if (!item) return;
        item.qty += btn.dataset.act === 'plus' ? 1 : -1;
        if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== item.id);
        saveCart();
        renderCart();
      });
    });

    els.cartFooter.style.display = '';
    els.cartTotal.textContent = `${total.toFixed(2)} AZN`;
  }

  function openDrawer() {
    els.overlay.classList.add('open');
    els.cartDrawer.classList.add('open');
  }
  function closeDrawers() {
    els.overlay.classList.remove('open');
    els.cartDrawer.classList.remove('open');
  }
  els.cartBtn.addEventListener('click', openDrawer);
  document.getElementById('closeCart').addEventListener('click', closeDrawers);
  els.overlay.addEventListener('click', closeDrawers);
  document.getElementById('goToCheckout').addEventListener('click', () => {
    window.location.href = '/#menu';
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  setLang(state.lang);
  loadProduct();
  renderCart();
})();
