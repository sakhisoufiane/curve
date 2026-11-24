function completeSso(token) {
  // Sets token
  Cookies.set('curveToken', token, { secure: true });
  // Reloads app at base URL
  window.location.replace(window.location.origin);
}