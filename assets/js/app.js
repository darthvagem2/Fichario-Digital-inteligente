const STORAGE_KEY = "ficharioDigitalInteligente.v1";

function uid() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultState = {
  theme: "light",
  activeSubjectId: null,
  activeContentId: null,
  subjects: [
    {
      id: uid(),
      name: "Matemática",
      color: "#2f80ed",
      icon: "🧮",
      description: "Fórmulas, exercícios, provas e revisões.",
      contents: [
        {
          id: uid(),
          title: "Equações Lineares",
          text: "<h1>Equações Lineares</h1><p>Use esta página para registrar conceitos, exemplos resolvidos e dúvidas.</p><blockquote>Forma geral: ax + b = 0</blockquote><ul><li>Isolar a incógnita</li><li>Conferir substituindo o valor</li></ul>",
          tags: ["prova", "revisar"],
          priority: "alta",
          favorite: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    },
    {
      id: uid(),
      name: "História",
      color: "#c0392b",
      icon: "🏛",
      description: "Linhas do tempo, resumos e mapas mentais.",
      contents: []
    },
    {
      id: uid(),
      name: "Biologia",
      color: "#16a085",
      icon: "🧬",
      description: "Sistemas, células, genética e revisões.",
      contents: []
    }
  ]
};

let state = loadState();
let editingSubjectId = null;
let saveTimer = null;
let toastTimer = null;
let studySeconds = 25 * 60;
let timerInterval = null;

// Atalhos de DOM centralizados deixam os handlers menores.
const $ = (selector) => document.querySelector(selector);
const els = {
  sidebar: $("#sidebar"),
  subjectTabs: $("#subjectTabs"),
  subjectsGrid: $("#subjectsGrid"),
  dashboardView: $("#dashboardView"),
  binderView: $("#binderView"),
  subjectCover: $("#subjectCover"),
  contentsList: $("#contentsList"),
  emptyPaper: $("#emptyPaper"),
  editorWrap: $("#editorWrap"),
  paperArea: $("#paperArea"),
  paperToolbar: $("#paperToolbar"),
  editor: $("#editor"),
  titleInput: $("#contentTitleInput"),
  favoriteBtn: $("#favoriteBtn"),
  prioritySelect: $("#prioritySelect"),
  tagsInput: $("#tagsInput"),
  activeTags: $("#activeTags"),
  wordStatus: $("#wordStatus"),
  saveStatus: $("#saveStatus"),
  tagFilter: $("#tagFilter"),
  themeSelect: $("#themeSelect"),
  globalSearch: $("#globalSearch"),
  searchResults: $("#searchResults"),
  modalBackdrop: $("#modalBackdrop"),
  subjectModal: $("#subjectModal"),
  subjectModalTitle: $("#subjectModalTitle"),
  subjectName: $("#subjectName"),
  subjectDescription: $("#subjectDescription"),
  subjectColor: $("#subjectColor"),
  subjectIcon: $("#subjectIcon"),
  backupModal: $("#backupModal"),
  toast: $("#toast"),
  statsRow: $("#statsRow"),
  subjectCount: $("#subjectCount"),
  studyTimer: $("#studyTimer"),
  timerDisplay: $("#timerDisplay"),
  timerToggle: $("#timerToggle")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.subjects) ? normalizeState(saved) : normalizeState(structuredClone(defaultState));
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

// Garante compatibilidade com backups antigos ou dados incompletos.
function normalizeState(nextState) {
  nextState.subjects.forEach((subject) => {
    subject.contents ||= [];
    subject.contents.forEach((content, index) => {
      content.order = Number.isFinite(content.order) ? content.order : index;
      content.tags ||= [];
      content.priority ||= "baixa";
      content.favorite = Boolean(content.favorite);
      content.createdAt ||= new Date().toISOString();
      content.updatedAt ||= content.createdAt;
    });
  });
  nextState.theme ||= "light";
  return nextState;
}

function persist(feedback = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (feedback) pulseSaved();
}

function getSubject(id = state.activeSubjectId) {
  return state.subjects.find((subject) => subject.id === id);
}

function getContent(subject = getSubject(), id = state.activeContentId) {
  return subject?.contents.find((content) => content.id === id);
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function stripHtml(html = "") {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.textContent || "";
}

function priorityColor(priority) {
  return { baixa: "#16a085", media: "#f39c12", alta: "#d64545" }[priority] || "#16a085";
}

// Renderização principal: sidebar, dashboard e fichário ativo.
function render() {
  document.body.className = `theme-${state.theme}${document.body.classList.contains("study-mode") ? " study-mode" : ""}`;
  els.themeSelect.value = state.theme;
  renderSidebar();
  renderDashboard();
  if (state.activeSubjectId) renderBinder();
}

function renderSidebar() {
  els.subjectTabs.innerHTML = state.subjects.map((subject) => `
    <button class="subject-tab ${subject.id === state.activeSubjectId ? "active" : ""}" style="--tab-color:${subject.color}" data-open-subject="${subject.id}" type="button">
      <span>${subject.icon}</span><strong>${escapeHtml(subject.name)}</strong>
    </button>
  `).join("");
}

function renderDashboard() {
  const totalContents = state.subjects.reduce((sum, subject) => sum + subject.contents.length, 0);
  const totalFavorites = state.subjects.reduce((sum, subject) => sum + subject.contents.filter((content) => content.favorite).length, 0);
  const tags = new Set(state.subjects.flatMap((subject) => subject.contents.flatMap((content) => content.tags)));
  els.statsRow.innerHTML = [
    ["Matérias", state.subjects.length],
    ["Conteúdos", totalContents],
    ["Favoritos", totalFavorites],
    ["Tags", tags.size]
  ].map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  els.subjectCount.textContent = `${state.subjects.length} matéria${state.subjects.length === 1 ? "" : "s"}`;
  els.subjectsGrid.innerHTML = state.subjects.map((subject, index) => `
    <article class="subject-card" style="--card-color:${subject.color}; animation-delay:${index * 45}ms" data-open-subject="${subject.id}">
      <div class="card-menu">
        <button class="tiny-button" data-edit-subject="${subject.id}" title="Editar" type="button">✎</button>
        <button class="tiny-button" data-delete-subject="${subject.id}" title="Excluir" type="button">×</button>
      </div>
      <div class="card-icon">${subject.icon}</div>
      <div>
        <h2>${escapeHtml(subject.name)}</h2>
        <p class="muted">${escapeHtml(subject.description || "Sem descrição")}</p>
      </div>
      <div class="chips-line">
        <span class="chip">${subject.contents.length} conteúdos</span>
        <span class="chip">${subject.contents.filter((content) => content.priority === "alta").length} alta prioridade</span>
      </div>
    </article>
  `).join("");
}

function renderBinder() {
  const subject = getSubject();
  if (!subject) return showDashboard();
  document.documentElement.style.setProperty("--subject-color", subject.color);
  els.dashboardView.classList.add("hidden");
  els.binderView.classList.remove("hidden");
  els.subjectCover.style.setProperty("--subject-color", subject.color);
  els.subjectCover.innerHTML = `
    <div class="cover-top">
      <div>
        <div class="card-icon">${subject.icon}</div>
        <h2>${escapeHtml(subject.name)}</h2>
        <p>${escapeHtml(subject.description || "Matéria sem descrição.")}</p>
      </div>
      <div class="card-menu">
        <button class="tiny-button" data-edit-subject="${subject.id}" title="Editar" type="button">✎</button>
        <button class="tiny-button" data-delete-subject="${subject.id}" title="Excluir" type="button">×</button>
      </div>
    </div>
  `;
  renderTagFilter(subject);
  renderContents(subject);
  renderEditor(subject);
}

function renderTagFilter(subject) {
  const selected = els.tagFilter.value;
  const tags = [...new Set(subject.contents.flatMap((content) => content.tags))].sort();
  els.tagFilter.innerHTML = `<option value="">Todas as tags</option>${tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("")}`;
  els.tagFilter.value = tags.includes(selected) ? selected : "";
}

function renderContents(subject) {
  const filter = els.tagFilter.value;
  const contents = subject.contents
    .filter((content) => !filter || content.tags.includes(filter))
    .sort((a, b) => a.order - b.order);
  els.contentsList.innerHTML = contents.map((content) => `
    <article class="content-item ${content.id === state.activeContentId ? "active" : ""} ${content.favorite ? "favorite" : ""}"
      style="--priority-color:${priorityColor(content.priority)}; --subject-color:${subject.color}"
      data-open-content="${content.id}">
      <div class="item-row">
        <strong>${content.favorite ? "★ " : ""}${escapeHtml(content.title || "Sem título")}</strong>
        <span>${content.priority}</span>
      </div>
      <div class="item-row">
        <div class="chips-line">${content.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="mini-actions">
          <button class="tiny-button" data-move-content="${content.id}" data-direction="up" title="Mover para cima" type="button">↑</button>
          <button class="tiny-button" data-move-content="${content.id}" data-direction="down" title="Mover para baixo" type="button">↓</button>
          <button class="tiny-button" data-delete-content="${content.id}" title="Excluir" type="button">×</button>
        </div>
      </div>
    </article>
  `).join("") || `<div class="empty-paper"><p>Nenhum conteúdo aqui ainda.</p></div>`;
}

function priorityRank(priority) {
  return { baixa: 1, media: 2, alta: 3 }[priority] || 1;
}

function renderEditor(subject) {
  const content = getContent(subject);
  if (!content) {
    els.emptyPaper.classList.remove("hidden");
    els.editorWrap.classList.add("hidden");
    els.editor.innerHTML = "";
    updateWordStatus();
    return;
  }
  els.emptyPaper.classList.add("hidden");
  els.editorWrap.classList.remove("hidden");
  els.titleInput.value = content.title;
  els.editor.innerHTML = content.text || "<p><br></p>";
  els.favoriteBtn.classList.toggle("active", content.favorite);
  els.favoriteBtn.textContent = content.favorite ? "★" : "☆";
  els.prioritySelect.value = content.priority;
  els.tagsInput.value = content.tags.join(", ");
  renderActiveTags(content.tags);
  updateWordStatus();
}

function renderActiveTags(tags) {
  els.activeTags.innerHTML = tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("");
}

function showDashboard() {
  state.activeSubjectId = null;
  state.activeContentId = null;
  els.dashboardView.classList.remove("hidden");
  els.binderView.classList.add("hidden");
  persist();
  render();
}

function openSubject(id) {
  const subject = getSubject(id);
  if (!subject) return;
  state.activeSubjectId = id;
  state.activeContentId = subject.contents[0]?.id || null;
  els.sidebar.classList.remove("open");
  persist();
  render();
}

function openContent(id) {
  state.activeContentId = id;
  persist();
  renderBinder();
}

function openSubjectModal(subjectId = null) {
  editingSubjectId = subjectId;
  const subject = getSubject(subjectId) || { name: "", description: "", color: "#2f80ed", icon: "📘" };
  els.subjectModalTitle.textContent = subjectId ? "Editar matéria" : "Nova matéria";
  els.subjectName.value = subject.name;
  els.subjectDescription.value = subject.description || "";
  els.subjectColor.value = subject.color;
  els.subjectIcon.value = subject.icon;
  els.modalBackdrop.classList.remove("hidden");
  setTimeout(() => els.subjectName.focus(), 30);
}

function closeSubjectModal() {
  els.modalBackdrop.classList.add("hidden");
  editingSubjectId = null;
}

// CRUD de matérias e conteúdos.
function saveSubject(event) {
  event.preventDefault();
  const payload = {
    name: els.subjectName.value.trim(),
    description: els.subjectDescription.value.trim(),
    color: els.subjectColor.value,
    icon: els.subjectIcon.value
  };
  if (!payload.name) return;
  if (editingSubjectId) {
    Object.assign(getSubject(editingSubjectId), payload);
    toast("Matéria atualizada.");
  } else {
    const subject = { id: uid(), ...payload, contents: [] };
    state.subjects.unshift(subject);
    state.activeSubjectId = subject.id;
    state.activeContentId = null;
    toast("Matéria criada.");
  }
  closeSubjectModal();
  persist();
  render();
}

function deleteSubject(id) {
  const subject = getSubject(id);
  if (!subject || !confirm(`Excluir a matéria "${subject.name}" e todos os conteúdos?`)) return;
  state.subjects = state.subjects.filter((item) => item.id !== id);
  if (state.activeSubjectId === id) {
    state.activeSubjectId = null;
    state.activeContentId = null;
  }
  persist();
  toast("Matéria excluída.");
  render();
}

function createContent() {
  const subject = getSubject();
  if (!subject) return;
  const content = {
    id: uid(),
    title: "Novo conteúdo",
    text: "<h1>Novo conteúdo</h1><p>Comece suas anotações aqui.</p>",
    tags: [],
    priority: "baixa",
    favorite: false,
    order: subject.contents.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  subject.contents.unshift(content);
  state.activeContentId = content.id;
  persist();
  renderBinder();
  els.titleInput.focus();
  els.titleInput.select();
  toast("Conteúdo criado.");
}

function deleteContent(id) {
  const subject = getSubject();
  const content = getContent(subject, id);
  if (!subject || !content || !confirm(`Excluir o conteúdo "${content.title}"?`)) return;
  subject.contents = subject.contents.filter((item) => item.id !== id);
  state.activeContentId = subject.contents[0]?.id || null;
  persist();
  renderBinder();
  toast("Conteúdo excluído.");
}

function moveContent(id, direction) {
  const subject = getSubject();
  if (!subject) return;
  const ordered = subject.contents.sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((content) => content.id === id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
  [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
  ordered.forEach((content, order) => content.order = order);
  persist();
  renderBinder();
  toast("Conteúdo reorganizado.");
}

function updateActiveContent() {
  const subject = getSubject();
  const content = getContent(subject);
  if (!content) return;
  content.title = els.titleInput.value.trim() || "Sem título";
  content.text = els.editor.innerHTML;
  content.priority = els.prioritySelect.value;
  content.tags = els.tagsInput.value.split(",").map((tag) => tag.trim()).filter(Boolean);
  content.updatedAt = new Date().toISOString();
  persist(true);
  renderActiveTags(content.tags);
  renderSidebar();
  renderTagFilter(subject);
  renderContents(subject);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  updateWordStatus();
  saveTimer = setTimeout(updateActiveContent, 450);
}

function pulseSaved() {
  els.saveStatus.classList.add("pulse");
  setTimeout(() => els.saveStatus.classList.remove("pulse"), 350);
}

// Barra de ferramentas do editor usando comandos nativos do navegador.
function execEditorAction(control) {
  const cmd = control.dataset.cmd;
  const action = control.dataset.action;
  const value = control.value || control.dataset.value || null;
  els.editor.focus();
  if (cmd) document.execCommand(cmd, false, value);
  if (action === "checklist") document.execCommand("insertHTML", false, "<ul class='checklist'><li>Item da lista</li></ul>");
  if (action === "callout") document.execCommand("insertHTML", false, "<div class='callout'><strong>Destaque:</strong> escreva a ideia importante aqui.</div>");
  if (action === "code") document.execCommand("insertHTML", false, "<pre><code>seu codigo aqui</code></pre>");
  if (action === "hr") document.execCommand("insertHTML", false, "<hr>");
  if (action === "table") insertTable();
  if (action === "link") insertLink();
  if (action === "download-note") downloadActiveNote();
  if (action === "print") window.print();
  scheduleSave();
}

function insertTable() {
  document.execCommand("insertHTML", false, `
    <table>
      <tbody>
        <tr><th>Coluna 1</th><th>Coluna 2</th><th>Coluna 3</th></tr>
        <tr><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  `);
}

function insertLink() {
  const url = prompt("Digite o link:");
  if (!url) return;
  document.execCommand("createLink", false, url);
}

function downloadActiveNote() {
  const content = getContent();
  const subject = getSubject();
  if (!content || !subject) return;
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escapeHtml(content.title)}</title><body>${content.text}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${subject.name}-${content.title}`.replace(/[\\/:*?"<>|]+/g, "-") + ".html";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Anotacao baixada.");
}

function updateWordStatus() {
  if (!els.wordStatus) return;
  const text = els.editor.textContent.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  els.wordStatus.textContent = `${words} palavra${words === 1 ? "" : "s"} · ${chars} caractere${chars === 1 ? "" : "s"}`;
}

function search(query) {
  const term = query.trim().toLowerCase();
  if (!term) {
    els.searchResults.classList.remove("visible");
    els.searchResults.innerHTML = "";
    return;
  }
  const results = [];
  state.subjects.forEach((subject) => {
    if (`${subject.name} ${subject.description}`.toLowerCase().includes(term)) {
      results.push({ type: "Matéria", subject, content: null, text: subject.description });
    }
    subject.contents.forEach((content) => {
      const haystack = `${content.title} ${content.tags.join(" ")} ${stripHtml(content.text)}`.toLowerCase();
      if (haystack.includes(term)) results.push({ type: "Conteúdo", subject, content, text: stripHtml(content.text).slice(0, 150) });
    });
  });
  els.searchResults.innerHTML = results.slice(0, 12).map((result) => `
    <button class="result-item" data-search-subject="${result.subject.id}" data-search-content="${result.content?.id || ""}" type="button">
      <strong>${highlight(result.content?.title || result.subject.name, term)}</strong>
      <span class="muted">${result.type} em ${escapeHtml(result.subject.name)}</span>
      <p>${highlight(result.text || "", term)}</p>
    </button>
  `).join("") || `<div class="result-item">Nenhum resultado encontrado.</div>`;
  els.searchResults.classList.add("visible");
}

function highlight(text, term) {
  const safe = escapeHtml(text);
  return safe.replace(new RegExp(`(${escapeRegExp(term)})`, "gi"), "<mark>$1</mark>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toggleFavorite() {
  const content = getContent();
  if (!content) return;
  content.favorite = !content.favorite;
  content.updatedAt = new Date().toISOString();
  persist();
  renderBinder();
}

// Backup local em JSON para o usuário levar os dados para outro navegador.
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fichario-digital-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Backup exportado.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.subjects)) throw new Error("Formato inválido");
      state = imported;
      persist();
      render();
      toast("Backup importado.");
      els.backupModal.classList.add("hidden");
    } catch {
      toast("Arquivo JSON inválido.");
    }
  };
  reader.readAsText(file);
}

function wipeData() {
  if (!confirm("Tem certeza que deseja apagar todos os dados? Essa ação não pode ser desfeita.")) return;
  state = { ...structuredClone(defaultState), theme: state.theme, activeSubjectId: null, activeContentId: null };
  persist();
  render();
  toast("Dados apagados.");
  els.backupModal.classList.add("hidden");
}

function toggleStudyMode() {
  document.body.classList.toggle("study-mode");
  if (!state.activeSubjectId && state.subjects[0]) openSubject(state.subjects[0].id);
  els.studyTimer.classList.toggle("hidden", !document.body.classList.contains("study-mode"));
}

function updateTimerDisplay() {
  const min = String(Math.floor(studySeconds / 60)).padStart(2, "0");
  const sec = String(studySeconds % 60).padStart(2, "0");
  els.timerDisplay.textContent = `${min}:${sec}`;
}

function toggleTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    els.timerToggle.textContent = "Iniciar";
    return;
  }
  els.timerToggle.textContent = "Pausar";
  timerInterval = setInterval(() => {
    studySeconds = Math.max(0, studySeconds - 1);
    updateTimerDisplay();
    if (studySeconds === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      els.timerToggle.textContent = "Iniciar";
      toast("Sessão de estudo concluída.");
    }
  }, 1000);
}

function toast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

// Eventos globais mantêm a interface sem recarregar a página.
document.addEventListener("click", (event) => {
  const target = event.target.closest("button, article, [data-close], [data-close-backup]");
  if (!target) return;
  if (target.dataset.moveContent) {
    moveContent(target.dataset.moveContent, target.dataset.direction);
    return;
  }
  if (target.dataset.deleteContent) {
    deleteContent(target.dataset.deleteContent);
    return;
  }
  if (target.dataset.openSubject) openSubject(target.dataset.openSubject);
  if (target.dataset.openContent) openContent(target.dataset.openContent);
  if (target.dataset.editSubject) openSubjectModal(target.dataset.editSubject);
  if (target.dataset.deleteSubject) deleteSubject(target.dataset.deleteSubject);
  if (target.dataset.close !== undefined) closeSubjectModal();
  if (target.dataset.closeBackup !== undefined) els.backupModal.classList.add("hidden");
  if (target.closest(".paper-toolbar")) execEditorAction(target);
});

els.subjectModal.addEventListener("submit", saveSubject);
$("#dashboardBtn").addEventListener("click", showDashboard);
$("#newSubjectBtn").addEventListener("click", () => openSubjectModal());
$("#heroNewSubjectBtn").addEventListener("click", () => openSubjectModal());
$("#newContentBtn").addEventListener("click", createContent);
$("#menuBtn").addEventListener("click", () => els.sidebar.classList.toggle("open"));
$("#settingsBtn").addEventListener("click", () => els.backupModal.classList.remove("hidden"));
$("#backupBtn").addEventListener("click", () => els.backupModal.classList.remove("hidden"));
$("#exportBtn").addEventListener("click", exportData);
$("#importInput").addEventListener("change", (event) => importData(event.target.files[0]));
$("#wipeBtn").addEventListener("click", wipeData);
$("#studyModeBtn").addEventListener("click", toggleStudyMode);
$("#timerToggle").addEventListener("click", toggleTimer);
$("#timerReset").addEventListener("click", () => { studySeconds = 25 * 60; updateTimerDisplay(); });

els.themeSelect.addEventListener("change", () => {
  state.theme = els.themeSelect.value;
  persist();
  render();
});
els.tagFilter.addEventListener("change", () => renderContents(getSubject()));
els.paperToolbar.addEventListener("change", (event) => {
  const control = event.target.closest("[data-cmd]");
  if (control) execEditorAction(control);
});
els.paperToolbar.addEventListener("input", (event) => {
  const control = event.target.closest("input[type='color'][data-cmd]");
  if (control) execEditorAction(control);
});
els.globalSearch.addEventListener("input", (event) => search(event.target.value));
els.searchResults.addEventListener("click", (event) => {
  const item = event.target.closest("[data-search-subject]");
  if (!item) return;
  state.activeSubjectId = item.dataset.searchSubject;
  state.activeContentId = item.dataset.searchContent || getSubject(state.activeSubjectId)?.contents[0]?.id || null;
  els.globalSearch.value = "";
  els.searchResults.classList.remove("visible");
  persist();
  render();
});
els.editor.addEventListener("input", () => {
  updateWordStatus();
  scheduleSave();
});
els.titleInput.addEventListener("input", scheduleSave);
els.prioritySelect.addEventListener("change", updateActiveContent);
els.tagsInput.addEventListener("input", scheduleSave);
els.favoriteBtn.addEventListener("click", toggleFavorite);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    els.modalBackdrop.classList.add("hidden");
    els.backupModal.classList.add("hidden");
    els.searchResults.classList.remove("visible");
    els.sidebar.classList.remove("open");
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    updateActiveContent();
    toast("Anotação salva.");
  }
});

render();
updateTimerDisplay();
