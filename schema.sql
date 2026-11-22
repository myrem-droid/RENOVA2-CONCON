-- RENOVA2 CONCÓN — ejecutar en Supabase > SQL Editor.
-- Crea catálogo, seguridad (RLS) y almacenamiento de fotos.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  category text,
  size text,
  condition text,
  description text,
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Cualquier visitante puede ver solo las prendas disponibles.
drop policy if exists "Public can read available products" on public.products;
create policy "Public can read available products"
on public.products for select
to anon, authenticated
using (available = true or auth.uid() is not null);

-- Solo usuarios autenticados pueden administrar el inventario.
drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products"
on public.products for insert to authenticated with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
on public.products for update to authenticated
using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
on public.products for delete to authenticated using (auth.uid() is not null);

-- Bucket público para mostrar imágenes en la tienda.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "Authenticated can upload product images" on storage.objects;
create policy "Authenticated can upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can update product images" on storage.objects;
create policy "Authenticated can update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can delete product images" on storage.objects;
create policy "Authenticated can delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images');
