(() => {
  const input = document.querySelector('#photo-input');
  const box = document.querySelector('#photo-box');
  const previewImage = document.querySelector('#photo-preview');
  const status = document.querySelector('#photo-status');
  const progress = document.querySelector('#ocr-progress');
  if (!input || !box || !previewImage || !status || !progress) return;

  let importRun = 0;
  let importedLayout = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeDigits = value => String(value || '')
    .replace(/[０-９]/g, ch => String(ch.charCodeAt(0) - 0xFF10))
    .replace(/[，、]/g, ',')
    .replace(/[￥]/g, '¥');

  // Keep imported OCR positions through preview refresh/save without changing the drag editor internals.
  if (typeof currentCard === 'function' && !window.__priceNoteImageImportWrapped) {
    window.__priceNoteImageImportWrapped = true;
    const originalCurrentCard = currentCard;
    currentCard = function() {
      const item = originalCurrentCard();
      if (importedLayout) {
        item.positions = structuredCloneSafe(importedLayout.positions);
        item.fontScales = structuredCloneSafe(importedLayout.fontScales);
      }
      return item;
    };

    document.querySelector('#reset-form')?.addEventListener('click', () => { importedLayout = null; }, true);
    document.querySelector('#product-list')?.addEventListener('click', event => {
      if (event.target.closest('[data-edit]')) importedLayout = null;
    }, true);
    document.querySelector('#card-form')?.addEventListener('submit', () => {
      setTimeout(() => { importedLayout = null; }, 0);
    });
  }

  input.addEventListener('change', handleImageImport, true);

  async function handleImageImport(event) {
    // Replace the older one-pass handler in app.js.
    event.stopImmediatePropagation();
    const file = input.files?.[0];
    if (!file) return;
    const run = ++importRun;

    box.hidden = false;
    previewImage.src = URL.createObjectURL(file);
    setStatus('高精度解析の準備中…', 3);

    let worker;
    try {
      const source = await prepareCanvas(file);
      if (run !== importRun) return;

      const background = estimateBackground(source.canvas);
      const enhanced = makeOcrCanvas(source.canvas, background);
      bgInput.value = background;
      fgInput.value = isDarkColor(background) ? '#ffffff' : '#111827';
      renderPreview();

      if (!window.Tesseract?.createWorker) throw new Error('OCR engine unavailable');

      setStatus('文字を高精度で読み取り中…', 12);
      worker = await Tesseract.createWorker('jpn+eng', Tesseract.OEM?.LSTM_ONLY ?? 1, {
        logger: message => {
          if (run !== importRun || message.status !== 'recognizing text') return;
          const pct = 12 + Math.round((message.progress || 0) * 72);
          setStatus(`文字を高精度で読み取り中… ${Math.round((message.progress || 0) * 100)}%`, pct);
        }
      });

      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: String(Tesseract.PSM?.SPARSE_TEXT ?? 11)
      });

      let result = await worker.recognize(enhanced, {}, { text: true, blocks: true });
      let analysis = analyzeRecognition(result?.data, source.canvas.width, source.canvas.height);

      // Sparse cards occasionally read better as one block. Retry only when the first pass is weak.
      if (analysis.lines.length < 2 || analysis.confidence < 48) {
        setStatus('読み取り結果を再確認中…', 86);
        await worker.setParameters({ tessedit_pageseg_mode: String(Tesseract.PSM?.SINGLE_BLOCK ?? 6) });
        const retry = await worker.recognize(source.canvas, {}, { text: true, blocks: true });
        const retryAnalysis = analyzeRecognition(retry?.data, source.canvas.width, source.canvas.height);
        if (recognitionScore(retryAnalysis) > recognitionScore(analysis)) {
          result = retry;
          analysis = retryAnalysis;
        }
      }

      if (run !== importRun) return;
      applyRecognition(analysis, source.canvas, background);
      setStatus(`読み取り完了（認識目安 ${Math.round(analysis.confidence)}%）。内容を確認してください。`, 100);
      showToast?.('画像から高精度で取り込みました');
    } catch (error) {
      console.error('price-note image import v2', error);
      setStatus('画像解析に失敗しました。画像を正面から大きく撮り直してください。', 0);
      showToast?.('画像の読み取りに失敗しました');
    } finally {
      try { await worker?.terminate(); } catch {}
    }
  }

  function setStatus(text, value) {
    status.textContent = text;
    progress.value = clamp(Number(value) || 0, 0, 100);
  }

  async function prepareCanvas(file) {
    const image = await loadImage(file);
    const longEdge = Math.max(image.naturalWidth, image.naturalHeight);
    let scale = longEdge < 1400 ? Math.min(2, 1700 / Math.max(1, longEdge)) : 1;
    scale = Math.min(scale, 2400 / Math.max(1, longEdge));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return { canvas, width, height };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      image.src = url;
    });
  }

  function estimateBackground(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height).data;
    const thickness = Math.max(2, Math.round(Math.min(width, height) * 0.035));
    const buckets = new Map();
    const step = Math.max(1, Math.floor(Math.min(width, height) / 180));

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (x >= thickness && x < width - thickness && y >= thickness && y < height - thickness) continue;
        const i = (y * width + x) * 4;
        const r = image[i], g = image[i + 1], b = image[i + 2];
        const key = `${Math.round(r / 16) * 16},${Math.round(g / 16) * 16},${Math.round(b / 16) * 16}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
    }

    const best = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!best) return '#101c32';
    const rgb = best.split(',').map(Number).map(v => clamp(v, 0, 255));
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }

  function makeOcrCanvas(source, background) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const src = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
    const dst = new ImageData(new Uint8ClampedArray(src.data), source.width, source.height);
    const values = [];
    const step = Math.max(4, Math.floor(src.data.length / 4 / 50000));
    for (let p = 0; p < source.width * source.height; p += step) {
      const i = p * 4;
      values.push(luminance(src.data[i], src.data[i + 1], src.data[i + 2]));
    }
    values.sort((a, b) => a - b);
    const low = values[Math.floor(values.length * 0.04)] ?? 0;
    const high = values[Math.floor(values.length * 0.96)] ?? 255;
    const range = Math.max(30, high - low);
    const invert = isDarkColor(background);

    for (let i = 0; i < dst.data.length; i += 4) {
      let value = luminance(src.data[i], src.data[i + 1], src.data[i + 2]);
      value = clamp(((value - low) / range) * 255, 0, 255);
      value = Math.pow(value / 255, 0.92) * 255;
      if (invert) value = 255 - value;
      value = value < 118 ? Math.max(0, value - 18) : Math.min(255, value + 12);
      dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = value;
      dst.data[i + 3] = 255;
    }
    canvas.getContext('2d').putImageData(dst, 0, 0);
    return canvas;
  }

  function analyzeRecognition(data, width, height) {
    const rawText = String(data?.text || '').replace(/\r/g, '');
    const lines = flattenLines(data?.blocks).map(line => ({
      ...line,
      text: cleanLine(line.text),
      cx: ((line.bbox.x0 + line.bbox.x1) / 2) / width,
      cy: ((line.bbox.y0 + line.bbox.y1) / 2) / height,
      w: Math.max(1, line.bbox.x1 - line.bbox.x0) / width,
      h: Math.max(1, line.bbox.y1 - line.bbox.y0) / height
    })).filter(line => line.text);

    const confidence = Number.isFinite(Number(data?.confidence))
      ? Number(data.confidence)
      : (lines.length ? lines.reduce((sum, line) => sum + (line.confidence || 0), 0) / lines.length : 0);

    return { rawText, lines, confidence, width, height };
  }

  function flattenLines(blocks) {
    const out = [];
    for (const block of blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          if (!line?.bbox) continue;
          const wordConf = (line.words || []).map(word => Number(word.confidence)).filter(Number.isFinite);
          out.push({
            text: line.text || (line.words || []).map(word => word.text).join(' '),
            bbox: line.bbox,
            confidence: wordConf.length ? wordConf.reduce((a, b) => a + b, 0) / wordConf.length : 0
          });
        }
      }
    }
    return out;
  }

  function cleanLine(value) {
    return normalizeDigits(value)
      .replace(/[|｜¦]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function recognitionScore(analysis) {
    return (analysis.confidence || 0) + Math.min(40, analysis.lines.length * 5);
  }

  function applyRecognition(analysis, canvas, background) {
    const { rawText, lines } = analysis;
    const normalizedRaw = normalizeDigits(rawText);
    const priceCandidate = findPrice(lines, normalizedRaw);
    const titleCandidate = findTitle(lines, priceCandidate?.line);
    const noteCandidate = findNote(lines, titleCandidate, priceCandidate?.line);

    if (titleCandidate?.text) nameInput.value = cleanupTitle(titleCandidate.text);
    if (priceCandidate?.value) priceInput.value = priceCandidate.value;

    const unit = findUnit(normalizedRaw);
    if (unit && [...unitInput.options].some(option => option.value === unit)) unitInput.value = unit;

    if (/税込価格/.test(normalizedRaw)) taxInput.value = '税込価格';
    else if (/税込/.test(normalizedRaw)) taxInput.value = '税込';

    const allergens = findAllergens(normalizedRaw);
    if (allergens.length) allergyInput.value = allergens.join('、');
    document.querySelectorAll('[data-allergen]').forEach(button => {
      button.classList.toggle('active', allergens.includes(button.dataset.allergen));
    });

    if (noteCandidate?.text) noteInput.value = cleanupNote(noteCandidate.text);
    applyDetailFields(normalizedRaw);

    const foreground = estimateForeground(canvas, background, [titleCandidate, priceCandidate?.line, noteCandidate].filter(Boolean));
    if (foreground) fgInput.value = foreground;

    const positions = {
      name: positionFromLine(titleCandidate, { x: 50, y: 27 }),
      price: positionFromLine(priceCandidate?.line, { x: 50, y: 55 }),
      note: positionFromLine(noteCandidate, { x: 50, y: 70 }),
      details: positionFromLine(findDetailsAnchor(lines), { x: 50, y: 87 })
    };
    const fontScales = {
      name: scaleFromLine(titleCandidate, 0.12),
      price: scaleFromLine(priceCandidate?.line, 0.18),
      note: scaleFromLine(noteCandidate, 0.055),
      details: scaleFromLine(findDetailsAnchor(lines), 0.045)
    };
    importedLayout = { positions, fontScales };

    if (titleCandidate?.h) {
      const estimated = Math.round(clamp(24 + titleCandidate.h * 120, 24, 56));
      titleSizeInput.value = String(estimated);
      titleSizeValue.textContent = String(estimated);
    }

    renderPreview();
  }

  function findPrice(lines, raw) {
    const candidates = [];
    for (const line of lines) {
      for (const value of pricesInText(line.text)) {
        let score = 0;
        if (/[¥円]/.test(line.text)) score += 45;
        if (/税込|税抜/.test(line.text)) score += 6;
        score += line.h * 260;
        score += line.w * 20;
        if (line.cy > 0.28 && line.cy < 0.83) score += 10;
        if (/100\s*g/i.test(line.text) && value === 100) score -= 80;
        if (value >= 100 && value <= 99999) score += 8;
        candidates.push({ value, line, score });
      }
    }
    if (!candidates.length) {
      const rawValues = pricesInText(raw).filter(value => value >= 100);
      if (rawValues.length) return { value: rawValues.sort((a, b) => b - a)[0], line: null, score: 1 };
      return null;
    }
    return candidates.sort((a, b) => b.score - a.score)[0];
  }

  function pricesInText(text) {
    const normalized = normalizeDigits(text);
    const values = [];
    const pattern = /(?:¥\s*)?([0-9OoIl]{2,3}(?:\s*[,\.]\s*[0-9OoIl]{3})+|[0-9OoIl]{2,6})\s*(?:円)?/g;
    for (const match of normalized.matchAll(pattern)) {
      const around = match[0];
      let digits = match[1].replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/[,\.\s]/g, '');
      const value = Number(digits);
      if (!Number.isFinite(value) || value < 10 || value > 999999) continue;
      if (!/[¥円,\.]/.test(around) && value < 100) continue;
      values.push(value);
    }
    return values;
  }

  function findTitle(lines, priceLine) {
    const candidates = lines.filter(line => line !== priceLine && isLikelyTitle(line.text));
    return candidates.map(line => {
      const japanese = (line.text.match(/[ぁ-んァ-ヶ一-龠]/g) || []).length;
      const digitRatio = ((line.text.match(/[0-9]/g) || []).length) / Math.max(1, line.text.length);
      let score = line.h * 420 + line.w * 45 + (line.confidence || 0) * 0.12 + japanese * 1.5;
      if (line.cy < 0.56) score += 18;
      if (line.cy > 0.78) score -= 35;
      score -= digitRatio * 80;
      return { ...line, score };
    }).sort((a, b) => b.score - a.score)[0] || null;
  }

  function isLikelyTitle(text) {
    if (!text || text.length < 2 || text.length > 40) return false;
    if (/税込|税抜|アレルギ|原材料|原産地|加工地|保存方法|内容量|賞味|消費|100\s*g|[¥￥]\s*\d|\d+\s*円/i.test(text)) return false;
    if (/^[\d\s,\.¥￥円()（）%]+$/.test(text)) return false;
    return true;
  }

  function findNote(lines, title, priceLine) {
    const candidates = lines.filter(line => line !== title && line !== priceLine && line.cy > 0.42 && line.cy < 0.84)
      .filter(line => isLikelyNote(line.text));
    return candidates.map(line => ({
      ...line,
      score: line.h * 130 + line.w * 20 + (line.confidence || 0) * 0.08 - Math.abs(line.cy - 0.7) * 15
    })).sort((a, b) => b.score - a.score)[0] || null;
  }

  function isLikelyNote(text) {
    if (!text || text.length < 2 || text.length > 45) return false;
    if (/税込|税抜|アレルギ|原材料|原産地|加工地|保存方法|内容量|[¥￥]\s*\d|\d+\s*円/i.test(text)) return false;
    return true;
  }

  function cleanupTitle(text) {
    return cleanLine(text).replace(/^[・●■◆★☆]+|[・●■◆★☆]+$/g, '').trim();
  }

  function cleanupNote(text) {
    return cleanLine(text).replace(/^[※＊*・]+\s*/, '').trim();
  }

  function findUnit(raw) {
    const text = normalizeDigits(raw).replace(/\s+/g, '');
    if (/100[gｇＧ]/i.test(text)) return '100g';
    if (/1個/.test(text)) return '1個';
    if (/1パック/.test(text)) return '1パック';
    if (/1本/.test(text)) return '1本';
    if (/1袋/.test(text)) return '1袋';
    return '';
  }

  function findAllergens(raw) {
    const names = ['小麦', '大豆', '乳成分', '乳', '卵', 'えび', 'エビ', 'かに', 'カニ', 'くるみ', 'そば', '落花生', 'ピーナッツ'];
    const mapped = names.filter(name => raw.includes(name)).map(name => {
      if (name === '乳') return '乳成分';
      if (name === 'エビ') return 'えび';
      if (name === 'カニ') return 'かに';
      if (name === 'ピーナッツ') return '落花生';
      return name;
    });
    return [...new Set(mapped)];
  }

  function applyDetailFields(raw) {
    const fields = [
      ['#ingredients', ['原材料名?', '原材料']],
      ['#origin', ['原産地']],
      ['#processing-place', ['加工地', '加工場所']],
      ['#storage-method', ['保存方法']]
    ];
    for (const [selector, labels] of fields) {
      const element = document.querySelector(selector);
      if (!element) continue;
      for (const label of labels) {
        const match = raw.match(new RegExp(`${label}\\s*[：:]?\\s*([^\\n]+)`));
        if (match?.[1]) {
          element.value = match[1].trim();
          break;
        }
      }
    }
  }

  function findDetailsAnchor(lines) {
    const details = lines.filter(line => /アレルギ|原材料|原産地|加工地|保存方法|内容量|賞味|消費/.test(line.text));
    if (!details.length) return null;
    return details.sort((a, b) => b.cy - a.cy)[0];
  }

  function positionFromLine(line, fallback) {
    if (!line) return fallback;
    return { x: clamp(Math.round(line.cx * 1000) / 10, 3, 97), y: clamp(Math.round(line.cy * 1000) / 10, 3, 97) };
  }

  function scaleFromLine(line, expectedHeight) {
    if (!line?.h) return 1;
    return Math.round(clamp(line.h / expectedHeight, 0.55, 1.9) * 100) / 100;
  }

  function estimateForeground(canvas, background, selectedLines) {
    const boxes = selectedLines.filter(line => line?.bbox).map(line => line.bbox);
    if (!boxes.length) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const bg = hexToRgb(background);
    const buckets = new Map();

    for (const bbox of boxes) {
      const x0 = clamp(Math.floor(bbox.x0), 0, canvas.width - 1);
      const y0 = clamp(Math.floor(bbox.y0), 0, canvas.height - 1);
      const x1 = clamp(Math.ceil(bbox.x1), x0 + 1, canvas.width);
      const y1 = clamp(Math.ceil(bbox.y1), y0 + 1, canvas.height);
      const step = Math.max(1, Math.floor(Math.max(x1 - x0, y1 - y0) / 180));
      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const contrast = colorDistance({ r, g, b }, bg);
          if (contrast < 85) continue;
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${clamp(qr, 0, 255)},${clamp(qg, 0, 255)},${clamp(qb, 0, 255)}`;
          buckets.set(key, (buckets.get(key) || 0) + 1 + contrast / 255);
        }
      }
    }
    const best = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!best) return isDarkColor(background) ? '#ffffff' : '#111827';
    const [r, g, b] = best.split(',').map(Number);
    return rgbToHex(r, g, b);
  }

  function isDarkColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    return luminance(r, g, b) < 145;
  }

  function luminance(r, g, b) {
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  function colorDistance(a, b) {
    return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#000000').replace('#', '').padEnd(6, '0');
    return {
      r: parseInt(clean.slice(0, 2), 16) || 0,
      g: parseInt(clean.slice(2, 4), 16) || 0,
      b: parseInt(clean.slice(4, 6), 16) || 0
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
})();
