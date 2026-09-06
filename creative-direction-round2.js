(() => {
  'use strict';

  const form = document.getElementById('round2-form');
  const dateInput = document.getElementById('responseDate');
  const preview = document.getElementById('recipePreview');
  const hiddenRecipe = document.getElementById('generatedRecipe');
  const rangeIds = ['cleanChaos', 'familyAdult', 'familiarWeird', 'calmGameShow'];

  if (!form) return;

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

    if (preview) {
      preview.textContent = lines.join(' · ');
    }
  }

  form.addEventListener('input', () => {
    updateRanges();
    updateRecipe();
  });

  form.addEventListener('change', () => {
    updateRanges();
    updateRecipe();
  });

  form.addEventListener('submit', () => {
    updateRecipe();
  });

  updateRanges();
  updateRecipe();
})();
