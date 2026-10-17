// The Kairos website's motion. Vanilla, no dependencies. Every part starts from markup that
// already reads correctly, so a reader without scripts, or with reduced motion, misses nothing.

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls back once, the first time the element is a quarter on screen. */
function onSeen(element, callback, threshold = 0.25) {
  if (!element) return;
  if (still || !("IntersectionObserver" in window)) {
    callback(element);
    return;
  }
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        seen.disconnect();
        callback(entry.target);
      }
    },
    { threshold },
  );
  seen.observe(element);
}

/* The nav turns to glass once the page runs under it. */
function nav() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("is-stuck", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* Reveals: each block rises once it is on screen. Children of a stagger rise one by one. */
function reveals() {
  for (const group of document.querySelectorAll("[data-stagger]")) {
    [...group.querySelectorAll(":scope > [data-reveal]")].forEach((child, index) => {
      child.style.setProperty("--i", String(index));
    });
  }
  for (const element of document.querySelectorAll("[data-reveal], [data-seen]")) {
    onSeen(element, (target) => target.classList.add("is-in"), 0.15);
  }
}

/* The hero's words rise one after another. */
function words() {
  document.querySelectorAll(".hero-title .word").forEach((word, index) => {
    word.style.setProperty("--w", String(index));
  });
}

/* The live line: one thing that needs you at a time. */
function liveLine() {
  const lines = [...document.querySelectorAll(".live-text > span")];
  if (lines.length < 2 || still) return;
  let current = 0;
  setInterval(() => {
    const next = (current + 1) % lines.length;
    lines[current].classList.remove("is-on");
    lines[current].classList.add("is-off");
    lines[next].classList.remove("is-off");
    lines[next].classList.add("is-on");
    const leaving = lines[current];
    setTimeout(() => leaving.classList.remove("is-off"), 700);
    current = next;
  }, 3400);
}

/* The Dynamic Island: closed, then the Live Activity opens, folds to a timer and opens again. */
function islands() {
  for (const island of document.querySelectorAll(".island[data-loop]")) {
    if (still) continue;
    island.dataset.state = "idle";
    const run = async () => {
      await wait(1400);
      for (;;) {
        island.dataset.state = "open";
        await wait(4600);
        island.dataset.state = "compact";
        await wait(3800);
      }
    };
    onSeen(island, () => void run(), 0.4);
  }
}

/* Numbers count up to the figure the markup already holds. */
function counters() {
  const format = (value, decimals) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  for (const element of document.querySelectorAll("[data-count]")) {
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals ?? 0);
    const prefix = element.dataset.prefix ?? "";
    if (still || Number.isNaN(target)) continue;
    element.textContent = prefix + format(0, decimals);
    onSeen(element, () => {
      const start = performance.now();
      const duration = Number(element.dataset.duration ?? 1600);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - 2 ** (-10 * t);
        element.textContent = prefix + format(t === 1 ? target : target * eased, decimals);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}

/* Needs you: each action takes its Moment away and the count steps down. */
function moments() {
  const panel = document.querySelector(".moments-panel");
  if (!panel) return;
  const badge = panel.querySelector(".badge");
  const rows = [...panel.querySelectorAll(".moment")];
  const left = () => rows.filter((row) => !row.hidden).length;
  const setCount = () => {
    if (!badge) return;
    badge.textContent = String(left());
    if (!still)
      badge.animate([{ transform: "scale(1.25)" }, { transform: "none" }], {
        duration: 420,
        easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      });
  };
  for (const row of rows) {
    row.querySelector(".act")?.addEventListener("click", () => {
      const before = new Map(rows.map((other) => [other, other.getBoundingClientRect().top]));
      row.classList.add("is-done");
      setTimeout(
        () => {
          row.hidden = true;
          // The Moments below slide up into the space, from where they were.
          for (const other of rows) {
            if (other.hidden || still) continue;
            const delta = (before.get(other) ?? 0) - other.getBoundingClientRect().top;
            if (delta) {
              other.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
                duration: 480,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              });
            }
          }
          setCount();
          if (left() === 0) {
            panel.classList.add("is-clear");
            panel.querySelector(".calm .act")?.focus();
          }
        },
        still ? 0 : 320,
      );
    });
  }
  panel.querySelector(".calm .act")?.addEventListener("click", () => {
    panel.classList.remove("is-clear");
    for (const row of rows) {
      row.hidden = false;
      row.classList.remove("is-done");
    }
    setCount();
    rows[0]?.querySelector(".act")?.focus();
  });
}

/* Types text into an element one character at a time. */
async function type(element, text, speed = 42) {
  element.textContent = "";
  for (const character of text) {
    element.textContent += character;
    await wait(speed + (character === " " ? 30 : 0));
  }
}

/* Calendar: the week lands block by block, then one line becomes Thursday's study block. */
function week() {
  const grid = document.querySelector(".week");
  if (!grid) return;
  [...grid.querySelectorAll(".block:not(.new)")].forEach((block, index) => {
    block.style.setProperty("--i", String(index));
  });
  const quick = document.querySelector(".quick");
  const text = quick?.querySelector(".quick-text");
  const added = grid.querySelector(".block.new");
  onSeen(grid, async () => {
    grid.classList.add("is-in");
    if (!quick || !text || !added) return;
    if (still) {
      quick.classList.add("is-done");
      added.classList.add("is-added");
      return;
    }
    const line = text.textContent ?? "";
    text.textContent = "";
    await wait(1600);
    await type(text, line, 55);
    await wait(500);
    quick.classList.add("is-done");
    added.classList.add("is-added");
  });
}

/* Kairos: the question types itself, Kairos thinks, the answer streams and a proposal waits. */
function chat() {
  const panel = document.querySelector(".chat");
  if (!panel) return;
  const bubble = panel.querySelector(".bubble");
  const thought = panel.querySelector(".thought");
  const answer = panel.querySelector(".answer");
  const proposal = panel.querySelector(".proposal");
  if (!bubble || !answer || !proposal) return;
  const finish = () => {
    thought?.classList.add("is-shown");
    proposal.classList.add("is-shown");
  };
  for (const button of proposal.querySelectorAll(".act")) {
    button.addEventListener("click", () => {
      const applied = button.classList.contains("primary");
      const status = proposal.querySelector(".applied span");
      if (status) status.textContent = applied ? "Added to Thursday" : "Skipped";
      proposal.classList.add("is-applied");
    });
  }
  if (still) {
    finish();
    return;
  }
  const question = bubble.textContent ?? "";
  const html = answer.innerHTML;
  const words = answer.textContent?.split(" ") ?? [];
  bubble.textContent = "";
  answer.textContent = "";
  onSeen(panel, async () => {
    await wait(500);
    await type(bubble, question, 38);
    await wait(500);
    thought?.classList.add("is-shown");
    await wait(900);
    // The answer streams a word at a time, then settles into its marked up form.
    for (const word of words) {
      answer.textContent += (answer.textContent ? " " : "") + word;
      await wait(55);
    }
    answer.innerHTML = html;
    await wait(300);
    proposal.classList.add("is-shown");
  });
}

/* Every screen: tabs that advance on their own, pause under the pointer and crossfade. */
function showcase() {
  const root = document.querySelector(".showcase");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panes = [...root.querySelectorAll('[role="tabpanel"]')];
  let current = 0;
  let timer = 0;
  const show = (index, focus = false) => {
    current = index;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      // Restart the progress bar on the tab that is now current.
      tab.classList.remove("is-running");
      if (on && !still && !root.matches(":hover")) {
        void tab.offsetWidth;
        tab.classList.add("is-running");
      }
    });
    panes.forEach((pane, i) => {
      pane.classList.toggle("is-on", i === index);
      pane.hidden = false;
      pane.setAttribute("aria-hidden", String(i !== index));
    });
    if (focus) tabs[index].focus();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (still) return;
    timer = setTimeout(() => {
      if (!root.matches(":hover") && !root.contains(document.activeElement)) {
        show((current + 1) % tabs.length);
      }
      schedule();
    }, 6000);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      show(index);
      schedule();
    });
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      show((index + step + tabs.length) % tabs.length, true);
      schedule();
    });
  });
  root.addEventListener("mouseenter", () => tabs[current].classList.remove("is-running"));
  root.addEventListener("mouseleave", () => show(current));
  show(0);
  onSeen(root, schedule, 0.3);
}

/* The primary buttons lean toward the pointer and spring back when it leaves. */
function magnetic() {
  if (still || !finePointer) return;
  for (const button of document.querySelectorAll("[data-magnetic]")) {
    button.addEventListener("pointermove", (event) => {
      const box = button.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      button.style.setProperty("--mx", `${(x * 0.18).toFixed(1)}px`);
      button.style.setProperty("--my", `${(y * 0.28).toFixed(1)}px`);
    });
    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--mx", "0px");
      button.style.setProperty("--my", "0px");
    });
  }
}

nav();
words();
reveals();
liveLine();
islands();
counters();
moments();
week();
chat();
showcase();
magnetic();
