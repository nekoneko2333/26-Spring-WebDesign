# 当前启动方式

以下步骤是当前项目的有效启动方式，以本节为准。

## 1. 首次安装

```powershell
npm install
conda run -n web3d-backend pip install -r backend/requirements.txt
```

## 2. 创建 PostgreSQL 数据库

在 pgAdmin Query Tool 或 SQL Shell 中执行：

```sql
CREATE USER trip3d_app WITH PASSWORD '你的强密码';
CREATE DATABASE trip3d OWNER trip3d_app;
```

用户和数据库已经创建过时，不需要重复执行。

## 3. 配置数据库

复制 `.env.backend.example` 为 `.env.backend`，填写真实密码：

```env
DATABASE_URL=postgresql://trip3d_app:你的强密码@127.0.0.1:5432/trip3d
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
BACKEND_PORT=8001
```

`.env.backend` 包含数据库密码，已被 Git 忽略，不要提交。

前端的 `.env.local` 应为：

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

## 4. 日常启动

打开两个终端。

终端一，启动 PostgreSQL 后端：

```powershell
npm run dev:backend:postgres
```

终端二，启动前端：

```powershell
npm run dev
```

访问地址：

```txt
前端：http://127.0.0.1:5173
后端：http://127.0.0.1:8001
接口文档：http://127.0.0.1:8001/docs
健康检查：http://127.0.0.1:8001/api/health
```

健康检查成功时应返回：

```json
{
  "status": "ok",
  "mode": "backend",
  "database_configured": true,
  "account_database": "postgresql"
}
```

如果显示 `accounts.sqlite3`，说明访问的是旧 SQLite 后端。请使用 `npm run dev:backend:postgres` 启动，并访问 8001 端口。

## 5. 检查数据库

后端首次启动时会自动创建：

- `users`
- `sessions`
- `account_history`
- `user_plans`
- `data_import_batches`
- `landmarks_catalog`
- `landmark_localizations`
- `landmark_sources`
- `weather_observations`
- `route_metrics`

刷新并导入景点资料：

```powershell
npm run fetch:live-data
npm run import:live-data:postgres
```

当前抓取流程从 Wikidata 发现意大利景点，并补充 Wikipedia 双语资料、Open-Meteo 天气和 OSRM 道路矩阵。前端景点目录会跟随 `public/data/live-landmarks.json` 自动更新。

加载 `.env.backend` 后可运行检查脚本：

```powershell
$envFile = ".env.backend"
Get-Content $envFile | ForEach-Object {
  if ($_ -match "^([^#][^=]*)=(.*)$") {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}
conda run -n web3d-backend python tools/check-postgres.py
```

正常输出：

```txt
database=trip3d
user=trip3d_app
tables=account_history,data_import_batches,landmark_localizations,landmark_sources,landmarks_catalog,route_metrics,sessions,user_plans,users,weather_observations
```

---

# Phase 1 practical travel planning update

- The home page includes a first-run guide with sticky-note cards and dashed hand-drawn arrows for search, adding stops, editing the itinerary, exporting, and entering 3D.
- The route planner builds a day-by-day landmark itinerary with suggested visit time, travel estimates, daily distance, pace notes, and check-before-you-go reminders.
- Destination data comes from Wikipedia, Wikidata, Open-Meteo, and OSRM, with source URLs and import timestamps stored in PostgreSQL.
- Export keeps the TXT download and adds browser print / save as PDF without adding a PDF dependency.
- Destination details include fit, recommended visit time, best time, first-Italy suitability, nearby route-friendly stops, and source notes.
- Browser local storage preserves guest planning state after refresh.
- Signed-in users save route stops, locked stops, favorites, comparisons, days, pace, and language in PostgreSQL.
- The database work does not add hotel coordinates or change the 3D Drive / Venice VR / V2 core implementation.

# Web3D Travel Platform

