#!/usr/bin/env python3
import os, json, re, urllib.request

d = os.path.expanduser('~/Документы/Проекты/Цех веб/проекты/данные')
pdir = os.path.join(d,'photos')
os.makedirs(pdir, exist_ok=True)

# попробуем взять все img с vkuserphoto максимального размера
# не имеем DOM, но сохраним что есть
res = {
  "profile": "vk.com/id793867715",
  "photos": [],
  "phones": [],
  "texts": []
}
with open(os.path.join(d,'vk_id793867715_full.html'),'w',encoding='utf-8',errors='ignore') as f:
    pass  # заглушка
