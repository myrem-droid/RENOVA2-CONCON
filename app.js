(() => {
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#productGrid");
  const search = $("#searchInput");
  const category = $("#categoryFilter");
  const size = $("#sizeFilter");
  const sort = $("#sortFilter");
  const modal = $("#productModal");
  let products = [];
  let activeProduct = null;
  let activeImageIndex = 0;
  let lastFocusedElement = null;

  const money = (value) => "$" + Number(value || 0).toLocaleString("es-CL");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const config = window.RENOVA2_CONFIG || {};
  const key = config.SUPABASE_ANON_KEY || "";
  const configured = typeof config.SUPABASE_URL === "string" && config.SUPABASE_URL.startsWith("https://") &&
    (key.startsWith("ey") || key.startsWith("sb_publishable_"));
  const db = configured && window.supabase ? window.supabase.createClient(config.SUPABASE_URL, key) : null;

  function imagesFor(product) {
    const images = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [];
    if (images.length) return images;
    return product.image_url ? [product.image_url] : [];
  }

  function whatsappLink(product) {
    const page = location.href.split("#")[0];
    const images = imagesFor(product);
    const message = `¡Hola! Me interesa esta prenda de RENOVA2 CONCÓN:\n${product.name}\nPrecio: ${money(product.price)}\nTalla: ${product.size || "Consultar"}\nFoto: ${images[0] || "Ver en el catálogo"}\n${page}#producto-${product.id}\n¿Sigue disponible?`;
    return `https://wa.me/56933175639?text=${encodeURIComponent(message)}`;
  }

  function fillFilters() {
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const sizes = [...new Set(products.map((p) => p.size).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const oldCategory = category.value;
    const oldSize = size.value;
    category.innerHTML = '<option value="">Todas las categorías</option>' + categories.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
    size.innerHTML = '<option value="">Todas las tallas</option>' + sizes.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if (categories.includes(oldCategory)) category.value = oldCategory;
    if (sizes.includes(oldSize)) size.value = oldSize;
  }

  function render() {
    let list = products.filter((p) => p.available !== false);
    const query = search.value.trim().toLocaleLowerCase("es");
    list = list.filter((p) => {
      const searchable = [p.name, p.description, p.category, p.size, p.condition].join(" ").toLocaleLowerCase("es");
      return (!query || searchable.includes(query)) && (!category.value || p.category === category.value) && (!size.value || p.size === size.value);
    });
    if (sort.value === "price-asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort.value === "price-desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort.value === "newest") list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state">Todavía no hay prendas en esta selección.<br>Vuelve pronto: siempre estamos renovando el catálogo. 🌿</div>';
      return;
    }

    grid.innerHTML = list.map((product) => {
      const images = imagesFor(product);
      const cover = images[0];
      return `<article class="product-card" id="producto-${esc(product.id)}">
        <button class="product-open" type="button" data-open-product="${esc(product.id)}" aria-label="Ver detalles de ${esc(product.name)}">
          <div class="product-image">${cover ? `<img loading="lazy" src="${esc(cover)}" alt="${esc(product.name)}">` : '<div class="empty-state">RENOVA2</div>'}
            <span class="product-tag">PIEZA ÚNICA</span>${images.length > 1 ? `<span class="photo-count">${images.length} fotos</span>` : ""}</div>
          <div class="product-info"><span class="product-category">${esc(product.category || "Prenda")}</span><h3>${esc(product.name)}</h3>
            <div class="product-meta"><span>Talla: ${esc(product.size || "Consultar")}</span><span>${esc(product.condition || "Buen estado")}</span></div>
            <div class="product-price">${money(product.price)}</div><span class="details-link">Ver detalles de la prenda ↗</span>
          </div>
        </button>
        <a class="whatsapp-button" href="${whatsappLink(product)}" target="_blank" rel="noopener">Consultar por WhatsApp ↗</a>
      </article>`;
    }).join("");
  }

  function renderModalImage() {
    if (!activeProduct) return;
    const images = imagesFor(activeProduct);
    const current = images[activeImageIndex];
    const main = $("#modalMainImage");
    main.src = current || "";
    main.alt = `${activeProduct.name} · fotografía ${activeImageIndex + 1}`;
    $("#modalImageCount").textContent = images.length > 1 ? `${activeImageIndex + 1} / ${images.length}` : "";
    $(".gallery-prev").hidden = images.length < 2;
    $(".gallery-next").hidden = images.length < 2;
    $("#modalThumbnails").innerHTML = images.length > 1 ? images.map((url, index) =>
      `<button type="button" class="modal-thumb ${index === activeImageIndex ? "active" : ""}" data-image-index="${index}" aria-label="Ver fotografía ${index + 1}" aria-pressed="${index === activeImageIndex}"><img src="${esc(url)}" alt=""></button>`
    ).join("") : "";
  }

  function openProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    activeProduct = product;
    activeImageIndex = 0;
    lastFocusedElement = document.activeElement;
    $("#modalCategory").textContent = product.category || "Prenda";
    $("#modalProductName").textContent = product.name || "Prenda RENOVA2";
    $("#modalPrice").textContent = money(product.price);
    $("#modalSize").textContent = `Talla: ${product.size || "Consultar"}`;
    $("#modalCondition").textContent = product.condition || "Buen estado";
    $("#modalDescription").textContent = product.description || "Una pieza única seleccionada para tener una segunda historia.";
    $("#modalWhatsapp").href = whatsappLink(product);
    renderModalImage();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-close").focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeProduct = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function moveImage(direction) {
    if (!activeProduct) return;
    const images = imagesFor(activeProduct);
    if (images.length < 2) return;
    activeImageIndex = (activeImageIndex + direction + images.length) % images.length;
    renderModalImage();
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-product]");
    if (button) openProduct(button.dataset.openProduct);
  });
  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) closeModal();
    if (event.target.closest(".gallery-prev")) moveImage(-1);
    if (event.target.closest(".gallery-next")) moveImage(1);
    const thumb = event.target.closest("[data-image-index]");
    if (thumb) { activeImageIndex = Number(thumb.dataset.imageIndex); renderModalImage(); }
  });
  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;
    if (event.key === "Escape") closeModal();
    if (event.key === "ArrowLeft") moveImage(-1);
    if (event.key === "ArrowRight") moveImage(1);
  });

  async function load() {
    if (!db) {
      grid.innerHTML = '<div class="empty-state">El catálogo estará disponible cuando se conecte la base de datos.<br>Estamos preparando RENOVA2 para su lanzamiento. 🌿</div>';
      return;
    }
    const { data, error } = await db.from("products").select("*").eq("available", true).order("created_at", { ascending: false });
    if (error) {
      grid.innerHTML = '<div class="empty-state">No pudimos cargar el catálogo. Inténtalo nuevamente más tarde.</div>';
      console.error(error);
      return;
    }
    products = data || [];
    fillFilters();
    render();
  }

  [search, category, size, sort].forEach((element) => element.addEventListener("input", render));
  load();
})();
