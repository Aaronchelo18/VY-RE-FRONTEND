const STORAGE_KEYS = { cart: "vyore_cart", adminProducts: "vyore_admin_products" };
const META = window.VYORE_CATALOG_META || {};
const BASE_PRODUCTS = Array.isArray(window.PRODUCTOS_VYORE) ? window.PRODUCTOS_VYORE : [];
const SKU_PRODUCTS = window.VyoreCatalog
  ? window.VyoreCatalog.mergeCatalog(BASE_PRODUCTS, loadAdminProducts()).filter((item) => item.active !== false)
  : mergeProducts(BASE_PRODUCTS, loadAdminProducts()).filter((item) => item.active !== false);
const PRODUCTS = window.VyoreCatalog ? window.VyoreCatalog.groupProducts(SKU_PRODUCTS) : SKU_PRODUCTS;
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug") || window.location.hash.replace(/^#/, "");
const product = PRODUCTS.find((item) => item.slug === slug || item.id === slug) || PRODUCTS[0];
const requestedVariantId = params.get("color") || params.get("variant") || params.get("sku") || null;
const requestedVariant = product?.variantes?.find((variant) => variant.id === requestedVariantId || variant.colorId === requestedVariantId || variant.sku === requestedVariantId) || null;
const initialVariant =
  (requestedVariant && availability(requestedVariant).canBuy ? requestedVariant : null) ||
  product?.variantes?.find((variant) => availability(variant).canBuy) ||
  product?.variantes?.[0];
const state = { selectedVariantId: initialVariant?.id || null };
const productSlug = product?.slug || product?.id;
if (productSlug === "blusa-suplex") document.body.classList.add("product-page--blusa-suplex");
if (productSlug === "blusa-suplex-amarre") document.body.classList.add("product-page--blusa-suplex-amarre");

const image = document.querySelector("#productImage");
const category = document.querySelector("#productCategory");
const nameNode = document.querySelector("#productName");
const price = document.querySelector("#productPrice");
const description = document.querySelector("#productDescription");
const fabric = document.querySelector("#productFabric");
const sizes = document.querySelector("#productSizes");
const detail = document.querySelector("#productDetail");
const variantOptions = document.querySelector("#variantOptions");
const variantStock = document.querySelector("#variantStock");
const addToCartButton = document.querySelector("#addToCart");
const sendWhatsapp = document.querySelector("#sendWhatsapp");
const toast = document.querySelector("#toast");
const productHeaderCartCount = document.querySelector("#productHeaderCartCount");
const productMenuToggle = document.querySelector("#productMenuToggle");
const productMainNav = document.querySelector("#productMainNav");
const productMenuBackdrop = document.querySelector("#productMenuBackdrop");

