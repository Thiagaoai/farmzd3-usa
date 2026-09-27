-- Reference image a customer attaches to an order (photo for a lithophane, logo, sketch).
alter table public.farmz3d_orders add column if not exists image_path text;

-- Private bucket: files are read only by the server (service role) for the admin panel.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('farmz3d-order-images', 'farmz3d-order-images', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
