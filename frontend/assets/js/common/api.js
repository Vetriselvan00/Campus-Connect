(function createCampusApi() {
  async function request(path, options = {}) {
    const init = {
      method: options.method || "GET",
      headers: options.headers ? { ...options.headers } : {},
      credentials: "include"
    };

    if (options.body instanceof FormData) {
      init.body = options.body;
    } else if (options.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${window.CAMPUS_CONFIG.apiBase}${path}`, init);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof data === "object" && data.message ? data.message : "Request failed.";
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  window.CampusApi = { request };
})();
