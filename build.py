"""Stage the stand-alone site and optionally package it for another host."""

import argparse
import hashlib
from html import escape
import json
import os
from pathlib import Path
import re
from shutil import copyfile
from urllib.parse import urlsplit
from zipfile import ZipFile, ZIP_DEFLATED


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
ARCHIVE = 'https://xian.yuxuan.wiki/'


def public_base(value):
    if not value:
        return ''
    url = urlsplit(value)
    if url.scheme not in {'http', 'https'} or not url.hostname or url.username or url.query or url.fragment:
        raise ValueError('PUBLIC_BASE_URL must be an absolute site URL without credentials, query or fragment.')
    return value.rstrip('/') + '/'


def build(output, base):
    roles = json.loads((PUBLIC / 'roles.json').read_text(encoding='utf-8'))
    if len(roles) != 8 or len({r['trait'] for r in roles}) != 8 or len({r['id'] for r in roles}) != 8:
        raise ValueError('The opening set requires eight distinct roles and traits.')
    assets = [(PUBLIC / name, name) for name in ('index.html', 'style.css', 'app.mjs', 'core.mjs')]
    for role in roles:
        if not re.fullmatch(r'\d{4}', role['id']) or not re.fullmatch(role['id'] + r'-[a-z0-9-]+', role['slug']):
            raise ValueError('Every card needs a valid public role identifier and slug.')
        name = f"portraits/{role['id']}.jpg"
        image = PUBLIC / name
        if hashlib.sha256(image.read_bytes()).hexdigest() != role['sha256']:
            raise ValueError(f'Portrait differs from the published original: {name}')
        assets.append((image, name))
    assets += [(ROOT / name, name) for name in ('ASSET-LICENSE.md', 'LICENSE')]
    output.mkdir(parents=True, exist_ok=True)
    for source, name in assets:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        copyfile(source, target)
    catalog = [{k: v for k, v in role.items() if k != 'sha256'} for role in roles]
    variables = {'roles': catalog, 'configuredBase': base, 'archiveBase': ARCHIVE}
    catalog_code = ''.join(f'export const {key} = {json.dumps(value, ensure_ascii=False)};\n'
                           for key, value in variables.items())
    (output / 'catalog.mjs').write_text(catalog_code, encoding='utf-8', newline='\n')

    # Give the entry point and its imports the same cache version per build.
    version_inputs = [catalog_code.encode('utf-8'), *((PUBLIC / name).read_bytes()
                                                      for name in ('app.mjs', 'core.mjs', 'style.css'))]
    version = hashlib.sha256(b'\0'.join(version_inputs)).hexdigest()[:12]
    app = (PUBLIC / 'app.mjs').read_text(encoding='utf-8')
    for name in ('catalog.mjs', 'core.mjs'):
        app = app.replace(f"'./{name}'", f"'./{name}?v={version}'")
    (output / 'app.mjs').write_text(app, encoding='utf-8', newline='\n')
    html = (PUBLIC / 'index.html').read_text(encoding='utf-8')
    for name in ('style.css', 'app.mjs'):
        html = html.replace(f'"./{name}"', f'"./{name}?v={version}"')
    if base:
        metadata = f'<meta property="og:image" content="{escape(base)}portraits/0055.jpg">\n'
        html = html.replace('</head>', metadata + '</head>')
    (output / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    return [name for _, name in assets] + ['catalog.mjs']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    parser.add_argument('--base-url', default=os.environ.get('PUBLIC_BASE_URL', ''))
    parser.add_argument('--zip', type=Path, dest='archive')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or output == PUBLIC or PUBLIC in output.parents:
        parser.error('Choose an output directory outside the site source.')
    names = build(output, public_base(args.base_url))
    if args.archive:
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(args.archive, 'w', compression=ZIP_DEFLATED) as archive:
            for name in names:
                archive.write(output / name, name)
            archive.write(ROOT / 'DEPLOY.md', 'DEPLOY.md')
    print(f'Built 8 character cards and {len(names)} static files in {output}')
