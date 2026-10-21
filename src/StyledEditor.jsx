import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

// ---------- Style system ----------------------------------------------------

const FONTS = [
  { label: "Charter (serif)", value: 'Charter, "Bitstream Charter", Georgia, serif' },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Palatino (serif)", value: 'Palatino, "Palatino Linotype", "Book Antiqua", serif' },
  { label: "System sans", value: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { label: "Arial (sans)", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana (sans)", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma (sans)", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS (sans)", value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Monospace", value: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

const WEIGHTS = [
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
];

const CASES = [
  { label: "As typed", value: "none" },
  { label: "UPPERCASE", value: "uppercase" },
  { label: "Small caps", value: "smallcaps" },
];

// Each style maps a semantic target (tag, or tag + class) to editable properties.
// `short` is the compact toolbar label; the panel shows the full label.
const DEFAULT_STYLES = [
  { id: "h1", label: "Heading 1", short: "H1", tag: "h1", cls: null,
    props: { font: FONTS[0].value, size: 32, weight: 700, color: "#1d1d1b", italic: false, caps: "none", tracking: -0.01, before: 0.4, after: 0.5 } },
  { id: "h2", label: "Heading 2", short: "H2", tag: "h2", cls: null,
    props: { font: FONTS[0].value, size: 23, weight: 700, color: "#1d1d1b", italic: false, caps: "none", tracking: -0.005, before: 1.4, after: 0.45 } },
  { id: "h3", label: "Heading 3", short: "H3", tag: "h3", cls: null,
    props: { font: FONTS[0].value, size: 19, weight: 600, color: "#1d1d1b", italic: false, caps: "none", tracking: -0.003, before: 1.3, after: 0.4 } },
  { id: "h4", label: "Heading 4", short: "H4", tag: "h4", cls: null,
    props: { font: FONTS[0].value, size: 16.5, weight: 700, color: "#2c2b28", italic: false, caps: "none", tracking: 0, before: 1.2, after: 0.35 } },
  { id: "h5", label: "Heading 5", short: "H5", tag: "h5", cls: null,
    props: { font: FONTS[3].value, size: 13.5, weight: 600, color: "#3a3833", italic: false, caps: "none", tracking: 0.01, before: 1.2, after: 0.35 } },
  { id: "h6", label: "Heading 6", short: "H6", tag: "h6", cls: null,
    props: { font: FONTS[3].value, size: 12.5, weight: 600, color: "#59554d", italic: false, caps: "uppercase", tracking: 0.07, before: 1.2, after: 0.4 } },
  { id: "body",     label: "Body",    short: "Body",    tag: "p", cls: null,
    props: { font: FONTS[0].value, size: 17, weight: 400, color: "#2c2b28", italic: false, caps: "none", tracking: 0, before: 0, after: 0.85 } },
  { id: "quote",    label: "Quote",   short: "Quote",   tag: "blockquote", cls: null,
    props: { font: FONTS[0].value, size: 18, weight: 400, color: "#4c5a58", italic: true, caps: "none", tracking: 0, before: 0.9, after: 0.9 } },
  { id: "callout",  label: "Callout", short: "Callout", tag: "p", cls: "callout",
    props: { font: FONTS[3].value, size: 15, weight: 400, color: "#173f3a", italic: false, caps: "none", tracking: 0, before: 0.9, after: 0.9 } },
  // #6f6b62 replaces the original #8a857a, which rendered at 3.61:1 on the page —
  // below the 4.5:1 that 12.5px regular text requires (WCAG 1.4.3). Same hue and
  // saturation, darkened to L=41%, so it still reads as a quiet caption grey at 5.21:1.
  { id: "caption",  label: "Caption", short: "Caption", tag: "p", cls: "caption",
    props: { font: FONTS[3].value, size: 12.5, weight: 400, color: "#6f6b62", italic: false, caps: "none", tracking: 0.02, before: 0.2, after: 0.9 } },
  // Inline style: styles every <a> in the document. Inherits family/size from context.
  { id: "link", label: "Link", tag: "a", cls: null, inline: true,
    props: { color: "#0b6e63", weight: 400, italic: false, underline: true } },
];

// Elements a custom style can attach to.
const CUSTOM_BASES = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Heading 4", value: "h4" },
  { label: "Heading 5", value: "h5" },
  { label: "Heading 6", value: "h6" },
  { label: "Block quote", value: "blockquote" },
];

function selectorFor(s, scope) {
  return `${scope} ${s.tag}${s.cls ? "." + s.cls : ""}`;
}

function ruleBody(p, inlineStyle) {
  if (inlineStyle) {
    // Inline styles (links) inherit family/size from surrounding text on purpose —
    // a link inside a heading should look like that heading, recoloured.
    return [
      `color: ${p.color};`,
      `font-weight: ${p.weight};`,
      `font-style: ${p.italic ? "italic" : "normal"};`,
      `text-decoration: ${p.underline ? "underline" : "none"};`,
      `text-underline-offset: 0.12em;`,
    ].join(" ");
  }
  const capsCss =
    p.caps === "uppercase" ? "text-transform: uppercase;" :
    p.caps === "smallcaps" ? "font-variant-caps: small-caps;" : "";
  return [
    `font-family: ${p.font};`,
    `font-size: ${p.size}px;`,
    `font-weight: ${p.weight};`,
    `color: ${p.color};`,
    `font-style: ${p.italic ? "italic" : "normal"};`,
    `letter-spacing: ${p.tracking}em;`,
    `margin: ${p.before}em 0 ${p.after}em;`,
    `line-height: ${p.size > 22 ? 1.22 : 1.6};`,
    capsCss,
  ].join(" ");
}

function buildStylesheet(styles, scope) {
  const rules = styles.map((s) => `${selectorFor(s, scope)} { ${ruleBody(s.props, s.inline)} }`);
  // Fixed structural touches that ride along with the editable properties.
  rules.push(`${scope} blockquote { border-left: 3px solid currentColor; padding-left: 1.1em; margin-left: 0; margin-right: 0; }`);
  rules.push(`${scope} p.callout { background: #eef4f2; border: 1px solid #d3e2dd; border-radius: 6px; padding: 0.85em 1em; }`);
  rules.push(`${scope} strong { font-weight: 700; } ${scope} em { font-style: italic; }`);
  rules.push(`${scope} table { border-collapse: collapse; margin: 0.9em 0; font-size: 0.95em; }`);
  rules.push(`${scope} th, ${scope} td { border: 1px solid #d8d5cd; padding: 0.45em 0.8em; text-align: left; }`);
  rules.push(`${scope} th { background: #f1efe9; }`);
  rules.push(`${scope} caption { text-align: left; padding-bottom: 0.4em; font-size: 0.9em; color: #59554d; }`);
  rules.push(`${scope} img { max-width: 100%; height: auto; }`);
  return rules.join("\n");
}

// ---------- Export stylesheet: root-relative (rem) units ---------------------
// The editor preview above stays in px — it renders inside fixed app chrome.
// The exported document is different: it lands on someone else's page and is
// read at whatever size that reader has chosen. So it sets a default size on
// :root and expresses every length in rem, letting the whole document scale
// with the browser's font-size preference (WCAG 1.4.4 Resize Text) instead of
// pinning text to absolute pixels. Its width is a percentage of whatever
// container it lands in rather than a fixed measure.
//
// Both builders are driven by the same `styles` array, so the two stylesheets
// can't drift: they're two renderings of one definition.

const EXPORT_BASE_PX = 16;        // rem math reference — matches the 16px browser default
const EXPORT_ROOT_FONT = "100%";  // the document's default font size.
                                  // 100% == the reader's browser default (~16px).
                                  // Raise it (e.g. "112.5%") to scale the whole
                                  // document up while keeping every proportion
                                  // intact. Prefer % over a fixed px for accessibility:
                                  // a px value here overrides the reader's choice.

const remOf = (px, base = EXPORT_BASE_PX) => `${+(px / base).toFixed(4)}rem`;

// `tracking`, `before` and `after` are stored relative to the element's own font
// size. For every property except font-size, `em` resolves against that same own
// size — so multiply by it to recover the real length before converting to a
// root-relative rem. Skipping that step is what silently rescales a document.
function exportRuleBody(p, inlineStyle) {
  if (inlineStyle) {
    // Links inherit their size from the surrounding text on purpose, so there is
    // no size here to convert. text-underline-offset stays em-relative — in rem
    // it would detach from the text it's underlining at other sizes.
    return [
      `color: ${p.color};`,
      `font-weight: ${p.weight};`,
      `font-style: ${p.italic ? "italic" : "normal"};`,
      `text-decoration: ${p.underline ? "underline" : "none"};`,
      `text-underline-offset: 0.12em;`,
    ].join(" ");
  }
  const capsCss =
    p.caps === "uppercase" ? "text-transform: uppercase;" :
    p.caps === "smallcaps" ? "font-variant-caps: small-caps;" : "";
  return [
    `font-family: ${p.font};`,
    `font-size: ${remOf(p.size)};`,
    `font-weight: ${p.weight};`,
    `color: ${p.color};`,
    `font-style: ${p.italic ? "italic" : "normal"};`,
    `letter-spacing: ${remOf(p.tracking * p.size)};`,
    `margin: ${remOf(p.before * p.size)} 0 ${remOf(p.after * p.size)};`,
    `line-height: ${p.size > 22 ? 1.22 : 1.6};`,
    capsCss,
  ].join(" ");
}

// Container box for the exported document. Width is a percentage of the parent;
// the rem max-width is a line-length cap for readability (WCAG 1.4.8) that grows
// with the reader's font size instead of squeezing more words onto a line.
// box-sizing keeps the padding inside that cap.
function exportDocRule(scope) {
  return `${scope} { width: 90%; max-width: ${remOf(820)}; margin: 0 auto; padding: 2rem 1.5rem; box-sizing: border-box; }`;
}

function buildExportStylesheet(styles, scope) {
  const sizeOf = (id) => {
    const s = styles.find((x) => x.id === id);
    return s && s.props && s.props.size ? s.props.size : EXPORT_BASE_PX;
  };
  const rules = styles.map((s) => `${selectorFor(s, scope)} { ${exportRuleBody(s.props, s.inline)} }`);

  // Each em below is resolved against the font size of the element it actually
  // renders on, walking the real inheritance chain:
  //   .document (root size) > table (0.95em) > caption (0.9em of the table)
  // Tables are the trap. `.document p` only matches <p>, so a <table> inherits
  // from the container at root size — NOT from the Body style. Resolving table
  // ems against Body's size silently enlarges every table in the export.
  const quoteSize = sizeOf("quote");
  const calloutSize = sizeOf("callout");
  const tableSize = 0.95 * EXPORT_BASE_PX;
  const captionSize = 0.9 * tableSize;

  // Border widths stay in px on purpose: a hairline is meant to stay a hairline
  // at any zoom, and stroke width isn't a legibility concern the way text is.
  rules.push(`${scope} blockquote { border-left: 3px solid currentColor; padding-left: ${remOf(1.1 * quoteSize)}; margin-left: 0; margin-right: 0; }`);
  rules.push(`${scope} p.callout { background: #eef4f2; border: 1px solid #d3e2dd; border-radius: ${remOf(6)}; padding: ${remOf(0.85 * calloutSize)} ${remOf(1 * calloutSize)}; }`);
  rules.push(`${scope} strong { font-weight: 700; } ${scope} em { font-style: italic; }`);
  rules.push(`${scope} table { border-collapse: collapse; margin: ${remOf(0.9 * tableSize)} 0; font-size: ${remOf(tableSize)}; }`);
  rules.push(`${scope} th, ${scope} td { border: 1px solid #d8d5cd; padding: ${remOf(0.45 * tableSize)} ${remOf(0.8 * tableSize)}; text-align: left; }`);
  rules.push(`${scope} th { background: #f1efe9; }`);
  rules.push(`${scope} caption { text-align: left; padding-bottom: ${remOf(0.4 * captionSize)}; font-size: ${remOf(captionSize)}; color: #59554d; }`);
  rules.push(`${scope} img { max-width: 100%; height: auto; }`);
  return rules.join("\n");
}

const SEED_HTML = `
<h1>A style, defined once</h1>
<p class="caption">Prototype · edit any style on the right and watch every instance follow</p>
<p>This document is plain semantic HTML — headings are real <strong>h1/h2/h3</strong> elements, quotes are real blockquotes. None of them carry inline styling. Their appearance comes entirely from the named styles in the panel, so changing a definition restyles the whole document at once.</p>
<h2>Try it</h2>
<p>Click <em>Heading 2</em> in the panel, change its color or font, and both h2 headings on this page update together. Then put your cursor in this paragraph and press a style button in the toolbar to retag it.</p>
<blockquote>Formatting should be a decision you make once, not a chore you repeat.</blockquote>
<h3>Class-based styles</h3>
<p class="callout">Styles can also target named classes, not just tags — this callout is just a paragraph with a class. That is how you would grow the system beyond the built-in heading levels.</p>
<p>When you export, the document ships as clean HTML with your stylesheet embedded — content and presentation separated, exactly as they are in here.</p>
`;

// Deliberately flawed content so the checker has something to find.
const DEMO_HTML = `
<h2>Sample: content with issues</h2>
<h4>This subheading skips a level</h4>
<p>A vague link: <a href="https://example.com">click here</a>. A descriptive one: <a href="https://www.w3.org/WAI/">W3C Web Accessibility Initiative</a>. A link with no destination: <a href="#">pricing page</a>.</p>
<p><img src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='70'%3E%3Crect width='140' height='70' rx='6' fill='%230e8a7d'/%3E%3C/svg%3E" width="140" height="70"></p>
<table>
  <tbody>
    <tr><td>Style</td><td>Size</td></tr>
    <tr><td>Body</td><td>17 px</td></tr>
    <tr><td>Caption</td><td>12.5 px</td></tr>
  </tbody>
</table>
<p class="caption">Drop this caption's colour lighter in the Styles panel and the contrast badge beside the picker turns red before you ever run the checker.</p>
`;

// ---------- Editing helpers --------------------------------------------------

function blockOf(node, root) {
  let n = node && node.nodeType === 3 ? node.parentElement : node;
  while (n && n !== root && n.parentElement !== root) n = n.parentElement;
  return n && n !== root ? n : null;
}

function anchorAt(node, root) {
  let n = node && node.nodeType === 3 ? node.parentElement : node;
  while (n && n !== root) {
    if (n.tagName === "A") return n;
    n = n.parentElement;
  }
  return null;
}

// ---------- Editing engine ---------------------------------------------------
// Every editing mutation goes through this one surface. The component never
// calls execCommand or touches Ranges directly, so replacing the engine later
// (Lexical, TipTap, EditContext once it ships beyond Chromium) means
// reimplementing these functions rather than doing surgery across the UI.
//
//   caretIn(root) / restoreCaret(root, pos)  — caret as plain text offsets
//   retagBlock(root, tag, cls)               — swap a block's tag, keep the caret
//   toggleMark(root, mark)                   — bold | italic
//   queryMarks(root)                         — { bold, italic } at the caret
//   setLink(root, url, newWindow)            — create or update an anchor
//   clearLink(root)                          — unwrap the anchor
//   normalizeMarks(root)                     — b -> strong, i -> em
//
// Of these, only toggleMark still delegates to execCommand. Splitting text
// nodes across a partial multi-element selection, merging adjacent marks and
// surviving IME composition is the problem editor frameworks exist to solve,
// and hand-rolling it badly is worse than the deprecation. It is one function.

// Text offset of (node, offset) counted from the start of `within`.
function offsetWithin(within, node, offset) {
  if (!within.contains(node)) return 0;
  const walk = document.createTreeWalker(within, NodeFilter.SHOW_TEXT);
  let total = 0, n;
  while ((n = walk.nextNode())) {
    if (n === node) return total + offset;
    total += n.nodeValue.length;
  }
  // Selection anchored on an element rather than a text node: count the text
  // in the children that precede the offset.
  if (node === within) {
    let seen = 0;
    for (let i = 0; i < offset && i < within.childNodes.length; i++) {
      seen += within.childNodes[i].textContent.length;
    }
    return seen;
  }
  return total;
}

// Inverse of offsetWithin — find the (node, offset) at a text position.
function positionAt(within, target) {
  const walk = document.createTreeWalker(within, NodeFilter.SHOW_TEXT);
  let total = 0, n, last = null;
  while ((n = walk.nextNode())) {
    if (total + n.nodeValue.length >= target) return [n, target - total];
    total += n.nodeValue.length;
    last = n;
  }
  return last ? [last, last.nodeValue.length] : [within, 0];
}

// The caret as two integers, which survive the DOM being rebuilt underneath it.
function caretIn(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer)) return null;
  return {
    start: offsetWithin(root, r.startContainer, r.startOffset),
    end: offsetWithin(root, r.endContainer, r.endOffset),
  };
}

