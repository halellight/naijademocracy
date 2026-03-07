import re
import math

def parse_move(d):
    m = re.search(r'[mM]\s*([\d\.-]+)\s*,\s*([\d\.-]+)', d)
    if m:
        return float(m.group(1)), float(m.group(2))
    return 0, 0

# transform="matrix(1.0174222,0,0,1.0195689,-1.6434541,-5.7070511)"
def transform(x, y):
    return x * 1.0174222 - 1.6434541, y * 1.0195689 - 5.7070511

new_svg_path = r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg'
with open(new_svg_path, 'r') as f:
    content = f.read()

new_paths = []
for match in re.finditer(r'<path[^>]+>', content):
    tag = match.group(0)
    d_m = re.search(r'd="([^"]+)"', tag)
    if not d_m: continue
    d = d_m.group(1)
    x, y = parse_move(d)
    tx, ty = transform(x, y)
    new_paths.append({'d': d, 'coord': (tx, ty)})

old_jsx_path = r'c:\Users\danie\Downloads\nigeriawqw\nigerian.jsx'
with open(old_jsx_path, 'r', encoding='utf-8') as f:
    jsx = f.read()

old_paths = []
for match in re.finditer(r'\{\s*id:\s*"([^"]+)",\s*d:\s*"([^"]+)"\s*\}', jsx):
    old_paths.append({'id': match.group(1), 'coord': parse_move(match.group(2))})

mapping = {}
used_new = set()
for old in old_paths:
    best_dist = float('inf')
    best_idx = -1
    for i, new in enumerate(new_paths):
        if i in used_new: continue
        dist = math.sqrt((old['coord'][0] - new['coord'][0])**2 + (old['coord'][1] - new['coord'][1])**2)
        if dist < best_dist:
            best_dist = dist
            best_idx = i
    if best_idx != -1:
        mapping[old['id']] = new_paths[best_idx]['d']
        used_new.add(best_idx)

# Output results to a file for easy reading
with open(r'c:\Users\danie\Downloads\nigeriawqw\mapped_paths.json', 'w') as f:
    import json
    json.dump(mapping, f, indent=2)
