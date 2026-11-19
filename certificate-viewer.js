const certificateDialog = document.querySelector('#certificate-dialog');
const certificateForm = certificateDialog.querySelector('form');
const certificateName = certificateDialog.querySelector('input');
const certificateSubmit = certificateForm.querySelector('button');
const certificateStatus = certificateDialog.querySelector('[role="status"]');
const certificateImage = certificateDialog.querySelector('img');
const certificateClose = certificateDialog.querySelector('[data-certificate-close]');
let request;
let imageUrl;

function clearCertificate() {
  request?.abort();
  request = null;
  certificateForm.reset();
  certificateForm.hidden = false;
  certificateSubmit.disabled = false;
  certificateStatus.textContent = '';
  certificateImage.hidden = true;
  certificateImage.removeAttribute('src');
  certificateDialog.classList.remove('certificate-unlocked');
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
}

document.querySelectorAll('[data-certificate]').forEach(button => {
  button.addEventListener('click', () => {
    clearCertificate();
    certificateDialog.dataset.source = button.dataset.certificate;
    certificateDialog.showModal();
  });
});

certificateClose.addEventListener('click', () => certificateDialog.close());
certificateDialog.addEventListener('close', () => {
  if (!certificateDialog.open) clearCertificate();
});

async function decryptCertificate(password, packet) {
  // Format: 16-byte salt, 12-byte IV, ciphertext with a 16-byte GCM tag.
  const salt = packet.slice(0, 16);
  const iv = packet.slice(16, 28);
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
    material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, packet.slice(28));
}

certificateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (request) return;

  const password = certificateName.value.trim().normalize('NFC');
  certificateName.value = '';
  if (!password) {
    certificateStatus.textContent = '请输入姓名。';
    return;
  }
  if (!window.crypto?.subtle) {
    certificateStatus.textContent = '请通过 HTTPS 或本地 HTTP 预览打开主页。';
    return;
  }

  const controller = new AbortController();
  request = controller;
  certificateSubmit.disabled = true;
  certificateStatus.textContent = '正在解锁…';

  try {
    const response = await fetch(certificateDialog.dataset.source, { signal: controller.signal });
    if (!response.ok) throw new Error('Certificate unavailable');
    const packet = new Uint8Array(await response.arrayBuffer());
    if (packet.length <= 44) throw new Error('Certificate data is incomplete');
    const plaintext = await decryptCertificate(password, packet);
    if (request !== controller || !certificateDialog.open) return;

    const [first, second] = new Uint8Array(plaintext, 0, 2);
    const type = first === 0xff && second === 0xd8 ? 'image/jpeg' : 'image/png';
    imageUrl = URL.createObjectURL(new Blob([plaintext], { type }));
    certificateImage.src = imageUrl;
    certificateImage.hidden = false;
    certificateForm.hidden = true;
    certificateStatus.textContent = '';
    certificateDialog.classList.add('certificate-unlocked');
    certificateClose.focus();
  } catch (error) {
    if (request !== controller || !certificateDialog.open) return;
    certificateStatus.textContent = error.name === 'OperationError'
      ? '姓名不正确，请重试。'
      : '暂时无法加载证书，请通过 HTTPS 或本地 HTTP 预览重试。';
    certificateName.focus();
  } finally {
    if (request === controller) {
      request = null;
      certificateSubmit.disabled = false;
    }
  }
});
