import logging
import codecs
import os
import re
import time
import tkinter
import selenium.webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options


def here(path):
    return os.path.realpath(os.path.join(os.path.dirname(__file__), path))


def load_credentials(filename):
    with codecs.open(filename, "r", "utf8") as infile:
        username, password = infile.read().strip().split(":")
    return username, password


def crawl_syrtis(username, password):
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    driver = selenium.webdriver.Firefox(executable_path=here("geckodriver.exe"), options=options)
    driver.implicitly_wait(10)
    driver.get("https://md-ressources.puy-de-dome.fr/#/login?redirect=%2Fdashboard")
    driver.find_element(By.ID, "username").send_keys(username)
    driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.XPATH, "/html/body/div/div[2]/div/div/div/form/button").click()
    driver.find_element(By.CSS_SELECTOR, "#menuRoot > li:nth-child(3) > a:nth-child(1)").click()
    driver.find_element(By.CSS_SELECTOR, "#menuUsagers > li:nth-child(1) > a:nth-child(1)").click()
    # driver.get("https://md-ressources.puy-de-dome.fr/#/borrower/borrower")
    time.sleep(1)
    driver.find_element(By.CSS_SELECTOR, "div.filter-element:nth-child(4) > a:nth-child(2)").click()
    driver.find_element(By.CSS_SELECTOR, "div.filter-block:nth-child(5) > div:nth-child(3) > a:nth-child(2)").click()
    time.sleep(1)
    user_list = driver.find_element(By.XPATH, "/html/body/div[2]/div[2]/div[1]/ui-view/sem-columns/div/sem-column[2]/div/div/div[2]/div[4]")
    pre_registered_users = [u.text for u in user_list.find_elements_by_class_name("list")]
    driver.close()
    driver.quit()
    return pre_registered_users


class Application(tkinter.Frame):
    def __init__(self, master=None, message=""):
        super().__init__(master)
        self.master = master
        self.message = message
        self.pack()
        self.create_widgets()

    def create_widgets(self):
        self.text = tkinter.Text(self)
        self.text.insert(tkinter.INSERT, self.message)
        self.text.pack(side="top")


def notify(pre_registered_users):
    message = "Aucun nouvel utilisateur pré-inscrit."
    if len(pre_registered_users) > 0:
        message = "%d utilisateurs pré-inscrits :\n%s" % (
            len(pre_registered_users),
            ", ".join(pre_registered_users)
        )
    print(message)
    if len(pre_registered_users) > 0:
        root = tkinter.Tk()
        root.title("Syrtis")
        root.iconbitmap(here("syrtis.ico"))
        app = Application(master=root, message=re.sub(", ", "\n", message))
        app.mainloop()


def main():
    logging.basicConfig(level=logging.INFO)
    username, password = load_credentials(here("credentials.txt"))
    pre_registered_users = crawl_syrtis(username, password)
    notify(pre_registered_users)


if __name__ == "__main__":
    main()
