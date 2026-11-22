# RENOVA2 CONCÓN — tienda web

Tienda estática para GitHub Pages + catálogo y administración con Supabase.

## Incluye
- Diseño adaptable a celular y computador.
- Catálogo con búsqueda, filtros por categoría/talla y orden por precio/fecha.
- Botón de WhatsApp con nombre, precio, talla y enlace a la prenda.
- Enlace a Facebook.
- Panel privado en `admin.html` para crear, editar, marcar vendido, republicar y eliminar prendas.
- Fotografías guardadas en Supabase Storage.

## 1. Crear Supabase
1. Crea un proyecto en https://supabase.com/.
2. En **SQL Editor**, ejecuta todo el contenido de `schema.sql`.
3. En **Project Settings > API**, copia Project URL y la clave `anon` / `publishable`.
4. Pega esos valores en `supabase-config.js`.
5. En **Authentication > Providers > Email**, deja habilitado Email.
6. Desactiva el registro público de usuarios (Allow new users to sign up). La tienda no debe permitir que cualquiera cree una cuenta administrativa.
7. En **Authentication > Users**, crea el usuario de tu mamá con su correo y una contraseña segura. No compartas esa contraseña.

Las políticas SQL permiten administrar el catálogo a usuarios autenticados. Como el registro público debe estar desactivado, solo las cuentas que crees desde el panel de Supabase podrán iniciar sesión.

## 2. Probar localmente
Abre `index.html` para revisar el diseño. Para probar el panel y las llamadas a Supabase, es mejor servir la carpeta con un servidor local (por ejemplo, la extensión Live Server de VS Code) y configurar antes Supabase.

## 3. Publicar en GitHub Pages
1. Crea un repositorio público llamado `renova2` en GitHub.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio.
3. En el repositorio ve a **Settings > Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`, y guarda.
6. Espera a que GitHub entregue la dirección, normalmente `https://TUUSUARIO.github.io/renova2/`.

El panel quedará en `https://TUUSUARIO.github.io/renova2/admin.html`.

## 4. Importante sobre seguridad
- Nunca pegues la clave `service_role` en ningún archivo del sitio.
- La clave anon/publishable sí está pensada para estar en el navegador; RLS es lo que protege los datos.
- Desactiva los registros públicos y crea únicamente las cuentas administrativas necesarias.
- Usa una contraseña única y segura para el panel.
- El catálogo público solo muestra productos disponibles. Los vendidos quedan guardados en el panel y pueden republicarse.

## Datos del negocio configurados
- WhatsApp: +56 9 3317 5639
- Facebook: https://www.facebook.com/share/1DzpCW2sTF/

## Siguientes mejoras recomendadas
- Reemplazar el logo recortado de referencia por el archivo original del logo (mejor calidad).
- Agregar confirmación visual al marcar vendido y optimizar fotos automáticamente.
- Configurar un dominio propio cuando el negocio lo necesite.
