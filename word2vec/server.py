import argparse
import gensim
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os


model = None


class S(BaseHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        BaseHTTPRequestHandler.__init__(self, *args, **kwargs)

    def do_GET(self):
        global model
        print(self.path)

        route, query_string = self.path[1:], ""
        if "?" in self.path:
            route, query_string = self.path[1:].split("?")

        if self.path == "/":
            route = "index.html"
        
        query = {}
        for arg in query_string.split("&"):
            if arg == "":
                continue
            key, value = arg.split("=")
            query[key] = value

        if os.path.isfile(route):
            self.send_response(200)
            if self.path.endswith(".html"):
                self.send_header("Content-type", "text/html")
            elif self.path.endswith(".css"):
                self.send_header("Content-type", "text/css")
            elif self.path.endswith(".js"):
                self.send_header("Content-type", "text/javascript")
            self.end_headers()
            with open(route, "rb") as static_file:
                self.wfile.write(static_file.read())
        elif route == "vect":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            try:
                vector = model[query.get("word")]
            except KeyError:
                vector = None
            data = {
                "success": vector is not None,
                "vector": None if vector is None else vector.tolist()
            }
            response = json.dumps(data).encode("utf8")
            self.wfile.write(response)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write("<h1>404 Not found</h1>".encode("utf8"))


def run(server_class=HTTPServer, handler_class=S, addr="localhost", port=8000):
    server_address = (addr, port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting httpd server on {addr}:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run a simple HTTP server")
    parser.add_argument("model_path", type=str, help="path to the model (keyed vectors)")
    parser.add_argument(
        "-l",
        "--listen",
        default="localhost",
        help="Specify the IP address on which the server listens",
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=8000,
        help="Specify the port on which the server listens",
    )
    args = parser.parse_args()
    model = gensim.models.KeyedVectors.load_word2vec_format(args.model_path, binary=True)
    run(addr=args.listen, port=args.port)