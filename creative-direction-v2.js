(() => {
  'use strict';

  const STORAGE_KEY = 'decisions-decisions:tanner-creative-direction:v2';
  const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
  const form = document.getElementById('creativeDirectionV2Form');
  if (!form) return;

  const saveStatus = document.getElementById('saveStatus');
  const progressFill = document.getElementById('progressFill');
  const signalScore = document.getElementById('signalScore');
  const generatedBrief = document.getElementById('generatedBrief');
  const fileStatus = document.getElementById('fileStatus');
  const downloadBriefButton = document.getElementById('downloadBriefButton');
  const printButton = document.getElementById('printButton');
  const clearButton = document.getElementById('clearButton');
  const submitButton = document.getElementById('submitButton');

  let saveTimer = 0;

  const controls = () => Array.from(form.elements).filter((element) => {
    return (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
      && Boolean(element.name)
      && !['bot-field', 'form-name', 'generated_brief', 'form_version'].includes(element.name);
  });

  const groups = () => {
    const map = new Map();
    controls().forEach((control) => {
      if (!map.has(control.name)) map.set(control.name, []);
      map.get(control.name).push(control);
    });
    return map;
  };

  const valuesForName = (name) => {
    const group = groups().get(name) || [];
    if (group.length === 0) return '';
    if (group[0] instanceof HTMLInputElement && group[0].type === 'checkbox') {
      return group.filter((item) => item.checked).map((item) => item.value);
    }
    if (group[0] instanceof HTMLInputElement && group[0].type === 'radio') {
      return group.find((item) => item.checked)?.value || '';
    }
    if (group[0] instanceof HTMLInputElement && group[0].type === 'file') {
      return group.flatMap((item) => Array.from(item.files || []).map((file) => file.name));
    }
    return group[0].value || '';
  };

  const serialize = () => {
    const result = {};
    groups().forEach((_group, name) => {
      result[name] = valuesForName(name);
    });
    return result;
  };

  const setStatus = (message) => {
    if (saveStatus) saveStatus.textContent = message;
  };

  const saveNow = () => {
    try {
      const answers = serialize();
      Object.keys(answers).forEach((key) => {
        const field = form.elements.namedItem(key);
        if (field instanceof HTMLInputElement && field.type === 'file') delete answers[key];
      });
      const payload = { version: 2, savedAt: new Date().toISOString(), answers };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setStatus(`Saved at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`);
    } catch (error) {
      console.error('Could not save form locally.', error);
      setStatus('Local autosave is unavailable in this browser.');
    }
  };

  const queueSave = () => {
    window.clearTimeout(saveTimer);
    setStatus('Saving…');
    saveTimer = window.setTimeout(saveNow, 250);
  };

  const restore = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (!payload?.answers || typeof payload.answers !== 'object') return;

      controls().forEach((control) => {
        if (!Object.prototype.hasOwnProperty.call(payload.answers, control.name)) return;
        const saved = payload.answers[control.name];
        if (control instanceof HTMLInputElement && control.type === 'checkbox') {
          control.checked = Array.isArray(saved) && saved.includes(control.value);
        } else if (control instanceof HTMLInputElement && control.type === 'radio') {
          control.checked = saved === control.value;
        } else if (!(control instanceof HTMLInputElement && control.type === 'file') && typeof saved === 'string') {
          control.value = saved;
        }
      });

      if (payload.savedAt) {
        const when = new Date(payload.savedAt);
        if (!Number.isNaN(when.getTime())) setStatus(`Restored answers saved ${when.toLocaleString()}.`);
      }
    } catch (error) {
      console.error('Could not restore saved answers.', error);
    }
  };

  const enforceChoiceLimit = (container) => {
    const max = Number.parseInt(container.dataset.maxChoices || '', 10);
    if (!Number.isFinite(max) || max <= 0) return;
    const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const help = container.closest('.question')?.querySelector('[data-choice-help]');

    const update = (changed) => {
      const selected = boxes.filter((box) => box.checked);
      if (selected.length > max && changed) changed.checked = false;
      const finalSelected = boxes.filter((box) => box.checked);
      const atLimit = finalSelected.length >= max;
      boxes.forEach((box) => { box.disabled = atLimit && !box.checked; });
      if (help) {
        help.textContent = `${finalSelected.length} of ${max} selected${atLimit ? ' — maximum reached.' : '.'}`;
        help.classList.toggle('choice-limit-hit', atLimit);
      }
    };

    boxes.forEach((box) => box.addEventListener('change', () => update(box)));
    update(null);
  };

  const toList = (value, fallback = 'Not chosen yet') => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
    return value || fallback;
  };

  const briefModel = () => {
    const answers = serialize();
    return {
      territory: toList(answers.primary_visual_territory),
      audience: toList(answers.audience),
      brand: toList(answers.brand_words),
      identity: [toList(answers.color_direction, ''), toList(answers.type_character, '')].filter(Boolean).join(' · ') || 'Not chosen yet',
      card: toList(answers.card_treatment),
      method: toList(answers.third_method_label),
      box: toList(answers.box_story),
      app: toList(answers.app_feel),
      marketing: toList(answers.primary_marketing_message),
      prototype: [toList(answers.prototype_route, ''), toList(answers.first_deliverable, '')].filter(Boolean).join(' · ') || 'Not chosen yet',
      fiveWords: toList(answers.five_direction_words, ''),
      mustSurvive: toList(answers.must_survive, ''),
      finalNote: toList(answers.final_creative_brief, '')
    };
  };

  const keySignalNames = [
    'one_sentence_feel',
    'first_reaction',
    'audience',
    'brand_words',
    'primary_visual_territory',
    'visual_ingredients',
    'color_direction',
    'type_character',
    'card_treatment',
    'card_priorities',
    'third_method_label',
    'box_story',
    'box_front_priorities',
    'app_feel',
    'prototype_screens',
    'primary_marketing_message',
    'prototype_route',
    'first_deliverable',
    'top_priorities',
    'final_creative_brief'
  ];

  const hasValue = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());

  const updateBrief = () => {
    const brief = briefModel();
    Object.entries(brief).forEach(([key, value]) => {
      const node = document.querySelector(`[data-brief="${key}"]`);
      if (node) node.textContent = value;
    });

    const completed = keySignalNames.filter((name) => hasValue(valuesForName(name))).length;
    const percent = Math.round((completed / keySignalNames.length) * 100);
    if (signalScore) signalScore.textContent = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;

    const textBrief = [
      `Primary visual territory: ${brief.territory}`,
      `Audience: ${brief.audience}`,
      `Brand character: ${brief.brand}`,
      `Color / type: ${brief.identity}`,
      `Card treatment: ${brief.card}`,
      `Third method: ${brief.method}`,
      `Box story: ${brief.box}`,
      `App feel: ${brief.app}`,
      `Marketing hook: ${brief.marketing}`,
      `First prototype route: ${brief.prototype}`,
      brief.fiveWords ? `Direction words: ${brief.fiveWords}` : '',
      brief.mustSurvive ? `Must survive: ${brief.mustSurvive}` : '',
      brief.finalNote ? `Final art-direction note: ${brief.finalNote}` : ''
    ].filter(Boolean).join('\n');

    if (generatedBrief) generatedBrief.value = textBrief;
    return { brief, percent, textBrief, answers: serialize() };
  };

  const validateFiles = () => {
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    const files = fileInputs.flatMap((input) => Array.from(input.files || []));
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const mb = total / (1024 * 1024);
    const valid = total <= MAX_UPLOAD_BYTES;

    if (fileStatus) {
      if (!files.length) {
        fileStatus.textContent = 'No images attached.';
        fileStatus.classList.remove('error');
      } else if (valid) {
        fileStatus.textContent = `${files.length} image${files.length === 1 ? '' : 's'} attached · ${mb.toFixed(1)} MB total.`;
        fileStatus.classList.remove('error');
      } else {
        fileStatus.textContent = `Attachments total ${mb.toFixed(1)} MB. Reduce them below 7 MB before submitting.`;
        fileStatus.classList.add('error');
      }
    }

    if (submitButton) submitButton.disabled = !valid;
    return valid;
  };

  const downloadBrief = () => {
    const payload = updateBrief();
    const exportData = {
      questionnaire: 'Decisions, Decisions — Creative Direction Studio',
      version: 2,
      exportedAt: new Date().toISOString(),
      completion: payload.percent,
      prototypeBrief: payload.brief,
      generatedBrief: payload.textBrief,
      answers: payload.answers
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decisions-decisions-creative-brief-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Prototype brief downloaded.');
  };

  const clearAnswers = () => {
    if (!window.confirm('Clear all answers saved in this browser?')) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    document.querySelectorAll('[data-max-choices]').forEach((container) => {
      container.querySelectorAll('input[type="checkbox"]').forEach((box) => { box.disabled = false; });
      const help = container.closest('.question')?.querySelector('[data-choice-help]');
      if (help) help.textContent = '';
    });
    setStatus('Saved answers cleared.');
    validateFiles();
    updateBrief();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  restore();
  document.querySelectorAll('[data-max-choices]').forEach(enforceChoiceLimit);

  const dateInput = form.elements.namedItem('response_date');
  if (dateInput instanceof HTMLInputElement && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  form.addEventListener('input', () => {
    queueSave();
    updateBrief();
  });
  form.addEventListener('change', () => {
    queueSave();
    updateBrief();
    validateFiles();
  });
  form.addEventListener('submit', (event) => {
    updateBrief();
    saveNow();
    if (!validateFiles()) {
      event.preventDefault();
      fileStatus?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    setStatus('Submitting creative direction…');
  });

  downloadBriefButton?.addEventListener('click', downloadBrief);
  printButton?.addEventListener('click', () => window.print());
  clearButton?.addEventListener('click', clearAnswers);

  validateFiles();
  updateBrief();
})();
