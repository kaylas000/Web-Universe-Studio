#!/usr/bin/env python3
import json
import os
import sys
from urllib.parse import urlencode
from urllib.request import urlopen, Request

USER_ID = sys.argv[1] if len(sys.argv) > 1 else "793867715"
TOKEN = os.environ.get("VK_TOKEN")
if not TOKEN:
    print("ERROR: VK_TOKEN не задан (export VK_TOKEN=...)")
    sys.exit(1)

OUT = os.path.expanduser(f"~/Документы/Проекты/Цех веб/проекты/данные/vk_user_{USER_ID}_wall.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

params = {
    "owner_id": USER_ID,
    "count": 100,
    "extended": 1,
    "fields": "photo_50,photo_100,photo_200,photo_400_orig",
    "access_token": TOKEN,
    "v": "5.199",
}
url = "https://api.vk.com/method/wall.get?" + urlencode(params)
try:
    with urlopen(Request(url, headers={"User-Agent":"vk-parser"})) as r:
        data = json.loads(r.read().decode("utf-8"))
except Exception as e:
    print("ERR", e); sys.exit(1)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# краткий отчёт
items = data.get("response", {}).get("items", [])
count_total = data.get("response", {}).get("count", "?")
print(f"Сохранено: {OUT}")
print(f"Постов в выгрузке: {len(items)}, всего на стене: {count_total}")
# фото
photo_posts = sum(1 for i in items if i.get("attachments") and any(a.get("type")=="photo" for a in i["attachments"]))
print(f"Постов с фото: {photo_posts}")
