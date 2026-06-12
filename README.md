# Trip3D 意大利旅行导览

基于 React、Vite 和 CesiumJS 的意大利旅行规划与 3D 驾驶/步行导览项目。项目包含景点筛选、混合交通路线规划、行程导出、账户状态，以及使用 Cesium World Terrain、全球影像和 OSM Buildings 的 3D 地图。

完整的功能说明、技术架构和数据流请查看 [FEATURES_AND_TECH_STACK.md](./FEATURES_AND_TECH_STACK.md)。

## 当前工作区改动

以下内容来自当前尚未提交的工作区改动，涉及 7 个源码文件：

- 路线规划从整条路线单一交通方式改为相邻景点逐段规划，支持 `AUTO`、`DRIVE`、`WALK` 和分段 `MIXED` 数据。
- AUTO 对同城近距离候选段同时请求步行和驾车路线。只有真实步行路网长度不超过 `1 km`、不是坐标直线估算，且步行时间最多为驾车时间的 `80%` 时才选择步行。
- Venice 岛内保留步行优先；跨城进入 Venice 时可拆分为驾车接入和岛内步行，避免车辆吸附到少量可驾车道路后反复绕行。
- Google Routes 仍为后端首选；未配置密钥或请求失败时，驾车降级到公共 OSRM，步行降级到 OpenStreetMap 步行路由，最后才使用坐标估算。
- 增加绕行比、折返点和道路重叠率诊断，用于识别同城路线吸附、反复折返和明显绕行。
- 路线预览按真实景点/路线 bounds 和城市轮廓绘制，驾车与步行使用不同线型；Venice 使用水城视觉提示，不再复用固定城市网格模板。
- 短距离和短时长改用米、分钟显示，不再把有效路段显示成 `0 km / 0.0 h`。
- 日程、站点连接、TXT 和打印版统一使用真实分段交通方式，不再把步行段写成“行驶”。
- 路线控制区增加自动混合/驾车/步行切换与一键清空；清空时同步重置路线、锁定项、3D 几何和保存状态。
- 日程活动块改为纸白、铅笔黑、修正红和便利贴黄的手绘风格，并删除冗长的活动顺序说明。
- 3D 场景按路线进度切换交通载体：驾车段显示车辆，步行段显示两帧动画人物，并使用约 `5 km/h` 的步行速度。
- Cesium ion Token 缺失或返回 `401/403` 时，影像降级到 OpenStreetMap、地形降级到椭球地形；建筑不可用时单独关闭，不再让整个场景失败。
- 已修正自动建议天数的状态依赖，避免 React `Maximum update depth exceeded` 循环更新。

当前验证：

```powershell
npm run build
python -m py_compile backend/main.py
git diff --check
```

上述检查均已通过。生产构建仍会提示主 bundle 较大，这是现有 Cesium/Three.js 打包体积问题，不影响本次构建成功。

## 快速启动

### 环境要求

