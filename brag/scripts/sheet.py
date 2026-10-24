import sys, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(d + '/t*.png'))
cols = 3; tw, th = 640, 360
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), 'white')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th))
    ImageDraw.Draw(im).text((8, 6), f.split('/')[-1], fill=(255, 0, 255))
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
sheet.save(out)
