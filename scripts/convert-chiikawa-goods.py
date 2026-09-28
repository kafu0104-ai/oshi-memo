"""Convert official page HTML (provided as argv[1]) to a shopping catalog.
Usage: python3 scripts/convert-chiikawa-goods.py /tmp/chiikawa-goods.html
Images stay at their original URLs. No availability is inferred.
"""
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

page = Path(sys.argv[1]).read_text()
chunks = [json.loads(c) for c in re.findall(r'self\.__next_f\.push\((.*?)\)</script>', page)]
flight = ''.join(c[1] for c in chunks if len(c) > 1 and isinstance(c[1], str))
start = flight.index('"goodsItems":') + len('"goodsItems":')
items, _ = json.JSONDecoder().raw_decode(flight[start:])
products = []
for item in items:
    name = item['title'].strip()
    price_text = unicodedata.normalize('NFKC', item['price'])
    prices = re.findall(r'\d[\d,.]*', price_text)
    if not prices:
        raise ValueError(f'Missing price: {name}')
    if len(prices) > 1 and not ('単品' in price_text and 'BOX' in price_text and len(prices) == 2):
        raise ValueError(f'Ambiguous price: {name}: {price_text}')
    limit_text = item.get('limitText', '')
    limit_match = re.search(r'(\d+)点', unicodedata.normalize('NFKC', limit_text))
    description = html.unescape(re.sub(r'<[^>]+>', '\n', item.get('description', '')))
    # Preserve factual availability/size notes, not marketing copy or long descriptions.
    notes = []
    for line in description.splitlines():
        line = line.strip()
        if re.search(r'\d+月\d+日|期間限定|^サイズ[：:]|購入制限', line):
            notes.append(line)
    for index, price in enumerate(prices):
        label = ('単品' if index == 0 else 'BOX') if len(prices) == 2 else ''
        if '.' in price:
            notes.append(f'価格要確認：公式ページの表記は「{item["price"]}」です。')
        products.append({
            'id': f'chiikawa-{item["id"]}' + (f'-{index}' if len(prices) == 2 else ''),
            'name': name, 'variant': label,
            'price': int(price.replace(',', '').replace('.', '')),
            'priceText': item['price'],
            'limit': int(limit_match.group(1)) if limit_match else None,
            'limitText': limit_text or '購入上限の記載なし（当日確認）',
            'category': item['category'],
            'image': 'https://chiikawapark-tokyo.jp' + item['images'][0]['url'] if item.get('images') else '',
            'sourceUrl': 'https://chiikawapark-tokyo.jp/goods/',
            'sourceNote': ' ／ '.join(dict.fromkeys(notes)),
            'random': 'トレーディング' in name and label != 'BOX',
        })
assert len({p['id'] for p in products}) == len(products)
Path('app/src/data/chiikawaPark.json').write_text(json.dumps(products, ensure_ascii=False, indent=2) + '\n')
print(f'{len(items)} official entries → {len(products)} purchasable rows')
