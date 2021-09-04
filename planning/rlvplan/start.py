import re
import os
import json
import time
import random
import datetime
import threading
import webbrowser
import http.server
import urllib.parse

import xlsxwriter
import pyexcel_ods


import rlvplan


PORT = 8000


def color_hash(string, alpha=.8):
    random.seed(string)
    def r(): return random.randint(0, 255)
    def s(): return int(alpha * 255 + (1 - alpha) * r())
    return "#%02X%02X%02X" % (s(), s(), s())


class RequestHandler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        if os.path.isfile(self.path[1:]):
            self.send_response(200)
            self.end_headers()
            with open(self.path[1:], "rb") as file:
                self.wfile.write(file.read())
        elif self.path == "/answer":
            if self.server.controller.daemon.computing:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "done": False,
                    "solution": {}
                }).encode("utf8"))
            elif self.server.controller.daemon.exception is not None:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": repr(self.server.controller.daemon.exception),
                }, default=str).encode("utf8"))
            else:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "done": True,
                    "solution": self.server.controller.daemon.solution
                }).encode("utf8"))
        elif self.path.startswith("/export?"):
            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(self.path)[4])
            solution = json.loads(parsed["solution"][0])
            table = make_solution_table(solution)
            fmt = parsed["format"][0]
            self.download_table(table, fmt)

    def do_POST(self):
        template = json.loads(self.rfile.read(
            int(self.headers.get('content-length', 0))).decode("utf8"))
        self.server.controller.daemon.add_task(template)
        self.send_response(200)
        self.end_headers()

    def download_table_tsv(self, table, filename):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain;charset=utf-8')
        self.send_header('Content-Disposition',
                         'attachment; filename="%s"' % filename)
        self.end_headers()
        for row in table:
            string = "\t".join(row) + "\n"
            self.wfile.write(string.encode("utf8"))

    def download_table_txt(self, table, filename):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain;charset=utf-8')
        self.send_header('Content-Disposition',
                         'attachment; filename="%s"' % filename)
        self.end_headers()
        cwidth = [0 for c in table[0]]
        for row in table:
            for i, column in enumerate(row):
                cwidth[i] = max(cwidth[i], len(column))
        for row in table:
            for i, column in enumerate(row):
                row[i] = row[i].ljust(cwidth[i])
        for i, row in enumerate(table):
            string = " | ".join(row) + "\n"
            self.wfile.write(string.encode("utf8"))
            if i < len(table) - 1 and row[0] != table[i + 1][0]:
                hr = ["-" * c for c in cwidth]
                string = " | ".join(hr) + "\n"
                self.wfile.write(string.encode("utf8"))

    def download_table_xlsx(self, table, filename):
        workbook = xlsxwriter.Workbook("tmp.xlsx")
        worksheet = workbook.add_worksheet("Planning")
        format_default = workbook.add_format({})
        format_day = workbook.add_format({
            "bold": True,
            "valign": "vcenter",
        })
        format_post = workbook.add_format({
            "bold": True,
            "align": "center",
        })
        format_slot = workbook.add_format({
            "bold": True,
        })
        format_border = workbook.add_format({
            "border": True,
        })
        format_agents = dict()

        agents = set()

        first = True
        for row in table:
            for agent in row[2:]:
                if not first and agent != "":
                    agents.add(agent)
                if agent in format_agents:
                    continue
                format_agents[agent] = workbook.add_format({
                    "fg_color": color_hash(agent),
                    "align": "center",
                })
            first = False
        
        total_times = dict()
        total_slots = dict()
        closings = dict()

        first = True
        for i, row in enumerate(table):
            if first:
                first = False
                continue
            day, slot = row[:2]
            if day not in closings:
                closings.setdefault(day, dict())
                for agent in agents:
                    closings[day].setdefault(agent, False)
            slot_duration = rlvplan.utils.get_slot_duration(slot)
            total_slots.setdefault(slot_duration, dict())
            is_closing = i == len(table) - 1 or table[i+1][0] != day  # is_closing_slot(slot)
            for agent in row[2:]:
                total_times.setdefault(agent, 0)
                total_times[agent] += slot_duration
                total_slots[slot_duration].setdefault(agent, 0)
                total_slots[slot_duration][agent] += 1
                if is_closing:
                    closings[day][agent] = True
        
        total_closings = {
            agent: len([
                None
                for day in closings
                if closings[day][agent]
            ])
            for agent in agents
        }

        i = 0
        while True:
            if i >= len(table) - 1:
                break
            if table[i][0] != table[i + 1][0]:
                table.insert(i + 1, ["" for _ in table[0]])
                i += 1
            i += 1
        worksheet.set_column(0, len(table[0]), width=15)
        rows_by_day = dict()
        for i, tr in enumerate(table):
            if tr[0] != "":
                rows_by_day.setdefault(tr[0], [])
                rows_by_day[tr[0]].append(i)
            for j, td in enumerate(tr):
                cell_format = format_default
                if i == 0:
                    cell_format = format_post
                elif j == 1:
                    cell_format = format_slot
                elif j >= 2 and td != "":
                    cell_format = format_agents.get(td, format_default)
                worksheet.write(i, j, td, cell_format)
        for day, ranges in rows_by_day.items():
            worksheet.merge_range(
                min(ranges), 0, max(ranges), 0, day, format_day)

        worksheet.set_column(len(table[0]) + 1, len(table[0]) + 3 + len(total_slots), width=15)
        worksheet.write(1, len(table[0]) + 1, "", format_border)
        worksheet.write(1, len(table[0]) + 2, "Total SP", format_border)
        worksheet.write(1, len(table[0]) + 3, "Fermetures", format_border)
        for j, dur in enumerate(total_slots):
            worksheet.write(1, len(table[0]) + 4 + j, "Plages %.1fh" % dur, format_border)
        for i, agent in enumerate(sorted(agents)):
            worksheet.write(i + 2, len(table[0]) + 1, agent, format_border)
            worksheet.write(i + 2, len(table[0]) + 2, total_times[agent], format_border)
            worksheet.write(i + 2, len(table[0]) + 3, total_closings[agent], format_border)
            for j, dur in enumerate(total_slots):
                worksheet.write(i + 2, len(table[0]) + 4 + j, total_slots[dur].get(agent, 0), format_border)
            
        
        workbook.close()
        with open("tmp.xlsx", "rb") as file:
            stream = file.read()
        os.remove("tmp.xlsx")
        self.send_response(200)
        self.send_header(
            'Content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8'
        )
        self.send_header('Content-Disposition',
                         'attachment; filename="%s"' % filename)
        self.end_headers()
        self.wfile.write(stream)

    def download_table_ods(self, table, filename):
        ods_data = {
            "Planning": table
        }
        pyexcel_ods.save_data("tmp.ods", ods_data)
        with open("tmp.ods", "rb") as file:
            stream = file.read()
        os.remove("tmp.ods")
        self.send_response(200)
        self.send_header(
            'Content-type',
            'application/vnd.oasis.opendocument.spreadsheet;charset=utf-8'
        )
        self.send_header('Content-Disposition',
                         'attachment; filename="%s"' % filename)
        self.end_headers()
        self.wfile.write(stream)

    def download_table_csv(self, table, filename):
        for tr in table:
            for i, td in enumerate(tr):
                if "," in td:
                    if "\"" in td:
                        tr[i] = "\"" + re.sub("\"", "\\\"", td) + "\""
                    else:
                        tr[i] = "\"" + td + "\""
        csv = "\n".join([
            ",".join(tr)
            for tr in table
        ])
        self.send_response(200)
        self.send_header('Content-type', 'text/plain;charset=utf-8')
        self.send_header('Content-Disposition',
                         'attachment; filename="%s"' % filename)
        self.end_headers()
        self.wfile.write(csv.encode("utf8"))

    def download_table(self, table, fmt):
        filename = "planning-" + str(datetime.datetime.now().date()) + fmt
        if fmt == ".tsv":
            self.download_table_tsv(table, filename)
        elif fmt == ".txt":
            self.download_table_txt(table, filename)
        elif fmt == ".xlsx":
            self.download_table_xlsx(table, filename)
        elif fmt == ".csv":
            self.download_table_csv(table, filename)
        elif fmt == ".ods":
            self.download_table_ods(table, filename)
        else:
            self.send_response(401)
            self.end_headers()


