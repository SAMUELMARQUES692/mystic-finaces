(function () {
  if (window.MysticApi.session.isAuthenticated()) {
    // already logged in — skip straight to the app
    window.location.replace("app.html");
    return;
  }

  function showAlert(el, message) {
    el.textContent = message;
    el.classList.add("is-visible");
  }
  function hideAlert(el) {
    el.classList.remove("is-visible");
  }
  function setFieldError(fieldEl, hasError) {
    fieldEl.classList.toggle("has-error", !!hasError);
  }
  function setLoading(btn, label, isLoading, text) {
    btn.disabled = isLoading;
    label.innerHTML = isLoading ? '<span class="spinner"></span>' : text;
  }

  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    var alertEl = document.getElementById("formAlert");
    var submitBtn = document.getElementById("submitBtn");
    var submitLabel = document.getElementById("submitLabel");

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(alertEl);

      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var emailValid = /.+@.+\..+/.test(email.value.trim());
      var passwordValid = password.value.length > 0;

      setFieldError(document.getElementById("fieldEmail"), !emailValid);
      setFieldError(document.getElementById("fieldPassword"), !passwordValid);
      if (!emailValid || !passwordValid) return;

      setLoading(submitBtn, submitLabel, true, "Entrar");
      window.MysticApi.login(email.value.trim(), password.value)
        .then(function () {
          window.location.href = "app.html";
        })
        .catch(function (err) {
          showAlert(alertEl, err.message || "Não foi possível entrar.");
        })
        .finally(function () {
          setLoading(submitBtn, submitLabel, false, "Entrar");
        });
    });
  }

  var registerForm = document.getElementById("registerForm");
  if (registerForm) {
    var rAlertEl = document.getElementById("formAlert");
    var successEl = document.getElementById("formSuccess");
    var rSubmitBtn = document.getElementById("submitBtn");
    var rSubmitLabel = document.getElementById("submitLabel");

    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(rAlertEl);
      hideAlert(successEl);

      var name = document.getElementById("name");
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var confirm = document.getElementById("confirmPassword");

      var nameValid = name.value.trim().length > 0;
      var emailValid = /.+@.+\..+/.test(email.value.trim());
      var passwordValid = password.value.length >= 6;
      var confirmValid = confirm.value === password.value && confirm.value.length > 0;

      setFieldError(document.getElementById("fieldName"), !nameValid);
      setFieldError(document.getElementById("fieldEmail"), !emailValid);
      setFieldError(document.getElementById("fieldPassword"), !passwordValid);
      setFieldError(document.getElementById("fieldConfirm"), !confirmValid);
      if (!nameValid || !emailValid || !passwordValid || !confirmValid) return;

      setLoading(rSubmitBtn, rSubmitLabel, true, "Criar conta");
      window.MysticApi.register(name.value.trim(), email.value.trim(), password.value)
        .then(function () {
          showAlert(successEl, "Conta criada com sucesso! Entrando...");
          return window.MysticApi.login(email.value.trim(), password.value);
        })
        .then(function () {
          window.location.href = "app.html";
        })
        .catch(function (err) {
          showAlert(rAlertEl, err.message || "Não foi possível criar sua conta.");
        })
        .finally(function () {
          setLoading(rSubmitBtn, rSubmitLabel, false, "Criar conta");
        });
    });
  }
})();
