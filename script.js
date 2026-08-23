const STORAGE_KEYS = {
  cart: "vyore_cart",
  adminProducts: "vyore_admin_products",
};

const META = window.VYORE_CATALOG_META || {};
const BASE_PRODUCTS = Array.isArray(window.PRODUCTOS_VYORE) ? window.PRODUCTOS_VYORE : [];
let SKU_PRODUCTS = buildSkuProducts();
let PRODUCTS = buildProducts();
const FIT_ARRIVAL_SLUGS = new Set(["suplex-corset", "suplex-doble-forro"]);
const ARRIVAL_LIMIT = 3;
const PRODUCT_CARD_SHRINK_SLUGS = new Set(["blusa-suplex-amarre", "suplex-corset", "suplex-doble-forro"]);

const state = {
  category: "Todos",
  search: "",
  sort: "featured",
  cart: loadCart(),
  selectedProductId: null,
  selectedVariantId: null,
};

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const $ = (selector) => document.querySelector(selector);
const productGrid = $("#productGrid");
const featuredGrid = $("#featuredGrid");
const newGrid = $("#newGrid");
const productTemplate = $("#productTemplate");
const arrivalTemplate = $("#arrivalTemplate");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");
const categoryChips = $("#categoryChips");
const activeCategoryName = $("#activeCategoryName");
const headerCartCount = $("#headerCartCount");
const headerCartTotal = $("#headerCartTotal");
const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");
const menuBackdrop = $("#menuBackdrop");
const modal = $("#productModal");
const modalProductImage = $("#modalProductImage");
const modalProductCategory = $("#modalProductCategory");
const modalProductName = $("#modalProductName");
const modalProductPrice = $("#modalProductPrice");
const modalProductFabric = $("#modalProductFabric");
const modalProductDescription = $("#modalProductDescription");
const modalProductSizes = $("#modalProductSizes");
const modalProductDetail = $("#modalProductDetail");
const modalVariantOptions = $("#modalVariantOptions");
const modalStockLabel = $("#modalStockLabel");
const modalAddCart = $("#modalAddCart");
const toastNode = $("#toast");

function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";
}

function loadAdminProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminProducts) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function buildSkuProducts() {
  if (window.VyoreCatalog) {
    return window.VyoreCatalog.mergeCatalog(BASE_PRODUCTS, loadAdminProducts()).filter((product) => product.active !== false);
  }
  return mergeProducts(BASE_PRODUCTS, loadAdminProducts()).filter((product) => product.active !== false);
}

function buildProducts() {
  return window.VyoreCatalog ? window.VyoreCatalog.groupProducts(SKU_PRODUCTS) : buildSkuProducts();
}

