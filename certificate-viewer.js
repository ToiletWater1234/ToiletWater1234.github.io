const certificateGate = document.querySelector('#certificate-gate');
const certificateForm = certificateGate.querySelector('form');
const certificateName = certificateForm.querySelector('input');
const certificateSubmit = certificateForm.querySelector('button');
const gateStatus = certificateGate.querySelector('[role="status"]');
const certificateViewer = document.querySelector('#certificate-viewer');
const viewerStatus = certificateViewer.querySelector('[role="status"]');
const certificateImage = certificateViewer.querySelector('img');
const awardSection = document.querySelector('#awards');
const certificateButtons = [...awardSection.querySelectorAll('[data-certificate]')];
const certificateLocks = [...awardSection.querySelectorAll('.certificate-lock')];
const loadError = '暂时无法加载证书，请通过 HTTPS 或本地 HTTP 预览重试。';
let selectedCertificate;
let gateRequest;
let viewerRequest;
let sessionKeyMaterial;
let imageUrl;
let composingName = false;
let unlocking = false;

certificateButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (unlocking || certificateViewer.open) return;
    if (sessionKeyMaterial) {
      openCertificate(button.dataset.certificate);
      return;
    }
    selectedCertificate = button.dataset.certificate;
    certificateGate.showModal();
  });
});

for (const dialog of [certificateGate, certificateViewer]) {
  dialog.querySelector('[data-certificate-close]').addEventListener('click', () => dialog.close());
}

certificateGate.addEventListener('close', () => {
  if (certificateGate.open) return;
  gateRequest?.abort();
  gateRequest = null;
  composingName = false;
  certificateForm.reset();
  certificateSubmit.disabled = false;
  certificateName.removeAttribute('aria-invalid');
  gateStatus.textContent = '';
});

certificateName.addEventListener('compositionstart', () => { composingName = true; });
certificateName.addEventListener('compositionend', () => { composingName = false; });
certificateName.addEventListener('input', () => {
  if (gateRequest) return;
  certificateName.removeAttribute('aria-invalid');
  gateStatus.textContent = '';
});

function clearViewer() {
  viewerRequest?.abort();
  viewerRequest = null;
  viewerStatus.textContent = '';
  certificateImage.hidden = true;
  certificateImage.removeAttribute('src');
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
}

certificateViewer.addEventListener('close', () => {
  if (!certificateViewer.open) clearViewer();
});

async function loadCertificate(source, material, signal) {
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error('Certificate unavailable');
  const packet = new Uint8Array(await response.arrayBuffer());
  if (packet.length <= 44) throw new Error('Certificate data is incomplete');

  // Format: 16-byte salt, 12-byte IV, ciphertext with a 16-byte GCM tag.
  const salt = packet.slice(0, 16);
  const iv = packet.slice(16, 28);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
    material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, packet.slice(28));
  const [first, second] = new Uint8Array(plaintext, 0, 2);
  const type = first === 0xff && second === 0xd8 ? 'image/jpeg' : 'image/png';
  return new Blob([plaintext], { type });
}

function displayCertificate(image) {
  imageUrl = URL.createObjectURL(image);
  certificateImage.src = imageUrl;
  certificateImage.hidden = false;
  viewerStatus.textContent = '';
}

async function openCertificate(source, readyImage) {
  if (document.querySelector('dialog[open]')) return;
  clearViewer();
  certificateViewer.showModal();
  certificateViewer.scrollTop = 0;
  if (readyImage) {
    displayCertificate(readyImage);
    return;
  }

  const controller = new AbortController();
  viewerRequest = controller;
  viewerStatus.textContent = '正在打开证书…';
  try {
    const image = await loadCertificate(source, sessionKeyMaterial, controller.signal);
    if (viewerRequest === controller && certificateViewer.open) displayCertificate(image);
  } catch {
    if (viewerRequest === controller && certificateViewer.open) viewerStatus.textContent = loadError;
  }
}

async function playCertificateUnlock() {
  unlocking = true;
  awardSection.classList.add('certificates-unlocked', 'certificates-unlocking');
  certificateButtons.forEach(button => button.setAttribute('aria-controls', 'certificate-viewer'));
  const animations = certificateLocks.flatMap(lock => lock.getAnimations?.({ subtree: true }) ?? []);
  if (animations.length) {
    // Browsers can suspend animations on hidden certificates or background tabs.
    let timeout;
    await Promise.race([
      Promise.allSettled(animations.map(animation => animation.finished)),
      new Promise(resolve => { timeout = window.setTimeout(resolve, 950); }),
    ]);
    window.clearTimeout(timeout);
  }
  awardSection.classList.remove('certificates-unlocking');
  unlocking = false;
}

certificateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (gateRequest || composingName) return;

  const password = certificateName.value.trim().normalize('NFC');
  if (!password) {
    gateStatus.textContent = '请输入姓名。';
    return;
  }
  if (!window.crypto?.subtle) {
    gateStatus.textContent = loadError;
    return;
  }

  const source = selectedCertificate;
  const controller = new AbortController();
  gateRequest = controller;
  certificateSubmit.disabled = true;
  certificateName.removeAttribute('aria-invalid');
  gateStatus.textContent = '正在解锁…';

  try {
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const image = await loadCertificate(source, material, controller.signal);
    if (gateRequest !== controller || !certificateGate.open) return;

    sessionKeyMaterial = material;
    certificateGate.close();
    await playCertificateUnlock();
    openCertificate(source, image);
  } catch (error) {
    if (gateRequest !== controller || !certificateGate.open) return;
    const wrongName = error.name === 'OperationError';
    gateStatus.textContent = wrongName ? '姓名不正确，请重试。' : loadError;
    if (wrongName) certificateName.setAttribute('aria-invalid', 'true');
    certificateName.focus();
  } finally {
    if (gateRequest === controller) {
      gateRequest = null;
      certificateSubmit.disabled = false;
    }
  }
});
