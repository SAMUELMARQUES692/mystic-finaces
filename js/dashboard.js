(function () {
  var api = window.ToraApi;

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
    admin: { title: "Usuários", sub: "Gerencie usuários da plataforma.", kicker: "管理 · Administração", load: null, adminOnly: true },
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
        document.getElementById("ovAgency").textContent = account.agency;
        document.getElementById("ovNumber").textContent = account.number;
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
  var transferForm = document.getElementById("transferForm");
  transferForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var alertEl = document.getElementById("transferAlert");
    var successEl = document.getElementById("transferSuccess");
    hideAlert(alertEl);
    hideAlert(successEl);

    var destinationId = document.getElementById("destinationId").value;
    var amount = document.getElementById("amount").value;
    var description = document.getElementById("description").value.trim();

    var destField = document.getElementById("fieldDestination");
    var amountField = document.getElementById("fieldAmount");
    var destValid = Number(destinationId) > 0;
    var amountValid = Number(amount) >= 0.01;
    destField.classList.toggle("has-error", !destValid);
    amountField.classList.toggle("has-error", !amountValid);
    if (!destValid || !amountValid) return;

    var btn = document.getElementById("transferBtn");
    var label = document.getElementById("transferLabel");
    setLoading(btn, label, true, "Transferir");

    api.transfer(Number(destinationId), Number(amount), description)
      .then(function () {
        showAlert(successEl, "Transferência realizada com sucesso!");
        transferForm.reset();
        loaded.statement = false;
        loaded.overview = false;
      })
      .catch(function (err) {
        showAlert(alertEl, err.message);
      })
      .finally(function () {
        setLoading(btn, label, false, "Transferir");
      });
  });

  // ---------- statement ----------
  function loadStatement() {
    var loadingEl = document.getElementById("statementLoading");
    var tableWrap = document.getElementById("statementTableWrap");
    var body = document.getElementById("statementBody");
    var emptyEl = document.getElementById("statementEmpty");
    var errorEl = document.getElementById("statementError");

    api.getReport()
      .then(function (transactions) {
        loadingEl.hidden = true;
        if (!transactions || transactions.length === 0) {
          emptyEl.hidden = false;
          return;
        }
        tableWrap.hidden = false;
        var myAccountId = null; // best-effort; report is already scoped to the caller's account
        body.innerHTML = transactions
          .map(function (tx) {
            var statusClass = { PENDING: "pending", COMPLETED: "completed", FAILED: "failed" }[tx.status] || "transfer";
            return (
              "<tr>" +
              '<td class="mono">' + (tx.createdAt || "—") + "</td>" +
              '<td><span class="badge badge--transfer">' + tx.type + "</span></td>" +
              '<td class="mono">#' + tx.originId + " → #" + tx.destinationId + "</td>" +
              '<td class="mono">' + formatCurrency(tx.amount) + "</td>" +
              '<td><span class="badge badge--' + statusClass + '">' + tx.status + "</span></td>" +
              "<td>" + (tx.description || "—") + "</td>" +
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
