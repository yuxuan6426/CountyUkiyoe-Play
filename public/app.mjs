import { roles, configuredBase, galleryBase } from './catalog.mjs';
import { modes, makeExampleReceipt, makePrompt, readReply, matchCard, makeShareText, makeShareUrl, readShare } from './core.mjs';
import qrcode from './qrcode.mjs';

const byId = id => document.getElementById(id);
const pageBase = configuredBase || new URL('./', location.href).href;
const consent = byId('consent');
const promptText = byId('prompt-text');
const copyButtons = document.querySelectorAll('[data-copy-mode]');
const reply = byId('reply');
const portrait = byId('role-portrait');
const heroPortrait = byId('hero-portrait');
const useHeroBackup = () => { heroPortrait.src = './portraits/0055.jpg'; };
if (heroPortrait.complete && !heroPortrait.naturalWidth) useHeroBackup();
else heroPortrait.addEventListener('error', useHeroBackup, { once: true });
const shareText = byId('share-text');
const picker = byId('role-picker');
const roleSearch = byId('role-search');
const roleOptions = byId('role-options');
const roleMore = byId('role-more');
const pickerPageSize = 16;
let visibleRoles = pickerPageSize;
let mode = 'human';
let currentCard;
let previewUrl;
let previewFile;

function selectMode(value) {
  mode = value;
  byId('import-mode').hidden = value !== 'ai';
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

function updateConsent() {
  for (const button of copyButtons) button.setAttribute('aria-disabled', String(!consent.checked));
  byId('copy-status').textContent = '';
  if (consent.checked) return;
  promptText.hidden = true;
  promptText.value = '';
}

consent.addEventListener('change', updateConsent);
updateConsent();

for (const button of copyButtons) button.addEventListener('click', async () => {
  if (!consent.checked) {
    byId('copy-status').textContent = '勾选同意后即可复制。';
    consent.focus();
    return;
  }
  selectMode(button.dataset.copyMode);
  const returnUrl = new URL(mode === 'ai' ? '#import-ai' : '#import', pageBase).href;
  const catalogUrl = new URL('matching-catalog.json', pageBase).href;
  const value = makePrompt({ mode, returnUrl, catalogUrl, galleryUrl: galleryBase }, roles);
  try {
    await copyText(value);
    if (!consent.checked) return;
    promptText.hidden = true;
    promptText.value = '';
    byId('copy-status').textContent = '已复制。发给你的 AI，再把回复贴回来。';
  } catch {
    if (!consent.checked) return;
    promptText.hidden = false;
    promptText.value = value;
    promptText.focus();
    promptText.select();
    byId('copy-status').textContent = '提示词已选中，可以直接复制。';
  }
});

function gotoPrompt() {
  if (location.hash.startsWith('#card=') || location.hash === '#import-ai') history.replaceState(null, '', new URL('./', location.href));
  selectMode('human');
  currentCard = undefined;
  showReport();
  clearPreview();
  shareText.hidden = true;
  byId('result').hidden = true;
  byId('prompt-title').focus();
  byId('prompt-section').scrollIntoView({ block: 'start' });
}

byId('start-again').addEventListener('click', gotoPrompt);

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  previewFile = undefined;
  byId('preview-image').removeAttribute('src');
  byId('download').removeAttribute('href');
  byId('share-preview').hidden = true;
  byId('share-native').hidden = true;
}

function showReport(report) {
  const container = byId('result-report');
  const why = report?.why ?? '';
  const patterns = report?.patterns ?? [];
  const limits = report?.limits ?? '';
  container.hidden = !why && !patterns.length && !limits;
  byId('report-why').hidden = !why;
  byId('report-why-text').textContent = why;
  byId('report-patterns').hidden = !patterns.length;
  byId('report-patterns-list').replaceChildren(...patterns.map(pattern => {
    const item = document.createElement('li');
    item.textContent = pattern;
    return item;
  }));
  byId('report-limits').hidden = !limits;
  byId('report-limits-text').textContent = limits;
}

