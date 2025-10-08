document.addEventListener("DOMContentLoaded", () => {
  const presencaRadios = document.querySelectorAll('input[name="presenca"]');
  const camposSim = document.getElementById("campos-sim");
  const camposNao = document.getElementById("campos-nao");
  const quantidadeInput = document.getElementById("quantidade");
  const acompanhantesContainer = document.getElementById("acompanhantes-container");
  const form = document.getElementById("rsvp-form");
  const mensagemFinal = document.getElementById("mensagem-final");

  presencaRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Sim") {
        camposSim.style.display = "block";
        camposNao.style.display = "none";
        buildAcompanhantesFields(quantidadeInput.value);
      } else {
        camposSim.style.display = "none";
        camposNao.style.display = "block";
      }
    });
  });

  quantidadeInput.addEventListener("input", () => {
    buildAcompanhantesFields(quantidadeInput.value);
  });

  function buildAcompanhantesFields(qtd) {
    acompanhantesContainer.innerHTML = "";
    qtd = parseInt(qtd);
    if (qtd > 1) {
      for (let i = 1; i < qtd; i++) {
        const div = document.createElement("div");
        div.classList.add("acompanhante");

        div.innerHTML = `
          <label>Nome do acompanhante ${i}:</label>
          <input type="text" class="acomp-nome" required>
          <label>Tipo:</label>
          <input type="radio" name="tipo${i}" value="Adulto" required> Adulto
          <input type="radio" name="tipo${i}" value="Criança" required> Criança
          <div class="idade-crianca" style="display:none;">
            <label>Idade:</label>
            <input type="number" class="acomp-idade">
          </div>
        `;
        acompanhantesContainer.appendChild(div);

        const tipoRadios = div.querySelectorAll(`input[name="tipo${i}"]`);
        tipoRadios.forEach(r => {
          r.addEventListener("change", () => {
            const idadeDiv = div.querySelector(".idade-crianca");
            idadeDiv.style.display = r.value === "Criança" ? "block" : "none";
          });
        });
      }
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const presenca = document.querySelector('input[name="presenca"]:checked')?.value;
    if (!presenca) {
      alert("Escolha sua presença.");
      return;
    }

    let payload = { presenca };

    if (presenca === "Sim") {
      payload.nome = document.getElementById("nome").value.trim();
      payload.apelido = document.getElementById("apelido").value.trim();
      payload.telefone = sanitizeTelefone(document.getElementById("telefone").value);
      payload.quantidade = document.getElementById("quantidade").value;
      payload.acompanhantes = [];

      const acompanhantesDivs = document.querySelectorAll(".acompanhante");
      acompanhantesDivs.forEach(div => {
        const nome = div.querySelector(".acomp-nome").value.trim();
        const tipo = div.querySelector(`input[name="${div.querySelector(".acomp-nome").name}"]:checked`)?.value;
        const idade = div.querySelector(".acomp-idade")?.value.trim();
        payload.acompanhantes.push({ nome, tipo, idade });
      });

    } else {
      payload.nome = document.getElementById("nome-nao").value.trim();
      payload.apelido = document.getElementById("apelido-nao").value.trim();
      payload.telefone = sanitizeTelefone(document.getElementById("telefone-nao").value);
    }

    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbxGE-cpLAcZfHMIR7WkfmpoltFFU8q21j-NKGNxFHiqM66vAwNtt_WpGV-mB9eKVs4e/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", ...payload })
      });
      const data = await response.json();

      if (data.success) {
        mensagemFinal.innerHTML = presenca === "Sim"
          ? `Uhuuul! 🎉 Obrigado por confirmar sua presença! Contagem regressiva ativada 💕.<br><img src="${data.qr_url}" alt="QR Code">`
          : "Lamentamos que não vá poder comparecer — obrigado por avisar.";
        form.style.display = "none";
      } else {
        alert(data.error || "Erro no envio");
      }
    } catch (err) {
      alert("Erro de conexão.");
      console.error(err);
    }
  });

  function sanitizeTelefone(telefone) {
    return telefone.replace(/\D/g, "");
  }
});
