(function createCampusPages() {
  const { departments, difficulties, itemTypes, resourceCategories } = window.CAMPUS_CONFIG;

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qsa(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureToastZone() {
    let zone = qs(".campus-toast-zone");
    if (!zone) {
      zone = document.createElement("div");
      zone.className = "campus-toast-zone";
      document.body.appendChild(zone);
    }

    return zone;
  }

  function toast(message, type = "default") {
    const zone = ensureToastZone();
    const node = document.createElement("div");
    node.className = `campus-toast ${type}`;
    node.textContent = message;
    zone.appendChild(node);
    window.setTimeout(() => node.remove(), 3200);
  }

  function confirmDialog(message, options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-6";
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl">
          <p class="text-lg font-bold text-slate-900">${escapeHtml(options.title || "Confirm Action")}</p>
          <p class="mt-3 text-sm text-slate-500">${escapeHtml(message)}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" data-confirm-cancel class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800">${escapeHtml(options.cancelText || "Cancel")}</button>
            <button type="button" data-confirm-ok class="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">${escapeHtml(options.confirmText || "OK")}</button>
          </div>
        </div>
      `;

      const close = (value) => {
        overlay.remove();
        resolve(value);
      };

      qs("[data-confirm-cancel]", overlay)?.addEventListener("click", () => close(false));
      qs("[data-confirm-ok]", overlay)?.addEventListener("click", () => close(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          close(false);
        }
      });

      document.body.appendChild(overlay);
      qs("[data-confirm-ok]", overlay)?.focus();
    });
  }

  function getNotificationStorageKey(scope, userId) {
    return `campusNotifications:${scope}:${userId || "guest"}`;
  }

  function readNotificationState(scope, userId) {
    try {
      return JSON.parse(window.localStorage.getItem(getNotificationStorageKey(scope, userId)) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function writeNotificationState(scope, userId, state) {
    window.localStorage.setItem(getNotificationStorageKey(scope, userId), JSON.stringify(state));
  }

  function buildNotificationSignature(items, selectors = []) {
    const list = Array.isArray(items) ? items : [];
    const keys = list.slice(0, 5).map((item) => {
      const parts = selectors
        .map((selector) => {
          try {
            return selector(item);
          } catch (_error) {
            return "";
          }
        })
        .filter(Boolean);
      return parts.join("~");
    });
    return `${list.length}:${keys.join("|")}`;
  }

  function prepareNotificationState(scope, userId, signatures) {
    const seen = readNotificationState(scope, userId);
    const unread = {};
    let changed = false;

    Object.entries(signatures).forEach(([key, signature]) => {
      const value = signature || "";
      if (!(key in seen)) {
        seen[key] = value;
        unread[key] = false;
        changed = true;
      } else {
        unread[key] = Boolean(value) && seen[key] !== value;
      }
    });

    if (changed) {
      writeNotificationState(scope, userId, seen);
    }

    return { seen, unread };
  }

  function setNotificationIndicator(element, active) {
    if (!element) {
      return;
    }

    let badge = qs("[data-notify-badge]", element);
    if (!active) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.dataset.notifyBadge = "true";
      badge.textContent = "🔴";
      if (element.classList.contains("relative")) {
        badge.className = "pointer-events-none absolute -right-2 -top-2 text-sm leading-none";
      } else {
        badge.className = "ml-2 inline-block text-sm leading-none align-middle";
      }
      element.appendChild(badge);
    }
  }

  function bindNotificationIndicators(scope, userId, signatures, unread) {
    qsa("[data-notify-key]").forEach((element) => {
      const key = element.dataset.notifyKey;
      setNotificationIndicator(element, Boolean(unread[key]));
      if (element.dataset.notifyBound === "true") {
        return;
      }

      element.addEventListener("click", () => {
        const seen = readNotificationState(scope, userId);
        seen[key] = signatures[key] || "";
        writeNotificationState(scope, userId, seen);
        qsa(`[data-notify-key="${key}"]`).forEach((target) => setNotificationIndicator(target, false));
      });
      element.dataset.notifyBound = "true";
    });
  }

  function setBodyShell() {
    document.body.classList.add("campus-shell");
  }

  function emptyState(message) {
    return `<div class="campus-empty">${escapeHtml(message)}</div>`;
  }

  function applyDirectMessageIcon(element) {
    if (!element) {
      return;
    }

    element.textContent = "⌯⌲";
    element.classList.add("font-bold", "text-brand-700");
  }

  function getSearchParams() {
    return new URLSearchParams(window.location.search);
  }

  function describeChat(chat) {
    if (!chat) {
      return "Peer communication";
    }

    if (chat.contextType === "global") {
      return "Global campus conversation";
    }

    if (chat.contextType === "admin") {
      return "Direct message with the admin team";
    }

    if (chat.contextType === "item") {
      return chat.itemTitle ? `Private chat about ${chat.itemTitle}` : "Private item inquiry";
    }

    if (chat.contextType === "resource-share") {
      return chat.resourceTitle ? `Shared note thread for ${chat.resourceTitle}` : "Shared note conversation";
    }

    if (chat.contextType === "doubt") {
      return "Private doubt discussion";
    }

    if (chat.contextType === "club") {
      return "Club coordination chat";
    }

    if (chat.contextType === "projectIdea") {
      return "Project collaboration chat";
    }

    if (chat.contextType === "quickSport") {
      return "Quick team formation chat";
    }

    return `${chat.contextType} chat`;
  }

  function formatMessageText(message) {
    const escaped = escapeHtml(message || "");
    const linked = escaped.replace(/((?:https?:\/\/|\/uploads\/)[^\s<]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noreferrer" class="underline underline-offset-4">${url}</a>`;
    });
    return linked.replace(/\n/g, "<br>");
  }

  function promptFields(title, fields) {
    const result = {};
    for (const field of fields) {
      const answer = window.prompt(`${title}\n${field.label}`, field.defaultValue || "");
      if (answer === null) {
        return null;
      }
      result[field.name] = answer.trim();
    }
    return result;
  }

  function populateSelect(select, values, placeholder) {
    if (!select) {
      return;
    }

    select.innerHTML = [`<option value="">${placeholder}</option>`]
      .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
      .join("");
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function formatDateTime(value) {
    if (!value) {
      return "Not scheduled";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function fileInputForDropZone(zone) {
    if (!zone) {
      return null;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.name = "file";
    input.className = "hidden";
    zone.appendChild(input);
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const fileName = input.files?.[0]?.name || "Drag and drop file here";
      zone.querySelector("p").textContent = fileName;
    });
    return input;
  }

  async function loadDashboard() {
    const response = await window.CampusApi.request("/dashboard");
    return response.dashboard;
  }

  async function loadFriendNetworkData() {
    const networkResponse = await window.CampusApi.request("/friends/network");
    return networkResponse.network;
  }

  async function openFriendChat(friendId) {
    const response = await window.CampusApi.request(`/chats/friend/${friendId}`, { method: "POST" });
    window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
  }

  function bootstrap(pageName) {
    document.addEventListener("DOMContentLoaded", async () => {
      setBodyShell();
      const handler = window.CampusPages?.[pageName];
      if (!handler) {
        return;
      }

      try {
        await handler();
      } catch (error) {
        console.error(error);
        toast(error.message || "Something went wrong.", "error");
      }
    });
  }

  window.CampusBootstrap = bootstrap;

  window.CampusPages = {
    async index() {
      const summary = await loadDashboard();
      const heroCards = qsa("section .grid.gap-4 > div").slice(0, 4);
      const statValues = [
        `${summary.counts.resources}+`,
        `${summary.counts.items}+`,
        `${summary.counts.opportunities}+`,
        `${summary.counts.clubs}+`
      ];

      heroCards.forEach((card, index) => {
        const value = card.querySelector(".text-2xl");
        if (value) {
          value.textContent = statValues[index];
        }
      });
    },

    async login() {
      const form = qs("#loginForm");
      const emailInput = qs("#email");
      const passwordInput = qs("#password");
      const message = document.createElement("p");
      message.className = "mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700";
      message.innerHTML = `Use your registered college email and password to sign in. Admins are redirected automatically after login.`;
      form.after(message);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const response = await window.CampusApi.request("/auth/login", {
          method: "POST",
          body: { email, password }
        });

        toast(response.message, "success");
        window.location.href = response.user.isAdmin ? "/admin.html" : "/dashboard.html";
      });
    },

    async register() {
      const form = qs("#registerForm");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const response = await window.CampusApi.request("/auth/register", {
          method: "POST",
          body: {
            name: form.elements.name.value.trim(),
            collegeEmail: form.elements.collegeEmail.value.trim(),
            department: form.elements.department.value.trim(),
            year: form.elements.year.value.trim(),
            registerNumber: form.elements.registerNumber.value.trim(),
            phone: form.elements.phone.value.trim(),
            memberTag: form.elements.memberTag.value.trim(),
            about: form.elements.about.value.trim(),
            password: form.elements.password.value,
            confirmPassword: form.elements.confirmPassword.value
          }
        });

        toast(response.message, "success");
        window.location.href = "/login.html";
      });
    },

      async dashboard() {
        const user = await window.CampusAuth.requireUser();
        if (!user) {
          return;
        }

        const summary = await loadDashboard();
        const [networkResponse, announcementsResponse, resourcesResponse, itemsResponse, clubsResponse, sportsResponse, chatsResponse] = await Promise.all([
          loadFriendNetworkData(),
          window.CampusApi.request("/announcements"),
          window.CampusApi.request("/resources"),
          window.CampusApi.request("/items"),
          window.CampusApi.request("/clubs?moduleType=club"),
          window.CampusApi.request("/clubs?moduleType=sports"),
          window.CampusApi.request("/chats")
        ]);
        const dmShortcut = qs("#dashboardDmShortcut");
        const friendSearchToggle = qs("#dashboardFriendSearchToggle");
        const friendSearchPanel = qs("#dashboardFriendSearchPanel");
        const friendSearchInput = qs("#dashboardFriendSearchInput");
        const friendSearchButton = qs("#dashboardFriendSearchButton");
      const friendSearchResults = qs("#dashboardFriendSearchResults");
      const cards = qsa("main section.mt-8.grid.gap-6.sm\\:grid-cols-2.xl\\:grid-cols-4 > div");
      const values = [
        summary.counts.resources,
        summary.counts.items,
        summary.counts.opportunities,
        summary.counts.clubs
      ];

      applyDirectMessageIcon(dmShortcut);
      cards.forEach((card, index) => {
        const title = card.querySelector("h3");
        if (title) {
          title.classList.add("campus-stat");
          title.textContent = String(values[index]);
        }
      });

        setText(qs("main h2"), "Dashboard Overview");
        setText(qs("main p.mt-1"), `Welcome back, ${user.name}. Manage all your campus activities from one place.`);
        if (dmShortcut) {
          dmShortcut.title = "Open your private messages and shared-note chats";
        }
        const dashboardNotificationSignatures = {
          friendRequests: buildNotificationSignature(networkResponse.incoming || [], [
            (item) => item.id,
            (item) => item.sender?.id,
            (item) => item.createdAt
          ]),
          announcements: buildNotificationSignature(announcementsResponse.announcements || [], [
            (item) => item.id,
            (item) => item.title,
            (item) => item.dateLabel
          ]),
          notes: buildNotificationSignature(resourcesResponse.resources || [], [
            (item) => item.id,
            (item) => item.title,
            (item) => item.createdAt
          ]),
          items: buildNotificationSignature(itemsResponse.items || [], [
            (item) => item.id,
            (item) => item.title,
            (item) => item.createdAt
          ]),
          clubs: buildNotificationSignature(clubsResponse.clubs || [], [
            (item) => item.id,
            (item) => item.name
          ]),
          sports: buildNotificationSignature(sportsResponse.clubs || [], [
            (item) => item.id,
            (item) => item.name
          ]),
          directMessages: buildNotificationSignature(
            (chatsResponse.chats || []).filter((chat) => chat.contextType !== "global"),
            [(item) => item.id, (item) => item.lastMessage?.createdAt, (item) => item.lastMessage?.text]
          ),
          globalChat: buildNotificationSignature(
            (chatsResponse.chats || []).filter((chat) => chat.contextType === "global"),
            [(item) => item.id, (item) => item.lastMessage?.createdAt, (item) => item.lastMessage?.text]
          )
        };
        const dashboardNotifications = prepareNotificationState("student", user.id, dashboardNotificationSignatures);
        bindNotificationIndicators("student", user.id, dashboardNotificationSignatures, dashboardNotifications.unread);
        const activityCards = qsa("main section.mt-8.grid.gap-6.xl\\:grid-cols-3 .space-y-4 > div");
        summary.recentActivity.forEach((activity, index) => {
          if (!activityCards[index]) {
            return;
          }
        setText(activityCards[index].querySelector(".font-medium"), activity.title);
        setText(activityCards[index].querySelector(".text-sm"), activity.description);
      });

        if (!friendSearchInput || !friendSearchButton || !friendSearchResults) {
          return;
        }

        let network = networkResponse;
        let searchResults = [];

      const startFriendChat = async (friendId) => {
        const response = await window.CampusApi.request(`/chats/friend/${friendId}`, { method: "POST" });
        window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
      };

      const getFriendStatus = (studentId) => {
        if (network.friends.some((friend) => friend.id === studentId)) {
          return "friends";
        }

        if (network.incoming.some((request) => request.sender?.id === studentId)) {
          return "incoming";
        }

        if (network.outgoing.some((request) => request.recipient?.id === studentId)) {
          return "outgoing";
        }

        return "none";
      };

      const renderFriendResults = () => {
        friendSearchResults.innerHTML = searchResults.length
          ? searchResults
              .map((student) => {
                const status = getFriendStatus(student.id);
                return `
                <div class="rounded-2xl bg-slate-50 p-4">
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(student.name)}</p>
                      <p class="mt-1 text-sm text-slate-500">Register No: ${escapeHtml(
                        student.registerNumber || "Not added"
                      )}</p>
                      <p class="mt-2 text-sm text-slate-600">${escapeHtml(student.memberTag || "Campus Member")} - ${escapeHtml(
                        student.department || "Department"
                      )}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      ${
                        status === "friends"
                          ? `<button data-dashboard-message="${student.id}" class="rounded-2xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">Message</button>`
                          : status === "incoming"
                            ? `<button data-dashboard-accept="${
                                network.incoming.find((request) => request.sender?.id === student.id)?.id || ""
                              }" class="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Accept</button>`
                            : status === "outgoing"
                              ? `<span class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">Request Sent</span>`
                              : `<button data-dashboard-add="${student.id}" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Add Friend</button>`
                      }
                    </div>
                  </div>
                </div>`;
              })
              .join("")
          : '<div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Search by name or register number to find students.</div>';

        qsa("[data-dashboard-message]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            await startFriendChat(button.dataset.dashboardMessage);
          });
        });

        qsa("[data-dashboard-add]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            const response = await window.CampusApi.request("/friends/requests", {
              method: "POST",
              body: { recipientId: button.dataset.dashboardAdd }
            });
            toast(response.message, "success");
            await loadNetwork();
            renderFriendResults();
          });
        });

        qsa("[data-dashboard-accept]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            await window.CampusApi.request(`/friends/requests/${button.dataset.dashboardAccept}/accept`, {
              method: "PATCH"
            });
            toast("Friend request accepted.", "success");
            await loadNetwork();
            renderFriendResults();
          });
        });
      };

      const loadNetwork = async () => {
        const networkResponse = await window.CampusApi.request("/friends/network");
        network = networkResponse.network || network;
      };

      const searchStudents = async () => {
        const query = friendSearchInput.value.trim();
        if (!query) {
          searchResults = [];
          renderFriendResults();
          return;
        }

        const searchResponse = await window.CampusApi.request(`/users/search?q=${encodeURIComponent(query)}`);
        searchResults = searchResponse.users || [];
        renderFriendResults();
      };

      friendSearchToggle?.addEventListener("click", () => {
        friendSearchPanel?.classList.toggle("hidden");
        if (!friendSearchPanel?.classList.contains("hidden")) {
          friendSearchInput.focus();
        }
      });

      friendSearchButton.addEventListener("click", () => {
        searchStudents();
      });
      friendSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          searchStudents();
        }
      });
      friendSearchInput.addEventListener("input", () => {
        if (!friendSearchInput.value.trim()) {
          searchResults = [];
          renderFriendResults();
        }
      });

        await loadNetwork();
        renderFriendResults();
      },

    async projectIdeas() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const form = qs("#projectIdeaForm");
      const searchInput = qs("#projectIdeasSearch");
      const list = qs("#projectIdeasList");
      if (!form || !searchInput || !list) {
        return;
      }

      const render = async () => {
        const response = await window.CampusApi.request(
          `/project-ideas?search=${encodeURIComponent(searchInput.value.trim())}`
        );

        list.innerHTML = response.ideas.length
          ? response.ideas
              .map(
                (idea) => `
                <article class="rounded-3xl bg-slate-50 p-6 campus-surface">
                  <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 class="text-2xl font-bold text-slate-900">${escapeHtml(idea.title)}</h3>
                      <p class="mt-2 text-sm text-slate-500">Posted by ${escapeHtml(idea.user?.name || "Student")} • Register No: ${escapeHtml(
                        idea.user?.registerNumber || "Not added"
                      )}</p>
                    </div>
                      <div class="flex flex-wrap gap-3">
                        ${
                          idea.authorId !== user.id
                            ? `<button data-project-chat="${idea.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Message</button>`
                            : `<span class="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">Your Project Idea</span>`
                        }
                      </div>
                    </div>
                    <p class="mt-4 text-slate-600">${escapeHtml(idea.description || "")}</p>
                    <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                      <div class="flex flex-col gap-3 md:flex-row">
                        <input data-project-reply-input="${idea.id}" type="text" placeholder="Type your idea or suggestion..." class="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
                        <button data-project-reply="${idea.id}" class="rounded-2xl border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">Post Idea</button>
                      </div>
                    </div>
                    <div class="mt-5 rounded-2xl bg-white p-4">
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold text-slate-900">Student Suggestions</p>
                      <span class="campus-pill">${escapeHtml(String(idea.replies?.length || 0))} ideas</span>
                    </div>
                    <div class="mt-4 space-y-3">
                      ${
                        idea.replies?.length
                          ? idea.replies
                              .map(
                                (reply) => `
                                <div class="rounded-2xl bg-slate-50 p-4">
                                  <p class="text-sm font-semibold text-slate-900">${escapeHtml(reply.user?.name || "Student")}</p>
                                  <p class="mt-2 text-sm text-slate-600">${escapeHtml(reply.content)}</p>
                                </div>`
                              )
                              .join("")
                          : '<div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No student ideas yet. Be the first to contribute.</div>'
                      }
                    </div>
                  </div>
                </article>`
              )
              .join("")
          : emptyState("No project ideas found yet. Post the first one from the form.");

        qsa("[data-project-chat]", list).forEach((button) => {
          button.addEventListener("click", async () => {
            const response = await window.CampusApi.request(`/chats/project-idea/${button.dataset.projectChat}`, {
              method: "POST"
            });
            toast("Project idea chat opened.", "success");
            window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
          });
        });

        qsa("[data-project-reply]", list).forEach((button) => {
          button.addEventListener("click", async () => {
            const input = qs(`[data-project-reply-input="${button.dataset.projectReply}"]`, list);
            const content = String(input?.value || "").trim();
            if (!content) {
              input?.focus();
              return;
            }

            await window.CampusApi.request(`/project-ideas/${button.dataset.projectReply}/replies`, {
              method: "POST",
              body: { content }
            });
            toast("Your idea was added.", "success");
            if (input) {
              input.value = "";
            }
            await render();
          });
        });
      };

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = String(form.elements.title.value || "").trim();
        const description = String(form.elements.description.value || "").trim();
        if (!title || !description) {
          toast("Enter the project title and description.", "error");
          return;
        }

        await window.CampusApi.request("/project-ideas", {
          method: "POST",
          body: { title, description }
        });
        toast("Project idea posted successfully.", "success");
        form.reset();
        await render();
      });

      searchInput.addEventListener("input", render);
      await render();
    },

    async notes() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const searchInput = qs("#notesSearchInput");
      const departmentSelect = qs("#notesDepartmentSelect");
      const difficultySelect = qs("#notesDifficultySelect");
      const section = qs("#notesGrid");
      const studentSearchInput = qs("#studentSearchInput");
      const studentSearchButton = qs("#studentSearchButton");
      const studentResults = qs("#studentSearchResults");
      const selectedFriendBadge = qs("#selectedFriendBadge");
      const doubtsList = qs("#notesDoubtsList");
      let selectedFriend = null;

      populateSelect(departmentSelect, departments, "Department");
      populateSelect(difficultySelect, difficulties, "Difficulty");

      const renderSelectedFriend = () => {
        if (!selectedFriend) {
          selectedFriendBadge.classList.add("hidden");
          selectedFriendBadge.textContent = "";
          return;
        }

        selectedFriendBadge.classList.remove("hidden");
        selectedFriendBadge.textContent = `Sharing to ${selectedFriend.name}`;
      };

      const searchStudents = async () => {
        const query = studentSearchInput.value.trim();
        if (!query) {
          studentResults.innerHTML =
            '<div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Search a friend to share a note privately.</div>';
          return;
        }

        const response = await window.CampusApi.request(`/users/search?q=${encodeURIComponent(query)}`);
        studentResults.innerHTML = response.users.length
          ? response.users
              .map(
                (student) => `
                <button data-student="${student.id}" class="block w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(student.name)}</p>
                      <p class="mt-1 text-sm text-slate-500">Register No: ${escapeHtml(
                        student.registerNumber || student.collegeEmail?.split("@")[0] || "Not added"
                      )}</p>
                      <p class="mt-2 text-sm text-slate-600">${escapeHtml(student.memberTag || "Campus Member")}</p>
                    </div>
                    <span class="campus-pill">${escapeHtml(student.department || "Student")}</span>
                  </div>
                </button>`
              )
              .join("")
          : emptyState("No student found with that roll or register number.");

        qsa("[data-student]", studentResults).forEach((button) => {
          button.addEventListener("click", () => {
            selectedFriend = response.users.find((student) => student.id === button.dataset.student) || null;
            renderSelectedFriend();
            if (selectedFriend) {
              toast(`${selectedFriend.name} selected for note sharing.`, "success");
            }
          });
        });
      };

      const render = async () => {
        const [resourceResponse, doubtsResponse] = await Promise.all([
          window.CampusApi.request(
            `/resources?type=notes&search=${encodeURIComponent(searchInput.value)}&department=${encodeURIComponent(
              departmentSelect.value
            )}&difficulty=${encodeURIComponent(difficultySelect.value)}`
          ),
          window.CampusApi.request(
            `/doubts?search=${encodeURIComponent(searchInput.value)}&department=${encodeURIComponent(
              departmentSelect.value
            )}`
          )
        ]);

        section.innerHTML = resourceResponse.resources.length
          ? resourceResponse.resources
              .map(
                (resource) => `
                <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  <div class="flex items-center justify-between">
                    <span class="campus-pill">${escapeHtml(resource.category)}</span>
                    <span class="text-sm text-slate-400">${escapeHtml(resource.fileType)}</span>
                  </div>
                  <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(resource.title)}</h3>
                  <p class="mt-2 text-sm text-slate-500">Uploaded by ${escapeHtml(resource.uploader?.name || "Campus Member")} • ${escapeHtml(resource.uploader?.memberTag || "Campus Member")}</p>
                  <p class="mt-2 text-sm text-slate-500">${escapeHtml(resource.subject)} • ${escapeHtml(resource.department)}</p>
                  <p class="mt-3 text-slate-600">${escapeHtml(resource.description)}</p>
                  <div class="mt-5 flex flex-wrap gap-3">
                    <a href="${escapeHtml(resource.fileUrl || resource.externalUrl || "#")}" target="_blank" rel="noreferrer" class="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Open</a>
                    <a href="${escapeHtml(resource.fileUrl || resource.externalUrl || "#")}" download class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Download</a>
                    <button data-bookmark="${resource.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">${resource.bookmarked ? "Saved" : "Bookmark"}</button>
                    <button data-share-note="${resource.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Share With Friend</button>
                    ${
                      resource.uploaderId === user.id
                        ? '<button data-delete-note="' + escapeHtml(resource.id) + '" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>'
                        : ""
                    }
                  </div>
                </div>`
                )
                .join("")
            : emptyState("No notes found for the current filters.");

        if (doubtsList) {
          doubtsList.innerHTML = doubtsResponse.doubts.length
            ? doubtsResponse.doubts
                .map(
                  (doubt) => `
                  <article class="rounded-3xl bg-slate-50 p-6 campus-surface">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <span class="campus-pill">${escapeHtml(doubt.status || "open")}</span>
                        <h4 class="mt-4 text-2xl font-bold text-slate-900">${escapeHtml(doubt.title)}</h4>
                        <p class="mt-2 text-sm text-slate-500">${escapeHtml(doubt.subject || "General")} • ${escapeHtml(
                          doubt.department || "Department"
                        )}</p>
                        <p class="mt-4 text-slate-600">${escapeHtml(doubt.description || "")}</p>
                        ${
                          doubt.imageUrl
                            ? `<img src="${escapeHtml(doubt.imageUrl)}" alt="${escapeHtml(doubt.title)}" class="mt-5 h-64 w-full max-w-xl rounded-2xl object-cover">`
                            : ""
                        }
                        <p class="mt-4 text-sm text-slate-500">Posted by ${escapeHtml(doubt.user?.name || "Student")}</p>
                        <p class="mt-2 text-sm text-slate-500">Answers: ${escapeHtml(String(doubt.answers?.length || 0))}</p>
                      </div>
                      <div class="flex flex-wrap gap-3">
                          ${
                            doubt.authorId !== user.id
                              ? `<button data-doubt-chat="${doubt.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Message</button>`
                              : ""
                          }
                         <button data-toggle-note-doubt-answer="${doubt.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Answer</button>
                        </div>
                      </div>
                      ${
                        doubt.answers?.length
                          ? `<div class="mt-5 space-y-3">${doubt.answers
                              .map(
                                (answer) => `
                                  <div class="rounded-2xl bg-white p-4 text-sm text-slate-600">
                                    <div class="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <strong>${escapeHtml(answer.user?.name || "Peer")}:</strong> ${escapeHtml(answer.content)}
                                      </div>
                                      <button data-upvote-note-doubt="${escapeHtml(answer.id)}" class="text-sm font-semibold text-brand-600 hover:text-brand-700">Upvote (${escapeHtml(String(answer.upvotes || 0))})</button>
                                    </div>
                                  </div>`
                              )
                              .join("")}</div>`
                          : `<div class="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-500">No answers yet. Be the first to help.</div>`
                      }
                      <form data-note-doubt-answer-form="${doubt.id}" class="mt-5 hidden rounded-2xl bg-white p-4 shadow-soft">
                        <div class="flex flex-col gap-3 sm:flex-row">
                          <input name="content" type="text" placeholder="Type your answer..." class="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                          <button type="submit" class="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">Post Answer</button>
                        </div>
                      </form>
                    </article>`
                  )
                  .join("")
              : emptyState("No live doubts found for the current filters.");
        }

          qsa("[data-bookmark]", section).forEach((button) => {
            button.addEventListener("click", async () => {
            await window.CampusApi.request(`/resources/${button.dataset.bookmark}/bookmark`, { method: "POST" });
            toast("Bookmark updated.", "success");
            render();
          });
        });

        qsa("[data-share-note]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            if (!selectedFriend) {
              toast("Search and select a student first.", "error");
              studentSearchInput.focus();
              return;
            }

            const response = await window.CampusApi.request(`/resources/${button.dataset.shareNote}/share`, {
              method: "POST",
              body: { recipientId: selectedFriend.id }
            });
            toast(response.message, "success");
            window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
          });
        });

        qsa("[data-delete-note]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            if (!window.confirm("Delete this note permanently?")) {
              return;
            }

            await window.CampusApi.request(`/resources/${button.dataset.deleteNote}`, {
              method: "DELETE"
            });
            toast("Note deleted.", "success");
              render();
            });
          });

          qsa("[data-doubt-chat]", doubtsList || document).forEach((button) => {
            button.addEventListener("click", async () => {
              const response = await window.CampusApi.request(`/chats/doubt/${button.dataset.doubtChat}`, {
                method: "POST"
              });
              toast("Private doubt chat opened.", "success");
              window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
            });
          });

            qsa("[data-toggle-note-doubt-answer]", doubtsList || document).forEach((button) => {
              button.addEventListener("click", async () => {
                const form = qs(`[data-note-doubt-answer-form="${button.dataset.toggleNoteDoubtAnswer}"]`, doubtsList || document);
                form?.classList.toggle("hidden");
                form?.querySelector('input[name="content"]')?.focus();
              });
            });

            qsa("[data-note-doubt-answer-form]", doubtsList || document).forEach((form) => {
              form.addEventListener("submit", async (event) => {
                event.preventDefault();
                const content = form.elements.content.value.trim();
                if (!content) {
                  toast("Type an answer first.", "error");
                  return;
                }
                await window.CampusApi.request(`/doubts/${form.dataset.noteDoubtAnswerForm}/answers`, {
                  method: "POST",
                  body: { content }
                });
                toast("Answer added.", "success");
                render();
              });
            });

          qsa("[data-upvote-note-doubt]", doubtsList || document).forEach((button) => {
            button.addEventListener("click", async () => {
              await window.CampusApi.request(`/doubts/answers/${button.dataset.upvoteNoteDoubt}/upvote`, { method: "POST" });
              toast("Answer upvoted.", "success");
              render();
            });
          });
        };

      studentSearchButton.addEventListener("click", searchStudents);
      studentSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          searchStudents();
        }
      });
      searchInput.addEventListener("input", render);
      [departmentSelect, difficultySelect].forEach((select) => select.addEventListener("change", render));
      renderSelectedFriend();
      render();
    },

    async questionBank() {
      const searchInput = qs('input[placeholder="Search question bank"]');
      const selects = qsa("select");
      populateSelect(selects[0], departments, "Select Department");
      populateSelect(selects[1], ["1", "2", "3", "4"], "Select Year");
      const section = qsa("main section")[1];

      const render = async () => {
        const response = await window.CampusApi.request(
          `/resources?type=question-bank&search=${encodeURIComponent(searchInput.value)}&department=${encodeURIComponent(
            selects[0].value
          )}`
        );

        section.innerHTML = response.resources.length
          ? response.resources
              .map(
                (resource) => `
                <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  <div class="flex items-center justify-between">
                    <span class="campus-pill">${escapeHtml(resource.category)}</span>
                    <span class="text-sm text-slate-400">${escapeHtml(resource.fileType)}</span>
                  </div>
                  <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(resource.title)}</h3>
                  <p class="mt-3 text-slate-600">${escapeHtml(resource.description)}</p>
                  <div class="mt-5 flex gap-3">
                    <a href="${escapeHtml(resource.fileUrl || "#")}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Open</a>
                    <button data-bookmark="${resource.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Save</button>
                  </div>
                </div>`
              )
              .join("")
          : emptyState("No question bank resources found.");

        qsa("[data-bookmark]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            await window.CampusApi.request(`/resources/${button.dataset.bookmark}/bookmark`, { method: "POST" });
            toast("Question bank item saved.", "success");
          });
        });
      };

      searchInput.addEventListener("input", render);
      selects.forEach((select) => select.addEventListener("change", render));
      render();
    },

    async uploadNote() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const form = qs("form");
      const selects = qsa("select", form);
      populateSelect(selects[0], departments, "Select Department");
      populateSelect(selects[1], resourceCategories, "Select Category");
      populateSelect(selects[2], difficulties, "Select Difficulty");
      const fileInput = fileInputForDropZone(qs(".border-dashed", form));

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const inputs = qsa("input", form);
        const textarea = qs("textarea", form);
        const formData = new FormData();
        formData.append("title", inputs[0].value.trim());
        formData.append("department", selects[0].value.trim());
        formData.append("subject", inputs[1].value.trim());
        formData.append("category", selects[1].value.trim());
        formData.append("difficulty", selects[2].value.trim());
        formData.append("description", textarea.value.trim());
        formData.append("type", selects[1].value === "Question Bank" ? "question-bank" : "notes");
        if (fileInput?.files?.[0]) {
          formData.append("file", fileInput.files[0]);
        }

        const response = await window.CampusApi.request("/resources", {
          method: "POST",
          body: formData
        });

        toast(response.message, "success");
        form.reset();
        window.setTimeout(() => {
          window.location.href = "/notes.html";
        }, 1200);
      });
    },

    async doubts() {
      const searchInput = qs('input[placeholder="Search doubts..."]');
      const selects = qsa("select");
      populateSelect(selects[0], departments, "Department");
      const section = qsa("main section")[1];
      const actionButton = qs("main button.rounded-2xl");

      actionButton.addEventListener("click", async () => {
        const user = await window.CampusAuth.requireUser();
        if (!user) {
          return;
        }

        const payload = promptFields("Post Doubt", [
          { name: "title", label: "Doubt title" },
          { name: "subject", label: "Subject" },
          { name: "department", label: "Department", defaultValue: user.department },
          { name: "description", label: "Describe your doubt" }
        ]);

        if (!payload) {
          return;
        }

        await window.CampusApi.request("/doubts", { method: "POST", body: payload });
        toast("Doubt posted successfully.", "success");
        render();
      });

      const render = async () => {
        const response = await window.CampusApi.request(
          `/doubts?search=${encodeURIComponent(searchInput.value)}&department=${encodeURIComponent(selects[0].value)}`
        );

        const subjects = [...new Set(response.doubts.map((item) => item.subject))];
        populateSelect(selects[1], subjects, "Subject");

        const filtered = response.doubts.filter((doubt) => !selects[1].value || doubt.subject === selects[1].value);
        section.innerHTML = filtered.length
          ? filtered
              .map(
                (doubt) => `
                <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <span class="campus-pill">${escapeHtml(doubt.status)}</span>
                      <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(doubt.title)}</h3>
                      <p class="mt-2 text-sm text-slate-500">${escapeHtml(doubt.subject)} • ${escapeHtml(doubt.department)}</p>
                      <p class="mt-3 text-slate-600">${escapeHtml(doubt.description)}</p>
                      <p class="mt-3 text-sm text-slate-500">Answers: ${doubt.answers.length}</p>
                    </div>
                    <button data-answer="${doubt.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Answer</button>
                  </div>
                  ${
                    doubt.answers[0]
                      ? `<div class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>${escapeHtml(
                          doubt.answers[0].user?.name || "Peer"
                        )}:</strong> ${escapeHtml(doubt.answers[0].content)} <button data-upvote="${doubt.answers[0].id}" class="ml-3 text-brand-600">Upvote (${doubt.answers[0].upvotes})</button></div>`
                      : ""
                  }
                </div>`
              )
              .join("")
          : emptyState("No doubts found.");

        qsa("[data-answer]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            const user = await window.CampusAuth.requireUser();
            if (!user) {
              return;
            }

            const content = window.prompt("Enter your answer");
            if (!content) {
              return;
            }
            await window.CampusApi.request(`/doubts/${button.dataset.answer}/answers`, {
              method: "POST",
              body: { content }
            });
            toast("Answer added.", "success");
            render();
          });
        });

        qsa("[data-upvote]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            const user = await window.CampusAuth.requireUser();
            if (!user) {
              return;
            }

            await window.CampusApi.request(`/doubts/answers/${button.dataset.upvote}/upvote`, { method: "POST" });
            toast("Answer upvoted.", "success");
            render();
          });
        });
      };

      searchInput.addEventListener("input", render);
      selects.forEach((select) => select.addEventListener("change", render));
      render();
    },

    async doubts() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const main = qs("main");
      main.innerHTML = `
        <div class="space-y-8">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-3xl font-bold text-slate-900">Ask and Solve Doubts</h2>
              <p class="mt-1 text-slate-500">Post academic doubts instantly, attach an image, and let other students message you directly.</p>
            </div>
            <div class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">No admin approval needed for doubts.</div>
          </div>

            <section class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
              <form id="doubtForm" class="grid gap-4 md:grid-cols-2">
                <input name="title" type="text" placeholder="Doubt title" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 md:col-span-2" />
                <input name="subject" type="text" placeholder="Subject" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              <input name="department" type="text" value="${escapeHtml(user.department || "")}" placeholder="Department" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              <textarea name="description" rows="4" placeholder="Describe your doubt clearly" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 md:col-span-2"></textarea>
              <div class="md:col-span-2">
                <div class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p class="font-medium text-slate-700">Upload doubt image</p>
                  <p class="mt-1 text-sm text-slate-500">Optional screenshot or problem photo</p>
                </div>
              </div>
              <div class="md:col-span-2">
                <button type="submit" class="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">Post Doubt</button>
                </div>
              </form>
            </section>

            <section id="doubtsList" class="space-y-6"></section>
          </div>
        `;

      const form = qs("#doubtForm");
      const submitButton = qs('button[type="submit"]', form);
      const fileInput = fileInputForDropZone(qs(".border-dashed", form));
      if (fileInput) {
        fileInput.accept = "image/*";
      }
        const section = qs("#doubtsList");

        form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = form.elements.title.value.trim();
        const subject = form.elements.subject.value.trim();
        const department = form.elements.department.value.trim();
        const description = form.elements.description.value.trim();

        if (!title || !subject || !description) {
          toast("Please enter title, subject, and description for the doubt.", "error");
          return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("subject", subject);
        formData.append("department", department);
        formData.append("description", description);
        if (fileInput?.files?.[0]) {
          formData.append("image", fileInput.files[0]);
        }

        const originalLabel = submitButton?.textContent;
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Posting...";
        }

        try {
          await window.CampusApi.request("/doubts", {
            method: "POST",
            body: formData
          });
          toast("Doubt posted successfully.", "success");
          form.reset();
          await render();
        } catch (error) {
          toast(error.message || "Unable to post doubt.", "error");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel || "Post Doubt";
          }
        }
      });

        const render = async () => {
          const response = await window.CampusApi.request("/doubts");

          section.innerHTML = response.doubts.length
            ? response.doubts
                .map(
                  (doubt) => `
                <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <span class="campus-pill">${escapeHtml(doubt.status)}</span>
                      <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(doubt.title)}</h3>
                      <p class="mt-2 text-sm text-slate-500">${escapeHtml(doubt.subject || "General")} • ${escapeHtml(doubt.department || "Department")}</p>
                      <p class="mt-3 text-slate-600">${escapeHtml(doubt.description)}</p>
                      ${
                        doubt.imageUrl
                          ? `<img src="${escapeHtml(doubt.imageUrl)}" alt="${escapeHtml(doubt.title)}" class="mt-4 h-52 w-full max-w-md rounded-2xl object-cover">`
                          : ""
                      }
                      <p class="mt-3 text-sm text-slate-500">Posted by ${escapeHtml(doubt.user?.name || "Student")}</p>
                      <p class="mt-3 text-sm text-slate-500">Answers: ${doubt.answers.length}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      ${
                        doubt.authorId !== user.id
                          ? `<button data-doubt-chat="${doubt.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Message</button>`
                          : ""
                      }
                      <button data-answer="${doubt.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Answer</button>
                    </div>
                  </div>
                  ${
                    doubt.answers[0]
                      ? `<div class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><strong>${escapeHtml(
                          doubt.answers[0].user?.name || "Peer"
                        )}:</strong> ${escapeHtml(doubt.answers[0].content)} <button data-upvote="${doubt.answers[0].id}" class="ml-3 text-brand-600">Upvote (${doubt.answers[0].upvotes})</button></div>`
                      : ""
                  }
                </div>`
                )
                .join("")
            : emptyState("No doubts found.");

        qsa("[data-doubt-chat]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            const response = await window.CampusApi.request(`/chats/doubt/${button.dataset.doubtChat}`, {
              method: "POST"
            });
            toast("Private doubt chat opened.", "success");
            window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
          });
        });

        qsa("[data-answer]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            const content = window.prompt("Enter your answer");
            if (!content) {
              return;
            }
            await window.CampusApi.request(`/doubts/${button.dataset.answer}/answers`, {
              method: "POST",
              body: { content }
            });
            toast("Answer added.", "success");
            render();
          });
        });

        qsa("[data-upvote]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            await window.CampusApi.request(`/doubts/answers/${button.dataset.upvote}/upvote`, { method: "POST" });
            toast("Answer upvoted.", "success");
            render();
          });
        });
        };

        render();
      },

    async items() {
      document.title = "Items | Campus Connect";
      const main = qs("main");
      const currentUser = await window.CampusAuth.getUser();
      main.innerHTML = `
        <div class="space-y-8">
          <div>
            <h2 class="text-3xl font-bold text-slate-900">Student Item Sharing</h2>
            <p class="mt-1 text-slate-500">Books, calculators, lab kits, approved listings, and emergency needs shared by students.</p>
          </div>
          <section class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
            <div class="grid gap-4 md:grid-cols-2">
              <input id="itemSearch" type="text" placeholder="Search items" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              <select id="itemType" class="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500"></select>
            </div>
          </section>
          <section id="itemsGrid" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3"></section>
        </div>
        <div id="itemOwnerProfileModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/40 px-6 py-10">
          <div class="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-soft">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">Student Profile</p>
                <h3 id="itemOwnerProfileName" class="mt-3 text-3xl font-bold text-slate-900">Student Name</h3>
                <p id="itemOwnerProfileEmail" class="mt-2 text-sm text-slate-500">student@student.annauniv.edu</p>
              </div>
              <button id="itemOwnerProfileClose" type="button" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Close</button>
            </div>

            <div class="mt-8 grid gap-4 md:grid-cols-2">
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-400">Register Number</p>
                <p id="itemOwnerProfileRegisterNumber" class="mt-2 font-semibold text-slate-900">Not added</p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-400">Department</p>
                <p id="itemOwnerProfileDepartment" class="mt-2 font-semibold text-slate-900">Not added</p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-400">Academic Year</p>
                <p id="itemOwnerProfileYear" class="mt-2 font-semibold text-slate-900">Not added</p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-400">Phone Number</p>
                <p id="itemOwnerProfilePhone" class="mt-2 font-semibold text-slate-900">Not added</p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <p class="text-xs uppercase tracking-wide text-slate-400">Member Tag</p>
                <p id="itemOwnerProfileMemberTag" class="mt-2 font-semibold text-slate-900">Campus Member</p>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <p class="text-xs uppercase tracking-wide text-slate-400">About</p>
                <p id="itemOwnerProfileAbout" class="mt-2 leading-7 text-slate-700">No description added.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      populateSelect(qs("#itemType"), itemTypes, "All Item Types");
      const itemsGrid = qs("#itemsGrid");
      const profileModal = qs("#itemOwnerProfileModal");
      const profileCloseButton = qs("#itemOwnerProfileClose");
      const profileName = qs("#itemOwnerProfileName");
      const profileEmail = qs("#itemOwnerProfileEmail");
      const profileRegisterNumber = qs("#itemOwnerProfileRegisterNumber");
      const profileDepartment = qs("#itemOwnerProfileDepartment");
      const profileYear = qs("#itemOwnerProfileYear");
      const profilePhone = qs("#itemOwnerProfilePhone");
      const profileMemberTag = qs("#itemOwnerProfileMemberTag");
      const profileAbout = qs("#itemOwnerProfileAbout");
      let itemOwnerMap = new Map();

      const closeItemOwnerProfile = () => {
        if (!profileModal) {
          return;
        }

        profileModal.classList.add("hidden");
        profileModal.classList.remove("flex");
      };

      const openItemOwnerProfile = (ownerId) => {
        const owner = itemOwnerMap.get(ownerId);
        if (!profileModal || !owner) {
          return;
        }

        setText(profileName, owner.name || "Student Name");
        setText(profileEmail, owner.collegeEmail || "No email added");
        setText(profileRegisterNumber, owner.registerNumber || "Not added");
        setText(profileDepartment, owner.department || "Not added");
        setText(profileYear, owner.year || "Not added");
        setText(profilePhone, owner.phone || "Not added");
        setText(profileMemberTag, owner.memberTag || "Campus Member");
        setText(profileAbout, owner.about || "No description added.");
        profileModal.classList.remove("hidden");
        profileModal.classList.add("flex");
      };

      const render = async () => {
        const response = await window.CampusApi.request(
          `/items?search=${encodeURIComponent(qs("#itemSearch").value)}&itemType=${encodeURIComponent(qs("#itemType").value)}`
        );
        itemOwnerMap = new Map(
          response.items
            .filter((item) => item.owner?.id)
            .map((item) => [item.owner.id, item.owner])
        );

        itemsGrid.innerHTML = response.items.length
          ? response.items
              .map(
                (item) => `
                <article class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  ${
                    item.imageUrl
                      ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="h-44 w-full rounded-2xl object-cover">`
                      : `<div class="flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-400">No Image</div>`
                  }
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="campus-pill">${escapeHtml(item.itemType)}</span>
                    ${
                      item.isEmergency
                        ? '<span class="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Emergency Need</span>'
                        : ""
                    }
                  </div>
                  <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(item.title)}</h3>
                  <p class="mt-2 text-sm text-slate-500">${
                    item.isEmergency
                      ? `Emergency need - posted live by ${escapeHtml(item.owner?.name || "student")}`
                      : `${escapeHtml(item.itemType || "Campus Item")} - ${escapeHtml(item.status)}`
                  }</p>
                  <p class="mt-3 text-slate-600">${escapeHtml(item.description)}</p>
                  <div class="mt-4 flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-900">${escapeHtml(item.priceValue)}</span>
                    ${
                      currentUser && item.ownerId === currentUser.id
                        ? `<div class="flex items-center gap-3"><span class="campus-muted-badge">Your Listing</span><button data-delete-item="${item.id}" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button></div>`
                        : `<div class="flex flex-wrap justify-end gap-3">
                             <button data-view-item-owner="${escapeHtml(item.owner?.id || "")}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">View Profile</button>
                             <button data-item-chat="${item.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Message</button>
                           </div>`
                    }
                  </div>
                </article>`
              )
              .join("")
          : emptyState("No items found.");

        qsa("[data-view-item-owner]", itemsGrid).forEach((button) => {
          button.addEventListener("click", () => {
            openItemOwnerProfile(button.dataset.viewItemOwner);
          });
        });

        qsa("[data-item-chat]", itemsGrid).forEach((button) => {
          button.addEventListener("click", async () => {
            const user = await window.CampusAuth.requireUser();
            if (!user) {
              return;
            }

            const response = await window.CampusApi.request(`/chats/item/${button.dataset.itemChat}`, {
              method: "POST"
            });
            toast("Private item chat opened.", "success");
            window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
          });
        });

        qsa("[data-delete-item]", itemsGrid).forEach((button) => {
          button.addEventListener("click", async () => {
            if (!window.confirm("Delete this item permanently?")) {
              return;
            }

            await window.CampusApi.request(`/items/${button.dataset.deleteItem}`, {
              method: "DELETE"
            });
            toast("Item deleted.", "success");
            render();
          });
        });
      };

      ["#itemSearch", "#itemType"].forEach((selector) => {
        qs(selector).addEventListener(selector === "#itemSearch" ? "input" : "change", render);
      });
      profileCloseButton?.addEventListener("click", closeItemOwnerProfile);
      profileModal?.addEventListener("click", (event) => {
        if (event.target === profileModal) {
          closeItemOwnerProfile();
        }
      });
      render();
    },

    async createItem() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const form = qs("#createItemForm");
      const itemTypeSelect = qs('select[name="itemType"]', form);
      const submitButton = qs('button[type="submit"]', form);
      const emergencyCheckbox = qs('input[name="isEmergency"]', form);
      populateSelect(itemTypeSelect, itemTypes, "Select Item Type");
      const fileInput = fileInputForDropZone(qs(".border-dashed", form));
      if (fileInput) {
        fileInput.accept = "image/*";
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = form.elements.title.value.trim();
        const itemType = form.elements.itemType.value.trim();
        const priceType = form.elements.priceType.value.trim();
        const priceValue = form.elements.priceValue.value.trim();
        const description = form.elements.description.value.trim();
        const isEmergency = Boolean(emergencyCheckbox?.checked);

        if (!title) {
          toast("Enter an item title.", "error");
          form.elements.title.focus();
          return;
        }

        if (!itemType) {
          toast("Select an item type.", "error");
          form.elements.itemType.focus();
          return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("itemType", itemType);
        formData.append("priceType", priceType);
        formData.append("priceValue", priceValue);
        formData.append("description", description);
        formData.append("isEmergency", String(isEmergency));
        if (fileInput?.files?.[0]) {
          formData.append("image", fileInput.files[0]);
        }

        const originalLabel = submitButton?.textContent;
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Submitting...";
        }

        try {
          const response = await window.CampusApi.request("/items", {
            method: "POST",
            body: formData
          });

          toast(response.message, "success");
          window.setTimeout(() => {
            window.location.href = "/items.html";
          }, 1200);
        } catch (error) {
          toast(error.message || "Unable to submit listing.", "error");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel || "Submit Listing";
          }
        }
      });

      emergencyCheckbox?.addEventListener("change", () => {
        if (submitButton) {
          submitButton.textContent = emergencyCheckbox.checked ? "Post Emergency Need" : "Submit Listing";
        }
      });
    },

    async lostFound() {
      const button = qs("header button");
      const section = qsa("main section")[0];
      button.addEventListener("click", async () => {
        const user = await window.CampusAuth.requireUser();
        if (!user) {
          return;
        }

        const payload = promptFields("Create Lost & Found Post", [
          { name: "postType", label: "Type: lost or found", defaultValue: "lost" },
          { name: "title", label: "Title" },
          { name: "location", label: "Location" },
          { name: "contact", label: "Contact", defaultValue: user.collegeEmail },
          { name: "description", label: "Description" }
        ]);

        if (!payload) {
          return;
        }

        await window.CampusApi.request("/lost-found", { method: "POST", body: payload });
        toast("Post created.", "success");
        render();
      });

      const render = async () => {
        const response = await window.CampusApi.request("/lost-found");
        section.innerHTML = response.posts.length
          ? response.posts
              .map(
                (post) => `
                <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                  <span class="campus-pill">${escapeHtml(post.postType)}</span>
                  <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(post.title)}</h3>
                  <p class="mt-2 text-sm text-slate-500">${escapeHtml(post.location)} • ${escapeHtml(post.contact)}</p>
                  <p class="mt-3 text-slate-600">${escapeHtml(post.description)}</p>
                </div>`
              )
              .join("")
          : emptyState("No lost and found posts yet.");
      };

      render();
    },

    async announcements() {
      const section = qsa("main section")[0];
      const response = await window.CampusApi.request("/announcements");
      section.innerHTML = response.announcements.length
        ? response.announcements
            .map(
              (item) => `
              <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                <div class="flex items-center justify-between">
                  <span class="campus-pill">${escapeHtml(item.tag)}</span>
                  <span class="text-sm text-slate-400">${escapeHtml(item.dateLabel)}</span>
                </div>
                <h3 class="mt-4 text-2xl font-bold text-slate-900">${escapeHtml(item.title)}</h3>
                <p class="mt-3 text-slate-600">${escapeHtml(item.description)}</p>
              </div>`
            )
            .join("")
        : emptyState("No announcements available.");
    },

    async createUpdate() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      if (!user.isAdmin) {
        toast("Admin access only.", "error");
        window.location.href = "/admin.html";
        return;
      }

      const form = qs("#createUpdateForm");
      const tagSelect = qs('select[name="tag"]', form);
      const dateInput = qs('input[name="dateLabel"]', form);

      populateSelect(tagSelect, ["Announcement", "Workshop", "Symposium", "Placement", "Event"], "Select Tag");
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toLocaleDateString("en-GB");
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const response = await window.CampusApi.request("/announcements", {
          method: "POST",
          body: {
            tag: qs('select[name="tag"]', form).value.trim(),
            title: qs('input[name="title"]', form).value.trim(),
            dateLabel: qs('input[name="dateLabel"]', form).value.trim(),
            description: qs('textarea[name="description"]', form).value.trim()
          }
        });

        toast(response.message, "success");
        form.reset();
        window.setTimeout(() => {
          window.location.href = "/admin.html?view=announcements";
        }, 900);
      });
    },

    async internships() {
        window.location.replace("/project-ideas.html");
      },

    async clubs() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const params = getSearchParams();
      if (params.get("request") === "submitted") {
        toast("Club request submitted. Admin can review it in Club Requests.", "success");
      }

      const section = qsa("main section")[0];
      if (!section) {
        return;
      }

      const response = await window.CampusApi.request("/clubs?moduleType=club");
      const render = () => {
        section.innerHTML = response.clubs.length
        ? response.clubs
            .map(
              (club) => `
              <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                ${
                  club.logoUrl
                    ? `<img src="${escapeHtml(club.logoUrl)}" alt="${escapeHtml(club.name)} logo" class="h-44 w-full rounded-2xl object-cover">`
                    : `<div class="flex h-44 items-center justify-center rounded-2xl bg-gradient-to-br ${escapeHtml(
                        club.coverColor || "from-brand-100 via-white to-cyan-100"
                      )} text-5xl">🎓</div>`
                }
                <div class="mt-5 flex items-center justify-between gap-3">
                  <h3 class="text-xl font-bold text-slate-900">${escapeHtml(club.name)}</h3>
                  <span class="campus-pill">${club.recruiting ? "Open to Join" : "Private Club"}</span>
                </div>
                <p class="mt-3 text-slate-600">${escapeHtml(club.description || "")}</p>
                <div class="mt-4 space-y-2 text-sm text-slate-500">
                  <p>Club Access: <span class="font-semibold text-slate-800">${escapeHtml(club.ownerName || "Club Head")}</span></p>
                  <p>Register No: ${escapeHtml(club.ownerRegisterNumber || "Not added")}</p>
                  <p>Department: ${escapeHtml(club.ownerDepartment || "Department pending")}</p>
                  <p>Members: ${escapeHtml(String(club.memberCount || (club.viewerRole ? 1 : 0) || 0))}</p>
                  ${
                    club.latestOpenCall
                      ? `<p>Open Call: ${escapeHtml(formatDateTime(club.latestOpenCall.opensAt))} to ${escapeHtml(formatDateTime(club.latestOpenCall.closesAt))}</p>`
                      : `<p>Open Call: Not scheduled</p>`
                  }
                </div>
                <div class="mt-5 flex flex-wrap gap-3">
                  ${
                    club.canAccess
                      ? `<a href="/club-room.html?club=${encodeURIComponent(club.id)}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Enter Club</a>`
                      : club.canJoin
                        ? `<button data-join-club="${club.id}" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Join Club</button>`
                        : `<span class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">${
                            club.latestOpenCall?.status === "scheduled" ? "Open Call Scheduled" : "Head Access Only"
                          }</span>`
                  }
                </div>
              </div>`
            )
            .join("")
        : emptyState("No verified clubs available yet. Once admin creates a club from a student request, it will appear here.");
        
        qsa("[data-join-club]", section).forEach((button) => {
          button.addEventListener("click", async () => {
            const joinResponse = await window.CampusApi.request(`/clubs/${button.dataset.joinClub}/join`, {
              method: "POST"
            });
            toast(joinResponse.message, "success");
            window.location.href = `/club-room.html?club=${encodeURIComponent(button.dataset.joinClub)}`;
          });
        });
      };

      render();
    },

    async createClubRequest() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

        const form = qs("#clubRequestForm");
        form.elements.clubHead.value = user.name || "";
        form.elements.registerNumber.value = user.registerNumber || "";
        form.elements.department.value = user.department || "";
        form.elements.phone.value = user.phone || "";
        form.elements.collegeEmail.value = user.collegeEmail || "";
        form.elements.clubHead.readOnly = true;
        form.elements.registerNumber.readOnly = true;
        form.elements.collegeEmail.readOnly = true;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("clubName", form.elements.clubName.value.trim());
        formData.append("clubHead", form.elements.clubHead.value.trim());
        formData.append("registerNumber", form.elements.registerNumber.value.trim());
        formData.append("department", form.elements.department.value.trim());
        formData.append("phone", form.elements.phone.value.trim());
        formData.append("collegeEmail", form.elements.collegeEmail.value.trim());
        formData.append("description", form.elements.description.value.trim());

        if (form.elements.passportPhoto.files?.[0]) {
          formData.append("passportPhoto", form.elements.passportPhoto.files[0]);
        }

        if (form.elements.collegeIdCard.files?.[0]) {
          formData.append("collegeIdCard", form.elements.collegeIdCard.files[0]);
        }

        if (form.elements.clubLogo.files?.[0]) {
          formData.append("clubLogo", form.elements.clubLogo.files[0]);
        }

        if (form.elements.clubHeadProof.files?.[0]) {
          formData.append("clubHeadProof", form.elements.clubHeadProof.files[0]);
        }

        const response = await window.CampusApi.request("/clubs/requests", {
          method: "POST",
          body: formData
        });

        toast(response.message, "success");
        window.location.href = "/clubs.html?request=submitted";
      });
    },

    async createSportRequest() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const form = qs("#sportRequestForm");
      form.elements.sportHead.value = user.name || "";
      form.elements.registerNumber.value = user.registerNumber || "";
      form.elements.department.value = user.department || "";
      form.elements.phone.value = user.phone || "";
      form.elements.collegeEmail.value = user.collegeEmail || "";

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("sportName", form.elements.sportName.value.trim());
        formData.append("sportHead", form.elements.sportHead.value.trim());
        formData.append("registerNumber", form.elements.registerNumber.value.trim());
        formData.append("department", form.elements.department.value.trim());
        formData.append("phone", form.elements.phone.value.trim());
        formData.append("collegeEmail", form.elements.collegeEmail.value.trim());
        formData.append("description", form.elements.description.value.trim());

        if (form.elements.passportPhoto.files?.[0]) {
          formData.append("passportPhoto", form.elements.passportPhoto.files[0]);
        }

        if (form.elements.collegeIdCard.files?.[0]) {
          formData.append("collegeIdCard", form.elements.collegeIdCard.files[0]);
        }

        if (form.elements.sportHeadProof.files?.[0]) {
          formData.append("sportHeadProof", form.elements.sportHeadProof.files[0]);
        }

        if (form.elements.sportImage.files?.[0]) {
          formData.append("sportImage", form.elements.sportImage.files[0]);
        }

        const response = await window.CampusApi.request("/sports/requests", {
          method: "POST",
          body: formData
        });

        toast(response.message, "success");
        window.location.href = "/sports.html?request=submitted";
      });
    },

    async createClub() {
      const user = await window.CampusAuth.getUser(true);
      if (!user?.isAdmin) {
        window.location.href = "/login.html";
        return;
      }

      const params = getSearchParams();
      const requestId = params.get("request");
      if (!requestId) {
        toast("Club request id is missing.", "error");
        window.location.href = "/admin.html?view=clubs";
        return;
      }

        const form = qs("#createClubForm");
        const layout = qs("#createClubLayout");
      const title = qs("#createClubPageTitle");
      const subtitle = qs("#createClubPageSubtitle");
      const requestResponse = await window.CampusApi.request(`/clubs/requests/${encodeURIComponent(requestId)}`);
      const request = requestResponse.request;
      const isSportRequest = request.requestType === "sport";
      const requestResource = isSportRequest ? "sports" : "clubs";
      const displayName = isSportRequest ? "Sport Team" : "Club";
      const ownerLabel = isSportRequest ? "Sport Head" : "Club Head";

      document.title = `${isSportRequest ? "Create Sport Team" : "Create Club"} | Campus Connect`;
      setText(title, request.clubName || `Create ${displayName}`);
      setText(
        subtitle,
        `Verified student request from ${request.clubHead || "student"} (${request.registerNumber || "register number pending"}).`
      );

      const eyebrow = qs("header .text-xs");
      if (eyebrow) {
        eyebrow.textContent = isSportRequest ? "Admin Sport Verification" : "Admin Club Verification";
      }
      const backLink = qs("header a");
      if (backLink) {
        backLink.href = `/admin.html?view=${requestResource}`;
        backLink.textContent = isSportRequest ? "Back to Sport Requests" : "Back to Club Requests";
      }
      const labels = qsa("label", form);
      if (labels[0]) {
        labels[0].textContent = isSportRequest ? "Sport Team Name" : "Club Name";
      }
      if (labels[4]) {
        labels[4].textContent = isSportRequest ? "Sport Image URL" : "Club Logo URL";
      }
        const submitButton = qs("#createClubForm button[type='submit']");
        if (submitButton) {
          submitButton.textContent = isSportRequest ? "Create Sport Team" : "Create Club";
        }
        layout?.classList.remove("lg:grid-cols-[1.15fr_0.85fr]");

      form.elements.name.value = request.clubName || "";
      form.elements.description.value = request.description || "";
      form.elements.ownerName.value = request.clubHead || "";
      form.elements.ownerRegisterNumber.value = request.registerNumber || "";
      form.elements.ownerDepartment.value = request.department || "";
      form.elements.ownerCollegeEmail.value = request.collegeEmail || "";
      form.elements.logoUrl.value = request.clubLogoUrl || "";

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = {
          name: form.elements.name.value.trim(),
          description: form.elements.description.value.trim(),
          moduleType: isSportRequest ? "sports" : "club",
          recruiting: form.elements.recruiting.value,
          logoUrl: form.elements.logoUrl.value.trim()
        };

        await window.CampusApi.request(`/${requestResource}/requests/${encodeURIComponent(requestId)}/create`, {
          method: "POST",
          body: payload
        });

        toast(`${displayName} created after verification.`, "success");
        window.location.href = `/admin.html?view=${requestResource}&created=true`;
      });
    },

    async clubRoom() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const params = getSearchParams();
      const clubId = params.get("club");
      if (!clubId) {
        toast("Club id is missing.", "error");
        window.location.href = "/clubs.html";
        return;
      }

      const response = await window.CampusApi.request(`/clubs/${encodeURIComponent(clubId)}/room`);
      const club = response.club;
      const membership = response.membership;
      const isHead = response.isHead;
      const chat = response.chat;

      setText(qs("#clubRoomTitle"), club.name || "Club Room");
      setText(qs("#clubRoomSubtitle"), club.description || "Member-only club room");
      setText(qs("#clubRoomOwner"), club.ownerName || "Club Head");
      setText(qs("#clubRoomOwnerMeta"), `${club.ownerDepartment || "Department"} • Register No: ${club.ownerRegisterNumber || "Not added"}`);
      setText(qs("#clubRoomRole"), isHead ? "Club Head Access" : `${membership.role || "member"} access`);
      setText(qs("#clubRoomMemberCount"), String(club.members?.length || 0));
      setText(qs("#clubRoomAnnouncementCount"), String(club.announcements?.length || 0));
      setText(qs("#clubRoomOpenCallCount"), String(club.openCalls?.length || 0));

      const logo = qs("#clubRoomLogo");
      if (logo) {
        if (club.logoUrl) {
          logo.innerHTML = `<img src="${escapeHtml(club.logoUrl)}" alt="${escapeHtml(club.name)} logo" class="h-full w-full rounded-3xl object-cover">`;
        } else {
          logo.className = `flex h-64 items-center justify-center rounded-3xl bg-gradient-to-br ${escapeHtml(
            club.coverColor || "from-brand-100 via-white to-cyan-100"
          )} text-6xl`;
          logo.textContent = "🎓";
        }
      }

      const chatLink = qs("#clubRoomChatLink");
      if (chatLink && chat?.id) {
        chatLink.href = `/chat.html?thread=${encodeURIComponent(chat.id)}`;
      }

      const membersList = qs("#clubMembersList");
      if (membersList) {
        membersList.innerHTML = club.members?.length
          ? club.members
              .map(
                (entry) => `
                <div class="rounded-2xl bg-slate-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(entry.user?.name || "Member")}</p>
                      <p class="mt-1 text-sm text-slate-500">${escapeHtml(entry.user?.registerNumber || "Not added")} • ${escapeHtml(
                        entry.user?.department || "Department"
                      )}</p>
                    </div>
                    <span class="campus-pill">${escapeHtml(entry.role || "member")}</span>
                  </div>
                </div>`
              )
              .join("")
          : emptyState("No members inside this club yet.");
      }

      const announcementsList = qs("#clubAnnouncementsList");
      const renderAnnouncements = (announcements) => {
        if (!announcementsList) {
          return;
        }

        announcementsList.innerHTML = announcements?.length
          ? announcements
              .map(
                (announcement) => `
                <div class="rounded-2xl bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(announcement.title)}</p>
                      <p class="mt-1 text-sm text-slate-500">Posted by ${escapeHtml(announcement.authorName || "Club Head")} on ${escapeHtml(formatDateTime(announcement.createdAt))}</p>
                    </div>
                  </div>
                  <p class="mt-3 text-sm text-slate-600">${escapeHtml(announcement.description || "")}</p>
                </div>`
              )
              .join("")
          : emptyState("No club announcements posted yet.");
      };
      renderAnnouncements(club.announcements || []);

      const openCallsList = qs("#clubOpenCallsList");
      const renderOpenCalls = (openCalls) => {
        if (!openCallsList) {
          return;
        }

        openCallsList.innerHTML = openCalls?.length
          ? openCalls
              .map(
                (openCall) => `
                <div class="rounded-2xl bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(openCall.title || "Open Call")}</p>
                      <p class="mt-1 text-sm text-slate-500">${escapeHtml(formatDateTime(openCall.opensAt))} to ${escapeHtml(formatDateTime(openCall.closesAt))}</p>
                    </div>
                    <span class="campus-pill">${escapeHtml(openCall.status || "scheduled")}</span>
                  </div>
                  <p class="mt-3 text-sm text-slate-600">${escapeHtml(openCall.description || "")}</p>
                </div>`
              )
              .join("")
          : emptyState("No open calls scheduled by the club head.");
      };
      renderOpenCalls(club.openCalls || []);

      const headControls = qs("#clubHeadControls");
      if (headControls) {
        headControls.classList.toggle("hidden", !isHead);
      }

      const openCallForm = qs("#clubOpenCallForm");
      if (openCallForm && isHead) {
        openCallForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const scheduleResponse = await window.CampusApi.request(`/clubs/${encodeURIComponent(clubId)}/open-calls`, {
            method: "POST",
            body: {
              title: openCallForm.elements.title.value.trim(),
              description: openCallForm.elements.description.value.trim(),
              opensAt: openCallForm.elements.opensAt.value,
              closesAt: openCallForm.elements.closesAt.value
            }
          });
          toast(scheduleResponse.message, "success");
          club.openCalls = [scheduleResponse.openCall].concat(club.openCalls || []);
          renderOpenCalls(club.openCalls);
          setText(qs("#clubRoomOpenCallCount"), String(club.openCalls.length));
          openCallForm.reset();
        });
      }

      const announcementForm = qs("#clubAnnouncementForm");
      if (announcementForm && isHead) {
        announcementForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const announcementResponse = await window.CampusApi.request(`/clubs/${encodeURIComponent(clubId)}/announcements`, {
            method: "POST",
            body: {
              title: announcementForm.elements.title.value.trim(),
              description: announcementForm.elements.description.value.trim()
            }
          });
          toast(announcementResponse.message, "success");
          club.announcements = [announcementResponse.announcement].concat(club.announcements || []);
          renderAnnouncements(club.announcements);
          setText(qs("#clubRoomAnnouncementCount"), String(club.announcements.length));
          announcementForm.reset();
        });
      }
    },

    async sports() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const params = getSearchParams();
      if (params.get("request") === "submitted") {
        toast("Sports request submitted. Admin can review it in Sports Requests.", "success");
      }

      const verifiedSportsList = qs("#verifiedSportsList");
      if (!verifiedSportsList) {
        return;
      }

      const renderVerifiedSports = (clubs) => {
        verifiedSportsList.innerHTML = clubs.length
          ? clubs
              .map(
                (club) => `
                <div class="rounded-3xl bg-slate-50 p-6 campus-surface">
                  ${
                    club.logoUrl
                      ? `<img src="${escapeHtml(club.logoUrl)}" alt="${escapeHtml(club.name)} logo" class="h-44 w-full rounded-2xl object-cover">`
                      : `<div class="flex h-44 items-center justify-center rounded-2xl bg-gradient-to-br ${escapeHtml(
                          club.coverColor || "from-brand-100 via-white to-cyan-100"
                        )} text-5xl">🏅</div>`
                  }
                  <div class="mt-5 flex items-center justify-between gap-3">
                    <h3 class="text-xl font-bold text-slate-900">${escapeHtml(club.name)}</h3>
                    <span class="campus-pill">${club.recruiting ? "Open Trials" : "Head Access Only"}</span>
                  </div>
                  <p class="mt-3 text-slate-600">${escapeHtml(club.description || "")}</p>
                  <div class="mt-4 space-y-2 text-sm text-slate-500">
                    <p>Sport Head: <span class="font-semibold text-slate-800">${escapeHtml(club.ownerName || "Sport Head")}</span></p>
                    <p>Register No: ${escapeHtml(club.ownerRegisterNumber || "Not added")}</p>
                    <p>Department: ${escapeHtml(club.ownerDepartment || "Department pending")}</p>
                    <p>Members: ${escapeHtml(String(club.memberCount || (club.viewerRole ? 1 : 0) || 0))}</p>
                    ${
                      club.latestOpenCall
                        ? `<p>Open Call: ${escapeHtml(formatDateTime(club.latestOpenCall.opensAt))} to ${escapeHtml(formatDateTime(club.latestOpenCall.closesAt))}</p>`
                        : `<p>Open Call: Not scheduled</p>`
                    }
                  </div>
                  <div class="mt-5 flex flex-wrap gap-3">
                    ${
                      club.canAccess
                        ? `<a href="/club-room.html?club=${encodeURIComponent(club.id)}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Enter Sport</a>`
                        : club.canJoin
                          ? `<button data-join-sport="${club.id}" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Join Sport</button>`
                          : `<span class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">${
                              club.latestOpenCall?.status === "scheduled" ? "Open Call Scheduled" : "Head Access Only"
                            }</span>`
                    }
                  </div>
                </div>`
              )
              .join("")
          : emptyState("No verified sports teams available yet. Once admin creates a sport team from a student request, it will appear here.");

        qsa("[data-join-sport]", verifiedSportsList).forEach((button) => {
          button.addEventListener("click", async () => {
            const joinResponse = await window.CampusApi.request(`/clubs/${button.dataset.joinSport}/join`, {
              method: "POST"
            });
            toast(joinResponse.message, "success");
            window.location.href = `/club-room.html?club=${encodeURIComponent(button.dataset.joinSport)}`;
          });
        });
      };

      const sportsResponse = await window.CampusApi.request("/clubs?moduleType=sports");
      renderVerifiedSports(sportsResponse.clubs || []);
    },

    async quickTeamFormation() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const quickForm = qs("#quickSportForm");
      const quickSportList = qs("#quickSportList");
      if (!quickForm || !quickSportList) {
        return;
      }

      const renderQuickTeams = (quickTeams) => {
        quickSportList.innerHTML = quickTeams.length
          ? quickTeams
              .map(
                (team) => `
                <article class="rounded-3xl bg-slate-50 p-5 campus-surface">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <span class="campus-pill">Quick ${escapeHtml(team.sportName)}</span>
                      <h4 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(team.sportName)} Team Call</h4>
                    </div>
                    <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live Now</span>
                  </div>
                  <div class="mt-4 space-y-2 text-sm text-slate-500">
                    <p>Organizer: <span class="font-semibold text-slate-800">${escapeHtml(team.authorName || "Student")}</span></p>
                    <p>Register No: ${escapeHtml(team.authorRegisterNumber || "Not added")}</p>
                    <p>Department: ${escapeHtml(team.authorDepartment || "Not added")}</p>
                    <p>Play Time: ${escapeHtml(formatDateTime(team.playAt))}</p>
                    <p>Location: ${escapeHtml(team.location || "Location not added")}</p>
                    <p>Players Needed: ${escapeHtml(String(team.playersNeeded || 0))}</p>
                  </div>
                  <p class="mt-4 text-sm text-slate-600">${escapeHtml(team.description || "Quick sports formation shared for students.")}</p>
                  <div class="mt-5 flex flex-wrap gap-3">
                    ${
                      team.canDelete
                        ? `<span class="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">Your Quick Team</span>
                           <button data-delete-quick-sport="${team.id}" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>`
                        : `<button data-message-quick-sport="${team.id}" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">Message</button>`
                    }
                  </div>
                </article>`
              )
              .join("")
          : emptyState("No quick team formations are live right now. Post one to invite players instantly.");

        qsa("[data-message-quick-sport]", quickSportList).forEach((button) => {
          button.addEventListener("click", async () => {
            const response = await window.CampusApi.request(`/chats/quick-sport/${button.dataset.messageQuickSport}`, {
              method: "POST"
            });
            toast("Quick team chat opened.", "success");
            window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
          });
        });

        qsa("[data-delete-quick-sport]", quickSportList).forEach((button) => {
          button.addEventListener("click", async () => {
            if (!window.confirm("Delete this quick team formation?")) {
              return;
            }

            await window.CampusApi.request(`/sports/quick-teams/${button.dataset.deleteQuickSport}`, {
              method: "DELETE"
            });
            toast("Quick team formation deleted.", "success");
            await loadQuickTeams();
          });
        });
      };

      const loadQuickTeams = async () => {
        const quickResponse = await window.CampusApi.request("/sports/quick-teams");
        renderQuickTeams(quickResponse.quickTeams || []);
      };

      quickForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(quickForm);
        const payload = {
          sportName: String(formData.get("sportName") || "").trim(),
          playAt: formData.get("playAt"),
          location: String(formData.get("location") || "").trim(),
          playersNeeded: String(formData.get("playersNeeded") || "").trim(),
          description: String(formData.get("description") || "").trim()
        };

        if (!payload.sportName || !payload.playAt || !payload.location || !payload.playersNeeded) {
          toast("Fill sport name, play time, location, and players needed.", "error");
          return;
        }

        const submitButton = qs('button[type="submit"]', quickForm);
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.classList.add("opacity-70", "cursor-not-allowed");
        }

        try {
          await window.CampusApi.request("/sports/quick-teams", {
            method: "POST",
            body: payload
          });
          quickForm.reset();
          toast("Quick team formation posted for students.", "success");
          await loadQuickTeams();
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove("opacity-70", "cursor-not-allowed");
          }
        }
      });

      await loadQuickTeams();
    },

    async teams() {
      document.title = "Teams | Campus Connect";
      setText(qs("header .text-xs"), "Team Details");
      const headerButton = qs("header a");
      if (headerButton) {
        headerButton.textContent = "Back to Clubs";
        headerButton.href = "/clubs.html";
      }
      const response = await window.CampusApi.request("/clubs");
      const params = getSearchParams();
      const allTeams = response.clubs.flatMap((club) =>
        club.teams.map((team) => ({
          ...team,
          clubName: club.name
        }))
      );
      const teamId = params.get("team") || allTeams[0]?.id || "team-1";
      const detail = await window.CampusApi.request(`/teams/${teamId}`);
      const main = qs("main");

      main.innerHTML = `
        <div class="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
            <h2 class="text-2xl font-bold text-slate-900">Teams</h2>
            <div class="mt-6 space-y-3">
              ${allTeams
                .map(
                  (team) => `
                  <a href="/teams.html?team=${escapeHtml(team.id)}" class="block rounded-2xl ${
                    team.id === detail.team.id ? "bg-brand-50 text-brand-700" : "bg-slate-50 text-slate-700"
                  } px-4 py-4">
                    <p class="font-semibold">${escapeHtml(team.name)}</p>
                    <p class="text-sm">${escapeHtml(team.clubName)}</p>
                  </a>`
                )
                .join("")}
            </div>
          </aside>
          <section class="space-y-6">
            <div class="rounded-3xl bg-white p-8 shadow-soft campus-surface">
              <span class="campus-pill">${escapeHtml(detail.team.club?.name || "Club")}</span>
              <h2 class="mt-4 text-3xl font-bold text-slate-900">${escapeHtml(detail.team.name)}</h2>
              <p class="mt-3 text-slate-600">${escapeHtml(detail.team.description)}</p>
              <div class="mt-5 grid gap-4 sm:grid-cols-3">
                <div class="rounded-2xl bg-slate-50 p-4"><p class="text-sm text-slate-500">Captain</p><p class="mt-1 font-semibold">${escapeHtml(detail.team.captain)}</p></div>
                <div class="rounded-2xl bg-slate-50 p-4"><p class="text-sm text-slate-500">Recruiting</p><p class="mt-1 font-semibold">${detail.team.recruiting ? "Yes" : "No"}</p></div>
                <div class="rounded-2xl bg-slate-50 p-4"><p class="text-sm text-slate-500">Players</p><p class="mt-1 font-semibold">${detail.team.players.length}</p></div>
              </div>
            </div>
            <div class="grid gap-6 xl:grid-cols-2">
              <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                <h3 class="text-xl font-bold text-slate-900">Players</h3>
                <div class="mt-5 space-y-4">
                  ${
                    detail.team.players.length
                      ? detail.team.players
                          .map(
                            (player) => `
                            <div class="rounded-2xl bg-slate-50 p-4">
                              <p class="font-semibold text-slate-900">${escapeHtml(player.name)}</p>
                              <p class="text-sm text-slate-500">${escapeHtml(player.department)} • Year ${escapeHtml(player.year)}</p>
                              <p class="mt-2 text-sm text-slate-600">${escapeHtml(player.achievements.join(", "))}</p>
                            </div>`
                          )
                          .join("")
                      : emptyState("No players found.")
                  }
                </div>
              </div>
              <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                <h3 class="text-xl font-bold text-slate-900">Fixtures & Results</h3>
                <div class="mt-5 space-y-4">
                  ${
                    detail.team.matches.length
                      ? detail.team.matches
                          .map(
                            (match) => `
                            <div class="rounded-2xl bg-slate-50 p-4">
                              <p class="font-semibold text-slate-900">${escapeHtml(detail.team.name)} vs ${escapeHtml(match.opponent)}</p>
                              <p class="text-sm text-slate-500">${escapeHtml(match.fixtureDate)} • ${escapeHtml(match.result)}</p>
                              <p class="mt-2 text-sm text-slate-600">Score: ${escapeHtml(match.score)} • MVP: ${escapeHtml(match.mvp)}</p>
                            </div>`
                          )
                          .join("")
                      : emptyState("No matches scheduled.")
                  }
                </div>
              </div>
            </div>
          </section>
        </div>
      `;
    },

    async chat() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const chatsPanel = qsa("aside .mt-6.space-y-3")[0];
      const messagesPanel = qs("main .flex-1");
      const title = qs("main h2");
      const subtitle = qs("main p.text-sm");
      const input = qs('input[placeholder="Type your message..."]');
      const sendButton = qs("div.border-t button");
      const actionArea = qs("#chatActionArea");
      const blockButton = qs("#blockChatButton");
      const reportButton = qs("#reportChatButton");
      const statusBanner = qs("#chatStatusBanner");
      const params = getSearchParams();
      let activeChatId = params.get("thread");
      const chatMode = params.get("mode");
      const globalOnly = params.get("thread") === "chat-global";
      let activeChat = null;
      let activeBlock = null;

      const updateChatActions = () => {
        if (!activeChat || activeChat.contextType !== "friend") {
          actionArea?.classList.add("hidden");
          statusBanner?.classList.add("hidden");
          input.disabled = false;
          sendButton.disabled = false;
          sendButton.classList.remove("opacity-60", "cursor-not-allowed");
          return;
        }

        actionArea?.classList.remove("hidden");
        if (activeBlock) {
          const blockedByMe = activeBlock.blockerId === user.id;
          statusBanner.textContent = blockedByMe
            ? "You blocked this private conversation. Messaging is disabled."
            : "This private conversation was blocked. Messaging is disabled.";
          statusBanner.classList.remove("hidden");
          input.disabled = true;
          sendButton.disabled = true;
          sendButton.classList.add("opacity-60", "cursor-not-allowed");
        } else {
          statusBanner.classList.add("hidden");
          input.disabled = false;
          sendButton.disabled = false;
          sendButton.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };

        const renderMessages = async () => {
        if (!activeChatId) {
          messagesPanel.innerHTML = emptyState(
            chatMode === "direct" ? "No direct messages or shared-note chats yet." : "Select a conversation to start chatting."
          );
          activeChat = null;
          activeBlock = null;
          updateChatActions();
          return;
        }

        const response = await window.CampusApi.request(`/chats/${activeChatId}/messages`);
        activeChat = response.chat || activeChat;
        activeBlock = response.blocked || null;
          messagesPanel.innerHTML = response.messages.length
            ? response.messages
                .map(
                  (message) => `
                  <div class="${message.senderId === user.id ? "ml-auto bg-brand-600 text-white" : "bg-white"} max-w-md rounded-2xl p-4 shadow-soft">
                    <div class="flex items-start justify-between gap-3">
                      <p class="text-sm ${message.senderId === user.id ? "text-white/80" : "text-slate-500"}">${escapeHtml(
                        message.sender?.name || "User"
                      )}</p>
                        ${
                          message.senderId === user.id
                            ? `<button data-delete-message="${message.id}" class="rounded-xl border ${
                                message.senderId === user.id
                                  ? "border-white/25 text-white/85 hover:bg-white/10"
                                  : "border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                             } px-3 py-1 text-xs font-semibold">Delete for Everyone</button>`
                            : ""
                        }
                    </div>
                    <p class="mt-2">${formatMessageText(message.text)}</p>
                  </div>`
                )
                .join("")
            : emptyState("No messages yet.");
          messagesPanel.scrollTop = messagesPanel.scrollHeight;

            qsa("[data-delete-message]", messagesPanel).forEach((button) => {
              button.addEventListener("click", async () => {
                const confirmed = await confirmDialog("Delete this message for everyone?", {
                  title: "Delete Message",
                  confirmText: "Delete",
                  cancelText: "Keep"
                });
                if (!confirmed) {
                  return;
                }

                await window.CampusApi.request(`/chats/${activeChatId}/messages/${button.dataset.deleteMessage}`, {
                  method: "DELETE"
                });
                toast("Message deleted for everyone.", "success");
                await renderChats();
                await renderMessages();
              });
            });
          updateChatActions();
        };

      const renderChats = async () => {
        const response = await window.CampusApi.request("/chats");
        const availableChats = globalOnly
          ? response.chats.filter((chat) => chat.contextType === "global")
          : chatMode === "direct"
            ? response.chats.filter((chat) => chat.contextType !== "global")
            : response.chats;
        if (!availableChats.some((chat) => chat.id === activeChatId)) {
          activeChatId = availableChats[0]?.id || null;
        }
        chatsPanel.innerHTML = availableChats.length
          ? availableChats
              .map(
                (chat) => `
                <button data-chat="${chat.id}" class="w-full rounded-2xl ${
                  chat.id === activeChatId ? "bg-brand-50" : "bg-slate-50"
                } p-4 text-left">
                  <p class="font-semibold ${chat.id === activeChatId ? "text-brand-700" : "text-slate-800"}">${escapeHtml(chat.title)}</p>
                  <p class="mt-1 text-sm text-slate-500">${escapeHtml(chat.lastMessage?.text || "No messages yet")}</p>
                </button>`
              )
              .join("")
          : emptyState(globalOnly ? "No global chat available yet." : chatMode === "direct" ? "No direct messages yet." : "No chats yet.");

        activeChat = availableChats.find((chat) => chat.id === activeChatId) || activeChat;
        activeBlock = activeChat?.blocked || activeBlock;
        setText(title, activeChat?.title || (globalOnly ? "Global Chat" : chatMode === "direct" ? "Direct Messages" : "Conversation Window"));
        setText(
          subtitle,
          activeChat
            ? describeChat(activeChat)
            : globalOnly
              ? "Campus-wide conversation for all students and admin"
              : chatMode === "direct"
                ? "Friend messages, admin support, and shared notes"
                : "Peer-to-peer and club communication interface"
        );
        updateChatActions();

        qsa("[data-chat]", chatsPanel).forEach((button) => {
          button.addEventListener("click", async () => {
            activeChatId = button.dataset.chat;
            await renderChats();
            await renderMessages();
          });
        });
      };

      const sendMessage = async () => {
        if (!input.value.trim() || !activeChatId) {
          return;
        }

        await window.CampusApi.request(`/chats/${activeChatId}/messages`, {
          method: "POST",
          body: { text: input.value.trim() }
        });
        input.value = "";
        await renderChats();
        await renderMessages();
      };

      sendButton.addEventListener("click", sendMessage);
      input.addEventListener("keydown", async (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (!sendButton.disabled) {
            await sendMessage();
          }
        }
      });

      blockButton?.addEventListener("click", async () => {
        if (!activeChatId || activeChat?.contextType !== "friend") {
          return;
        }

        await window.CampusApi.request(`/chats/${activeChatId}/block`, { method: "POST" });
        toast("Conversation blocked.", "success");
        await renderChats();
        await renderMessages();
      });

      reportButton?.addEventListener("click", async () => {
        if (!activeChatId || activeChat?.contextType !== "friend") {
          return;
        }

        const reason = window.prompt("Report reason for admin review", "Abusive or unwanted message");
        if (!reason) {
          return;
        }

        await window.CampusApi.request(`/chats/${activeChatId}/report`, {
          method: "POST",
          body: { reason }
        });
        toast("Chat reported to admin.", "success");
      });

      await renderChats();
      await renderMessages();
    },

    async bookmarks() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const section = qsa("main section")[0];
      const response = await window.CampusApi.request("/bookmarks");
      section.innerHTML = response.bookmarks.length
        ? response.bookmarks
            .map(
              (bookmark) => `
              <div class="rounded-3xl bg-white p-6 shadow-soft campus-surface">
                <span class="campus-pill">${escapeHtml(bookmark.type)}</span>
                <h3 class="mt-4 text-xl font-bold text-slate-900">${escapeHtml(bookmark.item?.title || "Saved item")}</h3>
                <p class="mt-3 text-slate-600">${escapeHtml(bookmark.item?.description || "Saved for later")}</p>
                <div class="mt-5 flex gap-3">
                  <a href="#" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Open</a>
                </div>
              </div>`
            )
            .join("")
        : emptyState("No bookmarks saved yet.");
    },

    async profile() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const response = await window.CampusApi.request("/profile");
      const profile = response.profile;
      const form = qs("#profileForm");
      const saveButton = qs("#profileSaveButton");
      const editButton = qs("#profileEditButton");
      const dmAdminButton = qs("#dmAdminButton");
      const logoutButton = qs("#logoutButton");
      const incomingRequestDot = qs("#incomingRequestDot");
      const profileInitial = qs("#profileInitial");
      const friendsCount = qs("#profileFriendsCount");
      const friendSearchInput = null;
      const friendSearchButton = null;
      const friendSearchResults = null;
      let network = {
        friendsCount: 0,
        friends: [],
        incoming: [],
        outgoing: []
      };
      let isEditing = false;
      let searchResults = [];
      const editableFields = ["name", "department", "year", "registerNumber", "phone", "memberTag", "about"];
      const updateProfileInitial = (nameValue) => {
        const initial = String(nameValue || "").trim().charAt(0).toUpperCase() || "U";
        setText(profileInitial, initial);
      };
      const setEditMode = (enabled) => {
        isEditing = enabled;
        editableFields.forEach((fieldName) => {
          const field = form.elements[fieldName];
          if (field) {
            field.disabled = !enabled;
          }
        });

        if (saveButton) {
          saveButton.classList.toggle("hidden", !enabled);
        }

        if (editButton) {
          editButton.classList.toggle("border-brand-200", enabled);
          editButton.classList.toggle("text-brand-700", enabled);
          editButton.setAttribute("aria-pressed", enabled ? "true" : "false");
          editButton.title = enabled ? "Editing Enabled" : "Edit Profile";
        }
      };
      const getFriendStatus = (studentId) => {
        if (network.friends.some((friend) => friend.id === studentId)) {
          return "friends";
        }

        if (network.incoming.some((request) => request.sender?.id === studentId)) {
          return "incoming";
        }

        if (network.outgoing.some((request) => request.recipient?.id === studentId)) {
          return "outgoing";
        }

        return "none";
      };

      const renderSearchResults = () => {
        return;
        friendSearchResults.innerHTML = searchResults.length
          ? searchResults
              .map((student) => {
                const status = getFriendStatus(student.id);
                return `
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(student.name)}</p>
                        <p class="mt-1 text-sm text-slate-500">Register No: ${escapeHtml(student.registerNumber || "Not added")}</p>
                        <p class="mt-2 text-sm text-slate-600">${escapeHtml(student.memberTag || "Campus Member")} - ${escapeHtml(
                          student.department || "Department"
                        )}</p>
                      </div>
                      <div class="flex flex-wrap gap-3">
                        ${
                          status === "friends"
                            ? `<button data-message-friend="${student.id}" class="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Message</button>`
                            : status === "incoming"
                              ? `<button data-accept-request="${
                                  network.incoming.find((request) => request.sender?.id === student.id)?.id || ""
                                }" class="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Accept Request</button>`
                              : status === "outgoing"
                                ? `<span class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">Request Sent</span>`
                                : `<button data-add-friend="${student.id}" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Add Friend</button>`
                        }
                      </div>
                    </div>
                  </div>`;
              })
              .join("")
          : '<div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Search a student to send a friend request.</div>';

        qsa("[data-add-friend]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            const response = await window.CampusApi.request("/friends/requests", {
              method: "POST",
              body: { recipientId: button.dataset.addFriend }
            });
            toast(response.message, "success");
            await loadNetwork();
          });
        });

        qsa("[data-accept-request]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            await window.CampusApi.request(`/friends/requests/${button.dataset.acceptRequest}/accept`, {
              method: "PATCH"
            });
            toast("Friend request accepted.", "success");
            await loadNetwork();
          });
        });

        qsa("[data-message-friend]", friendSearchResults).forEach((button) => {
          button.addEventListener("click", async () => {
            await startFriendChat(button.dataset.messageFriend);
          });
        });
      };

      const renderNetwork = () => {
        setText(friendsCount, String(network.friendsCount || 0));
        incomingRequestDot?.classList.toggle("hidden", network.incoming.length === 0);
        renderSearchResults();
      };

      const loadNetwork = async () => {
        network = await loadFriendNetworkData();
        renderNetwork();
      };

      form.elements.name.value = profile.name || "";
      form.elements.email.value = profile.collegeEmail || "";
      form.elements.department.value = profile.department || "";
      form.elements.year.value = profile.year || "";
      form.elements.registerNumber.value = profile.registerNumber || profile.collegeEmail?.split("@")[0] || "";
      form.elements.phone.value = profile.phone || "";
      form.elements.memberTag.value = profile.memberTag || "Campus Member";
      form.elements.about.value = profile.about || "";
      setText(qs(".text-2xl.font-bold.text-slate-900"), profile.name);
      setText(qs("#profileMemberTag"), profile.memberTag || "Campus Member");
      updateProfileInitial(profile.name);
      setEditMode(false);

      saveButton?.addEventListener("click", async () => {
        const updated = await window.CampusApi.request("/profile", {
          method: "PATCH",
          body: {
            name: form.elements.name.value.trim(),
            department: form.elements.department.value.trim(),
            year: form.elements.year.value.trim(),
            registerNumber: form.elements.registerNumber.value.trim(),
            phone: form.elements.phone.value.trim(),
            memberTag: form.elements.memberTag.value.trim(),
            about: form.elements.about.value.trim()
          }
        });
        toast(updated.message, "success");
        setText(qs("#profileMemberTag"), updated.profile?.memberTag || form.elements.memberTag.value.trim() || "Campus Member");
        setText(qs(".text-2xl.font-bold.text-slate-900"), updated.profile?.name || form.elements.name.value.trim() || profile.name);
        updateProfileInitial(updated.profile?.name || form.elements.name.value.trim() || profile.name);
        setEditMode(false);
      });

      editButton?.addEventListener("click", () => {
        setEditMode(!isEditing);
      });

      const searchFriends = async () => {
        const query = friendSearchInput.value.trim();
        if (!query) {
          searchResults = [];
          renderSearchResults();
          return;
        }

        const searchResponse = await window.CampusApi.request(`/users/search?q=${encodeURIComponent(query)}`);
        searchResults = searchResponse.users;
        renderSearchResults();
      };

      friendSearchButton?.addEventListener("click", searchFriends);
      friendSearchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          searchFriends();
        }
      });

      if (dmAdminButton) {
        dmAdminButton.addEventListener("click", async () => {
          const adminChat = await window.CampusApi.request("/chats/admin", { method: "POST" });
          window.location.href = `/chat.html?thread=${encodeURIComponent(adminChat.chat.id)}`;
        });
      }

      if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
          await window.CampusAuth.logout();
          window.location.href = "/login.html";
        });
      }

      await loadNetwork();
    },

    async requests() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const dmAdminButton = qs("#dmAdminButton");
      const logoutButton = qs("#logoutButton");
      const incomingRequestDot = qs("#incomingRequestDot");
      const incomingRequestCount = qs("#incomingRequestCount");
      const incomingRequestsList = qs("#incomingRequestsList");
      applyDirectMessageIcon(dmAdminButton);

      const renderRequests = (network) => {
        setText(incomingRequestCount, `${network.incoming.length} pending`);
        incomingRequestDot?.classList.toggle("hidden", network.incoming.length === 0);

        incomingRequestsList.innerHTML = network.incoming.length
          ? network.incoming
              .map(
                (request) => `
                <div class="rounded-2xl bg-slate-50 p-5">
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(request.sender?.name || "Student")}</p>
                      <p class="mt-1 text-sm text-slate-500">Register No: ${escapeHtml(
                        request.sender?.registerNumber || "Not added"
                      )}</p>
                      <p class="mt-2 text-sm text-slate-600">${escapeHtml(request.sender?.memberTag || "Campus Member")}</p>
                    </div>
                    <button data-accept-network="${request.id}" class="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Accept</button>
                  </div>
                </div>`
              )
              .join("")
          : emptyState("No incoming requests right now.");

        qsa("[data-accept-network]", incomingRequestsList).forEach((button) => {
          button.addEventListener("click", async () => {
            await window.CampusApi.request(`/friends/requests/${button.dataset.acceptNetwork}/accept`, {
              method: "PATCH"
            });
            toast("Friend request accepted.", "success");
            const network = await loadFriendNetworkData();
            renderRequests(network);
          });
        });
      };

      if (dmAdminButton) {
        dmAdminButton.addEventListener("click", async () => {
          const adminChat = await window.CampusApi.request("/chats/admin", { method: "POST" });
          window.location.href = `/chat.html?thread=${encodeURIComponent(adminChat.chat.id)}`;
        });
      }

      if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
          await window.CampusAuth.logout();
          window.location.href = "/login.html";
        });
      }

      renderRequests(await loadFriendNetworkData());
    },

    async friends() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      const dmAdminButton = qs("#dmAdminButton");
      const logoutButton = qs("#logoutButton");
      const friendsListCount = qs("#friendsListCount");
      const friendsList = qs("#friendsList");
      applyDirectMessageIcon(dmAdminButton);
      const profileModal = qs("#friendProfileModal");
      const profileCloseButton = qs("#friendProfileClose");
      const profileName = qs("#friendProfileName");
      const profileEmail = qs("#friendProfileEmail");
      const profileRegisterNumber = qs("#friendProfileRegisterNumber");
      const profileDepartment = qs("#friendProfileDepartment");
      const profileYear = qs("#friendProfileYear");
      const profilePhone = qs("#friendProfilePhone");
      const profileMemberTag = qs("#friendProfileMemberTag");
      const profileAbout = qs("#friendProfileAbout");

      const closeFriendProfile = () => {
        if (!profileModal) {
          return;
        }

        profileModal.classList.add("hidden");
        profileModal.classList.remove("flex");
      };

      const openFriendProfile = (friend) => {
        if (!profileModal || !friend) {
          return;
        }

        setText(profileName, friend.name || "Student Name");
        setText(profileEmail, friend.collegeEmail || "student@student.annauniv.edu");
        setText(profileRegisterNumber, friend.registerNumber || "Not added");
        setText(profileDepartment, friend.department || "Not added");
        setText(profileYear, friend.year || "Not added");
        setText(profilePhone, friend.phone || "Not added");
        setText(profileMemberTag, friend.memberTag || "Campus Member");
        setText(profileAbout, friend.about || "No description added.");
        profileModal.classList.remove("hidden");
        profileModal.classList.add("flex");
      };

      const renderFriends = (network) => {
        setText(friendsListCount, `${network.friends.length} connected`);

        friendsList.innerHTML = network.friends.length
          ? network.friends
              .map(
                (friend) => `
                <div class="rounded-2xl bg-slate-50 p-5">
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p class="font-semibold text-slate-900">${escapeHtml(friend.name)}</p>
                      <p class="mt-1 text-sm text-slate-500">Register No: ${escapeHtml(friend.registerNumber || "Not added")}</p>
                      <p class="mt-2 text-sm text-slate-600">${escapeHtml(friend.memberTag || "Campus Member")}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button data-view-friend-profile="${friend.id}" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">View Profile</button>
                      <button data-message-friend="${friend.id}" class="rounded-2xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">Message</button>
                    </div>
                  </div>
                </div>`
              )
              .join("")
          : emptyState("Your accepted friends will appear here.");

        qsa("[data-view-friend-profile]", friendsList).forEach((button) => {
          button.addEventListener("click", () => {
            const friend = network.friends.find((entry) => entry.id === button.dataset.viewFriendProfile);
            openFriendProfile(friend);
          });
        });

        qsa("[data-message-friend]", friendsList).forEach((button) => {
          button.addEventListener("click", async () => {
            await openFriendChat(button.dataset.messageFriend);
          });
        });
      };

      if (dmAdminButton) {
        dmAdminButton.addEventListener("click", async () => {
          const adminChat = await window.CampusApi.request("/chats/admin", { method: "POST" });
          window.location.href = `/chat.html?thread=${encodeURIComponent(adminChat.chat.id)}`;
        });
      }

      if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
          await window.CampusAuth.logout();
          window.location.href = "/login.html";
        });
      }

      profileCloseButton?.addEventListener("click", closeFriendProfile);
      profileModal?.addEventListener("click", (event) => {
        if (event.target === profileModal) {
          closeFriendProfile();
        }
      });

      renderFriends(await loadFriendNetworkData());
    },

    async admin() {
      const user = await window.CampusAuth.requireUser();
      if (!user) {
        return;
      }

      if (!user.isAdmin) {
        toast("Admin access only.", "error");
        window.location.href = "/dashboard.html";
        return;
      }

      const refreshButton = qsa("button", document).find((button) => button.textContent.includes("Refresh"));
      const stats = qsa("section.mt-8.grid.gap-6.sm\\:grid-cols-2.xl\\:grid-cols-4 > div h3");
      const tableBody = qs("tbody");
      const usersList = qs("#adminUsersList");
      const activityFeed = qs("#adminActivityFeed");
      const allUsersList = qs("#adminUsersSectionList");
      const adminStudentForm = qs("#adminStudentForm");
      const adminToggleStudentForm = qs("#adminToggleStudentForm");
      const adminStudentCancel = qs("#adminStudentCancel");
      const adminStudentSubmit = qs("#adminStudentSubmit");
      const uploadsList = qs("#adminUploadsList");
      const itemsList = qs("#adminItemsList");
      const announcementsList = qs("#adminAnnouncementsList");
      const clubRequestsList = qs("#adminClubRequestsList");
      const sportsList = qs("#adminSportsList");
      const profileModal = qs("#adminProfileModal");
      const profileCloseButton = qs("#adminProfileClose");
      const profileName = qs("#adminProfileName");
      const profileEmail = qs("#adminProfileEmail");
      const profileRegisterNumber = qs("#adminProfileRegisterNumber");
      const profileDepartment = qs("#adminProfileDepartment");
      const profileYear = qs("#adminProfileYear");
      const profilePhone = qs("#adminProfilePhone");
      const profileMemberTag = qs("#adminProfileMemberTag");
      const profileAbout = qs("#adminProfileAbout");
      const viewButtons = qsa("[data-admin-view]");
      const sections = qsa("[data-admin-section]");
      const logoutButton = qs("#adminLogoutButton");
        const sectionTitle = qs("#adminSectionTitle");
        const sectionSubtitle = qs("#adminSectionSubtitle");
        const params = getSearchParams();
        let adminUsersById = new Map();
        let isCreatingStudent = false;
        let adminNotificationSignatures = {};

        const sectionMeta = {
        overview: {
          title: "Admin Dashboard",
          subtitle: "Control platform activity, moderation, and academic updates."
        },
        users: {
          title: "User Management",
          subtitle: "View all registered users."
        },
        uploads: {
          title: "Upload Review",
          subtitle: "Check academic resources submitted by users."
        },
        items: {
          title: "Item Listings",
          subtitle: "Review all item posts with images and approval status."
        },
        announcements: {
          title: "Announcements",
          subtitle: "Track updates published to the platform."
        },
        clubs: {
          title: "Club Requests",
          subtitle: "Review student club registrations and create clubs after verification."
        },
          sports: {
            title: "Sports Teams",
            subtitle: "See all sports teams and create new sports entries."
          }
        };
        const viewNotificationKey = {
          users: "users",
          uploads: "uploads",
          items: "items",
          announcements: "announcements",
          clubs: "clubs",
          sports: "sports"
        };

        function showAdminSection(view) {
          sections.forEach((section) => {
            section.classList.toggle("hidden", section.dataset.adminSection !== view);
          });

        viewButtons.forEach((button) => {
          const active = button.dataset.adminView === view;
          button.classList.toggle("bg-brand-50", active);
          button.classList.toggle("text-brand-700", active);
          button.classList.toggle("font-semibold", active);
          button.classList.toggle("text-slate-600", !active);
        });

          setText(sectionTitle, sectionMeta[view]?.title || "Admin Dashboard");
          setText(sectionSubtitle, sectionMeta[view]?.subtitle || "Control platform activity.");
          const notificationKey = viewNotificationKey[view];
          if (notificationKey) {
            const seen = readNotificationState("admin", user.id);
            seen[notificationKey] = adminNotificationSignatures[notificationKey] || "";
            writeNotificationState("admin", user.id, seen);
            qsa(`[data-notify-key="${notificationKey}"]`).forEach((target) => setNotificationIndicator(target, false));
          }
        }

      const updateModerationStatus = async (id, moduleName, status) => {
        await window.CampusApi.request(`/admin/moderation/${id}`, {
          method: "PATCH",
          body: {
            module: moduleName,
            status
          }
        });
      };

      const deleteAdminEntity = async (path, label) => {
        await window.CampusApi.request(path, { method: "DELETE" });
        toast(`${label} deleted.`, "success");
      };

      const setStudentFormOpen = (open) => {
        if (!adminStudentForm || !adminToggleStudentForm) {
          return;
        }

        adminStudentForm.classList.toggle("hidden", !open);
        adminToggleStudentForm.textContent = open ? "Hide Form" : "New Student";
      };

      const handleStudentRegistration = async (event) => {
        event.preventDefault();
        if (!adminStudentForm || isCreatingStudent) {
          return;
        }

        isCreatingStudent = true;
        if (adminStudentSubmit) {
          adminStudentSubmit.disabled = true;
          adminStudentSubmit.textContent = "Registering...";
        }

        try {
          const formData = new FormData(adminStudentForm);
          const payload = Object.fromEntries(formData.entries());
          await window.CampusApi.request("/admin/students", {
            method: "POST",
            body: payload
          });
          toast("Student registered successfully.", "success");
          adminStudentForm.reset();
          if (adminStudentForm.elements.memberTag) {
            adminStudentForm.elements.memberTag.value = "Campus Member";
          }
          setStudentFormOpen(false);
          await render();
          showAdminSection("users");
        } finally {
          isCreatingStudent = false;
          if (adminStudentSubmit) {
            adminStudentSubmit.disabled = false;
            adminStudentSubmit.textContent = "Register Student";
          }
        }
      };

      const openCreateSportPrompt = async () => {
        const payload = promptFields("Create New Sport Team", [
          { name: "name", label: "Sport team name" },
          { name: "description", label: "Sport team description" },
          { name: "recruiting", label: "Recruiting: true or false", defaultValue: "true" },
          {
            name: "coverColor",
            label: "Cover gradient classes",
            defaultValue: "from-sky-500 via-brand-500 to-violet-500"
          },
          { name: "achievements", label: "Highlights or achievements (comma separated)", defaultValue: "" }
        ]);

        if (!payload) {
          return;
        }

        await window.CampusApi.request("/clubs", {
          method: "POST",
          body: payload
        });
        toast("Sport team created successfully.", "success");
        showAdminSection("sports");
        render();
      };

      const closeAdminProfile = () => {
        if (!profileModal) {
          return;
        }

        profileModal.classList.add("hidden");
        profileModal.classList.remove("flex");
      };

      const openAdminProfile = (memberId) => {
        const member = adminUsersById.get(memberId);
        if (!member || !profileModal) {
          return;
        }

        setText(profileName, member.name || "Student");
        setText(profileEmail, member.collegeEmail || "No email added");
        setText(profileRegisterNumber, member.registerNumber || "Not added");
        setText(profileDepartment, member.department || "Not added");
        setText(profileYear, member.year || "Not added");
        setText(profilePhone, member.phone || "Not added");
        setText(profileMemberTag, member.memberTag || "Campus Member");
        setText(profileAbout, member.about || "No description added.");
        profileModal.classList.remove("hidden");
        profileModal.classList.add("flex");
      };

      const openAdminStudentChat = async (studentId) => {
        const response = await window.CampusApi.request(`/chats/admin/${encodeURIComponent(studentId)}`, {
          method: "POST"
        });
        window.location.href = `/chat.html?thread=${encodeURIComponent(response.chat.id)}`;
      };

        const render = async () => {
          const [response, chatsResponse] = await Promise.all([
            window.CampusApi.request("/admin/overview"),
            window.CampusApi.request("/chats")
          ]);
          if (params.get("club") === "created") {
            toast("Verified club created successfully.", "success");
            params.delete("club");
            const nextUrl = `${window.location.pathname}?view=${encodeURIComponent(params.get("view") || "clubs")}`;
            window.history.replaceState({}, "", nextUrl);
        }
        const counts = response.overview.counts;
        const recentUsers = response.overview.users || [];
          const allUsers = response.overview.allUsers || recentUsers;
          adminUsersById = new Map(allUsers.map((member) => [member.id, member]));
          adminNotificationSignatures = {
            users: buildNotificationSignature(allUsers, [(item) => item.id, (item) => item.createdAt]),
            uploads: buildNotificationSignature(response.overview.uploads || [], [
              (item) => item.id,
              (item) => item.status,
              (item) => item.createdAt
            ]),
            items: buildNotificationSignature(response.overview.items || [], [
              (item) => item.id,
              (item) => item.status,
              (item) => item.createdAt
            ]),
            announcements: buildNotificationSignature(response.overview.announcements || [], [
              (item) => item.id,
              (item) => item.title,
              (item) => item.dateLabel
            ]),
            clubs: buildNotificationSignature(response.overview.clubRequests || [], [
              (item) => item.id,
              (item) => item.status,
              (item) => item.createdAt
            ]),
            sports: buildNotificationSignature(response.overview.sportRequests || [], [
              (item) => item.id,
              (item) => item.status,
              (item) => item.createdAt
            ]),
            directMessages: buildNotificationSignature(response.overview.adminInbox || [], [
              (item) => item.id,
              (item) => item.lastMessage?.createdAt,
              (item) => item.lastMessage?.text
            ]),
            globalChat: buildNotificationSignature(
              (chatsResponse.chats || []).filter((chat) => chat.contextType === "global"),
              [(item) => item.id, (item) => item.lastMessage?.createdAt, (item) => item.lastMessage?.text]
            )
          };
          const adminNotifications = prepareNotificationState("admin", user.id, adminNotificationSignatures);
          bindNotificationIndicators("admin", user.id, adminNotificationSignatures, adminNotifications.unread);
          const activeView = sectionMeta[params.get("view")] ? params.get("view") : "overview";
          const activeNotificationKey = viewNotificationKey[activeView];
          if (activeNotificationKey) {
            const seen = readNotificationState("admin", user.id);
            seen[activeNotificationKey] = adminNotificationSignatures[activeNotificationKey] || "";
            writeNotificationState("admin", user.id, seen);
            qsa(`[data-notify-key="${activeNotificationKey}"]`).forEach((target) => setNotificationIndicator(target, false));
          }
          const uploadById = new Map(response.overview.uploads.map((upload) => [upload.id, upload]));
        const adminInboxByUserId = new Map(
          (response.overview.adminInbox || []).flatMap((thread) =>
            (thread.participantIds || [])
              .filter((participantId) => participantId !== user.id)
              .map((participantId) => [participantId, thread])
          )
        );
        [counts.users, counts.uploads, counts.listings, counts.reports].forEach((value, index) => {
          setText(stats[index], String(value).padStart(3, "0"));
        });

        tableBody.innerHTML = response.overview.moderationQueue.length
          ? response.overview.moderationQueue
              .map(
                (item) => {
                  const upload = item.module === "resource" ? uploadById.get(item.id) : null;
                  const previewUrl = upload?.fileUrl || upload?.externalUrl || "";
                  return `
                <tr class="rounded-2xl bg-slate-50">
                  <td class="rounded-l-2xl px-4 py-4 font-medium text-slate-800">${escapeHtml(item.label)}</td>
                  <td class="px-4 py-4 text-slate-600">${escapeHtml(item.title)}</td>
                  <td class="px-4 py-4"><span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">${escapeHtml(item.status)}</span></td>
                  <td class="rounded-r-2xl px-4 py-4">
                    ${
                      previewUrl
                        ? `<a href="${escapeHtml(previewUrl)}" target="_blank" rel="noreferrer" class="mr-2 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">View</a>`
                        : ""
                    }
                    ${
                      item.module === "report"
                        ? `<button data-approve="${item.id}" data-module="${item.module}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Resolve</button>`
                        : `<button data-approve="${item.id}" data-module="${item.module}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                           <button data-disapprove="${item.id}" data-module="${item.module}" class="ml-2 rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Disapprove</button>
                           <button data-delete-admin="${item.id}" data-delete-path="${item.module === "resource" ? `/resources/${item.id}` : `/items/${item.id}`}" data-delete-label="${item.module === "resource" ? "Note" : "Item"}" class="ml-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>`
                    }
                  </td>
                </tr>`;
                }
              )
              .join("")
          : `<tr><td colspan="4">${emptyState("No moderation items pending.")}</td></tr>`;

        if (usersList) {
          usersList.innerHTML = recentUsers.length
            ? recentUsers
                .map(
                  (member) => {
                    const inboxThread = adminInboxByUserId.get(member.id);
                    return `
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(member.name || "Student")}</p>
                        <p class="mt-1 text-sm text-slate-500">${escapeHtml(member.collegeEmail || "")}</p>
                        <p class="mt-2 text-sm text-slate-600">${escapeHtml(member.department || "Department")} - Year ${escapeHtml(member.year || "-")} - Register No: ${escapeHtml(member.registerNumber || "Not added")}</p>
                      </div>
                      <div class="flex items-center gap-3">
                        <button data-view-admin-profile="${member.id}" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">View Profile</button>
                        ${
                          member.isAdmin
                            ? ""
                            :
                          inboxThread
                            ? `<a href="/chat.html?thread=${encodeURIComponent(inboxThread.id)}" title="Open admin DM" aria-label="Open admin DM" class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-white hover:bg-brand-50"><span class="admin-dm-logo" aria-hidden="true"></span></a>`
                            : `<button data-open-admin-student-chat="${member.id}" title="Start admin DM" aria-label="Start admin DM" class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-white hover:bg-brand-50"><span class="admin-dm-logo" aria-hidden="true"></span></button>`
                        }
                      </div>
                    </div>
                  </div>`;
                  }
                )
                .join("")
            : emptyState("No students found in MongoDB yet.");
        }

        if (allUsersList) {
          allUsersList.innerHTML = allUsers.length
            ? allUsers
                .map(
                  (member) => {
                    const inboxThread = adminInboxByUserId.get(member.id);
                    return `
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(member.name || "User")}</p>
                        <p class="mt-1 text-sm text-slate-500">${escapeHtml(member.collegeEmail || "")}</p>
                        <p class="mt-2 text-sm text-slate-600">${escapeHtml(member.department || "Department")} - Year ${escapeHtml(member.year || "-")} - Register No: ${escapeHtml(member.registerNumber || "Not added")}</p>
                      </div>
                      <div class="flex items-center gap-3">
                        <button data-view-admin-profile="${member.id}" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">View Profile</button>
                        ${
                          member.isAdmin
                            ? ""
                            :
                          inboxThread
                            ? `<a href="/chat.html?thread=${encodeURIComponent(inboxThread.id)}" title="Open admin DM" aria-label="Open admin DM" class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-white hover:bg-brand-50"><span class="admin-dm-logo" aria-hidden="true"></span></a>`
                            : `<button data-open-admin-student-chat="${member.id}" title="Start admin DM" aria-label="Start admin DM" class="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-white hover:bg-brand-50"><span class="admin-dm-logo" aria-hidden="true"></span></button>`
                        }
                      </div>
                    </div>
                  </div>`;
                  }
                )
                .join("")
            : emptyState("No users available.");
        }

        if (activityFeed) {
          activityFeed.innerHTML = response.overview.activityFeed.length
            ? response.overview.activityFeed
                .map(
                  (entry) => `
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <p class="font-semibold text-slate-900">${escapeHtml(entry.title)}</p>
                      <span class="campus-pill">${escapeHtml(entry.type)}</span>
                    </div>
                    <p class="mt-2 text-sm text-slate-600">${escapeHtml(entry.description)}</p>
                  </div>`
                )
                .join("")
            : emptyState("No recent activity to show.");
        }

        if (uploadsList) {
          uploadsList.innerHTML = response.overview.uploads.length
            ? response.overview.uploads
                .map(
                  (upload) => `
                  <div class="rounded-3xl bg-slate-50 p-5">
                    <div class="flex items-center justify-between">
                      <span class="campus-pill">${escapeHtml(upload.category || upload.type || "Upload")}</span>
                      <span class="text-xs font-semibold ${upload.status === "approved" ? "text-emerald-700" : "text-amber-700"}">${escapeHtml(upload.status)}</span>
                    </div>
                    <h4 class="mt-4 text-lg font-bold text-slate-900">${escapeHtml(upload.title)}</h4>
                    <p class="mt-2 text-sm text-slate-500">${escapeHtml(upload.subject || "General")} • ${escapeHtml(upload.department || "Department")}</p>
                    <p class="mt-3 text-sm text-slate-600">${escapeHtml(upload.description || "")}</p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      ${
                        upload.fileUrl || upload.externalUrl
                          ? `<a href="${escapeHtml(upload.fileUrl || upload.externalUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">View Note</a>`
                          : ""
                      }
                      ${
                        upload.fileUrl
                          ? `<a href="${escapeHtml(upload.fileUrl)}" download class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Download</a>`
                          : ""
                      }
                      ${
                        upload.status !== "approved"
                          ? `<button data-approve="${upload.id}" data-module="resource" class="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Approve</button>`
                          : ""
                      }
                      ${
                        upload.status !== "rejected"
                          ? `<button data-disapprove="${upload.id}" data-module="resource" class="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Disapprove</button>`
                          : ""
                      }
                      <button data-delete-admin="${upload.id}" data-delete-path="/resources/${upload.id}" data-delete-label="Note" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>`
                )
                .join("")
            : emptyState("No uploads available.");
        }

        if (itemsList) {
          itemsList.innerHTML = response.overview.items.length
            ? response.overview.items
                .map(
                  (item) => `
                  <div class="rounded-3xl bg-slate-50 p-5">
                    ${
                      item.imageUrl
                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="h-48 w-full rounded-2xl object-cover">`
                        : `<div class="flex h-48 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-400">No Image Uploaded</div>`
                    }
                    <div class="mt-4 flex items-center justify-between">
                      <span class="campus-pill">${escapeHtml(item.itemType || "Item")}</span>
                      <span class="text-xs font-semibold ${item.status === "approved" ? "text-emerald-700" : "text-amber-700"}">${escapeHtml(item.status)}</span>
                    </div>
                    <h4 class="mt-4 text-lg font-bold text-slate-900">${escapeHtml(item.title)}</h4>
                    <p class="mt-2 text-sm text-slate-500">${escapeHtml(item.department || "Department")} • ${escapeHtml(item.priceValue || "")}</p>
                    <p class="mt-3 text-sm text-slate-600">${escapeHtml(item.description || "")}</p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      ${
                        item.status !== "approved"
                          ? `<button data-approve="${item.id}" data-module="item" class="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Approve</button>`
                          : ""
                      }
                      ${
                        item.status !== "rejected"
                          ? `<button data-disapprove="${item.id}" data-module="item" class="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Disapprove</button>`
                          : ""
                      }
                      <button data-delete-admin="${item.id}" data-delete-path="/items/${item.id}" data-delete-label="Item" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>`
                )
                .join("")
            : emptyState("No item listings available.");
        }

        if (announcementsList) {
          announcementsList.innerHTML = response.overview.announcements.length
            ? response.overview.announcements
                .map(
                  (entry) => `
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <p class="font-semibold text-slate-900">${escapeHtml(entry.title)}</p>
                      <span class="campus-pill">${escapeHtml(entry.tag || "Announcement")}</span>
                    </div>
                    <p class="mt-2 text-sm text-slate-600">${escapeHtml(entry.description || "")}</p>
                  </div>`
                )
                .join("")
            : emptyState("No announcements published.");
        }

        if (clubRequestsList) {
          clubRequestsList.innerHTML = response.overview.clubRequests?.length
            ? response.overview.clubRequests
                .map(
                  (request) => `
                  <div class="rounded-3xl bg-slate-50 p-5">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(request.clubName || "Club Request")}</p>
                        <p class="mt-1 text-sm text-slate-500">Club Head: ${escapeHtml(request.clubHead || "Student")} • Register No: ${escapeHtml(request.registerNumber || "Not added")}</p>
                        <p class="mt-2 text-sm text-slate-600">${escapeHtml(request.department || "Department")} • ${escapeHtml(request.collegeEmail || "")}</p>
                      </div>
                      <span class="rounded-full ${
                        request.status === "created" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      } px-3 py-1 text-xs font-semibold">${escapeHtml(request.status)}</span>
                    </div>
                    <p class="mt-4 text-sm text-slate-700">${escapeHtml(request.description || "")}</p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      ${
                        request.passportPhotoUrl
                          ? `<a href="${escapeHtml(request.passportPhotoUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Passport Photo</a>`
                          : ""
                      }
                      ${
                        request.collegeIdCardUrl
                          ? `<a href="${escapeHtml(request.collegeIdCardUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">College ID Card</a>`
                          : ""
                      }
                      ${
                        request.clubLogoUrl
                          ? `<a href="${escapeHtml(request.clubLogoUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Club Logo</a>`
                          : ""
                      }
                        ${
                          request.clubHeadProofUrl
                            ? `<a href="${escapeHtml(request.clubHeadProofUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Club Head Proof</a>`
                            : ""
                        }
                        ${
                          request.status !== "created"
                            ? `<a href="/create-club.html?request=${encodeURIComponent(request.id)}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Verify And Create Club</a>`
                            : `<span class="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">Club Created</span>`
                        }
                        ${
                          request.status !== "created" && request.status !== "rejected"
                            ? `<button data-disapprove="${request.id}" data-module="clubRequest" class="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Disapprove</button>`
                            : ""
                        }
                        ${
                          request.status === "created" && request.createdClubId
                            ? `<button data-delete-admin="${request.createdClubId}" data-delete-path="/clubs/${request.createdClubId}" data-delete-label="Club" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete Created Club</button>`
                            : ""
                        }
                      </div>
                    </div>`
                  )
                  .join("")
              : emptyState("No club requests submitted yet.");
        }

        if (sportsList) {
          sportsList.innerHTML = response.overview.sports.length
            ? response.overview.sports
                .map(
                  (club) => `
                  <div class="rounded-3xl bg-slate-50 p-5">
                    <p class="font-semibold text-slate-900">${escapeHtml(club.name)}</p>
                    <p class="mt-2 text-sm text-slate-600">${escapeHtml(club.description || "")}</p>
                    <p class="mt-3 text-sm text-slate-500">Teams: ${escapeHtml(String(club.teams?.length || 0))} • ${club.recruiting ? "Recruiting" : "Closed"}</p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      <button data-delete-admin="${club.id}" data-delete-path="/clubs/${club.id}" data-delete-label="Sport Team" class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>`
                )
                .join("")
            : emptyState("No sports teams found.");
        }

        const sportRequestsList = qs("#adminSportRequestsList");
        if (sportRequestsList) {
          sportRequestsList.innerHTML = response.overview.sportRequests?.length
            ? response.overview.sportRequests
                .map(
                  (request) => `
                  <div class="rounded-3xl bg-slate-50 p-5">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(request.clubName || "Sport Request")}</p>
                        <p class="mt-1 text-sm text-slate-500">Sport Head: ${escapeHtml(request.clubHead || "Student")} • Register No: ${escapeHtml(request.registerNumber || "Not added")}</p>
                        <p class="mt-2 text-sm text-slate-600">${escapeHtml(request.department || "Department")} • ${escapeHtml(request.collegeEmail || "")}</p>
                      </div>
                      <span class="rounded-full ${
                        request.status === "created" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      } px-3 py-1 text-xs font-semibold">${escapeHtml(request.status)}</span>
                    </div>
                    <p class="mt-4 text-sm text-slate-700">${escapeHtml(request.description || "")}</p>
                    <div class="mt-4 flex flex-wrap gap-3">
                      ${
                        request.passportPhotoUrl
                          ? `<a href="${escapeHtml(request.passportPhotoUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Passport Photo</a>`
                          : ""
                      }
                      ${
                        request.collegeIdCardUrl
                          ? `<a href="${escapeHtml(request.collegeIdCardUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">College ID Card</a>`
                          : ""
                      }
                      ${
                        request.sportHeadProofUrl
                          ? `<a href="${escapeHtml(request.sportHeadProofUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Sport Head Proof</a>`
                          : ""
                      }
                      ${
                        request.clubLogoUrl
                          ? `<a href="${escapeHtml(request.clubLogoUrl)}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700">Sport Image</a>`
                          : ""
                      }
                      ${
                        request.status !== "created"
                          ? `<a href="/create-club.html?request=${encodeURIComponent(request.id)}" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Verify And Create Sport Team</a>`
                          : `<span class="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">Sport Team Created</span>`
                      }
                      ${
                        request.status !== "created" && request.status !== "rejected"
                          ? `<button data-disapprove="${request.id}" data-module="sportRequest" class="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Disapprove</button>`
                          : ""
                      }
                    </div>
                  </div>`
                )
                .join("")
            : emptyState("No sports requests submitted yet.");
        }

        qsa("[data-approve]", document).forEach((button) => {
          button.addEventListener("click", async () => {
            await updateModerationStatus(
              button.dataset.approve,
              button.dataset.module,
              button.dataset.module === "report" ? "resolved" : "approved"
            );
            toast(button.dataset.module === "report" ? "Report marked as resolved." : "Item approved.", "success");
            render();
          });
        });

        qsa("[data-disapprove]", document).forEach((button) => {
          button.addEventListener("click", async () => {
            await updateModerationStatus(button.dataset.disapprove, button.dataset.module, "rejected");
              const label =
                button.dataset.module === "resource"
                  ? "Note"
                  : button.dataset.module === "clubRequest"
                    ? "Club request"
                  : button.dataset.module === "sportRequest"
                    ? "Sport request"
                    : "Item";
            toast(`${label} disapproved.`, "success");
            render();
          });
        });

        qsa("[data-delete-admin]", document).forEach((button) => {
          button.addEventListener("click", async () => {
            if (!window.confirm(`Delete this ${button.dataset.deleteLabel.toLowerCase()} permanently?`)) {
              return;
            }

            await deleteAdminEntity(button.dataset.deletePath, button.dataset.deleteLabel);
            render();
          });
        });

        qsa("[data-view-admin-profile]", document).forEach((button) => {
          button.addEventListener("click", () => {
            openAdminProfile(button.dataset.viewAdminProfile);
          });
        });

        qsa("[data-open-admin-student-chat]", document).forEach((button) => {
          button.addEventListener("click", async () => {
            await openAdminStudentChat(button.dataset.openAdminStudentChat);
          });
        });
      };

      refreshButton.addEventListener("click", render);
      viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
          showAdminSection(button.dataset.adminView);
        });
      });
      adminToggleStudentForm?.addEventListener("click", () => {
        setStudentFormOpen(adminStudentForm?.classList.contains("hidden"));
      });
      adminStudentCancel?.addEventListener("click", () => {
        adminStudentForm?.reset();
        if (adminStudentForm?.elements?.memberTag) {
          adminStudentForm.elements.memberTag.value = "Campus Member";
        }
        setStudentFormOpen(false);
      });
      adminStudentForm?.addEventListener("submit", handleStudentRegistration);
      qsa("[data-create-sport]", document).forEach((button) => {
        button.onclick = openCreateSportPrompt;
      });
      if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
          await window.CampusAuth.logout();
        });
      }
      if (profileCloseButton) {
        profileCloseButton.addEventListener("click", closeAdminProfile);
      }
      if (profileModal) {
        profileModal.addEventListener("click", (event) => {
          if (event.target === profileModal) {
            closeAdminProfile();
          }
        });
      }
      showAdminSection(sectionMeta[params.get("view")] ? params.get("view") : "overview");
      render();
    }
  };
})();
