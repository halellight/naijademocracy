import re

svg_path = r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg'

import re

svg_path = r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg'

with open(svg_path, 'r') as f:
    # Remove XML and metadata to simplify
    content = f.read()

# Match all paths, capture d and id
matches = re.finditer(r'<path[^>]+>', content)

for match in matches:
    path_tag = match.group(0)
    d_match = re.search(r'd="([^"]+)"', path_tag)
    id_match = re.search(r'id="([^"]+)"', path_tag)
    if d_match:
        d = d_match.group(1)
        pid = id_match.group(1) if id_match else "no-id"
        print(f'ID: {pid} | START: {d[:30]}...')
