import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { makePrompt, makeExampleReceipt, readReply, matchCard, makeShareText, makeShareUrl, readShare } from '../public/core.mjs';

const roles = JSON.parse(readFileSync(new URL('../public/roles.json', import.meta.url)));
const plain = { v: 1, mode: 'human', scope: 'history', traits: ['organize', 'observe'] };
const root = 'https://example.com/try/';
const makeV2Receipt = mode => ({ ...makeExampleReceipt(mode), v: 2, traits: ['organize', 'observe'] });

test('matches a plain AI reply describing a minimal example and a checklist', () => {
  const reply = readReply('我通常先跑一个最小样例，再把输出整理成清单。', roles, 'ai');
  assert.deepEqual(reply.traits, ['prototype', 'organize']);
  assert.equal(matchCard(reply, roles).role.id, '0206');
  assert.equal(reply.mode, 'ai');
});

test('recognizes punctuation in a literal gallery name', () => {
  const renamed = roles.map(role => role.id === '0190' ? { ...role, name: '县城公文包（试读）' } : role);
  const reply = readReply('最像县城公文包（试读）。', renamed);
  assert.equal(matchCard(reply, renamed).role.id, '0190');
});

test('reads standalone JSON and complete AI messages', () => {
  const json = JSON.stringify(plain);
  for (const input of [json, `回执\n\nCOUNTY_CARD_V1\n\n\`\`\`json\n${json}\n\`\`\`\n\n回领卡处翻牌`, `回执 ${json}`]) {
    const card = matchCard(readReply(input, roles), roles);
    assert.equal(card.role.id, '0190');
    assert.equal(card.labels.length, 2);
    assert.equal(card.source, '深入取材');
  }
});

test('recognizes natural Chinese responses and honors an explicit primary role', () => {
  const card = readReply('结合以往任务，你平时会先列一份清单，然后留意细节。', roles, 'ai');
  assert.deepEqual(card, { mode: 'ai', scope: 'history', traits: ['organize', 'observe'] });
  assert.equal(matchCard(readReply('你有公文包的条理，但最像「县城能人」，动手解决问题。', roles), roles).role.id, '1190');
  assert.equal(matchCard(readReply('角色编号：1053。', roles), roles).role.id, '1053');
  assert.equal(matchCard(readReply('先安排分工，再做一个小样试试。', roles), roles).role.id, '1156');
});

test('normalizes common structured replies without relying on exact field names', () => {
  const wrapped = `这是结果：\`\`\`json\n${JSON.stringify({ data: { subject: 'assistant', 角色: 206, features: [{ name: '先列个清单' }, '先做个小样试试'] } })}\n\`\`\``;
  assert.deepEqual(readReply(wrapped, roles), { mode: 'ai', scope: 'unspecified', traits: ['prototype', 'organize'] });
  assert.deepEqual(readReply(JSON.stringify({ 特征: ['细致观察', '协调分工'] }), roles), { mode: 'human', scope: 'unspecified', traits: ['observe', 'coordinate'] });
  assert.deepEqual(readReply(`${JSON.stringify(plain)}\n${JSON.stringify(plain)}`, roles), readReply(JSON.stringify(plain), roles));
});

test('low-information, conflicting and negated replies do not invent a card', () => {
  const json = JSON.stringify(plain);
  for (const input of [
    '线索有点少，我只能说你挺友好。', '你不像县城公文包，也很少动手解决问题。',
    `${json}\n${JSON.stringify({ ...plain, traits: ['connect'] })}`,
    JSON.stringify({ traits: ['random'] }), JSON.stringify({ internalDetails: '列清单' }),
    makePrompt({ mode: 'human', returnUrl: `${root}#import` }, roles),
  ]) assert.throws(() => readReply(input, roles));
  assert.equal(matchCard(readReply('你不爱列清单，遇到卡点会先观察细节。', roles), roles).role.id, '1144');
});

test('all eight traits resolve in both modes; share URL carries role and mode', () => {
  for (const role of roles) for (const mode of ['human', 'ai']) {
    const card = matchCard(readReply(JSON.stringify({ ...plain, mode, traits: [role.trait] }), roles), roles);
    assert.equal(card.role.id, role.id);
    const url = new URL(makeShareUrl(root, mode, card.role.id));
    assert.equal(url.pathname, '/try/');
    assert.equal(url.search, '');
    const shared = readShare(url.hash, roles);
    assert.equal(shared.role.id, role.id);
    assert.equal(shared.source, '角色分享');
  }
  assert.equal(readShare('#card=v1.human.9999', roles), null);
  assert.equal(matchCard({ mode: 'human', scope: 'manual', traits: ['connect'] }, roles).source, '自主领卡');
});

test('copies complete prompts, embedded role cues and deployment links in both modes', () => {
  for (const mode of ['human', 'ai']) {
    const returnUrl = `${root}#import${mode === 'ai' ? '-ai' : ''}`;
    const catalogUrl = root + 'matching-catalog.json';
    const galleryUrl = 'https://yuxuan6426.github.io/CountyUkiyoe/';
    const prompt = makePrompt({ mode, returnUrl, catalogUrl, galleryUrl }, roles);
    assert.ok(prompt.includes(catalogUrl));
    assert.ok(prompt.includes(galleryUrl + '\n'));
    assert.match(prompt, /记忆、历史聊天和当前项目的近期任务/);
    assert.match(prompt, /最多参考 20 条相关记录/);
    assert.ok(prompt.includes(root + 'agent-guide.md'));
    assert.match(prompt, mode === 'ai' ? /观察你这个 AI/u : /观察我这个用户/u);
    for (const role of roles) assert.ok(prompt.includes(`${role.id} ${role.name} · ${role.label}`));
    assert.ok(prompt.includes(JSON.stringify(makeExampleReceipt(mode), null, 2)));
    assert.ok(prompt.endsWith(returnUrl));
    assert.throws(() => readReply(prompt, roles), /提示词发给 AI/u);
  }
});

