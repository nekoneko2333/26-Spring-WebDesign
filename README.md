# Web3D Travel Platform

基于 React、Vite、Three.js / React Three Fiber 的 3D 旅行规划项目。当前默认入口已经整合为 04 Cinematic Portal 首页，保留完整的目的地、行程、点评、账户、服务和 3D 导览功能。

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
http://127.0.0.1:5173/               # 04 Cinematic Portal 首页
http://127.0.0.1:5173/#/v2           # 路线地图 / 拓扑版本
http://127.0.0.1:5173/#/venice-vr    # Venice 城市漫游实验
```

## 当前功能

- 04 首页：粒子展示开场、现代化首屏、目的地浏览、行程规划、点评、服务、账户和 3D Drive 入口。
- 目的地浏览：搜索、筛选、排序、收藏、对比、加入路线、查看背景资料。
- 行程规划：路线顺序调整、景点锁定、路线优化、按天生成行程、导出文本。
- 账户状态：本地游客模式、登录态、收藏、路线和锁定景点状态保存。
- 3D Drive：Three.js 场景、车辆沿路线行驶、地标聚焦、模型预览。
- V2 路线视图：基于 `public/data/italy-route-topology.json` 展示路线拓扑、地形和站点进度。
- Venice VR：独立威尼斯城市漫游实验入口。

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
│   └── styles/                      # CSS 模块
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
