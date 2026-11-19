(() => {
  'use strict';
  if (!['https:', 'http:'].includes(location.protocol)) return;
  const panel = document.getElementById('app-controls');
  const button = document.getElementById('install-app');
  const help = document.getElementById('install-help');
  const status = document.getElementById('offline-status');
  const display = matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let promptEvent;
  let installed = false;
  let downloaded = false;
  let offlineError = '';

  function installControls() {
    const standalone = installed || display.matches || navigator.standalone;
    button.hidden = standalone || !promptEvent;
    help.hidden = standalone || !ios || !!promptEvent;
    if (!help.hidden) help.textContent = 'To install on iPhone or iPad, open Share, choose Add to Home Screen, then tap Add.';
  }
  function offlineStatus() {
    status.textContent = offlineError || (downloaded
      ? navigator.onLine ? 'Ready for offline play.' : 'Offline · Playing the downloaded game.'
      : 'Downloading the game for offline play…');
  }
  function offlineFailure(message, context) {
    console.error('Offline game unavailable', { fallback: true, using: 'browser play', ...context });
    offlineError = message;
    offlineStatus();
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event;
    installControls();
  });
  button.addEventListener('click', async () => {
    const event = promptEvent;
    if (!event) return;
    promptEvent = undefined;
    installControls();
    try {
      await event.prompt();
    } catch (error) {
      console.error('Install prompt failed', { error });
      help.textContent = 'Installation could not open. Use the Install option in your browser menu.';
      help.hidden = false;
    }
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    promptEvent = undefined;
    installControls();
  });
  display.addEventListener('change', installControls);
  panel.hidden = false;
  installControls();
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    offlineFailure('Offline play is unavailable here. Open the HTTPS game link in a browser that supports offline apps.', { reason: 'service worker unavailable' });
    return;
  }
  window.addEventListener('online', offlineStatus);
  window.addEventListener('offline', offlineStatus);
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'offline-incomplete') {
      offlineFailure('The offline download is incomplete. Clear the game’s site data and reopen it online to download it again.', { reason: 'missing cached file' });
    }
  });
  offlineStatus();
  navigator.serviceWorker.register('./sw.js').then(registration => {
    const observeInstall = () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant') {
          offlineFailure(registration.active
            ? 'The update could not download. Playing the saved version. Reopen online to retry.'
            : 'Offline download failed. Reopen the game online to retry.', { reason: 'installation failed' });
        }
      });
    };
    registration.addEventListener('updatefound', observeInstall);
    observeInstall();
    return navigator.serviceWorker.ready;
  }).then(() => {
    downloaded = true;
    offlineStatus();
  }).catch(error => {
    offlineFailure('Offline play could not start. Reopen the game online to retry.', { error });
  });
})();
