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

from release_checks import check_vendored, finish_release, prepare_output


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
GALLERY_COMMIT = '6c4154d4f5bf903d3ce6e944507a6106e23bc854'
GALLERY_INDEX_SHA256 = '34188f7d3cb8c94c4837c7b7e08453318b57d13dd8562d11e212f1f3e7563881'
WIKI_GALLERY = 'https://xian.yuxuan.wiki/'
WIKI_QUIZ = 'https://quiz.yuxuan.wiki/'
PAGES_ROOT = 'https://yuxuan6426.github.io/'
PAGES_GALLERY = PAGES_ROOT + 'CountyUkiyoe/'
PAGES_QUIZ = PAGES_ROOT + 'CountyUkiyoe-Quiz/'
LOCAL_ASSETS = ('index.html', 'style.css', 'app.mjs', 'core.mjs', 'qrcode.mjs')


def public_base(value):
    if not value:
        return ''
    url = urlsplit(value)
    if url.scheme not in {'http', 'https'} or not url.hostname or url.username or url.query or url.fragment:
        raise ValueError('PUBLIC_BASE_URL must be an absolute site URL without credentials, query or fragment.')
    return value.rstrip('/') + '/'


def load_gallery(source, gallery_base):
    gallery = source / 'gallery'
    index = (gallery / 'index.json').read_bytes()
    if hashlib.sha256(index).hexdigest() != GALLERY_INDEX_SHA256:
        raise ValueError(f'Expected the public gallery index from commit {GALLERY_COMMIT}.')
    cards = json.loads(index)['cards']
    legacy = {role['id']: role for role in json.loads((PUBLIC / 'roles.json').read_text(encoding='utf-8'))}
    cues = json.loads((PUBLIC / 'role-hints.json').read_text(encoding='utf-8'))
    hashes = json.loads((PUBLIC / 'portrait-sha256.json').read_text(encoding='utf-8'))
    portraits = []
    roles = []
    candidates = []
    seen = set()

    for card in cards:
        if card.get('merged_into'):
            continue
        role_id = str(card['id']).zfill(4)
        slug = card['slug']
        if (role_id in seen or not re.fullmatch(r'[0-9]{4}', role_id) or
                not re.fullmatch(role_id + r'-[a-z0-9]+(?:-[a-z0-9]+)*', slug)):
            raise ValueError(f'Invalid or duplicate gallery identifier: {role_id} / {slug}')
        seen.add(role_id)
        folder = gallery / 'characters' / slug
        if not (card['validated'] and card['image_status'] == 'reviewed' and card['summary'] and
                (folder / 'dossier.md').is_file() and (folder / 'dossier.json').is_file()):
            raise ValueError(f'Incomplete public profile: {slug}')

        image = folder / 'portrait.jpg'
        original = legacy.get(role_id, {})
        if original and (original['slug'] != slug or original['name'] != card['name'] or
                         hashes.get(role_id) != original['sha256']):
            raise ValueError(f'Legacy card differs from the published original: {slug}')
        if not image.is_file() or hashlib.sha256(image.read_bytes()).hexdigest() != hashes.get(role_id):
            raise ValueError(f'Portrait differs from the published original: {slug}')
        portraits.append((image, f'portraits/{role_id}.jpg'))

        role = {key: card[key] for key in ('slug', 'name', 'category')}
        role['id'] = role_id
        role['hint'] = original.get('label', cues.get(role_id, ''))
        role['blurb'] = card.get('blurb', '')
        role.update({key: original[key] for key in ('trait', 'label', 'scene') if key in original})
        roles.append(role)
        candidates.append({key: role[key] for key in ('id', 'slug', 'name', 'category', 'hint')} | {
            'summary': card['summary'],
            'dossier_url': gallery_base + f'site/character.html?card={slug}',
            'evidence_url': gallery_base + f'gallery/characters/{slug}/dossier.md',
        })

    if len(roles) != 427 or hashes.keys() != seen or not legacy.keys() <= seen or not cues.keys() <= seen:
        raise ValueError('The play catalog must cover the 427 active profiles and all existing cards.')
    if len(legacy) != 8 or len(cues) != 92 or legacy.keys() & cues.keys() or not all(cues.values()):
        raise ValueError('The prompt must include 100 distinct candidates with behavior cues.')
    return roles, candidates, portraits


