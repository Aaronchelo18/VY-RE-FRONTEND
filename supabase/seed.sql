-- VYORE initial catalog seed generated from productos.js.
-- Run after schema.sql.

insert into public.catalog_meta (id, updated_prices, updated_stock)
values ('catalog', '2026-08-20', null)
on conflict (id) do update set
  updated_prices = excluded.updated_prices,
  updated_stock = excluded.updated_stock,
  updated_at = now();

insert into public.products (id, slug, name, category, description, fabric, detail, sizes, price_public, price_regular, reference_image, is_featured, is_new, sort_order, active)
values
  ('suplex-amarre-hebilla', 'suplex-amarre-hebilla', 'Suplex Amarre con hebilla', 'Blusas y tops', 'Top femenino en suplex con amarre y hebilla. Doble forro hasta la mitad.', 'SUPLEX', 'Doble forro hasta la mitad.', array['S', 'M']::text[], 17.00, 17.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/suplex-amarre-hebilla.png', true, true, 0, true),
  ('olimpico-suplex', 'olimpico-suplex', 'Olímpico Suplex', 'Blusas y tops', 'Top olímpico en suplex con silueta limpia y doble forro hasta mitad.', 'SUPLEX', 'Doble forro hasta mitad.', array['S', 'M']::text[], 18.00, 18.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/olimpico-suplex.png', false, true, 1, true),
  ('suplex-lazzo-doble-forro', 'suplex-lazzo-doble-forro', 'Suplex Lazzo Doble Forro', 'Blusas y tops', 'Diseño en suplex con lazo y doble forro para mayor comodidad.', 'SUPLEX', 'Doble forro.', array['S', 'M']::text[], 18.00, 18.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/suplex-lazzo-doble-forro.png', false, true, 2, true),
  ('suplex-corset', 'suplex-corset', 'Suplex Corset', 'Blusas y tops', 'Corset en suplex con varillas, pensado para un look elegante y moderno.', 'SUPLEX CORSET CON VARILLAS', 'Corset con varillas.', array['S', 'M']::text[], 20.00, 20.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/suplex-corset.png', false, true, 3, true),
  ('suplex-doble-forro', 'suplex-doble-forro', 'Suplex Doble Forro', 'Blusas y tops', 'Básico elevado en suplex con doble forro completo.', 'SUPLEX DOBLE FORRO COMPLETO', 'Doble forro completo.', array['S', 'M']::text[], 18.00, 18.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/suplex-doble-forro.png', false, true, 4, true),
  ('blusa-suplex', 'blusa-suplex', 'Blusa Suplex', 'Blusas', 'Blusa femenina en suplex para combinaciones limpias y versátiles.', 'SUPLEX', 'Diseño versátil de uso diario.', array['S', 'M']::text[], 18.00, 18.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/blusa-suplex.png', false, true, 5, true),
  ('blusa-brodery-copa', 'blusa-brodery-copa', 'Blusa Brodery (Copa)', 'Blusas', 'Blusa en brodery con copa y espalda multiaguja.', 'BRODERY CON COPA', 'Espalda multiaguja.', array['S', 'M']::text[], 20.00, 20.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/blusa-brodery-copa.png', false, true, 6, true),
  ('blusa-suplex-amarre', 'blusa-suplex-amarre', 'Blusa Suplex Amarre', 'Blusas', 'Blusa suplex con amarre. Descripción de tela pendiente de confirmar con el PDF/fotos reales.', 'SUPLEX', 'Descripción exacta pendiente de revisión.', array['S', 'M', 'L']::text[], 19.00, 19.00, 'assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/blusa-suplex-amarre.png', false, true, 7, true)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  fabric = excluded.fabric,
  detail = excluded.detail,
  sizes = excluded.sizes,
  price_public = excluded.price_public,
  price_regular = excluded.price_regular,
  reference_image = excluded.reference_image,
  is_featured = excluded.is_featured,
  is_new = excluded.is_new,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

-- Remove stale reference-only rows that older admin builds could have stored as sellable variants.
delete from public.product_variants
where color_id in ('color-por-confirmar', 'por-confirmar')
   or color_name = 'Color por confirmar'
   or image like '%IMAGENES-REFERENCIALES%';
insert into public.product_variants (id, product_id, sku, color_id, color_name, color_hex, image, stock, status, is_featured, sort_order, active)
values
  ('suplex-amarre-hebilla-crema', 'suplex-amarre-hebilla', 'VYO-001-CRE', 'crema', 'Crema', '#E9DCC8', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-01-crema.png', 0, 'agotado', true, 0, true),
  ('suplex-amarre-hebilla-negro', 'suplex-amarre-hebilla', 'VYO-001-NEG', 'negro', 'Negro', '#171717', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-02-negro.png', null, 'consultar', true, 1, true),
  ('suplex-amarre-hebilla-rosado', 'suplex-amarre-hebilla', 'VYO-001-ROS', 'rosado', 'Rosado', '#B5828C', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-03-rosado.png', 0, 'agotado', true, 2, true),
  ('suplex-amarre-hebilla-marron', 'suplex-amarre-hebilla', 'VYO-001-MAR', 'marron', 'Marrón', '#4A352C', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-04-marron.png', null, 'consultar', true, 3, true),
  ('suplex-amarre-hebilla-celeste', 'suplex-amarre-hebilla', 'VYO-001-CEL', 'celeste', 'Celeste', '#AFC8DA', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-05-celeste.png', 0, 'agotado', true, 4, true),
  ('suplex-amarre-hebilla-verde', 'suplex-amarre-hebilla', 'VYO-001-VER', 'verde', 'Verde', '#24453C', 'assets/productos/vyore/variantes/suplex-amarre-hebilla/suplex-amarre-hebilla-06-verde.png', 0, 'agotado', true, 5, true),
  ('olimpico-suplex-marron', 'olimpico-suplex', 'VYO-002-MAR', 'marron', 'Marrón', '#50382F', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-03-marron.png', null, 'disponible', false, 0, true),
  ('olimpico-suplex-verde-oliva', 'olimpico-suplex', 'VYO-002-VOL', 'verde-oliva', 'Verde oliva', '#7D8066', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-02-verde-oliva.png', null, 'disponible', false, 1, true),
  ('olimpico-suplex-vino', 'olimpico-suplex', 'VYO-002-VIN', 'vino', 'Vino', '#682D42', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-04-vino.png', null, 'disponible', false, 2, true),
  ('olimpico-suplex-negro', 'olimpico-suplex', 'VYO-002-NEG', 'negro', 'Negro', '#111111', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-05-negro.png', null, 'disponible', false, 3, true),
  ('olimpico-suplex-marron-claro', 'olimpico-suplex', 'VYO-002-MCL', 'marron-claro', 'Marrón claro', '#B8756A', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-06-rosado.png', null, 'disponible', false, 4, true),
  ('olimpico-suplex-azul', 'olimpico-suplex', 'VYO-002-AZU', 'azul', 'Azul', '#1F4EA8', 'assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-01-azul.png', null, 'disponible', false, 5, true),
  ('suplex-lazzo-doble-forro-marron', 'suplex-lazzo-doble-forro', 'VYO-003-MAR', 'marron', 'Marrón', '#7B422A', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-01-marron.png', null, 'consultar', false, 0, true),
  ('suplex-lazzo-doble-forro-blanco', 'suplex-lazzo-doble-forro', 'VYO-003-BLA', 'blanco', 'Blanco', '#F3EFE8', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-blanco.png', null, 'consultar', false, 1, true),
  ('suplex-lazzo-doble-forro-verde', 'suplex-lazzo-doble-forro', 'VYO-003-VER', 'verde', 'Verde', '#24483F', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-03-verde.png', null, 'consultar', false, 2, true),
  ('suplex-lazzo-doble-forro-amarillo', 'suplex-lazzo-doble-forro', 'VYO-003-AMA', 'amarillo', 'Amarillo', '#F2C94C', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-04-amarillo.png', 0, 'agotado', false, 3, true),
  ('suplex-lazzo-doble-forro-celeste', 'suplex-lazzo-doble-forro', 'VYO-003-CEL', 'celeste', 'Celeste', '#B9D7F0', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-05-celeste.png', null, 'consultar', false, 4, true),
  ('suplex-lazzo-doble-forro-negro', 'suplex-lazzo-doble-forro', 'VYO-003-NEG', 'negro', 'Negro', '#171717', 'assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-negro.png', null, 'consultar', false, 5, true),
  ('suplex-corset-azul', 'suplex-corset', 'VYO-004-AZU', 'azul', 'Azul', '#1F5B98', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-01-azul.png', 0, 'agotado', false, 0, true),
  ('suplex-corset-vino', 'suplex-corset', 'VYO-004-VIN', 'vino', 'Vino', '#4D182B', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-02-vino.png', null, 'consultar', false, 1, true),
  ('suplex-corset-negro', 'suplex-corset', 'VYO-004-NEG', 'negro', 'Negro', '#111111', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-03-chocolate.png', null, 'consultar', false, 2, true),
  ('suplex-corset-verde', 'suplex-corset', 'VYO-004-VER', 'verde', 'Verde oscuro', '#244535', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-04-verde.png', null, 'consultar', false, 3, true),
  ('suplex-corset-blanco', 'suplex-corset', 'VYO-004-BLA', 'blanco', 'Blanco', '#F7F3ED', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-05-blanco.png', null, 'consultar', false, 4, true),
  ('suplex-corset-crema', 'suplex-corset', 'VYO-004-CRE', 'crema', 'Crema', '#EFE1C6', 'assets/productos/vyore/variantes/suplex-corset/suplex-corset-06-crema.png', 0, 'agotado', false, 5, true),
  ('suplex-doble-forro-vino', 'suplex-doble-forro', 'VYO-005-VIN', 'vino', 'Vino', '#4D182B', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-01-vino.png', null, 'consultar', false, 0, true),
  ('suplex-doble-forro-blanco', 'suplex-doble-forro', 'VYO-005-BLA', 'blanco', 'Blanco', '#F7F3ED', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-02-blanco.png', 0, 'agotado', false, 1, true),
  ('suplex-doble-forro-negro', 'suplex-doble-forro', 'VYO-005-NEG', 'negro', 'Negro', '#171717', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-03-negro.png', null, 'consultar', false, 2, true),
  ('suplex-doble-forro-azul-marino', 'suplex-doble-forro', 'VYO-005-AZM', 'azul-marino', 'Azul marino', '#121B43', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-04-azul-marino.png', null, 'consultar', false, 3, true),
  ('suplex-doble-forro-celeste', 'suplex-doble-forro', 'VYO-005-CEL', 'celeste', 'Celeste', '#8BA3BD', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-05-celeste.png', 0, 'agotado', false, 4, true),
  ('suplex-doble-forro-crema', 'suplex-doble-forro', 'VYO-005-CRE', 'crema', 'Crema', '#E9DCC8', 'assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-06-crema.png', null, 'consultar', false, 5, true),
  ('blusa-suplex-blanco', 'blusa-suplex', 'VYO-006-BLA', 'blanco', 'Blanco', '#F7F3ED', 'assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-01-blanco.png', null, 'disponible', false, 0, true),
  ('blusa-suplex-negro', 'blusa-suplex', 'VYO-006-NEG', 'negro', 'Negro', '#111111', 'assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-01-negro.png', null, 'disponible', false, 1, true),
  ('blusa-suplex-celeste', 'blusa-suplex', 'VYO-006-CEL', 'celeste', 'Celeste', '#B9D7E8', 'assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-02-celeste.png', null, 'disponible', false, 2, true),
  ('blusa-brodery-copa-verde', 'blusa-brodery-copa', 'VYO-007-VER', 'verde', 'Verde oscuro', '#24483F', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-01-verde.png', null, 'consultar', false, 0, true),
  ('blusa-brodery-copa-negro', 'blusa-brodery-copa', 'VYO-007-NEG', 'negro', 'Negro', '#171717', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-02-negro.png', null, 'consultar', false, 1, true),
  ('blusa-brodery-copa-rojo', 'blusa-brodery-copa', 'VYO-007-ROJ', 'rojo', 'Rojo', '#7A1726', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-03-rojo.png', 0, 'agotado', false, 2, true),
  ('blusa-brodery-copa-verde-agua', 'blusa-brodery-copa', 'VYO-007-VAG', 'verde-agua', 'Verde agua', '#D8E8D8', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-04-verde-agua.png', null, 'consultar', false, 3, true),
  ('blusa-brodery-copa-beige', 'blusa-brodery-copa', 'VYO-007-BEI', 'beige', 'Beige', '#D4BCA0', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-05-beige.png', null, 'consultar', false, 4, true),
  ('blusa-brodery-copa-rosado-claro', 'blusa-brodery-copa', 'VYO-007-RCL', 'rosado-claro', 'Rosado claro', '#E4BAC4', 'assets/productos/vyore/variantes/blusa-brodery-copa/blusa-brodery-copa-06-rosado-claro.png', 0, 'agotado', false, 5, true),
  ('blusa-suplex-amarre-azul', 'blusa-suplex-amarre', 'VYO-008-AZU', 'azul', 'Azul', '#103C9A', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-01-azul.png', null, 'consultar', false, 0, true),
  ('blusa-suplex-amarre-amarillo', 'blusa-suplex-amarre', 'VYO-008-AMA', 'amarillo', 'Amarillo', '#F3D85D', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-02-amarillo.png', null, 'consultar', false, 1, true),
  ('blusa-suplex-amarre-rosado', 'blusa-suplex-amarre', 'VYO-008-ROS', 'rosado', 'Rosado', '#C98A9B', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-03-rosado.png', null, 'consultar', false, 2, true),
  ('blusa-suplex-amarre-rojo', 'blusa-suplex-amarre', 'VYO-008-ROJ', 'rojo', 'Rojo', '#B31625', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-04-rojo.png', null, 'consultar', false, 3, true),
  ('blusa-suplex-amarre-verde', 'blusa-suplex-amarre', 'VYO-008-VER', 'verde', 'Verde', '#24483F', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-05-verde.png', null, 'consultar', false, 4, true),
  ('blusa-suplex-amarre-negro', 'blusa-suplex-amarre', 'VYO-008-NEG', 'negro', 'Negro', '#171717', 'assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-06-negro.png', null, 'consultar', false, 5, true)
on conflict (product_id, color_id) do update set
  id = excluded.id,
  product_id = excluded.product_id,
  sku = excluded.sku,
  color_id = excluded.color_id,
  color_name = excluded.color_name,
  color_hex = excluded.color_hex,
  image = excluded.image,
  stock = excluded.stock,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
