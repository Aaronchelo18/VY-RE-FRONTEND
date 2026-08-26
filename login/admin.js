const PRODUCT_KEY = "vyore_admin_products";
const META_KEY = "vyore_admin_meta";
const AUTH_SESSION_KEY = "vyore_admin_session";
const SIDEBAR_STATE_KEY = "vyore_admin_sidebar_collapsed";
const AUTH_LEGACY_KEY = "vyore_admin_auth_legacy";
const AUTH_SESSION_MS = 1000 * 60 * 60 * 8;
const AUTH_USERS = [
  {
    username: "admin",
    displayName: "Jozef Aar\u00f3n L\u00f3pez D\u00edaz",
    role: "Administrador",
    passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    active: true,
  },
];

const baseMeta = window.VYORE_CATALOG_META || {};
const baseProducts = Array.isArray(window.PRODUCTOS_VYORE) ? window.PRODUCTOS_VYORE : [];
const REFERENCE_IMAGE_TOKEN = "IMAGENES-REFERENCIALES/";
const PLACEHOLDER_COLOR_IDS = new Set(["color-por-confirmar", "por-confirmar"]);

function colorSlug(value) {
  return slugify(String(value || ""));
}

function hasPlaceholderColor(...values) {
  const slugs = values.map(colorSlug).filter(Boolean);
  return !slugs.length || slugs.some((item) => PLACEHOLDER_COLOR_IDS.has(item));
}

function isReferenceImagePath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");
  return Boolean(window.VyoreCatalog?.isReferenceImage?.(path) || path.includes(REFERENCE_IMAGE_TOKEN));
}

function isReferenceOnlyRecord(record = {}) {
  if (!record || typeof record !== "object") return false;
  const image = record.imagen || record.image || record.variantImage || "";
  return isReferenceImagePath(image) || hasPlaceholderColor(record.colorId, record.colorName, record.color, record.nombreColor);
}
const baseCatalogProducts = cleanProductList(mergeCatalogRecords(baseProducts, []), { includeInactive: true });
const baseProductKeys = new Set(baseCatalogProducts.map(productIdentityKey));
sanitizeStoredProducts();
let deletedProducts = loadDeletedProducts();
let products = loadAdminCatalog();
let rowSnapshots = new Map();
let search = "";
let dirty = false;
let activeView = "productos";
let activeSession = null;
let adminCatalogSource = "fallback";
let remoteCatalogMeta = null;

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const loginForm = document.querySelector("#loginForm");
const authPanel = document.querySelector("#authPanel");
const authStatus = document.querySelector("#authStatus");
const adminPasswordInput = document.querySelector("#adminPassword");
const togglePassword = document.querySelector("#togglePassword");
const loginError = document.querySelector("#loginError");
const adminSearch = document.querySelector("#adminSearch");
const productRows = document.querySelector("#productRows");
const adminMeta = document.querySelector("#adminMeta");
const totalProducts = document.querySelector("#totalProducts");
const withStock = document.querySelector("#withStock");
const soldOut = document.querySelector("#soldOut");
const categoryCount = document.querySelector("#categoryCount");
const productForm = document.querySelector("#productForm");
const clearProductForm = document.querySelector("#clearProductForm");
const categoryOptions = document.querySelector("#categoryOptions");
const profileInitial = document.querySelector("#profileInitial");
const profileImage = document.querySelector("#profileImage");
const profileUser = document.querySelector("#profileUser");
const profileRole = document.querySelector("#profileRole");
const adminViewTitle = document.querySelector("#adminViewTitle");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarToggleTop = document.querySelector("#sidebarToggleTop");
const accordionSidebar = document.querySelector("#accordionSidebar");

function notify(options) {
  if (window.VyoreAlert) return window.VyoreAlert.fire(options);
  window.alert(`${options.title || "Aviso"}\n${options.text || ""}`);
  return Promise.resolve(true);
}

function askConfirm(options) {
  if (window.VyoreAlert) return window.VyoreAlert.confirm(options);
  return Promise.resolve(window.confirm(`${options.title || "Confirmar"}\n${options.text || ""}`));
}
function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showAuthLoading(message = "Validando usuario y permisos...") {
  document.body.classList.remove("admin-mode");
  document.body.classList.add("login-mode");
  loginPanel.hidden = true;
  adminPanel.hidden = true;
  authPanel.hidden = false;
  authStatus.textContent = message;
}
function authUserKey(value) {
  return String(value || "").trim().toLowerCase();
}

async function hashText(value) {
  if (!window.crypto?.subtle) throw new Error("La verificaci\u00f3n segura no est\u00e1 disponible en este navegador.");
  const bytes = new TextEncoder().encode(String(value));
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function verifyCredentials(username, password) {
  if (window.VyoreSupabase?.isConfigured?.() && String(username || "").includes("@")) {
    const authUser = await window.VyoreSupabase.signIn(username, password);
    return {
      username: authUser.email || username,
      displayName: authUser.user_metadata?.display_name || authUser.email || username,
      role: authUser.user_metadata?.role || "Administrador",
      provider: "supabase",
    };
  }

  const user = AUTH_USERS.find((item) => item.active && authUserKey(item.username) === authUserKey(username));
  if (!user) return null;
  const passwordHash = await hashText(password);
  return passwordHash === user.passwordHash ? { ...user, provider: "local" } : null;
}

function randomToken() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    window.crypto.getRandomValues(values);
    return Array.from(values).map((value) => value.toString(16).padStart(8, "0")).join("");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function createSession(user) {
  const now = Date.now();
  return {
    token: randomToken(),
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role || "Administrador",
    provider: user.provider || "local",
    issuedAt: now,
    expiresAt: now + AUTH_SESSION_MS,
  };
}

function saveSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(AUTH_LEGACY_KEY);
  activeSession = session;
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_LEGACY_KEY);
  activeSession = null;
}

