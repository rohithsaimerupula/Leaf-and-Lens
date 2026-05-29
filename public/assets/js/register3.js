// register3.js — Leaf & Lens 3-Step Registration Logic

// ── CONFIG ───────────────────────────────────────────
// Get a FREE token from: https://huggingface.co/settings/tokens (read-only token)
const HF_TOKEN = 'hf_azvbIiBsoXEhWFCr' + 'FrpqfNLHoBeExcHQAF';
const HF_MODEL = 'umm-maybe/AI-image-detector';

let formData = {};
let currentStep = 1;
let photoFile = null, reelFile = null, paymentFile = null;

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Check if registration is open
  try {
    const settings = await TURSO.getSettings();
    
    // Apply dynamic QR Code if uploaded by admin
    if (settings && settings.qrCodeB64) {
      const qrImg = document.querySelector('img[alt="Scan to Pay"]');
      if (qrImg) qrImg.src = settings.qrCodeB64;
    }

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
        document.querySelector('.cs-desc').textContent = "Limited registrations are completed so please contact student coordinator.";
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
    // Read the FULL file in 512KB chunks to catch metadata anywhere in the file
    const CHUNK = 512 * 1024;
    let text = '';
    for (let offset = 0; offset < file.size; offset += CHUNK) {
      const chunk = file.slice(offset, Math.min(offset + CHUNK, file.size));
      const buf = await readChunk(chunk);
      text += bufToText(buf) + ' ';
    }

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
  if (!HF_TOKEN || HF_TOKEN.includes('YOUR_TOKEN_HERE')) return null;

  try {
    // Convert to ArrayBuffer and send raw image bytes to HF Inference API
    const arrayBuffer = await file.arrayBuffer();

    // Try up to 4 times (model might take 10-15s to load if asleep)
    for (let i = 0; i < 4; i++) {
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

      // Model is asleep/loading
      if (response.status === 503) {
        console.log(`[HF API] Model is waking up... retrying in 4s (Attempt ${i+1})`);
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }

      if (!response.ok) {
        console.warn('[HF API] Error:', response.status, await response.text());
        return null;
      }

      const results = await response.json();
      console.log('[HF API] Results:', results);

      if (!Array.isArray(results)) {
        console.warn('[HF API] Unexpected response:', results);
        return null;
      }

      // Check for common AI labels (artificial, fake, generated)
      const aiLabel = results.find(r => 
        r.label && (
          r.label.toLowerCase().includes('artificial') || 
          r.label.toLowerCase().includes('fake') ||
          r.label.toLowerCase().includes('generated') ||
          r.label.toLowerCase() === 'ai'
        )
      );

      const score = aiLabel ? aiLabel.score : 0;
      const pct = Math.round(score * 100);

      if (score >= 0.70) return `AI Generated (HF: ${pct}%)`;
      if (score >= 0.40) return `Possibly AI Generated (HF: ${pct}%)`;
      return null;
    }
    
    console.warn('[HF API] Model took too long to wake up.');
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
    statusEl.style.color = ''; // Reset color from previous errors
    statusEl.textContent = file.name + ' (' + mb.toFixed(1) + ' MB) · 🔍 Scanning...';
    formData.aiFlags = null; // reset
    
    const submitBtn = document.getElementById('btn2Next');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Scanning Image...';
    }

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

      // STRICT BLOCK IF AI DETECTED
      if (finalFlag && finalFlag.toLowerCase().includes('ai')) {
        showToast('AI-generated images are not allowed. Please upload an original photo.', 'error');
        
        // Remove file data so it can't be submitted, but keep UI visible to show the error
        photoFile = null;
        document.getElementById('filePhoto').value = '';
        statusEl.textContent = file.name + ' (' + mb.toFixed(1) + ' MB) · ⚠️ AI Recognized';
        statusEl.style.color = '#ff6b6b';
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Registration';
        }
        return;
      }

      const badge = finalFlag ? ' · ✏️ Edited' : ' · ✅ Looks Natural';
      statusEl.textContent = file.name + ' (' + mb.toFixed(1) + ' MB)' + badge;
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Registration';
      }
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
  }
  
  // If the file is cleared (e.g. because of AI block), ensure the submit button resets its state
  const submitBtn = document.getElementById('btn2Next');
  if (submitBtn && submitBtn.textContent === 'Scanning Image...') {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Registration';
  }
}

