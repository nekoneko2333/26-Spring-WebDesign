# Web3D Italy Drive

一个基于 `Three.js` 的 3D 互动驾驶项目：在意大利地图上驾车、切换视角、探索地标并查看 3D 模型。

## 技术栈

### 前端
- **Vite 8**：开发服务器与打包
- **Three.js**：3D 场景、相机、材质、模型渲染
- **GSAP**：开场动画、相机切换过渡动画
- **原生 JS (ES Modules)**：模块化业务逻辑

### 后端
- **FastAPI**：提供地标 API（`/api/landmarks`）
- **Uvicorn**：ASGI 运行

> 前端带有静态地标回退逻辑：后端不可用时，仍可运行场景。

---

## 目录结构与文件用途

```text
web3d-project/
├─ backend/
│  ├─ main.py                 # FastAPI 服务，提供检查与地标数据
│  └─ requirements.txt        # 后端依赖
├─ public/
│  ├─ models/
│  │  ├─ colosseum.glb        # 模型
│  │  ├─ leaning_tower_of_pisa.glb
│  │  └─ low-poly_truck_car_drifter.glb
│  ├─ favicon.svg
│  └─ icons.svg
├─ src/
│  ├─ camera/
│  │  └─ cameraController.js  # 相机状态机：map/follow/fpv/focus 切换与每帧跟随
│  ├─ car/
│  │  ├─ carControls.js       # 键盘输入与控制状态
│  │  ├─ carPhysics.js        # 车辆运动学（含自动驾驶）
│  │  └─ carVisual.js         # 小车网格与外观构建
│  ├─ config/
│  │  └─ theme.js             # 主题色配置
│  ├─ core/
│  │  ├─ scene.js             # Three 场景、相机、渲染器、灯光
│  │  └─ mapTiles.js          # DEM 高程加载、地形构建、经纬度映射
│  ├─ landmarks/
│  │  └─ landmarkLoader.js    # 地标数据加载、模型摆放、道路曲线生成
│  ├─ styles/
│  │  ├─ base.css             # 全局变量、字体、基础样式
│  │  ├─ intro.css            # 开场页与转场
│  │  ├─ hud.css              # HUD 与交互提示
│  │  ├─ panels.css           # POI/Focus/ModelViewer 卡片
│  │  └─ decorations.css      # 指南针等装饰
│  ├─ ui/
│  │  ├─ introScreen.js       # 开场动画、加载条、进入场景
│  │  ├─ modelViewer.js       # 模型预览弹层逻辑
│  │  └─ popup.js             # POI 卡片与 Focus 面板逻辑
│  ├─ main.js                 # 应用入口：初始化、事件注册、主循环
│  └─ style.css               # 样式聚合入口（import styles/*）
├─ index.html                 # 页面结构与 HUD/弹层 DOM
├─ package.json               # 前端依赖与脚本
└─ package-lock.json
```

---

## 运行方式

## 1) 前端开发

```bash
npm install
npm run dev
```

默认启动 Vite 本地服务（端口可能自动调整，如 5173/5174）。

## 2) 后端（可选）

在 `backend/` 下安装依赖并启动：

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

如果后端未启动，前端会回退到内嵌地标数据。

---

## 核心交互

- `W / A / S / D`：驾驶
- `Shift`：加速
- `V`：地图视角 / 驾驶视角切换
- `C`：跟随视角 / 第一人称切换
- `F`：探索地标（进入焦点）
- `R`：自动驾驶开关（再次按下可退出）
- `Esc`：退出焦点或从地图返回驾驶

---

## 开发说明

- 样式已模块化拆分在 `src/styles/*`，建议按模块维护，不再回到单文件堆叠。
- 新增地标时，优先在后端接口中添加，经纬度会映射到 3D 世界坐标。
- 当前项目为轻量模块化结构，适合继续扩展：天气系统、镜头语言、更多地标与路线。
