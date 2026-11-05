// lib/customBlocks.ts — Cut C #21: AI custom block (Vibe Block).
// Template-built interactive blocks (quiz, calculator, countdown,
// timeline) generated from a prompt — no external calls, no eval of user
// input. Prompt words are extracted (letters/numbers only) and HTML-
// escaped into text nodes; the block's own JS never interpolates user
// input into code. All wording and markup here is original.

import type { Theme } from "./types";

export type CustomBlockKind = 'quiz' | 'calculator' | 'countdown' | 'timeline';

export interface CustomBlock {
  html: string;
  css: string;
  js: string;
}

export const CUSTOM_BLOCK_KINDS: readonly CustomBlockKind[] = [
  'quiz',
  'calculator',
  'countdown',
  'timeline',
];

export const CUSTOM_BLOCK_LABELS: Record<CustomBlockKind, string> = {
  quiz: 'Quiz',
  calculator: 'Calculator',
  countdown: 'Countdown',
  timeline: 'Timeline',
};

/** Keyword detection: which block the prompt is asking for. */
export function detectCustomKind(prompt: string): CustomBlockKind {
  const p = prompt.toLowerCase();
  if (/\b(quiz|test|trivia|question)\b/.test(p)) return 'quiz';
  if (/\b(calculat|price|quantity|discount|total|savings|estimator|estimate)\b/.test(p)) return 'calculator';
  if (/\b(timeline|milestone|history|journey|roadmap|story)\b/.test(p)) return 'timeline';
  if (/\b(countdown|timer|sale ends|ends in|launch|offer ends)\b/.test(p)) return 'countdown';
  return 'countdown';
}

/** Escape a string for safe insertion into HTML text / attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pull up to `max` meaningful words out of a prompt. Only letters,
 * numbers, spaces and hyphens survive; anything that could break out of
 * a text node (tags, quotes, slashes) is stripped, never executed.
 */
export function promptWords(prompt: string, max = 12): string[] {
  const stop = new Set([
    'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'with', 'make', 'create',
    'build', 'add', 'show', 'about', 'this', 'that', 'our', 'your', 'my', 'is',
    'are', 'in', 'on', 'me', 'us', 'we', 'please', 'block', 'section',
  ]);
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= max) break;
    }
  }
  return out;
}

/** Title-case one word for display (words are already sanitised). */
function titleWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function blockCss(theme: Theme): string {
  const c = theme.colors;
  return [
    `.cb-wrap{font-family:${theme.font},system-ui,sans-serif;color:${c.text};background:${c.background};border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:20px;max-width:640px;margin:0 auto}`,
    `.cb-wrap h3{margin:0 0 8px;font-size:1.25rem}`,
    `.cb-wrap p{margin:0 0 12px;opacity:.8}`,
    `.cb-btn{display:inline-block;background:${c.primary};color:#fff;border:0;border-radius:999px;padding:10px 22px;font-weight:700;cursor:pointer;margin-top:12px}`,
    `.cb-btn:hover{opacity:.9}`,
    `.cb-opt{display:block;width:100%;text-align:left;background:#fff;border:1px solid rgba(0,0,0,.15);border-radius:8px;padding:10px 12px;margin-top:8px;cursor:pointer}`,
    `.cb-opt:hover{border-color:${c.primary}}`,
    `.cb-opt.cb-correct{border-color:#16a34a;background:#f0fdf4}`,
    `.cb-opt.cb-wrong{border-color:#dc2626;background:#fef2f2}`,
    `.cb-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}`,
    `.cb-field label{display:block;font-size:.8rem;font-weight:600;margin-bottom:4px}`,
    `.cb-field input{padding:10px;border:1px solid rgba(0,0,0,.2);border-radius:8px;width:120px}`,
    `.cb-total{font-size:1.5rem;font-weight:800;margin-top:12px}`,
    `.cb-timer{display:flex;gap:10px;justify-content:center;margin-top:12px}`,
    `.cb-cell{background:rgba(0,0,0,.05);border-radius:10px;padding:12px 16px;text-align:center;min-width:72px}`,
    `.cb-cell b{display:block;font-size:1.75rem}`,
    `.cb-cell span{font-size:.75rem;text-transform:uppercase;opacity:.6}`,
    `.cb-steps{list-style:none;margin:12px 0 0;padding:0}`,
    `.cb-steps li{padding:10px 0 10px 28px;position:relative;border-left:2px solid ${c.primary};margin-left:8px}`,
    `.cb-steps li::before{content:"";position:absolute;left:-7px;top:14px;width:12px;height:12px;border-radius:50%;background:${c.primary}}`,
    `.cb-steps b{display:block}`,
  ].join('\n');
}

