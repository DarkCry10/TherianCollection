(() => {
  "use strict";
  const trigger = document.getElementById("dcx-room-trigger");
  const room = document.getElementById("dcx-room");
  const detail = document.getElementById("dcx-detail");
  const grid = document.getElementById("dcx-gallery");
  const count = document.getElementById("dcx-room-count");
  const filters = Array.from(document.querySelectorAll(".dcx-filter"));
  if (!trigger || !room || !detail || !grid) return;

  const IMAGE_DIRECTORY = "assets/dcx/DCX_Public_AVIF_Assets.zip/";
  let entries = [];
  let activeFilter = "all";
  let lastFocus = null;
  let imagesPrepared = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, ch =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])
    );
  }
  function basename(path) {
    return String(path || "").split("/").pop();
  }
  function imageFor(item) {
    return item.image || "";
  }
  function familyLabel(item) {
    return String(item.family || "").replace("fotográfico", "foto").replace("Fotográfico", "Foto");
  }

  function prepareImagePaths() {
    imagesPrepared = entries.length > 0 && entries.every(item => /^assets\/dcx\/DCX_Public_AVIF_Assets\.zip\/.+\.avif$/i.test(item.image || ""));
    return imagesPrepared;
  }

  function cardMarkup(item) {
    const src = imageFor(item);
    const alt = item.id + ", página " + (item.sourcePages || []).join(", ") + ". " + item.description;
    return [
      '<button class="dcx-card" type="button" data-id="' + escapeHtml(item.id) + '" aria-label="Abrir ficha ' + escapeHtml(item.id) + '">',
        '<span class="dcx-card__art" data-ready="false">',
          src ? '<img class="dcx-card__image" src="' + src + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">' : '',
          src ? '' : '<span class="dcx-card__missing"><strong>Imagen no disponible</strong><span>Comprueba la imagen AVIF correspondiente dentro de la carpeta de recursos DCX.</span></span>',
          '<span class="dcx-card__ref">' + escapeHtml(item.id) + '</span>',
        '</span>',
        '<span class="dcx-card__meta">',
          '<span class="dcx-card__family">' + escapeHtml(familyLabel(item)) + '</span>',
          '<strong class="dcx-card__title">' + escapeHtml(item.id) + ' · páginas ' + escapeHtml((item.sourcePages || []).join(", ")) + '</strong>',
          '<span class="dcx-card__description">' + escapeHtml(item.description) + '</span>',
        '</span>',
      '</button>'
    ].join("");
  }

  function render() {
    const shown = entries.filter(item => activeFilter === "all" || (item.tags || []).includes(activeFilter));
    grid.innerHTML = shown.map(cardMarkup).join("");
    if (count) {
      count.textContent = imagesPrepared
        ? shown.length + " / " + entries.length + " referencias · rutas AVIF preparadas"
        : shown.length + " / " + entries.length + " fichas · faltan las rutas de imagen";
    }
    grid.querySelectorAll(".dcx-card").forEach(card => {
      const img = card.querySelector("img");
      const art = card.querySelector(".dcx-card__art");
      if (img) {
        const missing = card.querySelector(".dcx-card__missing");
        img.addEventListener("load", () => {
          art.dataset.ready = "true";
          if (missing) missing.hidden = true;
        }, {once:true});
        img.addEventListener("error", () => {
          img.hidden = true;
          if (missing) missing.hidden = false;
          art.dataset.ready = "false";
        }, {once:true});
      }
      card.addEventListener("click", () => openDetail(card.dataset.id));
    });
  }

  function openDetail(id) {
    const item = entries.find(entry => entry.id === id);
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
      "Documento original · página(s) " + (item.sourcePages || []).join(", ") + " · archivo " + item.file;

    const src = imageFor(item);
    image.hidden = !src;
    image.onload = () => { art.dataset.ready = "true"; missing.hidden = true; };
    image.onerror = () => { image.hidden = true; art.dataset.ready = "false"; missing.hidden = false; };
    if (src) {
      image.src = src;
      missing.hidden = true;
    } else {
      image.removeAttribute("src");
      art.dataset.ready = "false";
      missing.hidden = false;
      missing.textContent = "La ficha está completa; no se encontró el AVIF correspondiente en la carpeta de recursos DCX.";
    }
    lastFocus = document.activeElement;
    detail.showModal();
  }

  trigger.addEventListener("click", async () => {
    try {
      if (!entries.length) {
        const response = await fetch("assets/dcx/gallery-manifest.json", {cache:"no-cache"});
        if (!response.ok) throw new Error("No se pudo cargar el índice de DCX.");
        const data = await response.json();
        entries = data.items || [];
        prepareImagePaths();
        render();
      }
      room.showModal();
    } catch (error) {
      if (count) count.textContent = "No se pudo cargar el archivo DCX";
      console.error(error);
    }
  });

  filters.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filters.forEach(other => other.setAttribute("aria-pressed", String(other === button)));
      render();
    });
  });
  room.addEventListener("click", event => { if (event.target === room) room.close(); });
  detail.addEventListener("click", event => { if (event.target === detail) detail.close(); });
  document.querySelectorAll("[data-dcx-close]").forEach(button => button.addEventListener("click", () => room.close()));
  document.querySelectorAll("[data-dcx-detail-close]").forEach(button => button.addEventListener("click", () => detail.close()));
  detail.addEventListener("close", () => {
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  });
})();