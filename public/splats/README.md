# Captured-scene registration

The default preview is **Sunnyvale Heritage Park Museum**, captured by
**zeitgeistarchivescans**, licensed **CC BY 4.0**.
Source: https://superspl.at/scene/d5d397aa
Asset served by PlayCanvas: https://code.playcanvas.com/examples_data/example_sunnyvale/sunnyvale.sog
Attribution and license verified in the official PlayCanvas example:
https://github.com/playcanvas/engine/blob/main/examples/src/examples/gaussian-splatting/first-person.example.mjs

This is not Alamo Square. No SF coordinates or simulation tiles are assigned to
this preview. Clicking inspects scene coordinates. The scene is about 58 MB.

## Link your own scan

Use “Link a scan to the map” to load a JSON descriptor with this shape:

```json
{
  "title": "Your captured site",
  "url": "/splats/site.sog",
  "credit": "Capture author and license",
  "source": "https://your-source.example/site",
  "rotation": [0, 0, 180],
  "camera": [12, 9, 18],
  "target": [0, 1, 0],
  "anchors": [
    {"world": [0, 0, 0], "lng": -122.4335, "lat": 37.77625},
    {"world": [10, 0, 0], "lng": -122.433386, "lat": 37.77625},
    {"world": [0, 0, 10], "lng": -122.4335, "lat": 37.77616}
  ]
}
```

**These numbers illustrate the format, not a verified site alignment.** Replace
all positions and coordinates with known points from the same actual location.
Choose three widely spaced, non-collinear ground features. `world` positions are
the displayed scene coordinates **after** the configured rotation. `rotation`
is in degrees. Scene asset formats supported here are `.sog` and Gaussian `.ply`.
External asset servers must allow cross-origin loading; self-hosted files can go
in this folder. The descriptor is only kept in memory, and no file is uploaded.

Three tie points define a 2D affine transform between scene X/Z and the local
geographic map frame. It handles rotation, translation, scale and shear. The
inverse places geographic tile-center markers on the plane defined by those
anchors. This approximate ground-plane prototype does not establish survey
accuracy, handle multi-level ground, or remove existing captured vegetation.
At least a fourth independently measured checkpoint should be used to assess
registration quality before claiming positional accuracy. A registered surface
mesh is needed for reliable placement on uneven ground and occlusion handling.

A registered click near this plane is converted to longitude/latitude, then to
the existing geographic simulation cell. Outside-area clicks are rejected.
SF land-cover rules, costs and reports still apply only inside the SF scenario.
A scan from a different place needs its own scenario extent and land data.
Game choices appear as colored markers; they do not edit the captured splats.
Mapbox remains optional and is not called by the captured-scene renderer.
