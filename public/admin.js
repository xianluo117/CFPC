/**
 * CFpc 管理后台 - 管理员登录与删除
 */

const API_BASE = "/api";
const TOKEN_KEY = "cfpc_admin_token";

// ========== DOM 元素 ==========
const loginSection = document.getElementById("loginSection");
const panelSection = document.getElementById("panelSection");
const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const selectAllBtn = document.getElementById("selectAllBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const selectedCount = document.getElementById("selectedCount");
const editTagList = document.getElementById("editTagList");
const applyTagsBtn = document.getElementById("applyTagsBtn");
const filterTagList = document.getElementById("filterTagList");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const gallery = document.getElementById("gallery");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const previewModal = document.getElementById("previewModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const previewImage = document.getElementById("previewImage");
const downloadLink = document.getElementById("downloadLink");
const deleteBtn = document.getElementById("deleteBtn");
const modalInfo = document.getElementById("modalInfo");
const pagination = document.getElementById("pagination");
const pageInfo = document.getElementById("pageInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageSizeSelect = document.getElementById("pageSizeSelect");

// 标签定义
const TAGS = [
  "正经",
  "擦边",
  "cos服",
  "情趣",
  "上装",
  "下装",
  "连衣群",
  "袜子",
  "鞋子",
  "饰品",
];

let activeFilterTags = new Set();
let activeEditTags = new Set();
let selectedKeys = new Set();
let currentPage = 1;
let pageSize = Number(pageSizeSelect?.value || 24);
let totalImages = 0;
let latestLoadRequestId = 0;

// Toast 容器
const toastContainer = document.createElement("div");
toastContainer.className = "toast-container";
document.body.appendChild(toastContainer);

// ========== Toast 通知 ==========
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== 格式化文件大小 ==========
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showPanel() {
  loginSection.style.display = "none";
  panelSection.style.display = "block";
  updateSelectionCount();
}

function showLogin() {
  loginSection.style.display = "block";
  panelSection.style.display = "none";
}

// ========== 登录 ==========
loginBtn.addEventListener("click", async () => {
  const username = adminUser.value.trim();
  const password = adminPass.value.trim();

  if (!username || !password) {
    showToast("请输入用户名和密码", "error");
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "登录失败");
    }

    const data = await resp.json();
    setToken(data.token);
    showToast("登录成功", "success");
    showPanel();
    initTags();
    resetAndLoadImages();
  } catch (err) {
    showToast(err.message, "error");
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showLogin();
});

// ========== 加载图片列表 ==========
async function loadImages(page = currentPage) {
  const requestId = ++latestLoadRequestId;
  currentPage = Math.max(1, page);
  loading.style.display = "block";
  emptyState.style.display = "none";
  setPaginationDisabled(true);
  gallery.querySelectorAll(".image-card").forEach((el) => el.remove());

  try {
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
    });
    if (activeFilterTags.size) {
      params.set("tags", Array.from(activeFilterTags).join(","));
    }

    const resp = await fetch(`${API_BASE}/images?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) throw new Error("加载失败");
    const data = await resp.json();
    if (requestId !== latestLoadRequestId) return;

    loading.style.display = "none";
    totalImages = Number(data.total || 0);
    currentPage = Number(data.page || currentPage);
    pageSize = Number(data.pageSize || pageSize);

    if (!data.images || data.images.length === 0) {
      emptyState.style.display = "block";
      updatePagination();
      return;
    }

    const fragment = document.createDocumentFragment();
    data.images.forEach((img) => {
      fragment.appendChild(createImageCard(img));
    });
    gallery.appendChild(fragment);
    updatePagination();
    updateSelectionCount();
  } catch (err) {
    if (requestId !== latestLoadRequestId) return;
    loading.style.display = "none";
    showToast("加载失败: " + err.message, "error");
    updatePagination();
  }
}

function createImageCard(img) {
  const card = document.createElement("div");
  card.className = "image-card selectable";
  card.dataset.key = img.key;
  if (selectedKeys.has(img.key)) {
    card.classList.add("selected");
  }

  const badge = document.createElement("div");
  badge.className = "select-badge";
  badge.textContent = "已选";

  const thumbnail = document.createElement("img");
  thumbnail.src = `${API_BASE}/thumbnail/${encodeURIComponent(img.key)}`;
  thumbnail.alt = img.name;
  thumbnail.loading = "lazy";
  thumbnail.decoding = "async";

  const overlay = document.createElement("div");
  overlay.className = "card-overlay";

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = img.name;

  const size = document.createElement("div");
  size.className = "card-size";
  size.textContent = formatSize(img.size);

  overlay.append(name, size);
  card.append(badge, thumbnail, overlay);
  card.addEventListener("click", (e) => {
    if (e.shiftKey) {
      toggleSelect(img.key, card);
      return;
    }
    openPreview(img);
  });
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    toggleSelect(img.key, card);
  });
  return card;
}

// ========== 预览与删除 ==========
let currentImage = null;

function openPreview(img) {
  currentImage = img;
  previewImage.src = `${API_BASE}/image/${encodeURIComponent(img.key)}`;
  downloadLink.href = `${API_BASE}/download/${encodeURIComponent(img.key)}`;
  downloadLink.download = img.name;
  const tags = img.tags && img.tags.length ? ` · ${img.tags.join("/")}` : "";
  modalInfo.textContent = `${img.name} · ${formatSize(img.size)} · ${new Date(img.uploaded).toLocaleString("zh-CN")}${tags}`;
  previewModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePreview() {
  previewModal.classList.remove("active");
  document.body.style.overflow = "";
  previewImage.removeAttribute("src");
  currentImage = null;
}

modalOverlay.addEventListener("click", closePreview);
modalClose.addEventListener("click", closePreview);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePreview();
});

deleteBtn.addEventListener("click", async () => {
  if (!currentImage) return;
  if (!confirm(`确定要删除 "${currentImage.name}" 吗？`)) return;

  try {
    const resp = await fetch(`${API_BASE}/image/${encodeURIComponent(currentImage.key)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) throw new Error("删除失败");
    showToast("删除成功", "success");
    closePreview();
    resetAndLoadImages();
  } catch (err) {
    showToast("删除失败: " + err.message, "error");
  }
});

