# Trip3D 意大利自驾 3D 导览

Trip3D 是一个基于 React、Vite、CesiumJS 和 FastAPI 的意大利自驾游路线规划与 3D 导览项目。核心定位是自驾旅行：车是主载具，步行只用于同城短距离景点切换，轮渡表示“车辆搭乘轮渡”，不会默认混入公交、地铁、火车等公共交通。

完整功能、技术栈和数据流可参考 [FEATURES_AND_TECH_STACK.md](./FEATURES_AND_TECH_STACK.md)。

## 路线到底怎么规划

### 1. 用户选择景点和路线模式

首页把用户选择的景点 ID 传给 `src/hooks/useRouteMetrics.js` 的 `fetchRouteMetrics(routeIds, routePreference)`。路线按相邻两个景点逐段规划，而不是一次性把整条路线当成一个黑盒。

当前前端支持三种偏好：

- `AUTO`：默认模式，自驾优先，只在很短的同城段比较步行候选。
- `DRIVE`：强制每段按自驾规划。
- `WALK`：强制每段按步行规划，主要用于测试或手动切换。

### 2. AUTO 的总原则

AUTO 不是“公共交通混合路线”。它的规则是：

- 跨城默认 `DRIVE`。
- 同城但直线距离超过 `1 km`，仍然默认 `DRIVE`。
- 只有同城且直线距离不超过 `1 km` 的短段，才会同时请求 `DRIVE` 和 `WALK` 做比较。
- 只有真实步行路线明显更合理时才选 `WALK`。
- 不会默认请求 `TRANSIT`，所以不会把公交、地铁、火车、缆车混进当前自驾导览。

步行会被选中的条件在 `shouldAutoUseWalking()` 中：

- 路线不是坐标估算结果。
- 步行距离、步行时间有效。
- 优先条件：步行距离不超过 `1 km`，且步行耗时不超过驾车耗时的 `80%`。
- 兜底条件：步行距离不超过 `1.6 km`、步行不超过 `0.4 h`，并且驾车路线明显绕行或比步行长 `1.6x` 以上。

### 3. 每一段如何请求路线

前端每段调用 `planLeg(coords, travelMode)`，优先请求本地后端：

```text
POST /api/routes/plan
```

请求体包含坐标和 `travelMode`。后端处理顺序是：

1. 如果 `.env.backend` 配置了 `GOOGLE_MAPS_API_KEY`，优先请求 Google Routes API。
2. Google 请求失败、没有 key 或返回不可用时，降级到 OSRM。
3. 如果后端不可用，前端会直接请求公共 OSRM。
4. 如果路线服务都不可用，最后才使用坐标直线估算。

### 4. Google 是主数据源，但只请求自驾/步行

后端 `backend/main.py` 的 `_plan_google_route()` 使用 Google Routes API。当前只给 Google 传入应用允许的模式：

- `DRIVE`
- `WALK`

不会默认传 `TRANSIT`。这符合自驾游主题。

Google field mask 会请求 step 级数据：

- `routes.distanceMeters`
- `routes.duration`
- `routes.polyline.encodedPolyline`
- `routes.legs.steps.distanceMeters`
- `routes.legs.steps.staticDuration`
- `routes.legs.steps.travelMode`
- `routes.legs.steps.startLocation`
- `routes.legs.steps.endLocation`
- `routes.legs.steps.localizedValues`
- `routes.legs.steps.polyline.encodedPolyline`
- `routes.legs.steps.navigationInstruction.maneuver`
- `routes.legs.steps.navigationInstruction.instructions`

也就是说，前端最终使用的不是一条整段 polyline 的猜测结果，而是 Google/OSRM 返回的 step polyline。

### 5. Step 如何标准化

后端会把 provider 的每个 step 标准化为 `parts[]`：

```js
{
  travelMode: 'DRIVE' | 'WALK' | 'FERRY_DRIVE',
  displayTravelMode: 'DRIVE' | 'WALK' | 'FERRY_DRIVE',
  rawTravelMode: 'DRIVE' | 'WALK',
  modeSource: 'GOOGLE' | 'OSRM' | 'FALLBACK',
  modelType: 'drive' | 'walk' | 'ferry_drive',
  colorKey: 'drive' | 'walk' | 'ferry',
  distanceKm,
  durationHours,
  geometryCoordinates,
  providerStep
}
```

其中 `FERRY_DRIVE` 的含义是“车上轮渡”，不是用户改乘公共交通船线。

### 6. 轮渡怎么识别

当前只把自驾路线里的轮渡识别为轮渡：

- Google step 的 `navigationInstruction.maneuver` 是 `FERRY` 或 `FERRY_TRAIN`，归一为 `FERRY_DRIVE`。
- Google step 文本、指令或 vehicle 相关字段命中 `ferry`、`ferry_train`、`traghetto`、`boat`、`car ferry`、`vehicle ferry` 等，也归一为 `FERRY_DRIVE`。
- OSRM step 的 `mode/name/ref` 命中 `ferry`、`traghetto`、`faehre`、`boat` 等，也归一为 `FERRY_DRIVE`。

不会因为某段跨水就直接画水道。跨海兜底只在 provider 没给出可用轮渡 step 时使用。

### 7. 跨海路线怎么处理

前端会用粗略区域判断是否涉及西西里或撒丁岛这类跨海段：

1. 先照常请求 `DRIVE` provider 路线。
2. 如果 provider 返回的 `parts[]` 里已经有 `FERRY_DRIVE`，直接信任 provider 的 step geometry。
3. 如果 provider 没有返回轮渡 step，才使用本地 `WATER_CROSSINGS` 表兜底，把路线拆成：
   - 出发点到港口：`DRIVE`
   - 港口到港口：`FERRY_DRIVE`
   - 港口到目的地：`DRIVE`