function quizBlock(words: string[], theme: Theme): CustomBlock {
  const topic = words.slice(0, 3).map(titleWord).join(' ') || 'Your Store';
  const keywords = words.length > 0 ? words : ['quality', 'style', 'value'];
  const questions = [0, 1, 2].map((i) => {
    const word = keywords[i % keywords.length] ?? 'style';
    // Distinct options: the prompt word + fixed distractors that differ
    // from it, so options never repeat each other.
    const distractors = ['Quality', 'Style', 'Value', 'Service'].filter(
      (d) => d.toLowerCase() !== word.toLowerCase(),
    );
    const options = [
      titleWord(word),
      distractors[0] ?? 'Quality',
      distractors[1] ?? 'Style',
      'None of these',
    ];
    return {
      q: `Which of these best describes ${escapeHtml(topic)} — ${escapeHtml(titleWord(word))}?`,
      options: options.map((o) => escapeHtml(o)),
      answer: 0,
    };
  });
  const html = [
    `<div class="cb-wrap" data-cb-quiz>`,
    `<h3>${escapeHtml(topic)} Quiz</h3>`,
    `<p>Answer 3 quick questions about ${escapeHtml(topic.toLowerCase())}.</p>`,
    questions
      .map(
        (q, qi) => `<div data-cb-q="${qi}"><p><strong>Q${qi + 1}.</strong> ${q.q}</p>${q.options
          .map((o, oi) => `<button type="button" class="cb-opt" data-cb-a="${oi}">${o}</button>`)
          .join('')}</div>`,
      )
      .join(''),
    `<p data-cb-score style="margin-top:12px;font-weight:700"></p>`,
    `</div>`,
  ].join('\n');
  // The correct answers are fixed indices (first option) baked into the
  // template at build time — no user input ever reaches this script.
  const js = [
    `(function(){`,
    `  var score = 0, answered = 0;`,
    `  var wrap = document.querySelector('[data-cb-quiz]');`,
    `  if (!wrap) return;`,
    `  var out = wrap.querySelector('[data-cb-score]');`,
    `  wrap.querySelectorAll('[data-cb-q]').forEach(function(q){`,
    `    q.querySelectorAll('.cb-opt').forEach(function(btn){`,
    `      btn.addEventListener('click', function(){`,
    `        if (q.dataset.done) return;`,
    `        q.dataset.done = '1'; answered++;`,
    `        var correct = btn.dataset.cbA === '0';`,
    `        btn.classList.add(correct ? 'cb-correct' : 'cb-wrong');`,
    `        if (correct) score++;`,
    `        if (answered === 3 && out) out.textContent = 'You scored ' + score + ' out of 3 — nice work!';`,
    `      });`,
    `    });`,
    `  });`,
    `})();`,
  ].join('\n');
  return { html, css: blockCss(theme), js };
}

function calculatorBlock(words: string[], theme: Theme): CustomBlock {
  const topic = words.slice(0, 2).map(titleWord).join(' ') || 'Your Order';
  const fallbackPrice = 29;
  const found = words
    .map((w) => Number(w))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 10000);
  void found; // prices come from the fixed template default, not prompt numbers
  const html = [
    `<div class="cb-wrap" data-cb-calc>`,
    `<h3>${escapeHtml(topic)} Calculator</h3>`,
    `<p>Work out your total before you order.</p>`,
    `<div class="cb-row">`,
    `<div class="cb-field"><label for="cb-qty">Quantity</label><input id="cb-qty" type="number" min="1" max="99" value="2"></div>`,
    `<div class="cb-field"><label for="cb-price">Price each ($)</label><input id="cb-price" type="number" min="1" max="10000" value="${fallbackPrice}"></div>`,
    `</div>`,
    `<div class="cb-total">Total: <span data-cb-total>$${fallbackPrice * 2}.00</span></div>`,
    `<p style="font-size:.8rem">Free shipping on orders over $50.</p>`,
    `</div>`,
  ].join('\n');
  const js = [
    `(function(){`,
    `  var wrap = document.querySelector('[data-cb-calc]');`,
    `  if (!wrap) return;`,
    `  var qty = wrap.querySelector('#cb-qty');`,
    `  var price = wrap.querySelector('#cb-price');`,
    `  var out = wrap.querySelector('[data-cb-total]');`,
    `  function update(){`,
    `    var q = Math.max(1, Math.min(99, parseInt(qty.value, 10) || 1));`,
    `    var p = Math.max(1, Math.min(10000, parseFloat(price.value) || ${fallbackPrice}));`,
    `    out.textContent = '$' + (q * p).toFixed(2);`,
    `  }`,
    `  qty.addEventListener('input', update);`,
    `  price.addEventListener('input', update);`,
    `  update();`,
    `})();`,
  ].join('\n');
  return { html, css: blockCss(theme), js };
}

