// register3.js — Leaf & Lens 3-Step Registration Logic

// ── CONFIG ───────────────────────────────────────────
// Get a FREE token from: https://huggingface.co/settings/tokens (read-only token)
const HF_TOKEN = 'hf_YOUR_TOKEN_HERE';
const HF_MODEL = 'umm-maybe/AI-image-detector';

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

    if (isActive && settings.regLimit) {
      const allSubs = await TURSO.getSubmissions();
      if (allSubs.length >= settings.regLimit) {
        isActive = false;
        document.querySelector('.cs-title').textContent = "Registrations Full";
        document.querySelector('.cs-desc').textContent = "The registration limit for Leaf & Lens 2026 has been reached.";
      }
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
  // Free competition: QR loading disabled.
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
  for (let i = 1; i <= 2; i++) {
    const si = document.getElementById('si-' + i);
    if(si) {
      si.classList.remove('active', 'done');
      if (i < currentStep) si.classList.add('done');
      else if (i === currentStep) si.classList.add('active');
    }
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

  // Same-team duplicate check
  if (formData.s2Reg && formData.s1Reg === formData.s2Reg) {
    showToast('❌ Student 1 and Student 2 cannot have the same Registration Number', 'error');
    return;
  }

  const btn = document.getElementById('btn1Next');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Checking Registry...';

  // Cross-team duplicate check
  const dupError = await checkDuplicateReg(formData.s1Reg, formData.s2Reg);
  if (dupError) {
    showToast(dupError, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
    return;
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

// ── SHARED REG NUMBER DUPLICATE CHECK ────────────────
async function checkDuplicateReg(reg1, reg2) {
  try {
    const allSubs = await TURSO.getSubmissions();
    const existingRegs = new Set();
    allSubs.forEach(s => {
      if (s.member1Roll) existingRegs.add(s.member1Roll.toUpperCase());
      if (s.member2Roll) existingRegs.add(s.member2Roll.toUpperCase());
    });
    if (existingRegs.has(reg1)) {
      return `❌ Registration Number ${reg1} is already registered in another team.`;
    }
    if (reg2 && existingRegs.has(reg2)) {
      return `❌ Registration Number ${reg2} is already registered in another team.`;
    }
    return null; // No duplicate
  } catch(e) {
    console.error('Duplicate check failed:', e);
    return '❌ Could not verify registration numbers. Please check your internet connection and try again.';
  }
}

// ── STEP 2 VALIDATE & NEXT ───────────────────────────
function step2Next() {
  submitForm();
}

async function setupPaymentStep() {
  // No longer used.
}

// ── AI / EDIT IMAGE SCANNER ───────────────────────────
async function scanImageForAIFlags(file) {
  const readChunk = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsArrayBuffer(blob);
  });

  function bufToText(buffer) {
    const arr = new Uint8Array(buffer);
    let txt = '';
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      txt += (c >= 32 && c <= 126) ? String.fromCharCode(c) : ' ';
    }
    return txt.toLowerCase();
  }

  try {
    // Read first 512KB + last 64KB (covers EXIF, XMP, PNG tEXt chunks, and end-of-file metadata)
    const headSize = Math.min(file.size, 512 * 1024);
    const tailSize = Math.min(file.size, 64 * 1024);
    const headBuf = await readChunk(file.slice(0, headSize));
    const tailBuf = file.size > headSize ? await readChunk(file.slice(-tailSize)) : headBuf;
    const text = bufToText(headBuf) + ' ' + bufToText(tailBuf);

    // ── AI-generated tool signatures ──────────────────
    const aiKeywords = [
      // Midjourney
      'midjourney', 'niji journey',
      // DALL-E / OpenAI
      'dall-e', 'dall_e', 'dalle', 'openai',
      // Stable Diffusion (metadata embedded by A1111, ComfyUI, etc.)
      'stable diffusion', 'stablediffusion', 'stable-diffusion',
      'automatic1111', 'a1111', 'comfyui', 'invokeai', 'vladmandic',
      'cfg scale', 'model hash', 'vae hash',    // SD parameter keys
      'negative prompt:', 'steps:', 'sampler:',  // SD prompt block
      'hires fix', 'hires upscaler', 'denoising strength',
      'clip skip', 'ensd:', 'ti hashes:',
      // NovelAI
      'novelai', 'novel ai',
      // Adobe Firefly / Generative AI
      'adobe firefly', 'com.adobe.gentech', 'generative fill',
      'com.adobe.generative', 'adobedirefill',
      // Leonardo.AI
      'leonardoai', 'leonardo.ai', 'leonardo ai',
      // Bing / Microsoft Image Creator (DALL-E)
      'bing image creator', 'image creator from microsoft', 'microsoft designer',
      // Other popular tools
      'ideogram', 'playground ai', 'playgroundai',
      'dreamstudio', 'nightcafe', 'tensor.art',
      'civitai', 'kandinsky', 'imagen',
      'flux model', 'flux.1', 'black-forest-labs',
      'getimg.ai', 'adobe express ai', 'adobe sensei',
      'runwayml', 'runway ml', 'pika labs', 'genmo',
      'ai-generated', 'ai generated', 'generated by ai',
      'aigenerated', 'gen-ai', 'genai',
      'textual inversion', 'lora:', 'hypernetwork',
      'dreamshaper', 'deliberate', 'realistic vision', // popular SD models
    ];

    // ── Editing tool signatures ──────────────────────
    const editKeywords = [
      'photoshop', 'lightroom', 'adobe illustrator',
      'canva', 'gimp', 'picsart', 'snapseed', 'vsco',
      'facetune', 'afterlight', 'pixlr', 'fotor',
      'capture one', 'darktable', 'affinity photo',
      'luminar', 'skylum', 'acdsee',
    ];

    const isAI = aiKeywords.some(kw => text.includes(kw));
    const isEdited = editKeywords.some(kw => text.includes(kw));

    if (isAI) return isEdited ? 'AI Generated / Edited' : 'AI Generated';
    if (isEdited) return 'Edited';
    return null;

  } catch (e) {
    console.warn('AI scan failed:', e);
    return null;
  }
}

// ── HUGGING FACE ML-BASED AI DETECTION ───────────────
async function detectAIWithHF(file) {
  // Skip if token not configured
  if (!HF_TOKEN || HF_TOKEN === 'hf_YOUR_TOKEN_HERE') return null;

  try {
    // Convert to ArrayBuffer and send raw image bytes to HF Inference API
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': file.type || 'image/jpeg'
        },
        body: arrayBuffer
      }
    );

    if (!response.ok) {
      console.warn('HF API error:', response.status);
      return null;
    }

    const results = await response.json();
    // Response: [{"label": "artificial", "score": 0.95}, {"label": "human", "score": 0.05}]
    if (!Array.isArray(results)) return null;

    const artificial = results.find(r => r.label && r.label.toLowerCase().includes('artificial'));
    const score = artificial ? artificial.score : 0;
    const pct = Math.round(score * 100);

    if (score >= 0.75) return `AI Generated (HF: ${pct}% confidence)`;
    if (score >= 0.50) return `Possibly AI Generated (HF: ${pct}% confidence)`;
    return null;

  } catch (e) {
    console.warn('HF AI detection failed:', e);
    return null;
  }
}


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

    // Run metadata scan + HF ML scan in parallel for best accuracy
    const statusEl = document.getElementById('photoName');
    statusEl.textContent = file.name + ' (' + mb.toFixed(1) + ' MB) · 🔍 Scanning...';
    formData.aiFlags = null; // reset

    Promise.all([
      scanImageForAIFlags(file),
      detectAIWithHF(file)
    ]).then(([metaFlag, hfFlag]) => {
      // Combine results: either source can flag as AI
      let finalFlag = null;
      if (metaFlag && metaFlag.toLowerCase().includes('ai')) finalFlag = metaFlag;
      if (hfFlag) finalFlag = finalFlag ? finalFlag + ' / ' + hfFlag : hfFlag;
      if (!finalFlag && metaFlag) finalFlag = metaFlag; // edited flag from metadata
      formData.aiFlags = finalFlag;

      const badge = finalFlag
        ? (finalFlag.toLowerCase().includes('ai') ? ' · ⚠️ AI Detected' : ' · ✏️ Edited')
        : ' · ✅ Looks Natural';
      statusEl.textContent = file.name + ' (' + mb.toFixed(1) + ' MB)' + badge;
    });
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
  const cat = formData.category;
  let valid = true;
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

  const btn = document.getElementById('btnSubmit') || document.getElementById('btn2Next');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    // Final cross-team duplicate re-check before saving
    const dupError = await checkDuplicateReg(formData.s1Reg, formData.s2Reg);
    if (dupError) {
      showToast(dupError, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    const toBase64 = f => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

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
      paymentScreenshotUrl: null,
      aiFlags:      formData.aiFlags || null,
      status:       'pending',
      submittedAt:  new Date().toISOString()
    };

    await TURSO.saveSubmission(submission);

    // Show success
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('stepSuccess').classList.remove('hidden');
    document.getElementById('successId').textContent = id;

    // Update step indicators all done
    for (let i = 1; i <= 2; i++) {
      const si = document.getElementById('si-' + i);
      if(si) {
        si.classList.remove('active');
        si.classList.add('done');
      }
    }

    showToast('🎉 Registration successful!', 'success');

  } catch (err) {
    console.error('Submission error:', err);
    showToast('Submission failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
