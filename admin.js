(() => {
  const $ = (selector) => document.querySelector(selector);
  const config = window.RENOVA2_CONFIG || {};
  const key = config.SUPABASE_ANON_KEY || "";
  const configured = typeof config.SUPABASE_URL === "string" &&
    config.SUPABASE_URL.startsWith("https://") &&
    (key.startsWith("ey") || key.startsWith("sb_publishable_"));
  const db = configured && window.supabase
    ? window.supabase.createClient(config.SUPABASE_URL, key)
    : null;

  const login = $("#loginPanel");
  const dashboard = $("#dashboard");
  const notice = $("#setupNotice");
  const form = $("#productForm");
  const imageInput = $("#pImages");
  const imagePreview = $("#imagePreview");

  let products = [];
  let retainedImages = [];
  let loading = false;

  if (!db) {
    notice.hidden = false;
    login.hidden = true;
    return;
  }

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const money = (value) => "$" + Number(value || 0).toLocaleString("es-CL");

  function productImages(product) {
    const modern = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [];
    if (modern.length) return modern;
    return product.image_url ? [product.image_url] : [];
  }

  function show(isLoggedIn) {
    login.hidden = isLoggedIn;
    dashboard.hidden = !isLoggedIn;
  }

  async function getSession() {
    const { data, error } = await db.auth.getSession();
    if (error) console.error("Error obteniendo sesión:", error);
    show(!!data?.session);
    if (data?.session) await loadProducts();
  }

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#loginForm").querySelector('button[type="submit"]');
    $("#loginError").textContent = "";
    button.disabled = true;
    button.textContent = "Ingresando…";
    try {
      const { error } = await db.auth.signInWithPassword({
        email: $("#email").value.trim(), password: $("#password").value
      });
      if (error) $("#loginError").textContent = "No se pudo ingresar: " + error.message;
      else await getSession();
    } catch (error) {
      $("#loginError").textContent = "Error de conexión: " + (error.message || "Inténtalo nuevamente.");
    } finally {
      button.disabled = false;
      button.textContent = "Ingresar";
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();
    if (error) alert("No se pudo cerrar sesión: " + error.message);
    else show(false);
  });

  function updateStats() {
    const total = products.length;
    const available = products.filter((product) => product.available).length;
    $("#statTotal").textContent = total;
    $("#statAvailable").textContent = available;
    $("#statSold").textContent = total - available;
  }

  function updateCategoryOptions() {
    const select = $("#categoryFilter");
    const selected = select.value;
    const categories = [...new Set(products.map((p) => (p.category || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
    select.innerHTML = '<option value="">Todas las categorías</option>' +
      categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
    if (categories.includes(selected)) select.value = selected;
  }

  function getFilteredProducts() {
    const query = $("#inventorySearch").value.trim().toLocaleLowerCase("es");
    const category = $("#categoryFilter").value;
    const status = $("#statusFilter").value;
    return products.filter((product) => {
      const searchable = [product.name, product.category, product.size, product.condition, product.description]
        .join(" ").toLocaleLowerCase("es");
      return (!query || searchable.includes(query)) &&
        (!category || (product.category || "").trim() === category) &&
        (status === "all" || (status === "available" && product.available) || (status === "sold" && !product.available));
    });
  }

  function renderInventory() {
    const filtered = getFilteredProducts();
    const status = $("#statusFilter").value;
    $("#productCount").textContent = `${filtered.length} / ${products.length}`;
    const titles = { all: "Todas las prendas", available: "Prendas disponibles", sold: "Historial de prendas vendidas" };
    $("#inventoryTitle").textContent = titles[status] || titles.all;
    if (!filtered.length) {
      $("#inventoryList").innerHTML = '<p class="empty-state">No se encontraron prendas con esos filtros.</p>';
      return;
    }
    $("#inventoryList").innerHTML = filtered.map((product) => {
      const isAvailable = !!product.available;
      const images = productImages(product);
      const image = esc(images[0] || "logo-renova2.jpg");
      const category = product.category ? ` · ${esc(product.category)}` : "";
      return `<article class="inventory-item">
        <img src="${image}" alt="" loading="lazy">
        <div><h3>${esc(product.name)}</h3><p>${money(product.price)} · ${esc(product.size || "Sin talla")}${category}</p>
          <p>${images.length} ${images.length === 1 ? "fotografía" : "fotografías"}</p>
          <span class="item-status ${isAvailable ? "" : "sold-status"}">${isAvailable ? "Disponible" : "Vendida"}</span></div>
        <div class="item-actions"><button type="button" data-edit="${esc(product.id)}">Editar</button>
          ${isAvailable ? `<button type="button" class="sold" data-sold="${esc(product.id)}">Marcar vendida</button>` : `<button type="button" data-restore="${esc(product.id)}">Reactivar</button>`}
          <button type="button" data-delete="${esc(product.id)}">Eliminar</button></div>
      </article>`;
    }).join("");
  }

  async function loadProducts() {
    if (loading) return;
    loading = true;
    $("#inventoryList").innerHTML = '<p class="hint">Cargando inventario…</p>';
    try {
      const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      products = data || [];
      updateStats();
      updateCategoryOptions();
      renderInventory();
    } catch (error) {
      console.error("Error cargando productos:", error);
      $("#inventoryList").innerHTML = `<p class="error">Error de Supabase: ${esc(error.message)} | Código: ${esc(error.code || "No disponible")}</p>`;
    } finally {
      loading = false;
    }
  }

  async function uploadImage(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`La imagen "${file.name}" supera los 5 MB.`);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error(`"${file.name}" no es JPG, PNG o WEBP.`);
    }
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from("product-images").upload(path, file, {
      upsert: false, contentType: file.type
    });
    if (error) throw error;
    return db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  function renderImagePreview(newFiles = []) {
    const old = retainedImages.map((url, index) => `
      <div class="admin-preview-item"><img src="${esc(url)}" alt="Foto actual ${index + 1}">
      <button type="button" data-remove-existing="${index}" aria-label="Quitar foto actual ${index + 1}">×</button><small>Actual</small></div>`).join("");
    const fresh = newFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      return `<div class="admin-preview-item"><img src="${url}" alt="Nueva foto ${index + 1}">
        <button type="button" data-remove-new="${index}" aria-label="Quitar nueva foto ${index + 1}">×</button><small>Nueva</small></div>`;
    }).join("");
    imagePreview.innerHTML = old + fresh || '<p class="hint">Aún no has seleccionado fotografías.</p>';
  }

  function selectedFiles() { return Array.from(imageInput.files || []); }
  function setSelectedFiles(files) {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    imageInput.files = transfer.files;
    renderImagePreview(files);
  }

  imageInput.addEventListener("change", () => {
    const files = selectedFiles();
    if (retainedImages.length + files.length > 8) {
      alert("Puedes tener un máximo de 8 fotografías por prenda.");
      setSelectedFiles(files.slice(0, Math.max(0, 8 - retainedImages.length)));
      return;
    }
    renderImagePreview(files);
  });

  imagePreview.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.removeExisting !== undefined) {
      retainedImages.splice(Number(button.dataset.removeExisting), 1);
      renderImagePreview(selectedFiles());
    }
    if (button.dataset.removeNew !== undefined) {
      const files = selectedFiles();
      files.splice(Number(button.dataset.removeNew), 1);
      setSelectedFiles(files);
    }
  });

  function resetForm() {
    form.reset();
    $("#productId").value = "";
    retainedImages = [];
    imagePreview.innerHTML = "";
    $("#formTitle").textContent = "Agregar prenda";
    $("#saveBtn").textContent = "Publicar prenda";
    $("#cancelEdit").hidden = true;
    $("#formMessage").textContent = "";
  }
  $("#cancelEdit").addEventListener("click", resetForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = $("#saveBtn");
    const message = $("#formMessage");
    const files = selectedFiles();
    if (retainedImages.length + files.length > 8) {
      message.textContent = "Puedes guardar un máximo de 8 fotografías por prenda.";
      return;
    }
    saveButton.disabled = true;
    message.textContent = "Guardando prenda y fotografías…";
    try {
      const uploadedImages = [];
      for (const file of files) uploadedImages.push(await uploadImage(file));
      const allImages = [...retainedImages, ...uploadedImages];
      const row = {
        name: $("#pName").value.trim(),
        price: Number($("#pPrice").value),
        size: $("#pSize").value.trim(),
        category: $("#pCategory").value.trim(),
        condition: $("#pCondition").value.trim(),
        description: $("#pDescription").value.trim(),
        image_urls: allImages,
        image_url: allImages[0] || null
      };
      const id = $("#productId").value;
      const result = id
        ? await db.from("products").update(row).eq("id", id)
        : await db.from("products").insert({ ...row, available: true });
      if (result.error) throw result.error;
      message.textContent = "Prenda guardada correctamente.";
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error("Error guardando prenda:", error);
      message.textContent = "Error: " + (error.message || "No se pudo guardar.");
    } finally {
      saveButton.disabled = false;
    }
  });

  async function editProduct(id) {
    const { data, error } = await db.from("products").select("*").eq("id", id).single();
    if (error) { alert("No se pudo abrir la prenda: " + error.message); return; }
    $("#productId").value = data.id;
    $("#pName").value = data.name || "";
    $("#pPrice").value = data.price ?? "";
    $("#pSize").value = data.size || "";
    $("#pCategory").value = data.category || "";
    $("#pCondition").value = data.condition || "";
    $("#pDescription").value = data.description || "";
    imageInput.value = "";
    retainedImages = productImages(data);
    renderImagePreview([]);
    $("#formTitle").textContent = "Editar prenda";
    $("#saveBtn").textContent = "Guardar cambios";
    $("#cancelEdit").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeAvailability(id, available) {
    const { error } = await db.from("products").update({ available }).eq("id", id);
    if (error) { alert("No se pudo actualizar la prenda: " + error.message); return; }
    await loadProducts();
  }

  async function deleteProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!confirm(`¿Eliminar definitivamente "${product?.name || "esta prenda"}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { alert("No se pudo eliminar la prenda: " + error.message); return; }
    await loadProducts();
  }

  $("#inventoryList").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.edit || button.dataset.sold || button.dataset.restore || button.dataset.delete;
    if (!id) return;
    button.disabled = true;
    try {
      if (button.dataset.edit) await editProduct(id);
      else if (button.dataset.sold) await changeAvailability(id, false);
      else if (button.dataset.restore) await changeAvailability(id, true);
      else if (button.dataset.delete) await deleteProduct(id);
    } finally { button.disabled = false; }
  });

  $("#inventorySearch").addEventListener("input", renderInventory);
  $("#categoryFilter").addEventListener("change", renderInventory);
  $("#statusFilter").addEventListener("change", renderInventory);
  $("#clearFilters").addEventListener("click", () => {
    $("#inventorySearch").value = "";
    $("#categoryFilter").value = "";
    $("#statusFilter").value = "all";
    renderInventory();
  });

  db.auth.onAuthStateChange((_event, session) => {
    show(!!session);
    if (session) loadProducts();
    else { products = []; show(false); }
  });
  getSession();
})();
