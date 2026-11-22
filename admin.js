
(() => {
 const $ = s => document.querySelector(s);
 const config = window.RENOVA2_CONFIG || {};

 const key = config.SUPABASE_ANON_KEY || "";
 const configured =
  config.SUPABASE_URL?.startsWith("https://") &&
  (key.startsWith("ey") || key.startsWith("sb_publishable_"));

 const db = configured && window.supabase
  ? window.supabase.createClient(
     config.SUPABASE_URL,
     config.SUPABASE_ANON_KEY
    )
  : null;

 const login = $("#loginPanel");
 const dash = $("#dashboard");
 const notice = $("#setupNotice");
 const form = $("#productForm");

 let editingImage = null;

 if (!db) {
  notice.hidden = false;
  return;
 }

 const esc = s => String(s || "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
 }[c]));

 async function session() {
  const { data, error } = await db.auth.getSession();

  if (error) {
   console.error("Error de sesión:", error);
  }

  show(!!data?.session);

  if (data?.session) {
   await loadProducts();
  }
 }

 function show(on) {
  login.hidden = on;
  dash.hidden = !on;
 }

 // INICIO DE SESIÓN
 $("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const button = $("#loginForm").querySelector('button[type="submit"]');

  $("#loginError").textContent = "";
  button.disabled = true;
  button.textContent = "Ingresando…";

  try {
   const { error } = await db.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value
   });

   if (error) {
    $("#loginError").textContent =
     "No se pudo ingresar: " + error.message;
   } else {
    await session();
   }
  } catch (err) {
   $("#loginError").textContent =
    "Error de conexión: " +
    (err.message || "Inténtalo nuevamente.");
  } finally {
   button.disabled = false;
   button.textContent = "Ingresar";
  }
 });

 // CERRAR SESIÓN
 $("#logoutBtn").onclick = async () => {
  await db.auth.signOut();
  show(false);
 };

 // RESTABLECER FORMULARIO
 function resetForm() {
  form.reset();
  $("#productId").value = "";
  editingImage = null;

  $("#formTitle").textContent = "Agregar prenda";
  $("#saveBtn").textContent = "Publicar prenda";
  $("#cancelEdit").hidden = true;
  $("#formMessage").textContent = "";
 }

 $("#cancelEdit").onclick = resetForm;

 // CARGAR INVENTARIO
 async function loadProducts() {
  const inventory = $("#inventoryList");

  inventory.innerHTML =
   '<p class="hint">Cargando inventario…</p>';

  try {
   const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

   if (error) {
    console.error("Error al cargar inventario:", error);

    const details = [
     error.message,
     error.code ? "Código: " + error.code : "",
     error.details ? "Detalles: " + error.details : "",
     error.hint ? "Sugerencia: " + error.hint : ""
    ].filter(Boolean).join(" | ");

    inventory.innerHTML = `
     <p class="error">
      Error de Supabase: ${esc(details)}
     </p>
    `;

    return;
   }

   const products = data || [];

   $("#productCount").textContent = products.length;

   inventory.innerHTML = products.length
    ? products.map(p => `
       <article class="inventory-item">
        <img
         src="${esc(p.image_url || "logo-renova2.jpg")}"
         alt=""
        >

        <div>
         <h3>${esc(p.name)}</h3>
         <p>
          $${Number(p.price).toLocaleString("es-CL")}
          · ${esc(p.size || "Sin talla")}
          · ${p.available ? "Disponible" : "Vendido"}
         </p>
        </div>

        <div class="item-actions">
         <button data-edit="${esc(p.id)}">
          Editar
         </button>

         ${
          p.available
           ? `<button class="sold" data-sold="${esc(p.id)}">Marcar vendido</button>`
           : `<button data-restore="${esc(p.id)}">Volver a publicar</button>`
         }

         <button data-delete="${esc(p.id)}">
          Eliminar
         </button>
        </div>
       </article>
      `).join("")
    : '<p class="hint">Aún no hay prendas. ¡Agrega la primera!</p>';

  } catch (err) {
   console.error("Error inesperado:", err);

   inventory.innerHTML = `
    <p class="error">
     Error inesperado: ${esc(err.message || "No se pudo cargar el inventario.")}
    </p>
   `;
  }
 }

 // SUBIR IMÁGENES
 async function upload(file) {
  if (!file) return editingImage;

  if (file.size > 5 * 1024 * 1024) {
   throw new Error("La imagen supera los 5 MB.");
  }

  if (!file.type.startsWith("image/")) {
   throw new Error("El archivo debe ser una imagen.");
  }

  const ext = (file.name.split(".").pop() || "jpg")
   .toLowerCase()
   .replace(/[^a-z0-9]/g, "");

  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage
   .from("product-images")
   .upload(path, file, {
    upsert: false,
    contentType: file.type
   });

  if (error) throw error;

  const { data } = db.storage
   .from("product-images")
   .getPublicUrl(path);

  return data.publicUrl;
 }

 // CREAR Y EDITAR PRENDAS
 form.addEventListener("submit", async e => {
  e.preventDefault();

  $("#formMessage").textContent = "Guardando…";
  $("#saveBtn").disabled = true;

  try {
   const id = $("#productId").value;
   const image = await upload($("#pImage").files[0]);

   const row = {
    name: $("#pName").value.trim(),
    price: Number($("#pPrice").value),
    size: $("#pSize").value.trim(),
    category: $("#pCategory").value.trim(),
    condition: $("#pCondition").value.trim(),
    description: $("#pDescription").value.trim(),
    image_url: image
   };

   const result = id
    ? await db.from("products").update(row).eq("id", id)
    : await db.from("products").insert({
       ...row,
       available: true
      });

   if (result.error) throw result.error;

   $("#formMessage").textContent =
    "Prenda guardada correctamente.";

   resetForm();
   await loadProducts();

  } catch (err) {
   $("#formMessage").textContent =
    "Error: " + (err.message || "No se pudo guardar.");

  } finally {
   $("#saveBtn").disabled = false;
  }
 });

 // ACCIONES DEL INVENTARIO
 $("#inventoryList").addEventListener("click", async e => {
  const b = e.target.closest("button");

  if (!b) return;

  const id =
   b.dataset.edit ||
   b.dataset.sold ||
   b.dataset.restore ||
   b.dataset.delete;

  if (!id) return;

  // EDITAR
  if (b.dataset.edit) {
   const { data, error } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

   if (error) {
    return alert(
     "No se pudo abrir la prenda: " + error.message
    );
   }

   $("#productId").value = data.id;
   $("#pName").value = data.name;
   $("#pPrice").value = data.price;
   $("#pSize").value = data.size || "";
   $("#pCategory").value = data.category || "";
   $("#pCondition").value = data.condition || "";
   $("#pDescription").value = data.description || "";

   editingImage = data.image_url;

   $("#formTitle").textContent = "Editar prenda";
   $("#saveBtn").textContent = "Guardar cambios";
   $("#cancelEdit").hidden = false;

   window.scrollTo({
    top: 0,
    behavior: "smooth"
   });

   return;
  }

  // ELIMINAR
  if (
   b.dataset.delete &&
   !confirm("¿Eliminar esta prenda definitivamente?")
  ) {
   return;
  }

  // MARCAR COMO VENDIDO O REPUBLICAR
  const patch = b.dataset.sold
   ? { available: false }
   : b.dataset.restore
    ? { available: true }
    : null;

  const result = patch
   ? await db.from("products").update(patch).eq("id", id)
   : await db.from("products").delete().eq("id", id);

  if (result.error) {
   alert("No se pudo actualizar: " + result.error.message);
  } else {
   await loadProducts();
  }
 });

 // DETECTAR CAMBIOS DE AUTENTICACIÓN
 db.auth.onAuthStateChange((_event, currentSession) => {
  show(!!currentSession);

  if (currentSession) {
   loadProducts();
  }
 });

 // INICIAR
 session();

})();
