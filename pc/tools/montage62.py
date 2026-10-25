# montage62.py out.jpg cols width img1 img2 ... — сетка скриншотов для быстрого просмотра
import sys
from PIL import Image
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
M = Image.new('RGB', (cols * w, rows * h))
for i, im in enumerate(ims):
    M.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
M.save(out, quality=88)
print(out, M.size)
