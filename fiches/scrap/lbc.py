from typing import DefaultDict
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
import selenium.common


import bs4
import json
import requests
import re
import base64


BASE_URL = "https://www.lesbonsclics.fr"



def extract_toplevel_cards(html):
    soup = bs4.BeautifulSoup(html, features="html.parser")
    cards = []
    for link in soup.select_one("div.content-gallery.start").find_all("a", {"class": "training-card"}):
        cards.append({
            "title": link.find("p").text.strip(),
            "href": BASE_URL + link["href"],
            "thumbnail": link.find("img")["src"],
        })
    return cards


def extract_formation_items(html):
    soup = bs4.BeautifulSoup(html, features="html.parser")
    items = []
    for wrapper in soup.find_all("div", {"class": "item-formation"}):
        level = wrapper.find("span", {"class": "level"}).text.strip()
        for item in wrapper.find_all("a"):
            items.append({
                "level": level,
                "title": item.text.strip(),
                "href": BASE_URL + item["href"]
            })
    return items


def extract_notice(html):
    """Warning: if no notice is found, returns None
    """
    soup = bs4.BeautifulSoup(html, features="html.parser")
    notice = {
        "title": None,
        # "raw": html,
        "description": None,
        "pdf": None
    }
    title = soup.find("h1")
    if title is not None:
        notice["title"] = title.text.strip()
    description = soup.find("div", {"class": "overview__description"})
    if description is not None:
        for br in description:
            br.replace_with("\n")
        notice["description"] = description.text.strip()
    for a in soup.find_all("a"):
        if "fiche résumé" in a.text.lower():
            notice["pdf"] = a["href"]
    return notice


def secondary_fetch(output):
    course_data_regex = re.compile("window\.courseData = \"([a-zA-Z0-9=\+/]+)\";$", re.MULTILINE)
    with open(output, "r", encoding="utf8") as file:
        data = json.load(file)
    for theme in data["themes"]:
        for item in theme["items"]:
            response = requests.get(item["notice"]["src"])
            match = course_data_regex.search(response.text)
            if match is not None:
                encoded = match.group(1)
                decoded = base64.b64decode(encoded)
                item["course"] = json.loads(decoded)
    with open(output, "w", encoding="utf8") as file:
        json.dump(data, file, default=str, indent=4)


def main(output, gecko_driver=r"C:\dev\geckodriver.exe"):
    username = input("username> ").strip()
    password = input("password> ").strip()
    service = Service(executable_path=gecko_driver)
    driver = webdriver.Firefox(service=service)
    driver.get(BASE_URL + "/fr/espace-apprenant/")
    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "student_login_username")))
    driver.find_element(By.ID, "student_login_username").send_keys(username)
    driver.find_element(By.ID, "student_login_password").send_keys(password)
    driver.find_element(By.ID, "student_login_submit").click()
    cards = extract_toplevel_cards(driver.page_source)
    data = {"themes": []}
    for card in cards:
        driver.get(card["href"])
        items = extract_formation_items(driver.page_source)
        clean_items = []
        for item in items:
            driver.get(item["href"])
            try:
                driver.find_element_by_id("iFrameAjust")
            except selenium.common.exceptions.NoSuchElementException:
                continue
            iframe_src = driver.find_element_by_id("iFrameAjust").get_attribute("src")
            driver.switch_to.frame(driver.find_element_by_id("iFrameAjust"))
            notice = extract_notice(driver.page_source)
            if notice is not None:
                notice["src"] = iframe_src
                item["notice"] = notice
                clean_items.append(item)
            driver.switch_to.default_content()
        card.update({
            "items": clean_items
        })
        data["themes"].append(card)
        # break # TODO: comment this
    with open(output, "w", encoding="utf8") as file:
        json.dump(data, file, default=str, indent=4)
    secondary_fetch(output)


if __name__ == "__main__":
    main("lbc.json")
    secondary_fetch("lbc.json")