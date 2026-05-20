// register3.js — Leaf & Lens 3-Step Registration Logic

let formData = {};
let currentStep = 1;
let photoFile = null, reelFile = null, paymentFile = null;

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Check if registration is open
  try {
    const settings = await TURSO.getSettings();
    const now = new Date();
    let isActive = !!settings.competitionActive;

    // Check dates if active
    if (isActive && settings.regStartDate && settings.regEndDate) {
      const start = new Date(settings.regStartDate);
      const end = new Date(settings.regEndDate);
      if (now < start || now > end) isActive = false;
    }

    if (!isActive) {
      document.getElementById('closedScreen').style.display = 'flex';
      document.getElementById('regWrap').style.display = 'none';
      return;
    } else {
      document.getElementById('regWrap').style.display = 'block';
    }
    // Load QR code
    loadQR(settings);
  } catch (e) {
    console.warn('Could not load settings:', e);
    document.getElementById('regWrap').style.display = 'block'; // Fallback
  }

  // Category card click updates highlight
  document.querySelectorAll('.cat-card input').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.cat-card').classList.add('selected');
    });
  });
});

function loadQR(settings) {
  const qrImg = document.getElementById('qrImg');
  const qrLoading = document.getElementById('qrLoading');
  const qrNoImg = document.getElementById('qrNoImg');
  const payAmount = document.getElementById('payAmount');
  const payDesc = document.getElementById('payDesc');

  // Set amount based on category
  const cat = formData.category;
  if (cat === 'Both') {
    payAmount.textContent = '₹50';
    payDesc.textContent = 'Photo + Reel category';
  } else {
    payAmount.textContent = '₹30';
    payDesc.textContent = (cat || 'Photo / Reel') + ' category';
  }

  // Load QR
  const qrSrc = (cat === 'Both') ? settings.qrImage50 : settings.qrImage30;
  
  if (qrSrc) {
    qrLoading.style.display = 'none';
    qrImg.src = qrSrc;
    qrImg.classList.remove('hidden');
    const hint = document.getElementById('qrClickHint');
    if (hint) hint.classList.remove('hidden');
  } else {
    qrLoading.style.display = 'none';
    qrNoImg.classList.remove('hidden');
  }
}

function enlargeQR(img) {
  const lb = document.getElementById('qrLightbox');
  const lbImg = document.getElementById('qrLightboxImg');
  lbImg.src = img.src;
  lb.style.display = 'flex';
}

