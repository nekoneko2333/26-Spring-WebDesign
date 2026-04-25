# Web3D Italy Drive

Web3D Italy Drive 是一个将旅游图文导览、路线规划和 3D 地图驾驶体验结合起来的网页应用原型。

当前阶段以 mock 数据为主：前端可以浏览意大利景点、查看模拟评价、规划路线，并进入 3D Drive Explorer 沿路线沉浸式导览。后续可以逐步替换为真实景点、真实道路、真实评价和交通数据。

## 当前目标

项目目标是做一个 Web3D 旅游导览系统：

- 通过名称、地点、距离等方式检索景点。
- 展示景点评分、评价、旅行说明和 3D 模型。
- 支持路线规划，当前使用 mock route，后续可接入 OSM / OSRM / PostGIS / 大模型推荐。
- 将路线转成沉浸式 3D 导览，小车沿道路行驶，结合地形、道路语义和视觉特效表现旅途体验。

## 当前实现

### 首页

- 旅游网站风格首页，不再是单一 landing page。
- 顶部页面切换：目的地、路线规划、评价、3D 导览。
- 中英文切换。
- 目的地卡片、路线地图、路线语义标签、模拟评价展示。
- 加入动态网格背景、扫描光、路线脉冲、卡片 hover 和流光效果。

### 3D Drive Explorer

- React Three Fiber 场景。
- DEM 地形加载与低多边形风格地图渲染。
- mock 真实感路线中心线。
- 语义路线体验层：城市道路、高速、景观路、山路、桥、隧道、环路等。
- 车辆沿 `THREE.CatmullRomCurve3` 运动，不使用真实物理车。
- 车辆速度、车身晃动、转向倾斜、HUD 信息由当前语义路段驱动。
- 道路走廊削坡，减少路线穿山问题。
- 地标聚焦、侧边信息面板、模型预览弹层。

### 后端

- FastAPI mock API。
- 提供 mock landmarks、reviews、nearby reviews、current route。
- 保留 PostgreSQL / PostGIS / Playwright 相关文件，作为后续真实数据接入基础。

## 技术栈

### 前端

- Vite 8
- React 18
- Three.js
- @react-three/fiber
- @react-three/drei
- Zustand
- @tanstack/react-query
- Tailwind CSS 4
- 自定义 CSS 模块

### 3D / 地图

- Three.js
- three-stdlib
- 3d-tiles-renderer
- DEM terrain sampling
- `THREE.CatmullRomCurve3` 路径动画
- 语义路线体验层
- 道路走廊削坡

### 后端

- FastAPI
- Uvicorn
- psycopg[binary]
- Playwright

### 当前说明

- 当前数据默认使用本地 mock 数据。
- `@react-three/rapier` 仍在依赖中，但当前主链路没有使用物理车辆。
- 当前车辆方案是 kinematic curve drive，不是真实物理车。
- 未配置 `VITE_API_BASE_URL` 时，前端评价优先使用本地 mock 数据。

## 目录结构

```text
web3d-project/
├─ backend/
│  ├─ db.py
│  ├─ main.py
│  ├─ postgis_queries.py
│  ├─ playwright_reviews.py
│  └─ requirements.txt
├─ public/
│  ├─ models/
│  │  ├─ colosseum.glb
│  │  ├─ leaning_tower_of_pisa.glb
│  │  └─ low-poly_truck_car_drifter.glb
│  ├─ favicon.svg
│  └─ icons.svg
├─ src/
│  ├─ components/
│  │  ├─ camera/
│  │  │  └─ FollowCamera.jsx
│  │  ├─ home/
│  │  │  └─ HomePage.jsx
│  │  ├─ landmarks/
│  │  │  └─ LandmarkModels.jsx
│  │  ├─ layout/
│  │  │  └─ AppShell.jsx
│  │  ├─ scene/
│  │  │  ├─ GroundPlane.jsx
│  │  │  ├─ MapSurface.jsx
│  │  │  ├─ RoadRibbon.jsx
│  │  │  ├─ SceneLights.jsx
│  │  │  └─ TilesLayer.jsx
│  │  ├─ ui/
│  │  │  ├─ ModelViewerOverlay.jsx
│  │  │  └─ UIOverlay.jsx
│  │  └─ vehicle/
│  │     └─ VehicleController.jsx
│  ├─ config/
│  │  └─ theme.js
│  ├─ data/
│  │  ├─ landmarks.js
│  │  ├─ reviewLocales.js
│  │  ├─ routes.js
│  │  ├─ terrain.js
│  │  └─ travelGuide.js
│  ├─ hooks/
│  │  ├─ useKeyboardDrive.js
│  │  ├─ useLandmarkReviews.js
│  │  └─ useTerrainData.js
│  ├─ state/
│  │  └─ useAppStore.js
│  ├─ styles/
│  │  ├─ base.css
│  │  ├─ decorations.css
│  │  ├─ home.css
│  │  ├─ hud.css
│  │  ├─ intro.css
│  │  └─ panels.css
│  ├─ App.jsx
│  ├─ index.css
│  ├─ main.jsx
│  └─ style.css
├─ index.html
├─ package.json
├─ postcss.config.js
├─ vite.config.js
└─ README.md
```