### 8. 威尼斯怎么处理

威尼斯不再强行画手写水道，也不再把内部路线默认当成船线。

当前策略是：

- 威尼斯内部景点到景点：`WALK`。
- 外部进入威尼斯：先 `DRIVE` 到接驳点，再 `WALK` 到核心景点。
- 从威尼斯离开：先 `WALK` 到接驳点，再 `DRIVE` 离开。
- 只有 Google/OSRM 在自驾 step 里真实返回车渡轮，才显示 `FERRY_DRIVE`。

### 9. 前端如何消费路线

前端拿到 provider 的 `parts[]` 后，会把所有 step geometry 去重拼接成整条 `geometryCoordinates`。首页简报、路线草图、导览时间、3D 路线、已走红线、进度轴和载具切换都基于同一套 parts 数据。

3D 表现规则：

- `DRIVE`：小车模型，陆路颜色。
- `WALK`：行人模型，仅短距离同城。
- `FERRY_DRIVE`：轮渡模型，水路颜色，语义为车在轮渡上移动。

### 10. 时间怎么算

导览时间不直接用画面车速倒推真实行程，而是使用路线 provider 返回的 `durationHours` 与景点停留计划。播放倍率只影响动画播放速度，不改变真实计划时间。

## 快速启动

### 环境要求

- Node.js `20.19+` 或 `22.12+`
- npm
- Python `3.11+`，仅完整后端需要
- 可选：Cesium ion token
- 可选：Google Maps API key，用于 Google Routes

安装依赖：

```powershell
npm install
```

复制前端环境变量：

```powershell
Copy-Item .env.example .env.local
```

`.env.local` 示例：

```env
VITE_CESIUM_ION_TOKEN=your-cesium-ion-token
VITE_API_BASE_URL=http://127.0.0.1:8000
```

启动前端：

```powershell
npm.cmd run dev
```

访问：

```text
http://127.0.0.1:5173/
```

## 后端

安装后端依赖：

```powershell
conda create -n web3d-backend python=3.11
conda run -n web3d-backend pip install -r backend/requirements.txt
```

启动 SQLite 后端：

```powershell
npm run dev:backend
```

使用 PostgreSQL 后端：

```powershell
Copy-Item .env.backend.example .env.backend
npm run dev:backend:postgres
```

`.env.backend` 示例：

```env
DATABASE_URL=postgresql://trip3d_app:replace-with-a-strong-password@127.0.0.1:5432/trip3d
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
BACKEND_PORT=8001
GOOGLE_MAPS_API_KEY=
```

配置 `GOOGLE_MAPS_API_KEY` 后，后端优先使用 Google Routes。未配置或请求失败时，降级到 OSRM。

## 常用命令

```powershell
npm run dev                       # 前端开发服务器
npm run dev:backend               # SQLite 后端，127.0.0.1:8000
npm run dev:backend:postgres      # PostgreSQL 后端，端口来自 .env.backend
npm run fetch:live-data           # 更新公开景点数据
npm run import:live-data:postgres # 导入 PostgreSQL
npm run build                     # 生产构建
npm run preview                   # 本地预览生产构建
```

## 验证

```powershell
npm run build
conda run -n web3d-backend python -m py_compile backend/main.py
git diff --check
```

当前生产构建可能提示主 bundle 较大，这是 Cesium/Three.js 打包体积导致的警告，不代表构建失败。

## 主要目录

```text
backend/main.py                         FastAPI 入口、路线代理和 provider step 解析
src/hooks/useRouteMetrics.js            逐段规划、AUTO 选择、轮渡兜底和路线诊断
src/hooks/useActiveRouteGeo.js          3D 路线采样和交通方式区间
src/components/cesium/                  Cesium 场景、路线、载具和地标
src/components/home/                    首页、路线简报、路线草图和行程 UI
src/components/ui/                      HUD、时间轴、详细信息面板
src/state/useAppStore.js                Zustand 全局路线/导览状态
src/styles/                             全局和页面样式
public/models/                          车辆、轮渡和景点 GLB 模型
tools/                                  数据抓取、导入和启动脚本
```

## 常见问题

### 为什么某段没有显示轮渡

当前不会简单因为跨水就画轮渡。优先看 Google/OSRM 的 step 是否返回了 ferry 相关 maneuver 或说明。如果 provider 没有返回轮渡 step，只有命中本地跨海兜底表时才会生成 `FERRY_DRIVE`。

### 为什么威尼斯内部不是水路

当前产品定位是自驾游。威尼斯核心区车辆不可连续通行，因此内部短距离按步行处理；水上公交、vaporetto 等公共交通不会混进自驾主路线。

### 为什么 AUTO 没有选步行

AUTO 只在同城且直线距离不超过 `1 km` 的短段比较步行。步行路线还必须是真实 provider 路线，并且比驾车明显更合理。否则会保持自驾。

### 路线变成直线是什么意思

这表示 Google、后端 OSRM、前端公共 OSRM 都没有返回可用道路 geometry，应用进入了坐标估算兜底。此时应检查后端是否启动、网络是否可用、Google key 是否有效。

## 安全说明

- 不要提交 `.env.local`、`.env.backend`、数据库密码、Cesium token 或 Google API key。
- 前端 token 会暴露给浏览器，生产环境应使用最小权限和来源限制。
- 公共 OSRM 适合开发和低频测试，正式部署应使用自建或有服务保障的路线 provider。
