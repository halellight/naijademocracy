import re
import math

def parse_move(d):
    m = re.search(r'[mM]\s*([\d\.-]+)\s*,\s*([\d\.-]+)', d)
    if m:
        return float(m.group(1)), float(m.group(2))
    return 0, 0

# New SVG Path Data extraction
new_svg_path = r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg'
with open(new_svg_path, 'r') as f:
    content = f.read()

# transform="matrix(1.0174222,0,0,1.0195689,-1.6434541,-5.7070511)"
def transform(x, y):
    return x * 1.0174222 - 1.6434541, y * 1.0195689 - 5.7070511

new_paths = []
matches = re.finditer(r'<path[^>]+>', content)
for match in matches:
    tag = match.group(0)
    d = re.search(r'd="([^"]+)"', tag).group(1)
    x, y = parse_move(d)
    # Apply transform if it's inside the group
    tx, ty = transform(x, y)
    new_paths.append({'d': d, 'coord': (tx, ty)})

# Old Path Data extraction
old_jsx_path = r'c:\Users\danie\Downloads\nigeriawqw\nigerian.jsx'
with open(old_jsx_path, 'r', encoding='utf-8') as f:
    jsx = f.read()

# match: { id: "abia", d: "..." }
old_paths = []
old_matches = re.finditer(r'\{\s*id:\s*"([^"]+)",\s*d:\s*"([^"]+)"\s*\}', jsx)
for match in old_matches:
    state_id = match.group(1)
    d = match.group(2)
    x, y = parse_move(d)
    old_paths.append({'id': state_id, 'coord': (x, y)})

# Matching
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
        print(f"Mapped {old['id']} to new path {best_idx} (dist: {best_dist:.2f})")

# Write out the new GOVERNORS_PATHS
print("\nNEW GOVERNORS_PATHS = [")
for state_id, new_d in mapping.items():
    print(f'  {{ id: "{state_id}", d: "{new_d}" }},')
print("];")
