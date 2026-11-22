import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { makePrompt, readReply, matchCard, makeShareUrl, readShare } from '../public/core.mjs';

const roles = JSON.parse(readFileSync(new URL('../public/roles.json', import.meta.url)));
const plain = { v: 1, mode: 'human', scope: 'history', traits: ['organize', 'observe'] };
const root = 'https://example.com/try/';

test('matches a plain AI reply describing a minimal example and a checklist', () => {
  const reply = readReply('我通常先跑一个最小样例，再把输出整理成清单。', roles, 'ai');
  assert.deepEqual(reply.traits, ['prototype', 'organize']);
  assert.equal(matchCard(reply, roles).role.id, '0206');
  assert.equal(reply.mode, 'ai');
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

test('prompt uses authorized evidence by default and expects a natural reply', () => {
  const prompt = makePrompt({ mode: 'ai', returnUrl: `${root}#import` }, roles);
  assert.match(prompt, /记忆、历史聊天和当前项目的近期任务/);
  assert.match(prompt, /最多参考 20 条相关记录/);
  assert.match(prompt, /观察你这个 AI/);
  assert.match(prompt, /用自然中文一次答完/);
  assert.doesNotMatch(prompt, /JSON|先问|起止日期|情境题/);
  assert.ok(prompt.endsWith(`${root}#import`));
});
