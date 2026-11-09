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
