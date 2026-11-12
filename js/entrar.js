//  CADASTRO  //

document
  .getElementById("form_Cadastro")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    var nome = document.getElementById("name_C").value;
    var inmail = document.getElementById("email_C").value;
    var senha = document.getElementById("password_C").value;
    var senha2 = document.getElementById("password2_C").value;

    if (senha != senha2) {
      showMessage(
        "Senhas diferentes!",
        "As senhas informadas não conferem. Verifique e tente novamente.",
        "error",
      );
      document.getElementById("password_C").value = "";
      document.getElementById("password2_C").value = "";
      return;
    }

    fetch("/cadastro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nome,
        email: inmail,
        password: senha,
      }),
    })
      .then((response) => response.json())
      .then((dados) => {
        if (dados.hasOwnProperty("error")) {
          showMessage("Erro no cadastro!", dados.error, "error");
          document.getElementById("name_C").value = "";
          document.getElementById("email_C").value = "";
          document.getElementById("password_C").value = "";
          document.getElementById("password2_C").value = "";
          document.getElementById("termos").checked = false;
          return;
        }
        document.getElementById("name_C").value = "";
        document.getElementById("email_C").value = "";
        document.getElementById("password_C").value = "";
        document.getElementById("password2_C").value = "";
        document.getElementById("termos").checked = false;

        showMessage("Cadastro realizado!", dados.message, "success");
        switchTab("entrar", document.querySelector(".tab-btn"));
      });
  });

//  ADM  //

async function verificarAdmin() {
  try {
    console.log("Iniciando verificação ADM...");
    const resposta = await fetch("/verificar-admin", {
      method: "GET",
      credentials: "same-origin",
    });

    console.log("Status da resposta:", resposta.status);
    if (!resposta.ok) return false;

    const dados = await resposta.json();
    console.log("Dados recebidos:", dados);
    return dados.admin;
  } catch (erro) {
    console.error("Erro ao verificar ADM:", erro);
    return false;
  }
}

//  LOGIN  //

document
  .getElementById("form_Login")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    var inmail = document.getElementById("email_L").value;
    var senha = document.getElementById("password_L").value;

    console.log("Evento de login iniciado!");
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: inmail,
        password: senha,
      }),
    })
      .then((response) => response.json())
      .then(async (dados) => {
        console.log("Evento de login iniciado!");
        if (dados.hasOwnProperty("error")) {
          showMessage("Erro ao entrar!", dados.error, "error");
          document.getElementById("email_L").value = "";
          document.getElementById("password_L").value = "";
          document.getElementById("lembrar").checked = false;
          return;
        }

        document.getElementById("email_L").value = "";
        document.getElementById("password_L").value = "";
        const ehAdmin = await verificarAdmin();

        if (ehAdmin) {
          console.log("Bem-vindo, administrador!");
        } else {
          console.log("Bem-vindo, usuário!");
        }
        const account = dados.usuario?.name
          ? dados.usuario
          : { name: inmail.split("@")[0], email: inmail };
        localStorage.setItem("vidaTerrestreUsuario", JSON.stringify(account));
        window.location.href = "conta.html";
      });
  });
