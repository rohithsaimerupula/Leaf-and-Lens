// register2.js — Leaf & Lens Registration Logic (Complete Rewrite)

let photoFile = null;
let reelFile  = null;

const MAX_PHOTO = 10 * 1024 * 1024; // 10 MB
const MAX_REEL  = 50 * 1024 * 1024; // 50 MB

/* ── HELPERS ─────────────────────────────────── */
function fmt(bytes) {
  return bytes < 1048576
    ? (bytes / 1024).toFixed(1) + ' KB'
    : (bytes / 1048576).toFixed(1) + ' MB';
}
function showErr(id, msg) {
  const e = document.getElementById('err-' + id);
  const i = document.getElementById(id);
  if (e) { if (msg) e.textContent = msg; e.classList.add('show'); }
  if (i) i.classList.add('err');
}
function hideErr(id) {
  const e = document.getElementById('err-' + id);
  const i = document.getElementById(id);
  if (e) e.classList.remove('show');
  if (i) i.classList.remove('err');
}

/* ── WORD COUNT ──────────────────────────────── */
function updateWordCount(el) {
  const w = el.value.trim().split(/\s+/).filter(Boolean).length;
  const c = document.getElementById('wordCount');
  if (c) { c.textContent = w; c.style.color = w > 150 ? '#ef4444' : 'var(--text3)'; }
}
window.updateWordCount = updateWordCount;

/* ── CATEGORY TOGGLE ─────────────────────────── */
function initCategory() {
  const radios  = document.querySelectorAll('input[name="category"]');
  const hint    = document.getElementById('noCatHint');
  const photoBox = document.getElementById('photoBox');
  const reelBox  = document.getElementById('reelBox');

  radios.forEach(r => r.addEventListener('change', () => {
    const v = r.value;
    hint.style.display = 'none';
    hideErr('category');

    if (v === 'Photo') {
      photoBox.classList.add('show');
      reelBox.classList.remove('show');
      clearUpload('Reel');
    } else if (v === 'Reel') {
      photoBox.classList.remove('show');
      reelBox.classList.add('show');
      clearUpload('Photo');
    } else { // Both
      photoBox.classList.add('show');
      reelBox.classList.add('show');
    }
  }));
}

/* ── FILE UPLOAD ─────────────────────────────── */
function handlePhotoFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const validTypes = ['jpg','jpeg','png'];
  const validMime  = ['image/jpeg','image/jpg','image/png'];

  if (!validTypes.includes(ext) || !validMime.includes(file.type)) {
    showToast('Invalid photo format. Only JPG, JPEG, PNG accepted.', 'error');
    resetInput('filePhoto');
    return;
  }
  if (file.size > MAX_PHOTO) {
    showToast('Photo too large. Maximum size is 10MB.', 'error');
    resetInput('filePhoto');
    return;
  }
  photoFile = file;
  showPreview('Photo', file.name, fmt(file.size));
  hideErr('filePhoto');
}

function handleReelFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['mp4','mkv'];
  const validMime = ['video/mp4','video/x-matroska','video/mkv'];
  const okMime    = validMime.includes(file.type) || file.type === '';

  if (!validExts.includes(ext) || !okMime) {
    showToast('Invalid video format. Only MP4 and MKV accepted.', 'error');
    resetInput('fileReel');
    return;
  }
  if (file.size > MAX_REEL) {
    showToast('Video too large. Maximum size is 50MB.', 'error');
    resetInput('fileReel');
    return;
  }
  reelFile = file;
  showPreview('Reel', file.name, fmt(file.size));
  hideErr('fileReel');
}

function showPreview(type, name, size) {
  const zone = document.getElementById(type === 'Photo' ? 'photoZone' : 'reelZone');
  const prev = document.getElementById('prev' + type);
  const nameEl = document.getElementById('prev' + type + 'Name');
  const sizeEl = document.getElementById('prev' + type + 'Size');
  if (zone) zone.style.display = 'none';
  if (prev) prev.classList.add('show');
  if (nameEl) nameEl.textContent = name;
  if (sizeEl) sizeEl.textContent = '(' + size + ')';
}

