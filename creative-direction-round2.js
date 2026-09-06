(() => {
  'use strict';

  const form = document.getElementById('round2-form');
  const dateInput = document.getElementById('responseDate');
  const preview = document.getElementById('recipePreview');
  const hiddenRecipe = document.getElementById('generatedRecipe');
  const saveStatus = document.getElementById('saveStatus');
  const rangeIds = ['cleanChaos', 'familyAdult', 'familiarWeird', 'calmGameShow'];
  const storageKey = 'decisions-decisions-round2-draft';

  if (!form) return;

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      for (const element of Array.from(form.elements)) {
        if (!element.name || !(element.name in draft)) continue;
        const saved = draft[element.name];
        if (element.type === 'radio') element.checked = element.value === saved;
        else if (element.type === 'checkbox') element.checked = saved === element.value || saved === true;
        else element.value = saved;
      }
    } catch {
      if (saveStatus) saveStatus.textContent = 'Autosave unavailable; submission still works.';
    }
  }

  function saveDraft() {
    try {
      const draft = {};
      for (const element of Array.from(form.elements)) {
        if (!element.name || element.name === 'bot-field' || element.name === 'form-name' || element.name === 'generated_recipe') continue;
        if (element.type === 'radio') {
          if (element.checked) draft[element.name] = element.value;
        } else if (element.type === 'checkbox') {
          if (element.checked) draft[element.name] = element.value || true;
        } else {
          draft[element.name] = element.value;
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(draft));
      if (saveStatus) saveStatus.textContent = 'Saved on this device.';
    } catch {
      if (saveStatus) saveStatus.textContent = 'Autosave unavailable; submission still works.';
    }
  }

  loadDraft();

  if (dateInput && !dateInput.value) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    dateInput.value = local.toISOString().slice(0, 10);
  }

  function checkedValue(name) {
    const item = form.querySelector('input[name="' + name + '"]:checked');
    return item ? item.value : '';
  }

  function updateRanges() {
    rangeIds.forEach((id) => {
      const range = document.getElementById(id);
      const output = document.getElementById(id + 'Value');
      if (range && output) output.textContent = range.value;
    });
  }

  function updateRecipe() {
    const values = {
      Overall: checkedValue('overall_winner') || 'Not chosen yet',
      Logo: checkedValue('mix_logo') || '—',
      Card: checkedValue('mix_card') || '—',
      Box: checkedValue('mix_box') || '—',
      App: checkedValue('mix_app') || '—',
      Marketing: checkedValue('mix_marketing') || '—',
      Push: checkedValue('push_level') || '—'
    };

    const lines = Object.entries(values).map(([key, value]) => key + ': ' + value);
    if (hiddenRecipe) hiddenRecipe.value = lines.join('\n');
    if (preview) preview.textContent = lines.join(' · ');
  }

  form.addEventListener('input', () => {
    updateRanges();
    updateRecipe();
    saveDraft();
  });

  form.addEventListener('change', () => {
    updateRanges();
    updateRecipe();
    saveDraft();
  });

  form.addEventListener('submit', () => {
    updateRecipe();
    saveDraft();
  });

  updateRanges();
  updateRecipe();
})();
