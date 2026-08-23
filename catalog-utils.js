(function () {
  const FALLBACK_IMAGE = "assets/vyore/isotipo-vyore.png";
  const SKU_CART_PREFIX = "sku::";
  const COLOR_CODES = {
    amarillo: "AMA",
    azul: "AZU",
    "azul-marino": "AZM",
    beige: "BEI",
    blanco: "BLA",
    celeste: "CEL",
    chocolate: "CHO",
    crema: "CRE",
    marron: "MAR",
    negro: "NEG",
    rojo: "ROJ",
    rosado: "ROS",
    "rosado-claro": "RCL",
    verde: "VER",
    "verde-agua": "VAG",
    "verde-oliva": "VOL",
    vino: "VIN",
    "color-por-confirmar": "COL",
  };

  const SPECIAL_VARIANTS = {
    "olimpico-suplex": [
      { id: "marron", colorName: "Marrón", colorHex: "#50382F", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-03-marron.png" },
      { id: "verde-oliva", colorName: "Verde oliva", colorHex: "#7D8066", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-02-verde-oliva.png" },
      { id: "vino", colorName: "Vino", colorHex: "#682D42", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-04-vino.png" },
      { id: "negro", colorName: "Negro", colorHex: "#111111", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-05-negro.png" },
      { id: "rosado", colorName: "Rosado", colorHex: "#B8756A", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-06-rosado.png" },
      { id: "azul", colorName: "Azul", colorHex: "#1F4EA8", image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-01-azul.png" },
    ],
    "suplex-corset": [
      { id: "azul", colorName: "Azul", colorHex: "#1F5B98", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-01-azul.png" },
      { id: "vino", colorName: "Vino", colorHex: "#4D182B", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-02-vino.png" },
      { id: "chocolate", colorName: "Chocolate", colorHex: "#4F372C", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-03-chocolate.png" },
      { id: "verde", colorName: "Verde oscuro", colorHex: "#244535", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-04-verde.png" },
      { id: "blanco", colorName: "Blanco", colorHex: "#F7F3ED", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-05-blanco.png", aliases: ["marron"] },
      { id: "crema", colorName: "Crema", colorHex: "#EFE1C6", image: "assets/productos/vyore/variantes/suplex-corset/suplex-corset-06-crema.png" },
    ],
    "suplex-doble-forro": [
      { id: "vino", colorName: "Vino", colorHex: "#4D182B", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-01-vino.png" },
      { id: "blanco", colorName: "Blanco", colorHex: "#F7F3ED", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-02-blanco.png", aliases: ["rosado"] },
      { id: "negro", colorName: "Negro", colorHex: "#171717", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-03-negro.png", aliases: ["chocolate"] },
      { id: "azul-marino", colorName: "Azul marino", colorHex: "#121B43", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-04-azul-marino.png" },
      { id: "celeste", colorName: "Celeste", colorHex: "#8BA3BD", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-05-celeste.png" },
      { id: "crema", colorName: "Crema", colorHex: "#E9DCC8", image: "assets/productos/vyore/variantes/suplex-doble-forro/suplex-doble-forro-06-crema.png" },
    ],
    "suplex-lazzo-doble-forro": [
      { id: "marron", colorName: "Marrón", colorHex: "#7B422A", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-01-marron.png" },
      { id: "blanco", colorName: "Blanco", colorHex: "#F3EFE8", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-blanco.png" },
      { id: "verde", colorName: "Verde", colorHex: "#24483F", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-03-verde.png" },
      { id: "amarillo", colorName: "Amarillo", colorHex: "#F2C94C", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-04-amarillo.png", aliases: ["crema"] },
      { id: "celeste", colorName: "Celeste", colorHex: "#B9D7F0", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-05-celeste.png", aliases: ["azul"] },
      { id: "negro", colorName: "Negro", colorHex: "#171717", image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-negro.png" },
    ],
  };

  const SPECIAL_MAIN_IMAGES = {
    "olimpico-suplex": "assets/productos/vyore/olimpico-suplex.png",
  };

  function normalize(text) {
    return String(text ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function slugify(text) {
    return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "producto";
  }

  function titleFromSlug(value) {
    return String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function parseStock(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  }

  function cleanPath(value, fallback = FALLBACK_IMAGE) {
    const path = String(value || "").trim().replace(/\\/g, "/");
    return path || fallback;
  }

  function colorCode(colorId, colorName) {
    const id = slugify(colorId || colorName || "color");
    return COLOR_CODES[id] || id.slice(0, 3).toUpperCase().padEnd(3, "X");
  }

  function skuBase(value, fallback) {
    const raw = String(value || fallback || "SKU").trim().toUpperCase();
    return raw.replace(/-[A-Z]{3}$/, "");
  }

  function skuFor(baseSku, colorId, colorName) {
    const code = colorCode(colorId, colorName);
    const base = skuBase(baseSku, colorId || colorName);
    return base.endsWith(`-${code}`) ? base : `${base}-${code}`;
  }

  function stripColorSuffix(name, colorName) {
    const rawName = String(name || "").trim();
    const rawColor = String(colorName || "").trim();
    if (!rawName || !rawColor) return rawName;
    const suffix = ` - ${rawColor}`;
    return rawName.toLowerCase().endsWith(suffix.toLowerCase()) ? rawName.slice(0, -suffix.length).trim() : rawName;
  }

  function isSpecialModel(value, image = "") {
    const id = slugify(value);
    if (SPECIAL_VARIANTS[id]) return id;
    const normalizedImage = cleanPath(image, "");
    return Object.keys(SPECIAL_VARIANTS).find((modelId) => normalizedImage.includes(modelId)) || id;
  }

  function findCanonicalVariant(modelId, colorId, colorName, image) {
    const variants = SPECIAL_VARIANTS[modelId] || [];
    const id = slugify(colorId || colorName);
    const imagePath = cleanPath(image, "");
    return variants.find((variant) => {
      const ids = [variant.id, ...(variant.aliases || [])].map(slugify);
      return ids.includes(id) || ids.some((alias) => imagePath.includes(`-${alias}.`) || imagePath.includes(`-${alias}-`));
    }) || null;
  }

  function findStoredVariant(canonical, variants) {
    const ids = [canonical.id, ...(canonical.aliases || [])].map(slugify);
    return variants.find((variant) => {
      const id = slugify(variant.id || variant.colorName || variant.nombre);
      const image = cleanPath(variant.image || variant.imagen, "");
      return ids.includes(id) || ids.some((alias) => image.includes(`-${alias}.`) || image.includes(`-${alias}-`));
    });
  }

  function normalizeVariant(variant = {}, product = {}) {
    const colorName = variant.colorName || variant.nombre || variant.color || "Color disponible";
    const id = slugify(variant.id || colorName);
    const image = cleanPath(variant.image || variant.imagen || product.mainImage || product.imagen);
    const stock = parseStock(variant.stock);
    return {
      id,
      colorId: id,
      colorName,
      colorHex: variant.colorHex || variant.hex || "#817A75",
      image,
      imagen: image,
      stock,
      active: variant.active !== false,
      pending: Boolean(variant.pending || variant.stock === null || variant.stock === undefined || variant.stock === ""),
    };
  }

  function migrateModelProduct(product = {}) {
    const copy = { ...product };
    const variants = Array.isArray(copy.variantes) ? copy.variantes : Array.isArray(copy.variants) ? copy.variants : null;
    if (!variants) return copy;

    const rawModelId = copy.modelId || copy.id || copy.slug || copy.nombre || copy.sku;
    const modelId = isSpecialModel(rawModelId, copy.imagen || copy.mainImage || copy.image);
    if (!SPECIAL_VARIANTS[modelId]) return copy;

    if (SPECIAL_MAIN_IMAGES[modelId]) {
      copy.imagen = SPECIAL_MAIN_IMAGES[modelId];
      copy.mainImage = SPECIAL_MAIN_IMAGES[modelId];
    }

    copy.variantes = SPECIAL_VARIANTS[modelId].map((canonical) => {
      const stored = findStoredVariant(canonical, variants) || {};
      const stock = Object.prototype.hasOwnProperty.call(stored, "stock") ? parseStock(stored.stock) : parseStock(canonical.stock);
      return {
        ...canonical,
        stock,
        active: stored.active !== false,
        pending: Boolean(stored.pending || stored.stock === null || stored.stock === undefined || stored.stock === ""),
      };
    });
    return copy;
  }

  function migrateFlatSku(product = {}) {
    const copy = { ...product };
    const rawModelId = copy.modelId || copy.parentId || copy.groupId || copy.id || copy.slug || copy.modelName || copy.nombre;
    const modelId = isSpecialModel(rawModelId, copy.modelImage || copy.mainImage || copy.imagen || copy.image);
    const canonical = findCanonicalVariant(modelId, copy.colorId, copy.colorName || copy.color, copy.imagen || copy.image);
    if (canonical) {
      copy.modelId = modelId;
      copy.modelSlug = modelId;
      copy.colorId = canonical.id;
      copy.colorName = canonical.colorName;
      copy.colorHex = canonical.colorHex;
      copy.imagen = canonical.image;
      copy.image = canonical.image;
    }
    if (SPECIAL_MAIN_IMAGES[modelId]) {
      copy.modelImage = SPECIAL_MAIN_IMAGES[modelId];
      copy.mainImage = copy.mainImage || SPECIAL_MAIN_IMAGES[modelId];
    }
    return copy;
  }

  function normalizeSkuProduct(item = {}) {
    const product = migrateFlatSku(item);
    const colorName = product.colorName || product.color || product.nombreColor || "Color por confirmar";
    const colorId = slugify(product.colorId || product.color || colorName);
    const modelName = product.modelName || product.modelo || product.parentName || stripColorSuffix(product.nombre, colorName) || product.nombre || "Producto";
    const modelId = slugify(product.modelId || product.parentId || product.groupId || product.modelSlug || modelName);
    const modelSlug = product.modelSlug || modelId;
    const sku = String(product.sku || product.codigo || skuFor(product.baseSku || product.modelSku || modelId, colorId, colorName)).trim();
    const image = cleanPath(product.imagen || product.image || product.variantImage || product.mainImage || product.modelImage);
    const modelImage = cleanPath(product.modelImage || product.coverImage || product.mainImage || image);
    const precioPublico = toNumber(product.precioPublico ?? product.precio, 0);
    const precioAlumno = toNumber(product.precioAlumno ?? product.precioRegular, precioPublico);
    const stock = parseStock(product.stock);
    const disponibilidad = stock === 0 ? "agotado" : (product.disponibilidad || (stock === null ? "consultar" : stock <= 2 ? "bajo" : "disponible"));
    const isFeatured = Boolean(product.destacado ?? product.featured);
    const isNew = Boolean(product.nuevo ?? product.newArrival);
    const id = product.id || `${modelId}-${colorId}`;

    return {
      id,
      slug: product.slug || id,
      sku,
      nombre: product.nombre || modelName,
      modelId,
      modelSlug,
      modelName,
      colorId,
      colorName,
      colorHex: product.colorHex || product.hex || "#817A75",
      categoria: product.categoria || "Sin categoria",
      descripcion: product.descripcion || product.description || "",
      tela: product.tela || product.fabric || "",
      detalle: product.detalle || product.detail || "",
      tallas: Array.isArray(product.tallas) ? product.tallas : Array.isArray(product.sizes) ? product.sizes : [],
      precio: precioPublico,
      precioPublico,
      precioAlumno,
      precioRegular: precioAlumno,
      stock,
      disponibilidad,
      imagen: image,
      image,
      mainImage: image,
      modelImage,
      destacado: isFeatured,
      featured: isFeatured,
      nuevo: isNew,
      newArrival: isNew,
      active: product.active !== false,
      actualizadoPrecios: product.actualizadoPrecios || null,
      actualizadoStock: product.actualizadoStock || null,
      sortOrder: Number.isFinite(Number(product.sortOrder)) ? Number(product.sortOrder) : 99,
    };
  }

  function skuFromModelVariant(product, variant, index) {
    const normalized = normalizeVariant(variant, product);
    const modelId = product.id || product.slug || slugify(product.nombre || product.sku || "producto");
    const modelName = product.nombre || titleFromSlug(modelId);
    const modelImage = cleanPath(product.mainImage || product.imagen || product.image);
    const sku = normalized.sku || skuFor(product.sku || modelId, normalized.id, normalized.colorName);
    return normalizeSkuProduct({
      id: `${modelId}-${normalized.id}`,
      slug: `${product.slug || modelId}-${normalized.id}`,
      sku,
      nombre: modelName,
      modelId,
      modelSlug: product.slug || modelId,
      modelName,
      colorId: normalized.id,
      colorName: normalized.colorName,
      colorHex: normalized.colorHex,
      categoria: product.categoria,
      descripcion: product.descripcion || product.description,
      tela: product.tela || product.fabric,
      detalle: product.detalle || product.detail,
      tallas: product.tallas || product.sizes,
      precioPublico: product.precioPublico ?? product.precio,
      precioAlumno: product.precioAlumno ?? product.precioRegular,
      stock: normalized.stock,
      disponibilidad: normalized.stock === 0 ? "agotado" : product.disponibilidad,
      imagen: normalized.image,
      image: normalized.image,
      mainImage: normalized.image,
      modelImage,
      destacado: product.destacado ?? product.featured,
      featured: product.featured ?? product.destacado,
      nuevo: product.nuevo ?? product.newArrival,
      newArrival: product.newArrival ?? product.nuevo,
      active: product.active !== false && normalized.active !== false,
      sortOrder: index,
      actualizadoPrecios: product.actualizadoPrecios,
      actualizadoStock: product.actualizadoStock,
    });
  }

  function expandRecord(record = {}) {
    if (!record || typeof record !== "object") return [];
    const product = migrateModelProduct(record);
    const variants = Array.isArray(product.variantes) ? product.variantes : Array.isArray(product.variants) ? product.variants : [];
    const looksFlat = product.modelId || product.colorId || product.colorName || product.color || product.skuProduct === true;
    if (variants.length && !looksFlat) return variants.map((variant, index) => skuFromModelVariant(product, variant, index));
    return [normalizeSkuProduct(product)];
  }

  function mergeCatalog(baseRecords = [], storedRecords = []) {
    const merged = new Map();
    const put = (item) => {
      const key = item.id || item.sku;
      const current = merged.get(key) || {};
      merged.set(key, normalizeSkuProduct({ ...current, ...item }));
    };
    baseRecords.flatMap(expandRecord).forEach(put);
    storedRecords.flatMap(expandRecord).forEach(put);
    return Array.from(merged.values());
  }

  function productAvailability(item) {
    const stock = parseStock(item?.stock);
    if (!item || item.active === false || item.disponibilidad === "agotado" || stock === 0) {
      return { key: "agotado", label: "Agotado", canBuy: false };
    }
    if (stock !== null) {
      return { key: stock <= 2 ? "bajo" : "disponible", label: `${stock} disponible${stock === 1 ? "" : "s"}`, canBuy: true };
    }
    return { key: item.disponibilidad === "bajo" ? "bajo" : "disponible", label: item.disponibilidad === "bajo" ? "Bajo stock" : "Disponible", canBuy: true };
  }

  function productToVariant(product) {
    return {
      id: product.colorId,
      colorId: product.colorId,
      colorName: product.colorName,
      colorHex: product.colorHex,
      image: product.imagen,
      imagen: product.imagen,
      stock: product.stock,
      active: product.active,
      disponibilidad: product.disponibilidad,
      sku: product.sku,
      skuProductId: product.id,
      precioPublico: product.precioPublico,
      precioAlumno: product.precioAlumno,
      destacado: Boolean(product.destacado ?? product.featured),
      featured: Boolean(product.featured ?? product.destacado),
      nuevo: Boolean(product.nuevo ?? product.newArrival),
      newArrival: Boolean(product.newArrival ?? product.nuevo),
    };
  }

  function groupProducts(skuProducts = []) {
    const groups = new Map();
    skuProducts.filter((product) => product.active !== false).forEach((product) => {
      const groupId = product.modelId || product.id;
      const group = groups.get(groupId) || {
        id: groupId,
        slug: product.modelSlug || groupId,
        sku: skuBase(product.sku, groupId),
        nombre: product.modelName || product.nombre,
        modelName: product.modelName || product.nombre,
        categoria: product.categoria,
        descripcion: product.descripcion,
        tela: product.tela,
        detalle: product.detalle,
        tallas: product.tallas || [],
        precio: product.precioPublico,
        precioPublico: product.precioPublico,
        precioAlumno: product.precioAlumno,
        stock: 0,
        disponibilidad: "agotado",
        imagen: product.modelImage || product.imagen,
        mainImage: product.modelImage || product.imagen,
        destacado: false,
        featured: false,
        nuevo: false,
        newArrival: false,
        featuredVariantId: null,
        featuredSku: null,
        featuredImage: null,
        active: true,
        variantes: [],
      };

      const variant = productToVariant(product);
      group.precioPublico = Math.min(group.precioPublico, product.precioPublico);
      group.precio = group.precioPublico;
      group.precioAlumno = Math.min(group.precioAlumno, product.precioAlumno);
      group.featured = group.destacado = group.featured || product.featured;
      group.newArrival = group.nuevo = group.newArrival || product.newArrival;
      group.variantes.push(variant);

      if (product.featured && !group.featuredVariantId) {
        group.featuredVariantId = variant.id;
        group.featuredSku = variant.sku;
        group.featuredImage = variant.image;
        group.imagen = variant.image || group.imagen;
        group.mainImage = variant.image || group.mainImage;
      }

      const knownStock = group.variantes.map((variant) => parseStock(variant.stock));
      const hasUnknown = knownStock.some((stock) => stock === null);
      const totalStock = knownStock.reduce((sum, stock) => sum + (stock || 0), 0);
      group.stock = hasUnknown ? null : totalStock;
      group.disponibilidad = hasUnknown || totalStock > 0 ? "disponible" : "agotado";
      groups.set(groupId, group);
    });

    return Array.from(groups.values()).map((group) => {
      group.variantes.sort((a, b) => {
        const productA = skuProducts.find((product) => product.id === a.skuProductId);
        const productB = skuProducts.find((product) => product.id === b.skuProductId);
        return (productA?.sortOrder ?? 99) - (productB?.sortOrder ?? 99) || a.colorName.localeCompare(b.colorName, "es");
      });
      if (!group.featuredVariantId && group.featured) {
        const variant = group.variantes.find((item) => item.featured) || group.variantes[0];
        group.featuredVariantId = variant?.id || null;
        group.featuredSku = variant?.sku || null;
        group.featuredImage = variant?.image || null;
        group.imagen = variant?.image || group.imagen;
        group.mainImage = variant?.image || group.mainImage;
      }
      return group;
    });
  }

  function cartKeyForSku(sku) {
    return `${SKU_CART_PREFIX}${sku}`;
  }

  function findSkuProduct(skuProducts, matcher) {
    return skuProducts.find((product) => matcher(product)) || null;
  }

  function resolveCartEntry(key, value, skuProducts = [], groups = groupProducts(skuProducts)) {
    const record = typeof value === "number" ? { quantity: value } : (value || {});
    const fallback = String(key || "").split("::");
    const sku = record.sku || record.productSku || (String(key).startsWith(SKU_CART_PREFIX) ? String(key).slice(SKU_CART_PREFIX.length) : "");
    let skuProduct = sku ? findSkuProduct(skuProducts, (product) => product.sku === sku) : null;

    if (!skuProduct) {
      const productId = record.productId || fallback[0];
      skuProduct = findSkuProduct(skuProducts, (product) => product.id === productId || product.sku === productId);
    }

    if (!skuProduct) {
      const modelId = record.modelId || record.parentId || record.productId || fallback[0];
      const colorId = record.colorId || record.variantId || fallback[1];
      skuProduct = findSkuProduct(skuProducts, (product) => {
        const modelMatches = product.modelId === modelId || product.modelSlug === modelId || product.slug === modelId;
        const colorMatches = product.colorId === colorId || product.id === `${modelId}-${colorId}`;
        return modelMatches && colorMatches;
      });
    }

    if (!skuProduct) return null;
    const group = groups.find((item) => item.id === skuProduct.modelId || item.slug === skuProduct.modelSlug) || groupProducts([skuProduct])[0];
    const variant = group.variantes.find((item) => item.sku === skuProduct.sku || item.skuProductId === skuProduct.id || item.id === skuProduct.colorId) || productToVariant(skuProduct);
    const stock = parseStock(skuProduct.stock);
    const requested = Math.max(1, Math.floor(Number(record.quantity ?? record.cantidad ?? 1) || 1));
    const quantity = stock === null ? requested : Math.min(requested, Math.max(1, stock));
    const availability = productAvailability(skuProduct);

    return {
      key,
      product: group,
      variant,
      skuProduct,
      quantity,
      available: availability.canBuy,
      availability,
      price: skuProduct.precioPublico,
    };
  }

  window.VyoreCatalog = {
    normalize,
    slugify,
    toNumber,
    parseStock,
    colorCode,
    skuFor,
    normalizeVariant,
    normalizeSkuProduct,
    expandRecord,
    mergeCatalog,
    groupProducts,
    productAvailability,
    cartKeyForSku,
    resolveCartEntry,
  };
})();