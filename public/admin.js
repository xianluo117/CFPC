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
    loadImages();
  } catch (err) {
    showToast(err.message, "error");
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showLogin();
});

// ========== 加载图片列表 ==========
async function loadImages() {
  loading.style.display = "block";
  emptyState.style.display = "none";
  gallery.querySelectorAll(".image-card").forEach((el) => el.remove());

  try {
    const resp = await fetch(`${API_BASE}/images`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) throw new Error("加载失败");
    const data = await resp.json();

    loading.style.display = "none";

    if (!data.images || data.images.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    data.images.forEach((img) => {
      const card = createImageCard(img);
      gallery.appendChild(card);
    });
  } catch (err) {
    loading.style.display = "none";
    showToast("加载失败: " + err.message, "error");
  }
}

function createImageCard(img) {
  const card = document.createElement("div");
  card.className = "image-card";
  card.innerHTML = `
    <img src="${API_BASE}/thumbnail/${img.key}" alt="${img.name}" loading="lazy">
    <div class="card-overlay">
      <div class="card-name">${img.name}</div>
      <div class="card-size">${formatSize(img.size)}</div>
    </div>
  `;
  card.addEventListener("click", () => openPreview(img));
  return card;
}

// ========== 预览与删除 ==========
let currentImage = null;

function openPreview(img) {
  currentImage = img;
  previewImage.src = `${API_BASE}/image/${img.key}`;
  downloadLink.href = `${API_BASE}/download/${img.key}`;
  downloadLink.download = img.name;
  modalInfo.textContent = `${img.name} · ${formatSize(img.size)} · ${new Date(img.uploaded).toLocaleString("zh-CN")}`;
  previewModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePreview() {
  previewModal.classList.remove("active");
  document.body.style.overflow = "";
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
    const resp = await fetch(`${API_BASE}/image/${currentImage.key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) throw new Error("删除失败");
    showToast("删除成功", "success");
    closePreview();
    loadImages();
  } catch (err) {
    showToast("删除失败: " + err.message, "error");
  }
});

// ========== 刷新 ==========
refreshBtn.addEventListener("click", loadImages);

// ========== 初始化 ==========
if (getToken()) {
  showPanel();
  loadImages();
} else {
  showLogin();
}
