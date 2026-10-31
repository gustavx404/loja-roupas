let installPrompt;
const installButton = document.querySelector('#install-app');

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (installButton) installButton.hidden = true;
});

const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
const isIos = isIosDevice && !isStandalone;
if (isIos && installButton) {
  installButton.hidden = false;
  installButton.textContent = 'Adicionar à tela';
  installButton.addEventListener('click', () => {
    window.alert('No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.');
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
