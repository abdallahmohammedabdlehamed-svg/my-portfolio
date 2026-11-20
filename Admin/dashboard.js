/* =========================================================
   ADMIN DASHBOARD - HOME VIEW + ENHANCED PROJECTS CRUD
========================================================= */
if (!localStorage.getItem("portfolioAdminToken")) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.location.port === "5500" ? "http://localhost:5000/api" : "/api";
  let currentRange = "30d";
  let currentRangeLabel = "Last 30 Days";
  let allProjectsCache = [];
  let selectedCategoryFilter = "all";
  let projectToDeleteId = null;
  let allMessagesCache = [];
  let selectedMessageFilter = "all";
  let activeReaderMessageId = null;
  let messageToDeleteId = null;
  // حالة الفورم الحالية (التقنيات + الصورة المرفوعة)
  let currentProjectTechs = [];
  let currentImageToSave = "";

  // --- Admin Info & Logout ---
  const DEFAULT_AVATAR = "../Frontend/imgs/1786145734252.jpg";
  const savedAdmin = JSON.parse(localStorage.getItem("portfolioAdminUser") || "{}");
  const topbarAdminName = document.getElementById("topbarAdminName");
  const topbarAdminAvatar = document.getElementById("topbarAdminAvatar");

  function applyAdminHeaderUI(adminObj) {
    if (adminObj?.name && topbarAdminName) {
      topbarAdminName.textContent = adminObj.name;
    }
    if (topbarAdminAvatar) {
      topbarAdminAvatar.src = adminObj?.avatar ? adminObj.avatar : DEFAULT_AVATAR;
    }
  }
  applyAdminHeaderUI(savedAdmin);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("portfolioAdminToken");
      localStorage.removeItem("portfolioAdminUser");
      window.location.href = "login.html";
    });
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById("adminToast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = isError ? "admin-toast error show" : "admin-toast show";
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // --- Sidebar & SPA View Switching ---
  const layout = document.getElementById("dashboardLayout");
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const overlay = document.getElementById("sidebarOverlay");
  const navItems = document.querySelectorAll(".nav-item[data-page]");
  const pageViews = document.querySelectorAll(".page-view");

  function switchPage(pageName) {
    navItems.forEach((nav) => {
      nav.classList.toggle("active", nav.dataset.page === pageName);
    });

    pageViews.forEach((view) => {
      view.classList.toggle("hidden", view.id !== `view-${pageName}`);
    });

    if (pageName === "projects") {
      renderAdminProjects();
    }
 
 if (pageName === "messages") {
      renderMessagesInbox();
    }

    if (pageName === "settings") {
      populateSettingsForm();
    }
  }
  

  toggleBtn.addEventListener("click", () => {
    if (window.innerWidth <= 992) {
      sidebar.classList.toggle("mobile-open");
      overlay.classList.toggle("active");
    } else {
      layout.classList.toggle("collapsed");
    }
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("active");
  });

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
      if (window.innerWidth <= 992) {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("active");
      }
    });
  });

  document.querySelectorAll("[data-target-page]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      switchPage(trigger.dataset.targetPage);
    });
  });

  // --- Notification Bell Dropdown ---
  const notifWrapper = document.getElementById("notificationWrapper");
  const notifBtn = document.getElementById("notificationBtn");

  if (notifBtn && notifWrapper) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifWrapper.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!notifWrapper.contains(e.target)) {
        notifWrapper.classList.remove("open");
      }
    });
  }

  // --- Date Filter Dropdown ---
  const dateFilterWrapper = document.getElementById("dateFilterWrapper");
  const dateFilterBtn = document.getElementById("dateFilterBtn");
  const selectedDateRange = document.getElementById("selectedDateRange");
  const dateOptions = document.querySelectorAll("#dateDropdownMenu li");

  if (dateFilterBtn && dateFilterWrapper) {
    dateFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dateFilterWrapper.classList.toggle("open");
    });

    dateOptions.forEach((option) => {
      option.addEventListener("click", () => {
        dateOptions.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");

        currentRange = option.dataset.range;
        currentRangeLabel = option.dataset.label;
        selectedDateRange.textContent = currentRangeLabel;

        dateFilterWrapper.classList.remove("open");
        loadAllDashboardData();
      });
    });

    document.addEventListener("click", (e) => {
      if (!dateFilterWrapper.contains(e.target)) {
        dateFilterWrapper.classList.remove("open");
      }
    });
  }

  // --- Helpers ---
  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function getInitials(name) {
    return (name || "U")
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  }

  function resolveProjectImage(img) {
    if (!img || !img.trim()) return "";
    if (
      img.startsWith("http://") ||
      img.startsWith("https://") ||
      img.startsWith("data:") ||
      img.startsWith("../")
    ) {
      return img;
    }
    return `../Frontend/${img.replace(/^\/+/, "")}`;
  }

  function setSystemStatus(isOnline) {
    const icon = document.getElementById("statusCheckIcon");
    const badge = document.getElementById("systemStatusBadge");
    const msg = document.getElementById("systemStatusMessage");
    const wave = document.getElementById("statusWaveStroke");

    if (isOnline) {
      badge.textContent = "Online";
      badge.className = "status-pill online";
      icon.className = "status-check-icon";
      icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      msg.textContent = "Server is running smoothly";
      if (wave) wave.setAttribute("stroke", "#10b981");
    } else {
      badge.textContent = "Offline";
      badge.className = "status-pill offline";
      icon.className = "status-check-icon offline";
      icon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      msg.textContent = "Backend server is disconnected";
      if (wave) wave.setAttribute("stroke", "#ef4444");
    }
  }

  function updateDonutChart(projects) {
    const total = projects.length;
    document.getElementById("donutTotalProjects").textContent = total;

    const segMed = document.getElementById("donutSegMedical");
    const segFood = document.getElementById("donutSegFood");
    const segPort = document.getElementById("donutSegPortfolio");
    const segOther = document.getElementById("donutSegOther");

    if (total === 0) {
      document.getElementById("percentMedical").textContent = "0%";
      document.getElementById("percentFood").textContent = "0%";
      document.getElementById("percentPortfolio").textContent = "0%";
      document.getElementById("percentOther").textContent = "0%";
      [segMed, segFood, segPort, segOther].forEach((s) =>
        s.setAttribute("stroke-dasharray", "0 389.56")
      );
      return;
    }

    let medical = 0, food = 0, portfolio = 0, other = 0;
    projects.forEach((p) => {
      const cat = (p.category || "other").toLowerCase();
      if (cat === "medical") medical++;
      else if (cat === "food") food++;
      else if (cat === "portfolio") portfolio++;
      else other++;
    });

    const medPct = Math.round((medical / total) * 100);
    const foodPct = Math.round((food / total) * 100);
    const portPct = Math.round((portfolio / total) * 100);
    const otherPct = Math.max(0, 100 - medPct - foodPct - portPct);

    document.getElementById("percentMedical").textContent = `${medPct}%`;
    document.getElementById("percentFood").textContent = `${foodPct}%`;
    document.getElementById("percentPortfolio").textContent = `${portPct}%`;
    document.getElementById("percentOther").textContent = `${otherPct}%`;

    const C = 2 * Math.PI * 62;
    const medLen = (medPct / 100) * C;
    const foodLen = (foodPct / 100) * C;
    const portLen = (portPct / 100) * C;
    const otherLen = (otherPct / 100) * C;

    segMed.setAttribute("stroke-dasharray", `${medLen.toFixed(2)} ${C.toFixed(2)}`);
    segMed.setAttribute("stroke-dashoffset", "0");

    segFood.setAttribute("stroke-dasharray", `${foodLen.toFixed(2)} ${C.toFixed(2)}`);
    segFood.setAttribute("stroke-dashoffset", `${(-medLen).toFixed(2)}`);

    segPort.setAttribute("stroke-dasharray", `${portLen.toFixed(2)} ${C.toFixed(2)}`);
    segPort.setAttribute("stroke-dashoffset", `${(-(medLen + foodLen)).toFixed(2)}`);

    segOther.setAttribute("stroke-dasharray", `${otherLen.toFixed(2)} ${C.toFixed(2)}`);
    segOther.setAttribute("stroke-dashoffset", `${(-(medLen + foodLen + portLen)).toFixed(2)}`);
  }

  async function markMessageAsRead(id) {
    try {
      await fetch(`${API_BASE}/messages/${id}/read`, { method: "PATCH" });
      loadAllDashboardData();
    } catch (err) {
      console.error(err);
    }
  }

  // =========================================================
  // TECH TAGS & LOCAL IMAGE UPLOAD HANDLERS
  // =========================================================
  const techInput = document.getElementById("projTechInput");
  const selectedTechChips = document.getElementById("selectedTechChips");

  function renderSelectedTechChips() {
    if (!selectedTechChips) return;
    selectedTechChips.innerHTML = currentProjectTechs
      .map(
        (tech, idx) => `
        <span class="selected-chip">
          ${tech}
          <button type="button" data-remove-tech="${idx}" aria-label="Remove ${tech}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `
      )
      .join("");

    selectedTechChips.querySelectorAll("[data-remove-tech]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.removeTech);
        currentProjectTechs.splice(index, 1);
        renderSelectedTechChips();
      });
    });
  }

  function addTechItem(rawValue) {
    const clean = (rawValue || "").trim();
    if (!clean) return;
    if (!currentProjectTechs.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      currentProjectTechs.push(clean);
      renderSelectedTechChips();
    }
    if (techInput) techInput.value = "";
  }

  document.getElementById("addTechBtn")?.addEventListener("click", () => {
    addTechItem(techInput.value);
  });

  techInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTechItem(techInput.value);
    }
  });

  document.querySelectorAll(".tech-suggest-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addTechItem(btn.dataset.tech);
    });
  });

  // ضغط الصورة المرفوعة من الجهاز وتحويلها إلى Base64 خفيف وسريع
  const imageUploadZone = document.getElementById("imageUploadZone");
  const projImageFile = document.getElementById("projImageFile");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");
  const uploadPreviewBox = document.getElementById("uploadPreviewBox");
  const uploadPreviewImg = document.getElementById("uploadPreviewImg");