## 关键模块

### `src/data/routes.js`

路线数据层。

- `currentRoute`：mock 路线点，结构模拟未来真实道路数据。
- `roadCurve`：路线中心线曲线。
- `routeSegments`：语义路线体验层。
- `getRouteSegmentAtProgress`：根据车辆进度获取当前路段。
- `getRouteProfile`：返回速度、粗糙度、转向倾斜、路面标签等体验参数。

### `src/data/terrain.js`

地形数据层。

- 加载 DEM tile。
- 生成 terrain geometry 和 stylized texture。
- 提供地形采样函数。
- 生成语义化道路高度曲线。
- 在地形网格生成时执行道路走廊削坡，减少道路穿山。

### `src/components/vehicle/VehicleController.jsx`

车辆控制层。

- 沿 `roadCurve` 推进车辆。
- 支持手动驾驶和自动巡航。
- 使用当前语义路段控制速度、车身晃动和转向反馈。
- 更新 HUD 所需的 `routeContext`。

### `src/components/scene/RoadRibbon.jsx`

道路渲染层。

- 按语义路段拆分道路 mesh。
- 根据交通状态和路段类型着色。
- 使用语义道路高度曲线保持道路连续和平滑。

### `src/components/home/HomePage.jsx`

首页体验层。

- 多页面切换。
- 目的地、路线规划、评价、3D 导览入口。
- 读取 `routeSegments` 展示路线体验信息。

## 启动方式

### 前端

```bash
npm install
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173
```

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 交互说明

### 首页

- 切换 `EN / 中文`
- 切换目的地、路线规划、评价、3D 导览页面
- 点击目的地卡片进入对应 3D 导览
- 点击主按钮进入 3D Drive Explorer

### 3D Explorer

- `Enter`：进入 3D 场景
- `W / S`：沿路线前进 / 后退
- `Shift`：加速
- `R`：自动巡航
- `V`：地图 / 跟随视角切换
- `F`：打开附近地标侧边导览
- `Esc`：关闭模型预览或地标聚焦
- 鼠标拖拽：模型预览中旋转模型
- 鼠标滚轮：模型预览中缩放模型

## 环境变量

默认不需要环境变量即可运行。

如需请求后端 mock API：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

如需启用 Google 3D Tiles 或其他 3D Tiles 数据源：

```bash
VITE_GOOGLE_3DTILES_URL=your_tileset_url
```

后端 CORS 默认允许：

```text
http://127.0.0.1:5173
http://localhost:5173
```

可通过环境变量覆盖：

```bash
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

## 后续方向

- 用 OSM / OSRM / GraphHopper / Valhalla 替换 mock route geometry。
- 用 PostGIS 管理景点、路线、空间查询和附近搜索。
- 接入真实评论数据爬取、清洗和归一化。
- 扩展路线语义层，让大模型或规则系统生成更自然的旅行路线。
- 继续优化隧道、桥梁、山路的 3D 表现。
- 评估是否移除未使用的 `@react-three/rapier` 依赖。