function restoreCaret(root, pos) {
  if (!pos) return;
  const sel = window.getSelection();
  if (!sel) return;
  try {
    const [sn, so] = positionAt(root, pos.start);
    const [en, eo] = positionAt(root, pos.end);
    const r = document.createRange();
    r.setStart(sn, so);
    r.setEnd(en, eo);
    sel.removeAllRanges();
    sel.addRange(r);
  } catch (e) { /* content shrank under us; leave the caret where it is */ }
}

// Replace the block containing the caret with a new tag, preserving children,
// the caret, and nothing else. Deterministic in every browser — unlike
// formatBlock, which may hand back a div or a nested wrapper and silently
// break both the style rules and screen-reader heading navigation (WCAG 1.3.1).
function retagBlock(root, tag, className) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const block = blockOf(range.startContainer, root);
  if (!block) return null;

  const start = offsetWithin(block, range.startContainer, range.startOffset);
  const end = offsetWithin(block, range.endContainer, range.endOffset);

  let next = block;
  if (block.tagName.toLowerCase() !== tag) {
    next = document.createElement(tag);
    while (block.firstChild) next.appendChild(block.firstChild);
    block.replaceWith(next);
  } else {
    next.removeAttribute("style");
  }
  next.removeAttribute("class");
  if (className) next.classList.add(className);

  const [sn, so] = positionAt(next, start);
  const [en, eo] = positionAt(next, end);
  try {
    const r = document.createRange();
    r.setStart(sn, so);
    r.setEnd(en, eo);
    sel.removeAllRanges();
    sel.addRange(r);
  } catch (e) { /* empty block — the caret lands in it on focus anyway */ }
  return next;
}

// execCommand("bold") emits <b>, not <strong>, so bold text bypassed the
// export stylesheet's `strong` rule entirely. This is the fix: presentational
// tags are rewritten to their semantic equivalents after every command.
const MARK_ALIASES = { B: "strong", I: "em" };

function normalizeMarks(root) {
  const stale = [...root.querySelectorAll("b, i")];
  if (stale.length === 0) return false;
  const pos = caretIn(root);
  stale.forEach((el) => {
    const semantic = document.createElement(MARK_ALIASES[el.tagName]);
    while (el.firstChild) semantic.appendChild(el.firstChild);
    el.replaceWith(semantic);
  });
  restoreCaret(root, pos);
  return true;
}

function toggleMark(root, mark) {
  document.execCommand(mark);
  normalizeMarks(root);
}

// Replaces queryCommandState: read the marks off the DOM instead of asking a
// non-standard API. This is what drives aria-pressed on the toolbar, so it
// needs to be truthful rather than merely available.
function queryMarks(root) {
  const sel = window.getSelection();
  const out = { bold: false, italic: false };
  if (!sel || !sel.anchorNode || !root.contains(sel.anchorNode)) return out;
  let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
  while (n && n !== root) {
    const t = n.tagName;
    if (t === "STRONG" || t === "B") out.bold = true;
    if (t === "EM" || t === "I") out.italic = true;
    n = n.parentElement;
  }
  return out;
}

function setLink(root, url, newWindow) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let a = anchorAt(sel.anchorNode, root);
  if (!a) {
    const range = sel.getRangeAt(0);
    if (range.collapsed) return null;
    a = document.createElement("a");
    // extractContents + insertNode rather than surroundContents, which throws
    // when the range partially selects an element.
    a.appendChild(range.extractContents());
    range.insertNode(a);
    // Wrapping across an existing link would nest anchors, which is invalid.
    a.querySelectorAll("a").forEach((inner) => {
      while (inner.firstChild) inner.parentNode.insertBefore(inner.firstChild, inner);
      inner.remove();
    });
    const r = document.createRange();
    r.selectNodeContents(a);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  a.setAttribute("href", url);
  if (newWindow) {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer"); // guard the opener reference
  } else {
    a.removeAttribute("target");
    a.removeAttribute("rel");
  }
  return a;
}

function clearLink(root) {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return false;
  const a = anchorAt(sel.anchorNode, root);
  if (!a) return false;
  const pos = caretIn(root);
  while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
  a.remove();
  restoreCaret(root, pos);
  return true;
}

// Insert a parsed HTML fragment as a new block, immediately after the block the
// caret is in (or at the end of the document if there's no caret). Structures
// like a <table> can't validly land inside a <p>, so — unlike setLink, which
// splices into inline text — this always inserts at the block level, the way a
// word processor's "insert table here" does regardless of where in a line the
// cursor sits.
function insertBlockAfterCaret(root, html) {
  const sel = window.getSelection();
  let block = null;
  if (sel && sel.rangeCount > 0 && root.contains(sel.anchorNode)) {
    block = blockOf(sel.anchorNode, root);
  }
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  const node = temp.firstElementChild;
  if (!node) return null;
  if (block && block.parentNode) {
    block.parentNode.insertBefore(node, block.nextSibling);
  } else {
    root.appendChild(node);
  }
  return node;
}

// ---------- History ----------------------------------------------------------
// Hand-rolled DOM edits don't enter the browser's native undo buffer, so
// retagging or linking would be invisible to Ctrl+Z while typing stayed
// undoable — two histories, interleaved wrongly. Rather than accept that, the
// editor keeps the only history: snapshots of the document plus the caret,
// covering typing, retags, marks and links in one ordered stack. Native undo
// is suppressed in the editable region so there is exactly one Ctrl+Z.

function createHistory(limit = 80) {
  let stack = [];
  let index = -1;
  return {
    reset(snap) { stack = [snap]; index = 0; },
    // Record a new state, discarding any redo tail.
    push(snap) {
      if (index >= 0 && stack[index] && stack[index].html === snap.html) {
        stack[index] = snap; // same content, newer caret
        return;
      }
      stack = stack.slice(0, index + 1);
      stack.push(snap);
      if (stack.length > limit) stack.shift();
      index = stack.length - 1;
    },
    canUndo() { return index > 0; },
    canRedo() { return index < stack.length - 1; },
    // Undo folds in the caller's *current* state first, so typing still inside
    // the debounce window is undone rather than silently discarded. That fold
    // only happens at the head of the stack: mid-history, a mismatch means the
    // caller is out of sync, and branching there would re-append the same state
    // on every call and never step backwards.
    undo(current) {
      if (index < 0) return null;
      if (current && index === stack.length - 1 && stack[index] && stack[index].html !== current.html) {
        stack.push(current);
        if (stack.length > limit) stack.shift();
        index = stack.length - 1;
      }
      if (index <= 0) return null;
      index -= 1;
      return stack[index];
    },
    redo() {
      if (index >= stack.length - 1) return null;
      index += 1;
      return stack[index];
    },
  };
}

// ---------- Clipboard + download (sandbox-safe) ------------------------------
// Artifacts run in a sandboxed, cross-origin iframe. The async Clipboard API and
// <a download> are frequently gated by Permissions-Policy / the sandbox flags, so
// each of these degrades gracefully instead of throwing an uncaught error.

async function copyText(text) {
  // Preferred path: async Clipboard API (needs clipboard-write + secure context).
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Permission denied inside the sandbox — fall through to the legacy path.
  }
  // Legacy path: works during a user gesture even when the async API is blocked.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// Attempts a real file download. Returns false if it throws; note that a
// sandbox without `allow-downloads` may block silently without throwing, which
// is why callers always pair this with the export dialog as a guaranteed path.
function tryDownload(filename, text, mime) {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke — revoking synchronously can abort the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Code view helpers -------------------------------------------------

const BLOCK_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "div", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "caption", "ul", "ol", "li", "hr",
]);

function escapeAttr(v) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Pretty-print editor HTML: block elements each on their own line, indented;
// inline content (strong/em/a/img/text) stays on the line of its block.
function formatHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = [];
  const walk = (node, depth) => {
    const pad = "  ".repeat(depth);
    node.childNodes.forEach((child) => {
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        const attrs = [...child.attributes].map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join("");
        if (BLOCK_TAGS.has(tag)) {
          const hasBlockChildren = [...child.children].some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()));
          if (tag === "hr") {
            out.push(`${pad}<hr${attrs}>`);
          } else if (hasBlockChildren) {
            out.push(`${pad}<${tag}${attrs}>`);
            walk(child, depth + 1);
            out.push(`${pad}</${tag}>`);
          } else {
            out.push(`${pad}<${tag}${attrs}>${child.innerHTML.trim()}</${tag}>`);
          }
        } else {
          // Inline element sitting directly at this level (e.g. a stray img)
          out.push(`${pad}${child.outerHTML.trim()}`);
        }
      } else if (child.nodeType === 3 && child.textContent.trim()) {
        out.push(`${pad}${child.textContent.trim()}`);
      }
    });
  };
  walk(doc.body, 0);
  return out.join("\n");
}

// Parse user-edited HTML back into safe document content. The browser's parser
// repairs malformed markup; we additionally strip active content since the
// result is injected into a live contenteditable region.
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed, link, meta, form").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      if ((a.name === "href" || a.name === "src" || a.name === "xlink:href") && /^\s*javascript:/i.test(a.value)) {
        el.removeAttribute(a.name);
      }
    });
  });
  return doc.body.innerHTML;
}

// ---------- Accessibility checker --------------------------------------------

function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  if (str.startsWith("#")) {
    let h = str.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((s) => parseFloat(s));
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

function luminance({ r, g, b }) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Walk up from an element until we find an opaque background; fall back to the page colour.
function effectiveBg(el, root) {
  let n = el;
  while (n && n !== root.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c && c.a >= 0.99) return c;
    n = n.parentElement;
  }
  return parseColor("#fdfdfb");
}

const GENERIC_LINK_TEXT = new Set([
  "click here", "here", "click", "read more", "more", "learn more", "link", "this", "this page",
]);

