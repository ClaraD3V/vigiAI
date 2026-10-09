(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const container = document.querySelector("#tab-perfil");

  async function loadProfile(session, perfil) {
    if (!container || !authClient || !session) return;

    const email = session.user.email || "—";
    const nome = perfil?.nome_completo || "—";

    const content = h("div", { class: "profile" }, [
      // Card: Informações pessoais
      h("div", { class: "card" }, [
        h("h2", {}, "Informações pessoais"),
        h("dl", { class: "sum" }, [
          h("dt", {}, "Nome"),
          h("dd", { text: nome }),
          h("dt", {}, "E-mail"),
          h("dd", { text: email })
        ]),
        h("p", { class: "muted", style: "margin-top: 16px; font-size: 0.9rem;" },
          "Você não pode alterar esses dados por enquanto. Para atualizações, entre em contato conosco."
        )
      ]),

      // Card: Excluir conta
      h("div", { class: "card" }, [
        h("h2", {}, "Excluir conta"),
        h("p", { class: "muted" },
          "Se decidir sair, você pode excluir sua conta a qualquer momento. Todas as inscrições, histórico de leituras e assinatura serão removidos permanentemente."
        ),
        h("button", {
          class: "btn",
          style: "background: var(--warn); margin-top: 16px;",
          onClick: () => showDeleteModal()
        }, "Excluir minha conta")
      ])
    ]);

    container.innerHTML = "";
    container.appendChild(content);
  }

  function showDeleteModal() {
    const modal = document.createElement("dialog");
    modal.className = "sub-dialog";
    modal.setAttribute("open", "");

    const content = h("div", {}, [
      h("h2", { style: "margin: 0 0 12px; font-size: 1.4rem;" }, "Tem certeza?"),
      h("p", { class: "muted", style: "margin: 0 0 20px;" },
        "Sua conta, inscrições, histórico de leituras e assinatura serão deletados permanentemente. Esta ação não pode ser desfeita."
      ),
      h("div", { class: "sub-actions" }, [
        h("button", {
          class: "btn ghost",
          type: "button",
          onClick: () => modal.remove()
        }, "Cancelar"),
        h("button", {
          class: "btn sub-danger",
          type: "button",
          onClick: () => confirmDelete(modal)
        }, "Sim, excluir")
      ])
    ]);

    modal.appendChild(content);
    document.body.appendChild(modal);
    modal.focus();
  }

  async function confirmDelete(modal) {
    if (!authClient) return;

    modal.remove();
    try {
      // Chamar RPC para excluir conta
      const { error } = await authClient.rpc("excluir_minha_conta");
      if (error) {
        alert("Erro ao excluir conta: " + error.message);
        return;
      }

      // Fazer logout
      await authClient.auth.signOut();

      // Redirecionar para landing
      window.location.assign("index.html");
    } catch (err) {
      console.error("Erro na exclusão:", err);
      alert("Erro ao excluir conta. Tente novamente.");
    }
  }

  // Escutar portal:access para carregar dados
  window.addEventListener("portal:access", ({ detail }) => {
    if (detail && detail.session && detail.perfil) {
      loadProfile(detail.session, detail.perfil).catch(console.error);
    }
  });

  // Helper para criar elementos
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") node.setAttribute("style", value);
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    });
    children.flat().forEach(child => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }
}());