function normalize(text) {
  return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function slugify(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "producto";
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
function migrateBlusaSuplexAmarreVariant(variant = {}, product = {}, image = "") {
  const productId = String(product.id || product.slug || "");
  const currentImage = String(image || "");
  const isTarget = productId === "blusa-suplex-amarre" || currentImage.includes("blusa-suplex-amarre");
  if (!isTarget) return { ...variant, image };

  const match = currentImage.match(/blusa-suplex-amarre-(0[1-6])-(azul|beige|amarillo|marron|rosado|rojo|verde|negro)\.(jpg|png)$/);
  let nextImage = currentImage;
  if (match) {
    const color = match[2] === "marron" ? "rosado" : match[2] === "beige" ? "amarillo" : match[2];
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

  const mainImage = "assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/blusa-suplex.png";
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

  const mainImage = "assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/suplex-lazzo-doble-forro.png";
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

  const mainImage = "assets/productos/vyore/variantes/IMAGENES-REFERENCIALES/olimpico-suplex.png";
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
function normalizeVariant(variant, parent) {
  const image = variant.image || variant.imagen || parent.mainImage || parent.imagen;
  const migrated = migrateBlusaSuplexAmarreVariant(variant, parent, image);
  return {
    id: migrated.id || slugify(migrated.colorName || migrated.nombre || "color"),
    colorName: migrated.colorName || migrated.nombre || "Color disponible",
    colorHex: migrated.colorHex || migrated.hex || "#817A75",
    image: migrated.image || image,
    stock: parseStock(migrated.stock),
    active: migrated.active !== false,
  };
}
function normalizeProduct(item) {
  item = migrateBlusaSuplexProduct(item);
  item = migrateSuplexLazzoDobleForroProduct(item);
  item = migrateOlimpicoSuplexProduct(item);
  const base = {
    ...item,
    id: item.id || slugify(item.nombre || item.name),
    slug: item.slug || slugify(item.nombre || item.name),
    sku: item.sku || item.id || slugify(item.nombre || item.name),
    nombre: item.nombre || item.name || "Producto VYÓRE",
    categoria: item.categoria || "Blusas y tops",
    precioPublico: toNumber(item.precioPublico ?? item.precio ?? item.price, 0),
    mainImage: item.mainImage || item.imagen || item.image || "../assets/vyore/isotipo-vyore.png",
    imagen: item.imagen || item.mainImage || item.image || "../assets/vyore/isotipo-vyore.png",
    descripcion: item.descripcion || item.description || "",
    tela: item.tela || item.fabric || "Por confirmar",
    detalle: item.detalle || item.detail || "Por confirmar",
    tallas: Array.isArray(item.tallas) ? item.tallas : [],
  };
  const rawVariants = Array.isArray(item.variantes) ? item.variantes : [];
  base.variantes = rawVariants.length ? rawVariants.map((variant) => normalizeVariant(variant, base)) : [normalizeVariant({ id: "color-por-confirmar" }, base)];
  return base;
}
function loadAdminProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminProducts) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function mergeProducts(baseProducts, adminProducts) {
  const merged = new Map();
  baseProducts.forEach((item) => {
    const normalized = normalizeProduct(item);
    merged.set(normalized.id, normalized);
  });
  adminProducts.forEach((item) => {
    if (!item || !item.id) return;
    const current = merged.get(item.id) || {};
    merged.set(item.id, normalizeProduct({ ...current, ...item }));
  });
  return Array.from(merged.values());
}
function asset(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("../")) return path;
  return `../${path}`;
}
function availability(variant) {
  const stock = parseStock(variant?.stock);
  if (!variant || variant.active === false || variant.disponibilidad === "agotado" || stock === 0) return { label: "Agotado", canBuy: false };
  if (stock !== null) return { label: `${stock} disponible${stock === 1 ? "" : "s"}`, canBuy: true };
  return { label: "Disponible", canBuy: true };
}
function selectedVariant() {
  if (!state.selectedVariantId) return null;
  return product.variantes.find((variant) => variant.id === state.selectedVariantId) || null;
}
function cartKey(productId, variantId) {
  const variant = product?.variantes?.find((item) => item.id === variantId);
  if (window.VyoreCatalog && variant?.sku) return window.VyoreCatalog.cartKeyForSku(variant.sku);
  return `${productId}::${variantId}`;
}
function loadCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "{}"); } catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}
function cartTotalQuantity() {
  return Object.values(loadCart()).reduce((sum, record) => {
    const quantity = typeof record === "number" ? record : record?.quantity ?? record?.cantidad ?? 0;
    return sum + Math.max(0, Math.floor(Number(quantity) || 0));
  }, 0);
}
function renderHeaderCartCount() {
  if (!productHeaderCartCount) return;
  const count = cartTotalQuantity();
  productHeaderCartCount.textContent = count;
  productHeaderCartCount.classList.toggle("is-empty", count === 0);
}
function cartQuantityFor(variant) {
  const cart = loadCart();
  const keys = [cartKey(product.id, variant.id), `${product.id}::${variant.id}`];
  const record = keys.map((key) => cart[key]).find(Boolean);
  if (!record) return 0;
  const rawQuantity = typeof record === "number" ? record : record.quantity ?? record.cantidad ?? 0;
  return Math.max(0, Math.floor(Number(rawQuantity) || 0));
}
function purchaseState(variant) {
  const stateInfo = availability(variant);
  const stock = parseStock(variant?.stock);
  const current = cartQuantityFor(variant);
  const reached = stateInfo.canBuy && stock !== null && current >= stock;
  return {
    ...stateInfo,
    stock,
    current,
    reached,
    canAdd: stateInfo.canBuy && !reached,
    label: reached ? "Stock alcanzado" : stateInfo.label,
  };
}
function whatsappMessage(quantity = 1) {
  const variant = selectedVariant();
  if (!variant) return "Hola VYÓRE, quiero consultar una prenda.";
  const lines = [
    "Hola VYÓRE, quiero consultar/realizar este pedido:",
    "",
    `Producto: ${product.nombre}`,
    `SKU: ${variant.sku || product.sku}`,
    `Color: ${variant.colorName}`,
    `Talla: ${product.tallas.length ? product.tallas.join(" / ") : "Por confirmar"}`,
    `Cantidad: ${quantity}`,
    `Precio: ${money.format(variant.precioPublico ?? product.precioPublico)}`,
    "",
    "¿Me confirman disponibilidad y método de pago?",
  ];
  return lines.join("\n");
}
function whatsappUrl(quantity = 1) {
  const number = META.whatsappPrimary || "51938807320";
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(quantity))}`;
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2000);
}
function toggleProductMenu() {
  const open = !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  productMenuToggle?.setAttribute("aria-expanded", String(open));
}
function closeProductMenu() {
  document.body.classList.remove("menu-open");
  productMenuToggle?.setAttribute("aria-expanded", "false");
}
function renderVariants() {
  variantOptions.innerHTML = "";
  product.variantes.forEach((variant) => {
    const stateInfo = availability(variant);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-option";
    button.dataset.variantId = variant.id;
    button.setAttribute("data-variant-id", variant.id);
    button.disabled = !stateInfo.canBuy;
    button.innerHTML = `
      <img src="${asset(variant.image)}" alt="${product.nombre} - ${variant.colorName}">
      <span class="variant-info">
        <span class="variant-swatch" style="--swatch:${variant.colorHex}"></span>
        <strong>${variant.colorName}</strong>
        <em>${stateInfo.label}</em>
      </span>`;
    button.addEventListener("click", () => {
      state.selectedVariantId = variant.id;
      syncVariant();
    });
    variantOptions.appendChild(button);
  });
}
function syncVariant() {
  const variant = selectedVariant();
  if (!variant) {
    image.src = asset(product.mainImage || product.imagen);
    image.alt = product.nombre;
    variantStock.textContent = "Elige un color";
    addToCartButton.disabled = true;
    addToCartButton.textContent = "Elige un color";
    sendWhatsapp.href = "#";
    sendWhatsapp.classList.add("disabled");
    variantOptions.querySelectorAll(".variant-option").forEach((button) => button.classList.remove("is-selected"));
    return;
  }

  const stateInfo = availability(variant);
  const buyInfo = purchaseState(variant);
  image.src = asset(variant.image || product.mainImage || product.imagen);
  image.alt = `${product.nombre} - ${variant.colorName}`;
  price.textContent = money.format(variant.precioPublico ?? product.precioPublico);
  variantStock.textContent = buyInfo.label;
  addToCartButton.disabled = !buyInfo.canAdd;
  addToCartButton.textContent = stateInfo.canBuy ? (buyInfo.reached ? "Stock alcanzado" : "Agregar al carrito") : "Agotado";
  sendWhatsapp.href = stateInfo.canBuy ? whatsappUrl(1) : "#";
  sendWhatsapp.classList.toggle("disabled", !stateInfo.canBuy);
  variantOptions.querySelectorAll(".variant-option").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.variantId === variant.id);
  });
}
if (!product) {
  window.location.href = "../#productos";
} else {
  document.title = `${product.nombre} | VYÓRE`;
  category.textContent = product.categoria;
  nameNode.textContent = product.nombre;
  price.textContent = money.format(product.precioPublico);
  description.textContent = product.descripcion;
  fabric.textContent = product.tela;
  sizes.textContent = product.tallas.length ? product.tallas.join(" / ") : "Por confirmar";
  detail.textContent = product.detalle;
  renderVariants();
  syncVariant();
  renderHeaderCartCount();
}

productMenuToggle?.addEventListener("click", toggleProductMenu);
productMenuBackdrop?.addEventListener("click", closeProductMenu);
productMainNav?.addEventListener("click", closeProductMenu);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProductMenu();
});

addToCartButton.addEventListener("click", () => {
  const variant = selectedVariant();
  const stateInfo = availability(variant);
  if (!stateInfo.canBuy) return;
  const cart = loadCart();
  const key = cartKey(product.id, variant.id);
  const record = cart[key] || cart[`${product.id}::${variant.id}`];
  const current = typeof record === "number" ? record : Number(record?.quantity ?? record?.cantidad ?? 0) || 0;
  const stock = parseStock(variant.stock);
  if (stock !== null && current >= stock) {
    showToast("Stock máximo de este color");
    syncVariant();
    return;
  }
  const next = current + 1;
  cart[key] = {
    sku: variant.sku || null,
    productId: variant.skuProductId || product.id,
    modelId: product.id,
    variantId: variant.id,
    colorId: variant.id,
    quantity: stock === null ? next : Math.min(next, stock),
  };
  saveCart(cart);
  renderHeaderCartCount();
  syncVariant();
});
