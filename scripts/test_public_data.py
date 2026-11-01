import base64
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("public_data", Path(__file__).with_name("update-public-data.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PublicDataTests(unittest.TestCase):
    def test_steam_private_never_exposes_presence_or_hours(self):
        xml = '<profile><steamID>mevrik</steamID><privacyState>friendsonly</privacyState><onlineState>offline</onlineState></profile>'
        result = module.steam_data(xml)
        self.assertEqual(result["privacy"], "friendsonly")
        self.assertNotIn("state", result)
        self.assertNotIn("games", result)

    def test_bilibili_reads_returned_statistics(self):
        data = module.bili_data({"code": 0, "data": {"card": {"name": "test", "face": "https://example.com/a.png", "attention": 4}, "follower": 17, "archive_count": 6, "like_num": 9}})
        self.assertEqual(data["followers"], 17)
        self.assertEqual(data["videos"], 6)
        with self.assertRaises(ValueError):
            module.bili_data({"code": -799})

    def test_minecraft_uses_verified_uuid_and_official_texture_host(self):
        uuid = "a" * 32
        texture = base64.b64encode(json.dumps({"textures": {"SKIN": {"url": "http://textures.minecraft.net/texture/abc"}}}).encode()).decode()
        def reader(url):
            return {"properties": [{"name": "textures", "value": texture}]} if "sessionserver" in url else {"id": uuid, "name": "minecraftmc33"}
        result = module.minecraft("minecraftmc33", reader)
        self.assertEqual(result["uuid"], uuid)
        self.assertTrue(result["skin"].startswith("https://textures.minecraft.net/"))

    def test_youtube_uses_only_valid_feed_entries(self):
        feed = '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><title>test</title><entry><title>Actual upload</title><yt:videoId>abcdefghijk</yt:videoId><published>2026-01-01</published></entry><entry><yt:videoId>bad</yt:videoId></entry></feed>'
        result = module.youtube(feed)
        self.assertEqual(len(result["videos"]), 1)
        self.assertEqual(result["videos"][0]["title"], "Actual upload")

    def test_failed_sources_are_recorded_independently_without_old_data(self):
        config = {"bilibili": "1", "steam": "123", "minecraft": "test", "youtube": "test", "articles": []}
        def fail(*args):
            raise OSError("offline")
        result = module.collect(config, fail)
        self.assertEqual(result["accounts"]["steam"]["status"], "error")
        self.assertIsNone(result["accounts"]["steam"]["data"])
        self.assertEqual(result["accounts"]["articles"]["status"], "ok")
        self.assertIn("generatedAt", result)

    def test_github_collects_pagination_and_selected_repositories(self):
        requested = []
        def reader(url):
            requested.append(url)
            if "page=1" in url:
                return [{}] * 100
            if "page=2" in url:
                return []
            return {"source": "actual response"}
        result = module.collect_github({"github": "test"}, ["test/project"], reader)
        self.assertTrue(any("page=2" in url for url in requested))
        self.assertIn("https://api.github.com/repos/test/project", result["responses"])
        self.assertTrue(all(record["status"] == "ok" for record in result["responses"].values()))

    def test_private_or_script_urls_cannot_become_public_links(self):
        self.assertIsNone(module.https_url("javascript:alert(1)"))
        self.assertIsNone(module.https_url("https://username:secret@example.com/"))


if __name__ == "__main__":
    unittest.main()
