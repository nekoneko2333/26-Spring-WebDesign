$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$OutDir = Join-Path $Root "data\raw\3dbag\museumplein"
$Downloader = Join-Path $Root "tools\amsterdam-vr\tile_download.py"

$Bbox = @("119300", "485000", "121900", "487300")

New-Item -ItemType Directory -Force $OutDir | Out-Null

Write-Host "Installing Python dependency if needed: flatgeobuf"
python -m pip install flatgeobuf

Write-Host "Downloading 3DBAG CityJSON tiles for Amsterdam Museumplein..."
python $Downloader --outdir $OutDir --bbox $Bbox[0] $Bbox[1] $Bbox[2] $Bbox[3] --cityjson

Write-Host "Done. Raw files are in: $OutDir"