function migrateBlusaSuplexAmarreVariant(variant = {}, product = {}, image = "") {
  const productId = String(product.id || product.slug || "");
  const currentImage = String(image || "");
  const isTarget = productId === "blusa-suplex-amarre" || currentImage.includes("blusa-suplex-amarre");
  if (!isTarget) return { ...variant, image };

  const match = currentImage.match(/blusa-suplex-amarre-(0[1-6])-(azul|beige|marron|rosado|rojo|verde|negro)\.(jpg|png)$/);
  let nextImage = currentImage;
  if (match) {
    const color = match[2] === "marron" ? "rosado" : match[2];
    nextImage = `assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-${match[1]}-${color}.png`;
  }

  const originalId = String(variant.id || "");
  const originalName = String(variant.colorName || variant.nombre || "");
  const isAmarillo = originalId === "beige" || originalName === "Beige" || /blusa-suplex-amarre-02-beige\.(jpg|png)$/.test(currentImage);
  const isRosado = originalId === "marron" || originalName === "Marrón" || /blusa-suplex-amarre-03-(marron|rosado)\.(jpg|png)$/.test(currentImage);
  return {
    ...variant,
    id: isAmarillo ? "amarillo" : isRosado ? "rosado" : variant.id,
    colorName: isAmarillo ? "Amarillo" : isRosado ? "Rosado" : variant.colorName,
    colorHex: isAmarillo ? "#F3D85D" : isRosado ? "#C98A9B" : variant.colorHex,
    image: isRosado && !nextImage ? "assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-03-rosado.png" : nextImage,
  };
}
function migrateBlusaSuplexProduct(product = {}) {
  const productId = String(product.id || product.slug || "");
  if (productId !== "blusa-suplex") return product;

  const mainImage = "assets/productos/vyore/catalogo/blusa-suplex.png";
  const variants = [
    {
      id: "blanco",
      colorName: "Blanco",
      colorHex: "#F7F3ED",
      image: "assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-01-blanco.png",
      stock: null,
      active: true,
    },
    {
      id: "negro",
      colorName: "Negro",
      colorHex: "#111111",
      image: "assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-01-negro.png",
      stock: null,
      active: true,
    },
    {
      id: "celeste",
      colorName: "Celeste",
      colorHex: "#B9D7E8",
      image: "assets/productos/vyore/variantes/blusa-suplex/blusa-suplex-02-celeste.png",
      stock: null,
      active: true,
    },
  ];
  const sourceVariants = Array.isArray(product.variantes)
    ? product.variantes
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  const hasLegacyVariants = sourceVariants.length > 3 || sourceVariants.some((variant) => {
    const variantKey = normalize(variant.id || variant.colorName || variant.nombre || "");
    const image = String(variant.image || variant.imagen || "");
    return ["beige", "crema", "marron", "arena"].includes(variantKey) || /variantes\/blusa-suplex-\d/.test(image);
  });
  const findStoredVariant = (target) => sourceVariants.find((variant) => {
    const id = normalize(variant.id || "");
    const name = normalize(variant.colorName || variant.nombre || "");
    const aliases = [target.id, target.colorName, ...(target.legacyIds || [])].map(normalize);
    return aliases.includes(id) || aliases.includes(name);
  });

  return {
    ...product,
    imagen: mainImage,
    mainImage,
    disponibilidad: "disponible",
    stock: null,
    variantes: variants.map((variant) => {
      const stored = findStoredVariant(variant);
      const keepStoredStock = Boolean(stored) && !hasLegacyVariants;
      return {
        ...variant,
        stock: keepStoredStock ? stored.stock ?? null : null,
        active: keepStoredStock ? stored.active !== false : true,
        pending: keepStoredStock ? Boolean(stored.pending || stored.stock === null || stored.stock === undefined || stored.stock === "") : true,
      };
    }),
  };
}
function migrateSuplexLazzoDobleForroProduct(product = {}) {
  const productId = String(product.id || product.slug || "");
  if (productId !== "suplex-lazzo-doble-forro") return product;

  const mainImage = "assets/productos/vyore/catalogo/suplex-lazzo-doble-forro.png";
  const variants = [
    {
      id: "marron",
      colorName: "Marrón",
      colorHex: "#7B422A",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-01-marron.png",
      stock: null,
      active: true,
    },
    {
      id: "blanco",
      colorName: "Blanco",
      colorHex: "#F3EFE8",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-blanco.png",
      stock: null,
      active: true,
      legacyIds: ["beige"],
    },
    {
      id: "verde",
      colorName: "Verde",
      colorHex: "#24483F",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-03-verde.png",
      stock: null,
      active: true,
    },
    {
      id: "amarillo",
      colorName: "Amarillo",
      colorHex: "#F2C94C",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-04-amarillo.png",
      stock: 0,
      active: true,
      legacyIds: ["crema"],
    },
    {
      id: "celeste",
      colorName: "Celeste",
      colorHex: "#B9D7F0",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-05-celeste.png",
      stock: null,
      active: true,
      legacyIds: ["azul"],
    },
    {
      id: "negro",
      colorName: "Negro",
      colorHex: "#171717",
      image: "assets/productos/vyore/variantes/suplex-lazzo-doble-forro/suplex-lazzo-doble-forro-06-negro.png",
      stock: null,
      active: true,
    },
  ];
  const sourceVariants = Array.isArray(product.variantes)
    ? product.variantes
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  const findStoredVariant = (target) => sourceVariants.find((variant) => {
    const id = normalize(variant.id || "");
    const name = normalize(variant.colorName || variant.nombre || "");
    const aliases = [target.id, target.colorName, ...(target.legacyIds || [])].map(normalize);
    return aliases.includes(id) || aliases.includes(name);
  });

  return {
    ...product,
    imagen: mainImage,
    mainImage,
    disponibilidad: "disponible",
    stock: null,
    variantes: variants.map((variant) => {
      const stored = findStoredVariant(variant);
      const { legacyIds, ...cleanVariant } = variant;
      return {
        ...cleanVariant,
        stock: stored ? stored.stock ?? cleanVariant.stock : cleanVariant.stock,
        active: stored ? stored.active !== false : true,
        pending: stored ? Boolean(stored.pending || stored.stock === null || stored.stock === undefined || stored.stock === "") : cleanVariant.stock === null,
      };
    }),
  };
}
function migrateOlimpicoSuplexProduct(product = {}) {
  const productId = String(product.id || product.slug || "");
  if (productId !== "olimpico-suplex") return product;

  const mainImage = "assets/productos/vyore/olimpico-suplex.png";
  const variants = [
    {
      id: "marron",
      colorName: "Marrón",
      colorHex: "#50382F",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-03-marron.png",
      stock: null,
      active: true,
    },
    {
      id: "verde-oliva",
      colorName: "Verde oliva",
      colorHex: "#7D8066",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-02-verde-oliva.png",
      stock: null,
      active: true,
    },
    {
      id: "vino",
      colorName: "Vino",
      colorHex: "#682D42",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-04-vino.png",
      stock: null,
      active: true,
    },
    {
      id: "negro",
      colorName: "Negro",
      colorHex: "#111111",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-05-negro.png",
      stock: null,
      active: true,
    },
    {
      id: "marron-claro",
      colorName: "Marrón claro",
      colorHex: "#B8756A",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-06-rosado.png",
      legacyIds: ["rosado"],
      stock: null,
      active: true,
    },
    {
      id: "celeste",
      colorName: "Celeste",
      colorHex: "#1F4EA8",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-01-azul.png",
      stock: null,
      active: true,
    },
  ];
  const sourceVariants = Array.isArray(product.variantes)
    ? product.variantes
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  const hasLegacyVariants = sourceVariants.length > 6 || sourceVariants.some((variant) => {
    const variantKey = normalize(variant.id || variant.colorName || variant.nombre || "");
    const image = String(variant.image || variant.imagen || "");
    return ["chocolate"].includes(variantKey) || /variantes\/olimpico-suplex-\d/.test(image) || image.endsWith(".jpg");
  });
  const findStoredVariant = (target) => sourceVariants.find((variant) => {
    const id = normalize(variant.id || "");
    const name = normalize(variant.colorName || variant.nombre || "");
    const aliases = [target.id, target.colorName, ...(target.legacyIds || [])].map(normalize);
    return aliases.includes(id) || aliases.includes(name);
  });

  return {
    ...product,
    imagen: mainImage,
    mainImage,
    disponibilidad: "disponible",
    stock: null,
    variantes: variants.map((variant) => {
      const stored = findStoredVariant(variant);
      const keepStoredStock = Boolean(stored) && !hasLegacyVariants;
      return {
        ...variant,
        stock: keepStoredStock ? stored.stock ?? null : null,
        active: keepStoredStock ? stored.active !== false : true,
        pending: keepStoredStock ? Boolean(stored.pending || stored.stock === null || stored.stock === undefined || stored.stock === "") : true,
      };
    }),
  };
}
function normalizeVariant(variant, product) {
  const image = variant.image || variant.imagen || product.mainImage || product.imagen;
  const migrated = migrateBlusaSuplexAmarreVariant(variant, product, image);
  return {
    id: migrated.id || slugify(migrated.colorName || migrated.nombre || "color"),
    colorName: migrated.colorName || migrated.nombre || "Color disponible",
    colorHex: migrated.colorHex || migrated.hex || "#817A75",
    image: migrated.image || image,
    stock: parseStock(migrated.stock),
    active: migrated.active !== false,
    pending: Boolean(migrated.pending || migrated.stock === null || migrated.stock === undefined || migrated.stock === ""),
  };
}
function normalizeProduct(product) {
  product = migrateBlusaSuplexProduct(product);
  product = migrateSuplexLazzoDobleForroProduct(product);
  product = migrateOlimpicoSuplexProduct(product);
  const price = toNumber(product.precioPublico ?? product.precio ?? product.price, 0);
  const isFeatured = Boolean(product.destacado ?? product.featured);
  const base = {
    ...product,
    id: product.id || slugify(product.nombre || product.name),
    slug: product.slug || slugify(product.nombre || product.name),
    sku: product.sku || product.id || slugify(product.nombre || product.name),
    nombre: product.nombre || product.name || "Producto VYÓRE",
    categoria: product.categoria || product.category || "Blusas y tops",
    descripcion: product.descripcion || product.description || "",
    tela: product.tela || product.fabric || "",
    detalle: product.detalle || product.detail || "",
    tallas: Array.isArray(product.tallas) ? product.tallas : Array.isArray(product.sizes) ? product.sizes : [],
    precio: price,
    precioPublico: price,
    mainImage: product.mainImage || product.imagen || product.image || "assets/vyore/isotipo-vyore.png",
    imagen: product.imagen || product.mainImage || product.image || "assets/vyore/isotipo-vyore.png",
    featured: isFeatured,
    destacado: isFeatured,
    newArrival: Boolean(product.newArrival ?? product.nuevo),
    nuevo: Boolean(product.nuevo ?? product.newArrival),
    active: product.active !== false,
  };
  const rawVariants = Array.isArray(product.variantes)
    ? product.variantes
    : Array.isArray(product.variants)
      ? product.variants
      : [];
  base.variantes = rawVariants.length
    ? rawVariants.map((variant) => normalizeVariant(variant, base))
    : [normalizeVariant({ id: "color-por-confirmar", pending: true, image: base.mainImage }, base)];
  return base;
}

