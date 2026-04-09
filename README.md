# Web3D Italy Drive

`Web3D Italy Drive` 现在是一个 **旅游网站首页 + 3D 沉浸式子功能** 的混合项目：
用户先进入旅游站风格首页，浏览意大利路线、坐标和景点简介；然后可进入 3D `Drive Explorer` 模块，进行驾驶、自动驾驶、地标交互、评论查看与模型预览。

---

## 当前产品结构

### 1. 主网站：首页
当前默认首屏是一个旅游网站风格首页，包含：
- Hero 主视觉
- stylized Italy map
- landmark coordinate cards
- route / itinerary 内容区
- travel journal 风格内容区
- 进入 3D explorer 的 CTA

### 2. 子功能：3D Drive Explorer
原本的 3D Italy Drive 页面现在被封装成主站里的一个沉浸式功能模块：
- 从首页进入
- 以覆盖层方式打开
- 可返回主站首页
- 保留原有 driving / landmark / focus / model viewer 能力

---

## 当前完成的能力

### 首页层
- 旅游网站风格主视觉
- 地图与坐标展示
- 地标卡片
- itinerary / journal 内容块
- 从首页进入 3D explorer

### 3D Explorer 层
- React 18 + R3F 场景容器
- 开屏页 / HUD / Landmark Popup / Focus Panel / Model Viewer
- `WASD` 驾驶、`V` 视角切换、`F` 地标交互、`R` 自动驾驶
- DEM 风格地形加载与高度采样
- 3D Tiles 接入层与加载提示

### 后端层
- FastAPI 评论接口（含 mock 数据）
- PostGIS-ready 查询模板
- Playwright 评论抓取脚本模板

---

## 技术栈

### 前端
- **Vite 8**
- **React 18**
- **@react-three/fiber**
- **@react-three/drei**
- **@react-three/rapier**
- **Zustand**
- **@tanstack/react-query**
- **3d-tiles-renderer**
- **Tailwind CSS**（局部样式基础能力）

### 后端
- **FastAPI**
- **Uvicorn**
- **psycopg**
- **Playwright**

---

## 目录结构

```text
web3d-project/
├─ backend/
│  ├─ db.py                          # 数据库连接壳
│  ├─ main.py                        # FastAPI 服务入口
│  ├─ postgis_queries.py             # PostGIS 查询模板
│  ├─ playwright_reviews.py          # 评论抓取模板
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
│  │  │  └─ FollowCamera.jsx         # map / follow / focus 相机
│  │  ├─ home/
│  │  │  └─ HomePage.jsx             # 主网站首页
│  │  ├─ landmarks/
│  │  │  └─ LandmarkModels.jsx       # 地标模型与点击交互
│  │  ├─ layout/
│  │  │  └─ AppShell.jsx             # 3D explorer 外壳与开屏
│  │  ├─ scene/
│  │  │  ├─ GroundPlane.jsx          # 物理支撑平面
│  │  │  ├─ MapSurface.jsx           # DEM 地形表面
│  │  │  ├─ RoadRibbon.jsx           # 路网条带
│  │  │  ├─ SceneLights.jsx          # 场景灯光
│  │  │  └─ TilesLayer.jsx           # 3D Tiles 加载层
│  │  ├─ ui/
│  │  │  ├─ ModelViewerOverlay.jsx   # 模型预览弹层
│  │  │  └─ UIOverlay.jsx            # HUD / Popup / Focus / 评论 UI
│  │  └─ vehicle/
│  │     └─ VehicleController.jsx    # 当前车辆控制与视觉车体
│  ├─ config/
│  │  └─ theme.js                    # 场景主题色
│  ├─ data/
│  │  ├─ landmarks.js                # 地标与道路数据
│  │  ├─ terrain.js                  # DEM 风格地形加载
│  │  └─ travelGuide.js              # 首页文案 / 坐标 / 地图元数据
│  ├─ hooks/
│  │  ├─ useKeyboardDrive.js
│  │  ├─ useLandmarkReviews.js
│  │  ├─ useLandmarksQuery.js
│  │  └─ useTerrainData.js
│  ├─ legacy/                        # 原生 Three.js 旧实现（迁移参考）
│  │  ├─ camera/
│  │  ├─ car/
│  │  ├─ core/
│  │  ├─ landmarks/
│  │  ├─ ui/
│  │  ├─ CarRigPlaceholder.jsx
│  │  ├─ LandmarksCloud.jsx
│  │  └─ main.js
│  ├─ state/
│  │  └─ useAppStore.js              # 全局 UI / 车辆状态
│  ├─ styles/
│  │  ├─ base.css
│  │  ├─ decorations.css
│  │  ├─ home.css                    # 首页旅游站样式
│  │  ├─ hud.css
│  │  ├─ intro.css
│  │  └─ panels.css
│  ├─ App.jsx                        # 应用根组件：首页 + 3D explorer 管理
│  ├─ index.css                      # 顶层样式入口
│  ├─ main.jsx                       # React 挂载入口
│  └─ style.css                      # 分模块样式聚合入口
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
conda activate web3d-backend
npm install
npm run dev
```

默认地址通常为：

```text
http://127.0.0.1:5173
```

若端口被占用，Vite 会自动切换到其他端口，请以终端输出为准。

### 2) 后端
新开一个终端：

```bash
conda activate web3d-backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3) Playwright 模板（可选）
如需测试评论抓取模板：

```bash
cd backend
pip install -r requirements.txt
playwright install
python playwright_reviews.py
```

---

## 当前交互

### 首页
- 点击 `Open 3D Drive`：进入 3D explorer
- 点击坐标区或地图 pin：进入 3D explorer

### 3D Explorer
- `Enter`：从 3D 开屏页进入场景
- `W / A / S / D`：驾驶
- `Shift`：加速
- `V`：地图视角 / 驾驶视角切换
- `R`：自动驾驶开关
- `F`：进入附近 landmark 交互
- `Esc`：退出当前 landmark / 面板 / 预览
- 鼠标拖拽：在模型预览中旋转模型
- 滚轮：在模型预览中缩放
- `Back to Travel Guide`：返回首页

---

## 环境变量

如果你要继续调试 3D Tiles，可在前端环境中提供：

```bash
VITE_GOOGLE_3DTILES_URL=你的_tileset_url
```

当前项目在未提供该变量时会显示降级提示，并继续使用 DEM 地形。

---

## 开发说明

### 当前默认入口
当前运行入口为：

```text
src/main.jsx -> src/App.jsx
```

其中：
- `HomePage.jsx` 负责主网站首页
- `AppShell.jsx` 负责 3D explorer 壳层
- `VehicleController.jsx` 负责当前车辆控制

### 关于 `src/legacy/`
`src/legacy/` 保存的是迁移前的原生 Three.js 实现，主要用途：
- 对照旧逻辑
- 回溯旧交互
- 为继续迁移提供参考

它不是当前默认运行入口。

### 当前视觉方向
当前项目风格分成两层：
- **首页**：旅游网站 / 杂志感 / 地图坐标导览
- **3D explorer**：雾蓝、金色、玻璃质感 HUD 的沉浸式路线浏览

---

## 后续待完成事项

- 首页点击具体 landmark 后，3D explorer 直达该景点
- 更真实的车辆物理（进一步接近 raycast vehicle）
- 更稳定的 landmark 交互判定
- 3D Tiles 真正联调完成
- PostgreSQL + PostGIS 真库接入
- 更大规模地标时的性能优化（如 InstancedMesh）