function clearUpload(type) {
  if (type === 'Photo') photoFile = null;
  else reelFile = null;
  resetInput('file' + type);
  const zone = document.getElementById(type === 'Photo' ? 'photoZone' : 'reelZone');
  const prev = document.getElementById('prev' + type);
  if (zone) zone.style.display = '';
  if (prev) prev.classList.remove('show');
}
window.clearUpload = clearUpload;

function resetInput(id) {
  const inp = document.getElementById(id);
  if (inp) inp.value = '';
}

function initFileInputs() {
  const pInp  = document.getElementById('filePhoto');
  const rInp  = document.getElementById('fileReel');
  const pZone = document.getElementById('photoZone');
  const rZone = document.getElementById('reelZone');

  if (pInp) pInp.addEventListener('change', () => handlePhotoFile(pInp.files[0]));
  if (rInp) rInp.addEventListener('change', () => handleReelFile(rInp.files[0]));

  // Drag-and-drop photo
  if (pZone) {
    pZone.addEventListener('dragover', e => { e.preventDefault(); pZone.classList.add('dragover'); });
    pZone.addEventListener('dragleave', () => pZone.classList.remove('dragover'));
    pZone.addEventListener('drop', e => {
      e.preventDefault(); pZone.classList.remove('dragover');
      handlePhotoFile(e.dataTransfer.files[0]);
    });
  }
  // Drag-and-drop reel
  if (rZone) {
    rZone.addEventListener('dragover', e => { e.preventDefault(); rZone.classList.add('dragover'); });
    rZone.addEventListener('dragleave', () => rZone.classList.remove('dragover'));
    rZone.addEventListener('drop', e => {
      e.preventDefault(); rZone.classList.remove('dragover');
      handleReelFile(e.dataTransfer.files[0]);
    });
  }
}

/* ── VALIDATION ──────────────────────────────── */
function validate() {
  let ok = true;

  // Required text fields
  ['fullName','email','phone','rollNum','branch'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) { showErr(id); ok = false; }
    else hideErr(id);
  });

  // Email format
  const em = document.getElementById('email');
  if (em && em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) {
    showErr('email', 'Invalid email address'); ok = false;
  }

  // Roll number
  const roll = document.getElementById('rollNum');
  if (roll && roll.value.trim().length < 4) {
    showErr('rollNum', 'Enter a valid roll/registration number'); ok = false;
  }

  // Category
  const cat = document.querySelector('input[name="category"]:checked');
  if (!cat) { showErr('category', 'Please select a category'); ok = false; }
  else {
    hideErr('category');
    const v = cat.value;
    if ((v === 'Photo' || v === 'Both') && !photoFile) {
      showErr('filePhoto', 'Please upload your photo (JPG/JPEG/PNG)'); ok = false;
    } else hideErr('filePhoto');
    if ((v === 'Reel' || v === 'Both') && !reelFile) {
      showErr('fileReel', 'Please upload your video (MP4/MKV)'); ok = false;
    } else hideErr('fileReel');
  }

  // Caption
  const cap = document.getElementById('caption');
  if (cap) {
    const wc = cap.value.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 5)   { showErr('caption', 'Please write at least 5 words'); ok = false; }
    else if (wc > 150) { showErr('caption', 'Caption must be 150 words or less'); ok = false; }
    else hideErr('caption');
  }

  return ok;
}

