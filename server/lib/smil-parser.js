const fs = require('fs');
const path = require('path');
let ResvgClass;
try {
  const m = require('@resvg/resvg-js');
  ResvgClass = m.Resvg;
} catch {}
const { execSync } = require('child_process');

function parseDuration(str) {
  if (!str) return 0;
  str = String(str).trim();
  if (str.endsWith('ms')) return parseFloat(str) / 1000;
  if (str.endsWith('s')) return parseFloat(str);
  if (str.endsWith('min')) return parseFloat(str) * 60;
  if (str.endsWith('h')) return parseFloat(str) * 3600;
  return parseFloat(str) || 0;
}

function parseValues(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(s => s.length > 0);
}

function colorToRgb(hex) {
  hex = String(hex).replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return null;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function rgbToColor(rgb) {
  return '#' + rgb.map(c => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  }).join('');
}

function isHexColor(str) {
  return /^#[0-9a-fA-F]{6}$/.test(str) || /^#[0-9a-fA-F]{3}$/.test(str);
}

function isNumeric(str) {
  return /^-?\d*\.?\d+(?:e[+-]?\d+)?$/.test(str);
}

function interpolateValue(v1, v2, t) {
  t = Math.max(0, Math.min(1, t));
  if (v1 === v2) return v1;

  if (isHexColor(v1) && isHexColor(v2)) {
    const rgb1 = colorToRgb(v1);
    const rgb2 = colorToRgb(v2);
    if (rgb1 && rgb2) {
      return rgbToColor(rgb1.map((c, i) => c + (rgb2[i] - c) * t));
    }
  }

  if (isNumeric(v1) && isNumeric(v2)) {
    const n1 = parseFloat(v1);
    const n2 = parseFloat(v2);
    return String(n1 + (n2 - n1) * t);
  }

  const parts1 = v1.split(/\s+/).filter(s => s.length > 0);
  const parts2 = v2.split(/\s+/).filter(s => s.length > 0);

  if (parts1.length === parts2.length && parts1.length > 1) {
    const result = parts1.map((p, i) => {
      if (isNumeric(p) && isNumeric(parts2[i])) {
        const n1 = parseFloat(p);
        const n2 = parseFloat(parts2[i]);
        return String(n1 + (n2 - n1) * t);
      }
      return p;
    });
    return result.join(' ');
  }

  return t < 0.5 ? v1 : v2;
}

