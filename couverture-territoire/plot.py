import geopandas
import argparse
import glob
import os
import matplotlib.pyplot
import tqdm


def plot(coms, bibs, n):
    figure, axis = matplotlib.pyplot.subplots(figsize=(15, 7))
    if n == 1:
        axis.set_title("1 lieu sélectionné")
    else:
        axis.set_title(f"{n} lieux sélectionnés")
    coms.plot(ax=axis, column="population", legend=True, legend_kwds={"label": "Population"})
    bibs['coords'] = bibs['geometry'].apply(lambda x: x.representative_point().coords[:])
    bibs['coords'] = [coords[0] for coords in bibs['coords']]
    bibs['shortnames'] = [
        bib["name"].replace("Bibliothèque de", "").replace("Bibliothèque d'", "").replace("Bibliothèque", "").replace("Médiathèque des", "").strip()
        for idx, bib in bibs.iterrows()
    ]
    for index, bib in bibs.iterrows():
        matplotlib.pyplot.annotate(text=bib["shortnames"], xy=bib["coords"], horizontalalignment="center", color="white", fontsize="xx-small")
    bibs.plot(ax=axis, column="selected", cmap="prism")
    axis.axis("off")
    return figure


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path_coms", type=str)
    parser.add_argument("path_results", type=str)
    parser.add_argument("path_plots", type=str)
    args = parser.parse_args()
    coms = geopandas.read_file(args.path_coms)
    for path in tqdm.tqdm(glob.glob(os.path.join(args.path_results, "*.geojson"))):
        bibs = geopandas.read_file(path)
        n = int(os.path.splitext(os.path.basename(path))[0])
        figure = plot(coms, bibs, n)
        matplotlib.pyplot.savefig(os.path.join(args.path_plots, f"{n}.png"))
        matplotlib.pyplot.close()


if __name__ == "__main__":
    main()