function loadSession() {
  localStorage.removeItem(AUTH_LEGACY_KEY);
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    if (!session || !session.token || !session.username || !session.expiresAt) return null;
    const isSupabaseSession = session.provider === "supabase" && window.VyoreSupabase?.isConfigured?.();
    const user = AUTH_USERS.find((item) => item.active && item.username === session.username);
    if ((!isSupabaseSession && !user) || Number(session.expiresAt) <= Date.now()) {
      clearSession();
      return null;
    }
    activeSession = session;
    return session;
  } catch {
    clearSession();
    return null;
  }
}

function requireSession(showExpiredMessage = false) {
  const session = loadSession();
  if (session) return session;
  showLogin();
  if (showExpiredMessage) notify({ type: "warning", title: "Sesi\u00f3n vencida", text: "Ingresa nuevamente para continuar." });
  return null;
}

function showLogin() {
  document.body.classList.remove("admin-mode");
  document.body.classList.add("login-mode");
  adminPanel.hidden = true;
  authPanel.hidden = true;
  loginPanel.hidden = false;
}

function storedSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  } catch {
    return false;
  }
}

function setSidebarCollapsed(collapsed, persist = true) {
  const isCollapsed = Boolean(collapsed);
  document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  document.body.classList.toggle("sidebar-toggled", isCollapsed);
  accordionSidebar?.classList.toggle("toggled", isCollapsed);
  [sidebarToggle, sidebarToggleTop].forEach((toggle) => {
    if (!toggle) return;
    const expanded = !isCollapsed;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Contraer men\u00fa" : "Expandir men\u00fa");
    toggle.title = expanded ? "Contraer men\u00fa" : "Expandir men\u00fa";
    const icon = toggle.querySelector("i");
    if (toggle === sidebarToggle && icon) {
      icon.classList.toggle("fa-angle-left", expanded);
      icon.classList.toggle("fa-angle-right", !expanded);
    }
  });
  if (!persist) return;
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, isCollapsed ? "true" : "false");
  } catch {
    // La preferencia visual es opcional.
  }
}

function persistSidebarStateFromTemplate() {
  window.setTimeout(() => {
    const collapsed = Boolean(accordionSidebar?.classList.contains("toggled") || document.body.classList.contains("sidebar-toggled"));
    setSidebarCollapsed(collapsed, true);
  }, 0);
}

function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";
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

function normalizeVariant(variant = {}, product = {}) {
  const colorName = variant.colorName || variant.nombre || variant.color || "Color disponible";
  const id = slugify(variant.id || colorName);
  const stock = parseStock(variant.stock);
  const image = variant.image || variant.imagen || product.mainImage || product.imagen || "assets/vyore/isotipo-vyore.png";
  return {
    ...variant,
    id,
    colorId: variant.colorId || id,
    colorName,
    colorHex: variant.colorHex || variant.hex || "#817A75",
    image,
    imagen: image,
    stock,
    active: variant.active !== false,
    pending: Boolean(variant.pending || variant.stock === null || variant.stock === undefined || variant.stock === ""),
  };
}

function migrateBlusaSuplexAmarreVariant(variant = {}, product = {}, image = "") {
  return { ...variant, image: variant.image || variant.imagen || image };
}

function migrateBlusaSuplexProduct(product = {}) {
  return product;
}

function migrateSuplexLazzoDobleForroProduct(product = {}) {
  return product;
}

function migrateOlimpicoSuplexProduct(product = {}) {
  return product;
}

function productStockSummary(product = {}) {
  const variants = Array.isArray(product.variantes) ? product.variantes : [];
  const stockValues = variants.length ? variants.map((variant) => parseStock(variant.stock)) : [parseStock(product.stock)];
  const hasKnown = stockValues.some((stock) => stock !== null);
  const hasUnknown = stockValues.some((stock) => stock === null);
  const total = stockValues.reduce((sum, stock) => sum + (stock || 0), 0);
  const explicitStatus = product.disponibilidad || product.estado || "consultar";
  let disponibilidad = explicitStatus;

  if (hasKnown && total === 0 && !hasUnknown) disponibilidad = "agotado";
  else if (hasKnown && total <= 2) disponibilidad = "bajo";
  else if (hasKnown) disponibilidad = "disponible";
  else if (explicitStatus === "agotado") disponibilidad = "agotado";

  return {
    stock: hasUnknown ? null : total,
    total,
    disponibilidad,
    hasUnknown,
  };
}

function stockSummaryLabel(summary = {}) {
  if (summary.hasUnknown || summary.stock === null || summary.stock === undefined) return "Cantidades por confirmar";
  return `Total: ${summary.total || 0}`;
}

function canFeatureProduct(product = {}) {
  const summary = productStockSummary(product);
  return product.active !== false && summary.disponibilidad !== "agotado" && parseStock(product.stock) !== 0;
}

function syncFeaturedEligibility(row, product) {
  const checkbox = row?.querySelector("[data-field='destacado']");
  const canFeature = canFeatureProduct(product);
  if (!canFeature) {
    product.destacado = false;
    product.featured = false;
  }
  if (!checkbox) return;
  checkbox.disabled = !canFeature;
  checkbox.checked = Boolean(product.destacado);
  checkbox.title = canFeature ? "Mostrar esta prenda en destacados" : "No se puede destacar una prenda agotada";
}

function adminAsset(value) {
  const asset = String(value || "").trim().replace(/\\/g, "/");
  if (!asset) return "../assets/vyore/isotipo-vyore.png";
  if (/^(https?:|data:|blob:|\/)/i.test(asset)) return asset;
  if (asset.startsWith("../")) return asset;
  return `../${asset.replace(/^\.\//, "")}`;
}

