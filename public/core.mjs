export const modes = Object.freeze({ human: 'AI 眼里的我', ai: '我的 AI 像谁' });
const scopes = Object.freeze({ current: '本次对话', history: '深入取材', scenario: '情境题', unspecified: '回复匹配', manual: '自主领卡' });
const owns = (table, key) => typeof key === 'string' && Object.hasOwn(table, key);
const equivalents = {
  connect: /(?:找|问|联系|请教)(?:个|几个|一下|身边的|懂行的|靠谱的|合适的)?(?:熟人|朋友|懂行的人|有经验的人|合适的人)|找对人|打听门路|找人打听|问人|托关系|牵线搭桥|找专家|动用人脉|networking/giu,
  organize: /(?:列|整理成).{0,4}清单|理清.{0,6}(?:思路|需求|步骤|流程)|梳理.{0,6}(?:信息|逻辑|流程|现状|步骤|需求|材料)|有条理|分门别类|拆(?:解|分)(?:任务|问题|需求)|把.{0,5}(?:任务|问题|目标).{0,3}拆(?:开|成)|拆成.{0,10}(?:步骤|小步|阶段)|结构化.{0,4}(?:整理|清单|输出|表达)|先做(?:计划|规划|表格)|制订计划|理清楚|checklist|organizer/giu,
  prototype: /(?:先|想|爱)?(?:做|打|跑|试)(?:个|一个|一版)?(?:最小|简单的)?(?:小样|原型|样版|样板|雏形|demo|样例)|小步(?:试错|验证|迭代)|低成本.{0,3}(?:先试|试错|验证)|先试[一下试看水]|小范围(?:测试|试验|验证)|先跑通.{0,3}(?:最小|样例)|prototyp(?:e|ing)/giu,
  boundaries: /(?:划定|明确|限定|厘清|界定|厘清楚|确认|划清|说清)(?:职责|任务|目标|工作|服务|责任)?(?:范围|边界)|控制节奏|定好节奏|先定(?:边界|范围|节奏)|(?:确认|设定|弄清楚).{0,4}(?:范围|边界)|(?:范围|边界).{0,3}问明白|boundaries/giu,
  warmup: /暖场|活跃气氛|热场|接住话头|接过话头|接(?:梗|话)|带动气氛|把气氛带起来|调节气氛|打破尴尬|把话(?:题)?接下去|破冰|icebreak(?:er|ing)/giu,
  observe: /观察.{0,4}(?:细节|线索|现场|局势)|留意.{0,4}(?:细节|线索|情况)|(?:看|重视|注重|注意|核对|查对|核查|发现|关注)(?:清|到|了)?细节|细致观察|先观察|先看证据|先查实|先查(?:数据|现场|依据)|(?:翻|查)(?:记录|日志).{0,6}(?:核对|确认|复核)|仔细观察|观察力|observation/giu,
  coordinate: /(?:拉齐|协调|统筹|安排|对齐)(?:好|了)?(?:分工|时间|协作|多方|各方|进度|团队|资源)|分派任务|给.{0,5}分工|团队分工|组织协调|多人协作|统筹安排|分工.{0,3}(?:时间|进度)|安排.{0,3}人手|coordination/giu,
  craft: /(?:自己|亲自|直接|先|马上)?动手.{0,4}(?:修|解决|处理|做|实干)|亲力亲为|亲自.{0,4}(?:上手|操作|修理|落实)|自己上手|先上手|立刻开干|直接开干|动手能力|动手派|亲自修|实干派|动手实干|hands[- ]on/giu,
};
const nickname = { prototype: '冷面摊主', warmup: '气氛组', coordinate: '红白事主理人' };
const signalFields = ['traits', 'features', 'signals', 'tags', 'behaviors', '特征', '行为特征', '办事习惯', '标签'];
const roleFields = ['role', 'role_id', 'roleId', 'roleName', 'character', 'card', 'card_id', 'persona', '角色', '角色编号', '原型', '主卡', '卡号'];
const wrappers = ['result', 'data', 'profile', 'card', '回执', '结果'];
const itemFields = ['trait', 'feature', 'label', 'name', 'value', 'id', '名称', '特征'];
const modeWords = { human: 'human', user: 'human', me: 'human', 用户: 'human', 我: 'human', ai: 'ai', agent: 'ai', assistant: 'ai', 助手: 'ai', 我的ai: 'ai' };
const negation = /并非|不是|不像|不(?:太|怎么|会|用|总是|喜欢|擅长|习惯|先|爱|偏向|偏|倾向|需要)|没有|未必|很少|较少|避免|缺乏/u;
const normalize = text => text.normalize('NFKC').replace(/[*`~_]/g, '').trim();
const unmatched = '可以直接点选一张角色卡，或粘贴 AI 提到办事习惯的那段回复。';

const receiptSchema = 'county-card';
const agentGuide = 'https://github.com/yuxuan6426/CountyUkiyoe-Play/blob/main/docs/agent-guide.md';
const insufficient = '线索还不足以翻牌。可以贴回一段明确的办事习惯，或从下方选一张卡。';
const invalidReceipt = '这条回执的格式或匹配信息有出入。请复制 AI 的完整回复重试，也可以从下方选一张卡。';

const exampleReceipt = Object.freeze({
  schema: receiptSchema,
  v: 2,
  mode: 'human',
  scope: 'current',
  status: 'matched',
  role_id: '0190',
  traits: ['organize', 'observe'],
  report: {
    why: '这次对话里，玩家先把零散的要求排成清单，再逐项核对容易漏掉的细节。整理顺序是最先做也最清楚的一步。',
    patterns: ['面对零散需求，先拆成能逐项确认的小任务。', '动手前会留意容易遗漏的条件。'],
    limits: '这次只参考了当轮对话，其他场合的做法还有待观察。',
  },
});

export function makeExampleReceipt(mode) {
  return mode === 'ai' ? {
    ...exampleReceipt,
    mode,
    report: {
      ...exampleReceipt.report,
      why: '这次对话里，AI 先把需求拆成步骤，再核对容易漏掉的条件。它先整理再推进的做法最像县城公文包。',
    },
  } : exampleReceipt;
}

export function makePrompt({ mode, returnUrl }, roles) {
  const subject = mode === 'ai'
    ? '观察你这个 AI 已经展示出的办事习惯，区分你的行为与用户的偏好。'
    : '观察我这个用户已经展示出的办事习惯，区分我的行为与你给出的建议。';
  const choices = roles.map(({ id, name, trait, label }) => `- ${id} ${name} · ${trait} · ${label}`).join('\n');
  return [
    '陪我玩「县城浮世绘 · 领卡处」。我已在领卡页勾选隐私授权。请在这一条回复里完成观察、匹配并给出可贴回网页的 JSON 回执。',
    '【观察对象】\n' + subject,
    '【可以取材的范围】\n先看当前对话，再参考你已经有权限只读的记忆、历史聊天和当前项目的近期任务。任务优先看近 30 天，合计最多参考 20 条相关记录。无法读取的材料跳过，按眼前确实看到的内容继续。只根据已发生的选择和做法判断，区分实际行为、随口假设和双方各自提出的建议。',
    `【八张候选卡】\n${choices}\n\n需要角色说明或原档案时，可按需打开 GitHub 指南：${agentGuide}\n打开失败时，直接用上面的候选表。公开角色档案只帮助理解候选卡，匹配理由以本轮能够核实的匿名行为为依据。`,
    '【怎么选】\n先找最明确的行为，再从表里选 1 到 3 个不重复的特征代码，按贴合程度排序。role_id 用第一个特征对应的四位字符串。请在理由里说清这个人在什么情境下先做了什么、为什么这一步最像主卡。有几条扎实线索就写几条。报告限于概括后的行为，省去姓名、项目名、原始对话、文件路径和其他可识别信息。',
    `【回执字段】\nschema 固定为 "county-card"，v 固定为数字 2，mode 固定为 "${mode}"。scope 用 "current" 表示只参考当前对话，用 "history" 表示实际参考了记忆、历史聊天或项目任务，用 "unspecified" 表示范围无法确定。能判断时 status 填 "matched"，role_id 与 traits 填实际结果，report.why 写匹配理由，report.patterns 写 1 到 3 条带情境的典型行为，report.limits 写本次判断的边界。\n线索不足时 status 填 "insufficient_evidence"，role_id 填 null、traits 和 report.patterns 填 []、report.why 填空字符串，在 report.limits 说清目前缺少什么观察。`,
    '【输出示例】\n以下内容只演示字段和写法。请根据你实际观察到的行为重新填写，最后只输出一个合法的 JSON 对象，可放在一个 json 代码围栏里。\n\n' + JSON.stringify(makeExampleReceipt(mode), null, 2),
    '【贴回领卡处】\n用户会复制这条回复到以下地址翻牌：',
    returnUrl,
  ].join('\n\n');
}

function isNegated(text, start) {
  const prefix = text.slice(Math.max(0, start - 24), start).split(/[，,、。；;！!？?\n]|\bbut\b|但是|而是|不过|但/u).at(-1);
  return /不\s*$/u.test(prefix) || (prefix.length <= 17 && negation.test(prefix));
}

function findSignals(value, roles, allowRoleId = false) {
  if (typeof value !== 'string' && typeof value !== 'number') return [];
  const text = normalize(String(value)).replace(/https?:\/\/[^\s，。]+/g, '');
  const hits = [];
  for (const role of roles) {
    const aliases = [role.name, role.name.replace(/^县城/, ''), nickname[role.trait]].filter(Boolean);
    const add = (pattern, rank) => {
      for (const match of text.matchAll(pattern)) {
        if (isNegated(text, match.index)) continue;
        const introduction = text.slice(Math.max(0, match.index - 12), match.index);
        const primary = rank === 2 && /(?:最像|更像|主卡|主角色|最贴近|匹配结果|推荐角色)(?:是|[:：\s「“]){0,4}$/u.test(introduction);
        hits.push({ trait: role.trait, rank: primary ? 3 : rank, index: match.index });
      }
    };
    add(new RegExp([...new Set(aliases)].join('|'), 'gu'), 2);
    if (role.trait === 'craft' && text.trim() === '能人') hits.push({ trait: role.trait, rank: 2, index: 0 });
    if ((allowRoleId || text === role.id) && /^\d+$/u.test(text) && text.padStart(4, '0') === role.id) {
      hits.push({ trait: role.trait, rank: 2, index: 0 });
    }
    add(new RegExp(`(?:编号|卡号|原型|角色|主卡|no\\.?|id|#)[ ]*[:：#]?[ ]*${role.id}(?!\\d)`, 'giu'), 2);
    add(new RegExp(`\\b${role.trait}\\b`, 'giu'), 1);
    add(new RegExp(role.label.replace(/^先/u, ''), 'gu'), 1);
    if (equivalents[role.trait]) add(equivalents[role.trait], 1);
  }
  return hits.sort((a, b) => b.rank - a.rank || a.index - b.index);
}

function signals(value, roles, allowRoleId) {
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap(item => {
    if (item && typeof item === 'object') {
      return itemFields.flatMap(key => findSignals(item[key], roles, allowRoleId));
    }
    return findSignals(item, roles, allowRoleId);
  }).map(hit => hit.trait);
}

function scanJson(text) {
  const values = [];
  const prose = [];
  let malformedReceipt = false;
  // Treat each fenced section separately so an incomplete block cannot consume the following prose.
  for (const section of text.split(/^[ \t]*(?:```|~~~)(?:jsonc?)?[ \t]*\r?$/imu)) {
    let start = -1;
    let cursor = 0;
    let quote = false;
    let escaped = false;
    const closers = [];
    const finish = (end, closed) => {
      const raw = section.slice(start, end);
      let value;
      if (closed) {
        try { value = JSON.parse(raw); } catch { /* Fall through to text outside the data. */ }
      }
      if (value !== undefined) values.push(value);
      else if (/["']schema["']\s*:\s*["']county-card["']/u.test(raw)) malformedReceipt = true;
      if (value !== undefined || /^(?:\{|\[)\s*(?:"|'|\{|\[)/u.test(raw)) {
        prose.push(section.slice(cursor, start));
        cursor = end;
      }
      start = -1;
      closers.length = 0;
    };
    for (let index = 0; index < section.length; index++) {
      const char = section[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quote = false;
      } else if (char === '"' && start >= 0) quote = true;
      else if (char === '{' || char === '[') {
        if (start < 0) start = index;
        closers.push(char === '{' ? '}' : ']');
      } else if ((char === '}' || char === ']') && start >= 0) {
        if (closers.pop() !== char) finish(index + 1, false);
        else if (!closers.length) finish(index + 1, true);
      }
    }
    if (start >= 0) finish(section.length, false);
    prose.push(section.slice(cursor));
  }
  return { values, prose: prose.join('\n').trim(), malformedReceipt };
}

function formalReceipts(value, depth = 0) {
  if (depth > 3 || !value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(item => formalReceipts(item, depth + 1));
  if (value.schema === receiptSchema || (value.v === 2 && Object.hasOwn(value, 'status'))) return [value];
  return wrappers.flatMap(key => formalReceipts(value[key], depth + 1));
}

function readFormal(value, roles) {
  const { schema, v, mode, scope, status, role_id: id, traits, report } = value;
  if (schema !== receiptSchema || v !== 2 || !owns(modes, mode) || !['current', 'history', 'unspecified'].includes(scope)) {
    throw new Error(invalidReceipt);
  }
  if (status === 'insufficient_evidence') {
    if (id !== null || !Array.isArray(traits) || traits.length) throw new Error(invalidReceipt);
    return { mode, scope, status };
  }
  const role = roles.find(item => item.id === id);
  if (status !== 'matched' || !role || !Array.isArray(traits) ||
      !traits.length || traits.length > 3 || traits[0] !== role.trait ||
      new Set(traits).size !== traits.length || traits.some(trait => !roles.some(item => item.trait === trait))) {
    throw new Error(invalidReceipt);
  }
  const text = (input, limit) => typeof input === 'string' ? input.trim().slice(0, limit) : '';
  const why = text(report?.why, 600);
  const limits = text(report?.limits, 400);
  const patterns = Array.isArray(report?.patterns)
    ? report.patterns.map(item => text(item, 300)).filter(Boolean).slice(0, 3)
    : [];
  const card = { mode, scope, traits };
  if (why || patterns.length || limits) card.report = { why, patterns, limits };
  return card;
}

function distinct(traits) {
  return [...new Set(traits)].slice(0, 3);
}

function fromObject(value, roles, fallbackMode, depth = 0) {
  if (Array.isArray(value)) {
    const traits = distinct(signals(value, roles));
    return traits.length ? { mode: fallbackMode, scope: 'unspecified', traits } : null;
  }
  if (!value || typeof value !== 'object' || depth > 3) return null;
  if (value.status === 'insufficient_evidence' || value.status === 'insufficient') throw new Error(insufficient);
  const modeKey = String(value.mode ?? value.subject ?? value.对象 ?? '').toLowerCase();
  const mode = owns(modeWords, modeKey) ? modeWords[modeKey] : fallbackMode;
  const scope = owns(scopes, value.scope) ? value.scope : 'unspecified';
  const primary = roleFields.flatMap(key => signals(value[key], roles, true));
  const details = signalFields.flatMap(key => signals(value[key], roles));
  const answer = ['answer', 'output', '回复', '回答'].flatMap(key => signals(value[key], roles));
  const traits = distinct([...primary, ...details, ...answer]);
  if (traits.length) return { mode, scope, traits };
  for (const key of wrappers) {
    const nested = fromObject(value[key], roles, mode, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export function readReply(input, roles, fallbackMode = 'human') {
  const text = input.trim();
  if (!text || text.length > 65_536) throw new Error('请粘贴一条 AI 回复，或用示例试一次。');
  const mode = owns(modes, fallbackMode) ? fallbackMode : 'human';
  if (/陪我玩「县城浮世绘 · 领卡处」/u.test(text)) throw new Error('把这段提示词发给 AI，然后复制 AI 的回复回来翻牌。');

  const { values, prose, malformedReceipt } = scanJson(text);
  if (malformedReceipt) throw new Error(invalidReceipt);
  const formal = values.flatMap(value => formalReceipts(value));
  if (formal.length) {
    const unique = new Map(formal.map(value => {
      const card = readFormal(value, roles);
      return [JSON.stringify(card), card];
    }));
    if (unique.size !== 1) throw new Error(invalidReceipt);
    const card = unique.values().next().value;
    if (card.status === 'insufficient_evidence') throw new Error(insufficient);
    return card;
  }
  const structured = values.map(value => fromObject(value, roles, mode)).filter(Boolean);
  const unique = new Map(structured.map(card => [JSON.stringify(card), card]));
  if (unique.size === 1) return unique.values().next().value;
  if (unique.size > 1) throw new Error(unmatched);

  const hits = findSignals(prose, roles);
  const traits = distinct(hits.map(hit => hit.trait));
  if (!traits.length || new Set(hits.map(hit => hit.trait)).size === roles.length) throw new Error(unmatched);
  const history = /(?:根据|结合|参考|综合|回顾|从).{0,20}(?:以往|过去|历史|近期任务|以往的任务|记忆|以前|之前的聊天)/u.test(prose);
  return { mode, scope: history ? 'history' : 'unspecified', traits };
}

export function matchCard({ mode, scope, traits, report }, roles) {
  const matches = traits.map(trait => roles.find(role => role.trait === trait));
  const [role, ...related] = matches;
  const extra = related.length ? ` 办事过程中，你也常会${related.map(({ label }) => label.slice(1)).join('、')}。` : '';
  const scene = mode === 'ai' ? role.scene.replaceAll('你', '它') : role.scene;
  const card = { mode, role, labels: matches.map(item => item.label), caption: scene + (mode === 'ai' ? extra.replace('你', '它') : extra), source: scopes[scope] };
  if (report) card.report = report;
  return card;
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
