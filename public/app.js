/**
 * CFpc 图片托管 - 前端逻辑
 */

const API_BASE = "/api";

// ========== DOM 元素 ==========
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const gallery = document.getElementById("gallery");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const refreshBtn = document.getElementById("refreshBtn");
const previewModal = document.getElementById("previewModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const previewImage = document.getElementById("previewImage");
const downloadLink = document.getElementById("downloadLink");
const modalInfo = document.getElementById("modalInfo");
const uploadTagList = document.getElementById("uploadTagList");
const filterTagList = document.getElementById("filterTagList");
const clearFilterBtn = document.getElementById("clearFilterBtn");

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

let activeUploadTags = new Set(["正经"]);
let activeFilterTags = new Set();

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

// ========== 上传功能 ==========
uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type.startsWith("image/"),
  );
  if (files.length > 0) {
    uploadFiles(files);
  } else {
    showToast("请拖入图片文件", "error");
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    uploadFiles(Array.from(fileInput.files));
  }
});

async function uploadFiles(files) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const validFiles = files.filter((f) => {
    if (f.size > MAX_SIZE) {
      showToast(`${f.name} 超过 10MB 限制`, "error");
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  uploadProgress.style.display = "block";
  let uploaded = 0;

  for (const file of validFiles) {
    try {
      progressText.textContent = `处理并上传: ${file.name} (${uploaded + 1}/${validFiles.length})`;
      progressFill.style.width = `${(uploaded / validFiles.length) * 100}%`;

      const compressedFile = await compressImage(file);
      if (compressedFile.size > MAX_SIZE) {
        throw new Error("压缩后仍超过 10MB 限制");
      }

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("tags", JSON.stringify(Array.from(activeUploadTags)));

      const resp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "上传失败");
      }

      uploaded++;
      progressFill.style.width = `${(uploaded / validFiles.length) * 100}%`;
      showToast(`${file.name} 上传成功`, "success");
    } catch (err) {
      showToast(`${file.name}: ${err.message}`, "error");
    }
  }

  progressText.textContent = "上传完成！";
  setTimeout(() => {
    uploadProgress.style.display = "none";
    progressFill.style.width = "0%";
  }, 1500);

  fileInput.value = "";
  loadImages();
}

// ========== 加载图片列表 ==========
async function loadImages() {
  loading.style.display = "block";
  emptyState.style.display = "none";

  // 清除已有卡片
  gallery.querySelectorAll(".image-card").forEach((el) => el.remove());

  try {
    const query = activeFilterTags.size
      ? `?tags=${encodeURIComponent(Array.from(activeFilterTags).join(","))}`
      : "";
    const resp = await fetch(`${API_BASE}/images${query}`);
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
    showToast("加载图片列表失败: " + err.message, "error");
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

// ========== 预览模态框 ==========
let currentImage = null;

function openPreview(img) {
  currentImage = img;
  previewImage.src = `${API_BASE}/image/${img.key}`;
  downloadLink.href = `${API_BASE}/download/${img.key}`;
  downloadLink.download = img.name;
  const tags = img.tags && img.tags.length ? ` · ${img.tags.join("/")}` : "";
  modalInfo.textContent = `${img.name} · ${formatSize(img.size)} · ${new Date(img.uploaded).toLocaleString("zh-CN")}${tags}`;
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

// ========== 刷新 ==========
refreshBtn.addEventListener("click", loadImages);

// ========== 标签渲染与交互 ==========
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

// ========== 图片压缩 ==========
async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  const MAX_DIMENSION = 1920;
  const QUALITY = 1;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === "image/png" ? "image/webp" : file.type;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, QUALITY),
    );

    if (!blob) return file;

    const newName =
      file.name.replace(/\.[^.]+$/, "") +
      (outputType === "image/webp" ? ".webp" : ".jpg");
    return new File([blob], newName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function initTags() {
  renderTagChips(uploadTagList, TAGS, activeUploadTags, () => {
    if (activeUploadTags.size === 0) {
      activeUploadTags.add("正经");
      renderTagChips(uploadTagList, TAGS, activeUploadTags, null);
    }
  });

  renderTagChips(filterTagList, TAGS, activeFilterTags, () => loadImages());
}

clearFilterBtn.addEventListener("click", () => {
  activeFilterTags.clear();
  renderTagChips(filterTagList, TAGS, activeFilterTags, () => loadImages());
  loadImages();
});

// ========== 初始化 ==========
initTags();
loadImages();