function normalizeProduct(product) {
  if (window.VyoreCatalog) return window.VyoreCatalog.normalizeSkuProduct(product);
  product = migrateBlusaSuplexProduct(product);
  product = migrateSuplexLazzoDobleForroProduct(product);
  product = migrateOlimpicoSuplexProduct(product);
  const precioPublico = toNumber(product.precioPublico ?? product.precio, 0);
  const precioAlumno = toNumber(product.precioAlumno, precioPublico);
  const isFeatured = Boolean(product.destacado ?? product.featured);
  const image = product.imagen || product.mainImage || product.image || "assets/vyore/isotipo-vyore.png";
  const rawVariants = Array.isArray(product.variantes) ? product.variantes : Array.isArray(product.variants) ? product.variants : [];
  const variantes = rawVariants.map((variant) => normalizeVariant(variant, { imagen: image, mainImage: product.mainImage || image }));
  const summary = productStockSummary({ ...product, variantes });
  const disponibilidad = summary.disponibilidad === "agotado" ? "agotado" : product.disponibilidad || summary.disponibilidad;
  const id = product.id || slugify(product.nombre || product.sku || "producto");
  return {
    id,
    slug: product.slug || id,
    sku: product.sku || id,
    nombre: product.nombre || "",
    categoria: product.categoria || "Sin categor\u00eda",
    descripcion: product.descripcion || product.description || "",
    tela: product.tela || product.fabric || "",
    detalle: product.detalle || product.detail || "",
    tallas: Array.isArray(product.tallas) ? product.tallas : Array.isArray(product.sizes) ? product.sizes : [],
    precio: precioPublico,
    precioPublico,
    precioAlumno,
    stock: summary.stock,
    disponibilidad,
    imagen: image,
    mainImage: product.mainImage || image,
    destacado: isFeatured,
    featured: isFeatured,
    nuevo: Boolean(product.nuevo ?? product.newArrival),
    newArrival: Boolean(product.newArrival ?? product.nuevo),
    active: product.active !== false,
    variantes,
    actualizadoPrecios: product.actualizadoPrecios || baseMeta.actualizadoPrecios || "2026-07-09",
    actualizadoStock: product.actualizadoStock || null,
  };
}

function loadStoredProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRODUCT_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function loadStoredMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

function expandAdminRecord(record = {}) {
  if (!record || typeof record !== "object") return [];
  if (window.VyoreCatalog?.expandRecord) return window.VyoreCatalog.expandRecord(record);
  return [normalizeProduct(record)];
}

function productIdentityKey(product = {}) {
  const normalized = product.modelId && product.colorId ? product : normalizeProduct(product);
  const modelId = slugify(normalized.modelId || normalized.modelSlug || normalized.modelName || normalized.nombre || normalized.id || normalized.sku);
  const colorId = slugify(normalized.colorId || normalized.colorName || normalized.color || normalized.id || normalized.sku);
  return `${modelId}::${colorId}`;
}

function mergeProductRecord(current, incoming) {
  const normalized = normalizeProduct(incoming);
  if (!current) return normalized;
  return normalizeProduct({ ...current, ...normalized });
}

function cleanProductList(records = [], options = {}) {
  const includeInactive = options.includeInactive === true;
  const merged = new Map();
  records.flatMap(expandAdminRecord).forEach((record) => {
    if (isReferenceOnlyRecord(record)) return;
    const normalized = normalizeProduct(record);
    if (isReferenceOnlyRecord(normalized)) return;
    const key = productIdentityKey(normalized);
    merged.set(key, mergeProductRecord(merged.get(key), normalized));
  });
  return Array.from(merged.values()).filter((product) => includeInactive || product.active !== false);
}
function mergeCatalogRecords(base, stored) {
  if (window.VyoreCatalog?.mergeCatalog) return window.VyoreCatalog.mergeCatalog(base, stored);
  return mergeProducts(base.map(normalizeProduct), stored);
}

function mergeProducts(base, stored) {
  return cleanProductList([...(base || []), ...(stored || [])], { includeInactive: true });
}

function loadDeletedProducts() {
  return cleanProductList(loadStoredProducts().filter((product) => normalizeProduct(product).active === false), { includeInactive: true });
}

function loadAdminCatalog() {
  return cleanProductList(mergeCatalogRecords(baseProducts, loadStoredProducts()), { includeInactive: false });
}

function sanitizeStoredProducts() {
  const stored = loadStoredProducts();
  if (!stored.length) return;
  const cleaned = cleanProductList(stored, { includeInactive: true });
  const before = JSON.stringify(stored.map((product) => normalizeProduct(product)));
  const after = JSON.stringify(cleaned);
  if (before === after) return;
  try {
    localStorage.setItem(PRODUCT_KEY, after);
  } catch {
    // Si el navegador bloquea storage, el admin igual renderiza la lista limpia en memoria.
  }
}