基于 React、Vite、Three.js / React Three Fiber 的 3D 旅行规划项目。当前默认入口已经整合为 04 Cinematic Portal 首页，保留完整的目的地、行程、点评、账户、服务和 3D 导览功能。

## 当前技术栈

- `React`：页面与状态编排
- `Vite`：开发服务器与生产构建
- `Three.js` + `@react-three/fiber` + `@react-three/drei`：3D 场景、相机、模型与粒子效果
- `Zustand`：全局状态管理
- 原生 `CSS`：页面布局、主题和动效
- `fetch` + 本地 API：登录、账户历史与会话状态
- 本地静态数据：景点、路线、天气、百科、点评和 3D 资源

生产构建检查：

```bash
npm.cmd run build
```

## 页面入口

```txt
http://127.0.0.1:5173/               # 04 Cinematic Portal 首页
http://127.0.0.1:5173/#/v2           # 路线地图 / 拓扑版本
http://127.0.0.1:5173/#/venice-vr    # Venice 城市漫游实验
```

## 当前功能

- 04 首页：粒子展示开场、现代化首屏、目的地浏览、行程规划、点评、服务、账户和 3D Drive 入口。
- 目的地浏览：搜索、筛选、排序、收藏、对比、加入路线、查看背景资料。
- 行程规划：路线顺序调整、景点锁定、路线优化、按天生成行程、导出文本。
- 账户状态：游客使用本地保存；登录用户将收藏、路线、对比、锁定景点、天数和节奏同步到 PostgreSQL。
- 3D Drive：Three.js 场景、车辆沿路线行驶、地标聚焦、模型预览。
- V2 路线视图：基于 `public/data/italy-route-topology.json` 展示路线拓扑、地形和站点进度。
- Venice VR：独立威尼斯城市漫游实验入口。
- 设计风格：当前首页图片和卡片已经偏向手绘笔记本风格，使用虚线边框、轻微旋转、硬阴影和更有“草图感”的视觉处理。

## 目录结构

```txt
web3d-project/
├── backend/                         # FastAPI 后端预留
├── public/
│   ├── data/                        # 前端静态数据
│   └── models/                      # 3D 模型资源
├── src/
│   ├── App.jsx                      # 应用入口和 hash 路由
│   ├── components/
│   │   ├── home/                    # 04 首页和原主页功能模块
│   │   ├── layout/                  # 3D 导览外层布局
│   │   ├── scene/                   # 3D 场景层
│   │   ├── camera/                  # 摄像机跟随逻辑
│   │   ├── vehicle/                 # 车辆控制和模型
│   │   ├── landmarks/               # 意大利地标模型
│   │   └── ui/                      # HUD、弹层、模型预览
│   ├── data/                        # 路线、地标、文案、点评本地数据
│   ├── experiments/
│   │   ├── route-versions/          # V2 路线视图
│   │   └── venice-vr/               # Venice 城市漫游实验
│   ├── hooks/                       # 天气、Wikipedia、路线、实时数据 hooks
│   ├── state/                       # Zustand 全局状态
│   └── styles/                      # CSS 模块和首页样式
│       ├── base.css
│       ├── home.css
│       └── home-showcase.css
├── Styles/
│   └── sketch.txt                   # 手绘风设计参考
├── tools/                           # 本地数据准备脚本
├── package.json
└── vite.config.js
```

## 维护约定

- `node_modules/`、`dist/`、`data/raw/`、`__pycache__/` 和工具缓存不进入版本管理。
- 运行时静态资源放在 `public/`。
- 主站功能放在 `src/components/home/`。
- 独立实验功能放在 `src/experiments/`。
- 通用数据 hook 放在 `src/hooks/`，全局状态放在 `src/state/`。

## 已知限制

- 3D Drive 仍是路线曲线驱动，不是真实道路物理驾驶。
- 票务、酒店、餐厅和预算目前是基于本地路线数据的功能面板，尚未接入真实供应商 API。
- 本地账户不是正式认证系统，只适合原型阶段。
- Venice VR 的城市寻路仍是实验性实现。
