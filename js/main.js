/* Restaurant Kampot · concept site interactions */
(function () {
  "use strict";

  const K = window.KAMPOT;
  if (!K) return;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  document.documentElement.classList.add("js");

  const state = {
    lang: window.__KAMPOT_LANG__ || "fr",
    service: "souper",
  };

  const cache = {
    lang: "kampot-lang",
  };

  function copy(key) {
    const entry = K.copy[key];
    if (!entry) return "";
    return entry[state.lang] != null ? entry[state.lang] : entry.fr;
  }

  function storeLanguage(lang) {
    try {
      localStorage.setItem(cache.lang, lang);
    } catch (e) {}
  }

  function formatPrice(value, from) {
    if (state.lang === "fr") return (from ? "dès " : "") + value + " $";
    return (from ? "from $" : "$") + value;
  }

  function formatTime(minutes, lang) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (lang === "fr") {
      return mins === 0 ? hours + " h" : hours + " h " + String(mins).padStart(2, "0");
    }
    const suffix = hours >= 12 ? "pm" : "am";
    let hour = hours % 12;
    if (hour === 0) hour = 12;
    return mins === 0 ? hour + " " + suffix : hour + ":" + String(mins).padStart(2, "0") + " " + suffix;
  }

  function formatServices(services) {
    const joiner = state.lang === "fr" ? " à " : " to ";
    return services
      .map(([start, end]) => formatTime(start, state.lang) + joiner + formatTime(end, state.lang))
      .join(" / ");
  }

  function torontoNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const pick = (type) => (parts.find((part) => part.type === type) || {}).value;
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = parseInt(pick("hour"), 10) % 24;
    const minute = parseInt(pick("minute"), 10);
    return { day: dayMap[pick("weekday")], minutes: hour * 60 + minute };
  }

  function dayRecord(day) {
    return K.hours.find((row) => row.day === day);
  }

  function statusText() {
    const now = torontoNow();
    const today = dayRecord(now.day);
    if (today) {
      const openService = today.services.find(([start, end]) => now.minutes >= start && now.minutes < end);
      if (openService) {
        return {
          open: true,
          fr: "Ouvert maintenant, jusqu'à " + formatTime(openService[1], "fr"),
          en: "Open now, until " + formatTime(openService[1], "en"),
        };
      }
      const laterToday = today.services.find(([start]) => now.minutes < start);
      if (laterToday) {
        return {
          open: false,
          fr: "Fermé · ouvre à " + formatTime(laterToday[0], "fr"),
          en: "Closed · opens at " + formatTime(laterToday[0], "en"),
        };
      }
    }
    for (let offset = 1; offset <= 8; offset += 1) {
      const day = (now.day + offset) % 7;
      const record = dayRecord(day);
      if (record && record.services.length) {
        const first = record.services[0];
        return {
          open: false,
          fr: "Fermé · ouvre " + record.fr.toLowerCase() + " à " + formatTime(first[0], "fr"),
          en: "Closed · opens " + record.en + " at " + formatTime(first[0], "en"),
        };
      }
    }
    return { open: false, fr: "Fermé", en: "Closed" };
  }

  function paintStatus() {
    const status = statusText();
    const message = status[state.lang];
    ["utilityStatus", "heroStatus", "visitStatus"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = message;
    });
    ["utilityStatusWrap", "heroStatusWrap", "visitStatusWrap"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.classList.toggle("is-open", status.open);
    });
  }

  function paintTitleAndMeta() {
    document.title = copy("meta.title");
    const description = $('meta[name="description"]');
    if (description) description.setAttribute("content", copy("meta.description"));
    const ogTitle = $('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", copy("meta.title"));
    const ogDescription = $('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", copy("meta.description"));
  }

  function paintStaticCopy() {
    $$("[data-i18n]").forEach((element) => {
      const value = copy(element.dataset.i18n);
      if (value !== "") element.textContent = value;
    });
    $$("[data-i18n-aria]").forEach((element) => {
      const value = copy(element.dataset.i18nAria);
      if (value) element.setAttribute("aria-label", value);
    });
    $$("[data-i18n-alt]").forEach((element) => {
      const value = copy(element.dataset.i18nAlt);
      if (value) element.setAttribute("alt", value);
    });
    $$("[data-i18n-title]").forEach((element) => {
      const value = copy(element.dataset.i18nTitle);
      if (value) element.setAttribute("title", value);
    });
  }

  function paintLanguageButtons() {
    $$("[data-lang]").forEach((button) => {
      const isActive = button.dataset.lang === state.lang;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    $$(".lang").forEach((group) => {
      group.setAttribute("aria-label", copy("lang.label"));
    });
  }

  function paintLegend() {
    $$("[data-tag]").forEach((element) => {
      const abbreviation = tagAbbreviation[element.dataset.tag];
      if (abbreviation) element.textContent = abbreviation[state.lang];
    });
  }

  function paintHours() {
    const body = $("#hoursBody");
    if (!body) return;
    const today = torontoNow().day;
    body.innerHTML = K.hours
      .map((row) => {
        const label = row[state.lang];
        const services = formatServices(row.services);
        const current = row.day === today ? ' class="is-today"' : "";
        return `<tr${current}><th scope="row">${esc(label)}</th><td>${esc(services)}</td></tr>`;
      })
      .join("");
  }

  const tagAbbreviation = {
    veg: { fr: "VÉG", en: "VEG" },
    gf: { fr: "SG", en: "GF" },
    spicy: { fr: "É", en: "SP" },
  };

  const tagLabelKey = {
    veg: "menu.veg",
    gf: "menu.gf",
    spicy: "menu.spicy",
  };

  function paintMenu(service, animate) {
    const menu = K.menu[service];
    const list = $("#menuList");
    if (!menu || !list) return;

    const paintList = () => {
      list.innerHTML = menu.categories
        .map((category) => {
          const dishes = category.items
            .map((item) => {
              const tags = (item.tags || [])
                .map((tag) => {
                  const abbreviation = tagAbbreviation[tag] || tag;
                  const label = copy(tagLabelKey[tag] || "");
                  return `<span class="tag${tag === "spicy" ? " tag--spicy" : ""}" aria-label="${esc(
                    label
                  )}">${esc(abbreviation[state.lang] || abbreviation.fr || abbreviation)}</span>`;
                })
                .join("");
              const variants = item.variants
                ? `<p class="dish__variants">${esc(item.variants[state.lang])}</p>`
                : "";
              return `<div class="dish">
                <div class="dish__head">
                  <h4 class="dish__name">${esc(item.name[state.lang])}</h4>
                  <span class="dish__price">${esc(formatPrice(item.price, item.from))}</span>
                </div>
                <p class="dish__desc">${esc(item.desc[state.lang])}</p>
                ${variants}
                ${tags ? `<div class="dish__tags">${tags}</div>` : ""}
              </div>`;
            })
            .join("");
          return `<section class="menu-category">
            <h3 class="menu-category__title">${esc(category.label[state.lang])}</h3>
            ${dishes}
          </section>`;
        })
        .join("");
    };

    if (animate) {
      list.classList.add("is-changing");
      window.setTimeout(() => {
        paintList();
        list.classList.remove("is-changing");
      }, 130);
    } else {
      paintList();
    }

    const image = $("#menuImage");
    const caption = $("#menuCaption");
    if (image) {
      const nextSrc = menu.image;
      const nextAlt = copy(menu.altKey);
      if (image.getAttribute("src") !== nextSrc) {
        image.classList.add("is-fading");
        window.setTimeout(() => {
          image.src = nextSrc;
          image.alt = nextAlt;
          image.classList.remove("is-fading");
        }, 130);
      } else {
        image.alt = nextAlt;
      }
    }
    if (caption) caption.textContent = menu.caption[state.lang];
    const serviceNote = $("#menuServiceNote");
    if (serviceNote) serviceNote.textContent = menu.note[state.lang];

    $$(".menu-tab").forEach((tab) => {
      const active = tab.dataset.service === service;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.setAttribute("tabindex", active ? "0" : "-1");
      const label = K.menu[tab.dataset.service] && K.menu[tab.dataset.service].label[state.lang];
      if (label) tab.textContent = label;
      const note = K.menu[tab.dataset.service] && K.menu[tab.dataset.service].note[state.lang];
      if (note) tab.setAttribute("title", note);
    });

    const panel = $("#menuPanel");
    if (panel) panel.setAttribute("aria-labelledby", "tab-" + service);
  }

  function paintBar() {
    const list = $("#barList");
    if (!list) return;
    const items = K.menu.bar.categories[0].items;
    list.innerHTML = items
      .map(
        (item) => `<div class="bar-item">
          <h3 class="bar-item__name">${esc(item.name[state.lang])}</h3>
          <span class="bar-item__price">${esc(formatPrice(item.price, false))}</span>
          <p class="bar-item__desc">${esc(item.desc[state.lang])}</p>
        </div>`
      )
      .join("");
  }

  function applyLanguage(lang, options) {
    if (lang !== "fr" && lang !== "en") return;
    state.lang = lang;
    document.documentElement.lang = lang;
    storeLanguage(lang);
    paintStaticCopy();
    paintLanguageButtons();
    paintLegend();
    paintTitleAndMeta();
    paintHours();
    paintStatus();
    paintMenu(state.service, false);
    paintBar();
    if (options && options.focusLangButton) {
      const activeButton = $('.lang__btn[data-lang="' + lang + '"]');
      if (activeButton) activeButton.focus();
    }
  }

  function setLanguage(lang) {
    if (lang === state.lang) return;
    applyLanguage(lang);
  }

  function activateService(service, options) {
    if (!K.menu[service] || service === state.service) return;
    state.service = service;
    paintMenu(service, !reduceMotion);
    if (options && options.focusTab) {
      const tab = $("#tab-" + service);
      if (tab) tab.focus();
    }
  }

  function openMobileNav() {
    const dialog = $("#mobileNav");
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("is-locked");
    const toggle = $("#menuToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    const close = $(".closebtn", dialog);
    if (close) window.setTimeout(() => close.focus(), 50);
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function syncBodyLock() {
    if ($$("dialog[open]").length) {
      document.body.classList.add("is-locked");
    } else {
      document.body.classList.remove("is-locked");
      const toggle = $("#menuToggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const langButton = event.target.closest(".lang__btn[data-lang]");
      if (langButton) {
        setLanguage(langButton.dataset.lang);
        return;
      }

      const serviceTab = event.target.closest(".menu-tab");
      if (serviceTab) {
        activateService(serviceTab.dataset.service);
        return;
      }

      if (event.target.closest("#menuToggle")) {
        openMobileNav();
        return;
      }

      const closeButton = event.target.closest("[data-close]");
      if (closeButton) {
        closeDialog(closeButton.closest("dialog"));
        return;
      }
    });

    $$(".mobile-nav__links a").forEach((link) => {
      link.addEventListener("click", () => {
        const dialog = $("#mobileNav");
        if (dialog && dialog.open) dialog.close();
      });
    });

    const mobileNav = $("#mobileNav");
    if (mobileNav) {
      mobileNav.addEventListener("close", syncBodyLock);
      mobileNav.addEventListener("cancel", () => window.setTimeout(syncBodyLock, 0));
    }

    const tabs = $$(".menu-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("keydown", (event) => {
        const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const current = tabs.indexOf(tab);
        let next = current;
        if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        const target = tabs[next];
        if (target) {
          activateService(target.dataset.service, { focusTab: true });
        }
      });
    });

    window.addEventListener(
      "scroll",
      () => {
        const header = $("#siteHeader");
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 60);
      },
      { passive: true }
    );
  }

  function setupReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    window.setTimeout(() => {
      items.forEach((item) => item.classList.add("is-visible"));
    }, 1500);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((item) => observer.observe(item));
  }

  function init() {
    bindEvents();
    const header = $("#siteHeader");
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 60);
    setupReveal();
    paintHours();
    paintStatus();
    paintBar();
    paintMenu(state.service, false);
    applyLanguage(state.lang);
    window.setInterval(paintStatus, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