function countdownBlock(words: string[], theme: Theme): CustomBlock {
  const topic = words.slice(0, 3).map(titleWord).join(' ') || 'Sale';
  const html = [
    `<div class="cb-wrap" data-cb-countdown style="text-align:center">`,
    `<h3>${escapeHtml(topic)} — Ends Soon</h3>`,
    `<p>When the timer hits zero, the offer closes.</p>`,
    `<div class="cb-timer">`,
    `<div class="cb-cell"><b data-cb-d>02</b><span>Days</span></div>`,
    `<div class="cb-cell"><b data-cb-h>00</b><span>Hours</span></div>`,
    `<div class="cb-cell"><b data-cb-m>00</b><span>Mins</span></div>`,
    `<div class="cb-cell"><b data-cb-s>00</b><span>Secs</span></div>`,
    `</div>`,
    `<button type="button" class="cb-btn">Shop the Offer</button>`,
    `</div>`,
  ].join('\n');
  // Fixed 48-hour countdown from first render — no user input involved.
  const js = [
    `(function(){`,
    `  var wrap = document.querySelector('[data-cb-countdown]');`,
    `  if (!wrap) return;`,
    `  var end = Date.now() + 48 * 3600 * 1000;`,
    `  function pad(n){ return String(n).padStart(2, '0'); }`,
    `  function tick(){`,
    `    var diff = Math.max(0, end - Date.now());`,
    `    var s = Math.floor(diff / 1000);`,
    `    wrap.querySelector('[data-cb-d]').textContent = pad(Math.floor(s / 86400));`,
    `    wrap.querySelector('[data-cb-h]').textContent = pad(Math.floor((s % 86400) / 3600));`,
    `    wrap.querySelector('[data-cb-m]').textContent = pad(Math.floor((s % 3600) / 60));`,
    `    wrap.querySelector('[data-cb-s]').textContent = pad(s % 60);`,
    `    if (diff > 0) setTimeout(tick, 1000);`,
    `  }`,
    `  tick();`,
    `})();`,
  ].join('\n');
  return { html, css: blockCss(theme), js };
}

function timelineBlock(words: string[], theme: Theme): CustomBlock {
  const topic = words.slice(0, 2).map(titleWord).join(' ') || 'Our Story';
  const steps = [0, 1, 2, 3].map((i) => {
    const word = titleWord(words[i % Math.max(1, words.length)] ?? 'quality');
    return {
      year: `Step ${i + 1}`,
      title: `${word} — how it started`,
      text: `The ${word.toLowerCase()} chapter of the ${topic.toLowerCase()} story: what changed, and why it mattered.`,
    };
  });
  const html = [
    `<div class="cb-wrap" data-cb-timeline>`,
    `<h3>${escapeHtml(topic)} Timeline</h3>`,
    `<p>Four milestones, in order.</p>`,
    `<ol class="cb-steps">`,
    steps
      .map(
        (s) =>
          `<li><span style="font-size:.75rem;opacity:.6">${escapeHtml(s.year)}</span><b>${escapeHtml(s.title)}</b><span>${escapeHtml(s.text)}</span></li>`,
      )
      .join(''),
    `</ol>`,
    `</div>`,
  ].join('\n');
  return { html, css: blockCss(theme), js: '' };
}

/**
 * Build one interactive custom block from a prompt. The kind is detected
 * from keywords (or passed explicitly by the caller via detectCustomKind).
 * Prompt words appear only as escaped text — never as code.
 */
export function buildCustomBlock(
  kind: CustomBlockKind,
  prompt: string,
  theme: Theme,
): CustomBlock {
  const words = promptWords(prompt);
  switch (kind) {
    case 'quiz':
      return quizBlock(words, theme);
    case 'calculator':
      return calculatorBlock(words, theme);
    case 'countdown':
      return countdownBlock(words, theme);
    case 'timeline':
      return timelineBlock(words, theme);
  }
}
