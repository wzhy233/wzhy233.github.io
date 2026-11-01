"""Collect only public account data. No cookies, tokens, or invented fallback values."""
import base64
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import urllib.request
import urllib.error
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

SOURCE_ROOT = Path(__file__).resolve().parents[1]
ROOT = SOURCE_ROOT / "github-pages" if (SOURCE_ROOT / "github-pages").is_dir() else SOURCE_ROOT


def read(url, json_body=True):
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PersonalHomepage/1.0)"}
    if urlparse(url).hostname == "api.github.com" and os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    if urlparse(url).hostname == "api.bilibili.com":
        headers["Referer"] = "https://space.bilibili.com/"
    for attempt in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
                body = response.read(4_000_000).decode("utf-8")
            break
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt:
                raise
    return json.loads(body) if json_body else body


def https_url(value):
    parsed = urlparse(value or "")
    return value if parsed.scheme == "https" and parsed.hostname and not parsed.username else None


def bili_data(payload):
    if payload.get("code") != 0:
        raise ValueError("Bilibili public API unavailable")
    data = payload["data"]
    card = data["card"]
    return {"name": card["name"], "avatar": https_url(card.get("face")),
            "followers": data["follower"], "following": card["attention"],
            "videos": data["archive_count"], "likes": data["like_num"],
            "level": card.get("level_info", {}).get("current_level"), "bio": card.get("sign", "")}


def steam_data(xml):
    profile = ET.fromstring(xml)
    if profile.find("error") is not None:
        raise ValueError("Steam profile unavailable")
    privacy = profile.findtext("privacyState", "private")
    result = {"name": profile.findtext("steamID"), "avatar": https_url(profile.findtext("avatarFull")),
              "privacy": privacy}
    # Private profiles do not provide reliable presence or game hours.
    if privacy == "public":
        result["state"] = profile.findtext("onlineState")
        result["games"] = [{"name": game.findtext("gameName"), "hours": game.findtext("hoursPlayed"),
                            "url": https_url(game.findtext("gameLink"))}
                           for game in profile.findall("./mostPlayedGames/mostPlayedGame")]
    return result


def minecraft(name, reader=read):
    data = reader(f"https://api.mojang.com/users/profiles/minecraft/{name}")
    uuid = data["id"]
    if not re.fullmatch(r"[a-fA-F0-9]{32}", uuid):
        raise ValueError("Invalid Minecraft UUID")
    profile = reader(f"https://sessionserver.mojang.com/session/minecraft/profile/{uuid}")
    texture = next(prop for prop in profile["properties"] if prop["name"] == "textures")
    skin = json.loads(base64.b64decode(texture["value"]))["textures"]["SKIN"]["url"]
    if urlparse(skin).hostname != "textures.minecraft.net":
        raise ValueError("Unexpected skin host")
    return {"name": data["name"], "uuid": uuid, "skin": skin.replace("http://", "https://", 1)}


def youtube(xml):
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
          "m": "http://search.yahoo.com/mrss/"}
    feed = ET.fromstring(xml)
    entries = []
    for entry in feed.findall("a:entry", ns)[:6]:
        video_id = entry.findtext("yt:videoId", namespaces=ns)
        if not re.fullmatch(r"[\w-]{11}", video_id or ""):
            continue
        entries.append({"id": video_id, "title": entry.findtext("a:title", namespaces=ns),
                        "published": entry.findtext("a:published", namespaces=ns),
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"})
    return {"name": feed.findtext("a:title", namespaces=ns), "videos": entries}


def articles(ids, reader=read):
    result = []
    for article_id in ids:
        payload = reader(f"https://api.bilibili.com/x/article/viewinfo?id={int(article_id)}")
        if payload.get("code") != 0:
            continue
        data = payload["data"]
        result.append({"id": article_id, "title": data["title"], "author": data["author_name"],
                       "url": f"https://www.bilibili.com/read/cv{article_id}",
                       "image": next((https_url(url) for url in data.get("image_urls", []) if https_url(url)), None),
                       "views": data.get("stats", {}).get("view")})
    return result


def collect(config, reader=read):
    sources = {
        "bilibili": (f"https://space.bilibili.com/{config['bilibili']}", lambda: bili_data(reader(f"https://api.bilibili.com/x/web-interface/card?mid={config['bilibili']}"))),
        "steam": (f"https://steamcommunity.com/profiles/{config['steam']}/", lambda: steam_data(reader(f"https://steamcommunity.com/profiles/{config['steam']}/?xml=1", False))),
        "minecraft": ("https://www.minecraft.net/", lambda: minecraft(config["minecraft"], reader)),
        "youtube": (f"https://www.youtube.com/channel/{config['youtube']}", lambda: youtube(reader(f"https://www.youtube.com/feeds/videos.xml?channel_id={config['youtube']}", False))),
        "articles": ("https://www.bilibili.com/", lambda: articles(config.get("articles", []), reader)),
    }

    def get(item):
        key, (source, callback) = item
        at = datetime.now(timezone.utc).isoformat()
        try:
            return key, {"status": "ok", "updatedAt": at, "source": source, "data": callback()}
        except Exception as error:
            # Never carry forward an old success after a failed refresh.
            print(f"{key}: public data unavailable ({type(error).__name__})")
            return key, {"status": "error", "updatedAt": at, "source": source, "data": None}

    with ThreadPoolExecutor(max_workers=5) as pool:
        accounts = dict(pool.map(get, sources.items()))
    return {"generatedAt": datetime.now(timezone.utc).isoformat(), "accounts": accounts}


def collect_github(config, selected, reader=read):
    api = "https://api.github.com/"
    user = config["github"]
    urls = [api + f"users/{user}", api + f"users/{user}/events/public?per_page=30",
            f"https://github-contributions-api.jogruber.de/v4/{user}?y=last"]
    urls.extend(api + f"repos/{repo}" for repo in selected)
    responses = {}

    def get(url):
        try:
            return url, {"status": "ok", "data": reader(url)}
        except Exception as error:
            print(f"GitHub source unavailable: {type(error).__name__}")
            return url, {"status": "error", "data": None}

    with ThreadPoolExecutor(max_workers=4) as pool:
        responses.update(pool.map(get, urls))
    # Follow every owned-repository page, so totals never silently truncate at 100.
    page = 1
    while page <= 100:
        url = api + f"users/{user}/repos?type=owner&per_page=100&page={page}"
        key, result = get(url)
        responses[key] = result
        if result["status"] != "ok" or not isinstance(result["data"], list) or len(result["data"]) < 100:
            break
        page += 1
    return {"generatedAt": datetime.now(timezone.utc).isoformat(), "responses": responses}


if __name__ == "__main__":
    config = json.loads((ROOT / "config/accounts.json").read_text(encoding="utf-8"))
    result = collect(config)
    selected = json.loads((ROOT / "config/projects.json").read_text(encoding="utf-8"))
    github = collect_github(config, selected)
    for name, data in [("accounts", result), ("github", github)]:
        destination = ROOT / f"data/{name}.json"
        destination.parent.mkdir(exist_ok=True)
        temporary = destination.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(destination)
    for account, value in result["accounts"].items():
        print(f"{account}: {value['status']}")
