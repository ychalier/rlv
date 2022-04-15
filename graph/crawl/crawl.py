import time
import requests
import bs4
import argparse
import re
import urllib.parse


def points_to_a_file(url):
    if url.endswith(".jpg"):
        return True
    if url.endswith(".png"):
        return True
    if url.endswith(".pdf"):
        return True
    if url.endswith(".svg"):
        return True
    if url.endswith(".gif"):
        return True
    if url.endswith(".pptx"):
        return True
    if url.endswith(".studio3"):
        return True
    if url.endswith(".stl"):
        return True
    if url.endswith(".mp4"):
        return True
    if url.endswith(".mov"):
        return True
    if url.endswith(".ods"):
        return True
    if url.endswith(".zip"):
        return True
    if url.endswith(".odt"):
        return True
    if url.endswith(".odp"):
        return True
    if url.endswith(".docx"):
        return True
    if url.endswith(".pes"):
        return True
    return False


def crawl(base_url):
    seen = set([base_url])
    to_crawl = [base_url]
    domain = re.match(r"^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)", base_url).group(1)
    edges = []
    while True:
        if len(to_crawl) == 0:
            break
        url = to_crawl.pop()
        print(f"[{len(to_crawl)}] {url}")
        response = requests.get(url)
        soup = bs4.BeautifulSoup(response.text, features="html.parser")
        for link in soup.find_all("a"):
            if link.get("href") is None:
                continue
            href = urllib.parse.urljoin(url, link["href"])
            domain_match = re.match(r"^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)", href)
            if domain_match is None or domain_match.group(1) != domain or points_to_a_file(href) or "#" in href or "tag:" in href or "category:" in href or "month:" in href:
                continue
            edges.append((url, href))
            if href in seen:
                continue
            seen.add(href)
            to_crawl.append(href)
        if len(to_crawl) > 0:
            time.sleep(2)
    return edges


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("base_url", type=str)
    parser.add_argument("output", type=str)
    args = parser.parse_args()
    edges = crawl(args.base_url)
    with open(args.output, "w", encoding="utf8") as file:
        for u, v in edges:
            file.write(f"{u}\t{v}\n")


if __name__ == "__main__":
    main()