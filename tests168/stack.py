import sys
from PIL import Image
# stack.py out.png a.png b.png [scale]  -> vertical stack
a, b = Image.open(sys.argv[2]).convert('RGB'), Image.open(sys.argv[3]).convert('RGB')
s = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
w, h = a.size
c = Image.new('RGB', (w, h * 2)); c.paste(a, (0, 0)); c.paste(b, (0, h))
c.resize((int(w * s), int(h * 2 * s))).save(sys.argv[1])
