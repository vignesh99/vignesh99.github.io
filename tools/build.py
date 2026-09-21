"""Build with `python3 tools/build.py`; preview with `python3 -m http.server -d _site`."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'

def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for folder in ('theme', 'assets'):
        shutil.copytree(ROOT / folder, OUT / folder)
    for folder, pattern in [('site', '*.js'), ('content', '*.js')]:
        (OUT / folder).mkdir()
        for p in (ROOT / folder).glob(pattern):
            shutil.copy2(p, OUT / folder / p.name)
    for p in (ROOT / 'site/public').iterdir():
        shutil.copy2(p, OUT / p.name)
    routes = json.loads((ROOT / 'site/routes.json').read_text())
    for source, destination in routes['pages'].items():
        dest = OUT / destination
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / source, dest)
    for route, url in routes['redirects'].items():
        dest = OUT / route.strip('/') / 'index.html'
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex"><title>Read the paper</title>'
            f'<meta http-equiv="refresh" content="0;url={escape(url, quote=True)}">'
            f'<link rel="canonical" href="{escape(url, quote=True)}">'
            f'<script>location.replace({json.dumps(url)});</script></head><body>'
            f'<a href="{escape(url, quote=True)}">Read the official paper</a></body></html>')
    check_links()
    print('Built and checked', sum(p.is_file() for p in OUT.rglob('*')), 'files in', OUT)

def check_links():
    missing = []
    class Links(HTMLParser):
        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key not in ('src', 'href') or not value:
                    continue
                u = urlsplit(value)
                if u.scheme or u.netloc or not u.path:
                    continue
                target = OUT / unquote(u.path).lstrip('/') if u.path.startswith('/') else page.parent / unquote(u.path)
                if target.is_dir():
                    target /= 'index.html'
                if not target.exists():
                    missing.append(f'{page.relative_to(OUT)}: {value}')
    for page in OUT.rglob('*.html'):
        Links().feed(page.read_text())
    if missing:
        raise RuntimeError('Missing local links/resources:\n' + '\n'.join(missing))

if __name__ == '__main__':
    build()