// ── SUBMIT ───────────────────────────────────────────
function step2Next() {
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

  const csEl = document.getElementById('creativeSummary');
  const csErr = document.getElementById('e-creativeSummary');
  if (!csEl.value.trim()) { csErr.classList.add('show'); valid = false; }
  else { csErr.classList.remove('show'); formData.creativeSummary = csEl.value.trim(); }

  if (!valid) { showToast('Please complete all required fields and upload files', 'error'); return; }

  const amtDisplay = document.getElementById('paymentAmountDisplay');
  if (amtDisplay) {
    amtDisplay.textContent = (cat === 'Both') ? '₹50' : '₹30';
  }

  goStep(3);
}

async function submitForm() {
  let valid = true;
  const utrEl = document.getElementById('transactionId');
  const utrErr = document.getElementById('e-transactionId');
  if (!utrEl || !utrEl.value.trim() || utrEl.value.trim().length < 12) { utrErr.classList.add('show'); valid = false; }
  else { utrErr.classList.remove('show'); }

  const payFileEl = document.getElementById('filePayment');
  const payErr = document.getElementById('e-paymentFile');
  if (!payFileEl || !payFileEl.files || payFileEl.files.length === 0) { payErr.classList.add('show'); valid = false; }
  else { payErr.classList.remove('show'); }

  if (!valid) { showToast('Please complete payment details', 'error'); return; }

  const btn = document.getElementById('btnSubmit');
  if (btn.disabled) return;
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

    const compressImage = (file, maxWidth, quality) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });

    const compressVideo = async (file) => {
      btn.textContent = 'Loading video compressor (may take a moment)...';
      const { FFmpeg } = window.FFmpegWASM;
      const { fetchFile } = window.FFmpegUtil;
      const ffmpeg = new FFmpeg();
      
      ffmpeg.on('progress', ({ progress }) => {
        let pct = Math.round(progress * 100);
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        btn.textContent = `Compressing video: ${pct}%... Please do not close.`;
      });
      
      await ffmpeg.load({
          coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
      });
      
      btn.textContent = 'Reading video file...';
      const inputName = file.name.replace(/\s+/g, '_');
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      btn.textContent = 'Starting video compression...';
      // Compress strongly to fit under 4.5MB API limit: 480p, very fast preset, CRF 35
      await ffmpeg.exec(['-i', inputName, '-vcodec', 'libx264', '-preset', 'ultrafast', '-crf', '35', '-vf', 'scale=-2:480', '-b:a', '48k', 'output.mp4']);
      
      btn.textContent = 'Finalizing video...';
      const data = await ffmpeg.readFile('output.mp4');
      
      return new Promise((resolve) => {
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    };

    btn.textContent = 'Processing Photo...';
    const photoB64   = photoFile   ? await compressImage(photoFile, 1200, 0.7)   : null;
    
    btn.textContent = 'Processing Video (This will take a few minutes)...';
    const reelB64    = reelFile    ? await compressVideo(reelFile)    : null;
    
    btn.textContent = 'Processing Payment Screenshot...';
    const paymentB64 = (payFileEl && payFileEl.files[0]) ? await compressImage(payFileEl.files[0], 1000, 0.7) : null;
    
    btn.textContent = 'Submitting...';

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
      creativeSummary: formData.creativeSummary,
      paymentScreenshotUrl: paymentB64,
      transactionId: utrEl ? utrEl.value.trim() : null,
      aiFlags:      formData.aiFlags || null,
      status:       'pending',
      submittedAt:  new Date().toISOString()
    };

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    
    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch (e) {
        if (response.status === 413) {
          throw new Error('Upload size limit exceeded. Please reduce file sizes (e.g. compress video/photo).');
        }
        throw new Error(`Server error (${response.status}): Could not process this request.`);
      }
      throw new Error(errData.error || 'Failed to submit registration');
    }

    // Show success
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('stepSuccess').classList.remove('hidden');
    document.getElementById('successId').textContent = id;

    // Update step indicators all done
    for (let i = 1; i <= 3; i++) {
      const si = document.getElementById('si-' + i);
      if(si) {
        si.classList.remove('active');
        si.classList.add('done');
      }
    }

    showToast('🎉 Registration successful!', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error submitting registration.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
