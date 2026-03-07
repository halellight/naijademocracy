import re
with open(r'c:\Users\danie\Downloads\nigeriawqw\public\Nigeria_States_map.svg', encoding='utf-8') as f:
    ids = re.findall(r'id="([^"]+)"', f.read())
    print("\n".join(ids))