// Returns an array of { cat, sev, msg, node } issues.
// sev: "error" (WCAG failure) | "warn" (likely problem / best practice) | "info" (please review)
function runAccessibilityChecks(root) {
  const issues = [];
  const push = (cat, sev, msg, node) => issues.push({ cat, sev, msg, node });

  // --- Headings: presence, order, emptiness -------------------------------
  const hs = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  if (hs.length === 0) {
    push("Headings", "warn", "Document has no headings. Headings let screen-reader users navigate the page (WCAG 1.3.1).", null);
  }
  let prev = 0;
  hs.forEach((h, i) => {
    const lvl = Number(h.tagName[1]);
    if (!h.textContent.trim()) {
      push("Headings", "error", `Empty <${h.tagName.toLowerCase()}> — headings must contain text (WCAG 2.4.6).`, h);
    }
    if (i === 0 && lvl !== 1) {
      push("Headings", "warn", `First heading is <${h.tagName.toLowerCase()}> — documents should normally begin with a single <h1>.`, h);
    }
    if (prev && lvl > prev + 1) {
      push("Headings", "error", `Heading level skipped: <h${prev}> is followed by <h${lvl}> (WCAG 1.3.1).`, h);
    }
    prev = lvl;
  });
  const h1s = hs.filter((h) => h.tagName === "H1");
  if (h1s.length > 1) {
    push("Headings", "warn", `${h1s.length} <h1> elements found — use one main title per document.`, h1s[1]);
  }

  // --- Links: accessible name, meaningful text, real destination ----------
  [...root.querySelectorAll("a")].forEach((a) => {
    const text = (a.textContent || "").trim();
    const imgAlt = [...a.querySelectorAll("img")].map((im) => im.getAttribute("alt") || "").join(" ").trim();
    const name = text || imgAlt;
    if (!name) {
      push("Links", "error", "Link has no accessible text (WCAG 2.4.4). Add link text, or alt text on the image inside it.", a);
    } else if (GENERIC_LINK_TEXT.has(name.toLowerCase())) {
      push("Links", "warn", `Link text “${name}” doesn't describe its destination (WCAG 2.4.4). Say where it goes.`, a);
    }
    const href = a.getAttribute("href");
    if (!href || href.trim() === "" || href.trim() === "#") {
      push("Links", "warn", `Link “${name || "(no text)"}” has no destination URL.`, a);
    }
    if (a.getAttribute("target") === "_blank" && !/new (window|tab)|opens in/i.test(name)) {
      push("Links", "info", `Link “${name || "(no text)"}” opens in a new window without saying so — indicating it in the link text, e.g. “(opens in new window)”, avoids disorienting screen-reader users (WCAG 3.2.5 advisory, G201).`, a);
    }
  });

  // --- Link colour distinguishability (WebAIM link-contrast method) --------
  // Underlined links carry a non-colour cue, so only colour-only links are
  // tested here. Link-vs-background and body-vs-background are covered by the
  // general contrast pass below.
  const linkSeen = new Set();
  [...root.querySelectorAll("a")].forEach((a) => {
    if (!a.textContent.trim()) return;
    const csA = getComputedStyle(a);
    if ((csA.textDecorationLine || "").includes("underline")) return;
    const parent = a.parentElement;
    if (!parent) return;
    const linkColor = csA.color;
    const bodyColor = getComputedStyle(parent).color;
    const fgA = parseColor(linkColor);
    const fgP = parseColor(bodyColor);
    if (!fgA || !fgP) return;
    const ratio = contrastRatio(fgA, fgP);
    const key = `${linkColor}|${bodyColor}`;
    if (linkSeen.has(key)) return;
    linkSeen.add(key);
    if (ratio + 0.005 < 3) {
      push("Links", "error", `Non-underlined link has only ${ratio.toFixed(2)}:1 contrast with surrounding text — WebAIM's link-contrast method requires 3:1 when colour is the only distinction, or an underline (WCAG 1.4.1).`, a);
    } else {
      push("Links", "warn", `Link is distinguished by colour alone (${ratio.toFixed(2)}:1 vs surrounding text, which meets 3:1) — WCAG 1.4.1 also requires a non-colour cue such as an underline on hover and focus.`, a);
    }
  });

  // --- Images: alt text present and useful ---------------------------------
  [...root.querySelectorAll("img")].forEach((img) => {
    if (!img.hasAttribute("alt")) {
      push("Images", "error", "Image is missing an alt attribute (WCAG 1.1.1).", img);
      return;
    }
    const alt = img.getAttribute("alt").trim();
    if (alt === "") {
      push("Images", "info", "Image has empty alt text, so it will be skipped as decorative. Confirm that's intended.", img);
    } else if (/\.(jpe?g|png|gif|svg|webp|bmp)$/i.test(alt)) {
      push("Images", "warn", `Alt text “${alt}” looks like a file name — describe what the image shows instead.`, img);
    } else if (/^(image|picture|photo|graphic|icon) of\b/i.test(alt)) {
      push("Images", "warn", `Alt text begins with “${alt.split(" ").slice(0, 2).join(" ")} …” — screen readers already announce it as an image, so describe the content directly.`, img);
    }
  });

  // --- Tables: header cells, scope, caption --------------------------------
  [...root.querySelectorAll("table")].forEach((t) => {
    const ths = [...t.querySelectorAll("th")];
    if (ths.length === 0) {
      push("Tables", "error", "Table has no header cells. Mark row/column headers with <th> so cells associate with them (WCAG 1.3.1).", t);
    } else {
      ths.forEach((th) => {
        if (!th.textContent.trim()) push("Tables", "error", "Empty table header cell (WCAG 1.3.1).", th);
      });
      if (ths.some((th) => !th.getAttribute("scope"))) {
        push("Tables", "warn", 'Header cells are missing a scope attribute — add scope="col" or scope="row" so headers bind to the right cells.', t);
      }
    }
    const cap = t.querySelector("caption");
    if (!cap) {
      push("Tables", "warn", "Table has no <caption> describing what it contains.", t);
    } else if (!cap.textContent.trim()) {
      push("Tables", "warn", "Table has an empty caption — add a short description of what the table shows (WCAG 1.3.1).", cap);
    }
  });

  // --- Contrast: every rendered text run vs its effective background -------
  // Deduped by element signature so one bad style yields one issue, not dozens.
  const seen = new Map();
  const els = [root, ...root.querySelectorAll("*")];
  els.forEach((el) => {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) return;
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    const bg = effectiveBg(el, root);
    if (!fg || !bg) return;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const req = large ? 3 : 4.5;
    const ratio = contrastRatio(fg, bg);
    if (ratio + 0.005 < req) {
      const desc = el.tagName.toLowerCase() +
        (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "");
      const key = `${desc}|${req}|${ratio.toFixed(2)}`;
      if (seen.has(key)) {
        seen.get(key).count += 1;
      } else {
        const issue = { cat: "Contrast", sev: "error", msg: "", node: el, count: 1, desc, ratio, req };
        seen.set(key, issue);
        issues.push(issue);
      }
    }
  });
  seen.forEach((it) => {
    it.msg = `${it.desc}: contrast ${it.ratio.toFixed(2)}:1 against its background — WCAG 1.4.3 requires ${it.req}:1 at this text size` +
      (it.count > 1 ? ` (${it.count} instances)` : "") + ".";
  });

  return issues;
}

const CATEGORY_ORDER = ["Headings", "Links", "Images", "Contrast", "Tables"];
const SEV_LABEL = { error: "Fail", warn: "Warning", info: "Review" };

// How long the checker waits after the last edit before rescanning the
// document. Every rule runs continuously in the background regardless of
// which tab is open; this just coalesces a burst of keystrokes or a dragged
// slider into one scan instead of one per change.
const CHECK_DEBOUNCE_MS = 500;

// ---------- Small UI subcomponents -------------------------------------------
// Pairs the native colour swatch with an editable hex text field, so an author
// who already knows the exact accessible hex value (from a brand guide, a
// contrast checker elsewhere, etc.) can type or paste it directly instead of
// dragging the OS picker to match it by eye. The text field only commits on
// blur/Enter — never per keystroke — so an incomplete value being typed (e.g.
// "#1a") never flows into the native swatch or the live document as a broken
// interim colour.
function HexColorField({ value, onChange, ariaLabel, ariaDescribedBy }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);

  const commit = () => {
    let v = text.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((c) => c + c).join("");
    if (/^[0-9a-fA-F]{6}$/.test(v)) {
      const hex = "#" + v.toLowerCase();
      setText(hex);
      if (hex !== value) onChange(hex);
    } else {
      setText(value); // not a valid hex colour — revert rather than leave a broken value showing
    }
  };

  return (
    <>
      <input
        type="color"
        value={value}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => { onChange(e.target.value); setText(e.target.value); }}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.currentTarget.blur(); } }}
        aria-label={`${ariaLabel} hex value`}
        aria-describedby={ariaDescribedBy}
        spellCheck={false}
        maxLength={7}
        style={ui.hexInput}
      />
    </>
  );
}

// ---------- Component --------------------------------------------------------

