(() => {
  "use strict";
  const trigger = document.getElementById("dcx-room-trigger");
  const room = document.getElementById("dcx-room");
  const detail = document.getElementById("dcx-detail");
  const grid = document.getElementById("dcx-gallery");
  const count = document.getElementById("dcx-room-count");
  const filters = Array.from(document.querySelectorAll(".dcx-filter"));
  if (!trigger || !room || !detail || !grid) return;

  const ARCHIVE_URL = "assets/dcx/DCX_Public_AVIF_Assets.zip";
  let entries = [];
  let activeFilter = "all";
  let lastFocus = null;
  let imageUrls = Object.create(null);
  let archiveLoaded = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, ch =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])
    );
  }
  function basename(path) {
    return String(path || "").split("/").pop();
  }
  function imageFor(item) {
    return imageUrls[basename(item.image)] || "";
  }
  function familyLabel(item) {
    return String(item.family || "").replace("fotográfico", "foto").replace("Fotográfico", "Foto");
  }

  async function loadStoredZip() {
    const response = await fetch(ARCHIVE_URL, {cache:"no-cache"});
    if (!response.ok) throw new Error("No está disponible el paquete AVIF.");
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    const names = new TextDecoder("utf-8");
    let offset = 0;
    let loaded = 0;

    // The archive uses ZIP_STORED (method 0), so each AVIF can be read
    // directly from its local-file entry without a decompression library.
    while (offset + 30 <= view.byteLength) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x04034b50) break;
      const method = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const fileName = names.decode(new Uint8Array(buffer, nameStart, nameLength));
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > view.byteLength) throw new Error("El paquete AVIF está incompleto.");

      if (method === 0 && /\.avif$/i.test(fileName)) {
        const key = basename(fileName);
        const blob = new Blob([buffer.slice(dataStart, dataEnd)], {type:"image/avif"});
        imageUrls[key] = URL.createObjectURL(blob);
        loaded += 1;
      } else if (method !== 0 && /\.avif$/i.test(fileName)) {
        throw new Error("El paquete debe usar entradas ZIP sin compresión.");
      }
      offset = dataEnd;
    }
    if (!loaded) throw new Error("No se encontraron imágenes AVIF en el paquete.");
    archiveLoaded = true;
    return loaded;
  }

  function cardMarkup(item) {
    const src = imageFor(item);
    const alt = item.id + ", página " + (item.sourcePages || []).join(", ") + ". " + item.description;
    return [
      '<button class="dcx-card" type="button" data-id="' + escapeHtml(item.id) + '" aria-label="Abrir ficha ' + escapeHtml(item.id) + '">',
        '<span class="dcx-card__art" data-ready="false">',
          src ? '<img class="dcx-card__image" src="' + src + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">' : '',
          src ? '' : '<span class="dcx-card__missing"><strong>Imagen no disponible</strong><span>Incorpora el paquete DCX_Public_AVIF_Assets.zip en assets/dcx/ para activar esta referencia.</span></span>',
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
      count.textContent = archiveLoaded
        ? shown.length + " / " + entries.length + " referencias · " + Object.keys(imageUrls).length + " imágenes cargadas"
        : shown.length + " / " + entries.length + " fichas · falta el paquete de imágenes";
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
      missing.textContent = "La ficha está completa; incorpora DCX_Public_AVIF_Assets.zip en assets/dcx/ para mostrar el original AVIF.";
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
        try {
          await loadStoredZip();
        } catch (assetError) {
          archiveLoaded = false;
          console.warn("DCX: índice cargado; paquete de imágenes pendiente.", assetError);
        }
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
  window.addEventListener("beforeunload", () => {
    Object.values(imageUrls).forEach(url => URL.revokeObjectURL(url));
  });
})();