# Trip3D 技术栈与系统架构

## 总体架构

Trip3D 采用前后端分离结构：

```text
React 首页与规划器
        │
        ├─ 景点静态数据与公开资料
        ├─ Zustand 本地交互状态
        ├─ TanStack Query 路线与接口缓存
        │
        ▼
FastAPI 后端
        ├─ 账户与保存路线
        ├─ Google Routes / OSRM 路线代理
        └─ SQLite / PostgreSQL 数据存储
        │
        ▼
Cesium 3D 路线导览
```

## 前端技术

| 技术 | 版本 | 用途 |
| --- | --- | --- |
| React | 18.3 | 页面、弹窗、规划器和 3D HUD 组件。 |
| React DOM | 18.3 | 浏览器渲染入口。 |
| Vite | 8 | 开发服务器、模块转换和生产构建。 |
| CesiumJS | 1.142 | 全球地形、影像、建筑、路线和 3D 导览。 |
| Three.js | 0.183 | 首页视觉效果、模型和独立 3D 场景。 |
| React Three Fiber | 8.17 | 使用 React 组件管理 Three.js 场景。 |
| Drei | 9.121 | GLTF、相机、控制器等 Three.js 辅助组件。 |
| React Three Rapier | 1.5 | Three.js 物理能力。 |
| 3D Tiles Renderer | 0.4 | Three.js 场景中的 3D Tiles 支持。 |
| Zustand | 5 | 路线、账户、语言和 3D 导览共享状态。 |
| TanStack Query | 5 | 异步请求、缓存、重新获取和加载状态。 |
| GSAP | 3.14 | 页面与视觉动效。 |
| CSS | — | 手绘视觉系统和响应式布局。 |
| Tailwind PostCSS | 4 | PostCSS 构建链支持。 |

## 后端技术

| 技术 | 版本 | 用途 |
| --- | --- | --- |
| Python | 3.11+ | 后端运行环境。 |
| FastAPI | 0.116 | 账户、保存路线、景点和路线规划接口。 |
| Uvicorn | 0.35 | ASGI 开发服务器。 |
| Pydantic | FastAPI 内置依赖 | 请求体校验与数据模型。 |
| psycopg | 3.2 | PostgreSQL 数据库连接。 |
| SQLite | Python 标准库 | 未配置 PostgreSQL 时的本地账户存储。 |
| Playwright | 1.54 | 数据采集或页面自动化工具支持。 |

## 外部服务

| 服务 | 用途 | 降级策略 |
| --- | --- | --- |
| Cesium ion | World Terrain、影像和 OSM Buildings。 | 无 token 时使用椭球地形和 OpenStreetMap 影像。 |
| Google Routes API | 优先提供道路级驾车和步行路线。 | 请求失败时降级到 OSRM。 |
| OSRM | 开放道路路线服务。 | 服务不可用时使用坐标估算。 |
| Wikipedia | 景点简介、页面和图片。 | 使用本地景点资料。 |
| Wikidata | 景点结构化信息。 | 使用本地分类和坐标。 |
| Open-Meteo | 景点天气信息。 | 不显示实时天气。 |

## 状态管理

`src/state/useAppStore.js` 负责全局业务状态：

- 当前语言。
- 当前路线站点和锁定站点。
- 路线道路坐标、分段、距离和时间。
- 收藏和对比列表。
- 账户会话和保存路线。
- 行程天数、节奏和参观时间。
- Cesium 相机、车辆、进度和到站状态。

无需跨页面共享的展开、筛选和弹窗状态保留在对应 React 组件中。

## 路线规划流程

1. 用户在首页选择有顺序的景点列表。
2. `useRouteMetrics` 按相邻景点生成路线请求。
3. 自动模式根据城市和距离判断是否比较驾车与步行。
4. 前端调用 FastAPI 的路线规划接口。
5. 后端优先请求 Google Routes。
6. Google 不可用时使用 OSRM。
7. 前端合并每段道路坐标、距离、时长和交通方式。
8. 首页路线图、日程计算和 Cesium 导览共用同一份路线结果。

路线分段的核心数据结构包含：

```js
{
  travelMode: 'DRIVE' | 'WALK' | 'FERRY_DRIVE',
  distanceKm,
  durationHours,
  geometryCoordinates,
  modeSource,
}
```

## 日程计算