export default function StyledEditor() {
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [expanded, setExpanded] = useState("h2");
  const [activeId, setActiveId] = useState(null);
  const [focusStyleId, setFocusStyleId] = useState(null); // brief highlight when the cursor jumps to a new style
  const styleRowRefs = useRef({});
  const [newName, setNewName] = useState("");
  const [newBase, setNewBase] = useState("p");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkExisting, setLinkExisting] = useState(false);
  const [linkNewWindow, setLinkNewWindow] = useState(false);
  const savedRange = useRef(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHeaderRow, setTableHeaderRow] = useState(true);
  const [tableHeaderCol, setTableHeaderCol] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outline, setOutline] = useState([]); // nested heading tree for the outline panel
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("styles"); // "styles" | "checker"
  const [issues, setIssues] = useState([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [focusIssue, setFocusIssue] = useState(null);
  const [view, setView] = useState("visual"); // "visual" | "code"
  const [codeText, setCodeText] = useState("");
  const [exportOpen, setExportOpen] = useState(false); // export/download dialog
  const [exportCode, setExportCode] = useState("");
  const exportTextRef = useRef(null);
  const downloadBtnRef = useRef(null); // to restore focus when the dialog closes
  const [marks, setMarks] = useState({ bold: false, italic: false }); // for aria-pressed on B/I
  const [histState, setHistState] = useState({ undo: false, redo: false }); // enables the toolbar buttons
  const history = useRef(createHistory());
  const histTimer = useRef(null);
  const [tbIndex, setTbIndex] = useState(0); // roving tabindex position in the toolbar
  const toolbarRef = useRef(null);
  const editorRef = useRef(null);
  const codeRef = useRef(null);
  const canvasRef = useRef(null);
  const issueRefs = useRef({});
  const loadedRef = useRef(false);
  const saveTimer = useRef(null);
  const checkTimer = useRef(null);
  const codeTimer = useRef(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const viewRef = useRef(view);
  viewRef.current = view;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Export dialog: focus the text on open, close on Escape.
  useEffect(() => {
    if (!exportOpen) return;
    const t = setTimeout(() => {
      if (exportTextRef.current) {
        exportTextRef.current.focus();
        exportTextRef.current.select();
      }
    }, 0);
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); closeExport(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [exportOpen]);

  // Load persisted state once, then seed the editor.
  useEffect(() => {
    (async () => {
      let saved = null;
      try {
        const res = await window.storage.get("styled-editor-state");
        if (res && res.value) saved = JSON.parse(res.value);
      } catch (e) { /* first visit — nothing saved yet */ }
      if (saved && Array.isArray(saved.styles)) {
        // Built-ins: merge saved props onto defaults so shape stays valid.
        const merged = DEFAULT_STYLES.map((d) => {
          const hit = saved.styles.find((s) => s.id === d.id);
          return hit ? { ...d, props: { ...d.props, ...hit.props } } : d;
        });
        // Custom styles carry their full definition in storage.
        const bodyProps = DEFAULT_STYLES.find((d) => d.id === "body").props;
        const customs = saved.styles
          .filter((s) => s.custom && s.id && s.label && s.tag && s.cls)
          .map((s) => ({ id: s.id, label: s.label, tag: s.tag, cls: s.cls, custom: true, props: { ...bodyProps, ...s.props } }));
        setStyles([...merged, ...customs]);
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = saved && saved.content ? saved.content : SEED_HTML.trim();
        // The loaded document is the history's floor — you can't undo past it.
        history.current.reset({ html: editorRef.current.innerHTML, caret: null });
        setHistState({ undo: false, redo: false });
        // Real-time means real-time from the start: the checker and the outline
        // reflect the seed content immediately, not only after the first edit.
        runCheck();
      }
      loadedRef.current = true;
    })();
  }, []);

  const persist = useCallback((nextStyles) => {
    if (!loadedRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        // Never let the checker's highlight class leak into saved content.
        if (editorRef.current) {
          editorRef.current.querySelectorAll(".a11y-flash").forEach((n) => n.classList.remove("a11y-flash"));
        }
        await window.storage.set("styled-editor-state", JSON.stringify({
          styles: (nextStyles || styles).map((s) =>
            s.custom
              ? { id: s.id, label: s.label, tag: s.tag, cls: s.cls, custom: true, props: s.props }
              : { id: s.id, props: s.props }
          ),
          content: editorRef.current ? editorRef.current.innerHTML : "",
        }));
      } catch (e) { /* storage unavailable; editor still works in-memory */ }
    }, 700);
  }, [styles]);

  // Track which style the caret sits in.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode || !editorRef.current) return;
      if (!editorRef.current.contains(sel.anchorNode)) return;
      const b = blockOf(sel.anchorNode, editorRef.current);
      if (!b) { setActiveId(null); return; }
      const tag = b.tagName.toLowerCase();
      const hit =
        styles.find((s) => s.tag === tag && s.cls && b.classList.contains(s.cls)) ||
        styles.find((s) => s.tag === tag && !s.cls);
      const hitId = hit ? hit.id : null;
      // Follow the cursor into the Styles panel — but only when the active
      // style actually changes (moving within the same block shouldn't keep
      // re-fighting a row the author just collapsed by hand), and only while
      // that panel is already open (switching tabs out from under someone
      // reviewing the checker would be its own kind of disruptive). This
      // expands and briefly highlights the row without moving keyboard focus
      // away from the document — doing that on every selection change would
      // make it impossible to keep typing.
      if (hitId && hitId !== activeIdRef.current && tabRef.current === "styles") {
        setExpanded(hitId);
        setFocusStyleId(hitId);
      }
      setActiveId(hitId);
      // Mark state drives aria-pressed on the Bold/Italic buttons, so screen
      // reader users get the same "is this on?" signal the highlight gives
      // sighted users. Read off the DOM, not from queryCommandState.
      setMarks(queryMarks(editorRef.current));
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [styles]);

  // Scroll the newly-active style into view within the panel and fade the
  // highlight after a moment — the same pattern the checker's focusIssue uses.
  useEffect(() => {
    if (!focusStyleId) return;
    const el = styleRowRefs.current[focusStyleId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = setTimeout(() => setFocusStyleId(null), 1200);
    return () => clearTimeout(t);
  }, [focusStyleId]);

  const setProp = (id, key, value) => {
    setStyles((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s));
      persist(next);
      return next;
    });
    // A colour or size change can flip a contrast result, so the checker's
    // picture of the document needs to be redone, not just its own preview badge.
    scheduleCheck();
  };

  // ---- Document outline -------------------------------------------------------
  // A flat NodeList of headings, regrouped into the tree the panel renders.
  // Nesting follows the WordPress List View convention: each heading nests under
  // the nearest *preceding* heading of a strictly lower level, so a skipped level
  // (h1 straight to h3) still nests sensibly instead of leaving a gap in the tree.
  const computeOutline = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) { setOutline([]); return; }
    const heads = [...ed.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const root = [];
    const stack = []; // open branches, outermost first
    heads.forEach((h, i) => {
      const level = Number(h.tagName[1]);
      const item = { id: "outline-" + i, level, text: h.textContent.trim(), node: h, children: [] };
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      if (stack.length === 0) root.push(item);
      else stack[stack.length - 1].children.push(item);
      stack.push(item);
    });
    setOutline(root);
  }, []);

  // ---- History ---------------------------------------------------------------

  const snapshot = () => {
    const ed = editorRef.current;
    return ed ? { html: ed.innerHTML, caret: caretIn(ed) } : null;
  };

  const syncHist = () =>
    setHistState({ undo: history.current.canUndo(), redo: history.current.canRedo() });

  // Typing is coalesced so undo steps land at word-ish granularity rather than
  // one character at a time.
  const recordSoon = () => {
    clearTimeout(histTimer.current);
    histTimer.current = setTimeout(() => {
      const snap = snapshot();
      if (snap) { history.current.push(snap); syncHist(); }
    }, 450);
  };

  // Commands commit any pending typing first, so the pre-command state is its
  // own undo step, then record the result.
  const recordNow = () => {
    clearTimeout(histTimer.current);
    const snap = snapshot();
    if (snap) { history.current.push(snap); syncHist(); }
  };

  const applySnapshot = (snap) => {
    const ed = editorRef.current;
    if (!ed || !snap) return;
    ed.innerHTML = snap.html;
    ed.focus();
    restoreCaret(ed, snap.caret);
    setMarks(queryMarks(ed));
    persist();
    if (viewRef.current === "code") setCodeText(formatHtml(ed.innerHTML));
    scheduleCheck();
  };

  const undo = () => {
    clearTimeout(histTimer.current);
    const back = history.current.undo(snapshot());
    syncHist();
    if (back) applySnapshot(back);
    else flash("Nothing left to undo");
  };

  const redo = () => {
    const fwd = history.current.redo();
    syncHist();
    if (fwd) applySnapshot(fwd);
    else flash("Nothing to redo");
  };

  // Native undo would edit the document behind the snapshot stack's back, so
  // the editable region owns Ctrl+Z / Ctrl+Y outright.
  const onEditorKeyDown = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    else if (k === "b") { e.preventDefault(); inline("bold"); }
    else if (k === "i") { e.preventDefault(); inline("italic"); }
  };

  // ---- Commands --------------------------------------------------------------

  const applyStyle = (s) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    recordNow();
    const block = retagBlock(ed, s.tag, s.cls);
    if (!block) { flash("Place the cursor in a paragraph first"); return; }
    recordNow();
    persist();
    scheduleCheck();
  };

  const inline = (cmd) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    recordNow();
    toggleMark(ed, cmd);
    setMarks(queryMarks(ed));
    recordNow();
    persist();
    scheduleCheck();
  };

  // Opens the table bar with fresh defaults — inserting a table always starts
  // a new one, so unlike the link editor there's no "existing" state to detect.
  const openTableEditor = () => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    setLinkOpen(false);
    setTableRows(3);
    setTableCols(3);
    setTableHeaderRow(true);
    setTableHeaderCol(false);
    setTableOpen(true);
  };

  // Builds a table that is accessible by construction (ATAG 2.0 B1: whatever the
  // tool generates automatically should already be accessible) rather than
  // leaving header association and a caption for the checker to catch after
  // the fact. Column headers get scope="col", row headers get scope="row", and
  // an empty <caption> ships every time — its placeholder text lives in CSS
  // (see .doc-page caption:empty::before below) so it never becomes real
  // content if the author leaves it untouched, and an unfilled caption still
  // shows up as a live checker issue in the meantime.
  const insertTable = () => {
    if (!tableHeaderRow && !tableHeaderCol) {
      flash("Choose a header row, a header column, or both");
      return;
    }
    const cols = Math.max(1, Math.min(10, Number(tableCols) || 1));
    const rawRows = Math.max(1, Math.min(20, Number(tableRows) || 1));
    // A header row with zero data rows underneath would leave nothing to fill
    // in — and there's no add-row tool yet — so it always keeps at least one.
    const rows = tableHeaderRow ? Math.max(rawRows, 2) : rawRows;
    const dataRows = tableHeaderRow ? rows - 1 : rows;

    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    recordNow();

    let html = "<table>\n<caption></caption>\n";
    if (tableHeaderRow) {
      html += "<thead><tr>";
      for (let c = 0; c < cols; c++) html += `<th scope="col">Header ${c + 1}</th>`;
      html += "</tr></thead>\n";
    }
    html += "<tbody>\n";
    for (let r = 0; r < dataRows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += tableHeaderCol && c === 0 ? `<th scope="row">Row ${r + 1}</th>` : "<td></td>";
      }
      html += "</tr>\n";
    }
    html += "</tbody>\n</table>";

    const node = insertBlockAfterCaret(ed, html);
    if (!node) { flash("Place the cursor in the document first"); return; }
    // Land the caret in the caption so the author can start typing a real
    // description right away, instead of clicking into it themselves first.
    const cap = node.querySelector("caption");
    if (cap) {
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(cap);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    recordNow();
    setTableOpen(false);
    persist();
    scheduleCheck();
    flash("Table inserted — add a caption and replace the header labels");
  };

  // ---- Toolbar: ARIA toolbar pattern (roving tabindex) ----------------------
  // A toolbar is one tab stop. Tab moves into it and straight back out; arrow
  // keys move between the controls inside it. Disabled buttons aren't focusable,
  // so they're filtered out of the sequence rather than trapping focus.

  const toolbarItems = useCallback(() => {
    const el = toolbarRef.current;
    if (!el) return [];
    return [...el.querySelectorAll("[data-tbitem]")].filter((b) => !b.disabled);
  }, []);

  // Exactly one control carries tabindex="0"; the rest are -1.
  useLayoutEffect(() => {
    const items = toolbarItems();
    if (items.length === 0) return;
    const active = Math.min(tbIndex, items.length - 1);
    items.forEach((b, i) => { b.tabIndex = i === active ? 0 : -1; });
    // These are what change toolbar membership: styles adds/removes style
    // buttons, view disables the editing controls, and histState enables or
    // disables Undo/Redo. Disabled controls drop out of the arrow-key sequence,
    // so the roving index has to be recomputed when any of them changes.
  }, [toolbarItems, tbIndex, styles, view, histState]);

  const onToolbarKeyDown = (e) => {
    const nav = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!nav.includes(e.key)) return;
    const items = toolbarItems();
    if (items.length === 0) return;
    const cur = items.indexOf(document.activeElement);
    let next;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else {
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      // The toolbar wraps onto multiple rows, so both axes move along the same
      // sequence — matching what the row order looks like on screen.
      next = ((cur === -1 ? 0 : cur) + step + items.length) % items.length;
    }
    e.preventDefault();
    items[next].focus();
    setTbIndex(next);
  };

  // Clicking or tabbing to a control makes it the toolbar's entry point next time.
  const onToolbarFocus = (e) => {
    const i = toolbarItems().indexOf(e.target);
    if (i >= 0) setTbIndex(i);
  };

  // ---- Link editor ----------------------------------------------------------

  const restoreSelection = () => {
    const ed = editorRef.current;
    if (!ed) return null;
    ed.focus();
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    return sel;
  };

  const openLinkEditor = () => {
    const ed = editorRef.current;
    const sel = window.getSelection();
    if (!ed || !sel || sel.rangeCount === 0 || !ed.contains(sel.anchorNode)) {
      flash("Place the cursor in the document first");
      return;
    }
    const a = anchorAt(sel.anchorNode, ed);
    if (!a && sel.isCollapsed) {
      flash("Select the text you want to link");
      return;
    }
    setTableOpen(false);
    savedRange.current = sel.getRangeAt(0).cloneRange();
    setLinkExisting(!!a);
    setLinkUrl(a ? a.getAttribute("href") || "" : "");
    setLinkNewWindow(a ? a.getAttribute("target") === "_blank" : false);
    setLinkOpen(true);
  };

  const applyLink = () => {
    let url = linkUrl.trim();
    if (!url) { flash("Enter a URL for the link"); return; }
    // Bare domains become https links; anchors, mail, tel and paths pass through.
    if (!/^(https?:|mailto:|tel:|#|\/)/i.test(url)) url = "https://" + url;
    const sel = restoreSelection();
    if (!sel) return;
    recordNow();
    const a = setLink(editorRef.current, url, linkNewWindow);
    if (!a) { flash("Select the text you want to link"); return; }
    recordNow();
    setLinkOpen(false);
    persist();
    scheduleCheck();
    flash(linkExisting ? "Link updated" : "Link applied");
  };

  const removeLink = () => {
    const sel = restoreSelection();
    if (!sel) return;
    recordNow();
    const ok = clearLink(editorRef.current);
    recordNow();
    setLinkOpen(false);
    persist();
    scheduleCheck();
    flash(ok ? "Link removed" : "No link at the cursor");
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 1800); };

  // ---- Checker wiring -------------------------------------------------------

  // Runs every rule against the live document. Called on every edit (see
  // scheduleCheck below), not just while the Checker tab is open — the issue
  // list and the tab's badge count are meant to be true continuously, the same
  // way a spellchecker doesn't wait to be asked (ATAG 2.0 Part B: guide authors
  // as they work rather than only on request). The Checker tab is where you
  // *read* the results, not what makes them current.
  const runCheck = useCallback(() => {
    if (!editorRef.current) return;
    const found = runAccessibilityChecks(editorRef.current);
    found.forEach((it, i) => { it.uid = "iss-" + i; });
    setIssues(found);
    setHasChecked(true);
    computeOutline();
  }, [computeOutline]);

  // Debounced entry point every editing command calls after it changes the
  // document or a style — coalesces bursts (typing, dragging a slider) into
  // one recheck instead of one per keystroke.
  const scheduleCheck = useCallback(() => {
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(runCheck, CHECK_DEBOUNCE_MS);
  }, [runCheck]);

  // ---- Document → checker overlays -----------------------------------------
  // Badges are absolutely positioned inside the (relative, scrolling) canvas,
  // so they ride along with the content when it scrolls. We compute positions
  // from live geometry and never touch the document DOM — badges are React
  // siblings of the editable region, so they never enter innerHTML/export.
  const computeOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const ed = editorRef.current;
    if (tabRef.current !== "checker" || viewRef.current !== "visual" || !canvas || !ed) {
      setOverlays((o) => (o.length ? [] : o));
      return;
    }
    const cRect = canvas.getBoundingClientRect();
    const rank = { error: 3, warn: 2, info: 1 };
    // Group every issue that points at a live element by that element.
    const groups = new Map();
    issues.forEach((it) => {
      if (!it.node || !it.node.isConnected || !ed.contains(it.node)) return;
      if (!groups.has(it.node)) groups.set(it.node, []);
      groups.get(it.node).push(it);
    });
    const list = [];
    groups.forEach((items, node) => {
      const r = node.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const worst = items.reduce((a, b) => (rank[b.sev] > rank[a.sev] ? b : a));
      list.push({
        uid: worst.uid,
        sev: worst.sev,
        count: items.length,
        cats: [...new Set(items.map((i) => i.cat))],
        top: r.top - cRect.top + canvas.scrollTop,
        left: r.left - cRect.left + canvas.scrollLeft,
        width: r.width,
        height: r.height,
      });
    });
    setOverlays(list);
  }, [issues]);

  useLayoutEffect(() => { computeOverlays(); }, [computeOverlays, tab, view, styles]);

  useEffect(() => {
    const onResize = () => computeOverlays();
    window.addEventListener("resize", onResize);
    // Reflows from font loading or style tweaks can shift geometry after paint.
    const ro = new ResizeObserver(onResize);
    if (editorRef.current) ro.observe(editorRef.current);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  }, [computeOverlays]);

  // Jump from a document badge to its issue in the checker list.
  const jumpToIssue = (uid) => {
    setTab("checker");
    setFocusIssue(uid);
  };

  // Scroll the targeted issue into view and flash it once the panel is showing it.
  useEffect(() => {
    if (!focusIssue) return;
    const el = issueRefs.current[focusIssue];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFocusIssue(null), 1700);
    return () => clearTimeout(t);
  }, [focusIssue, tab, issues]);

  const onEditorInput = () => {
    persist();
    recordSoon();
    scheduleCheck();
  };

  const locate = (node) => {
    if (!node || !node.isConnected) {
      flash("That element has changed — run the check again");
      runCheck();
      return;
    }
    // The document canvas has to be visible before we can scroll to anything in it.
    if (viewRef.current === "code") setView("visual");
    setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.classList.add("a11y-flash");
      setTimeout(() => node.classList.remove("a11y-flash"), 1600);
    }, viewRef.current === "code" ? 60 : 0);
  };

  const insertDemo = () => {
    const ed = editorRef.current;
    if (!ed) return;
    recordNow();
    ed.insertAdjacentHTML("beforeend", DEMO_HTML.trim());
    recordNow();
    persist();
    runCheck();
    flash("Sample content added at the end of the document");
  };

  // ---- Visual / code view ---------------------------------------------------

  // Push edited source into the document. The div stays mounted (just hidden)
  // while in code view, so persistence and the checker keep working unchanged.
  const applyCode = useCallback((text) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.innerHTML = sanitizeHtml(text);
    // Source edits are undoable alongside visual ones — one history, both views.
    recordNow();
    persist();
    scheduleCheck();
  }, [persist, scheduleCheck]);

  // Apply any pending (debounced) code edits right now.
  const flushCode = useCallback(() => {
    if (viewRef.current !== "code" || !codeRef.current) return;
    clearTimeout(codeTimer.current);
    applyCode(codeRef.current.value);
  }, [applyCode]);

  const switchView = (next) => {
    if (next === view) return;
    // Leaving code view: commit pending edits so every view sees the same document.
    if (view === "code") flushCode();
    if (next === "code") {
      setCodeText(editorRef.current ? formatHtml(editorRef.current.innerHTML) : "");
    }
    setView(next);
  };

  const onCodeInput = (e) => {
    const text = e.target.value;
    setCodeText(text);
    clearTimeout(codeTimer.current);
    codeTimer.current = setTimeout(() => applyCode(text), 600);
  };

  // ---- Style sheet view -----------------------------------------------------

  const fontLabel = (value) => {
    const hit = FONTS.find((f) => f.value === value);
    return hit ? hit.label : value.split(",")[0].replace(/["']/g, "");
  };
  const weightLabel = (value) => {
    const hit = WEIGHTS.find((w) => w.value === value);
    return hit ? hit.label : String(value);
  };

  // Contrast of a style definition against the background it renders on.
  const styleContrast = (s) => {
    const bgHex = s.cls === "callout" ? "#eef4f2" : "#fdfdfb";
    const fg = parseColor(s.props.color);
    const bg = parseColor(bgHex);
    if (!fg || !bg) return null;
    const large = s.props.size >= 24 || (s.props.size >= 18.66 && s.props.weight >= 700);
    const req = large ? 3 : 4.5;
    const ratio = contrastRatio(fg, bg);
    return { ratio, req, pass: ratio + 0.005 >= req };
  };

  // Live contrast readout shown beside a colour picker. The verdict is carried by
  // the words ("passes"/"needs"), not by the badge colour, so it doesn't itself
  // depend on colour perception (WCAG 1.4.1). It's wired to the picker with
  // aria-describedby so the ratio is announced when the picker takes focus.
  const contrastBadge = (id, ratio, req, against, verb = "passes") => {
    const pass = ratio + 0.005 >= req;
    return (
      <span key={id} id={id}
        style={{ ...ui.panelBadge, ...(pass ? ui.panelBadgePass : ui.panelBadgeFail) }}>
        {ratio.toFixed(2)}:1 {against} · {pass ? verb : "needs"} {req}:1
      </span>
    );
  };

  const editStyle = (id) => {
    setTab("styles");
    setExpanded(id);
    flash("Style opened in the panel");
  };

  // Recursive renderer for the outline tree computeOutline() builds. Indentation
  // tracks recursion depth, not the raw heading number, so a heading that skips
  // a level (h1 straight to h3) still nests one step in, not two — the same
  // "structure over literal level" rule WordPress's List View follows.
  const renderOutlineItems = (items, depth) =>
    items.map((item) => (
      <div key={item.id}>
        <button
          onClick={() => locate(item.node)}
          style={{ ...ui.outlineItem, paddingLeft: 14 + depth * 16 }}
          title={`Jump to “${item.text || "(empty heading)"}”`}
        >
          <span style={ui.outlineLevel}>H{item.level}</span>
          <span style={ui.outlineText}>{item.text || "(Empty heading)"}</span>
        </button>
        {item.children.length > 0 && renderOutlineItems(item.children, depth + 1)}
      </div>
    ));

  const copyCss = async () => {
    // Matches what Export HTML embeds, container rule included — minus the :root
    // declaration, which would otherwise clobber the font size of whatever page
    // this CSS is pasted into.
    const css = `${exportDocRule(".document")}\n${buildExportStylesheet(styles, ".document")}`;
    const ok = await copyText(css);
    flash(ok ? "Stylesheet copied to clipboard" : "Couldn't copy — select the CSS and copy manually");
  };

  const errCount = issues.filter((i) => i.sev === "error").length;
  const warnCount = issues.filter((i) => i.sev === "warn").length;
  const infoCount = issues.filter((i) => i.sev === "info").length;
  const summaryText = !hasChecked
    ? "Not run yet."
    : issues.length === 0
      ? "No issues found."
      : `${errCount} fail${errCount === 1 ? "" : "s"}, ${warnCount} warning${warnCount === 1 ? "" : "s"}, ${infoCount} to review.`;

  // ---- Export ----------------------------------------------------------------

  // Builds the full, standalone HTML document (stylesheet embedded).
  // Deliberately ships no background/card chrome — that framing is editor-only.
  // The export centers the content at a readable width with padding, so it drops
  // cleanly onto whatever page it's pasted into and inherits that page's background.
  const buildDocumentHtml = () => {
    const css = buildExportStylesheet(styles, ".document");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Document</title>
<style>
:root { font-size: ${EXPORT_ROOT_FONT}; }
body { margin: 0; }
${exportDocRule(".document")}
${css}
</style>
</head>
<body>
<article class="document">
${editorRef.current ? editorRef.current.innerHTML : ""}
</article>
</body>
</html>`;
  };

  const exportHtml = () => {
    flushCode();
    const html = buildDocumentHtml();
    // Attempt a real file download for environments that permit it...
    tryDownload("document.html", html, "text/html");
    // ...and always open the dialog so there's a guaranteed way to retrieve the
    // HTML even if the sandbox blocked the download.
    setExportCode(html);
    setExportOpen(true);
  };

  const copyHtml = async () => {
    flushCode();
    const ok = await copyText(buildDocumentHtml());
    flash(ok ? "HTML copied to clipboard" : "Couldn't copy — use Export HTML to get the file");
  };

  const copyExport = async () => {
    const ok = await copyText(exportCode);
    flash(ok ? "HTML copied to clipboard" : "Select the text below and copy manually");
  };

  const closeExport = () => {
    setExportOpen(false);
    // Return focus to the button that opened the dialog (WCAG 2.4.3 focus order).
    if (downloadBtnRef.current) downloadBtnRef.current.focus();
  };

  const resetStyles = () => {
    setStyles((prev) => {
      const next = [...DEFAULT_STYLES, ...prev.filter((s) => s.custom)];
      persist(next);
      return next;
    });
    flash("Built-in styles reset to defaults");
    scheduleCheck();
  };

  // ---- Custom styles --------------------------------------------------------

  const createStyle = () => {
    const name = newName.trim();
    if (!name) { flash("Give the style a name first"); return; }
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) { flash("The name needs at least one letter or number"); return; }
    // Guarantee a unique class/id even for repeated names.
    let final = slug, n = 2;
    while (styles.some((s) => s.cls === final || s.id === "custom-" + final)) final = `${slug}-${n++}`;
    const base = styles.find((s) => s.tag === newBase && !s.cls) || styles.find((s) => s.id === "body");
    const style = {
      id: "custom-" + final,
      label: name,
      tag: newBase,
      cls: final,
      custom: true,
      props: { ...base.props },
    };
    setStyles((prev) => {
      const next = [...prev, style];
      persist(next);
      return next;
    });
    setExpanded(style.id);
    setNewName("");
    flash(`Style “${name}” created as ${newBase}.${final}`);
  };

  const deleteStyle = (s) => {
    // Blocks using the style keep their semantic tag; only the class is removed.
    if (editorRef.current) {
      editorRef.current.querySelectorAll(`${s.tag}.${s.cls}`).forEach((el) => el.classList.remove(s.cls));
    }
    setStyles((prev) => {
      const next = prev.filter((x) => x.id !== s.id);
      persist(next);
      return next;
    });
    if (expanded === s.id) setExpanded(null);
    flash(`Style “${s.label}” deleted — its blocks are now plain ${s.tag}`);
    scheduleCheck();
  };

  const docCss = buildStylesheet(styles, ".doc-page");

  return (
    <div style={ui.app}>
      <style>{`
        ${docCss}
        .doc-page:focus { outline: none; }
        .doc-page > *:first-child { margin-top: 0; }
        /* Visual-only nudge for a table just inserted via insertTable() — its
           <caption> starts empty rather than pre-filled with real placeholder
           text, so it can't accidentally ship un-edited. CSS generated content
           isn't reliably exposed to assistive tech, so this hint is sighted-only;
           an unfilled caption still gets its own live issue in the checker below,
           which is where it's actually surfaced to every author. */
        .doc-page caption:empty::before {
          content: "Click to add a table caption";
          color: #8a857a;
          font-style: italic;
        }
        .a11y-flash { outline: 3px solid #e07b39 !important; outline-offset: 3px; border-radius: 2px; }
        button:focus-visible, select:focus-visible, input:focus-visible {
          outline: 2px solid #0e8a7d; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media (max-width: 860px) {
          .layout { flex-direction: column !important; }
          .panel { width: 100% !important; max-height: 45vh; }
        }
        input[type=range] { accent-color: #0e8a7d; }
        input[type=color] { border: none; padding: 0; background: none; width: 34px; height: 24px; cursor: pointer; }
      `}</style>

      {/* Toolbar — banner landmark, single tab stop, arrow keys move between controls */}
      <header style={ui.header}>
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Document formatting"
          aria-controls="doc-editor"
          onKeyDown={onToolbarKeyDown}
          onFocus={onToolbarFocus}
          style={ui.toolbar}
        >
          <span style={ui.brand}>Styled<span style={{ color: "#0e8a7d" }}>Editor</span></span>
          <span style={ui.tbDivider} aria-hidden="true" />
          {styles.filter((s) => !s.inline).map((s) => (
            <button key={s.id} data-tbitem onClick={() => applyStyle(s)}
              aria-label={`${s.label} style`}
              aria-pressed={activeId === s.id}
              title={`Apply ${s.label} to current block`}
              disabled={view !== "visual"}
              style={{ ...ui.tbBtn, ...(activeId === s.id ? ui.tbBtnActive : null), ...(view !== "visual" ? ui.tbBtnDisabled : null) }}>
              {s.short || s.label}
            </button>
          ))}
          <span style={ui.tbDivider} aria-hidden="true" />
          <button data-tbitem onClick={() => inline("bold")} disabled={view !== "visual"}
            style={{ ...ui.tbBtn, fontWeight: 700, ...(view !== "visual" ? ui.tbBtnDisabled : null) }}
            aria-label="Bold" aria-pressed={marks.bold} title="Bold">B</button>
          <button data-tbitem onClick={() => inline("italic")} disabled={view !== "visual"}
            style={{ ...ui.tbBtn, fontStyle: "italic", ...(view !== "visual" ? ui.tbBtnDisabled : null) }}
            aria-label="Italic" aria-pressed={marks.italic} title="Italic">I</button>
          <button data-tbitem onClick={openLinkEditor} disabled={view !== "visual"}
            style={{ ...ui.tbBtn, ...(view !== "visual" ? ui.tbBtnDisabled : null) }}
            aria-expanded={linkOpen}
            title="Add or edit a link">Link</button>
          <button data-tbitem onClick={openTableEditor} disabled={view !== "visual"}
            style={{ ...ui.tbBtn, ...(view !== "visual" ? ui.tbBtnDisabled : null) }}
            aria-expanded={tableOpen}
            title='Insert a table with a caption and scoped headers already in place'>Table</button>
          {/* TODO — not yet built: an "Insert image" command. There is currently no
              way to add an image except through Code view or the demo content, so
              a missing/empty alt attribute only ever surfaces after the fact, in
              the checker. ATAG 2.0 B2 asks for alt text to be requested at the
              moment of insertion — the same "accessible by construction" approach
              insertTable() takes for captions and <th scope> above — so a future
              image tool should prompt for (or require) alt text as part of the
              insert step itself, not leave it for later review. */}
          <span style={ui.tbDivider} aria-hidden="true" />
          <button data-tbitem onClick={undo} disabled={view !== "visual" || !histState.undo}
            style={{ ...ui.tbBtn, ...(view !== "visual" || !histState.undo ? ui.tbBtnDisabled : null) }}
            aria-label="Undo" title="Undo (Ctrl+Z)">↶</button>
          <button data-tbitem onClick={redo} disabled={view !== "visual" || !histState.redo}
            style={{ ...ui.tbBtn, ...(view !== "visual" || !histState.redo ? ui.tbBtnDisabled : null) }}
            aria-label="Redo" title="Redo (Ctrl+Y)">↷</button>
          <span style={ui.tbDivider} aria-hidden="true" />
          <button data-tbitem onClick={() => setOutlineOpen((o) => !o)}
            aria-pressed={outlineOpen} aria-controls="doc-outline-panel"
            style={{ ...ui.tbBtn, ...(outlineOpen ? ui.tbBtnActive : null) }}
            title="Show a nested list of the document's headings">Outline</button>
          <span style={{ flex: 1 }} />
          <div style={ui.viewSwitch} role="group" aria-label="Editor view">
            <button data-tbitem onClick={() => switchView("visual")} aria-pressed={view === "visual"}
              style={{ ...ui.viewBtn, ...(view === "visual" ? ui.viewBtnActive : null) }}>
              Visual
            </button>
            <button data-tbitem onClick={() => switchView("code")} aria-pressed={view === "code"}
              style={{ ...ui.viewBtn, ...(view === "code" ? ui.viewBtnActive : null) }}>
              Code
            </button>
            <button data-tbitem onClick={() => switchView("stylesheet")} aria-pressed={view === "stylesheet"}
              style={{ ...ui.viewBtn, ...(view === "stylesheet" ? ui.viewBtnActive : null) }}>
              Style sheet
            </button>
          </div>
          <span style={ui.tbDivider} aria-hidden="true" />
          <button data-tbitem onClick={copyHtml} style={ui.tbBtn}>Copy HTML</button>
          <button data-tbitem ref={downloadBtnRef} onClick={exportHtml}
            style={{ ...ui.tbBtn, background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" }}>
            Export HTML
          </button>
        </div>

      {/* Link editor bar */}
      {linkOpen && (
        <div style={ui.linkBar} role="group" aria-label="Link editor">
          <span style={ui.linkBarLabel}>{linkExisting ? "Edit link" : "Add link"}</span>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
            placeholder="https://example.com"
            aria-label="Link URL"
            autoFocus
            style={ui.linkInput}
          />
          <label style={ui.linkCheck}>
            <input
              type="checkbox"
              checked={linkNewWindow}
              onChange={(e) => setLinkNewWindow(e.target.checked)}
              style={{ accentColor: "#0e8a7d" }}
            />
            Open in new window
          </label>
          <button onClick={applyLink} style={{ ...ui.tbBtn, background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" }}>
            {linkExisting ? "Update" : "Apply"}
          </button>
          {linkExisting && (
            <button onClick={removeLink} style={{ ...ui.tbBtn, borderColor: "#7a3a3e", color: "#e08a8e" }}>
              Remove link
            </button>
          )}
          <button onClick={() => setLinkOpen(false)} style={ui.tbBtn}>Cancel</button>
        </div>
      )}

      {/* Table insert bar */}
      {tableOpen && (
        <div style={ui.linkBar} role="group" aria-label="Insert table">
          <span style={ui.linkBarLabel}>Insert table</span>
          <label style={ui.tableField}>
            <span style={ui.fieldLabel}>Rows</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={(e) => setTableRows(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setTableOpen(false); }}
              aria-label="Number of rows"
              autoFocus
              style={ui.tableNumInput}
            />
          </label>
          <label style={ui.tableField}>
            <span style={ui.fieldLabel}>Columns</span>
            <input
              type="number"
              min={1}
              max={10}
              value={tableCols}
              onChange={(e) => setTableCols(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setTableOpen(false); }}
              aria-label="Number of columns"
              style={ui.tableNumInput}
            />
          </label>
          <label style={ui.linkCheck}>
            <input
              type="checkbox"
              checked={tableHeaderRow}
              onChange={(e) => setTableHeaderRow(e.target.checked)}
              style={{ accentColor: "#0e8a7d" }}
            />
            Header row
          </label>
          <label style={ui.linkCheck}>
            <input
              type="checkbox"
              checked={tableHeaderCol}
              onChange={(e) => setTableHeaderCol(e.target.checked)}
              style={{ accentColor: "#0e8a7d" }}
            />
            Header column
          </label>
          <button onClick={insertTable}
            title="Every table needs a header row, a header column, or both, so screen readers can announce what each cell means"
            style={{ ...ui.tbBtn, background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" }}>
            Insert
          </button>
          <button onClick={() => setTableOpen(false)} style={ui.tbBtn}>Cancel</button>
        </div>
      )}
      </header>

      {/* Main layout */}
      <div className="layout" style={ui.layout}>
        {/* Document outline — a WordPress-List-View-style nested heading tree,
            toggled from the "Outline" toolbar button. Purely a navigation aid:
            clicking a heading reuses locate(), the same scroll-and-flash the
            checker's "Show" buttons use, so jumping to a heading behaves
            identically however you got there. */}
        {outlineOpen && (
          <aside id="doc-outline-panel" className="panel outline-panel" style={ui.outlinePanel} aria-label="Document outline">
            <div style={ui.panelHead}>
              <div>
                <div style={ui.panelTitle}>Document outline</div>
                <div style={ui.panelSub}>Headings in this document, nested by level</div>
              </div>
              <button onClick={() => setOutlineOpen(false)} style={ui.resetBtn} aria-label="Close document outline">
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0 16px" }}>
              {outline.length === 0 ? (
                <p style={{ ...ui.emptyState, padding: "0 16px" }}>
                  No headings yet. Apply a Heading 1–6 style to a paragraph to build the outline.
                </p>
              ) : (
                renderOutlineItems(outline, 0)
              )}
            </div>
          </aside>
        )}

        {/* Document canvas */}
        <main style={ui.canvas} ref={canvasRef} aria-label="Document">
          {/* role="textbox" + aria-multiline is the standard pairing for a custom
              editable region: without an explicit role, some browser/screen-reader
              combinations don't recognise a bare contenteditable as editable and
              never switch into forms mode, leaving it impossible to type into.
              The tradeoff is that in forms mode the region reads as a text field,
              so heading-key navigation inside it is limited — the exported document
              is where that structure is navigated. ARIA has no richer editable role;
              W3C closed the rich-text-editing role request as won't-fix. */}
          <div
            id="doc-editor"
            className="doc-page"
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={onEditorInput}
            onKeyDown={onEditorKeyDown}
            role="textbox"
            aria-multiline="true"
            aria-label="Document content"
            style={{ ...ui.page, display: view === "visual" ? "block" : "none" }}
          />
          {view === "code" && (
            <div style={ui.codeWrap}>
              <div style={ui.codeBar}>
                <span>HTML source</span>
                <span style={ui.codeBarHint}>Edits sync back to the document · malformed markup is repaired on parse</span>
              </div>
              <textarea
                ref={codeRef}
                value={codeText}
                onChange={onCodeInput}
                spellCheck={false}
                aria-label="HTML source of the document"
                style={ui.codeArea}
              />
            </div>
          )}

          {view === "stylesheet" && (
            <div style={ui.specimenPage}>
              <div style={ui.specimenHead}>
                <h2 style={ui.specimenTitle}>Active styles</h2>
                <p style={ui.specimenSub}>
                  Every named style in this document, rendered as it currently looks. Edit any of them
                  from the Styles panel — the specimen and the document update together.
                </p>
              </div>

              {styles.map((s) => {
                const p = s.props;
                const c = styleContrast(s);
                const isCallout = s.cls === "callout";
                const bodyProps = styles.find((x) => x.id === "body").props;
                const linkVsBody = s.inline
                  ? contrastRatio(parseColor(p.color) || { r: 0, g: 0, b: 0 }, parseColor(bodyProps.color) || { r: 255, g: 255, b: 255 })
                  : null;
                return (
                  <div key={s.id} style={ui.specimenRow}>
                    <div style={ui.specimenMetaTop}>
                      <span style={ui.specimenSelector}>{s.tag}{s.cls ? "." + s.cls : ""}</span>
                      <span style={{ flex: 1 }} />
                      {c && (
                        <span style={{ ...ui.contrastBadge, ...(c.pass ? ui.contrastPass : ui.contrastFail) }}>
                          {c.ratio.toFixed(2)}:1 {c.pass ? `· passes ${c.req}:1` : `· needs ${c.req}:1`}
                        </span>
                      )}
                      {s.inline && (p.underline ? (
                        <span style={{ ...ui.contrastBadge, ...ui.contrastPass }}>
                          underlined · colour-independent
                        </span>
                      ) : (
                        <span style={{ ...ui.contrastBadge, ...(linkVsBody + 0.005 >= 3 ? ui.contrastPass : ui.contrastFail) }}>
                          vs body {linkVsBody.toFixed(2)}:1 {linkVsBody + 0.005 >= 3 ? "· meets 3:1" : "· needs 3:1"}
                        </span>
                      ))}
                      <button onClick={() => editStyle(s.id)} style={ui.specimenEditBtn}
                        aria-label={`Edit the ${s.label} style`}>
                        Edit
                      </button>
                    </div>

                    {s.inline ? (
                      <span style={{
                        fontFamily: bodyProps.font,
                        fontSize: bodyProps.size,
                        fontWeight: bodyProps.weight,
                        color: bodyProps.color,
                        lineHeight: 1.6,
                        display: "block",
                      }}>
                        Body text with{" "}
                        <span style={{
                          color: p.color,
                          fontWeight: p.weight,
                          fontStyle: p.italic ? "italic" : "normal",
                          textDecoration: p.underline ? "underline" : "none",
                          textUnderlineOffset: "0.12em",
                        }}>
                          a sample link
                        </span>{" "}
                        shown in context.
                      </span>
                    ) : (
                      <div style={isCallout
                        ? { background: "#eef4f2", border: "1px solid #d3e2dd", borderRadius: 6, padding: "0.85em 1em" }
                        : null}>
                        <span style={{
                          fontFamily: p.font,
                          fontSize: p.size,
                          fontWeight: p.weight,
                          color: p.color,
                          fontStyle: p.italic ? "italic" : "normal",
                          letterSpacing: `${p.tracking}em`,
                          lineHeight: p.size > 22 ? 1.22 : 1.6,
                          textTransform: p.caps === "uppercase" ? "uppercase" : "none",
                          fontVariantCaps: p.caps === "smallcaps" ? "small-caps" : "normal",
                          display: "block",
                        }}>
                          {s.label} — grumpy wizards make toxic brew
                        </span>
                      </div>
                    )}

                    <div style={ui.specimenMeta}>
                      {s.inline ? (
                        <>
                          Inherits typeface and size from context · {weightLabel(p.weight)}
                          {p.italic ? " · Italic" : ""}
                          {p.underline ? " · Underlined" : " · No underline"}
                          {" · "}
                          <span style={{ ...ui.specimenSwatch, background: p.color }} aria-hidden="true" />
                          <span style={ui.specimenMono}>{p.color}</span>
                        </>
                      ) : (
                        <>
                          {fontLabel(p.font)} · {p.size}px · {weightLabel(p.weight)}
                          {p.italic ? " · Italic" : ""}
                          {p.caps !== "none" ? ` · ${p.caps === "uppercase" ? "Uppercase" : "Small caps"}` : ""}
                          {" · "}
                          <span style={{ ...ui.specimenSwatch, background: p.color }} aria-hidden="true" />
                          <span style={ui.specimenMono}>{p.color}</span>
                          {" · tracking "}{p.tracking.toFixed(3)}em
                          {" · space "}{p.before.toFixed(2)}/{p.after.toFixed(2)}em
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={ui.cssSection}>
                <div style={ui.cssSectionHead}>
                  <h3 style={ui.cssSectionTitle}>Generated stylesheet</h3>
                  <button onClick={copyCss} style={ui.specimenEditBtn}>Copy CSS</button>
                </div>
                <p style={ui.specimenSub}>
                  This is exactly what ships inside the exported HTML — one rule per named style, plus the
                  fixed structural rules for quotes, callouts, tables and images. Lengths are in rem so the
                  document scales with the reader's browser font size; the editor preview above renders the
                  same definitions in pixels.
                </p>
                <pre style={ui.cssPre}><code>{`${exportDocRule(".document")}\n${buildExportStylesheet(styles, ".document")}`}</code></pre>
              </div>
            </div>
          )}

          {/* Accessibility overlays — point from a flagged element into the checker */}
          {tab === "checker" && view === "visual" && overlays.flatMap((o) => {
            const tone = o.sev === "error" ? ui.ovError : o.sev === "warn" ? ui.ovWarn : ui.ovInfo;
            const label = `${SEV_LABEL[o.sev]}${o.count > 1 ? " ×" + o.count : ""}`;
            const aria = `${SEV_LABEL[o.sev]}: ${o.cats.join(" and ")} ${o.count > 1 ? `(${o.count} issues)` : "issue"} on this element. Activate to view it in the accessibility checker.`;
            return [
              <div key={o.uid + "-box"} aria-hidden="true"
                style={{ ...ui.overlayBox, top: o.top, left: o.left, width: o.width, height: o.height, borderColor: tone.background }} />,
              <button key={o.uid + "-badge"} onClick={() => jumpToIssue(o.uid)}
                title={aria} aria-label={aria}
                style={{ ...ui.overlayBadge, ...tone, top: o.top, left: o.left + o.width }}>
                {label}
              </button>,
            ];
          })}
        </main>

        {/* Right panel: Styles / Checker */}
        <aside className="panel" style={ui.panel} aria-label="Styles and accessibility checker">
          <div style={ui.tabs}>
            <button onClick={() => setTab("styles")} aria-pressed={tab === "styles"}
              style={{ ...ui.tabBtn, ...(tab === "styles" ? ui.tabBtnActive : null) }}>
              Styles
            </button>
            <button onClick={() => setTab("checker")} aria-pressed={tab === "checker"}
              style={{ ...ui.tabBtn, ...(tab === "checker" ? ui.tabBtnActive : null) }}>
              Checker{hasChecked && issues.length > 0 ? ` (${issues.length})` : ""}
            </button>
          </div>

          {tab === "styles" && (
            <>
              <div style={ui.panelHead}>
                <div>
                  <div style={ui.panelTitle}>Named styles</div>
                  <div style={ui.panelSub}>Defined once · applied everywhere · saved between visits</div>
                </div>
                <button onClick={resetStyles} style={ui.resetBtn}>Reset</button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {styles.map((s) => {
                  const p = s.props;
                  const open = expanded === s.id;
                  return (
                    <div key={s.id}
                      ref={(el) => { if (el) styleRowRefs.current[s.id] = el; }}
                      style={{ borderBottom: "1px solid #2c3238", ...(focusStyleId === s.id ? ui.styleRowFocus : null) }}>
                      {/* Row previews itself in its own style */}
                      <button
                        onClick={() => setExpanded(open ? null : s.id)}
                        style={{ ...ui.styleRow, background: open ? "#262c33" : "transparent" }}
                        aria-expanded={open}
                      >
                        <span style={{
                          fontFamily: p.font,
                          fontSize: Math.min(p.size || 16, 21),
                          fontWeight: p.weight,
                          color: "#f2f1ed",
                          fontStyle: p.italic ? "italic" : "normal",
                          letterSpacing: p.tracking != null ? `${p.tracking}em` : undefined,
                          textDecoration: s.inline && p.underline ? "underline" : "none",
                          textUnderlineOffset: "0.12em",
                          textTransform: p.caps === "uppercase" ? "uppercase" : "none",
                          fontVariantCaps: p.caps === "smallcaps" ? "small-caps" : "normal",
                        }}>
                          {s.label}
                        </span>
                        <span style={ui.rowMeta}>
                          <span style={{ ...ui.swatch, background: p.color }} />
                          {s.tag}{s.cls ? "." + s.cls : ""} · {s.inline ? "inline" : `${p.size}px`}{s.custom ? " · custom" : ""}
                          <span style={{ marginLeft: 8, opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
                        </span>
                      </button>

                      {open && s.inline && (
                        <div style={ui.controls}>
                          <div style={ui.panelSub}>
                            Applies to every link in the document. Links inherit typeface and size from
                            their surrounding text.
                          </div>
                          <div style={ui.field}>
                            <span style={ui.fieldLabel}>Color</span>
                            <div style={ui.colorRow}>
                              <HexColorField value={p.color} onChange={(v) => setProp(s.id, "color", v)}
                                ariaLabel="Link colour" ariaDescribedBy={`${s.id}-c-page ${s.id}-c-body`} />
                              {(() => {
                                const bodyProps = styles.find((x) => x.id === "body").props;
                                const fg = parseColor(p.color);
                                const page = parseColor("#fdfdfb");
                                const body = parseColor(bodyProps.color);
                                if (!fg || !page || !body) return null;
                                const readable = contrastBadge(`${s.id}-c-page`, contrastRatio(fg, page), 4.5, "on page");
                                // WebAIM's link-contrast method applies only when colour is
                                // the sole cue. An underlined link already carries a
                                // non-colour cue, so testing it at 3:1 would flag a
                                // compliant default — mirrors the specimen panel.
                                const distinguishable = p.underline ? (
                                  <span key={`${s.id}-c-body`} id={`${s.id}-c-body`}
                                    style={{ ...ui.panelBadge, ...ui.panelBadgeMuted }}>
                                    underlined · not colour-only
                                  </span>
                                ) : contrastBadge(`${s.id}-c-body`, contrastRatio(fg, body), 3, "vs body text", "meets");
                                return [readable, distinguishable];
                              })()}
                            </div>
                          </div>
                          <div style={ui.fieldRow}>
                            <label style={{ ...ui.field, flex: 1 }}>
                              <span style={ui.fieldLabel}>Weight</span>
                              <select value={p.weight} onChange={(e) => setProp(s.id, "weight", Number(e.target.value))} style={ui.select}>
                                {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                              </select>
                            </label>
                            {/* Toggle buttons, not labelled controls: a <label> doesn't
                                associate with a <button>, so these are named by the field
                                text via aria-labelledby and expose state with aria-pressed. */}
                            <div style={{ ...ui.field, width: 110 }}>
                              <span id={`${s.id}-underline-lbl`} style={ui.fieldLabel}>Underline</span>
                              <button onClick={() => setProp(s.id, "underline", !p.underline)}
                                aria-labelledby={`${s.id}-underline-lbl`}
                                aria-pressed={p.underline}
                                style={{ ...ui.toggle, ...(p.underline ? ui.toggleOn : null) }}>
                                {p.underline ? "On" : "Off"}
                              </button>
                            </div>
                            <div style={{ ...ui.field, width: 88 }}>
                              <span id={`${s.id}-italic-lbl`} style={ui.fieldLabel}>Italic</span>
                              <button onClick={() => setProp(s.id, "italic", !p.italic)}
                                aria-labelledby={`${s.id}-italic-lbl`}
                                aria-pressed={p.italic}
                                style={{ ...ui.toggle, ...(p.italic ? ui.toggleOn : null) }}>
                                {p.italic ? "On" : "Off"}
                              </button>
                            </div>
                          </div>
                          {!p.underline && (
                            <div style={ui.linkWarning}>
                              Underline is off, so colour is the only thing marking links. The checker now
                              tests link colour against surrounding text (3:1, per WebAIM's link-contrast
                              method) — and WCAG 1.4.1 still expects a non-colour cue on hover and focus.
                            </div>
                          )}
                        </div>
                      )}

                      {open && !s.inline && (
                        <div style={ui.controls}>
                          <label style={ui.field}>
                            <span style={ui.fieldLabel}>Typeface</span>
                            <select value={p.font} onChange={(e) => setProp(s.id, "font", e.target.value)} style={ui.select}>
                              {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
                            </select>
                          </label>

                          <div style={ui.fieldRow}>
                            <label style={{ ...ui.field, flex: 1 }}>
                              <span style={ui.fieldLabel}>Size — {p.size}px</span>
                              <input type="range" min={10} max={48} step={0.5} value={p.size}
                                onChange={(e) => setProp(s.id, "size", Number(e.target.value))} />
                            </label>
                            <label style={{ ...ui.field, width: 110 }}>
                              <span style={ui.fieldLabel}>Weight</span>
                              <select value={p.weight} onChange={(e) => setProp(s.id, "weight", Number(e.target.value))} style={ui.select}>
                                {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                              </select>
                            </label>
                          </div>

                          <div style={ui.field}>
                            <span style={ui.fieldLabel}>Color</span>
                            <div style={ui.colorRow}>
                              <HexColorField value={p.color} onChange={(v) => setProp(s.id, "color", v)}
                                ariaLabel={`${s.label} colour`} ariaDescribedBy={`${s.id}-c-bg`} />
                              {(() => {
                                const c = styleContrast(s);
                                if (!c) return null;
                                // The threshold follows this style's own size and weight,
                                // so a large heading is judged at 3:1 and body copy at 4.5:1.
                                return contrastBadge(`${s.id}-c-bg`, c.ratio, c.req,
                                  s.cls === "callout" ? "on callout" : "on page");
                              })()}
                            </div>
                          </div>

                          <div style={ui.fieldRow}>
                            <label style={{ ...ui.field, flex: 1 }}>
                              <span style={ui.fieldLabel}>Case</span>
                              <select value={p.caps} onChange={(e) => setProp(s.id, "caps", e.target.value)} style={ui.select}>
                                {CASES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </label>
                            <div style={{ ...ui.field, width: 88 }}>
                              <span id={`${s.id}-italic-lbl`} style={ui.fieldLabel}>Italic</span>
                              <button onClick={() => setProp(s.id, "italic", !p.italic)}
                                aria-labelledby={`${s.id}-italic-lbl`}
                                aria-pressed={p.italic}
                                style={{ ...ui.toggle, ...(p.italic ? ui.toggleOn : null) }}>
                                {p.italic ? "On" : "Off"}
                              </button>
                            </div>
                          </div>

                          <label style={ui.field}>
                            <span style={ui.fieldLabel}>Letter spacing — {p.tracking.toFixed(3)}em</span>
                            <input type="range" min={-0.05} max={0.2} step={0.005} value={p.tracking}
                              onChange={(e) => setProp(s.id, "tracking", Number(e.target.value))} />
                          </label>

                          <div style={ui.fieldRow}>
                            <label style={{ ...ui.field, flex: 1 }}>
                              <span style={ui.fieldLabel}>Space above — {p.before.toFixed(2)}em</span>
                              <input type="range" min={0} max={3} step={0.05} value={p.before}
                                onChange={(e) => setProp(s.id, "before", Number(e.target.value))} />
                            </label>
                            <label style={{ ...ui.field, flex: 1 }}>
                              <span style={ui.fieldLabel}>Space below — {p.after.toFixed(2)}em</span>
                              <input type="range" min={0} max={3} step={0.05} value={p.after}
                                onChange={(e) => setProp(s.id, "after", Number(e.target.value))} />
                            </label>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => applyStyle(s)} style={{ ...ui.applyBtn, flex: 1 }}>
                              Apply {s.label} to current block
                            </button>
                            {s.custom && (
                              <button onClick={() => deleteStyle(s)} style={ui.deleteBtn}
                                aria-label={`Delete the ${s.label} style`}>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* New custom style */}
                <div style={ui.newStyle}>
                  <div style={ui.panelTitle}>New custom style</div>
                  <div style={ui.panelSub}>
                    Becomes a class on the element you choose — e.g. “Pull quote” on a paragraph
                    exports as <span style={ui.newStyleMono}>p.pull-quote</span>. It starts from that
                    element's current style; adjust it above once created.
                  </div>
                  <label style={ui.field}>
                    <span style={ui.fieldLabel}>Name</span>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") createStyle(); }}
                      placeholder="e.g. Pull quote"
                      style={ui.textInput}
                    />
                  </label>
                  <div style={ui.fieldRow}>
                    <label style={{ ...ui.field, flex: 1 }}>
                      <span style={ui.fieldLabel}>Element</span>
                      <select value={newBase} onChange={(e) => setNewBase(e.target.value)} style={ui.select}>
                        {CUSTOM_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </label>
                    <button onClick={createStyle} style={{ ...ui.applyBtn, marginTop: 0, alignSelf: "flex-end" }}>
                      Create style
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "checker" && (
            <div role="region" aria-label="Accessibility check" style={ui.checker}>
              <div style={ui.panelHead}>
                <div>
                  <div style={ui.panelTitle}>Accessibility checker</div>
                  <div style={ui.panelSub}>Updates as you write · headings · links · alt text · contrast · tables</div>
                </div>
                <button onClick={runCheck} style={ui.resetBtn} title="Force an immediate rescan">Recheck now</button>
              </div>

              <p aria-live="polite" style={{
                ...ui.checkSummary,
                color: !hasChecked ? "#8b929a" : issues.length === 0 ? "#5fd3a5" : errCount > 0 ? "#ff9d9d" : "#e8c15a",
              }}>
                {summaryText}
              </p>

              <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 16px" }}>
                {hasChecked && issues.length === 0 && (
                  <p style={ui.emptyState}>
                    Nothing to flag in the current document. Try “Insert sample content” below to see the checker at work.
                  </p>
                )}

                {CATEGORY_ORDER.map((cat) => {
                  const list = issues.filter((i) => i.cat === cat);
                  if (list.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={ui.catHead}>{cat} · {list.length}</div>
                      {list.map((it) => (
                        <div key={it.uid}
                          ref={(el) => { if (el) issueRefs.current[it.uid] = el; }}
                          style={{ ...ui.issue, ...(focusIssue === it.uid ? ui.issueFocus : null) }}>
                          <span style={{
                            ...ui.sevBadge,
                            ...(it.sev === "error" ? ui.sevError : it.sev === "warn" ? ui.sevWarn : ui.sevInfo),
                          }}>
                            {SEV_LABEL[it.sev]}
                          </span>
                          <span style={ui.issueMsg}>{it.msg}</span>
                          {it.node && (
                            <button onClick={() => locate(it.node)} style={ui.locateBtn}
                              aria-label={`Show this ${cat.toLowerCase()} issue in the document`}>
                              Show
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                <button onClick={insertDemo} style={{ ...ui.applyBtn, width: "100%", marginTop: 4 }}>
                  Insert sample content with known issues
                </button>
                <p style={ui.checkerNote}>
                  This list updates on its own shortly after every edit, whichever tab you're on — switching here
                  just shows you what it already found. Contrast is measured against each element's rendered
                  background, so editing a style's colour re-checks every block that uses it. Automated checks
                  catch common failures; they can't replace a manual review for meaning (e.g. whether alt text
                  is actually accurate).
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {exportOpen && (
        <div style={ui.modalScrim} onMouseDown={(e) => { if (e.target === e.currentTarget) closeExport(); }}>
          <div style={ui.modal} role="dialog" aria-modal="true" aria-labelledby="exp-title" aria-describedby="exp-desc">
            <div style={ui.modalHead}>
              <h2 id="exp-title" style={ui.modalTitle}>Export HTML</h2>
              <button onClick={closeExport} style={ui.modalClose} aria-label="Close export dialog">✕</button>
            </div>
            <p id="exp-desc" style={ui.modalDesc}>
              A download was attempted. If your browser blocked it — common inside a sandboxed
              preview — copy the complete document below instead. It's a self-contained HTML file
              with the stylesheet embedded.
            </p>
            <textarea
              ref={exportTextRef}
              readOnly
              value={exportCode}
              spellCheck={false}
              aria-label="Exported HTML source"
              style={ui.modalText}
            />
            <div style={ui.modalActions}>
              <button onClick={copyExport} style={ui.modalPrimary}>Copy to clipboard</button>
              <button onClick={() => { tryDownload("document.html", exportCode, "text/html"); flash("Download attempted"); }}
                style={ui.modalSecondary}>Try download again</button>
              <span style={{ flex: 1 }} />
              <button onClick={closeExport} style={ui.modalSecondary}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={ui.toast} role="status">{toast}</div>}
    </div>
  );
}

// ---------- UI chrome tokens -------------------------------------------------

const UI_FONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const ui = {
  app: { height: "100vh", display: "flex", flexDirection: "column", background: "#e9e7e1", fontFamily: UI_FONT, color: "#1d2126" },
  header: { flexShrink: 0 },
  toolbar: { display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#1f242a", flexWrap: "wrap" },
  brand: { color: "#f2f1ed", fontWeight: 700, fontSize: 15, letterSpacing: "0.01em", marginRight: 4 },
  tbDivider: { width: 1, alignSelf: "stretch", background: "#3a4149", margin: "2px 6px" },
  tbBtn: { fontFamily: UI_FONT, fontSize: 13, padding: "6px 11px", borderRadius: 6, border: "1px solid #3a4149", background: "transparent", color: "#d7dade", cursor: "pointer" },
  tbBtnActive: { background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" },
  tbBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  viewSwitch: { display: "flex", background: "#161a1f", border: "1px solid #3a4149", borderRadius: 7, padding: 2, gap: 2 },
  viewBtn: { fontFamily: UI_FONT, fontSize: 12.5, padding: "4px 12px", borderRadius: 5, border: "none", background: "transparent", color: "#aab0b7", cursor: "pointer" },
  viewBtnActive: { background: "#0e8a7d", color: "#fff" },
  codeWrap: { maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", height: "100%", borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 2px rgba(30,32,30,.12), 0 12px 32px rgba(30,32,30,.10)" },
  codeBar: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "9px 16px", background: "#1f242a", color: "#d7dade", fontSize: 12.5, fontWeight: 600, flexWrap: "wrap" },
  codeBarHint: { fontWeight: 400, fontSize: 11.5, color: "#8b929a" },
  codeArea: { flex: 1, width: "100%", boxSizing: "border-box", resize: "none", border: "none", padding: "18px 20px", background: "#14181c", color: "#d8e0e6", fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 13.5, lineHeight: 1.65, tabSize: 2, caretColor: "#3fc0b0" },

  // Style sheet (specimen) view
  specimenPage: { maxWidth: 700, margin: "0 auto", background: "#fdfdfb", padding: "44px 58px 56px", borderRadius: 3, boxShadow: "0 1px 2px rgba(30,32,30,.12), 0 12px 32px rgba(30,32,30,.10)" },
  specimenHead: { marginBottom: 28, borderBottom: "1px solid #e4e1d9", paddingBottom: 18 },
  specimenTitle: { margin: 0, fontFamily: UI_FONT, fontSize: 20, fontWeight: 700, color: "#1d2126" },
  specimenSub: { margin: "6px 0 0", fontFamily: UI_FONT, fontSize: 13, color: "#6d6a62", lineHeight: 1.5 },
  specimenRow: { padding: "18px 0 16px", borderBottom: "1px solid #eceae3" },
  specimenMetaTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  specimenSelector: { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12, color: "#8a857a", background: "#f1efe9", padding: "2px 7px", borderRadius: 4 },
  specimenEditBtn: { fontFamily: UI_FONT, fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #cfccc3", background: "#fff", color: "#3a3f45", cursor: "pointer", flexShrink: 0 },
  contrastBadge: { fontFamily: UI_FONT, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, flexShrink: 0 },
  contrastPass: { background: "#e5f3ec", color: "#186a45", border: "1px solid #bcdfcd" },
  contrastFail: { background: "#fbe9e9", color: "#a12d33", border: "1px solid #eec4c6" },
  specimenMeta: { marginTop: 9, fontFamily: UI_FONT, fontSize: 12, color: "#6d6a62", lineHeight: 1.7 },
  specimenSwatch: { width: 11, height: 11, borderRadius: 3, display: "inline-block", verticalAlign: "-1px", border: "1px solid rgba(0,0,0,.18)", marginRight: 4 },
  specimenMono: { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 11.5 },
  cssSection: { marginTop: 30 },
  cssSectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cssSectionTitle: { margin: 0, fontFamily: UI_FONT, fontSize: 15, fontWeight: 700, color: "#1d2126" },
  cssPre: { marginTop: 12, background: "#14181c", color: "#d8e0e6", borderRadius: 6, padding: "16px 18px", fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  layout: { display: "flex", flex: 1, minHeight: 0 },
  canvas: { flex: 1, overflowY: "auto", padding: "38px 28px", position: "relative" },
  page: { maxWidth: 700, margin: "0 auto", background: "#fdfdfb", padding: "52px 58px 64px", borderRadius: 3, boxShadow: "0 1px 2px rgba(30,32,30,.12), 0 12px 32px rgba(30,32,30,.10)", minHeight: "80%", caretColor: "#0e8a7d" },
  panel: { width: 340, flexShrink: 0, background: "#1f242a", color: "#d7dade", display: "flex", flexDirection: "column", borderLeft: "1px solid #12161a" },
  outlinePanel: { width: 260, flexShrink: 0, background: "#1f242a", color: "#d7dade", display: "flex", flexDirection: "column", borderRight: "1px solid #12161a" },
  tabs: { display: "flex", gap: 6, padding: "12px 16px 0" },
  tabBtn: { fontFamily: UI_FONT, fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #3a4149", background: "transparent", color: "#aab0b7", cursor: "pointer" },
  tabBtnActive: { background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" },
  panelHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "16px 16px 12px", borderBottom: "1px solid #2c3238" },
  panelTitle: { fontSize: 14, fontWeight: 600, color: "#f2f1ed" },
  panelSub: { fontSize: 11.5, color: "#8b929a", marginTop: 3, lineHeight: 1.4 },
  resetBtn: { fontFamily: UI_FONT, fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid #3a4149", background: "transparent", color: "#aab0b7", cursor: "pointer", flexShrink: 0 },
  styleRow: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 16px", border: "none", cursor: "pointer", textAlign: "left", color: "inherit", fontFamily: UI_FONT },
  rowMeta: { fontSize: 11, color: "#8b929a", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" },
  swatch: { width: 10, height: 10, borderRadius: 3, display: "inline-block", border: "1px solid rgba(255,255,255,.25)" },
  controls: { padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 },
  fieldRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 11, color: "#8b929a", letterSpacing: "0.02em" },
  colorRow: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", minHeight: 24 },
  hexInput: { width: 74, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12, padding: "5px 7px", borderRadius: 5, border: "1px solid #3a4149", background: "#161a1f", color: "#e6e8ea" },
  // A brief highlight when the cursor moves into a style's text, distinct from
  // the accessibility flash colour (#e07b39) elsewhere — this is a normal
  // navigation cue, not a warning.
  styleRowFocus: { boxShadow: "inset 0 0 0 2px #0e8a7d" },
  // Verified against the panel background (#1f242a) and the open-row background
  // (#262c33): both badge colours clear 4.5:1 on either.
  panelBadge: { fontFamily: UI_FONT, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.01em", padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap" },
  panelBadgePass: { background: "rgba(95,211,165,.14)", color: "#5fd3a5", border: "1px solid rgba(95,211,165,.42)" },
  panelBadgeFail: { background: "rgba(229,72,77,.18)", color: "#ff9d9d", border: "1px solid rgba(229,72,77,.5)" },
  // Used when a criterion doesn't apply — a neutral tone so it doesn't read as either verdict.
  panelBadgeMuted: { background: "rgba(170,176,183,.12)", color: "#c2c7cd", border: "1px solid rgba(170,176,183,.35)" },
  select: { fontFamily: UI_FONT, fontSize: 12.5, padding: "5px 6px", borderRadius: 5, border: "1px solid #3a4149", background: "#161a1f", color: "#e6e8ea" },
  toggle: { fontFamily: UI_FONT, fontSize: 12, padding: "5px 10px", borderRadius: 5, border: "1px solid #3a4149", background: "#161a1f", color: "#aab0b7", cursor: "pointer" },
  toggleOn: { background: "#0e8a7d", borderColor: "#0e8a7d", color: "#fff" },
  applyBtn: { fontFamily: UI_FONT, fontSize: 12.5, padding: "8px 10px", borderRadius: 6, border: "1px solid #0e8a7d", background: "transparent", color: "#3fc0b0", cursor: "pointer", marginTop: 2 },
  deleteBtn: { fontFamily: UI_FONT, fontSize: 12.5, padding: "8px 12px", borderRadius: 6, border: "1px solid #7a3a3e", background: "transparent", color: "#e08a8e", cursor: "pointer", marginTop: 2, flexShrink: 0 },
  newStyle: { padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 10, borderTop: "2px solid #2c3238", background: "#232930" },
  newStyleMono: { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 11, color: "#a8c4ec" },
  textInput: { fontFamily: UI_FONT, fontSize: 12.5, padding: "6px 8px", borderRadius: 5, border: "1px solid #3a4149", background: "#161a1f", color: "#e6e8ea" },
  linkBar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#262c33", borderTop: "1px solid #12161a", flexWrap: "wrap" },
  linkBarLabel: { fontFamily: UI_FONT, fontSize: 12.5, fontWeight: 600, color: "#f2f1ed", flexShrink: 0 },
  linkInput: { fontFamily: UI_FONT, fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #3a4149", background: "#161a1f", color: "#e6e8ea", flex: 1, minWidth: 220 },
  linkCheck: { display: "flex", alignItems: "center", gap: 6, fontFamily: UI_FONT, fontSize: 12.5, color: "#d7dade", cursor: "pointer", flexShrink: 0 },
  linkWarning: { fontSize: 11.5, lineHeight: 1.5, color: "#e8c15a", background: "rgba(217,165,20,.1)", border: "1px solid rgba(217,165,20,.35)", borderRadius: 6, padding: "8px 10px" },
  tableField: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  tableNumInput: { width: 46, fontFamily: UI_FONT, fontSize: 12.5, padding: "5px 6px", borderRadius: 5, border: "1px solid #3a4149", background: "#161a1f", color: "#e6e8ea" },
  outlineItem: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 14px 7px 0", border: "none", background: "transparent", color: "#d7dade", cursor: "pointer", textAlign: "left", fontFamily: UI_FONT, fontSize: 12.5 },
  outlineLevel: { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 10, fontWeight: 700, color: "#8b929a", background: "#161a1f", border: "1px solid #3a4149", borderRadius: 4, padding: "1px 5px", flexShrink: 0 },
  outlineText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#1f242a", color: "#f2f1ed", padding: "9px 16px", borderRadius: 8, fontSize: 13, boxShadow: "0 6px 20px rgba(0,0,0,.3)" },

  // Export dialog
  modalScrim: { position: "fixed", inset: 0, background: "rgba(18,20,24,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modal: { width: "min(720px, 100%)", maxHeight: "85vh", display: "flex", flexDirection: "column", background: "#fdfdfb", color: "#1d2126", borderRadius: 10, boxShadow: "0 12px 48px rgba(0,0,0,.4)", padding: "20px 22px 18px" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  modalTitle: { margin: 0, fontFamily: UI_FONT, fontSize: 17, fontWeight: 700 },
  modalClose: { fontFamily: UI_FONT, fontSize: 15, lineHeight: 1, padding: "6px 9px", borderRadius: 6, border: "1px solid #cfccc3", background: "#fff", color: "#3a3f45", cursor: "pointer" },
  modalDesc: { margin: "8px 0 12px", fontFamily: UI_FONT, fontSize: 13, color: "#5c5952", lineHeight: 1.5 },
  modalText: { flex: 1, minHeight: 220, width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #d7d3c9", borderRadius: 8, padding: "12px 14px", background: "#14181c", color: "#d8e0e6", fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12.5, lineHeight: 1.6, tabSize: 2 },
  modalActions: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" },
  modalPrimary: { fontFamily: UI_FONT, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 7, border: "1px solid #0e8a7d", background: "#0e8a7d", color: "#fff", cursor: "pointer" },
  modalSecondary: { fontFamily: UI_FONT, fontSize: 13, padding: "8px 14px", borderRadius: 7, border: "1px solid #cfccc3", background: "#fff", color: "#3a3f45", cursor: "pointer" },

  // Checker
  checker: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
  checkSummary: { margin: 0, padding: "10px 16px", fontSize: 12.5, fontWeight: 600 },
  emptyState: { fontSize: 12.5, color: "#8b929a", lineHeight: 1.5 },
  catHead: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b929a", margin: "4px 0 6px" },
  issue: { display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 6, background: "#262c33", marginBottom: 6 },
  issueFocus: { boxShadow: "0 0 0 2px #e07b39", background: "#2f3640" },
  overlayBox: { position: "absolute", pointerEvents: "none", border: "2px solid", borderRadius: 3, zIndex: 4, boxSizing: "border-box", opacity: 0.85 },
  overlayBadge: { position: "absolute", transform: "translate(-100%, -1px)", zIndex: 5, fontFamily: UI_FONT, fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "2px 7px", borderRadius: "0 0 0 5px", border: "none", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,.35)" },
  ovError: { background: "#e5484d", color: "#fff" },
  ovWarn: { background: "#d9a514", color: "#2a2100" },
  ovInfo: { background: "#6f9fe0", color: "#0e1e33" },
  sevBadge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 1 },
  sevError: { background: "rgba(229,72,77,.18)", color: "#ff9d9d", border: "1px solid rgba(229,72,77,.5)" },
  sevWarn: { background: "rgba(217,165,20,.15)", color: "#e8c15a", border: "1px solid rgba(217,165,20,.45)" },
  sevInfo: { background: "rgba(120,160,220,.15)", color: "#a8c4ec", border: "1px solid rgba(120,160,220,.4)" },
  issueMsg: { fontSize: 12, lineHeight: 1.45, color: "#d7dade", flex: 1 },
  locateBtn: { fontFamily: UI_FONT, fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "1px solid #3a4149", background: "transparent", color: "#3fc0b0", cursor: "pointer", flexShrink: 0 },
  checkerNote: { fontSize: 11, color: "#8b929a", lineHeight: 1.5, marginTop: 12 },
};
