# Script de referência que gerou a capa "Ciclo Exato" (docs/assets e icons/og-cover.png).
# Requer pycairo + Pillow e as fontes Outfit, Jura e Geist Mono (OFL). Ajuste FONTS e os
# caminhos de saída antes de rodar. Filosofia visual: docs/design/ciclo-exato-filosofia.md
import math, cairo
from PIL import Image, ImageDraw, ImageFont

W, H = 2560, 1280
FONTS = "/root/.claude/skills/synced/074662ae-6f21-44fa-9a12-334f52be5e17_d4d81585-5e10-4d8d-9290-78d2823c1cd0/canvas-design/canvas-fonts/"
GREEN = (0x3c/255, 0xd0/255, 0x8a/255)

surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
c = cairo.Context(surf)

# ---- fundo: marinho -> petróleo
g = cairo.LinearGradient(0, 0, W, H)
g.add_color_stop_rgb(0.00, 0x05/255, 0x15/255, 0x2b/255)
g.add_color_stop_rgb(0.55, 0x07/255, 0x24/255, 0x42/255)
g.add_color_stop_rgb(1.00, 0x03/255, 0x3a/255, 0x41/255)
c.set_source(g); c.paint()
r = cairo.RadialGradient(1820, 640, 0, 1820, 640, 760)
r.add_color_stop_rgba(0, 0.10, 0.45, 0.50, 0.16)
r.add_color_stop_rgba(1, 0.10, 0.45, 0.50, 0.0)
c.set_source(r); c.paint()

def white(a): c.set_source_rgba(0.93, 0.97, 1.0, a)

CX, CY, HALF = 1820, 640, 500

# ---- rack 500 x 500: moldura + malha de pinos
white(0.16); c.set_line_width(1.2)
c.rectangle(CX-HALF, CY-HALF, 2*HALF, 2*HALF); c.stroke()
# cantoneiras
white(0.55); c.set_line_width(2)
L = 26
for sx in (-1, 1):
    for sy in (-1, 1):
        x, y = CX+sx*HALF, CY+sy*HALF
        c.move_to(x, y-sy*L); c.line_to(x, y); c.line_to(x-sx*L, y); c.stroke()
# pinos (25 x 25) — somem perto do centro, onde o braço gira
N = 25; step = 2*HALF/N
for i in range(N):
    for j in range(N):
        x = CX-HALF+step*(i+.5); y = CY-HALF+step*(j+.5)
        d = math.hypot(x-CX, y-CY)
        a = 0.05 + 0.13*min(1, max(0, (d-250)/260))
        white(a); c.arc(x, y, 1.6, 0, 2*math.pi); c.fill()

# ---- anéis concêntricos
for k, rad in enumerate(range(60, 461, 40)):
    white(0.07 + 0.10*(k % 3 == 0)); c.set_line_width(1.0)
    c.arc(CX, CY, rad, 0, 2*math.pi); c.stroke()

# ---- mostrador externo: marcas a cada 2°, maiores a cada 10°
RO = 470
for deg in range(0, 360, 2):
    t = math.radians(deg - 90)
    ln = 22 if deg % 30 == 0 else (13 if deg % 10 == 0 else 6)
    white(0.55 if deg % 30 == 0 else 0.28); c.set_line_width(1.4 if deg % 10 == 0 else 1.0)
    c.move_to(CX+RO*math.cos(t), CY+RO*math.sin(t))
    c.line_to(CX+(RO-ln)*math.cos(t), CY+(RO-ln)*math.sin(t)); c.stroke()

# ---- único acento verde: arco de 82° (enxágue)
A0 = -90 + 18; A1 = A0 + 82
c.set_source_rgb(*GREEN); c.set_line_width(4); c.set_line_cap(cairo.LINE_CAP_ROUND)
c.arc(CX, CY, RO+16, math.radians(A0), math.radians(A1)); c.stroke()
c.set_line_cap(cairo.LINE_CAP_BUTT)
for a in (A0, A1):
    t = math.radians(a)
    c.set_source_rgba(*GREEN, 0.9); c.set_line_width(1.4)
    c.move_to(CX+(RO+6)*math.cos(t), CY+(RO+6)*math.sin(t))
    c.line_to(CX+(RO+30)*math.cos(t), CY+(RO+30)*math.sin(t)); c.stroke()

# ---- braço aspersor (dois braços, rotação -14°)
ROT = math.radians(-14)
ARM = 400
ux, uy = math.cos(ROT), math.sin(ROT)
nx, ny = -uy, ux
white(0.85); c.set_line_width(2.2)
c.move_to(CX-ARM*ux, CY-ARM*uy); c.line_to(CX+ARM*ux, CY+ARM*uy); c.stroke()
white(0.25); c.set_line_width(1)
for off in (-9, 9):
    c.move_to(CX-ARM*ux+off*nx, CY-ARM*uy+off*ny); c.line_to(CX+ARM*ux+off*nx, CY+ARM*uy+off*ny); c.stroke()
# cubo central
white(0.9); c.set_line_width(1.6); c.arc(CX, CY, 18, 0, 2*math.pi); c.stroke()
white(0.9); c.arc(CX, CY, 4, 0, 2*math.pi); c.fill()
white(0.3); c.set_line_width(1); c.arc(CX, CY, 34, 0, 2*math.pi); c.stroke()