// ========== 分页 ==========
function getTotalPages() {
  return Math.max(1, Math.ceil(totalImages / pageSize));
}

function setPaginationDisabled(disabled) {
  prevPageBtn.disabled = disabled;
  nextPageBtn.disabled = disabled;
  pageSizeSelect.disabled = disabled;
}

function updatePagination() {
  const totalPages = getTotalPages();
  pagination.style.display = totalImages > 0 ? "flex" : "none";
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页，共 ${totalImages} 张`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageSizeSelect.disabled = false;
}

function resetAndLoadImages() {
  currentPage = 1;
  loadImages(1);
}

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) loadImages(currentPage - 1);
});

nextPageBtn.addEventListener("click", () => {
  if (currentPage < getTotalPages()) loadImages(currentPage + 1);
});

pageSizeSelect.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value);
  resetAndLoadImages();
});

// ========== 刷新 ==========
refreshBtn.addEventListener("click", () => loadImages(currentPage));

selectAllBtn.addEventListener("click", () => {
  const cards = Array.from(gallery.querySelectorAll(".image-card.selectable"));
  cards.forEach((card) => {
    const key = card.dataset.key;
    if (key) {
      selectedKeys.add(key);
      card.classList.add("selected");
    }
  });
  updateSelectionCount();
});

clearSelectionBtn.addEventListener("click", () => {
  selectedKeys.clear();
  gallery.querySelectorAll(".image-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });
  updateSelectionCount();
});

applyTagsBtn.addEventListener("click", async () => {
  if (selectedKeys.size === 0) {
    showToast("请先选择图片", "error");
    return;
  }
  const tags = Array.from(activeEditTags);
  if (tags.length === 0) {
    showToast("请至少选择一个标签", "error");
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/admin/batch-tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ keys: Array.from(selectedKeys), tags }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "更新失败");
    }
    showToast("标签更新成功", "success");
    loadImages(currentPage);
  } catch (err) {
    showToast("更新失败: " + err.message, "error");
  }
});

// ========== 标签筛选 ==========
function renderTagChips(container, tags, activeSet, onChange) {
  container.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip" + (activeSet.has(tag) ? " active" : "");
    chip.textContent = tag;
    chip.addEventListener("click", () => {
      if (activeSet.has(tag)) {
        activeSet.delete(tag);
      } else {
        activeSet.add(tag);
      }
      chip.classList.toggle("active");
      onChange?.();
    });
    container.appendChild(chip);
  });
}

function toggleSelect(key, card) {
  if (selectedKeys.has(key)) {
    selectedKeys.delete(key);
    card.classList.remove("selected");
  } else {
    selectedKeys.add(key);
    card.classList.add("selected");
  }
  updateSelectionCount();
}

function updateSelectionCount() {
  if (selectedCount) {
    selectedCount.textContent = `已选 ${selectedKeys.size}`;
  }
}

function initTags() {
  renderTagChips(filterTagList, TAGS, activeFilterTags, resetAndLoadImages);
  renderTagChips(editTagList, TAGS, activeEditTags, null);
}

clearFilterBtn.addEventListener("click", () => {
  activeFilterTags.clear();
  renderTagChips(filterTagList, TAGS, activeFilterTags, resetAndLoadImages);
  resetAndLoadImages();
});

// ========== 初始化 ==========
if (getToken()) {
  showPanel();
  initTags();
  resetAndLoadImages();
} else {
  showLogin();
}
