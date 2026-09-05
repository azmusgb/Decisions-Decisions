(() => {
  'use strict';

  const STORAGE_KEY = 'decisions-decisions:tanner-creative-direction:v1';
  const form = document.getElementById('creativeDirectionForm');
  const saveStatus = document.getElementById('saveStatus');
  const progressBar = document.getElementById('progressBar');
  const saveJsonButton = document.getElementById('saveJsonButton');
  const printButton = document.getElementById('printButton');
  const clearButton = document.getElementById('clearButton');

  if (!form) {
    return;
  }

  let saveTimer = null;

  const setStatus = (message) => {
    if (saveStatus) {
      saveStatus.textContent = message;
    }
  };

  const getNamedControls = () =>
    Array.from(form.elements).filter((element) => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
        return false;
      }
      return Boolean(element.name) && element.name !== 'bot-field' && element.name !== 'form-name';
    });

  const serializeForm = () => {
    const result = {};
    const controls = getNamedControls();
    const groupedNames = new Set(controls.map((control) => control.name));

    groupedNames.forEach((name) => {
      const group = controls.filter((control) => control.name === name);
      const checkboxes = group.filter((control) => control instanceof HTMLInputElement && control.type === 'checkbox');
      const radios = group.filter((control) => control instanceof HTMLInputElement && control.type === 'radio');

      if (checkboxes.length > 0) {
        result[name] = checkboxes.filter((control) => control.checked).map((control) => control.value);
        return;
      }

      if (radios.length > 0) {
        result[name] = radios.find((control) => control.checked)?.value ?? '';
        return;
      }

      result[name] = group[0]?.value ?? '';
    });

    return result;
  };

  const restoreForm = (saved) => {
    if (!saved || typeof saved !== 'object') {
      return;
    }

    const controls = getNamedControls();

    controls.forEach((control) => {
      if (!Object.prototype.hasOwnProperty.call(saved, control.name)) {
        return;
      }

      const value = saved[control.name];

      if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = Array.isArray(value) && value.includes(control.value);
        return;
      }

      if (control instanceof HTMLInputElement && control.type === 'radio') {
        control.checked = value === control.value;
        return;
      }

      if (typeof value === 'string') {
        control.value = value;
      }
    });
  };

  const saveNow = () => {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        answers: serializeForm(),
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
    saveTimer = window.setTimeout(saveNow, 300);
  };

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const payload = JSON.parse(raw);
      restoreForm(payload.answers);
      if (payload.savedAt) {
        const savedDate = new Date(payload.savedAt);
        if (!Number.isNaN(savedDate.getTime())) {
          setStatus(`Restored answers saved ${savedDate.toLocaleString()}.`);
        }
      }
    } catch (error) {
      console.error('Could not restore questionnaire data.', error);
    }
  };

  const enforceChoiceLimit = (container) => {
    const max = Number.parseInt(container.dataset.maxChoices ?? '', 10);
    if (!Number.isFinite(max) || max <= 0) {
      return;
    }

    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const parentQuestion = container.closest('.question');
    const help = parentQuestion?.querySelector('[data-choice-help]');

    const update = (changedCheckbox) => {
      const selected = checkboxes.filter((checkbox) => checkbox.checked);

      if (selected.length > max && changedCheckbox) {
        changedCheckbox.checked = false;
      }

      const finalSelected = checkboxes.filter((checkbox) => checkbox.checked);
      const atLimit = finalSelected.length >= max;

      checkboxes.forEach((checkbox) => {
        checkbox.disabled = atLimit && !checkbox.checked;
      });

      if (help) {
        help.textContent = `${finalSelected.length} of ${max} selected${atLimit ? ' — maximum reached.' : '.'}`;
        help.classList.toggle('choice-limit-hit', atLimit);
      }
    };

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        update(checkbox);
        queueSave();
      });
    });

    update(null);
  };

  const updateScrollProgress = () => {
    if (!progressBar) {
      return;
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;
    progressBar.style.width = `${Math.round(ratio * 100)}%`;
  };

  const downloadAnswers = () => {
    const payload = {
      questionnaire: 'Decisions, Decisions — Tanner Creative Direction',
      exportedAt: new Date().toISOString(),
      answers: serializeForm(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `decisions-decisions-creative-direction-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus('Answers file downloaded.');
  };

  const clearSavedAnswers = () => {
    const confirmed = window.confirm('Clear all answers saved in this browser? This cannot be undone unless you saved an answers file.');
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    document.querySelectorAll('[data-max-choices]').forEach((container) => {
      container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.disabled = false;
      });
      const help = container.closest('.question')?.querySelector('[data-choice-help]');
      if (help) {
        help.textContent = '';
        help.classList.remove('choice-limit-hit');
      }
    });
    setStatus('Saved answers cleared.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  loadSaved();

  document.querySelectorAll('[data-max-choices]').forEach(enforceChoiceLimit);

  form.addEventListener('input', queueSave);
  form.addEventListener('change', queueSave);
  form.addEventListener('submit', () => {
    saveNow();
    setStatus('Submitting…');
  });

  saveJsonButton?.addEventListener('click', downloadAnswers);
  printButton?.addEventListener('click', () => window.print());
  clearButton?.addEventListener('click', clearSavedAnswers);

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();
})();
