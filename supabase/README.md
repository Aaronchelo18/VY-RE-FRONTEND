# Supabase para VYORE

Este proyecto sigue funcionando sin backend si `supabase-config.js` esta vacio. Para que Vercel y el panel admin compartan stock, precios, colores y destacados, conecta Supabase asi:

1. En Supabase, abre o reactiva tu proyecto.
2. Ve a SQL Editor y ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/seed.sql` para cargar el catalogo inicial.
4. En Authentication > Users, crea un usuario administrador con email y clave.
5. Copia el UUID de ese usuario y ejecuta en SQL Editor:

```sql
insert into public.admin_profiles (user_id, email, role)
values ('PEGAR_UUID_DEL_USUARIO', 'tu-correo@dominio.com', 'admin')
on conflict (user_id) do update set active = true, email = excluded.email, role = excluded.role;
```

6. En Project Settings > API, copia Project URL y anon public key en `supabase-config.js`.
7. Entra a `/login` con el email y clave de Supabase. Si entras con el usuario local `admin`, el guardado seguira siendo solo local.

Las imagenes referenciales del home se mantienen como referencia estatica del modelo. Las variantes de color vendibles salen de `product_variants`.
