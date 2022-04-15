import argparse
# import math
import os
import networkx
import osmnx

parser = argparse.ArgumentParser()
parser.add_argument("input", type=str, help="path to the OSM XML file")
parser.add_argument("-w", "--width", type=float, default=3000)
args = parser.parse_args()
print("Loading graph… (may take a few minutes)")
osm_graph = osmnx.graph.graph_from_xml(args.input)
print("Graph contains", len(osm_graph.nodes), "nodes and", len(osm_graph.edges), "edges")

graph = networkx.DiGraph()
xs = []
ys = []
for u in osm_graph.nodes:
    xs.append(osm_graph.nodes[u]["x"])
    ys.append(osm_graph.nodes[u]["y"])
min_xs = min(xs)
scale_factor = args.width / (max(xs) - min_xs)
min_ys = min(ys)
for u in osm_graph.nodes:
    graph.add_node(u)
for (u, v, w) in osm_graph.edges:
    distance = ((osm_graph.nodes[u]["x"] - osm_graph.nodes[v]["x"]) ** 2 + (osm_graph.nodes[u]["y"] - osm_graph.nodes[v]["y"]) ** 2) ** 0.5
    weight = distance + 1 # max(1, math.log(distance * 100000 + 1))
    graph.add_edge(u, v, weight=weight)

for u in osm_graph.nodes:
    graph.nodes[u]["x"] = scale_factor * (osm_graph.nodes[u]["x"] - min_xs)
    graph.nodes[u]["y"] = scale_factor * (osm_graph.nodes[u]["y"] - min_ys)

print("Exporting graph… (may take a few seconds)")

networkx.write_graphml(graph, os.path.splitext(args.input)[0] + ".weights.graphml")

for edge in graph.edges:
    graph.edges[edge]["weight"] = 1

networkx.write_graphml(graph, os.path.splitext(args.input)[0] + ".graphml")

