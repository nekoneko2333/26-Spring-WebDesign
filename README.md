# Web3D Travel Platform

一个基于 React、Vite、Three.js / React Three Fiber 的 3D 旅行规划项目。当前主线是 **Trip3D 意大利旅行平台**，同时保留两个独立实验入口：路线拓扑视图和 Amsterdam Museumplein VR Lab。

## 快速启动

```bash
npm install
npm.cmd run dev
```

默认地址：

```txt
http://127.0.0.1:5173
```

生产构建检查：

```bash
npm.cmd run build
```

## 页面入口

```txt
http://127.0.0.1:5173/                 # Trip3D 意大利首页
http://127.0.0.1:5173/#/v2             # 路线地图 / 拓扑版本
http://127.0.0.1:5173/#/v3             # 抽象拓扑视图
http://127.0.0.1:5173/#/amsterdam-vr   # Amsterdam Museumplein VR Lab
```

## 当前功能

### Trip3D 意大利旅行平台

- 响应式首页：左侧可折叠导航、右上角账户头像、目的地搜索、旅行服务入口。
- 旅行服务面板：酒店、门票、餐厅、交通、天气、预算、城市攻略、AI 行程草案、3D 路线预览。
- 目的地浏览：搜索、筛选、排序、收藏、对比、加入路线。
- 行程规划：路线顺序调整、必去景点锁定、路线优化、按天生成行程、导出文本。
- 本地账户：游客模式、本地登录状态、个人中心、收藏和路线状态保存。
- 数据缓存：收藏、路线、锁定景点、账户状态存入浏览器；实时天气和外部资料使用前端缓存策略。
- 3D 导览：Three.js 场景、车辆沿路线行驶、地标聚焦、模型预览。

### 路线实验页

- `#/v2`：路线地图和拓扑信息展示。
- `#/v3`：更抽象的路线关系视图。
- 数据来自 `public/data/italy-route-topology.json`。

### Amsterdam Museumplein VR Lab

- 独立 hash 路由：`#/amsterdam-vr`。
- 本地静态城市数据，不影响意大利主站。
- 数据包含 3DBAG 建筑 GLB tile、OSM 地面图层、POI 和本地漫游路线。
- 支持自动导览和手动漫游控制。

## 文件结构

```txt
web3d-project/
├── backend/                         # FastAPI 后端预留层
│   ├── main.py                      # API 入口
│   ├── db.py                        # 数据库连接预留
│   ├── postgis_queries.py           # PostGIS 查询预留
│   ├── playwright_reviews.py        # 评论抓取 / 自动化预留
│   └── requirements.txt             # Python 依赖
│
├── public/                          # 浏览器运行时静态资源
│   ├── data/                        # 前端可直接读取的数据缓存
│   │   ├── italy-route-topology.json
│   │   └── live-landmarks.json
│   ├── models/                      # 意大利 3D 导览模型
│   └── city/
│       └── amsterdam-museumplein/   # Amsterdam VR 本地城市数据包
│           ├── manifest.json
│           ├── pois.json
│           ├── layers/
│           ├── routes/
│           └── tiles/
│
├── src/
│   ├── App.jsx                      # 应用入口与 hash 路由分发
│   ├── main.jsx                     # React 挂载入口
│   ├── index.css                    # 全局样式入口
│   ├── style.css                    # 样式聚合入口
│   │
│   ├── components/
│   │   ├── home/                    # Trip3D 首页、行程、服务、账户等主界面
│   │   ├── layout/                  # 3D 导览外层布局
│   │   ├── scene/                   # 3D 场景层
│   │   ├── camera/                  # 摄像机跟随逻辑
│   │   ├── vehicle/                 # 车辆控制和模型
│   │   ├── landmarks/               # 意大利地标模型
│   │   └── ui/                      # HUD、弹层、模型预览
│   │
│   ├── data/                        # 意大利路线、地标、文案、评价本地数据
│   ├── hooks/                       # 天气、Wikipedia、路线、实时数据 hooks
│   ├── state/                       # Zustand 全局状态
│   ├── styles/                      # 分模块 CSS
│   ├── config/                      # 主题配置
│   └── experiments/
│       ├── route-versions/          # v2 / v3 路线实验页
│       └── amsterdam-vr/            # Amsterdam VR 独立实验区
│
├── tools/                           # 本地数据准备脚本
│   ├── fetch-live-landmark-data.mjs
│   ├── fetch-italy-route-topology.mjs
│   └── amsterdam-vr/                # Amsterdam 数据下载和转换工具
│
├── data/                            # 原始下载数据目录，默认不入库
├── package.json
├── vite.config.js
└── README.md
```

## 数据与缓存

### 前端本地缓存

当前主站使用浏览器本地存储保存：

- 用户登录状态：`web3d.userSession`
- 侧边栏折叠状态：`web3d.sidebarCollapsed`
- 收藏、路线顺序、锁定景点等行程状态

实时天气、Wikipedia 摘要和 live landmark 数据通过 React Query / 自定义 hook 在页面会话中缓存。

### 是否需要数据库

现在的前端功能可以先用 `localStorage` 和静态 JSON 跑通，不强依赖数据库。后续如果要做真实多用户旅行网站，应增加数据库：

- 推荐主库：PostgreSQL + PostGIS
- 原因：项目已经有经纬度、路线、城市 POI、空间查询和未来地理数据扩展需求
- 适合存储：用户、收藏、行程、景点、评论、价格缓存、票务缓存、路线几何、城市边界、POI 空间索引
- 可选缓存层：Redis，用于热门目的地、天气、票价和搜索结果缓存

当前 `backend/db.py` 和 `backend/postgis_queries.py` 已保留 PostGIS 接入位置。

## Amsterdam 数据流程

Amsterdam 实验区运行时不依赖在线 API。网络访问只发生在数据准备阶段，浏览器最终读取 `public/city/amsterdam-museumplein/` 下的本地静态文件。

建筑数据：

```txt
data/raw/3dbag/museumplein/cityjson/
public/city/amsterdam-museumplein/tiles/*.glb
public/city/amsterdam-museumplein/tiles/building-tiles.json
```

转换命令：

```powershell
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\convert_cityjson_to_glb.py
```

地面数据：

```txt
data/raw/osm/amsterdam-museumplein/osm-map.xml
public/city/amsterdam-museumplein/layers/ground-layers.geojson
```

重新生成：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\fetch_osm_ground_layers.py
```

## 后端启动

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

前端接入后端时设置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 维护约定

- `node_modules/`、`dist/`、`data/raw/`、`__pycache__/` 和工具缓存不进入版本管理。
- 运行时需要的静态资源放在 `public/`。
- 主站功能放在 `src/components/home/`，独立实验功能放在 `src/experiments/`。
- 通用数据 hook 放在 `src/hooks/`，全局状态放在 `src/state/`。
- 大型城市原始数据放在 `data/raw/`，转换后的浏览器资源再进入 `public/city/`。

## 已知限制

- 3D 驾驶仍是路线曲线驱动，不是真实道路物理驾驶。
- 票务、酒店、餐厅和预算目前是基于本地路线数据的功能面板，尚未接入真实供应商 API。
- 本地账户不是正式认证系统，只适合原型阶段。
- Amsterdam 建筑转换仍是预览级流程，暂未处理复杂洞面、多语义表面和精细材质。
