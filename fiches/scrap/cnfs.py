import PyPDF2
import glob
import os
import requests
import json


def retrieve_list():
    token = input("token> ").strip()
    url = "https://api.conseiller-numerique.gouv.fr/ressources"
    response = requests.get(url, headers={
        "Authorization": "Bearer %s" % token
    })
    return response.json()



with open("cnfs.json", "w", encoding="utf8") as file:
    json.dump(retrieve_list(), file)


# folder = r"C:\Users\yohan.chalier\Downloads\ressourcerie\ressourcerie"

# for path in glob.glob(os.path.join(folder, "*", "*.pdf")):
#     # print(path)
#     with open(path, "rb") as stream:
#         reader = PyPDF2.PdfFileReader(stream)
#         # page = reader.getPage(0)
#         # for page in reader.pages:
#         #     print(page.extractText())
#         print(reader.documentInfo.get("/Title"))  # /Subject
#         # print(reader.pages)
#         # print(dir(page))
#         # print(page.getContents())
#     # break