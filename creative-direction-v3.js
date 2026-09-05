(() => {
  'use strict';

  const STORAGE_KEY = 'decisions-decisions:tanner-creative-direction:v3';
  const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
  const form = document.getElementById('questionnaire');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.flow-step'));
  const phaseTabs = Array.from(document.querySelectorAll('[data-go-step]'));
  const journeyFill = document.getElementById('journeyFill');
  const phaseCounter = document.getElementById('phaseCounter');
  const phaseTitle = document.getElementById('phaseTitle');
  const saveStatus = document.getElementById('saveStatus');
  const signalScore = document.getElementById('signalScore');
  const generatedBrief = document.getElementById('generatedBrief');
  const stepCompletion = document.getElementById('stepCompletion');
  const backButton = document.getElementById('backButton');
  const nextButton = document.getElementById('nextButton');
  const downloadBriefButton = document.getElementById('downloadBriefButton');
  const printButton = document.getElementById('printButton');
  const clearButton = document.getElementById('clearButton');
  const submitButton = document.getElementById('submitButton');
  const fileStatus = document.getElementById('fileStatus');
  const reviewGrid = document.getElementById('reviewGrid');
  const missingSignals = document.getElementById('missingSignals');

  const phaseConfig = [
    {
      hash: 'target',
      title: 'Set the Target',
      signals: [
        ['one_sentence_feel', 'One-sentence feel'],
        ['first_reaction', 'First reaction'],
        ['audience', 'Primary audience'],
        ['brand_words', 'Brand personality']
      ]
    },
    {
      hash: 'look',
      title: 'Choose the Look',
      signals: [
        ['primary_visual_territory', 'Visual territory'],
        ['color_direction', 'Color direction'],
        ['type_character', 'Typography'],
        ['logo_direction', 'Logo direction']
      ]
    },
    {
      hash: 'product',
      title: 'Design the Product',
      signals: [
        ['card_treatment', 'Card treatment'],
        ['card_priorities', 'Card priorities'],
        ['third_method_label', 'Third method'],
        ['box_story', 'Box story'],
        ['app_feel', 'App feel'],
        ['prototype_screens', 'Prototype screens']
      ]
    },
    {
      hash: 'sell',
      title: 'Make It Sell',
      signals: [
        ['primary_marketing_message', 'Marketing message'],
        ['marketing_assets', 'Marketing assets']
      ]
    },
    {
      hash: 'lock',
      title: 'Lock the Brief',
      signals: [
        ['prototype_route', 'Prototype route'],
        ['first_deliverable', 'First deliverable'],
        ['top_priorities', 'Top priorities'],
        ['final_creative_brief', 'Final creative note']
      ]
    }
  ];

  let activeStep = 0;
  let saveTimer = 0;
  const limitUpdaters = [];

  const setStatus = (message) => {
    if (saveStatus) saveStatus.textContent = message;
  };

  const controls = () => Array.from(form.elements).filter((element) => {
    return (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
      && Boolean(element.name)
      && !['bot-field', 'form-name', 'generated_brief', 'form_version'].includes(element.name);
  });

  const groupedControls = () => {
    const map = new Map();
    controls().forEach((control) => {
      if (!map.has(control.name)) map.set(control.name, []);
      map.get(control.name).push(control);
    });
    return map;
  };

  const valueFor = (name) => {
    const group = groupedControls().get(name) || [];
    if (!group.length) return '';
    const first = group[0];
    if (first instanceof HTMLInputElement && first.type === 'checkbox') {
      return group.filter((item) => item.checked).map((item) => item.value);
    }
    if (first instanceof HTMLInputElement && first.type === 'radio') {
      return group.find((item) => item.checked)?.value || '';
    }
    if (first instanceof HTMLInputElement && first.type === 'file') {
      return group.flatMap((item) => Array.from(item.files || []).map((file) => file.name));
    }
    return first.value || '';
  };

  const hasValue = (value) => Array.isArray(value)
    ? value.length > 0
    : Boolean(String(value || '').trim());

  const serialize = () => {
    const result = {};
    groupedControls().forEach((_group, name) => {
      result[name] = valueFor(name);
    });
    return result;
  };

  const serializableAnswers = () => {
    const answers = serialize();
    groupedControls().forEach((group, name) => {
      if (group[0] instanceof HTMLInputElement && group[0].type === 'file') {
        delete answers[name];
      }
    });
    return answers;
  };

  const toText = (value, fallback = 'Open') => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
    return String(value || '').trim() || fallback;
  };

  const briefModel = () => ({
    territory: toText(valueFor('primary_visual_territory')),
    audience: toText(valueFor('audience')),
    brand: toText(valueFor('brand_words')),
    identity: [toText(valueFor('color_direction'), ''), toText(valueFor('type_character'), '')].filter(Boolean).join(' · ') || 'Open',
    card: toText(valueFor('card_treatment')),
    method: toText(valueFor('third_method_label')),
    box: toText(valueFor('box_story')),
    app: toText(valueFor('app_feel')),
    marketing: toText(valueFor('primary_marketing_message')),
    prototype: [toText(valueFor('prototype_route'), ''), toText(valueFor('first_deliverable'), '')].filter(Boolean).join(' · ') || 'Open'
  });

  const allSignalEntries = () => phaseConfig.flatMap((phase, stepIndex) =>
    phase.signals.map(([name, label]) => ({ name, label, stepIndex }))
  );

  const phaseCompletion = (stepIndex) => {
    const phase = phaseConfig[stepIndex];
    const completed = phase.signals.filter(([name]) => hasValue(valueFor(name))).length;
    return { completed, total: phase.signals.length, complete: completed === phase.signals.length };
  };

  const buildGeneratedBrief = () => {
    const brief = briefModel();
    const lines = [
      `Primary visual territory: ${brief.territory}`,
      `Audience: ${brief.audience}`,
      `Brand character: ${brief.brand}`,
      `Color / type: ${brief.identity}`,
      `Card treatment: ${brief.card}`,
      `Third method: ${brief.method}`,
      `Box story: ${brief.box}`,
      `App feel: ${brief.app}`,
      `Marketing hook: ${brief.marketing}`,
      `First prototype: ${brief.prototype}`,
      hasValue(valueFor('five_direction_words')) ? `Direction words: ${toText(valueFor('five_direction_words'), '')}` : '',
      hasValue(valueFor('must_survive')) ? `Must survive: ${toText(valueFor('must_survive'), '')}` : '',
      hasValue(valueFor('free_to_change')) ? `Free to change: ${toText(valueFor('free_to_change'), '')}` : '',
      hasValue(valueFor('final_creative_brief')) ? `Final creative note: ${toText(valueFor('final_creative_brief'), '')}` : ''
    ].filter(Boolean);
    return lines.join('\n');
  };

  const updateBrief = () => {
    const brief = briefModel();
    Object.entries(brief).forEach(([key, value]) => {
      const node = document.querySelector(`[data-brief="${key}"]`);
      if (node) node.textContent = value;
    });

    const signals = allSignalEntries();
    const completed = signals.filter(({ name }) => hasValue(valueFor(name))).length;
    const percent = signals.length ? Math.round((completed / signals.length) * 100) : 0;
    if (signalScore) signalScore.textContent = `${percent}%`;
    if (generatedBrief) generatedBrief.value = buildGeneratedBrief();

    phaseConfig.forEach((_phase, index) => {
      const tab = phaseTabs.find((item) => Number(item.dataset.goStep) === index);
      const state = document.querySelector(`[data-step-state="${index}"]`);
      const completion = phaseCompletion(index);
      tab?.classList.toggle('is-complete', completion.complete);
      if (state) state.setAttribute('aria-label', completion.complete ? 'Phase complete' : 'Phase incomplete');
    });

    const current = phaseCompletion(activeStep);
    if (stepCompletion) {
      if (activeStep === steps.length - 1) {
        stepCompletion.textContent = `${current.completed} of ${current.total} key calls made · review, then submit`;
      } else {
        stepCompletion.textContent = `${current.completed} of ${current.total} key calls made in this phase`;
      }
    }

    updateReview();
    return { brief, percent };
  };

  const reviewItems = [
    ['Audience', 'audience'],
    ['Brand character', 'brand_words'],
    ['Visual world', 'primary_visual_territory'],
    ['Color', 'color_direction'],
    ['Typography', 'type_character'],
    ['Logo', 'logo_direction'],
    ['Card treatment', 'card_treatment'],
    ['Third method', 'third_method_label'],
    ['Box story', 'box_story'],
    ['App feel', 'app_feel'],
    ['Marketing hook', 'primary_marketing_message'],
    ['First build', 'first_deliverable']
  ];

  const updateReview = () => {
    if (!reviewGrid) return;
    reviewGrid.replaceChildren();
    reviewItems.forEach(([label, name]) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const labelNode = document.createElement('span');
      labelNode.textContent = label;
      const valueNode = document.createElement('strong');
      valueNode.textContent = toText(valueFor(name));
      item.append(labelNode, valueNode);
      reviewGrid.appendChild(item);
    });

    if (!missingSignals) return;
    const missing = allSignalEntries().filter(({ name }) => !hasValue(valueFor(name)));
    if (!missing.length) {
      missingSignals.hidden = true;
      missingSignals.replaceChildren();
      return;
    }

    missingSignals.hidden = false;
    missingSignals.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${missing.length} key decision${missing.length === 1 ? '' : 's'} still open`;
    const list = document.createElement('div');
    list.className = 'missing-list';
    missing.forEach(({ name, label, stepIndex }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        showStep(stepIndex, { focusTop: false });
        window.setTimeout(() => {
          const target = form.querySelector(`[name="${CSS.escape(name)}"]`);
          const block = target?.closest('.question, .field, .panel-block') || target;
          block?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target?.focus({ preventScroll: true });
        }, 120);
      });
      list.appendChild(button);
    });
    missingSignals.append(heading, list);
  };

  const showStep = (index, options = {}) => {
    const { focusTop = true, updateHash = true } = options;
    const safeIndex = Math.max(0, Math.min(index, steps.length - 1));
    activeStep = safeIndex;

    steps.forEach((step, stepIndex) => {
      const active = stepIndex === safeIndex;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });

    phaseTabs.forEach((tab) => {
      const active = Number(tab.dataset.goStep) === safeIndex;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-current', active ? 'step' : 'false');
    });

    const phase = phaseConfig[safeIndex];
    if (phaseCounter) phaseCounter.textContent = `Phase ${safeIndex + 1} of ${steps.length}`;
    if (phaseTitle) phaseTitle.textContent = phase.title;
    if (journeyFill) journeyFill.style.width = `${((safeIndex + 1) / steps.length) * 100}%`;
    if (backButton) backButton.disabled = safeIndex === 0;
    if (nextButton) {
      nextButton.hidden = safeIndex === steps.length - 1;
      nextButton.textContent = safeIndex === steps.length - 2 ? 'Review & lock' : 'Continue';
    }

    if (updateHash) {
      const url = new URL(window.location.href);
      url.hash = phase.hash;
      history.replaceState(null, '', url);
    }

    try {
      const payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      payload.activeStep = safeIndex;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.debug('Could not persist active phase.', error);
    }

    updateBrief();

    if (focusTop) {
      const studioTop = document.getElementById('studio');
      const stickyHeight = document.getElementById('journeyShell')?.offsetHeight || 0;
      const top = (studioTop?.getBoundingClientRect().top || 0) + window.scrollY - stickyHeight - 14;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      window.setTimeout(() => {
        steps[safeIndex]?.querySelector('h2')?.focus?.({ preventScroll: true });
      }, 180);
    }
  };

  const setupChoiceLimit = (container) => {
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
    limitUpdaters.push(() => update(null));
    update(null);
  };

  const validateFiles = () => {
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    const files = fileInputs.flatMap((input) => Array.from(input.files || []));
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const totalMb = total / (1024 * 1024);
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    const invalidType = files.find((file) => !allowedTypes.has(file.type));
    const valid = total <= MAX_UPLOAD_BYTES && !invalidType;

    if (fileStatus) {
      fileStatus.classList.toggle('error', !valid);
      if (invalidType) {
        fileStatus.textContent = `${invalidType.name} is not a supported image type. Use PNG, JPEG, or WebP.`;
      } else if (total > MAX_UPLOAD_BYTES) {
        fileStatus.textContent = `Attachments total ${totalMb.toFixed(1)} MB. Reduce them below 7 MB before submitting.`;
      } else if (!files.length) {
        fileStatus.textContent = 'No images attached.';
      } else {
        fileStatus.textContent = `${files.length} image${files.length === 1 ? '' : 's'} attached · ${totalMb.toFixed(1)} MB total.`;
      }
    }

    if (submitButton) submitButton.disabled = !valid;
    return valid;
  };

  const saveNow = () => {
    try {
      const payload = {
        version: 3,
        savedAt: new Date().toISOString(),
        activeStep,
        answers: serializableAnswers()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setStatus(`Saved on this device at ${time}.`);
    } catch (error) {
      console.error('Could not save questionnaire locally.', error);
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
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload?.answers || typeof payload.answers !== 'object') return payload;

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
        const date = new Date(payload.savedAt);
        if (!Number.isNaN(date.getTime())) setStatus(`Restored answers saved ${date.toLocaleString()}.`);
      }
      return payload;
    } catch (error) {
      console.error('Could not restore saved answers.', error);
      return null;
    }
  };

  const downloadBrief = () => {
    const brief = briefModel();
    const signals = allSignalEntries();
    const completed = signals.filter(({ name }) => hasValue(valueFor(name))).length;
    const payload = {
      questionnaire: 'Decisions, Decisions — Creative Direction Studio',
      version: 3,
      exportedAt: new Date().toISOString(),
      completion: Math.round((completed / signals.length) * 100),
      prototypeBrief: brief,
      generatedBrief: buildGeneratedBrief(),
      answers: serialize()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decisions-decisions-creative-brief-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Prototype brief downloaded.');
  };

  const clearAnswers = () => {
    if (!window.confirm('Clear all answers saved in this browser? This cannot be undone unless you downloaded a brief.')) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    const dateInput = form.elements.namedItem('response_date');
    if (dateInput instanceof HTMLInputElement) dateInput.value = new Date().toISOString().slice(0, 10);
    limitUpdaters.forEach((update) => update());
    validateFiles();
    setStatus('Saved answers cleared.');
    showStep(0, { focusTop: true });
    updateBrief();
  };

  const restored = restore();
  document.querySelectorAll('[data-max-choices]').forEach(setupChoiceLimit);

  const dateInput = form.elements.namedItem('response_date');
  if (dateInput instanceof HTMLInputElement && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  const hashIndex = phaseConfig.findIndex((phase) => `#${phase.hash}` === window.location.hash);
  const restoredStep = Number.isInteger(restored?.activeStep) ? restored.activeStep : 0;
  activeStep = hashIndex >= 0 ? hashIndex : Math.max(0, Math.min(restoredStep, steps.length - 1));

  phaseTabs.forEach((tab) => {
    tab.addEventListener('click', () => showStep(Number(tab.dataset.goStep)));
  });
  backButton?.addEventListener('click', () => showStep(activeStep - 1));
  nextButton?.addEventListener('click', () => showStep(activeStep + 1));
  downloadBriefButton?.addEventListener('click', downloadBrief);
  printButton?.addEventListener('click', () => window.print());
  clearButton?.addEventListener('click', clearAnswers);

  form.addEventListener('input', () => {
    queueSave();
    updateBrief();
  });
  form.addEventListener('change', () => {
    queueSave();
    validateFiles();
    updateBrief();
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

  window.addEventListener('hashchange', () => {
    const index = phaseConfig.findIndex((phase) => `#${phase.hash}` === window.location.hash);
    if (index >= 0 && index !== activeStep) showStep(index, { updateHash: false });
  });

  validateFiles();
  showStep(activeStep, { focusTop: false, updateHash: hashIndex < 0 });
  limitUpdaters.forEach((update) => update());
  updateBrief();
})();