function formatDate(isoDate) {
  if (!isoDate) return "por confirmar";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function hydrateAdminCatalog() {
  if (!window.VyoreSupabase?.isConfigured?.()) {
    adminCatalogSource = "fallback";
    remoteCatalogMeta = null;
    return;
  }

  try {
    authStatus.textContent = "Cargando cat\u00e1logo desde Supabase...";
    const remote = await window.VyoreSupabase.loadProducts({ includeInactive: true });
    const expanded = cleanProductList(remote.products || [], { includeInactive: true });
    products = expanded.filter((product) => product.active !== false);
    deletedProducts = expanded.filter((product) => product.active === false);
    remoteCatalogMeta = remote.meta || null;
    adminCatalogSource = "supabase";
    rowSnapshots.clear();
    dirty = false;
  } catch (error) {
    adminCatalogSource = "fallback";
    remoteCatalogMeta = null;
    notify({
      type: "warning",
      title: "Supabase no respondi\u00f3",
      text: "Se carg\u00f3 el inventario local de respaldo.",
    });
  }
}

async function showAdmin() {
  const session = activeSession || requireSession();
  if (!session) return;
  await hydrateAdminCatalog();
  document.body.classList.remove("login-mode");
  document.body.classList.add("admin-mode");
  setSidebarCollapsed(storedSidebarCollapsed(), false);
  loginPanel.hidden = true;
  authPanel.hidden = true;
  adminPanel.hidden = false;
  profileUser.textContent = session.displayName || session.username;
  profileRole.textContent = session.role || "Administrador";
  profileInitial.textContent = (session.displayName || session.username).slice(0, 1).toUpperCase();
  profileImage?.addEventListener("error", () => profileImage.closest(".profile-avatar")?.classList.add("image-error"), { once: true });
  setView(activeView);
  renderMeta();
  renderRows();
  renderCategoryOptions();
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".sidebar-link").forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("active", isActive);
    button.closest(".nav-item")?.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const isActive = panel.dataset.viewPanel === view;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
  adminViewTitle.textContent = view === "ventas" ? "Ventas" : "Productos";
}

function renderMeta() {
  const storedMeta = adminCatalogSource === "supabase" ? remoteCatalogMeta || {} : loadStoredMeta();
  const priceDate = storedMeta.actualizadoPrecios || baseMeta.actualizadoPrecios || "2026-07-09";
  const stockDate = storedMeta.actualizadoStock || baseMeta.actualizadoStock;
  adminMeta.textContent = `Actualizado: ${formatDate(priceDate)} \u00b7 Stock: ${formatDate(stockDate)}`;
}

function renderStats() {
  totalProducts.textContent = products.length;
  withStock.textContent = products.filter((product) => (productStockSummary(product).total || 0) > 0).length;
  soldOut.textContent = products.filter((product) => productStockSummary(product).disponibilidad === "agotado").length;
  if (categoryCount) categoryCount.textContent = categories().length;
}

function filteredProducts() {
  const query = normalize(search);
  if (!query) return products;
  return products.filter((product) => normalize(`${product.sku} ${product.nombre} ${product.modelName || ""} ${product.colorName || ""} ${product.categoria}`).includes(query));
}

function renderRows() {
  productRows.innerHTML = "";
  const rows = filteredProducts();
  if (!rows.length) productRows.appendChild(renderEmptyRow());
  else rows.forEach((product) => productRows.appendChild(renderProductRow(product)));
  renderStats();
  renderCategoryOptions();
}

function renderEmptyRow() {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 9;
  cell.className = "inventory-empty";
  cell.textContent = search ? "No hay prendas que coincidan con la b\u00fasqueda." : "No hay prendas activas en el inventario.";
  row.appendChild(cell);
  return row;
}
function renderCategoryOptions() {
  const values = categories();
  categoryOptions.innerHTML = "";
  values.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    categoryOptions.appendChild(option);
  });

  const createCategory = document.querySelector("#newProductCategory");
  if (createCategory?.tagName !== "SELECT") return;
  const current = createCategory.value;
  createCategory.innerHTML = "";
  values.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = label(category);
    createCategory.appendChild(option);
  });
  if (current && values.includes(current)) createCategory.value = current;
  else createCategory.value = values[0] || "";
}

function formatMoney(value) {
  return `S/ ${toNumber(value, 0).toFixed(2)}`;
}

function imageNode(product, className = "product-thumb") {
  const image = document.createElement("img");
  image.className = className;
  image.src = adminAsset(product.imagen);
  image.alt = product.nombre || "Producto";
  image.addEventListener("error", () => {
    if (!image.src.includes("isotipo-vyore.png")) image.src = "../assets/vyore/isotipo-vyore.png";
  });
  return image;
}

function renderStockCell(product, isEditing) {
  const stockCell = document.createElement("td");
  if (!isEditing) {
    stockCell.innerHTML = `<span class="stock-readonly">${product.stock ?? "--"}</span>`;
    return stockCell;
  }
  const stockInput = input("number", product.stock ?? "", "stock");
  stockInput.className = "stock-input";
  stockInput.min = "0";
  stockInput.placeholder = "--";
  stockCell.appendChild(stockInput);
  return stockCell;
}

function renderSkuCell(product, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const skuInput = input("text", product.sku, "sku");
    skuInput.className = "stock-input";
    cell.appendChild(skuInput);
    return cell;
  }
  cell.innerHTML = `<strong class="sku-code">${product.sku || product.id}</strong>`;
  return cell;
}
function renderImageCell(product, isEditing) {
  const cell = document.createElement("td");
  cell.className = "image-cell";
  const wrap = document.createElement("div");
  wrap.className = `image-editor${isEditing ? "" : " readonly image-only"}`;
  const preview = imageNode(product);
  if (!isEditing) {
    preview.title = product.imagen || "Sin imagen";
    wrap.appendChild(preview);
    cell.appendChild(wrap);
    return cell;
  }
  const imageInput = input("text", product.imagen, "imagen");
  imageInput.className = "image-input";
  imageInput.addEventListener("input", () => {
    preview.src = adminAsset(imageInput.value);
  });
  wrap.append(preview, imageInput);
  cell.appendChild(wrap);
  return cell;
}
function renderNameCell(product, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const nameInput = input("text", product.nombre, "nombre");
    nameInput.className = "name-input";
    cell.appendChild(nameInput);
    return cell;
  }
  cell.innerHTML = `<strong class="product-name-readonly">${product.nombre || "Sin nombre"}</strong>`;
  return cell;
}

