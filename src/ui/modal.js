// Native dialog supplies background inertness and Escape; this keeps focus and scroll stable.
export function createModal(dialog) {
  const initialFocus = dialog.querySelector('button');
  let trigger;
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));
    if (trigger?.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true });
    trigger = null;
  });
  return {
    open(button) {
      if (dialog.open) return;
      trigger = button; dialog.showModal();
      document.body.classList.add('modal-open'); initialFocus.focus();
    },
    close: () => dialog.close()
  };
}
