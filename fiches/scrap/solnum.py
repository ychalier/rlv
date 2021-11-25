import requests
import bs4
import json
import datetime


def extract_themes():
    response = requests.get("https://www.solidarite-numerique.fr/")
    assert response.status_code == 200, response.status_code
    soup = bs4.BeautifulSoup(response.text, features="html.parser")
    themes = []
    for link in soup.find("ul", {"id": "menu-menu-principal"}).find_all("a"):
        themes.append({
            "title": link.text.strip(),
            "href": link["href"]
        })
    return themes


def extract_sections(theme):
    print("Extracting sections of '%s'" % theme["title"])
    response = requests.get(theme["href"])
    assert response.status_code == 200, response.status_code
    soup = bs4.BeautifulSoup(response.text, features="html.parser")
    sections = []
    for link in soup.find_all("a", {"class": "see-more"}):
        sections.append({
            "title": link.parent.find_previous_sibling("h4").text.strip(),
            "href": link["href"]
        })
    return sections


def extract_cards(section):
    print("Extracting cards of '%s'" % section["title"])
    response = requests.get(section["href"])
    assert response.status_code == 200, response.status_code
    soup = bs4.BeautifulSoup(response.text, features="html.parser")
    cards = []
    for aside in soup.find_all("aside"):
        if "highlight" in aside["class"] or "flex" in aside["class"]:
            continue
        cards.append({
            "title": aside.find("h5").text.strip(),
            "thumbnail": aside.find("img")["src"],
            "description": aside.find("p").text.replace("lire la suite", "").strip(),
            "href": aside["onclick"].replace("document.location.href='", "")[:-2]
        })
    return cards


def extract_date(string):
    day_str, month_str, year_str = string.strip().replace("Dernière modification : ", "").split(" ")
    month = {
        "janvier": 1,
        "février": 2,
        "mars": 3,
        "avril": 4,
        "mai": 5,
        "juin": 6,
        "juillet": 7,
        "août": 8,
        "septembre": 9,
        "octobre": 10,
        "novembre": 11,
        "décembre": 12
    }[month_str]
    return datetime.date(int(year_str), month, int(day_str))


def extract_card(card):
    print("Extracting card '%s'" % card["title"])
    response = requests.get(card["href"])
    assert response.status_code == 200, response.status_code
    soup = bs4.BeautifulSoup(response.text, features="html.parser")
    return {
        "title": soup.find("h5").text.strip(),
        "date": extract_date(soup.find("p", {"class": "date-pub"}).text),
        "tags": list(map(lambda a: a.text[1:], soup.find("p", {"class": "tags"}).find_all("a"))),
        "description": soup.find("div", {"class": "important"}).text.strip(),
    }


def main(output):
    data = {"themes": []}
    themes = extract_themes()
    for theme in themes:
        sections = extract_sections(theme)
        for section in sections:
            cards = extract_cards(section)
            section["cards"] = []
            for card in cards:
                card.update(**extract_card(card))
                section["cards"].append(card)
                # break
            # break
        data["themes"].append({
            **theme,
            "sections": sections
        })
        # break
    with open(output, "w", encoding="utf8") as file:
        json.dump(data, file, default=str)


if __name__ == "__main__":
    main("solnum.json")