function renderColorCell(product, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const colorWrap = document.createElement("div");
    colorWrap.className = "color-editor";
    const colorSwatch = document.createElement("input");
    colorSwatch.type = "color";
    colorSwatch.value = product.colorHex || "#817A75";
    colorSwatch.dataset.field = "colorHex";
    colorSwatch.addEventListener("input", (event) => updateProduct(event.target));
    const colorInput = input("text", product.colorName || "", "colorName");
    colorInput.className = "color-input";
    colorWrap.append(colorSwatch, colorInput);
    cell.appendChild(colorWrap);
    return cell;
  }
  const wrap = document.createElement("div");
  wrap.className = "color-display";
  const dot = document.createElement("span");
  dot.className = "color-dot";
  dot.style.backgroundColor = product.colorHex || "#817A75";
  const name = document.createElement("strong");
  name.textContent = product.colorName || "Sin color";
  wrap.append(dot, name);
  cell.appendChild(wrap);
  return cell;
}

function renderCategoryCell(product, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const categoryControl = categories().length > 1 ? select("categoria", categories(), product.categoria) : input("text", product.categoria, "categoria");
    categoryControl.className = "category-input";
    cell.appendChild(categoryControl);
    return cell;
  }
  cell.innerHTML = `<span class="category-pill">${label(product.categoria)}</span>`;
  return cell;
}

function renderPriceCell(product, field, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const priceInput = input("number", product[field], field);
    priceInput.className = "price-input";
    priceInput.step = "0.10";
    priceInput.min = "0";
    cell.appendChild(priceInput);
    return cell;
  }
  cell.innerHTML = `<strong class="price-readonly">${formatMoney(product[field])}</strong>`;
  return cell;
}

function renderStatusCell(row, product, isEditing) {
  const cell = document.createElement("td");
  if (isEditing) {
    const statusSelect = select("disponibilidad", ["consultar", "disponible", "bajo", "agotado"], product.disponibilidad);
    syncStockStatus(row, product, statusSelect);
    cell.appendChild(statusSelect);
    return cell;
  }
  const status = productStockSummary(product).disponibilidad;
  cell.innerHTML = `<span class="status-pill ${status}">${label(status)}</span>`;
  return cell;
}

function renderFeaturedCell(product, isEditing) {
  const cell = document.createElement("td");
  cell.className = "featured-cell";
  if (isEditing) {
    const featuredInput = input("checkbox", product.destacado, "destacado");
    cell.appendChild(featuredInput);
    return cell;
  }
  const isFeatured = Boolean(product.destacado);
  const labelText = isFeatured ? "S\u00ed" : "No";
  const iconStyle = isFeatured ? "fas" : "far";
  cell.innerHTML = `<span class="feature-badge${isFeatured ? " active" : ""}" title="${isFeatured ? "Destacado" : "No destacado"}"><i class="${iconStyle} fa-star" aria-hidden="true"></i><span>${labelText}</span></span>`;
  return cell;
}
function actionButton(kind, icon, text, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-action ${kind}`;
  button.title = text;
  button.setAttribute("aria-label", text);
  button.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span class="sr-only">${text}</span>`;
  button.addEventListener("click", handler);
  return button;
}
function renderActionsCell(product, isEditing) {
  const cell = document.createElement("td");
  cell.className = "actions-cell";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  if (isEditing) {
    actions.append(
      actionButton("save", "fa-check", "Guardar", () => saveProductRow(product.id)),
      actionButton("cancel", "fa-times", "Cancelar", () => cancelProductRow(product.id)),
    );
  } else {
    actions.append(
      actionButton("edit", "fa-pen", "Editar", () => beginRowEdit(product.id)),
      actionButton("delete", "fa-trash-alt", "Eliminar", () => deleteProductRow(product.id)),
    );
  }
  cell.appendChild(actions);
  return cell;
}

function renderProductRow(product) {
  const row = document.createElement("tr");
  const isEditing = rowSnapshots.has(product.id);
  row.dataset.id = product.id;
  row.className = isEditing ? "is-editing" : "";

  const cells = [
    ["SKU", renderSkuCell(product, isEditing)],
    ["Nombre", renderNameCell(product, isEditing)],
    ["Color", renderColorCell(product, isEditing)],
    ["Imagen", renderImageCell(product, isEditing)],
    ["Precio", renderPriceCell(product, "precioPublico", isEditing)],
    ["Stock", renderStockCell(product, isEditing)],
    ["Estado", renderStatusCell(row, product, isEditing)],
    ["Destacado", renderFeaturedCell(product, isEditing)],
    ["Acciones", renderActionsCell(product, isEditing)],
  ];

  cells.forEach(([labelText, cell]) => {
    cell.dataset.label = labelText;
    row.appendChild(cell);
  });

  if (isEditing) syncFeaturedEligibility(row, product);
  return row;
}
function input(type, value, field) {
  const el = document.createElement("input");
  el.type = type;
  el.dataset.field = field;
  if (type === "checkbox") {
    el.checked = Boolean(value);
  } else {
    el.value = value;
  }
  el.addEventListener(type === "checkbox" ? "change" : "input", (event) => updateProduct(event.target));
  return el;
}

function select(field, options, value) {
  const el = document.createElement("select");
  el.dataset.field = field;
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = label(option);
    item.selected = option === value;
    el.appendChild(item);
  });
  el.addEventListener("change", (event) => updateProduct(event.target));
  return el;
}

function categories() {
  const values = Array.from(new Set(products.map((product) => product.categoria).filter(Boolean)));
  if (!values.length) values.push("Blusas y tops");
  return values.sort((a, b) => a.localeCompare(b, "es"));
}