/* ── MODAL ───────────────────────────────────── */
function initModal() {
  const btn  = document.getElementById('preSubmitBtn');
  const body = document.getElementById('modalBody');
  const cBtn = document.getElementById('modalConfirmBtn');
  const hint = document.getElementById('modalScrollHint');

  if (btn) {
    btn.addEventListener('click', () => {
      if (!validate()) {
        showToast('Please fix the errors highlighted above.', 'error');
        const firstErr = document.querySelector('.ferr.show');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      openModal();
    });
  }

  if (body) {
    body.addEventListener('scroll', () => {
      const atBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 16;
      if (atBottom) {
        cBtn.classList.add('active');
        hint.textContent = '✅ Rules accepted — you may now submit';
        hint.style.color = 'var(--emerald-lt)';
      }
    });
  }
}

function openModal() {
  const m = document.getElementById('rulesModal');
  const body = document.getElementById('modalBody');
  const cBtn = document.getElementById('modalConfirmBtn');
  const hint = document.getElementById('modalScrollHint');
  if (!m) return;
  m.classList.add('show');
  // Reset scroll state
  if (body) body.scrollTop = 0;
  if (cBtn) cBtn.classList.remove('active');
  if (hint) { hint.textContent = 'Scroll down to accept ↓'; hint.style.color = 'var(--amber)'; }
}

window.closeModal = function () {
  const m = document.getElementById('rulesModal');
  if (m) m.classList.remove('show');
};

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.id === 'rulesModal') window.closeModal();
});

/* ── FINAL SUBMIT ─────────────────────────────── */
window.executeFinalSubmit = async function () {
  window.closeModal();

  const btn = document.getElementById('preSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Processing…'; }

  const email = document.getElementById('email').value.trim().toLowerCase();
  const subs  = LL.getSubmissions();

  if (subs.some(s => s.email === email)) {
    showToast('This email is already registered!', 'error');
    showErr('email', 'This email is already registered');
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Continue to Submit'; }
    return;
  }

  const cat = document.querySelector('input[name="category"]:checked');
  let photoData = null, reelData = null;

  try {
    if (photoFile) photoData = await fileToBase64(photoFile);
    if (reelFile)  reelData  = await fileToBase64(reelFile);
  } catch (e) { console.warn('File encoding error', e); }

  const submission = {
    id:          generateSubmissionId(),
    name:        document.getElementById('fullName').value.trim(),
    email,
    phone:       document.getElementById('phone').value.trim(),
    rollNum:     document.getElementById('rollNum').value.trim().toUpperCase(),
    branch:      document.getElementById('branch').value,
    yearOfStudy: document.getElementById('yearOfStudy').value,
    instagram:   document.getElementById('instagram').value.trim(),
    category:    cat ? cat.value : '',
    photoData,
    photoName:   photoFile ? photoFile.name : null,
    reelData,
    reelName:    reelFile ? reelFile.name : null,
    caption:     document.getElementById('caption').value.trim(),
    pledge:      document.getElementById('pledge').checked,
    status:      'pending',
    submittedAt: new Date().toISOString(),
    likes:       0,
    // legacy compat
    fileData:    photoData || reelData,
    fileName:    photoFile ? photoFile.name : (reelFile ? reelFile.name : null),
    fileType:    photoFile ? photoFile.type : (reelFile ? reelFile.type : null)
  };

  subs.push(submission);
  LL.saveSubmissions(subs);
  if (submission.pledge) LL.addPledge();

  // Show success
  document.getElementById('regForm').style.display = 'none';
  const sc = document.getElementById('successScreen');
  sc.classList.add('show');
  document.getElementById('successId').textContent = submission.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Entry submitted successfully! 🌿', 'success', 5000);
};

/* ── RESET FORM ──────────────────────────────── */
window.resetForm = function () {
  const form = document.getElementById('regForm');
  const sc   = document.getElementById('successScreen');
  const btn  = document.getElementById('preSubmitBtn');
  const hint = document.getElementById('noCatHint');
  const pBox = document.getElementById('photoBox');
  const rBox = document.getElementById('reelBox');

  if (form) { form.style.display = ''; form.reset(); }
  if (sc)   sc.classList.remove('show');
  if (hint) hint.style.display = '';
  if (pBox) pBox.classList.remove('show');
  if (rBox) rBox.classList.remove('show');

  clearUpload('Photo');
  clearUpload('Reel');

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Continue to Submit';
  }

  updateWordCount(document.getElementById('caption') || { value: '' });
};

/* ── INLINE VALIDATION ───────────────────────── */
function initInlineValidation() {
  ['fullName','email','phone','rollNum','branch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => { if (el.value.trim()) hideErr(id); });
  });
}

/* ── INIT ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCategory();
  initFileInputs();
  initInlineValidation();
  initModal();
});
