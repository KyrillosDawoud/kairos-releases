// Runs in the head, before the page paints. It marks that scripts run, so the reveals can wait
// for site.js. Without scripts the page shows everything in its final place.
document.documentElement.classList.add("js");