- Node.js `20.19+` 或 `22.12+`
- npm
- Python `3.11+`，仅完整后端需要
- 一个 [Cesium ion](https://ion.cesium.com/) Access Token，建议配置但不是基础地图运行的硬性条件

克隆并安装依赖：

```powershell
git clone <repository-url>
cd web3d-project
npm install
```

复制前端环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_CESIUM_ION_TOKEN=your-cesium-ion-token
VITE_API_BASE_URL=http://127.0.0.1:8000
```

启动前端：

```powershell
npm run dev
```

如果 PowerShell 阻止执行 `npm.ps1`，改用：

```powershell
npm.cmd run dev
```

访问：

```text
http://127.0.0.1:5173/
```

仅启动前端也可以浏览主页和使用 3D 导览。路线规划会优先请求本地后端；后端不可用时，会尝试直接请求公共 OSRM 服务。

## Cesium 配置

配置 `VITE_CESIUM_ION_TOKEN` 后可以加载：

- Cesium World Terrain
- 全球影像
- Cesium OSM Buildings

未配置 Token，或 ion 请求返回 `401/403` 时，应用会继续使用 OpenStreetMap 影像和椭球地形。此时仍可查看路线和运行导览，但不会有 Cesium 全球地形与 OSM 3D Buildings。

### 创建和配置 Token

1. 打开 [Cesium ion](https://ion.cesium.com/) 并注册或登录账户。
2. 进入 **Access Tokens** 页面。
3. 点击 **Create token** 创建新的访问令牌。
4. 为 Token 填写容易识别的名称，例如 `Trip3D Local Development`。
5. 在权限设置中允许读取 ion 资源。项目需要访问：
   - Cesium World Terrain
   - Cesium World Imagery
   - Cesium OSM Buildings，ion Asset ID 为 `96188`
6. 保存后复制生成的 Token 字符串。

首次本地开发建议先不要设置 URL/域名限制，确认地图能够正常加载后，再按需要限制允许来源。需要限制时至少加入：

```text
http://127.0.0.1:5173
http://localhost:5173
```

部署后还要加入正式站点来源，例如：

```text
https://example.com
```

### 写入项目配置

如果还没有 `.env.local`，先复制模板：

```powershell
Copy-Item .env.example .env.local
```

将复制的 Token 写入 `.env.local`，不要添加引号：

```env
VITE_CESIUM_ION_TOKEN=eyJhbGciOi...
VITE_API_BASE_URL=http://127.0.0.1:8000
```

环境变量由 Vite 在启动时读取，因此修改后必须停止并重新启动开发服务器：

```powershell
npm run dev
```

进入 3D 导览后，如果能看到全球影像、地形起伏和建筑，则配置成功。若只看到 OpenStreetMap 平面底图，说明 ion 资源未加载，应用正在使用降级模式。

`.env.local` 已被 Git 忽略。不要把真实 Token 写入源码、README、聊天截图或提交记录。前端 Token 最终会发送到浏览器，因此生产环境应使用最小读取权限和来源限制，不能将它当作后端密钥使用。

Vite 在生产构建时会自动复制 Cesium 的 `Workers`、`Assets`、`Widgets` 和 `ThirdParty` 静态资源，无需手动复制。

## 完整后端

后端基于 FastAPI。它提供账户、路线代理、景点、点评和 PostgreSQL 数据接口。

### 安装 Python 依赖

推荐使用 Python `3.11+`。现有 PowerShell 脚本默认使用名为 `web3d-backend` 的 Conda 环境：

```powershell
conda create -n web3d-backend python=3.11
conda run -n web3d-backend pip install -r backend/requirements.txt
```

不使用 Conda 时也可以自行创建虚拟环境并运行：

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

此方式未配置 PostgreSQL 时会使用本地 SQLite 保存账户数据。

### PostgreSQL 模式

创建数据库和用户：

```sql
CREATE USER trip3d_app WITH PASSWORD 'replace-with-a-strong-password';
CREATE DATABASE trip3d OWNER trip3d_app;
```

复制后端环境变量：

```powershell
Copy-Item .env.backend.example .env.backend
```

编辑 `.env.backend`：

```env
DATABASE_URL=postgresql://trip3d_app:replace-with-a-strong-password@127.0.0.1:5432/trip3d
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
BACKEND_PORT=8001
GOOGLE_MAPS_API_KEY=
```

使用项目脚本启动：

```powershell
npm run dev:backend:postgres
```

此时需要同步修改 `.env.local`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

后端地址：

```text
API:    http://127.0.0.1:8001
Docs:   http://127.0.0.1:8001/docs
Health: http://127.0.0.1:8001/api/health
```

`GOOGLE_MAPS_API_KEY` 可选。配置后，后端优先使用 Google Routes，并支持 `DRIVE` 和 `WALK`。未配置或请求失败时，驾车使用公共 OSRM，步行使用 OpenStreetMap 步行路由。

## 路线规划规则

`POST /api/routes/plan` 接受以下 `travelMode`：

- `DRIVE`：整段驾车。
- `WALK`：整段步行。
- `MIXED`：后端按相邻坐标返回分段结构；前端 AUTO 会进一步比较驾车和步行结果。

前端 AUTO 的选择流程：

1. 跨城段默认驾车。
2. 同城且直线距离不超过 `1 km` 的路段才进入步行候选计算，避免对明显较远的景点额外请求步行路线。
3. 同时取得真实驾车和步行结果。
4. 仅当步行路网长度不超过 `1 km`，并且步行时长比驾车至少少 `20%` 时选择步行。
5. 任一路线只能得到坐标估算时，保守选择驾车，避免用景点间直线冒充步行道路。
6. Venice 岛内作为无连续驾车路网的特殊情况，优先使用步行；跨城路线可拆成驾车接入点和步行段。

每个返回路段包含交通方式、来源、距离、时长、道路几何和诊断信息。前端路线预览、日程、导出和 3D 导览共同消费这份分段数据。

## 数据更新

仓库已包含 `public/data/live-landmarks.json`，首次运行不需要重新抓取。

重新获取 Wikipedia、Wikidata、Open-Meteo 和 OSRM 数据：

```powershell
npm run fetch:live-data
```

将数据导入 PostgreSQL：

```powershell
npm run import:live-data:postgres
```

检查 PostgreSQL 表：

```powershell
$envFile = ".env.backend"
Get-Content $envFile | ForEach-Object {
  if ($_ -match "^([^#][^=]*)=(.*)$") {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}
conda run -n web3d-backend python tools/check-postgres.py
```

## 常用命令

```powershell
npm run dev                       # 前端开发服务器，127.0.0.1:5173
npm run dev:backend               # SQLite 后端，127.0.0.1:8000
npm run dev:backend:postgres      # PostgreSQL 后端，端口来自 .env.backend
npm run fetch:live-data           # 更新公开景点数据
npm run import:live-data:postgres # 导入 PostgreSQL
npm run build                     # 生产构建
npm run preview                   # 本地预览生产构建
```

## 主要功能

- 景点搜索、筛选、收藏、对比和路线排序
- 按天生成行程并导出 TXT 或打印为 PDF
- 游客本地状态及登录用户 PostgreSQL 状态同步
- Google Routes、OSRM 和 OpenStreetMap 步行路由
- 自动混合驾车/步行、绕行诊断和道路重叠率提示
- 按真实路线 bounds 生成的城市/跨城路线草图
- Cesium World Terrain、全球影像和 OSM Buildings，以及 ion 失败时的基础地图降级
- 驾车/步行载体切换、自动导览、Shift 加速、俯视及景点聚焦
- 自适应瓦片加载、路线分块和长期运行内存控制

## 项目结构

```text
web3d-project/
├─ backend/
│  ├─ main.py                    FastAPI 入口、账户接口与路线代理
│  ├─ db.py                      数据库连接与初始化
│  ├─ postgis_queries.py         PostgreSQL/PostGIS 查询
│  └─ requirements.txt           Python 依赖
├─ public/
│  ├─ data/                      已生成的景点与路线数据
│  └─ models/                    车辆与景点 GLB 模型
├─ src/
│  ├─ assets/                    前端静态资源
│  ├─ components/
│  │  ├─ cesium/                 Cesium 地图、车辆/步行载体和流式加载
│  │  ├─ home/                   首页、路线规划、预览和日程 UI
│  │  ├─ landmarks/              景点模型与标记
│  │  ├─ scene/                  React Three Fiber 场景组件
│  │  ├─ ui/                     HUD、时间轴和覆盖层
│  │  └─ vehicle/                Three.js 驾驶控制
│  ├─ data/                      景点、路线和旅行资料
│  ├─ hooks/
│  │  ├─ useRouteMetrics.js      逐段路由、AUTO 选择和诊断
│  │  └─ useActiveRouteGeo.js    3D 路线采样与交通方式区间
│  ├─ state/
│  │  └─ useAppStore.js          Zustand 全局路线/场景状态
│  └─ styles/                    全局和页面样式
├─ Styles/
│  └─ sketch.txt                 手绘 UI 风格指导
├─ tools/                        数据抓取、清理、导入和启动脚本
├─ .env.example                 前端环境变量模板
├─ .env.backend.example         后端环境变量模板
├─ vite.config.js               Vite 与 Cesium 静态资源配置
└─ package.json                 前端依赖和常用命令
```

`node_modules/`、`dist/`、`__pycache__/`、本地数据库和 `.env*` 属于依赖、构建或本机运行产物，不应作为源码目录维护或提交。

### 本次修改文件职责

| 文件 | 本次改动 |
| --- | --- |
| `backend/main.py` | 扩展路线接口为 `DRIVE/WALK/MIXED`，接入步行路由和分段结果。 |
| `src/hooks/useRouteMetrics.js` | 实现逐段规划、真实步行/驾车比较、Venice 接入、fallback 和重叠诊断。 |
| `src/components/home/HomeShowcase.jsx` | 接入分段路线数据，重做路线草图、距离格式、日程标签、模式切换和清空操作。 |
| `src/styles/home-showcase.css` | 路线图例、驾车/步行线型、警告状态和手绘活动卡样式。 |
| `src/state/useAppStore.js` | 保存活动路线的分段交通方式。 |
| `src/hooks/useActiveRouteGeo.js` | 将分段交通方式映射到 3D 路线进度。 |
| `src/components/cesium/CesiumDriveScene.jsx` | ion 降级、车辆/人物切换、步行速度和人物动画。 |

## 生产构建

```powershell
npm run build
npm run preview
```

构建产物位于 `dist/`。部署时必须保持 `/cesium/Workers`、`/cesium/Assets`、`/cesium/Widgets` 和 `/cesium/ThirdParty` 路径可访问。部署到非根路径时，需要同步调整 Vite `base` 和 Cesium 的静态资源基础路径。

## 常见问题

### 3D 地图提示 Token 未配置

确认 `.env.local` 存在，并包含：

```env
VITE_CESIUM_ION_TOKEN=your-token
```

修改环境变量后需要重启 Vite。

### Cesium 请求返回 401 或 403

- 检查 Token 是否复制完整，等号右侧不要包含引号或多余空格。
- 检查 Token 是否有读取 ion 资源的权限。
- 检查来源限制是否包含当前使用的协议、域名和端口。
- `127.0.0.1` 与 `localhost` 是不同来源，需要分别配置。
- 在 Cesium ion 控制台重新生成或修改 Token 后，更新 `.env.local` 并重启 Vite。
- 当前版本会自动降级到 OpenStreetMap 影像和椭球地形；若页面仍显示致命错误，检查浏览器控制台中是否还有非 ion 的 Cesium 渲染错误。

### 路线变成景点间直线

这表示 Google Routes、本地后端和公共路由服务均未返回道路几何，页面正在使用坐标估算。检查网络、本地后端健康状态、API Key 权限和浏览器控制台中的路线请求。AUTO 不会把这种估算直线自动选为步行路线。

### AUTO 没有选择步行

确认该段同时满足：

- 两个景点属于同一城市。
- 直线距离不超过 `1 km`，可以进入候选计算。
- 路由服务返回的实际步行长度不超过 `1 km`。
- 步行耗时不超过驾车耗时的 `80%`。
- 步行和驾车结果都不是坐标估算。

不满足任一条件时 AUTO 会保守选择驾车。用户仍可通过路线控制区手动选择整条路线步行。

### 地图加载跟不上车辆

应用会根据 Cesium 瓦片队列自动降低时间压缩倍率，严重积压时暂时停止路线推进。网络较慢或显存较小时，建筑和地形会先以较低细节显示。

### `Array buffer allocation failed`

当前实现已经限制 OSM Buildings 缓存，并将已走路线按固定距离分块。若仍出现该错误，请记录浏览器、运行时长、路线点数和设备内存后再排查。

## 安全说明

- 不要提交 `.env.local`、`.env.backend`、数据库密码或 Cesium/Google Token。
- 本地账户系统用于项目演示，不应直接作为生产认证系统。
- 公共 OSRM 适合开发和低频测试；正式部署应使用自建或有服务保障的路线提供方。
