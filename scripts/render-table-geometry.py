"""Software-render the exact production meshes for multi-angle geometric QA.

No Blender/WebGL/display server required. This intentionally validates shapes,
connections, overhangs and table proportions, not final WebGL material shaders.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/tmp')
GEOMETRY = json.loads((ROOT / 'frame-geometry-current.json').read_text())['meshes']
COLORS = {
    'feltMaterial': (12, 119, 165),
    'woodMaterial': (43, 47, 52),
    'railMaterial': (43, 47, 52),
    'innerRailMaterial': (8, 115, 158),
    'cushionSeam': (7, 83, 117),
    'leather': (16, 23, 25),
    'matteBlack': (3, 7, 9),
    'darkMetal': (38, 50, 56),
    'cornerInsertMaterial': (69, 81, 88),
    'cornerInsertBackingMaterial': (16, 23, 25),
    'slateMaterial': (51, 60, 65),
    'baseMaterial': (30, 41, 45),
    'sightInsetMaterial': (12, 19, 23),
    'pearlMaterial': (230, 233, 229),
    'apronMaterial': (39, 43, 48),
    'brushedAluminium': (156, 171, 177),
    'lowerRevealMaterial': (10, 18, 22),
    'brand': (240, 245, 243),
}


def norm(vector):
    return vector / max(np.linalg.norm(vector), 1e-12)


def render(name, camera, target, zoom=1, size=(1600, 1000)):
    width, height = size
    eye = np.array(camera, dtype=float)
    at = np.array(target, dtype=float)
    forward = norm(at-eye)
    right = norm(np.cross(forward, np.array((0, 1, 0))))
    up = np.cross(right, forward)
    light = norm(np.array((-.4, 1.2, 0.65)))
    polygons = []
    bounds = []
    for mesh in GEOMETRY:
        # The live FRAME logo is a transparent canvas texture; a geometry-only
        # renderer cannot represent its white lettering without showing a
        # solid rectangular plate that is absent from the actual table.
        if mesh['material']=='brand':continue
        pts = np.array(mesh['vertices'], dtype=float)
        rel = pts-eye
        depth = rel @ forward
        scale = 3.7 / np.maximum(depth, .01)
        # Perspective projection; focal distance is calibrated per view.
        projected = np.column_stack((rel @ right * scale, rel @ up * scale))
        if name in ('plan', 'perspective', 'profil'):
            bounds.extend(projected.tolist())
        base = np.array(COLORS.get(mesh['material'], (115, 120, 125)))
        for a, b, c in mesh['triangles']:
            vertex = pts[[a, b, c]]
            tri = projected[[a, b, c]]
            face = np.cross(vertex[1]-vertex[0], vertex[2]-vertex[0])
            face_length = np.linalg.norm(face)
            if face_length < 1e-10 or min(depth[a], depth[b], depth[c]) <= 0:
                continue
            n = face / face_length
            facing = np.dot(n, forward)
            # Double-sided polygons are intentional on pocket liners, felt,
            # and chrome castings; only use mild back-facing contrast.
            ambient = .47 + .48 * abs(np.dot(n, light))
            if facing > 0:
                ambient *= .86
            color = tuple(np.clip(base*ambient+8, 0, 255).astype(int))
            polygons.append((float(depth[[a, b, c]].mean()), tri, color,
                             depth[[a, b, c]]))

    if bounds:
        allcoords = np.array(bounds)
        extent = np.max(allcoords, axis=0)-np.min(allcoords, axis=0)
        midpoint = (np.max(allcoords, axis=0)+np.min(allcoords, axis=0))/2
        pixels_per_unit = .87*min(width/max(extent[0], .01), height/max(extent[1], .01))
    else:
        midpoint = np.array((0., 0.))
        pixels_per_unit = 430*zoom
    pixels_per_unit *= zoom

    # Per-pixel depth buffer avoids painter-order errors across very large bed
    # triangles, and lets us see true overlaps rather than false black spikes.
    rgb=np.zeros((height,width,3),dtype=np.uint8)
    rgb[:]=[27,34,42]
    zbuffer=np.full((height,width),np.inf,dtype=np.float32)
    for _mean_depth, tri, color, depths in polygons:
        screen=np.column_stack((
            width/2+(tri[:,0]-midpoint[0])*pixels_per_unit,
            height/2-(tri[:,1]-midpoint[1])*pixels_per_unit))
        x0,y0=screen[0];x1,y1=screen[1];x2,y2=screen[2]
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<.3:continue
        xmin=max(0,int(math.floor(min(x0,x1,x2))));xmax=min(width,int(math.ceil(max(x0,x1,x2))))
        ymin=max(0,int(math.floor(min(y0,y1,y2))));ymax=min(height,int(math.ceil(max(y0,y1,y2))))
        if xmin>=xmax or ymin>=ymax:continue
        xx,yy=np.meshgrid(np.arange(xmin,xmax)+.5,np.arange(ymin,ymax)+.5)
        wa=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/den
        wb=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/den
        wc=1-wa-wb
        inside=(wa>=0)&(wb>=0)&(wc>=0)
        if not inside.any():continue
        inverse_z=wa/depths[0]+wb/depths[1]+wc/depths[2]
        interpolated_z=1/np.maximum(inverse_z,1e-8)
        prior=zbuffer[ymin:ymax,xmin:xmax]
        visible=inside&(interpolated_z<prior-1e-5)
        if visible.any():
            prior[visible]=interpolated_z[visible]
            rgb[ymin:ymax,xmin:xmax][visible]=color

    image = Image.fromarray(rgb)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((25, 24, 420, 70), radius=12, fill='#101820')
    draw.text((44, 38), f'FRAME v0.56 / {name}', fill='#f0f3f3')
    filename=ROOT / f'frame-v056-{name}.png'
    image.save(filename)
    print(filename)


if __name__ == '__main__':
    render('perspective', (2.8, 1.30, 2.8), (0, -.25, 0))
    render('plan', (0.02, 4.8, 0.01), (0, -.2, 0))
    render('profil', (0, .25, 3.4), (0, -.30, 0))
    render('angle', (1.95, .43, 1.36), (1.20, -.04, .56), zoom=1.4)
    render('poche_laterale', (0.5, .43, 1.28), (0, -.03, .63), zoom=1.6)
    render('poche_laterale_dessus', (.30, .95, .91), (0, -.02, .65), zoom=1.4)
    render('poche_laterale_profil', (.32, .16, 1.22), (0, -.015, .66), zoom=1.5)
    render('poche_angle_dessus', (1.48, 1.05, .84), (1.28, -.03, .63), zoom=1.4)
