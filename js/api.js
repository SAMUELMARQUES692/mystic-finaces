// Tora Finance — API client
// Talks to the FinanceSystem backend exactly as documented from its source:
// POST /login, POST /users, GET /users, GET /users/{email}/email, PUT/DELETE /users/{id},
// POST /accounts, GET /accounts/me, GET /accounts/user, POST /transactions/transfer,
// GET /transactions/report.
// The JWT subject carries the numeric user id (with the e-mail as a separate
// "email" claim) — see TokenService on the backend — so GET /accounts/user
// (added via FindAccountByUserIdUseCase) resolves the caller's account straight
// from the token, with no extra round trip to look up an id by e-mail.
(function () {
  var CFG = window.TORA_CONFIG;
  var TOKEN_KEY = "tora_finance_session";

  var ERROR_MESSAGES = {
    BAD_CREDENTIAL: "E-mail ou senha incorretos.",
    EMAIL_CONFLICT: "Já existe uma conta cadastrada com esse e-mail.",
    DUPLICATED_USER: "Você já possui uma conta bancária cadastrada.",
    ACCOUNT_NOT_FOUND: "Nenhuma conta bancária foi encontrada.",
    ORIGIN_NOT_FOUND: "Sua conta de origem não foi encontrada.",
    DESTINATION_NOT_FOUND: "A conta de destino informada não existe.",
    INSUFFICIENT_BALANCE: "Saldo insuficiente para concluir a transferência.",
    SAME_ACCOUNT: "Não é possível transferir para a mesma conta.",
    INTERNAL_ERROR: "Erro interno do servidor. Tente novamente em instantes.",
  };

  function friendlyMessage(code, fallback) {
    return ERROR_MESSAGES[code] || fallback || "Não foi possível concluir a operação.";
  }

  function b64UrlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return decodeURIComponent(
      atob(str)
        .split("")
        .map(function (c) { return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2); })
        .join("")
    );
  }

  function decodeJwt(token) {
    try {
      var payload = token.split(".")[1];
      return JSON.parse(b64UrlDecode(payload));
    } catch (e) {
      return null;
    }
  }

  function saveSession(accessToken, expiresIn) {
    var claims = decodeJwt(accessToken) || {};
    var session = {
      accessToken: accessToken,
      // subject is the numeric user id; e-mail now travels as its own claim
      userId: claims.sub || null,
      email: claims.email || claims.sub || null,
      scopes: claims.scope ? claims.scope.split(" ") : [],
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      var session = JSON.parse(raw);
      if (!session || !session.accessToken) return null;
      if (session.expiresAt && Date.now() > session.expiresAt) {
        clearSession();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function isAdmin() {
    var s = getSession();
    return !!s && s.scopes.indexOf("ADMIN") !== -1;
  }

  function ApiError(code, message, status) {
    this.code = code;
    this.message = message;
    this.status = status;
    this.name = "ApiError";
  }
  ApiError.prototype = Object.create(Error.prototype);

  function request(path, options) {
    options = options || {};
    var session = getSession();
    var headers = Object.assign(
      { "Content-Type": "application/json", Accept: "application/json" },
      options.headers || {}
    );
    if (session && !options.skipAuth) {
      headers["Authorization"] = "Bearer " + session.accessToken;
    }

    return fetch(CFG.API_BASE_URL + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
      .catch(function () {
        throw new ApiError(
          "NETWORK_ERROR",
          "Não foi possível conectar ao servidor em " + CFG.API_BASE_URL + ". Verifique se o backend está rodando.",
          0
        );
      })
      .then(function (res) {
        if (res.status === 204) return null;
        return res
          .json()
          .catch(function () { return null; })
          .then(function (data) {
            if (!res.ok) {
              var code = data && data.code;
              var rawMessage = data && data.message;
              throw new ApiError(code, friendlyMessage(code, rawMessage), res.status);
            }
            return data;
          });
      });
  }

  window.ToraApi = {
    ApiError: ApiError,
    session: {
      get: getSession,
      clear: clearSession,
      isAuthenticated: isAuthenticated,
      isAdmin: isAdmin,
    },

    login: function (email, password) {
      return request("/login", {
        method: "POST",
        skipAuth: true,
        body: { email: email, password: password },
      }).then(function (res) {
        return saveSession(res.accessToken, res.expiresIn);
      });
    },

    register: function (name, email, password, scopes) {
      return request("/users", {
        method: "POST",
        skipAuth: true,
        body: {
          name: name,
          email: email,
          password: password,
          scopes: scopes || [CFG.DEFAULT_USER_SCOPE_ID],
        },
      });
    },

    getUserByEmail: function (email) {
      return request("/users/" + encodeURIComponent(email) + "/email");
    },

    getAllUsers: function () {
      return request("/users");
    },

    updateUser: function (id, payload) {
      return request("/users/" + id, { method: "PUT", body: payload });
    },

    deleteUser: function (id) {
      return request("/users/" + id, { method: "DELETE" });
    },

    getMyAccount: function () {
      return request("/accounts/me");
    },

    // Resolves the caller's account straight from the JWT (no id/e-mail needed).
    getAccountByToken: function () {
      return request("/accounts/user");
    },

    createAccount: function (balance, agency, number) {
      return request("/accounts", {
        method: "POST",
        body: { balance: balance, agency: agency, number: number },
      });
    },

    transfer: function (destinationId, amount, description) {
      return request("/transactions/transfer", {
        method: "POST",
        body: {
          destinationId: destinationId,
          amount: amount,
          type: "TRANSFER",
          description: description || "",
        },
      });
    },

    getReport: function () {
      return request("/transactions/report");
    },
  };
})();
