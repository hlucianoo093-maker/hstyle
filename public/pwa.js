let installPrompt;

function setupInstallButton(button) {
  if (!button) return;
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    button.disabled = true;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.hidden = true;
    } catch (error) {
      console.error('Unable to install the app.', error);
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelectorAll('.pwa-install-button').forEach(setupInstallButton);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  document.querySelectorAll('.pwa-install-button').forEach((button) => { button.hidden = false; });
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  document.querySelectorAll('.pwa-install-button').forEach((button) => { button.hidden = true; });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch((error) => console.error('Unable to register the app service worker.', error));
  });
}
