const STORAGE_KEYS = {
  cart: "vyore_cart",
  adminProducts: "vyore_admin_products",
};

let META = window.VYORE_CATALOG_META || {};
let BASE_PRODUCTS = Array.isArray(window.PRODUCTOS_VYORE) ? window.PRODUCTOS_VYORE : [];
let CATALOG_SOURCE = "fallback";
let SKU_PRODUCTS = [];
let PRODUCTS = [];

const state = { cart: loadCart() };

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const cartPageItems = document.querySelector("#cartPageItems");
const template = document.querySelector("#cartRowTemplate");
const subtotalAmount = document.querySelector("#subtotalAmount");
const cartTotal = document.querySelector("#cartTotal");
const sendWhatsapp = document.querySelector("#sendWhatsapp");

function notify(options) {
  if (window.VyoreAlert) return window.VyoreAlert.fire(options);
  window.alert(`${options.title || "Aviso"}\n${options.text || ""}`);
  return Promise.resolve(true);
}

function askConfirm(options) {
  if (window.VyoreAlert) return window.VyoreAlert.confirm(options);
  return Promise.resolve(window.confirm(`${options.title || "Confirmar"}\n${options.text || ""}`));
}

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

  const match = currentImage.match(/blusa-suplex-amarre-(0[1-6])-(azul|beige|marron|rosado|rojo|verde|negro)\.(jpg|png)$/);
  let nextImage = currentImage;
  if (match) {
    const color = match[2] === "marron" ? "rosado" : match[2];
    nextImage = `assets/productos/vyore/variantes/blusa-suplex-amarre/blusa-suplex-amarre-${match[1]}-${color}.png`;
  }

  const originalId = String(variant.id || "");
  const originalName = String(variant.colorName || variant.nombre || "");
  const isRosado = originalId === "marron" || originalName === "Marrón" || /blusa-suplex-amarre-03-(marron|rosado)\.(jpg|png)$/.test(currentImage);
  return {
    ...variant,
    id: isRosado ? "rosado" : variant.id,
    colorName: isRosado ? "Rosado" : variant.colorName,
    colorHex: isRosado ? "#C98A9B" : variant.colorHex,
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
    return id === target.id || name === target.id;
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
      id: "rosado",
      colorName: "Rosado",
      colorHex: "#B8756A",
      image: "assets/productos/vyore/variantes/olimpico-suplex/olimpico-suplex-06-rosado.png",
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
    return id === target.id || name === target.id;
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
  const base = {
    ...product,
    id: product.id || slugify(product.nombre || product.name),
    slug: product.slug || slugify(product.nombre || product.name),
    sku: product.sku || product.id || slugify(product.nombre || product.name),
    nombre: product.nombre || product.name || "Producto VYÓRE",
    categoria: product.categoria || product.category || "Blusas y tops",
    precio: price,
    precioPublico: price,
    mainImage: product.mainImage || product.imagen || product.image || "assets/vyore/isotipo-vyore.png",
    imagen: product.imagen || product.mainImage || product.image || "assets/vyore/isotipo-vyore.png",
    active: product.active !== false,
  };
  const rawVariants = Array.isArray(product.variantes) ? product.variantes : Array.isArray(product.variants) ? product.variants : [];
  base.variantes = rawVariants.length
    ? rawVariants.map((variant) => normalizeVariant(variant, base))
    : [normalizeVariant({ id: "color-por-confirmar", image: base.mainImage, pending: true }, base)];
  return base;
}

function loadAdminProducts() {
  if (CATALOG_SOURCE === "supabase") return [];
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

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === id || product.slug === id);
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

function imagePath(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("../")) return path;
  return `../${path}`;
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
    const product = getProduct(record.productId || fallbackProductId);
    if (!product) return null;
    const variant = getVariant(product, record.variantId || fallbackVariantId);
    if (!variant) return null;
    const stock = parseStock(variant.stock);
    const requested = Math.max(1, Math.floor(Number(record.quantity ?? record.cantidad ?? 1) || 1));
    const quantity = stock === null ? requested : Math.min(requested, Math.max(1, stock));
    const availability = variantAvailability(variant);
    return {
      key,
      product,
      variant,
      quantity,
      available: availability.canBuy,
      availability,
      price: product.precioPublico,
    };
  }).filter(Boolean);
}

function purchasableItems() {
  return cartItems().filter((item) => item.available);
}

function calculateTotals(items = purchasableItems()) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { subtotal, total: subtotal };
}

function updateItem(key, quantity) {
  const item = cartItems().find((entry) => entry.key === key);
  if (!item) return;
  const stock = parseStock(item.variant.stock);
  const next = Math.max(1, Math.floor(quantity || 1));
  state.cart[key] = {
    sku: item.variant.sku || item.skuProduct?.sku || null,
    productId: item.variant.skuProductId || item.skuProduct?.id || item.product.id,
    modelId: item.product.id,
    variantId: item.variant.id,
    colorId: item.variant.id,
    quantity: stock === null ? next : Math.min(next, Math.max(1, stock)),
  };
  saveCart();
  render();
}

async function removeItem(key) {
  const item = cartItems().find((entry) => entry.key === key);
  const ok = await askConfirm({
    type: "warning",
    title: "Eliminar prenda",
    text: item ? `Quitar ${item.product.nombre} del carrito.` : "Quitar esta prenda del carrito.",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
  });
  if (!ok) return;
  delete state.cart[key];
  saveCart();
  render();
  notify({ type: "success", title: "Carrito actualizado", text: "La prenda fue retirada." });
}