function setUploadPreview(rawValue) {
    currentImageToSave = rawValue || "";
    const displaySrc = resolveProjectImage(rawValue);

    if (displaySrc) {
      uploadPreviewImg.src = displaySrc;
      uploadPlaceholder.classList.add("hidden");
      uploadPreviewBox.classList.remove("hidden");
    } else {
      uploadPreviewImg.src = "";
      uploadPreviewBox.classList.add("hidden");
      uploadPlaceholder.classList.remove("hidden");
      if (projImageFile) projImageFile.value = "";
    }
  }

  function compressImageFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 900;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/webp", 0.82));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  uploadPlaceholder?.addEventListener("click", () => projImageFile.click());
  document.getElementById("changeImageBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    projImageFile.click();
  });
  document.getElementById("removeImageBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUploadPreview("");
  });

  projImageFile?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressedDataUrl = await compressImageFile(file);
    setUploadPreview(compressedDataUrl);
  });

  // =========================================================
  // PROJECTS MANAGEMENT (RENDER, FILTER, ADD, EDIT, DELETE)
  // =========================================================
  const projectsGrid = document.getElementById("adminProjectsGrid");
  const searchInput = document.getElementById("projectSearchInput");
  const catPills = document.querySelectorAll("#projectCategoryFilters .cat-pill");

  const projectModalBackdrop = document.getElementById("projectModalBackdrop");
  const projectForm = document.getElementById("projectForm");
  const projectModalTitle = document.getElementById("projectModalTitle");
  const editProjectIdInput = document.getElementById("editProjectId");

  const deleteModalBackdrop = document.getElementById("deleteModalBackdrop");
  const deleteProjectPrompt = document.getElementById("deleteProjectPrompt");

  function getCategoryLabel(cat) {
    const map = {
      medical: "Medical",
      food: "Food & Cafe",
      portfolio: "Portfolio",
      other: "Other",
    };
    return map[cat] || "Other";
  }

  function renderAdminProjects() {
    if (!projectsGrid) return;
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();

    const filtered = allProjectsCache.filter((proj) => {
      const matchesCat =
        selectedCategoryFilter === "all" || proj.category === selectedCategoryFilter;
      const matchesSearch =
        proj.title.toLowerCase().includes(searchTerm) ||
        proj.description.toLowerCase().includes(searchTerm);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      projectsGrid.innerHTML = `
        <div class="empty-messages-state" style="grid-column: 1 / -1;">
          <i class="fa-regular fa-folder-open"></i>
          <p>No projects found matching your filter</p>
        </div>
      `;
      return;
    }

    projectsGrid.innerHTML = filtered
      .map((proj) => {
        const imgSrc = resolveProjectImage(proj.image);
        const techs = Array.isArray(proj.technologies) ? proj.technologies : [];

        return `
        <article class="admin-project-card">
          <div class="project-thumb-wrap">
            ${
              imgSrc
                ? `<img
                    src="${imgSrc}"
                    alt="${proj.title}"
                    onerror="this.onerror=null; this.outerHTML='<div class=\\'project-thumb-placeholder\\'><i class=\\'fa-solid fa-layer-group\\'></i><span>${proj.title}</span></div>';"
                  />`
                : `<div class="project-thumb-placeholder">
                    <i class="fa-solid fa-layer-group"></i>
                    <span>${proj.title}</span>
                  </div>`
            }
            <span class="project-type-pill">${proj.projectType || "Frontend"}</span>
            <span class="project-cat-badge cat-${proj.category || "other"}">
              ${getCategoryLabel(proj.category)}
            </span>
          </div>

          <div class="project-card-body">
            <h4 class="project-card-title">${proj.title}</h4>
            <p class="project-card-desc">${proj.description}</p>

            ${
              techs.length > 0
                ? `<div class="project-card-techs">
                    ${techs.map((t) => `<span class="card-tech-tag">${t}</span>`).join("")}
                  </div>`
                : ""
            }

            <div class="project-card-footer">
              <div class="project-ext-links">
                ${
                  proj.projectUrl
                    ? `<a href="${proj.projectUrl}" target="_blank" rel="noopener noreferrer" class="ext-link-btn" title="Live Demo"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
                    : ""
                }
                ${
                  proj.githubUrl
                    ? `<a href="${proj.githubUrl}" target="_blank" rel="noopener noreferrer" class="ext-link-btn" title="GitHub Repo"><i class="fa-brands fa-github"></i></a>`
                    : ""
                }
              </div>

              <div class="project-crud-btns">
                <button type="button" class="crud-btn crud-edit" data-edit-id="${proj._id}">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button type="button" class="crud-btn crud-delete" data-delete-id="${proj._id}" data-delete-title="${proj.title}">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
      })
      .join("");

    projectsGrid.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const proj = allProjectsCache.find((p) => p._id === btn.dataset.editId);
        if (proj) openProjectModal(proj);
      });
    });

    projectsGrid.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        projectToDeleteId = btn.dataset.deleteId;
        deleteProjectPrompt.textContent = `Are you sure you want to delete "${btn.dataset.deleteTitle}"?`;
        deleteModalBackdrop.classList.remove("hidden");
      });
    });
  }

  function openProjectModal(project = null) {
    projectForm.reset();
    if (project) {
      projectModalTitle.textContent = "Edit Project";
      editProjectIdInput.value = project._id;
      document.getElementById("projTitle").value = project.title || "";
      document.getElementById("projType").value = project.projectType || "Frontend";
      document.getElementById("projCategory").value = project.category || "other";
      document.getElementById("projDescription").value = project.description || "";
      document.getElementById("projLiveUrl").value = project.projectUrl || "";
      document.getElementById("projGithubUrl").value = project.githubUrl || "";

      currentProjectTechs = Array.isArray(project.technologies)
        ? [...project.technologies]
        : [];
      renderSelectedTechChips();

     setUploadPreview(project.image || "");
    } else {
      projectModalTitle.textContent = "Add New Project";
      editProjectIdInput.value = "";
      currentProjectTechs = [];
      renderSelectedTechChips();
      setUploadPreview("");
    }
    projectModalBackdrop.classList.remove("hidden");
  }

  function closeProjectModal() {
    projectModalBackdrop.classList.add("hidden");
  }

  document.getElementById("openAddProjectModalBtn")?.addEventListener("click", () => openProjectModal());
  document.getElementById("quickAddProjectBtn")?.addEventListener("click", () => {
    switchPage("projects");
    openProjectModal();
  });
  document.getElementById("closeProjectModalBtn")?.addEventListener("click", closeProjectModal);
  document.getElementById("cancelProjectModalBtn")?.addEventListener("click", closeProjectModal);

  projectForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = editProjectIdInput.value;

    // لو المستخدم كتب تقنية ومضغطش Enter، نضيفها تلقائياً قبل الحفظ
    if (techInput && techInput.value.trim()) {
      addTechItem(techInput.value);
    }

    const payload = {
      title: document.getElementById("projTitle").value.trim(),
      projectType: document.getElementById("projType").value,
      category: document.getElementById("projCategory").value,
      technologies: currentProjectTechs,
      description: document.getElementById("projDescription").value.trim(),
      image: currentImageToSave,
      projectUrl: document.getElementById("projLiveUrl").value.trim(),
      githubUrl: document.getElementById("projGithubUrl").value.trim(),
    };

    const submitBtn = document.getElementById("saveProjectSubmitBtn");
    submitBtn.disabled = true;

    try {
      const url = editId ? `${API_BASE}/projects/${editId}` : `${API_BASE}/projects`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        closeProjectModal();
        showToast(editId ? "Project updated successfully!" : "Project added successfully!");
        await loadAllDashboardData();
        renderAdminProjects();
      } else {
        showToast(data.message || "Error saving project", true);
      }
    } catch (err) {
      showToast("Failed to connect to server", true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Delete Modal Actions
  document.getElementById("cancelDeleteBtn")?.addEventListener("click", () => {
    deleteModalBackdrop.classList.add("hidden");
    projectToDeleteId = null;
  });

  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  confirmDeleteBtn?.addEventListener("click", async () => {
    if (!projectToDeleteId) return;
    const targetId = projectToDeleteId;
    confirmDeleteBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/projects/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        deleteModalBackdrop.classList.add("hidden");
        projectToDeleteId = null;

        allProjectsCache = allProjectsCache.filter((p) => p._id !== targetId);
        renderAdminProjects();
        updateDonutChart(allProjectsCache);
        showToast("Project deleted!");

        loadAllDashboardData();
      } else {
        showToast(data.message || "Failed to delete project", true);
      }
    } catch (err) {
      showToast("Server error while deleting", true);
    } finally {
      confirmDeleteBtn.disabled = false;
    }
  });

  searchInput?.addEventListener("input", renderAdminProjects);
  catPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      catPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      selectedCategoryFilter = pill.dataset.cat;
      renderAdminProjects();
    });
  });


