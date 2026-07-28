(function () {
  const state = {
    categories: [],
    products: [],
    orders: [],
    cards: [],
    editingProductId: null,
    editingCardId: null,
    existingImages: [],
    newImageFiles: [],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function showToast(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      ...options,
      headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Xəta baş verdi');
    return data;
  }

  // ===== AUTH =====
  async function checkAuth() {
    try {
      await api('/admin/auth/me');
      showApp();
    } catch {
      showLogin();
    }
  }

  function showLogin() {
    $('#loginScreen').style.display = 'flex';
    $('#adminShell').style.display = 'none';
  }

  function showApp() {
    $('#loginScreen').style.display = 'none';
    $('#adminShell').style.display = 'flex';
    loadAll();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
      });
      $('#loginError').textContent = '';
      showApp();
    } catch (err) {
      $('#loginError').textContent = err.message;
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/admin/auth/logout', { method: 'POST' });
    showLogin();
  });

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') }),
      });
      showToast('Parol yeniləndi');
      e.target.reset();
    } catch (err) {
      showToast(err.message);
    }
  });

  // ===== TABS =====
  $$('.nav-item[data-tab]').forEach((item) => {
    item.addEventListener('click', () => {
      $$('.nav-item[data-tab]').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      $$('.tab-panel').forEach((p) => (p.style.display = 'none'));
      $(`#tab-${item.dataset.tab}`).style.display = 'block';
    });
  });

  async function loadAll() {
    await Promise.all([loadCategories(), loadProducts(), loadOrders(), loadSettings(), loadCards()]);
  }

  // ===== CATEGORIES =====
  async function loadCategories() {
    state.categories = await api('/categories');
    renderCategoriesTable();
    renderCategorySelect();
  }

  function renderCategoriesTable() {
    $('#categoriesTableBody').innerHTML = state.categories
      .map(
        (c) => `<tr>
        <td>${escapeHtml(c.name_az)}</td><td>${escapeHtml(c.name_ru)}</td><td>${escapeHtml(c.name_en)}</td>
        <td><button class="small-btn btn-danger" data-del-cat="${c.id}">Sil</button></td>
      </tr>`
      )
      .join('') || '<tr><td colspan="4">Kateqoriya yoxdur</td></tr>';

    $$('[data-del-cat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu kateqoriyanı silmək istədiyinizə əminsiniz?')) return;
        try {
          await api(`/categories/${btn.dataset.delCat}`, { method: 'DELETE' });
          await loadCategories();
          showToast('Kateqoriya silindi');
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  function renderCategorySelect() {
    $('#productCategorySelect').innerHTML =
      '<option value="">— Kateqoriyasız —</option>' +
      state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name_az)}</option>`).join('');
  }

  $('#categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name_az: fd.get('name_az'), name_ru: fd.get('name_ru'), name_en: fd.get('name_en') }),
      });
      e.target.reset();
      await loadCategories();
      showToast('Kateqoriya əlavə edildi');
    } catch (err) {
      showToast(err.message);
    }
  });

  // ===== PAYMENT CARDS =====
  async function loadCards() {
    state.cards = await api('/cards/admin');
    renderCardsTable();
  }

  function renderCardsTable() {
    $('#cardsTableBody').innerHTML = state.cards
      .map(
        (c) => `<tr>
        <td>${escapeHtml(c.bank_name)}</td>
        <td style="font-family:'Courier New',monospace">${escapeHtml(c.card_number)}</td>
        <td>${escapeHtml(c.card_holder || '—')}</td>
        <td>${c.is_active ? '✅ Aktiv' : '⛔ Deaktiv'}</td>
        <td style="white-space:nowrap">
          <button class="small-btn btn-ghost" data-edit-card="${c.id}">Düzəliş</button>
          <button class="small-btn btn-danger" data-del-card="${c.id}">Sil</button>
        </td>
      </tr>`
      )
      .join('') || '<tr><td colspan="5">Hələ kart əlavə edilməyib</td></tr>';

    $$('[data-edit-card]').forEach((btn) => {
      btn.addEventListener('click', () => openCardForm(Number(btn.dataset.editCard)));
    });
    $$('[data-del-card]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu kartı silmək istədiyinizə əminsiniz?')) return;
        try {
          await api(`/cards/${btn.dataset.delCard}`, { method: 'DELETE' });
          await loadCards();
          showToast('Kart silindi');
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  const KNOWN_BANKS = Array.from($('#bankSelect').options).map((o) => o.value).filter((v) => v !== 'other');

  function openCardForm(id) {
    state.editingCardId = id || null;
    const form = $('#cardForm');
    form.reset();
    $('#bankCustomField').style.display = 'none';
    $('#cancelCardForm').style.display = id ? 'inline-flex' : 'none';
    $('#cardFormTitle').textContent = id ? 'Kartı düzəlt' : 'Yeni kart əlavə et';

    if (id) {
      const c = state.cards.find((c) => c.id === id);
      if (KNOWN_BANKS.includes(c.bank_name)) {
        $('#bankSelect').value = c.bank_name;
      } else {
        $('#bankSelect').value = 'other';
        $('#bankCustomField').style.display = 'block';
        $('#bankNameCustom').value = c.bank_name;
      }
      form.card_holder.value = c.card_holder || '';
      form.card_number.value = c.card_number;
      form.is_active.checked = !!c.is_active;
    }
  }

  $('#bankSelect').addEventListener('change', (e) => {
    $('#bankCustomField').style.display = e.target.value === 'other' ? 'block' : 'none';
  });

  $('#cancelCardForm').addEventListener('click', () => openCardForm(null));

  $('#cardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const bankName = $('#bankSelect').value === 'other' ? $('#bankNameCustom').value.trim() : $('#bankSelect').value;
    const payload = {
      bank_name: bankName,
      card_number: form.card_number.value.trim(),
      card_holder: form.card_holder.value.trim(),
      is_active: form.is_active.checked,
    };

    if (!payload.bank_name || !payload.card_number) {
      showToast('Bank adı və kart nömrəsi tələb olunur');
      return;
    }

    try {
      if (state.editingCardId) {
        await api(`/cards/${state.editingCardId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/cards', { method: 'POST', body: JSON.stringify(payload) });
      }
      openCardForm(null);
      await loadCards();
      showToast('Kart yadda saxlanıldı');
    } catch (err) {
      showToast(err.message);
    }
  });

  // ===== PRODUCTS =====
  async function loadProducts() {
    state.products = await api('/products/admin');
    renderProductsTable();
  }

  function categoryName(id) {
    const c = state.categories.find((c) => c.id === id);
    return c ? c.name_az : '—';
  }

  function renderProductsTable() {
    $('#productsTableBody').innerHTML = state.products
      .map((p) => {
        const img = p.images[0] || '';
        return `<tr>
          <td>${img ? `<img src="${img}" style="width:44px;height:44px;object-fit:cover;border-radius:8px">` : '—'}</td>
          <td>${escapeHtml(p.name_az)}</td>
          <td>${categoryName(p.category_id)}</td>
          <td>${p.price.toFixed(2)} AZN</td>
          <td>${p.is_active ? '✅ Aktiv' : '⛔ Deaktiv'}</td>
          <td style="white-space:nowrap">
            <button class="small-btn btn-ghost" data-edit-prod="${p.id}">Düzəliş</button>
            <button class="small-btn btn-danger" data-del-prod="${p.id}">Sil</button>
          </td>
        </tr>`;
      })
      .join('') || '<tr><td colspan="6">Məhsul yoxdur</td></tr>';

    $$('[data-edit-prod]').forEach((btn) => {
      btn.addEventListener('click', () => openProductForm(Number(btn.dataset.editProd)));
    });
    $$('[data-del-prod]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) return;
        try {
          await api(`/products/${btn.dataset.delProd}`, { method: 'DELETE' });
          await loadProducts();
          showToast('Məhsul silindi');
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function openProductForm(id) {
    state.editingProductId = id || null;
    state.newImageFiles = [];
    const form = $('#productForm');
    form.reset();
    $('#productFormPanel').style.display = 'block';

    if (id) {
      const p = state.products.find((p) => p.id === id);
      $('#productFormTitle').textContent = 'Məhsula düzəliş et';
      form.category_id.value = p.category_id || '';
      form.name_az.value = p.name_az; form.name_ru.value = p.name_ru; form.name_en.value = p.name_en;
      form.desc_az.value = p.desc_az; form.desc_ru.value = p.desc_ru; form.desc_en.value = p.desc_en;
      form.price.value = p.price;
      form.is_active.checked = !!p.is_active;
      state.existingImages = [...p.images];
    } else {
      $('#productFormTitle').textContent = 'Yeni məhsul';
      state.existingImages = [];
    }
    renderThumbs();
    $('#productFormPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function renderThumbs() {
    $('#existingThumbs').innerHTML = state.existingImages
      .map((url, i) => `<div class="thumb"><img src="${url}"><div class="rm" data-rm-existing="${i}">✕</div></div>`)
      .join('');
    $('#newThumbs').innerHTML = state.newImageFiles
      .map((file, i) => `<div class="thumb"><img src="${URL.createObjectURL(file)}"><div class="rm" data-rm-new="${i}">✕</div></div>`)
      .join('');

    $$('[data-rm-existing]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.existingImages.splice(Number(btn.dataset.rmExisting), 1);
        renderThumbs();
      });
    });
    $$('[data-rm-new]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.newImageFiles.splice(Number(btn.dataset.rmNew), 1);
        renderThumbs();
      });
    });
  }

  $('#productImages').addEventListener('change', (e) => {
    const totalAfter = state.existingImages.length + state.newImageFiles.length + e.target.files.length;
    if (totalAfter > 6) {
      showToast('Maksimum 6 şəkil əlavə edə bilərsiniz');
      return;
    }
    state.newImageFiles.push(...Array.from(e.target.files));
    e.target.value = '';
    renderThumbs();
  });

  $('#newProductBtn').addEventListener('click', () => openProductForm(null));
  $('#cancelProductForm').addEventListener('click', () => {
    $('#productFormPanel').style.display = 'none';
  });

  $$('.lang-tab[data-plang]').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.lang-tab[data-plang]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.plang-block').forEach((b) => (b.style.display = 'none'));
      $(`[data-plang-block="${tab.dataset.plang}"]`).style.display = 'block';
    });
  });

  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData();
    fd.append('category_id', form.category_id.value);
    fd.append('name_az', form.name_az.value);
    fd.append('name_ru', form.name_ru.value);
    fd.append('name_en', form.name_en.value);
    fd.append('desc_az', form.desc_az.value);
    fd.append('desc_ru', form.desc_ru.value);
    fd.append('desc_en', form.desc_en.value);
    fd.append('price', form.price.value);
    fd.append('is_active', form.is_active.checked);
    fd.append('keep_images', JSON.stringify(state.existingImages));
    state.newImageFiles.forEach((file) => fd.append('images', file));

    if (!form.name_az.value || !form.name_ru.value || !form.name_en.value) {
      showToast('3 dildə də ad daxil edin');
      return;
    }

    try {
      if (state.editingProductId) {
        await api(`/products/${state.editingProductId}`, { method: 'PUT', body: fd });
      } else {
        await api('/products', { method: 'POST', body: fd });
      }
      $('#productFormPanel').style.display = 'none';
      await loadProducts();
      showToast('Məhsul yadda saxlanıldı');
    } catch (err) {
      showToast(err.message);
    }
  });

  // ===== ORDERS =====
  const STATUS_OPTIONS = ['yeni', 'təsdiqləndi', 'hazırlanır', 'yoldadır', 'tamamlandı', 'ləğv edildi'];

  async function loadOrders() {
    state.orders = await api('/orders');
    renderOrdersTable();
    const newCount = state.orders.filter((o) => o.status === 'yeni').length;
    $('#ordersBadge').style.display = newCount > 0 ? 'inline-block' : 'none';
    $('#ordersBadge').textContent = newCount;
  }

  const PAYMENT_STATUS_LABELS = {
    unpaid: '⛔ Ödənilməyib',
    partial: '🟡 Çatışmır',
    paid: '✅ Tam ödənilib',
    overpaid: '🔵 Artıq ödəyib',
  };

  function paymentStatusLine(o) {
    const label = PAYMENT_STATUS_LABELS[o.payment_status] || '';
    if (o.payment_status === 'partial') return `${label}: ${o.remaining.toFixed(2)} AZN`;
    if (o.payment_status === 'overpaid') return `${label}: +${Math.abs(o.total_amount - o.paid_amount).toFixed(2)} AZN`;
    return label;
  }

  function renderOrdersTable() {
    $('#ordersTableBody').innerHTML = state.orders
      .map((o) => {
        const itemsStr = o.items.map((i) => `${escapeHtml(i.name)} x${i.qty}`).join(', ');
        const statusClass = 'status-' + o.status.replace('ləğv edildi', 'ləğv');
        return `<tr>
          <td>#${o.id}</td>
          <td>${escapeHtml(o.customer_name)}</td>
          <td>${escapeHtml(o.customer_phone)}</td>
          <td style="max-width:180px">${escapeHtml(o.customer_address)}</td>
          <td style="max-width:200px">${escapeHtml(itemsStr)}</td>
          <td>${o.total_amount.toFixed(2)} AZN</td>
          <td>${o.payment_card_bank ? escapeHtml(o.payment_card_bank) : '—'}</td>
          <td>${o.payment_last4 ? '•••• ' + escapeHtml(o.payment_last4) : ''}${o.payment_note ? '<br><small>' + escapeHtml(o.payment_note) + '</small>' : ''}</td>
          <td style="min-width:150px">
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" step="0.01" min="0" value="${o.paid_amount || 0}" data-paid-input="${o.id}" style="width:78px;padding:6px 8px;border:1.5px solid var(--line);border-radius:8px">
              <span style="font-size:0.78rem;color:var(--ink-soft)">AZN</span>
            </div>
            <div class="pay-status pay-${o.payment_status}">${paymentStatusLine(o)}</div>
          </td>
          <td>
            <select data-order-status="${o.id}" class="status-badge ${statusClass}">
              ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td>${new Date(o.created_at).toLocaleString('az-AZ')}</td>
        </tr>`;
      })
      .join('') || '<tr><td colspan="11">Hələ sifariş yoxdur</td></tr>';

    $$('[data-order-status]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/orders/${sel.dataset.orderStatus}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: sel.value }),
          });
          showToast(`Sifariş #${sel.dataset.orderStatus} yeniləndi`);
          await loadOrders();
        } catch (err) {
          showToast(err.message);
        }
      });
    });

    $$('[data-paid-input]').forEach((input) => {
      input.addEventListener('change', async () => {
        try {
          await api(`/orders/${input.dataset.paidInput}/payment`, {
            method: 'PATCH',
            body: JSON.stringify({ paid_amount: parseFloat(input.value) || 0 }),
          });
          showToast(`Sifariş #${input.dataset.paidInput} ödənişi yeniləndi`);
          await loadOrders();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  $('#refreshOrders').addEventListener('click', loadOrders);

  // ===== SETTINGS =====
  async function loadSettings() {
    const s = await api('/settings');
    const form = $('#settingsForm');
    Object.keys(s).forEach((key) => {
      if (form[key]) form[key].value = s[key] || '';
    });
    updateMapPreview();
  }

  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Ayarlar yadda saxlanıldı');
    } catch (err) {
      showToast(err.message);
    }
  });

  // Try to pull lat/lng out of a pasted Google Maps link (covers the common URL shapes;
  // shortened maps.app.goo.gl links can't be parsed client-side without following the redirect,
  // so those still need manual lat/lng entry — that's the tradeoff for not needing a Maps API key).
  function parseLatLngFromMapsUrl(url) {
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,      // .../@40.4093,49.8671,15z
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ...?q=40.4093,49.8671
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,  // ...!3d40.4093!4d49.8671 (place links)
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return { lat: m[1], lng: m[2] };
    }
    return null;
  }

  $('#locationLinkPaste').addEventListener('input', (e) => {
    const parsed = parseLatLngFromMapsUrl(e.target.value.trim());
    if (parsed) {
      $('#locationLat').value = parsed.lat;
      $('#locationLng').value = parsed.lng;
      updateMapPreview();
      showToast('Koordinatlar tapıldı ✅');
    }
  });

  ['#locationLat', '#locationLng'].forEach((sel) => {
    $(sel).addEventListener('input', updateMapPreview);
  });

  function updateMapPreview() {
    const lat = parseFloat($('#locationLat').value);
    const lng = parseFloat($('#locationLng').value);
    const preview = $('#mapPreview');
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      preview.innerHTML = `<iframe src="https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed" loading="lazy"></iframe>`;
    } else {
      preview.innerHTML = `<div class="map-preview-empty">Koordinat daxil edin — xəritə burada görünəcək</div>`;
    }
  }

  checkAuth();

  // Sadə "yatmasın" pinqi (server oyaq olanda uptime servisi kimi işləyir; əsas ping xarici servisdən olmalıdır)
  setInterval(() => {
    fetch('/health').catch(() => {});
  }, 4 * 60 * 1000);
})();