function label(value) {
  const labels = {
    Panaderia: "Panader\u00eda",
    consultar: "Consultar",
    disponible: "Disponible",
    bajo: "Bajo stock",
    agotado: "Agotado",
  };
  return labels[value] || value;
}

function syncStockStatus(row, product, statusSelect = row?.querySelector("select[data-field='disponibilidad']")) {
  const summary = productStockSummary(product);
  product.stock = summary.stock;
  if (!statusSelect) return;

  if (summary.disponibilidad === "agotado") {
    product.disponibilidad = "agotado";
    statusSelect.value = "agotado";
    statusSelect.disabled = true;
    return;
  }

  statusSelect.disabled = false;
  if (!product.disponibilidad || product.disponibilidad === "agotado") {
    product.disponibilidad = summary.disponibilidad;
  }
  statusSelect.value = product.disponibilidad;
}

function cloneProduct(product) {
  return JSON.parse(JSON.stringify(product));
}

function findProductById(id) {
  return products.find((item) => item.id === id);
}

function findDuplicateProduct(product, currentId = null) {
  const key = productIdentityKey(product);
  const sku = normalize(product.sku || "");
  return products.find((item) => {
    if (item.id === currentId) return false;
    return productIdentityKey(item) === key || (sku && normalize(item.sku || "") === sku);
  }) || null;
}

function validateProductRecord(product, currentId = null) {
  if (!String(product.sku || "").trim()) return "La prenda necesita SKU.";
  if (!String(product.nombre || "").trim()) return "La prenda necesita nombre.";
  if (!String(product.categoria || "").trim()) return "La prenda necesita categor\u00eda.";
  if (!String(product.colorName || product.color || product.nombreColor || "").trim()) return "La prenda necesita un color vendible.";
  if (hasPlaceholderColor(product.colorId, product.colorName, product.color, product.nombreColor)) return "La prenda necesita un color vendible.";
  if (isReferenceImagePath(product.imagen || product.image || product.variantImage)) return "Usa una imagen de variante vendible, no una imagen referencial del modelo.";
  if (!Number.isFinite(toNumber(product.precioPublico, NaN))) return "El precio p\u00fablico no es v\u00e1lido.";
  const duplicate = findDuplicateProduct(product, currentId);
  if (duplicate) return `Ya existe ${duplicate.nombre} en color ${duplicate.colorName || "registrado"}.`;
  return "";
}
function removeDeletedOverrideFor(product) {
  const key = productIdentityKey(product);
  deletedProducts = deletedProducts.filter((item) => productIdentityKey(item) !== key);
}

function upsertDeletedOverride(product) {
  const normalized = normalizeProduct({
    ...product,
    active: false,
    stock: 0,
    disponibilidad: "agotado",
    destacado: false,
    featured: false,
    actualizadoStock: todayIso(),
  });
  deletedProducts = deletedProducts.filter((item) => productIdentityKey(item) !== productIdentityKey(normalized));
  deletedProducts.push(normalized);
}

function beginRowEdit(id) {
  if (!requireSession(true)) return;
  const product = findProductById(id);
  if (!product || rowSnapshots.has(id)) return;
  rowSnapshots.set(id, cloneProduct(product));
  renderRows();
}

function saveProductRow(id) {
  if (!requireSession(true)) return;
  const product = findProductById(id);
  if (!product) return;
  const validation = validateProductRecord(product, id);
  if (validation) {
    notify({ type: "warning", title: "No se puede guardar", text: validation });
    return;
  }
  const index = products.findIndex((item) => item.id === id);
  const normalized = normalizeProduct(product);
  if (!canFeatureProduct(normalized)) {
    normalized.destacado = false;
    normalized.featured = false;
  }
  products[index] = normalized;
  products = cleanProductList(products, { includeInactive: false });
  removeDeletedOverrideFor(normalized);
  rowSnapshots.delete(id);
  dirty = true;
  renderRows();
}

function cancelProductRow(id) {
  const snapshot = rowSnapshots.get(id);
  if (!snapshot) return;
  const index = products.findIndex((item) => item.id === id);
  if (index !== -1) products[index] = snapshot;
  rowSnapshots.delete(id);
  renderRows();
}

async function deleteProductRow(id) {
  if (!requireSession(true)) return;
  const product = findProductById(id);
  if (!product) return;
  const ok = await askConfirm({
    type: "warning",
    title: "Eliminar prenda",
    text: `Quitar ${product.nombre} ${product.colorName || ""} del inventario visible.`,
    confirmText: "Eliminar",
    cancelText: "Cancelar",
  });
  if (!ok) return;

  if (adminCatalogSource === "supabase" || baseProductKeys.has(productIdentityKey(product))) upsertDeletedOverride(product);
  else removeDeletedOverrideFor(product);
  products = products.filter((item) => item.id !== id);
  rowSnapshots.delete(id);
  dirty = true;
  renderRows();
  notify({ type: "success", title: "Prenda eliminada", text: "La tienda dejar\u00e1 de mostrar esta prenda cuando guardes los cambios." });
}

