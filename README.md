# Web3D Italy Drive

`Web3D Italy Drive` 是一个 **旅游专题首页 + 3D 沉浸式路线导览模块** 的混合项目。
用户先在首页浏览意大利地标、路线、坐标与旅行内容，再进入 3D `Drive Explorer`，沿着样条路线进行导览、聚焦地标、查看评论侧栏与模型预览。

---

## 项目现状概览

### 首页层
当前首页已经不是单一 landing page，而是一个可切换中英语言的旅行专题页面，包含：
- Hero 主视觉与语言切换
- stylized Italy map
- 地标坐标卡片
- route / itinerary 内容区
- travel journal 内容区
- 进入 3D explorer 的 CTA

### 3D Explorer 层
3D 模块通过覆盖层方式打开，保留沉浸式交互体验：
- 地图 / 跟随 / 聚焦三种视角
- 基于 `THREE.CatmullRomCurve3` 的车辆导览
- `W / S` 手动推进、`R` 自动巡航
- `F` 地标交互与左右侧沉浸信息栏
- 模型预览弹层
- 可从 3D 返回首页

### 后端层
后端当前主要提供评论读取与后续空间查询准备：
- FastAPI 评论接口
- PostgreSQL / `psycopg` 读取
- PostGIS 查询模板
- Playwright 评论抓取脚本

---

## 当前能力

### 首页
- 中英双语切换
- 中文排版与英文风格统一的 serif 方向
- 旅游站风格地图与坐标展示
- 从首页打开 3D explorer
- 点击地标直接进入对应 3D 导览入口

### 3D Explorer
- React 18 + R3F 场景容器
- 地形表面、海洋底色、道路条带
- 基于 mock route points 的平滑样条路径运动
- 地标模型加载与聚焦
- 左右侧沉浸式信息栏
- 模型预览弹层
- 评论内容按当前语言显示为全英 / 全中

### 后端
- `FastAPI` API
- 数据库连接壳与 landmark review 查询
- PostGIS nearby reviews 查询模板
- Playwright 抓取脚本

---

## 技术栈

### 前端核心
- **Vite 8**
- **React 18**
- **Three.js**
- **@react-three/fiber**
- **@react-three/drei**
- **Zustand**
- **@tanstack/react-query**

### 3D / 可视化相关
- **three-stdlib**
- **3d-tiles-renderer**
- 自定义 DEM 高度图读取与 terrain sampling
- `THREE.CatmullRomCurve3` 路径导览动画

### 样式与 UI
- **Tailwind CSS 4**（当前仅作为基础能力接入）
- 以自定义 CSS 模块为主：`base / home / hud / panels / intro / decorations`
- Google Fonts：
  - `Bodoni Moda`
  - `Manrope`
  - `Noto Serif SC`

### 后端
- **FastAPI**
- **Uvicorn**
- **psycopg[binary]**
- **Playwright**

### 当前说明
- `@react-three/rapier` 仍然保留在 `package.json` 中，但**当前运行主链已不再使用**。
- 当前车辆系统是 **kinematic curve drive**，不是物理车方案。

---

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
│  │  ├─ terrain.js
│  │  └─ travelGuide.js
│  ├─ hooks/
│  │  ├─ useKeyboardDrive.js
│  │  ├─ useLandmarkReviews.js
│  │  └─ useTerrainData.js
│  ├─ legacy/
│  │  ├─ camera/
│  │  ├─ car/
│  │  ├─ core/
│  │  ├─ landmarks/
│  │  ├─ ui/
│  │  ├─ CarRigPlaceholder.jsx
│  │  ├─ LandmarksCloud.jsx
│  │  └─ main.js
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
└─ vite.config.js
```

---

## 启动方式

### 1) 前端
在项目根目录运行：

```bash
npm install
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173
```

### 2) 后端
在新终端中运行：

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3) Playwright 抓取脚本（可选）

```bash
cd backend
pip install -r requirements.txt
playwright install
python playwright_reviews.py
```

---

## 当前交互

### 首页
- 切换 `EN / 中文`
- 点击 `Open 3D Drive / 进入 3D 导览`
- 点击地图 pin 或地标卡片，直接打开 3D explorer

### 3D Explorer
- `Enter`：从开屏进入场景
- `W / S`：沿样条路线前进 / 后退
- `Shift`：加速推进
- `V`：地图 / 跟随视角切换
- `R`：自动巡航开关
- `F`：打开附近地标的侧边导览
- `Esc`：关闭模型预览 / 地标聚焦 / 返回路线
- 鼠标拖拽：模型预览中旋转模型
- 滚轮：模型预览中缩放
- `Back to Travel Guide`：返回首页

### 交互锁定说明
当聚焦侧栏或模型预览打开时：
- 后方 3D pointer interaction 会被锁住
- 自动巡航会被关闭
- 场景不再继续接收驾驶类交互

---

## 环境变量

如果需要接入真实 `3D Tiles` 地址，可在前端环境中提供：

```bash
VITE_GOOGLE_3DTILES_URL=your_tileset_url
```

未提供时，项目仍可继续使用当前 terrain + mock route 方案运行。

---

## 开发说明

### 当前运行入口

```text
src/main.jsx -> src/App.jsx
```

其中：
- `HomePage.jsx`：旅游专题首页
- `AppShell.jsx`：3D explorer 外壳与开屏
- `VehicleController.jsx`：当前曲线路径导览逻辑
- `UIOverlay.jsx`：HUD、侧栏、模型预览与交互层

### 关于 `src/legacy/`
`src/legacy/` 保存旧版原生 Three.js / 迁移过程代码，当前默认运行不会进入这些文件。
保留它们的目的是：
- 参考旧实现
- 回溯交互逻辑
- 为后续迁移或比较提供资料

### 当前文件整理说明
本次整理做了最小且明确的清理：
- 删除了未使用的 `src/hooks/useLandmarksQuery.js`
- 保留 `src/legacy/` 作为历史参考
- README 中的技术栈、目录结构、交互说明已和当前实现对齐

---

## 当前已知技术现状

- 当前车辆不是物理车，而是 **CatmullRomCurve3 + progress** 的 kinematic 导览方案
- terrain 已做高度平滑与海洋底色处理
- road ribbon 已做更细、更贴地的几何生成
- 语言系统当前已接入：首页与 3D HUD 共用同一语言状态
- 评论面板当前通过前端本地化数据保证全英 / 全中显示

---

## 后续建议

- 将 landmark `name / description` 也改成严格双语字段，彻底消除混合文本
- 把语言系统继续扩展到模型预览标题与更多 3D 文案
- 继续收敛 terrain 的地图化视觉表现
- 若后续重新启用物理车，再评估是否真正移除 `@react-three/rapier`
- 接入真实 PostgreSQL / PostGIS 数据流
