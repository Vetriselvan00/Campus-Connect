(function createCampusAuth() {
  let cachedUser = null;

  async function getUser(force = false) {
    if (cachedUser && !force) {
      return cachedUser;
    }

    try {
      const response = await window.CampusApi.request("/auth/me");
      cachedUser = response.user;
      return cachedUser;
    } catch (_error) {
      cachedUser = null;
      return null;
    }
  }

  async function requireUser() {
    const user = await getUser(true);
    if (!user) {
      window.location.href = "/login.html";
      return null;
    }

    return user;
  }

  function clearUser() {
    cachedUser = null;
  }

  async function logout() {
    await window.CampusApi.request("/auth/logout", { method: "POST" });
    clearUser();
    window.location.href = "/login.html";
  }

  window.CampusAuth = { clearUser, getUser, logout, requireUser };
})();