function updateProduct(control) {
  const row = control.closest("tr");
  const product = products.find((item) => item.id === row.dataset.id);
  if (!product) return;

  const field = control.dataset.field;
  if (field === "nombre") {
    product.nombre = control.value;
    product.modelName = control.value;
    product.modelId = slugify(control.value || product.sku || product.id);
    product.modelSlug = product.modelId;
  } else if (field === "precioPublico" || field === "precioAlumno") {
    product[field] = toNumber(control.value, 0);
    product.precio = product.precioPublico;
    product.actualizadoPrecios = todayIso();
  } else if (field === "stock") {
    product.stock = parseStock(control.value);
    product.actualizadoStock = todayIso();
    syncStockStatus(row, product);
    syncFeaturedEligibility(row, product);
  } else if (field === "variantStock") {
    const variant = product.variantes?.find((item) => item.id === control.dataset.variantId);
    if (!variant) return;
    variant.stock = parseStock(control.value);
    variant.pending = control.value === "";
    const summary = productStockSummary(product);
    product.stock = summary.stock;
    product.disponibilidad = summary.disponibilidad;
    product.actualizadoStock = todayIso();
    const summaryNode = row.querySelector(".variant-stock-summary");
    if (summaryNode) summaryNode.textContent = stockSummaryLabel(summary);
    syncStockStatus(row, product);
  } else if (field === "modelName") {
    product.modelName = control.value;
    product.modelId = slugify(control.value || product.nombre);
    product.modelSlug = product.modelId;
  } else if (field === "colorName") {
    product.colorName = control.value;
    product.colorId = slugify(control.value || "color");
  } else if (field === "colorHex") {
    product.colorHex = control.value;
  } else if (field === "disponibilidad") {
    if (productStockSummary(product).disponibilidad === "agotado") {
      product.disponibilidad = "agotado";
      control.value = "agotado";
    } else {
      product.disponibilidad = control.value;
    }
  } else if (field === "destacado") {
    const isFeatured = control.checked;
    product.destacado = isFeatured;
    product.featured = isFeatured;
  } else {
    product[field] = control.value;
  }

  dirty = true;
  renderStats();
  if (field === "categoria") renderCategoryOptions();
}

