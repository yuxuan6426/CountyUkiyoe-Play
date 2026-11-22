import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { makePrompt, readReply, matchCard, makeShareUrl, readShare } from '../public/core.mjs';

const roles = JSON.parse(readFileSync(new URL('../public/roles.json', import.meta.url)));
const plain = { v: 1, mode: 'human', scope: 'history', traits: ['organize', 'observe'] };
const root = 'https://example.com/try/';

test('reads standalone JSON and complete AI messages', () => {
  const json = JSON.stringify(plain);
  for (const input of [json, `回执\n\nCOUNTY_CARD_V1\n\n\`\`\`json\n${json}\n\`\`\`\n\n回领卡处翻牌`, `回执 ${json}`]) {
    const card = matchCard(readReply(input, roles), roles);
    assert.equal(card.role.id, '0190');
    assert.equal(card.labels.length, 2);
    assert.equal(card.source, '深入取材');
  }
});

test('rejects invalid, ambiguous and out-of-scope data', () => {
  const json = JSON.stringify(plain);
  for (const input of ['得先问一道情境题', `${json}\n${json}`, ...[
    { scope: undefined }, { v: 2 }, { mode: 'toString' }, { traits: ['random'] }, { traits: ['observe','observe'] },
    { personalNote: 'ignored only when outside the block' }, { traits: [] },
  ].map(change => JSON.stringify({ ...plain, ...change }))]) assert.throws(() => readReply(input, roles));
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
});

test('deep Agent prompt requires scope and uses the local return entry', () => {
  const prompt = makePrompt({ mode: 'ai', client: 'agent', history: true, returnUrl: `${root}#import` }, roles);
  assert.match(prompt, /先请用户指定要参考的项目和起止日期/);
  assert.match(prompt, /最多参考 20 条相关记录/);
  assert.match(prompt, /"mode":"ai"/);
  assert.ok(prompt.endsWith(`${root}#import`));
});
