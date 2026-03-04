(function () {
  "use strict";

  var THEME_KEY = "theme";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme override (stored in localStorage)
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "system";
  }

  function setTheme(value) {
    var root = document.documentElement;
    if (value === "system") {
      root.removeAttribute("data-theme");
      localStorage.setItem(THEME_KEY, "system");
    } else {
      root.setAttribute("data-theme", value);
      localStorage.setItem(THEME_KEY, value);
    }
    updateThemeButtons(value);
  }

  function updateThemeButtons(active) {
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      var theme = btn.getAttribute("data-theme");
      btn.setAttribute("aria-pressed", theme === active ? "true" : "false");
    });
  }

  var currentTheme = getTheme();
  if (currentTheme !== "system") {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }
  updateThemeButtons(currentTheme);

  document.querySelectorAll(".theme-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-theme"));
    });
  });

  // Scroll reveal (respect reduced motion)
  var revealEls = document.querySelectorAll(".reveal");
  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add("revealed");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("revealed");
    });
  }

  // Mobile nav toggle
  var nav = document.getElementById("nav");
  var navToggle = document.getElementById("nav-toggle");
  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen);
    });

    // Close menu when a nav link is clicked (mobile)
    var navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Active nav link: stays on current section until you scroll into another nav section (no jumping back to Home)
  var navAnchors = document.querySelectorAll(".nav-links a[href^=\"#\"]");
  var headerOffset = 100;

  function setActiveNav() {
    var bestId = null;
    navAnchors.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var section = id && document.getElementById(id);
      if (!section) return;
      var rect = section.getBoundingClientRect();
      if (rect.top <= headerOffset) bestId = id;
    });
    if (!bestId && navAnchors.length) bestId = navAnchors[0].getAttribute("href").slice(1) || "hero";
    navAnchors.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + bestId);
    });
  }

  window.addEventListener("scroll", function () { requestAnimationFrame(setActiveNav); }, { passive: true });
  setActiveNav();

  // Contact form: try Azure API (MailerSend) first, fall back to EmailJS
  var form = document.getElementById("contact-form");
  var formStatus = document.getElementById("form-status");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: if filled, pretend success (silent for bots)
      var hp = form.querySelector('[name="company"]');
      if (hp && hp.value && hp.value.trim() !== "") {
        if (formStatus) {
          formStatus.textContent = "Message sent. I'll get back to you soon.";
          formStatus.className = "form-status success";
        }
        form.reset();
        return;
      }

      if (formStatus) {
        formStatus.textContent = "Sending…";
        formStatus.className = "form-status";
      }

      var projectTypeEl = form.querySelector('[name="project_type"]');
      var projectType = projectTypeEl ? projectTypeEl.value : "";
      var budgetEl = form.querySelector('[name="budget"]');
      var budget = budgetEl ? budgetEl.value : "";
      var messageText = form.message.value.trim();

      var projectLabels = {
        store_build: "Store build / rebuild",
        theme_work: "Theme customization",
        integration: "Integration / data sync",
        custom_app: "Custom app / tooling",
        other: "Other"
      };
      var budgetLabels = {
        under_2k: "Under $2k",
        "2k_5k": "$2k-$5k",
        "5k_10k": "$5k-$10k",
        "10k_plus": "$10k+"
      };

      if (projectType) {
        messageText = "[Project type: " + (projectLabels[projectType] || projectType) + "]\n\n" + messageText;
      }
      if (budget) {
        messageText = "[Budget: " + (budgetLabels[budget] || budget) + "]\n\n" + messageText;
      }

      var payload = {
        from_name: form.from_name.value.trim(),
        reply_to: form.reply_to.value.trim(),
        message: messageText,
        project_type: projectType ? (projectLabels[projectType] || projectType) : "",
        budget: budget ? (budgetLabels[budget] || budget) : "",
      };

      fetch("/api/sendContact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            if (formStatus) {
              formStatus.textContent = "Message sent. I'll get back to you soon.";
              formStatus.className = "form-status success";
            }
            form.reset();
          } else {
            throw new Error(result.data && result.data.error ? result.data.error : "Send failed");
          }
        })
        .catch(function (err) {
          if (typeof emailjs !== "undefined") {
            var params = {
              from_name: payload.from_name,
              to_name: "Troy Fuhriman",
              reply_to: payload.reply_to,
              message: payload.message,
            };
            if (payload.project_type) params.project_type = payload.project_type;
            if (payload.budget) params.budget = payload.budget;
            emailjs
              .send("service_xzps5ii", "template_nii6el7", params)
              .then(function () {
                if (formStatus) {
                  formStatus.textContent = "Message sent. I'll get back to you soon.";
                  formStatus.className = "form-status success";
                }
                form.reset();
              })
              .catch(function (emailErr) {
                if (formStatus) {
                  formStatus.textContent = "Something went wrong. Please try again or reach out via LinkedIn.";
                  formStatus.className = "form-status error";
                }
                console.error("EmailJS error:", emailErr);
              });
          } else {
            if (formStatus) {
              formStatus.textContent = "Something went wrong. Please try again or reach out via LinkedIn.";
              formStatus.className = "form-status error";
            }
            console.error("API error:", err);
          }
        });
    });
  }
})();