// =========================================================
  // MESSAGES CENTER (INBOX, READER, FILTER, DELETE, REPLY)
  // =========================================================
  const inboxMessagesList = document.getElementById("inboxMessagesList");
  const messageReaderPane = document.getElementById("messageReaderPane");
  const messageSearchInput = document.getElementById("messageSearchInput");
  const msgFilterPills = document.querySelectorAll("#messageStatusFilters .cat-pill");
  const deleteMessageModalBackdrop = document.getElementById("deleteMessageModalBackdrop");

  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatFullDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMessagesInbox() {
    if (!inboxMessagesList) return;

    const totalCount = allMessagesCache.length;
    const unreadCount = allMessagesCache.filter((m) => !m.isRead).length;
    const readCount = totalCount - unreadCount;

    document.getElementById("msgCountAll").textContent = totalCount;
    document.getElementById("msgCountUnread").textContent = unreadCount;
    document.getElementById("msgCountRead").textContent = readCount;

    const searchTerm = (messageSearchInput?.value || "").toLowerCase().trim();

    const filtered = allMessagesCache.filter((m) => {
      const matchesStatus =
        selectedMessageFilter === "all" ||
        (selectedMessageFilter === "unread" && !m.isRead) ||
        (selectedMessageFilter === "read" && m.isRead);

      const matchesSearch =
        (m.name || "").toLowerCase().includes(searchTerm) ||
        (m.email || "").toLowerCase().includes(searchTerm) ||
        (m.subject || "").toLowerCase().includes(searchTerm) ||
        (m.message || "").toLowerCase().includes(searchTerm);

      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      inboxMessagesList.innerHTML = `
        <div class="empty-messages-state" style="margin: auto;">
          <i class="fa-regular fa-inbox"></i>
          <p>No messages match your filter</p>
        </div>
      `;
      return;
    }

    const colors = ["avatar-purple", "avatar-pink", "avatar-amber"];
    inboxMessagesList.innerHTML = filtered
      .map(
        (m, idx) => `
        <div
          class="inbox-item ${m.isRead ? "" : "unread"} ${m._id === activeReaderMessageId ? "selected" : ""}"
          data-inbox-id="${m._id}"
        >
          <div class="msg-avatar ${colors[idx % colors.length]}">${getInitials(m.name)}</div>
          <div class="inbox-item-body">
            <div class="inbox-item-top">
              <span class="inbox-sender-name">${escapeHTML(m.name)}</span>
              <span class="inbox-time">${timeAgo(m.createdAt)}</span>
            </div>
            <div class="inbox-subject">${escapeHTML(m.subject || "Portfolio Inquiry")}</div>
            <div class="inbox-snippet">${escapeHTML(m.message)}</div>
          </div>
        </div>
      `
      )
      .join("");

    inboxMessagesList.querySelectorAll("[data-inbox-id]").forEach((item) => {
      item.addEventListener("click", () => {
        openMessageInReader(item.dataset.inboxId);
      });
    });
  }

  async function openMessageInReader(msgId) {
    const msg = allMessagesCache.find((m) => m._id === msgId);
    if (!msg || !messageReaderPane) return;

    activeReaderMessageId = msgId;

    // تعليم الرسالة كمقروءة تلقائياً لو كانت غير مقروءة
    if (!msg.isRead) {
      msg.isRead = true;
      fetch(`${API_BASE}/messages/${msgId}/read`, { method: "PATCH" })
        .then(() => loadAllDashboardData())
        .catch(() => {});
    }

    renderMessagesInbox();

    const replySubject = encodeURIComponent(`Re: ${msg.subject || "Portfolio Inquiry"}`);
    const mailtoHref = `mailto:${encodeURIComponent(msg.email)}?subject=${replySubject}`;

    messageReaderPane.innerHTML = `
      <div class="reader-header">
        <div class="reader-sender-box">
          <div class="msg-avatar avatar-purple">${getInitials(msg.name)}</div>
          <div class="reader-sender-info">
            <h3>${escapeHTML(msg.name)}</h3>
            <a href="${mailtoHref}" class="reader-sender-email">${escapeHTML(msg.email)}</a>
          </div>
        </div>
        <span class="reader-date-badge">
          <i class="fa-regular fa-clock"></i> ${formatFullDate(msg.createdAt)}
        </span>
      </div>

      <div class="reader-subject-bar">
        <i class="fa-solid fa-tag" style="margin-right: 6px;"></i>
        ${escapeHTML(msg.subject || "Portfolio Inquiry")}
      </div>

      <div class="reader-message-content">${escapeHTML(msg.message)}</div>

      <div class="reader-actions">
        <a href="${mailtoHref}" class="btn-primary-gradient">
          <i class="fa-solid fa-reply"></i>
          <span>Reply via Email</span>
        </a>

        <div class="reader-actions-right">
          <button type="button" class="btn-secondary" id="readerMarkUnreadBtn">
            <i class="fa-solid fa-envelope"></i>
            <span>Mark Unread</span>
          </button>
          <button type="button" class="btn-danger" id="readerDeleteBtn">
            <i class="fa-solid fa-trash"></i>
            <span>Delete</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById("readerMarkUnreadBtn")?.addEventListener("click", async () => {
      try {
        await fetch(`${API_BASE}/messages/${msgId}/unread`, { method: "PATCH" });
        activeReaderMessageId = null;
        messageReaderPane.innerHTML = `
          <div class="reader-empty-state">
            <div class="reader-empty-icon"><i class="fa-regular fa-envelope-open"></i></div>
            <h3>Marked as Unread</h3>
            <p>Select any message from the left list to view details.</p>
          </div>
        `;
        showToast("Message marked as unread");
        await loadAllDashboardData();
        renderMessagesInbox();
      } catch (err) {
        showToast("Error updating message", true);
      }
    });

    document.getElementById("readerDeleteBtn")?.addEventListener("click", () => {
      messageToDeleteId = msgId;
      document.getElementById("deleteMessagePrompt").textContent =
        `Delete message from "${msg.name}"? This action cannot be undone.`;
      deleteMessageModalBackdrop.classList.remove("hidden");
    });
  }

  document.getElementById("markAllReadBtn")?.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/mark-all-read`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        showToast("All messages marked as read!");
        await loadAllDashboardData();
        renderMessagesInbox();
      }
    } catch (err) {
      showToast("Failed to update messages", true);
    }
  });

  document.getElementById("cancelDeleteMsgBtn")?.addEventListener("click", () => {
    deleteMessageModalBackdrop.classList.add("hidden");
    messageToDeleteId = null;
  });

 const confirmDeleteMsgBtn = document.getElementById("confirmDeleteMsgBtn");
  confirmDeleteMsgBtn?.addEventListener("click", async () => {
    if (!messageToDeleteId) return;
    const targetId = messageToDeleteId;
    confirmDeleteMsgBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/messages/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        deleteMessageModalBackdrop.classList.add("hidden");
        messageToDeleteId = null;

        allMessagesCache = allMessagesCache.filter((m) => m._id !== targetId);
        if (activeReaderMessageId === targetId) {
          activeReaderMessageId = null;
          messageReaderPane.innerHTML = `
            <div class="reader-empty-state">
              <div class="reader-empty-icon"><i class="fa-regular fa-envelope-open"></i></div>
              <h3>Select a message to read</h3>
              <p>Click on any message from the left list to view full details and reply.</p>
            </div>
          `;
        }
        renderMessagesInbox();
        showToast("Message deleted!");

        loadAllDashboardData();
      } else {
        showToast(data.message || "Failed to delete message", true);
      }
    } catch (err) {
      showToast("Error deleting message", true);
    } finally {
      confirmDeleteMsgBtn.disabled = false;
    }
  });

  messageSearchInput?.addEventListener("input", renderMessagesInbox);
  msgFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      msgFilterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      selectedMessageFilter = pill.dataset.msgFilter;
      renderMessagesInbox();
    });
  });


  // =========================================================
  // LOAD ALL LIVE DASHBOARD DATA
  // =========================================================
  async function loadAllDashboardData() {
    try {
      const [overviewRes, messagesRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview?range=${currentRange}`),
        fetch(`${API_BASE}/messages`),
      ]);

      const overviewData = await overviewRes.json();
      const messagesData = await messagesRes.json();

      if (overviewData.success) {
        setSystemStatus(true);
        const s = overviewData.stats;
        allProjectsCache = overviewData.allProjects || [];

        document.getElementById("statTotalProjects").textContent = s.projectsCount;
        document.getElementById("statProjectsRange").textContent = currentRangeLabel;

        document.getElementById("statTotalMessages").textContent = s.messagesCount;
        document.getElementById("statUnreadHint").textContent = `${s.unreadMessagesCount} unread`;

        document.getElementById("statTotalViews").textContent = s.totalViews;
        document.getElementById("statViewsRange").textContent = currentRangeLabel;

        document.getElementById("statTotalVisitors").textContent = s.visitorsCount;
        document.getElementById("statVisitorsRange").textContent = currentRangeLabel;

        updateDonutChart(allProjectsCache);
        renderAdminProjects();
      }

      if (messagesData.success) {
        allMessagesCache = messagesData.data || [];
        const allMsgs = allMessagesCache;
        renderMessagesInbox();
        const unreadMsgs = allMsgs.filter((m) => !m.isRead);
        const unreadCount = unreadMsgs.length;
        const bellBadge = document.getElementById("topbarBellBadge");
        const sidebarBadge = document.getElementById("sidebarMessagesBadge");
        const notifDropdownCount = document.getElementById("notifDropdownCount");
        const notifDropdownList = document.getElementById("notifDropdownList");

        notifDropdownCount.textContent = `${unreadCount} New`;

        if (unreadCount > 0) {
          bellBadge.textContent = unreadCount;
          bellBadge.classList.remove("hidden");
          sidebarBadge.textContent = unreadCount;
          sidebarBadge.classList.remove("hidden");

          notifDropdownList.innerHTML = unreadMsgs
            .map(
              (m) => `
              <div class="notif-item" data-msg-id="${m._id}">
                <div class="notif-item-top">
                  <span>${m.name}</span>
                  <span>${timeAgo(m.createdAt)}</span>
                </div>
                <p>${m.subject ? m.subject + " — " : ""}${m.message}</p>
              </div>
            `
            )
            .join("");
        } else {
          bellBadge.classList.add("hidden");
          sidebarBadge.classList.add("hidden");
          notifDropdownList.innerHTML = '<div class="notif-empty">No unread messages</div>';
        }

        const recentList = document.getElementById("recentMessagesList");
        if (allMsgs.length === 0) {
          recentList.innerHTML = `
            <div class="empty-messages-state">
              <i class="fa-regular fa-inbox"></i>
              <p>No messages received yet</p>
            </div>
          `;
        } else {
          const colors = ["avatar-purple", "avatar-pink", "avatar-amber"];
          recentList.innerHTML = allMsgs
            .slice(0, 3)
            .map(
              (m, idx) => `
              <div class="message-row ${m.isRead ? "" : "unread"}" data-msg-id="${m._id}">
                <div class="msg-avatar ${colors[idx % colors.length]}">${getInitials(m.name)}</div>
                <div class="msg-content">
                  <h4 class="msg-sender">${m.name}</h4>
                  <p class="msg-preview">${m.subject ? m.subject + ": " : ""}${m.message}</p>
                </div>
                <div class="msg-meta">
                  <span class="msg-time">${timeAgo(m.createdAt)}</span>
                  <span class="msg-status-dot ${m.isRead ? "" : "active"}" title="${m.isRead ? "Read" : "Unread"}"></span>
                </div>
              </div>
            `
            )
            .join("");
        }

       document.querySelectorAll("[data-msg-id]").forEach((el) => {
          el.addEventListener("click", () => {
            notifWrapper?.classList.remove("open");
            switchPage("messages");
            openMessageInReader(el.dataset.msgId);
          });
        });
      }
    } catch (error) {
      setSystemStatus(false);
      console.warn("Backend offline:", error.message);
    }
  }


  

  // =========================================================
  // ADMIN SETTINGS (PROFILE, AVATAR & PASSWORD MANAGEMENT)
  // =========================================================
  let currentAdminAvatar = savedAdmin.avatar || "";

  function compressAvatarFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 400;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.85));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function populateSettingsForm() {
    const admin = JSON.parse(localStorage.getItem("portfolioAdminUser") || "{}");
    const nameVal = admin.name || "Abdallah Mohamed";
    const emailVal = admin.email || "admin@abdallah.dev";
    currentAdminAvatar = admin.avatar || "";

    const nameInput = document.getElementById("settingsAdminName");
    const emailInput = document.getElementById("settingsAdminEmail");
    const previewName = document.getElementById("settingsPreviewName");
    const previewEmail = document.getElementById("settingsPreviewEmail");
    const avatarPreview = document.getElementById("settingsAvatarPreview");

    if (nameInput) nameInput.value = nameVal;
    if (emailInput) emailInput.value = emailVal;
    if (previewName) previewName.textContent = nameVal;
    if (previewEmail) previewEmail.textContent = emailVal;
    if (avatarPreview) avatarPreview.src = currentAdminAvatar || DEFAULT_AVATAR;
  }

  // جلب أحدث بيانات وصورة للأدمن من السيرفر عند فتح الداشبورد
  async function syncAdminProfileFromServer() {
    try {
      const res = await fetch(`${API_BASE}/admin/profile`);
      const data = await res.json();
      if (data.success && data.admin) {
        localStorage.setItem("portfolioAdminUser", JSON.stringify(data.admin));
        applyAdminHeaderUI(data.admin);
        populateSettingsForm();
      }
    } catch (_) {}
  }

  populateSettingsForm();
  syncAdminProfileFromServer();

  // اختيار صورة جديدة من الجهاز ومعاينتها فوراً
  const settingsAvatarInput = document.getElementById("settingsAvatarInput");
  const settingsAvatarPreview = document.getElementById("settingsAvatarPreview");

  document.getElementById("changeAvatarBtn")?.addEventListener("click", () => {
    settingsAvatarInput?.click();
  });
  document.getElementById("uploadAvatarTextBtn")?.addEventListener("click", () => {
    settingsAvatarInput?.click();
  });

  settingsAvatarInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressedAvatar = await compressAvatarFile(file);
    currentAdminAvatar = compressedAvatar;
    if (settingsAvatarPreview) settingsAvatarPreview.src = compressedAvatar;
    showToast("Photo selected! Click 'Save Profile Changes' to apply.");
  });

  // استرجاع الصورة الافتراضية
  document.getElementById("resetAvatarBtn")?.addEventListener("click", () => {
    currentAdminAvatar = "";
    if (settingsAvatarPreview) settingsAvatarPreview.src = DEFAULT_AVATAR;
    if (settingsAvatarInput) settingsAvatarInput.value = "";
    showToast("Default photo restored. Click Save to confirm.");
  });

  // إظهار / إخفاء كلمة المرور
  document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetInput = document.getElementById(btn.dataset.togglePass);
      if (!targetInput) return;
      const isPassword = targetInput.type === "password";
      targetInput.type = isPassword ? "text" : "password";
      btn.innerHTML = isPassword
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
    });
  });

  // حفظ تعديلات الاسم والبريد الإلكتروني والصورة
  const adminProfileForm = document.getElementById("adminProfileForm");
  adminProfileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentAdmin = JSON.parse(localStorage.getItem("portfolioAdminUser") || "{}");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    saveProfileBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/admin/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentAdmin.id || "",
          name: document.getElementById("settingsAdminName").value.trim(),
          email: document.getElementById("settingsAdminEmail").value.trim(),
          avatar: currentAdminAvatar,
        }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("portfolioAdminUser", JSON.stringify(data.admin));
        applyAdminHeaderUI(data.admin);
        populateSettingsForm();
        showToast("Profile & photo updated successfully!");
      } else {
        showToast(data.message || "Failed to update profile", true);
      }
    } catch (err) {
      showToast("Server error while updating profile", true);
    } finally {
      saveProfileBtn.disabled = false;
    }
  });

  // تغيير كلمة المرور
  const adminPasswordForm = document.getElementById("adminPasswordForm");
  adminPasswordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentAdmin = JSON.parse(localStorage.getItem("portfolioAdminUser") || "{}");
    const currentPassword = document.getElementById("currentPasswordInput").value;
    const newPassword = document.getElementById("newPasswordInput").value;
    const confirmPassword = document.getElementById("confirmPasswordInput").value;

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match!", true);
      return;
    }

    const savePasswordBtn = document.getElementById("savePasswordBtn");
    savePasswordBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/admin/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentAdmin.id || "",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        adminPasswordForm.reset();
        showToast("Password updated successfully!");
      } else {
        showToast(data.message || "Incorrect current password", true);
      }
    } catch (err) {
      showToast("Server error while changing password", true);
    } finally {
      savePasswordBtn.disabled = false;
    }
  });

  loadAllDashboardData();
});