function showResult(card, focus = true) {
  currentCard = card;
  shareText.hidden = true;
  clearPreview();
  byId('role-picker').hidden = true;
  portrait.dataset.backup = new URL(`./portraits/${card.role.id}.jpg`, location.href).href;
  portrait.src = new URL(`gallery/characters/${card.role.slug}/portrait.jpg`, galleryBase).href;
  portrait.alt = `${card.role.name}的原创虚构人物插画`;
  const cardUrl = new URL('site/character.html', galleryBase);
  cardUrl.searchParams.set('card', card.role.slug);
  byId('role-link').href = cardUrl.href;
  byId('role-portrait-link').href = cardUrl.href;
  byId('result-label').textContent = `${modes[card.mode]} · ${card.source} · ${card.role.id}`;
  byId('role-name').textContent = card.role.name;
  byId('result-traits').textContent = card.labels.join(' / ');
  byId('result-caption').textContent = card.caption;
  showReport(card.report);
  byId('result-status').textContent = '';
  byId('result').hidden = false;
  if (focus) byId('role-name').focus();
  byId('result').scrollIntoView({ block: 'start' });
}

portrait.addEventListener('error', () => {
  if (portrait.dataset.backup && portrait.src !== portrait.dataset.backup) portrait.src = portrait.dataset.backup;
});

async function portraitForPoster() {
  if (new URL(portrait.src).origin === location.origin) {
    await portrait.decode();
    return portrait;
  }
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = portrait.src;
  try {
    await image.decode();
  } catch {
    image.src = portrait.dataset.backup;
    await image.decode();
  }
  return image;
}

function checkLink() {
  const card = readShare(location.hash, roles);
  if (card) showResult(card, false);
  else if (location.hash === '#import' || location.hash === '#import-ai') {
    selectMode(location.hash === '#import-ai' ? 'ai' : 'human');
    byId('import').scrollIntoView({ block: 'start' });
  }
  else if (location.hash.startsWith('#card=')) {
    byId('import-status').textContent = '请从领题开始，或用这页的示例领一张卡。';
    gotoPrompt();
  }
}
window.addEventListener('hashchange', checkLink);
checkLink();

function showLocalCard(card) {
  if (location.hash.startsWith('#card=')) history.replaceState(null, '', new URL('./', location.href));
  byId('import-status').textContent = '';
  showResult(card);
}

byId('example').addEventListener('click', () => {
  const input = JSON.stringify(makeExampleReceipt(mode));
  const card = matchCard(readReply(input, roles, mode), roles);
  showLocalCard({ ...card, source: '示例卡' });
});

