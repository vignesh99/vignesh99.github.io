"""Build with `python3 tools/build.py`; preview with `python3 -m http.server -d _site`."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import shutil
import hashlib

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
    # Inject registration without duplicating it in every authored page.
    for page in OUT.rglob('*.html'):
        markup = page.read_text()
        if 'http-equiv="refresh"' not in markup:
            markup = markup.replace('</head>', '<script defer src="/site/offline.js"></script></head>')
            page.write_text(markup)
    # GitHub Pages does not serve dotfiles such as .nojekyll.
    files = sorted(p for p in OUT.rglob('*') if p.is_file() and not p.name.startswith('.'))
    digest = hashlib.sha256()
    for path in files:
        digest.update(str(path.relative_to(OUT)).encode())
        digest.update(path.read_bytes())
    template = (ROOT / 'tools/service-worker.js').read_text()
    digest.update(template.encode())
    media = [p for p in files if p.suffix.lower() in ('.mp4', '.png', '.jpg', '.jpeg', '.avif', '.ttf')]
    # KaTeX has legacy font fallbacks; cache modern woff2 up front.
    media += [p for p in files if 'katex/fonts' in str(p) and p.suffix == '.woff']
    optional = set(media)
    core_urls = ['/' + str(p.relative_to(OUT)) for p in files if p not in optional]
    media_urls = ['/' + str(p.relative_to(OUT)) for p in sorted(optional)]
    media_digest = hashlib.sha256()
    for path in sorted(optional):
        media_digest.update(str(path.relative_to(OUT)).encode())
        media_digest.update(path.read_bytes())
    worker = template.replace('__VERSION__', json.dumps(digest.hexdigest()[:16]))
    worker = worker.replace('__MEDIA_VERSION__', json.dumps(media_digest.hexdigest()[:16]))
    worker = worker.replace('__CORE_URLS__', json.dumps(core_urls)).replace('__MEDIA_URLS__', json.dumps(media_urls))
    (OUT / 'sw.js').write_text(worker)
    print('Offline core:', len(core_urls), 'files;', sum(p.stat().st_size for p in files if p not in optional), 'bytes')
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
