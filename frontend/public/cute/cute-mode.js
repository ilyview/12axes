/*
 * Nya mode: the pink paw button at the top right of every page.
 *   click 1 -> pink, rounded, paw-print theme
 *   click 2 -> MAX: brighter, floating paws/hearts, every text uwu-ified, ideologies become UwUism,
 *              and countries, parties and people get their cute names
 *   click 3 -> HYPER: extremely bright, even more uwu, sparkle rain, cursor trail, mascot parade,
 *              speech bubbles, ticker, rainbow frame, cat-ear logo, paw favicon...
 *   click 4 -> back to normal
 * Plain script (no build step) so it runs on the React app and on the generated catalog pages alike.
 * The level lives in localStorage; the page works normally if storage is blocked.
 * The React share cards read window.nyaMode (see src/utils/nya.ts) and listen for the "nya-change" event.
 * No strobing: every animation is slow (>= ~1s per cycle) and reduced-motion turns the motion off.
 */
(function () {
  'use strict';
  if (window.__nyaMode) return;
  window.__nyaMode = true;

  var KEY = '12axes-nya-level';
  var MAX_LEVEL = 3;
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/[^/]*$/, '') : '/cute/';
  var API = ((script && script.getAttribute('data-api')) || 'https://one2axes-backend.onrender.com').replace(/\/+$/, '');
  if (API.indexOf('%') >= 0) API = 'https://one2axes-backend.onrender.com'; // unreplaced Vite placeholder
  var root = document.documentElement;
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function readLevel() {
    try {
      var v = parseInt(window.localStorage.getItem(KEY) || '0', 10);
      return v >= 1 && v <= MAX_LEVEL ? v : 0;
    } catch (e) {
      return 0;
    }
  }
  function saveLevel(v) {
    try {
      window.localStorage.setItem(KEY, String(v));
    } catch (e) {}
  }

  var level = readLevel();
  // ?nya=0..3 in the link sets the level (handy for sharing a link that opens in nya mode)
  var fromUrl = /[?&]nya=([0-3])\b/.exec(location.search);
  if (fromUrl) {
    level = +fromUrl[1];
    saveLevel(level);
  }

  // ---------- language ----------
  // The page's language: <html lang> (the app sets it, also on /r?l=en links), else the path prefix.
  function getLang() {
    var html = (root.getAttribute('lang') || '').slice(0, 2).toLowerCase();
    if (/^(pt|en|es|de|it)$/.test(html)) return html;
    var m = /^\/(en|es|de|it)(\/|$)/.exec(location.pathname);
    return m ? m[1] : 'pt';
  }
  var LABEL_SETS = {
    pt: ['Modo nya: ligar', 'Modo nya: MÁXIMO', 'Modo nya: HIPER ✧', 'Modo nya: desligar'],
    en: ['Nya mode: on', 'Nya mode: MAX', 'Nya mode: HYPER ✧', 'Nya mode: off'],
    es: ['Modo nya: activar', 'Modo nya: MÁXIMO', 'Modo nya: HÍPER ✧', 'Modo nya: desactivar'],
    de: ['Nya-Modus: an', 'Nya-Modus: MAX', 'Nya-Modus: HYPER ✧', 'Nya-Modus: aus'],
    it: ['Modalità nya: attiva', 'Modalità nya: MAX', 'Modalità nya: IPER ✧', 'Modalità nya: disattiva']
  };
  var BUBBLE_SETS = {
    pt: ['nya~ você é incrível!', 'UwU que ideologia fofa', 'miau! ♡', 'abraço de gatinho!', 'kyaa~ ✧', 'política, mas fofa :3', 'vamos ser amigos? ♡', 'patinha aqui! 🐾'],
    en: ['nya~ you are amazing!', 'UwU what a cute ideology', 'meow! ♡', 'kitty hug!', 'kyaa~ ✧', 'politics, but cute :3', 'be my friend? ♡', 'paw five! 🐾'],
    es: ['nya~ ¡eres increíble!', 'UwU qué ideología tan mona', '¡miau! ♡', '¡abrazo de gatito!', 'kyaa~ ✧', 'política, pero mona :3', '¿amigos? ♡', '¡choca la patita! 🐾'],
    de: ['nya~ du bist toll!', 'UwU so eine süße Ideologie', 'miau! ♡', 'Kätzchen-Umarmung!', 'kyaa~ ✧', 'Politik, aber süß :3', 'Freunde? ♡', 'Pfote drauf! 🐾'],
    it: ['nya~ sei fantastico!', 'UwU che ideologia carina', 'miao! ♡', 'abbraccio di gattino!', 'kyaa~ ✧', 'politica, ma carina :3', 'amici? ♡', 'batti la zampetta! 🐾']
  };

  // ---------- stylesheet + fonts (only loaded once the mode is used) ----------
  var assetsLoaded = false;
  function loadAssets() {
    if (assetsLoaded) return;
    assetsLoaded = true;
    var fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Mochiy+Pop+One&display=swap';
    document.head.appendChild(fonts);
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = BASE + 'cute-mode.css?v=2';
    document.head.appendChild(css);
  }

  // The button's own look is inline so it shows even before the stylesheet is needed.
  var btnStyle = document.createElement('style');
  btnStyle.textContent =
    '.nya-btn{position:fixed;top:84px;right:16px;z-index:2147483000;width:52px;height:52px;border-radius:50%;border:3px solid #fff;' +
    'background:linear-gradient(145deg,#ff9ec9,#ff5fa2);box-shadow:0 6px 18px -4px rgba(255,64,140,.55);cursor:pointer;display:grid;place-items:center;padding:0;' +
    'transition:transform .18s cubic-bezier(.34,1.56,.64,1)}' +
    '.nya-btn:hover{transform:scale(1.08) rotate(-6deg)}.nya-btn:active{transform:scale(.94)}' +
    '.nya-btn:focus-visible{outline:3px solid #ff5fa2;outline-offset:3px}' +
    '.nya-btn svg{width:30px;height:30px;fill:#fff}' +
    '.nya-btn .nya-pip{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);display:flex;gap:3px}' +
    '.nya-btn .nya-pip i{width:7px;height:7px;border-radius:50%;background:#fff;border:1.5px solid #ff5fa2;opacity:.45}' +
    '.nya-btn[data-level="1"] .nya-pip i:nth-child(1),.nya-btn[data-level="2"] .nya-pip i:nth-child(-n+2),.nya-btn[data-level="3"] .nya-pip i{background:#ff5fa2;opacity:1}' +
    '.nya-btn[data-level="3"]{background:conic-gradient(from 0deg,#ff5fa2,#ffb86b,#ffe66b,#7bffb0,#6bd6ff,#b98bff,#ff5fa2);box-shadow:0 0 0 4px #fff,0 0 26px 8px rgba(255,120,200,.75)}' +
    '@media (max-width:560px){.nya-btn{top:76px;right:12px;width:46px;height:46px}.nya-btn svg{width:26px;height:26px}}' +
    '@media print{.nya-btn{display:none}}';
  document.head.appendChild(btnStyle);

  var PAW =
    '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="42" rx="14" ry="12"/><ellipse cx="14" cy="27" rx="6" ry="8" transform="rotate(-18 14 27)"/>' +
    '<ellipse cx="25" cy="16" rx="6" ry="8.5" transform="rotate(-6 25 16)"/><ellipse cx="39" cy="16" rx="6" ry="8.5" transform="rotate(6 39 16)"/>' +
    '<ellipse cx="50" cy="27" rx="6" ry="8" transform="rotate(18 50 27)"/></svg>';

  var button = null;
  function addButton() {
    if (button && document.body.contains(button)) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'nya-btn';
    button.setAttribute('data-nya-skip', '');
    button.innerHTML = PAW + '<span class="nya-pip"><i></i><i></i><i></i></span>';
    button.addEventListener('click', function (e) {
      setLevel((level + 1) % (MAX_LEVEL + 1));
      if (level === 3) confetti(e.clientX, e.clientY, 90);
    });
    document.body.appendChild(button);
    updateButton();
  }
  function updateButton() {
    if (!button) return;
    button.setAttribute('data-level', String(level));
    var labels = LABEL_SETS[getLang()];
    button.setAttribute('aria-label', labels[level]);
    button.title = labels[level];
    button.setAttribute('aria-pressed', level > 0 ? 'true' : 'false');
  }

  var applied = 0;
  function setLevel(next) {
    level = next;
    saveLevel(level);
    apply();
  }

  function apply() {
    var was = applied;
    applied = level;
    if (level > 0) {
      loadAssets();
      root.setAttribute('data-nya', String(level));
    } else {
      root.removeAttribute('data-nya');
    }
    toggleAttr('data-nya-max', level >= 2);
    toggleAttr('data-nya-hyper', level >= 3);
    updateButton();
    // the text style changes between MAX and HYPER, so redo the text when crossing that line
    if (level >= 2) startMax(was >= 2 && (was >= 3) !== (level >= 3));
    else stopMax();
    if (level >= 3) startHyper();
    else stopHyper();
    try {
      window.dispatchEvent(new CustomEvent('nya-change', { detail: { level: level } }));
    } catch (e) {}
  }
  function toggleAttr(name, on) {
    if (on) root.setAttribute(name, '');
    else root.removeAttribute(name);
  }

  // ---------- uwu text ----------
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  var FACES = [' :3', ' nya~', ' UwU', ' OwO', ' >w<', ' (◕ᴗ◕✿)', ' ♡', ' ฅ^•ﻌ•^ฅ', ' (=^･ω･^=)', ' ✧*:･ﾟ', ' ^w^', ' meow~'];
  var HYPER_FACES = [' (≧◡≦) ♡', ' ✧٩(ˊᗜˋ*)و✧', ' (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', ' ♡(˃͈ દ ˂͈ ༶ )', ' ʕ•ᴥ•ʔ', ' (｡♥‿♥｡)', ' ✿◕ ‿ ◕✿', ' nyaaa~ ♡', ' UwU ✧', ' >///<', ' (=ↀωↀ=)✧', ' ฅ(＾・ω・＾ฅ)'];

  function uwuWord(word, hyper) {
    // leave numbers, links, e-mails, short acronyms alone
    if (/[0-9@/\\]/.test(word) || (word.length <= 4 && word === word.toUpperCase())) return word;
    var w = word
      .replace(/[rl]/g, 'w')
      .replace(/[RL]/g, 'W')
      .replace(/^([Nn])([aeiouáéíóú])/, function (_, n, v) {
        return n + 'y' + v;
      })
      .replace(/ove/g, 'uv');
    if (hyper) {
      w = w
        .replace(/^you$/i, function (m) { return m[0] === 'Y' ? 'Yuw' : 'yuw'; })
        .replace(/^the$/i, function (m) { return m[0] === 'T' ? 'Da' : 'da'; })
        .replace(/([aeiou])\1?$/i, function (m, v) { return word.length > 5 && hash(word) % 4 === 0 ? m + v + v : m; });
    }
    return w;
  }

  function uwuText(text, hyper) {
    if (!/\p{L}/u.test(text)) return text;
    var h = hash(text);
    var out = text.replace(/[\p{L}\p{M}'’@/\\0-9.]+/gu, function (token) {
      if (/^https?:|www\.|\.(com|br|app)$/i.test(token)) return token;
      return token.split(/(\.)/).map(function (part) { return uwuWord(part, hyper); }).join('');
    });
    var long = text.trim().length;
    // a little stutter on the first word of longer texts (always in HYPER)
    if (long > 30 && (hyper || h % 5 === 0)) {
      out = out.replace(/^(\s*)(\p{L})/u, '$1$2-$2');
    }
    var faces = hyper ? HYPER_FACES : FACES;
    if (long > (hyper ? 12 : 22)) {
      var n = 0;
      out = out.replace(/([.!?])(\s+|$)/g, function (m, p, sp) {
        n++;
        return (hyper && p === '!' ? '!!' : p) + faces[(h + n * 7) % faces.length] + sp;
      });
      if (hyper) out = out.replace(/, /g, function () { n++; return n % 3 === 0 ? ', nya, ' : ', '; });
      if (n === 0 && (hyper || h % 3 === 0)) out = out.replace(/(\s*)$/, faces[h % faces.length] + '$1');
    }
    return out;
  }

  // ---------- cute names (from the same catalog the compare page uses) ----------
  var names = new Map();
  var namesRequested = false;
  var namesLang = null;
  var COUNTRY_PRE = ['Nyan', 'Fluffy', 'Sparkly', 'Mochi', 'Pawsome', 'Sugar', 'Purrfect', 'Bunny', 'Marshmallow', 'Strawberry'];

  function cuteName(type, name) {
    var h = hash(type + name);
    if (type === 'ideology') {
      if (/(kratie|cracia|cracy|crazia)$/i.test(name)) return name.replace(/(kratie|cracia|cracy|crazia)$/i, '-UwU$1');
      if (/(ismo|ismus|isme|ism)$/i.test(name)) return name.replace(/(ismo|ismus|isme|ism)$/i, '-UwUism');
      return name + ' UwUism';
    }
    if (type === 'country') return COUNTRY_PRE[h % COUNTRY_PRE.length] + ' ' + name + '-chan';
    if (type === 'party') return name + ' Purrty ♡';
    if (type === 'personality') return name + '-chan';
    return name;
  }

  function hyperName(cute) {
    return '✧ ' + cute + ' ✧';
  }

  function loadNames() {
    var lang = getLang();
    if (namesRequested && namesLang === lang) return;
    namesRequested = true;
    namesLang = lang;
    names = new Map();
    fetch(API + '/api/compare/catalog?lang=' + lang + '&rv=2')
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (items) {
        if (namesLang !== lang) return; // the language changed meanwhile
        items.forEach(function (item) {
          if (item && item.name && !names.has(item.name)) names.set(item.name, cuteName(item.type, item.name));
        });
        if (level >= 2) refreshAll();
        try {
          window.dispatchEvent(new CustomEvent('nya-names', { detail: { count: names.size } }));
        } catch (e) {}
      })
      .catch(function () {
        namesRequested = false; // try again next time the mode is turned up
      });
  }

  // ---------- DOM text replacement ----------
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, OPTION: 1, TITLE: 1 };
  var originals = new Map(); // text node -> { orig, cute }
  var observer = null;
  var scheduled = false;
  var pending = [];

  /** The text a string becomes at the current level (names first, then uwu). */
  function transform(text, forceLevel) {
    var lv = forceLevel || level;
    var trimmed = text.trim();
    if (!trimmed || lv < 2) return text;
    var named = names.get(trimmed);
    if (named) return text.replace(trimmed, lv >= 3 ? hyperName(named) : named);
    return uwuText(text, lv >= 3);
  }

  function skipNode(node) {
    for (var el = node.parentNode; el && el !== document.body; el = el.parentNode) {
      if (el.nodeType !== 1) continue;
      if (SKIP[el.nodeName] || el.isContentEditable || el.hasAttribute('data-nya-skip')) return true;
    }
    return false;
  }

  function processText(node) {
    var current = node.nodeValue;
    var rec = originals.get(node);
    if (rec && rec.cute === current) return; // our own write
    if (skipNode(node)) return;
    var cute = transform(current);
    originals.set(node, { orig: current, cute: cute });
    if (cute !== current) node.nodeValue = cute;
  }

  function walk(rootNode) {
    if (rootNode.nodeType === 3) {
      processText(rootNode);
      return;
    }
    if (rootNode.nodeType !== 1 || SKIP[rootNode.nodeName]) return;
    var tw = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = tw.nextNode())) processText(n);
    if (rootNode.querySelectorAll) {
      var inputs = rootNode.querySelectorAll('input[placeholder],textarea[placeholder]');
      for (var i = 0; i < inputs.length; i++) cuteAttr(inputs[i], 'placeholder');
    }
  }

  var attrOriginals = new Map();
  function cuteAttr(el, attr) {
    var v = el.getAttribute(attr);
    var rec = attrOriginals.get(el);
    if (rec && rec.cute === v) return;
    var cute = uwuText(v, level >= 3);
    attrOriginals.set(el, { orig: v, cute: cute, attr: attr });
    if (cute !== v) el.setAttribute(attr, cute);
  }

  function flush() {
    scheduled = false;
    var batch = pending;
    pending = [];
    for (var i = 0; i < batch.length; i++) {
      if (batch[i].isConnected) walk(batch[i]);
    }
    // forget nodes React threw away
    if (originals.size > 20000) {
      originals.forEach(function (_, node) {
        if (!node.isConnected) originals.delete(node);
      });
    }
  }

  function queue(node) {
    pending.push(node);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  }

  var titleOrig = null;
  function restoreText() {
    originals.forEach(function (rec, node) {
      if (node.isConnected && node.nodeValue === rec.cute) node.nodeValue = rec.orig;
    });
    originals.clear();
    attrOriginals.forEach(function (rec, el) {
      if (el.getAttribute(rec.attr) === rec.cute) el.setAttribute(rec.attr, rec.orig);
    });
    attrOriginals.clear();
  }
  function refreshAll() {
    restoreText();
    walk(document.body);
    var base = titleOrig && document.title === titleOrig.cute ? titleOrig.orig : document.title;
    var cute = (level >= 3 ? '✧ ' : '') + uwuText(base, level >= 3);
    titleOrig = { orig: base, cute: cute };
    document.title = cute;
  }

  // ---------- small effects ----------
  function confetti(x, y, count) {
    if (reducedMotion) return;
    var bits = ['♡', '💖', '✧', '🐾', '🌸', '⭐', '🎀', '🍓', '✿', '💕'];
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.className = 'nya-burst nya-confetti';
      s.setAttribute('data-nya-skip', '');
      s.textContent = bits[i % bits.length];
      var angle = Math.random() * Math.PI * 2;
      var dist = 80 + Math.random() * 380;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.fontSize = 14 + Math.random() * 22 + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 1400);
    }
  }

  // ---------- MAX level extras ----------
  var layer = null;
  var clickHandler = null;
  function startMax(retext) {
    loadNames();
    if (!observer) {
      observer = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var r = records[i];
          if (r.type === 'characterData') queue(r.target);
          else for (var j = 0; j < r.addedNodes.length; j++) queue(r.addedNodes[j]);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      refreshAll();
    } else if (retext) {
      refreshAll();
    }
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'nya-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('data-nya-skip', '');
      var bits = ['🐾', '♡', '✿', '✧', '🎀', '🌸', '♡', '🐾', '⭐', '💖', '🍓', '✧', '🐾', '♡'];
      var html = '';
      for (var i = 0; i < bits.length; i++) {
        var left = (i * 73) % 100;
        var delay = -((i * 37) % 18);
        var dur = 14 + ((i * 11) % 10);
        var size = 16 + ((i * 7) % 18);
        html += '<span style="left:' + left + '%;animation-delay:' + delay + 's;animation-duration:' + dur + 's;font-size:' + size + 'px">' + bits[i] + '</span>';
      }
      html += '<img class="nya-mascot nya-mascot-1" src="' + BASE + 'mascot-1.webp" alt="" width="150" height="150">';
      html += '<img class="nya-mascot nya-mascot-2" src="' + BASE + 'mascot-2.webp" alt="" width="120" height="120">';
      layer.innerHTML = html;
      document.body.appendChild(layer);
    }
    if (!clickHandler) {
      clickHandler = function (e) {
        if (reducedMotion) return;
        if (level >= 3) {
          confetti(e.clientX, e.clientY, 16);
          return;
        }
        var burst = ['♡', '💖', '✧', '🐾', '🌸'];
        for (var i = 0; i < 6; i++) {
          var s = document.createElement('span');
          s.className = 'nya-burst';
          s.setAttribute('data-nya-skip', '');
          s.textContent = burst[(i + e.clientX) % burst.length];
          var angle = (Math.PI * 2 * i) / 6;
          s.style.left = e.clientX + 'px';
          s.style.top = e.clientY + 'px';
          s.style.setProperty('--dx', Math.cos(angle) * 46 + 'px');
          s.style.setProperty('--dy', Math.sin(angle) * 46 + 'px');
          document.body.appendChild(s);
          setTimeout(s.remove.bind(s), 750);
        }
      };
      document.addEventListener('click', clickHandler, true);
    }
  }

  function stopMax() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    pending = [];
    restoreText();
    if (titleOrig && document.title === titleOrig.cute) document.title = titleOrig.orig;
    titleOrig = null;
    if (layer) {
      layer.remove();
      layer = null;
    }
    if (clickHandler) {
      document.removeEventListener('click', clickHandler, true);
      clickHandler = null;
    }
  }

  // ---------- HYPER level extras ----------
  var hyper = null; // { layer, timers, handlers, favicon }
  var TICKER = '✧ nya~ ♡ UwU ✧ 12 axes but cute ♡ :3 ✧ meow meow ♡ OwO ✧ paw five 🐾 ♡ kyaa~ ✧ (=^･ω･^=) ♡ ';
  var PAW_ICON =
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#ff5fa2"/><g fill="#fff"><ellipse cx="32" cy="42" rx="12" ry="10"/><ellipse cx="16" cy="28" rx="5" ry="7"/><ellipse cx="26" cy="18" rx="5" ry="7"/><ellipse cx="38" cy="18" rx="5" ry="7"/><ellipse cx="48" cy="28" rx="5" ry="7"/></g></svg>');

  function startHyper() {
    if (hyper) return;
    hyper = { timers: [], handlers: [] };
    var el = document.createElement('div');
    el.className = 'nya-hyper';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-nya-skip', '');
    var html = '<div class="nya-glow"></div><div class="nya-frame"></div>';
    // twinkling sparkles all over the screen
    for (var i = 0; i < 36; i++) {
      html += '<i class="nya-twinkle" style="left:' + ((i * 61) % 100) + '%;top:' + ((i * 37 + 11) % 100) + '%;animation-delay:-' + ((i * 0.37) % 3).toFixed(2) + 's;font-size:' + (10 + ((i * 7) % 16)) + 'px">' + (i % 3 ? '✦' : '✧') + '</i>';
    }
    // heart/paw rain, much denser than MAX
    var rain = ['💖', '🐾', '🌸', '✨', '🎀', '🍓', '💕', '⭐', '🧁', '🍡', '🦄', '🌈', '🐱', '🐰', '🍬', '💗'];
    for (var j = 0; j < 30; j++) {
      html += '<span class="nya-rain" style="left:' + ((j * 37 + 5) % 100) + '%;animation-delay:-' + ((j * 1.3) % 12).toFixed(1) + 's;animation-duration:' + (7 + ((j * 3) % 8)) + 's;font-size:' + (18 + ((j * 5) % 22)) + 'px">' + rain[j % rain.length] + '</span>';
    }
    // mascot parade
    var parade = ['mascot-1', 'mascot-3', 'mascot-2', 'mascot-4', 'mascot-5'];
    html += '<div class="nya-parade">';
    for (var k = 0; k < parade.length; k++) {
      html += '<img src="' + BASE + parade[k] + '.webp" alt="" style="animation-delay:-' + k * 4.4 + 's">';
    }
    html += '</div>';
    // bubble mascot at the top left
    var bubbles = BUBBLE_SETS[getLang()];
    html += '<div class="nya-buddy"><img src="' + BASE + 'mascot-3.webp" alt=""><span class="nya-bubble">' + bubbles[0] + '</span></div>';
    // ticker
    var tick = '';
    for (var t = 0; t < 6; t++) tick += TICKER;
    html += '<div class="nya-ticker"><div>' + tick + '</div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
    hyper.layer = el;

    var bubble = el.querySelector('.nya-bubble');
    var b = 0;
    hyper.timers.push(
      setInterval(function () {
        b = (b + 1) % bubbles.length;
        bubble.textContent = bubbles[b];
        bubble.classList.remove('nya-pop');
        void bubble.offsetWidth;
        bubble.classList.add('nya-pop');
      }, 4200)
    );

    // sparkle trail behind the cursor
    if (!reducedMotion) {
      var last = 0;
      var trail = ['✧', '♡', '✦', '🐾', '💖'];
      var onMove = function (e) {
        var now = Date.now();
        if (now - last < 45) return;
        last = now;
        var s = document.createElement('span');
        s.className = 'nya-trail';
        s.setAttribute('data-nya-skip', '');
        s.textContent = trail[(now / 45) % trail.length | 0];
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        document.body.appendChild(s);
        setTimeout(s.remove.bind(s), 900);
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      hyper.handlers.push(['pointermove', onMove]);
    }

    // paw favicon
    var icons = Array.prototype.slice.call(document.querySelectorAll('link[rel~="icon"]'));
    hyper.favicon = icons.map(function (l) {
      return { el: l, href: l.getAttribute('href') };
    });
    icons.forEach(function (l) {
      l.setAttribute('href', PAW_ICON);
    });
    if (!icons.length) {
      var link = document.createElement('link');
      link.rel = 'icon';
      link.href = PAW_ICON;
      document.head.appendChild(link);
      hyper.addedIcon = link;
    }
  }

  function stopHyper() {
    if (!hyper) return;
    hyper.timers.forEach(clearInterval);
    hyper.handlers.forEach(function (h) {
      window.removeEventListener(h[0], h[1]);
    });
    if (hyper.layer) hyper.layer.remove();
    (hyper.favicon || []).forEach(function (f) {
      f.el.setAttribute('href', f.href);
    });
    if (hyper.addedIcon) hyper.addedIcon.remove();
    var stray = document.querySelectorAll('.nya-trail,.nya-confetti');
    for (var i = 0; i < stray.length; i++) stray[i].remove();
    hyper = null;
  }

  // ---------- API for the React share cards (src/utils/nya.ts) ----------
  window.nyaMode = {
    level: function () {
      return level;
    },
    /** Text as it should read on a share card right now (unchanged below MAX). */
    text: function (s) {
      return typeof s === 'string' ? transform(s) : s;
    },
    /** Cute version of every text node inside `el` (used on the off-screen share card before it is drawn). */
    cuteTree: function (el) {
      if (level < 2 || !el) return;
      var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var n;
      var nodes = [];
      while ((n = tw.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        for (var p = node.parentNode; p && p !== el; p = p.parentNode) {
          if (p.nodeType === 1 && p.hasAttribute('data-nya-skip')) return;
        }
        var cute = transform(node.nodeValue);
        if (cute !== node.nodeValue) node.nodeValue = cute;
      });
    },
    /** Waits (up to `ms`) for the cute names, so a share card made right after turning MAX on still gets them. */
    namesReady: function (ms) {
      if (level < 2) return Promise.resolve();
      loadNames(); // also refetches when the page language changed
      if (names.size) return Promise.resolve();
      return new Promise(function (resolve) {
        var done = function () {
          window.removeEventListener('nya-names', done);
          resolve();
        };
        window.addEventListener('nya-names', done);
        setTimeout(done, ms || 2500);
      });
    },
    base: BASE
  };

  // Apply the theme right away (before first paint) and add the button once the body exists.
  if (level > 0) {
    loadAssets();
    root.setAttribute('data-nya', String(level));
    toggleAttr('data-nya-max', level >= 2);
    toggleAttr('data-nya-hyper', level >= 3);
  }
  function ready() {
    addButton();
    apply();
    // React can replace the whole body content; keep the button around.
    new MutationObserver(function () {
      if (!button || !button.isConnected) addButton();
    }).observe(document.body, { childList: true });
    // The app sets <html lang> after this script runs (and on /r?l=en links it is not in the path):
    // fetch the names in the right language when it changes.
    new MutationObserver(function () {
      updateButton();
      if (level >= 2) loadNames();
    }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }
  if (document.body) ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();
