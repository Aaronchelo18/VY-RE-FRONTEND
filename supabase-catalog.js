(function () {
  const PRODUCT_KEY = "vyore_admin_products";
  const META_KEY = "vyore_admin_meta";
  const CATALOG_META_ID = "catalog";
  let clientInstance = null;

  function config() {
    return window.VYORE_SUPABASE_CONFIG || {};
  }

  function repairText(value) {
    const text = String(value ?? "");
    if (!/[ÃÂâ]/.test(text)) return text;
    try {
      return new TextDecoder("utf-8").decode(Uint8Array.from([...text].map((char) => char.charCodeAt(0) & 0xff)));
    } catch {
      return text;
    }
  }

  function clean(value) {
    return repairText(value).trim();
  }

  function cleanPath(value) {
    return clean(value).replace(/\\/g, "/");
  }

  const REFERENCE_IMAGE_TOKEN = "IMAGENES-REFERENCIALES/";
  const PLACEHOLDER_COLOR_IDS = new Set(["color-por-confirmar", "por-confirmar"]);

  function isReferenceImagePath(value) {
    return cleanPath(value).includes(REFERENCE_IMAGE_TOKEN);
  }

  function colorSlug(value) {
    return slugify(clean(value));
  }

  function hasPlaceholderColor(...values) {
    const slugs = values.map(colorSlug).filter(Boolean);
    return !slugs.length || slugs.some((item) => PLACEHOLDER_COLOR_IDS.has(item));
  }

  function isReferenceVariantRow(variant = {}) {
    const image = variant.image || variant.imagen || variant.referenceImage || variant.mainImage || variant.modelImage;
    return isReferenceImagePath(image) || hasPlaceholderColor(variant.color_id, variant.colorId, variant.color_name, variant.colorName, variant.color, variant.nombreColor);
  }
  function isPlaceholder(value) {
    const text = clean(value).toLowerCase();
    return !text || text.includes("tu-") || text.includes("your-") || text.includes("project-url") || text.includes("anon-key");
  }

  function isConfigured() {
    const current = config();
    return Boolean(window.supabase?.createClient && !isPlaceholder(current.url) && !isPlaceholder(current.anonKey));
  }

  function client() {
    if (!isConfigured()) return null;
    if (!clientInstance) {
      const current = config();
      clientInstance = window.supabase.createClient(current.url, current.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return clientInstance;
  }

  function normalize(text) {
    const value = repairText(text);
    if (window.VyoreCatalog?.normalize) return window.VyoreCatalog.normalize(value);
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function slugify(text) {
    if (window.VyoreCatalog?.slugify) return window.VyoreCatalog.slugify(text);
    return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "producto";
  }

  function toNumber(value, fallback = 0) {
    if (window.VyoreCatalog?.toNumber) return window.VyoreCatalog.toNumber(value, fallback);
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function parseStock(value) {
    if (window.VyoreCatalog?.parseStock) return window.VyoreCatalog.parseStock(value);
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  }

  function localProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(PRODUCT_KEY) || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function localMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function dateValue(value) {
    const text = clean(value);
    return text || null;
  }

  function sortByOrderAndName(a, b) {
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  }

  function sortVariants(a, b) {
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || String(a.colorName || "").localeCompare(String(b.colorName || ""), "es");
  }

  function rowToProduct(row = {}, options = {}) {
    const includeInactive = options.includeInactive === true;
    const variants = Array.isArray(row.product_variants) ? row.product_variants : [];
    const referenceImage = cleanPath(row.reference_image || "assets/vyore/isotipo-vyore.png");
    const product = {
      id: row.id,
      slug: row.slug || row.id,
      sku: row.id,
      nombre: clean(row.name),
      modelName: clean(row.name),
      categoria: clean(row.category),
      descripcion: clean(row.description),
      tela: clean(row.fabric),
      detalle: clean(row.detail),
      tallas: Array.isArray(row.sizes) ? row.sizes : [],
      precio: toNumber(row.price_public, 0),
      precioPublico: toNumber(row.price_public, 0),
      precioAlumno: toNumber(row.price_regular, toNumber(row.price_public, 0)),
      imagen: referenceImage,
      mainImage: referenceImage,
      referenceImage,
      destacado: Boolean(row.is_featured),
      featured: Boolean(row.is_featured),
      nuevo: Boolean(row.is_new),
      newArrival: Boolean(row.is_new),
      active: row.active !== false,
      sortOrder: row.sort_order ?? 99,
      variantes: variants
        .filter((variant) => !isReferenceVariantRow(variant) && (includeInactive || variant.active !== false))
        .map((variant) => {
          const image = cleanPath(variant.image || referenceImage || "assets/vyore/isotipo-vyore.png");
          return {
            id: variant.color_id || slugify(variant.color_name || variant.sku || variant.id),
            sku: variant.sku,
            skuProductId: variant.id,
            colorId: variant.color_id || slugify(variant.color_name || variant.sku || variant.id),
            colorName: clean(variant.color_name || "Color disponible"),
            colorHex: variant.color_hex || "#817A75",
            image,
            imagen: image,
            stock: parseStock(variant.stock),
            disponibilidad: variant.status || "disponible",
            active: variant.active !== false,
            featured: Boolean(variant.is_featured),
            destacado: Boolean(variant.is_featured),
            sortOrder: variant.sort_order ?? 99,
            precioPublico: toNumber(row.price_public, 0),
            precioAlumno: toNumber(row.price_regular, toNumber(row.price_public, 0)),
            nuevo: Boolean(row.is_new),
            newArrival: Boolean(row.is_new),
          };
        })
        .sort(sortVariants),
    };
    return product;
  }
  async function loadMeta() {
    const supabaseClient = client();
    if (!supabaseClient) return localMeta();
    const { data, error } = await supabaseClient
      .from("catalog_meta")
      .select("id, updated_prices, updated_stock")
      .eq("id", CATALOG_META_ID)
      .maybeSingle();
    if (error) throw error;
    return {
      actualizadoPrecios: data?.updated_prices || null,
      actualizadoStock: data?.updated_stock || null,
    };
  }

  async function loadProducts(options = {}) {
    const supabaseClient = client();
    if (!supabaseClient) return { products: [], meta: localMeta(), source: "fallback" };
    const { data, error } = await supabaseClient
      .from("products")
      .select(`
        id,
        slug,
        name,
        category,
        description,
        fabric,
        detail,
        sizes,
        price_public,
        price_regular,
        reference_image,
        is_featured,
        is_new,
        sort_order,
        active,
        product_variants (
          id,
          sku,
          color_id,
          color_name,
          color_hex,
          image,
          stock,
          status,
          is_featured,
          sort_order,
          active
        )
      `);
    if (error) throw error;
    const includeInactive = options.includeInactive === true;
    const products = (data || [])
      .filter((row) => includeInactive || row.active !== false)
      .map((row) => rowToProduct(row, { includeInactive }))
      .filter((product) => includeInactive || product.active !== false)
      .sort(sortByOrderAndName);
    return { products, meta: await loadMeta(), source: "supabase" };
  }

  function expandRecords(records = []) {
    return records.flatMap((record) => {
      if (window.VyoreCatalog?.expandRecord) return window.VyoreCatalog.expandRecord(record);
      return [record];
    });
  }

  function productIdentity(record = {}) {
    const modelId = slugify(record.modelId || record.modelSlug || record.modelName || record.nombre || record.name || record.id || record.sku);
    const colorId = slugify(record.colorId || record.colorName || record.color || record.nombreColor || record.id || record.sku);
    return { modelId, colorId };
  }

  function statusFor(record = {}) {
    const stock = parseStock(record.stock);
    if (record.active === false || record.disponibilidad === "agotado" || stock === 0) return "agotado";
    if (record.disponibilidad === "bajo") return "bajo";
    if (record.disponibilidad === "consultar") return "consultar";
    return "disponible";
  }

  function buildPayloads(records = []) {
    const flat = expandRecords(records);
    const products = new Map();
    const variants = new Map();

    flat.forEach((record) => {
      if (!record) return;
      const explicitColor = record.colorId || record.colorName || record.color || record.nombreColor;
      if (hasPlaceholderColor(explicitColor) || isReferenceVariantRow(record)) return;

      const ids = productIdentity(record);
      const pricePublic = toNumber(record.precioPublico ?? record.precio ?? record.price, 0);
      const productId = ids.modelId;
      const existing = products.get(productId);
      const active = record.active !== false;
      const productPayload = {
        id: productId,
        slug: clean(record.modelSlug || record.slug || productId),
        name: clean(record.modelName || record.nombre || record.name || productId),
        category: clean(record.categoria || record.category || "Blusas y tops"),
        description: clean(record.descripcion || record.description || ""),
        fabric: clean(record.tela || record.fabric || ""),
        detail: clean(record.detalle || record.detail || ""),
        sizes: Array.isArray(record.tallas) ? record.tallas : Array.isArray(record.sizes) ? record.sizes : [],
        price_public: pricePublic,
        price_regular: toNumber(record.precioAlumno ?? record.precioRegular ?? record.price_regular, pricePublic),
        reference_image: cleanPath(record.referenceImage || record.modelReferenceImage || record.modelImage || record.coverImage || record.mainImage || record.imagen || record.image || "assets/vyore/isotipo-vyore.png"),
        is_featured: Boolean(record.destacado ?? record.featured),
        is_new: Boolean(record.nuevo ?? record.newArrival),
        sort_order: record.sortOrder ?? 99,
        active,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        existing.is_featured = existing.is_featured || productPayload.is_featured;
        existing.is_new = existing.is_new || productPayload.is_new;
        existing.active = existing.active || productPayload.active;
        existing.price_public = Math.min(existing.price_public, productPayload.price_public || existing.price_public);
        existing.price_regular = Math.min(existing.price_regular, productPayload.price_regular || existing.price_regular);
        if (!isReferenceImagePath(existing.reference_image) && isReferenceImagePath(productPayload.reference_image)) {
          existing.reference_image = productPayload.reference_image;
        }
      } else {
        products.set(productId, productPayload);
      }

      const variantId = `${productId}-${ids.colorId}`;
      const variantKey = `${productId}::${ids.colorId}`;
      variants.set(variantKey, {
        id: variantId,
        product_id: productId,
        sku: record.sku || (window.VyoreCatalog?.skuFor ? window.VyoreCatalog.skuFor(productId, ids.colorId) : variantId),
        color_id: ids.colorId,
        color_name: clean(record.colorName || record.color || record.nombreColor || "Color disponible"),
        color_hex: record.colorHex || record.hex || "#817A75",
        image: cleanPath(record.imagen || record.image || record.variantImage || "assets/vyore/isotipo-vyore.png"),
        stock: parseStock(record.stock),
        status: statusFor(record),
        is_featured: Boolean(record.destacado ?? record.featured),
        sort_order: record.sortOrder ?? 99,
        active,
        updated_at: new Date().toISOString(),
      });
    });

    return { products: Array.from(products.values()), variants: Array.from(variants.values()) };
  }

  async function cleanupReferenceVariants(supabaseClient) {
    const cleanupQueries = [
      supabaseClient.from("product_variants").delete().in("color_id", Array.from(PLACEHOLDER_COLOR_IDS)),
      supabaseClient.from("product_variants").delete().eq("color_name", "Color por confirmar"),
      supabaseClient.from("product_variants").delete().like("image", "%IMAGENES-REFERENCIALES%"),
    ];
    for (const query of cleanupQueries) {
      const { error } = await query;
      if (error) throw error;
    }
  }

  async function cleanupVariantKeys(supabaseClient, variants = []) {
    const keys = new Map();
    variants.forEach((variant) => {
      const productId = clean(variant.product_id);
      const colorId = colorSlug(variant.color_id);
      if (!productId || hasPlaceholderColor(colorId)) return;
      keys.set(`${productId}::${colorId}`, { productId, colorId });
    });
    for (const { productId, colorId } of keys.values()) {
      const { error } = await supabaseClient
        .from("product_variants")
        .delete()
        .eq("product_id", productId)
        .eq("color_id", colorId);
      if (error) throw error;
    }
  }
  async function saveCatalog(records = [], meta = {}) {
    const supabaseClient = client();
    if (!supabaseClient) throw new Error("Supabase no esta configurado.");
    const payloads = buildPayloads(records);
    await cleanupReferenceVariants(supabaseClient);
    await cleanupVariantKeys(supabaseClient, payloads.variants);
    if (payloads.products.length) {
      const { error } = await supabaseClient.from("products").upsert(payloads.products, { onConflict: "id" });
      if (error) throw error;
    }
    if (payloads.variants.length) {
      const { error } = await supabaseClient.from("product_variants").upsert(payloads.variants, { onConflict: "product_id,color_id" });
      if (error) throw error;
    }
    const { error: metaError } = await supabaseClient.from("catalog_meta").upsert({
      id: CATALOG_META_ID,
      updated_prices: dateValue(meta.actualizadoPrecios),
      updated_stock: dateValue(meta.actualizadoStock),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (metaError) throw metaError;
    return loadProducts();
  }
  function composeCatalog(fallbackProducts = [], localOverrides = [], meta = {}, source = "fallback") {
    const skuProducts = window.VyoreCatalog
      ? window.VyoreCatalog.mergeCatalog(fallbackProducts, localOverrides).filter((item) => item.active !== false)
      : [...fallbackProducts, ...localOverrides].filter((item) => item.active !== false);
    const products = window.VyoreCatalog ? window.VyoreCatalog.groupProducts(skuProducts) : skuProducts;
    return { baseProducts: fallbackProducts, skuProducts, products, meta, source };
  }

  async function resolveCatalog(options = {}) {
    const fallbackProducts = Array.isArray(options.fallbackProducts) ? options.fallbackProducts : [];
    const includeLocalFallback = options.useLocalFallback !== false;
    if (isConfigured()) {
      try {
        const remote = await loadProducts({ includeInactive: options.includeInactive === true });
        return composeCatalog(remote.products, [], remote.meta, "supabase");
      } catch (error) {
        console.warn("VYORE: no se pudo cargar Supabase, usando fallback local.", error);
      }
    }
    return composeCatalog(fallbackProducts, includeLocalFallback ? localProducts() : [], localMeta(), "fallback");
  }

  async function signIn(email, password) {
    const supabaseClient = client();
    if (!supabaseClient) throw new Error("Supabase no esta configurado.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const supabaseClient = client();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  window.VyoreSupabase = {
    isConfigured,
    client,
    loadProducts,
    loadMeta,
    saveCatalog,
    resolveCatalog,
    signIn,
    signOut,
  };
})();
