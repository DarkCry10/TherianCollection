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
  const archiveImageUrls = Object.create(null);
  const archiveObjectUrls = [];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, ch =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])
    );
  }
  function basename(path) {
    return String(path || "").split("/").pop();
  }
  function imageFor(item) {
    if (item.archiveEntry) {
      return archiveImageUrls[basename(item.archiveEntry)] || archiveImageUrls[item.archiveEntry] || "";
    }
    return item.image || "";
  }
  function familyLabel(item) {
    return String(item.family || "").replace("fotográfico", "foto").replace("Fotográfico", "Foto");
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("Este navegador no admite la extracción ZIP requerida.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(stream).arrayBuffer();
  }

  async function loadZipAvifEntries(url) {
    const response = await fetch(url, {cache:"force-cache"});
    if (!response.ok) throw new Error("No se pudo descargar el archivo de imágenes: " + url);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    let eocd = -1;
    const floor = Math.max(0, view.byteLength - 65557);
    for (let i = view.byteLength - 22; i >= floor; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("El ZIP no contiene un directorio central válido: " + url);
    const entryCount = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const decoder = new TextDecoder("utf-8");
    let loaded = 0;

    for (let n = 0; n < entryCount; n++) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error("Entrada inválida en el directorio central de " + url);
      }
      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));

      if (/\.avif$/i.test(name)) {
        if (flags & 1) throw new Error("El archivo AVIF está cifrado: " + name);
        if (view.getUint32(localOffset, true) !== 0x04034b50) {
          throw new Error("Cabecera local inválida para " + name);
        }
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = new Uint8Array(buffer.slice(dataStart, dataStart + compressedSize));
        let bytes;
        if (method === 0) bytes = compressed.buffer;
        else if (method === 8) bytes = await inflateRaw(compressed);
        else throw new Error("Método ZIP no admitido (" + method + ") para " + name);
        if (bytes.byteLength !== uncompressedSize) {
          throw new Error("Tamaño incorrecto al extraer " + name);
        }
        const objectUrl = URL.createObjectURL(new Blob([bytes], {type:"image/avif"}));
        archiveObjectUrls.push(objectUrl);
        archiveImageUrls[basename(name)] = objectUrl;
        archiveImageUrls[name] = objectUrl;
        loaded++;
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return loaded;
  }

  async function loadArchivesForEntries() {
    const archives = [...new Set(entries.map(item => item.archiveUrl).filter(Boolean))];
    const results = await Promise.all(archives.map(async url => {
      try { return {url,loaded:await loadZipAvifEntries(url),error:null}; }
      catch (error) { console.error("DCX archive error:", url, error); return {url,loaded:0,error}; }
    }));
    return results;
  }

  function cardMarkup(item) {
    const src = imageFor(item);
    const alt = item.id + ", página " + (item.sourcePages || []).join(", ") + ". " + item.description;
    return [
      '<button class="dcx-card" type="button" data-id="' + escapeHtml(item.id) + '" aria-label="Abrir ficha ' + escapeHtml(item.id) + '">',
        '<span class="dcx-card__art" data-ready="false">',
          src ? '<img class="dcx-card__image" src="' + src + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async">' : '',
          src ? '' : '<span class="dcx-card__missing"><strong>Imagen no disponible</strong><span>Comprueba el archivo AVIF de origen y su paquete ZIP.</span></span>',
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
      const archived = entries.filter(item => item.archiveEntry && imageFor(item)).length;
      count.textContent = shown.length + " / " + entries.length + " referencias · " + archived + " AVIF de archivo disponibles";
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
      missing.textContent = "La ficha está preparada; no se encontró la imagen dentro del ZIP correspondiente.";
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
        room.showModal();
        if (count) count.textContent = "Cargando paquetes AVIF…";
        await loadArchivesForEntries();
        render();
      } else {
        room.showModal();
      }
    } catch (error) {
      if (count) count.textContent = "No se pudo cargar el archivo DCX";
      console.error(error);
      if (!room.open) room.showModal();
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
    archiveObjectUrls.forEach(url => URL.revokeObjectURL(url));
  });
})();