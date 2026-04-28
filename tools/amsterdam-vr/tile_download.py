import argparse
import logging
import sys
from pathlib import Path
from urllib.request import urlretrieve

import flatgeobuf as fgb


def get_tile_index(bbox=None):
    return fgb.HTTPReader("https://data.3dbag.nl/latest/tile_index.fgb", bbox=bbox)


def download_obj(tile_id, tilesdir):
    url = tile_id.properties["obj_download"]
    filename = tilesdir / url.split("/")[-1]
    urlretrieve(url, filename)


def download_cityjson(tile_id, tilesdir):
    url = tile_id.properties["cj_download"]
    filename = tilesdir / url.split("/")[-1]
    urlretrieve(url, filename)


def download_gpkg(tile_id, tilesdir):
    url = tile_id.properties["gpkg_download"]
    filename = tilesdir / url.split("/")[-1]
    urlretrieve(url, filename)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--outdir", help="Output dir", type=str)
    parser.add_argument("--bbox", help="bbox coordinates xmin ymin xmax ymax", nargs=4, type=float)
    parser.add_argument("--obj", help="Download OBJ", action="store_true")
    parser.add_argument("--cityjson", help="Download CityJSON", action="store_true")
    parser.add_argument("--gpkg", help="Download GeoPackage", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        stream=sys.stdout,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )

    pathname = Path(args.outdir) if args.outdir else Path.cwd()
    pathname.mkdir(parents=True, exist_ok=True)

    logging.info("getting tile ids...")
    tile_ids = list(get_tile_index(tuple(args.bbox) if args.bbox else None))
    logging.info("found %s tile(s)", len(tile_ids))

    for tile_id in tile_ids:
        tile_name = tile_id.properties.get("tile_id", "unknown")
        logging.info("tile %s...", tile_name)

        if args.obj or not (args.obj or args.cityjson or args.gpkg):
            logging.info("downloading obj...")
            tilesdir = pathname / "obj"
            tilesdir.mkdir(exist_ok=True)
            download_obj(tile_id, tilesdir)

        if args.cityjson or not (args.obj or args.cityjson or args.gpkg):
            logging.info("downloading cityjson...")
            tilesdir = pathname / "cityjson"
            tilesdir.mkdir(exist_ok=True)
            download_cityjson(tile_id, tilesdir)

        if args.gpkg or not (args.obj or args.cityjson or args.gpkg):
            logging.info("downloading gpkg...")
            tilesdir = pathname / "gpkg"
            tilesdir.mkdir(exist_ok=True)
            download_gpkg(tile_id, tilesdir)


if __name__ == "__main__":
    main()
