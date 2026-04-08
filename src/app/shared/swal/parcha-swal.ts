import Swal from 'sweetalert2';

export const ParchaSwal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  customClass: {
    popup: 'parcha-swal-popup',
    title: 'parcha-swal-title',
    htmlContainer: 'parcha-swal-html',
    actions: 'parcha-swal-actions',
    confirmButton: 'parcha-swal-confirm',
    cancelButton: 'parcha-swal-cancel',
    denyButton: 'parcha-swal-cancel',
    input: 'parcha-swal-input'
  }
});