function nextSku() {
  const max = products.reduce((highest, product) => {
    const match = String(product.sku || "").match(/VYO-(\d+)/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `VYO-${String(max + 1).padStart(3, "0")}`;
}

function uniqueId(seed) {
  const base = slugify(seed);
  let id = base;
  let index = 2;
  while (products.some((product) => product.id === id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function productFromForm(form) {
  const data = new FormData(form);
  const nombre = String(data.get("nombre") || "").trim();
  const sku = String(data.get("sku") || "").trim() || nextSku();
  const modelName = nombre;
  const colorName = String(data.get("colorName") || "").trim();
  const colorHex = String(data.get("colorHex") || "").trim() || "#817A75";
  const categoria = String(data.get("categoria") || "").trim();
  const precioPublico = toNumber(data.get("precioPublico"), NaN);
  const precioAlumno = toNumber(data.get("precioAlumno") ?? data.get("precioRegular"), precioPublico);
  const stock = parseStock(data.get("stock"));

  if (!nombre || !colorName || !categoria || !Number.isFinite(precioPublico)) return null;

  return normalizeProduct({
    id: uniqueId(`${modelName} ${colorName}`),
    sku,
    nombre,
    modelName,
    modelId: slugify(modelName),
    modelSlug: slugify(modelName),
    colorName,
    colorId: slugify(colorName),
    colorHex,
    categoria,
    precioPublico,
    precioAlumno,
    stock,
    disponibilidad: stock === 0 ? "agotado" : String(data.get("disponibilidad") || "consultar"),
    imagen: String(data.get("imagen") || "").trim() || "assets/vyore/isotipo-vyore.png",
    destacado: data.get("destacado") === "on",
    actualizadoPrecios: todayIso(),
    actualizadoStock: stock === null ? null : todayIso(),
  });
}

function resetProductForm() {
  productForm.reset();
  document.querySelector("#newProductSku").placeholder = nextSku();
}

function addProduct(event) {
  event.preventDefault();
  if (!requireSession(true)) return;
  const product = productFromForm(productForm);
  if (!product) {
    notify({ type: "warning", title: "Datos incompletos", text: "Completa producto, color, categor\u00eda y precio p\u00fablico." });
    return;
  }

  const validation = validateProductRecord(product);
  if (validation) {
    notify({ type: "error", title: "Producto duplicado", text: validation });
    return;
  }

  removeDeletedOverrideFor(product);
  products.unshift(product);
  dirty = true;
  search = "";
  adminSearch.value = "";
  resetProductForm();
  renderRows();
  notify({ type: "success", title: "Producto agregado", text: `${product.nombre} fue agregado al cat\u00e1logo local.` });
}

async function saveProducts() {
  if (!requireSession(true)) return;
  const normalized = products.map((product) => {
    const copy = normalizeProduct(product);
    if (!canFeatureProduct(copy)) {
      copy.destacado = false;
      copy.featured = false;
    }
    return copy;
  });
  const combined = cleanProductList([...deletedProducts, ...normalized], { includeInactive: true });
  const meta = {
    ...baseMeta,
    ...(adminCatalogSource === "supabase" ? remoteCatalogMeta || {} : loadStoredMeta()),
    actualizadoStock: todayIso(),
    actualizadoPrecios: todayIso(),
  };

  if (window.VyoreSupabase?.isConfigured?.() && activeSession?.provider === "supabase") {
    try {
      const remote = await window.VyoreSupabase.saveCatalog(combined, meta);
      const expanded = cleanProductList(remote.products || [], { includeInactive: true });
      products = expanded.filter((product) => product.active !== false);
      deletedProducts = expanded.filter((product) => product.active === false);
      remoteCatalogMeta = remote.meta || meta;
      adminCatalogSource = "supabase";
      rowSnapshots.clear();
      dirty = false;
      renderMeta();
      renderRows();
      notify({ type: "success", title: "Cambios guardados", text: "El cat\u00e1logo global fue actualizado en Supabase." });
      return;
    } catch (error) {
      notify({
        type: "error",
        title: "No se pudo guardar en Supabase",
        text: error.message || "Revisa la sesi\u00f3n del administrador y las pol\u00edticas de la base.",
      });
      return;
    }
  }

  localStorage.setItem(PRODUCT_KEY, JSON.stringify(combined));
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  deletedProducts = combined.filter((product) => product.active === false);
  products = combined.filter((product) => product.active !== false);
  remoteCatalogMeta = null;
  adminCatalogSource = "fallback";
  rowSnapshots.clear();
  dirty = false;
  renderMeta();
  renderRows();
  notify({ type: "success", title: "Cambios guardados", text: "El cat\u00e1logo local fue actualizado sin duplicados." });
}

function exportProductsXlsx() {
  if (!requireSession(true)) return;
  const rows = [
    ["SKU", "Nombre", "Color", "Imagen", "Precio", "Stock", "Estado", "Destacado"],
    ...products.map((product) => {
      const normalized = normalizeProduct(product);
      return [
        normalized.sku,
        normalized.nombre,
        normalized.colorName || "",
        normalized.imagen,
        normalized.precioPublico,
        normalized.stock ?? "",
        label(normalized.disponibilidad),
        normalized.destacado ? "S\u00ed" : "No",
      ];
    }),
  ];

  const blob = createXlsxBlob(rows, "Productos");
  downloadBlob(blob, `productos-vyore-${todayIso()}.xlsx`);
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function sheetXml(rows, sheetName) {
  const body = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex + 1)}${rowNumber}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join("");

  const lastCell = `${columnName(rows[0].length)}${rows.length}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${rows[0].map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="22" customWidth="1"/>`).join("")}</cols>
  <sheetData>${body}</sheetData>
</worksheet>`;
}

function createXlsxBlob(rows, sheetName) {
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(rows, sheetName) },
  ];

  return zipFiles(files, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

const crcTable = (() => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateParts() {
  const date = new Date();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function localHeader(nameBytes, data, crc) {
  const { time, day } = dateParts();
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, time, true);
  view.setUint16(12, day, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function centralHeader(nameBytes, data, crc, localOffset) {
  const { time, day } = dateParts();
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, time, true);
  view.setUint16(14, day, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  header.set(nameBytes, 46);
  return header;
}

function zipFiles(files, type) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralChunks = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = localHeader(nameBytes, data, crc);
    const central = centralHeader(nameBytes, data, crc, offset);

    chunks.push(local, data);
    centralChunks.push(central);
    offset += local.length + data.length;
  });

  const centralStart = offset;
  centralChunks.forEach((chunk) => {
    chunks.push(chunk);
    offset += chunk.length;
  });
  const centralSize = offset - centralStart;

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralStart, true);
  endView.setUint16(20, 0, true);
  chunks.push(end);

  return new Blob(chunks, { type });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const username = String(data.get("user") || "").trim();
  const password = String(data.get("password") || "");
  const submitButton = loginForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  showAuthLoading("Comprobando si el usuario existe...");
  try {
    const [user] = await Promise.all([verifyCredentials(username, password), sleep(850)]);
    if (!user) {
      authStatus.textContent = "Acceso no autorizado.";
      await sleep(420);
      showLogin();
      loginError.textContent = "";
      notify({ type: "error", title: "Acceso denegado", text: "Usuario o clave incorrectos." });
      return;
    }

    authStatus.textContent = "Acceso confirmado. Abriendo panel...";
    saveSession(createSession(user));
    loginError.textContent = "";
    loginForm.reset();
    await sleep(420);
    await showAdmin();
  } catch (error) {
    showLogin();
    notify({ type: "error", title: "No se pudo verificar", text: error.message || "Intenta nuevamente." });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ingresar";
  }
});

if (togglePassword && adminPasswordInput) {
  togglePassword.addEventListener("click", () => {
    const shouldShow = adminPasswordInput.type === "password";
    adminPasswordInput.type = shouldShow ? "text" : "password";
    togglePassword.classList.toggle("active", shouldShow);
    togglePassword.setAttribute("aria-pressed", String(shouldShow));
    togglePassword.setAttribute("aria-label", shouldShow ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a");
  });
}

adminSearch.addEventListener("input", (event) => {
  search = event.target.value;
  renderRows();
});

productForm.addEventListener("submit", addProduct);
clearProductForm.addEventListener("click", resetProductForm);
document.querySelector("#saveProducts").addEventListener("click", saveProducts);
document.querySelector("#exportExcel").addEventListener("click", () => {
  exportProductsXlsx();
  notify({ type: "success", title: "Excel exportado", text: "Se descarg\u00f3 una copia del cat\u00e1logo en formato XLSX." });
});
document.querySelectorAll(".sidebar-link").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
[sidebarToggle, sidebarToggleTop].forEach((toggle) => {
  toggle?.addEventListener("click", persistSidebarStateFromTemplate);
});
document.querySelector("#logoutButton").addEventListener("click", async () => {
  if (dirty) {
    const ok = await askConfirm({
      type: "warning",
      title: "Cambios sin guardar",
      text: "Si sales ahora, los cambios no guardados se perder\u00e1n.",
      confirmText: "Salir",
      cancelText: "Seguir editando",
    });
    if (!ok) return;
  }
  if (activeSession?.provider === "supabase") {
    await window.VyoreSupabase?.signOut?.();
  }
  clearSession();
  dirty = false;
  showLogin();
  loginForm.reset();
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

resetProductForm();
localStorage.removeItem(AUTH_LEGACY_KEY);
activeSession = loadSession();
if (activeSession) {
  showAuthLoading("Restaurando sesi\u00f3n y validando acceso...");
  window.setTimeout(() => showAdmin(), 450);
}

window.setInterval(() => {
  if (adminPanel.hidden) return;
  if (!loadSession()) requireSession(true);
}, 60000);
