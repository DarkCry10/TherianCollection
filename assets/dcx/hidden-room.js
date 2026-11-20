(() => {
  "use strict";
  const trigger = document.getElementById("dcx-room-trigger");
  const room = document.getElementById("dcx-room");
  const detail = document.getElementById("dcx-detail");
  const grid = document.getElementById("dcx-gallery");
  const count = document.getElementById("dcx-room-count");
  const filters = Array.from(document.querySelectorAll(".dcx-filter"));
  if (!trigger || !room || !detail || !grid) return;

  let entries = [];
  let activeFilter = "all";
  let lastFocus = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function familyLabel(item) {
    return item.family.replace("fotográfico","foto").replace("Fotográfico","Foto");
  }
  function matches(item) {
    return activeFilter === "all" || (item.tags || []).includes(activeFilter);
  }
  function cardMarkup(item) {
    const alt = item.id + ", página " + item.sourcePages.join(", ") + ". " + item.description;
    return [
      '<button class="dcx-card" type="button" data-id="' + item.id + '" aria-label="Abrir ficha ' + item.id + '">',
        '<span class="dcx-card__art" data-art="' + item.id + '" data-ready="false">',
          '<img class="dcx-card__image" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">',
          '<span class="dcx-card__missing"><strong>Archivo visual pendiente</strong><span>La ficha está indexada; falta incorporar el original de alta resolución al repositorio.</span></span>',
          '<span class="dcx-card__ref">' + item.id + '</span>',
        '</span>',
        '<span class="dcx-card__meta">',
          '<span class="dcx-card__family">' + escapeHtml(familyLabel(item)) + '</span>',
          '<strong class="dcx-card__title">' + item.id + ' · páginas ' + item.sourcePages.join(", ") + '</strong>',
          '<span class="dcx-card__description">' + escapeHtml(item.description) + '</span>',
        '</span>',
      '</button>'
    ].join("");
  }
  function render() {
    const shown = entries.filter(matches);
    grid.innerHTML = shown.map(cardMarkup).join("");
    if (count) count.textContent = shown.length + " / " + entries.length + " referencias";
    grid.querySelectorAll(".dcx-card").forEach(function(card) {
      const img = card.querySelector("img");
      const art = card.querySelector(".dcx-card__art");
      const missing = card.querySelector(".dcx-card__missing");
      img.addEventListener("load", function() {
        art.dataset.ready = "true";
        missing.hidden = true;
      }, {once:true});
      img.addEventListener("error", function() {
        art.dataset.ready = "false";
        img.hidden = true;
      }, {once:true});
      card.addEventListener("click", function() {
        openDetail(card.dataset.id);
      });
    });
  }
  function openDetail(id) {
    const item = entries.find(function(entry) { return entry.id === id; });
    if (!item) return;
    const image = document.getElementById("dcx-detail-image");
    const art = document.getElementById("dcx-detail-art");
    const missing = document.getElementById("dcx-detail-missing");
    document.getElementById("dcx-detail-ref").textContent = item.id;
    document.getElementById("dcx-detail-title").textContent = item.family;
    document.getElementById("dcx-detail-description").textContent = item.description;
    document.getElementById("dcx-detail-use").textContent = item.designUse;
    document.getElementById("dcx-detail-fact").textContent = item.archiveFact;
    document.getElementById("dcx-detail-source").textContent =
      "Documento original · página(s) " + item.sourcePages.join(", ") + " · archivo " + item.file;
    image.hidden = false;
    missing.hidden = false;
    missing.textContent = "La ficha está lista. El archivo de imagen de alta resolución aún no se ha incorporado al repositorio de la web.";
    art.dataset.ready = "false";
    image.onload = function() { art.dataset.ready = "true"; missing.hidden = true; };
    image.onerror = function() { image.hidden = true; art.dataset.ready = "false"; missing.hidden = false; };
    image.src = item.image;
    lastFocus = document.activeElement;
    detail.showModal();
  }

  trigger.addEventListener("click", async function() {
    try {
      if (!entries.length) {
        const response = await fetch("assets/dcx/gallery-manifest.json", {cache:"no-cache"});
        if (!response.ok) throw new Error("No se pudo cargar el índice de DCX.");
        const data = await response.json();
        entries = data.items || [];
        render();
      }
      room.showModal();
    } catch (error) {
      if (count) count.textContent = "No se pudo cargar el archivo DCX";
      console.error(error);
    }
  });

  filters.forEach(function(button) {
    button.addEventListener("click", function() {
      activeFilter = button.dataset.filter || "all";
      filters.forEach(function(other) {
        other.setAttribute("aria-pressed", String(other === button));
      });
      render();
    });
  });
  room.addEventListener("click", function(event) {
    if (event.target === room) room.close();
  });
  detail.addEventListener("click", function(event) {
    if (event.target === detail) detail.close();
  });
  document.querySelectorAll("[data-dcx-close]").forEach(function(button) {
    button.addEventListener("click", function() { room.close(); });
  });
  document.querySelectorAll("[data-dcx-detail-close]").forEach(function(button) {
    button.addEventListener("click", function() { detail.close(); });
  });
  detail.addEventListener("close", function() {
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  });
})();