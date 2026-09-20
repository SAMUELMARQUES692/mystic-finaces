// Mystic Finance — front-end configuration
// Backend: https://github.com/SAMUELMARQUES692/FinanceSystem (Spring Boot, no context-path, default port 8080)
window.MYSTIC_CONFIG = {
  // Points at the local Spring Boot backend during development. Once the
  // backend is deployed, replace PRODUCTION_API_BASE_URL below with its
  // public HTTPS URL — Vercel serves this site over HTTPS, so an http://
  // backend would be blocked by the browser as mixed content.
  API_BASE_URL: (function () {
    var isLocal = ["localhost", "127.0.0.1"].indexOf(window.location.hostname) !== -1;
    var PRODUCTION_API_BASE_URL = ""; // TODO: set once the backend is deployed
    return isLocal ? "http://localhost:8080" : PRODUCTION_API_BASE_URL;
  })(),

  // The backend has no endpoint to list available scopes (Flyway seeds
  // ROLE_ADMIN/ROLE_USER, later renamed ADMIN/USER, in insertion order).
  // Public self-registration always requests the regular "USER" scope by
  // its seeded id below. If your database seeds scopes in a different
  // order, update this id to match.
  DEFAULT_USER_SCOPE_ID: 2,
};
