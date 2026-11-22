
(() => {
  const $ = s => document.querySelector(s);

  const grid = $("#productGrid");
  const search = $("#searchInput");
  const category = $("#categoryFilter");
  const size = $("#sizeFilter");
  const sort = $("#sortFilter");

  let products = [];
  let db = null;

  const money = n =>
    "$" + Number(n || 0).toLocaleString("es-CL");

  const config = window.RENOVA2_CONFIG || {};
  const supabaseUrl = config.SUPABASE_URL || "";
  const supabaseKey = config.SUPABASE_ANON_KEY || "";

  const validKey =
    supabaseKey.startsWith("ey") ||
    supabaseKey.startsWith("sb_publishable_");

  const configured =
    supabaseUrl.startsWith("https://") &&
    validKey &&
    window.supabase &&
    typeof window.supabase.createClient === "function";

  if (configured) {
    try {
      db = window.supabase.createClient(
        supabaseUrl,
        supabaseKey
      );
    } catch (error) {
      console.error("Error inicializando Supabase:", error);
    }
  }

  function escapeHtml(s = "") {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function whatsappLink(p) {
    const page = location.href.split("#")[0];

    const message = `¡Hola! Me interesa esta prenda de RENOVA2 CONCÓN:
${p.name}
Precio: ${money(p.price)}
Talla: ${p.size || "Consultar"}
Foto: ${p.image_url || "Ver en el catálogo"}
${page}#producto-${p.id}
¿Sigue disponible?`;

    return `https://wa.me/56933175639?text=${encodeURIComponent(message)}`;
  }

  function fillFilters() {
    const cats = [
      ...new Set(products.map(p => p.category).filter(Boolean))
    ].sort();

    const sizes = [
      ...new Set(products.map(p => p.size).filter(Boolean))
    ].sort();

    if (category) {
      category.innerHTML =
        '<option value="">Todas las categorías</option>' +
        cats.map(x =>
          `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`
        ).join("");
    }

    if (size) {
      size.innerHTML =
        '<option value="">Todas las tallas</option>' +
        sizes.map(x =>
          `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`
        ).join("");
    }
  }

  function render() {
    if (!grid) return;

    let list = products.filter(p => p.available !== false);

    const q = search ? search.value.trim().toLowerCase() : "";
    const selectedCategory = category ? category.value : "";
    const selectedSize = size ? size.value : "";
    const selectedSort = sort ? sort.value : "";

    list = list.filter(p =>
      (!q || [
        p.name,
        p.description,
        p.category,
        p.size
      ].join(" ").toLowerCase().includes(q)) &&
      (!selectedCategory || p.category === selectedCategory) &&
      (!selectedSize || p.size === selectedSize)
    );

    if (selectedSort === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    }

    if (selectedSort === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    }

    if (selectedSort === "newest") {
      list.sort((a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
      );
    }

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state">
          Todavía no hay prendas en esta selección.<br>
          Vuelve pronto: siempre estamos renovando el catálogo. 🌿
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => `
      <article class="product-card" id="producto-${escapeHtml(p.id)}">
        <div class="product-image">
          ${
            p.image_url
              ? `<img loading="lazy" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`
              : '<div class="empty-state">RENOVA2</div>'
          }
          <span class="product-tag">PIEZA ÚNICA</span>
        </div>

        <div class="product-info">
          <span class="product-category">
            ${escapeHtml(p.category || "Prenda")}
          </span>

          <h3>${escapeHtml(p.name)}</h3>

          <div class="product-meta">
            <span>Talla: ${escapeHtml(p.size || "Consultar")}</span>
            <span>${escapeHtml(p.condition || "Buen estado")}</span>
          </div>

          <div class="product-price">
            ${money(p.price)}
          </div>

          <a
            class="whatsapp-button"
            href="${whatsappLink(p)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar por WhatsApp ↗
          </a>
        </div>
      </article>
    `).join("");
  }

  async function load() {
    if (!grid) {
      console.error("No se encontró #productGrid en index.html");
      return;
    }

    if (!db) {
      grid.innerHTML = `
        <div class="empty-state">
          El catálogo estará disponible cuando se conecte la base de datos.<br>
          Estamos preparando RENOVA2 para su lanzamiento. 🌿
        </div>
      `;

      console.error(
        "Supabase no está configurado. Revisa RENOVA2_CONFIG, la URL y la clave."
      );

      return;
    }

    grid.innerHTML = `
      <div class="empty-state">
        Cargando catálogo... 🌿
      </div>
    `;

    try {
      const { data, error } = await db
        .from("products")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error de Supabase:", error);

        grid.innerHTML = `
          <div class="empty-state">
            No pudimos cargar el catálogo.<br>
            Inténtalo nuevamente más tarde.
          </div>
        `;

        return;
      }

      products = data || [];

      fillFilters();
      render();

    } catch (error) {
      console.error("Error inesperado cargando el catálogo:", error);

      grid.innerHTML = `
        <div class="empty-state">
          Ocurrió un problema al cargar las prendas.<br>
          Inténtalo nuevamente más tarde.
        </div>
      `;
    }
  }

  [search, category, size, sort]
    .filter(Boolean)
    .forEach(el => {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

  load();
})();
