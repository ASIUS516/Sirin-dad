(function () {
  const state = {
    categories: [],
    products: [],
    orders: [],
    editingProductId: null,
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
    await Promise.all([loadCategories(), loadProducts(), loadOrders(), loadSettings()]);
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
          <td>${o.payment_last4 ? '•••• ' + escapeHtml(o.payment_last4) : ''}${o.payment_note ? '<br><small>' + escapeHtml(o.payment_note) + '</small>' : ''}</td>
          <td>
            <select data-order-status="${o.id}" class="status-badge ${statusClass}">
              ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td>${new Date(o.created_at).toLocaleString('az-AZ')}</td>
        </tr>`;
      })
      .join('') || '<tr><td colspan="9">Hələ sifariş yoxdur</td></tr>';

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
  }

  $('#refreshOrders').addEventListener('click', loadOrders);

  // ===== SETTINGS =====
  async function loadSettings() {
    const s = await api('/settings');
    const form = $('#settingsForm');
    Object.keys(s).forEach((key) => {
      if (form[key]) form[key].value = s[key] || '';
    });
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

  checkAuth();

  // Sadə "yatmasın" pinqi (server oyaq olanda uptime servisi kimi işləyir; əsas ping xarici servisdən olmalıdır)
  setInterval(() => {
    fetch('/health').catch(() => {});
  }, 4 * 60 * 1000);
})();
