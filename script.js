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
