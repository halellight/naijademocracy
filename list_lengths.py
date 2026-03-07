import re
with open(r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg', encoding='utf-8') as f:
    content = f.read()
    paths = re.findall(r'id="([^"]+)"[^>]+d="([^"]+)"', content)
    for id_val, d_val in paths:
        print(f"{id_val}: {len(d_val)}")
