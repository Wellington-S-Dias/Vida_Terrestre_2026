(() => {
  const dialog = document.getElementById("animal-quiz-dialog");
  const button = document.getElementById("start-animal-quiz");
  const form = document.getElementById("animal-quiz-form");
  const questionsNode = document.getElementById("animal-quiz-questions");
  const message = document.getElementById("animal-quiz-message");
  const title = document.getElementById("animal-quiz-title");
  const submitButton = form?.querySelector('[type="submit"]');
  const speciesInfo = document.getElementById("animal-quiz-species-info");
  const speciesImage = document.getElementById("animal-quiz-image");
  const reviewPanel = document.getElementById("animal-quiz-review");
  const reviewIcon = document.getElementById("animal-quiz-review-icon");
  const reviewTitle = document.getElementById("animal-quiz-review-title");
  const reviewMessage = document.getElementById("animal-quiz-review-message");
  const reviewList = document.getElementById("animal-quiz-review-list");
  const retryButton = document.getElementById("retry-animal-quiz");
  const closeReviewButton = document.getElementById("close-animal-quiz-review");
  const savedCardPanel = document.getElementById("animal-quiz-card-saved");
  const savedCardImage = document.getElementById("animal-quiz-card-image");
  const savedCardTitle = document.getElementById("animal-quiz-card-title");
  const savedCardMessage = document.getElementById("animal-quiz-card-message");
  const cardToast = document.getElementById("species-card-toast");
  const cardToastMessage = document.getElementById(
    "species-card-toast-message",
  );
  let cardToastTimer = 0;
  let animal = null;
  let quizReady = false;

  if (!dialog || !button || !form) return;

  window.addEventListener("animal-opened", (event) => {
    animal = event.detail;
    const id = Number(animal?.id);
    button.hidden = !Number.isInteger(id) || !(id % 2 === 0 || id % 5 === 0);
  });

  function hideCardToast() {
    window.clearTimeout(cardToastTimer);
    cardToast.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!cardToast.classList.contains("is-visible")) cardToast.hidden = true;
    }, 260);
  }

  function showCardToast(speciesName) {
    window.clearTimeout(cardToastTimer);
    cardToastMessage.textContent = `A cartinha de ${speciesName} foi adicionada à sua conta.`;
    cardToast.hidden = false;
    cardToast.classList.remove("is-visible");
    window.requestAnimationFrame(() => cardToast.classList.add("is-visible"));
    cardToastTimer = window.setTimeout(hideCardToast, 5200);
  }

  function renderQuestions(questions) {
    questionsNode.replaceChildren();
    questions.forEach((question, questionIndex) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "animal-quiz-question";

      const legend = document.createElement("legend");
      const topic = document.createElement("span");
      topic.className = "animal-quiz-question-topic";
      topic.textContent = question.topic || "Conhecimento da espécie";
      const prompt = document.createElement("span");
      prompt.className = "animal-quiz-question-prompt";
      prompt.textContent = question.question;
      legend.append(topic, prompt);
      fieldset.append(legend);

      const choices = document.createElement("div");
      choices.className = "animal-quiz-choices";
      question.options.forEach((option, optionIndex) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "q" + questionIndex;
        input.value = optionIndex;
        input.required = true;

        const marker = document.createElement("span");
        marker.className = "animal-quiz-choice-marker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = String.fromCharCode(65 + optionIndex);

        const text = document.createElement("span");
        text.className = "animal-quiz-choice-text";
        text.textContent = option;
        label.append(input, marker, text);
        choices.append(label);
      });
      fieldset.append(choices);
      questionsNode.append(fieldset);
    });
  }

  function renderReview(items, correct, resultMessage) {
    reviewList.replaceChildren();
    reviewTitle.textContent = correct
      ? "Revisão concluída"
      : "Confira os detalhes";
    reviewMessage.textContent = resultMessage;
    reviewIcon.textContent = correct ? "✓" : "i";
    reviewIcon.classList.toggle("has-errors", !correct);

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className =
        "animal-quiz-review-item " +
        (item.correct ? "is-correct" : "needs-review");

      const heading = document.createElement("div");
      heading.className = "animal-quiz-review-item-heading";
      const topic = document.createElement("span");
      topic.className = "animal-quiz-review-topic";
      topic.textContent = item.topic || "Espécie";
      const status = document.createElement("span");
      status.className = "animal-quiz-review-status";
      status.textContent = item.correct
        ? "Resposta correta"
        : "Revise esta resposta";
      heading.append(topic, status);

      const question = document.createElement("h4");
      question.textContent = item.question;

      const answer = document.createElement("p");
      answer.className = "animal-quiz-review-answer";
      const answerLabel = document.createElement("strong");
      answerLabel.textContent = "Sua resposta: ";
      answer.append(answerLabel, document.createTextNode(item.selectedAnswer));

      const explanation = document.createElement("p");
      explanation.className = "animal-quiz-review-explanation";
      explanation.textContent = item.explanation;

      card.append(heading, question, answer);
      if (!item.correct) {
        const correction = document.createElement("p");
        correction.className = "animal-quiz-review-answer";
        const correctionLabel = document.createElement("strong");
        correctionLabel.textContent = "Resposta correta: ";
        correction.append(
          correctionLabel,
          document.createTextNode(item.correctAnswer),
        );
        card.append(correction);
      }
      card.append(explanation);
      reviewList.append(card);
    });
  }

  async function iniciarQuiz() {
    if (!animal?.id) return;
    quizReady = false;
    questionsNode.replaceChildren();
    questionsNode.hidden = false;
    speciesInfo.hidden = false;
    reviewPanel.hidden = true;
    savedCardPanel.hidden = true;
    savedCardPanel.classList.remove("is-newly-saved");
    reviewList.replaceChildren();
    retryButton.hidden = true;
    closeReviewButton.hidden = true;
    submitButton.hidden = false;
    title.textContent = "Quiz: " + (animal.nome || "espécie");
    speciesImage.src = animal.imagem || "";
    speciesImage.alt = animal.nome ? "Imagem de " + animal.nome : "";
    speciesImage.hidden = !animal.imagem;
    document.getElementById("quiz-animal-biome").textContent =
      animal.bioma || animal.biomas || "Informação não disponível";
    document.getElementById("quiz-animal-habitat").textContent =
      animal.habitat || "Informação não disponível";
    document.getElementById("quiz-animal-diet").textContent =
      animal.alimentacao || "Informação não disponível";
    document.getElementById("quiz-animal-size").textContent =
      animal.porte || "Informação não disponível";
    document.getElementById("quiz-animal-physical").textContent =
      animal.caracteristicas_fisicas || "Informação não disponível";
    document.getElementById("quiz-animal-adaptation").textContent =
      animal.adaptacao || "Informação não disponível";
    document.getElementById("quiz-animal-curiosity").textContent =
      animal.curiosidade || "Informação não disponível";
    message.textContent = "Carregando perguntas…";
    message.dataset.state = "loading";
    submitButton.textContent = "Verificar respostas";
    submitButton.disabled = true;

    try {
      const response = await fetch("/quiz/iniciar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId: animal.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.erro || "Não foi possível carregar o quiz.");
      const questions = Array.isArray(result.questions) ? result.questions : [];
      if (questions.length < 3)
        throw new Error("Ainda não há informações suficientes para este quiz.");
      renderQuestions(questions);
      quizReady = true;
      message.textContent =
        "Leia as informações da espécie e escolha uma opção em cada questão.";
      message.dataset.state = "info";
    } catch (error) {
      message.textContent =
        error.message || "Não foi possível carregar o quiz.";
      message.dataset.state = "error";
    } finally {
      submitButton.disabled = !quizReady;
    }
  }

  button.addEventListener("click", () => {
    dialog.showModal();
    iniciarQuiz();
  });

  retryButton.addEventListener("click", iniciarQuiz);
  document
    .getElementById("dismiss-species-card-toast")
    ?.addEventListener("click", hideCardToast);
  closeReviewButton.addEventListener("click", () => dialog.close());
  document
    .getElementById("close-animal-quiz")
    ?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    const answers = [...questionsNode.querySelectorAll("fieldset")].map(
      (_, index) => Number(form.elements["q" + index].value),
    );

    try {
      const response = await fetch("/quiz/concluir", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.erro || "Não foi possível verificar as respostas.",
        );

      renderReview(
        result.review || [],
        Boolean(result.correct),
        result.message || "Revisão do quiz.",
      );
      if (result.correct && result.card) {
        const imageUrl = result.card.imagem || animal.imagem || "";
        if (imageUrl) savedCardImage.src = imageUrl;
        else savedCardImage.removeAttribute("src");
        savedCardImage.alt = result.card.nome
          ? "Cartinha de " + result.card.nome
          : "Cartinha da espécie";
        savedCardImage.hidden = !imageUrl;
        savedCardTitle.textContent =
          result.card.nome || animal.nome || "Espécie";
        savedCardMessage.textContent = result.cardAdded
          ? "Cartinha salva no seu perfil"
          : "Esta cartinha já está no seu perfil";
        savedCardPanel.hidden = false;
        if (result.cardAdded) {
          savedCardPanel.classList.remove("is-newly-saved");
          void savedCardPanel.offsetWidth;
          savedCardPanel.classList.add("is-newly-saved");
          showCardToast(result.card.nome || animal.nome || "desta espécie");
        }
      } else {
        savedCardPanel.hidden = true;
      }
      questionsNode.hidden = true;
      speciesInfo.hidden = true;
      reviewPanel.hidden = false;
      retryButton.hidden = Boolean(result.correct);
      closeReviewButton.hidden = false;
      submitButton.hidden = true;
      message.textContent = "";
    } catch (error) {
      message.textContent =
        error.message || "Não foi possível verificar as respostas.";
      message.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
