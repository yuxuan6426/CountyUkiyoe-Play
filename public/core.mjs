export const modes = Object.freeze({ human: 'AI 眼里的我', ai: '我的 AI 像谁' });
const scopes = Object.freeze({ current: '本次对话', history: '深入取材', scenario: '情境题' });
const owns = (table, key) => typeof key === 'string' && Object.hasOwn(table, key);
const fields = ['mode', 'scope', 'traits', 'v'];

export function makePrompt({ mode, client, history, returnUrl }, roles) {
  const subject = mode === 'ai'
    ? '分析你（这个 AI）确实展示出的办事习惯。区分你的做法与用户的偏好。'
    : '分析用户确实展示出的办事习惯。区分用户的做法与助手给出的建议。';
  const materials = !history ? '以本次对话中可见的行为为依据。'
    : client === 'agent'
      ? '先请用户指定要参考的项目和起止日期，建议近 30 天。等用户明确范围后，只用已获授权且能访问的该项目会话、记忆和任务记录，最多参考 20 条相关记录，保持只读。范围或访问条件不足时沿用当前对话。'
      : '以当前对话为基础，补充当前平台已经开放给你的相关记忆和历史。有可用的历史检索时，请先由用户指定项目和日期，最多参考 20 条相关记录。';
  return [
    '陪我玩「县城浮世绘 · 领卡处」。这是一场把办事习惯对应到故事原型的小游戏。',
    subject, materials,
    mode === 'ai'
      ? '如果样本不足，请先问用户：朋友想盘一家店请你帮忙，你希望我这个 AI 先做哪一步？可以给几个具体选项。按这个情境中你会执行的动作生成回执，并用 scenario 标记。'
      : '如果样本不足，请先问一道题：朋友想盘一家店请你帮忙，眼下你会先做哪一步？可以给几个具体的办事选项。拿到回答再生成回执，并用 scenario 标记。',
    '按贴合度从前到后选 1 到 3 个不重复的行为特征，仅使用以下标识：',
    roles.map(({ trait, label }) => `${trait} = ${label}`).join('\n'),
    '把所有原始资料留在这次分析里。回执只含版本、模式、取材类别和特征，使用下面的标记和 JSON，不附姓名、聊天原句、路径或其他材料。当前对话用 current，参考了历史用 history。',
    'COUNTY_CARD_V1',
    JSON.stringify({ v: 1, mode, scope: 'current', traits: [roles[0].trait] }),
    '示例中的特征只是格式示意，请根据这次观察替换。生成回执后另起一行告诉我：复制这条回复，回领卡处翻牌。',
    returnUrl,
  ].join('\n\n');
}

export function readReply(input, roles) {
  const text = input.trim();
  if (!text || text.length > 65_536) throw new Error('请粘贴一条 AI 回复，或用示例试一次。');
  let objects;
  try { objects = [JSON.parse(text)]; } catch {
    const markers = text.split(/^\s*COUNTY_CARD_V1\s*$/m);
    const body = markers.length > 1 ? markers.at(-1) : text;
    objects = Array.from(body.matchAll(/\{[^{}]*\}/g), ([part]) => {
      try { return JSON.parse(part); } catch { return null; }
    });
  }
  const results = objects.filter(value => value && typeof value === 'object' && (Object.hasOwn(value, 'traits') || Object.hasOwn(value, 'mode')));
  if (results.length !== 1) throw new Error('请带回一份完整回执。可以把 AI 的最新一条回复整段粘贴过来。');
  const result = results[0];
  const { v, mode, scope, traits } = result;
  if (v !== 1 || !owns(modes, mode) || !owns(scopes, scope) || Object.keys(result).sort().join() !== fields.join()) {
    throw new Error('请把本站的提示词再发一次，让 AI 按当前格式生成回执。');
  }
  const available = new Set(roles.map(role => role.trait));
  if (!Array.isArray(traits) || traits.length < 1 || traits.length > 3 || traits.some(trait => !available.has(trait)) || new Set(traits).size !== traits.length) {
    throw new Error('请让 AI 从题目列出的范围里选 1 到 3 个不同的行为特征，再粘贴回来。');
  }
  return { mode, scope, traits };
}

export function matchCard({ mode, scope, traits }, roles) {
  const matches = traits.map(trait => roles.find(role => role.trait === trait));
  const [role, ...related] = matches;
  const extra = related.length ? ` 办事过程中，你也常会${related.map(({ label }) => label.slice(1)).join('、')}。` : '';
  const scene = mode === 'ai' ? role.scene.replaceAll('你', '它') : role.scene;
  return { mode, role, labels: matches.map(item => item.label), caption: scene + (mode === 'ai' ? extra.replace('你', '它') : extra), source: scopes[scope] };
}

export function makeShareUrl(base, mode, id) {
  const url = new URL(base);
  url.hash = `card=v1.${mode}.${id}`;
  return url.href;
}

export function readShare(hash, roles) {
  const match = /^#card=v1\.(human|ai)\.(\d{4})$/.exec(hash);
  if (!match) return null;
  const [, mode, id] = match;
  const role = roles.find(item => item.id === id);
  if (!role) return null;
  return { mode, role, labels: [role.label], caption: mode === 'ai' ? role.scene.replaceAll('你', '它') : role.scene, source: '角色分享' };
}
