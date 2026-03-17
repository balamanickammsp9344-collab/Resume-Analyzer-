/**
 * AI Resume Analyzer — app.js
 * Handles file upload, API communication, and result rendering.
 *
 * Configuration: Change API_BASE if your backend is hosted elsewhere.
 */

const API_BASE = "http://localhost:8000"; // ← Update for production

// ─── DOM refs ───────────────────────────────────────────────────────────────
const dropZone      = document.getElementById("drop-zone");
const fileInput     = document.getElementById("file-input");
const dropTitle     = document.getElementById("drop-title");
const dropSub       = document.getElementById("drop-sub");
const dropIcon      = document.getElementById("drop-icon");
const roleSelect    = document.getElementById("role-select");
const analyzeBtn    = document.getElementById("analyze-btn");
const btnText       = document.getElementById("btn-text");
const btnSpinner    = document.getElementById("btn-spinner");
const uploadCard    = document.getElementById("upload-card");
const resultsCard   = document.getElementById("results-card");
const errorBanner   = document.getElementById("error-banner");
const errorMsg      = document.getElementById("error-msg");
const resetBtn      = document.getElementById("reset-btn");

// Results elements
const scoreNumber   = document.getElementById("score-number");
const ringFill      = document.getElementById("ring-fill");
const scoreHeading  = document.getElementById("score-heading");
const scoreRole     = document.getElementById("score-role");
const metaPills     = document.getElementById("meta-pills");
const foundSkills   = document.getElementById("found-skills");
const missingSkills = document.getElementById("missing-skills");
const tipsList      = document.getElementById("tips-list");

let selectedFile = null;

// ─── File selection ──────────────────────────────────────────────────────────
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) setFile(fileInput.files[0]);
});

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

function setFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showError("Please upload a PDF file.");
    return;
  }
  selectedFile = file;
  const sizeKB = (file.size / 1024).toFixed(0);
  dropTitle.textContent = file.name;
  dropSub.textContent   = `${sizeKB} KB · PDF · Ready to analyze`;
  dropZone.classList.add("has-file");
  analyzeBtn.disabled = false;
  btnText.textContent = "Analyze Resume";
  hideError();
}

// ─── Analyze ─────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener("click", analyze);

async function analyze() {
  if (!selectedFile) return;

  setLoading(true);
  hideError();

  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("role", roleSelect.value);

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || `Server error: ${response.status}`);
    }

    const data = await response.json();
    renderResults(data);

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      showError(
        "Cannot connect to the backend server. Make sure it's running at: " + API_BASE
      );
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
}

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(data) {
  // Score
  animateScore(data.score);
  scoreHeading.textContent = scoreLabel(data.score);
  scoreRole.textContent    = `Target role: ${data.role}`;

  // Score ring color
  if (data.score >= 75)      ringFill.style.stroke = "#1e8e3e";
  else if (data.score >= 50) ringFill.style.stroke = "#e37400";
  else                       ringFill.style.stroke = "#d93025";

  // Meta pills
  metaPills.innerHTML = `
    <span class="meta-pill">📄 ~${data.page_count} page${data.page_count !== 1 ? "s" : ""}</span>
    <span class="meta-pill">📝 ${data.word_count} words</span>
    <span class="meta-pill">${data.has_contact_info ? "✅ Contact info" : "⚠️ No contact info"}</span>
    <span class="meta-pill">${data.has_quantification ? "✅ Has metrics" : "⚠️ No numbers/metrics"}</span>
  `;

  // Found skills
  foundSkills.innerHTML = data.found_skills.length
    ? data.found_skills.map(s => `<span class="tag found">${capitalize(s)}</span>`).join("")
    : `<span style="font-size:13px;color:var(--text-muted)">No matching skills detected.</span>`;

  // Missing skills
  missingSkills.innerHTML = data.missing_skills.length
    ? data.missing_skills.map(s => `<span class="tag missing">${capitalize(s)}</span>`).join("")
    : `<span style="font-size:13px;color:var(--text-muted)">All key skills found! 🎉</span>`;

  // Tips
  tipsList.innerHTML = data.tips
    .map((tip, i) => `
      <li class="tip-item" style="animation-delay:${i * 60}ms">
        <span class="tip-num">${i + 1}</span>
        <span>${tip}</span>
      </li>
    `)
    .join("");

  // Show results
  uploadCard.classList.add("hidden");
  resultsCard.classList.remove("hidden");
}

// ─── Score ring animation ─────────────────────────────────────────────────────
function animateScore(target) {
  const circumference = 314; // 2π × r (r=50)
  let current = 0;
  const duration = 1200;
  const startTime = performance.now();

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    current        = Math.round(target * eased);

    scoreNumber.textContent       = current;
    ringFill.style.strokeDashoffset = circumference - (circumference * current) / 100;

    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-content-${tab.dataset.tab}`).classList.add("active");
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
  selectedFile    = null;
  fileInput.value = "";
  dropTitle.textContent = "Drag & drop your resume";
  dropSub.textContent   = 'or browse file · PDF only';
  dropZone.classList.remove("has-file");
  analyzeBtn.disabled = true;
  btnText.textContent = "Choose a file to analyze";
  scoreNumber.textContent = "0";
  ringFill.style.strokeDashoffset = "314";
  resultsCard.classList.add("hidden");
  uploadCard.classList.remove("hidden");
  // Reset tabs
  document.getElementById("tab-skills").click();
  hideError();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
  btnText.textContent  = on ? "Analyzing…" : "Analyze Resume";
  btnSpinner.hidden    = !on;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove("hidden");
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideError() { errorBanner.classList.add("hidden"); }

function scoreLabel(score) {
  if (score >= 85) return "🚀 Excellent — ATS-ready!";
  if (score >= 70) return "👍 Good — minor improvements needed";
  if (score >= 50) return "⚡ Average — several issues to fix";
  if (score >= 30) return "⚠️ Needs work — major improvements";
  return "🔴 Poor — significant rewrite recommended";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
