# Web3D Project

本项目目前包含两个彼此隔离的体验：

- **Italy Drive Guide**：意大利旅游路线规划与 3D 驾驶导览。
- **Amsterdam Museumplein VR Lab**：阿姆斯特丹 Museumplein 城市 VR 漫游实验区。

Amsterdam 实验区通过独立 hash 路由进入，数据和代码都放在独立目录中，不影响原有意大利导览功能。

## 快速启动

```bash
npm install
npm.cmd run dev
```

默认应用：

```txt
http://127.0.0.1:5173
```

Amsterdam VR 实验区：

```txt
http://127.0.0.1:5173/#/amsterdam-vr
```

构建检查：

```bash
npm.cmd run build
```

## 功能概览

### Italy Drive Guide

- 旅游首页：目的地、路线规划、评价、3D 导览入口。
- 目的地卡片：搜索、筛选、收藏、对比、加入路线。
- 路线规划：本地持久化、OSRM 距离与时长。
- 内容数据：Wikipedia summary 作为目的地背景资料来源。
- 3D 导览：React Three Fiber / Three.js 场景、车辆沿路线曲线行驶、地标聚焦、模型预览。

### Amsterdam Museumplein VR Lab

- 独立入口：`#/amsterdam-vr`。
- 本地静态数据：`public/city/amsterdam-museumplein/`。
- 建筑数据：30 个由 3DBAG CityJSON 转换而来的 GLB tile。
- 地面数据：OpenStreetMap 本地导出的道路、步道、公园、广场、水体。
- POI：Rijksmuseum、Van Gogh Museum、Stedelijk Museum、Concertgebouw、Vondelpark edge。
- 场景渲染：建筑、地面图层、POI 标牌、路线线、城市导览面板。

## 目录结构

```txt
web3d-project/
├── backend/                              # FastAPI 后端，保留 mock API、PostGIS 预留代码
│   ├── main.py                           # FastAPI 入口
│   ├── db.py                             # 数据库连接预留
│   ├── postgis_queries.py                # PostGIS 查询预留
│   └── requirements.txt                  # 后端依赖
│
├── public/                               # 前端运行时静态资源
│   ├── city/                             # 城市 VR 实验区本地数据
│   │   └── amsterdam-museumplein/        # Amsterdam Museumplein 数据包
│   │       ├── manifest.json             # 城市数据入口、中心点、文件索引、坐标系说明
│   │       ├── pois.json                 # 人工整理的景点 / POI
│   │       ├── layers/                   # 地面图层数据
│   │       │   └── ground-layers.geojson # OSM 转换后的道路、绿地、水体、广场
│   │       ├── routes/                   # 本地漫游路线
│   │       │   └── museumplein-loop.geojson
│   │       └── tiles/                    # 3D 建筑 tile
│   │           ├── building-tiles.json   # GLB tile 清单
│   │           └── *.glb                 # 3DBAG CityJSON 转换后的建筑模型
│   │
│   └── models/                           # Italy 3D 导览使用的模型资源
│       ├── colosseum.glb
│       ├── leaning_tower_of_pisa.glb
│       └── low-poly_truck_car_drifter.glb
│
├── src/                                  # 前端源码
│   ├── components/                       # Italy Guide 的主要 UI 和 3D 组件
│   │   ├── home/                         # 首页、路线规划、评价页
│   │   ├── scene/                        # 地图表面、道路、灯光、地面等 3D 场景层
│   │   ├── vehicle/                      # 车辆控制与车辆模型
│   │   ├── landmarks/                    # 意大利地标模型渲染
│   │   └── ui/                           # HUD、弹层、模型预览等 UI
│   │
│   ├── data/                             # Italy Guide 的路线、地标、文案、地形数据
│   ├── hooks/                            # OSRM、Wikipedia、天气、评价等数据 hook
│   ├── state/                            # Zustand 全局状态
│   ├── styles/                           # Italy Guide 样式文件
│   │
│   ├── experiments/                      # 独立实验区，不耦合主功能
│   │   └── amsterdam-vr/                 # Amsterdam Museumplein VR Lab
│   │       ├── AmsterdamVrLab.jsx        # 实验区主页面和 Three.js 场景
│   │       ├── amsterdam-vr.css          # 实验区独立样式
│   │       └── README.md                 # 实验区说明
│   │
│   ├── App.jsx                           # 应用入口，按 hash 路由切换 Amsterdam 实验区
│   └── main.jsx                          # React 挂载入口
│
├── tools/                                # 本地数据准备脚本
│   └── amsterdam-vr/                     # Amsterdam 数据下载和转换工具
│       ├── README.md                     # 数据准备说明
│       ├── download-3dbag-museumplein.ps1# 下载 3DBAG CityJSON
│       ├── tile_download.py              # 本地化 3DBAG tile 下载器
│       ├── convert_cityjson_to_glb.py    # CityJSON -> GLB 转换
│       └── fetch_osm_ground_layers.py    # OSM XML -> ground-layers.geojson
│
├── data/                                 # 原始下载数据目录，已 gitignore
├── package.json                          # 前端依赖和 npm scripts
├── vite.config.js                        # Vite 配置
└── README.md                             # 项目说明
```

## Amsterdam 数据流程

Amsterdam 实验区运行时不依赖在线 API。所有网络访问只发生在数据准备阶段，最终浏览器只读取本地静态文件。

### 建筑数据

数据源：

```txt
3DBAG CityJSON
```

原始下载目录：

```txt
data/raw/3dbag/museumplein/cityjson/
```

运行时文件：

```txt
public/city/amsterdam-museumplein/tiles/*.glb
public/city/amsterdam-museumplein/tiles/building-tiles.json
```

转换命令：

```powershell
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\convert_cityjson_to_glb.py
```

坐标对齐：

- 3DBAG 建筑源数据使用 `EPSG:28992`。
- 转换脚本读取 `manifest.json` 中的中心点。
- 脚本通过 `pyproj` 将中心点从 `EPSG:4326` 投影到 `EPSG:28992`。
- GLB 顶点会被转换到以 Museumplein 中心为原点的本地米制坐标。

### 地面数据

数据源：

```txt
OpenStreetMap XML extract
```

原始下载文件：

```txt
data/raw/osm/amsterdam-museumplein/osm-map.xml
```

运行时文件：

```txt
public/city/amsterdam-museumplein/layers/ground-layers.geojson
```

重新生成地面图层：

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

如果前端需要访问后端：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 已知限制

- Italy Drive Guide 的车辆路线仍然是曲线驱动，不是真实道路网络驾驶物理。
- Amsterdam 的 GLB 转换脚本是预览级流程：使用 CityJSON LoD1.2 外环扇形三角化，暂时忽略洞、多语义表面和更精细材质。
- Amsterdam 地面层已经来自真实 OSM 数据，但渲染方式仍是简化视觉层。
- Amsterdam 漫游路线目前仍是手写 GeoJSON，不是从本地步行网络自动生成。
- `data/raw/` 已加入 `.gitignore`，原始下载数据不进入版本管理。可运行的静态资源放在 `public/city/`。

## 后续方向

- 给 Amsterdam 建筑增加轮廓线，让体块和屋顶更清楚。
- 将 POI 与建筑 footprint 做空间关联，高亮真正的重点建筑。
- 用本地 OSM 步行网络替换当前手写路线。
- 增加第一人称步行和自动导览模式。
- 当城市数据扩大后，按距离加载 / 卸载 GLB tile。
