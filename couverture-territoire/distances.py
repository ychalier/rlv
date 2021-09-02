import argparse
import json
import shapely.geometry
import shapely.ops
import pyproj
import functools


PROJECT = functools.partial(
    pyproj.transform,
    pyproj.Proj(init='epsg:4326'),
    pyproj.Proj('+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs'))


def get_centroid(feature):
    global PROJECT
    polygon = shapely.geometry.shape(feature["geometry"])
    polygon_projected = shapely.ops.transform(PROJECT, polygon)
    return polygon_projected.centroid


def compute_distances(coms, bibs):
    dists = [
        [None for _ in bibs["features"]]
        for _ in coms["features"]
    ]
    print("Computing centroids for bibs...")
    bibs_centroids = [ get_centroid(bib) for bib in bibs["features"] ]
    print("Computing centroids for coms...")
    coms_centroids = [ get_centroid(com) for com in coms["features"] ]
    print("Computing distances...")
    for i, com in enumerate(coms["features"]):
        for j, bib in enumerate(bibs["features"]):
            dists[i][j] = coms_centroids[i].distance(bibs_centroids[j]) / 1000
    return dists
    

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path_coms", type=str)
    parser.add_argument("path_bibs", type=str)
    parser.add_argument("path_dists", type=str)
    args = parser.parse_args()
    with open(args.path_coms, "r", encoding="utf8") as file:
        coms = json.load(file)
    with open(args.path_bibs, "r", encoding="utf8") as file:
        bibs = json.load(file)
    dists = compute_distances(coms, bibs)
    with open(args.path_dists, "w", encoding="utf8") as file:
        json.dump(dists, file)


if __name__ == "__main__":
    main()