def make_solution_table(solution):
    table = []
    posts = set()
    for day in solution:
        for slot in solution[day]:
            for post in solution[day][slot]:
                posts.add(post)
    table.append(["", ""] + [post for post in sorted(posts)])
    for day in solution:
        for slot in solution[day]:
            row = [day, slot]
            for post in sorted(posts):
                row.append(solution[day][slot].get(post, ""))
                if row[-1] is None:
                    row[-1] = ""
            table.append(row)
    return table


class Server(http.server.HTTPServer):

    def __init__(self, controller):
        http.server.HTTPServer.__init__(self, ("", PORT), RequestHandler)
        self.controller = controller


class Daemon(threading.Thread):

    def __init__(self, controller):
        threading.Thread.__init__(self, daemon=True)
        self.controller = controller
        self.computing = False
        self.solution = None
        self.exception = None
        self.tasks = []

    def add_task(self, task):
        self.tasks.append(task)

    def execute(self, task):
        print("Starting generation")
        self.exception = None
        self.computing = True
        try:
            self.solution = rlvplan.reason.generate(task)
        except Exception as err:
            self.exception = err
        self.computing = False
        print("Generation is done")

    def run(self):
        while True:
            if len(self.tasks) == 0:
                time.sleep(.1)
                continue
            self.execute(self.tasks.pop())


class Controller:

    def __init__(self):
        self.server = Server(self)
        self.daemon = Daemon(self)

    def start(self):
        self.daemon.start()
        print("Server is running at http://localhost:%d/. Press ^C to stop." % PORT)
        webbrowser.open("http://localhost:%d/" % PORT)
        try:
            self.server.serve_forever()
        except KeyboardInterrupt:
            print("Bye bye!")


def main():
    controller = Controller()
    controller.start()