function hasRsvg() {
  return typeof ResvgClass === 'function';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTagAttrs(tagString) {
  const attrs = {};
  const re = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tagString)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function findParentElement(svgContent, animatePos) {
  const before = svgContent.substring(0, animatePos);
  const stack = [];
  const tagRe = /<\/?(\w+(?:[:\-]\w+)?)([^>]*)>/g;
  let m;

  while ((m = tagRe.exec(before)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();

    if (full.startsWith('</')) {
      if (stack.length > 0 && stack[stack.length - 1].name === name) {
        stack.pop();
      }
    } else if (full.endsWith('/>')) {
    } else {
      const attrStr = m[2];
      stack.push({
        name,
        attrs: parseTagAttrs(full),
        full,
        pos: m.index
      });
    }
  }

  return stack.length > 0 ? stack[stack.length - 1] : null;
}

function parseAnimations(svgContent) {
  const animations = [];
  const re = /<(animate|animateTransform)([\s\S]*?)<\/?(?:\1|\/)\s*>/gi;

  let m;
  while ((m = re.exec(svgContent)) !== null) {
    const tagName = m[1];
    const body = m[2].trim();
    const fullTag = `<${tagName}${body}>`;
    const closePart = `</${tagName}>`;

    const attrs = parseTagAttrs(fullTag);
    const animatePos = m.index;
    const animateEnd = m.index + m[0].length;
    const attrName = attrs.attributeName;
    if (!attrName) continue;

    if (/<\/(?:animate|animateTransform)\s*>$/i.test(m[0])) {
      const innerMatch = m[0].match(/([\s\S]*?)<\//);
      if (!innerMatch) continue;
    }

    const parentEl = findParentElement(svgContent, animatePos);
    if (!parentEl) continue;

    const existing = animations.find(
      a => a.parentPos === parentEl.pos && a.attrName === attrName
    );
    if (existing) {
      return { complex: true, reason: 'multiple animations on same attribute' };
    }

    if (tagName === 'animateTransform' && attrName === 'transform') {
      const existingTransform = animations.find(
        a => a.parentPos === parentEl.pos && a.isTransform
      );
      if (existingTransform) {
        return { complex: true, reason: 'multiple animateTransform on same element' };
      }
    }

    let values = [];
    if (attrs.values) {
      values = parseValues(attrs.values);
    } else if (attrs.from !== undefined && attrs.to !== undefined) {
      values = [attrs.from, attrs.to];
    }
    if (values.length < 2) continue;

    const dur = parseDuration(attrs.dur || '1s');
    if (dur <= 0) continue;

    const keyTimes = attrs.keyTimes
      ? parseValues(attrs.keyTimes).map(parseFloat)
      : null;

    if (keyTimes && keyTimes.length !== values.length) {
    }

    const begin = parseDuration(attrs.begin);
    if (attrs.begin && begin > 0) {
      return { complex: true, reason: 'non-zero begin not supported' };
    }

    animations.push({
      attrName,
      values,
      dur,
      repeatCount: attrs.repeatCount || 'indefinite',
      keyTimes,
      fill: (attrs.fill || '').toLowerCase(),
      calcMode: (attrs.calcMode || 'linear').toLowerCase(),
      isTransform: tagName === 'animateTransform',
      transformType: attrs.type || '',
      begin,
      parentPos: parentEl.pos,
      parentFull: parentEl.full,
      parentTagName: parentEl.name,
      animatePos,
      animateEnd
    });
  }

  const singleTagRe = /<(animate|animateTransform)([^>]*)\/>/gi;
  let sm;
  while ((sm = singleTagRe.exec(svgContent)) !== null) {
    const tagName = sm[1];
    const attrsStr = sm[2];
    const fullTag = `<${tagName}${attrsStr}/>`;
    const animatePos = sm.index;
    const animateEnd = sm.index + sm[0].length;

    if (animations.some(a => a.animatePos === animatePos)) continue;

    const attrs = parseTagAttrs(fullTag);
    const attrName = attrs.attributeName;
    if (!attrName) continue;

    const parentEl = findParentElement(svgContent, animatePos);
    if (!parentEl) continue;

    const existing = animations.find(
      a => a.parentPos === parentEl.pos && a.attrName === attrName
    );
    if (existing) {
      return { complex: true, reason: 'multiple animations on same attribute' };
    }

    let values = [];
    if (attrs.values) {
      values = parseValues(attrs.values);
    } else if (attrs.from !== undefined && attrs.to !== undefined) {
      values = [attrs.from, attrs.to];
    }
    if (values.length < 2) continue;

    const dur = parseDuration(attrs.dur || '1s');
    if (dur <= 0) continue;

    const keyTimes = attrs.keyTimes
      ? parseValues(attrs.keyTimes).map(parseFloat)
      : null;

    const begin = parseDuration(attrs.begin);
    if (attrs.begin && begin > 0) {
      return { complex: true, reason: 'non-zero begin not supported' };
    }

    animations.push({
      attrName,
      values,
      dur,
      repeatCount: attrs.repeatCount || 'indefinite',
      keyTimes,
      fill: (attrs.fill || '').toLowerCase(),
      calcMode: (attrs.calcMode || 'linear').toLowerCase(),
      isTransform: tagName === 'animateTransform',
      transformType: attrs.type || '',
      begin,
      parentPos: parentEl.pos,
      parentFull: parentEl.full,
      parentTagName: parentEl.name,
      animatePos,
      animateEnd
    });
  }

  return { animations, complex: false };
}

function computeAnimationValue(anim, t) {
  const values = anim.values;
  if (!values || values.length === 0) return null;
  if (values.length === 1) return values[0];

  const cycleDur = anim.dur;
  if (cycleDur <= 0) return values[values.length - 1];

  const adjustedT = Math.max(0, t - (anim.begin || 0));

  const repeatCount = anim.repeatCount === 'indefinite'
    ? Infinity
    : (parseFloat(anim.repeatCount) || 1);

  if (repeatCount !== Infinity && adjustedT >= cycleDur * repeatCount) {
    const fill = anim.fill;
    return values[values.length - 1];
  }

  const posInCycle = adjustedT % cycleDur;
  const progress = posInCycle / cycleDur;

  const numKF = values.length;
  let kfTimes;
  if (anim.keyTimes && anim.keyTimes.length === numKF) {
    kfTimes = anim.keyTimes;
  } else {
    kfTimes = Array.from({ length: numKF }, (_, i) => i / (numKF - 1));
  }

  let segIdx = 0;
  for (let i = 0; i < numKF - 1; i++) {
    if (progress >= kfTimes[i]) segIdx = i;
  }
  segIdx = Math.min(segIdx, numKF - 2);

  const segStart = kfTimes[segIdx];
  const segEnd = kfTimes[segIdx + 1];
  const segLen = segEnd - segStart;
  const tInSeg = segLen > 0 ? (progress - segStart) / segLen : 0;

  if (anim.calcMode === 'discrete') {
    return tInSeg < 0.5 ? values[segIdx] : values[segIdx + 1];
  }

  return interpolateValue(
    values[segIdx],
    values[segIdx + 1],
    Math.min(1, Math.max(0, tInSeg))
  );
}

function detectComplex(svgContent) {
  if (/@keyframes\s/.test(svgContent)) {
    return { complex: true, reason: 'CSS @keyframes detected' };
  }
  if (/<animateMotion[^>]*>/i.test(svgContent)) {
    return { complex: true, reason: 'animateMotion detected' };
  }
  if (/<set\b[^>]*>/i.test(svgContent)) {
    return { complex: true, reason: '<set> elements detected' };
  }
  if (/<animateColor[^>]*>/i.test(svgContent)) {
    return { complex: true, reason: 'animateColor detected' };
  }
  return { complex: false };
}

function applyEdits(svg, edits) {
  edits.sort((a, b) => b.start - a.start);
  let result = svg;
  for (const e of edits) {
    result = result.substring(0, e.start) + e.replacement + result.substring(e.end);
  }
  return result;
}

function renderFrame(svgContent, animations, t, framesDir, frameIndex) {
  const edits = [];

  for (const anim of animations) {
    const value = computeAnimationValue(anim, t);
    if (value === null) continue;

    let attrValue = value;

    if (anim.isTransform) {
      const tType = anim.transformType;
      if (tType === 'rotate') {
        attrValue = `rotate(${value})`;
      } else if (tType === 'translate') {
        attrValue = `translate(${value})`;
      } else if (tType === 'scale') {
        attrValue = `scale(${value})`;
      } else if (tType === 'skewX') {
        attrValue = `skewX(${value})`;
      } else if (tType === 'skewY') {
        attrValue = `skewY(${value})`;
      } else {
        attrValue = value;
      }
    }

    const parentTag = anim.parentFull;
    const escaped = escapeRegex(anim.attrName);
    const attrRe = new RegExp(`${escaped}\\s*=\\s*"([^"]*)"`);
    const match = parentTag.match(attrRe);

    if (match) {
      const quoteIdx = match[0].indexOf('"');
      const valueStart = anim.parentPos + match.index + quoteIdx + 1;
      const valueEnd = valueStart + match[1].length;
      edits.push({ start: valueStart, end: valueEnd, replacement: String(attrValue) });
    } else {
      let insertPos = parentTag.lastIndexOf('/');
      if (insertPos === -1 || parentTag.charAt(insertPos - 1) === '/') {
        insertPos = parentTag.lastIndexOf('>');
      }
      if (insertPos === -1) insertPos = parentTag.length;
      edits.push({
        start: anim.parentPos + insertPos,
        end: anim.parentPos + insertPos,
        replacement: ` ${anim.attrName}="${attrValue}"`
      });
    }
  }

  for (const anim of animations) {
    edits.push({ start: anim.animatePos, end: anim.animateEnd, replacement: '' });
  }

  let result = applyEdits(svgContent, edits);
  result = result.replace(/\n{3,}/g, '\n\n').replace(/>\s+</g, '><').trim();

  const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(4, '0')}.png`);
  try {
    const r = new ResvgClass(result, { fitTo: { mode: 'width', value: 500 } });
    const pngBuffer = r.render().asPng();
    fs.writeFileSync(framePath, pngBuffer);
  } catch (err) {
    throw new Error(`SVG render failed: ${err.message}`);
  }
  return framePath;
}

async function parseAndRender(svgPath, framesDir, fps = 10, maxDuration = 6, onLog = () => {}) {
  if (!hasRsvg()) {
    return { success: false, reason: 'rsvg not installed' };
  }

  if (!fs.existsSync(svgPath)) {
    return { success: false, reason: 'SVG file not found' };
  }

  let svgContent;
  try {
    svgContent = fs.readFileSync(svgPath, 'utf-8');
  } catch (err) {
    return { success: false, reason: `cannot read SVG: ${err.message}` };
  }

  const complexity = detectComplex(svgContent);
  if (complexity.complex) {
    return { success: false, reason: complexity.reason };
  }

  const parsed = parseAnimations(svgContent);
  if (parsed.complex) {
    return { success: false, reason: parsed.reason };
  }

  const animations = parsed.animations;

  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  if (animations.length === 0) {
    const framePath = path.join(framesDir, 'frame_0000.png');
    try {
      const svgBuf = fs.readFileSync(svgPath);
      const r = new ResvgClass(svgBuf, { fitTo: { mode: 'width', value: 500 } });
      fs.writeFileSync(framePath, r.render().asPng());
      return { success: true, framePaths: [framePath] };
    } catch (err) {
      return { success: false, reason: `SVG render failed: ${err.message}` };
    }
  }

  const totalFrames = Math.max(1, Math.ceil(maxDuration * fps));
  const framePaths = [];
  const logInterval = Math.max(1, Math.floor(totalFrames / 10));

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    try {
      const fp = renderFrame(svgContent, animations, t, framesDir, i);
      framePaths.push(fp);
      if ((i + 1) % logInterval === 0) {
        onLog(`frame ${i + 1}/${totalFrames}`);
      }
    } catch (err) {
      return { success: false, reason: `frame ${i} error: ${err.message}` };
    }
  }

  return { success: true, framePaths };
}

module.exports = {
  parseAndRender,
  parseDuration,
  parseValues,
  interpolateValue,
  hasRsvg,
  colorToRgb,
  rgbToColor
};
