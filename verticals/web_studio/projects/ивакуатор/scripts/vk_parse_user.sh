#!/bin/bash
set -e
USER_ID="${1:-793867715}"
OUT="$HOME/Документы/Проекты/Цех веб/проекты/данные/vk_user_${USER_ID}_posts.json"
TOKEN="${VK_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "ERROR: VK_TOKEN не задан. export VK_TOKEN=..."
  exit 1
fi

echo "Парсим пользователя vk.com/id$USER_ID"
curl -s -G "https://api.vk.com/method/wall.get" \
  --data-urlencode "owner_id=$USER_ID" \
  --data-urlencode "count=100" \
  --data-urlencode "extended=1" \
  --data-urlencode "fields=photo_50,photo_100,photo_200" \
  --data-urlencode "access_token=$TOKEN" \
  --data-urlencode "v=5.199" > "$OUT" || { echo "FAIL"; exit 1; }

echo "Сохранено: $OUT"
jq '.response.items[] | {id, date, text: .text | substr(0,200), attachments: (.attachments // [] | map(.type)), likes: .likes.count, comments: .comments.count, views: .views.count}' "$OUT" 2>/dev/null | head -n 10 && echo "---"
echo "Всего постов (первый вызов): $(jq '.response.count // "?"' "$OUT" 2>/dev/null)"
