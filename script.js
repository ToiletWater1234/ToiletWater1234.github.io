const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

const copyButton = document.querySelector('[data-copy-email]');
const emailAddress = document.querySelector('.email-address');
const copyStatus = document.querySelector('.copy-status');

if (copyButton && emailAddress && copyStatus) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const email = emailAddress.getAttribute('href').replace('mailto:', '');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      copyStatus.textContent = '已复制，期待你的来信。';
    } catch {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(emailAddress);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      copyStatus.textContent = '请手动复制邮箱：864457207@qq.com';
    }
  });
}

const profileCounter = document.querySelector('[data-profile-counter]');
const counterFallback = document.querySelector('[data-counter-fallback]');
if (profileCounter && counterFallback) {
  const showCounterLink = () => {
    profileCounter.hidden = true;
    counterFallback.hidden = false;
  };
  profileCounter.addEventListener('error', showCounterLink);
  if (profileCounter.complete && profileCounter.naturalWidth === 0) showCounterLink();
}

const tocToggle = document.querySelector('[data-toc-toggle]');
const tocDrawer = document.querySelector('#site-toc');
const tocClose = document.querySelector('[data-toc-close]');
if (tocToggle && tocDrawer && tocClose && typeof tocDrawer.showModal === 'function') {
  const tocLinks = [...tocDrawer.querySelectorAll('.toc-links a')];
  const tocSections = tocLinks.map(link => document.getElementById(link.hash.slice(1)));
  let destinationAfterClose = null;
  tocToggle.hidden = false;

  const closeToc = (destination = null) => {
    destinationAfterClose = destination;
    tocDrawer.close();
  };
  tocToggle.addEventListener('click', () => {
    tocDrawer.showModal();
    tocToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('toc-open');
  });
  tocClose.addEventListener('click', () => closeToc());
  tocDrawer.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const lastLink = tocLinks[tocLinks.length - 1];
    if (event.shiftKey && document.activeElement === tocClose) {
      event.preventDefault();
      lastLink.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      tocClose.focus();
    }
  });
  tocDrawer.addEventListener('cancel', () => { destinationAfterClose = null; });
  tocDrawer.addEventListener('click', event => {
    if (event.target !== tocDrawer) return;
    const bounds = tocDrawer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeToc();
  });
  tocDrawer.addEventListener('close', () => {
    tocToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('toc-open');
    if (destinationAfterClose) {
      const heading = destinationAfterClose.querySelector('h1, h2') || destinationAfterClose;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
      destinationAfterClose = null;
    } else {
      tocToggle.focus({ preventScroll: true });
    }
  });
  tocLinks.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      closeToc(tocSections[index]);
    });
  });

  let tocUpdateQueued = false;
  const updateToc = () => {
    const readingLine = Math.min(window.innerHeight * 0.25, 160);
    let currentIndex = 0;
    tocSections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= readingLine) currentIndex = index;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) currentIndex = tocLinks.length - 1;
    tocLinks.forEach((link, index) => {
      if (index === currentIndex) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    tocUpdateQueued = false;
  };
  const queueTocUpdate = () => {
    if (tocUpdateQueued) return;
    tocUpdateQueued = true;
    window.requestAnimationFrame(updateToc);
  };
  window.addEventListener('scroll', queueTocUpdate, { passive: true });
  window.addEventListener('resize', queueTocUpdate);
  window.addEventListener('hashchange', queueTocUpdate);
  window.addEventListener('load', queueTocUpdate);
  updateToc();
}

const magneticControls = [...document.querySelectorAll(
  '.hero-actions a, .social-link, .project-link, .copy-button, ' +
  '.art-bottomline a, .award-source, .site-footer a'
)];
const magneticPointer = window.matchMedia(
  '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let magneticTarget = null;
let magneticFrame = 0;
let pointerPosition = null;

magneticControls.forEach(control => control.classList.add('magnetic-button'));

const releaseMagneticTarget = () => {
  if (!magneticTarget) return;
  magneticTarget.style.removeProperty('--magnet-x');
  magneticTarget.style.removeProperty('--magnet-y');
  magneticTarget = null;
};

const resetMagneticControls = () => {
  window.cancelAnimationFrame(magneticFrame);
  magneticFrame = 0;
  pointerPosition = null;
  releaseMagneticTarget();
};

const updateMagneticControls = () => {
  magneticFrame = 0;
  if (!pointerPosition || !magneticPointer.matches) return;

  const openDialog = document.querySelector('dialog[open]');
  let nearest = null;

  // Measure the resting position so following the pointer cannot cause drift.
  for (const control of magneticControls) {
    if (openDialog && !openDialog.contains(control)) continue;
    const bounds = control.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    const translation = getComputedStyle(control).translate.split(' ');
    const currentX = parseFloat(translation[0]) || 0;
    const currentY = parseFloat(translation[1]) || 0;
    const dx = pointerPosition.x - (bounds.left + bounds.width / 2 - currentX);
    const dy = pointerPosition.y - (bounds.top + bounds.height / 2 - currentY);
    const edgeDistance = Math.hypot(
      Math.max(Math.abs(dx) - bounds.width / 2, 0),
      Math.max(Math.abs(dy) - bounds.height / 2, 0)
    );
    const distance = edgeDistance + Math.hypot(dx, dy) * 0.001;
    if (edgeDistance < 40 && (!nearest || distance < nearest.distance)) {
      nearest = { control, dx, dy, edgeDistance, distance };
    }
  }

  if (magneticTarget !== nearest?.control) releaseMagneticTarget();
  if (!nearest) return;

  magneticTarget = nearest.control;
  const strength = 1 - nearest.edgeDistance / 40;
  const centerDistance = Math.hypot(nearest.dx, nearest.dy);
  const pull = Math.min(0.15, 6 / (centerDistance || 1)) * strength;
  const x = nearest.dx * pull;
  const y = nearest.dy * pull;
  magneticTarget.style.setProperty('--magnet-x', x.toFixed(2) + 'px');
  magneticTarget.style.setProperty('--magnet-y', y.toFixed(2) + 'px');
};

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !magneticPointer.matches) return;
  pointerPosition = { x: event.clientX, y: event.clientY };
  if (!magneticFrame) magneticFrame = window.requestAnimationFrame(updateMagneticControls);
}, { passive: true });

document.addEventListener('pointerleave', resetMagneticControls);
document.addEventListener('pointercancel', resetMagneticControls);
document.addEventListener('keydown', resetMagneticControls);
document.addEventListener('scroll', resetMagneticControls, { passive: true, capture: true });
window.addEventListener('resize', resetMagneticControls);
window.addEventListener('blur', resetMagneticControls);
magneticPointer.addEventListener('change', resetMagneticControls);
tocDrawer?.addEventListener('close', resetMagneticControls);
tocToggle?.addEventListener('click', resetMagneticControls);

document.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse') return;
  resetMagneticControls();
  if (reducedMotion.matches || event.button !== 0) return;

  const control = event.target.closest('.magnetic-button');
  if (!control) return;
  control.querySelector('.touch-ripple')?.remove();
  const bounds = control.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'touch-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = event.clientX - bounds.left + 'px';
  ripple.style.top = event.clientY - bounds.top + 'px';
  control.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  window.setTimeout(() => ripple.remove(), 500);
}, { passive: true });
