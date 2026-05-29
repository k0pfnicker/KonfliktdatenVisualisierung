import csv
import json
import urllib.request
import urllib.parse
import time

# 1. Read existing coords
coords_file = 'country_coords.js'
with open(coords_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the JSON part
json_str = content.replace('export const COUNTRY_COORDS = ', '').replace(';', '').strip()
existing_coords = json.loads(json_str)

# 2. Get unique countries from CSV
csv_file = 'data/event_type_year_country_summary.csv'
unique_countries = set()
with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        unique_countries.add(row['country'])

missing_countries = [c for c in unique_countries if c not in existing_coords]
print(f"Found {len(missing_countries)} missing countries. Fetching coordinates...")

# 3. Fetch missing coords
headers = {'User-Agent': 'InfoVisProject/1.0 (student@university.edu)'}
for i, country in enumerate(missing_countries):
    print(f"[{i+1}/{len(missing_countries)}] Fetching {country}...")
    
    # Use q= instead of country= because some entries are territories/regions
    query = urllib.parse.quote(country)
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                existing_coords[country] = [lat, lon]
            else:
                print(f"  -> Could not find coordinates for {country}")
    except Exception as e:
        print(f"  -> Error fetching {country}: {e}")
        
    time.sleep(1.2) # Respect Nominatim API limits (1 request per second)

# 4. Save back to JS
new_content = "export const COUNTRY_COORDS = {\n"
lines = []
for c, coords in sorted(existing_coords.items()):
    lines.append(f'  "{c}": [{coords[0]}, {coords[1]}]')
new_content += ",\n".join(lines)
new_content += "\n};\n"

with open(coords_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Finished updating {coords_file} with new coordinates!")