function mergeProducts(baseProducts, adminProducts) {
  const merged = new Map();
  baseProducts.forEach((product) => merged.set(product.id, normalizeProduct(product)));
  adminProducts.forEach((product) => {
    if (!product || !product.id) return;
    const current = merged.get(product.id) || {};
    merged.set(product.id, normalizeProduct({ ...current, ...product }));
  });
  return Array.from(merged.values());
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function cartKey(productId, variantId) {
  const product = getProduct(productId);
  const variant = getVariant(product, variantId);
  if (window.VyoreCatalog && variant?.sku) return window.VyoreCatalog.cartKeyForSku(variant.sku);
  return `${productId}::${variantId}`;
}

function cartQuantityFor(productId, variantId) {
  const product = getProduct(productId);
  const variant = getVariant(product, variantId);
  const keys = [cartKey(productId, variantId), `${product?.id || productId}::${variant?.id || variantId}`];
  const record = keys.map((key) => state.cart[key]).find(Boolean);
  if (!record) return 0;
  const rawQuantity = typeof record === "number" ? record : record.quantity ?? record.cantidad ?? 0;
  return Math.max(0, Math.floor(Number(rawQuantity) || 0));
}

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === id || product.slug === id);
}

function getProductBySlug(slug) {
  return PRODUCTS.find((product) => product.slug === slug);
}

