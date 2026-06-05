// register.js — Leaf & Lens Registration Logic

let selectedPhotoFile = null;
let selectedReelFile = null;

// ── WORD COUNT ────────────────────────────────────
function updateWordCount(el) {
  const words = el.value.trim().split(/\s+/).filter(Boolean).length;
  const el2 = document.getElementById('wordCount');
  if (el2) el2.textContent = words;
  if (words > 150) el2.style.color = '#e63946';
  else el2.style.color = '#a3b18a';
}

// ── CATEGORY SELECTION ────────────────────────────
function initCategorySelection() {
  const radios = document.querySelectorAll('input[name="category"]');
  const dynamicUploads = document.getElementById('dynamicUploads');
  const containerPhoto = document.getElementById('containerPhoto');
  const containerReel = document.getElementById('containerReel');
  const noCatMsg = document.getElementById('noCatMsg');

  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = e.target.value;
      noCatMsg.style.display = 'none';
      dynamicUploads.style.display = 'flex';
      hideError('category');

      if (val === 'Photo') {
        containerPhoto.classList.add('show');
        containerReel.classList.remove('show');
        clearFile('Reel');
      } else if (val === 'Reel') {
        containerPhoto.classList.remove('show');
        containerReel.classList.add('show');
        clearFile('Photo');
      } else if (val === 'Both') {
        containerPhoto.classList.add('show');
        containerReel.classList.add('show');
      }
    });
  });
}

// ── FILE UPLOAD ───────────────────────────────────
function initFileUpload(type) { // type is 'Photo' or 'Reel'
  const area = document.getElementById(`uploadArea${type}`);
  const input = document.getElementById(`fileInput${type}`);
  const preview = document.getElementById(`uploadPreview${type}`);
  const nameEl = document.getElementById(`uploadFileName${type}`);
  const sizeEl = document.getElementById(`uploadFileSize${type}`);
  if (!area || !input) return;

  const MAX_PHOTO = 10 * 1024 * 1024; // 10MB
  const MAX_REEL  = 50 * 1024 * 1024; // 50MB

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleFile(file) {
    if (!file) return;
    
    if (type === 'Photo') {
      const isImage = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png';
      if (!isImage) {
        showToast('Invalid file type. Use JPG or PNG for photos.', 'error');
        return;
      }
      if (file.size > MAX_PHOTO) {
        showToast('Photo file too large. Max: 10MB', 'error');
        return;
      }
      selectedPhotoFile = file;
    } else if (type === 'Reel') {
      const isVideo = file.type === 'video/mp4' || file.type === 'video/mkv' || file.name.toLowerCase().endsWith('.mkv');
      if (!isVideo) {
        showToast('Invalid file type. Use MP4 or MKV for reels.', 'error');
        return;
      }
      if (file.size > MAX_REEL) {
        showToast('Reel file too large. Max: 50MB', 'error');
        return;
      }
      selectedReelFile = file;
    }

    nameEl.textContent = file.name;
    sizeEl.textContent = '(' + formatSize(file.size) + ')';
    preview.classList.add('show');
    area.style.display = 'none';
    hideError(`file${type}`);
  }

  input.addEventListener('change', () => handleFile(input.files[0]));

  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
}

function clearFile(type) {
  if (type === 'Photo') selectedPhotoFile = null;
  else selectedReelFile = null;
  
  const input = document.getElementById(`fileInput${type}`);
  const preview = document.getElementById(`uploadPreview${type}`);
  const area = document.getElementById(`uploadArea${type}`);
  
  if (input) input.value = '';
  if (preview) preview.classList.remove('show');
  if (area) area.style.display = 'block';
}

// ── VALIDATION ────────────────────────────────────
function showError(field, msg) {
  const el = document.getElementById(`err-${field}`);
  const inp = document.getElementById(field);
  if (el) { el.textContent = msg || el.textContent; el.classList.add('show'); }
  if (inp) inp.classList.add('error');
}
function hideError(field) {
  const el = document.getElementById(`err-${field}`);
  const inp = document.getElementById(field);
  if (el) el.classList.remove('show');
  if (inp) inp.classList.remove('error');
}

function validateForm() {
  let valid = true;
  // College-ready required fields
  const required = ['fullName','email','phone','rollNum','branch','yearOfStudy','caption'];

  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) { showError(id); valid = false; }
    else hideError(id);
  });

  // Roll number format: at least 4 alphanumeric chars
  const roll = document.getElementById('rollNum');
  if (roll && roll.value.trim() && roll.value.trim().length < 4) {
    showError('rollNum', 'Enter a valid roll/registration number'); valid = false;
  }

  // Email format
  const email = document.getElementById('email');
  if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    showError('email', 'Invalid email address'); valid = false;
  }

  // Category
  const cat = document.querySelector('input[name="category"]:checked');
  if (!cat) { showError('category', 'Please select a category'); valid = false; }
  else {
    hideError('category');
    const cVal = cat.value;
    if ((cVal === 'Photo' || cVal === 'Both') && !selectedPhotoFile) {
      showError('filePhoto', 'Please upload your photo'); valid = false;
    }
    if ((cVal === 'Reel' || cVal === 'Both') && !selectedReelFile) {
      showError('fileReel', 'Please upload your reel'); valid = false;
    }
  }

  // Caption word count
  const cap = document.getElementById('caption');
  if (cap) {
    const wc = cap.value.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 5) { showError('caption', 'Please write at least 5 words'); valid = false; }
    else if (wc > 150) { showError('caption', 'Caption must be 150 words or less'); valid = false; }
    else hideError('caption');
  }

  return valid;
}

