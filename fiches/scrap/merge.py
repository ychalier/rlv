import json
import bs4
from dateutil import parser


SOURCE_CNFS = "Ressourcerie Conseiller numérique France Services"
SOURCE_LBC = "Les Bons Clics"
SOURCE_SOLNUM = "Solidarité Numérique"


def create_blank_entry():
    return {
        "title": None,
        "description": None,
        "thumbnail": None,
        "tags": [],
        "categories": [],
        "date": None,
        "source": None,
        "link": None,
        "pdf": None
    }


data = {
    "entries": []
}


with open("cnfs.json", "r", encoding="utf8") as file:
    cnfs = json.load(file)

with open("lbc.json", "r", encoding="utf8") as file:
    lbc = json.load(file)

with open("solnum.json", "r", encoding="utf8") as file:
    solnum = json.load(file)


for item in cnfs["data"]:
    entry = create_blank_entry()
    entry["title"] = item["description"]
    entry["date"] = parser.parse(item["updated_at"]).date()
    entry["categories"].append(item["categorie"])
    for tag in item["tags"]:
        entry["tags"].append(tag)
    entry["source"] = SOURCE_CNFS
    entry["pdf"] = "https://ressourcerie.conseiller-numerique.gouv.fr/" + item["lien"]
    data["entries"].append(entry)



for theme in solnum["themes"]:
    for section in theme["sections"]:
        for card in section["cards"]:
            entry = create_blank_entry()
            entry["title"] = card["title"]
            entry["thumbnail"] = card["thumbnail"]
            entry["description"] = card["description"]
            entry["link"] = card["href"]
            entry["date"] = card["date"]
            entry["tags"] = card["tags"]
            entry["categories"].append(section["title"])
            entry["categories"].append(theme["title"])
            entry["source"] = SOURCE_SOLNUM
            data["entries"].append(entry)


for theme in lbc["themes"]:
    for item in theme["items"]:
        entry = create_blank_entry()
        if "course" not in item:
            continue
        entry["title"] = item["course"]["course"]["title"]
        entry["thumbnail"] = "https://www.lesbonsclics.fr" + theme["thumbnail"]
        entry["description"] = bs4.BeautifulSoup(item["course"]["course"]["description"], features="html.parser").text
        entry["link"] = item["notice"]["src"]

        
        if item["notice"]["pdf"] is not None:
            entry["pdf"] = item["notice"]["src"] + item["notice"]["pdf"]

        for lesson in item["course"]["course"]["lessons"]:
            if "fiche résumé" not in lesson["title"].lower():
                continue
            for lesson_item in lesson["items"]:
                if lesson_item["type"] == "multimedia":
                    for lesson_item_item in lesson_item["items"]:
                        entry["pdf"] = item["notice"]["src"].replace("index.html", "assets/") + lesson_item_item["media"]["attachment"]["key"]                      
                        break
                    break
            break


        entry["date"] = parser.parse(item["course"]["course"]["updatedAt"]).date()
        # entry["tags"] = card["tags"]
        # entry["categories"].append(section["title"])
        entry["categories"].append(theme["title"])
        entry["source"] = SOURCE_LBC
        
        data["entries"].append(entry)



with open("merger.json", "w") as file:
    json.dump(data, file, default=str, indent=4)