// ── STEP NAVIGATION ──────────────────────────────────
function goStep(n) {
  document.getElementById('step' + currentStep).classList.add('hidden');
  currentStep = n;
  const el = document.getElementById('step' + (n === 'Success' ? 'Success' : n));
  el.classList.remove('hidden');

  // Update step bar
  for (let i = 1; i <= 3; i++) {
    const si = document.getElementById('si-' + i);
    si.classList.remove('active', 'done');
    if (i < currentStep) si.classList.add('done');
    else if (i === currentStep) si.classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── STEP 1 VALIDATE & NEXT ───────────────────────────
async function step1Next() {
  let valid = true;

  const req = (id, errId, check) => {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);
    const ok = check ? check(el.value.trim()) : el.value.trim() !== '';
    err.classList.toggle('show', !ok);
    if (!ok) valid = false;
    return el.value.trim();
  };

  formData.teamName   = req('teamName', 'e-teamName');
  formData.s1Name     = req('s1Name', 'e-s1Name');
  formData.s1Reg      = req('s1Reg', 'e-s1Reg').toUpperCase();
  formData.s1Phone    = req('s1Phone', 'e-s1Phone', v => /^\d{10}$/.test(v.replace(/\s/g,'')));
  formData.s1Email    = req('s1Email', 'e-s1Email', v => /^[^\s@]+@gmail\.com$/i.test(v));
  formData.branch     = req('branch', 'e-branch');
  formData.section    = req('section', 'e-section');

  // Student 2 (optional but if name given, reg/phone required)
  formData.s2Name     = document.getElementById('s2Name').value.trim();
  formData.s2Reg      = document.getElementById('s2Reg').value.trim().toUpperCase();
  formData.s2Phone    = document.getElementById('s2Phone').value.trim();
  formData.s2Branch   = document.getElementById('branch2') ? document.getElementById('branch2').value : null;
  formData.s2Section  = document.getElementById('section2') ? document.getElementById('section2').value.trim() : null;

  // Category
  const catSel = document.querySelector('input[name="cat"]:checked');
  const catErr = document.getElementById('e-cat');
  if (!catSel) { catErr.classList.add('show'); valid = false; }
  else { catErr.classList.remove('show'); formData.category = catSel.value; }

  // Rules checkbox
  const rulesChk = document.getElementById('rulesRead');
  const rulesErr = document.getElementById('e-rules');
  if (!rulesChk.checked) { rulesErr.classList.add('show'); valid = false; }
  else rulesErr.classList.remove('show');

  if (!valid) { showToast('Please fill all required fields', 'error'); return; }

  // Strict Uniqueness Checks
  if (formData.s2Reg && formData.s1Reg === formData.s2Reg) {
    showToast('Student 1 and Student 2 cannot have the same Registration Number', 'error');
    return;
  }

  const btn = document.getElementById('btn1Next');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Checking Registry...';

  try {
    const allSubs = await TURSO.getSubmissions();
    const existingRegs = new Set();
    allSubs.forEach(s => {
      if (s.member1Roll) existingRegs.add(s.member1Roll.toUpperCase());
      if (s.member2Roll) existingRegs.add(s.member2Roll.toUpperCase());
    });

    if (existingRegs.has(formData.s1Reg)) {
      showToast(`Registration Number ${formData.s1Reg} has already registered in another team.`, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }
    if (formData.s2Reg && existingRegs.has(formData.s2Reg)) {
      showToast(`Registration Number ${formData.s2Reg} has already registered in another team.`, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }
  } catch(e) {
    console.error("Could not fetch submissions for uniqueness check, proceeding anyway...", e);
  }

  btn.disabled = false;
  btn.innerHTML = originalText;

  // Setup step 2
  setupUploadStep();
  goStep(2);
}

function setupUploadStep() {
  const cat = formData.category;
  const photoZone = document.getElementById('photoZone');
  const reelZone  = document.getElementById('reelZone');
  const note      = document.getElementById('uploadNote');

  if (cat === 'Photo') {
    photoZone.style.display = 'block';
    reelZone.style.display  = 'none';
    note.textContent = '📷 Upload your Photo entry (JPG/PNG · Max 10 MB)';
  } else if (cat === 'Reel') {
    photoZone.style.display = 'none';
    reelZone.style.display  = 'block';
    note.textContent = '🎬 Upload your Reel entry (MP4/MKV · Max 50 MB)';
  } else {
    photoZone.style.display = 'block';
    reelZone.style.display  = 'block';
    note.textContent = '✨ Upload both your Photo (JPG/PNG) and Reel (MP4/MKV)';
  }
}

// ── STEP 2 VALIDATE & NEXT ───────────────────────────
function step2Next() {
  let valid = true;
  const cat = formData.category;

  if (cat === 'Photo' || cat === 'Both') {
    const err = document.getElementById('e-photo');
    if (!photoFile) { err.classList.add('show'); valid = false; }
    else err.classList.remove('show');
  }
  if (cat === 'Reel' || cat === 'Both') {
    const err = document.getElementById('e-reel');
    if (!reelFile) { err.classList.add('show'); valid = false; }
    else err.classList.remove('show');
  }

  if (!valid) { showToast('Please upload required files', 'error'); return; }

  // Setup payment step
  setupPaymentStep();
  goStep(3);
}

async function setupPaymentStep() {
  try {
    const settings = await TURSO.getSettings();
    loadQR(settings);
  } catch (e) {
    loadQR({});
  }
}

// ── FILE HANDLING ────────────────────────────────────
function handleFile(type, input) {
  const file = input.files[0];
  if (!file) return;

  const limits = { photo: 10, reel: 50, payment: 5 };
  const mb = file.size / 1024 / 1024;
  if (mb > limits[type]) {
    showToast(`File too large! Max ${limits[type]} MB for ${type}`, 'error');
    input.value = '';
    return;
  }

  if (type === 'photo') {
    photoFile = file;
    document.getElementById('photoName').textContent = file.name + ' (' + mb.toFixed(1) + ' MB)';
    document.getElementById('photoInfo').classList.remove('hidden');
    document.getElementById('photoDropBody').style.opacity = '0.4';

    // Simple EXIF/Binary scanner for AI/Edited detection
    const r = new FileReader();
    r.onload = function(e) {
      const txt = e.target.result || "";
      const lower = txt.toLowerCase();
      let flags = [];
      if (lower.includes("adobe") || lower.includes("photoshop") || lower.includes("lightroom") || lower.includes("canva")) {
        flags.push("Edited");
      }
      if (lower.includes("midjourney") || lower.includes("dall-e") || lower.includes("stable diffusion") || lower.includes("ai-generated")) {
        flags.push("AI Generated");
      }
      formData.aiFlags = flags.length > 0 ? flags.join(" / ") : null;
    };
    r.readAsText(file.slice(0, 65536)); // Read first 64KB for EXIF headers
  } else if (type === 'reel') {
    const isMkv = file.name.toLowerCase().endsWith('.mkv');
    if (isMkv) {
      reelFile = file;
      document.getElementById('reelName').textContent = file.name + ' (' + mb.toFixed(1) + ' MB) · [Duration check bypassed for MKV]';
      document.getElementById('reelInfo').classList.remove('hidden');
      document.getElementById('reelDropBody').style.opacity = '0.4';
    } else {
      document.getElementById('reelName').textContent = 'Analyzing video duration...';
      document.getElementById('reelInfo').classList.remove('hidden');
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (isNaN(duration) || duration < 30 || duration > 60) {
          showToast('Video duration must be between 30 and 60 seconds! Your video is ' + Math.round(duration || 0) + 's.', 'error');
          clearFile('reel');
        } else {
          reelFile = file;
          document.getElementById('reelName').textContent = file.name + ' (' + mb.toFixed(1) + ' MB · ' + Math.round(duration) + 's)';
          document.getElementById('reelDropBody').style.opacity = '0.4';
        }
      };
      video.onerror = function() {
        window.URL.revokeObjectURL(video.src);
        showToast('Error reading video file. Ensure it is a valid MP4/MKV.', 'error');
        clearFile('reel');
      };
    }
  } else if (type === 'payment') {
    paymentFile = file;
    document.getElementById('paymentName').textContent = file.name + ' (' + mb.toFixed(1) + ' MB)';
    document.getElementById('paymentInfo').classList.remove('hidden');
    document.getElementById('paymentDropBody').style.opacity = '0.4';
  }
}

function clearFile(type) {
  if (type === 'photo') {
    photoFile = null;
    document.getElementById('filePhoto').value = '';
    document.getElementById('photoInfo').classList.add('hidden');
    document.getElementById('photoDropBody').style.opacity = '';
  } else if (type === 'reel') {
    reelFile = null;
    document.getElementById('fileReel').value = '';
    document.getElementById('reelInfo').classList.add('hidden');
    document.getElementById('reelDropBody').style.opacity = '';
  } else if (type === 'payment') {
    paymentFile = null;
    document.getElementById('filePayment').value = '';
    document.getElementById('paymentInfo').classList.add('hidden');
    document.getElementById('paymentDropBody').style.opacity = '';
  }
}

// ── SUBMIT ───────────────────────────────────────────
async function submitForm() {
  // Validate payment screenshot
  const errPay = document.getElementById('e-payment');
  if (!paymentFile) { errPay.classList.add('show'); showToast('Please upload payment screenshot', 'error'); return; }
  errPay.classList.remove('show');

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    // Convert files to base64 for storage
    const toBase64 = f => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

    const paymentB64 = await toBase64(paymentFile);
    const photoB64   = photoFile   ? await toBase64(photoFile)   : null;
    const reelB64    = reelFile    ? await toBase64(reelFile)    : null;

    // Generate submission ID
    const id = 'LL-2026-' + Date.now().toString(36).toUpperCase();

    const submission = {
      id,
      teamName: formData.teamName,
      participationType: formData.category,
      member1Name:  formData.s1Name,
      member1Roll:  formData.s1Reg,
      member1Email: formData.s1Email,
      member1Phone: formData.s1Phone,
      member2Name:  formData.s2Name  || null,
      member2Roll:  formData.s2Reg   || null,
      member2Email: null,
      member2Phone: formData.s2Phone || null,
      branch:       formData.branch,
      section:      formData.section,
      member2Branch: formData.s2Branch || null,
      member2Section: formData.s2Section || null,
      photoUrl:     photoB64,
      reelUrl:      reelB64,
      paymentScreenshotUrl: paymentB64,
      aiFlags:      formData.aiFlags || null,
      status:       'pending',
      submittedAt:  new Date().toISOString()
    };

    await TURSO.saveSubmission(submission);

    // Show success
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('stepSuccess').classList.remove('hidden');
    document.getElementById('successId').textContent = id;

    // Update step indicators all done
    for (let i = 1; i <= 3; i++) {
      const si = document.getElementById('si-' + i);
      si.classList.remove('active');
      si.classList.add('done');
    }

    showToast('🎉 Registration successful!', 'success');

  } catch (err) {
    console.error('Submission error:', err);
    showToast('Submission failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '✓ Complete Registration';
  }
}
