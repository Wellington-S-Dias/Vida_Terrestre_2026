(() => {
  const storageKey = "vidaTerrestreUsuario";
  const dialog = document.getElementById("profile-dialog");
  const form = document.getElementById("profile-form");
  const openButton = document.getElementById("edit-profile-button");
  const nameHeading = document.getElementById("account-name");
  const bioText = document.getElementById("account-bio");
  const profileLoading = document.getElementById("account-profile-loading");
  const profileInfo = profileLoading?.closest(".account-info");
  const photoImage = document.getElementById("account-photo");
  const bannerImage = document.getElementById("account-banner-image");
  const photoPreview = document.getElementById("photo-preview");
  const bannerPreview = document.getElementById("banner-preview");
  const photoFile = document.getElementById("photo-file");
  const bannerFile = document.getElementById("banner-file");
  const photoUrl = document.getElementById("photo-url");
  const bannerUrl = document.getElementById("banner-url");
  const message = document.getElementById("profile-form-message");
  const cropEditor = document.getElementById("photo-crop-editor");
  const cropCanvas = document.getElementById("photo-crop-canvas");
  const cropZoom = document.getElementById("photo-crop-zoom");

  if (
    !dialog ||
    !form ||
    !openButton ||
    !nameHeading ||
    !bioText ||
    !photoImage ||
    !bannerImage
  )
    return;

  const defaults = {
    photo: photoImage.getAttribute("src"),
    banner: bannerImage.getAttribute("src"),
    bio: "Conte um pouco sobre você e sua conexão com a natureza.",
  };
  let profile = {
    name: nameHeading.textContent.trim(),
    bio: "",
    photo: "",
    banner: "",
  };
  let draftPhoto = "";
  let draftBanner = "";
  let cropImage = null;
  let cropPosition = { x: 0.5, y: 0.5 };
  let cropPointer = null;

  function renderCrop() {
    if (!cropImage || !cropCanvas) return;
    const context = cropCanvas.getContext("2d");
    const size = cropCanvas.width;
    const zoom = Number(cropZoom.value);
    const scale =
      Math.max(size / cropImage.naturalWidth, size / cropImage.naturalHeight) *
      zoom;
    const width = cropImage.naturalWidth * scale;
    const height = cropImage.naturalHeight * scale;
    const left = size / 2 - width * cropPosition.x;
    const top = size / 2 - height * cropPosition.y;
    context.clearRect(0, 0, size, size);
    context.drawImage(cropImage, left, top, width, height);
  }

  function startCrop(source) {
    if (!cropEditor || !cropCanvas || !cropZoom) return;
    const image = new Image();
    image.onload = () => {
      cropImage = image;
      cropPosition = { x: 0.5, y: 0.5 };
      cropZoom.value = "1";
      cropEditor.hidden = false;
      renderCrop();
    };
    image.onerror = () =>
      showMessage("Não foi possível preparar a imagem para o enquadramento.");
    image.src = source;
  }

  function resetCrop() {
    cropImage = null;
    if (cropEditor) cropEditor.hidden = true;
  }

  function croppedPhoto() {
    if (!cropImage || !cropCanvas || cropEditor.hidden) return draftPhoto;
    const output = document.createElement("canvas");
    output.width = output.height = 640;
    const context = output.getContext("2d");
    const zoom = Number(cropZoom.value);
    const scale =
      Math.max(
        output.width / cropImage.naturalWidth,
        output.height / cropImage.naturalHeight,
      ) * zoom;
    const width = cropImage.naturalWidth * scale;
    const height = cropImage.naturalHeight * scale;
    context.drawImage(
      cropImage,
      output.width / 2 - width * cropPosition.x,
      output.height / 2 - height * cropPosition.y,
      width,
      height,
    );
    return output.toDataURL("image/webp", 0.86);
  }

  function readStoredProfile() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch {
      return {};
    }
  }

  function persistLocally(nextProfile) {
    const previous = readStoredProfile();
    const stored = { ...previous, ...nextProfile };
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      delete stored.photo;
      delete stored.banner;
      try {
        localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        // A private browsing quota may block local cache; the database is saved.
      }
    }
  }

  function render(nextProfile, persist = true) {
    profile = { ...profile, ...nextProfile };
    nameHeading.textContent = profile.name || "Minha Conta";
    bioText.textContent = profile.bio || defaults.bio;
    photoImage.src = profile.photo || defaults.photo;
    bannerImage.src = profile.banner || defaults.banner;
    photoImage.alt = `Foto de perfil de ${nameHeading.textContent}`;
    if (persist) {
      persistLocally(profile);
      window.dispatchEvent(
        new CustomEvent("account-updated", { detail: profile }),
      );
    }
  }

  function showMessage(text, state = "error") {
    message.textContent = text;
    message.dataset.state = state;
    message.hidden = !text;
  }

  function populateForm() {
    form.elements.name.value = profile.name || "";
    form.elements.bio.value = profile.bio || "";
    photoFile.value = "";
    bannerFile.value = "";
    photoUrl.value =
      profile.photo && !profile.photo.startsWith("data:") ? profile.photo : "";
    bannerUrl.value =
      profile.banner && !profile.banner.startsWith("data:")
        ? profile.banner
        : "";
    draftPhoto = profile.photo || "";
    draftBanner = profile.banner || "";
    photoPreview.src = draftPhoto || defaults.photo;
    bannerPreview.src = draftBanner || defaults.banner;
    resetCrop();
    showMessage("");
  }

  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Selecione um arquivo de imagem válido."));
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error("A imagem deve ter no máximo 8 MB."));
        return;
      }

      const image = new Image();
      const temporaryUrl = URL.createObjectURL(file);
      image.onload = () => {
        const maxDimension = 1800;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(temporaryUrl);
        const webp = canvas.toDataURL("image/webp", 0.84);
        resolve(
          webp.startsWith("data:image/webp,")
            ? webp
            : canvas.toDataURL("image/jpeg", 0.84),
        );
      };
      image.onerror = () => {
        URL.revokeObjectURL(temporaryUrl);
        reject(new Error("Não foi possível abrir essa imagem."));
      };
      image.src = temporaryUrl;
    });
  }

  async function startCropFromUrl(source) {
    showMessage("Preparando a imagem para o enquadramento…", "info");
    try {
      const response = await fetch(source, { mode: "cors" });
      if (!response.ok) throw new Error();
      const imageData = await imageFileToDataUrl(await response.blob());
      if (photoUrl.value.trim() !== source) return;
      draftPhoto = imageData;
      startCrop(imageData);
      showMessage("");
    } catch {
      if (photoUrl.value.trim() === source) {
        showMessage(
          "Esta imagem não permite edição por URL. Baixe o arquivo e envie-o para ajustar o enquadramento.",
        );
      }
    }
  }

  photoFile.addEventListener("change", async () => {
    const file = photoFile.files?.[0];
    if (!file) return;
    photoUrl.value = "";
    try {
      draftPhoto = await imageFileToDataUrl(file);
      photoPreview.src = draftPhoto;
      startCrop(draftPhoto);
      showMessage("");
    } catch (error) {
      photoFile.value = "";
      showMessage(error.message);
    }
  });

  bannerFile.addEventListener("change", async () => {
    const file = bannerFile.files?.[0];
    if (!file) return;
    bannerUrl.value = "";
    try {
      draftBanner = await imageFileToDataUrl(file);
      bannerPreview.src = draftBanner;
      showMessage("");
    } catch (error) {
      bannerFile.value = "";
      showMessage(error.message);
    }
  });

  function previewUrl(input, preview, setDraft) {
    const value = input.value.trim();
    if (!value) return;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:")
        throw new Error("Use um endereço HTTPS para a imagem.");
      setDraft(value);
      preview.src = value;
      showMessage("");
      return true;
    } catch {
      setDraft("");
      showMessage("Informe uma URL HTTPS válida para a imagem.");
      return false;
    }
  }
  photoUrl.addEventListener("change", () => {
    resetCrop();
    if (
      previewUrl(photoUrl, photoPreview, (value) => {
        draftPhoto = value;
      })
    ) {
      startCropFromUrl(photoUrl.value.trim());
    }
  });
  bannerUrl.addEventListener("change", () =>
    previewUrl(bannerUrl, bannerPreview, (value) => {
      draftBanner = value;
    }),
  );
  [photoUrl, bannerUrl].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
  });

  document.getElementById("reset-photo").addEventListener("click", () => {
    draftPhoto = "";
    photoFile.value = "";
    photoUrl.value = "";
    photoPreview.src = defaults.photo;
    resetCrop();
  });
  document.getElementById("reset-banner").addEventListener("click", () => {
    draftBanner = "";
    bannerFile.value = "";
    bannerUrl.value = "";
    bannerPreview.src = defaults.banner;
  });

  cropZoom?.addEventListener("input", renderCrop);
  cropCanvas?.addEventListener("pointerdown", (event) => {
    if (!cropImage) return;
    cropPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    cropCanvas.setPointerCapture(event.pointerId);
  });
  cropCanvas?.addEventListener("pointermove", (event) => {
    if (!cropImage || !cropPointer || event.pointerId !== cropPointer.id)
      return;
    const size = cropCanvas.width;
    const scale =
      Math.max(size / cropImage.naturalWidth, size / cropImage.naturalHeight) *
      Number(cropZoom.value);
    const displayRatio = cropCanvas.getBoundingClientRect().width / size;
    cropPosition.x = Math.min(
      1,
      Math.max(
        0,
        cropPosition.x -
          (event.clientX - cropPointer.x) /
            (cropImage.naturalWidth * scale * displayRatio),
      ),
    );
    cropPosition.y = Math.min(
      1,
      Math.max(
        0,
        cropPosition.y -
          (event.clientY - cropPointer.y) /
            (cropImage.naturalHeight * scale * displayRatio),
      ),
    );
    cropPointer.x = event.clientX;
    cropPointer.y = event.clientY;
    renderCrop();
  });
  cropCanvas?.addEventListener("pointerup", () => {
    cropPointer = null;
  });
  cropCanvas?.addEventListener("pointercancel", () => {
    cropPointer = null;
  });

  openButton.addEventListener("click", () => {
    populateForm();
    dialog.showModal();
  });
  document
    .getElementById("close-profile-dialog")
    .addEventListener("click", () => dialog.close());
  document
    .getElementById("cancel-profile-edit")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = form.querySelector('[type="submit"]');
    const nextProfile = {
      name: form.elements.name.value.trim(),
      bio: form.elements.bio.value.trim(),
      photo:
        cropImage && !cropEditor.hidden
          ? croppedPhoto()
          : photoUrl.value.trim() || draftPhoto,
      banner: bannerUrl.value.trim() || draftBanner,
    };

    if (!nextProfile.name) {
      showMessage("Informe um nome de usuário.");
      form.elements.name.focus();
      return;
    }

    saveButton.disabled = true;
    showMessage("Salvando seu perfil…", "info");
    try {
      const response = await fetch("/usuario/perfil", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.erro || "Entre na sua conta para salvar o perfil.",
        );
      }

      render(result.perfil || nextProfile);
      dialog.close();
    } catch (error) {
      showMessage(error.message || "Não foi possível salvar as alterações.");
    } finally {
      saveButton.disabled = false;
    }
  });

  const storedProfile = readStoredProfile();
  const hasStoredProfile = Boolean(
    storedProfile.name ||
    storedProfile.bio ||
    storedProfile.photo ||
    storedProfile.banner,
  );
  render(storedProfile, Boolean(storedProfile.name));
  if (profileLoading) profileLoading.hidden = hasStoredProfile;
  profileInfo?.setAttribute("aria-busy", String(!hasStoredProfile));
  fetch("/usuario/perfil", { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    })
    .then((data) => {
      if (data?.perfil) render(data.perfil);
    })
    .catch(() => {})
    .finally(() => {
      if (profileLoading) profileLoading.hidden = true;
      profileInfo?.setAttribute("aria-busy", "false");
    });

  window.addEventListener("account-updated", (event) => {
    if (event.detail && event.detail !== profile) {
      profile = { ...profile, ...event.detail };
      nameHeading.textContent = profile.name || "Minha Conta";
      bioText.textContent = profile.bio || defaults.bio;
      photoImage.src = profile.photo || defaults.photo;
      bannerImage.src = profile.banner || defaults.banner;
    }
  });
})();