`src/lib/itinerarySchedule.js` 负责纯业务计算：

- 汇总每段交通时间。
- 汇总每个景点的建议参观时间。
- 根据旅行节奏确定每日容量。
- 计算建议天数。
- 按天拆分交通和参观活动。
- 生成导览进度对应的日期与时间。

播放倍速只影响 3D 动画，不应改变真实计划时间。

## Cesium 场景

`src/components/cesium/CesiumDriveScene.jsx` 负责：

- 初始化 Cesium Viewer。
- 加载地形、影像和建筑。
- 将路线坐标绘制为贴地折线。
- 按路线进度更新车辆、步行人物或轮渡。
- 采样地形高度并固定景点标记位置。
- 管理跟随、俯视、自由和景点聚焦相机。
- 按加载压力调整场景精度和模拟速度。

Cesium 场景使用固定白天时间，不根据行程时钟持续修改光照，避免地形和影像重复加载。

## 数据来源与处理

### 浏览器数据

`public/data/live-landmarks.json` 包含浏览器直接读取的景点资料。

### 前端整合

`src/data/landmarks.js` 将公开数据与项目内置模型、导航坐标、分类和本地文案合并为统一景点对象。

### 工具脚本

`tools/` 包含：

- 景点公开数据抓取。
- 元数据补充。
- 简体中文转换。
- 数据结构校验。
- PostgreSQL 导入。
- 后端启动检查。
- 低多边形模型生成。

## 数据存储

### 游客状态

游客路线、语言、收藏、对比和规划偏好存储在浏览器 `localStorage`。

### 登录状态

登录用户通过 FastAPI 保存：

- 账户信息。
- 多条独立保存路线。
- 当前规划状态。
- 收藏和对比列表。
- 天数、节奏和语言偏好。

开发环境默认使用 `backend/accounts.sqlite3`。配置 `DATABASE_URL` 后可使用 PostgreSQL。

## 样式系统

视觉规范位于 `Styles/sketch.txt`，主要原则包括：

- 暖纸白背景。
- 铅笔黑、标记红、圆珠笔蓝和便签黄。
- 手写感字体。
- 不规则圆角和粗描边。
- 清晰硬阴影，避免玻璃拟态和模糊阴影。
- 轻微旋转、虚线、胶带和纸张纹理。

主要样式文件：

| 文件 | 内容 |
| --- | --- |
| `src/styles/base.css` | 基础变量与通用元素。 |
| `src/styles/home.css` | 首页基础布局。 |
| `src/styles/home-showcase.css` | 首页主要模块和响应式样式。 |
| `src/styles/hud.css` | 3D 导览 HUD。 |
| `src/styles/intro.css` | 3D 导览开场。 |
| `src/styles/panels.css` | 信息面板、日程和弹窗。 |
| `src/styles/decorations.css` | 纸张和装饰效果。 |

## 构建配置

`vite.config.js` 使用 `vite-plugin-static-copy` 将 Cesium 的以下运行资源复制到生产目录：

- Workers
- ThirdParty
- Assets
- Widgets

`CESIUM_BASE_URL` 指向 `/cesium`。开发服务器同时代理地形 DEM 请求。

## 环境变量

### 前端

```env
VITE_CESIUM_ION_TOKEN=
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 后端

```env
DATABASE_URL=
POSTGRES_DSN=
ACCOUNT_DB_PATH=
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
BACKEND_PORT=8001
GOOGLE_MAPS_API_KEY=
```

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `backend/` | API、账户认证、路线代理和数据库访问。 |
| `docs/` | 面向开发者的独立技术文档。 |
| `public/data/` | 浏览器可直接请求的数据文件。 |
| `public/models/` | GLB 模型和模型纹理。 |
| `src/components/` | React 页面和场景组件。 |
| `src/data/` | 应用内置数据和数据整合。 |
| `src/hooks/` | 数据请求和可复用交互逻辑。 |
| `src/lib/` | 不依赖 React 的业务计算。 |
| `src/state/` | 全局状态。 |
| `src/styles/` | CSS 样式模块。 |
| `Styles/` | 产品视觉规范原文。 |
| `tools/` | 开发、数据和运维脚本。 |

## 验证命令

```powershell
npm run build
conda run -n web3d-backend python -m py_compile backend/main.py
npm run validate:live-data
```
