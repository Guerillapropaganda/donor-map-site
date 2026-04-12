import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const TipForm: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const type = String(fileData.frontmatter?.type ?? "")
  if (type !== "politician" && type !== "donor" && type !== "corporation") return null
  const title = String(fileData.frontmatter?.title ?? "")

  return (
    <div id="tip-form-root" data-profile-title={title}>
      <div class="tip-form-wrapper">
        <div class="tip-form-header">
          <span class="tip-form-icon">&#9993;</span>
          <span class="tip-form-label">SUBMIT A TIP</span>
        </div>
        <p class="tip-form-desc">
          Know something about this profile? Submit a tip. Financial connections,
          documents, voting patterns, corrections — all welcome.
        </p>
        <form id="tip-form" autocomplete="off">
          <input type="hidden" name="access_key" id="tip-access-key" />
          <input type="hidden" name="subject" id="tip-subject" />
          <input type="hidden" name="from_name" value="Donor Map Tip Form" />
          <input type="hidden" name="profile_url" id="tip-profile-url" />
          <div class="tip-field">
            <label for="tip-profile">PROFILE</label>
            <input type="text" id="tip-profile" name="profile" value={title} readonly />
          </div>
          <div class="tip-field">
            <label for="tip-email">YOUR EMAIL <span class="tip-req">*</span></label>
            <input type="email" id="tip-email" name="email" required placeholder="you@example.com" />
          </div>
          <div class="tip-field">
            <label for="tip-category">CATEGORY <span class="tip-req">*</span></label>
            <select id="tip-category" name="category" required>
              <option value="">Select...</option>
              <option value="financial">Financial connection</option>
              <option value="voting">Voting pattern</option>
              <option value="source">Source / document</option>
              <option value="correction">Correction</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="tip-field">
            <label for="tip-text">YOUR TIP <span class="tip-req">*</span></label>
            <textarea id="tip-text" name="message" required minLength={20} maxLength={2000}
              placeholder="What do you know? Be as specific as possible. Include names, dates, amounts, or links to public records."
              rows={5}></textarea>
            <div class="tip-char-count"><span id="tip-char">0</span> / 2000</div>
          </div>
          {/* Honeypot */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
          </div>
          <button type="submit" id="tip-submit" class="tip-submit-btn">
            SEND TIP
          </button>
          <div id="tip-status" class="tip-status" aria-live="polite"></div>
        </form>
      </div>
    </div>
  )
}

TipForm.css = `
.tip-form-wrapper {
  max-width: 640px;
  margin: 48px auto 32px;
  padding: 32px;
  background: #0a0a0a;
  border: 2px solid #222;
}

.tip-form-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.tip-form-icon {
  font-size: 18px;
  color: #fbbf24;
}

.tip-form-label {
  font-family: "Inter", sans-serif;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.15em;
  color: #f5f0eb;
}

.tip-form-desc {
  font-family: "Inter", sans-serif;
  font-size: 13px;
  color: #999;
  line-height: 1.5;
  margin: 0 0 24px;
}

.tip-field {
  margin-bottom: 16px;
}

.tip-field label {
  display: block;
  font-family: "Space Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #999;
  margin-bottom: 6px;
}

.tip-req {
  color: #e63946;
}

.tip-field input,
.tip-field select,
.tip-field textarea {
  width: 100%;
  background: #1a1a1a;
  border: 2px solid #333;
  color: #f5f0eb;
  font-family: "Space Mono", monospace;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.tip-field input:focus,
.tip-field select:focus,
.tip-field textarea:focus {
  border-color: #fbbf24;
}

.tip-field input[readonly] {
  color: #666;
  cursor: default;
}

.tip-field select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.tip-field select option {
  background: #1a1a1a;
  color: #f5f0eb;
}

.tip-field textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}

.tip-char-count {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  color: #555;
  text-align: right;
  margin-top: 4px;
}

.tip-submit-btn {
  width: 100%;
  background: #fbbf24;
  color: #0a0a0a;
  border: none;
  padding: 14px;
  font-family: "Inter", sans-serif;
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.tip-submit-btn:hover {
  background: #f59e0b;
}

.tip-submit-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.tip-status {
  font-family: "Space Mono", monospace;
  font-size: 12px;
  margin-top: 12px;
  text-align: center;
  min-height: 20px;
}

.tip-status.tip-success {
  color: #16a34a;
}

.tip-status.tip-error {
  color: #e63946;
}

.tip-field.tip-field-error input,
.tip-field.tip-field-error select,
.tip-field.tip-field-error textarea {
  border-color: #e63946;
}

@media (max-width: 600px) {
  .tip-form-wrapper {
    margin: 32px 0 24px;
    padding: 20px 16px;
  }
}
`