// ── MODAL LOGIC ───────────────────────────────────
function initModal() {
  const preSubmitBtn = document.getElementById('preSubmitBtn');
  const modal = document.getElementById('rulesModal');
  const modalBody = document.getElementById('modalBody');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalScrollHint = document.getElementById('modalScrollHint');

  if (preSubmitBtn) {
    preSubmitBtn.addEventListener('click', () => {
      if (!validateForm()) {
        showToast('Please fix the errors above', 'error');
        document.querySelector('.field-error.show')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      modal.classList.add('show');
      checkModalScroll();
    });
  }

  if (modalBody) {
    modalBody.addEventListener('scroll', checkModalScroll);
  }

  function checkModalScroll() {
    if (modalBody.scrollHeight - modalBody.scrollTop <= modalBody.clientHeight + 10) {
      modalSubmitBtn.classList.add('active');
      modalScrollHint.style.color = '#52b788';
      modalScrollHint.textContent = 'Accepted!';
    }
  }
}

window.closeModal = function() {
  document.getElementById('rulesModal').classList.remove('show');
};

// ── FORM SUBMIT ───────────────────────────────────
window.executeFinalSubmit = async function() {
  closeModal();

  const preSubmitBtn = document.getElementById('preSubmitBtn');
  preSubmitBtn.disabled = true;
  preSubmitBtn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span> Processing...';

  const email = document.getElementById('email').value.trim().toLowerCase();
  const subs = LL.getSubmissions();
  if (subs.some(s => s.email === email)) {
    showToast('This email is already registered!', 'error');
    showError('email', 'This email is already registered');
    preSubmitBtn.disabled = false;
    preSubmitBtn.innerHTML = '<i data-lucide="send" style="width:20px;height:20px;"></i> Continue to Submit';
    if (window.lucide) lucide.createIcons();
    return;
  }

  const cat = document.querySelector('input[name="category"]:checked');
  let photoData = null;
  let reelData = null;

  try { 
    if (selectedPhotoFile) photoData = await fileToBase64(selectedPhotoFile); 
    if (selectedReelFile) reelData = await fileToBase64(selectedReelFile);
  } catch {}

  const pledge = document.getElementById('pledge');
  const submission = {
    id:          generateSubmissionId(),
    name:        document.getElementById('fullName').value.trim(),
    email,
    phone:       document.getElementById('phone').value.trim(),
    rollNum:     document.getElementById('rollNum').value.trim().toUpperCase(),
    branch:      document.getElementById('branch').value,
    yearOfStudy: document.getElementById('yearOfStudy').value,
    category:    cat ? cat.value : '',
    instagram:   document.getElementById('instagram').value.trim(),
    photoData,
    photoName:   selectedPhotoFile ? selectedPhotoFile.name : null,
    reelData,
    reelName:    selectedReelFile ? selectedReelFile.name : null,
    caption:     document.getElementById('caption').value.trim(),
    pledge:      pledge ? pledge.checked : false,
    status:      'pending',
    submittedAt: new Date().toISOString(),
    likes:       0
  };

  // For backwards compatibility with main.js generic rendering if it expects 'fileData'
  if (cat.value === 'Photo') {
    submission.fileData = photoData;
    submission.fileName = selectedPhotoFile.name;
    submission.fileType = selectedPhotoFile.type;
  } else if (cat.value === 'Reel') {
    submission.fileData = reelData;
    submission.fileName = selectedReelFile.name;
    submission.fileType = selectedReelFile.type;
  } else {
    // If both, store photo as main for backward compat, and reel separately
    submission.fileData = photoData;
    submission.fileName = selectedPhotoFile.name;
    submission.fileType = selectedPhotoFile.type;
  }

  subs.push(submission);
  LL.saveSubmissions(subs);

  if (submission.pledge) LL.addPledge();

  // Show success
  document.getElementById('regForm').style.display = 'none';
  const success = document.getElementById('successScreen');
  success.classList.add('show');
  document.getElementById('successId').textContent = submission.id;
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Entry submitted successfully! 🌿', 'success', 5000);
}

window.resetForm = function() {
  document.getElementById('regForm').style.display = 'block';
  document.getElementById('regForm').reset();
  document.getElementById('successScreen').classList.remove('show');
  clearFile('Photo');
  clearFile('Reel');
  document.getElementById('dynamicUploads').style.display = 'none';
  document.getElementById('noCatMsg').style.display = 'block';

  const preSubmitBtn = document.getElementById('preSubmitBtn');
  preSubmitBtn.disabled = false;
  preSubmitBtn.innerHTML = '<i data-lucide="send" style="width:20px;height:20px;"></i> Continue to Submit';
  
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalScrollHint = document.getElementById('modalScrollHint');
  modalSubmitBtn.classList.remove('active');
  modalScrollHint.style.color = '#f4a261';
  modalScrollHint.textContent = 'Scroll down to accept';
  
  if (window.lucide) lucide.createIcons();
}

// ── INLINE VALIDATION ─────────────────────────────
function initInlineValidation() {
  ['fullName','email','phone','rollNum','branch','yearOfStudy'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => {
      if (el.value.trim()) hideError(id);
    });
  });
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCategorySelection();
  initFileUpload('Photo');
  initFileUpload('Reel');
  initInlineValidation();
  initModal();
});

window.updateWordCount = updateWordCount;
window.clearFile = clearFile;