# bicos + jatos (lados opostos em cada braço -> rotação)
for sgn in (-1, 1):
    for rad in (100, 180, 260, 340, 400):
        px, py = CX+sgn*rad*ux, CY+sgn*rad*uy
        white(0.95); c.arc(px, py, 4.2, 0, 2*math.pi); c.fill()
        white(0.35); c.set_line_width(1); c.arc(px, py, 10, 0, 2*math.pi); c.stroke()
        # leque de jatos para o lado do giro
        for f in (-0.26, 0, 0.26):
            dx = sgn*nx*math.cos(f) + sgn*ux*math.sin(f)
            dy = sgn*ny*math.cos(f) + sgn*uy*math.sin(f)
            for s in range(4):
                s0 = 18 + s*13; s1 = s0 + 6
                white(0.50 - s*0.11); c.set_line_width(1.2)
                c.move_to(px+dx*s0, py+dy*s0); c.line_to(px+dx*s1, py+dy*s1); c.stroke()

# rastro de rotação: arcos tracejados nos raios dos bicos
c.set_dash([3, 9])
for rad in (180, 340):
    white(0.32); c.set_line_width(1)
    base = math.degrees(ROT)
    c.arc(CX, CY, rad, math.radians(base+8), math.radians(base+70)); c.stroke()
    c.arc(CX, CY, rad, math.radians(base+188), math.radians(base+250)); c.stroke()
c.set_dash([])

# ---- cotas 500 (topo e direita)
white(0.35); c.set_line_width(1)
yT = CY-HALF-48
c.move_to(CX-HALF, yT); c.line_to(CX+HALF, yT); c.stroke()
for x in (CX-HALF, CX+HALF):
    c.move_to(x, yT-9); c.line_to(x, yT+9); c.stroke()
xR = CX+HALF+48
c.move_to(xR, CY-HALF); c.line_to(xR, CY+HALF); c.stroke()
for y in (CY-HALF, CY+HALF):
    c.move_to(xR-9, y); c.line_to(xR+9, y); c.stroke()

# ---- regra fina à esquerda
white(0.22); c.set_line_width(1)
c.move_to(140, 1000); c.line_to(1120, 1000); c.stroke()
c.set_source_rgb(*GREEN); c.rectangle(140, 998, 56, 4); c.fill()

surf.write_to_png("/home/claude/design/_base.png")

# =================== tipografia (PIL) ===================
im = Image.open("/home/claude/design/_base.png").convert("RGBA")
layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
F = lambda n, s: ImageFont.truetype(FONTS+n, s)
mono = F("GeistMono-Regular.ttf", 22)
monoS = F("GeistMono-Regular.ttf", 19)
jura = F("Jura-Light.ttf", 40)
juraM = F("Jura-Medium.ttf", 24)
title = F("Outfit-Regular.ttf", 150)

def spaced(xy, text, font, fill, track=0.0, anchor_right=False):
    x, y = xy
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + track*(len(text)-1)
    if anchor_right: x -= total
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=fill); x += w + track
    return total

WH = (236, 246, 252)
# marca no topo
d.ellipse((140, 152, 152, 164), fill=(60, 208, 138, 255))
spaced((172, 144), "DIVERSEY  ·  A SOLENIS COMPANY", juraM, WH+(225,), 4.5)
spaced((140, 196), "PORTAL DE SOLICITAÇÃO DE PEÇAS", monoS, WH+(110,), 3.2)

# título
spaced((132, 742), "Peças WWM", title, WH+(255,), -2)
spaced((140, 920), "Solicitações  ·  Aprovações  ·  Rastreio", jura, WH+(200,), 1.5)

# legenda técnica
spaced((140, 1030), "FIG. 01 — VISTA SUPERIOR DO CICLO DE LAVAGEM", monoS, WH+(120,), 2.6)
spaced((140, 1064), "LAVA-LOUÇAS PROFISSIONAL  /  RACK 500 × 500 MM", monoS, WH+(90,), 2.6)

# cotas
lab = "500"
w = d.textlength(lab, font=mono)
yT = CY-HALF-48
d.rectangle((CX-w/2-12, yT-14, CX+w/2+12, yT+14), fill=(0, 0, 0, 0))
# fundo da cota: amostra a cor do fundo para "cortar" a linha
bg = im.getpixel((int(CX), int(yT-30)))
d.rectangle((CX-w/2-14, yT-12, CX+w/2+14, yT+12), fill=bg)
d.text((CX-w/2, yT-14), lab, font=mono, fill=WH+(150,))
# cota vertical (rotacionada)
txt = Image.new("RGBA", (int(w)+28, 30), (0, 0, 0, 0))
td = ImageDraw.Draw(txt)
bg2 = im.getpixel((int(CX+HALF+48+30), int(CY)))
td.rectangle((0, 3, txt.width, 27), fill=bg2)
td.text((14, 0), lab, font=mono, fill=WH+(150,))
txt = txt.rotate(-90, expand=True)
layer.alpha_composite(txt, (int(CX+HALF+48-txt.width/2), int(CY-txt.height/2)))

# marcadores A / B no mostrador
for ang, lb in ((0, "A"), (90, "B"), (180, "C"), (270, "D")):
    t = math.radians(ang-90)
    rr = 470 - 44
    x, y = CX+rr*math.cos(t), CY+rr*math.sin(t)
    tw = d.textlength(lb, font=monoS)
    d.text((x-tw/2, y-12), lb, font=monoS, fill=WH+(130,))

# rótulo do arco verde
mid = math.radians((A0+A1)/2)
rr = RO + 56
x, y = CX+rr*math.cos(mid), CY+rr*math.sin(mid)
d.text((x-4, y-16), "82°", font=mono, fill=(60, 208, 138, 255))

# índice no canto inferior direito do rack
spaced((CX+HALF, CY+HALF+30), "WWM · REF. 01", monoS, WH+(90,), 2.6, anchor_right=True)

im.alpha_composite(layer)
out = im.convert("RGB")
out.save("/home/claude/design/portal-wwm-cover@2x.png", optimize=True)
out.resize((1280, 640), Image.LANCZOS).save("/home/claude/design/portal-wwm-cover.png", optimize=True)
print("ok")
