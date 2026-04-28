# Amsterdam VR 数据准备工具

这个目录用于准备 Amsterdam Museumplein VR Lab 的本地数据。实验区代码和运行时数据分别在：

```txt
src/experiments/amsterdam-vr/
public/city/amsterdam-museumplein/
```

## 工具目录结构

```txt
tools/amsterdam-vr/
├── README.md                         # 当前说明文件
├── download-3dbag-museumplein.ps1    # 一键下载 3DBAG Museumplein CityJSON
├── tile_download.py                  # 本地化的 3DBAG tile 下载器
├── convert_cityjson_to_glb.py        # 将 3DBAG CityJSON 转成前端可加载的 GLB
└── fetch_osm_ground_layers.py        # 下载 OSM XML 并生成 ground-layers.geojson
```

## 建筑数据：3DBAG

3DBAG 是荷兰开放 3D 建筑数据，支持 CityJSON、OBJ、GeoPackage、WFS 和 3D Tiles。

本项目优先使用：

```txt
CityJSON
```

原因：

- CityJSON 比 CityGML 更轻。
- 3DBAG CityJSON 包含 LoD1.2、LoD1.3、LoD2.2。
- 可以保留建筑语义信息，后续方便做建筑类型和 POI 关联。

### 下载 3DBAG CityJSON

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
powershell.exe -ExecutionPolicy Bypass -File .\tools\amsterdam-vr\download-3dbag-museumplein.ps1
```

下载结果：

```txt
data/raw/3dbag/museumplein/cityjson/
```

下载脚本使用的 RD New bbox：

```txt
119300 485000 121900 487300
```

这个范围比 Museumplein 核心区略大，用来保留 Rijksmuseum、Van Gogh Museum、Stedelijk Museum、Concertgebouw 和周边街区。

### 转换为 GLB

```powershell
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\convert_cityjson_to_glb.py
```

输出：

```txt
public/city/amsterdam-museumplein/tiles/*.glb
public/city/amsterdam-museumplein/tiles/building-tiles.json
```

转换脚本说明：

- 读取 3DBAG CityJSON。
- 使用 `manifest.json` 中的 WGS84 中心点。
- 通过 `pyproj` 投影到 `EPSG:28992`。
- 将建筑顶点转换为 Three.js 场景里的本地米制坐标。
- 当前使用 LoD1.2 外环扇形三角化，适合快速预览城市体量。

## 地面数据：OpenStreetMap

地面层来自 OpenStreetMap 小范围 XML 导出，转换为前端可读取的 GeoJSON。

重新生成：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\fetch_osm_ground_layers.py
```

输出：

```txt
data/raw/osm/amsterdam-museumplein/osm-map.xml
data/raw/osm/amsterdam-museumplein/overpass-ground.json
public/city/amsterdam-museumplein/layers/ground-layers.geojson
```

生成的地面类型：

- `road`：机动车道路。
- `path`：步道、自行车道、台阶等。
- `park`：草地、公园、绿地。
- `plaza`：广场、铺装区域。
- `water`：水体。

## 运行时数据包

最终浏览器加载的是：

```txt
public/city/amsterdam-museumplein/
├── manifest.json                      # 数据包入口
├── pois.json                          # POI 配置
├── layers/
│   └── ground-layers.geojson          # 地面图层
├── routes/
│   └── museumplein-loop.geojson       # 本地漫游路线
└── tiles/
    ├── building-tiles.json            # GLB 清单
    └── *.glb                          # 建筑 tile
```

## 注意

- `data/raw/` 已加入 `.gitignore`，只作为本机原始数据缓存。
- `public/city/amsterdam-museumplein/` 是运行时静态数据，会被前端直接读取。
- 如果地面和建筑位置不一致，优先检查 `manifest.json` 的中心点和 `convert_cityjson_to_glb.py` 的坐标转换逻辑。