function getVariant(product, variantId) {
  return product?.variantes.find((variant) => variant.id === variantId) || product?.variantes[0] || null;
}

function variantAvailability(variant) {
  const stock = parseStock(variant?.stock);
  if (!variant || variant.active === false || stock === 0) return { key: "agotado", label: "Agotado", canBuy: false };
  if (stock !== null) return { key: stock <= 2 ? "bajo" : "disponible", label: `${stock} disponible${stock === 1 ? "" : "s"}`, canBuy: true };
  return { key: "disponible", label: "Disponible", canBuy: true };
}

function productAvailability(product) {
  const variants = product.variantes.filter((variant) => variant.active !== false);
  if (!variants.length) return { key: "agotado", label: "Agotado", canBuy: false };
  if (variants.some((variant) => parseStock(variant.stock) === null && variant.active !== false)) {
    return { key: "disponible", label: "Disponible", canBuy: true };
  }
  const total = variants.reduce((sum, variant) => sum + (parseStock(variant.stock) || 0), 0);
  if (total <= 0) return { key: "agotado", label: "Agotado", canBuy: false };
  return { key: total <= 3 ? "bajo" : "disponible", label: `${total} disponible${total === 1 ? "" : "s"}`, canBuy: true };
}

function categories() {
  const available = Array.from(new Set(PRODUCTS.map((product) => product.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
  return ["Todos", ...available];
}

function filteredProducts() {
  const query = normalize(state.search);
  return PRODUCTS
    .filter((product) => {
      const matchCategory = state.category === "Todos" || product.categoria === state.category;
      const matchSearch = !query || normalize(`${product.nombre} ${product.categoria} ${product.tela} ${product.sku}`).includes(query);
      return matchCategory && matchSearch;
    })
    .sort(compareProducts);
}

function compareProducts(a, b) {
  if (state.sort === "price-asc") return a.precioPublico - b.precioPublico || a.nombre.localeCompare(b.nombre, "es");
  if (state.sort === "price-desc") return b.precioPublico - a.precioPublico || a.nombre.localeCompare(b.nombre, "es");
  if (state.sort === "name") return a.nombre.localeCompare(b.nombre, "es");
  return Number(b.featured) - Number(a.featured) || Number(b.newArrival) - Number(a.newArrival) || a.nombre.localeCompare(b.nombre, "es");
}

function setCategory(category) {
  state.category = category;
  renderCategories();
  renderProducts();
}

function renderCategories() {
  categoryChips.innerHTML = "";
  categories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${category === state.category ? "active" : ""}`;
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === state.category));
    button.addEventListener("click", () => setCategory(category));
    categoryChips.appendChild(button);
  });
}

function renderColorDots(product, target) {
  target.innerHTML = "";
  product.variantes.forEach((variant) => {
    const availability = variantAvailability(variant);
    const dot = document.createElement("span");
    dot.className = `color-dot ${availability.canBuy ? "" : "is-disabled"}`;
    dot.style.setProperty("--swatch", variant.colorHex || "#817A75");
    dot.title = `${variant.colorName} - ${availability.label}`;
    target.appendChild(dot);
  });
}

function canShowFeaturedSku(product = {}) {
  const stock = parseStock(product.stock);
  return product.active !== false && product.disponibilidad !== "agotado" && stock !== 0;
}

function featuredProductFromSku(product) {
  const group = PRODUCTS.find((item) => item.id === product.modelId || item.slug === product.modelSlug) || product;
  const image = product.imagen || product.mainImage || group.mainImage || group.imagen;
  return {
    ...group,
    sku: product.sku,
    id: group.id || product.modelId || product.id,
    slug: group.slug || product.modelSlug || product.slug || product.id,
    nombre: product.modelName || group.nombre || product.nombre,
    categoria: product.categoria || group.categoria,
    mainImage: image,
    imagen: image,
    featuredVariantId: product.colorId,
    featuredSku: product.sku,
    featuredImage: image,
  };
}

function productUrl(product, variantId = product.featuredVariantId || null) {
  const url = new URL("producto/", window.location.href);
  url.searchParams.set("slug", product.slug || product.id);
  if (variantId) url.searchParams.set("color", variantId);
  return `${url.pathname}${url.search}`;
}

function productCard(product) {
  const node = productTemplate.content.firstElementChild.cloneNode(true);
  const productSlug = product.slug || product.id;
  node.dataset.productSlug = productSlug;
  if (productSlug === "blusa-suplex") node.classList.add("product-card--blusa-suplex");
  if (PRODUCT_CARD_SHRINK_SLUGS.has(productSlug)) node.classList.add("product-card--soft-shrink");
  const imageButton = node.querySelector(".product-image-button");
  const img = node.querySelector("img");
  const open = () => { window.location.href = productUrl(product); };

  img.src = product.mainImage || product.imagen;
  img.alt = product.nombre;
  imageButton.setAttribute("aria-label", `Ver ${product.nombre}`);
  node.querySelector(".category").textContent = product.categoria;
  node.querySelector("h3").textContent = product.nombre;

  imageButton.addEventListener("click", open);
  node.querySelector(".product-body").addEventListener("click", open);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  return node;
}

function renderProducts() {
  const products = filteredProducts();
  productGrid.innerHTML = "";
  activeCategoryName.textContent = state.category === "Todos" ? "Todos los productos" : state.category;

  if (!products.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No hay prendas con ese filtro.";
    productGrid.appendChild(empty);
    return;
  }

  products.forEach((product) => productGrid.appendChild(productCard(product)));
}

function renderFeatured() {
  featuredGrid.innerHTML = "";
  SKU_PRODUCTS
    .filter((product) => product.featured && canShowFeaturedSku(product))
    .sort((a, b) =>
      (a.sortOrder ?? 99) - (b.sortOrder ?? 99) ||
      (a.modelName || a.nombre).localeCompare(b.modelName || b.nombre, "es") ||
      (a.colorName || "").localeCompare(b.colorName || "", "es")
    )
    .forEach((product) => featuredGrid.appendChild(productCard(featuredProductFromSku(product))));
}

function randomArrivalProducts() {
  return PRODUCTS
    .filter((product) => product.newArrival)
    .map((product) => ({ product, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, ARRIVAL_LIMIT)
    .map((item) => item.product);
}

function renderArrivals() {
  newGrid.innerHTML = "";
  randomArrivalProducts().forEach((product) => {
    const node = arrivalTemplate.content.firstElementChild.cloneNode(true);
    const productSlug = product.slug || product.id;
    node.dataset.productSlug = productSlug;
    if (FIT_ARRIVAL_SLUGS.has(productSlug)) node.classList.add("arrival-item--fit");
    const image = node.querySelector("img");
    image.src = product.mainImage || product.imagen;
    image.alt = product.nombre;
    node.querySelector("span").textContent = product.categoria;
    node.querySelector("strong").textContent = product.nombre;
    node.addEventListener("click", () => { window.location.href = productUrl(product); });
    newGrid.appendChild(node);
  });
}

function refreshCatalogFromStorage() {
  SKU_PRODUCTS = buildSkuProducts();
  PRODUCTS = buildProducts();
  if (state.category !== "Todos" && !PRODUCTS.some((product) => product.categoria === state.category)) {
    state.category = "Todos";
  }
  renderCategories();
  renderFeatured();
  renderArrivals();
  renderProducts();
  renderCartSummary();
  if (modal.classList.contains("is-open") && state.selectedProductId) {
    openProduct(state.selectedProductId, state.selectedVariantId);
  }
}

function cartItems() {
  if (window.VyoreCatalog) {
    return Object.entries(state.cart)
      .map(([key, value]) => window.VyoreCatalog.resolveCartEntry(key, value, SKU_PRODUCTS, PRODUCTS))
      .filter(Boolean);
  }
  return Object.entries(state.cart).map(([key, value]) => {
    const record = typeof value === "number" ? { quantity: value } : value;
    const [fallbackProductId, fallbackVariantId] = key.split("::");
    const productId = record.productId || fallbackProductId;
    const product = getProduct(productId);
    if (!product) return null;
    const variant = getVariant(product, record.variantId || fallbackVariantId);
    if (!variant) return null;
    const stock = parseStock(variant.stock);
    const requested = Math.max(1, Math.floor(Number(record.quantity ?? record.cantidad ?? 1) || 1));
    const quantity = stock === null ? requested : Math.min(requested, Math.max(1, stock));
    return { key, product, variant, quantity, availability: variantAvailability(variant), price: product.precioPublico };
  }).filter(Boolean);
}

function renderCartSummary() {
  const items = cartItems().filter((item) => item.availability.canBuy);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + (item.price ?? item.product.precioPublico) * item.quantity, 0);
  headerCartCount.textContent = count;
  headerCartTotal.textContent = money.format(total);
}

function addToCart(productId, variantId, quantity = 1) {
  const product = getProduct(productId);
  const variant = getVariant(product, variantId);
  const availability = variantAvailability(variant);
  if (!product || !variant) return { ok: false, reason: "missing" };
  if (!availability.canBuy) return { ok: false, reason: "stock" };

  const key = cartKey(product.id, variant.id);
  const current = cartQuantityFor(product.id, variant.id);
  const stock = parseStock(variant.stock);
  if (stock !== null && current >= stock) return { ok: false, reason: "limit" };
  const next = current + Math.max(1, Math.floor(quantity || 1));
  state.cart[key] = {
    sku: variant.sku || null,
    productId: variant.skuProductId || product.id,
    modelId: product.id,
    variantId: variant.id,
    colorId: variant.id,
    quantity: stock === null ? next : Math.min(next, stock),
  };
  saveCart();
  renderCartSummary();
  return { ok: true, product, variant };
}

function openProduct(productId, variantId = null) {
  const product = getProduct(productId);
  if (!product) return;
  const firstAvailable = product.variantes.find((variant) => variantAvailability(variant).canBuy) || product.variantes[0];
  const variant = getVariant(product, variantId) || firstAvailable;
  state.selectedProductId = product.id;
  state.selectedVariantId = variant.id;

  modalProductCategory.textContent = product.categoria;
  modalProductName.textContent = product.nombre;
  modalProductPrice.textContent = money.format(product.precioPublico);
  modalProductFabric.textContent = product.tela;
  modalProductDescription.textContent = product.descripcion;
  modalProductSizes.textContent = product.tallas.length ? product.tallas.join(" / ") : "Por confirmar";
  modalProductDetail.textContent = product.detalle || "Por confirmar";
  renderVariantOptions(product);
  syncModalVariant(product, variant.id);

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (window.location.hash !== `#productos/${product.slug}`) {
    history.replaceState(null, "", `#productos/${product.slug}`);
  }
}

function renderVariantOptions(product) {
  modalVariantOptions.innerHTML = "";
  product.variantes.forEach((variant) => {
    const availability = variantAvailability(variant);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-option";
    button.disabled = !availability.canBuy;
    button.dataset.variantId = variant.id;
    button.innerHTML = `<span style="--swatch:${variant.colorHex || "#817A75"}"></span><strong>${escapeHtml(variant.colorName)}</strong><em>${availability.label}</em>`;
    button.addEventListener("click", () => syncModalVariant(product, variant.id));
    modalVariantOptions.appendChild(button);
  });
}

function syncModalVariant(product, variantId) {
  const variant = getVariant(product, variantId);
  const availability = variantAvailability(variant);
  const stock = parseStock(variant.stock);
  const current = cartQuantityFor(product.id, variant.id);
  const reached = availability.canBuy && stock !== null && current >= stock;
  state.selectedVariantId = variant.id;
  modalProductImage.src = variant.image || product.mainImage || product.imagen;
  modalProductImage.alt = `${product.nombre} - ${variant.colorName}`;
  modalStockLabel.textContent = reached ? "Stock alcanzado" : availability.label;
  modalStockLabel.className = `stock-note ${availability.key}`;
  modalAddCart.disabled = !availability.canBuy || reached;
  modalAddCart.textContent = availability.canBuy ? (reached ? "Stock alcanzado" : "Agregar al carrito") : "Agotado";
  modalVariantOptions.querySelectorAll(".variant-option").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.variantId === variant.id);
  });
}
function closeProduct() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (window.location.hash.startsWith("#productos/")) history.replaceState(null, "", "#productos");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toastNode.classList.remove("show"), 2200);
}

function toggleMenu() {
  const open = !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function bootHashProduct() {
  const match = window.location.hash.match(/^#productos\/(.+)$/);
  if (!match) return;
  const product = getProductBySlug(match[1]);
  if (product) openProduct(product.id);
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

menuToggle.addEventListener("click", toggleMenu);
menuBackdrop.addEventListener("click", closeMenu);
mainNav.addEventListener("click", closeMenu);

modal.querySelectorAll("[data-close-modal]").forEach((node) => node.addEventListener("click", closeProduct));
modalAddCart.addEventListener("click", () => {
  const result = addToCart(state.selectedProductId, state.selectedVariantId, 1);
  if (!result.ok) {
    showToast(result.reason === "limit" ? "Stock máximo de este color" : result.reason === "stock" ? "Variante agotada" : "No se pudo agregar");
    return;
  }
  syncModalVariant(result.product, result.variant.id);
  closeProduct();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modal.classList.contains("is-open")) closeProduct();
    closeMenu();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEYS.adminProducts) {
    refreshCatalogFromStorage();
  } else if (event.key === STORAGE_KEYS.cart) {
    state.cart = loadCart();
    renderCartSummary();
  }
});

refreshCatalogFromStorage();
bootHashProduct();




