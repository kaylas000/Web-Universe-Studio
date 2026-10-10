#!/usr/bin/env python3
import os, sys, re, json
from urllib.request import urlopen, Request

uid = "793867715"
url = f"https://m.vk.com/id{uid}"
try:
    with urlopen(Request(url, headers={"User-Agent":"Mozilla/5.0"})) as r:
        html = r.read().decode("utf-8", errors="ignore")
except Exception as e:
    print(e); sys.exit(1)

out_dir = os.path.expanduser("~/Документы/Проекты/Цех веб/проекты/данные")
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, f"vk_id{uid}_page.html"), "w", encoding="utf-8") as f:
    f.write(html)

# выцепим посты-тексты
posts = []
# простые блоки
for m in re.findall(r'<div[^>]*class="[^"]*wall_item[^"]*"[^>]*>(.*?)</article>', html, re.S):
    txt = re.sub(r'<[^>]+>', ' ', m)
    txt = re.sub(r'\s+', ' ', txt).strip()
    if txt and len(txt) > 10:
        posts.append(txt)
with open(os.path.join(out_dir, f"vk_id{uid}_posts_text.txt"), "w", encoding="utf-8") as f:
    for p in posts:
        f.write(p+"\n\n---\n\n")
with open(os.path.join(out_dir, f"vk_id{uid}_posts.json"), "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print(f"HTML: {len(html)} bytes, постов найдено: {len(posts)}")