def build(output, base, gallery_source):
    check_vendored(ROOT, {'public/qrcode.mjs':
        'ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0'})
    output = prepare_output(ROOT, output)
    pages = urlsplit(base).hostname == urlsplit(PAGES_ROOT).hostname
    gallery_base, quiz_base = (PAGES_GALLERY, PAGES_QUIZ) if pages else (WIKI_GALLERY, WIKI_QUIZ)
    roles, candidates, portraits = load_gallery(gallery_source, gallery_base)
    assets = [(PUBLIC / name, name) for name in LOCAL_ASSETS] + portraits
    assets += [(ROOT / name, name) for name in ('ASSET-LICENSE.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md')]
    output.mkdir(parents=True, exist_ok=True)
    for source, name in assets:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        copyfile(source, target)
    (output / 'matching-catalog.json').write_text(
        '[\n' + ',\n'.join(json.dumps(card, ensure_ascii=False) for card in candidates) + '\n]\n',
        encoding='utf-8', newline='\n')
    guide = (ROOT / 'docs' / 'agent-guide.md').read_text(encoding='utf-8')
    guide = guide.replace('https://card.yuxuan.wiki/', base or 'https://card.yuxuan.wiki/')
    guide = guide.replace(WIKI_GALLERY, gallery_base)
    (output / 'agent-guide.md').write_text(guide, encoding='utf-8', newline='\n')
    variables = {'roles': roles, 'configuredBase': base, 'galleryBase': gallery_base}
    catalog_code = ''.join(f'export const {key} = {json.dumps(value, ensure_ascii=False)};\n'
                           for key, value in variables.items())
    (output / 'catalog.mjs').write_text(catalog_code, encoding='utf-8', newline='\n')

    # Give the entry point and its imports the same cache version per build.
    version_inputs = [catalog_code.encode('utf-8'), *((PUBLIC / name).read_bytes()
                                                      for name in ('app.mjs', 'core.mjs', 'qrcode.mjs', 'style.css'))]
    version = hashlib.sha256(b'\0'.join(version_inputs)).hexdigest()[:12]
    app = (PUBLIC / 'app.mjs').read_text(encoding='utf-8')
    for name in ('catalog.mjs', 'core.mjs', 'qrcode.mjs'):
        app = app.replace(f"'./{name}'", f"'./{name}?v={version}'")
    (output / 'app.mjs').write_text(app, encoding='utf-8', newline='\n')
    html = (PUBLIC / 'index.html').read_text(encoding='utf-8')
    html = html.replace(WIKI_GALLERY, gallery_base).replace(WIKI_QUIZ, quiz_base)
    for name in ('style.css', 'app.mjs'):
        html = html.replace(f'"./{name}"', f'"./{name}?v={version}"')
    if base:
        featured = next(role for role in roles if role['id'] == '0055')
        image_url = gallery_base + f'gallery/characters/{featured["slug"]}/portrait.jpg'
        metadata = f'<meta property="og:image" content="{escape(image_url)}">\n'
        html = html.replace('</head>', metadata + '</head>')
    (output / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    names = [name for _, name in assets] + ['catalog.mjs', 'matching-catalog.json', 'agent-guide.md']
    finish_release(output, names, base or 'https://card.yuxuan.wiki/', wiki=not pages)
    return names + ['release.sha256']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gallery-source', type=Path, default=ROOT / '.gallery-source',
                        help='Root of the pinned public CountyUkiyoe gallery checkout.')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    parser.add_argument('--base-url', default=os.environ.get('PUBLIC_BASE_URL', ''))
    parser.add_argument('--zip', type=Path, dest='archive')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or output == PUBLIC or PUBLIC in output.parents:
        parser.error('Choose an output directory outside the site source.')
    gallery_source = args.gallery_source.resolve()
    if output == gallery_source or output.is_relative_to(gallery_source):
        parser.error('Choose an output directory outside the gallery checkout.')
    names = build(output, public_base(args.base_url), gallery_source)
    if args.archive:
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(args.archive, 'w', compression=ZIP_DEFLATED) as archive:
            for name in names:
                archive.write(output / name, name)
            archive.write(ROOT / 'DEPLOY.md', 'DEPLOY.md')
    card_count = sum(name.startswith('portraits/') for name in names)
    print(f'Built {card_count} character cards and {len(names)} static files in {output}')
