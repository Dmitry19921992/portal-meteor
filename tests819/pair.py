# side-by-side preview for my own look (not for Fitba): pair.py a.png b.png out.jpg [w]
import sys
from PIL import Image
a, b = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
w = int(sys.argv[4]) if len(sys.argv) > 4 else 640
def fit(im):
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
a, b = fit(a), fit(b)
o = Image.new('RGB', (w, a.height + b.height + 6), (255, 0, 0))
o.paste(a, (0, 0)); o.paste(b, (0, a.height + 6))
o.save(sys.argv[3], quality=85)