TipForm.afterDOMLoaded = `
(function() {
  var WEB3FORMS_KEY = "651faf1b-17c7-473c-ad63-f90f7c6081d7";
  var COOLDOWN_MS = 60000;
  var MIN_TIME_MS = 3000;

  function initTipForm() {
    var root = document.getElementById("tip-form-root");
    if (!root) return;
    var form = document.getElementById("tip-form");
    if (!form) return;
    if (form.dataset.tipInit === "true") return;
    form.dataset.tipInit = "true";

    var renderTime = Date.now();
    var urlField = document.getElementById("tip-profile-url");
    if (urlField) urlField.value = window.location.pathname;
    var accessKeyField = document.getElementById("tip-access-key");
    if (accessKeyField) accessKeyField.value = WEB3FORMS_KEY;
    var subjectField = document.getElementById("tip-subject");
    var profileTitle = root.getAttribute("data-profile-title") || "Unknown";
    if (subjectField) subjectField.value = "Tip: " + profileTitle;

    // Char counter
    var textarea = document.getElementById("tip-text");
    var charCount = document.getElementById("tip-char");
    if (textarea && charCount) {
      textarea.addEventListener("input", function() {
        charCount.textContent = textarea.value.length;
      });
    }

    form.addEventListener("submit", function(e) {
      e.preventDefault();

      var status = document.getElementById("tip-status");
      var btn = document.getElementById("tip-submit");
      if (!status || !btn) return;

      // Clear previous state
      status.textContent = "";
      status.className = "tip-status";
      document.querySelectorAll(".tip-field-error").forEach(function(el) {
        el.classList.remove("tip-field-error");
      });

      // Honeypot check
      var honeypot = form.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        status.textContent = "Tip submitted. Thank you.";
        status.className = "tip-status tip-success";
        return;
      }

      // Time gate
      if (Date.now() - renderTime < MIN_TIME_MS) {
        status.textContent = "Please take a moment to fill out the form.";
        status.className = "tip-status tip-error";
        return;
      }

      // Rate limit
      var lastSub = localStorage.getItem("donor-map-tip-last");
      if (lastSub && Date.now() - parseInt(lastSub, 10) < COOLDOWN_MS) {
        var secsLeft = Math.ceil((COOLDOWN_MS - (Date.now() - parseInt(lastSub, 10))) / 1000);
        status.textContent = "Please wait " + secsLeft + "s before submitting again.";
        status.className = "tip-status tip-error";
        return;
      }

      // Validate fields
      var email = document.getElementById("tip-email");
      var category = document.getElementById("tip-category");
      var tipText = document.getElementById("tip-text");
      var valid = true;

      if (!email || !email.value || !email.value.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)) {
        email && email.closest(".tip-field") && email.closest(".tip-field").classList.add("tip-field-error");
        valid = false;
      }
      if (!category || !category.value) {
        category && category.closest(".tip-field") && category.closest(".tip-field").classList.add("tip-field-error");
        valid = false;
      }
      if (!tipText || tipText.value.length < 20) {
        tipText && tipText.closest(".tip-field") && tipText.closest(".tip-field").classList.add("tip-field-error");
        status.textContent = "Tip must be at least 20 characters.";
        status.className = "tip-status tip-error";
        valid = false;
      }

      if (!valid) {
        if (!status.textContent) {
          status.textContent = "Please fill in all required fields.";
          status.className = "tip-status tip-error";
        }
        return;
      }

      // Check Web3Forms key
      if (!WEB3FORMS_KEY) {
        status.textContent = "Tip submission is not yet configured. Check back soon.";
        status.className = "tip-status tip-error";
        return;
      }

      // Submit
      btn.disabled = true;
      btn.textContent = "SENDING...";

      var data = new FormData(form);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data
      }).then(function(res) {
        return res.json();
      }).then(function(result) {
        if (result.success) {
          status.textContent = "Tip received. Thank you for contributing.";
          status.className = "tip-status tip-success";
          localStorage.setItem("donor-map-tip-last", Date.now().toString());
          form.reset();
          var profileField = document.getElementById("tip-profile");
          var titleAttr = root.getAttribute("data-profile-title");
          if (profileField && titleAttr) profileField.value = titleAttr;
          if (urlField) urlField.value = window.location.pathname;
          if (accessKeyField) accessKeyField.value = WEB3FORMS_KEY;
          if (subjectField) subjectField.value = "Tip: " + profileTitle;
          if (charCount) charCount.textContent = "0";
          renderTime = Date.now();
        } else {
          status.textContent = result.message || "Submission failed. Please try again.";
          status.className = "tip-status tip-error";
        }
      }).catch(function() {
        status.textContent = "Network error. Please check your connection.";
        status.className = "tip-status tip-error";
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = "SEND TIP";
      });
    });
  }

  initTipForm();
  document.addEventListener("nav", function() {
    var form = document.getElementById("tip-form");
    if (form) form.dataset.tipInit = "";
    initTipForm();
  });
})();
`

export default (() => TipForm) satisfies QuartzComponentConstructor
