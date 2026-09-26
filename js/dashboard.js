(function () {
  var api = window.MysticApi;

  if (!api.session.isAuthenticated()) {
    window.location.replace("login.html");
    return;
  }

  var session = api.session.get();

  // ---------- helpers ----------
  function formatCurrency(value) {
    var n = Number(value);
    if (isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function toast(message, type) {
    var stack = document.getElementById("toastStack");
    var el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s ease";
      setTimeout(function () { el.remove(); }, 300);
    }, 4200);
  }

  function setLoading(btn, label, isLoading, text) {
    btn.disabled = isLoading;
    label.innerHTML = isLoading ? '<span class="spinner"></span>' : text;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // CPF comes unmasked from the API; only show the middle digits (LGPD-friendly).
  function maskCpf(cpf) {
    var d = String(cpf == null ? "" : cpf).replace(/\D/g, "");
    if (d.length !== 11) return "";
    return "***." + d.slice(3, 6) + "." + d.slice(6, 9) + "-**";
  }

  function showAlert(el, message) {
    el.textContent = message;
    el.classList.add("is-visible");
  }
  function hideAlert(el) {
    el.classList.remove("is-visible");
  }

  // ---------- sidebar / user info ----------
  document.getElementById("userEmail").textContent = session.email || "—";
  document.getElementById("userAvatar").textContent = (session.email || "U").charAt(0).toUpperCase();
  var userIdEl = document.getElementById("userId");
  if (userIdEl) userIdEl.textContent = session.userId ? "ID #" + session.userId : "";

  var isAdmin = api.session.isAdmin();
  if (isAdmin) {
    document.getElementById("adminDivider").hidden = false;
    document.getElementById("adminLabel").hidden = false;
    document.getElementById("adminNavItem").hidden = false;
  }

  document.getElementById("logoutBtn").addEventListener("click", function () {
    api.session.clear();
    window.location.href = "login.html";
  });

  // mobile nav toggle
  var shell = document.getElementById("appShell");
  var menuBtn = document.getElementById("menuBtn");
  var scrim = document.getElementById("appScrim");
  if (menuBtn) menuBtn.addEventListener("click", function () { shell.classList.toggle("nav-open"); });
  if (scrim) scrim.addEventListener("click", function () { shell.classList.remove("nav-open"); });

  // ---------- router ----------
  var ROUTES = {
    overview: { title: "Visão geral", sub: "Sua conta, resumida.", kicker: "観察 · Visão geral", load: loadOverview },
    transfer: { title: "Transferir", sub: "Envie valores para outra conta.", kicker: "移動 · Transferência", load: null },
    statement: { title: "Extrato", sub: "Histórico de transações da sua conta.", kicker: "記録 · Extrato", load: loadStatement },
    profile: { title: "Perfil", sub: "Seus dados de cadastro.", kicker: "身元 · Perfil", load: loadProfile },
    admin: { title: "Usuários", sub: "Gerencie usuários da plataforma.", kicker: "管理 · Administração", load: loadUsers, adminOnly: true },
  };
  var loaded = {};

  function navigate() {
    var hash = window.location.hash.replace("#/", "") || "overview";
    if (!ROUTES[hash] || (ROUTES[hash].adminOnly && !isAdmin)) hash = "overview";

    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("is-active"); });
    document.querySelectorAll(".app-nav__item").forEach(function (n) { n.classList.remove("is-active"); });

    var view = document.getElementById("view-" + hash);
    if (view) view.classList.add("is-active");
    var navItem = document.querySelector('.app-nav__item[data-route="' + hash + '"]');
    if (navItem) navItem.classList.add("is-active");

    document.getElementById("pageKicker").textContent = ROUTES[hash].kicker || "";
    document.getElementById("pageTitle").textContent = ROUTES[hash].title;
    document.getElementById("pageSub").textContent = ROUTES[hash].sub;
    shell.classList.remove("nav-open");

    if (ROUTES[hash].load && !loaded[hash]) {
      loaded[hash] = true;
      ROUTES[hash].load();
    }
  }
  window.addEventListener("hashchange", navigate);
  navigate();

  // ---------- overview ----------
  function loadOverview() {
    var loadingEl = document.getElementById("overviewLoading");
    var contentEl = document.getElementById("overviewContent");
    var emptyEl = document.getElementById("overviewEmpty");
    var errorEl = document.getElementById("overviewError");

    // resolves the account straight from the token (GET /accounts/user)
    api.getAccountByToken()
      .then(function (account) {
        loadingEl.hidden = true;
        contentEl.hidden = false;
        document.getElementById("ovBalance").textContent = formatCurrency(account.balance);
        document.getElementById("ovHolder").textContent = account.userName || "—";
        document.getElementById("ovCpf").textContent = maskCpf(account.userCpf) || "—";
        document.getElementById("ovAgency").textContent = account.agency;
        document.getElementById("ovNumber").textContent = account.number;
        document.getElementById("ovPix").textContent = account.pix || "—";
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        if (err.code === "ACCOUNT_NOT_FOUND") {
          emptyEl.hidden = false;
        } else {
          errorEl.hidden = false;
          showAlert(errorEl, err.message);
        }
      });
  }

  var createAccountForm = document.getElementById("createAccountForm");
  createAccountForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = document.getElementById("createAccountBtn");
    var label = document.getElementById("createAccountLabel");
    var balance = document.getElementById("accBalance").value;
    var agency = document.getElementById("accAgency").value.trim();
    var number = document.getElementById("accNumber").value.trim();
    if (!balance || !agency || !number) return;

    setLoading(btn, label, true, "Abrir conta");
    api.createAccount(Number(balance), agency, number)
      .then(function () {
        toast("Conta criada com sucesso!", "success");
        loaded.overview = false;
        document.getElementById("overviewEmpty").hidden = true;
        document.getElementById("overviewLoading").hidden = false;
        loadOverview();
      })
      .catch(function (err) {
        toast(err.message, "error");
      })
      .finally(function () {
        setLoading(btn, label, false, "Abrir conta");
      });
  });

  // ---------- transfer ----------
  // Guided flow: forma -> chave -> valor -> dados do destinatario + confirmar.
  // Only Pix is wired to the backend (POST /transactions/transfer resolves the
  // destination by pix key); the other methods are listed as "em breve".
  var transferFlow = document.getElementById("transferFlow");
  var destinationPixInput = document.getElementById("destinationPix");
  var amountInput = document.getElementById("amount");
  var descriptionInput = document.getElementById("description");
  var STEP_ORDER = ["method", "key", "amount", "review"];
  var transferState = { method: null, pix: "", recipient: null, amount: 0, description: "" };
  var lookupInFlight = false;
  var transferInFlight = false;

  function goToStep(step) {
    transferFlow.querySelectorAll(".tstep").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-step") === step);
    });
    var idx = STEP_ORDER.indexOf(step);
    document.getElementById("transferStepper").classList.toggle("is-hidden", idx === -1);
    document.querySelectorAll("#transferStepper .stepper__item").forEach(function (el, i) {
      el.classList.toggle("is-active", i === idx);
      el.classList.toggle("is-done", i < idx);
    });
  }

  function resetTransfer() {
    transferState = { method: null, pix: "", recipient: null, amount: 0, description: "" };
    destinationPixInput.value = "";
    amountInput.value = "";
    descriptionInput.value = "";
    document.getElementById("fieldKey").classList.remove("has-error");
    document.getElementById("fieldAmount").classList.remove("has-error");
    hideAlert(document.getElementById("keyAlert"));
    hideAlert(document.getElementById("transferAlert"));
    goToStep("method");
  }

  document.querySelectorAll(".method-card:not(:disabled)").forEach(function (card) {
    card.addEventListener("click", function () {
      transferState.method = card.getAttribute("data-method");
      goToStep("key");
      destinationPixInput.focus();
    });
  });

  transferFlow.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () { goToStep(btn.getAttribute("data-back")); });
  });

  // step 2: look the account up by pix key
  document.getElementById("keyForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (lookupInFlight) return;
    var alertEl = document.getElementById("keyAlert");
    hideAlert(alertEl);

    var pix = destinationPixInput.value.trim();
    document.getElementById("fieldKey").classList.toggle("has-error", !pix);
    if (!pix) return;

    var btn = document.getElementById("keyBtn");
    var label = document.getElementById("keyLabel");
    lookupInFlight = true;
    setLoading(btn, label, true, "Buscar conta");
    api.findAccountByPix(pix)
      .then(function (account) {
        transferState.pix = pix;
        transferState.recipient = account;
        goToStep("amount");
        amountInput.focus();
      })
      .catch(function (err) {
        // the backend answers 500 for an unknown key, so any other failure reads as "not found"
        showAlert(alertEl, err.code === "NETWORK_ERROR" ? err.message : "Nenhuma conta encontrada para essa chave Pix.");
      })
      .finally(function () {
        lookupInFlight = false;
        setLoading(btn, label, false, "Buscar conta");
      });
  });

  // step 3: amount -> review
  document.getElementById("amountForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var amount = Number(amountInput.value);
    var valid = amount >= 0.01;
    document.getElementById("fieldAmount").classList.toggle("has-error", !valid);
    if (!valid) return;

    var r = transferState.recipient;
    transferState.amount = amount;
    transferState.description = descriptionInput.value.trim();

    document.getElementById("rvAmount").textContent = formatCurrency(amount);
    document.getElementById("rvName").textContent = r.userName || "—";
    document.getElementById("rvCpf").textContent = maskCpf(r.userCpf) || "—";
    document.getElementById("rvPix").textContent = transferState.pix;
    document.getElementById("rvAgency").textContent = r.agency || "—";
    document.getElementById("rvNumber").textContent = r.number || "—";
    document.getElementById("rvDescription").textContent = transferState.description || "—";
    hideAlert(document.getElementById("transferAlert"));
    goToStep("review");
  });

  // step 4: confirm
  document.getElementById("transferBtn").addEventListener("click", function () {
    if (transferInFlight) return;
    var alertEl = document.getElementById("transferAlert");
    hideAlert(alertEl);

    var btn = document.getElementById("transferBtn");
    var label = document.getElementById("transferLabel");
    var backBtn = document.getElementById("reviewBack");
    transferInFlight = true;
    backBtn.disabled = true;
    setLoading(btn, label, true, "Confirmar transferência");

    api.transfer(transferState.pix, transferState.amount, transferState.description)
      .then(function () {
        var r = transferState.recipient;
        document.getElementById("doneSummary").textContent =
          formatCurrency(transferState.amount) + " enviados para " + (r.userName || "a conta de destino") + ".";
        loaded.statement = false;
        loaded.overview = false;
        goToStep("done");
      })
      .catch(function (err) {
        showAlert(alertEl, err.message);
      })
      .finally(function () {
        transferInFlight = false;
        backBtn.disabled = false;
        setLoading(btn, label, false, "Confirmar transferência");
      });
  });

  document.getElementById("newTransferBtn").addEventListener("click", resetTransfer);

  // ---------- statement ----------
  function loadStatement() {
    var loadingEl = document.getElementById("statementLoading");
    var tableWrap = document.getElementById("statementTableWrap");
    var body = document.getElementById("statementBody");
    var emptyEl = document.getElementById("statementEmpty");
    var errorEl = document.getElementById("statementError");

    // the report is already scoped to the caller's account; the account id tells sent from received
    Promise.all([
      api.getReport(),
      api.getAccountByToken().catch(function () { return null; }),
    ])
      .then(function (results) {
        var transactions = results[0];
        var myAccountId = results[1] ? results[1].id : null;
        loadingEl.hidden = true;
        if (!transactions || transactions.length === 0) {
          emptyEl.hidden = false;
          return;
        }
        tableWrap.hidden = false;

        // origin/destination arrive as account objects (older payloads had originId/destinationId)
        function party(acc, fallbackId) {
          var id = acc && acc.id != null ? acc.id : fallbackId;
          var name = acc && acc.user && acc.user.name;
          return (name ? escapeHtml(name) + " " : "") + '<span class="mono">#' + escapeHtml(id) + "</span>";
        }

        body.innerHTML = transactions
          .map(function (tx) {
            var statusClass = { PENDING: "pending", COMPLETED: "completed", FAILED: "failed" }[tx.status] || "transfer";
            var originId = tx.origin ? tx.origin.id : tx.originId;
            var sent = originId === myAccountId;
            var direction = myAccountId == null ? tx.type : sent ? "Enviada" : "Recebida";
            var directionClass = myAccountId == null ? "transfer" : sent ? "out" : "in";
            return (
              "<tr>" +
              '<td class="mono">' + escapeHtml(tx.createdAt || "—") + "</td>" +
              '<td><span class="badge badge--' + directionClass + '">' + escapeHtml(direction) + "</span></td>" +
              "<td>" + party(tx.origin, tx.originId) + " → " + party(tx.destination, tx.destinationId) + "</td>" +
              '<td class="mono">' + formatCurrency(tx.amount) + "</td>" +
              '<td><span class="badge badge--' + statusClass + '">' + escapeHtml(tx.status) + "</span></td>" +
              "<td>" + escapeHtml(tx.description || "—") + "</td>" +
              "</tr>"
            );
          })
          .join("");
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        showAlert(errorEl, err.message);
      });
  }

  // ---------- profile ----------
  function loadProfile() {
    var loadingEl = document.getElementById("profileLoading");
    var contentEl = document.getElementById("profileContent");
    var errorEl = document.getElementById("profileError");

    api.getUserByEmail(session.email)
      .then(function (user) {
        loadingEl.hidden = true;
        contentEl.hidden = false;
        document.getElementById("pfName").textContent = user.name;
        document.getElementById("pfEmail").textContent = user.email;
        document.getElementById("pfCreated").textContent = user.createdAt;
        document.getElementById("pfScopes").textContent = (user.scopes || []).join(", ");
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        showAlert(errorEl, err.message);
      });
  }

  // ---------- admin ----------
  function loadUsers() {
    var loadingEl = document.getElementById("adminUsersLoading");
    var tableWrap = document.getElementById("adminUsersTableWrap");
    var body = document.getElementById("adminUsersBody");
    var emptyEl = document.getElementById("adminUsersEmpty");
    var errorEl = document.getElementById("adminUsersError");

    loadingEl.hidden = false;
    tableWrap.hidden = true;
    emptyEl.hidden = true;
    hideAlert(errorEl);

    // wrapped in Promise.resolve() so a synchronous throw (e.g. a stale cached
    // api.js without this method) still lands in .catch() instead of leaving
    // the skeleton stuck forever
    Promise.resolve()
      .then(function () { return api.getAllUsers(); })
      .then(function (users) {
        loadingEl.hidden = true;
        if (!users || users.length === 0) {
          emptyEl.hidden = false;
          return;
        }
        tableWrap.hidden = false;
        body.innerHTML = users
          .map(function (user) {
            return (
              "<tr>" +
              '<td class="mono">#' + escapeHtml(user.id) + "</td>" +
              "<td>" + escapeHtml(user.name) + "</td>" +
              "<td>" + escapeHtml(user.email) + "</td>" +
              "<td>" + escapeHtml((user.scopes || []).join(", ")) + "</td>" +
              '<td class="mono">' + escapeHtml(user.createdAt || "—") + "</td>" +
              '<td><button type="button" class="btn btn--ghost-light btn--sm" data-user-id="' + escapeHtml(user.id) + '">Editar</button></td>' +
              "</tr>"
            );
          })
          .join("");
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        showAlert(errorEl, err.message);
      });
  }

  var adminUsersRefreshBtn = document.getElementById("adminUsersRefreshBtn");
  if (adminUsersRefreshBtn) {
    adminUsersRefreshBtn.addEventListener("click", function () {
      loadUsers();
    });
  }

  var adminUsersBody = document.getElementById("adminUsersBody");
  if (adminUsersBody) {
    adminUsersBody.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-user-id]");
      if (!btn) return;
      var id = btn.getAttribute("data-user-id");
      document.getElementById("auId").value = id;
      document.getElementById("adId").value = id;
      document.getElementById("auId").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  var adminUpdateForm = document.getElementById("adminUpdateForm");
  if (adminUpdateForm) {
    adminUpdateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var alertEl = document.getElementById("adminUpdateAlert");
      var successEl = document.getElementById("adminUpdateSuccess");
      hideAlert(alertEl);
      hideAlert(successEl);

      var id = document.getElementById("auId").value;
      var name = document.getElementById("auName").value.trim();
      var email = document.getElementById("auEmail").value.trim();
      var password = document.getElementById("auPassword").value;
      var scopesRaw = document.getElementById("auScopes").value.trim();
      var scopes = scopesRaw.split(",").map(function (s) { return Number(s.trim()); }).filter(function (n) { return !isNaN(n); });

      var btn = document.getElementById("adminUpdateBtn");
      var label = document.getElementById("adminUpdateLabel");
      setLoading(btn, label, true, "Atualizar usuário");

      api.updateUser(Number(id), { name: name, email: email, password: password, scopes: scopes })
        .then(function () {
          showAlert(successEl, "Usuário atualizado com sucesso.");
          loadUsers();
        })
        .catch(function (err) {
          showAlert(alertEl, err.message);
        })
        .finally(function () {
          setLoading(btn, label, false, "Atualizar usuário");
        });
    });
  }

  var adminDeleteForm = document.getElementById("adminDeleteForm");
  if (adminDeleteForm) {
    adminDeleteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var alertEl = document.getElementById("adminDeleteAlert");
      var successEl = document.getElementById("adminDeleteSuccess");
      hideAlert(alertEl);
      hideAlert(successEl);

      var id = document.getElementById("adId").value;
      var btn = document.getElementById("adminDeleteBtn");
      var label = document.getElementById("adminDeleteLabel");
      setLoading(btn, label, true, "Remover");

      api.deleteUser(Number(id))
        .then(function () {
          showAlert(successEl, "Usuário removido.");
          adminDeleteForm.reset();
          loadUsers();
        })
        .catch(function (err) {
          showAlert(alertEl, err.message);
        })
        .finally(function () {
          setLoading(btn, label, false, "Remover");
        });
    });
  }
})();
