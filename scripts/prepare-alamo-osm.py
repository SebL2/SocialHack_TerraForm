"""Download the public OSM street/park/building geometry used by this level."""
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

bbox = [-122.4384, 37.7738, -122.4315, 37.778]
url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join(map(str, bbox))
req = urllib.request.Request(url, headers={'User-Agent': 'TestGameEducationalPrototype/0.1'})
with urllib.request.urlopen(req, timeout=45) as response:
    root = ET.fromstring(response.read())
nodes = {n.attrib['id']: {'lat': float(n.attrib['lat']), 'lon': float(n.attrib['lon'])} for n in root.findall('node')}
elements = []
for way in root.findall('way'):
    tags = {n.attrib['k']: n.attrib['v'] for n in way.findall('tag')}
    if not any(k in tags for k in ['building', 'highway', 'leisure']):
        continue
    geometry = [nodes[n.attrib['ref']] for n in way.findall('nd') if n.attrib['ref'] in nodes]
    elements.append({'id': way.attrib['id'], 'tags': tags, 'geometry': geometry})
output = {'source': 'OpenStreetMap contributors', 'license': 'ODbL 1.0', 'url': 'https://www.openstreetmap.org/copyright', 'bbox': bbox, 'elements': elements}
Path('src/data/alamo-osm.json').write_text(json.dumps(output, indent=2))
print(f'Saved {len(elements)} mapped features')