function renderRoleOptions() {
  const query = roleSearch.value.normalize('NFKC').trim();
  const matches = roles.filter(role => role.id.includes(query) || role.name.normalize('NFKC').includes(query));
  roleOptions.replaceChildren(...matches.slice(0, visibleRoles).map(role => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${role.id} · ${role.name}`;
    button.addEventListener('click', () => {
      const card = matchCard({ mode, scope: 'manual', roleId: role.id }, roles);
      reply.value = '';
      showLocalCard(card);
    });
    return button;
  }));
  byId('role-search-status').textContent = matches.length ? '' : '没有找到角色，请换一个名称或编号。';
  roleMore.hidden = matches.length <= visibleRoles;
}

function openPicker() {
  roleSearch.value = '';
  visibleRoles = pickerPageSize;
  renderRoleOptions();
  picker.hidden = false;
}

byId('choose-role').addEventListener('click', () => {
  openPicker();
  roleSearch.focus();
});
roleSearch.addEventListener('input', () => {
  visibleRoles = pickerPageSize;
  renderRoleOptions();
});
roleMore.addEventListener('click', () => {
  const firstNew = visibleRoles;
  visibleRoles += pickerPageSize;
  renderRoleOptions();
  roleOptions.children[firstNew]?.focus();
});

reply.addEventListener('input', () => {
  byId('import-status').textContent = '';
  byId('role-picker').hidden = true;
});

byId('import-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const card = matchCard(readReply(reply.value, roles, mode), roles);
    reply.value = '';
    showLocalCard(card);
  } catch (error) {
    currentCard = undefined;
    showReport();
    clearPreview();
    byId('result').hidden = true;
    byId('import-status').textContent = error.message;
    if (reply.value.trim()) openPicker();
    reply.focus();
  }
});

byId('copy-role').addEventListener('click', async () => {
  const card = currentCard;
  const text = makeShareText(pageBase, card);
  try {
    await copyText(text);
    if (card !== currentCard) return;
    shareText.hidden = true;
    byId('result-status').textContent = '分享文案已复制。';
  } catch {
    if (card !== currentCard) return;
    shareText.value = text;
    shareText.hidden = false;
    shareText.focus();
    shareText.select();
    byId('result-status').textContent = '分享文案已选中，可以直接复制。';
  }
});

const cardFont = '"Noto Serif SC", "Songti SC", SimSun, serif';
const bodyFont = 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';

function wrapText(ctx, text, x, y, width, lineHeight) {
  let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > width) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = '';
    }
    line += char;
  }
  if (line) ctx.fillText(line, x, y);
}

function drawQr(ctx, url, left, top, size) {
  const code = qrcode(0, 'M');
  code.addData(url);
  code.make();
  const count = code.getModuleCount();
  const moduleSize = Math.floor(size / (2 * (count + 8))) * 2;
  const inset = Math.floor((size - count * moduleSize) / 4) * 2;
  ctx.fillStyle = '#fff';
  ctx.fillRect(left, top, size, size);
  ctx.fillStyle = '#000';
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      if (code.isDark(row, column)) {
        ctx.fillRect(left + inset + column * moduleSize, top + inset + row * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}

function drawCard(card, image) {
  const canvas = Object.assign(document.createElement('canvas'), { width: 900, height: 1520 });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ece4d4'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#28342c'; ctx.lineWidth = 3; ctx.strokeRect(29, 29, 842, canvas.height - 58);
  ctx.fillStyle = '#9e3b2c'; ctx.font = `bold 26px ${bodyFont}`;
  ctx.fillText('县城浮世绘 · 领卡处', 56, 80);
  ctx.textAlign = 'right'; ctx.fillText(card.role.id, 844, 80); ctx.textAlign = 'left';
  const scale = Math.min(790 / image.naturalWidth, 775 / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, (900 - w) / 2, 105 + (775 - h) / 2, w, h);
  ctx.fillStyle = '#526052'; ctx.font = `25px ${bodyFont}`;
  ctx.fillText(modes[card.mode], 56, 928);
  ctx.fillStyle = '#28342c'; ctx.font = `bold 56px ${cardFont}`;
  ctx.fillText(card.role.name, 56, 997, 788);
  ctx.font = `25px ${bodyFont}`;
  ctx.fillText(card.labels.join(' / '), 56, 1045, 788);
  ctx.font = `28px ${bodyFont}`;
  wrapText(ctx, card.caption, 56, 1090, 788, 38);
  ctx.strokeStyle = '#b1af98';
  ctx.beginPath();
  ctx.moveTo(56, 1197);
  ctx.lineTo(844, 1197);
  ctx.stroke();
  drawQr(ctx, makeShareUrl(pageBase, card.mode, card.role.id), 588, 1218, 256);
  ctx.fillStyle = '#28342c'; ctx.font = `bold 30px ${bodyFont}`;
  ctx.fillText('扫码看这张卡，也测测你自己', 56, 1292, 508);
  ctx.fillStyle = '#526052'; ctx.font = `22px ${bodyFont}`;
  const { host, pathname } = new URL(pageBase);
  ctx.fillText(host + pathname, 56, 1332, 508);
  ctx.font = `19px ${bodyFont}`;
  ctx.fillText('原创肖像：县城浮世绘人物图鉴 · yuxuan6426', 56, 1398, 508);
  ctx.fillText('CC BY-NC-ND 4.0', 56, 1426);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('请重试生成分享图。')), 'image/png'));
}

byId('save-card').addEventListener('click', async event => {
  const button = event.currentTarget;
  const card = currentCard;
  button.disabled = true;
  byId('result-status').textContent = '正在生成分享图…';
  try {
    const image = await portraitForPoster();
    if (card !== currentCard) return;
    const blob = await drawCard(card, image);
    if (card !== currentCard) return;
    clearPreview();
    previewUrl = URL.createObjectURL(blob);
    previewFile = new File([blob], `县城浮世绘-${card.role.id}.png`, { type: 'image/png' });
    byId('preview-image').src = previewUrl;
    byId('download').href = previewUrl;
    byId('download').download = previewFile.name;
    byId('share-native').hidden = !navigator.canShare?.({ files: [previewFile] });
    byId('share-preview').hidden = false;
    byId('result-status').textContent = '图卡已生成，可以预览和保存。';
    byId('share-preview').scrollIntoView({ block: 'nearest' });
  } catch {
    if (card === currentCard) byId('result-status').textContent = '分享图还没生成，请在肖像加载后重试。';
  } finally {
    button.disabled = false;
  }
});

byId('share-native').addEventListener('click', async () => {
  try {
    await navigator.share({ files: [previewFile], title: '县城浮世绘 · 领卡处' });
  } catch (error) {
    if (error.name !== 'AbortError') byId('result-status').textContent = '请选择下载 PNG，或者长按图片保存。';
  }
});