test('imports the complete V2 receipt and keeps its report out of role sharing', () => {
  for (const mode of ['human', 'ai']) {
    const receipt = makeV2Receipt(mode);
    const json = JSON.stringify(receipt, null, 2);
    const wrapped = ['这是我观察到的结果。', '```JSON', json, '```', '贴回网页即可翻牌。'].join('\r\n');
    for (const input of [json, wrapped, JSON.stringify({ data: receipt }), `${json}\n${json}`]) {
      const parsed = readReply(input, roles);
      const card = matchCard(parsed, roles);
      assert.equal(card.mode, mode);
      assert.equal(card.role.id, '0190');
      assert.equal(card.source, '本次对话');
      assert.deepEqual(card.labels, ['先把事情列清楚', '先看细节再开口']);
      assert.deepEqual(card.report, receipt.report);
      assert.equal(readShare(new URL(makeShareUrl(root, mode, card.role.id)).hash, roles).report, undefined);
    }
  }
});

test('keeps independently useful fields in a partially formatted V2 report', () => {
  const raw = makeV2Receipt('human');
  const receipt = { ...raw, report: { why: '  <b>普通文本</b>  ', patterns: [{}, '先列清单', '', '再观察'], limits: 8 } };
  assert.deepEqual(readReply(JSON.stringify(receipt), roles).report, {
    why: '<b>普通文本</b>', patterns: ['先列清单', '再观察'], limits: '',
  });
  assert.equal(readReply(JSON.stringify({ ...raw, report: null }), roles).report, undefined);
});

test('uses explicit V2 status and rejects incompatible or conflicting receipts', () => {
  const receipt = makeV2Receipt('human');
  const json = JSON.stringify(receipt);
  const unavailable = {
    ...receipt, status: 'insufficient_evidence', role_id: null, traits: [],
    report: { why: '', patterns: [], limits: '还没有足够的办事例子。' },
  };
  assert.throws(() => readReply(`先列清单不代表一定有结论。\n${JSON.stringify(unavailable)}`, roles), /线索还不足/u);
  assert.throws(() => readReply(JSON.stringify({ v: 1, status: 'insufficient', traits: ['organize'] }), roles), /线索还不足/u);
  for (const invalid of [
    { ...receipt, v: 4 }, { ...receipt, role_id: '1144' }, { ...receipt, mode: 'other' },
    { ...receipt, traits: ['organize', 'made-up'] }, { ...receipt, traits: ['organize', 'organize'] },
    { ...unavailable, traits: ['organize'] },
  ]) assert.throws(() => readReply(`结论：先列清单。\n${JSON.stringify(invalid)}`, roles), /回执的格式或匹配/u);
  assert.throws(() => readReply(`${json.slice(0, -1)},}`, roles), /回执的格式或匹配/u);
  assert.throws(() => readReply(`${json}\n${JSON.stringify(makeV2Receipt('ai'))}`, roles), /回执的格式或匹配/u);
});

test('matches independent Markdown or prose without treating JSON metadata as evidence', () => {
  assert.equal(matchCard(readReply('**主卡**：县城能人\n- 你总会自己上手。', roles), roles).role.id, '1190');
  assert.equal(matchCard(readReply('说明来了：{"internalDetails":"列清单"}\n先做个小样试试。', roles), roles).role.id, '0206');
  assert.throws(() => readReply('说明来了：{"internalDetails":"列清单"}', roles), /点选/u);
  assert.throws(() => readReply('```json\n{"internalDetails":"列清单",}\n```', roles), /点选/u);
});

test('matches new roles by V3 receipt, numbered Markdown, and explicit names', () => {
  const woodworker = { id: '2098', name: '县城木匠爷爷', category: '县城原型', hint: '用手边现成材料做出需要的东西' };
  const county = [...roles, woodworker, { id: '9811', name: '同名角色' }, { id: '9812', name: '同名角色' }];
  for (const mode of ['human', 'ai']) {
    const raw = { ...makeExampleReceipt(mode), role_id: '2098' };
    const card = matchCard(readReply(JSON.stringify(raw), county), county);
    assert.equal(card.role, woodworker);
    assert.deepEqual(card.report, raw.report);
    const expected = makeShareUrl(root, mode, '2098');
    const text = makeShareText(root, card);
    assert.ok(text.includes(woodworker.name) && text.includes(woodworker.hint));
    assert.equal(text.split('\n').at(-1), expected);
    assert.ok(!text.includes(raw.report.why));
    assert.equal(readShare(new URL(expected).hash, county).role, woodworker);
    assert.throws(() => readReply(JSON.stringify({ ...raw, role_id: '9999' }), county), /格式或匹配/u);
    assert.throws(() => readReply(JSON.stringify({ ...raw, status: 'insufficient_evidence', role_id: null }), county), /线索还不足/u);
  }
  for (const text of ['**主卡**：2098', '最像「县城木匠爷爷」。', '县城木匠爷爷', '{"角色编号":2098}']) {
    assert.equal(matchCard(readReply(text, county), county).role, woodworker);
  }
  assert.throws(() => readReply('不像县城木匠爷爷。', county), /点选/u);
  assert.throws(() => readReply('最像「同名角色」。', county), /四位编号/u);
  assert.equal(matchCard(readReply('9812', county), county).role.id, '9812');
  assert.match(makeShareText(root, readShare('#card=v1.ai.2098', county)), /^翻到一张/u);
});