function renderItems(items) {
  cartPageItems.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("section");
    empty.className = "cart-page-empty";
    empty.innerHTML = `<h2>Tu carrito está vacío</h2><p>Elige una prenda del catálogo VYÓRE.</p><a class="btn primary" href="../#productos">Ver productos</a>`;
    cartPageItems.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "cart-table-head";
  header.innerHTML = `<span>Producto</span><span>Precio</span><span>Cantidad</span><span>Total</span><span></span>`;
  cartPageItems.appendChild(header);

  items.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".cart-product-image");
    const stateText = node.querySelector(".cart-product-state");
    const minus = node.querySelector(".qty-minus");
    const plus = node.querySelector(".qty-plus");
    const remove = node.querySelector(".cart-product-remove");
    const stock = parseStock(item.variant.stock);

    node.classList.toggle("is-unavailable", !item.available);
    image.src = imagePath(item.variant.image || item.product.mainImage || item.product.imagen);
    image.alt = `${item.product.nombre} - ${item.variant.colorName}`;
    node.querySelector(".cart-product-sku").textContent = `${item.variant.sku || item.skuProduct?.sku || item.product.sku} · ${item.variant.colorName}`;
    node.querySelector("h3").textContent = item.product.nombre;
    node.querySelector(".cart-product-variant").textContent = `Color: ${item.variant.colorName}`;
    stateText.textContent = item.available ? item.availability.label : "No disponible para pedido";
    stateText.className = `cart-product-state ${item.availability.key}`;
    node.querySelector(".cart-product-price").textContent = item.available ? money.format(item.price) : "--";
    node.querySelector(".qty-value").textContent = item.quantity;
    node.querySelector(".cart-product-subtotal").textContent = item.available ? money.format(item.price * item.quantity) : "--";

    minus.disabled = !item.available || item.quantity <= 1;
    plus.disabled = !item.available || (stock !== null && item.quantity >= stock);
    minus.addEventListener("click", () => updateItem(item.key, item.quantity - 1));
    plus.addEventListener("click", () => updateItem(item.key, item.quantity + 1));
    remove.addEventListener("click", () => removeItem(item.key));

    cartPageItems.appendChild(node);
  });
}

function whatsappMessage(items, totals) {
  const lines = [
    "Hola VYÓRE, quiero consultar/realizar este pedido:",
    "",
    ...items.map((item, index) => [
      `${index + 1}. ${item.product.nombre}`,
      `   SKU: ${item.variant.sku || item.skuProduct?.sku || item.product.sku}`,
      `   Color: ${item.variant.colorName}`,
      `   Cantidad: ${item.quantity}`,
      `   Precio: ${money.format(item.price)}`,
      `   Subtotal: ${money.format(item.price * item.quantity)}`,
    ].join("\n")),
    "",
    `Total: ${money.format(totals.total)}`,
    "",
    "¿Me confirman disponibilidad y método de pago?",
  ];
  return lines.join("\n");
}

function whatsappUrl(items, totals) {
  const number = META.whatsappPrimary || "51938807320";
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(items, totals))}`;
}
function renderSummary(totals, availableItems) {
  subtotalAmount.textContent = money.format(totals.subtotal);
  cartTotal.textContent = money.format(totals.total);
  const canContinue = availableItems.length > 0;
  sendWhatsapp.classList.toggle("disabled", !canContinue);
  sendWhatsapp.href = canContinue ? whatsappUrl(availableItems, totals) : "#";
  sendWhatsapp.textContent = canContinue ? `Enviar por WhatsApp (${availableItems.length})` : "Enviar por WhatsApp";
}

function render() {
  const items = cartItems();
  const availableItems = items.filter((item) => item.available);
  const totals = calculateTotals(availableItems);
  renderItems(items);
  renderSummary(totals, availableItems);
}

sendWhatsapp.addEventListener("click", (event) => {
  if (!purchasableItems().length) {
    event.preventDefault();
    notify({ type: "warning", title: "Carrito vacío", text: "Agrega prendas disponibles para continuar." });
  }
});

async function bootstrapCart() {
  const fallbackProducts = Array.isArray(window.PRODUCTOS_VYORE) ? window.PRODUCTOS_VYORE : BASE_PRODUCTS;
  if (window.VyoreSupabase?.resolveCatalog) {
    const catalog = await window.VyoreSupabase.resolveCatalog({ fallbackProducts });
    BASE_PRODUCTS = catalog.baseProducts;
    SKU_PRODUCTS = catalog.skuProducts;
    PRODUCTS = catalog.products;
    CATALOG_SOURCE = catalog.source;
    META = { ...META, ...(catalog.meta || {}) };
  } else {
    SKU_PRODUCTS = window.VyoreCatalog
      ? window.VyoreCatalog.mergeCatalog(BASE_PRODUCTS, loadAdminProducts()).filter((item) => item.active !== false)
      : mergeProducts(BASE_PRODUCTS, loadAdminProducts()).filter((item) => item.active !== false);
    PRODUCTS = window.VyoreCatalog ? window.VyoreCatalog.groupProducts(SKU_PRODUCTS) : SKU_PRODUCTS;
  }
  render();
}

bootstrapCart();
