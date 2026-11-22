import { roles, configuredBase, archiveBase } from './catalog.mjs';
import { modes, makePrompt, readReply, matchCard, makeShareUrl, readShare } from './core.mjs';

const byId = id => document.getElementById(id);
const pageBase = configuredBase || new URL('./', location.href).href;
const consent = byId('consent');
const promptText = byId('prompt-text');
const copyButtons = document.querySelectorAll('[data-copy-mode]');
const reply = byId('reply');
const portrait = byId('role-portrait');
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
  const value = makePrompt({ mode, returnUrl }, roles);
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
  clearPreview();
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

function showResult(card, focus = true) {
  currentCard = card;
  clearPreview();
  byId('role-picker').hidden = true;
  portrait.src = `./portraits/${card.role.id}.jpg`;
  portrait.alt = `${card.role.name}的原创虚构人物插画`;
  byId('role-link').href = new URL(`gallery/characters/${card.role.slug}/dossier.md`, archiveBase).href;
  byId('result-label').textContent = `${modes[card.mode]} · ${card.source} · ${card.role.id}`;
  byId('role-name').textContent = card.role.name;
  byId('result-traits').textContent = card.labels.join(' / ');
  byId('result-caption').textContent = card.caption;
  byId('result-status').textContent = '';
  byId('result').hidden = false;
  if (focus) byId('role-name').focus();
  byId('result').scrollIntoView({ block: 'start' });
}

function checkLink() {
  const card = readShare(location.hash, roles);
  if (card) showResult(card, false);
  else if (location.hash === '#import-ai') {
    selectMode('ai');
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
  const card = matchCard({ mode, scope: 'current', traits: ['organize', 'observe'] }, roles);
  showLocalCard({ ...card, source: '示例卡' });
});

for (const role of roles) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = role.name;
  button.addEventListener('click', () => {
    const card = matchCard({ mode, scope: 'manual', traits: [role.trait] }, roles);
    reply.value = '';
    showLocalCard(card);
  });
  byId('role-options').append(button);
}

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
    clearPreview();
    byId('result').hidden = true;
    byId('import-status').textContent = error.message;
    byId('role-picker').hidden = !reply.value.trim();
    reply.focus();
  }
});

byId('copy-role').addEventListener('click', async () => {
  const url = makeShareUrl(pageBase, currentCard.mode, currentCard.role.id);
  try {
    await copyText(url);
    byId('result-status').textContent = '角色链接已复制。朋友可以打开这张卡，继续领取自己的题。';
  } catch {
    const link = Object.assign(document.createElement('input'), { value: url, readOnly: true, ariaLabel: '角色分享链接' });
    byId('result-status').replaceChildren('请复制角色链接。', link);
    link.select();
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

function drawCard(card, image) {
  const canvas = Object.assign(document.createElement('canvas'), { width: 900, height: 1335 });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ece4d4'; ctx.fillRect(0, 0, 900, 1335);
  ctx.strokeStyle = '#28342c'; ctx.lineWidth = 3; ctx.strokeRect(29, 29, 842, 1277);
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
  ctx.fillText(card.role.name, 56, 997);
  ctx.font = `25px ${bodyFont}`;
  ctx.fillText(card.labels.join(' / '), 56, 1045);
  ctx.font = `28px ${bodyFont}`;
  wrapText(ctx, card.caption, 56, 1090, 788, 38);
  ctx.fillStyle = '#526052'; ctx.font = `19px ${bodyFont}`;
  ctx.fillText('原创肖像：县城浮世绘人物图鉴 · yuxuan6426 · CC BY-NC-ND 4.0', 56, 1245);
  ctx.font = `22px ${bodyFont}`;
  ctx.fillText(new URL(pageBase).host + new URL(pageBase).pathname, 56, 1281, 788);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('请重试生成分享图。')), 'image/png'));
}

byId('save-card').addEventListener('click', async event => {
  const button = event.currentTarget;
  const card = currentCard;
  button.disabled = true;
  byId('result-status').textContent = '正在生成分享图…';
  try {
    await portrait.decode();
    if (card !== currentCard) return;
    const blob = await drawCard(card, portrait);
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
    byId('result-status').textContent = '请等肖像加载后，再点生成分享图。';
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
