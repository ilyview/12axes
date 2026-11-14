/*
 * Nya mode: the pink paw button at the top right of every page.
 *   click 1 -> pink, rounded, paw-print theme
 *   click 2 -> MAX: brighter, floating paws/hearts, every text uwu-ified, ideologies become UwUism,
 *              and countries, parties and people get their cute names
 *   click 3 -> back to normal
 * Plain script (no build step) so it runs on the React app and on the generated catalog pages alike.
 * The level lives in localStorage; the page works normally if storage is blocked.
 */
(function () {
  'use strict';
  if (window.__nyaMode) return;
  window.__nyaMode = true;

  var KEY = '12axes-nya-level';
  var script = document.currentScript;
  var BASE = (script && script.src ? script.src.replace(/[^/]*$/, '') : '/cute/');
  var API = ((script && script.getAttribute('data-api')) || 'https://one2axes-backend.onrender.com').replace(/\/+$/, '');
  if (API.indexOf('%') >= 0) API = 'https://one2axes-backend.onrender.com'; // unreplaced Vite placeholder
  var root = document.documentElement;

  function readLevel() {
    try {
      var v = parseInt(window.localStorage.getItem(KEY) || '0', 10);
      return v === 1 || v === 2 ? v : 0;
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
  // ?nya=0|1|2 in the link sets the level (handy for sharing a link that opens in nya mode)
  var fromUrl = /[?&]nya=([012])\b/.exec(location.search);
  if (fromUrl) {
    level = +fromUrl[1];
    saveLevel(level);
  }

  // ---------- language ----------
  var LANG = (function () {
    var m = /^\/(en|es|de|it)(\/|$)/.exec(location.pathname);
    return m ? m[1] : 'pt';
  })();
  var LABELS = {
    pt: ['Modo nya: ligar', 'Modo nya: MÁXIMO', 'Modo nya: desligar'],
    en: ['Nya mode: on', 'Nya mode: MAX', 'Nya mode: off'],
    es: ['Modo nya: activar', 'Modo nya: MÁXIMO', 'Modo nya: desactivar'],
    de: ['Nya-Modus: an', 'Nya-Modus: MAX', 'Nya-Modus: aus'],
    it: ['Modalità nya: attiva', 'Modalità nya: MAX', 'Modalità nya: disattiva']
  }[LANG];

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
    css.href = BASE + 'cute-mode.css?v=1';
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
    '.nya-btn[data-level="1"] .nya-pip i:first-child,.nya-btn[data-level="2"] .nya-pip i{background:#ff5fa2;opacity:1}' +
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
    button.innerHTML = PAW + '<span class="nya-pip"><i></i><i></i></span>';
    button.addEventListener('click', function () {
      setLevel((level + 1) % 3);
    });
    document.body.appendChild(button);
    updateButton();
  }
  function updateButton() {
    if (!button) return;
    button.setAttribute('data-level', String(level));
    button.setAttribute('aria-label', LABELS[level]);
    button.title = LABELS[level];
    button.setAttribute('aria-pressed', level > 0 ? 'true' : 'false');
  }

  function setLevel(next) {
    level = next;
    saveLevel(level);
    apply();
  }

  function apply() {
    if (level > 0) {
      loadAssets();
      root.setAttribute('data-nya', String(level));
    } else {
      root.removeAttribute('data-nya');
    }
    updateButton();
    if (level === 2) {
      startMax();
    } else {
      stopMax();
    }
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

  function uwuWord(word) {
    // leave numbers, links, e-mails, short acronyms alone
    if (/[0-9@/\\]/.test(word) || (word.length <= 4 && word === word.toUpperCase())) return word;
    var w = word
      .replace(/[rl]/g, 'w')
      .replace(/[RL]/g, 'W')
      .replace(/^([Nn])([aeiouáéíóú])/, function (_, n, v) {
        return n + 'y' + v;
      })
      .replace(/ove/g, 'uv');
    return w;
  }

  function uwuText(text) {
    if (!/\p{L}/u.test(text)) return text;
    var h = hash(text);
    var out = text.replace(/[\p{L}\p{M}'’@/\\0-9.]+/gu, function (token) {
      if (/^https?:|www\.|\.(com|br|app)$/i.test(token)) return token;
      return token.split(/(\.)/).map(uwuWord).join('');
    });
    // a little stutter on the first word of longer texts
    if (text.trim().length > 30 && h % 5 === 0) {
      out = out.replace(/^(\s*)(\p{L})/u, '$1$2-$2');
    }
    // a cute face after sentences
    if (text.trim().length > 22) {
      var n = 0;
      out = out.replace(/([.!?])(\s+|$)/g, function (m, p, sp) {
        n++;
        return p + FACES[(h + n * 7) % FACES.length] + sp;
      });
      if (n === 0 && h % 3 === 0) out = out.replace(/(\s*)$/, FACES[h % FACES.length] + '$1');
    }
    return out;
  }

  // ---------- cute names (from the same catalog the compare page uses) ----------
  var names = new Map();
  var namesRequested = false;
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

  function loadNames() {
    if (namesRequested) return;
    namesRequested = true;
    fetch(API + '/api/compare/catalog?lang=' + LANG + '&rv=2')
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (items) {
        items.forEach(function (item) {
          if (item && item.name && !names.has(item.name)) names.set(item.name, cuteName(item.type, item.name));
        });
        if (level === 2) refreshAll();
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

  function transform(text) {
    var trimmed = text.trim();
    if (!trimmed) return text;
    var named = names.get(trimmed);
    if (named) return text.replace(trimmed, named);
    return uwuText(text);
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
    var cute = uwuText(v);
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
  function refreshAll() {
    originals.forEach(function (rec, node) {
      if (node.isConnected && node.nodeValue === rec.cute) node.nodeValue = rec.orig;
    });
    originals.clear();
    walk(document.body);
    if (titleOrig === null || document.title !== titleOrig.cute) titleOrig = { orig: document.title, cute: uwuText(document.title) };
    document.title = titleOrig.cute;
  }

  // ---------- MAX level extras ----------
  var layer = null;
  var clickHandler = null;
  function startMax() {
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
    }
    refreshAll();
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
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    originals.forEach(function (rec, node) {
      if (node.isConnected && node.nodeValue === rec.cute) node.nodeValue = rec.orig;
    });
    originals.clear();
    attrOriginals.forEach(function (rec, el) {
      if (el.getAttribute(rec.attr) === rec.cute) el.setAttribute(rec.attr, rec.orig);
    });
    attrOriginals.clear();
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

  // Apply the theme right away (before first paint) and add the button once the body exists.
  if (level > 0) {
    loadAssets();
    root.setAttribute('data-nya', String(level));
  }
  function ready() {
    addButton();
    if (level === 2) startMax();
    // React can replace the whole body content; keep the button around.
    new MutationObserver(function () {
      if (!button || !button.isConnected) addButton();
    }).observe(document.body, { childList: true });
  }
  if (document.body) ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();
