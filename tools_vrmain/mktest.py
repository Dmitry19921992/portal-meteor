# Test copy of a preview folder with Meta's IWER WebXR emulator (Quest 2) inlined - for headless tests ONLY, never deployed.
#   python tools_vrmain/mktest.py <preview folder> <test folder> <iwer.min.js>
import sys, shutil, io, os
src, dst, iwer = sys.argv[1:4]
if os.path.exists(dst): shutil.rmtree(dst)
shutil.copytree(src, dst)
p = os.path.join(dst, 'index.html'); t = io.open(p, encoding='utf-8').read()
js = io.open(iwer, encoding='utf-8').read().replace('</script', '<\\/script')
inj = '<script>' + js + '</script><script>window.XRDEV = new IWER.XRDevice(IWER.metaQuest2); XRDEV.installRuntime();</script>'
m = '<meta charset="utf-8">'; i = t.find(m); assert i >= 0
t = t[:i + len(m)] + inj + t[i + len(m):]
io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('test build', p, len(t))
