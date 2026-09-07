(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const next = params.get('next');
  const nextInput = document.getElementById('next');
  if (nextInput && next && next.startsWith('/') && !next.startsWith('//')) nextInput.value = next;
  const status = document.getElementById('accessStatus');
  if (status && params.get('error') === '1') {
    status.hidden = false;
    status.className = 'access-status access-status--error';
    status.textContent = 'That passcode was not accepted. Try again.';
  } else if (status && params.get('locked') === '1') {
    status.hidden = false;
    status.className = 'access-status access-status--ok';
    status.textContent = 'Demo access has been locked on this device.';
  }
  if (params.get('embed') === '1') document.body.classList.add('demo-access-page--embed');
})();
