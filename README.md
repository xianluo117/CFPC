# CFpc 图片托管

基于 Cloudflare Pages + R2 的图片托管服务，支持上传、下载和缩略图展示。

## ✨ 功能

- 📤 **图片上传** - 支持拖拽或点击上传，支持多文件批量上传
- 📷 **缩略图展示** - 首页以网格缩略图形式展示所有图片
- 🔍 **图片预览** - 点击查看大图
- ⬇️ **图片下载** - 下载原始图片文件
- 🗑️ **图片删除** - 仅管理员后台可删除
- 🏷️ **标签分类** - 上传时多选标签，支持按标签筛选
- 🧠 **高清压缩** - 上传时自动压缩（最大边 1920px，质量 1）
- 📱 **响应式设计** - 适配手机和桌面端

## 📁 项目结构

```
CFpc/
├── public/                  # 静态前端文件
│   ├── index.html           # 主页面
│   ├── style.css            # 样式
│   └── app.js               # 前端逻辑
├── functions/               # Cloudflare Pages Functions (后端API)
│   └── api/
│       ├── _middleware.js    # CORS 中间件
│       ├── upload.js         # POST /api/upload
│       ├── images.js         # GET /api/images
│       ├── image/
│       │   └── [key].js      # GET/DELETE /api/image/:key
│       ├── thumbnail/
│       │   └── [key].js      # GET /api/thumbnail/:key
│       └── download/
│           └── [key].js      # GET /api/download/:key
├── wrangler.toml             # Cloudflare 配置
├── package.json
└── README.md
```

## 🚀 部署步骤

### 1. 前置要求

- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/) >= 18
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 创建 R2 存储桶

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 R2 存储桶
npm run create-bucket
```

> 如果桶名 `cfpc-images` 已被占用，需要修改 `wrangler.toml` 中的 `bucket_name`。

### 4. 本地开发

```bash
npm run dev
```

浏览器访问 `http://localhost:8788` 即可。

### 5. 部署到 Cloudflare

#### 方式一：CLI 部署

```bash
npm run deploy
```

#### 方式二：Git 连接部署（推荐）

1. 将项目推送到 GitHub/GitLab
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Workers & Pages** → **Create application** → **Pages**
4. 连接你的 Git 仓库
5. 构建设置：
   - **构建命令**: 留空
   - **构建输出目录**: `public`
6. 在 **Settings → Functions → R2 bucket bindings** 中绑定：
   - 变量名: `IMAGES_BUCKET`
   - R2 桶: `cfpc-images`

### 6. 绑定 R2（重要！）

部署后��要在 Cloudflare Dashboard 中手动绑定 R2：

1. 进入你的 Pages 项目 → **Settings**
2. 找到 **Functions** → **R2 bucket bindings**
3. 添加绑定：
   - Variable name: `IMAGES_BUCKET`
   - R2 bucket: `cfpc-images`
4. 保存后重新部署一次

## 🔐 管理员后台

### 1. 访问地址

管理员后台路径：`/admin.html`

### 2. 配置环境变量

在 Cloudflare Pages 的 **Settings → Environment variables** 中配置：

- `ADMIN_USER` 管理员用户名
- `ADMIN_PASSWORD` 管理员密码
- `ADMIN_TOKEN_SECRET` Token 签名密钥（建议随机 32 位以上）

本地开发可在 `.dev.vars` 中配置：

```
ADMIN_USER=admin
ADMIN_PASSWORD=your-password
ADMIN_TOKEN_SECRET=your-secret
```

### 3. 使用说明

1. 打开 `/admin.html`
2. 输入用户名/密码登录
3. 进入图片管理列表，点击图片可预览并删除

## 🔧 API 接口

| 方法     | 路径                    | 说明                                 |
| -------- | ----------------------- | ------------------------------------ |
| `POST`   | `/api/upload`           | 上传图片 (multipart/form-data, tags) |
| `GET`    | `/api/images`           | 获取图片列表                         |
| `GET`    | `/api/image/:key`       | 获取原图                             |
| `GET`    | `/api/thumbnail/:key`   | 获取缩略图                           |
| `GET`    | `/api/download/:key`    | 下载图片                             |
| `DELETE` | `/api/image/:key`       | 删除图片（管理员）                   |
| `POST`   | `/api/admin/login`      | 管理员登录                           |
| `POST`   | `/api/admin/verify`     | 验证管理员 token                     |
| `POST`   | `/api/admin/batch-tags` | 批量更新图片标签（管理员）           |

## ⚠️ 注意事项

- R2 免费额度：每月 10GB 存储、100 万次 A 类操作、1000 万次 B 类操作
- 单文件上传限制：10MB
- 支持格式：JPG、PNG、GIF、WebP
- 本项目不含用户认证，如需限制访问请自行添加鉴权逻辑

## 📄 License

MIT
