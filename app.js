(() => {
 const $ = s => document.querySelector(s);
 const grid = $("#productGrid"), search = $("#searchInput"), category = $("#categoryFilter"), size = $("#sizeFilter"), sort = $("#sortFilter");
 let products = [];
 const money = n => "$" + Number(n || 0).toLocaleString("es-CL");
 const configured = window.RENOVA2_CONFIG && window.RENOVA2_CONFIG.SUPABASE_URL.startsWith("https://") && window.RENOVA2_CONFIG.SUPABASE_ANON_KEY.startsWith("ey");
 let db = configured && window.supabase ? window.supabase.createClient(window.RENOVA2_CONFIG.SUPABASE_URL, window.RENOVA2_CONFIG.SUPABASE_ANON_KEY) : null;
 function whatsappLink(p) {
   const page = location.href.split("#")[0];
   const message = `¡Hola! Me interesa esta prenda de RENOVA2 CONCÓN:\n${p.name}\nPrecio: ${money(p.price)}\nTalla: ${p.size || "Consultar"}\nFoto: ${p.image_url || "Ver en el catálogo"}\n${page}#producto-${p.id}\n¿Sigue disponible?`;
   return `https://wa.me/56933175639?text=${encodeURIComponent(message)}`;
 }
 function fillFilters() {
   const cats = [...new Set(products.map(p=>p.category).filter(Boolean))].sort();
   const sizes = [...new Set(products.map(p=>p.size).filter(Boolean))].sort();
   category.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
   size.innerHTML = '<option value="">Todas las tallas</option>' + sizes.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
 }
 function escapeHtml(s="") { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
 function render() {
   let list = products.filter(p => p.available !== false);
   const q = search.value.trim().toLowerCase();
   list = list.filter(p => (!q || [p.name,p.description,p.category,p.size].join(" ").toLowerCase().includes(q)) && (!category.value || p.category===category.value) && (!size.value || p.size===size.value));
   if(sort.value==="price-asc") list.sort((a,b)=>a.price-b.price);
   if(sort.value==="price-desc") list.sort((a,b)=>b.price-a.price);
   if(sort.value==="newest") list.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
   if(!list.length){grid.innerHTML='<div class="empty-state">Todavía no hay prendas en esta selección.<br>Vuelve pronto: siempre estamos renovando el catálogo. 🌿</div>';return;}
   grid.innerHTML = list.map(p=>`<article class="product-card" id="producto-${p.id}">
    <div class="product-image">${p.image_url?`<img loading="lazy" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`:'<div class="empty-state">RENOVA2</div>'}<span class="product-tag">PIEZA ÚNICA</span></div>
    <div class="product-info"><span class="product-category">${escapeHtml(p.category||"Prenda")}</span><h3>${escapeHtml(p.name)}</h3>
    <div class="product-meta"><span>Talla: ${escapeHtml(p.size||"Consultar")}</span><span>${escapeHtml(p.condition||"Buen estado")}</span></div>
    <div class="product-price">${money(p.price)}</div><a class="whatsapp-button" href="${whatsappLink(p)}" target="_blank" rel="noopener">Consultar por WhatsApp ↗</a></div></article>`).join("");
 }
 async function load() {
   if(!db){grid.innerHTML='<div class="empty-state">El catálogo estará disponible cuando se conecte la base de datos.<br>Estamos preparando RENOVA2 para su lanzamiento. 🌿</div>';return;}
   const {data,error}=await db.from("products").select("*").eq("available",true).order("created_at",{ascending:false});
   if(error){grid.innerHTML='<div class="empty-state">No pudimos cargar el catálogo. Inténtalo nuevamente más tarde.</div>';console.error(error);return;}
   products=data||[];fillFilters();render();
 }
 [search,category,size,sort].forEach(el=>el.addEventListener("input",render));
 load();
})();