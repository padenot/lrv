//#region web/src/perf.ts
window.Perf = {
	mark: (name) => {
		performance.mark(name);
	},
	measure: (name, start, end) => {
		performance.measure(name, {
			start,
			end
		});
	},
	recordFileSwitchStart: () => {
		performance.mark("fileSwitchStart");
	},
	recordFileSwitchEnd: () => {
		performance.mark("fileSwitchEnd");
		performance.measure("fileSwitch", {
			start: "fileSwitchStart",
			end: "fileSwitchEnd"
		});
	},
	recordAppInitStart: () => {
		performance.mark("appInitStart");
	},
	recordAppInitEnd: () => {
		performance.mark("appInitEnd");
		performance.measure("appInit", {
			start: "appInitStart",
			end: "appInitEnd"
		});
	},
	getMetrics: () => {
		const toDurations = (name) => performance.getEntriesByName(name).map((e) => e.duration);
		return {
			fileSwitch: toDurations("fileSwitch"),
			appInit: toDurations("appInit")
		};
	},
	clear: () => {
		performance.clearMarks();
		performance.clearMeasures();
	}
};

//#endregion
//#region web/src/themes.ts
const CUSTOM_THEMES = {
	"solarized-dark": {
		base: "vs-dark",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "7b9ea6",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "859900"
			},
			{
				token: "number",
				foreground: "d33682"
			},
			{
				token: "string",
				foreground: "2aa198"
			},
			{
				token: "type",
				foreground: "b58900"
			},
			{
				token: "class",
				foreground: "b58900"
			},
			{
				token: "function",
				foreground: "268bd2"
			},
			{
				token: "variable",
				foreground: "268bd2"
			},
			{
				token: "constant",
				foreground: "d33682"
			}
		],
		colors: {
			"editor.background": "#002b36",
			"editor.foreground": "#839496",
			"editor.lineHighlightBackground": "#073642",
			"editorCursor.foreground": "#839496",
			"editor.selectionBackground": "#073642",
			"editor.inactiveSelectionBackground": "#073642",
			"editorGutter.background": "#073642",
			"editorLineNumber.foreground": "#586e75",
			"editorLineNumber.activeForeground": "#839496",
			"editorGroup.border": "#0d3d4a"
		}
	},
	"solarized-light": {
		base: "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "546e75",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "859900"
			},
			{
				token: "number",
				foreground: "d33682"
			},
			{
				token: "string",
				foreground: "2aa198"
			},
			{
				token: "type",
				foreground: "b58900"
			},
			{
				token: "class",
				foreground: "b58900"
			},
			{
				token: "function",
				foreground: "268bd2"
			},
			{
				token: "variable",
				foreground: "268bd2"
			},
			{
				token: "constant",
				foreground: "d33682"
			}
		],
		colors: {
			"editor.background": "#fdf6e3",
			"editor.foreground": "#657b83",
			"editor.lineHighlightBackground": "#eee8d5",
			"editorCursor.foreground": "#657b83",
			"editor.selectionBackground": "#eee8d5",
			"editor.inactiveSelectionBackground": "#eee8d5",
			"editorGutter.background": "#eee8d5",
			"editorLineNumber.foreground": "#93a1a1",
			"editorLineNumber.activeForeground": "#657b83",
			"editorGroup.border": "#ccc3a0"
		}
	},
	"firefox-devtools-dark": {
		base: "vs-dark",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "5c6773",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "ff7de9"
			},
			{
				token: "number",
				foreground: "75bfff"
			},
			{
				token: "string",
				foreground: "86de74"
			},
			{
				token: "type",
				foreground: "75bfff"
			},
			{
				token: "class",
				foreground: "ff9400"
			},
			{
				token: "function",
				foreground: "ff9400"
			},
			{
				token: "variable",
				foreground: "b1b1b3"
			},
			{
				token: "constant",
				foreground: "75bfff"
			}
		],
		colors: {
			"editor.background": "#0c0c0d",
			"editor.foreground": "#b1b1b3",
			"editor.lineHighlightBackground": "#1c1b22",
			"editorCursor.foreground": "#b1b1b3",
			"editor.selectionBackground": "#2b2a33",
			"editor.inactiveSelectionBackground": "#1c1b22",
			"editorGroup.border": "#252525"
		}
	},
	"firefox-devtools-light": {
		base: "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "737373",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "d92bb4"
			},
			{
				token: "number",
				foreground: "0074e8"
			},
			{
				token: "string",
				foreground: "058b00"
			},
			{
				token: "type",
				foreground: "0074e8"
			},
			{
				token: "class",
				foreground: "c43500"
			},
			{
				token: "function",
				foreground: "c43500"
			},
			{
				token: "variable",
				foreground: "222222"
			},
			{
				token: "constant",
				foreground: "0074e8"
			}
		],
		colors: {
			"editor.background": "#ffffff",
			"editor.foreground": "#222222",
			"editor.lineHighlightBackground": "#f5f5f5",
			"editorCursor.foreground": "#222222",
			"editor.selectionBackground": "#e6e6e6",
			"editor.inactiveSelectionBackground": "#f0f0f0",
			"editorGroup.border": "#d7d7db"
		}
	},
	"github-dark": {
		base: "vs-dark",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "8b949e",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "ff7b72"
			},
			{
				token: "number",
				foreground: "79c0ff"
			},
			{
				token: "string",
				foreground: "a5d6ff"
			},
			{
				token: "type",
				foreground: "ffa657"
			},
			{
				token: "class",
				foreground: "ffa657"
			},
			{
				token: "function",
				foreground: "d2a8ff"
			},
			{
				token: "variable",
				foreground: "ffa657"
			},
			{
				token: "constant",
				foreground: "79c0ff"
			}
		],
		colors: {
			"editor.background": "#0d1117",
			"editor.foreground": "#c9d1d9",
			"editor.lineHighlightBackground": "#161b22",
			"editorCursor.foreground": "#c9d1d9",
			"editor.selectionBackground": "#1f6feb",
			"editor.inactiveSelectionBackground": "#1f6feb40",
			"editorGroup.border": "#30363d"
		}
	},
	"github-light": {
		base: "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "6e7781",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "cf222e"
			},
			{
				token: "number",
				foreground: "0550ae"
			},
			{
				token: "string",
				foreground: "0a3069"
			},
			{
				token: "type",
				foreground: "8250df"
			},
			{
				token: "class",
				foreground: "8250df"
			},
			{
				token: "function",
				foreground: "8250df"
			},
			{
				token: "variable",
				foreground: "953800"
			},
			{
				token: "constant",
				foreground: "0550ae"
			}
		],
		colors: {
			"editor.background": "#ffffff",
			"editor.foreground": "#24292f",
			"editor.lineHighlightBackground": "#f6f8fa",
			"editorCursor.foreground": "#24292f",
			"editor.selectionBackground": "#0969da30",
			"editor.inactiveSelectionBackground": "#0969da20",
			"editorGroup.border": "#d0d7de"
		}
	},
	phabricator: {
		base: "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "74777D",
				fontStyle: "italic"
			},
			{
				token: "keyword",
				foreground: "136CB2"
			},
			{
				token: "number",
				foreground: "b33225"
			},
			{
				token: "string",
				foreground: "139543"
			},
			{
				token: "type",
				foreground: "19558D"
			},
			{
				token: "class",
				foreground: "19558D"
			},
			{
				token: "function",
				foreground: "136CB2"
			},
			{
				token: "variable",
				foreground: "4B4D51"
			},
			{
				token: "constant",
				foreground: "b33225"
			}
		],
		colors: {
			"editor.background": "#ffffff",
			"editor.foreground": "#1c1f26",
			"editor.lineHighlightBackground": "#f8f9fc",
			"editorCursor.foreground": "#1c1f26",
			"editor.selectionBackground": "#136CB230",
			"editor.inactiveSelectionBackground": "#136CB218",
			"editorGutter.background": "#f8f9fc",
			"editorLineNumber.foreground": "#6b748c",
			"editorLineNumber.activeForeground": "#464c5c",
			"editorGroup.border": "#c7ccd9"
		}
	}
};
const UI_THEME_ACCENTS_HEX = {
	"firefox-devtools-dark": "#ff7de9",
	"firefox-devtools-light": "#d92bb4",
	"github-dark": "#58a6ff",
	"github-light": "#0969da",
	"solarized-dark": "#268bd2",
	"solarized-light": "#268bd2",
	"vs-dark": "#007acc",
	"hc-black": "#007acc",
	vs: "#007acc",
	"hc-light": "#007acc",
	phabricator: "#136CB2"
};
window.UIThemeAccentsHex = UI_THEME_ACCENTS_HEX;

//#endregion
//#region web/src/dom.ts
const $$2 = (sel, root = document) => root.querySelector(sel);
const el = (tag, { className, text, attrs } = {}, children = []) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== void 0 && text !== null) node.textContent = String(text);
	if (attrs) Object.entries(attrs).forEach(([key, value]) => {
		if (value === void 0 || value === null || value === false) return;
		node.setAttribute(key, value === true ? "" : String(value));
	});
	children.forEach((child) => {
		if (child === void 0 || child === null) return;
		if (typeof child === "string" || typeof child === "number") {
			node.appendChild(document.createTextNode(String(child)));
			return;
		}
		node.appendChild(child);
	});
	return node;
};
const clearEl = (node) => {
	node.textContent = "";
	return node;
};

//#endregion
//#region web/src/comments.ts
function commentStartLine(comment) {
	return Array.isArray(comment.line) ? comment.line[0] : comment.line;
}
function commentEndLine(comment) {
	return Array.isArray(comment.line) ? comment.line[1] : comment.line;
}
function commentContainsLine(comment, line) {
	const start = commentStartLine(comment);
	const end = commentEndLine(comment);
	return line >= start && line <= end;
}
function commentLineLabel(comment) {
	const start = commentStartLine(comment);
	const end = commentEndLine(comment);
	return start === end ? String(start) : `${start}-${end}`;
}
var CommentManager = class {
	comments;
	listeners;
	currentCommitIdx;
	constructor() {
		this.comments = [];
		this.listeners = [];
		this.currentCommitIdx = null;
	}
	addComment(comment) {
		if (this.currentCommitIdx !== null && comment.commit_idx === void 0) comment = {
			...comment,
			commit_idx: this.currentCommitIdx
		};
		this.comments.push(comment);
		this.notifyListeners();
	}
	setComments(comments) {
		this.comments = [...comments];
		this.notifyListeners();
	}
	removeComment(index) {
		this.comments.splice(index, 1);
		this.notifyListeners();
	}
	findComment(file, line, side) {
		return this.comments.findIndex((c) => c.file === file && c.side === side && commentContainsLine(c, line) && (this.currentCommitIdx === null || c.commit_idx === this.currentCommitIdx));
	}
	updateComment(index, newBody) {
		const comment = this.comments[index];
		if (!comment) return;
		comment.body = newBody;
		this.notifyListeners();
	}
	getComments() {
		return [...this.comments];
	}
	getCommentsForFile(file) {
		return this.comments.filter((c) => c.file === file && (this.currentCommitIdx === null || c.commit_idx === this.currentCommitIdx));
	}
	onChange(listener) {
		this.listeners.push(listener);
	}
	notifyListeners() {
		this.listeners.forEach((l) => l());
	}
};

//#endregion
//#region web/src/review-notes.ts
var ReviewNoteManager = class {
	notes;
	listeners;
	currentCommitIdx;
	constructor() {
		this.notes = [];
		this.listeners = [];
		this.currentCommitIdx = null;
	}
	setNotes(notes) {
		this.notes = [...notes];
		this.notifyListeners();
	}
	addNote(note) {
		if (this.currentCommitIdx !== null && note.commit_idx === void 0) note = {
			...note,
			commit_idx: this.currentCommitIdx
		};
		this.notes.push(note);
		this.notifyListeners();
	}
	getNotes() {
		return [...this.notes];
	}
	getNotesForFile(file) {
		return this.notes.filter((n) => n.file === file && (this.currentCommitIdx === null || n.commit_idx === this.currentCommitIdx));
	}
	updateNote(target, patch) {
		const idx = this.notes.findIndex((note) => this.isSameNote(note, target));
		if (idx < 0) return;
		this.notes[idx] = {
			...this.notes[idx],
			...patch
		};
		this.notifyListeners();
	}
	findNote(file, line, side) {
		return this.notes.findIndex((n) => n.file === file && n.side === side && commentContainsLine(n, line) && (this.currentCommitIdx === null || n.commit_idx === this.currentCommitIdx));
	}
	onChange(listener) {
		this.listeners.push(listener);
	}
	notifyListeners() {
		this.listeners.forEach((l) => l());
	}
	isSameNote(a, b) {
		if (a.id && b.id) return a.id === b.id;
		return a.file === b.file && a.side === b.side && JSON.stringify(a.line) === JSON.stringify(b.line) && a.body === b.body && a.commit_idx === b.commit_idx;
	}
};

//#endregion
//#region web/src/api.ts
let fileFetchPending = 0;
let fileFetchDelayTimer = null;
let fetchSpinnerEl = null;
function ensureFetchSpinner() {
	if (!fetchSpinnerEl) {
		const host = document.querySelector(".header .header-actions");
		if (!host) return;
		const spinner = el("span", {
			className: "fetch-spinner",
			attrs: { id: "fetch-spinner" }
		});
		host.insertBefore(spinner, host.firstChild);
		fetchSpinnerEl = spinner;
	}
}
function showFetchSpinnerDelayed() {
	ensureFetchSpinner();
	if (!fetchSpinnerEl) return;
	if (fileFetchDelayTimer) return;
	fileFetchDelayTimer = setTimeout(() => {
		if (fileFetchPending > 0) {
			fetchSpinnerEl?.classList.add("visible");
			const app = window.__APP;
			if (app && typeof app.eagerPrefetchAllFiles === "function") app.eagerPrefetchAllFiles();
		}
		fileFetchDelayTimer = null;
	}, 400);
}
function hideFetchSpinnerMaybe() {
	if (fileFetchPending === 0) {
		if (fileFetchDelayTimer) {
			clearTimeout(fileFetchDelayTimer);
			fileFetchDelayTimer = null;
		}
		if (fetchSpinnerEl) fetchSpinnerEl.classList.remove("visible");
	}
}
async function fetchJSON(url, options) {
	const isFile = url.startsWith("/api/file");
	if (isFile) {
		fileFetchPending++;
		if (fileFetchPending === 1) showFetchSpinnerDelayed();
	}
	try {
		const res = await fetch(url, options);
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Request failed ${res.status} ${res.statusText} at ${url}${text ? `: ${text.slice(0, 200)}` : ""}`);
		}
		return await res.json();
	} finally {
		if (isFile) {
			fileFetchPending = Math.max(0, fileFetchPending - 1);
			hideFetchSpinnerMaybe();
		}
	}
}

//#endregion
//#region web/src/config.ts
const DEFAULT_APP_CONFIG = {
	color_scheme: "vs-dark",
	font: "JetBrains Mono",
	split_view: true,
	auto_close_tab: true,
	stacked_view: false
};
function resolveAppConfig(input) {
	return {
		color_scheme: input.color_scheme ?? DEFAULT_APP_CONFIG.color_scheme,
		font: input.font?.trim() || DEFAULT_APP_CONFIG.font,
		split_view: input.split_view ?? DEFAULT_APP_CONFIG.split_view,
		auto_close_tab: input.auto_close_tab ?? DEFAULT_APP_CONFIG.auto_close_tab,
		stacked_view: input.stacked_view ?? DEFAULT_APP_CONFIG.stacked_view
	};
}

//#endregion
//#region web/src/comment-draft-storage.ts
const DB_NAME = "lrv-comment-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
let dbPromise = null;
function buildCommentDraftKey(context, diff, seriesInfo) {
	const fingerprint = JSON.stringify({
		working_directory: context.working_directory ?? null,
		git_branch: context.git_branch ?? null,
		commit_id: diff.jj_change_id ?? diff.commit_hash ?? null,
		series: seriesInfo?.is_series ? seriesInfo.commits.map((c) => c.jj_change_id ?? c.commit_hash ?? null) : null
	});
	return `review-comments:v2:${hashString(fingerprint)}:${fingerprint.length.toString(36)}`;
}
async function loadCommentDraft(key) {
	const db = await openDraftDb();
	if (!db) return [];
	try {
		const record = await runTransaction(db, "readonly", (store) => store.get(key));
		if (!record || record.schemaVersion !== 1 || !Array.isArray(record.comments)) return [];
		return sanitizeComments(record.comments);
	} catch (error) {
		console.warn("Failed to load persisted review comments:", error);
		return [];
	}
}
async function saveCommentDraft(key, comments) {
	const sanitized = sanitizeComments(comments);
	if (sanitized.length === 0) {
		await clearCommentDraft(key);
		return;
	}
	const db = await openDraftDb();
	if (!db) return;
	const record = {
		key,
		schemaVersion: 1,
		savedAt: Date.now(),
		comments: sanitized
	};
	try {
		await runTransaction(db, "readwrite", (store) => store.put(record));
	} catch (error) {
		console.warn("Failed to persist review comments:", error);
	}
}
async function clearCommentDraft(key) {
	const db = await openDraftDb();
	if (!db) return;
	try {
		await runTransaction(db, "readwrite", (store) => store.delete(key));
	} catch (error) {
		console.warn("Failed to clear persisted review comments:", error);
	}
}
function openDraftDb() {
	if (typeof indexedDB === "undefined") return Promise.resolve(null);
	dbPromise ??= new Promise((resolve) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => {
			console.warn("Failed to open review comment draft database:", request.error);
			resolve(null);
		};
		request.onblocked = () => {
			console.warn("Review comment draft database open is blocked by another tab");
			resolve(null);
		};
	});
	return dbPromise;
}
function runTransaction(db, mode, action) {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, mode);
		let result;
		tx.oncomplete = () => resolve(result);
		tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction failed"));
		tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted"));
		try {
			const request = action(tx.objectStore(STORE_NAME));
			request.onsuccess = () => {
				result = request.result;
			};
			request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("IndexedDB request failed"));
		} catch (error) {
			reject(error);
		}
	});
}
function sanitizeComments(value) {
	if (!Array.isArray(value)) return [];
	const comments = [];
	for (const item of value) {
		const comment = sanitizeComment(item);
		if (comment) comments.push(comment);
	}
	return comments;
}
function sanitizeComment(value) {
	if (!value || typeof value !== "object") return null;
	const raw = value;
	if (typeof raw.file !== "string" || !isCommentLine(raw.line) || raw.side !== "old" && raw.side !== "new" || typeof raw.body !== "string") return null;
	const comment = {
		file: raw.file,
		line: cloneCommentLine(raw.line),
		side: raw.side,
		body: raw.body
	};
	if (typeof raw.commit_idx === "number" && Number.isInteger(raw.commit_idx)) comment.commit_idx = raw.commit_idx;
	return comment;
}
function isCommentLine(value) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return true;
	if (!Array.isArray(value) || value.length !== 2) return false;
	const start = value[0];
	const end = value[1];
	return typeof start === "number" && typeof end === "number" && Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start;
}
function cloneCommentLine(line) {
	return Array.isArray(line) ? [line[0], line[1]] : line;
}
function hashString(value) {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}

//#endregion
//#region web/src/ui-signals.ts
let navTimer = null;
const FIRST_LINE_SELECTOR = ".monaco-editor .view-lines .view-line";
const STACKED_READY_SELECTOR = ".stacked-code-view diffs-container, .stacked-empty";
function recordFirstLineVisible() {
	if (performance.getEntriesByName("init:first-line-visible").length !== 0) return;
	window.Perf.mark("init:first-line-visible");
	if (performance.getEntriesByName("init:start").length > 0) window.Perf.measure("init:to-first-line-visible", "init:start", "init:first-line-visible");
	if (performance.getEntriesByName("page:script-start").length > 0) window.Perf.measure("page:script-to-first-line-visible", "page:script-start", "init:first-line-visible");
}
function setAppReady(debugMessage) {
	window.__APP_READY = true;
	window.Perf.mark("init:app-ready");
	if (performance.getEntriesByName("appInit").length > 0) window.Perf.measure("init:app-ready-after-appInit", "appInitEnd", "init:app-ready");
	if (window.DEBUG) console.info(debugMessage);
}
function showNavIndicator(text) {
	const indicatorEl = document.getElementById("nav-indicator");
	if (!indicatorEl) return;
	indicatorEl.textContent = text;
	indicatorEl.style.display = "inline-block";
	if (navTimer) clearTimeout(navTimer);
	navTimer = setTimeout(() => {
		indicatorEl.style.display = "none";
	}, 900);
}
function markAppReady() {
	if (window.__APP_READY) return;
	if (document.querySelectorAll(FIRST_LINE_SELECTOR).length > 0) {
		recordFirstLineVisible();
		setAppReady("[app] APP_READY: diff lines visible");
		return;
	}
	if (document.querySelector(STACKED_READY_SELECTOR)) {
		recordFirstLineVisible();
		setAppReady("[app] APP_READY: stacked diff visible");
		return;
	}
	const container = document.querySelector(".monaco-editor .view-lines");
	if (container) {
		if (window.DEBUG) console.info("[app] Waiting for first view-line via MutationObserver");
		const obs = new MutationObserver(() => {
			if (document.querySelectorAll(FIRST_LINE_SELECTOR).length > 0) {
				recordFirstLineVisible();
				setAppReady("[app] APP_READY: observer saw first line");
				obs.disconnect();
			}
		});
		obs.observe(container, {
			childList: true,
			subtree: true
		});
	}
}

//#endregion
//#region web/src/linkify.ts
const BUG_RE = /\b([bB]ug)\s+(\d{6,})\b/g;
const PHAB_RE = /\b(D\d{6,})\b/g;
const MD_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const URL_RE = /\bhttps?:\/\/[^\s<>()]+/g;
function appendLinkifiedText(target, text) {
	target.textContent = "";
	target.appendChild(linkifyText(text));
}
function linkifyText(text) {
	const fragment = document.createDocumentFragment();
	const matches = [];
	for (const match of text.matchAll(MD_LINK_RE)) {
		const full = match[0];
		const label = match[1];
		const href = match[2];
		if (!full || !label || !href || match.index === void 0) continue;
		matches.push({
			start: match.index,
			end: match.index + full.length,
			text: label,
			href
		});
	}
	for (const match of text.matchAll(URL_RE)) {
		const full = match[0];
		if (!full || match.index === void 0) continue;
		const trimmed = full.replace(/[),.;:!?]+$/g, "");
		matches.push({
			start: match.index,
			end: match.index + trimmed.length,
			text: trimmed,
			href: trimmed
		});
	}
	for (const match of text.matchAll(BUG_RE)) {
		const full = match[0];
		const id = match[2];
		if (!full || !id || match.index === void 0) continue;
		matches.push({
			start: match.index,
			end: match.index + full.length,
			text: full,
			href: `https://bugzilla.mozilla.org/show_bug.cgi?id=${id}`
		});
	}
	for (const match of text.matchAll(PHAB_RE)) {
		const full = match[1];
		if (!full || match.index === void 0) continue;
		matches.push({
			start: match.index,
			end: match.index + full.length,
			text: full,
			href: `https://phabricator.services.mozilla.com/${full}`
		});
	}
	if (matches.length === 0) {
		fragment.appendChild(document.createTextNode(text));
		return fragment;
	}
	matches.sort((a, b) => a.start - b.start || b.end - a.end);
	const filtered = [];
	let cursor = -1;
	matches.forEach((match) => {
		if (match.start < cursor) return;
		filtered.push(match);
		cursor = match.end;
	});
	let pos = 0;
	filtered.forEach((match) => {
		if (match.start > pos) fragment.appendChild(document.createTextNode(text.slice(pos, match.start)));
		const anchor = el("a", {
			className: "auto-link",
			text: match.text,
			attrs: {
				href: match.href,
				target: "_blank",
				rel: "noopener noreferrer"
			}
		});
		fragment.appendChild(anchor);
		pos = match.end;
	});
	if (pos < text.length) fragment.appendChild(document.createTextNode(text.slice(pos)));
	return fragment;
}

//#endregion
//#region web/src/diff-utils.ts
const MONACO_HIDE_UNCHANGED = {
	enabled: true,
	contextLineCount: 8,
	minimumLineCount: 3,
	revealLineCount: 30
};
function computeHunkRanges(hunks) {
	const hunkRanges = [];
	hunks.forEach((hunk) => {
		const newLines = hunk.lines.filter((l) => l.new_line !== void 0).map((l) => l.new_line);
		if (newLines.length > 0) hunkRanges.push({
			side: "new",
			start: Math.min(...newLines),
			end: Math.max(...newLines)
		});
		const deletedOldLines = hunk.lines.filter((l) => l.old_line !== void 0 && l.type === "delete").map((l) => l.old_line);
		if (deletedOldLines.length > 0) hunkRanges.push({
			side: "old",
			start: Math.min(...deletedOldLines),
			end: Math.max(...deletedOldLines)
		});
	});
	return { hunkRanges };
}

//#endregion
//#region web/src/file-data-methods.ts
var FileDataMethods = class {
	commitParam() {
		return this.seriesInfo?.is_series ? `&commit=${this.currentCommitIdx}` : "";
	}
	fileCacheKey(filePath) {
		return this.seriesInfo?.is_series ? `${this.currentCommitIdx}:${filePath}` : filePath;
	}
	async fetchFilePair(filePath) {
		const cacheKey = this.fileCacheKey(filePath);
		if (this.fileCache[cacheKey]) return this.fileCache[cacheKey];
		const cp = this.commitParam();
		const [oldData, newData] = await Promise.all([fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=old${cp}`).catch((err) => {
			if (window.DEBUG) console.error("[app] old fetch failed", err);
			return { content: "" };
		}), fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=new${cp}`).catch((err) => {
			if (window.DEBUG) console.error("[app] new fetch failed", err);
			return { content: "" };
		})]);
		this.fileCache[cacheKey] = {
			old: oldData.content ?? "",
			new: newData.content ?? ""
		};
		return this.fileCache[cacheKey];
	}
	async eagerPrefetchAllFiles() {
		if (this._eagerPrefetchStarted) return;
		this._eagerPrefetchStarted = true;
		const toFetch = this.files.map((f) => f.path).filter((p) => !this.fileCache[this.fileCacheKey(p)]);
		if (toFetch.length === 0) return;
		if (window.DEBUG) console.info("[prefetch] warming", toFetch.length, "files");
		const cp = this.commitParam();
		const concurrency = 8;
		let i = 0;
		const nextBatch = () => {
			const batch = [];
			for (let k = 0; k < concurrency && i < toFetch.length; k++, i++) {
				const p = toFetch[i];
				batch.push(Promise.all([fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=old${cp}`), fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=new${cp}`)]).then(([oldData, newData]) => {
					this.fileCache[this.fileCacheKey(p)] = {
						old: oldData.content ?? "",
						new: newData.content ?? ""
					};
				}).catch(() => {}));
			}
			return Promise.all(batch);
		};
		while (i < toFetch.length) await nextBatch();
		if (window.DEBUG) console.info("[prefetch] done");
	}
	initFileHunks(file) {
		if (!this.fileHunks[file.path]) {
			const { hunkRanges } = computeHunkRanges(file.hunks);
			this.fileHunks[file.path] = hunkRanges;
			this.currentHunkIndex[file.path] = 0;
		}
	}
};

//#endregion
//#region node_modules/@pierre/trees/dist/builtInIcons.js
const MINIMAL_SVG_SPRITE_SHEET = `<svg data-icon-sprite aria-hidden="true" width="0" height="0">
  <symbol id="file-tree-icon-chevron" viewBox="0 0 16 16">
    <path d="M12.4697 5.46973C12.7626 5.17684 13.2374 5.17684 13.5303 5.46973C13.8232 5.76262 13.8232 6.23738 13.5303 6.53028L8.53028 11.5303C8.23738 11.8232 7.76262 11.8232 7.46973 11.5303L2.46973 6.53028C2.17684 6.23738 2.17684 5.76262 2.46973 5.46973C2.76262 5.17684 3.23738 5.17684 3.53028 5.46973L8 9.93946L12.4697 5.46973Z" fill="currentcolor"/>
  </symbol>
  <symbol id="file-tree-icon-dot" viewBox="0 0 6 6">
    <circle cx="3" cy="3" r="3" />
  </symbol>
  <symbol id="file-tree-icon-file" viewBox="0 0 16 16">
    <path fill="currentColor" d="M8 1v3a3 3 0 0 0 3 3h3v5.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 12.5v-9A2.5 2.5 0 0 1 4.5 1z" class="bg" opacity=".5"/>
    <path fill="currentColor" d="M9.5 1a.5.5 0 0 1 .354.146l4 4A.5.5 0 0 1 14 5.5V6h-3a2 2 0 0 1-2-2V1z" class="fg"/>
  </symbol>
  <symbol id="file-tree-icon-lock" viewBox="0 0 16 16">
    <path fill="currentcolor" d="M4 5.336V4a4 4 0 1 1 8 0v1.336c1.586.54 2 1.843 2 4.664v1c0 4.118-.883 5-5 5H7c-4.117 0-5-.883-5-5v-1c0-2.821.414-4.124 2-4.664M5.5 4v1.054Q6.166 4.998 7 5h2q.834-.002 1.5.054V4a2.5 2.5 0 0 0-5 0m-2 6v1c0 .995.055 1.692.167 2.193.107.483.246.686.35.79s.307.243.79.35c.5.112 1.198.167 2.193.167h2c.995 0 1.692-.055 2.193-.166.483-.108.686-.247.79-.35.104-.105.243-.308.35-.791.112-.5.167-1.198.167-2.193v-1c0-.995-.055-1.692-.166-2.193-.108-.483-.247-.686-.35-.79-.105-.104-.308-.243-.791-.35C10.693 6.555 9.995 6.5 9 6.5H7c-.995 0-1.692.055-2.193.167-.483.107-.686.246-.79.35s-.243.307-.35.79C3.555 8.307 3.5 9.005 3.5 10" />
  </symbol>
  <symbol id="file-tree-icon-ellipsis" viewBox="0 0 16 16">
    <path d="M5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M9.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M14 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
  </symbol>
</svg>`;
const sym_astro = `<symbol id="file-tree-builtin-astro" viewBox="0 0 16 16">
  <path fill="currentColor" d="M6.08 13.92c-.63-.57-.81-1.79-.55-2.67.45.56 1.08.73 1.73.83 1 .15 1.99.1 2.92-.37l.32-.19q.13.38.08.78a2.1 2.1 0 0 1-.9 1.5q-.3.24-.61.43c-.64.44-.81.95-.57 1.69l.02.08a1.7 1.7 0 0 1-.74-.64 2 2 0 0 1-.3-.98q0-.27-.02-.52-.07-.61-.61-.62a.7.7 0 0 0-.75.6z" class="bg" opacity=".6"/>
  <path fill="currentColor" d="M2.5 11.1s1.86-.9 3.72-.9l1.4-4.39c.05-.21.2-.36.38-.36s.33.15.38.36l1.4 4.38c2.2 0 3.72.92 3.72.92l-3.16-8.69q-.13-.4-.45-.42H6.11q-.3.02-.45.42z" class="fg"/>
</symbol>`;
const sym_babel = `<symbol id="file-tree-builtin-babel" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M9.49.5q1.92.05 2.66.54 1.27.6 1.35 1.52v.23a4 4 0 0 1-.53 1.9l-1.38 1.24q-.74.38-.72.63c.77.82 1.33 1.29.85 2.42q-.47 1.1-2.04 2.28c-.5.32-1.88 1.35-2.96 1.86-1.64.77-3.1 1.4-4.65 1.89-.51.16-1.5.16-1.5.16L.5 15A76 76 0 0 0 5.76 3.49q-.1-.08-.1-.2.1 0 .32-.35l-.03-.09q-1.17.39-2.38 1.3l-.13.03q0-.1-.21-.16-.46.31-.82.7l-.13-.19.16-.06-.03-.16-.34.29L2 4.5q.36-.48.72-.54l.04-.1V3.8q.16 0 .15-.06l.13-.06a6 6 0 0 0 1.13-.9v-.03H4.1l-.12.07q0-.1-.1-.1l-.15.07-.04-.1q.93-.52 1.63-1.05Q7.89.65 9.5.5M8.46 7.83l-.32.04c-1.31.54-2.31.82-2.91.88a71 71 0 0 0-2.2 4.54h.07q.58-.04 3.04-1.42.13 0 1.66-1.05L9.18 9.7v.03q.45-.2.81-1.3v-.2q-.5-.46-1.53-.4m.28-5.75c-.5.1-.75.19-.72.38l-1.16 2.6q-.17.1-.34.95-.3.48-.25.77v.1l.22.05A15 15 0 0 1 8.86 6c1.1-.71 2.12-1.38 2.8-2.54q.24-.33.21-.54-.02-.33-.4-.54c-.54 0-1.07-.34-1.63-.28l-.94-.03z" clip-rule="evenodd"/>
</symbol>`;
const sym_bash = `<symbol id="file-tree-builtin-bash" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 1C2.24 1 1 2.24 1 8s1.24 7 7 7 7-1.24 7-7-1.24-7-7-7" class="bg" opacity=".2"/>
  <path fill="currentColor" d="M11.5 11a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zM7 6.75C7 6.42 6.64 6 6 6s-1 .42-1 .75q-.01.25.22.41.26.21.89.35.74.14 1.28.53c.37.29.61.7.61 1.21 0 .87-.68 1.5-1.5 1.7v.55a.5.5 0 0 1-1 0v-.56c-.82-.18-1.5-.82-1.5-1.69a.5.5 0 0 1 1 0c0 .33.36.75 1 .75s1-.42 1-.75q.01-.25-.22-.41a2 2 0 0 0-.89-.35q-.74-.14-1.28-.53A1.5 1.5 0 0 1 4 6.75c0-.87.68-1.5 1.5-1.7V4.5a.5.5 0 0 1 1 0v.56c.82.18 1.5.82 1.5 1.69a.5.5 0 0 1-1 0" class="fg-stroke"/>
</symbol>`;
const sym_biome = `<symbol id="file-tree-builtin-biome" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 2 4.88 7.35a7 7 0 0 1 3.7-.13l1.04.25-.99 4.16-1.05-.25a2.7 2.7 0 0 0-3.07 1.45l-.98-.47a4 4 0 0 1 1.07-1.31 3.8 3.8 0 0 1 3.23-.71l.5-2.08a6 6 0 0 0-5.07 1.12A5.9 5.9 0 0 0 1 14h14z"/>
</symbol>`;
const sym_bootstrap = `<symbol id="file-tree-builtin-bootstrap" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M11.72 1.5A2.5 2.5 0 0 1 14.2 4q.02 1.08.3 2.09c.22.73.56 1.24 1.08 1.45.22.08.4.27.4.5s-.18.43-.4.51q-.76.34-1.08 1.45c-.2.65-.27 1.32-.3 2a2.5 2.5 0 0 1-2.48 2.5H4.25A2.6 2.6 0 0 1 1.7 12c-.04-.85-.1-1.68-.22-2.04C1.26 9.23.92 8.7.4 8.5.18 8.42 0 8.23 0 8s.18-.42.4-.5q.77-.35 1.09-1.46c.1-.36.17-1.19.2-2.04a2.6 2.6 0 0 1 2.56-2.5z" class="bg" clip-rule="evenodd" opacity=".2"/>
  <path fill="currentColor" fill-rule="evenodd" d="M8.47 4.54c1.23 0 2.04.68 2.04 1.73 0 .73-.55 1.39-1.24 1.5v.04c.94.1 1.58.77 1.58 1.7 0 1.2-.9 1.95-2.37 1.95H5.97a.3.3 0 0 1-.2-.08.3.3 0 0 1-.08-.2V4.82a.3.3 0 0 1 .08-.2.3.3 0 0 1 .2-.08zm-1.7 6.04h1.49q1.47-.01 1.49-1.15Q9.74 8.31 8.2 8.3H6.77zm0-5.16v2.06h1.21c.93 0 1.45-.38 1.45-1.06 0-.65-.44-1-1.22-1z" class="fg" clip-rule="evenodd"/>
</symbol>`;
const sym_browserslist = `<symbol id="file-tree-builtin-browserslist" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8.88 6.96c0 3.82 3.72 4.7 5.7 3.74-.23.9-1.04 1.67-2.35 1.93-.02.4.42 1.28.82 1.63-.9.35-1.94-.12-2.51-.48a5 5 0 0 0-.32 1.87c-.68 0-1.57-1-1.8-1.37-.3.18-.85 1.15-.96 1.72a2.4 2.4 0 0 1-.81-.86 2.4 2.4 0 0 1-.3-1.15c-.38.27-1.48.95-1.99 1.18-.25-.58-.15-1.3 0-2.06-.21.12-1.8.27-2.43.12.32-.36.75-1.19.94-1.57A4.5 4.5 0 0 1 .44 10.6c.48-.22.97-.53 1.49-1.06C1.26 9.17.24 8.64 0 7.7a6 6 0 0 0 1.79-.32C1.28 7.08.44 6.15.6 5.01c.42.21 1.3.37 1.73.3a3.4 3.4 0 0 1-.25-2.75 5 5 0 0 0 1.48 1c-.08-.8.3-2.31.8-2.71.2.46.73 1.21 1.08 1.4.09-.61.87-2.06 1.57-2.25 0 .5.27 1.4.5 1.67.51-.54 2.25-1.44 3.64-1.13-.43.45-.75.61-.86.98 1.05 0 2.78.34 4.27 1.93-2.34-.89-5.69.56-5.69 3.5" class="bg" opacity=".5"/>
  <path fill="currentColor" d="M11.21 3.59a4.1 4.1 0 0 0 2.47 2.89c.24-.22.61-.38.95-.19.76.44.2 1.26-.34 1.66l-.07.06a13 13 0 0 1-4.49 1.61l-.3-.43a10.5 10.5 0 0 0 4.13-1.31 1 1 0 0 0 .23-.25.5.5 0 0 0-.21-.69l-.15-.06a4.5 4.5 0 0 1-1.77-1.31 4.5 4.5 0 0 1-.88-1.77q.2-.12.43-.21"/>
  <path fill="currentColor" d="M10.36 5.18a.4.4 0 0 0-.03.38c.09.2.3.3.46.23s.24-.3.15-.5l-.01-.02q.23.13.34.39a.83.83 0 0 1-.43 1.08.8.8 0 0 1-1.08-.43.83.83 0 0 1 .6-1.13"/>
</symbol>`;
const sym_bun = `<symbol id="file-tree-builtin-bun" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 14c3.87 0 7-2.46 7-5.49 0-1.88-1.2-3.53-3.04-4.52q-1.1-.61-1.84-1.07C9.2 2.35 8.64 2 8 2s-1.36.45-2.31 1.03A29 29 0 0 1 4.04 4C2.2 4.98 1 6.63 1 8.51 1 11.54 4.13 14 8 14M7.18 3.88q.3-.66.3-1.37c0-.08.11-.1.13-.01.38 1.57-.53 2.35-1.2 2.61-.08.03-.12-.07-.06-.12a3 3 0 0 0 .83-1.12m1.2-.05a3 3 0 0 0-.45-1.3V2.5c-.04-.07.05-.15.1-.1 1.15 1.2.77 2.3.33 2.87-.05.05-.13 0-.11-.08q.21-.67.13-1.37m1.04-.32a3 3 0 0 0-.94-1.02v-.01c-.06-.05-.01-.16.07-.12 1.51.61 1.61 1.8 1.43 2.5l-.03.03a.07.07 0 0 1-.1-.06 3 3 0 0 0-.43-1.32m-2.97.32c-.36.3-.74.43-1.2.56q-.11 0-.1-.1a3.5 3.5 0 0 0 1.76-1.57s.09-.07.1.04c0 .18-.2.76-.56 1.07m2.89 6.36q-.13.52-.55.88a1.3 1.3 0 0 1-.75.35 1.3 1.3 0 0 1-.77-.35 1.7 1.7 0 0 1-.54-.88.13.13 0 0 1 .15-.15h2.31a.14.14 0 0 1 .15.15M6.15 8.95a1.1 1.1 0 0 1-1.39-.14A1.1 1.1 0 0 1 5.12 7a1.1 1.1 0 0 1 1.2.25 1.1 1.1 0 0 1-.17 1.69m4.96 0a1.1 1.1 0 0 1-1.4-.14 1.1 1.1 0 0 1 .37-1.8 1.1 1.1 0 0 1 1.2.25 1.1 1.1 0 0 1 .24 1.2 1 1 0 0 1-.41.5"/>
</symbol>`;
const sym_c = `<symbol id="file-tree-builtin-c" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 1q.084 0 .166.021.098.023.186.075c1.055.624 4.22 2.486 5.277 3.11.085.05.15.112.209.192h-.002l.028.037a.5.5 0 0 1 .103.21q.031.102.033.21v6.29a.71.71 0 0 1-.347.616l-5.307 3.144a.68.68 0 0 1-.693 0l-5.307-3.144A.72.72 0 0 1 2 11.145V4.832a.71.71 0 0 1 .346-.612l5.288-3.126A.7.7 0 0 1 7.992 1zm2.901 4.349a3.75 3.75 0 1 0 0 5.302l-1.06-1.06a2.25 2.25 0 1 1 0-3.182z" clip-rule="evenodd"/>
</symbol>`;
const sym_claude = `<symbol id="file-tree-builtin-claude" viewBox="0 0 16 16">
  <path fill="currentColor" d="M3.75 10.31 6.5 8.77l.04-.14-.04-.07h-.14l-.46-.03-1.57-.04-1.38-.07-1.33-.07-.34-.07L1 7.86l.03-.21.28-.18.4.03.89.07 1.33.08.97.06 1.43.16h.22l.03-.1-.07-.05-.06-.06-1.39-.92-1.48-.98-.79-.57-.42-.28-.2-.28-.1-.6.39-.41.52.04.12.03.52.4 1.12.86L6.2 6.04l.2.17.09-.06.01-.04-.1-.15-.76-1.46-.85-1.46-.37-.6-.1-.36a1 1 0 0 1-.06-.42l.42-.59.25-.07.6.08.22.2.36.84.58 1.3.9 1.77.29.53.14.47.04.14h.1v-.07l.07-1 .14-1.22.14-1.57.04-.45.23-.53.42-.28.36.15.28.41-.04.25-.16 1.08-.36 1.7-.21 1.14h.12l.14-.15.58-.76.97-1.2.42-.5.5-.51.32-.25h.6l.44.66-.2.68-.61.79-.52.65-.74 1-.45.8.04.05h.1l1.68-.36.9-.16 1.06-.18.5.23.05.22-.2.48-1.15.28-1.34.28-2 .46-.04.01.03.04.9.09.4.03h.94l1.77.14.46.28.27.37-.04.28-.72.37-.95-.23-2.24-.53-.76-.18h-.11v.06l.64.63L12 10.86l1.48 1.35.07.34-.18.28-.2-.03-1.29-.98-.5-.42-1.12-.95h-.07v.1l.25.38 1.37 2.05.07.63-.1.2-.36.14-.38-.08-.8-1.12-.85-1.26-.66-1.15-.07.05-.4 4.23-.19.21-.42.17-.35-.28-.2-.42.2-.87.23-1.12.18-.9.17-1.1.1-.36v-.03h-.1l-.84 1.16-1.27 1.72-1 1.07-.24.1-.42-.22.04-.39.22-.32 1.4-1.8.84-1.1.57-.64-.02-.07h-.04l-3.7 2.4-.66.09-.28-.28.03-.42.14-.14 1.12-.77z"/>
</symbol>`;
const sym_cpp = `<symbol id="file-tree-builtin-cpp" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 1q.084 0 .166.021.098.023.186.075c1.055.624 4.22 2.486 5.277 3.11.085.05.15.112.209.192h-.002l.028.037a.5.5 0 0 1 .103.21q.031.102.033.21v6.29a.71.71 0 0 1-.347.616l-5.307 3.144a.68.68 0 0 1-.693 0l-5.307-3.144A.72.72 0 0 1 2 11.145V4.832a.71.71 0 0 1 .346-.612l5.288-3.126A.7.7 0 0 1 7.992 1zm2.901 4.349a3.75 3.75 0 1 0 0 5.302l-1.06-1.06a2.25 2.25 0 1 1 0-3.182z" clip-rule="evenodd"/>
</symbol>`;
const sym_css = `<symbol id="file-tree-builtin-css" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 15c-5.76 0-7-1.24-7-7V2a1 1 0 0 1 1-1h6c5.77 0 7 1.24 7 7s-1.24 7-7 7" class="vector" opacity=".2"/>
  <path fill="currentColor" d="M10.1 9.19h.73c.03.49.22.6 1 .6.76 0 .93-.12.93-.68 0-.52-.17-.67-.94-.85-1.38-.3-1.68-.56-1.68-1.47 0-1.05.3-1.29 1.67-1.29 1.29 0 1.57.2 1.6 1.13h-.74c-.01-.34-.17-.42-.85-.42-.77 0-.94.1-.94.58 0 .42.17.55.96.73 1.36.3 1.66.58 1.66 1.59 0 1.14-.31 1.39-1.73 1.39-1.39 0-1.69-.24-1.67-1.31m-3.9 0h.74c.03.49.21.6.99.6.76 0 .93-.12.93-.68 0-.52-.17-.67-.93-.85-1.39-.3-1.69-.56-1.69-1.47 0-1.05.3-1.29 1.67-1.29 1.3 0 1.58.2 1.6 1.13h-.73c-.02-.34-.18-.42-.85-.42-.78 0-.95.1-.95.58 0 .42.17.55.96.73 1.37.3 1.67.58 1.67 1.59 0 1.14-.32 1.39-1.74 1.39-1.38 0-1.68-.24-1.66-1.31m-1.22 0h.75c-.09 1.07-.37 1.31-1.56 1.31-1.37 0-1.68-.45-1.68-2.5 0-1.96.36-2.5 1.68-2.5 1.16 0 1.44.25 1.52 1.35h-.76c-.08-.52-.22-.64-.76-.64-.74 0-.9.33-.9 1.78 0 1.47.16 1.8.9 1.8.58 0 .74-.11.8-.6"/>
</symbol>`;
const sym_database = `<symbol id="file-tree-builtin-database" viewBox="0 0 16 16">
  <path fill="currentColor" d="M14.953 9.733a12.4 12.4 0 0 1-.244 1.936c-.207.933-.532 1.58-.996 2.044s-1.11.789-2.044.996C10.73 14.918 9.533 15 8 15s-2.73-.082-3.669-.291c-.933-.207-1.58-.532-2.044-.996s-.789-1.11-.996-2.044c-.122-.547-.2-1.182-.244-1.92q.23.364.532.667c.64.639 1.482 1.031 2.533 1.265 1.046.232 2.33.315 3.884.315 1.555 0 2.838-.083 3.884-.315 1.051-.234 1.893-.626 2.532-1.265a4 4 0 0 0 .541-.683"/>
  <path fill="currentColor" d="M14.93 5.924c-.046.663-.118 1.24-.23 1.743-.207.932-.532 1.579-.995 2.042s-1.11.789-2.042.996c-.938.209-2.135.291-3.667.291-1.531 0-2.729-.082-3.667-.29-.932-.208-1.579-.534-2.042-.997s-.789-1.11-.996-2.042a12 12 0 0 1-.227-1.683l.016-.188a4 4 0 0 0 .5.62c.638.639 1.48 1.031 2.532 1.265 1.046.232 2.33.315 3.884.315 1.555 0 2.838-.083 3.884-.315 1.051-.234 1.893-.626 2.532-1.265.192-.192.357-.404.506-.633z"/>
  <path fill="currentColor" d="M8 1c1.533 0 2.73.082 3.669.291.933.207 1.58.533 2.044.996.403.404.904.944.91 1.695.004.764-.509 1.318-.918 1.727-.463.463-1.11.789-2.042.996-.938.209-2.135.291-3.667.291-1.531 0-2.729-.082-3.667-.29-.932-.208-1.579-.534-2.042-.997-.406-.406-.915-.953-.915-1.71 0-.758.509-1.305.915-1.712.464-.463 1.11-.789 2.044-.996C5.27 1.082 6.467 1 8 1"/>
</symbol>`;
const sym_default = `<symbol id="file-tree-builtin-default" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 1v3a3 3 0 0 0 3 3h3v5.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 12.5v-9A2.5 2.5 0 0 1 4.5 1z" class="bg" opacity=".4"/>
  <path fill="currentColor" d="M9.5 1a.5.5 0 0 1 .354.146l4 4A.5.5 0 0 1 14 5.5V6h-3a2 2 0 0 1-2-2V1z" class="fg"/>
</symbol>`;
const sym_docker = `<symbol id="file-tree-builtin-docker" viewBox="0 0 16 16">
  <path fill="currentColor" d="M15.85 6.54c-.05-.04-.45-.36-1.31-.36q-.34 0-.68.06a2.7 2.7 0 0 0-1.14-1.79l-.23-.14-.15.23a3 3 0 0 0-.4 1q-.24 1.01.26 1.84c-.4.24-1.03.3-1.17.3H.5a.5.5 0 0 0-.5.52q-.01 1.46.46 2.83.55 1.5 1.6 2.18c.79.5 2.08.79 3.54.79q.96 0 1.94-.18a8 8 0 0 0 2.55-.97 7 7 0 0 0 1.73-1.5 10 10 0 0 0 1.7-3.06h.15a2.4 2.4 0 0 0 1.8-.7 2 2 0 0 0 .47-.74l.06-.2z"/>
  <path fill="currentColor" d="M1.48 7.36h1.4a.14.14 0 0 0 .14-.13V5.91q-.01-.12-.13-.14H1.48a.13.13 0 0 0-.13.14v1.32q.02.13.13.13m1.94 0h1.41a.14.14 0 0 0 .13-.13V5.91q-.01-.12-.13-.14h-1.4a.13.13 0 0 0-.13.14v1.32q0 .13.12.13m1.98 0h1.4q.13 0 .14-.13V5.91a.13.13 0 0 0-.14-.14H5.4q-.1.01-.12.14v1.32q0 .13.12.13m1.95 0h1.42q.1 0 .12-.13V5.91q0-.12-.12-.14H7.35q-.1.01-.12.14v1.32q.01.13.12.13M3.42 5.5h1.41c.07 0 .13-.08.13-.15V4.03a.13.13 0 0 0-.13-.14h-1.4q-.12 0-.13.14v1.31q0 .13.12.15m1.98 0h1.4c.08 0 .14-.08.14-.15V4.03q0-.13-.14-.14H5.4q-.1 0-.12.14v1.31q0 .13.12.15m1.95 0h1.42c.06 0 .12-.08.12-.15V4.03q-.01-.13-.12-.14H7.35q-.1 0-.12.14v1.31q.01.13.12.15m0-1.9h1.42q.1-.02.12-.14v-1.3Q8.88 2 8.77 2H7.35q-.1 0-.12.14v1.3q.01.13.12.14m1.97 3.78h1.4a.13.13 0 0 0 .14-.13V5.91q-.01-.12-.13-.14H9.32q-.1.01-.12.14v1.32q.01.13.12.13" opacity=".5"/>
</symbol>`;
const sym_eslint = `<symbol id="file-tree-builtin-eslint" viewBox="0 0 16 16">
  <path fill="currentColor" d="M11.16 6.1 8.12 4.35a.3.3 0 0 0-.24 0L4.84 6.1a.3.3 0 0 0-.12.2v3.5q0 .14.12.22l3.04 1.74q.12.08.24 0l3.04-1.74a.2.2 0 0 0 .13-.22V6.3a.3.3 0 0 0-.13-.2" opacity=".5"/>
  <path fill="currentColor" d="m.1 7.69 3.63-6.3A.8.8 0 0 1 4.37 1h7.26c.26 0 .5.17.64.4l3.63 6.27a.8.8 0 0 1 0 .75l-3.63 6.24a.7.7 0 0 1-.64.34H4.37a.7.7 0 0 1-.64-.34L.1 8.41a.7.7 0 0 1 0-.72m3 3.02q.01.15.14.23l4.63 2.66q.13.06.26 0l4.63-2.66a.3.3 0 0 0 .14-.23V5.4a.3.3 0 0 0-.14-.23L8.13 2.52a.3.3 0 0 0-.26 0L3.24 5.17a.3.3 0 0 0-.14.23z"/>
</symbol>`;
const sym_font = `<symbol id="file-tree-builtin-font" viewBox="0 0 16 16">
  <path fill="currentColor" d="M12.3 13c-1.59 0-2.68-.99-2.68-2.5 0-1.43 1-2.34 2.88-2.35h2.16v-.83c0-1.08-.62-1.68-1.73-1.68-1.05 0-1.66.54-1.73 1.36H9.93c.09-1.43 1.06-2.48 3.05-2.48 1.75 0 3.02.95 3.02 2.68v5.66h-1.29v-1.02h-.04c-.41.66-1.16 1.16-2.37 1.16m.36-1.12c1.14 0 2-.72 2-1.74v-.96H12.6c-1.12 0-1.6.54-1.6 1.28 0 .97.8 1.42 1.66 1.42m-11.24.98H0L3.8 2h1.39l3.8 10.86H7.54l-1.08-3.2H2.5zm3.09-9.25h-.04l-1.6 4.95H6.1z"/>
</symbol>`;
const sym_git = `<symbol id="file-tree-builtin-git" viewBox="0 0 16 16">
  <path fill="currentColor" d="M14.74 7.38 8.62 1.26a.9.9 0 0 0-1.27 0L6.08 2.53l1.61 1.61a1.07 1.07 0 0 1 1.36 1.37l1.55 1.55a1.07 1.07 0 0 1 1.1 1.77 1.07 1.07 0 0 1-1.74-1.16L8.5 6.22v3.8a1.07 1.07 0 1 1-.89-.02V6.15a1.07 1.07 0 0 1-.58-1.4l-1.58-1.6-4.2 4.2a.9.9 0 0 0 0 1.27l6.12 6.12a.9.9 0 0 0 1.27 0l6.09-6.09a.9.9 0 0 0 0-1.27"/>
</symbol>`;
const sym_go = `<symbol id="file-tree-builtin-go" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M4.41 4.57A3.2 3.2 0 0 1 6.87 5q.74.49 1.08 1.29.08.12-.1.16l-1.55.4c-.14.03-.15.04-.27-.1a1 1 0 0 0-.44-.34 1.6 1.6 0 0 0-1.68.14q-.95.61-.94 1.73c0 .73.52 1.33 1.25 1.43q.95.1 1.58-.6l.25-.34h-1.8c-.19 0-.24-.12-.17-.27.12-.28.34-.76.47-1a.3.3 0 0 1 .24-.14h2.98a4 4 0 0 1 .64-1.19 4 4 0 0 1 2.6-1.52 3.5 3.5 0 0 1 2.64.46q1.13.73 1.31 2.04a3.5 3.5 0 0 1-1.06 3.09q-.93.92-2.23 1.17l-.74.08a3.5 3.5 0 0 1-2.27-.8 3 3 0 0 1-.93-1.42 4 4 0 0 1-.39.61 4 4 0 0 1-2.64 1.56 3.3 3.3 0 0 1-2.5-.6 3 3 0 0 1-1.18-2.03 3.5 3.5 0 0 1 .8-2.67 4 4 0 0 1 2.6-1.58M13.1 7.5a1.53 1.53 0 0 0-1.9-1.21q-1.3.3-1.62 1.59a1.5 1.5 0 0 0 .85 1.72q.77.33 1.52-.05a2 2 0 0 0 1.18-1.74q0-.17-.03-.3" clip-rule="evenodd"/>
</symbol>`;
const sym_graphql = `<symbol id="file-tree-builtin-graphql" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 1a1.25 1.25 0 0 1 1.18 1.65l2.8 1.61q.33-.25.77-.26a1.25 1.25 0 0 1 .48 2.4v3.2a1.25 1.25 0 1 1-1.25 2.13l-2.8 1.62A1.25 1.25 0 0 1 8 15a1.25 1.25 0 0 1-1.18-1.65l-2.8-1.62q-.33.26-.77.27a1.25 1.25 0 0 1-.48-2.4V6.4a1.25 1.25 0 1 1 1.25-2.14l2.8-1.61A1.25 1.25 0 0 1 8 1M4.44 11.14l-.06.13 2.75 1.58a1.25 1.25 0 0 1 1.74 0l2.74-1.58-.05-.13zm3.89-7.68a1.3 1.3 0 0 1-.66 0L4.03 9.77q.37.3.45.78h7.04q.08-.48.45-.78zM4.38 4.73a1.24 1.24 0 0 1-1.02 1.76v3.02l.13.01 3.67-6.35-.03-.02zm4.46-1.56 3.67 6.35.13-.01V6.49a1.25 1.25 0 0 1-1.03-1.76L8.87 3.15z" clip-rule="evenodd"/>
</symbol>`;
const sym_html = `<symbol id="file-tree-builtin-html" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 1C2.24 1 1 2.24 1 8s1.24 7 7 7 7-1.24 7-7-1.24-7-7-7" class="bg" opacity=".2"/>
  <path fill="currentColor" d="M10.48 3.76a.5.5 0 0 1 .4.58L10.6 5.8h1.14a.5.5 0 0 1 0 1h-1.32L10 9.2h1.08a.5.5 0 0 1 0 1H9.8l-.3 1.64a.5.5 0 1 1-.98-.18l.27-1.46H6.4l-.3 1.64a.5.5 0 1 1-.98-.18l.27-1.46H4.25a.5.5 0 0 1 0-1h1.32L6 6.8H4.93a.5.5 0 0 1 0-1H6.2l.3-1.64a.5.5 0 1 1 .98.18L7.2 5.8h2.4l.3-1.64a.5.5 0 0 1 .58-.4M6.58 9.2h2.4l.44-2.4h-2.4z" class="fg"/>
</symbol>`;
const sym_image = `<symbol id="file-tree-builtin-image" viewBox="0 0 16 16">
  <path fill="currentColor" d="M12.5 2A2.5 2.5 0 0 1 15 4.5v4.67l-4.05-3.54-4.08 4.08-3-2L1 10.6V4.5A2.5 2.5 0 0 1 3.5 2z" opacity=".3"/>
  <path fill="currentColor" d="M15 10.5v1a2.5 2.5 0 0 1-2.5 2.5h-9a2.5 2.5 0 0 1-2.46-2.04L4 9l3 2 4-4zm-7-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
</symbol>`;
const sym_javascript = `<symbol id="file-tree-builtin-javascript" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 1C2.24 1 1 2.24 1 8s1.24 7 7 7 7-1.24 7-7-1.24-7-7-7" class="bg" opacity=".2"/>
  <path fill="currentColor" d="M8.1 9.64h.95c.04.62.28.76 1.28.76s1.2-.14 1.2-.85c0-.66-.2-.85-1.2-1.07-1.79-.38-2.18-.7-2.18-1.86C8.15 5.3 8.54 5 10.31 5c1.67 0 2.04.26 2.07 1.42h-.95c-.02-.43-.23-.53-1.1-.53-1 0-1.22.14-1.22.74 0 .52.22.7 1.24.92 1.76.38 2.15.73 2.15 2 0 1.44-.4 1.75-2.24 1.75-1.8 0-2.18-.3-2.15-1.66M3.5 9.5h.98c0 .76.15.92.85.92.77 0 .94-.18.94-1.02V5.1h1v4.34c0 1.54-.35 1.87-1.92 1.87-1.55 0-1.89-.32-1.86-1.8"/>
</symbol>`;
const sym_json = `<symbol id="file-tree-builtin-json" viewBox="0 0 16 16">
  <path fill="currentColor" d="M13.25 11.5V9.75a.5.5 0 0 1 .36-.48l.55-.15a1.16 1.16 0 0 0 0-2.24l-.55-.15a.5.5 0 0 1-.36-.48V4.5a2.5 2.5 0 0 0-2.5-2.5h-.25a.5.5 0 0 0 0 1h.25a1.5 1.5 0 0 1 1.5 1.5v1.75a1.5 1.5 0 0 0 1.09 1.44l.54.15a.16.16 0 0 1 0 .32l-.54.15a1.5 1.5 0 0 0-1.09 1.44v1.75a1.5 1.5 0 0 1-1.5 1.5h-.25a.5.5 0 0 0 0 1h.25a2.5 2.5 0 0 0 2.5-2.5m-10.5 0V9.75a.5.5 0 0 0-.36-.48l-.55-.15a1.16 1.16 0 0 1 0-2.24l.55-.15a.5.5 0 0 0 .36-.48V4.5A2.5 2.5 0 0 1 5.25 2h.25a.5.5 0 0 1 0 1h-.25a1.5 1.5 0 0 0-1.5 1.5v1.75a1.5 1.5 0 0 1-1.09 1.44l-.54.15a.16.16 0 0 0 0 .32l.54.15a1.5 1.5 0 0 1 1.09 1.45v1.74a1.5 1.5 0 0 0 1.5 1.5h.25a.5.5 0 0 1 0 1h-.25a2.5 2.5 0 0 1-2.5-2.5"/>
</symbol>`;
const sym_markdown = `<symbol id="file-tree-builtin-markdown" viewBox="0 0 16 16">
  <path fill="currentColor" d="M1 12V4h2l2 2.5L7 4h2v8H7V7.5l-2 2-2-2V12zm9-3 3 3.5L16 9h-2V4h-2v5z"/>
</symbol>`;
const sym_mcp = `<symbol id="file-tree-builtin-mcp" viewBox="0 0 16 16">
  <path fill="currentColor" d="M9.26-.04a3 3 0 0 1 2 .82 2.8 2.8 0 0 1 .8 2.35 2.9 2.9 0 0 1 2.41.8l.03.02a2.74 2.74 0 0 1 0 3.94l-5.8 5.69-.04.06-.02.07q0 .04.02.07.01.04.04.06l1.2 1.17a.55.55 0 0 1 0 .79.6.6 0 0 1-.81 0l-1.2-1.17a1.3 1.3 0 0 1 0-1.84L13.7 7.1a1.65 1.65 0 0 0 .37-1.82 2 2 0 0 0-.37-.54l-.03-.03a1.73 1.73 0 0 0-2.4 0L6.47 9.4l-.07.06a.58.58 0 0 1-.92-.18.6.6 0 0 1 .12-.6l4.85-4.76a1.65 1.65 0 0 0 0-2.36 1.73 1.73 0 0 0-2.4 0l-6.43 6.3a.6.6 0 0 1-.8 0 .55.55 0 0 1 0-.8L7.25.79a3 3 0 0 1 2-.82"/>
  <path fill="currentColor" d="M9.26 2.19a.6.6 0 0 1 .52.34.6.6 0 0 1 0 .43l-.12.18L4.9 7.79a1.65 1.65 0 0 0 0 2.36 1.73 1.73 0 0 0 2.4 0l4.75-4.66a.58.58 0 0 1 .93.18.6.6 0 0 1-.12.61l-4.75 4.66a2.9 2.9 0 0 1-4.01 0 2.75 2.75 0 0 1-.62-3.04A3 3 0 0 1 4.1 7l4.74-4.65a.6.6 0 0 1 .4-.16"/>
</symbol>`;
const sym_nextjs = `<symbol id="file-tree-builtin-nextjs" viewBox="0 0 16 16">
  <defs>
  <linearGradient id="a" x1="4.522" x2="14" y1="3.943" y2="16" gradientUnits="userSpaceOnUse">
  <stop stop-color="currentColor"/>
  <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
  </linearGradient>
  </defs>
  <path fill="currentColor" d="M3 2h1.522v9.09H3z"/>
  <path fill="url(#a)" d="M4.903 2 15 15.075q-.565.5-1.195.925L4.522 3.943z"/>
  <path fill="currentColor" d="M12.172 2h-1.508v9.094h1.508z"/>
</symbol>`;
const sym_npm = `<symbol id="file-tree-builtin-npm" viewBox="0 0 16 16">
  <path fill="currentColor" d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" class="vector" opacity=".2"/>
  <path fill="currentColor" d="M10.5 13H13V3H3v10h5V5.5h2.5z"/>
</symbol>`;
const sym_oxc = `<symbol id="file-tree-builtin-oxc" viewBox="0 0 16 16">
  <path fill="currentColor" d="M9.5 1a.5.5 0 0 1 .5.5V3h3.5a.5.5 0 0 1 .38.83L10.5 7.69v1.44q.41.04.95-.16a4 4 0 0 0 .72-.35l.04-.03h.01a.5.5 0 0 1 .67.1l2 2.5a.5.5 0 0 1 0 .62c-.76.96-3.14 2.69-6.89 2.69s-6.13-1.73-6.89-2.69a.5.5 0 0 1 0-.62l2-2.5a.5.5 0 0 1 .67-.1l.05.03.16.09q.22.13.56.26.54.2.95.16V7.69L2.12 3.83A.5.5 0 0 1 2.5 3H6V1.5a.5.5 0 0 1 .5-.5zM7 3.5a.5.5 0 0 1-.5.5H3.6l2.78 3.17a.5.5 0 0 1 .12.33v2a.5.5 0 0 1-.28.45c-.7.35-1.5.15-2.02-.05a5 5 0 0 1-.58-.26l-1.46 1.84c.82.78 2.8 2.02 5.84 2.02s5.02-1.24 5.84-2.02l-1.46-1.83a5 5 0 0 1-.58.26c-.52.2-1.33.39-2.02.04a.5.5 0 0 1-.28-.45v-2a.5.5 0 0 1 .12-.33L12.4 4H9.5a.5.5 0 0 1-.5-.5V2H7z"/>
</symbol>`;
const sym_postcss = `<symbol id="file-tree-builtin-postcss" viewBox="0 0 16 16">
  <path fill="currentColor" d="M14.5 8a6.5 6.5 0 0 0-5.9-6.47l5.42 8.93A7 7 0 0 0 14.5 8M2.88 12A6.5 6.5 0 0 0 8 14.5c2.08 0 3.93-.98 5.12-2.5zm8.62-1h1.68L11.5 8.24zm-1-.55a4 4 0 0 1-.7.55h.7zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M5.5 11h.7a4 4 0 0 1-.7-.55zm-2.68 0H4.5V8.24zm3.76-6.2A4 4 0 0 1 8 4.5q.76 0 1.42.3L8 2.46zM1.5 8q0 1.31.48 2.46L7.4 1.53A6.5 6.5 0 0 0 1.5 8m14 0a7.5 7.5 0 0 1-.99 3.72l-.01.03-.02.03A7.5 7.5 0 0 1 8 15.5a7.5 7.5 0 0 1-6.5-3.75l-.01-.03A7.5 7.5 0 1 1 15.5 8"/>
</symbol>`;
const sym_prettier = `<symbol id="file-tree-builtin-prettier" viewBox="0 0 16 16">
  <path fill="currentColor" d="M6 12v1H4.93v-1zm1-2v1H2v-1zm6-4v1h-3V6zm-1-4v1H9V2z"/>
  <path fill="currentColor" d="M11.5 10v1H8v-1zM5 6v1H2V6zm5-2v1H9V4z" opacity=".8"/>
  <path fill="currentColor" d="M6 14v1H2v-1zm-.5-6v1H2V8zM13 4v1h-3V4zM4.93 2v1H2V2z" opacity=".6"/>
  <path fill="currentColor" d="M4.93 12v1H2v-1zM13 8v1H9V8zM5.5 4v1H2V4zM9 2v1H4.93V2z" opacity=".4"/>
</symbol>`;
const sym_python = `<symbol id="file-tree-builtin-python" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8.33 8.4H10c1.16 0 1.9-.73 1.9-1.86V5.08q0-.24.25-.24h.74c.75 0 1.33.32 1.66.97q.4.73.41 1.46c.09.9.09 1.78-.24 2.67-.25.73-.75 1.3-1.58 1.46h-4.8c-.08 0-.25 0-.25.08v.4s.17.09.25.09h2.82q.34-.02.33.32v1.06c0 .56-.25.97-.75 1.13-.41.16-.83.33-1.24.4a7 7 0 0 1-2.98-.07 3 3 0 0 1-1.16-.49c-.33-.32-.58-.65-.5-1.14v-2.91c0-1.13.67-1.78 1.82-1.78q.89-.1 1.66-.08m2.32 4.86a.65.65 0 0 0-.66-.65c-.34 0-.67.33-.67.65s.33.57.67.65a.65.65 0 0 0 .66-.65" class="bg" opacity=".8"/>
  <path fill="currentColor" d="M7.67 7.6H6c-1.16 0-1.9.73-1.9 1.86v1.46q0 .24-.25.24h-.74c-.75 0-1.33-.32-1.66-.97a3 3 0 0 1-.41-1.46 6 6 0 0 1 .24-2.67c.25-.73.75-1.3 1.58-1.46h4.8c.08 0 .25 0 .25-.08v-.4s-.17-.09-.25-.09H4.85c-.24 0-.33-.08-.33-.32V2.65c0-.56.25-.97.75-1.13.41-.16.83-.33 1.24-.4a7 7 0 0 1 2.98.07c.41.09.83.25 1.16.49.33.32.58.65.5 1.13v2.92c0 1.14-.67 1.78-1.82 1.78-.58.08-1.16.08-1.66.08M5.35 2.73c0 .33.25.65.66.65.33 0 .66-.32.66-.65 0-.32-.33-.56-.66-.64a.65.65 0 0 0-.66.64" class="fg"/>
</symbol>`;
const sym_react = `<symbol id="file-tree-builtin-react" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 6.65c.73 0 1.31.6 1.31 1.35S8.73 9.35 8 9.35 6.69 8.75 6.69 8 7.27 6.65 8 6.65"/>
  <path fill="currentColor" fill-rule="evenodd" d="M8 2.55c1.3-.99 2.59-1.34 3.5-.8.92.55 1.27 1.87 1.08 3.53C14.06 5.94 15 6.9 15 8s-.94 2.06-2.42 2.72c.19 1.65-.16 2.98-1.08 3.52-.91.55-2.2.2-3.5-.8-1.3 1-2.58 1.35-3.5.8-.91-.54-1.27-1.87-1.08-3.52C1.94 10.06 1 9.1 1 8s.94-2.06 2.42-2.72c-.19-1.66.17-2.98 1.08-3.52s2.2-.2 3.5.8M4.26 11.2c-.08 1.34.28 2.03.68 2.26s1.15.22 2.25-.52l.11-.09a12 12 0 0 1-1.24-1.39 11 11 0 0 1-1.8-.41zm7.47-.15q-.83.27-1.79.41-.6.8-1.24 1.4l.11.08c1.1.74 1.86.76 2.25.52.4-.23.76-.92.68-2.26zm-3.04.54a14 14 0 0 1-1.38 0q.34.38.69.7.35-.32.7-.7M8 5.29q-.76 0-1.47.1A13 13 0 0 0 5.07 8a14 14 0 0 0 1.46 2.62 13 13 0 0 0 2.94 0A13 13 0 0 0 10.93 8a14 14 0 0 0-1.46-2.62A13 13 0 0 0 8 5.3M4.64 9.18q-.15.5-.25.96.44.16.94.27a15 15 0 0 1-.7-1.23m6.73 0a15 15 0 0 1-.7 1.23q.5-.11.95-.27a10 10 0 0 0-.25-.96M3.44 6.26C2.27 6.86 1.87 7.53 1.87 8s.4 1.14 1.57 1.74l.13.07q.18-.88.55-1.81a12 12 0 0 1-.55-1.8q-.07.02-.13.06m8.99-.07A12 12 0 0 1 11.88 8q.36.94.55 1.8l.13-.06c1.17-.6 1.56-1.27 1.56-1.74s-.39-1.14-1.56-1.74zm-7.1-.6q-.5.11-.94.27.1.46.25.96a15 15 0 0 1 .69-1.23m5.34 0a15 15 0 0 1 .7 1.23q.14-.5.24-.96-.44-.15-.94-.27M7.18 3.06c-1.09-.74-1.85-.76-2.24-.52s-.76.92-.69 2.26l.01.15a11 11 0 0 1 1.8-.41q.6-.8 1.24-1.4zm3.88-.52c-.4-.24-1.15-.22-2.25.52l-.12.08q.65.6 1.25 1.4.96.15 1.8.41v-.14c.08-1.35-.28-2.04-.68-2.27M8 3.7a10 10 0 0 0-.7.7 14 14 0 0 1 1.4 0 10 10 0 0 0-.7-.7" clip-rule="evenodd"/>
</symbol>`;
const sym_ruby = `<symbol id="file-tree-builtin-ruby" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M11.04 2c.48 0 .92.23 1.18.6l2.54 3.65c.37.52.3 1.23-.15 1.69l-5.58 5.64a1.47 1.47 0 0 1-2.06 0L1.39 7.94a1.3 1.3 0 0 1-.15-1.7l2.54-3.63q.2-.3.5-.45.33-.16.68-.16zm.84 2.17a.5.5 0 0 0-.7-.05L8 6.84 4.83 4.12a.5.5 0 0 0-.65.76L6.65 7H3.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1H9.35l2.48-2.12a.5.5 0 0 0 .05-.7" clip-rule="evenodd"/>
</symbol>`;
const sym_rust = `<symbol id="file-tree-builtin-rust" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 .8a.2.2 0 0 1 .18.1l.38.6.16.02.5-.53.01-.01a.2.2 0 0 1 .33.08l.25.68.16.05.59-.43h.02a.2.2 0 0 1 .3.14l.12.71.15.08.65-.3a.2.2 0 0 1 .2.02.2.2 0 0 1 .1.18l-.03.72.12.1.71-.16a.2.2 0 0 1 .25.25l-.17.7q.06.06.1.13l.73-.03A.2.2 0 0 1 14 4a.2.2 0 0 1 .02.2l-.3.66.08.14.71.12a.2.2 0 0 1 .14.32l-.43.59.05.16.68.25a.2.2 0 0 1 .07.35l-.53.49.01.16.62.38a.2.2 0 0 1 0 .36l-.62.38-.01.16.53.5a.2.2 0 0 1-.07.34l-.68.25-.05.16.43.59a.2.2 0 0 1-.14.32l-.72.12-.07.15.3.65a.2.2 0 0 1-.02.2.2.2 0 0 1-.18.1l-.72-.03-.1.13.16.7a.2.2 0 0 1-.25.25l-.7-.17-.13.1.03.73a.2.2 0 0 1-.1.18.2.2 0 0 1-.2.02l-.66-.3-.14.08-.12.71a.2.2 0 0 1-.32.14l-.59-.43-.16.05-.25.68a.2.2 0 0 1-.34.07l-.5-.53-.16.01-.38.62a.2.2 0 0 1-.36 0l-.38-.62-.16-.01-.5.53a.2.2 0 0 1-.34-.07l-.25-.68-.16-.05-.59.43a.2.2 0 0 1-.32-.14L5 13.78l-.15-.07-.65.3a.2.2 0 0 1-.2-.02.2.2 0 0 1-.1-.18l.03-.72-.13-.1-.7.16a.2.2 0 0 1-.25-.25l.17-.7-.1-.13-.73.03a.2.2 0 0 1-.2-.3l.3-.66-.08-.14-.71-.12a.2.2 0 0 1-.14-.32l.43-.59-.05-.16-.68-.25A.2.2 0 0 1 1 9.22l.53-.5-.02-.16-.6-.38A.2.2 0 0 1 .8 8a.2.2 0 0 1 .1-.18l.6-.38.02-.16-.53-.5a.2.2 0 0 1 .07-.34l.68-.25.05-.16-.43-.59a.2.2 0 0 1 .14-.32L2.2 5l.08-.15L2 4.2a.2.2 0 0 1 .2-.3l.72.03.1-.13-.16-.7a.2.2 0 0 1 .25-.25l.7.16.13-.1-.03-.72A.2.2 0 0 1 4 2a.2.2 0 0 1 .2-.02l.65.3L5 2.2l.12-.71v-.03a.2.2 0 0 1 .32-.1l.59.41.16-.04.25-.68.01-.02A.2.2 0 0 1 6.8.99l.49.53.16-.02.38-.61.02-.02A.2.2 0 0 1 8 .79M6.8 9.45h1.26l.06.01q.03.01.03.05v1.52q0 .07-.09.06h-4.5A5.4 5.4 0 0 0 8 13.42a5.4 5.4 0 0 0 4.45-2.33h-2.42c-.36 0-.68-.5-.77-.75-.08-.22-.2-.91-.25-1.12-.15-.61-.59-.71-.78-.73H6.8zM8 2.58a5.4 5.4 0 0 0-4.07 1.85h5.74l.17.02c.23.03.6.12.96.35.34.23.83.68.83 1.4 0 .66-.55 1.16-1.08 1.5.42.33.7.53.86 1.44.04.17.34.32.62.29.29-.03.62-.16.62-.75v-.24q0-.1.07-.1h.68A5.43 5.43 0 0 0 8 2.59M2.96 6.03a5.4 5.4 0 0 0-.19 3.37h1.66V6.03zM6.8 7.06h1.66c.35 0 .77-.12.77-.47 0-.42-.55-.53-.65-.53H6.8z" clip-rule="evenodd"/>
</symbol>`;
const sym_sass = `<symbol id="file-tree-builtin-sass" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8.08 1.44c2.41-.91 4.96-.37 5.35 1.27.39 1.62-.92 3.56-2.6 4.25a5 5 0 0 1-3.26.35c-.58-.2-.92-.62-1-.85-.03-.09-.09-.24 0-.3.05-.03.08-.02.22.15s.7.6 1.75.48c2.78-.34 4.45-2.64 3.92-3.88-.37-.87-2.5-1.26-5.18.16C4.03 4.81 3.85 6.24 3.82 6.8c-.08 1.5 1.73 2.28 2.7 3.4q.04.03.07.08c.3-.12.7-.19 1.35-.2 1.58-.03 2.47 1.08 2.43 2.08-.03.78-.7 1.1-.82 1.13-.1.01-.14.02-.15-.06q-.03-.06.13-.15c.16-.09.42-.3.48-.72.05-.43-.24-1.44-1.76-1.63a3 3 0 0 0-1.33.08c.27.62.32 1.87-.29 2.83-.63 1-1.8 1.61-2.93 1.27-.37-.1-.93-.92-.45-2.05.46-1.07 2.4-2.12 2.66-2.26-.9-.83-3.08-1.95-3.4-3.65-.08-.49.13-1.65 1.46-2.98a12 12 0 0 1 4.11-2.52m-1.88 9.7c-.01.01-.9.47-1.52 1.17-.59.66-.75 1.48-.43 1.69.3.18 1-.04 1.51-.62a3 3 0 0 0 .5-.9q.2-.64.02-1.39z" clip-rule="evenodd"/>
</symbol>`;
const sym_stylelint = `<symbol id="file-tree-builtin-stylelint" viewBox="0 0 16 16">
  <path fill="currentColor" d="M4 3v3.5l1.5-1L7 15 .5 6l1-1.5L0 3l2.5-2h1zm12 0-1.5 1.5 1 1.5L9 15l1.5-9.5 1.5 1V3l.5-2h1zm-8 8.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1m0-3a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1m0-3a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1"/>
  <path fill="currentColor" d="M6.5 2.5V4l-2 1.5v-4zm5 3L9.5 4V2.5l2-1zM9 4H7V2.5h2z"/>
</symbol>`;
const sym_svelte = `<symbol id="file-tree-builtin-svelte" viewBox="0 0 16 16">
  <path fill="currentColor" d="m3.98 3.7 3.36-2.08a4.5 4.5 0 0 1 5.9 1.23 4 4 0 0 1 .7 3.02q-.16.75-.58 1.4c.42.77.56 1.66.4 2.52a3.7 3.7 0 0 1-1.57 2.4l-.17.1-3.36 2.09a4.5 4.5 0 0 1-5.9-1.23 4 4 0 0 1-.66-1.44 4 4 0 0 1-.04-1.58 4 4 0 0 1 .58-1.4 4 4 0 0 1-.4-2.52 3.7 3.7 0 0 1 1.57-2.4zl3.36-2.08zm7.87 0a2.7 2.7 0 0 0-1.26-.95 2.7 2.7 0 0 0-1.6-.07 3 3 0 0 0-.52.2l-.16.09-3.36 2.08a2 2 0 0 0-.69.64 2 2 0 0 0-.36.86 2.3 2.3 0 0 0 .42 1.81A2.7 2.7 0 0 0 7.18 9.4q.28-.06.53-.2l.16-.09 1.28-.79.2-.09a.8.8 0 0 1 .87.31.7.7 0 0 1 .13.55.7.7 0 0 1-.24.4l-.08.05-3.36 2.08-.2.09a1 1 0 0 1-.49-.02 1 1 0 0 1-.38-.3 1 1 0 0 1-.13-.37v-.1l.01-.13-.13-.03a4 4 0 0 1-1.1-.5l-.2-.14-.18-.12-.07.18-.08.3a2.3 2.3 0 0 0 .43 1.82q.45.64 1.19.93.73.28 1.51.14l.16-.04q.27-.07.52-.2l.16-.09 3.36-2.08q.4-.25.69-.64.27-.4.36-.86a2.3 2.3 0 0 0-.42-1.82 2.7 2.7 0 0 0-1.27-.95 2.7 2.7 0 0 0-1.6-.08q-.27.07-.52.2l-.16.1-1.28.79-.2.09a1 1 0 0 1-.49-.03 1 1 0 0 1-.38-.29.7.7 0 0 1-.13-.54.7.7 0 0 1 .24-.4l.08-.06L9.33 4.4l.2-.1a.8.8 0 0 1 .87.32 1 1 0 0 1 .13.38v.22l.11.04q.6.18 1.12.5l.2.14.17.12.06-.19.08-.3a2.3 2.3 0 0 0-.42-1.81z"/>
</symbol>`;
const sym_svg = `<symbol id="file-tree-builtin-svg" viewBox="0 0 16 16">
  <path fill="currentColor" d="M5 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>
  <path fill="currentColor" d="M6 1a5 5 0 0 1 4.58 3H7a3 3 0 0 0-3 3v3.58A5 5 0 0 1 6 1" opacity=".5"/>
</symbol>`;
const sym_svgo = `<symbol id="file-tree-builtin-svgo" viewBox="0 0 16 16">
  <path fill="currentColor" d="M9.43 4.8A.6.6 0 1 1 9.19 6l-.56.96a1.2 1.2 0 0 1 .32 1.58l.7.53a.89.89 0 1 1-.17.22l-.7-.52a1.2 1.2 0 0 1-1.4.25l-.56.87a.75.75 0 1 1-.57-.2 1 1 0 0 1 .32.05l.56-.87a1.2 1.2 0 0 1-.4-1.24l-1.2-.47a.56.56 0 1 1 .1-.28v.02l1.2.47a1.2 1.2 0 0 1 1.56-.55l.56-.97a.6.6 0 0 1-.15-.64.6.6 0 0 1 .63-.4"/>
  <path fill="currentColor" fill-rule="evenodd" d="M9.17 1q.16.63.27 1.26a6 6 0 0 1 1.61.67q.52-.38 1.08-.71l1.65 1.64q-.32.56-.68 1.05.48.78.72 1.67.6.09 1.18.25v2.32q-.55.15-1.11.24a6 6 0 0 1-.7 1.82q.31.44.59.91l-1.65 1.65-.85-.55a6 6 0 0 1-1.9.83q-.08.47-.2.95H6.84q-.12-.46-.2-.93a6 6 0 0 1-1.96-.81q-.39.27-.8.51l-1.65-1.65q.25-.43.53-.84a6 6 0 0 1-.75-1.9L1 9.16V6.83q.54-.14 1.09-.24a6 6 0 0 1 .77-1.74q-.33-.47-.63-.98l1.65-1.65q.54.32 1.03.68a6 6 0 0 1 1.66-.66q.1-.61.26-1.24zM7.96 3.73a4 4 0 0 0-1.74.36 4.5 4.5 0 0 0-2.3 2.3 4.4 4.4 0 0 0-.1 3.29l.03.06a4.4 4.4 0 0 0 2.4 2.47 4.4 4.4 0 0 0 3.48-.02l.03-.02a4.4 4.4 0 0 0 2.3-2.42l.06-.14a4.4 4.4 0 0 0-.2-3.4 4.4 4.4 0 0 0-2.13-2.07L9.47 4a4 4 0 0 0-1.51-.27" clip-rule="evenodd"/>
</symbol>`;
const sym_swift = `<symbol id="file-tree-builtin-swift" viewBox="0 0 16 16">
  <path fill="currentColor" d="M9.63 1c6.15 4.35 4.16 9.15 4.16 9.15s1.75 2.05 1.04 3.85c0 0-.72-1.26-1.93-1.26-1.17 0-1.85 1.26-4.2 1.26C3.47 14 1 9.46 1 9.46c4.71 3.22 7.93.94 7.93.94C6.8 9.12 2.29 3 2.29 3c3.93 3.47 5.63 4.39 5.63 4.39-1.01-.87-3.86-5.13-3.86-5.13C6.34 4.66 10.86 8 10.86 8c1.28-3.7-1.23-7-1.23-7"/>
</symbol>`;
const sym_table = `<symbol id="file-tree-builtin-table" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 4a3 3 0 0 0 3 3h3v5.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 12.5v-9A2.5 2.5 0 0 1 4.5 1H8z" class="bg" opacity=".4"/>
  <path fill="currentColor" d="M11.5 8a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5zM5 12h2.5v-1H5zm3.5 0H11v-1H8.5zM5 10h2.5V9H5zm3.5 0H11V9H8.5zm1-9a.5.5 0 0 1 .354.146l4 4A.5.5 0 0 1 14 5.5V6h-3a2 2 0 0 1-2-2V1z" class="fg"/>
</symbol>`;
const sym_tailwind = `<symbol id="file-tree-builtin-tailwind" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 4Q5.2 4 4.5 6.67q1.05-1.34 2.45-1c.53.12.91.5 1.33.9C8.98 7.23 9.77 8 11.5 8q2.8 0 3.5-2.67-1.05 1.34-2.45 1c-.53-.12-.91-.5-1.33-.9C10.52 4.77 9.73 4 8 4M4.5 8Q1.7 8 1 10.67q1.05-1.34 2.45-1c.53.12.91.5 1.33.9C5.48 11.23 6.26 12 8 12q2.8 0 3.5-2.67-1.05 1.34-2.45 1c-.53-.12-.91-.5-1.33-.9C7.02 8.77 6.24 8 4.5 8" clip-rule="evenodd"/>
</symbol>`;
const sym_terraform = `<symbol id="file-tree-builtin-terraform" viewBox="0 0 16 16">
  <path fill="currentColor" d="M1 0v5.05l4.35 2.53V2.53zm9.18 5.34L5.83 2.82v5.05l4.35 2.53zm.47 5.06V5.34L15 2.82v5.05zm-.48 5.6-4.35-2.53V8.42l4.35 2.53z"/>
</symbol>`;
const sym_text = `<symbol id="file-tree-builtin-text" viewBox="0 0 16 16">
  <path fill="currentColor" fill-rule="evenodd" d="M8 4a3 3 0 0 0 3 3h3v5.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 12.5v-9A2.5 2.5 0 0 1 4.5 1H8z" class="bg" clip-rule="evenodd" opacity=".4"/>
  <path fill="currentColor" d="M8.5 11a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zm2-2a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm-1-8a.5.5 0 0 1 .354.146l4 4A.5.5 0 0 1 14 5.5V6h-3a2 2 0 0 1-2-2V1z"/>
</symbol>`;
const sym_typescript = `<symbol id="file-tree-builtin-typescript" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8 1C2.24 1 1 2.24 1 8s1.24 7 7 7 7-1.24 7-7-1.24-7-7-7" class="bg" opacity=".2"/>
  <path fill="currentColor" d="M8.1 9.64h.95c.04.62.28.76 1.28.76s1.2-.14 1.2-.85c0-.66-.2-.85-1.2-1.07-1.79-.38-2.18-.7-2.18-1.86C8.15 5.3 8.54 5 10.31 5c1.67 0 2.04.26 2.07 1.42h-.95c-.02-.43-.23-.53-1.1-.53-1 0-1.22.14-1.22.74 0 .52.22.7 1.24.92 1.76.38 2.15.73 2.15 2 0 1.44-.4 1.75-2.24 1.75-1.8 0-2.18-.3-2.15-1.66m-3 1.57V5.99H3.5v-.9h4.21v.9H6.1v5.22z"/>
</symbol>`;
const sym_vite = `<symbol id="file-tree-builtin-vite" viewBox="0 0 16 16">
  <path fill="currentColor" d="M8.57 14.87c-.18.26-.55.11-.55-.22v-3.18l-.05-.27-.13-.22-.2-.15-.24-.06H4.29c-.26 0-.4-.32-.26-.55L6.08 7c.3-.46 0-1.1-.5-1.1H1.8c-.25 0-.4-.32-.25-.56l2.65-4.2A.3.3 0 0 1 4.46 1h7.9c.26 0 .4.32.26.55l-2.05 3.23c-.29.46 0 1.1.5 1.1h3.12c.26 0 .4.34.24.57z"/>
</symbol>`;
const sym_vscode = `<symbol id="file-tree-builtin-vscode" viewBox="0 0 16 16">
  <path fill="currentColor" d="m5.11 9.68-2.4 1.84a.6.6 0 0 1-.75-.04l-.77-.7a.6.6 0 0 1 0-.87L3.28 8zm5.52-8.42a.51.51 0 0 1 .87.36V4.8L7.32 8 5.1 6.32z" opacity=".75"/>
  <path fill="currentColor" d="M11.1 14.99h.03zM1.96 4.52a.6.6 0 0 1 .75-.04l8.8 6.71v3.19a.51.51 0 0 1-.88.36L1.19 6.1a.6.6 0 0 1 0-.87z" opacity=".65"/>
  <path fill="currentColor" d="M11.62 14.91a.9.9 0 0 1-1-.17.51.51 0 0 0 .88-.36V1.62a.51.51 0 0 0-.87-.36.9.9 0 0 1 1-.17l2.87 1.39a.9.9 0 0 1 .5.8v9.44a.9.9 0 0 1-.5.8z"/>
</symbol>`;
const sym_vue = `<symbol id="file-tree-builtin-vue" viewBox="0 0 16 16">
  <path fill="currentColor" d="M9.62 2.25 8 5.02 6.38 2.25H1l7 12 7-12z" opacity=".5"/>
  <path fill="currentColor" d="M9.54 2.25 8 4.95l-1.54-2.7H4l4 7 4-7z"/>
</symbol>`;
const sym_wasm = `<symbol id="file-tree-builtin-wasm" viewBox="0 0 16 16">
  <path fill="currentColor" d="M13 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h3a2 2 0 1 0 4 0z" class="subtract" opacity=".2"/>
  <path fill="currentColor" d="M4.64 11.4h.02l.8-3.4h.91l.73 3.45L7.88 8h.96l-1.25 5h-.97L5.9 9.6 5.1 13h-1L3 8h.98z"/>
  <path fill="currentColor" fill-rule="evenodd" d="M13 13h-1.02l-.33-1.11H9.9L9.64 13h-.97l1.26-5h1.54zm-2.49-3.77-.42 1.84h1.32l-.49-1.84z" clip-rule="evenodd"/>
</symbol>`;
const sym_webpack = `<symbol id="file-tree-builtin-webpack" viewBox="0 0 16 16">
  <path fill="currentColor" d="M14.1 11.79 8.26 15v-2.5l3.64-1.94zm.4-.35V4.73l-2.14 1.2v4.3zm-12.6.35L7.74 15v-2.5L4.1 10.56zm-.4-.35V4.73l2.14 1.2v4.3zm.25-7.15 6-3.29v2.42L3.9 5.47l-.03.01zm12.5 0L8.25 1v2.42l3.85 2.05.03.01z" class="bg" opacity=".4"/>
  <path fill="currentColor" d="m7.74 11.93-3.59-1.92v-3.8l3.6 2.02zm.52 0 3.59-1.92v-3.8l-3.6 2.02zM4.4 5.77 8 3.85l3.6 1.93L8 7.8z" class="fg"/>
</symbol>`;
const sym_yml = `<symbol id="file-tree-builtin-yml" viewBox="0 0 16 16">
  <path fill="currentColor" d="M7.5 2A1.5 1.5 0 0 1 9 3.5v3A1.5 1.5 0 0 1 7.5 8h-2v2A1.5 1.5 0 0 0 7 11.5v-1A1.5 1.5 0 0 1 8.5 9h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 7 13.5v-1A2.5 2.5 0 0 1 4.5 10V8h-2A1.5 1.5 0 0 1 1 6.5v-3A1.5 1.5 0 0 1 2.5 2zm1 8a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm-6-7a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/>
</symbol>`;
const sym_zig = `<symbol id="file-tree-builtin-zig" viewBox="0 0 16 16">
  <path fill="currentColor" d="m14.73 1.5-7.29 8.82h4.17l-1.73 2.04H5.76L1.27 14.5l7.3-8.91H4.39l1.73-2.05h4.12z"/>
  <path fill="currentColor" d="M5.21 3.54 3.56 5.6h-.55v4.73h.83L2.1 12.36H1V3.54zm9.79 0v8.82h-4.3l1.74-2.04h.55V5.68h-.83l1.74-2.14z"/>
</symbol>`;
const standardTierSymbols = [
	sym_bash,
	sym_c,
	sym_cpp,
	sym_css,
	sym_database,
	sym_default,
	sym_font,
	sym_git,
	sym_go,
	sym_html,
	sym_image,
	sym_javascript,
	sym_json,
	sym_markdown,
	sym_mcp,
	sym_python,
	sym_ruby,
	sym_rust,
	sym_swift,
	sym_table,
	sym_text,
	sym_typescript,
	`<symbol id="file-tree-builtin-zip" viewBox="0 0 16 16">
  <path fill="currentColor" d="M4.585 2a2 2 0 0 1 1.028.285l1.788 1.072a1 1 0 0 0 .514.143H12A2 2 0 0 1 13.935 5H0V4a2 2 0 0 1 2-2z" class="bg" opacity=".5"/>
  <path fill="currentColor" fill-rule="evenodd" d="M14 12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-1.25h1v-1H0V6h14zM9.9 8.25c-.883 0-1.9.5-1.9.5H7v1h1v1s1.017.5 1.9.5c.884 0 1.6-.672 1.6-1.5s-.716-1.5-1.6-1.5M2 9.75v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1zm-5-1v1h1v-1zm2 0v1h1v-1zm2 0v1h1v-1z" class="fg" clip-rule="evenodd"/>
</symbol>`
];
const completeOnlySymbols = [
	sym_astro,
	sym_babel,
	sym_biome,
	sym_bootstrap,
	sym_browserslist,
	sym_bun,
	sym_claude,
	sym_docker,
	sym_eslint,
	sym_graphql,
	sym_nextjs,
	sym_npm,
	sym_oxc,
	sym_postcss,
	sym_prettier,
	sym_react,
	sym_sass,
	sym_stylelint,
	sym_svelte,
	sym_svg,
	sym_svgo,
	sym_tailwind,
	sym_terraform,
	sym_vite,
	sym_vscode,
	sym_vue,
	sym_wasm,
	sym_webpack,
	sym_yml,
	sym_zig
];
function appendSymbols(spriteSheet, symbols) {
	if (symbols.length === 0) return spriteSheet;
	return spriteSheet.replace("</svg>", `\n  ${symbols.join("\n  ")}\n</svg>`);
}
const STANDARD_SVG_SPRITE_SHEET = appendSymbols(MINIMAL_SVG_SPRITE_SHEET, standardTierSymbols);
const BUILT_IN_SVG_SPRITE_SHEETS = {
	minimal: MINIMAL_SVG_SPRITE_SHEET,
	standard: STANDARD_SVG_SPRITE_SHEET,
	complete: appendSymbols(STANDARD_SVG_SPRITE_SHEET, completeOnlySymbols)
};
const BUILT_IN_FILE_NAME_TOKENS = {
	".babelrc": "babel",
	".babelrc.json": "babel",
	".bash_profile": "bash",
	".bashrc": "bash",
	".browserslistrc": "browserslist",
	".dockerignore": "docker",
	".eslintignore": "eslint",
	".eslintrc": "eslint",
	".eslintrc.cjs": "eslint",
	".eslintrc.js": "eslint",
	".eslintrc.json": "eslint",
	".eslintrc.yaml": "eslint",
	".eslintrc.yml": "eslint",
	".gitattributes": "git",
	".gitignore": "git",
	".gitkeep": "git",
	".gitmodules": "git",
	".oxlintrc.json": "oxc",
	".postcssrc": "postcss",
	".postcssrc.json": "postcss",
	".postcssrc.yaml": "postcss",
	".postcssrc.yml": "postcss",
	".prettierignore": "prettier",
	".prettierrc": "prettier",
	".prettierrc.cjs": "prettier",
	".prettierrc.js": "prettier",
	".prettierrc.json": "prettier",
	".prettierrc.mjs": "prettier",
	".prettierrc.toml": "prettier",
	".prettierrc.yaml": "prettier",
	".prettierrc.yml": "prettier",
	".stylelintignore": "stylelint",
	".stylelintrc": "stylelint",
	".stylelintrc.cjs": "stylelint",
	".stylelintrc.js": "stylelint",
	".stylelintrc.json": "stylelint",
	".stylelintrc.mjs": "stylelint",
	".stylelintrc.yaml": "stylelint",
	".stylelintrc.yml": "stylelint",
	".terraform.lock.hcl": "terraform",
	".zprofile": "bash",
	".zshenv": "bash",
	".zshrc": "bash",
	"babel.config.cjs": "babel",
	"babel.config.js": "babel",
	"babel.config.json": "babel",
	"babel.config.mjs": "babel",
	"biome.json": "biome",
	"biome.jsonc": "biome",
	"bootstrap.bundle.js": "bootstrap",
	"bootstrap.bundle.min.js": "bootstrap",
	"bootstrap.css": "bootstrap",
	"bootstrap.js": "bootstrap",
	"bootstrap.min.css": "bootstrap",
	"bootstrap.min.js": "bootstrap",
	"bun.lock": "bun",
	"bun.lockb": "bun",
	"bunfig.toml": "bun",
	"claude.md": "claude",
	"compose.yaml": "docker",
	"compose.yml": "docker",
	"docker-compose.override.yml": "docker",
	"docker-compose.yaml": "docker",
	"docker-compose.yml": "docker",
	dockerfile: "docker",
	"eslint.config.cjs": "eslint",
	"eslint.config.js": "eslint",
	"eslint.config.mjs": "eslint",
	"eslint.config.mts": "eslint",
	"eslint.config.ts": "eslint",
	gemfile: "ruby",
	"next.config.js": "nextjs",
	"next.config.mjs": "nextjs",
	"next.config.mts": "nextjs",
	"next.config.ts": "nextjs",
	"postcss.config.cjs": "postcss",
	"postcss.config.js": "postcss",
	"postcss.config.mjs": "postcss",
	"postcss.config.ts": "postcss",
	"prettier.config.cjs": "prettier",
	"prettier.config.js": "prettier",
	"prettier.config.mjs": "prettier",
	rakefile: "ruby",
	"readme.md": "markdown",
	"stylelint.config.cjs": "stylelint",
	"stylelint.config.js": "stylelint",
	"stylelint.config.mjs": "stylelint",
	"svgo.config.cjs": "svgo",
	"svgo.config.js": "svgo",
	"svgo.config.mjs": "svgo",
	"svgo.config.ts": "svgo",
	"tailwind.config.cjs": "tailwind",
	"tailwind.config.js": "tailwind",
	"tailwind.config.mjs": "tailwind",
	"tailwind.config.ts": "tailwind",
	"vite.config.js": "vite",
	"vite.config.mjs": "vite",
	"vite.config.mts": "vite",
	"vite.config.ts": "vite",
	"webpack.config.babel.js": "webpack",
	"webpack.config.cjs": "webpack",
	"webpack.config.js": "webpack",
	"webpack.config.mjs": "webpack",
	"webpack.config.ts": "webpack"
};
const BUILT_IN_FILE_EXTENSION_TOKENS = {
	"7z": "zip",
	astro: "astro",
	AUTHORS: "text",
	avif: "image",
	bash: "bash",
	bmp: "image",
	bz2: "zip",
	c: "c",
	cc: "cpp",
	cfg: "text",
	CHANGELOG: "text",
	cjs: "javascript",
	"code-workspace": "vscode",
	conf: "text",
	CONTRIBUTORS: "text",
	cpp: "cpp",
	csh: "bash",
	css: "css",
	csv: "table",
	cts: "typescript",
	cxx: "cpp",
	db: "database",
	editorconfig: "text",
	env: "text",
	"env.development": "text",
	"env.local": "text",
	"env.production": "text",
	eot: "font",
	erb: "ruby",
	fish: "bash",
	gemspec: "ruby",
	gif: "image",
	go: "go",
	gql: "graphql",
	graphql: "graphql",
	gz: "zip",
	h: "c",
	hh: "cpp",
	hpp: "cpp",
	htm: "html",
	html: "html",
	hxx: "cpp",
	icns: "image",
	ico: "image",
	ini: "text",
	inl: "cpp",
	jar: "zip",
	jpeg: "image",
	jpg: "image",
	js: "javascript",
	json: "json",
	json5: "json",
	jsonc: "json",
	jsonl: "json",
	jsx: "javascript",
	ksh: "bash",
	less: "css",
	LICENSE: "text",
	log: "text",
	markdown: "markdown",
	mcp: "mcp",
	md: "markdown",
	mdx: "markdown",
	"mdx.tsx": "markdown",
	mjs: "javascript",
	mm: "cpp",
	mts: "typescript",
	ods: "table",
	otf: "font",
	png: "image",
	postcss: "css",
	py: "python",
	pyi: "python",
	pyw: "python",
	pyx: "python",
	rake: "ruby",
	rar: "zip",
	rb: "ruby",
	rs: "rust",
	rst: "text",
	rtf: "text",
	sass: "css",
	scss: "css",
	sh: "bash",
	sql: "database",
	sqlite: "database",
	sqlite3: "database",
	styl: "css",
	svelte: "svelte",
	svg: "svg",
	swift: "swift",
	tar: "zip",
	tf: "terraform",
	tfstate: "terraform",
	tfvars: "terraform",
	tgz: "zip",
	tif: "image",
	tiff: "image",
	ts: "typescript",
	tsv: "table",
	tsx: "typescript",
	ttf: "font",
	txt: "text",
	vue: "vue",
	war: "zip",
	wasm: "wasm",
	wast: "wasm",
	wat: "wasm",
	webp: "image",
	woff: "font",
	woff2: "font",
	xhtml: "html",
	xls: "table",
	xlsx: "table",
	xz: "zip",
	yaml: "yml",
	yml: "yml",
	zig: "zig",
	zip: "zip",
	zsh: "bash"
};
const COMPLETE_EXTENSION_OVERRIDES = {
	jsx: "react",
	sass: "sass",
	scss: "sass",
	tsx: "react"
};
const STANDARD_TIER_TOKENS = new Set([
	"bash",
	"c",
	"cpp",
	"css",
	"database",
	"default",
	"font",
	"git",
	"go",
	"html",
	"image",
	"javascript",
	"json",
	"markdown",
	"mcp",
	"python",
	"ruby",
	"rust",
	"swift",
	"table",
	"text",
	"typescript",
	"zip"
]);
const COLORED_SETS = new Set(["complete"]);
function getBuiltInSpriteSheet(set) {
	return BUILT_IN_SVG_SPRITE_SHEETS[set === "none" ? "minimal" : set];
}
function getBuiltInFileIconName(token) {
	return `file-tree-builtin-${token}`;
}
function isColoredBuiltInIconSet(set) {
	return set !== "none" && COLORED_SETS.has(set);
}
function resolveBuiltInFileIconToken(set, fileName, extensionCandidates) {
	if (set === "minimal" || set === "none") return;
	const isComplete = set === "complete";
	const fileNameToken = BUILT_IN_FILE_NAME_TOKENS[fileName.toLowerCase()];
	if (fileNameToken != null) {
		if (isComplete || STANDARD_TIER_TOKENS.has(fileNameToken)) return fileNameToken;
	}
	for (const extension of extensionCandidates) {
		if (isComplete) {
			const override = COMPLETE_EXTENSION_OVERRIDES[extension];
			if (override != null) return override;
		}
		const match = BUILT_IN_FILE_EXTENSION_TOKENS[extension];
		if (match != null) {
			if (isComplete || STANDARD_TIER_TOKENS.has(match)) return match;
		}
	}
	return "default";
}

//#endregion
//#region node_modules/@pierre/trees/dist/constants.js
const FILE_TREE_TAG_NAME = "file-tree-container";
const FILE_TREE_STYLE_ATTRIBUTE = "data-file-tree-style";
const FILE_TREE_UNSAFE_CSS_ATTRIBUTE = "data-file-tree-unsafe-css";
const FILE_TREE_SCROLLBAR_MEASURE_ATTRIBUTE = "data-file-tree-scrollbar-measure";
const FILE_TREE_SCROLLBAR_GUTTER_STYLE_ATTRIBUTE = "data-file-tree-scrollbar-gutter-measured";
const FILE_TREE_SCROLLBAR_GUTTER_MEASURED_PROPERTY = "--trees-scrollbar-gutter-measured";
/**
* Prefix used for flattened node IDs.
* Flattened nodes represent collapsed chains of single-child folders.
* Example: 'f::src/utils/deep' represents the chain src → utils → deep
*/
const FLATTENED_PREFIX = "f::";
const HEADER_SLOT_NAME = "header";
const CONTEXT_MENU_SLOT_NAME = "context-menu";
const CONTEXT_MENU_TRIGGER_TYPE = "context-menu-trigger";

//#endregion
//#region node_modules/@pierre/trees/dist/iconConfig.js
function hasCustomIconOverrides(icons) {
	return icons.spriteSheet != null || icons.remap != null || icons.byFileName != null || icons.byFileExtension != null || icons.byFileNameContains != null;
}
function normalizeFileTreeIcons(icons) {
	if (icons == null) return {
		set: "complete",
		colored: true
	};
	if (typeof icons === "string") return {
		set: icons,
		colored: true
	};
	return {
		...icons,
		set: icons.set ?? (hasCustomIconOverrides(icons) ? "none" : "complete"),
		colored: icons.colored ?? true
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/density.js
const FILE_TREE_DENSITY_PRESETS = {
	compact: {
		itemHeight: 24,
		factor: .8
	},
	default: {
		itemHeight: 30,
		factor: 1
	},
	relaxed: {
		itemHeight: 36,
		factor: 1.2
	}
};
function resolveFileTreeDensity(density, explicitItemHeight) {
	if (typeof density === "number") return {
		itemHeight: explicitItemHeight ?? FILE_TREE_DENSITY_PRESETS.default.itemHeight,
		factor: density
	};
	const preset = FILE_TREE_DENSITY_PRESETS[density ?? "default"];
	return {
		itemHeight: explicitItemHeight ?? preset.itemHeight,
		factor: preset.factor
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/virtualization.js
const FILE_TREE_DEFAULT_ITEM_HEIGHT = FILE_TREE_DENSITY_PRESETS.default.itemHeight;
const FILE_TREE_DEFAULT_OVERSCAN = 10;
const FILE_TREE_DEFAULT_VIEWPORT_HEIGHT = 420;

//#endregion
//#region node_modules/@pierre/trees/dist/style.js
var style_default = "@layer base, theme, unsafe;\n\n@layer base {\n  :host {\n    /*\n      CSS variables use a fallback stack to ensure user and theme colors slot\n      in with ease. User colors take precedence over theme colors, which take\n      precedence over defaults.\n\n      Fallback order:\n\n      1. --trees-*-override (explicit)\n      2. --trees-theme-* (e.g. Shiki/VS Code tokens)\n      3. defaults\n\n      Theme variable names mirror Shiki/VS Code theme file JSON tokens.\n\n      // Available CSS Color Overrides\n      --trees-fg-override\n      --trees-fg-muted-override\n      --trees-bg-override\n      --trees-bg-muted-override\n      --trees-accent-override\n      --trees-border-color-override\n\n      --trees-focus-ring-color-override\n      --trees-focus-ring-width-override\n      --trees-focus-ring-offset-override\n\n      --trees-search-fg-override\n      --trees-search-font-weight-override\n      --trees-search-bg-override\n\n      --trees-selected-fg-override\n      --trees-selected-bg-override\n      --trees-selected-focused-border-color-override\n\n      // Git Status Color Overrides\n      --trees-status-added-override\n      --trees-status-ignored-override\n      --trees-status-modified-override\n      --trees-status-renamed-override\n      --trees-status-untracked-override\n      --trees-status-deleted-override\n      --trees-git-added-color-override\n      --trees-git-ignored-color-override\n      --trees-git-modified-color-override\n      --trees-git-renamed-color-override\n      --trees-git-untracked-color-override\n      --trees-git-deleted-color-override\n\n      // Built-in File Icon Color Overrides\n      --trees-file-icon-color\n      --trees-file-icon-color-astro\n      --trees-file-icon-color-babel\n      --trees-file-icon-color-bash\n      --trees-file-icon-color-biome\n      --trees-file-icon-color-bootstrap\n      --trees-file-icon-color-browserslist\n      --trees-file-icon-color-bun\n      --trees-file-icon-color-c\n      --trees-file-icon-color-cpp\n      --trees-file-icon-color-claude\n      --trees-file-icon-color-css\n      --trees-file-icon-color-database\n      --trees-file-icon-color-default\n      --trees-file-icon-color-docker\n      --trees-file-icon-color-eslint\n      --trees-file-icon-color-git\n      --trees-file-icon-color-go\n      --trees-file-icon-color-graphql\n      --trees-file-icon-color-html\n      --trees-file-icon-color-image\n      --trees-file-icon-color-javascript\n      --trees-file-icon-color-json\n      --trees-file-icon-color-markdown\n      --trees-file-icon-color-mcp\n      --trees-file-icon-color-npm\n      --trees-file-icon-color-oxc\n      --trees-file-icon-color-postcss\n      --trees-file-icon-color-prettier\n      --trees-file-icon-color-python\n      --trees-file-icon-color-react\n      --trees-file-icon-color-ruby\n      --trees-file-icon-color-rust\n      --trees-file-icon-color-sass\n      --trees-file-icon-color-svg\n      --trees-file-icon-color-svelte\n      --trees-file-icon-color-svgo\n      --trees-file-icon-color-swift\n      --trees-file-icon-color-table\n      --trees-file-icon-color-text\n      --trees-file-icon-color-tailwind\n      --trees-file-icon-color-terraform\n      --trees-file-icon-color-typescript\n      --trees-file-icon-color-vite\n      --trees-file-icon-color-vscode\n      --trees-file-icon-color-vue\n      --trees-file-icon-color-wasm\n      --trees-file-icon-color-webpack\n      --trees-file-icon-color-yml\n      --trees-file-icon-color-zig\n      --trees-file-icon-color-zip\n\n      // Density\n      //\n      // A unitless scale factor for padding, gaps, and indentation. Usually\n      // set via `density` on useFileTree. Individual overrides take precedence.\n      //\n      //   Compact: 0.8\n      //   Default: 1\n      //   Relaxed: 1.2\n      //\n      --trees-density-override\n\n      // Available CSS Layout Overrides\n      --trees-gap-override\n      --trees-border-radius-override\n      --trees-font-family-override\n      --trees-font-size-override\n      --trees-font-weight-regular-override\n      --trees-font-weight-semibold-override\n      --trees-level-gap-override\n      --trees-item-padding-x-override\n      --trees-item-margin-x-override\n      --trees-item-row-gap-override\n      --trees-icon-width-override\n      --trees-icon-nudge-override\n      --trees-scrollbar-gutter-override\n      --trees-padding-inline-override\n    */\n\n    --trees-accent: var(--trees-accent-override, #009fff);\n    --trees-fg: var(\n      --trees-fg-override,\n      var(--trees-theme-sidebar-fg, light-dark(#6c6c71, #adadb1))\n    );\n    --trees-fg-muted: var(\n      --trees-fg-muted-override,\n      var(--trees-theme-sidebar-header-fg, light-dark(#84848a, #84848a))\n    );\n    --trees-bg: var(\n      --trees-bg-override,\n      var(--trees-theme-sidebar-bg, light-dark(#f8f8f8, #141415))\n    );\n    /* var(--trees-theme-list-hover-bg, light-dark(#dfebff59, #19283c59)) */\n    --trees-bg-muted: var(\n      --trees-bg-muted-override,\n      var(\n        --trees-theme-list-hover-bg,\n        light-dark(\n          color-mix(\n            in lab,\n            var(--trees-accent) var(--trees-bg-alpha-light, 8%),\n            var(--trees-bg)\n          ),\n          color-mix(\n            in lab,\n            var(--trees-accent) var(--trees-bg-alpha-dark, 10%),\n            var(--trees-bg)\n          )\n        )\n      )\n    );\n    --trees-input-bg: var(\n      --trees-input-bg-override,\n      light-dark(#f8f8f8, #070707)\n    );\n\n    --trees-added-light: #16a994;\n    --trees-added-dark: #00cab1;\n    --trees-ignored-light: #adadb1;\n    --trees-ignored-dark: #4a4a4e;\n    --trees-modified-light: #1ca1c7;\n    --trees-modified-dark: #08c0ef;\n    --trees-renamed-light: #d5a910;\n    --trees-renamed-dark: #ffd452;\n    --trees-untracked-light: #16a994;\n    --trees-untracked-dark: #00cab1;\n    --trees-deleted-light: #ff2e3f;\n    --trees-deleted-dark: #ff6762;\n\n    --trees-border-color: var(\n      --trees-border-color-override,\n      var(--trees-theme-sidebar-border, light-dark(#eeeeef, #070707))\n    );\n    --trees-indent-guide-bg: var(\n      --trees-indent-guide-bg-override,\n      color-mix(in lab, var(--trees-fg-muted) 25%, transparent)\n    );\n    --trees-density: var(--trees-density-override, 1);\n    --trees-border-radius: var(\n      --trees-border-radius-override,\n      calc(6px * var(--trees-density))\n    );\n\n    --trees-font-family: var(--trees-font-family-override, system-ui);\n    --trees-font-size: var(--trees-font-size-override, 13px);\n    --trees-font-weight-regular: var(--trees-font-weight-regular-override, 400);\n    --trees-font-weight-semibold: var(\n      --trees-font-weight-semibold-override,\n      600\n    );\n\n    --trees-focus-ring-color: var(\n      --trees-focus-ring-color-override,\n      var(--trees-theme-focus-ring, var(--trees-accent))\n    );\n    --trees-focus-ring-width: var(--trees-focus-ring-width-override, 1px);\n    --trees-focus-ring-offset: var(--trees-focus-ring-offset-override, -1px);\n\n    --trees-search-fg: var(\n      --trees-search-fg-override,\n      var(--trees-theme-input-fg, var(--trees-fg))\n    );\n    --trees-search-font-weight: var(--trees-search-font-weight-override, 600);\n    --trees-search-bg: var(\n      --trees-search-bg-override,\n      var(--trees-theme-input-bg, var(--trees-input-bg))\n    );\n\n    --trees-scrollbar-thumb: var(\n      --trees-scrollbar-thumb-override,\n      var(\n        --trees-theme-scrollbar-thumb,\n        color-mix(in lab, var(--trees-fg) 25%, var(--trees-bg))\n      )\n    );\n\n    --trees-selected-fg: var(\n      --trees-selected-fg-override,\n      var(--trees-theme-list-active-selection-fg, var(--trees-fg))\n    );\n    --trees-selected-bg: var(\n      --trees-selected-bg-override,\n      var(\n        --trees-theme-list-active-selection-bg,\n        light-dark(\n          color-mix(in lab, var(--trees-accent) 12%, var(--trees-bg)),\n          color-mix(in lab, var(--trees-accent) 15%, var(--trees-bg))\n        )\n      )\n    );\n    --trees-selected-focused-border-color: var(\n      --trees-selected-focused-border-color-override,\n      var(--trees-theme-focus-ring, var(--trees-accent))\n    );\n\n    /* Git status (e.g. from Shiki theme gitDecoration.*) */\n    --trees-status-added: var(\n      --trees-status-added-override,\n      var(\n        --trees-theme-git-added-fg,\n        light-dark(var(--trees-added-light), var(--trees-added-dark))\n      )\n    );\n    --trees-status-ignored: var(\n      --trees-status-ignored-override,\n      var(\n        --trees-theme-git-ignored-fg,\n        light-dark(var(--trees-ignored-light), var(--trees-ignored-dark))\n      )\n    );\n    --trees-status-modified: var(\n      --trees-status-modified-override,\n      var(\n        --trees-theme-git-modified-fg,\n        light-dark(var(--trees-modified-light), var(--trees-modified-dark))\n      )\n    );\n    --trees-status-renamed: var(\n      --trees-status-renamed-override,\n      var(\n        --trees-theme-git-renamed-fg,\n        light-dark(var(--trees-renamed-light), var(--trees-renamed-dark))\n      )\n    );\n    --trees-status-untracked: var(\n      --trees-status-untracked-override,\n      var(\n        --trees-theme-git-untracked-fg,\n        light-dark(var(--trees-untracked-light), var(--trees-untracked-dark))\n      )\n    );\n    --trees-status-deleted: var(\n      --trees-status-deleted-override,\n      var(\n        --trees-theme-git-deleted-fg,\n        light-dark(var(--trees-deleted-light), var(--trees-deleted-dark))\n      )\n    );\n    --trees-git-modified-color: var(\n      --trees-git-modified-color-override,\n      var(--trees-status-modified)\n    );\n    --trees-git-added-color: var(\n      --trees-git-added-color-override,\n      var(--trees-status-added)\n    );\n    --trees-git-ignored-color: var(\n      --trees-git-ignored-color-override,\n      var(--trees-status-ignored)\n    );\n    --trees-git-deleted-color: var(\n      --trees-git-deleted-color-override,\n      var(--trees-status-deleted)\n    );\n    --trees-git-renamed-color: var(\n      --trees-git-renamed-color-override,\n      var(--trees-status-renamed)\n    );\n    --trees-git-untracked-color: var(\n      --trees-git-untracked-color-override,\n      var(--trees-status-untracked)\n    );\n\n    --trees-icon-gray: light-dark(#84848a, #adadb1);\n    --trees-icon-red: light-dark(#d52c36, #ff6762);\n    --trees-icon-vermilion: light-dark(#ff8c5b, #d5512f);\n    --trees-icon-orange: light-dark(#d47628, #ffa359);\n    --trees-icon-yellow: light-dark(#d5a910, #ffd452);\n    --trees-icon-green: light-dark(#199f43, #5ecc71);\n    --trees-icon-teal: light-dark(#17a5af, #64d1db);\n    --trees-icon-cyan: light-dark(#1ca1c7, #68cdf2);\n    --trees-icon-blue: light-dark(#1a85d4, #69b1ff);\n    --trees-icon-indigo: light-dark(#693acf, #9d6afb);\n    --trees-icon-purple: light-dark(#a631be, #d568ea);\n    --trees-icon-pink: light-dark(#d32a61, #ff678d);\n    --trees-icon-mauve: light-dark(#594c5b, #79697b);\n\n    --trees-file-icon-color-default: var(\n      --trees-file-icon-color,\n      var(--trees-icon-gray)\n    );\n    --trees-file-icon-color-astro: var(\n      --trees-file-icon-color,\n      var(--trees-icon-purple)\n    );\n    --trees-file-icon-color-babel: var(\n      --trees-file-icon-color,\n      var(--trees-icon-yellow)\n    );\n    --trees-file-icon-color-bash: var(\n      --trees-file-icon-color,\n      var(--trees-icon-green)\n    );\n    --trees-file-icon-color-biome: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-bootstrap: var(\n      --trees-file-icon-color,\n      var(--trees-icon-indigo)\n    );\n    --trees-file-icon-color-browserslist: var(\n      --trees-file-icon-color,\n      var(--trees-icon-yellow)\n    );\n    --trees-file-icon-color-bun: var(\n      --trees-file-icon-color,\n      var(--trees-icon-mauve)\n    );\n    --trees-file-icon-color-c: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-cpp: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-claude: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-css: var(\n      --trees-file-icon-color,\n      var(--trees-icon-indigo)\n    );\n    --trees-file-icon-color-database: var(\n      --trees-file-icon-color,\n      var(--trees-icon-purple)\n    );\n    --trees-file-icon-color-docker: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-eslint: var(\n      --trees-file-icon-color,\n      var(--trees-icon-indigo)\n    );\n    --trees-file-icon-color-git: var(\n      --trees-file-icon-vermilion,\n      var(--trees-icon-vermilion)\n    );\n    --trees-file-icon-color-go: var(\n      --trees-file-icon-color,\n      var(--trees-icon-cyan)\n    );\n    --trees-file-icon-color-graphql: var(\n      --trees-file-icon-color,\n      var(--trees-icon-pink)\n    );\n    --trees-file-icon-color-html: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-image: var(\n      --trees-file-icon-color,\n      var(--trees-icon-pink)\n    );\n    --trees-file-icon-color-javascript: var(\n      --trees-file-icon-color,\n      var(--trees-icon-yellow)\n    );\n    --trees-file-icon-color-json: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-markdown: var(\n      --trees-file-icon-color,\n      var(--trees-icon-green)\n    );\n    --trees-file-icon-color-mcp: var(\n      --trees-file-icon-color,\n      var(--trees-icon-teal)\n    );\n    --trees-file-icon-color-npm: var(\n      --trees-file-icon-color,\n      var(--trees-icon-red)\n    );\n    --trees-file-icon-color-oxc: var(\n      --trees-file-icon-cyan,\n      var(--trees-icon-cyan)\n    );\n    --trees-file-icon-color-postcss: var(\n      --trees-file-icon-color,\n      var(--trees-icon-red)\n    );\n    --trees-file-icon-color-prettier: var(\n      --trees-file-icon-color,\n      var(--trees-icon-teal)\n    );\n    --trees-file-icon-color-python: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-react: var(\n      --trees-file-icon-color,\n      var(--trees-icon-cyan)\n    );\n    --trees-file-icon-color-ruby: var(\n      --trees-file-icon-color,\n      var(--trees-icon-red)\n    );\n    --trees-file-icon-color-rust: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-sass: var(\n      --trees-file-icon-color,\n      var(--trees-icon-pink)\n    );\n    --trees-file-icon-color-svg: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-svelte: var(\n      --trees-file-icon-color,\n      var(--trees-icon-red)\n    );\n    --trees-file-icon-color-svgo: var(\n      --trees-file-icon-color,\n      var(--trees-icon-green)\n    );\n    --trees-file-icon-color-swift: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-table: var(\n      --trees-file-icon-color,\n      var(--trees-icon-teal)\n    );\n    --trees-file-icon-color-text: var(\n      --trees-file-icon-color,\n      var(--trees-icon-gray)\n    );\n    --trees-file-icon-color-tailwind: var(\n      --trees-file-icon-color,\n      var(--trees-icon-cyan)\n    );\n    --trees-file-icon-color-terraform: var(\n      --trees-file-icon-color,\n      var(--trees-icon-indigo)\n    );\n    --trees-file-icon-color-typescript: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-vite: var(\n      --trees-file-icon-color,\n      var(--trees-icon-purple)\n    );\n    --trees-file-icon-color-vscode: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-vue: var(\n      --trees-file-icon-color,\n      var(--trees-icon-green)\n    );\n    --trees-file-icon-color-wasm: var(\n      --trees-file-icon-color,\n      var(--trees-icon-indigo)\n    );\n    --trees-file-icon-color-webpack: var(\n      --trees-file-icon-color,\n      var(--trees-icon-blue)\n    );\n    --trees-file-icon-color-yml: var(\n      --trees-file-icon-color,\n      var(--trees-icon-red)\n    );\n    --trees-file-icon-color-zig: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n    --trees-file-icon-color-zip: var(\n      --trees-file-icon-color,\n      var(--trees-icon-orange)\n    );\n\n    --trees-level-gap: var(\n      --trees-level-gap-override,\n      calc(8px * var(--trees-density))\n    );\n    --trees-item-padding-x: var(\n      --trees-item-padding-x-override,\n      calc(8px * var(--trees-density))\n    );\n    --trees-item-margin-x: var(\n      --trees-item-margin-x-override,\n      calc(2px * var(--trees-density))\n    );\n    --trees-item-row-gap: var(\n      --trees-item-row-gap-override,\n      calc(6px * var(--trees-density))\n    );\n    --trees-icon-width: var(--trees-icon-width-override, 16px);\n    --trees-icon-nudge: var(\n      --trees-icon-nudge-override,\n      calc(1px * var(--trees-density))\n    );\n    --trees-row-height: var(--trees-item-height, 30px);\n    --trees-git-lane-width: var(--trees-git-lane-width-override, 12px);\n    --trees-action-lane-width: var(\n      --trees-action-lane-width-override,\n      calc(var(--trees-icon-width) + 2px)\n    );\n    /* Keep the floating trigger aligned with the row's action lane. Going in\n       from the root's right edge: the scroll container reserves\n       `--trees-padding-inline` of effective inset on each side (its asymmetric\n       padding formula cancels the scrollbar gutter on the right), the row\n       sits inside that inset, and its trailing `--trees-item-padding-x` is the\n       action lane itself. The trigger's own focus-ring margin then trims one\n       pixel back so the button's visible right edge lines up with the lane. */\n    --trees-context-menu-trigger-inline-offset: calc(\n      var(--trees-padding-inline) + var(--trees-item-padding-x) -\n        var(--trees-focus-ring-width)\n    );\n\n    --trees-scrollbar-gutter: var(--trees-scrollbar-gutter-override, 6px);\n    --trees-padding-inline: var(--trees-padding-inline-override, 16px);\n\n    color-scheme: light dark;\n    display: flex;\n    flex-direction: column;\n    font-size: var(--trees-font-size);\n    color: var(--trees-fg);\n    background-color: var(--trees-bg);\n    --truncate-marker-background-color: var(--trees-bg);\n    --truncate-marker-background-overlay-color: transparent;\n    font-family: var(--trees-font-family);\n    font-weight: var(--trees-font-weight-regular);\n  }\n\n  :host([data-file-tree-virtualized='true']) {\n    height: 100%;\n    overflow: hidden;\n  }\n\n  [data-file-tree-virtualized-wrapper='true'] {\n    height: 100%;\n    overflow: hidden;\n    display: flex;\n    flex-direction: column;\n  }\n\n  [data-file-tree-virtualized-root='true'] {\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    overflow: hidden;\n  }\n\n  [data-file-tree-virtualized-scroll='true'],\n  [data-file-tree-scrollbar-measure='true'] {\n    --trees-scrollbar-thumb-current: transparent;\n    overflow-y: auto;\n    scrollbar-gutter: stable;\n\n    &:hover {\n      --trees-scrollbar-thumb-current: var(--trees-scrollbar-thumb);\n    }\n\n    &::-webkit-scrollbar {\n      width: var(--trees-scrollbar-gutter);\n      height: var(--trees-scrollbar-gutter);\n    }\n\n    &::-webkit-scrollbar-track {\n      background: transparent;\n    }\n\n    &::-webkit-scrollbar-thumb {\n      background-color: var(--trees-scrollbar-thumb-current);\n      border: 1px solid transparent;\n      background-clip: content-box;\n      border-radius: calc(var(--trees-scrollbar-gutter) / 2);\n    }\n\n    &::-webkit-scrollbar-corner {\n      background-color: transparent;\n    }\n  }\n\n  /* These are styles for a temporarily generated element to measure the size\n   * of the scrollbar.  It's intended to be somewhat similar in scrollbar style\n   * scope to the scrollable tree so `--trees-scrollbar-gutter-measured` is an\n   * accurate reflection of the size the scrollbar gutter takes up. */\n  [data-file-tree-scrollbar-measure='true'] {\n    position: absolute;\n    top: 0;\n    left: 0;\n    visibility: hidden;\n    pointer-events: none;\n    width: 100px;\n    height: 100px;\n  }\n\n  @supports (-moz-appearance: none) {\n    [data-file-tree-virtualized-scroll='true'],\n    [data-file-tree-scrollbar-measure='true'] {\n      scrollbar-width: thin;\n      scrollbar-color: var(--trees-scrollbar-thumb-current) transparent;\n    }\n  }\n\n  [data-file-tree-virtualized-scroll='true'] {\n    position: relative;\n    overflow-y: auto;\n    flex: 1 1 0;\n    min-height: 0;\n    padding-inline: max(\n        calc(var(--trees-padding-inline) - var(--trees-item-margin-x)),\n        0px\n      )\n      /* NOTE(amadeus): We can assume that all Webkit based browser gutters\n       * will align to the value of '--trees-scrollbar-gutter', however if not, then\n       * `--trees-scrollbar-gutter-measured` should correct it. Mostly we are\n       * hoping to avoid SSR alignment jumps if possible. In non-SSR'd environments\n       * `--trees-scrollbar-gutter-measured` should always be immediately available.\n       */\n      max(\n        calc(\n          var(--trees-padding-inline) - var(--trees-item-margin-x) -\n            var(\n              --trees-scrollbar-gutter-measured,\n              var(--trees-scrollbar-gutter)\n            )\n        ),\n        0px\n      );\n  }\n\n  @supports (-moz-appearance: none) {\n    [data-file-tree-virtualized-scroll='true'] {\n      padding-inline: max(\n          calc(var(--trees-padding-inline) - var(--trees-item-margin-x)),\n          0px\n        )\n        /* NOTE(amadeus): However on Firefox it can vary a little bit, but most\n         * likely the majority of cases will default to a 0px width scrollbar lets\n         * inherit that first to avoid SSR jumps. In non-SSR'd environments\n         * `--trees-scrollbar-gutter-measured` should always be immediately available.\n         */\n        max(\n          calc(\n            var(--trees-padding-inline) - var(--trees-item-margin-x) -\n              var(--trees-scrollbar-gutter-measured, 0px)\n          ),\n          0px\n        );\n    }\n  }\n\n  [data-file-tree-sticky-overlay='true'] {\n    position: sticky;\n    top: 0;\n    height: 0;\n    z-index: 4;\n    overflow: visible;\n    pointer-events: none;\n  }\n\n  /* The overlay DOM is kept populated even at scrollTop=0 so the browser has\n   * the rendered rows on hand the moment scrolling begins — otherwise the\n   * compositor paints a scrolled frame before React can mount the overlay,\n   * and the topmost sticky folder jumps up by a couple of pixels before it\n   * \"snaps\" into its pinned position. We hide it via CSS whenever the scroll\n   * is at the top and no scroll is in progress, so the preview doesn't leak\n   * through at rest. `data-overlay-reveal` is stamped on the root only when\n   * the user initiates a scroll while already at the top — exactly the case\n   * where we need the pre-mounted overlay to be visible through the first\n   * compositor frame. It is deliberately distinct from the general\n   * `data-is-scrolling` flag so a scroll that ends at the top (e.g. ArrowUp\n   * navigation) re-hides the overlay the instant the scroll lands, rather\n   * than waiting for the hover-suppression timer to elapse. */\n  [data-file-tree-virtualized-root='true'][data-scroll-at-top='true']:not(\n      [data-overlay-reveal]\n    )\n    [data-file-tree-sticky-overlay='true'] {\n    visibility: hidden;\n  }\n\n  [data-file-tree-sticky-overlay-content='true'] {\n    background-color: var(--trees-bg);\n    position: relative;\n    pointer-events: none;\n  }\n\n  [data-file-tree-virtualized-list='true'] {\n    background-color: var(--trees-bg);\n    position: relative;\n    min-height: 100%;\n    width: 100%;\n    overflow-anchor: none;\n\n    &[data-is-scrolling] {\n      pointer-events: none;\n    }\n  }\n\n  [data-file-tree-virtualized-sticky-offset='true'] {\n    contain: layout size;\n  }\n\n  [data-file-tree-virtualized-sticky='true'] {\n    position: sticky;\n    top: 0;\n    width: 100%;\n    display: flex;\n    flex-direction: column;\n    isolation: isolate;\n    /* Promote to its own compositor layer so text inside the window is\n     * rasterized once and GPU-translated during scroll. Without this, the\n     * browser re-paints the window (and its text) at every scroll frame,\n     * which produces visible 1px shake / character tearing. */\n    will-change: transform;\n  }\n\n  [data-file-tree-search-container] {\n    display: flex;\n    padding: 0;\n    padding-inline: var(--trees-padding-inline);\n    margin-bottom: var(--trees-item-row-gap);\n  }\n\n  [data-file-tree-search-input] {\n    --trees-focus-ring-width: 2px;\n    font-family: var(--trees-font-family);\n    font-size: var(--trees-font-size);\n    flex: 1;\n    height: var(--trees-row-height);\n    /* 1px breathing room so the focus-visible outline isn't clipped when the\n     * input sits flush against the top of the scroll container. */\n    margin-block: 1px;\n    padding-inline: var(--trees-item-padding-x);\n    line-height: var(--trees-row-height);\n    color: var(--trees-search-fg);\n    background-color: var(--trees-search-bg);\n    border: 1px solid var(--trees-border-color);\n    border-radius: var(--trees-border-radius);\n    outline: none;\n\n    &::placeholder {\n      color: color-mix(\n        in lab,\n        var(--trees-search-fg) 65%,\n        var(--trees-search-bg)\n      );\n    }\n\n    &:focus-visible,\n    &[data-file-tree-search-input-fake-focus='true'] {\n      outline: var(--trees-focus-ring-width) solid var(--trees-focus-ring-color);\n      outline-offset: var(--trees-focus-ring-offset);\n    }\n  }\n\n  /* The wrapper for the tree items */\n  [role='tree'] {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    gap: var(--trees-gap-override, 0);\n  }\n\n  /* LIST ITEM */\n  [data-type='item'] {\n    color: inherit;\n    font-family: var(--trees-font-family);\n    font-size: var(--trees-font-size);\n    text-align: start;\n    outline: none;\n    background-color: var(--trees-bg);\n    border: none;\n    position: relative;\n\n    padding: 0 var(--trees-item-padding-x);\n    margin: 0 var(--trees-item-margin-x);\n    cursor: pointer;\n    -webkit-user-select: none;\n            user-select: none;\n    -webkit-touch-callout: none;\n    touch-action: manipulation;\n    display: flex;\n    flex: 0 0 var(--trees-row-height);\n    align-items: center;\n    height: var(--trees-row-height);\n    line-height: var(--trees-row-height);\n    gap: var(--trees-item-row-gap);\n    border-radius: var(--trees-border-radius);\n    /* Row states may be translucent, so markers paint the tree background first\n     * and then the state color on top to avoid compositing the same alpha twice. */\n    --truncate-marker-background-color: var(--trees-bg);\n    --truncate-marker-background-overlay-color: transparent;\n    --truncate-marker-block-inset: 0px;\n\n    &:hover,\n    &[data-item-context-hover='true'] {\n      background-color: var(--trees-bg-muted);\n      --truncate-marker-background-overlay-color: var(--trees-bg-muted);\n    }\n\n    &[data-item-focused='true'],\n    &:focus-visible {\n      z-index: 2;\n\n      /* Flattened segment markers sit high enough to cover the row outline unless\n       * their painted background is inset by the focus ring width. */\n      [data-item-flattened-subitems] {\n        --truncate-marker-block-inset: var(--trees-focus-ring-width);\n      }\n\n      &::before {\n        position: absolute;\n        inset: 0;\n        content: '';\n        display: block;\n        border-radius: var(--trees-border-radius);\n        outline: var(--trees-focus-ring-width) solid\n          var(--trees-focus-ring-color);\n        outline-offset: var(--trees-focus-ring-offset);\n        pointer-events: none;\n      }\n\n      &[data-item-selected='true']::before {\n        outline-color: var(--trees-selected-focused-border-color);\n      }\n    }\n\n    &[data-item-selected='true'] {\n      color: var(--trees-selected-fg);\n      background-color: var(--trees-selected-bg);\n      --truncate-marker-background-overlay-color: var(--trees-selected-bg);\n      z-index: 3;\n\n      [data-item-section='icon'] {\n        color: var(--trees-selected-fg);\n      }\n    }\n\n    &[data-item-search-match='true'] {\n      font-weight: var(--trees-search-font-weight);\n    }\n  }\n\n  [data-type='item'][data-file-tree-sticky-row='true'] {\n    pointer-events: auto;\n  }\n\n  /* Sticky rows opt back into pointer events because the overlay wrapper is\n   * inert. During scroll, put them back under the same hover suppression as\n   * the virtualized list so translucent hover states and menu triggers do not\n   * paint over rows moving beneath the sticky stack. */\n  [data-file-tree-virtualized-root='true'][data-is-scrolling]\n    [data-type='item'][data-file-tree-sticky-row='true'] {\n    pointer-events: none;\n  }\n\n  [data-file-tree-virtualized-root='true'][data-is-scrolling]\n    [data-type='item'][data-file-tree-sticky-row='true']:hover:not(\n      [data-item-selected='true']\n    ),\n  [data-file-tree-virtualized-root='true'][data-is-scrolling]\n    [data-type='item'][data-file-tree-sticky-row='true'][data-item-context-hover='true']:not(\n      [data-item-selected='true']\n    ) {\n    background-color: var(--trees-bg);\n    --truncate-marker-background-overlay-color: transparent;\n  }\n\n  [data-item-selected='true']:has(+ [data-item-selected='true']) {\n    border-bottom-left-radius: 0;\n    border-bottom-right-radius: 0;\n  }\n\n  [data-item-selected='true'] + [data-item-selected='true'] {\n    border-top-left-radius: 0;\n    border-top-right-radius: 0;\n  }\n\n  /* Flattened Directory Parts */\n  [data-item-flattened-subitems] {\n    display: inline-flex;\n    align-items: center;\n    gap: 2px;\n  }\n  [data-item-flattened-subitem]:hover,\n  [data-item-flattened-subitem-drag-target='true'] {\n    text-decoration: underline;\n  }\n\n  /* Icon for each item */\n  [data-item-section='icon'] {\n    flex-shrink: 0;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    color: var(--trees-fg-muted);\n    fill: currentColor;\n    width: var(--trees-icon-width);\n  }\n\n  :where([data-item-section='icon'] > [data-icon-token]) {\n    color: var(--trees-fg-muted);\n  }\n\n  [data-file-tree-colored-icons='true'] {\n    [data-icon-token='astro'] {\n      color: var(--trees-file-icon-color-astro);\n    }\n    [data-icon-token='babel'] {\n      color: var(--trees-file-icon-color-babel);\n    }\n    [data-icon-token='bash'] {\n      color: var(--trees-file-icon-color-bash);\n    }\n    [data-icon-token='biome'] {\n      color: var(--trees-file-icon-color-biome);\n    }\n    [data-icon-token='bootstrap'] {\n      color: var(--trees-file-icon-color-bootstrap);\n    }\n    [data-icon-token='browserslist'] {\n      color: var(--trees-file-icon-color-browserslist);\n    }\n    [data-icon-token='bun'] {\n      color: var(--trees-file-icon-color-bun);\n    }\n    [data-icon-token='c'] {\n      color: var(--trees-file-icon-color-c);\n    }\n    [data-icon-token='cpp'] {\n      color: var(--trees-file-icon-color-cpp);\n    }\n    [data-icon-token='claude'] {\n      color: var(--trees-file-icon-color-claude);\n    }\n    [data-icon-token='css'] {\n      color: var(--trees-file-icon-color-css);\n    }\n    [data-icon-token='database'] {\n      color: var(--trees-file-icon-color-database);\n    }\n    [data-icon-token='default'] {\n      color: var(--trees-file-icon-color-default);\n    }\n    [data-icon-token='docker'] {\n      color: var(--trees-file-icon-color-docker);\n    }\n    [data-icon-token='eslint'] {\n      color: var(--trees-file-icon-color-eslint);\n    }\n    [data-icon-token='git'] {\n      color: var(--trees-file-icon-color-git);\n    }\n    [data-icon-token='go'] {\n      color: var(--trees-file-icon-color-go);\n    }\n    [data-icon-token='graphql'] {\n      color: var(--trees-file-icon-color-graphql);\n    }\n    [data-icon-token='html'] {\n      color: var(--trees-file-icon-color-html);\n    }\n    [data-icon-token='image'] {\n      color: var(--trees-file-icon-color-image);\n    }\n    [data-icon-token='javascript'] {\n      color: var(--trees-file-icon-color-javascript);\n    }\n    [data-icon-token='json'] {\n      color: var(--trees-file-icon-color-json);\n    }\n    [data-icon-token='markdown'] {\n      color: var(--trees-file-icon-color-markdown);\n    }\n    [data-icon-token='mcp'] {\n      color: var(--trees-file-icon-color-mcp);\n    }\n    [data-icon-token='npm'] {\n      color: var(--trees-file-icon-color-npm);\n    }\n    [data-icon-token='oxc'] {\n      color: var(--trees-file-icon-color-oxc);\n    }\n    [data-icon-token='postcss'] {\n      color: var(--trees-file-icon-color-postcss);\n    }\n    [data-icon-token='prettier'] {\n      color: var(--trees-file-icon-color-prettier);\n    }\n    [data-icon-token='python'] {\n      color: var(--trees-file-icon-color-python);\n    }\n    [data-icon-token='react'] {\n      color: var(--trees-file-icon-color-react);\n    }\n    [data-icon-token='ruby'] {\n      color: var(--trees-file-icon-color-ruby);\n    }\n    [data-icon-token='rust'] {\n      color: var(--trees-file-icon-color-rust);\n    }\n    [data-icon-token='sass'] {\n      color: var(--trees-file-icon-color-sass);\n    }\n    [data-icon-token='svg'] {\n      color: var(--trees-file-icon-color-svg);\n    }\n    [data-icon-token='svelte'] {\n      color: var(--trees-file-icon-color-svelte);\n    }\n    [data-icon-token='svgo'] {\n      color: var(--trees-file-icon-color-svgo);\n    }\n    [data-icon-token='swift'] {\n      color: var(--trees-file-icon-color-swift);\n    }\n    [data-icon-token='table'] {\n      color: var(--trees-file-icon-color-table);\n    }\n    [data-icon-token='text'] {\n      color: var(--trees-file-icon-color-text);\n    }\n    [data-icon-token='tailwind'] {\n      color: var(--trees-file-icon-color-tailwind);\n    }\n    [data-icon-token='terraform'] {\n      color: var(--trees-file-icon-color-terraform);\n    }\n    [data-icon-token='typescript'] {\n      color: var(--trees-file-icon-color-typescript);\n    }\n    [data-icon-token='vite'] {\n      color: var(--trees-file-icon-color-vite);\n    }\n    [data-icon-token='vscode'] {\n      color: var(--trees-file-icon-color-vscode);\n    }\n    [data-icon-token='vue'] {\n      color: var(--trees-file-icon-color-vue);\n    }\n    [data-icon-token='wasm'] {\n      color: var(--trees-file-icon-color-wasm);\n    }\n    [data-icon-token='webpack'] {\n      color: var(--trees-file-icon-color-webpack);\n    }\n    [data-icon-token='yml'] {\n      color: var(--trees-file-icon-color-yml);\n    }\n    [data-icon-token='zig'] {\n      color: var(--trees-file-icon-color-zig);\n    }\n    [data-icon-token='zip'] {\n      color: var(--trees-file-icon-color-zip);\n    }\n  }\n\n  /* Chevron rotation and visual alignment */\n  /* Chevron pointing down */\n  [data-icon-name='file-tree-icon-chevron'] {\n    &[data-align-capitals='false'] {\n      transform: translate(0, var(--trees-icon-nudge));\n    }\n    &[data-align-capitals='true'] {\n      transform: translate(0, 0);\n    }\n  }\n\n  [data-item-section='content'] {\n    flex: 0 1 auto;\n    text-align: start;\n    min-width: 0;\n    max-width: 100%;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    /* Breaks middle truncate component to also set this */\n    /* white-space: nowrap; */\n  }\n\n  [data-item-section='decoration'] {\n    flex: 1 1 0;\n    min-width: 0;\n    display: flex;\n    justify-content: flex-end;\n    text-align: end;\n    overflow: hidden;\n    color: var(--trees-fg-muted);\n  }\n\n  [data-item-section='decoration'] > span {\n    min-width: 0;\n    max-width: 100%;\n    display: inline-flex;\n    align-items: center;\n    justify-content: flex-end;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n\n  [data-item-section='git'],\n  [data-item-section='action'] {\n    flex: 0 0 auto;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  }\n\n  [data-item-section='git'] {\n    width: var(--trees-git-lane-width);\n  }\n\n  [data-item-section='action'] {\n    width: var(--trees-action-lane-width);\n    color: var(--trees-fg-muted);\n    fill: currentColor;\n    pointer-events: none;\n  }\n\n  [data-item-section='git'] > span,\n  [data-item-section='action'] > span {\n    width: 100%;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n  }\n\n  [data-item-action-affordance='decorative'] {\n    opacity: 0.85;\n  }\n\n  [data-item-rename-input] {\n    appearance: none;\n    width: 100%;\n    min-width: 0;\n    height: calc(var(--trees-row-height) - 4px);\n    font-family: inherit;\n    font-size: inherit;\n    /* line-height: calc(var(--trees-row-height) - 8px); */\n    color: inherit;\n    background-color: transparent;\n    border: 0;\n    padding-inline: 6px;\n    outline: none;\n    box-sizing: border-box;\n  }\n\n  [data-item-section='content']:has([data-item-rename-input])\n    ~ [data-item-section='action'],\n  [data-item-section='content']:has([data-item-rename-input])\n    ~ [data-item-section='decoration'] {\n    display: none;\n  }\n\n  /* Chevron pointing right */\n  [aria-expanded='false'][data-item-type='folder']\n    > [data-item-section='icon']\n    > [data-icon-name='file-tree-icon-chevron'] {\n    &[data-align-capitals='true'] {\n      transform: rotate(-90deg)\n        translate(\n          calc(var(--trees-icon-nudge) / 2),\n          calc(var(--trees-icon-nudge) / 2)\n        );\n    }\n    &[data-align-capitals='false'] {\n      transform: rotate(-90deg)\n        translate(\n          calc(var(--trees-icon-nudge) / 2 * -1),\n          calc(var(--trees-icon-nudge) / 2)\n        );\n    }\n  }\n\n  /* LIST IDENTATION */\n  /* Spacing container */\n  [data-item-section='spacing'] {\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    justify-content: center;\n    height: var(--trees-row-height);\n    padding-left: calc(calc(var(--trees-icon-width) / 2) - 0.5px);\n\n    &:empty {\n      padding-left: 0;\n    }\n  }\n\n  /* Spacing per level */\n  [data-item-section='spacing-item'] {\n    transform: translateX(-0.25px);\n    display: inline-block;\n    border-left: 1px solid var(--trees-indent-guide-bg);\n    height: 100%;\n    margin-right: calc(var(--trees-level-gap) - 1px);\n    opacity: 0;\n    transition: opacity 150ms ease;\n\n    & + & {\n      margin-left: calc(\n        var(--trees-item-row-gap) + calc(var(--trees-icon-width) / 2) - 0.5px\n      );\n    }\n  }\n\n  :host(:hover) [data-item-section='spacing-item'] {\n    opacity: 0.75;\n  }\n\n  /* Git status indicator */\n\n  /* This is a folder that contains a git change */\n  [data-item-contains-git-change='true'] > [data-item-section='git'] {\n    color: var(--trees-git-modified-color);\n    opacity: 0.5;\n    fill: currentColor;\n  }\n\n  /* These are files that have a git change */\n  [data-item-git-status] {\n    &\n      > :where([data-item-section='icon'])\n      > :where(:not([data-icon-name='file-tree-icon-chevron'])) {\n      color: var(--trees-item-git-status-color);\n    }\n    & > [data-item-section='content'] {\n      color: var(--trees-item-git-status-color);\n    }\n    & > [data-item-section='git'] {\n      color: var(--trees-item-git-status-color);\n      font-weight: var(--trees-font-weight-semibold);\n    }\n  }\n\n  [data-item-git-status='added'] {\n    --trees-item-git-status-color: var(--trees-git-added-color);\n  }\n\n  [data-item-git-status='deleted'] {\n    --trees-item-git-status-color: var(--trees-git-deleted-color);\n  }\n\n  [data-item-git-status='ignored'] {\n    --trees-item-git-status-color: var(--trees-git-ignored-color);\n\n    & > [data-item-section='icon'] {\n      opacity: 0.5;\n    }\n  }\n\n  [data-item-section='git'] [data-icon-name='file-tree-icon-dot'] {\n    /* this is a nudge to align the dot with the likely lowercase text. it's slightly\n    generalizable, but other fonts are gonna need other nudges i assume */\n    transform: translateY(calc(0.65ex - 50%));\n  }\n\n  [data-item-git-status='modified'] {\n    --trees-item-git-status-color: var(--trees-git-modified-color);\n  }\n\n  [data-item-git-status='renamed'] {\n    --trees-item-git-status-color: var(--trees-git-renamed-color);\n  }\n\n  [data-item-git-status='untracked'] {\n    --trees-item-git-status-color: var(--trees-git-untracked-color);\n  }\n\n  /* Drag and drop */\n  [data-item-drag-target='true'] {\n    background-color: var(--trees-selected-bg);\n  }\n\n  [data-item-dragging='true'] {\n    opacity: 0.5;\n  }\n\n  /* Lock icon for locked paths (sibling of content) */\n  [data-item-section='lock'] {\n    flex: 0 0 auto;\n    margin-left: auto;\n    display: flex;\n    align-items: center;\n    color: var(--trees-fg-muted);\n  }\n  [data-item-section='lock'] svg {\n    display: block;\n  }\n\n  [data-type='header-slot'] {\n    display: block;\n    flex: 0 0 auto;\n  }\n\n  [data-type='context-menu-wash'] {\n    position: absolute;\n    inset: 0;\n    z-index: 3;\n    background-color: transparent;\n    touch-action: none;\n  }\n\n  [data-type='context-menu-anchor'] {\n    position: absolute;\n    top: 0;\n    right: var(--trees-context-menu-trigger-inline-offset);\n    z-index: 4;\n    display: none;\n    align-items: center;\n\n    &[data-visible='true'] {\n      display: flex;\n    }\n  }\n\n  /* Hide the floating trigger while the scroll container is actively moving.\n   * The anchor is positioned against the root, not the scroll content, so its\n   * `top` follows the row via a React state update — one frame behind the\n   * compositor. That delay is visible as the trigger hovering over the wrong\n   * row during the first frame of a scroll. The `data-is-scrolling` flag on\n   * the root is flipped synchronously on `wheel`/`touchmove`/`keydown` before\n   * the compositor commits the next paint, so this selector hides the anchor\n   * in the same frame the scroll begins. */\n  [data-file-tree-virtualized-root='true'][data-is-scrolling]\n    [data-type='context-menu-anchor'] {\n    display: none;\n  }\n\n  [data-type='context-menu-anchor'] > slot[name='context-menu'] {\n    display: block;\n    width: 0;\n    min-width: 0;\n    flex: 0 0 0;\n    overflow: visible;\n  }\n\n  /* Single floating context menu trigger */\n  [data-type='context-menu-trigger'] {\n    all: unset;\n    align-items: center;\n    justify-content: center;\n    width: var(--trees-action-lane-width);\n    color: var(--trees-fg-muted);\n    fill: currentColor;\n    cursor: pointer;\n    font-family: var(--trees-font-family);\n    font-size: var(--trees-font-size);\n    border-top-right-radius: var(--trees-border-radius);\n    border-bottom-right-radius: var(--trees-border-radius);\n    margin: var(--trees-focus-ring-width);\n    height: calc(var(--trees-row-height) - var(--trees-focus-ring-width) * 2);\n    border-width: 0;\n    transition: color 120ms ease;\n\n    display: flex;\n  }\n\n  [data-type='context-menu-trigger']:hover,\n  [data-type='context-menu-trigger'][aria-expanded='true'] {\n    color: var(--trees-fg);\n  }\n\n  /** @pierre/truncate css here, manually copy pasted for now */\n  [data-truncate-container] {\n    /* CUSTOM TO TREES, TO SUPPORT THE OUTLINE */\n    margin-top: -1px;\n    margin-bottom: -1px;\n\n    /* Width of the fade from default marker to text */\n    --truncate-internal-marker-fade-width: var(\n      --truncate-marker-fade-width,\n      2px\n    );\n    /* Width of the solid color between the fade from the default marker to the text */\n    --truncate-internal-marker-gap: var(--truncate-marker-gap, 0px);\n    /* Opacity of the marker 'color' property, not of the element itself */\n    --truncate-internal-marker-opacity: var(--truncate-marker-opacity, 50%);\n    /* Opacity of the marker 'color' property specifically for the middle truncate, not opacity of the element itself */\n    --truncate-internal-middle-marker-opacity: var(\n      --truncate-middle-marker-opacity,\n      80%\n    );\n    /* Background color of the default marker */\n    --truncate-internal-marker-background-color: var(\n      --truncate-marker-background-color,\n      light-dark(white, black)\n    );\n    --truncate-internal-marker-background-overlay-color: var(\n      --truncate-marker-background-overlay-color,\n      transparent\n    );\n    --truncate-internal-marker-block-inset: var(\n      --truncate-marker-block-inset,\n      0px\n    );\n    /* Duration of the fade out animation for the marker */\n    --truncate-internal-marker-fade-out-duration: var(\n      --truncate-marker-fade-out-duration,\n      0ms\n    );\n    /* Duration of the fade in animation for the marker */\n    --truncate-internal-marker-fade-in-duration: var(\n      --truncate-marker-fade-in-duration,\n      100ms\n    );\n\n    /* FADE Variant specifics */\n    --truncate-internal-fade-marker-color: var(\n      --truncate-fade-marker-color,\n      #000\n    );\n    --truncate-internal-fade-marker-width: var(\n      --truncate-fade-marker-width,\n      0.2lh\n    );\n\n    /*\n    In some special cases people might be adding spacing in other ways\n    that would benefit from being able to override this, however the container\n    query below can't use this and would need to be redeclared with the overridden\n    value. It's a bad time, but better than nothing.\n    */\n    --truncate-internal-single-line-height: 1lh;\n\n    height: var(--truncate-internal-single-line-height);\n    min-width: 0;\n    overflow: hidden;\n  }\n\n  [data-truncate-marker] {\n    display: flex;\n    position: absolute;\n    height: var(--truncate-internal-single-line-height);\n    padding-block: var(--truncate-internal-marker-block-inset);\n    box-sizing: border-box;\n    align-items: center;\n    background-clip: content-box;\n    z-index: 2;\n    color: color-mix(\n      in srgb,\n      currentColor var(--truncate-internal-marker-opacity),\n      transparent\n    );\n\n    /* Core trick for hiding the marker until overflow occurs */\n    opacity: 0;\n    transition: opacity var(--truncate-internal-marker-fade-out-duration)\n      ease-in-out;\n  }\n\n  @container measure (height > 1lh) {\n    [data-truncate-marker] {\n      opacity: 1;\n      transition: opacity var(--truncate-internal-marker-fade-in-duration)\n        ease-in-out;\n    }\n  }\n\n  [data-truncate-grid] {\n    display: grid;\n    position: relative;\n  }\n\n  [data-truncate-content='visible'] {\n    white-space: nowrap;\n  }\n\n  [data-truncate-content='overflow'] {\n    opacity: 0;\n    pointer-events: none;\n    -webkit-user-select: none;\n            user-select: none;\n    word-break: break-all;\n    margin-top: calc(-1 * var(--truncate-internal-single-line-height));\n  }\n\n  [data-truncate-marker-cell] {\n    container: measure / size;\n    overflow: visible;\n    -webkit-user-select: none;\n            user-select: none;\n    pointer-events: none;\n  }\n\n  [data-truncate-container='truncate'] {\n    & [data-truncate-grid] {\n      grid-template-columns: minmax(0, max-content) 0;\n    }\n    & [data-truncate-marker] {\n      right: 0;\n    }\n    & [data-truncate-fade] {\n      margin-right: calc(-2 * var(--truncate-internal-fade-marker-width));\n    }\n  }\n\n  [data-truncate-container='fruncate'] {\n    & [data-truncate-grid] {\n      grid-template-columns: 0 minmax(0, max-content) auto;\n    }\n    & [data-truncate-content] {\n      direction: rtl;\n    }\n    & [data-truncate-content] > span {\n      unicode-bidi: plaintext;\n    }\n    & [data-truncate-fade] {\n      margin-left: calc(-2 * var(--truncate-internal-fade-marker-width));\n    }\n  }\n\n  [data-truncate-variant='default'] {\n    & [data-truncate-marker] {\n      background-color: var(--truncate-internal-marker-background-color);\n      background-image: linear-gradient(\n        var(--truncate-internal-marker-background-overlay-color),\n        var(--truncate-internal-marker-background-overlay-color)\n      );\n    }\n    & [data-truncate-marker]::after,\n    & [data-truncate-marker]::before {\n      content: '';\n      position: absolute;\n      width: calc(\n        var(--truncate-internal-marker-fade-width) +\n          var(--truncate-internal-marker-gap)\n      );\n      inset-block-start: var(--truncate-internal-marker-block-inset);\n      height: max(\n        0px,\n        calc(\n          var(--truncate-internal-single-line-height) -\n            var(--truncate-internal-marker-block-inset) * 2\n        )\n      );\n      background-color: var(--truncate-internal-marker-background-color);\n      background-image: linear-gradient(\n        var(--truncate-internal-marker-background-overlay-color),\n        var(--truncate-internal-marker-background-overlay-color)\n      );\n      mask-image: linear-gradient(\n        var(--truncate-internal-fade-dir),\n        #000 0%,\n        #000 var(--truncate-internal-marker-gap),\n        transparent 100%\n      );\n    }\n    & [data-truncate-marker]::after {\n      --truncate-internal-fade-dir: to right;\n      right: calc(\n        -1 *\n          (\n            var(--truncate-internal-marker-fade-width) +\n              var(--truncate-internal-marker-gap)\n          )\n      );\n    }\n    & [data-truncate-marker]::before {\n      --truncate-internal-fade-dir: to left;\n      left: calc(\n        -1 *\n          (\n            var(--truncate-internal-marker-fade-width) +\n              var(--truncate-internal-marker-gap)\n          )\n      );\n    }\n  }\n\n  [data-truncate-variant='fade'] {\n    & [data-truncate-marker] {\n      background: transparent;\n    }\n  }\n\n  [data-truncate-fade] {\n    box-shadow:\n      0 0 calc(var(--truncate-internal-fade-marker-width) / 2)\n        var(--truncate-internal-fade-marker-color),\n      0 0 var(--truncate-internal-fade-marker-width)\n        var(--truncate-internal-fade-marker-color);\n    width: calc(var(--truncate-internal-fade-marker-width) * 2);\n    height: calc(\n      var(--truncate-internal-single-line-height) -\n        (var(--truncate-internal-fade-marker-width) * 2)\n    );\n    margin: var(--truncate-internal-fade-marker-width) 0;\n  }\n\n  [data-truncate-group-container='middle'] {\n    & [data-truncate-container] {\n      --truncate-marker-opacity: var(--truncate-internal-middle-marker-opacity);\n    }\n\n    display: flex;\n    min-width: 0;\n\n    & > div {\n      min-width: 0;\n    }\n\n    & > div[data-truncate-segment-priority='1'] {\n      flex: 0 1 max-content;\n    }\n    & > div[data-truncate-segment-priority='2'] {\n      flex: 0 999999 max-content;\n    }\n  }\n}\n";

//#endregion
//#region node_modules/@pierre/trees/dist/utils/cssWrappers.js
const LAYER_ORDER = `@layer base, unsafe;`;
function wrapCoreCSS(coreCSS) {
	return `${LAYER_ORDER}
@layer base {
  ${coreCSS}
}`;
}
function wrapUnsafeCSS(unsafeCSS) {
	return `${LAYER_ORDER}
@layer unsafe {
  ${unsafeCSS}
}`;
}

//#endregion
//#region node_modules/@pierre/trees/dist/utils/scrollbarGutter.js
const measuredGutterCache = /* @__PURE__ */ new WeakMap();
function measureScrollbarGutter(shadowRoot) {
	const cachedScrollbarGutter = measuredGutterCache.get(shadowRoot);
	if (cachedScrollbarGutter != null) return cachedScrollbarGutter;
	const wrapper = document.createElement("div");
	wrapper.setAttribute(FILE_TREE_SCROLLBAR_MEASURE_ATTRIBUTE, "true");
	const child = document.createElement("div");
	child.style.position = "relative";
	child.style.height = "200%";
	wrapper.appendChild(child);
	shadowRoot.appendChild(wrapper);
	const measuredGutter = Math.max(wrapper.offsetWidth - wrapper.clientWidth, 0);
	wrapper.remove();
	measuredGutterCache.set(shadowRoot, measuredGutter);
	return measuredGutter;
}
function ensureMeasuredScrollbarGutter(host, shadowRoot) {
	if (!host.isConnected) return;
	const measuredScrollbarGutter = measureScrollbarGutter(shadowRoot);
	if (measuredScrollbarGutter == null) return;
	const existing = shadowRoot.querySelector(`style[${FILE_TREE_SCROLLBAR_GUTTER_STYLE_ATTRIBUTE}]`);
	const styleEl = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
	if (!(existing instanceof HTMLStyleElement)) {
		styleEl.setAttribute(FILE_TREE_SCROLLBAR_GUTTER_STYLE_ATTRIBUTE, "");
		shadowRoot.appendChild(styleEl);
	}
	styleEl.textContent = `:host { ${FILE_TREE_SCROLLBAR_GUTTER_MEASURED_PROPERTY}: ${measuredScrollbarGutter}px; }`;
}

//#endregion
//#region node_modules/@pierre/trees/dist/components/web-components.js
let sheet;
function ensureFileTreeStyles(shadowRoot) {
	if (typeof CSSStyleSheet !== "undefined" && typeof CSSStyleSheet.prototype.replaceSync === "function" && "adoptedStyleSheets" in shadowRoot) {
		if (sheet == null) {
			sheet = new CSSStyleSheet();
			sheet.replaceSync(wrapCoreCSS(style_default));
		}
		let adopted = false;
		try {
			shadowRoot.adoptedStyleSheets = [sheet];
			adopted = true;
		} catch {}
		if (adopted) {
			shadowRoot.querySelector(`style[${FILE_TREE_STYLE_ATTRIBUTE}]`)?.remove();
			return;
		}
	}
	if (shadowRoot.querySelector(`style[${FILE_TREE_STYLE_ATTRIBUTE}]`) == null) {
		const styleEl = document.createElement("style");
		styleEl.setAttribute(FILE_TREE_STYLE_ATTRIBUTE, "");
		styleEl.textContent = wrapCoreCSS(style_default);
		shadowRoot.prepend(styleEl);
	}
}
function prepareFileTreeShadowRoot(host, shadowRoot) {
	adoptDeclarativeShadowDom(host, shadowRoot);
	ensureFileTreeStyles(shadowRoot);
	ensureMeasuredScrollbarGutter(host, shadowRoot);
}
function adoptDeclarativeShadowDom(host, shadowRoot) {
	const template = host.querySelector("template[shadowrootmode=\"open\"], template[data-file-tree-shadowrootmode=\"open\"]");
	if (!(template instanceof HTMLTemplateElement)) return;
	if (shadowRoot.childNodes.length > 0) return;
	shadowRoot.appendChild(template.content.cloneNode(true));
	if (template.hasAttribute("shadowrootmode")) template.remove();
}
if (typeof HTMLElement !== "undefined" && customElements.get(FILE_TREE_TAG_NAME) == null) {
	class FileTreeContainer extends HTMLElement {
		constructor() {
			super();
		}
		connectedCallback() {
			const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: "open" });
			prepareFileTreeShadowRoot(this, shadowRoot);
		}
	}
	customElements.define(FILE_TREE_TAG_NAME, FileTreeContainer);
	if (typeof document !== "undefined") for (const el of Array.from(document.querySelectorAll(FILE_TREE_TAG_NAME))) {
		if (!(el instanceof HTMLElement)) continue;
		prepareFileTreeShadowRoot(el, el.shadowRoot ?? el.attachShadow({ mode: "open" }));
	}
}
const FileTreeContainerLoaded = true;

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/child-index.js
const PATH_STORE_CHILD_INDEX_CHUNK_SHIFT = 5;
const PATH_STORE_CHILD_INDEX_CHUNK_SIZE = 1 << PATH_STORE_CHILD_INDEX_CHUNK_SHIFT;
const PATH_STORE_CHILD_INDEX_CHUNK_THRESHOLD = PATH_STORE_CHILD_INDEX_CHUNK_SIZE * 4;
const PATH_STORE_CHILD_INDEX_CHUNK_THRESHOLD_EXTERNAL = PATH_STORE_CHILD_INDEX_CHUNK_THRESHOLD;
function createDirectoryChildIndex() {
	return {
		childIdByNameId: /* @__PURE__ */ new Map(),
		childIds: [],
		childPositionById: /* @__PURE__ */ new Map(),
		childVisibleChunkSums: null,
		totalChildSubtreeNodeCount: 0,
		totalChildVisibleSubtreeCount: 0
	};
}
function createPresortedDirectoryChildIndex() {
	return {
		childIdByNameId: null,
		childIds: [],
		childPositionById: null,
		childVisibleChunkSums: null,
		totalChildSubtreeNodeCount: 0,
		totalChildVisibleSubtreeCount: 0
	};
}
function ensureChildIdByNameId(nodes, index) {
	if (index.childIdByNameId != null) return index.childIdByNameId;
	const map = /* @__PURE__ */ new Map();
	for (const childId of index.childIds) {
		const childNode = nodes[childId];
		if (childNode != null) map.set(childNode.nameId, childId);
	}
	index.childIdByNameId = map;
	return map;
}
function ensureChildPositions(index) {
	if (index.childPositionById != null) return index.childPositionById;
	const positions = /* @__PURE__ */ new Map();
	for (let i = 0; i < index.childIds.length; i++) {
		const childId = index.childIds[i];
		if (childId != null) positions.set(childId, i);
	}
	index.childPositionById = positions;
	return positions;
}
function appendChildReference(index, childId) {
	if (index.childPositionById != null) index.childPositionById.set(childId, index.childIds.length);
	index.childIds.push(childId);
}
function updateChildPositionsFrom(index, startIndex) {
	if (index.childPositionById == null) return;
	for (let position = startIndex; position < index.childIds.length; position++) {
		const childId = index.childIds[position];
		if (childId != null) index.childPositionById.set(childId, position);
	}
}
function rebuildDirectoryChildAggregates(nodes, index) {
	let totalChildSubtreeNodeCount = 0;
	let totalChildVisibleSubtreeCount = 0;
	for (const childId of index.childIds) {
		const childNode = nodes[childId];
		if (childNode == null) continue;
		totalChildSubtreeNodeCount += childNode.subtreeNodeCount;
		totalChildVisibleSubtreeCount += childNode.visibleSubtreeCount;
	}
	index.totalChildSubtreeNodeCount = totalChildSubtreeNodeCount;
	index.totalChildVisibleSubtreeCount = totalChildVisibleSubtreeCount;
	rebuildVisibleChildChunks(nodes, index);
}
function applyChildAggregateDelta(index, childId, subtreeNodeDelta, visibleSubtreeDelta) {
	index.totalChildSubtreeNodeCount += subtreeNodeDelta;
	index.totalChildVisibleSubtreeCount += visibleSubtreeDelta;
	if (index.childVisibleChunkSums == null || visibleSubtreeDelta === 0) return;
	const childPosition = ensureChildPositions(index).get(childId);
	if (childPosition === void 0) return;
	const chunkIndex = childPosition >> PATH_STORE_CHILD_INDEX_CHUNK_SHIFT;
	index.childVisibleChunkSums[chunkIndex] += visibleSubtreeDelta;
}
function selectChildIndexByVisibleIndex(nodes, index, visibleIndex) {
	const chunkSums = index.childVisibleChunkSums;
	if (chunkSums != null) {
		let remainingIndex$1 = visibleIndex;
		let childIndex = 0;
		for (const chunkVisibleCount of chunkSums) {
			if (remainingIndex$1 < chunkVisibleCount) {
				const selected = selectChildIndexWithinChunk(nodes, index, childIndex, remainingIndex$1);
				return {
					...selected,
					childVisibleIndex: visibleIndex - selected.localVisibleIndex
				};
			}
			remainingIndex$1 -= chunkVisibleCount;
			childIndex += PATH_STORE_CHILD_INDEX_CHUNK_SIZE;
		}
		throw new Error(`Visible child index ${String(visibleIndex)} is out of range`);
	}
	let remainingIndex = visibleIndex;
	for (let childIndex = 0; childIndex < index.childIds.length; childIndex++) {
		const childId = index.childIds[childIndex];
		if (childId == null) continue;
		const childNode = nodes[childId];
		if (childNode == null) continue;
		if (remainingIndex < childNode.visibleSubtreeCount) return {
			childIndex,
			childVisibleIndex: visibleIndex - remainingIndex,
			localVisibleIndex: remainingIndex
		};
		remainingIndex -= childNode.visibleSubtreeCount;
	}
	throw new Error(`Visible child index ${String(visibleIndex)} is out of range`);
}
function getVisibleChildPrefixCount(nodes, index, childPosition) {
	let visibleCount = 0;
	const chunkSums = index.childVisibleChunkSums;
	let scanStart = 0;
	if (chunkSums != null) {
		const chunkIndex = childPosition >> PATH_STORE_CHILD_INDEX_CHUNK_SHIFT;
		for (let chunkOffset = 0; chunkOffset < chunkIndex; chunkOffset += 1) visibleCount += chunkSums[chunkOffset] ?? 0;
		scanStart = chunkIndex << PATH_STORE_CHILD_INDEX_CHUNK_SHIFT;
	}
	for (let childIndex = scanStart; childIndex < childPosition; childIndex += 1) {
		const childId = index.childIds[childIndex];
		if (childId == null) continue;
		const childNode = nodes[childId];
		if (childNode == null) continue;
		visibleCount += childNode.visibleSubtreeCount;
	}
	return visibleCount;
}
function rebuildVisibleChildChunks(nodes, index) {
	if (index.childIds.length < PATH_STORE_CHILD_INDEX_CHUNK_THRESHOLD) {
		index.childVisibleChunkSums = null;
		return;
	}
	const chunkCount = Math.ceil(index.childIds.length / PATH_STORE_CHILD_INDEX_CHUNK_SIZE);
	const chunkSums = new Int32Array(chunkCount);
	for (let childIndex = 0; childIndex < index.childIds.length; childIndex++) {
		const childId = index.childIds[childIndex];
		if (childId == null) continue;
		const childNode = nodes[childId];
		if (childNode == null) continue;
		chunkSums[childIndex >> PATH_STORE_CHILD_INDEX_CHUNK_SHIFT] += childNode.visibleSubtreeCount;
	}
	index.childVisibleChunkSums = chunkSums;
}
function selectChildIndexWithinChunk(nodes, index, chunkStartIndex, visibleIndex) {
	const chunkEndIndex = Math.min(index.childIds.length, chunkStartIndex + PATH_STORE_CHILD_INDEX_CHUNK_SIZE);
	let remainingIndex = visibleIndex;
	for (let childIndex = chunkStartIndex; childIndex < chunkEndIndex; childIndex++) {
		const childId = index.childIds[childIndex];
		if (childId == null) continue;
		const childNode = nodes[childId];
		if (childNode == null) continue;
		if (remainingIndex < childNode.visibleSubtreeCount) return {
			childIndex,
			localVisibleIndex: remainingIndex
		};
		remainingIndex -= childNode.visibleSubtreeCount;
	}
	throw new Error(`Visible child index ${String(visibleIndex)} is out of range`);
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/internal-types.js
const PATH_STORE_NODE_KIND_FILE = 0;
const PATH_STORE_NODE_KIND_DIRECTORY = 1;
const PATH_STORE_NODE_FLAG_EXPLICIT = 1;
const PATH_STORE_NODE_FLAG_ROOT = 2;
const PATH_STORE_NODE_FLAG_REMOVED = 4;
const PATH_STORE_NODE_FLAGS_MASK = PATH_STORE_NODE_FLAG_ROOT | 5;
const PATH_STORE_NODE_KIND_SHIFT = 3;
const PATH_STORE_NODE_KIND_MASK = 1 << PATH_STORE_NODE_KIND_SHIFT;
const PATH_STORE_NODE_DEPTH_SHIFT = 4;
function createNodeDepthAndFlags(depth, flags, kind = PATH_STORE_NODE_KIND_FILE) {
	return depth << PATH_STORE_NODE_DEPTH_SHIFT | kind << PATH_STORE_NODE_KIND_SHIFT | flags;
}
function getNodeDepth(node) {
	return node.depthAndFlags >>> PATH_STORE_NODE_DEPTH_SHIFT;
}
function getNodeKind(node) {
	return (node.depthAndFlags & PATH_STORE_NODE_KIND_MASK) >> PATH_STORE_NODE_KIND_SHIFT;
}
function isDirectoryNode(node) {
	return (node.depthAndFlags & PATH_STORE_NODE_KIND_MASK) !== 0;
}
function getNodeFlags(node) {
	return node.depthAndFlags & PATH_STORE_NODE_FLAGS_MASK;
}
function hasNodeFlag(node, flag) {
	return (getNodeFlags(node) & flag) !== 0;
}
function addNodeFlag(node, flag) {
	node.depthAndFlags |= flag;
}
function setNodeDepth(node, depth) {
	node.depthAndFlags = createNodeDepthAndFlags(depth, getNodeFlags(node), getNodeKind(node));
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/internal/benchmarkInstrumentation.js
const BENCHMARK_INSTRUMENTATION = Symbol("benchmarkInstrumentation");
/** Attaches instrumentation without changing the public option shape. */
function attachBenchmarkInstrumentation(value, instrumentation) {
	if (instrumentation == null) return value;
	Object.defineProperty(value, BENCHMARK_INSTRUMENTATION, {
		configurable: true,
		enumerable: false,
		value: instrumentation,
		writable: false
	});
	return value;
}
function getBenchmarkInstrumentation(value) {
	if (value == null) return null;
	return value[BENCHMARK_INSTRUMENTATION] ?? null;
}
/** Executes phase timing only when a benchmark fixture injects instrumentation. */
function withBenchmarkPhase(instrumentation, name, fn) {
	if (instrumentation == null) return fn();
	return instrumentation.measurePhase(name, fn);
}
function setBenchmarkCounter(instrumentation, name, value) {
	if (!Number.isFinite(value) || instrumentation == null) return;
	instrumentation.setCounter(name, value);
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/sort.js
function isDigitCode(characterCode) {
	return characterCode >= 48 && characterCode <= 57;
}
function splitIntoNaturalTokens(value) {
	const tokens = [];
	let tokenStart = 0;
	let index = 0;
	while (index < value.length) {
		while (index < value.length && !isDigitCode(value.charCodeAt(index))) index += 1;
		if (index >= value.length) break;
		if (index > tokenStart) tokens.push(value.slice(tokenStart, index));
		let numberValue = 0;
		while (index < value.length && isDigitCode(value.charCodeAt(index))) {
			numberValue = numberValue * 10 + (value.charCodeAt(index) - 48);
			index += 1;
		}
		tokens.push(numberValue);
		tokenStart = index;
	}
	if (tokenStart < value.length || tokens.length === 0) tokens.push(value.slice(tokenStart));
	return tokens;
}
function createSegmentSortKey(value) {
	const lowerValue = value.toLowerCase();
	return {
		lowerValue,
		tokens: splitIntoNaturalTokens(lowerValue)
	};
}
function compareNaturalTokens(leftTokens, rightTokens) {
	const tokenCount = Math.min(leftTokens.length, rightTokens.length);
	for (let index = 0; index < tokenCount; index++) {
		const leftToken = leftTokens[index];
		const rightToken = rightTokens[index];
		if (leftToken === rightToken) continue;
		if (typeof leftToken === "number" && typeof rightToken === "number") return leftToken < rightToken ? -1 : 1;
		const leftString = String(leftToken);
		const rightString = String(rightToken);
		if (leftString !== rightString) return leftString < rightString ? -1 : 1;
	}
	if (leftTokens.length !== rightTokens.length) return leftTokens.length < rightTokens.length ? -1 : 1;
	return 0;
}
function compareSegmentSortKeys(leftKey, rightKey) {
	if (leftKey.tokens.length === 1 && rightKey.tokens.length === 1 && typeof leftKey.tokens[0] === "string" && typeof rightKey.tokens[0] === "string") {
		if (leftKey.lowerValue === rightKey.lowerValue) return 0;
		return leftKey.lowerValue < rightKey.lowerValue ? -1 : 1;
	}
	const tokenComparison = compareNaturalTokens(leftKey.tokens, rightKey.tokens);
	if (tokenComparison !== 0) return tokenComparison;
	if (leftKey.lowerValue !== rightKey.lowerValue) return leftKey.lowerValue < rightKey.lowerValue ? -1 : 1;
	return 0;
}
function compareSegmentValuesWithSortKeyLookup(left, right, getSortKey) {
	const comparison = compareSegmentSortKeys(getSortKey(left), getSortKey(right));
	if (comparison !== 0) return comparison;
	if (left === right) return 0;
	return left < right ? -1 : 1;
}
function compareSegmentValues(left, right) {
	return compareSegmentValuesWithSortKeyLookup(left, right, createSegmentSortKey);
}
function getKindAtDepth(entry, depth) {
	if (!(depth === entry.segments.length - 1)) return PATH_STORE_NODE_KIND_DIRECTORY;
	return entry.isDirectory ? PATH_STORE_NODE_KIND_DIRECTORY : PATH_STORE_NODE_KIND_FILE;
}
function comparePreparedEntries(left, right) {
	const sharedDepth = Math.min(left.segments.length, right.segments.length);
	for (let depth = 0; depth < sharedDepth; depth++) {
		const leftSegment = left.segments[depth];
		const rightSegment = right.segments[depth];
		if (leftSegment === rightSegment) continue;
		const leftKind = getKindAtDepth(left, depth);
		if (leftKind !== getKindAtDepth(right, depth)) return leftKind === PATH_STORE_NODE_KIND_DIRECTORY ? -1 : 1;
		return compareSegmentValues(leftSegment, rightSegment);
	}
	if (left.segments.length !== right.segments.length) return left.segments.length < right.segments.length ? -1 : 1;
	if (left.isDirectory === right.isDirectory) return 0;
	return left.isDirectory ? -1 : 1;
}
function comparePreparedPaths(left, right) {
	return comparePreparedEntries(left, right);
}
function comparePreparedPathsWithCachedSortKeys(left, right, cache) {
	const getCachedSortKey = (value) => {
		const existingKey = cache.get(value);
		if (existingKey != null) return existingKey;
		const nextKey = createSegmentSortKey(value);
		cache.set(value, nextKey);
		return nextKey;
	};
	const sharedDepth = Math.min(left.segments.length, right.segments.length);
	for (let depth = 0; depth < sharedDepth; depth++) {
		const leftSegment = left.segments[depth];
		const rightSegment = right.segments[depth];
		if (leftSegment === rightSegment) continue;
		const leftKind = getKindAtDepth(left, depth);
		if (leftKind !== getKindAtDepth(right, depth)) return leftKind === PATH_STORE_NODE_KIND_DIRECTORY ? -1 : 1;
		return compareSegmentValuesWithSortKeyLookup(leftSegment, rightSegment, getCachedSortKey);
	}
	if (left.segments.length !== right.segments.length) return left.segments.length < right.segments.length ? -1 : 1;
	if (left.isDirectory === right.isDirectory) return 0;
	return left.isDirectory ? -1 : 1;
}
function getSegmentSortKey(segmentTable, segmentId) {
	const existingKey = segmentTable.sortKeyById[segmentId];
	if (existingKey !== void 0) return existingKey;
	const value = segmentTable.valueById[segmentId];
	const nextKey = createSegmentSortKey(value);
	segmentTable.sortKeyById[segmentId] = nextKey;
	return nextKey;
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/options.js
function resolvePathStoreOptions(options = {}) {
	return {
		flattenEmptyDirectories: options.flattenEmptyDirectories !== false,
		sort: options.sort ?? "default"
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/path.js
function splitCanonicalPath(inputPath) {
	const hasTrailingSlash = inputPath.length > 0 && inputPath.charCodeAt(inputPath.length - 1) === 47;
	const endIndex = hasTrailingSlash ? inputPath.length - 1 : inputPath.length;
	const segments = [];
	let segmentStart = 0;
	for (let index = 0; index < endIndex; index++) {
		if (inputPath.charCodeAt(index) !== 47) continue;
		segments.push(inputPath.slice(segmentStart, index));
		segmentStart = index + 1;
	}
	segments.push(inputPath.slice(segmentStart, endIndex));
	return {
		hasTrailingSlash,
		segments
	};
}
function parseInputPath(inputPath) {
	const { hasTrailingSlash, segments } = splitCanonicalPath(inputPath);
	return {
		basename: segments[segments.length - 1] ?? "",
		isDirectory: hasTrailingSlash,
		path: inputPath,
		segments
	};
}
function parseLookupPath(inputPath) {
	if (inputPath.length === 0) return {
		requiresDirectory: false,
		segments: []
	};
	const { hasTrailingSlash, segments } = splitCanonicalPath(inputPath);
	return {
		requiresDirectory: hasTrailingSlash,
		segments
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/segments.js
const ROOT_SEGMENT_VALUE = "";
function createSegmentTable() {
	const idByValue = /* @__PURE__ */ new Map();
	idByValue.set(ROOT_SEGMENT_VALUE, 0);
	return {
		idByValue,
		valueById: [ROOT_SEGMENT_VALUE],
		sortKeyById: [createSegmentSortKey(ROOT_SEGMENT_VALUE)]
	};
}
function internSegment(segmentTable, value) {
	const existingId = segmentTable.idByValue.get(value);
	if (existingId !== void 0) return existingId;
	const nextId = segmentTable.valueById.length;
	segmentTable.idByValue.set(value, nextId);
	segmentTable.valueById.push(value);
	return nextId;
}
function getSegmentValue(segmentTable, segmentId) {
	const value = segmentTable.valueById[segmentId];
	if (value === void 0) throw new Error(`Unknown segment ID: ${String(segmentId)}`);
	return value;
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/builder.js
const PREPARED_INPUT_KIND = Symbol("pathStorePreparedInputKind");
function attachPreparedInputKind(value, kind) {
	value[PREPARED_INPUT_KIND] = kind;
	return value;
}
function createCompareEntry$1(preparedPath) {
	return {
		basename: preparedPath.basename,
		depth: preparedPath.segments.length,
		isDirectory: preparedPath.isDirectory,
		path: preparedPath.path,
		segments: preparedPath.segments
	};
}
function compareWithSortOption(left, right, sort) {
	if (sort === "default") return comparePreparedPaths(left, right);
	return sort(createCompareEntry$1(left), createCompareEntry$1(right));
}
function createRootNode() {
	return {
		depthAndFlags: createNodeDepthAndFlags(0, PATH_STORE_NODE_FLAG_EXPLICIT | PATH_STORE_NODE_FLAG_ROOT, PATH_STORE_NODE_KIND_DIRECTORY),
		nameId: 0,
		parentId: 0,
		subtreeNodeCount: 1,
		visibleSubtreeCount: 1
	};
}
function computeSharedPrefixLength(left, right) {
	const maxLength = Math.min(left.length, right.length);
	for (let index = 0; index < maxLength; index++) if (left[index] !== right[index]) return index;
	return maxLength;
}
function getDirectoryDepth(preparedPath) {
	return preparedPath.isDirectory ? preparedPath.segments.length : preparedPath.segments.length - 1;
}
function isPreparedPathArray(value) {
	return Array.isArray(value) && value.every((entry) => entry != null && typeof entry === "object" && typeof entry.path === "string" && Array.isArray(entry.segments) && typeof entry.basename === "string" && typeof entry.isDirectory === "boolean");
}
function isStringArray(value) {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function preparePaths(paths, options = {}) {
	return preparePathEntries(paths, options).map((entry) => entry.path);
}
function prepareInput(paths, options = {}) {
	const preparedPaths = preparePathEntries(paths, options);
	return attachPreparedInputKind({
		paths: preparedPaths.map((entry) => entry.path),
		preparedPaths
	}, "prepared");
}
function preparePresortedInput(paths) {
	const pathCount = paths.length;
	let presortedPathsContainDirectories = false;
	for (let index = 0; index < pathCount; index += 1) {
		const path = paths[index];
		if (path.length > 0 && path.charCodeAt(path.length - 1) === 47) {
			presortedPathsContainDirectories = true;
			break;
		}
	}
	return attachPreparedInputKind({
		paths,
		presortedPaths: paths,
		presortedPathsContainDirectories
	}, "presorted");
}
function getPreparedInputEntries(preparedInput) {
	const internalPreparedInput = preparedInput;
	const preparedPaths = internalPreparedInput.preparedPaths;
	if (internalPreparedInput[PREPARED_INPUT_KIND] === "prepared" && preparedPaths != null) return preparedPaths;
	if (!isPreparedPathArray(preparedPaths)) throw new Error("preparedInput must come from PathStore.prepareInput()");
	return preparedPaths;
}
function getPreparedInputPresortedPaths(preparedInput) {
	const internalPreparedInput = preparedInput;
	if (internalPreparedInput[PREPARED_INPUT_KIND] === "presorted" && internalPreparedInput.presortedPaths != null) return internalPreparedInput.presortedPaths;
	return isStringArray(internalPreparedInput.presortedPaths) ? internalPreparedInput.presortedPaths : null;
}
function getPreparedInputPresortedPathsContainDirectories(preparedInput) {
	const internalPreparedInput = preparedInput;
	return typeof internalPreparedInput.presortedPathsContainDirectories === "boolean" ? internalPreparedInput.presortedPathsContainDirectories : null;
}
function preparePathEntries(paths, options = {}) {
	const resolvedOptions = resolvePathStoreOptions(options);
	const instrumentation = getBenchmarkInstrumentation(options);
	setBenchmarkCounter(instrumentation, "workload.inputFiles", paths.length);
	const preparedPaths = withBenchmarkPhase(instrumentation, "store.preparePathEntries.parse", () => paths.map((path) => parseInputPath(path)));
	withBenchmarkPhase(instrumentation, "store.preparePathEntries.sort", () => preparedPaths.sort((left, right) => compareWithSortOption(left, right, resolvedOptions.sort)));
	return preparedPaths;
}
var PathStoreBuilder = class {
	directories = /* @__PURE__ */ new Map();
	directoryStack = [0];
	presortedDirectoryNodeIds = [];
	initialExpandedPathSet;
	createdDirectoriesAllExpanded = false;
	createdDirectoryCount = 0;
	lastPreparedPath = null;
	nodes = [createRootNode()];
	options;
	instrumentation;
	segmentSortKeyCache = /* @__PURE__ */ new Map();
	segmentTable = createSegmentTable();
	hasDeferredDirectoryIndexes = false;
	constructor(options = {}) {
		this.instrumentation = getBenchmarkInstrumentation(options);
		this.options = resolvePathStoreOptions(options);
		const initialExpandedPaths = options.initialExpandedPaths ?? null;
		if (initialExpandedPaths == null || initialExpandedPaths.length === 0) this.initialExpandedPathSet = null;
		else {
			const normalizedPaths = /* @__PURE__ */ new Set();
			const hintCount = initialExpandedPaths.length;
			for (let index = 0; index < hintCount; index += 1) {
				const path = initialExpandedPaths[index];
				const length = path.length;
				normalizedPaths.add(length > 0 && path.charCodeAt(length - 1) === 47 ? path.slice(0, length - 1) : path);
			}
			this.initialExpandedPathSet = normalizedPaths;
			this.createdDirectoriesAllExpanded = true;
		}
		this.directories.set(0, createDirectoryChildIndex());
	}
	appendPaths(paths) {
		return withBenchmarkPhase(this.instrumentation, "store.builder.appendPaths.parse", () => this.appendPreparedPaths(paths.map((path) => parseInputPath(path))));
	}
	appendPreparedPaths(preparedPaths, validateOrder = true) {
		this.createdDirectoriesAllExpanded = false;
		withBenchmarkPhase(this.instrumentation, "store.builder.appendPreparedPaths", () => {
			for (const preparedPath of preparedPaths) this.appendPreparedPath(preparedPath, validateOrder);
		});
		return this;
	}
	appendPresortedPaths(paths, containsDirectories = null) {
		withBenchmarkPhase(this.instrumentation, "store.builder.appendPresortedPaths", () => {
			if (containsDirectories === false) {
				this.appendPresortedFilePaths(paths);
				return;
			}
			this.createdDirectoriesAllExpanded = false;
			let previousPath = null;
			let currentDepth = 0;
			const nodes = this.nodes;
			const segmentTable = this.segmentTable;
			const idByValue = segmentTable.idByValue;
			const valueById = segmentTable.valueById;
			const dirStack = this.directoryStack;
			let stackTop = 0;
			let cachedDirPrefix = "";
			let cachedDirDepth = 0;
			for (const path of paths) {
				if (previousPath === path) throw new Error(`Duplicate path: "${path}"`);
				const hasTrailingSlash = path.length > 0 && path.charCodeAt(path.length - 1) === 47;
				const endIndex = hasTrailingSlash ? path.length - 1 : path.length;
				let sharedDirectoryDepth = 0;
				let unsharedSegmentStart = 0;
				if (previousPath != null) if (cachedDirPrefix.length > 0 && path.length > cachedDirPrefix.length && path.startsWith(cachedDirPrefix)) {
					sharedDirectoryDepth = cachedDirDepth;
					unsharedSegmentStart = cachedDirPrefix.length;
				} else {
					const compareLength = Math.min(endIndex, previousPath.length);
					let prefixMatched = true;
					for (let ci = 0; ci < compareLength; ci++) {
						const cc = path.charCodeAt(ci);
						if (cc !== previousPath.charCodeAt(ci)) {
							prefixMatched = false;
							break;
						}
						if (cc === 47) {
							sharedDirectoryDepth++;
							unsharedSegmentStart = ci + 1;
						}
					}
					if (prefixMatched && hasTrailingSlash && compareLength === endIndex && previousPath.length > endIndex && previousPath.charCodeAt(endIndex) === 47) {
						sharedDirectoryDepth++;
						unsharedSegmentStart = endIndex + 1;
					}
				}
				stackTop = sharedDirectoryDepth;
				currentDepth = sharedDirectoryDepth;
				let segmentStart = unsharedSegmentStart;
				let slashPos = path.indexOf("/", segmentStart);
				while (slashPos >= 0 && slashPos < endIndex) {
					const parentId = dirStack[stackTop];
					if (parentId === void 0) throw new Error("Directory stack underflow while building the path store");
					currentDepth++;
					const dirSeg = path.slice(segmentStart, slashPos);
					let dirNameId = idByValue.get(dirSeg);
					if (dirNameId === void 0) {
						dirNameId = valueById.length;
						idByValue.set(dirSeg, dirNameId);
						valueById.push(dirSeg);
					}
					const nodeId = nodes.length;
					nodes.push({
						depthAndFlags: createNodeDepthAndFlags(currentDepth, 0, PATH_STORE_NODE_KIND_DIRECTORY),
						nameId: dirNameId,
						parentId,
						subtreeNodeCount: 1,
						visibleSubtreeCount: 1
					});
					this.recordCreatedDirectoryPath(path.slice(0, slashPos));
					stackTop++;
					dirStack[stackTop] = nodeId;
					segmentStart = slashPos + 1;
					slashPos = path.indexOf("/", segmentStart);
				}
				if (hasTrailingSlash) {
					if (segmentStart < endIndex) {
						const parentId = dirStack[stackTop];
						if (parentId === void 0) throw new Error(`Unable to resolve directory parent for "${path}"`);
						currentDepth++;
						const trailSeg = path.slice(segmentStart, endIndex);
						let trailNameId = idByValue.get(trailSeg);
						if (trailNameId === void 0) {
							trailNameId = valueById.length;
							idByValue.set(trailSeg, trailNameId);
							valueById.push(trailSeg);
						}
						const nodeId = nodes.length;
						nodes.push({
							depthAndFlags: createNodeDepthAndFlags(currentDepth, 0, PATH_STORE_NODE_KIND_DIRECTORY),
							nameId: trailNameId,
							parentId,
							subtreeNodeCount: 1,
							visibleSubtreeCount: 1
						});
						stackTop++;
						dirStack[stackTop] = nodeId;
					}
					const directoryId = dirStack[stackTop];
					if (directoryId === void 0) throw new Error(`Unable to resolve directory node for "${path}"`);
					this.promoteDirectoryToExplicit(directoryId, path);
				} else {
					const parentId = dirStack[stackTop];
					if (parentId === void 0) throw new Error(`Unable to resolve file parent for "${path}"`);
					const fileSeg = path.slice(segmentStart);
					let fileNameId = idByValue.get(fileSeg);
					if (fileNameId === void 0) {
						fileNameId = valueById.length;
						idByValue.set(fileSeg, fileNameId);
						valueById.push(fileSeg);
					}
					nodes.push({
						depthAndFlags: createNodeDepthAndFlags(currentDepth + 1, 0),
						nameId: fileNameId,
						parentId,
						subtreeNodeCount: 1,
						visibleSubtreeCount: 1
					});
				}
				if (segmentStart !== cachedDirPrefix.length) {
					cachedDirPrefix = path.substring(0, segmentStart);
					cachedDirDepth = currentDepth;
				}
				previousPath = path;
			}
			dirStack.length = stackTop + 1;
			if (previousPath != null) this.lastPreparedPath = parseInputPath(previousPath);
			this.hasDeferredDirectoryIndexes = true;
		});
		return this;
	}
	appendPresortedFilePaths(paths) {
		let previousPath = null;
		let currentDepth = 0;
		const nodes = this.nodes;
		const segmentTable = this.segmentTable;
		const idByValue = segmentTable.idByValue;
		const valueById = segmentTable.valueById;
		const dirStack = this.directoryStack;
		let stackTop = 0;
		let cachedDirPrefix = "";
		let cachedDirDepth = 0;
		for (const path of paths) {
			if (previousPath === path) throw new Error(`Duplicate path: "${path}"`);
			const endIndex = path.length;
			let sharedDirectoryDepth = 0;
			let unsharedSegmentStart = 0;
			if (previousPath != null) if (cachedDirPrefix.length > 0 && path.length > cachedDirPrefix.length && path.startsWith(cachedDirPrefix)) {
				sharedDirectoryDepth = cachedDirDepth;
				unsharedSegmentStart = cachedDirPrefix.length;
			} else {
				const compareLength = Math.min(endIndex, previousPath.length);
				for (let ci = 0; ci < compareLength; ci++) {
					const cc = path.charCodeAt(ci);
					if (cc !== previousPath.charCodeAt(ci)) break;
					if (cc === 47) {
						sharedDirectoryDepth++;
						unsharedSegmentStart = ci + 1;
					}
				}
			}
			stackTop = sharedDirectoryDepth;
			currentDepth = sharedDirectoryDepth;
			let segmentStart = unsharedSegmentStart;
			let slashPos = path.indexOf("/", segmentStart);
			while (slashPos >= 0) {
				const parentId$1 = dirStack[stackTop];
				if (parentId$1 === void 0) throw new Error("Directory stack underflow while building the path store");
				currentDepth++;
				const dirSeg = path.slice(segmentStart, slashPos);
				let dirNameId = idByValue.get(dirSeg);
				if (dirNameId === void 0) {
					dirNameId = valueById.length;
					idByValue.set(dirSeg, dirNameId);
					valueById.push(dirSeg);
				}
				const nodeId = nodes.length;
				nodes.push({
					depthAndFlags: createNodeDepthAndFlags(currentDepth, 0, PATH_STORE_NODE_KIND_DIRECTORY),
					nameId: dirNameId,
					parentId: parentId$1,
					subtreeNodeCount: 1,
					visibleSubtreeCount: 1
				});
				this.recordCreatedDirectoryPath(path.slice(0, slashPos));
				this.presortedDirectoryNodeIds.push(nodeId);
				stackTop++;
				dirStack[stackTop] = nodeId;
				segmentStart = slashPos + 1;
				slashPos = path.indexOf("/", segmentStart);
			}
			const parentId = dirStack[stackTop];
			if (parentId === void 0) throw new Error(`Unable to resolve file parent for "${path}"`);
			const fileSeg = path.slice(segmentStart);
			let fileNameId = idByValue.get(fileSeg);
			if (fileNameId === void 0) {
				fileNameId = valueById.length;
				idByValue.set(fileSeg, fileNameId);
				valueById.push(fileSeg);
			}
			nodes.push({
				depthAndFlags: createNodeDepthAndFlags(currentDepth + 1, 0),
				nameId: fileNameId,
				parentId,
				subtreeNodeCount: 1,
				visibleSubtreeCount: 1
			});
			if (segmentStart !== cachedDirPrefix.length) {
				cachedDirPrefix = path.substring(0, segmentStart);
				cachedDirDepth = currentDepth;
			}
			previousPath = path;
		}
		dirStack.length = stackTop + 1;
		if (previousPath != null) this.lastPreparedPath = parseInputPath(previousPath);
		this.hasDeferredDirectoryIndexes = true;
	}
	finish(options = {}) {
		const skipSubtreeCountPass = options.skipSubtreeCountPass === true;
		if (this.hasDeferredDirectoryIndexes) {
			withBenchmarkPhase(this.instrumentation, "store.builder.buildDirectoryIndexes", () => this.buildPresortedFinish(skipSubtreeCountPass));
			this.hasDeferredDirectoryIndexes = false;
		} else if (!skipSubtreeCountPass) withBenchmarkPhase(this.instrumentation, "store.builder.computeSubtreeCounts", () => this.computeSubtreeCounts(0));
		return {
			directories: this.directories,
			nodes: this.nodes,
			options: this.options,
			rootId: 0,
			segmentTable: this.segmentTable,
			presortedDirectoryNodeIds: this.presortedDirectoryNodeIds.length > 0 ? this.presortedDirectoryNodeIds : null
		};
	}
	didMatchAllInitialExpandedPaths() {
		return this.createdDirectoriesAllExpanded && this.initialExpandedPathSet != null && this.createdDirectoryCount === this.initialExpandedPathSet.size;
	}
	appendPreparedPath(preparedPath, validateOrder) {
		if (this.hasDeferredDirectoryIndexes) {
			this.buildDirectoryIndexes();
			this.hasDeferredDirectoryIndexes = false;
		}
		if (this.lastPreparedPath != null) {
			if (preparedPath.path === this.lastPreparedPath.path) throw new Error(`Duplicate path: "${preparedPath.path}"`);
			if (validateOrder) {
				if ((this.options.sort === "default" ? comparePreparedPathsWithCachedSortKeys(this.lastPreparedPath, preparedPath, this.segmentSortKeyCache) : compareWithSortOption(this.lastPreparedPath, preparedPath, this.options.sort)) > 0) throw new Error(`Builder input must be sorted before appendPaths(): "${preparedPath.path}"`);
			}
		}
		const previousPath = this.lastPreparedPath;
		const currentDirectoryDepth = getDirectoryDepth(preparedPath);
		const previousDirectoryDepth = previousPath == null ? 0 : getDirectoryDepth(previousPath);
		const sharedPrefixLength = previousPath == null ? 0 : computeSharedPrefixLength(previousPath.segments, preparedPath.segments);
		const sharedDirectoryDepth = Math.min(sharedPrefixLength, currentDirectoryDepth, previousDirectoryDepth);
		this.directoryStack.length = sharedDirectoryDepth + 1;
		for (let segmentIndex = sharedDirectoryDepth; segmentIndex < currentDirectoryDepth; segmentIndex++) {
			const parentId$1 = this.directoryStack[this.directoryStack.length - 1];
			if (parentId$1 === void 0) throw new Error("Directory stack underflow while building the path store");
			const childId = validateOrder ? this.getOrCreateDirectoryChild(parentId$1, preparedPath.segments[segmentIndex]) : this.createDirectoryChild(parentId$1, preparedPath.segments[segmentIndex]);
			this.directoryStack.push(childId);
		}
		if (preparedPath.isDirectory) {
			const directoryId = this.directoryStack[this.directoryStack.length - 1];
			if (directoryId === void 0) throw new Error(`Unable to resolve directory node for "${preparedPath.path}"`);
			this.promoteDirectoryToExplicit(directoryId, preparedPath.path);
			this.lastPreparedPath = preparedPath;
			return;
		}
		const parentId = this.directoryStack[this.directoryStack.length - 1];
		if (parentId === void 0) throw new Error(`Unable to resolve file parent for "${preparedPath.path}"`);
		if (validateOrder) this.createFileChild(parentId, preparedPath.basename, preparedPath.path);
		else this.createFileChildUnchecked(parentId, preparedPath.basename);
		this.lastPreparedPath = preparedPath;
	}
	recordCreatedDirectoryPath(path) {
		if (!this.createdDirectoriesAllExpanded || this.initialExpandedPathSet == null) return;
		this.createdDirectoryCount += 1;
		if (!this.initialExpandedPathSet.has(path)) this.createdDirectoriesAllExpanded = false;
	}
	createFileChild(parentId, basename, path) {
		const nameId = internSegment(this.segmentTable, basename);
		const parentIndex = this.getDirectoryIndex(parentId);
		const nameMap = parentIndex.childIdByNameId;
		if (nameMap != null) {
			if (nameMap.get(nameId) !== void 0) throw new Error(`Path collides with an existing entry: "${path}"`);
		}
		const parentNode = this.nodes[parentId];
		if (parentNode === void 0) throw new Error(`Unknown parent node ID: ${String(parentId)}`);
		const nodeId = this.nodes.length;
		this.nodes.push({
			depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0),
			nameId,
			parentId,
			subtreeNodeCount: 1,
			visibleSubtreeCount: 1
		});
		if (nameMap != null) nameMap.set(nameId, nodeId);
		appendChildReference(parentIndex, nodeId);
		return nodeId;
	}
	createFileChildUnchecked(parentId, basename) {
		const nameId = internSegment(this.segmentTable, basename);
		const parentIndex = this.getDirectoryIndex(parentId);
		const parentNode = this.nodes[parentId];
		if (parentNode === void 0) throw new Error(`Unknown parent node ID: ${String(parentId)}`);
		const nodeId = this.nodes.length;
		this.nodes.push({
			depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0),
			nameId,
			parentId,
			subtreeNodeCount: 1,
			visibleSubtreeCount: 1
		});
		if (parentIndex.childIdByNameId != null) parentIndex.childIdByNameId.set(nameId, nodeId);
		appendChildReference(parentIndex, nodeId);
		return nodeId;
	}
	getOrCreateDirectoryChild(parentId, segment) {
		const nameId = internSegment(this.segmentTable, segment);
		const parentIndex = this.getDirectoryIndex(parentId);
		if (parentIndex.childIdByNameId != null) {
			const existingChildId = parentIndex.childIdByNameId.get(nameId);
			if (existingChildId !== void 0) {
				const existingNode = this.nodes[existingChildId];
				if (existingNode != null && !isDirectoryNode(existingNode)) throw new Error(`Path collides with an existing file while creating directory "${segment}"`);
				return existingChildId;
			}
		}
		const parentNode = this.nodes[parentId];
		if (parentNode === void 0) throw new Error(`Unknown parent node ID: ${String(parentId)}`);
		const nodeId = this.nodes.length;
		this.nodes.push({
			depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0, PATH_STORE_NODE_KIND_DIRECTORY),
			nameId,
			parentId,
			subtreeNodeCount: 1,
			visibleSubtreeCount: 1
		});
		if (parentIndex.childIdByNameId != null) parentIndex.childIdByNameId.set(nameId, nodeId);
		appendChildReference(parentIndex, nodeId);
		this.directories.set(nodeId, createDirectoryChildIndex());
		return nodeId;
	}
	createDirectoryChild(parentId, segment) {
		const nameId = internSegment(this.segmentTable, segment);
		const parentIndex = this.getDirectoryIndex(parentId);
		const parentNode = this.nodes[parentId];
		if (parentNode === void 0) throw new Error(`Unknown parent node ID: ${String(parentId)}`);
		const nodeId = this.nodes.length;
		this.nodes.push({
			depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0, PATH_STORE_NODE_KIND_DIRECTORY),
			nameId,
			parentId,
			subtreeNodeCount: 1,
			visibleSubtreeCount: 1
		});
		if (parentIndex.childIdByNameId != null) parentIndex.childIdByNameId.set(nameId, nodeId);
		appendChildReference(parentIndex, nodeId);
		this.directories.set(nodeId, createDirectoryChildIndex());
		return nodeId;
	}
	promoteDirectoryToExplicit(directoryId, path) {
		const directoryNode = this.nodes[directoryId];
		if (directoryNode === void 0) throw new Error(`Unknown directory node ID: ${String(directoryId)}`);
		if (!isDirectoryNode(directoryNode)) throw new Error(`Path is not a directory: "${path}"`);
		if (hasNodeFlag(directoryNode, PATH_STORE_NODE_FLAG_EXPLICIT)) throw new Error(`Duplicate path: "${path}"`);
		addNodeFlag(directoryNode, PATH_STORE_NODE_FLAG_EXPLICIT);
	}
	getDirectoryIndex(directoryId) {
		const existingIndex = this.directories.get(directoryId);
		if (existingIndex !== void 0) return existingIndex;
		throw new Error(`Unknown directory child index for node ${String(directoryId)}`);
	}
	buildPresortedFinish(skipSubtreeCountPass) {
		const nodes = this.nodes;
		const directories = this.directories;
		directories.set(0, createPresortedDirectoryChildIndex());
		let cachedParentId = -1;
		let cachedParentIndex = null;
		for (let nodeId = 1; nodeId < nodes.length; nodeId++) {
			const node = nodes[nodeId];
			if (node == null) continue;
			if (isDirectoryNode(node)) {
				const dirIndex = createPresortedDirectoryChildIndex();
				directories.set(nodeId, dirIndex);
				cachedParentId = nodeId;
				cachedParentIndex = dirIndex;
			}
			let parentIndex;
			if (node.parentId === cachedParentId) parentIndex = cachedParentIndex;
			else {
				parentIndex = directories.get(node.parentId);
				cachedParentId = node.parentId;
				cachedParentIndex = parentIndex ?? null;
			}
			if (parentIndex != null) parentIndex.childIds.push(nodeId);
		}
		if (skipSubtreeCountPass) return;
		for (let nodeId = nodes.length - 1; nodeId >= 1; nodeId--) {
			const node = nodes[nodeId];
			if (node == null) continue;
			const parentNode = nodes[node.parentId];
			if (parentNode != null) {
				parentNode.subtreeNodeCount += node.subtreeNodeCount;
				parentNode.visibleSubtreeCount += node.visibleSubtreeCount;
			}
		}
	}
	buildDirectoryIndexes() {
		const nodes = this.nodes;
		for (let nodeId = 1; nodeId < nodes.length; nodeId++) {
			const node = nodes[nodeId];
			if (node == null) continue;
			if (isDirectoryNode(node)) this.directories.set(nodeId, createDirectoryChildIndex());
			const parentIndex = this.directories.get(node.parentId);
			if (parentIndex != null) {
				if (parentIndex.childIdByNameId != null) parentIndex.childIdByNameId.set(node.nameId, nodeId);
				appendChildReference(parentIndex, nodeId);
			}
		}
	}
	computeSubtreeCounts(nodeId) {
		const node = this.nodes[nodeId];
		if (node === void 0) throw new Error(`Unknown node ID: ${String(nodeId)}`);
		if (!isDirectoryNode(node)) {
			node.subtreeNodeCount = 1;
			node.visibleSubtreeCount = 1;
			return 1;
		}
		const directoryIndex = this.getDirectoryIndex(nodeId);
		let subtreeNodeCount = 1;
		for (const childId of directoryIndex.childIds) subtreeNodeCount += this.computeSubtreeCounts(childId);
		rebuildDirectoryChildAggregates(this.nodes, directoryIndex);
		node.subtreeNodeCount = subtreeNodeCount;
		node.visibleSubtreeCount = subtreeNodeCount;
		return subtreeNodeCount;
	}
};

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/state.js
function createPathStoreState(snapshot, initialExpansion = "closed", instrumentation = null) {
	const defaultExpansion = resolveInitialExpansion(initialExpansion);
	return {
		activeNodeCount: snapshot.nodes.length - 1,
		collapsedDirectoryIds: /* @__PURE__ */ new Set(),
		collapseNewDirectoriesByDefault: false,
		defaultExpansion,
		directoriesOpenByDefault: defaultExpansion === "open",
		hasCollapsedDirectoryOverrides: false,
		directoryLoadInfoById: /* @__PURE__ */ new Map(),
		expandedDirectoryIds: /* @__PURE__ */ new Set(),
		instrumentation,
		listeners: /* @__PURE__ */ new Map(),
		pathCacheByNodeId: new Map([[snapshot.rootId, {
			path: "",
			version: 0
		}]]),
		pathCacheVersion: 0,
		snapshot,
		transactionStack: []
	};
}
function createTransactionFrame() {
	return {
		affectedAncestorIds: /* @__PURE__ */ new Set(),
		affectedNodeIds: /* @__PURE__ */ new Set(),
		events: []
	};
}
function resolveInitialExpansion(initialExpansion) {
	if (typeof initialExpansion !== "number") return initialExpansion;
	if (!Number.isInteger(initialExpansion) || initialExpansion < 0) throw new Error(`initialExpansion must be "open", "closed", or a non-negative integer depth. Received: ${String(initialExpansion)}`);
	return initialExpansion;
}
function isDirectoryExpandedByDefault(state, node) {
	if (hasNodeFlag(node, PATH_STORE_NODE_FLAG_ROOT)) return true;
	if (state.defaultExpansion === "open") return true;
	if (state.defaultExpansion === "closed") return false;
	return getNodeDepth(node) <= state.defaultExpansion;
}
function isDirectoryExpanded(state, nodeId, node = state.snapshot.nodes[nodeId]) {
	if (node == null || !isDirectoryNode(node)) return false;
	if (state.directoriesOpenByDefault && !state.hasCollapsedDirectoryOverrides) return true;
	if (state.collapsedDirectoryIds.has(nodeId)) return false;
	if (state.expandedDirectoryIds.has(nodeId)) return true;
	return isDirectoryExpandedByDefault(state, node);
}
function setDirectoryExpanded(state, nodeId, expanded, node = state.snapshot.nodes[nodeId]) {
	if (node == null || !isDirectoryNode(node)) return;
	const expandedByDefault = isDirectoryExpandedByDefault(state, node);
	if (expanded) {
		if (expandedByDefault) {
			state.collapsedDirectoryIds.delete(nodeId);
			state.hasCollapsedDirectoryOverrides = state.collapsedDirectoryIds.size > 0;
			return;
		}
		state.expandedDirectoryIds.add(nodeId);
		return;
	}
	if (expandedByDefault) {
		state.collapsedDirectoryIds.add(nodeId);
		state.hasCollapsedDirectoryOverrides = true;
		return;
	}
	state.expandedDirectoryIds.delete(nodeId);
}
function getOrCreateDirectoryLoadInfo(state, nodeId) {
	const existingInfo = state.directoryLoadInfoById.get(nodeId);
	if (existingInfo != null) return existingInfo;
	const nextInfo = {
		activeAttemptId: null,
		errorMessage: null,
		nextAttemptId: 1,
		state: "loaded"
	};
	state.directoryLoadInfoById.set(nodeId, nextInfo);
	return nextInfo;
}
function getDirectoryLoadState(state, nodeId) {
	return state.directoryLoadInfoById.get(nodeId)?.state ?? "loaded";
}
function beginDirectoryLoad(state, nodeId) {
	const loadInfo = getOrCreateDirectoryLoadInfo(state, nodeId);
	if (loadInfo.state === "loading" && loadInfo.activeAttemptId != null) return {
		attemptId: loadInfo.activeAttemptId,
		nodeId,
		reused: true
	};
	const attemptId = loadInfo.nextAttemptId;
	loadInfo.activeAttemptId = attemptId;
	loadInfo.errorMessage = null;
	loadInfo.nextAttemptId += 1;
	loadInfo.state = "loading";
	return {
		attemptId,
		nodeId,
		reused: false
	};
}
function markDirectoryUnloadedState(state, nodeId) {
	const loadInfo = getOrCreateDirectoryLoadInfo(state, nodeId);
	loadInfo.activeAttemptId = null;
	loadInfo.errorMessage = null;
	loadInfo.state = "unloaded";
}
function completeDirectoryLoad(state, nodeId, attemptId) {
	const loadInfo = state.directoryLoadInfoById.get(nodeId);
	if (loadInfo == null || loadInfo.activeAttemptId !== attemptId) return false;
	loadInfo.activeAttemptId = null;
	loadInfo.errorMessage = null;
	loadInfo.state = "loaded";
	return true;
}
function isDirectoryLoadAttemptCurrent(state, nodeId, attemptId) {
	return state.directoryLoadInfoById.get(nodeId)?.activeAttemptId === attemptId;
}
function failDirectoryLoad(state, nodeId, attemptId, errorMessage) {
	const loadInfo = state.directoryLoadInfoById.get(nodeId);
	if (loadInfo == null || loadInfo.activeAttemptId !== attemptId) return false;
	loadInfo.activeAttemptId = null;
	loadInfo.errorMessage = errorMessage ?? null;
	loadInfo.state = "error";
	return true;
}
function clearDirectoryLoadInfo(state, nodeId) {
	state.directoryLoadInfoById.delete(nodeId);
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/events.js
function subscribe(state, type, handler) {
	const rawHandler = handler;
	const existingListeners = state.listeners.get(type);
	if (existingListeners != null) existingListeners.add(rawHandler);
	else state.listeners.set(type, new Set([rawHandler]));
	return () => {
		const listeners = state.listeners.get(type);
		if (listeners == null) return;
		listeners.delete(rawHandler);
		if (listeners.size === 0) state.listeners.delete(type);
	};
}
function createAddEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: true,
		operation: "add",
		path: args.path,
		projectionChanged: args.projectionChanged,
		visibleCountDelta: null
	};
}
function createRemoveEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: true,
		operation: "remove",
		path: args.path,
		projectionChanged: args.projectionChanged,
		recursive: args.recursive,
		visibleCountDelta: null
	};
}
function createMoveEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: true,
		from: args.from,
		operation: "move",
		projectionChanged: args.projectionChanged,
		to: args.to,
		visibleCountDelta: null
	};
}
function createExpandEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: false,
		operation: "expand",
		path: args.path,
		projectionChanged: true,
		visibleCountDelta: null
	};
}
function createCollapseEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: false,
		operation: "collapse",
		path: args.path,
		projectionChanged: true,
		visibleCountDelta: null
	};
}
function createMarkDirectoryUnloadedEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		canonicalChanged: false,
		operation: "mark-directory-unloaded",
		path: args.path,
		projectionChanged: args.projectionChanged,
		visibleCountDelta: null
	};
}
function createBeginChildLoadEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		attemptId: args.attemptId,
		canonicalChanged: false,
		operation: "begin-child-load",
		path: args.path,
		projectionChanged: args.projectionChanged,
		reused: args.reused,
		visibleCountDelta: null
	};
}
function createApplyChildPatchEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		attemptId: args.attemptId,
		canonicalChanged: args.childEvents.some((event) => event.canonicalChanged),
		childEvents: args.childEvents,
		operation: "apply-child-patch",
		path: args.path,
		projectionChanged: args.projectionChanged,
		visibleCountDelta: null
	};
}
function createCompleteChildLoadEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		attemptId: args.attemptId,
		canonicalChanged: false,
		operation: "complete-child-load",
		path: args.path,
		projectionChanged: args.projectionChanged,
		stale: args.stale,
		visibleCountDelta: null
	};
}
function createFailChildLoadEvent(args) {
	return {
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		attemptId: args.attemptId,
		canonicalChanged: false,
		errorMessage: args.errorMessage,
		operation: "fail-child-load",
		path: args.path,
		projectionChanged: args.projectionChanged,
		stale: args.stale,
		visibleCountDelta: null
	};
}
function createCleanupEvent(args) {
	return {
		activeNodeCountAfter: args.activeNodeCountAfter,
		activeNodeCountBefore: args.activeNodeCountBefore,
		affectedAncestorIds: args.affectedAncestorIds ?? [],
		affectedNodeIds: args.affectedNodeIds ?? [],
		cachedPathEntryCountAfter: args.cachedPathEntryCountAfter,
		cachedPathEntryCountBefore: args.cachedPathEntryCountBefore,
		canonicalChanged: false,
		idsPreserved: args.idsPreserved,
		loadInfoEntryCountAfter: args.loadInfoEntryCountAfter,
		loadInfoEntryCountBefore: args.loadInfoEntryCountBefore,
		mode: args.mode,
		operation: "cleanup",
		projectionChanged: args.projectionChanged,
		reclaimedCachedPathEntryCount: args.reclaimedCachedPathEntryCount,
		reclaimedLoadInfoEntryCount: args.reclaimedLoadInfoEntryCount,
		reclaimedNodeSlotCount: args.reclaimedNodeSlotCount,
		reclaimedSegmentCount: args.reclaimedSegmentCount,
		segmentCountAfter: args.segmentCountAfter,
		segmentCountBefore: args.segmentCountBefore,
		totalNodeSlotCountAfter: args.totalNodeSlotCountAfter,
		totalNodeSlotCountBefore: args.totalNodeSlotCountBefore,
		visibleCountDelta: null
	};
}
function finalizeEvent(state, previousVisibleCount, event) {
	return {
		...event,
		visibleCountDelta: getCurrentVisibleCount(state) - previousVisibleCount
	};
}
function batchEvents(state, run) {
	const previousVisibleCount = getCurrentVisibleCount(state);
	const frame = createTransactionFrame();
	state.transactionStack.push(frame);
	try {
		run();
	} catch (error) {
		finishTransaction(state, frame, false);
		throw error;
	}
	finishTransaction(state, frame, true, getCurrentVisibleCount(state) - previousVisibleCount);
}
function recordEvent(state, event) {
	const instrumentation = state.instrumentation;
	if (instrumentation == null) {
		recordEventNow(state, event);
		return;
	}
	withBenchmarkPhase(instrumentation, "store.events.record", () => recordEventNow(state, event));
}
function recordEventNow(state, event) {
	const currentFrame = state.transactionStack[state.transactionStack.length - 1] ?? null;
	if (currentFrame == null) {
		emitEvent(state, event);
		return;
	}
	currentFrame.events.push(event);
	mergeEventMetadataIntoFrame(currentFrame, event);
}
function finishTransaction(state, frame, emit, visibleCountDelta = null) {
	if (state.transactionStack.pop() !== frame) throw new Error("Transaction stack underflow");
	if (!emit) return;
	const parentFrame = state.transactionStack[state.transactionStack.length - 1] ?? null;
	if (parentFrame != null) {
		const instrumentation$1 = state.instrumentation;
		if (instrumentation$1 == null) mergeBatchFrameIntoParent(parentFrame, frame);
		else withBenchmarkPhase(instrumentation$1, "store.events.batch.merge", () => mergeBatchFrameIntoParent(parentFrame, frame));
		return;
	}
	const batchEvent = createBatchEvent(frame, visibleCountDelta);
	const instrumentation = state.instrumentation;
	if (instrumentation == null) {
		emitEvent(state, batchEvent);
		return;
	}
	withBenchmarkPhase(instrumentation, "store.events.batch.commit", () => emitEvent(state, batchEvent));
}
function createBatchEvent(frame, visibleCountDelta) {
	return {
		affectedAncestorIds: [...frame.affectedAncestorIds],
		affectedNodeIds: [...frame.affectedNodeIds],
		canonicalChanged: frame.events.some((event) => event.canonicalChanged),
		events: [...frame.events],
		operation: "batch",
		projectionChanged: frame.events.some((event) => event.projectionChanged),
		visibleCountDelta
	};
}
function mergeFrameMetadata(target, source) {
	for (const nodeId of source.affectedAncestorIds) target.affectedAncestorIds.add(nodeId);
	for (const nodeId of source.affectedNodeIds) target.affectedNodeIds.add(nodeId);
}
function mergeBatchFrameIntoParent(parentFrame, frame) {
	for (const event of frame.events) parentFrame.events.push(event);
	mergeFrameMetadata(parentFrame, frame);
}
function mergeEventMetadataIntoFrame(frame, event) {
	for (const nodeId of event.affectedNodeIds) frame.affectedNodeIds.add(nodeId);
	for (const nodeId of event.affectedAncestorIds) frame.affectedAncestorIds.add(nodeId);
}
function emitEvent(state, event) {
	const instrumentation = state.instrumentation;
	if (instrumentation == null) {
		emitEventNow(state, event);
		return;
	}
	withBenchmarkPhase(instrumentation, "store.events.emit", () => emitEventNow(state, event));
}
function emitEventNow(state, event) {
	state.listeners.get(event.operation)?.forEach((handler) => handler(event));
	state.listeners.get("*")?.forEach((handler) => handler(event));
}
function getCurrentVisibleCount(state) {
	return state.snapshot.nodes[state.snapshot.rootId]?.visibleSubtreeCount ?? 0;
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/flatten.js
function getFlattenedChildDirectoryId(state, directoryNodeId) {
	if (state.snapshot.options.flattenEmptyDirectories !== true) return null;
	const directoryNode = state.snapshot.nodes[directoryNodeId];
	if (directoryNode == null || !isDirectoryNode(directoryNode) || hasNodeFlag(directoryNode, PATH_STORE_NODE_FLAG_ROOT)) return null;
	const directoryIndex = state.snapshot.directories.get(directoryNodeId);
	if (directoryIndex == null || directoryIndex.childIds.length !== 1) return null;
	const childId = directoryIndex.childIds[0];
	if (childId == null) return null;
	const childNode = state.snapshot.nodes[childId];
	if (childNode == null || !isDirectoryNode(childNode)) return null;
	return childId;
}
function getFlattenedTerminalDirectoryId(state, directoryNodeId) {
	let currentDirectoryId = directoryNodeId;
	while (true) {
		const nextDirectoryId = getFlattenedChildDirectoryId(state, currentDirectoryId);
		if (nextDirectoryId == null) return currentDirectoryId;
		currentDirectoryId = nextDirectoryId;
	}
}
function collectFlattenedDirectoryChainIds(state, directoryNodeId) {
	const chainIds = [directoryNodeId];
	let currentDirectoryId = directoryNodeId;
	while (true) {
		const nextDirectoryId = getFlattenedChildDirectoryId(state, currentDirectoryId);
		if (nextDirectoryId == null) return chainIds;
		chainIds.push(nextDirectoryId);
		currentDirectoryId = nextDirectoryId;
	}
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/canonical.js
function listPaths(state, path) {
	const nodeId = path == null ? state.snapshot.rootId : findNodeId(state, path);
	if (nodeId == null) return [];
	return collectCanonicalEntries(state, nodeId);
}
function addPath(state, path) {
	const preparedPath = parseInputPath(path);
	const parentSegments = preparedPath.isDirectory ? preparedPath.segments : preparedPath.segments.slice(0, -1);
	const previousProjectionSignature = getCollapsedProjectionSignature(state, findDeepestExistingDirectoryId(state, parentSegments));
	const { createdNodeIds, directoryId } = ensureDirectoryChain(state, parentSegments);
	const affectedNodeIds = new Set(createdNodeIds);
	let addedNodeId = directoryId;
	if (preparedPath.isDirectory) {
		const directoryNode = requireNode(state, directoryId);
		if (hasNodeFlag(directoryNode, PATH_STORE_NODE_FLAG_EXPLICIT)) throw new Error(`Path already exists: "${path}"`);
		addNodeFlag(directoryNode, PATH_STORE_NODE_FLAG_EXPLICIT);
		state.pathCacheByNodeId.set(directoryId, {
			path,
			version: state.pathCacheVersion
		});
		affectedNodeIds.add(directoryId);
	} else {
		addedNodeId = createFileNode(state, directoryId, preparedPath.basename);
		affectedNodeIds.add(addedNodeId);
	}
	recomputeCountsUpwardFrom(state, directoryId);
	const nextProjectionSignature = getCollapsedProjectionSignature(state, directoryId);
	return createAddEvent({
		affectedAncestorIds: collectAncestorIds(state, addedNodeId),
		affectedNodeIds: [...affectedNodeIds],
		path,
		projectionChanged: didProjectionChange(previousProjectionSignature, nextProjectionSignature)
	});
}
function removePath(state, path, options) {
	const nodeId = findNodeId(state, path);
	if (nodeId == null) throw new Error(`Path does not exist: "${path}"`);
	const node = requireNode(state, nodeId);
	if (hasNodeFlag(node, PATH_STORE_NODE_FLAG_ROOT)) throw new Error("The root node cannot be removed");
	if (isDirectoryNode(node) && getDirectoryIndex(state, nodeId).childIds.length > 0 && options.recursive !== true) throw new Error(`Cannot remove a non-empty directory without recursive: "${path}"`);
	const parentId = node.parentId;
	const previousProjectionSignature = getCollapsedProjectionSignature(state, parentId);
	const removedNodeIds = removeSubtree(state, nodeId);
	removeChildReference(state, parentId, nodeId, node.nameId);
	promoteEmptyAncestorsToExplicit(state, parentId);
	recomputeCountsUpwardFrom(state, parentId);
	const nextProjectionSignature = getCollapsedProjectionSignature(state, parentId);
	return createRemoveEvent({
		affectedAncestorIds: collectAncestorIds(state, parentId),
		affectedNodeIds: removedNodeIds,
		path,
		projectionChanged: didProjectionChange(previousProjectionSignature, nextProjectionSignature),
		recursive: options.recursive === true
	});
}
function movePath(state, fromPath, toPath, options) {
	const sourceNodeId = findNodeId(state, fromPath);
	if (sourceNodeId == null) throw new Error(`Source path does not exist: "${fromPath}"`);
	const sourceNode = requireNode(state, sourceNodeId);
	if (hasNodeFlag(sourceNode, PATH_STORE_NODE_FLAG_ROOT)) throw new Error("The root node cannot be moved");
	const collision = options.collision ?? "error";
	const moveTarget = resolveMoveTarget(state, sourceNodeId, toPath);
	const previousSourceProjectionSignature = getCollapsedProjectionSignature(state, sourceNode.parentId);
	const previousTargetProjectionSignature = getCollapsedProjectionSignature(state, moveTarget.parentId);
	const sourceName = getSegmentValue(state.snapshot.segmentTable, sourceNode.nameId);
	const targetNameId = internSegment(state.snapshot.segmentTable, moveTarget.basename);
	if (moveTarget.parentId === sourceNode.parentId && sourceName === moveTarget.basename) return null;
	if (isDirectoryNode(sourceNode) && isAncestor(state, sourceNodeId, moveTarget.parentId)) throw new Error("Cannot move a directory into one of its descendants");
	const siblingCollisionId = ensureChildIdByNameId(state.snapshot.nodes, getDirectoryIndex(state, moveTarget.parentId)).get(targetNameId);
	const collisionNodeId = moveTarget.existingNodeId ?? siblingCollisionId ?? null;
	if (collisionNodeId != null && collisionNodeId !== sourceNodeId) {
		if (handleMoveCollision(state, collisionNodeId, collision, getNodeKind(sourceNode)) === "skip") return null;
	}
	const previousParentId = sourceNode.parentId;
	removeChildReference(state, previousParentId, sourceNodeId, sourceNode.nameId);
	sourceNode.parentId = moveTarget.parentId;
	sourceNode.nameId = targetNameId;
	state.pathCacheByNodeId.delete(sourceNodeId);
	recomputeDepths(state, sourceNodeId);
	insertChildReference(state, moveTarget.parentId, sourceNodeId);
	promoteEmptyAncestorsToExplicit(state, previousParentId);
	state.pathCacheVersion++;
	recomputeCountsUpwardFrom(state, previousParentId);
	if (moveTarget.parentId !== previousParentId) recomputeCountsUpwardFrom(state, moveTarget.parentId);
	const nextSourceProjectionSignature = getCollapsedProjectionSignature(state, previousParentId);
	const nextTargetProjectionSignature = getCollapsedProjectionSignature(state, moveTarget.parentId);
	return createMoveEvent({
		affectedAncestorIds: [...new Set([...collectAncestorIds(state, previousParentId), ...collectAncestorIds(state, moveTarget.parentId)])],
		affectedNodeIds: [sourceNodeId],
		from: fromPath,
		projectionChanged: didAnyProjectionChange([previousSourceProjectionSignature, previousTargetProjectionSignature], [nextSourceProjectionSignature, nextTargetProjectionSignature]),
		to: materializeNodePath(state, sourceNodeId)
	});
}
function getCachedNodePath(state, nodeId) {
	const cachedEntry = state.pathCacheByNodeId.get(nodeId);
	return cachedEntry != null && cachedEntry.version === state.pathCacheVersion ? cachedEntry.path : null;
}
function setCachedNodePath(state, nodeId, path) {
	state.pathCacheByNodeId.set(nodeId, {
		path,
		version: state.pathCacheVersion
	});
	return path;
}
function materializeNodePath(state, nodeId) {
	const node = requireNode(state, nodeId);
	const cachedPath = getCachedNodePath(state, nodeId);
	if (cachedPath != null) return cachedPath;
	if (hasNodeFlag(node, PATH_STORE_NODE_FLAG_ROOT)) return setCachedNodePath(state, nodeId, "");
	const parentPath = materializeNodePath(state, node.parentId);
	const nodeName = getSegmentValue(state.snapshot.segmentTable, node.nameId);
	const path = parentPath.length === 0 ? nodeName : `${parentPath}${nodeName}`;
	return setCachedNodePath(state, nodeId, isDirectoryNode(node) ? `${path}/` : path);
}
function recomputeCountsUpwardFrom(state, startNodeId) {
	const instrumentation = state.instrumentation;
	if (instrumentation == null) {
		recomputeCountsUpwardFromNow(state, startNodeId);
		return;
	}
	withBenchmarkPhase(instrumentation, "store.recomputeCountsUpwardFrom", () => recomputeCountsUpwardFromNow(state, startNodeId));
}
function recomputeCountsRecursive(state, nodeId) {
	const stack = [[nodeId, 0]];
	const { nodes, directories } = state.snapshot;
	while (stack.length > 0) {
		const frame = stack[stack.length - 1];
		const nid = frame[0];
		const node = nodes[nid];
		if (node == null || !isDirectoryNode(node)) {
			recomputeNodeCounts(state, nid, node, true);
			stack.pop();
			continue;
		}
		const dirIndex = directories.get(nid);
		if (dirIndex == null || frame[1] >= dirIndex.childIds.length) {
			recomputeNodeCounts(state, nid, node, true);
			stack.pop();
			continue;
		}
		const childId = dirIndex.childIds[frame[1]++];
		stack.push([childId, 0]);
	}
}
function collectAncestorIds(state, nodeId) {
	const ancestorIds = [];
	let currentNodeId = nodeId;
	while (currentNodeId != null) {
		const currentNode = requireNode(state, currentNodeId);
		ancestorIds.push(currentNodeId);
		if (currentNodeId === state.snapshot.rootId) break;
		currentNodeId = currentNode.parentId;
	}
	return ancestorIds;
}
function findNodeId(state, path) {
	if (path.length === 0) return state.snapshot.rootId;
	const lookupPath = parseLookupPath(path);
	return findNodeIdBySegments(state, lookupPath.segments, lookupPath.requiresDirectory);
}
function findNodeIdBySegments(state, segments, requireDirectory) {
	let currentNodeId = state.snapshot.rootId;
	for (const segment of segments) {
		const segmentId = state.snapshot.segmentTable.idByValue.get(segment);
		if (segmentId === void 0) return null;
		const currentIndex = getDirectoryIndex(state, currentNodeId);
		const nextNodeId = ensureChildIdByNameId(state.snapshot.nodes, currentIndex).get(segmentId);
		if (nextNodeId === void 0) return null;
		currentNodeId = nextNodeId;
	}
	const currentNode = requireNode(state, currentNodeId);
	if (requireDirectory && !isDirectoryNode(currentNode)) return null;
	return currentNodeId;
}
function getDirectoryIndex(state, directoryId) {
	const directoryIndex = state.snapshot.directories.get(directoryId);
	if (directoryIndex === void 0) throw new Error(`Unknown directory child index for node ${String(directoryId)}`);
	return directoryIndex;
}
function requireNode(state, nodeId) {
	const node = state.snapshot.nodes[nodeId];
	if (node === void 0 || hasNodeFlag(node, PATH_STORE_NODE_FLAG_REMOVED)) throw new Error(`Unknown node ID: ${String(nodeId)}`);
	return node;
}
function collectCanonicalEntries(state, nodeId) {
	const rootNode = state.snapshot.nodes[nodeId];
	if (rootNode === void 0 || hasNodeFlag(rootNode, PATH_STORE_NODE_FLAG_REMOVED)) return [];
	if (!isDirectoryNode(rootNode)) return [materializeNodePath(state, nodeId)];
	if (getDirectoryIndex(state, nodeId).childIds.length === 0) return hasNodeFlag(rootNode, PATH_STORE_NODE_FLAG_EXPLICIT) && !hasNodeFlag(rootNode, PATH_STORE_NODE_FLAG_ROOT) ? [materializeNodePath(state, nodeId)] : [];
	const entries = [];
	const stack = [{
		childIndex: 0,
		nodeId
	}];
	while (stack.length > 0) {
		const frame = stack[stack.length - 1];
		if (frame == null) break;
		const currentNode = state.snapshot.nodes[frame.nodeId];
		if (currentNode === void 0 || hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_REMOVED)) {
			stack.pop();
			continue;
		}
		if (!isDirectoryNode(currentNode)) {
			entries.push(materializeNodePath(state, frame.nodeId));
			stack.pop();
			continue;
		}
		const currentIndex = getDirectoryIndex(state, frame.nodeId);
		if (currentIndex.childIds.length === 0) {
			if (hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_EXPLICIT) && !hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_ROOT)) entries.push(materializeNodePath(state, frame.nodeId));
			stack.pop();
			continue;
		}
		const nextChildId = currentIndex.childIds[frame.childIndex];
		if (nextChildId == null) {
			stack.pop();
			continue;
		}
		frame.childIndex++;
		stack.push({
			childIndex: 0,
			nodeId: nextChildId
		});
	}
	return entries;
}
function ensureDirectoryChain(state, directorySegments) {
	const createdNodeIds = [];
	let currentDirectoryId = state.snapshot.rootId;
	for (const segment of directorySegments) {
		const segmentId = internSegment(state.snapshot.segmentTable, segment);
		const currentIndex = getDirectoryIndex(state, currentDirectoryId);
		const existingChildId = ensureChildIdByNameId(state.snapshot.nodes, currentIndex).get(segmentId);
		if (existingChildId !== void 0) {
			if (!isDirectoryNode(requireNode(state, existingChildId))) throw new Error(`Cannot create a directory that collides with an existing file: "${segment}"`);
			currentDirectoryId = existingChildId;
			continue;
		}
		currentDirectoryId = createDirectoryNode(state, currentDirectoryId, segmentId);
		createdNodeIds.push(currentDirectoryId);
	}
	return {
		createdNodeIds,
		directoryId: currentDirectoryId
	};
}
function createDirectoryNode(state, parentId, nameId) {
	const parentNode = requireNode(state, parentId);
	const nodeId = state.snapshot.nodes.length;
	state.snapshot.nodes.push({
		depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0, PATH_STORE_NODE_KIND_DIRECTORY),
		nameId,
		parentId,
		subtreeNodeCount: 1,
		visibleSubtreeCount: 1
	});
	state.snapshot.directories.set(nodeId, createDirectoryChildIndex());
	insertChildReference(state, parentId, nodeId);
	if (state.collapseNewDirectoriesByDefault) {
		state.collapsedDirectoryIds.add(nodeId);
		state.hasCollapsedDirectoryOverrides = true;
	}
	state.activeNodeCount++;
	return nodeId;
}
function createFileNode(state, parentId, basename) {
	const nameId = internSegment(state.snapshot.segmentTable, basename);
	const parentIndex = getDirectoryIndex(state, parentId);
	if (ensureChildIdByNameId(state.snapshot.nodes, parentIndex).has(nameId)) throw new Error(`Path already exists: "${buildPathPreview(state, parentId, basename)}"`);
	const parentNode = requireNode(state, parentId);
	const nodeId = state.snapshot.nodes.length;
	state.snapshot.nodes.push({
		depthAndFlags: createNodeDepthAndFlags(getNodeDepth(parentNode) + 1, 0),
		nameId,
		parentId,
		subtreeNodeCount: 1,
		visibleSubtreeCount: 1
	});
	insertChildReference(state, parentId, nodeId);
	state.activeNodeCount++;
	return nodeId;
}
function findChildInsertIndex(state, parentIndex, childId) {
	let low = 0;
	let high = parentIndex.childIds.length;
	while (low < high) {
		const middle = low + high >>> 1;
		const existingChildId = parentIndex.childIds[middle];
		if (existingChildId == null) {
			high = middle;
			continue;
		}
		if (compareSiblingNodes(state, childId, existingChildId) < 0) high = middle;
		else low = middle + 1;
	}
	return low;
}
function insertChildReference(state, parentId, childId) {
	const parentIndex = getDirectoryIndex(state, parentId);
	const childNode = requireNode(state, childId);
	ensureChildIdByNameId(state.snapshot.nodes, parentIndex).set(childNode.nameId, childId);
	applyChildAggregateDelta(parentIndex, childId, childNode.subtreeNodeCount, childNode.visibleSubtreeCount);
	const insertIndex = findChildInsertIndex(state, parentIndex, childId);
	parentIndex.childIds.splice(insertIndex, 0, childId);
	updateChildPositionsFrom(parentIndex, insertIndex);
	rebuildVisibleChildChunks(state.snapshot.nodes, parentIndex);
}
function removeChildReference(state, parentId, childId, childNameId) {
	const parentIndex = getDirectoryIndex(state, parentId);
	const positions = ensureChildPositions(parentIndex);
	const childIndex = positions.get(childId) ?? -1;
	ensureChildIdByNameId(state.snapshot.nodes, parentIndex).delete(childNameId);
	positions.delete(childId);
	const childNode = state.snapshot.nodes[childId];
	if (childNode != null) applyChildAggregateDelta(parentIndex, childId, -childNode.subtreeNodeCount, -childNode.visibleSubtreeCount);
	if (childIndex >= 0) {
		parentIndex.childIds.splice(childIndex, 1);
		updateChildPositionsFrom(parentIndex, childIndex);
		rebuildVisibleChildChunks(state.snapshot.nodes, parentIndex);
	}
}
function compareSiblingNodes(state, leftId, rightId) {
	const sortOption = state.snapshot.options.sort;
	if (sortOption === "default") return compareSiblingNodesDefault(state, leftId, rightId);
	return sortOption(createCompareEntry(state, leftId), createCompareEntry(state, rightId));
}
function compareSiblingNodesDefault(state, leftId, rightId) {
	const leftNode = requireNode(state, leftId);
	const rightNode = requireNode(state, rightId);
	const leftIsDirectory = isDirectoryNode(leftNode);
	if (leftIsDirectory !== isDirectoryNode(rightNode)) return leftIsDirectory ? -1 : 1;
	const comparison = compareSegmentSortKeys(getSegmentSortKey(state.snapshot.segmentTable, leftNode.nameId), getSegmentSortKey(state.snapshot.segmentTable, rightNode.nameId));
	if (comparison !== 0) return comparison;
	const leftName = getSegmentValue(state.snapshot.segmentTable, leftNode.nameId);
	const rightName = getSegmentValue(state.snapshot.segmentTable, rightNode.nameId);
	if (leftName !== rightName) return leftName < rightName ? -1 : 1;
	return leftId < rightId ? -1 : 1;
}
function createCompareEntry(state, nodeId) {
	const node = requireNode(state, nodeId);
	const path = materializeNodePath(state, nodeId);
	const isDirectory = isDirectoryNode(node);
	const normalizedPath = isDirectory ? path.slice(0, -1) : path;
	return {
		basename: getSegmentValue(state.snapshot.segmentTable, node.nameId),
		depth: getNodeDepth(node),
		isDirectory,
		path,
		segments: normalizedPath.length === 0 ? [] : normalizedPath.split("/")
	};
}
function resolveMoveTarget(state, sourceNodeId, toPath) {
	const sourceNode = requireNode(state, sourceNodeId);
	const existingDestinationId = findNodeId(state, toPath);
	if (existingDestinationId != null) {
		const existingDestination = requireNode(state, existingDestinationId);
		if (isDirectoryNode(existingDestination)) return {
			basename: getSegmentValue(state.snapshot.segmentTable, sourceNode.nameId),
			existingNodeId: null,
			parentId: existingDestinationId
		};
		const destinationSegments = parseLookupPath(toPath).segments;
		return {
			basename: destinationSegments[destinationSegments.length - 1] ?? "",
			existingNodeId: existingDestinationId,
			parentId: existingDestination.parentId
		};
	}
	const destinationLookup = parseLookupPath(toPath);
	const basename = destinationLookup.segments[destinationLookup.segments.length - 1] ?? "";
	const parentSegments = destinationLookup.segments.slice(0, -1);
	const parentId = parentSegments.length === 0 ? state.snapshot.rootId : findNodeIdBySegments(state, parentSegments, true);
	if (parentId == null) throw new Error(`Destination parent does not exist: "${toPath}"`);
	return {
		basename,
		existingNodeId: null,
		parentId
	};
}
function handleMoveCollision(state, collisionNodeId, strategy, sourceKind) {
	if (strategy === "skip") return "skip";
	if (strategy === "error") throw new Error(`Destination already exists: "${materializeNodePath(state, collisionNodeId)}"`);
	const collisionNode = requireNode(state, collisionNodeId);
	if (getNodeKind(collisionNode) !== sourceKind) throw new Error("replace collision requires the same source and destination kinds");
	if (isDirectoryNode(collisionNode) && getDirectoryIndex(state, collisionNodeId).childIds.length > 0) throw new Error("replace collision does not support non-empty directories");
	const collisionParentId = collisionNode.parentId;
	const collisionNameId = collisionNode.nameId;
	removeSubtree(state, collisionNodeId);
	removeChildReference(state, collisionParentId, collisionNodeId, collisionNameId);
	promoteEmptyAncestorsToExplicit(state, collisionParentId);
	recomputeCountsUpwardFrom(state, collisionParentId);
	return "handled";
}
function removeSubtree(state, nodeId) {
	const removedNodeIds = [];
	const stack = [{
		nodeId,
		visitedChildren: false
	}];
	while (stack.length > 0) {
		const frame = stack.pop();
		if (frame == null) break;
		const node = requireNode(state, frame.nodeId);
		if (frame.visitedChildren || !isDirectoryNode(node)) {
			if (isDirectoryNode(node)) state.snapshot.directories.delete(frame.nodeId);
			addNodeFlag(node, PATH_STORE_NODE_FLAG_REMOVED);
			state.pathCacheByNodeId.delete(frame.nodeId);
			if (state.collapsedDirectoryIds.delete(frame.nodeId)) state.hasCollapsedDirectoryOverrides = state.collapsedDirectoryIds.size > 0;
			state.expandedDirectoryIds.delete(frame.nodeId);
			clearDirectoryLoadInfo(state, frame.nodeId);
			state.activeNodeCount--;
			removedNodeIds.push(frame.nodeId);
			continue;
		}
		stack.push({
			nodeId: frame.nodeId,
			visitedChildren: true
		});
		const directoryIndex = getDirectoryIndex(state, frame.nodeId);
		for (let childIndex = directoryIndex.childIds.length - 1; childIndex >= 0; childIndex--) {
			const childId = directoryIndex.childIds[childIndex];
			if (childId != null) stack.push({
				nodeId: childId,
				visitedChildren: false
			});
		}
	}
	return removedNodeIds;
}
function promoteEmptyAncestorsToExplicit(state, startDirectoryId) {
	let currentDirectoryId = startDirectoryId;
	while (currentDirectoryId != null) {
		const currentNode = requireNode(state, currentDirectoryId);
		if (!isDirectoryNode(currentNode) || hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_ROOT)) return;
		if (getDirectoryIndex(state, currentDirectoryId).childIds.length > 0) return;
		addNodeFlag(currentNode, PATH_STORE_NODE_FLAG_EXPLICIT);
		currentDirectoryId = currentNode.parentId === currentDirectoryId ? null : currentNode.parentId;
	}
}
function findDeepestExistingDirectoryId(state, segments) {
	let currentDirectoryId = state.snapshot.rootId;
	for (const segment of segments) {
		const segmentId = state.snapshot.segmentTable.idByValue.get(segment);
		if (segmentId == null) break;
		const nextNodeId = ensureChildIdByNameId(state.snapshot.nodes, getDirectoryIndex(state, currentDirectoryId)).get(segmentId);
		if (nextNodeId == null) break;
		if (!isDirectoryNode(requireNode(state, nextNodeId))) break;
		currentDirectoryId = nextNodeId;
	}
	return currentDirectoryId;
}
function getCollapsedProjectionSignature(state, startDirectoryId) {
	const collapsedAncestorId = findNearestCollapsedAncestor(state, startDirectoryId);
	if (collapsedAncestorId == null) return null;
	const terminalDirectoryId = getFlattenedTerminalDirectoryId(state, collapsedAncestorId);
	const terminalNode = requireNode(state, terminalDirectoryId);
	const flattenedSegmentPaths = collapsedAncestorId === terminalDirectoryId ? null : collectFlattenedDirectoryChainIds(state, collapsedAncestorId).map((nodeId) => materializeNodePath(state, nodeId));
	return JSON.stringify({
		flattenedSegmentPaths,
		hasChildren: getDirectoryIndex(state, terminalDirectoryId).childIds.length > 0,
		path: materializeNodePath(state, terminalDirectoryId),
		terminalKind: getNodeKind(terminalNode)
	});
}
function didProjectionChange(previousProjectionSignature, nextProjectionSignature) {
	return didAnyProjectionChange([previousProjectionSignature], [nextProjectionSignature]);
}
function didAnyProjectionChange(previousProjectionSignatures, nextProjectionSignatures) {
	for (let index = 0; index < previousProjectionSignatures.length; index += 1) {
		const previousProjectionSignature = previousProjectionSignatures[index];
		const nextProjectionSignature = nextProjectionSignatures[index];
		if (previousProjectionSignature == null || nextProjectionSignature == null || previousProjectionSignature !== nextProjectionSignature) return true;
	}
	return false;
}
function findNearestCollapsedAncestor(state, startDirectoryId) {
	let currentDirectoryId = startDirectoryId;
	while (currentDirectoryId != null) {
		const currentNode = requireNode(state, currentDirectoryId);
		if (!isDirectoryNode(currentNode) || hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_ROOT)) return null;
		if (!isDirectoryExpanded(state, currentDirectoryId, currentNode)) return currentDirectoryId;
		currentDirectoryId = currentNode.parentId;
	}
	return null;
}
function recomputeDepths(state, nodeId) {
	const node = requireNode(state, nodeId);
	setNodeDepth(node, (nodeId === state.snapshot.rootId ? -1 : getNodeDepth(requireNode(state, node.parentId))) + 1);
	if (!isDirectoryNode(node)) return;
	const directoryIndex = getDirectoryIndex(state, nodeId);
	for (const childId of directoryIndex.childIds) recomputeDepths(state, childId);
}
function isAncestor(state, ancestorNodeId, nodeId) {
	let currentNodeId = nodeId;
	while (currentNodeId != null) {
		if (currentNodeId === ancestorNodeId) return true;
		const currentNode = requireNode(state, currentNodeId);
		if (currentNodeId === state.snapshot.rootId) return false;
		currentNodeId = currentNode.parentId;
	}
	return false;
}
function recomputeNodeCounts(state, nodeId, currentNode = requireNode(state, nodeId), rebuildChildAggregates = false) {
	const instrumentation = state.instrumentation;
	if (instrumentation == null) {
		recomputeNodeCountsNow(state, nodeId, currentNode, rebuildChildAggregates);
		return;
	}
	withBenchmarkPhase(instrumentation, "store.recomputeNodeCounts", () => recomputeNodeCountsNow(state, nodeId, currentNode, rebuildChildAggregates));
}
function recomputeCountsUpwardFromNow(state, startNodeId) {
	let currentNodeId = startNodeId;
	while (currentNodeId != null) {
		const currentNode = requireNode(state, currentNodeId);
		const previousSubtreeNodeCount = currentNode.subtreeNodeCount;
		const previousVisibleSubtreeCount = currentNode.visibleSubtreeCount;
		recomputeNodeCounts(state, currentNodeId, currentNode);
		if (currentNodeId === state.snapshot.rootId) return;
		const subtreeNodeDelta = currentNode.subtreeNodeCount - previousSubtreeNodeCount;
		const visibleSubtreeDelta = currentNode.visibleSubtreeCount - previousVisibleSubtreeCount;
		const parentId = currentNode.parentId;
		if (subtreeNodeDelta !== 0 || visibleSubtreeDelta !== 0) applyChildAggregateDelta(getDirectoryIndex(state, parentId), currentNodeId, subtreeNodeDelta, visibleSubtreeDelta);
		currentNodeId = parentId;
	}
}
function recomputeNodeCountsNow(state, nodeId, currentNode, rebuildChildAggregates) {
	if (!isDirectoryNode(currentNode)) {
		currentNode.subtreeNodeCount = 1;
		currentNode.visibleSubtreeCount = 1;
		return;
	}
	const currentIndex = getDirectoryIndex(state, nodeId);
	if (rebuildChildAggregates) {
		const instrumentation = state.instrumentation;
		if (instrumentation == null) rebuildDirectoryChildAggregates(state.snapshot.nodes, currentIndex);
		else withBenchmarkPhase(instrumentation, "store.recomputeNodeCounts.rebuildChildAggregates", () => rebuildDirectoryChildAggregates(state.snapshot.nodes, currentIndex));
	}
	const subtreeNodeCount = 1 + currentIndex.totalChildSubtreeNodeCount;
	const visibleChildCount = currentIndex.totalChildVisibleSubtreeCount;
	currentNode.subtreeNodeCount = subtreeNodeCount;
	if (hasNodeFlag(currentNode, PATH_STORE_NODE_FLAG_ROOT)) {
		currentNode.visibleSubtreeCount = visibleChildCount;
		return;
	}
	currentNode.visibleSubtreeCount = getFlattenedChildDirectoryId(state, nodeId) != null ? visibleChildCount : isDirectoryExpanded(state, nodeId, currentNode) ? 1 + visibleChildCount : 1;
}
function buildPathPreview(state, parentId, basename) {
	const parentPath = materializeNodePath(state, parentId);
	return parentPath.length === 0 ? basename : `${parentPath}${basename}`;
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/cleanup.js
function isLiveNode(node) {
	return node != null && !hasNodeFlag(node, PATH_STORE_NODE_FLAG_REMOVED);
}
function isLiveDirectoryNode(state, nodeId) {
	const node = state.snapshot.nodes[nodeId];
	if (!isLiveNode(node) || !isDirectoryNode(node) || hasNodeFlag(node, PATH_STORE_NODE_FLAG_ROOT)) return null;
	return node;
}
function countCachedPathEntries(state) {
	let cachedPathEntryCount = 0;
	for (const [nodeId, cachedEntry] of state.pathCacheByNodeId) {
		if (cachedEntry.version !== state.pathCacheVersion) continue;
		if (!isLiveNode(state.snapshot.nodes[nodeId])) continue;
		cachedPathEntryCount += 1;
	}
	return cachedPathEntryCount;
}
function countSegmentEntries(segmentTable) {
	return Math.max(0, segmentTable.valueById.length - 1);
}
function createCleanupMetricSnapshot(state) {
	return {
		activeNodeCount: state.activeNodeCount,
		cachedPathEntryCount: countCachedPathEntries(state),
		loadInfoEntryCount: state.directoryLoadInfoById.size,
		segmentCount: countSegmentEntries(state.snapshot.segmentTable),
		totalNodeSlotCount: Math.max(0, state.snapshot.nodes.length - 1)
	};
}
function createCleanupResult(mode, idsPreserved, before, after) {
	return {
		activeNodeCountAfter: after.activeNodeCount,
		activeNodeCountBefore: before.activeNodeCount,
		cachedPathEntryCountAfter: after.cachedPathEntryCount,
		cachedPathEntryCountBefore: before.cachedPathEntryCount,
		idsPreserved,
		loadInfoEntryCountAfter: after.loadInfoEntryCount,
		loadInfoEntryCountBefore: before.loadInfoEntryCount,
		mode,
		reclaimedCachedPathEntryCount: before.cachedPathEntryCount - after.cachedPathEntryCount,
		reclaimedLoadInfoEntryCount: before.loadInfoEntryCount - after.loadInfoEntryCount,
		reclaimedNodeSlotCount: before.totalNodeSlotCount - after.totalNodeSlotCount,
		reclaimedSegmentCount: before.segmentCount - after.segmentCount,
		segmentCountAfter: after.segmentCount,
		segmentCountBefore: before.segmentCount,
		totalNodeSlotCountAfter: after.totalNodeSlotCount,
		totalNodeSlotCountBefore: before.totalNodeSlotCount
	};
}
function collectExpansionOverridePaths(state) {
	const collapsedPaths = [];
	const expandedPaths = [];
	for (const nodeId of state.collapsedDirectoryIds) if (isLiveDirectoryNode(state, nodeId) != null) collapsedPaths.push(materializeNodePath(state, nodeId));
	for (const nodeId of state.expandedDirectoryIds) if (isLiveDirectoryNode(state, nodeId) != null) expandedPaths.push(materializeNodePath(state, nodeId));
	return {
		collapsedPaths,
		expandedPaths
	};
}
function collectDirectoryLoadInfos(state) {
	const retainedInfos = [];
	for (const [nodeId, info] of state.directoryLoadInfoById) {
		if (isLiveDirectoryNode(state, nodeId) == null || getDirectoryLoadState(state, nodeId) === "loaded") continue;
		retainedInfos.push({
			info: {
				activeAttemptId: null,
				errorMessage: info.errorMessage,
				nextAttemptId: info.nextAttemptId,
				state: info.state
			},
			path: materializeNodePath(state, nodeId)
		});
	}
	return retainedInfos;
}
function restoreExpansionOverridePaths(state, persistedExpansionState) {
	state.collapsedDirectoryIds.clear();
	state.hasCollapsedDirectoryOverrides = false;
	state.expandedDirectoryIds.clear();
	for (const path of persistedExpansionState.expandedPaths) {
		const nodeId = findNodeId(state, path);
		if (nodeId == null) continue;
		setDirectoryExpanded(state, nodeId, true, requireNode(state, nodeId));
	}
	for (const path of persistedExpansionState.collapsedPaths) {
		const nodeId = findNodeId(state, path);
		if (nodeId == null) continue;
		setDirectoryExpanded(state, nodeId, false, requireNode(state, nodeId));
	}
}
function restoreDirectoryLoadInfos(state, persistedLoadInfos) {
	state.directoryLoadInfoById.clear();
	for (const retainedInfo of persistedLoadInfos) {
		const nodeId = findNodeId(state, retainedInfo.path);
		if (nodeId == null) continue;
		if (isLiveDirectoryNode(state, nodeId) == null) continue;
		state.directoryLoadInfoById.set(nodeId, {
			activeAttemptId: null,
			errorMessage: retainedInfo.info.errorMessage,
			nextAttemptId: retainedInfo.info.nextAttemptId,
			state: retainedInfo.info.state
		});
	}
}
function clearPathCaches(state) {
	state.pathCacheVersion += 1;
	state.pathCacheByNodeId.clear();
	state.pathCacheByNodeId.set(state.snapshot.rootId, {
		path: "",
		version: state.pathCacheVersion
	});
}
function rebuildSegmentTablePreservingNodeIds(state) {
	const previousSegmentTable = state.snapshot.segmentTable;
	const nextSegmentTable = createSegmentTable();
	for (const node of state.snapshot.nodes) {
		if (!isLiveNode(node)) continue;
		if (hasNodeFlag(node, PATH_STORE_NODE_FLAG_ROOT)) {
			node.nameId = 0;
			continue;
		}
		node.nameId = internSegment(nextSegmentTable, getSegmentValue(previousSegmentTable, node.nameId));
	}
	state.snapshot.segmentTable = nextSegmentTable;
}
function rebuildDirectoryIndexes(state) {
	for (const [directoryId, directoryIndex] of state.snapshot.directories) {
		const directoryNode = state.snapshot.nodes[directoryId];
		if (!isLiveNode(directoryNode) || !isDirectoryNode(directoryNode)) {
			state.snapshot.directories.delete(directoryId);
			continue;
		}
		const liveChildIds = directoryIndex.childIds.filter((childId) => {
			const childNode = state.snapshot.nodes[childId];
			return isLiveNode(childNode) && childNode.parentId === directoryId;
		});
		directoryIndex.childIds = liveChildIds;
		directoryIndex.childIdByNameId = new Map(liveChildIds.map((childId) => [requireNode(state, childId).nameId, childId]));
		directoryIndex.childPositionById = new Map(liveChildIds.map((childId, childIndex) => [childId, childIndex]));
		rebuildDirectoryChildAggregates(state.snapshot.nodes, directoryIndex);
	}
}
function trimTrailingRemovedNodeSlots(state) {
	let lastNodeIndex = state.snapshot.nodes.length - 1;
	while (lastNodeIndex > state.snapshot.rootId) {
		const node = state.snapshot.nodes[lastNodeIndex];
		if (isLiveNode(node)) break;
		lastNodeIndex -= 1;
	}
	state.snapshot.nodes.length = lastNodeIndex + 1;
}
function runStableCleanup(state) {
	const persistedExpansionState = collectExpansionOverridePaths(state);
	const persistedLoadInfos = collectDirectoryLoadInfos(state);
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.clearPathCaches", () => clearPathCaches(state));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.rebuildSegmentTable", () => rebuildSegmentTablePreservingNodeIds(state));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.rebuildDirectoryIndexes", () => rebuildDirectoryIndexes(state));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.trimTrailingRemovedNodeSlots", () => trimTrailingRemovedNodeSlots(state));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.restoreExpansionOverrides", () => restoreExpansionOverridePaths(state, persistedExpansionState));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.restoreDirectoryLoadInfos", () => restoreDirectoryLoadInfos(state, persistedLoadInfos));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.stable.recomputeCounts", () => recomputeCountsRecursive(state, state.snapshot.rootId));
}
function runAggressiveCleanup(state) {
	const persistedExpansionState = collectExpansionOverridePaths(state);
	const persistedLoadInfos = collectDirectoryLoadInfos(state);
	const canonicalPaths = withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive.listPaths", () => listPaths(state));
	const builderOptions = attachBenchmarkInstrumentation({ ...state.snapshot.options }, state.instrumentation);
	const rebuiltSnapshot = withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive.rebuildSnapshot", () => {
		const builder = new PathStoreBuilder(builderOptions);
		builder.appendPaths(canonicalPaths);
		return builder.finish();
	});
	state.snapshot = rebuiltSnapshot;
	state.activeNodeCount = rebuiltSnapshot.nodes.length - 1;
	state.pathCacheByNodeId = new Map([[rebuiltSnapshot.rootId, {
		path: "",
		version: 0
	}]]);
	state.pathCacheVersion = 0;
	withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive.restoreExpansionOverrides", () => restoreExpansionOverridePaths(state, persistedExpansionState));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive.restoreDirectoryLoadInfos", () => restoreDirectoryLoadInfos(state, persistedLoadInfos));
	withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive.recomputeCounts", () => recomputeCountsRecursive(state, state.snapshot.rootId));
}
function hasActiveCleanupBlockingLoads(state) {
	for (const loadInfo of state.directoryLoadInfoById.values()) if (loadInfo.state === "loading" && loadInfo.activeAttemptId != null) return true;
	return false;
}
function cleanupPathStoreState(state, mode) {
	const before = createCleanupMetricSnapshot(state);
	if (mode === "stable") withBenchmarkPhase(state.instrumentation, "store.cleanup.stable", () => runStableCleanup(state));
	else withBenchmarkPhase(state.instrumentation, "store.cleanup.aggressive", () => runAggressiveCleanup(state));
	const after = createCleanupMetricSnapshot(state);
	return createCleanupResult(mode, mode === "stable", before, after);
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/projection.js
const INITIAL_PROJECTION_DEPTH_CAPACITY = 64;
function ensureProjectionDepthCapacity(depthTable, depth) {
	const requiredLength = depth + 2;
	if (requiredLength <= depthTable.length) return depthTable;
	let nextLength = depthTable.length;
	while (nextLength < requiredLength) nextLength *= 2;
	const nextDepthTable = new Int32Array(nextLength);
	nextDepthTable.fill(-1);
	nextDepthTable.set(depthTable);
	return nextDepthTable;
}
function getVisibleCount(state) {
	return requireNode(state, state.snapshot.rootId).visibleSubtreeCount;
}
function getVisibleRowSubtreeEndIndex(state, cursor, index, totalVisibleCount) {
	const terminalNode = requireNode(state, cursor.terminalNodeId);
	const subtreeSize = Math.max(1, terminalNode.visibleSubtreeCount);
	return Math.min(totalVisibleCount - 1, index + subtreeSize - 1);
}
function materializeVisibleAncestorRow(state, entry, totalVisibleCount, ancestorPaths) {
	return {
		ancestorPaths,
		index: entry.index,
		posInSet: entry.posInSet,
		row: materializeVisibleRow(state, entry.cursor),
		setSize: entry.setSize,
		subtreeEndIndex: getVisibleRowSubtreeEndIndex(state, entry.cursor, entry.index, totalVisibleCount)
	};
}
function selectVisibleRowContextWithinDirectory(state, directoryNodeId, index, directoryStartIndex, parentVisibleDepth, ancestors) {
	const directoryIndex = getDirectoryIndex(state, directoryNodeId);
	const { childIndex, childVisibleIndex, localVisibleIndex } = selectChildIndexByVisibleIndex(state.snapshot.nodes, directoryIndex, index);
	const childId = directoryIndex.childIds[childIndex];
	if (childId == null) throw new Error(`Visible index ${String(index)} is out of range`);
	return selectVisibleRowContextWithinSubtree(state, childId, localVisibleIndex, directoryStartIndex + childVisibleIndex, parentVisibleDepth + 1, childIndex, directoryIndex.childIds.length, ancestors);
}
function selectVisibleRowContextWithinSubtree(state, nodeId, index, rowIndex, visibleDepth, posInSet, setSize, ancestors) {
	if (!isDirectoryNode(requireNode(state, nodeId))) {
		if (index === 0) return {
			ancestors,
			cursor: {
				headNodeId: nodeId,
				terminalNodeId: nodeId,
				visibleDepth
			},
			index: rowIndex,
			posInSet,
			setSize
		};
		throw new Error(`Visible index ${String(index)} is out of range for file`);
	}
	const currentCursor = createVisibleRowCursor(state, nodeId, visibleDepth);
	if (index === 0) return {
		ancestors,
		cursor: currentCursor,
		index: rowIndex,
		posInSet,
		setSize
	};
	const terminalNode = requireNode(state, currentCursor.terminalNodeId);
	if (!isDirectoryNode(terminalNode) || !isDirectoryExpanded(state, currentCursor.terminalNodeId, terminalNode)) throw new Error(`Visible index ${String(index)} is out of range for collapsed directory`);
	return selectVisibleRowContextWithinDirectory(state, currentCursor.terminalNodeId, index - 1, rowIndex + 1, currentCursor.visibleDepth, [...ancestors, {
		cursor: currentCursor,
		index: rowIndex,
		posInSet,
		setSize
	}]);
}
function getVisibleRowContext(state, index) {
	const totalVisibleCount = getVisibleCount(state);
	if (index < 0 || index >= totalVisibleCount) return null;
	const selected = selectVisibleRowContextWithinDirectory(state, state.snapshot.rootId, index, 0, -1, []);
	const ancestorPaths = selected.ancestors.map((ancestor) => materializeNodePath(state, ancestor.cursor.terminalNodeId));
	let cachedAncestorRows = null;
	return {
		ancestorPaths,
		get ancestorRows() {
			if (cachedAncestorRows != null) return cachedAncestorRows;
			const ancestorRows = [];
			const rowAncestorPaths = [];
			for (const ancestor of selected.ancestors) {
				const ancestorRow = materializeVisibleAncestorRow(state, ancestor, totalVisibleCount, [...rowAncestorPaths]);
				ancestorRows.push(ancestorRow);
				rowAncestorPaths.push(ancestorRow.row.path);
			}
			cachedAncestorRows = ancestorRows;
			return cachedAncestorRows;
		},
		index: selected.index,
		posInSet: selected.posInSet,
		row: materializeVisibleRow(state, selected.cursor),
		setSize: selected.setSize,
		subtreeEndIndex: getVisibleRowSubtreeEndIndex(state, selected.cursor, selected.index, totalVisibleCount)
	};
}
function getVisibleSlice(state, start, end) {
	const instrumentation = state.instrumentation;
	const totalVisibleCount = getVisibleCount(state);
	if (totalVisibleCount <= 0 || end < start) return [];
	const normalizedStart = Math.max(0, Math.min(start, totalVisibleCount - 1));
	const normalizedEnd = Math.max(normalizedStart, Math.min(end, totalVisibleCount - 1));
	if (instrumentation == null) {
		if (normalizedStart === 0) return collectVisibleRowsDFS(state, normalizedEnd + 1);
		const rows$1 = [];
		let currentCursor$1 = selectVisibleRow(state, normalizedStart);
		for (let visibleIndex = normalizedStart; visibleIndex <= normalizedEnd && currentCursor$1 != null; visibleIndex++) {
			const row = materializeVisibleRow(state, currentCursor$1);
			rows$1.push(row);
			currentCursor$1 = getNextVisibleRowCursor(state, currentCursor$1);
		}
		return rows$1;
	}
	const rows = [];
	let flattenedRowCount = 0;
	let flattenedSegmentCount = 0;
	let currentCursor = withBenchmarkPhase(instrumentation, "store.getVisibleSlice.selectFirstRow", () => selectVisibleRow(state, normalizedStart));
	for (let visibleIndex = normalizedStart; visibleIndex <= normalizedEnd && currentCursor != null; visibleIndex++) {
		const row = withBenchmarkPhase(instrumentation, "store.getVisibleSlice.materializeRow", () => materializeVisibleRow(state, currentCursor));
		rows.push(row);
		if (row.isFlattened) {
			flattenedRowCount++;
			flattenedSegmentCount += row.flattenedSegments?.length ?? 0;
		}
		currentCursor = withBenchmarkPhase(instrumentation, "store.getVisibleSlice.advanceCursor", () => getNextVisibleRowCursor(state, currentCursor));
	}
	setBenchmarkCounter(instrumentation, "workload.visibleRowsRead", rows.length);
	setBenchmarkCounter(instrumentation, "workload.flattenedRowsRead", flattenedRowCount);
	setBenchmarkCounter(instrumentation, "workload.flattenedSegmentsRead", flattenedSegmentCount);
	return rows;
}
function getVisibleTreeProjectionData(state, maxRows = getVisibleCount(state)) {
	const instrumentation = state.instrumentation;
	if (instrumentation == null) return buildVisibleTreeProjectionDataDFS(state, maxRows);
	return withBenchmarkPhase(instrumentation, "store.getVisibleTreeProjection", () => buildVisibleTreeProjectionDataDFS(state, maxRows));
}
function getVisibleTreeProjection(state) {
	return createVisibleTreeProjectionFromData(getVisibleTreeProjectionData(state));
}
function getVisibleIndexByPath(state, path) {
	const nodeId = findNodeId(state, path);
	if (nodeId == null || nodeId === state.snapshot.rootId) return null;
	if (isDirectoryNode(requireNode(state, nodeId)) && getFlattenedTerminalDirectoryId(state, nodeId) !== nodeId) return null;
	let visibleIndex = 0;
	let currentNodeId = nodeId;
	const { nodes, rootId } = state.snapshot;
	while (currentNodeId !== rootId) {
		const parentId = requireNode(state, currentNodeId).parentId;
		const parentIndex = getDirectoryIndex(state, parentId);
		const childPosition = ensureChildPositions(parentIndex).get(currentNodeId);
		if (childPosition == null) throw new Error(`Child ${String(currentNodeId)} was not found in its parent index`);
		visibleIndex += getVisibleChildPrefixCount(nodes, parentIndex, childPosition);
		if (parentId !== rootId) {
			const parentNode = requireNode(state, parentId);
			const flattenedChildDirectoryId = getFlattenedChildDirectoryId(state, parentId);
			if (!isDirectoryExpanded(state, parentId, parentNode) && flattenedChildDirectoryId !== currentNodeId) return null;
			if (getFlattenedTerminalDirectoryId(state, parentId) === parentId) visibleIndex += 1;
		}
		currentNodeId = parentId;
	}
	return visibleIndex;
}
function expandPath(state, path) {
	const directoryNodeId = findNodeId(state, path);
	if (directoryNodeId == null) throw new Error(`Path does not exist: "${path}"`);
	const directoryNode = requireNode(state, directoryNodeId);
	if (!isDirectoryNode(directoryNode)) throw new Error(`Path is not a directory: "${path}"`);
	if (isDirectoryExpanded(state, directoryNodeId, directoryNode)) return null;
	setDirectoryExpanded(state, directoryNodeId, true, directoryNode);
	recomputeCountsUpwardFrom(state, directoryNodeId);
	return createExpandEvent({
		affectedAncestorIds: collectAncestorIds(state, directoryNodeId),
		affectedNodeIds: [directoryNodeId],
		path,
		projectionChanged: true
	});
}
function collapsePath(state, path) {
	const directoryNodeId = findNodeId(state, path);
	if (directoryNodeId == null) throw new Error(`Path does not exist: "${path}"`);
	const directoryNode = requireNode(state, directoryNodeId);
	if (!isDirectoryNode(directoryNode)) throw new Error(`Path is not a directory: "${path}"`);
	if (!isDirectoryExpanded(state, directoryNodeId, directoryNode)) return null;
	setDirectoryExpanded(state, directoryNodeId, false, directoryNode);
	recomputeCountsUpwardFrom(state, directoryNodeId);
	return createCollapseEvent({
		affectedAncestorIds: collectAncestorIds(state, directoryNodeId),
		affectedNodeIds: [directoryNodeId],
		path,
		projectionChanged: true
	});
}
function selectVisibleRow(state, index) {
	if (index < 0 || index >= getVisibleCount(state)) return null;
	return selectVisibleRowWithinDirectory(state, state.snapshot.rootId, index, -1);
}
function selectVisibleRowWithinDirectory(state, directoryNodeId, index, parentVisibleDepth) {
	const directoryIndex = getDirectoryIndex(state, directoryNodeId);
	const instrumentation = state.instrumentation;
	const { childIndex, localVisibleIndex } = instrumentation == null ? selectChildIndexByVisibleIndex(state.snapshot.nodes, directoryIndex, index) : withBenchmarkPhase(instrumentation, "store.getVisibleSlice.selectChildIndex", () => selectChildIndexByVisibleIndex(state.snapshot.nodes, directoryIndex, index));
	const childId = directoryIndex.childIds[childIndex];
	if (childId != null) return selectVisibleRowWithinSubtree(state, childId, localVisibleIndex, parentVisibleDepth + 1);
	throw new Error(`Visible index ${String(index)} is out of range`);
}
function selectVisibleRowWithinSubtree(state, nodeId, index, visibleDepth) {
	if (!isDirectoryNode(requireNode(state, nodeId))) {
		if (index === 0) return {
			headNodeId: nodeId,
			terminalNodeId: nodeId,
			visibleDepth
		};
		throw new Error(`Visible index ${String(index)} is out of range for file`);
	}
	const currentCursor = createVisibleRowCursor(state, nodeId, visibleDepth);
	if (index === 0) return currentCursor;
	const terminalNode = requireNode(state, currentCursor.terminalNodeId);
	if (!isDirectoryNode(terminalNode) || !isDirectoryExpanded(state, currentCursor.terminalNodeId, terminalNode)) throw new Error(`Visible index ${String(index)} is out of range for collapsed directory`);
	return selectVisibleRowWithinDirectory(state, currentCursor.terminalNodeId, index - 1, currentCursor.visibleDepth);
}
function createVisibleRowCursor(state, nodeId, visibleDepth) {
	if (!isDirectoryNode(requireNode(state, nodeId))) return {
		headNodeId: nodeId,
		terminalNodeId: nodeId,
		visibleDepth
	};
	if (state.instrumentation == null) return {
		headNodeId: nodeId,
		terminalNodeId: getFlattenedTerminalDirectoryId(state, nodeId),
		visibleDepth
	};
	return {
		headNodeId: nodeId,
		terminalNodeId: withBenchmarkPhase(state.instrumentation, "store.getVisibleSlice.flatten.resolveTerminalDirectory", () => getFlattenedTerminalDirectoryId(state, nodeId)),
		visibleDepth
	};
}
function isVisibleRowHeadNode(state, nodeId) {
	const node = requireNode(state, nodeId);
	if (!isDirectoryNode(node)) return true;
	const parentId = node.parentId;
	if (parentId === state.snapshot.rootId) return true;
	return getFlattenedChildDirectoryId(state, parentId) !== nodeId;
}
function getNextVisibleRowCursor(state, currentCursor) {
	const terminalNode = requireNode(state, currentCursor.terminalNodeId);
	if (isDirectoryNode(terminalNode)) {
		const currentIndex = getDirectoryIndex(state, currentCursor.terminalNodeId);
		if (isDirectoryExpanded(state, currentCursor.terminalNodeId, terminalNode) && currentIndex.childIds.length > 0) {
			const firstChildId = currentIndex.childIds[0];
			return firstChildId == null ? null : selectVisibleRowWithinSubtree(state, firstChildId, 0, currentCursor.visibleDepth + 1);
		}
	}
	let currentNodeId = currentCursor.terminalNodeId;
	let currentVisibleDepth = currentCursor.visibleDepth;
	while (true) {
		const currentNode = requireNode(state, currentNodeId);
		if (currentNodeId === state.snapshot.rootId) return null;
		const parentId = currentNode.parentId;
		const parentIndex = getDirectoryIndex(state, parentId);
		const siblingIndex = ensureChildPositions(parentIndex).get(currentNodeId) ?? -1;
		if (siblingIndex < 0) throw new Error(`Child ${String(currentNodeId)} was not found in its parent index`);
		const nextSiblingId = parentIndex.childIds[siblingIndex + 1] ?? null;
		if (nextSiblingId != null) return selectVisibleRowWithinSubtree(state, nextSiblingId, 0, currentVisibleDepth);
		if (isVisibleRowHeadNode(state, currentNodeId)) currentVisibleDepth--;
		currentNodeId = parentId;
	}
}
function createVisibleTreeProjectionFromData(projection) {
	const rowCount = projection.paths.length;
	const projectionRows = new Array(rowCount);
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
		const parentIndex = projection.getParentIndex(rowIndex);
		projectionRows[rowIndex] = {
			index: rowIndex,
			parentPath: parentIndex >= 0 ? projection.paths[parentIndex] ?? null : null,
			path: projection.paths[rowIndex] ?? "",
			posInSet: projection.posInSetByIndex[rowIndex] ?? 0,
			setSize: projection.setSizeByIndex[rowIndex] ?? 0
		};
	}
	return {
		getParentIndex: projection.getParentIndex,
		rows: projectionRows,
		get visibleIndexByPath() {
			return projection.visibleIndexByPath;
		}
	};
}
function buildVisibleTreeProjectionDataDFS(state, maxRows) {
	const paths = new Array(maxRows);
	const parentRowIndex = new Int32Array(maxRows);
	const posInSetByIndex = new Int32Array(maxRows);
	const setSizeByIndex = new Int32Array(maxRows);
	let lastRowAtDepth = new Int32Array(INITIAL_PROJECTION_DEPTH_CAPACITY);
	lastRowAtDepth.fill(-1);
	let rowCount = 0;
	const { nodes, directories, segmentTable } = state.snapshot;
	const stack = [[
		directories.get(state.snapshot.rootId),
		0,
		-1,
		""
	]];
	const flattenEnabled = state.snapshot.options.flattenEmptyDirectories;
	const pathCacheByNodeId = state.pathCacheByNodeId;
	const pathCacheVersion = state.pathCacheVersion;
	const segmentValues = segmentTable.valueById;
	while (stack.length > 0 && rowCount < maxRows) {
		const frame = stack[stack.length - 1];
		const dirIndex = frame[0];
		if (frame[1] >= dirIndex.childIds.length) {
			stack.pop();
			continue;
		}
		const childOffset = frame[1];
		const childId = dirIndex.childIds[frame[1]++];
		const childNode = nodes[childId];
		const visibleDepth = frame[2] + 1;
		const parentPath = frame[3];
		lastRowAtDepth = ensureProjectionDepthCapacity(lastRowAtDepth, visibleDepth);
		let path;
		let terminalNodeId = childId;
		if (!isDirectoryNode(childNode)) {
			const cachedPathEntry = pathCacheByNodeId.get(childId);
			path = cachedPathEntry != null && cachedPathEntry.version === pathCacheVersion ? cachedPathEntry.path : `${parentPath}${segmentValues[childNode.nameId]}`;
		} else {
			terminalNodeId = flattenEnabled ? getFlattenedTerminalDirectoryId(state, childId) : childId;
			path = terminalNodeId === childId ? `${parentPath}${segmentValues[childNode.nameId]}/` : materializeNodePath(state, terminalNodeId);
		}
		parentRowIndex[rowCount] = lastRowAtDepth[visibleDepth];
		paths[rowCount] = path;
		posInSetByIndex[rowCount] = childOffset;
		setSizeByIndex[rowCount] = dirIndex.childIds.length;
		lastRowAtDepth[visibleDepth + 1] = rowCount;
		rowCount += 1;
		const terminalNode = nodes[terminalNodeId];
		if (terminalNode != null && isDirectoryNode(terminalNode) && isDirectoryExpanded(state, terminalNodeId, terminalNode)) stack.push([
			directories.get(terminalNodeId),
			0,
			visibleDepth,
			path
		]);
	}
	if (rowCount < maxRows) paths.length = rowCount;
	const finalParentRowIndex = parentRowIndex.subarray(0, rowCount);
	const finalPosInSetByIndex = posInSetByIndex.subarray(0, rowCount);
	const finalSetSizeByIndex = setSizeByIndex.subarray(0, rowCount);
	let cachedVisibleIndexByPath = null;
	return {
		getParentIndex(index) {
			return index < 0 || index >= rowCount ? -1 : finalParentRowIndex[index] ?? -1;
		},
		paths,
		posInSetByIndex: finalPosInSetByIndex,
		setSizeByIndex: finalSetSizeByIndex,
		get visibleIndexByPath() {
			if (cachedVisibleIndexByPath == null) {
				cachedVisibleIndexByPath = /* @__PURE__ */ new Map();
				for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) cachedVisibleIndexByPath.set(paths[rowIndex] ?? "", rowIndex);
			}
			return cachedVisibleIndexByPath;
		}
	};
}
function collectVisibleRowsDFS(state, maxRows) {
	const rows = new Array(maxRows);
	let rowCount = 0;
	const { nodes, directories, segmentTable } = state.snapshot;
	const stack = [[
		directories.get(state.snapshot.rootId),
		0,
		-1
	]];
	const segmentValues = segmentTable.valueById;
	const flattenEnabled = state.snapshot.options.flattenEmptyDirectories;
	const pathCacheByNodeId = state.pathCacheByNodeId;
	const pathCacheVersion = state.pathCacheVersion;
	while (stack.length > 0 && rowCount < maxRows) {
		const frame = stack[stack.length - 1];
		const dirIndex = frame[0];
		if (frame[1] >= dirIndex.childIds.length) {
			stack.pop();
			continue;
		}
		const childId = dirIndex.childIds[frame[1]++];
		const childNode = nodes[childId];
		const visibleDepth = frame[2] + 1;
		if (!isDirectoryNode(childNode)) {
			const cachedPathEntry = pathCacheByNodeId.get(childId);
			rows[rowCount++] = {
				depth: visibleDepth,
				flattenedSegments: void 0,
				hasChildren: false,
				id: childId,
				isExpanded: false,
				isFlattened: false,
				isLoading: false,
				kind: "file",
				loadState: void 0,
				name: segmentValues[childNode.nameId],
				path: cachedPathEntry != null && cachedPathEntry.version === pathCacheVersion ? cachedPathEntry.path : materializeNodePath(state, childId)
			};
			continue;
		}
		const terminalNodeId = flattenEnabled ? getFlattenedTerminalDirectoryId(state, childId) : childId;
		const cursor = {
			headNodeId: childId,
			terminalNodeId,
			visibleDepth
		};
		rows[rowCount++] = materializeVisibleRow(state, cursor);
		const terminalNode = nodes[terminalNodeId];
		if (terminalNode != null && isDirectoryNode(terminalNode) && isDirectoryExpanded(state, terminalNodeId, terminalNode)) stack.push([
			directories.get(terminalNodeId),
			0,
			visibleDepth
		]);
	}
	if (rowCount < maxRows) rows.length = rowCount;
	return rows;
}
function materializeVisibleRow(state, cursor) {
	const terminalNode = requireNode(state, cursor.terminalNodeId);
	const loadState = isDirectoryNode(terminalNode) ? getVisibleRowLoadState(state, cursor) : null;
	const path = materializeNodePath(state, cursor.terminalNodeId);
	const name = getSegmentValue(state.snapshot.segmentTable, terminalNode.nameId);
	const hasChildren = isDirectoryNode(terminalNode) && getDirectoryIndex(state, cursor.terminalNodeId).childIds.length > 0;
	const isFlattened = cursor.headNodeId !== cursor.terminalNodeId;
	const instrumentation = state.instrumentation;
	const flattenedSegments = isFlattened ? instrumentation == null ? collectFlattenedDirectoryChainIds(state, cursor.headNodeId).map((nodeId) => {
		const node = requireNode(state, nodeId);
		return {
			isTerminal: nodeId === cursor.terminalNodeId,
			name: getSegmentValue(state.snapshot.segmentTable, node.nameId),
			nodeId,
			path: materializeNodePath(state, nodeId)
		};
	}) : withBenchmarkPhase(instrumentation, "store.getVisibleSlice.flatten.collectSegments", () => collectFlattenedDirectoryChainIds(state, cursor.headNodeId).map((nodeId) => {
		const node = requireNode(state, nodeId);
		return {
			isTerminal: nodeId === cursor.terminalNodeId,
			name: getSegmentValue(state.snapshot.segmentTable, node.nameId),
			nodeId,
			path: materializeNodePath(state, nodeId)
		};
	})) : void 0;
	return {
		depth: cursor.visibleDepth,
		flattenedSegments,
		hasChildren,
		id: cursor.terminalNodeId,
		isExpanded: isDirectoryNode(terminalNode) && isDirectoryExpanded(state, cursor.terminalNodeId, terminalNode),
		isFlattened,
		isLoading: loadState === "loading",
		kind: isDirectoryNode(terminalNode) ? "directory" : "file",
		loadState: loadState == null || loadState === "loaded" ? void 0 : loadState,
		name,
		path
	};
}
function getVisibleRowLoadState(state, cursor) {
	if (cursor.headNodeId === cursor.terminalNodeId) return getDirectoryLoadState(state, cursor.terminalNodeId);
	const chainNodeIds = collectFlattenedDirectoryChainIds(state, cursor.headNodeId);
	let hasUnloaded = false;
	let hasError = false;
	for (const nodeId of chainNodeIds) {
		const loadState = getDirectoryLoadState(state, nodeId);
		if (loadState === "loading") return "loading";
		if (loadState === "error") {
			hasError = true;
			continue;
		}
		if (loadState === "unloaded") hasUnloaded = true;
	}
	if (hasError) return "error";
	if (hasUnloaded) return "unloaded";
	return "loaded";
}

//#endregion
//#region node_modules/@pierre/trees/dist/path-store/src/store.js
function initializeOpenVisibleCounts(state) {
	const { directories, nodes, options, rootId, presortedDirectoryNodeIds } = state.snapshot;
	const flattenEmptyDirectories = options.flattenEmptyDirectories === true;
	const walkDirectory = (nodeId) => {
		const currentNode = nodes[nodeId];
		if (currentNode == null || !isDirectoryNode(currentNode)) return;
		const currentIndex = directories.get(nodeId);
		if (currentIndex == null) throw new Error(`Unknown directory child index for node ${String(nodeId)}`);
		const childIds = currentIndex.childIds;
		const childCount = childIds.length;
		let totalChildSubtreeNodeCount = 0;
		let totalChildVisibleSubtreeCount = 0;
		for (let ci = 0; ci < childCount; ci++) {
			const childId = childIds[ci];
			if (childId == null) continue;
			const childNode = nodes[childId];
			totalChildSubtreeNodeCount += childNode.subtreeNodeCount;
			totalChildVisibleSubtreeCount += childNode.visibleSubtreeCount;
		}
		currentIndex.totalChildSubtreeNodeCount = totalChildSubtreeNodeCount;
		currentIndex.totalChildVisibleSubtreeCount = totalChildVisibleSubtreeCount;
		if (childCount >= PATH_STORE_CHILD_INDEX_CHUNK_THRESHOLD_EXTERNAL) rebuildVisibleChildChunks(nodes, currentIndex);
		currentNode.subtreeNodeCount = 1 + totalChildSubtreeNodeCount;
		let newVisibleSubtreeCount;
		if (flattenEmptyDirectories && childCount === 1) {
			const onlyChild = nodes[childIds[0]];
			newVisibleSubtreeCount = onlyChild != null && isDirectoryNode(onlyChild) ? totalChildVisibleSubtreeCount : 1 + totalChildVisibleSubtreeCount;
		} else newVisibleSubtreeCount = 1 + totalChildVisibleSubtreeCount;
		currentNode.visibleSubtreeCount = newVisibleSubtreeCount;
	};
	if (presortedDirectoryNodeIds != null) for (let i = presortedDirectoryNodeIds.length - 1; i >= 0; i--) walkDirectory(presortedDirectoryNodeIds[i]);
	else for (let nodeId = nodes.length - 1; nodeId >= 1; nodeId--) walkDirectory(nodeId);
	const rootNode = nodes[rootId];
	const rootIndex = directories.get(rootId);
	if (rootNode == null || rootIndex == null) return;
	const rootChildIds = rootIndex.childIds;
	let rootTotalChildSubtreeNodeCount = 0;
	let rootTotalChildVisibleSubtreeCount = 0;
	for (let ci = 0; ci < rootChildIds.length; ci++) {
		const childId = rootChildIds[ci];
		if (childId == null) continue;
		const childNode = nodes[childId];
		rootTotalChildSubtreeNodeCount += childNode.subtreeNodeCount;
		rootTotalChildVisibleSubtreeCount += childNode.visibleSubtreeCount;
	}
	rootIndex.totalChildSubtreeNodeCount = rootTotalChildSubtreeNodeCount;
	rootIndex.totalChildVisibleSubtreeCount = rootTotalChildVisibleSubtreeCount;
	rebuildVisibleChildChunks(nodes, rootIndex);
	rootNode.subtreeNodeCount = 1 + rootTotalChildSubtreeNodeCount;
	rootNode.visibleSubtreeCount = rootTotalChildVisibleSubtreeCount;
}
function canInitializeOpenVisibleCounts(options) {
	return options.initialExpansion === "open" && (options.initialExpandedPaths == null || options.initialExpandedPaths.length === 0);
}
var PathStore = class PathStore {
	#state;
	constructor(options = {}) {
		const instrumentation = getBenchmarkInstrumentation(options);
		const builder = withBenchmarkPhase(instrumentation, "store.builder.create", () => new PathStoreBuilder(options));
		if (options.preparedInput != null) {
			const presortedPaths = getPreparedInputPresortedPaths(options.preparedInput);
			if (presortedPaths != null) builder.appendPresortedPaths(presortedPaths, getPreparedInputPresortedPathsContainDirectories(options.preparedInput));
			else builder.appendPreparedPaths(getPreparedInputEntries(options.preparedInput), false);
		} else {
			const inputPaths = options.paths ?? [];
			if (options.presorted === true) builder.appendPaths(inputPaths);
			else builder.appendPreparedPaths(withBenchmarkPhase(instrumentation, "store.preparePathEntries", () => preparePathEntries(inputPaths, options)));
		}
		const snapshot = withBenchmarkPhase(instrumentation, "store.builder.finish", () => builder.finish({ skipSubtreeCountPass: true }));
		const useExplicitOpenExpansionFastPath = withBenchmarkPhase(instrumentation, "store.state.detectAllDirectoriesExpanded", () => (options.initialExpansion ?? "closed") === "closed" && builder.didMatchAllInitialExpandedPaths());
		this.#state = withBenchmarkPhase(instrumentation, "store.state.create", () => createPathStoreState(snapshot, useExplicitOpenExpansionFastPath ? "open" : options.initialExpansion ?? "closed", instrumentation));
		if (useExplicitOpenExpansionFastPath) this.#state.collapseNewDirectoriesByDefault = true;
		const expandedDirectoryCount = useExplicitOpenExpansionFastPath ? this.#state.snapshot.directories.size - 1 : withBenchmarkPhase(instrumentation, "store.state.initializeExpandedPaths", () => this.initializeExpandedPaths(options.initialExpandedPaths));
		if (useExplicitOpenExpansionFastPath || canInitializeOpenVisibleCounts(options) || (options.initialExpansion ?? "closed") === "closed" && expandedDirectoryCount === this.#state.snapshot.directories.size - 1 || (options.initialExpandedPaths?.length ?? 0) > 0 && withBenchmarkPhase(instrumentation, "store.state.checkAllDirectoriesExpanded", () => this.hasAllDirectoriesExpanded())) withBenchmarkPhase(instrumentation, "store.state.initializeOpenVisibleCounts", () => initializeOpenVisibleCounts(this.#state));
		else withBenchmarkPhase(instrumentation, "store.state.recomputeCounts", () => recomputeCountsRecursive(this.#state, this.#state.snapshot.rootId));
	}
	static preparePaths(paths, options = {}) {
		return preparePaths(paths, options);
	}
	static prepareInput(paths, options = {}) {
		return prepareInput(paths, options);
	}
	static preparePresortedInput(paths) {
		return preparePresortedInput(paths);
	}
	list(path) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.list", () => listPaths(this.#state, path));
	}
	add(path) {
		withBenchmarkPhase(this.#state.instrumentation, "store.add", () => {
			const previousVisibleCount = getVisibleCount(this.#state);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, addPath(this.#state, path)));
		});
	}
	remove(path, options = {}) {
		withBenchmarkPhase(this.#state.instrumentation, "store.remove", () => {
			const previousVisibleCount = getVisibleCount(this.#state);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, removePath(this.#state, path, options)));
		});
	}
	move(fromPath, toPath, options = {}) {
		withBenchmarkPhase(this.#state.instrumentation, "store.move", () => {
			const previousVisibleCount = getVisibleCount(this.#state);
			const event = movePath(this.#state, fromPath, toPath, options);
			if (event != null) recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, event));
		});
	}
	batch(operations) {
		batchEvents(this.#state, () => {
			if (typeof operations === "function") {
				operations(this);
				return;
			}
			for (const operation of operations) switch (operation.type) {
				case "add":
					this.add(operation.path);
					break;
				case "remove":
					this.remove(operation.path, { recursive: operation.recursive });
					break;
				case "move":
					this.move(operation.from, operation.to, { collision: operation.collision });
					break;
			}
		});
	}
	getVisibleCount() {
		return withBenchmarkPhase(this.#state.instrumentation, "store.getVisibleCount", () => getVisibleCount(this.#state));
	}
	getVisibleSlice(start, end) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.getVisibleSlice", () => getVisibleSlice(this.#state, start, end));
	}
	getVisibleRowContext(index) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.getVisibleRowContext", () => getVisibleRowContext(this.#state, index));
	}
	getVisibleTreeProjection() {
		return getVisibleTreeProjection(this.#state);
	}
	getVisibleTreeProjectionData(maxRows) {
		return getVisibleTreeProjectionData(this.#state, maxRows);
	}
	/**
	* Resolves a path to its visible row index without building a full projection
	* index. Returns null when the path is unknown or currently hidden.
	*/
	getVisibleIndex(path) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.getVisibleIndex", () => getVisibleIndexByPath(this.#state, path));
	}
	/**
	* Resolves a lookup path to the store's canonical path and item kind.
	* Lets tree adapters answer path-first queries without building a second
	* whole-tree metadata index alongside the store.
	*/
	getPathInfo(path) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.getPathInfo", () => {
			const nodeId = findNodeId(this.#state, path);
			if (nodeId == null) return null;
			const node = requireNode(this.#state, nodeId);
			return {
				depth: getNodeDepth(node),
				kind: isDirectoryNode(node) ? "directory" : "file",
				path: materializeNodePath(this.#state, nodeId)
			};
		});
	}
	isExpanded(path) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.isExpanded", () => {
			const directoryNodeId = this.requireDirectoryNodeId(path);
			const directoryNode = requireNode(this.#state, directoryNodeId);
			return isDirectoryExpanded(this.#state, directoryNodeId, directoryNode);
		});
	}
	expand(path) {
		withBenchmarkPhase(this.#state.instrumentation, "store.expand", () => {
			const previousVisibleCount = getVisibleCount(this.#state);
			const event = expandPath(this.#state, path);
			if (event != null) recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, event));
		});
	}
	collapse(path) {
		withBenchmarkPhase(this.#state.instrumentation, "store.collapse", () => {
			const previousVisibleCount = getVisibleCount(this.#state);
			const event = collapsePath(this.#state, path);
			if (event != null) recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, event));
		});
	}
	on(type, handler) {
		return subscribe(this.#state, type, handler);
	}
	getDirectoryLoadState(path) {
		const directoryNodeId = this.requireDirectoryNodeId(path);
		return getDirectoryLoadState(this.#state, directoryNodeId);
	}
	markDirectoryUnloaded(path) {
		withBenchmarkPhase(this.#state.instrumentation, "store.markDirectoryUnloaded", () => {
			const directoryNodeId = this.requireDirectoryNodeId(path);
			if (getDirectoryIndex(this.#state, directoryNodeId).childIds.length > 0) throw new Error(`Cannot mark a directory with known children as unloaded: "${path}"`);
			const previousVisibleCount = getVisibleCount(this.#state);
			markDirectoryUnloadedState(this.#state, directoryNodeId);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createMarkDirectoryUnloadedEvent({
				affectedAncestorIds: collectAncestorIds(this.#state, directoryNodeId),
				affectedNodeIds: [directoryNodeId],
				path,
				projectionChanged: this.isDirectoryProjectionVisible(directoryNodeId)
			})));
		});
	}
	beginChildLoad(path) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.beginChildLoad", () => {
			const directoryNodeId = this.requireDirectoryNodeId(path);
			const previousVisibleCount = getVisibleCount(this.#state);
			const attempt = beginDirectoryLoad(this.#state, directoryNodeId);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createBeginChildLoadEvent({
				affectedAncestorIds: collectAncestorIds(this.#state, directoryNodeId),
				affectedNodeIds: [directoryNodeId],
				attemptId: attempt.attemptId,
				path,
				projectionChanged: this.isDirectoryProjectionVisible(directoryNodeId),
				reused: attempt.reused
			})));
			return attempt;
		});
	}
	applyChildPatch(attempt, patch) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.applyChildPatch", () => {
			const directoryNodeId = this.resolveActiveDirectoryNodeId(attempt.nodeId);
			if (directoryNodeId == null || getDirectoryLoadState(this.#state, directoryNodeId) !== "loading" || !isDirectoryLoadAttemptCurrent(this.#state, directoryNodeId, attempt.attemptId)) return false;
			const directoryPath = materializeNodePath(this.#state, directoryNodeId);
			this.validateChildPatch(directoryPath, patch);
			const previousVisibleCount = getVisibleCount(this.#state);
			const childEvents = [];
			for (const operation of patch.operations) {
				assertOperationTargetsDirectory(directoryPath, operation);
				const operationVisibleCount = getVisibleCount(this.#state);
				switch (operation.type) {
					case "add":
						childEvents.push(finalizeEvent(this.#state, operationVisibleCount, addPath(this.#state, operation.path)));
						break;
					case "remove":
						childEvents.push(finalizeEvent(this.#state, operationVisibleCount, removePath(this.#state, operation.path, { recursive: operation.recursive })));
						break;
					case "move": {
						const event = movePath(this.#state, operation.from, operation.to, { collision: operation.collision });
						if (event != null) childEvents.push(finalizeEvent(this.#state, operationVisibleCount, event));
						break;
					}
				}
			}
			const projectionChanged = childEvents.some((event) => event.projectionChanged) || this.isDirectoryProjectionVisible(directoryNodeId);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createApplyChildPatchEvent({
				affectedAncestorIds: collectAncestorIds(this.#state, directoryNodeId),
				affectedNodeIds: [directoryNodeId],
				attemptId: attempt.attemptId,
				childEvents,
				path: materializeNodePath(this.#state, directoryNodeId),
				projectionChanged
			})));
			return true;
		});
	}
	completeChildLoad(attempt) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.completeChildLoad", () => {
			const directoryNodeId = this.resolveActiveDirectoryNodeId(attempt.nodeId);
			if (directoryNodeId == null) return false;
			const previousVisibleCount = getVisibleCount(this.#state);
			const applied = completeDirectoryLoad(this.#state, directoryNodeId, attempt.attemptId);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createCompleteChildLoadEvent({
				affectedAncestorIds: collectAncestorIds(this.#state, directoryNodeId),
				affectedNodeIds: [directoryNodeId],
				attemptId: attempt.attemptId,
				path: materializeNodePath(this.#state, directoryNodeId),
				projectionChanged: this.isDirectoryProjectionVisible(directoryNodeId),
				stale: !applied
			})));
			return applied;
		});
	}
	failChildLoad(attempt, errorMessage) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.failChildLoad", () => {
			const directoryNodeId = this.resolveActiveDirectoryNodeId(attempt.nodeId);
			if (directoryNodeId == null) return false;
			const previousVisibleCount = getVisibleCount(this.#state);
			const applied = failDirectoryLoad(this.#state, directoryNodeId, attempt.attemptId, errorMessage);
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createFailChildLoadEvent({
				affectedAncestorIds: collectAncestorIds(this.#state, directoryNodeId),
				affectedNodeIds: [directoryNodeId],
				attemptId: attempt.attemptId,
				errorMessage,
				path: materializeNodePath(this.#state, directoryNodeId),
				projectionChanged: this.isDirectoryProjectionVisible(directoryNodeId),
				stale: !applied
			})));
			return applied;
		});
	}
	cleanup(options = {}) {
		return withBenchmarkPhase(this.#state.instrumentation, "store.cleanup", () => {
			if (this.#state.transactionStack.length > 0) throw new Error("Cleanup cannot run during an open batch or transaction.");
			if (hasActiveCleanupBlockingLoads(this.#state)) throw new Error("Cleanup cannot run while directory loads are active.");
			const previousVisibleCount = getVisibleCount(this.#state);
			const result = cleanupPathStoreState(this.#state, options.mode ?? "stable");
			recordEvent(this.#state, finalizeEvent(this.#state, previousVisibleCount, createCleanupEvent({
				...result,
				affectedAncestorIds: [],
				affectedNodeIds: [],
				projectionChanged: result.idsPreserved === false
			})));
			return result;
		});
	}
	getNodeCount() {
		return this.#state.activeNodeCount;
	}
	initializeExpandedPaths(expandedPaths) {
		if (expandedPaths == null || expandedPaths.length === 0) return 0;
		let expandedDirectoryCount = 0;
		const previousChildOffsets = [];
		const previousNodeIds = [];
		let previousEndIndex = 0;
		let previousPath = null;
		const segmentTable = this.#state.snapshot.segmentTable;
		const segmentValues = segmentTable.valueById;
		const nodes = this.#state.snapshot.nodes;
		const targetSegmentSortKeyCache = /* @__PURE__ */ new Map();
		for (const path of expandedPaths) {
			if (previousPath != null && path < previousPath) {
				previousPath = null;
				previousEndIndex = 0;
				previousChildOffsets.length = 0;
				previousNodeIds.length = 0;
			}
			const endIndex = path.length > 0 && path.charCodeAt(path.length - 1) === 47 ? path.length - 1 : path.length;
			if (endIndex === 0) {
				previousPath = path;
				previousEndIndex = endIndex;
				previousChildOffsets.length = 0;
				previousNodeIds.length = 0;
				continue;
			}
			let sharedDepth = 0;
			let unsharedSegmentStart = 0;
			if (previousPath != null) {
				const compareLength = Math.min(endIndex, previousEndIndex);
				let prefixMatched = true;
				for (let charIndex = 0; charIndex < compareLength; charIndex += 1) {
					const charCode = path.charCodeAt(charIndex);
					if (charCode !== previousPath.charCodeAt(charIndex)) {
						prefixMatched = false;
						break;
					}
					if (charCode === 47) {
						sharedDepth += 1;
						unsharedSegmentStart = charIndex + 1;
					}
				}
				if (prefixMatched) {
					if (compareLength === previousEndIndex && endIndex > compareLength && path.charCodeAt(compareLength) === 47) {
						sharedDepth += 1;
						unsharedSegmentStart = compareLength + 1;
					} else if (compareLength === endIndex && previousEndIndex > compareLength && previousPath.charCodeAt(compareLength) === 47) {
						sharedDepth += 1;
						unsharedSegmentStart = endIndex + 1;
					}
				}
				sharedDepth = Math.min(sharedDepth, previousNodeIds.length);
			}
			let currentDirectoryId = sharedDepth === 0 ? this.#state.snapshot.rootId : previousNodeIds[sharedDepth - 1] ?? this.#state.snapshot.rootId;
			let resolvedDepth = sharedDepth;
			let foundDirectory = true;
			let segmentStart = unsharedSegmentStart;
			while (segmentStart <= endIndex) {
				const slashIndex = path.indexOf("/", segmentStart);
				const segmentEnd = slashIndex === -1 || slashIndex > endIndex ? endIndex : slashIndex;
				const segment = path.slice(segmentStart, segmentEnd);
				const childIds = getDirectoryIndex(this.#state, currentDirectoryId).childIds;
				const searchStartIndex = resolvedDepth === sharedDepth ? previousChildOffsets[resolvedDepth] ?? 0 : 0;
				let nextChildOffset = searchStartIndex;
				let nextNodeId;
				const targetSegmentSortKey = targetSegmentSortKeyCache.get(segment) ?? createSegmentSortKey(segment);
				targetSegmentSortKeyCache.set(segment, targetSegmentSortKey);
				const searchForSegment = (startIndex, endIndex$1) => {
					for (nextChildOffset = startIndex; nextChildOffset < endIndex$1; nextChildOffset += 1) {
						const candidateNodeId = childIds[nextChildOffset];
						const candidateNode = nodes[candidateNodeId];
						const candidateSegment = segmentValues[candidateNode.nameId];
						if (candidateSegment === segment) {
							nextNodeId = candidateNodeId;
							return true;
						}
						const orderComparison = compareSegmentSortKeys(getSegmentSortKey(segmentTable, candidateNode.nameId), targetSegmentSortKey);
						if (orderComparison > 0 || orderComparison === 0 && candidateSegment > segment) return false;
					}
					return false;
				};
				if (!searchForSegment(searchStartIndex, childIds.length) && searchStartIndex > 0) searchForSegment(0, searchStartIndex);
				if (nextNodeId === void 0) {
					foundDirectory = false;
					break;
				}
				if (!isDirectoryNode(requireNode(this.#state, nextNodeId))) {
					foundDirectory = false;
					break;
				}
				previousChildOffsets[resolvedDepth] = nextChildOffset;
				previousNodeIds[resolvedDepth] = nextNodeId;
				currentDirectoryId = nextNodeId;
				resolvedDepth += 1;
				if (segmentEnd === endIndex) break;
				segmentStart = segmentEnd + 1;
			}
			previousPath = path;
			previousEndIndex = endIndex;
			previousChildOffsets.length = resolvedDepth;
			previousNodeIds.length = resolvedDepth;
			if (!foundDirectory) {
				previousPath = null;
				previousEndIndex = 0;
				previousChildOffsets.length = 0;
				previousNodeIds.length = 0;
				continue;
			}
			for (let depthIndex = sharedDepth; depthIndex < resolvedDepth; depthIndex += 1) {
				const directoryNodeId = previousNodeIds[depthIndex];
				if (directoryNodeId == null) continue;
				const directoryNode = requireNode(this.#state, directoryNodeId);
				if (isDirectoryExpanded(this.#state, directoryNodeId, directoryNode)) continue;
				setDirectoryExpanded(this.#state, directoryNodeId, true, directoryNode);
				expandedDirectoryCount += 1;
			}
		}
		return expandedDirectoryCount;
	}
	hasAllDirectoriesExpanded() {
		for (const directoryNodeId of this.#state.snapshot.directories.keys()) {
			if (directoryNodeId === this.#state.snapshot.rootId) continue;
			const directoryNode = requireNode(this.#state, directoryNodeId);
			if (!isDirectoryExpanded(this.#state, directoryNodeId, directoryNode)) return false;
		}
		return true;
	}
	requireDirectoryNodeId(path) {
		const directoryNodeId = findNodeId(this.#state, path);
		if (directoryNodeId == null) throw new Error(`Path does not exist: "${path}"`);
		if (!isDirectoryNode(requireNode(this.#state, directoryNodeId))) throw new Error(`Path is not a directory: "${path}"`);
		return directoryNodeId;
	}
	resolveActiveDirectoryNodeId(directoryNodeId) {
		try {
			if (!isDirectoryNode(requireNode(this.#state, directoryNodeId))) throw new Error(`Node is not a directory: ${String(directoryNodeId)}`);
			return directoryNodeId;
		} catch {
			return null;
		}
	}
	isDirectoryProjectionVisible(directoryNodeId) {
		let currentNodeId = directoryNodeId;
		while (currentNodeId !== this.#state.snapshot.rootId) {
			const parentId = requireNode(this.#state, currentNodeId).parentId;
			if (parentId !== this.#state.snapshot.rootId) {
				const parentNode = requireNode(this.#state, parentId);
				const flattenedChildDirectoryId = getFlattenedChildDirectoryId(this.#state, parentId);
				if (!isDirectoryExpanded(this.#state, parentId, parentNode) && flattenedChildDirectoryId !== currentNodeId) return false;
			}
			currentNodeId = parentId;
		}
		return true;
	}
	validateChildPatch(directoryPath, patch) {
		new PathStore({
			paths: this.list(directoryPath),
			presorted: true,
			sort: this.#state.snapshot.options.sort
		}).batch(patch.operations);
	}
};
function assertOperationTargetsDirectory(directoryPath, operation) {
	switch (operation.type) {
		case "add":
		case "remove":
			if (!operation.path.startsWith(directoryPath) || operation.path === directoryPath) throw new Error(`Child patch operation must stay within ${directoryPath}: "${operation.path}"`);
			break;
		case "move":
			if (!operation.from.startsWith(directoryPath) || !operation.to.startsWith(directoryPath) || operation.from === directoryPath || operation.to === directoryPath) throw new Error(`Child patch move must stay within ${directoryPath}: "${operation.from}" -> "${operation.to}"`);
			break;
	}
}

//#endregion
//#region node_modules/@pierre/trees/dist/utils/getSelectionPath.js
const getSelectionPath = (path) => path.startsWith(FLATTENED_PREFIX) ? path.slice(FLATTENED_PREFIX.length) : path;

//#endregion
//#region node_modules/@pierre/trees/dist/utils/renameFileTreePaths.js
function splitPath(path) {
	const separatorIndex = path.lastIndexOf("/");
	if (separatorIndex < 0) return {
		parentPath: "",
		baseName: path
	};
	return {
		parentPath: path.slice(0, separatorIndex),
		baseName: path.slice(separatorIndex + 1)
	};
}
function joinPath(parentPath, baseName) {
	return parentPath === "" ? baseName : `${parentPath}/${baseName}`;
}
/**
* Computes a renamed file list using same-parent basename rename semantics.
*/
function renameFileTreePaths({ files, path, isFolder, nextBasename }) {
	const sourcePath = getSelectionPath(path);
	const trimmedBasename = nextBasename.trim();
	if (trimmedBasename.length === 0) return { error: "Name cannot be empty." };
	if (trimmedBasename.includes("/")) return { error: "Name cannot include \"/\"." };
	const { parentPath, baseName } = splitPath(sourcePath);
	if (trimmedBasename === baseName) return {
		nextFiles: files,
		sourcePath,
		destinationPath: sourcePath,
		isFolder
	};
	const destinationPath = joinPath(parentPath, trimmedBasename);
	const nextFiles = new Array(files.length);
	const seenPaths = /* @__PURE__ */ new Set();
	if (!isFolder) {
		const destinationPrefix$1 = `${destinationPath}/`;
		let renamed = false;
		for (let index = 0; index < files.length; index++) {
			const file = files[index];
			if (file !== sourcePath && file.startsWith(destinationPrefix$1)) return { error: `"${destinationPath}" already exists.` };
			const nextFile = file === sourcePath ? destinationPath : file;
			if (seenPaths.has(nextFile)) return { error: `"${destinationPath}" already exists.` };
			seenPaths.add(nextFile);
			nextFiles[index] = nextFile;
			if (file === sourcePath) renamed = true;
		}
		if (!renamed) return { error: "Could not find the selected file to rename." };
		return {
			nextFiles,
			sourcePath,
			destinationPath,
			isFolder
		};
	}
	const sourcePrefix = `${sourcePath}/`;
	const destinationPrefix = `${destinationPath}/`;
	let renamedPathCount = 0;
	for (let index = 0; index < files.length; index++) {
		const file = files[index];
		const isWithinRenamedFolder = file === sourcePath || file.startsWith(sourcePrefix);
		if (!isWithinRenamedFolder && (file === destinationPath || file.startsWith(destinationPrefix))) return { error: `"${destinationPath}" already exists.` };
		const nextFile = isWithinRenamedFolder ? `${destinationPath}${file.slice(sourcePath.length)}` : file;
		if (seenPaths.has(nextFile)) return { error: `"${destinationPath}" already exists.` };
		seenPaths.add(nextFile);
		nextFiles[index] = nextFile;
		if (isWithinRenamedFolder) renamedPathCount++;
	}
	if (renamedPathCount === 0) return { error: "Could not find the selected folder to rename." };
	return {
		nextFiles,
		sourcePath,
		destinationPath,
		isFolder
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/dragAndDrop.js
function isCanonicalDirectoryPath$1(path) {
	return path.endsWith("/");
}
function getPathBasename(path) {
	const trimmedPath = path.endsWith("/") ? path.slice(0, -1) : path;
	const lastSlashIndex = trimmedPath.lastIndexOf("/");
	const basename = lastSlashIndex < 0 ? trimmedPath : trimmedPath.slice(lastSlashIndex + 1);
	return path.endsWith("/") ? `${basename}/` : basename;
}
function normalizeDraggedPaths(paths) {
	const uniquePaths = [];
	const seenPaths = /* @__PURE__ */ new Set();
	for (const path of paths) {
		if (seenPaths.has(path)) continue;
		seenPaths.add(path);
		uniquePaths.push(path);
	}
	const keptPaths = /* @__PURE__ */ new Set();
	for (const path of uniquePaths.toSorted((left, right) => {
		if (left.length !== right.length) return left.length - right.length;
		return left.localeCompare(right);
	})) {
		const segments = (path.endsWith("/") ? path.slice(0, -1) : path).split("/");
		let hasSelectedAncestor = false;
		for (let index = 0; index < segments.length - 1; index += 1) {
			const ancestorPath = `${segments.slice(0, index + 1).join("/")}/`;
			if (!keptPaths.has(ancestorPath)) continue;
			hasSelectedAncestor = true;
			break;
		}
		if (hasSelectedAncestor) continue;
		keptPaths.add(path);
	}
	return uniquePaths.filter((path) => keptPaths.has(path));
}
function resolveDraggedPathsForStart(path, selectedPaths) {
	return selectedPaths.includes(path) ? normalizeDraggedPaths(selectedPaths) : [path];
}
function dropTargetsEqual(left, right) {
	if (left === right) return true;
	if (left == null || right == null) return false;
	return left.kind === right.kind && left.directoryPath === right.directoryPath && left.flattenedSegmentPath === right.flattenedSegmentPath && left.hoveredPath === right.hoveredPath;
}
function createDropContext(draggedPaths, target) {
	return {
		draggedPaths,
		target
	};
}
function isSelfOrDescendantDrop(draggedPaths, target) {
	if (target.kind !== "directory" || target.directoryPath == null) return false;
	for (const draggedPath of draggedPaths) {
		if (!isCanonicalDirectoryPath$1(draggedPath)) continue;
		if (target.directoryPath === draggedPath || target.directoryPath.startsWith(draggedPath)) return true;
	}
	return false;
}
function resolveMoveDestinationPath(sourcePath, target) {
	if (target.kind === "root" || target.directoryPath == null) return getPathBasename(sourcePath);
	return target.directoryPath;
}
function buildDropOperations(draggedPaths, target) {
	const operations = draggedPaths.map((draggedPath) => {
		const destinationPath = resolveMoveDestinationPath(draggedPath, target);
		if (destinationPath === draggedPath) return null;
		return {
			from: draggedPath,
			to: destinationPath,
			type: "move"
		};
	}).filter((operation) => {
		return operation != null;
	});
	if (operations.length === 0) return null;
	return {
		operations,
		result: {
			draggedPaths,
			operation: operations.length === 1 ? "move" : "batch",
			target
		}
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/inputResolution.js
function haveMatchingPaths(currentPaths, preparedPaths) {
	if (currentPaths === preparedPaths) return true;
	if (currentPaths.length !== preparedPaths.length) return false;
	for (let index = 0; index < currentPaths.length; index += 1) if (currentPaths[index] !== preparedPaths[index]) return false;
	return true;
}
function resolveFileTreeInput(options, context, sort) {
	const { paths, preparedInput } = options;
	if (preparedInput == null) {
		if (paths == null) throw new Error("FileTree requires paths or preparedInput");
		return {
			paths,
			preparedInput: void 0
		};
	}
	const preparedPaths = preparedInput.paths;
	if (paths == null) return {
		paths: preparedPaths,
		preparedInput
	};
	if (!haveMatchingPaths(PathStore.preparePaths(paths, sort == null ? {} : { sort }), preparedPaths)) throw new Error(`FileTree ${context} received paths and preparedInput for different path lists`);
	return {
		paths: preparedPaths,
		preparedInput
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/mutationEvents.js
function isPathMutationEvent(event) {
	return event.operation === "add" || event.operation === "remove" || event.operation === "move" || event.operation === "batch";
}
function remapMovedPath(path, fromPath, toPath) {
	if (path === fromPath) return toPath;
	const descendantPrefix = fromPath.endsWith("/") ? fromPath : `${fromPath}/`;
	if (!path.startsWith(descendantPrefix)) return path;
	return `${toPath.endsWith("/") ? toPath : `${toPath}/`}${path.slice(descendantPrefix.length)}`;
}
function isPathRemoved(path, removedPath) {
	if (path === removedPath) return true;
	const descendantPrefix = removedPath.endsWith("/") ? removedPath : `${removedPath}/`;
	return path.startsWith(descendantPrefix);
}
function remapPathThroughMutation(path, event, preserveRemovedPath = false) {
	if (path == null) return null;
	switch (event.operation) {
		case "add":
		case "expand":
		case "collapse":
		case "mark-directory-unloaded":
		case "begin-child-load":
		case "apply-child-patch":
		case "complete-child-load":
		case "fail-child-load":
		case "cleanup": return path;
		case "remove": return isPathRemoved(path, event.path) ? preserveRemovedPath ? path : null : path;
		case "move": return remapMovedPath(path, event.from, event.to);
		case "batch": {
			let nextPath = path;
			for (const childEvent of event.events) {
				nextPath = remapPathThroughMutation(nextPath, childEvent, preserveRemovedPath);
				if (nextPath == null) return null;
			}
			return nextPath;
		}
	}
}
function createMutationInvalidation(event) {
	return {
		canonicalChanged: event.canonicalChanged,
		projectionChanged: event.projectionChanged,
		visibleCountDelta: event.visibleCountDelta
	};
}
function toTreesMutationSemanticEvent(event) {
	switch (event.operation) {
		case "add": return {
			...createMutationInvalidation(event),
			operation: "add",
			path: event.path
		};
		case "remove": return {
			...createMutationInvalidation(event),
			operation: "remove",
			path: event.path,
			recursive: event.recursive
		};
		case "move": return {
			...createMutationInvalidation(event),
			from: event.from,
			operation: "move",
			to: event.to
		};
	}
}
function toTreesBatchEvent(event) {
	return {
		...createMutationInvalidation(event),
		events: event.events.filter((childEvent) => childEvent.operation === "add" || childEvent.operation === "remove" || childEvent.operation === "move").map((childEvent) => toTreesMutationSemanticEvent(childEvent)),
		operation: "batch"
	};
}
function toTreesMutationEvent(event) {
	switch (event.operation) {
		case "add":
		case "remove":
		case "move": return toTreesMutationSemanticEvent(event);
		case "batch": return toTreesBatchEvent(event);
		default: return null;
	}
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/pathHelpers.js
function arePathSetsEqual(currentPaths, nextPaths) {
	if (currentPaths.size !== nextPaths.length) return false;
	for (const path of nextPaths) if (!currentPaths.has(path)) return false;
	return true;
}
function getAncestorDirectoryPaths$1(path) {
	const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
	if (normalizedPath.length === 0) return [];
	const segments = normalizedPath.split("/");
	return segments.slice(0, -1).map((_, index) => `${segments.slice(0, index + 1).join("/")}/`);
}
function getImmediateParentPath(path) {
	return getAncestorDirectoryPaths$1(path).at(-1) ?? null;
}
function getSiblingComparisonKey(path, parentPath) {
	if (parentPath == null) return path;
	return path.startsWith(parentPath) ? path.slice(parentPath.length) : path;
}
function isCanonicalDirectoryPath(path) {
	return path.endsWith("/");
}
const toLowerCaseSearchPath = (path) => path.toLowerCase();

//#endregion
//#region node_modules/@pierre/trees/dist/model/renameHelpers.js
function getRenameLeafName(path) {
	const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
	const separatorIndex = normalizedPath.lastIndexOf("/");
	return separatorIndex < 0 ? normalizedPath : normalizedPath.slice(separatorIndex + 1);
}
function toRenameHelperPath(path) {
	return path.endsWith("/") ? path.slice(0, -1) : path;
}
function toCanonicalRenamePath(path, isFolder) {
	return isFolder && !path.endsWith("/") ? `${path}/` : path;
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/searchHelpers.js
const normalizeSearchQuery = (value) => {
	const trimmedValue = value.trim();
	if (trimmedValue.length === 0) return "";
	return (trimmedValue.includes("\\") ? trimmedValue.replaceAll("\\", "/") : trimmedValue).toLowerCase();
};

//#endregion
//#region node_modules/@pierre/trees/dist/model/FileTreeController.js
const FILE_TREE_RENAME_VIEW = Symbol("FILE_TREE_RENAME_VIEW");
const INITIAL_PROJECTION_ROW_LIMIT = 512;
const CONTEXT_VISIBLE_ROW_RANGE_LIMIT = 512;
function normalizeScrollOffset(offset) {
	return offset === "top" || offset === "center" ? offset : "nearest";
}
function resolveFocusedIndexByLookup(rowCount, getVisibleIndex, candidatePath) {
	if (rowCount === 0) return -1;
	if (candidatePath != null) {
		const directIndex = getVisibleIndex(candidatePath);
		if (directIndex != null) return directIndex;
		const ancestorPaths = getAncestorDirectoryPaths$1(candidatePath);
		for (let index = ancestorPaths.length - 1; index >= 0; index -= 1) {
			const ancestorPath = ancestorPaths[index];
			if (ancestorPath == null) continue;
			const ancestorIndex = getVisibleIndex(ancestorPath);
			if (ancestorIndex != null) return ancestorIndex;
		}
	}
	return 0;
}
function createVisibleProjection(projection, focusedPathCandidate, resolveVisibleIndexByPath) {
	if (projection.paths.length === 0) return {
		focusedIndex: -1,
		getParentIndex: projection.getParentIndex,
		paths: projection.paths,
		posInSetByIndex: projection.posInSetByIndex,
		setSizeByIndex: projection.setSizeByIndex
	};
	if (focusedPathCandidate == null) return {
		focusedIndex: 0,
		getParentIndex: projection.getParentIndex,
		paths: projection.paths,
		posInSetByIndex: projection.posInSetByIndex,
		setSizeByIndex: projection.setSizeByIndex
	};
	const getVisibleIndex = resolveVisibleIndexByPath ?? ((path) => projection.visibleIndexByPath.get(path) ?? null);
	return {
		focusedIndex: resolveFocusedIndexByLookup(projection.paths.length, getVisibleIndex, focusedPathCandidate),
		getParentIndex: projection.getParentIndex,
		paths: projection.paths,
		posInSetByIndex: projection.posInSetByIndex,
		setSizeByIndex: projection.setSizeByIndex
	};
}
/**
* Owns the live PathStore instance and exposes a path-first boundary without
* leaking internal store IDs.
*/
var FileTreeController = class {
	#baseOptions;
	#listeners = /* @__PURE__ */ new Set();
	#mutationListeners = /* @__PURE__ */ new Map();
	#dragAndDropConfig = null;
	#dragSession = null;
	#ancestorIndicesByIndex = /* @__PURE__ */ new Map();
	#ancestorPathsByIndex = /* @__PURE__ */ new Map();
	#focusedIndex = -1;
	#focusedPath = null;
	#hasFullProjection = false;
	#getParentIndexForVisibleRow = (_index) => -1;
	#itemHandles = /* @__PURE__ */ new Map();
	#knownDirectoryPaths = null;
	#knownDirectoryPathsLowerCase = null;
	#knownPaths = null;
	#listedPaths = null;
	#listedPathsLowerCase = null;
	#onRename;
	#onRenameError;
	#onSearchChange;
	#projectionPaths = [];
	#projectionPosInSetByIndex = new Int32Array(0);
	#projectionSetSizeByIndex = new Int32Array(0);
	#renameCanRename = void 0;
	#renameEnabled = false;
	#renamingPath = null;
	#renamingValue = "";
	#removeRenamingPathIfCanceled = false;
	#searchMatchPathSet = /* @__PURE__ */ new Set();
	#searchMatchingPaths = [];
	#searchMode;
	#searchPreviousExpandedPaths = null;
	#searchValue = null;
	#searchVisiblePathSet = null;
	#searchVisibleIndexByPath = null;
	#searchVisibleIndices = null;
	#searchVisiblePaths = null;
	#scrollRequest = null;
	#scrollRequestId = 0;
	#selectionAnchorPath = null;
	#selectedPaths = /* @__PURE__ */ new Set();
	#selectionVersion = 0;
	#store;
	#storeVisibleCount = 0;
	#suppressStoreNotifications = false;
	#visibleCount = 0;
	#unsubscribe;
	constructor(options) {
		const { dragAndDrop, fileTreeSearchMode, initialSearchQuery, initialSelectedPaths, renaming, onSearchChange, paths, preparedInput, ...baseOptions } = options;
		const resolvedInput = resolveFileTreeInput({
			paths,
			preparedInput
		}, "constructor", baseOptions.sort);
		this.#baseOptions = baseOptions;
		if (dragAndDrop != null && dragAndDrop !== false) this.#dragAndDropConfig = dragAndDrop === true ? {} : dragAndDrop;
		this.#renameEnabled = renaming != null && renaming !== false;
		if (renaming != null && renaming !== false && renaming !== true) {
			this.#renameCanRename = renaming.canRename;
			this.#onRenameError = renaming.onError;
			this.#onRename = renaming.onRename;
		}
		this.#onSearchChange = onSearchChange;
		this.#searchMode = fileTreeSearchMode ?? "hide-non-matches";
		this.#store = this.#createStore(resolvedInput.paths, resolvedInput.preparedInput);
		const resolvedInitialSelectedPaths = initialSelectedPaths?.map((path) => this.#resolveSelectionPath(path)).filter((resolved) => resolved != null) ?? [];
		const initialFocusedPath = resolvedInitialSelectedPaths.at(-1) ?? null;
		if (resolvedInitialSelectedPaths.length > 0) {
			this.#selectedPaths = new Set(resolvedInitialSelectedPaths);
			this.#selectionAnchorPath = initialFocusedPath;
			this.#selectionVersion = 1;
		}
		this.#rebuildVisibleProjection(initialFocusedPath, false);
		if (initialSearchQuery != null) this.#setSearchState(initialSearchQuery, false);
		this.#unsubscribe = this.#subscribe();
	}
	destroy() {
		this.#unsubscribe?.();
		this.#unsubscribe = null;
		this.#mutationListeners.clear();
		this.#listeners.clear();
		this.#itemHandles.clear();
		this.#dragSession = null;
		this.#invalidateKnownPathCaches();
	}
	focusFirstItem() {
		if (this.#getCurrentVisiblePaths().length > 0) this.#setFocusedIndex(0);
	}
	focusLastItem() {
		if (this.#visibleCount <= 0) return;
		this.#ensureFullProjection();
		this.#setFocusedIndex(this.#visibleCount - 1);
	}
	focusNextItem() {
		this.#moveFocus(1);
	}
	focusParentItem() {
		if (this.#focusedPath == null) return;
		const parentPath = getImmediateParentPath(this.#focusedPath);
		if (parentPath == null) return;
		const nextFocusedIndex = this.#resolveFocusedIndex(parentPath);
		if (nextFocusedIndex >= 0) this.#setFocusedIndex(nextFocusedIndex);
	}
	focusPath(path) {
		const resolvedPath = this.#store.getPathInfo(path)?.path ?? null;
		if (resolvedPath == null) return;
		this.#ensureFullProjection();
		const nextFocusedIndex = this.#resolveFocusedIndex(resolvedPath);
		if (nextFocusedIndex >= 0) this.#setFocusedIndex(nextFocusedIndex);
	}
	scrollToPath(path, options) {
		const resolvedPath = this.#store.getPathInfo(path)?.path ?? null;
		if (resolvedPath == null) return;
		this.#ensureFullProjection();
		const targetIndex = this.#getExactCurrentVisibleIndexByPath(resolvedPath);
		if (targetIndex < 0) return;
		if (this.#resolveVisiblePathAtIndex(targetIndex) == null) return;
		if (options?.focus !== false) this.#setFocusedIndex(targetIndex, false);
		this.#scrollRequest = {
			id: this.#scrollRequestId += 1,
			offset: normalizeScrollOffset(options?.offset),
			visibleIndex: targetIndex
		};
		this.#emit();
	}
	focusMountedPathFromInput(path) {
		const resolvedPath = this.#store.getPathInfo(path)?.path ?? null;
		if (resolvedPath == null) return;
		const nextFocusedIndex = this.#resolveFocusedIndex(resolvedPath);
		if (nextFocusedIndex >= 0) this.#setFocusedIndex(nextFocusedIndex);
	}
	focusNearestPath(path) {
		const nextPath = this.resolveNearestVisiblePath(path);
		if (nextPath == null) return null;
		const nextFocusedIndex = this.#resolveFocusedIndex(nextPath);
		if (nextFocusedIndex >= 0) {
			this.#setFocusedIndex(nextFocusedIndex);
			return this.#getCurrentVisiblePaths()[nextFocusedIndex] ?? nextPath;
		}
		return null;
	}
	focusPreviousItem() {
		this.#moveFocus(-1);
	}
	getFocusedIndex() {
		return this.#focusedIndex;
	}
	getFocusedItem() {
		return this.#focusedPath == null ? null : this.#getOrCreateItemHandle(this.#focusedPath);
	}
	getFocusedPath() {
		return this.#focusedPath;
	}
	getScrollRequest() {
		return this.#scrollRequest;
	}
	clearScrollRequest(id) {
		if (this.#scrollRequest?.id === id) this.#scrollRequest = null;
	}
	resolveNearestVisiblePath(path) {
		const currentVisiblePaths = this.#getCurrentVisiblePaths();
		if (this.#visibleCount === 0) return null;
		if (path == null) return this.#focusedPath ?? currentVisiblePaths[0] ?? null;
		const resolvedPath = this.#store.getPathInfo(path)?.path ?? path;
		const directIndex = this.#resolveFocusedIndex(resolvedPath);
		if (directIndex >= 0) return currentVisiblePaths[directIndex] ?? resolvedPath;
		const siblingPath = this.#findNearestVisibleSiblingPath(resolvedPath);
		if (siblingPath != null) return siblingPath;
		return this.#focusedPath ?? currentVisiblePaths[0] ?? null;
	}
	getSelectedPaths() {
		return [...this.#selectedPaths];
	}
	getSelectionVersion() {
		return this.#selectionVersion;
	}
	getVisibleCount() {
		return this.#visibleCount;
	}
	getVisibleRows(start, end) {
		if (end < start || this.#visibleCount === 0) return [];
		const boundedStart = Math.max(0, start);
		const boundedEnd = Math.min(this.#visibleCount - 1, end);
		if (boundedEnd < boundedStart) return [];
		const boundedLength = boundedEnd - boundedStart + 1;
		if (this.#searchVisibleIndices == null && !this.#hasFullProjection && boundedEnd >= this.#projectionPaths.length && boundedLength <= CONTEXT_VISIBLE_ROW_RANGE_LIMIT) {
			const rows = [];
			for (let index = boundedStart; index <= boundedEnd; index += 1) {
				const context = this.#store.getVisibleRowContext(index);
				if (context == null) break;
				rows.push(this.#createVisibleRowFromContext(context));
			}
			return rows;
		}
		if (!this.#hasFullProjection && boundedEnd >= this.#projectionPaths.length) this.#ensureFullProjection();
		if (this.#searchVisibleIndices != null) {
			const projectionIndices = Array.from({ length: boundedEnd - boundedStart + 1 }, (_, visibleOffset) => this.#getProjectionIndexFromVisibleIndex(boundedStart + visibleOffset));
			const visibleRowByProjectionIndex = /* @__PURE__ */ new Map();
			let runStartIndex = projectionIndices[0] ?? -1;
			let runEndIndex = runStartIndex;
			for (let index = 1; index <= projectionIndices.length; index += 1) {
				const projectionIndex = projectionIndices[index];
				if (projectionIndex != null && projectionIndex === runEndIndex + 1) {
					runEndIndex = projectionIndex;
					continue;
				}
				if (runStartIndex >= 0) this.#store.getVisibleSlice(runStartIndex, runEndIndex).forEach((row, offset) => {
					visibleRowByProjectionIndex.set(runStartIndex + offset, row);
				});
				if (projectionIndex == null) {
					runStartIndex = -1;
					runEndIndex = -1;
					continue;
				}
				runStartIndex = projectionIndex;
				runEndIndex = projectionIndex;
			}
			return Array.from({ length: boundedEnd - boundedStart + 1 }, (_, visibleOffset) => {
				const visibleIndex = boundedStart + visibleOffset;
				const projectionIndex = this.#getProjectionIndexFromVisibleIndex(visibleIndex);
				const row = visibleRowByProjectionIndex.get(projectionIndex);
				const projectionPath = this.#projectionPaths[projectionIndex];
				if (row == null || projectionPath == null) throw new Error(`Missing projection row for filtered visible index ${String(visibleIndex)}`);
				return this.#createVisibleRow(row, visibleIndex, projectionIndex, {
					ancestorPaths: this.#getAncestorPaths(projectionIndex),
					path: projectionPath
				});
			});
		}
		return this.#store.getVisibleSlice(boundedStart, boundedEnd).map((row, offset) => {
			const index = boundedStart + offset;
			const projectionPath = this.#projectionPaths[index];
			if (projectionPath == null) throw new Error(`Missing projection path for visible index ${String(index)}`);
			return this.#createVisibleRow(row, index, index, {
				ancestorPaths: this.#getAncestorPaths(index),
				path: projectionPath
			});
		});
	}
	getStickyRowCandidates(scrollTop, itemHeight) {
		if (this.#searchVisibleIndices != null) return null;
		if (this.#visibleCount === 0 || scrollTop <= 0 || itemHeight <= 0) return [];
		const stickyRows = [];
		for (let slotDepth = 0; slotDepth < this.#visibleCount; slotDepth += 1) {
			const slotTop = scrollTop + slotDepth * itemHeight;
			const thresholdIndex = Math.min(this.#visibleCount - 1, Math.floor(slotTop / itemHeight));
			const candidateContext = this.#getStickyCandidateContextAt(thresholdIndex, slotDepth) ?? (thresholdIndex > 0 ? this.#getStickyCandidateContextAt(thresholdIndex - 1, slotDepth) : void 0);
			if (candidateContext == null) break;
			stickyRows.push({
				row: this.#createVisibleRowFromContext(candidateContext),
				subtreeEndIndex: candidateContext.subtreeEndIndex
			});
		}
		return stickyRows;
	}
	/**
	* Returns the item handle for the given path.
	*
	* Accepts both canonical directory paths (`src/`) and bare directory lookup
	* paths (`src`) so callers do not need to know the canonical slash rules.
	*/
	getItem(path) {
		const itemInfo = this.#store.getPathInfo(path);
		return itemInfo == null ? null : this.#getOrCreateItemHandle(itemInfo.path, itemInfo);
	}
	resolveMountedDirectoryPathFromInput(path) {
		const pathInfo = this.#store.getPathInfo(path);
		return pathInfo?.kind === "directory" ? pathInfo.path : null;
	}
	toggleMountedDirectoryFromInput(path) {
		const directoryPath = this.resolveMountedDirectoryPathFromInput(path);
		if (directoryPath == null) return;
		this.#toggleDirectory(directoryPath);
	}
	selectAllVisiblePaths() {
		this.#ensureFullProjection();
		const nextSelectedPaths = [...this.#getCurrentVisiblePaths()];
		this.#applySelection(nextSelectedPaths, this.#focusedPath ?? this.#selectionAnchorPath);
	}
	selectOnlyPath(path) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null) return;
		this.#applySelection([resolvedPath], resolvedPath);
	}
	selectOnlyMountedPathFromInput(path) {
		this.#applySelection([path], path);
	}
	selectPath(path) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null || this.#selectedPaths.has(resolvedPath)) return;
		this.#applySelection([...this.#selectedPaths, resolvedPath]);
	}
	deselectPath(path) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null || !this.#selectedPaths.has(resolvedPath)) return;
		this.#applySelection([...this.#selectedPaths].filter((selectedPath) => selectedPath !== resolvedPath));
	}
	toggleFocusedSelection() {
		if (this.#focusedPath == null) return;
		this.togglePathSelectionFromInput(this.#focusedPath);
	}
	togglePathSelection(path) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null) return;
		if (this.#selectedPaths.has(resolvedPath)) {
			this.deselectPath(resolvedPath);
			return;
		}
		this.selectPath(resolvedPath);
	}
	togglePathSelectionFromInput(path) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null) return;
		if (this.#selectedPaths.has(resolvedPath)) {
			this.#applySelection([...this.#selectedPaths].filter((selectedPath) => selectedPath !== resolvedPath), resolvedPath);
			return;
		}
		this.#applySelection([...this.#selectedPaths, resolvedPath], resolvedPath);
	}
	selectPathRange(path, unionSelection) {
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null) return;
		this.#ensureFullProjection();
		const anchorPath = this.#selectionAnchorPath;
		const anchorIndex = anchorPath == null ? -1 : this.#getVisibleIndexByPath(anchorPath);
		const targetIndex = this.#getVisibleIndexByPath(resolvedPath);
		if (anchorIndex === -1 || targetIndex === -1) {
			const nextSelectedPaths$1 = unionSelection ? [...this.#selectedPaths, resolvedPath] : [resolvedPath];
			this.#applySelection(nextSelectedPaths$1, resolvedPath);
			return;
		}
		const [startIndex, endIndex] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
		const rangePaths = this.#getCurrentVisiblePaths().slice(startIndex, endIndex + 1);
		const nextSelectedPaths = unionSelection ? [...this.#selectedPaths, ...rangePaths] : rangePaths;
		this.#applySelection(nextSelectedPaths, anchorPath);
	}
	extendSelectionFromFocused(offset) {
		if (this.#focusedPath == null) return;
		const focusedIndex = this.#focusedIndex;
		if (focusedIndex === -1) return;
		const nextIndex = Math.min(this.#visibleCount - 1, Math.max(0, focusedIndex + offset));
		if (nextIndex === focusedIndex) return;
		if (!this.#hasFullProjection && nextIndex >= this.#projectionPaths.length) this.#ensureFullProjection();
		const visiblePaths = this.#getCurrentVisiblePaths();
		const currentPath = visiblePaths[focusedIndex] ?? null;
		const nextPath = visiblePaths[nextIndex] ?? null;
		if (currentPath == null || nextPath == null) return;
		const nextSelectedPaths = new Set(this.#selectedPaths);
		if (nextSelectedPaths.has(currentPath) && nextSelectedPaths.has(nextPath)) nextSelectedPaths.delete(currentPath);
		else nextSelectedPaths.add(nextPath);
		this.#applySelection([...nextSelectedPaths], this.#selectionAnchorPath ?? currentPath, false);
		this.#setFocusedIndex(nextIndex);
	}
	getDragAndDropConfig() {
		return this.#dragAndDropConfig;
	}
	isDragAndDropEnabled() {
		return this.#dragAndDropConfig != null;
	}
	getDragSession() {
		if (this.#dragSession == null) return null;
		return {
			draggedPaths: [...this.#dragSession.draggedPaths],
			primaryPath: this.#dragSession.primaryPath,
			target: this.#dragSession.target == null ? null : { ...this.#dragSession.target }
		};
	}
	startDrag(path) {
		if (this.#dragAndDropConfig == null) return false;
		const resolvedPath = this.#resolveSelectionPath(path);
		if (resolvedPath == null) return false;
		if (this.#searchValue != null && this.#searchValue.length > 0) return false;
		const selectedPaths = this.getSelectedPaths();
		const draggedPaths = resolveDraggedPathsForStart(resolvedPath, selectedPaths);
		if (this.#dragAndDropConfig.canDrag?.(draggedPaths) === false) return false;
		if (!selectedPaths.includes(resolvedPath)) this.#applySelection([resolvedPath], resolvedPath, false);
		this.#focusPathWithoutEmit(resolvedPath);
		this.#dragSession = {
			draggedPaths,
			primaryPath: resolvedPath,
			target: null
		};
		this.#emit();
		return true;
	}
	setDragTarget(target) {
		const dragSession = this.#dragSession;
		if (dragSession == null) return;
		let nextTarget = target;
		if (nextTarget != null) {
			const context = createDropContext(dragSession.draggedPaths, nextTarget);
			if (isSelfOrDescendantDrop(dragSession.draggedPaths, nextTarget) || this.#dragAndDropConfig?.canDrop?.(context) === false) nextTarget = null;
		}
		if (dropTargetsEqual(dragSession.target, nextTarget)) return;
		this.#dragSession = {
			...dragSession,
			target: nextTarget
		};
		this.#emit();
	}
	cancelDrag() {
		if (this.#dragSession == null) return;
		this.#dragSession = null;
		this.#emit();
	}
	completeDrag() {
		const dragSession = this.#dragSession;
		if (dragSession == null) return false;
		this.#dragSession = null;
		const target = dragSession.target == null ? null : { ...dragSession.target };
		if (target == null) {
			this.#emit();
			return false;
		}
		const dropContext = createDropContext(dragSession.draggedPaths, target);
		if (isSelfOrDescendantDrop(dragSession.draggedPaths, target) || this.#dragAndDropConfig?.canDrop?.(dropContext) === false) {
			this.#emit();
			return false;
		}
		const dropPlan = buildDropOperations(dragSession.draggedPaths, target);
		if (dropPlan == null) {
			this.#emit();
			return false;
		}
		try {
			if (dropPlan.operations.length === 1) {
				const singleOperation = dropPlan.operations[0];
				if (singleOperation == null || singleOperation.type !== "move") throw new Error("Expected a single move operation for one-item drops");
				this.#store.move(singleOperation.from, singleOperation.to, { collision: singleOperation.collision });
			} else {
				this.#validateBatchDropOperations(dropPlan.operations);
				this.#store.batch(dropPlan.operations);
			}
		} catch (error) {
			this.#emit();
			this.#dragAndDropConfig?.onDropError?.(error instanceof Error ? error.message : String(error), dropContext);
			return false;
		}
		this.#dragAndDropConfig?.onDropComplete?.(dropPlan.result);
		return true;
	}
	subscribe(listener) {
		this.#listeners.add(listener);
		listener();
		return () => {
			this.#listeners.delete(listener);
		};
	}
	/**
	* Applies one file/directory addition through the shared mutation handle
	* without exposing the raw store to tree consumers.
	*/
	add(path) {
		this.#store.add(path);
	}
	remove(path, options = {}) {
		this.#store.remove(path, options);
	}
	move(fromPath, toPath, options = {}) {
		this.#store.move(fromPath, toPath, options);
	}
	batch(operations) {
		this.#store.batch(operations);
	}
	onMutation(type, handler) {
		const key = type;
		const typedHandler = handler;
		let listenersForType = this.#mutationListeners.get(key);
		if (listenersForType == null) {
			listenersForType = /* @__PURE__ */ new Set();
			this.#mutationListeners.set(key, listenersForType);
		}
		listenersForType.add(typedHandler);
		return () => {
			const registeredListeners = this.#mutationListeners.get(key);
			registeredListeners?.delete(typedHandler);
			if (registeredListeners?.size === 0) this.#mutationListeners.delete(key);
		};
	}
	setSearch(value) {
		this.#setSearchState(value, true);
	}
	openSearch(initialValue = "") {
		this.#setSearchState(initialValue, true);
	}
	closeSearch() {
		this.#setSearchState(null, true);
	}
	isSearchOpen() {
		return this.#searchValue !== null;
	}
	getSearchValue() {
		return this.#searchValue ?? "";
	}
	getSearchMatchingPaths() {
		return this.#searchMatchingPaths;
	}
	focusNextSearchMatch() {
		this.#focusRelativeSearchMatch(1);
	}
	focusPreviousSearchMatch() {
		this.#focusRelativeSearchMatch(-1);
	}
	startRenaming(path = this.#focusedPath ?? "", options = {}) {
		if (!this.#renameEnabled) return false;
		const itemInfo = this.#store.getPathInfo(path);
		if (itemInfo == null) return false;
		const canonicalPath = itemInfo.path;
		const isFolder = isCanonicalDirectoryPath(canonicalPath);
		const publicPath = toRenameHelperPath(canonicalPath);
		if (this.#renameCanRename?.({
			isFolder,
			path: publicPath
		}) === false) return false;
		for (const ancestorPath of getAncestorDirectoryPaths$1(canonicalPath)) if (!this.#store.isExpanded(ancestorPath)) this.#store.expand(ancestorPath);
		this.#applySelection([canonicalPath], canonicalPath, false);
		if (this.#searchValue != null) {
			this.#setSearchState(null, false);
			this.#onSearchChange?.(this.#searchValue);
		}
		this.#focusPathWithoutEmit(canonicalPath);
		this.#renamingPath = canonicalPath;
		this.#renamingValue = getRenameLeafName(canonicalPath);
		this.#removeRenamingPathIfCanceled = options.removeIfCanceled ?? false;
		this.#emit();
		return true;
	}
	[FILE_TREE_RENAME_VIEW]() {
		return {
			cancel: () => {
				this.#cancelRenaming();
			},
			commit: () => {
				this.#completeRenaming();
			},
			getPath: () => this.#renamingPath,
			getValue: () => this.#renamingValue,
			isActive: () => this.#renamingPath != null,
			setValue: (value) => {
				this.#setRenamingValue(value);
			}
		};
	}
	#cancelRenaming() {
		if (this.#renamingPath == null) return;
		const renamingPath = this.#renamingPath;
		const removePlaceholderEntry = this.#removeRenamingPathIfCanceled;
		this.#renamingPath = null;
		this.#renamingValue = "";
		this.#removeRenamingPathIfCanceled = false;
		if (removePlaceholderEntry) {
			this.remove(renamingPath, isCanonicalDirectoryPath(renamingPath) ? { recursive: true } : void 0);
			return;
		}
		this.#focusPathWithoutEmit(renamingPath);
		this.#emit();
	}
	#completeRenaming() {
		const renamingPath = this.#renamingPath;
		if (renamingPath == null) return;
		if (this.#removeRenamingPathIfCanceled && this.#renamingValue.trim().length === 0) {
			this.#renamingPath = null;
			this.#renamingValue = "";
			this.#removeRenamingPathIfCanceled = false;
			this.remove(renamingPath, isCanonicalDirectoryPath(renamingPath) ? { recursive: true } : void 0);
			return;
		}
		const isFolder = isCanonicalDirectoryPath(renamingPath);
		const result = renameFileTreePaths({
			files: this.#store.list(),
			isFolder,
			nextBasename: this.#renamingValue,
			path: toRenameHelperPath(renamingPath)
		});
		this.#renamingPath = null;
		this.#renamingValue = "";
		this.#removeRenamingPathIfCanceled = false;
		if ("error" in result) {
			this.#focusPathWithoutEmit(renamingPath);
			this.#onRenameError?.(result.error);
			this.#emit();
			return;
		}
		if (result.sourcePath === result.destinationPath) {
			this.#focusPathWithoutEmit(renamingPath);
			this.#emit();
			return;
		}
		this.#onRename?.({
			destinationPath: result.destinationPath,
			isFolder: result.isFolder,
			sourcePath: result.sourcePath
		});
		this.move(toCanonicalRenamePath(result.sourcePath, isFolder), toCanonicalRenamePath(result.destinationPath, isFolder));
	}
	#setRenamingValue(value) {
		if (this.#renamingPath == null || this.#renamingValue === value) return;
		this.#renamingValue = value;
		this.#emit();
	}
	/**
	* Rebuilds the controller around a new full path set. This is intentionally a
	* coarse whole-tree reset path rather than a localized mutation fast path.
	*/
	resetPaths(paths, options = {}) {
		const previousPathCount = this.#store.list().length;
		const previousVisibleCount = this.#visibleCount;
		const resolvedInput = resolveFileTreeInput({
			paths,
			preparedInput: options.preparedInput
		}, "resetPaths", this.#baseOptions.sort);
		const nextStore = this.#createStore(resolvedInput.paths, resolvedInput.preparedInput, options.initialExpandedPaths);
		const previousFocusedPath = this.#focusedPath;
		const previousRenamingPath = this.#renamingPath;
		const previousSelectedPaths = this.getSelectedPaths();
		const previousSelectionAnchorPath = this.#selectionAnchorPath;
		this.#unsubscribe?.();
		this.#store = nextStore;
		this.#itemHandles.clear();
		this.#invalidateKnownPathCaches();
		const nextSelectedPaths = previousSelectedPaths.map((selectedPath) => nextStore.getPathInfo(selectedPath)?.path ?? null).filter((resolved) => resolved != null);
		const selectionChanged = !arePathSetsEqual(this.#selectedPaths, nextSelectedPaths);
		this.#selectedPaths = new Set(nextSelectedPaths);
		if (selectionChanged) this.#selectionVersion += 1;
		this.#selectionAnchorPath = previousSelectionAnchorPath == null ? null : nextStore.getPathInfo(previousSelectionAnchorPath)?.path ?? null;
		this.#renamingPath = previousRenamingPath == null ? null : nextStore.getPathInfo(previousRenamingPath)?.path ?? null;
		if (this.#renamingPath == null) {
			this.#renamingValue = "";
			this.#removeRenamingPathIfCanceled = false;
		}
		this.#rebuildVisibleProjection(previousFocusedPath, previousFocusedPath != null || nextSelectedPaths.length > 0 || this.#selectionAnchorPath != null);
		this.#unsubscribe = this.#subscribe();
		this.#emit();
		this.#emitMutation({
			canonicalChanged: true,
			operation: "reset",
			pathCountAfter: resolvedInput.paths.length,
			pathCountBefore: previousPathCount,
			projectionChanged: true,
			usedPreparedInput: options.preparedInput != null,
			visibleCountDelta: this.#visibleCount - previousVisibleCount
		});
	}
	#findNearestVisibleSiblingPath(path) {
		this.#ensureFullProjection();
		const parentPath = getImmediateParentPath(path);
		const candidateKey = getSiblingComparisonKey(path, parentPath);
		let previousSiblingPath = null;
		let nextSiblingPath = null;
		for (const siblingPath of this.#getCurrentVisiblePaths()) {
			if (getImmediateParentPath(siblingPath) !== parentPath) continue;
			const siblingKey = getSiblingComparisonKey(siblingPath, parentPath);
			if (siblingKey < candidateKey) {
				previousSiblingPath = siblingPath;
				continue;
			}
			if (siblingKey > candidateKey) {
				nextSiblingPath = siblingPath;
				break;
			}
		}
		return previousSiblingPath ?? nextSiblingPath;
	}
	#resolveFocusedIndex(path) {
		const directIndex = this.#getVisibleIndexByPath(path);
		if (directIndex !== -1) return directIndex;
		const ancestorPaths = getAncestorDirectoryPaths$1(path);
		for (let index = ancestorPaths.length - 1; index >= 0; index -= 1) {
			const ancestorPath = ancestorPaths[index];
			if (ancestorPath == null) continue;
			const ancestorIndex = this.#getVisibleIndexByPath(ancestorPath);
			if (ancestorIndex !== -1) return ancestorIndex;
		}
		return this.#getCurrentVisiblePaths().length > 0 ? 0 : -1;
	}
	#getOrCreateItemHandle(path, itemInfo) {
		const cachedHandle = this.#itemHandles.get(path);
		if (cachedHandle != null) return cachedHandle;
		const resolvedItemInfo = itemInfo ?? this.#store.getPathInfo(path);
		if (resolvedItemInfo == null) return null;
		const handle = resolvedItemInfo.kind === "directory" ? this.#createDirectoryHandle(resolvedItemInfo.path) : this.#createFileHandle(resolvedItemInfo.path);
		this.#itemHandles.set(resolvedItemInfo.path, handle);
		return handle;
	}
	#createVisibleRow(row, visibleIndex, projectionIndex, projection) {
		return {
			ancestorPaths: projection.ancestorPaths,
			depth: row.depth,
			flattenedSegments: row.flattenedSegments?.map((segment) => ({
				isTerminal: segment.isTerminal,
				name: segment.name,
				path: segment.path
			})),
			hasChildren: row.hasChildren,
			index: visibleIndex,
			isExpanded: row.isExpanded,
			isFlattened: row.isFlattened,
			isFocused: projection.path === this.#focusedPath,
			isSelected: this.#selectedPaths.has(projection.path),
			kind: row.kind,
			level: row.depth,
			name: row.name,
			path: projection.path,
			posInSet: projection.posInSet ?? this.#projectionPosInSetByIndex[projectionIndex] ?? 0,
			setSize: projection.setSize ?? this.#projectionSetSizeByIndex[projectionIndex] ?? 0
		};
	}
	#createVisibleRowFromContext(context) {
		return this.#createVisibleRow(context.row, context.index, context.index, {
			ancestorPaths: context.ancestorPaths,
			path: context.row.path,
			posInSet: context.posInSet,
			setSize: context.setSize
		});
	}
	#getStickyCandidateContextAt(index, slotDepth) {
		const context = this.#store.getVisibleRowContext(index);
		if (context == null) return;
		const ancestorRow = context.ancestorRows[slotDepth];
		if (ancestorRow != null) return ancestorRow;
		return slotDepth === context.ancestorRows.length && context.row.kind === "directory" && context.row.isExpanded ? context : void 0;
	}
	#getAncestorIndices(index) {
		const cached = this.#ancestorIndicesByIndex.get(index);
		if (cached != null) return cached;
		const parentIndex = this.#getParentIndexForVisibleRow(index);
		const ancestorIndices = parentIndex < 0 ? [] : [...this.#getAncestorIndices(parentIndex), parentIndex];
		this.#ancestorIndicesByIndex.set(index, ancestorIndices);
		return ancestorIndices;
	}
	#getAncestorPaths(index) {
		const cached = this.#ancestorPathsByIndex.get(index);
		if (cached != null) return cached;
		const ancestorPaths = this.#getAncestorIndices(index).map((ancestorIndex) => this.#projectionPaths[ancestorIndex] ?? "").filter((path) => path !== "");
		this.#ancestorPathsByIndex.set(index, ancestorPaths);
		return ancestorPaths;
	}
	#collapseDirectory(path) {
		this.#store.collapse(path);
	}
	#applySelection(nextSelectedPaths, nextAnchorPath = this.#selectionAnchorPath, emit = true) {
		const uniqueSelectedPaths = [...new Set(nextSelectedPaths)];
		const selectionChanged = !arePathSetsEqual(this.#selectedPaths, uniqueSelectedPaths);
		const anchorChanged = this.#selectionAnchorPath !== nextAnchorPath;
		if (!selectionChanged && !anchorChanged) return;
		this.#selectedPaths = new Set(uniqueSelectedPaths);
		this.#selectionAnchorPath = nextAnchorPath;
		if (selectionChanged) this.#selectionVersion += 1;
		if (emit) this.#emit();
	}
	#createDirectoryHandle(path) {
		return {
			collapse: () => {
				this.#collapseDirectory(path);
			},
			deselect: () => {
				this.deselectPath(path);
			},
			expand: () => {
				this.#expandDirectory(path);
			},
			focus: () => {
				this.focusPath(path);
			},
			getPath: () => path,
			isDirectory: () => true,
			isExpanded: () => this.#store.isExpanded(path),
			isFocused: () => this.#focusedPath === path,
			isSelected: () => this.#selectedPaths.has(path),
			select: () => {
				this.selectPath(path);
			},
			toggleSelect: () => {
				this.togglePathSelection(path);
			},
			toggle: () => {
				this.#toggleDirectory(path);
			}
		};
	}
	#createFileHandle(path) {
		return {
			deselect: () => {
				this.deselectPath(path);
			},
			focus: () => {
				this.focusPath(path);
			},
			getPath: () => path,
			isDirectory: () => false,
			isFocused: () => this.#focusedPath === path,
			isSelected: () => this.#selectedPaths.has(path),
			select: () => {
				this.selectPath(path);
			},
			toggleSelect: () => {
				this.togglePathSelection(path);
			}
		};
	}
	#validateBatchDropOperations(operations) {
		const currentPaths = this.#store.list();
		this.#createStore(currentPaths).batch(operations);
	}
	#createStore(paths, preparedInput, initialExpandedPathsOverride) {
		return new PathStore({
			...this.#baseOptions,
			paths,
			preparedInput: preparedInput == null ? void 0 : preparedInput,
			...initialExpandedPathsOverride !== void 0 ? { initialExpandedPaths: initialExpandedPathsOverride } : {}
		});
	}
	#getListedPaths() {
		if (this.#listedPaths != null) return this.#listedPaths;
		this.#listedPaths = this.#store.list();
		return this.#listedPaths;
	}
	#getAllKnownPaths() {
		if (this.#knownPaths != null) return this.#knownPaths;
		const knownPaths = /* @__PURE__ */ new Set();
		for (const path of this.#getListedPaths()) {
			knownPaths.add(path);
			for (const ancestorPath of getAncestorDirectoryPaths$1(path)) knownPaths.add(ancestorPath);
		}
		this.#knownPaths = [...knownPaths].sort();
		return this.#knownPaths;
	}
	#getListedPathsLowerCase() {
		if (this.#listedPathsLowerCase != null) return this.#listedPathsLowerCase;
		this.#listedPathsLowerCase = this.#getListedPaths().map(toLowerCaseSearchPath);
		return this.#listedPathsLowerCase;
	}
	#getAllKnownDirectoryPaths() {
		if (this.#knownDirectoryPaths != null) return this.#knownDirectoryPaths;
		this.#knownDirectoryPaths = this.#getAllKnownPaths().filter((path) => path.endsWith("/"));
		return this.#knownDirectoryPaths;
	}
	#getAllKnownDirectoryPathsLowerCase() {
		if (this.#knownDirectoryPathsLowerCase != null) return this.#knownDirectoryPathsLowerCase;
		this.#knownDirectoryPathsLowerCase = this.#getAllKnownDirectoryPaths().map(toLowerCaseSearchPath);
		return this.#knownDirectoryPathsLowerCase;
	}
	#invalidateKnownPathCaches() {
		this.#knownDirectoryPaths = null;
		this.#knownDirectoryPathsLowerCase = null;
		this.#knownPaths = null;
		this.#listedPaths = null;
		this.#listedPathsLowerCase = null;
	}
	#getExpandedDirectoryPaths() {
		return this.#getAllKnownDirectoryPaths().filter((path) => this.#store.isExpanded(path));
	}
	#restoreSearchExpandedPaths(keepSelectedOpen) {
		const expandedPaths = new Set(this.#searchPreviousExpandedPaths ?? []);
		if (keepSelectedOpen) for (const selectedPath of this.#selectedPaths) for (const ancestorPath of getAncestorDirectoryPaths$1(selectedPath)) expandedPaths.add(ancestorPath);
		this.#setExpandedPaths(expandedPaths);
	}
	#setExpandedPaths(expandedPaths) {
		this.#suppressStoreNotifications = true;
		try {
			for (const directoryPath of this.#getAllKnownDirectoryPaths()) {
				const shouldExpand = expandedPaths.has(directoryPath);
				const isExpanded = this.#store.isExpanded(directoryPath);
				if (shouldExpand && !isExpanded) this.#store.expand(directoryPath);
				else if (!shouldExpand && isExpanded) this.#store.collapse(directoryPath);
			}
		} finally {
			this.#suppressStoreNotifications = false;
		}
	}
	#syncSearchVisibilityState() {
		if (this.#searchValue == null || this.#searchValue.length === 0) {
			this.#searchMatchingPaths = [];
			this.#searchVisibleIndices = null;
			this.#searchVisiblePaths = null;
			this.#searchVisibleIndexByPath = null;
			this.#visibleCount = this.#storeVisibleCount;
			return;
		}
		const currentVisiblePaths = this.#projectionPaths;
		this.#searchMatchingPaths = currentVisiblePaths.filter((path) => this.#searchMatchPathSet.has(path));
		if (this.#searchMode !== "hide-non-matches" || this.#searchMatchPathSet.size === 0) {
			this.#searchVisibleIndices = null;
			this.#searchVisiblePaths = null;
			this.#searchVisibleIndexByPath = null;
			this.#visibleCount = this.#storeVisibleCount;
			return;
		}
		const visibleIndices = [];
		const visiblePaths = [];
		const visibleIndexByPath = /* @__PURE__ */ new Map();
		for (const [index, path] of currentVisiblePaths.entries()) {
			if (this.#searchVisiblePathSet?.has(path) !== true) continue;
			visibleIndexByPath.set(path, visiblePaths.length);
			visibleIndices.push(index);
			visiblePaths.push(path);
		}
		this.#searchVisibleIndices = visibleIndices;
		this.#searchVisiblePaths = visiblePaths;
		this.#searchVisibleIndexByPath = visibleIndexByPath;
		this.#visibleCount = visiblePaths.length;
	}
	#getCurrentVisiblePaths() {
		return this.#searchVisiblePaths ?? this.#projectionPaths;
	}
	#getExactCurrentVisibleIndexByPath(path) {
		if (this.#searchVisiblePaths != null) return this.#searchVisibleIndexByPath?.get(path) ?? -1;
		return this.#store.getVisibleIndex(path) ?? -1;
	}
	#getProjectionIndexFromVisibleIndex(index) {
		return this.#searchVisibleIndices?.[index] ?? index;
	}
	#getVisibleIndexByPath(path) {
		const searchIndex = this.#searchVisibleIndexByPath?.get(path);
		if (searchIndex != null) return searchIndex;
		return this.#store.getVisibleIndex(path) ?? -1;
	}
	#focusRelativeSearchMatch(direction) {
		const matchPaths = this.#searchMatchingPaths;
		if (matchPaths.length === 0) return;
		const focusedPath = this.#focusedPath;
		const currentIndex = focusedPath == null ? -1 : matchPaths.indexOf(focusedPath);
		const nextPath = matchPaths[currentIndex < 0 ? direction > 0 ? 0 : matchPaths.length - 1 : Math.min(matchPaths.length - 1, Math.max(0, currentIndex + direction))];
		if (nextPath != null) this.focusPath(nextPath);
	}
	#setSearchState(value, emitChange) {
		const normalizedValue = value == null ? null : normalizeSearchQuery(value);
		const previousSearch = this.#searchValue;
		if (previousSearch === normalizedValue) return;
		if (previousSearch == null && normalizedValue != null) this.#searchPreviousExpandedPaths = this.#getExpandedDirectoryPaths();
		this.#searchValue = normalizedValue;
		if (normalizedValue == null) {
			this.#restoreSearchExpandedPaths(true);
			this.#searchPreviousExpandedPaths = null;
			this.#searchMatchPathSet.clear();
			this.#searchVisiblePathSet = null;
			this.#rebuildVisibleProjection(this.#focusedPath, true);
		} else if (normalizedValue.length === 0) {
			this.#restoreSearchExpandedPaths(false);
			this.#searchMatchPathSet.clear();
			this.#searchVisiblePathSet = null;
			this.#rebuildVisibleProjection(this.#focusedPath, true);
		} else {
			const focusCandidate = this.#refreshActiveSearchState();
			this.#rebuildVisibleProjection(focusCandidate, true);
		}
		if (emitChange) {
			this.#onSearchChange?.(this.#searchValue);
			this.#emit();
		}
	}
	#refreshActiveSearchState() {
		if (this.#searchValue == null || this.#searchValue.length === 0) {
			this.#searchMatchPathSet.clear();
			return this.#focusedPath;
		}
		const searchValue = this.#searchValue;
		const listedPaths = this.#getListedPaths();
		const listedPathsLowerCase = this.#getListedPathsLowerCase();
		const matchingPaths = [];
		const matchingPathSet = /* @__PURE__ */ new Set();
		let focusCandidate = null;
		for (let index = 0; index < listedPaths.length; index += 1) {
			if (!listedPathsLowerCase[index].includes(searchValue)) continue;
			const path = listedPaths[index];
			matchingPaths.push(path);
			matchingPathSet.add(path);
			focusCandidate ??= path;
		}
		const knownDirectoryPaths = this.#getAllKnownDirectoryPaths();
		const knownDirectoryPathsLowerCase = this.#getAllKnownDirectoryPathsLowerCase();
		for (let index = 0; index < knownDirectoryPaths.length; index += 1) {
			if (!knownDirectoryPathsLowerCase[index].includes(searchValue)) continue;
			const path = knownDirectoryPaths[index];
			if (matchingPathSet.has(path)) continue;
			matchingPaths.push(path);
			matchingPathSet.add(path);
			focusCandidate ??= path;
		}
		this.#searchMatchPathSet = matchingPathSet;
		const searchVisiblePathSet = this.#searchMode === "hide-non-matches" && matchingPaths.length > 0 ? /* @__PURE__ */ new Set() : null;
		this.#searchVisiblePathSet = searchVisiblePathSet;
		const expandedPaths = this.#searchMode === "expand-matches" ? new Set(this.#searchPreviousExpandedPaths ?? []) : /* @__PURE__ */ new Set();
		for (const matchingPath of matchingPaths) {
			if (searchVisiblePathSet != null) searchVisiblePathSet.add(matchingPath);
			if (matchingPath.endsWith("/")) expandedPaths.add(matchingPath);
			for (const ancestorPath of getAncestorDirectoryPaths$1(matchingPath)) {
				expandedPaths.add(ancestorPath);
				if (searchVisiblePathSet != null) searchVisiblePathSet.add(ancestorPath);
			}
		}
		this.#setExpandedPaths(expandedPaths);
		return focusCandidate ?? this.#focusedPath;
	}
	#emit() {
		for (const listener of this.#listeners) listener();
	}
	#emitMutation(event) {
		this.#mutationListeners.get(event.operation)?.forEach((listener) => {
			listener(event);
		});
		this.#mutationListeners.get("*")?.forEach((listener) => {
			listener(event);
		});
	}
	#expandDirectory(path) {
		for (const ancestorPath of getAncestorDirectoryPaths$1(path)) {
			if (this.#store.isExpanded(ancestorPath)) continue;
			this.#store.expand(ancestorPath);
		}
		if (!this.#store.isExpanded(path)) this.#store.expand(path);
	}
	#moveFocus(offset) {
		const itemCount = this.#visibleCount;
		if (itemCount === 0) return;
		const currentIndex = this.#focusedIndex === -1 ? 0 : this.#focusedIndex;
		const nextIndex = Math.min(itemCount - 1, Math.max(0, currentIndex + offset));
		if (nextIndex !== currentIndex || this.#focusedIndex === -1) {
			if (!this.#hasFullProjection && this.#searchVisibleIndices == null && nextIndex >= this.#projectionPaths.length) this.#ensureFullProjection();
			this.#setFocusedIndex(nextIndex);
		}
	}
	#rebuildVisibleProjection(focusedPathCandidate, full = true) {
		const rawVisibleCount = this.#store.getVisibleCount();
		this.#storeVisibleCount = rawVisibleCount;
		const projection = createVisibleProjection(this.#store.getVisibleTreeProjectionData(full ? void 0 : Math.min(rawVisibleCount, INITIAL_PROJECTION_ROW_LIMIT)), focusedPathCandidate, full ? (path) => this.#store.getVisibleIndex(path) : void 0);
		this.#ancestorIndicesByIndex.clear();
		this.#ancestorPathsByIndex.clear();
		this.#hasFullProjection = projection.paths.length >= rawVisibleCount;
		this.#getParentIndexForVisibleRow = projection.getParentIndex;
		this.#projectionPaths = projection.paths;
		this.#projectionPosInSetByIndex = projection.posInSetByIndex;
		this.#projectionSetSizeByIndex = projection.setSizeByIndex;
		this.#syncSearchVisibilityState();
		this.#focusedIndex = focusedPathCandidate == null ? this.#getCurrentVisiblePaths().length > 0 ? 0 : -1 : this.#resolveFocusedIndex(focusedPathCandidate);
		this.#focusedPath = this.#focusedIndex < 0 ? null : this.#resolveVisiblePathAtIndex(this.#focusedIndex);
	}
	#resolveVisiblePathAtIndex(index) {
		const projectedPath = this.#getCurrentVisiblePaths()[index];
		if (projectedPath != null) return projectedPath;
		if (this.#searchVisibleIndices != null) return null;
		return this.#store.getVisibleRowContext(index)?.row.path ?? null;
	}
	#resolveSelectionPath(path) {
		return this.#store.getPathInfo(path)?.path ?? null;
	}
	#focusPathWithoutEmit(path) {
		if (path == null) return;
		const nextFocusedIndex = this.#resolveFocusedIndex(path);
		if (nextFocusedIndex >= 0) this.#setFocusedIndex(nextFocusedIndex, false);
	}
	#setFocusedIndex(index, emit = true) {
		const nextPath = this.#resolveVisiblePathAtIndex(index);
		if (nextPath == null) return;
		if (this.#focusedIndex === index && this.#focusedPath === nextPath) return;
		this.#focusedIndex = index;
		this.#focusedPath = nextPath;
		if (emit) this.#emit();
	}
	#ensureFullProjection() {
		if (this.#hasFullProjection) return;
		this.#rebuildVisibleProjection(this.#focusedPath, true);
	}
	#applyMutationState(event) {
		const nextRenamingPath = remapPathThroughMutation(this.#renamingPath, event);
		if (nextRenamingPath == null && this.#renamingPath != null) this.#renamingValue = "";
		this.#renamingPath = nextRenamingPath;
		const nextFocusedPath = remapPathThroughMutation(this.#focusedPath, event, true);
		const nextSelectedPaths = [...this.#selectedPaths].map((selectedPath) => remapPathThroughMutation(selectedPath, event)).filter((resolvedPath) => resolvedPath != null).map((resolvedPath) => this.#store.getPathInfo(resolvedPath)?.path ?? null).filter((resolvedPath) => resolvedPath != null);
		const nextSelectionAnchorPath = remapPathThroughMutation(this.#selectionAnchorPath, event);
		const canonicalAnchorPath = nextSelectionAnchorPath == null ? null : this.#store.getPathInfo(nextSelectionAnchorPath)?.path ?? null;
		const uniqueNextSelectedPaths = [...new Set(nextSelectedPaths)];
		if (!arePathSetsEqual(this.#selectedPaths, uniqueNextSelectedPaths)) {
			this.#selectedPaths = new Set(uniqueNextSelectedPaths);
			this.#selectionVersion += 1;
		}
		this.#selectionAnchorPath = canonicalAnchorPath;
		return nextFocusedPath;
	}
	#subscribe() {
		return this.#store.on("*", (event) => {
			if (this.#suppressStoreNotifications) return;
			if (event.canonicalChanged) {
				this.#itemHandles.clear();
				this.#invalidateKnownPathCaches();
			}
			if (this.#dragSession != null && isPathMutationEvent(event)) this.#dragSession = null;
			const focusPathCandidate = isPathMutationEvent(event) ? this.#applyMutationState(event) : this.#focusedPath;
			const searchFocusCandidate = this.#searchValue != null && this.#searchValue.length > 0 ? this.#refreshActiveSearchState() : this.#searchValue === "" ? this.#focusedPath : focusPathCandidate;
			const shouldBuildFullProjection = this.#searchValue != null || event.operation !== "expand" && event.operation !== "collapse";
			this.#rebuildVisibleProjection(searchFocusCandidate, shouldBuildFullProjection);
			this.#emit();
			const mutationEvent = toTreesMutationEvent(event);
			if (mutationEvent != null) this.#emitMutation(mutationEvent);
		});
	}
	#toggleDirectory(path) {
		if (this.#store.isExpanded(path)) {
			this.#collapseDirectory(path);
			return;
		}
		this.#expandDirectory(path);
	}
};

//#endregion
//#region node_modules/@pierre/trees/dist/utils/getGitStatusSignature.js
/**
* Produces a stable cache key for a git status array.
*/
const getGitStatusSignature = (entries) => {
	if (entries == null || entries.length === 0) return "0";
	let signature = `${entries.length}`;
	for (const entry of entries) signature += `\0${entry.path}\0${entry.status}`;
	return signature;
};

//#endregion
//#region node_modules/@pierre/trees/dist/utils/normalizeInputPath.js
/**
* Normalizes user-provided tree paths.
* Trailing slashes explicitly mark directories; empty slash segments are ignored.
*/
function normalizeInputPath(inputPath) {
	const isDirectory = inputPath.endsWith("/");
	let normalizedPath = "";
	let segmentStart = -1;
	for (let i = 0; i <= inputPath.length; i += 1) {
		if (!(inputPath[i] === "/" || i === inputPath.length)) {
			if (segmentStart === -1) segmentStart = i;
			continue;
		}
		if (segmentStart === -1) continue;
		if (normalizedPath !== "") normalizedPath += "/";
		normalizedPath += inputPath.slice(segmentStart, i);
		segmentStart = -1;
	}
	if (normalizedPath === "") return null;
	return {
		isDirectory,
		path: normalizedPath
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/gitStatus.js
function getAncestorDirectoryPaths(path) {
	const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
	if (normalizedPath.length === 0) return [];
	const segments = normalizedPath.split("/");
	return segments.slice(0, -1).map((_, index) => `${segments.slice(0, index + 1).join("/")}/`);
}
function getCanonicalGitStatusPath(path, isDirectory) {
	return isDirectory ? `${path}/` : path;
}
function resolveFileTreeGitStatusState(entries, previous = null) {
	const signature = getGitStatusSignature(entries == null ? void 0 : [...entries]);
	if (signature === "0") return null;
	if (previous?.signature === signature) return previous;
	const statusByPath = /* @__PURE__ */ new Map();
	const directoriesWithChanges = /* @__PURE__ */ new Set();
	const ignoredDirectoryPaths = /* @__PURE__ */ new Set();
	for (const entry of entries ?? []) {
		const normalizedPath = normalizeInputPath(entry.path);
		if (normalizedPath == null) continue;
		const canonicalPath = getCanonicalGitStatusPath(normalizedPath.path, normalizedPath.isDirectory);
		statusByPath.set(canonicalPath, entry.status);
		if (entry.status === "ignored" && normalizedPath.isDirectory) ignoredDirectoryPaths.add(canonicalPath);
		else if (normalizedPath.isDirectory) ignoredDirectoryPaths.delete(canonicalPath);
		for (const ancestorPath of getAncestorDirectoryPaths(normalizedPath.path)) directoriesWithChanges.add(ancestorPath);
	}
	return {
		directoriesWithChanges,
		ignoredDirectoryPaths,
		signature,
		statusByPath
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/iconResolver.js
const normalizeIconRuleKey = (value) => value.trim().toLowerCase();
const getBaseFileName = (path) => {
	return path.split("/").at(-1) ?? path;
};
const getExtensionCandidates = (fileName) => {
	const segments = fileName.toLowerCase().split(".");
	const candidates = [];
	for (let index = 1; index < segments.length; index += 1) candidates.push(segments.slice(index).join("."));
	return candidates;
};
function remapEntryToIcon(entry, remappedFrom) {
	if (typeof entry === "string") return {
		name: entry,
		remappedFrom
	};
	return {
		...entry,
		remappedFrom
	};
}
function createFileTreeIconResolver(icons) {
	const normalizedIcons = normalizeFileTreeIcons(icons);
	const iconRemap = normalizedIcons.remap;
	const iconByFileName = /* @__PURE__ */ new Map();
	for (const [fileName, icon] of Object.entries(normalizedIcons.byFileName ?? {})) iconByFileName.set(fileName.toLowerCase(), icon);
	const iconByFileExtension = /* @__PURE__ */ new Map();
	for (const [extension, icon] of Object.entries(normalizedIcons.byFileExtension ?? {})) iconByFileExtension.set(normalizeIconRuleKey(extension), icon);
	const iconByFileNameContains = Object.entries(normalizedIcons.byFileNameContains ?? {}).map(([needle, icon]) => [needle.toLowerCase(), icon]);
	const resolveIcon = (name, filePath) => {
		if (name === "file-tree-icon-file" && filePath != null) {
			const fileName = getBaseFileName(filePath);
			const lowerFileName = fileName.toLowerCase();
			const fileNameEntry = iconByFileName.get(lowerFileName);
			if (fileNameEntry != null) return remapEntryToIcon(fileNameEntry, name);
			for (const [needle, matchEntry] of iconByFileNameContains) if (lowerFileName.includes(needle)) return remapEntryToIcon(matchEntry, name);
			const extensionCandidates = getExtensionCandidates(fileName);
			for (const extension of extensionCandidates) {
				const extensionEntry = iconByFileExtension.get(extension);
				if (extensionEntry != null) return remapEntryToIcon(extensionEntry, name);
			}
			const builtInToken = resolveBuiltInFileIconToken(normalizedIcons.set, fileName, extensionCandidates);
			if (builtInToken != null && normalizedIcons.set !== "none") return {
				name: getBuiltInFileIconName(builtInToken),
				remappedFrom: name,
				token: builtInToken
			};
		}
		const remappedEntry = iconRemap?.[name];
		if (remappedEntry == null) return { name };
		return remapEntryToIcon(remappedEntry, name);
	};
	return { resolveIcon };
}

//#endregion
//#region node_modules/preact/dist/preact.mjs
var n, l$2, u$3, t$1, i$2, r$2, f$3, e$1, o$3, c$2, s$2, a$2, h$2 = {}, p$2 = [], v$2 = Array.isArray, y$2 = p$2.slice, w$2 = Object.assign;
function d$2(n) {
	n && n.parentNode && n.remove();
}
function _$2(n, l, u) {
	var t, i, r, f = {};
	for (r in l) "key" == r ? t = l[r] : "ref" == r && "function" != typeof n ? i = l[r] : f[r] = l[r];
	return arguments.length > 2 && (f.children = arguments.length > 3 ? y$2.call(arguments, 2) : u), g$2(n, f, t, i, null);
}
function g$2(u, t, i, r, f) {
	var e = {
		type: u,
		props: t,
		key: i,
		ref: r,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: void 0,
		__v: null == f ? ++l$2 : f,
		__i: -1,
		__u: 0
	};
	return null == f && null != n.vnode && n.vnode(e), e;
}
function k$2(n) {
	return n.children;
}
function m$2(n, l) {
	this.props = n, this.context = l, this.__g = 0;
}
function M$1(n, l) {
	if (null == l) return n.__ ? M$1(n.__, n.__i + 1) : null;
	for (var u; l < n.__k.length; l++) if (null != (u = n.__k[l]) && null != u.__e) return u.__e;
	return "function" == typeof n.type ? M$1(n) : null;
}
function S$1(n) {
	var l, u;
	if (null != (n = n.__) && null != n.__c) {
		for (n.__e = null, l = 0; l < n.__k.length; l++) if (null != (u = n.__k[l]) && null != u.__e) {
			n.__e = u.__e;
			break;
		}
		return S$1(n);
	}
}
function $$1(l) {
	(8 & l.__g || !(l.__g |= 8) || !t$1.push(l) || r$2++) && i$2 == n.debounceRendering || ((i$2 = n.debounceRendering) || queueMicrotask)(x$1);
}
function x$1() {
	for (var l, u, i, e, o, c, s, a, h = 1; t$1.length;) t$1.length > h && t$1.sort(f$3), l = t$1.shift(), h = t$1.length, 8 & l.__g && (i = void 0, o = (e = (u = l).__v).__e, c = [], s = [], (a = u.__P) && ((i = w$2({}, e)).__v = e.__v + 1, n.vnode && n.vnode(i), q$2(a, i, e, u.__n, a.namespaceURI, 32 & e.__u ? [o] : null, c, null == o ? M$1(e) : o, !!(32 & e.__u), s, a.ownerDocument), i.__v = e.__v, i.__.__k[i.__i] = i, P$1(c, i, s), i.__e != o && S$1(i)));
	r$2 = 0;
}
function C$2(n, l, u, t, i, r, f, e, o, c, s, a) {
	var v, y, w, d, _, g, b, k = t && t.__k || p$2, m = l.length;
	for (o = j$1(u, l, k, o, m), v = 0; v < m; v++) null != (w = u.__k[v]) && (y = -1 == w.__i ? h$2 : k[w.__i] || h$2, w.__i = v, g = q$2(n, w, y, i, r, f, e, o, c, s, a), d = w.__e, w.ref && y.ref != w.ref && (y.ref && B$2(y.ref, null, w), s.push(w.ref, w.__c || d, w)), null == _ && null != d && (_ = d), (b = !!(4 & w.__u)) || y.__k === w.__k ? o = A$2(w, o, n, b) : "function" == typeof w.type && void 0 !== g ? o = g : d && (o = d.nextSibling), w.__u &= -7);
	return u.__e = _, o;
}
function j$1(n, l, u, t, i) {
	var r, f, e, o, c, s = u.length, a = s, h = 0;
	for (n.__k = new Array(i), r = 0; r < i; r++) null != (f = l[r]) && "boolean" != typeof f && "function" != typeof f ? (o = r + h, (f = n.__k[r] = "string" == typeof f || "number" == typeof f || "bigint" == typeof f || f.constructor == String ? g$2(null, f, null, null, null) : v$2(f) ? g$2(k$2, { children: f }, null, null, null) : null == f.constructor && f.__b > 0 ? g$2(f.type, f.props, f.key, f.ref ? f.ref : null, f.__v) : f).__ = n, f.__b = n.__b + 1, e = null, -1 != (c = f.__i = I$1(f, u, o, a)) && (a--, (e = u[c]) && (e.__u |= 2)), null == e || null == e.__v ? (-1 == c && (i > s ? h-- : i < s && h++), "function" != typeof f.type && (f.__u |= 4)) : c != o && (c == o - 1 ? h-- : c == o + 1 ? h++ : (c > o ? h-- : h++, f.__u |= 4))) : n.__k[r] = null;
	if (a) for (r = 0; r < s; r++) null != (e = u[r]) && 0 == (2 & e.__u) && (e.__e == t && (t = M$1(e)), D$2(e, e));
	return t;
}
function A$2(n, l, u, t) {
	var i, r;
	if ("function" == typeof n.type) {
		for (i = n.__k, r = 0; i && r < i.length; r++) i[r] && (i[r].__ = n, l = A$2(i[r], l, u, t));
		return l;
	}
	n.__e != l && (t && (l && n.type && !l.parentNode && (l = M$1(n)), u.insertBefore(n.__e, l || null)), l = n.__e);
	do
		l = l && l.nextSibling;
	while (null != l && 8 == l.nodeType);
	return l;
}
function I$1(n, l, u, t) {
	var i, r, f, e = n.key, o = n.type, c = l[u], s = null != c && 0 == (2 & c.__u);
	if (null === c && null == n.key || s && e == c.key && o == c.type) return u;
	if (t > (s ? 1 : 0)) {
		for (i = u - 1, r = u + 1; i >= 0 || r < l.length;) if (null != (c = l[f = i >= 0 ? i-- : r++]) && 0 == (2 & c.__u) && e == c.key && o == c.type) return f;
	}
	return -1;
}
function L$1(n, l, u) {
	"-" == l[0] ? n.setProperty(l, null == u ? "" : u) : n[l] = null == u ? "" : u;
}
function O$1(n, l, u, t, i) {
	var r;
	n: if ("style" == l) if ("string" == typeof u) n.style.cssText = u;
	else {
		if ("string" == typeof t && (n.style.cssText = t = ""), t) for (l in t) u && l in u || L$1(n.style, l, "");
		if (u) for (l in u) t && u[l] == t[l] || L$1(n.style, l, u[l]);
	}
	else if ("o" == l[0] && "n" == l[1]) r = l != (l = l.replace(e$1, "$1")), (l = l.slice(2))[0].toLowerCase() != l[0] && (l = l.toLowerCase()), n.__l || (n.__l = {}), n.__l[l + r] = u, u ? t ? u.l = t.l : (u.l = o$3, n.addEventListener(l, r ? s$2 : c$2, r)) : n.removeEventListener(l, r ? s$2 : c$2, r);
	else {
		if ("http://www.w3.org/2000/svg" == i) l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
		else if ("width" != l && "height" != l && "href" != l && "list" != l && "form" != l && "tabIndex" != l && "download" != l && "rowSpan" != l && "colSpan" != l && "role" != l && "popover" != l && l in n) try {
			n[l] = null == u ? "" : u;
			break n;
		} catch (n) {}
		"function" == typeof u || (null == u || !1 === u && "-" != l[4] ? n.removeAttribute(l) : n.setAttribute(l, "popover" == l && 1 == u ? "" : u));
	}
}
function T$1(l) {
	return function(u) {
		if (this.__l) {
			var t = this.__l[u.type + l];
			if (null == u.u) u.u = o$3++;
			else if (u.u < t.l) return;
			return t(n.event ? n.event(u) : u);
		}
	};
}
function q$2(l, u, t, i, r, f, e, o, c, s, a) {
	var h, p, y, _, g, b, M, S, $, x, j, A, H, I, L, O, T, q, P, B, D, F = u.type;
	if (null != u.constructor) return null;
	128 & t.__u && (c = !!(32 & t.__u), t.__c.__z && (o = u.__e = t.__e = (f = t.__c.__z)[0], t.__c.__z = null)), (h = n.__b) && h(u);
	n: if ("function" == typeof F) try {
		if (S = u.props, $ = "prototype" in F && F.prototype.render, x = (h = F.contextType) && i[h.__c], j = h ? x ? x.props.value : h.__ : i, t.__c ? 2 & (p = u.__c = t.__c).__g && (p.__g |= 1, M = !0) : ($ ? u.__c = p = new F(S, j) : (u.__c = p = new m$2(S, j), p.constructor = F, p.render = E$1), x && x.sub(p), p.props = S, p.state || (p.state = {}), p.context = j, p.__n = i, y = !0, p.__g |= 8, p.__h = [], p._sb = []), $ && null == p.__s && (p.__s = p.state), $ && null != F.getDerivedStateFromProps && (p.__s == p.state && (p.__s = w$2({}, p.__s)), w$2(p.__s, F.getDerivedStateFromProps(S, p.__s))), _ = p.props, g = p.state, p.__v = u, y) $ && null == F.getDerivedStateFromProps && null != p.componentWillMount && p.componentWillMount(), $ && null != p.componentDidMount && p.__h.push(p.componentDidMount);
		else {
			if ($ && null == F.getDerivedStateFromProps && S !== _ && null != p.componentWillReceiveProps && p.componentWillReceiveProps(S, j), !(4 & p.__g) && null != p.shouldComponentUpdate && !1 === p.shouldComponentUpdate(S, p.__s, j) || u.__v == t.__v) {
				for (u.__v != t.__v && (p.props = S, p.state = p.__s, p.__g &= -9), u.__e = t.__e, u.__k = t.__k, u.__k.some(function(n) {
					n && (n.__ = u);
				}), A = 0; A < p._sb.length; A++) p.__h.push(p._sb[A]);
				p._sb = [], p.__h.length && e.push(p);
				break n;
			}
			null != p.componentWillUpdate && p.componentWillUpdate(S, p.__s, j), $ && null != p.componentDidUpdate && p.__h.push(function() {
				p.componentDidUpdate(_, g, b);
			});
		}
		if (p.context = j, p.props = S, p.__P = l, p.__g &= -5, H = n.__r, I = 0, $) {
			for (p.state = p.__s, p.__g &= -9, H && H(u), h = p.render(p.props, p.state, p.context), L = 0; L < p._sb.length; L++) p.__h.push(p._sb[L]);
			p._sb = [];
		} else do
			p.__g &= -9, H && H(u), h = p.render(p.props, p.state, p.context), p.state = p.__s;
		while (8 & p.__g && ++I < 25);
		p.state = p.__s, null != p.getChildContext && (i = w$2({}, i, p.getChildContext())), $ && !y && null != p.getSnapshotBeforeUpdate && (b = p.getSnapshotBeforeUpdate(_, g)), O = h, null != h && h.type === k$2 && null == h.key && (O = V$1(h.props.children)), o = C$2(l, v$2(O) ? O : [O], u, t, i, r, f, e, o, c, s, a), u.__u &= -161, p.__h.length && e.push(p), M && (p.__g &= -4);
	} catch (l) {
		if (u.__v = null, c || null != f) if (l.then) {
			for (T = 0, q = !1, u.__u |= c ? 160 : 128, u.__c.__z = [], P = 0; P < f.length; P++) null == (B = f[P]) || q || (8 == B.nodeType && "$s" == B.data ? (T > 0 && u.__c.__z.push(B), T++, f[P] = null) : 8 == B.nodeType && "/$s" == B.data ? (--T > 0 && u.__c.__z.push(B), q = 0 === T, o = f[P], f[P] = null) : T > 0 && (u.__c.__z.push(B), f[P] = null));
			if (!q) {
				for (; o && 8 == o.nodeType && o.nextSibling;) o = o.nextSibling;
				f[f.indexOf(o)] = null, u.__c.__z = [o];
			}
			u.__e = o;
		} else {
			for (D = f.length; D--;) d$2(f[D]);
			N$1(u);
		}
		else u.__e = t.__e, u.__k = t.__k, l.then || N$1(u);
		n.__e(l, u, t);
	}
	else o = u.__e = z$2(t.__e, u, t, i, r, f, e, c, s, a);
	return (h = n.diffed) && h(u), 128 & u.__u ? void 0 : o;
}
function N$1(n) {
	n && n.__c && (n.__c.__g |= 4), n && n.__k && n.__k.forEach(N$1);
}
function P$1(l, u, t) {
	for (var i = 0; i < t.length; i++) B$2(t[i], t[++i], t[++i]);
	n.__c && n.__c(u, l), l.some(function(u) {
		try {
			l = u.__h, u.__h = [], l.some(function(n) {
				n.call(u);
			});
		} catch (l) {
			n.__e(l, u.__v);
		}
	});
}
function V$1(n) {
	return "object" != typeof n || null == n || n.__b && n.__b > 0 ? n : v$2(n) ? n.map(V$1) : w$2({}, n);
}
function z$2(l, u, t, i, r, f, e, o, c, s) {
	var a, p, w, _, g, b, k, m, S = t.props, $ = u.props, x = u.type;
	if ("svg" == x ? r = "http://www.w3.org/2000/svg" : "math" == x ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), null != f) {
		for (a = 0; a < f.length; a++) if ((g = f[a]) && "setAttribute" in g == !!x && (x ? g.localName == x : 3 == g.nodeType)) {
			l = g, f[a] = null;
			break;
		}
	}
	if (null == l) {
		if (null == x) return s.createTextNode($);
		l = s.createElementNS(r, x, $.is && $), o && (n.__m && n.__m(u, f), o = !1), f = null;
	}
	if (null == x) S === $ || o && l.data == $ || (l.data = $);
	else {
		if (f = f && y$2.call(l.childNodes), S = t.props || h$2, !o && null != f) for (S = {}, a = 0; a < l.attributes.length; a++) S[(g = l.attributes[a]).name] = g.value;
		for (a in S) if (g = S[a], "children" == a);
		else if ("dangerouslySetInnerHTML" == a) w = g;
		else if (!(a in $)) {
			if ("value" == a && "defaultValue" in $ || "checked" == a && "defaultChecked" in $) continue;
			O$1(l, a, null, g, r);
		}
		for (a in m = 1 & t.__u, $) g = $[a], "children" == a ? _ = g : "dangerouslySetInnerHTML" == a ? p = g : "value" == a ? b = g : "checked" == a ? k = g : o && "function" != typeof g || S[a] === g && !m || O$1(l, a, g, S[a], r);
		if (p) o || w && (p.__html == w.__html || p.__html == l.innerHTML) || (l.innerHTML = p.__html), u.__k = [];
		else if (w && (l.innerHTML = ""), C$2("template" == x ? l.content : l, v$2(_) ? _ : [_], u, t, i, "foreignObject" == x ? "http://www.w3.org/1999/xhtml" : r, f, e, f ? f[0] : t.__k && M$1(t, 0), o, c, s), null != f) for (a = f.length; a--;) d$2(f[a]);
		o || (a = "value", "progress" == x && null == b ? l.removeAttribute("value") : null == b || b === l[a] && ("progress" !== x || b) || O$1(l, a, b, S[a], r), a = "checked", null != k && k != l[a] && O$1(l, a, k, S[a], r));
	}
	return l;
}
function B$2(l, u, t) {
	try {
		if ("function" == typeof l) {
			var i = "function" == typeof l.__u;
			i && l.__u(), i && null == u || (l.__u = l(u));
		} else l.current = u;
	} catch (l) {
		n.__e(l, t);
	}
}
function D$2(l, u, t) {
	var i, r;
	if (n.unmount && n.unmount(l), (i = l.ref) && (i.current && i.current != l.__e || B$2(i, null, u)), null != (i = l.__c)) {
		if (i.componentWillUnmount) try {
			i.componentWillUnmount();
		} catch (l) {
			n.__e(l, u);
		}
		i.__P = null;
	}
	if (i = l.__k) for (r = 0; r < i.length; r++) i[r] && D$2(i[r], u, t || "function" != typeof l.type);
	t || d$2(l.__e), l.__e && l.__e.__l && (l.__e.__l = null), l.__e = l.__c = l.__ = null;
}
function E$1(n, l, u) {
	return this.constructor(n, u);
}
function F$2(l, u) {
	var t, i, r, f;
	u == document && (u = document.documentElement), n.__ && n.__(l, u), i = (t = !!(l && 32 & l.__u)) ? null : u.__k, l = u.__k = _$2(k$2, null, [l]), r = [], f = [], q$2(u, l, i || h$2, h$2, u.namespaceURI, i ? null : u.firstChild ? y$2.call(u.childNodes) : null, r, i ? i.__e : u.firstChild, t, f, u.ownerDocument), P$1(r, l, f);
}
function G$1(n, l) {
	n.__u |= 32, F$2(n, l);
}
n = { __e: function(n, l, u, t) {
	for (var i, f, e; l = l.__;) if ((i = l.__c) && !(1 & i.__g)) {
		i.__g |= 4;
		try {
			if ((f = i.constructor) && null != f.getDerivedStateFromError && (i.setState(f.getDerivedStateFromError(n)), e = 8 & i.__g), null != i.componentDidCatch && (i.componentDidCatch(n, t || {}), e = 8 & i.__g), e) return void (i.__g |= 2);
		} catch (l) {
			n = l;
		}
	}
	throw r$2 = 0, n;
} }, l$2 = 0, u$3 = function(n) {
	return null != n && null == n.constructor;
}, m$2.prototype.setState = function(n, l) {
	var u = null != this.__s && this.__s != this.state ? this.__s : this.__s = w$2({}, this.state);
	"function" == typeof n && (n = n(w$2({}, u), this.props)), n && w$2(u, n), null != n && this.__v && (l && this._sb.push(l), $$1(this));
}, m$2.prototype.forceUpdate = function(n) {
	this.__v && (this.__g |= 4, n && this.__h.push(n), $$1(this));
}, m$2.prototype.render = k$2, t$1 = [], r$2 = 0, f$3 = function(n, l) {
	return n.__v.__b - l.__v.__b;
}, e$1 = /(PointerCapture)$|Capture$/i, o$3 = 0, c$2 = T$1(!1), s$2 = T$1(!0), a$2 = 0;

//#endregion
//#region node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var o$2 = 0, f$2 = Array.isArray;
function u$2(t, e, n$3, f, u, i) {
	e || (e = {});
	var a, c, l = e;
	if ("ref" in l && "function" != typeof t) for (c in l = {}, e) "ref" == c ? a = e[c] : l[c] = e[c];
	var p = {
		type: t,
		props: l,
		key: n$3,
		ref: a,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: void 0,
		__v: --o$2,
		__i: -1,
		__u: 0,
		__source: u,
		__self: i
	};
	return n.vnode && n.vnode(p), p;
}

//#endregion
//#region node_modules/@pierre/trees/dist/components/Icon.js
const DEFAULT_WIDTH = 16;
const DEFAULT_HEIGHT = 16;
const ICON_SIZE_OVERRIDES = {};
function Icon({ name, remappedFrom, token, width: propWidth, height: propHeight, viewBox: propViewBox, label, alignCapitals = false }) {
	"use no memo";
	const href = `#${name.replace(/^#/, "")}`;
	const { width: iconWidth, height: iconHeight, viewBox: overrideViewBox } = ICON_SIZE_OVERRIDES[name] ?? {
		width: DEFAULT_WIDTH,
		height: DEFAULT_HEIGHT
	};
	const width = propWidth ?? iconWidth;
	const height = propHeight ?? iconHeight;
	const viewBox = propViewBox ?? overrideViewBox ?? `0 0 ${iconWidth} ${iconHeight}`;
	const a11yProps = label != null ? {
		"aria-label": label,
		role: "img"
	} : { "aria-hidden": true };
	return /* @__PURE__ */ u$2("svg", {
		"data-icon-name": remappedFrom ?? name,
		"data-icon-token": token,
		"data-align-capitals": alignCapitals,
		...a11yProps,
		viewBox,
		width,
		height,
		children: /* @__PURE__ */ u$2("use", { href })
	});
}

//#endregion
//#region node_modules/@pierre/trees/dist/components/OverflowText.js
const splitCenter = (contents) => {
	if (contents.length < 2) return [contents, ""];
	const splitIndex = Math.ceil(contents.length / 2);
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
const splitExtension = (contents) => {
	if (contents.length < 4) return [contents, ""];
	const extensionIndex = contents.lastIndexOf(".") + 1;
	const isTooLong = contents.length - extensionIndex > 10;
	const splitIndex = extensionIndex >= 1 && !isTooLong ? extensionIndex : Math.ceil(contents.length / 2);
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
const splitLeafPath = (contents) => {
	if (contents.length < 4) return [contents, ""];
	const leafPathIndex = contents.lastIndexOf("/") + 1;
	const isTooLong = contents.length - leafPathIndex > 25;
	const splitIndex = leafPathIndex >= 1 && !isTooLong ? leafPathIndex : Math.ceil(contents.length / 2);
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
const splitByIndex = (contents, { splitIndex } = {}) => {
	if (typeof splitIndex !== "number") {
		const centerIndex = Math.ceil(contents.length / 2);
		return [contents.slice(0, centerIndex), contents.slice(centerIndex)];
	}
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
const splitLast = (contents, { splitOffset } = {}) => {
	if (typeof splitOffset !== "number" || splitOffset <= 0 || splitOffset >= contents.length) {
		const centerIndex = Math.ceil(contents.length / 2);
		return [contents.slice(0, centerIndex), contents.slice(centerIndex)];
	}
	const splitIndex = contents.length - splitOffset;
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
const splitFirst = (contents, { splitOffset } = {}) => {
	if (typeof splitOffset !== "number" || splitOffset <= 0 || splitOffset >= contents.length) {
		const centerIndex = Math.ceil(contents.length / 2);
		return [contents.slice(0, centerIndex), contents.slice(centerIndex)];
	}
	const splitIndex = splitOffset;
	return [contents.slice(0, splitIndex), contents.slice(splitIndex)];
};
function OverflowMarker({ children, marker, variant = "default" }) {
	"use no memo";
	const isFadeVariant = variant === "fade";
	return /* @__PURE__ */ u$2("div", {
		"aria-hidden": true,
		"data-truncate-marker-cell": true,
		children: /* @__PURE__ */ u$2("div", {
			"data-truncate-marker": true,
			children: typeof marker === "function" ? marker({ children }) : isFadeVariant ? /* @__PURE__ */ u$2("span", { "data-truncate-fade": true }) : marker
		})
	});
}
function OverflowContent(options) {
	"use no memo";
	const { mode, children } = options;
	return /* @__PURE__ */ u$2("div", { children: [/* @__PURE__ */ u$2("div", {
		"data-truncate-content": "visible",
		children: mode === "fruncate" ? /* @__PURE__ */ u$2("span", { children }) : children
	}), /* @__PURE__ */ u$2("div", {
		"data-truncate-content": "overflow",
		"aria-hidden": true,
		children: mode === "fruncate" ? /* @__PURE__ */ u$2("span", { children }) : children
	})] });
}
function OverflowText({ children, mode = "truncate", marker = "…", variant = "default", ...props }) {
	"use no memo";
	const contentNode = /* @__PURE__ */ u$2(OverflowContent, {
		mode,
		children
	}, "content");
	const markerNode = /* @__PURE__ */ u$2(OverflowMarker, {
		marker,
		mode,
		variant
	}, "marker");
	const fillNode = /* @__PURE__ */ u$2("div", { "data-truncate-fill": true }, "fill");
	return /* @__PURE__ */ u$2("div", {
		"data-truncate-container": mode,
		"data-truncate-variant": variant,
		...props,
		children: /* @__PURE__ */ u$2("div", {
			"data-truncate-grid": true,
			children: mode === "truncate" ? [contentNode, markerNode] : [
				markerNode,
				contentNode,
				fillNode
			]
		})
	});
}
function Truncate({ children, ...props }) {
	"use no memo";
	return /* @__PURE__ */ u$2(OverflowText, {
		mode: "truncate",
		...props,
		children
	});
}
function Fruncate({ children, ...props }) {
	"use no memo";
	return /* @__PURE__ */ u$2(OverflowText, {
		mode: "fruncate",
		...props,
		children
	});
}
function MiddleTruncate({ children, contents, priority = "end", split = "center", minimumLength = 12, className, style, ...props }) {
	"use no memo";
	let firstSegment = null;
	let secondSegment = null;
	if (Array.isArray(contents)) {
		if (contents.length !== 2) {
			console.error("MiddleTruncate: contents must be an array of two items");
			return null;
		}
		firstSegment = /* @__PURE__ */ u$2(Truncate, {
			...props,
			children: contents[0]
		});
		secondSegment = /* @__PURE__ */ u$2(Fruncate, {
			...props,
			children: contents[1]
		});
	} else {
		if (typeof children !== "string") {
			console.error("MiddleTruncate: children must be a string");
			return null;
		}
		if (children.length === 0) return /* @__PURE__ */ u$2("div", {
			className,
			style
		});
		if (children.length < minimumLength) if (priority === "end") return /* @__PURE__ */ u$2(Fruncate, {
			...props,
			className,
			style,
			children
		});
		else return /* @__PURE__ */ u$2(Truncate, {
			...props,
			className,
			style,
			children
		});
		let splitFn = null;
		let splitIndex = null;
		let splitOffset = null;
		if (typeof split === "string") {
			if (split === "center") splitFn = splitCenter;
			else if (split === "extension") splitFn = splitExtension;
			else if (split === "leaf-path") splitFn = splitLeafPath;
		} else if (typeof split === "number") {
			splitFn = splitByIndex;
			splitIndex = split;
		} else if (Array.isArray(split)) {
			const [offsetType, offsetValue] = split;
			splitOffset = offsetValue;
			if (offsetType === "last") splitFn = splitLast;
			else if (offsetType === "first") splitFn = splitFirst;
		} else if (typeof split === "function") splitFn = split;
		splitFn ??= splitCenter;
		const [firstHalfMessage, secondHalfMessage] = splitFn(children, {
			priority,
			variant: props.variant,
			splitIndex: typeof splitIndex === "number" ? splitIndex : void 0,
			splitOffset: typeof splitOffset === "number" ? splitOffset : void 0
		});
		const firstIsLarger = firstHalfMessage.length >= secondHalfMessage.length;
		const firstCanBeSimple = priority === "equal" && !firstIsLarger;
		const secondCanBeSimple = priority === "equal" && firstIsLarger;
		const firstPropOverrides = {};
		const secondPropOverrides = {};
		if (firstCanBeSimple) firstPropOverrides.marker = "";
		if (secondCanBeSimple) secondPropOverrides.marker = "";
		firstSegment = /* @__PURE__ */ u$2(Truncate, {
			...props,
			...firstPropOverrides,
			children: firstHalfMessage
		});
		secondSegment = /* @__PURE__ */ u$2(Fruncate, {
			...props,
			...secondPropOverrides,
			children: secondHalfMessage
		});
	}
	return /* @__PURE__ */ u$2("div", {
		"data-truncate-group-container": "middle",
		className,
		style,
		children: [/* @__PURE__ */ u$2("div", {
			"data-truncate-segment-priority": priority === "start" || priority === "equal" ? "1" : "2",
			children: firstSegment
		}), /* @__PURE__ */ u$2("div", {
			"data-truncate-segment-priority": priority === "end" || priority === "equal" ? "1" : "2",
			children: secondSegment
		})]
	});
}

//#endregion
//#region node_modules/@pierre/trees/dist/model/layout.js
const EMPTY_FILE_TREE_LAYOUT_RANGE = {
	endIndex: -1,
	startIndex: -1
};
function clamp(value, minimum, maximum) {
	return Math.min(Math.max(value, minimum), maximum);
}
function createRange(startIndex, endIndex) {
	return startIndex < 0 || endIndex < startIndex ? EMPTY_FILE_TREE_LAYOUT_RANGE : {
		endIndex,
		startIndex
	};
}
function isEmptyRange(range) {
	return range.startIndex < 0 || range.endIndex < range.startIndex;
}
function getRangeHeight(range, itemHeight) {
	return isEmptyRange(range) ? 0 : (range.endIndex - range.startIndex + 1) * itemHeight;
}
function getFirstIntersectingIndex(offset, itemCount, itemHeight) {
	if (itemCount <= 0) return -1;
	const totalHeight = itemCount * itemHeight;
	if (offset <= 0) return 0;
	if (offset >= totalHeight) return itemCount;
	return Math.floor(offset / itemHeight);
}
function getLastIntersectingIndex(bottomOffset, itemCount, itemHeight) {
	if (itemCount <= 0 || bottomOffset <= 0) return -1;
	if (bottomOffset >= itemCount * itemHeight) return itemCount - 1;
	return Math.ceil(bottomOffset / itemHeight) - 1;
}
function getExpandedDirectoryIndicesByDepth(rows) {
	const indicesByDepth = /* @__PURE__ */ new Map();
	rows.forEach((row, index) => {
		if (row.kind !== "directory" || !row.isExpanded) return;
		const depth = row.ancestorPaths.length;
		const indices = indicesByDepth.get(depth);
		if (indices == null) {
			indicesByDepth.set(depth, [index]);
			return;
		}
		indices.push(index);
	});
	return indicesByDepth;
}
function findLastIndexAtOrBefore(indices, threshold) {
	let lowerBound = 0;
	let upperBound = indices.length - 1;
	let match = -1;
	while (lowerBound <= upperBound) {
		const midpoint = Math.floor((lowerBound + upperBound) / 2);
		const index = indices[midpoint];
		if (index == null) break;
		if (index <= threshold) {
			match = midpoint;
			lowerBound = midpoint + 1;
			continue;
		}
		upperBound = midpoint - 1;
	}
	return match;
}
function computeExpandedSubtreeEndIndices(rows) {
	const endIndexByPath = /* @__PURE__ */ new Map();
	const openDirectoryPaths = [];
	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];
		if (row == null) continue;
		const activePaths = row.kind === "directory" && row.isExpanded ? [...row.ancestorPaths, row.path] : row.ancestorPaths;
		let sharedPrefixLength = 0;
		while (sharedPrefixLength < openDirectoryPaths.length && sharedPrefixLength < activePaths.length && openDirectoryPaths[sharedPrefixLength] === activePaths[sharedPrefixLength]) sharedPrefixLength += 1;
		for (let openIndex = openDirectoryPaths.length - 1; openIndex >= sharedPrefixLength; openIndex -= 1) {
			const path = openDirectoryPaths[openIndex];
			if (path != null) endIndexByPath.set(path, index - 1);
		}
		openDirectoryPaths.length = sharedPrefixLength;
		for (let activeIndex = sharedPrefixLength; activeIndex < activePaths.length; activeIndex += 1) {
			const path = activePaths[activeIndex];
			if (path != null) openDirectoryPaths.push(path);
		}
	}
	const lastIndex = rows.length - 1;
	for (const path of openDirectoryPaths) endIndexByPath.set(path, lastIndex);
	return endIndexByPath;
}
function computeStickyRows(rows, scrollTop, itemHeight) {
	if (rows.length === 0 || scrollTop <= 0) return [];
	const subtreeEndIndexByPath = computeExpandedSubtreeEndIndices(rows);
	const expandedDirectoryIndicesByDepth = getExpandedDirectoryIndicesByDepth(rows);
	const stickyRows = [];
	for (let slotDepth = 0; slotDepth < rows.length; slotDepth += 1) {
		const candidateIndices = expandedDirectoryIndicesByDepth.get(slotDepth);
		if (candidateIndices == null || candidateIndices.length === 0) break;
		const slotTop = scrollTop + slotDepth * itemHeight;
		let candidateOffset = findLastIndexAtOrBefore(candidateIndices, Math.min(rows.length - 1, Math.floor(slotTop / itemHeight)));
		let candidate = null;
		while (candidateOffset >= 0) {
			const rowIndex = candidateIndices[candidateOffset];
			const row = rowIndex == null ? null : rows[rowIndex] ?? null;
			if (row != null && (slotDepth === 0 || row.ancestorPaths[slotDepth - 1] === stickyRows[slotDepth - 1]?.path)) {
				candidate = row;
				break;
			}
			candidateOffset -= 1;
		}
		if (candidate == null) break;
		stickyRows.push(candidate);
	}
	return stickyRows.map((row, slotDepth) => {
		const defaultTop = slotDepth * itemHeight;
		const nextBoundaryIndex = (subtreeEndIndexByPath.get(row.path) ?? rows.length - 1) + 1;
		if (nextBoundaryIndex >= rows.length) return {
			row,
			top: defaultTop
		};
		const nextBoundaryTop = nextBoundaryIndex * itemHeight - scrollTop;
		return {
			row,
			top: Math.min(defaultTop, nextBoundaryTop - itemHeight)
		};
	}).filter((entry) => entry.top + itemHeight > 0);
}
function computeFileTreeLayout(rows, metrics) {
	const totalRowCount = metrics.totalRowCount ?? rows.length;
	const totalHeight = totalRowCount * metrics.itemHeight;
	const viewportHeight = Math.max(0, metrics.viewportHeight);
	const overscan = Math.max(0, Math.floor(metrics.overscan));
	const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
	const scrollTop = clamp(metrics.scrollTop, 0, maxScrollTop);
	const stickyRows = metrics.stickyRows ?? computeStickyRows(rows, scrollTop, metrics.itemHeight);
	const stickyHeight = stickyRows.reduce((maximumBottom, entry) => Math.max(maximumBottom, entry.top + metrics.itemHeight), 0);
	const paneTop = Math.min(totalHeight, scrollTop + stickyHeight);
	const paneHeight = Math.max(0, viewportHeight - stickyHeight);
	const contentHeight = Math.max(0, totalHeight - paneTop);
	const firstVisiblePhysicalIndex = getFirstIntersectingIndex(scrollTop, totalRowCount, metrics.itemHeight);
	const firstProjectedIndex = getFirstIntersectingIndex(paneTop, totalRowCount, metrics.itemHeight);
	const firstOccludedIndex = stickyHeight <= 0 || firstVisiblePhysicalIndex < 0 || firstVisiblePhysicalIndex >= totalRowCount ? -1 : firstVisiblePhysicalIndex;
	const lastOccludedIndex = firstOccludedIndex === -1 ? -1 : Math.min(totalRowCount - 1, firstProjectedIndex - 1);
	const occludedCount = firstOccludedIndex === -1 || lastOccludedIndex < firstOccludedIndex ? 0 : lastOccludedIndex - firstOccludedIndex + 1;
	const visible = paneHeight <= 0 || firstProjectedIndex >= totalRowCount ? EMPTY_FILE_TREE_LAYOUT_RANGE : createRange(firstProjectedIndex, getLastIntersectingIndex(paneTop + paneHeight, totalRowCount, metrics.itemHeight));
	const minimumWindowStart = lastOccludedIndex + 1;
	const windowRange = isEmptyRange(visible) ? EMPTY_FILE_TREE_LAYOUT_RANGE : createRange(Math.max(minimumWindowStart, visible.startIndex - overscan), Math.min(totalRowCount - 1, visible.endIndex + overscan));
	const windowHeight = getRangeHeight(windowRange, metrics.itemHeight);
	return {
		occlusion: {
			firstOccludedIndex,
			lastOccludedIndex,
			occludedCount
		},
		physical: {
			itemHeight: metrics.itemHeight,
			maxScrollTop,
			overscan,
			scrollTop,
			totalHeight,
			totalRowCount,
			viewportHeight
		},
		projected: {
			contentHeight,
			paneHeight,
			paneTop
		},
		sticky: {
			height: stickyHeight,
			rows: stickyRows
		},
		visible,
		window: {
			endIndex: windowRange.endIndex,
			height: windowHeight,
			offsetTop: isEmptyRange(windowRange) ? 0 : windowRange.startIndex * metrics.itemHeight,
			startIndex: windowRange.startIndex
		}
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/utils/gitStatusPresentation.js
const GIT_STATUS_LABEL = {
	added: "A",
	deleted: "D",
	ignored: null,
	modified: "M",
	renamed: "R",
	untracked: "U"
};
const GIT_STATUS_TITLE = {
	added: "Git status: added",
	deleted: "Git status: deleted",
	ignored: "Git status: ignored",
	modified: "Git status: modified",
	renamed: "Git status: renamed",
	untracked: "Git status: untracked"
};
const GIT_STATUS_DESCENDANT_TITLE = "Contains git status items";

//#endregion
//#region node_modules/@pierre/trees/dist/render/scrollTarget.js
function computeFocusedRowScrollIntoView(input) {
	const { currentScrollTop, focusedIndex, itemHeight, topInset = 0, viewportHeight } = input;
	if (focusedIndex < 0) return null;
	const effectiveInset = Math.max(0, topInset);
	const itemTop = focusedIndex * itemHeight;
	const itemBottom = itemTop + itemHeight;
	if (itemTop < currentScrollTop + effectiveInset) {
		const nextScrollTop = Math.max(0, itemTop - effectiveInset);
		return nextScrollTop === currentScrollTop ? null : nextScrollTop;
	}
	if (itemBottom > currentScrollTop + viewportHeight) {
		const nextScrollTop = itemBottom - viewportHeight;
		return nextScrollTop === currentScrollTop ? null : nextScrollTop;
	}
	return null;
}
function computeFocusedRowScrollTopForOffset(input) {
	const { currentScrollTop, focusedIndex, itemHeight, offset, topInset = 0, totalHeight, viewportHeight } = input;
	if (offset === "nearest") return computeFocusedRowScrollIntoView({
		currentScrollTop,
		focusedIndex,
		itemHeight,
		topInset,
		viewportHeight
	});
	if (focusedIndex < 0) return null;
	const effectiveInset = Math.max(0, topInset);
	const itemTop = focusedIndex * itemHeight;
	const visibleHeight = Math.max(0, viewportHeight - effectiveInset);
	const targetViewportOffset = offset === "center" ? effectiveInset + Math.max(0, (visibleHeight - itemHeight) / 2) : effectiveInset;
	const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
	const nextScrollTop = Math.max(0, Math.min(itemTop - targetViewportOffset, maxScrollTop));
	return nextScrollTop === currentScrollTop ? null : nextScrollTop;
}
function computeViewportOffsetScrollTop(input) {
	const { currentScrollTop, focusedIndex, itemHeight, targetViewportOffset, totalHeight, viewportHeight } = input;
	if (focusedIndex < 0) return null;
	const effectiveOffset = Math.max(0, targetViewportOffset);
	const itemTop = focusedIndex * itemHeight;
	const itemBottom = itemTop + itemHeight;
	const currentViewportTop = currentScrollTop + effectiveOffset;
	const currentViewportBottom = currentScrollTop + viewportHeight;
	if (itemTop >= currentViewportTop && itemBottom <= currentViewportBottom) return null;
	const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
	const preservedScrollTop = Math.max(0, Math.min(itemTop - effectiveOffset, maxScrollTop));
	return preservedScrollTop === currentScrollTop ? null : preservedScrollTop;
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/focusHelpers.js
function focusElement(element) {
	if (element == null || !element.isConnected) return false;
	if (element === document.body || element === document.documentElement) return false;
	element.focus({ preventScroll: true });
	const rootNode = element.getRootNode();
	if (rootNode instanceof ShadowRoot) return rootNode.activeElement === element;
	return document.activeElement === element;
}
function getActiveTreeElement(rootElement) {
	const rootNode = rootElement.getRootNode();
	if (rootNode instanceof ShadowRoot) {
		const activeElement$1 = rootNode.activeElement;
		return activeElement$1 instanceof HTMLElement ? activeElement$1 : null;
	}
	const activeElement = document.activeElement;
	return activeElement instanceof HTMLElement && rootElement.contains(activeElement) ? activeElement : null;
}
function readMeasuredViewportHeight(scrollElement, fallbackViewportHeight) {
	if (scrollElement == null) return fallbackViewportHeight;
	const rectHeight = scrollElement.getBoundingClientRect().height;
	if (rectHeight > 0) return rectHeight;
	return scrollElement.clientHeight > 0 ? scrollElement.clientHeight : fallbackViewportHeight;
}
function getCachedViewportHeight(cachedViewportHeight, fallbackViewportHeight) {
	return cachedViewportHeight != null && cachedViewportHeight > 0 ? cachedViewportHeight : fallbackViewportHeight;
}
function getResizeObserverViewportHeight(entry) {
	const borderBoxSize = entry.borderBoxSize;
	const firstBorderBoxSize = Array.isArray(borderBoxSize) ? borderBoxSize[0] : borderBoxSize;
	if (firstBorderBoxSize != null && Number.isFinite(firstBorderBoxSize.blockSize) && firstBorderBoxSize.blockSize > 0) return firstBorderBoxSize.blockSize;
	return entry.contentRect.height > 0 ? entry.contentRect.height : null;
}
function scrollFocusedRowIntoView(scrollElement, focusedIndex, itemHeight, viewportHeight, topInset = 0) {
	const nextScrollTop = computeFocusedRowScrollIntoView({
		currentScrollTop: scrollElement.scrollTop,
		focusedIndex,
		itemHeight,
		topInset,
		viewportHeight
	});
	if (nextScrollTop == null) return false;
	scrollElement.scrollTop = nextScrollTop;
	return true;
}
function scrollFocusedRowToOffset(scrollElement, focusedIndex, itemHeight, viewportHeight, totalHeight, offset, topInset = 0) {
	const nextScrollTop = computeFocusedRowScrollTopForOffset({
		currentScrollTop: scrollElement.scrollTop,
		focusedIndex,
		itemHeight,
		offset,
		topInset,
		totalHeight,
		viewportHeight
	});
	if (nextScrollTop == null) return false;
	scrollElement.scrollTop = nextScrollTop;
	return true;
}
function scrollFocusedRowToViewportOffset(scrollElement, focusedIndex, itemHeight, viewportHeight, totalHeight, targetViewportOffset) {
	const nextScrollTop = computeViewportOffsetScrollTop({
		currentScrollTop: scrollElement.scrollTop,
		focusedIndex,
		itemHeight,
		targetViewportOffset,
		totalHeight,
		viewportHeight
	});
	if (nextScrollTop == null) return false;
	scrollElement.scrollTop = nextScrollTop;
	return true;
}
function getParkedFocusedRowOffset(focusedIndex, itemHeight, range, windowHeight) {
	if (range.end < range.start) return null;
	if (focusedIndex < range.start) return -itemHeight;
	if (focusedIndex > range.end) return windowHeight;
	return null;
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/renameHandoff.js
function classifyFileTreeRenameHandoff(input) {
	const { renamingPath, previousRenamingPath, hasRenderedInput } = input;
	if (renamingPath == null) return "reset";
	if (!hasRenderedInput) return "reveal-canonical";
	if (previousRenamingPath === renamingPath) return "ignore";
	return "focus-input";
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/RenameInput.js
function RenameInput({ ariaLabel, isFlattened = false, ref, value, onBlur, onInput }) {
	return /* @__PURE__ */ u$2("input", {
		ref,
		"data-item-rename-input": true,
		...isFlattened ? { "data-item-flattened-rename-input": true } : {},
		"aria-label": ariaLabel,
		value,
		onBlur,
		onInput,
		onClick: (event) => event.stopPropagation(),
		onMouseDown: (event) => event.stopPropagation(),
		onPointerDown: (event) => event.stopPropagation()
	});
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/rowAttributes.js
function computeFileTreeRowElementAttributes(input) {
	const { row, mode, targetPath, ariaLabel, domId, isParked, itemHeight, features, state, extraStyle } = input;
	const isSticky = mode === "sticky";
	const parentPath = row.ancestorPaths.at(-1) ?? "";
	const stateAttributes = {};
	if (state.isFocusRinged) stateAttributes["data-item-focused"] = true;
	if (row.isSelected) stateAttributes["data-item-selected"] = true;
	if (state.isContextHovered) stateAttributes["data-item-context-hover"] = "true";
	if (state.isDragTarget) stateAttributes["data-item-drag-target"] = true;
	if (state.isDragging) stateAttributes["data-item-dragging"] = true;
	if (state.effectiveGitStatus != null) stateAttributes["data-item-git-status"] = state.effectiveGitStatus;
	if (state.containsGitChange) stateAttributes["data-item-contains-git-change"] = "true";
	return {
		"aria-expanded": !isSticky && row.kind === "directory" ? row.isExpanded : void 0,
		"aria-haspopup": features.contextMenuEnabled ? "menu" : void 0,
		"aria-label": ariaLabel,
		"aria-level": !isSticky ? row.level + 1 : void 0,
		"aria-posinset": !isSticky ? row.posInSet + 1 : void 0,
		"aria-selected": !isSticky ? row.isSelected ? "true" : "false" : void 0,
		"aria-setsize": !isSticky ? row.setSize : void 0,
		"data-file-tree-sticky-path": isSticky ? targetPath : void 0,
		"data-file-tree-sticky-row": isSticky ? "true" : void 0,
		"data-item-context-menu-button-visibility": features.actionLaneEnabled ? features.contextMenuButtonVisibility : void 0,
		"data-item-context-menu-trigger-mode": features.contextMenuEnabled ? features.contextMenuTriggerMode : void 0,
		"data-item-has-context-menu-action-lane": features.actionLaneEnabled ? "true" : void 0,
		"data-item-has-git-lane": features.gitLaneActive ? "true" : void 0,
		"data-item-parent-path": parentPath.length > 0 ? parentPath : void 0,
		"data-item-parked": isParked ? "true" : void 0,
		"data-item-path": targetPath,
		"data-item-type": row.kind === "directory" ? "folder" : "file",
		"data-type": "item",
		id: !isSticky ? domId : void 0,
		role: !isSticky ? "treeitem" : void 0,
		style: {
			minHeight: `${itemHeight}px`,
			...extraStyle
		},
		tabIndex: !isSticky && row.isFocused ? 0 : -1,
		...stateAttributes
	};
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/rowClickPlan.js
function computeFileTreeRowClickPlan(input) {
	const { event, mode, isSearchOpen, isDirectory } = input;
	const additive = event.ctrlKey || event.metaKey;
	const hasModifier = event.shiftKey || additive;
	const selection = event.shiftKey ? {
		additive,
		kind: "range"
	} : additive ? { kind: "toggle" } : { kind: "single" };
	return {
		closeSearch: isSearchOpen,
		revealCanonical: mode === "sticky",
		selection,
		toggleDirectory: !hasModifier && isDirectory
	};
}

//#endregion
//#region node_modules/preact/hooks/dist/hooks.mjs
var t, r$1, u$1, i$1, o$1 = Object.is, f$1 = 0, c$1 = [], e = n, a$1 = e.__b, v$1 = e.__r, l$1 = e.diffed, m$1 = e.__c, s$1 = e.unmount, p$1 = e.__;
function d$1(n, t) {
	e.__h && e.__h(r$1, n, f$1 || t), f$1 = 0;
	var u = r$1.__H || (r$1.__H = {
		__: [],
		__h: []
	});
	return n >= u.__.length && u.__.push({}), u.__[n];
}
function h$1(n) {
	return f$1 = 1, y$1(D$1, n);
}
function y$1(n, u, i) {
	var f = d$1(t++, 2);
	if (f.t = n, !f.__c && (f.__ = [i ? i(u) : D$1(void 0, u), function(n) {
		var t = f.__N ? f.__N[0] : f.__[0], r = f.t(t, n);
		o$1(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
	}], f.__c = r$1, !r$1.__f)) {
		var c = function(n, t, r) {
			if (!f.__c.__H) return !0;
			var u = f.__c.__H.__.filter(function(n) {
				return !!n.__c;
			});
			if (u.every(function(n) {
				return !n.__N;
			})) return !e || e.call(this, n, t, r);
			var i = f.__c.props !== n;
			return u.forEach(function(n) {
				if (n.__N) {
					var t = n.__[0];
					n.__ = n.__N, n.__N = void 0, o$1(t, n.__[0]) || (i = !0);
				}
			}), e && e.call(this, n, t, r) || i;
		};
		r$1.__f = !0;
		var e = r$1.shouldComponentUpdate, a = r$1.componentWillUpdate;
		r$1.componentWillUpdate = function(n, t, r) {
			if (4 & this.__g) {
				var u = e;
				e = void 0, c(n, t, r), e = u;
			}
			a && a.call(this, n, t, r);
		}, r$1.shouldComponentUpdate = c;
	}
	return f.__N || f.__;
}
function _$1(n, u) {
	var i = d$1(t++, 3);
	!e.__s && C$1(i.__H, u) && (i.__ = n, i.u = u, r$1.__H.__h.push(i));
}
function A$1(n, u) {
	var i = d$1(t++, 4);
	!e.__s && C$1(i.__H, u) && (i.__ = n, i.u = u, r$1.__h.push(i));
}
function F$1(n) {
	return f$1 = 5, q$1(function() {
		return { current: n };
	}, []);
}
function q$1(n, r) {
	var u = d$1(t++, 7);
	return C$1(u.__H, r) && (u.__ = n(), u.__H = r, u.__h = n), u.__;
}
function b$1(n, t) {
	return f$1 = 8, q$1(function() {
		return n;
	}, t);
}
function g$1() {
	for (var n; n = c$1.shift();) if (n.__P && n.__H) try {
		n.__H.__h.forEach(z$1), n.__H.__h.forEach(B$1), n.__H.__h = [];
	} catch (t) {
		n.__H.__h = [], e.__e(t, n.__v);
	}
}
e.__b = function(n) {
	r$1 = null, a$1 && a$1(n);
}, e.__ = function(n, t) {
	n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p$1 && p$1(n, t);
}, e.__r = function(n) {
	v$1 && v$1(n), t = 0;
	var i = (r$1 = n.__c).__H;
	i && (u$1 === r$1 ? (i.__h = [], r$1.__h = [], i.__.forEach(function(n) {
		n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
	})) : (i.__h.forEach(z$1), i.__h.forEach(B$1), i.__h = [], t = 0)), u$1 = r$1;
}, e.diffed = function(n) {
	l$1 && l$1(n);
	var t = n.__c;
	t && t.__H && (t.__H.__h.length && (1 !== c$1.push(t) && i$1 === e.requestAnimationFrame || ((i$1 = e.requestAnimationFrame) || w$1)(g$1)), t.__H.__.forEach(function(n) {
		n.u && (n.__H = n.u), n.u = void 0;
	})), u$1 = r$1 = null;
}, e.__c = function(n, t) {
	t.some(function(n) {
		try {
			n.__h.forEach(z$1), n.__h = n.__h.filter(function(n) {
				return !n.__ || B$1(n);
			});
		} catch (r) {
			t.some(function(n) {
				n.__h && (n.__h = []);
			}), t = [], e.__e(r, n.__v);
		}
	}), m$1 && m$1(n, t);
}, e.unmount = function(n) {
	s$1 && s$1(n);
	var t, r = n.__c;
	r && r.__H && (r.__H.__.forEach(function(n) {
		try {
			z$1(n);
		} catch (n) {
			t = n;
		}
	}), r.__H = void 0, t && e.__e(t, r.__v));
};
var k$1 = "function" == typeof requestAnimationFrame;
function w$1(n) {
	var t, r = function() {
		clearTimeout(u), k$1 && cancelAnimationFrame(t), setTimeout(n);
	}, u = setTimeout(r, 35);
	k$1 && (t = requestAnimationFrame(r));
}
function z$1(n) {
	var t = r$1, u = n.__c;
	"function" == typeof u && (n.__c = void 0, u()), r$1 = t;
}
function B$1(n) {
	var t = r$1;
	n.__c = n.__(), r$1 = t;
}
function C$1(n, t) {
	return !n || n.length !== t.length || t.some(function(t, r) {
		return !o$1(t, n[r]);
	});
}
function D$1(n, t) {
	return "function" == typeof t ? t(n) : t;
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/FileTreeView.js
function formatFlattenedSegments(row, renameInput = null, dragTargetFlattenedSegmentPath = null) {
	"use no memo";
	const segments = row.flattenedSegments;
	if (segments == null || segments.length === 0) return renameInput ?? row.name;
	return /* @__PURE__ */ u$2("span", {
		"data-item-flattened-subitems": true,
		children: segments.map((segment, index) => {
			const isLast = index === segments.length - 1;
			return /* @__PURE__ */ u$2(k$2, { children: [/* @__PURE__ */ u$2("span", {
				"data-item-flattened-subitem": segment.path,
				"data-item-flattened-subitem-drag-target": dragTargetFlattenedSegmentPath === segment.path ? "true" : void 0,
				children: isLast && renameInput != null ? renameInput : /* @__PURE__ */ u$2(Truncate, { children: segment.name })
			}), index < segments.length - 1 ? " / " : ""] }, segment.path);
		})
	});
}
function getFileTreeRowPath(row) {
	return row.isFlattened ? row.flattenedSegments?.findLast((segment) => segment.isTerminal)?.path ?? row.path : row.path;
}
function getFileTreeRowAriaLabel(row) {
	const flattenedSegments = row.flattenedSegments;
	if (flattenedSegments == null || flattenedSegments.length === 0) return row.name;
	return flattenedSegments.map((segment) => segment.name).join(" / ");
}
function computeStickyRowsFromCandidates(candidates, scrollTop, itemHeight, totalRowCount) {
	return candidates.map((candidate, slotDepth) => {
		const defaultTop = slotDepth * itemHeight;
		const nextBoundaryIndex = candidate.subtreeEndIndex + 1;
		if (nextBoundaryIndex >= totalRowCount) return {
			row: candidate.row,
			top: defaultTop
		};
		const nextBoundaryTop = nextBoundaryIndex * itemHeight - scrollTop;
		return {
			row: candidate.row,
			top: Math.min(defaultTop, nextBoundaryTop - itemHeight)
		};
	}).filter((entry) => entry.top + itemHeight > 0);
}
function computeFileTreeViewLayoutState({ controller, itemHeight, overscan, scrollTop, stickyFolders, viewportHeight }) {
	const visibleCount = controller.getVisibleCount();
	const stickyCandidates = stickyFolders && visibleCount > 0 ? controller.getStickyRowCandidates(scrollTop, itemHeight) : [];
	const visibleRows = stickyCandidates == null && stickyFolders && visibleCount > 0 ? controller.getVisibleRows(0, visibleCount - 1) : [];
	const snapshot = computeFileTreeLayout(visibleRows, {
		itemHeight,
		overscan,
		scrollTop,
		stickyRows: stickyCandidates == null ? void 0 : computeStickyRowsFromCandidates(stickyCandidates, scrollTop, itemHeight, visibleCount),
		totalRowCount: visibleCount,
		viewportHeight
	});
	const previewStickyCandidates = stickyFolders && scrollTop <= 0 && visibleCount > 0 ? controller.getStickyRowCandidates(1, itemHeight) : [];
	const overlayRows = previewStickyCandidates != null && scrollTop <= 0 ? computeStickyRowsFromCandidates(previewStickyCandidates, 1, itemHeight, visibleCount) : stickyFolders && scrollTop <= 0 && visibleRows.length > 0 ? computeStickyRows(visibleRows, 1, itemHeight) : snapshot.sticky.rows;
	return {
		overlayHeight: overlayRows.reduce((maxBottom, entry) => Math.max(maxBottom, entry.top + itemHeight), 0),
		overlayRows,
		snapshot,
		visibleRows
	};
}
const TOUCH_LONG_PRESS_DELAY = 400;
const TOUCH_LONG_PRESS_MOVE_THRESHOLD = 10;
const DRAG_EDGE_SCROLL_THRESHOLD = 40;
const DRAG_EDGE_SCROLL_MAX_SPEED = 18;
function getPointElement(rootNode, clientX, clientY) {
	const pointRoot = rootNode;
	const documentElementFromPoint = document.elementFromPoint?.bind(document) ?? null;
	const element = pointRoot.elementFromPoint?.(clientX, clientY) ?? documentElementFromPoint?.(clientX, clientY) ?? null;
	if (rootNode instanceof ShadowRoot && (element == null || !rootNode.contains(element))) return getShadowPointElementByGeometry(rootNode, clientX, clientY);
	return element instanceof HTMLElement ? element : null;
}
function getShadowPointElementByGeometry(rootNode, clientX, clientY) {
	const candidates = Array.from(rootNode.querySelectorAll("[data-type=\"item\"], [data-item-flattened-subitem]"));
	for (let index = candidates.length - 1; index >= 0; index--) {
		const candidate = candidates[index];
		const rect = candidate.getBoundingClientRect();
		if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return candidate;
	}
	return null;
}
function resolveDropTargetFromElement(target) {
	const rowButton = target?.closest?.("[data-type=\"item\"]");
	if (!(rowButton instanceof HTMLElement)) return null;
	const hoveredPath = rowButton.dataset.itemPath ?? null;
	if (hoveredPath == null) return null;
	const flattenedSegment = target?.closest?.("[data-item-flattened-subitem]");
	const flattenedSegmentPath = flattenedSegment instanceof HTMLElement ? flattenedSegment.getAttribute("data-item-flattened-subitem") ?? null : null;
	if (flattenedSegmentPath != null && flattenedSegmentPath.endsWith("/")) return {
		directoryPath: flattenedSegmentPath,
		flattenedSegmentPath,
		hoveredPath,
		kind: "directory"
	};
	if (rowButton.dataset.itemType === "folder") return {
		directoryPath: hoveredPath,
		flattenedSegmentPath: null,
		hoveredPath,
		kind: "directory"
	};
	const parentPath = rowButton.dataset.itemParentPath ?? null;
	if (parentPath == null || parentPath.length === 0) return {
		directoryPath: null,
		flattenedSegmentPath: null,
		hoveredPath,
		kind: "root"
	};
	return {
		directoryPath: parentPath,
		flattenedSegmentPath: null,
		hoveredPath,
		kind: "directory"
	};
}
function createDragPreviewElement(sourceElement) {
	const preview = sourceElement.cloneNode(true);
	preview.removeAttribute("id");
	preview.dataset.fileTreeDragPreview = "true";
	preview.setAttribute("aria-hidden", "true");
	preview.tabIndex = -1;
	Object.assign(preview.style, {
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
		left: "0px",
		margin: "0",
		pointerEvents: "none",
		position: "fixed",
		top: "0px",
		willChange: "transform",
		zIndex: "10000"
	});
	return preview;
}
function shouldUseCustomPointerDragImage() {
	return navigator.vendor !== "Apple Computer, Inc.";
}
function getDragEdgeScrollDelta(clientY, scrollRect) {
	const topDistance = clientY - scrollRect.top;
	if (topDistance < DRAG_EDGE_SCROLL_THRESHOLD) {
		const clampedDistance = Math.max(0, topDistance);
		return -Math.ceil((DRAG_EDGE_SCROLL_THRESHOLD - clampedDistance) / DRAG_EDGE_SCROLL_THRESHOLD * DRAG_EDGE_SCROLL_MAX_SPEED);
	}
	const bottomDistance = scrollRect.bottom - clientY;
	if (bottomDistance < DRAG_EDGE_SCROLL_THRESHOLD) {
		const clampedDistance = Math.max(0, bottomDistance);
		return Math.ceil((DRAG_EDGE_SCROLL_THRESHOLD - clampedDistance) / DRAG_EDGE_SCROLL_THRESHOLD * DRAG_EDGE_SCROLL_MAX_SPEED);
	}
	return 0;
}
function getBuiltInGitStatusDecoration(gitStatus, containsGitChange) {
	if (gitStatus != null) {
		const label = GIT_STATUS_LABEL[gitStatus];
		if (label == null) return null;
		return {
			text: label,
			title: GIT_STATUS_TITLE[gitStatus]
		};
	}
	if (containsGitChange) return {
		icon: {
			name: "file-tree-icon-dot",
			width: 6,
			height: 6
		},
		title: GIT_STATUS_DESCENDANT_TITLE
	};
	return null;
}
function getInheritedIgnoredGitStatus(ancestorPaths, ignoredDirectoryPaths, ignoredInheritanceCache) {
	if (ignoredDirectoryPaths == null || ignoredDirectoryPaths.size === 0) return null;
	const visitedAncestors = [];
	for (let index = ancestorPaths.length - 1; index >= 0; index -= 1) {
		const ancestorPath = ancestorPaths[index];
		const cached = ignoredInheritanceCache.get(ancestorPath);
		if (cached != null) {
			for (const visitedAncestor of visitedAncestors) ignoredInheritanceCache.set(visitedAncestor, cached);
			return cached ? "ignored" : null;
		}
		if (ignoredDirectoryPaths.has(ancestorPath)) {
			ignoredInheritanceCache.set(ancestorPath, true);
			for (const visitedAncestor of visitedAncestors) ignoredInheritanceCache.set(visitedAncestor, true);
			return "ignored";
		}
		visitedAncestors.push(ancestorPath);
	}
	for (const visitedAncestor of visitedAncestors) ignoredInheritanceCache.set(visitedAncestor, false);
	return null;
}
function isFileTreeDirectoryHandle(item) {
	return item != null && "toggle" in item;
}
function isSpaceSelectionKey(event) {
	return event.code === "Space" || event.key === " " || event.key === "Spacebar";
}
function isSearchOpenSeedKey(event) {
	return event.key.length === 1 && /^[\p{L}\p{N}]$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;
}
function getFileTreeGuideStyleText(focusedParentPath) {
	if (focusedParentPath == null) return "";
	return `[data-item-section="spacing-item"][data-ancestor-path="${focusedParentPath.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"] { opacity: 1; }`;
}
function isContextMenuOpenKey(event) {
	return event.shiftKey && event.key === "F10" || event.key === "ContextMenu";
}
function canKeyUseStickyKeyboardState(event, contextMenuEnabled) {
	if (contextMenuEnabled && isContextMenuOpenKey(event)) return true;
	if ((event.ctrlKey || event.metaKey) && isSpaceSelectionKey(event)) return true;
	return event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp";
}
const BLOCKED_CONTEXT_MENU_NAV_KEYS = new Set([
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"End",
	"Home",
	"PageDown",
	"PageUp"
]);
function isEventInContextMenu(event) {
	for (const entry of event.composedPath()) {
		if (!(entry instanceof HTMLElement)) continue;
		if (entry.dataset.fileTreeContextMenuRoot === "true") return true;
		if (entry.dataset.type === "context-menu-anchor" || entry.dataset.type === CONTEXT_MENU_TRIGGER_TYPE) return true;
		if (entry.getAttribute("slot") === CONTEXT_MENU_SLOT_NAME) return true;
	}
	return false;
}
function serializeAnchorRect(rect) {
	return {
		bottom: rect.bottom,
		height: rect.height,
		left: rect.left,
		right: rect.right,
		top: rect.top,
		width: rect.width,
		x: rect.x,
		y: rect.y
	};
}
function createAnchorRectFromPoint(x, y) {
	return {
		bottom: y,
		height: 0,
		left: x,
		right: x,
		top: y,
		width: 0,
		x,
		y
	};
}
function getContextMenuAnchorTop(rootElement, itemElement) {
	if (rootElement == null) return itemElement.offsetTop;
	const itemRect = itemElement.getBoundingClientRect();
	const rootRect = rootElement.getBoundingClientRect();
	return itemRect.top - rootRect.top;
}
function setButtonRef(buttonRefs, path, element) {
	if (element == null) {
		buttonRefs.delete(path);
		return;
	}
	buttonRefs.set(path, element);
}
function getContextMenuAnchorButton(path, stickyButtonRefs, rowButtonRefs) {
	if (path == null) return null;
	const stickyButton = stickyButtonRefs.get(path) ?? null;
	if (stickyButton != null) return stickyButton;
	const rowButton = rowButtonRefs.get(path) ?? null;
	return rowButton?.dataset.itemParked === "true" ? null : rowButton;
}
function getMountedStickyRowPaths(rootElement) {
	if (rootElement == null) return [];
	const paths = [];
	for (const element of rootElement.querySelectorAll("button[data-file-tree-sticky-row=\"true\"]")) {
		if (!(element instanceof HTMLElement)) continue;
		const path = element.dataset.fileTreeStickyPath;
		if (path != null) paths.push(path);
	}
	return paths;
}
function getFocusedParkedRowElement(rootElement, path) {
	if (rootElement == null || path == null) return null;
	for (const element of rootElement.querySelectorAll("button[data-item-focused=\"true\"][data-item-parked=\"true\"]")) if (element instanceof HTMLElement && element.dataset.itemPath === path) return element;
	return null;
}
function getStickyKeyboardViewportOffset(rootElement, scrollElement, activeTreeElement, path, itemHeight, stickyOverlayHeight, viewportHeight) {
	const minimumStickyKeyboardViewportOffset = Math.max(0, stickyOverlayHeight - itemHeight);
	const scrollElementRect = scrollElement?.getBoundingClientRect() ?? null;
	const activeElementTopWithinViewport = scrollElementRect == null || activeTreeElement == null ? null : activeTreeElement.getBoundingClientRect().top - scrollElementRect.top;
	const focusedParkedRowElement = getFocusedParkedRowElement(rootElement, path);
	const parkedElementTopWithinViewport = scrollElementRect == null || focusedParkedRowElement == null ? null : focusedParkedRowElement.getBoundingClientRect().top - scrollElementRect.top;
	return Math.max(0, Math.min(parkedElementTopWithinViewport ?? Math.max(activeElementTopWithinViewport ?? 0, minimumStickyKeyboardViewportOffset), Math.max(0, viewportHeight - itemHeight)));
}
function createContextMenuItem(row, path) {
	return {
		kind: row.kind,
		name: getFileTreeRowAriaLabel(row),
		path
	};
}
function getFileTreeRootDomId(instanceId) {
	return instanceId == null ? void 0 : `${instanceId}__tree`;
}
function getFileTreeFocusedRowDomId(instanceId, path, parked) {
	if (instanceId == null) return;
	return `${instanceId}__focused-item-${encodeURIComponent(path)}${parked ? "__parked" : ""}`;
}
function isBuiltInDecorationIconName(name) {
	return name === "file-tree-icon-chevron" || name === "file-tree-icon-dot" || name === "file-tree-icon-file" || name === "file-tree-icon-lock";
}
function renderRowDecoration(decoration, resolveIcon) {
	if (decoration == null) return null;
	if ("text" in decoration) return /* @__PURE__ */ u$2("span", {
		title: decoration.title,
		children: decoration.text
	});
	const icon = typeof decoration.icon === "string" ? isBuiltInDecorationIconName(decoration.icon) ? resolveIcon(decoration.icon) : { name: decoration.icon } : isBuiltInDecorationIconName(decoration.icon.name) ? (() => {
		const resolvedIcon = resolveIcon(decoration.icon.name);
		const { name: _ignoredName, ...iconOverrides } = decoration.icon;
		return {
			...resolvedIcon,
			...iconOverrides
		};
	})() : decoration.icon;
	return /* @__PURE__ */ u$2("span", {
		title: decoration.title,
		children: /* @__PURE__ */ u$2(Icon, { ...icon })
	});
}
function focusFirstMenuElement(menuElement) {
	if (menuElement == null) return;
	focusElement(menuElement.querySelector([
		"button:not([disabled])",
		"[href]",
		"input:not([disabled])",
		"select:not([disabled])",
		"textarea:not([disabled])",
		"[tabindex]:not([tabindex=\"-1\"])"
	].join(", ")) ?? menuElement);
}
function renderFileTreeRowContent(row, resolveIcon, { actionLaneEnabled = false, customDecoration = null, decorationLaneEnabled = false, dragTargetFlattenedSegmentPath = null, gitDecoration = null, gitLaneActive = false, renameInput = null, showDecorativeActionAffordance = false } = {}) {
	const targetPath = getFileTreeRowPath(row);
	return /* @__PURE__ */ u$2(k$2, { children: [
		row.depth > 0 ? /* @__PURE__ */ u$2("div", {
			"data-item-section": "spacing",
			children: Array.from({ length: row.depth }).map((_, index) => /* @__PURE__ */ u$2("div", {
				"data-item-section": "spacing-item",
				"data-ancestor-path": row.ancestorPaths[index]
			}, index))
		}) : null,
		/* @__PURE__ */ u$2("div", {
			"data-item-section": "icon",
			children: row.kind === "directory" ? /* @__PURE__ */ u$2(Icon, { ...resolveIcon("file-tree-icon-chevron") }) : /* @__PURE__ */ u$2(Icon, { ...resolveIcon("file-tree-icon-file", targetPath) })
		}),
		/* @__PURE__ */ u$2("div", {
			"data-item-section": "content",
			children: row.isFlattened ? formatFlattenedSegments(row, renameInput, dragTargetFlattenedSegmentPath) : renameInput ?? /* @__PURE__ */ u$2(MiddleTruncate, {
				minimumLength: 5,
				split: "extension",
				children: row.name
			})
		}),
		decorationLaneEnabled ? /* @__PURE__ */ u$2("div", {
			"data-item-section": "decoration",
			children: customDecoration != null ? renderRowDecoration(customDecoration, resolveIcon) : null
		}) : null,
		gitLaneActive ? /* @__PURE__ */ u$2("div", {
			"data-item-section": "git",
			children: renderRowDecoration(gitDecoration, resolveIcon)
		}) : null,
		actionLaneEnabled ? /* @__PURE__ */ u$2("div", {
			"data-item-section": "action",
			children: showDecorativeActionAffordance ? /* @__PURE__ */ u$2("span", {
				"aria-hidden": "true",
				"data-item-action-affordance": "decorative",
				children: /* @__PURE__ */ u$2(Icon, { ...resolveIcon("file-tree-icon-ellipsis") })
			}) : null
		}) : null
	] });
}
function renderStyledRow(frame, row, key, options = {}) {
	const { controller, renameView, visualFocusPath, contextHoverPath, draggedPathSet, dragTarget, dragAndDropEnabled, shouldSuppressContextMenu, handleRowDragStart, handleRowDragEnd, handleRowTouchStart, instanceId, itemHeight, gitStatusByPath, ignoredGitDirectories, ignoredInheritanceCache, directoriesWithGitChanges, gitLaneActive, contextMenuEnabled, contextMenuTriggerMode, contextMenuButtonTriggerEnabled, contextMenuButtonVisibility, contextMenuRightClickEnabled, registerRenameInput, registerButton, resolveIcon, renderDecorationForRow, openContextMenuForRow, onRowClick, onKeyDown } = frame;
	const targetPath = getFileTreeRowPath(row);
	const { isParked = false, mode = "flow", style } = options;
	const isSticky = mode === "sticky";
	const effectiveGitStatus = gitStatusByPath?.get(targetPath) ?? null ?? getInheritedIgnoredGitStatus(row.ancestorPaths, ignoredGitDirectories, ignoredInheritanceCache);
	const containsGitChange = row.kind === "directory" && (directoriesWithGitChanges?.has(targetPath) ?? false);
	const customDecoration = renderDecorationForRow(row, targetPath);
	const gitDecoration = getBuiltInGitStatusDecoration(effectiveGitStatus, containsGitChange);
	const actionLaneEnabled = contextMenuEnabled && contextMenuButtonTriggerEnabled;
	const decorationLaneEnabled = customDecoration != null || gitLaneActive || actionLaneEnabled;
	const showDecorativeActionAffordance = actionLaneEnabled && contextMenuButtonVisibility === "always";
	const isRenamingRow = renameView.getPath() === targetPath;
	const renamingValue = isRenamingRow ? renameView.getValue() : "";
	const renameInput = isSticky || !isRenamingRow ? null : /* @__PURE__ */ u$2(RenameInput, {
		ref: registerRenameInput,
		ariaLabel: `Rename ${getFileTreeRowAriaLabel(row)}`,
		isFlattened: row.isFlattened,
		value: renamingValue,
		onBlur: () => {
			renameView.commit();
		},
		onInput: (event) => {
			renameView.setValue(event.currentTarget.value);
		}
	});
	const rowContent = renderFileTreeRowContent(row, resolveIcon, {
		actionLaneEnabled,
		customDecoration,
		decorationLaneEnabled,
		dragTargetFlattenedSegmentPath: dragTarget?.flattenedSegmentPath ?? null,
		gitDecoration,
		gitLaneActive,
		renameInput,
		showDecorativeActionAffordance
	});
	const commonProps = {
		...computeFileTreeRowElementAttributes({
			ariaLabel: getFileTreeRowAriaLabel(row),
			domId: row.isFocused ? getFileTreeFocusedRowDomId(instanceId, targetPath, isParked) : void 0,
			extraStyle: style,
			features: {
				actionLaneEnabled,
				contextMenuButtonVisibility: actionLaneEnabled ? contextMenuButtonVisibility : null,
				contextMenuEnabled,
				contextMenuTriggerMode: contextMenuEnabled ? contextMenuTriggerMode : null,
				gitLaneActive
			},
			isParked,
			itemHeight,
			mode,
			row,
			state: {
				containsGitChange,
				effectiveGitStatus,
				isContextHovered: contextHoverPath === targetPath,
				isDragTarget: dragTarget?.kind === "directory" && dragTarget.directoryPath === targetPath,
				isDragging: draggedPathSet?.has(targetPath) === true,
				isFocusRinged: row.isFocused && visualFocusPath === targetPath
			},
			targetPath
		}),
		key,
		onContextMenu: contextMenuEnabled || dragAndDropEnabled ? (event) => {
			if (shouldSuppressContextMenu()) {
				event.preventDefault();
				return;
			}
			if (!contextMenuEnabled) return;
			event.preventDefault();
			if (!contextMenuRightClickEnabled) return;
			controller.focusMountedPathFromInput(targetPath);
			openContextMenuForRow(row, targetPath, {
				anchorRect: createAnchorRectFromPoint(event.clientX, event.clientY),
				source: "right-click"
			});
		} : void 0,
		onFocus: !isSticky ? () => {
			controller.focusMountedPathFromInput(targetPath);
		} : void 0,
		onKeyDown: !isSticky ? onKeyDown : void 0,
		ref: (element) => {
			registerButton(targetPath, element);
		}
	};
	if (!isSticky && isRenamingRow) return /* @__PURE__ */ u$2("div", {
		...commonProps,
		children: rowContent
	});
	return /* @__PURE__ */ u$2("button", {
		...commonProps,
		type: "button",
		draggable: dragAndDropEnabled && !isParked,
		onDragEnd: dragAndDropEnabled && !isParked ? handleRowDragEnd : void 0,
		onDragStart: dragAndDropEnabled && !isParked ? (event) => {
			handleRowDragStart(event, row, targetPath);
		} : void 0,
		onMouseDown: (event) => {
			if (isSticky) {
				event.preventDefault();
				return;
			}
			if (controller.isSearchOpen()) event.preventDefault();
		},
		onTouchStart: dragAndDropEnabled && !isParked ? (event) => {
			handleRowTouchStart(event, row, targetPath);
		} : void 0,
		onClick: (event) => {
			onRowClick(event, row, targetPath, mode);
		},
		children: rowContent
	});
}
function renderRangeChildren(frame, range, hiddenRowPaths) {
	if (range.end < range.start) return [];
	return frame.controller.getVisibleRows(range.start, range.end).filter((row) => !hiddenRowPaths.has(getFileTreeRowPath(row))).map((row, slotIndex) => renderStyledRow(frame, row, range.start + slotIndex));
}
function FileTreeView({ composition, controller, gitStatusByPath, ignoredGitDirectories, directoriesWithGitChanges, icons, instanceId, itemHeight = FILE_TREE_DEFAULT_ITEM_HEIGHT, overscan = FILE_TREE_DEFAULT_OVERSCAN, renamingEnabled = false, renderRowDecoration: renderRowDecoration$1, searchBlurBehavior = "close", searchEnabled = false, searchFakeFocus = false, slotHost, stickyFolders = false, initialViewportHeight = FILE_TREE_DEFAULT_VIEWPORT_HEIGHT }) {
	"use no memo";
	const contextMenuAnchorRef = F$1(null);
	const contextMenuTriggerRef = F$1(null);
	const isScrollingRef = F$1(false);
	const listRef = F$1(null);
	const renameInputRef = F$1(null);
	const rootRef = F$1(null);
	const scrollRef = F$1(null);
	const searchInputRef = F$1(null);
	const rowButtonRefs = F$1(/* @__PURE__ */ new Map());
	const stickyRowButtonRefs = F$1(/* @__PURE__ */ new Map());
	const updateViewportRef = F$1(() => {});
	const measuredViewportHeightRef = F$1(null);
	const processedScrollRequestIdRef = F$1(0);
	const initialFocusedScrollAppliedRef = F$1(false);
	const initialFocusedScrollControllerRef = F$1(null);
	if (initialFocusedScrollControllerRef.current !== controller) {
		initialFocusedScrollAppliedRef.current = false;
		initialFocusedScrollControllerRef.current = controller;
	}
	const domFocusOwnerRef = F$1(false);
	const previousFocusedPathRef = F$1(null);
	const previousRenamingPathRef = F$1(null);
	const restoreTreeFocusAfterSearchCloseRef = F$1(false);
	const restoreTreeFocusViewportOffsetRef = F$1(null);
	const dragAutoScrollFrameRef = F$1(null);
	const dragHoverOpenKeyRef = F$1(null);
	const dragHoverOpenTimerRef = F$1(null);
	const dragPointRef = F$1(null);
	const dragPreviewRef = F$1(null);
	const dragRowSnapshotRef = F$1(null);
	const touchCleanupRef = F$1(null);
	const touchDragActiveRef = F$1(false);
	const touchPreviewOffsetRef = F$1(null);
	const touchSourceElementRef = F$1(null);
	const touchStartPointRef = F$1(null);
	const touchLongPressTimerRef = F$1(null);
	const ignoredInheritanceCache = q$1(() => /* @__PURE__ */ new Map(), []);
	const [, setControllerRevision] = h$1(0);
	const [activeItemPath, setActiveItemPath] = h$1(null);
	const [contextHoverPath, setContextHoverPath] = h$1(null);
	const [contextMenuAnchorTop, setContextMenuAnchorTop] = h$1(null);
	const [lastContextMenuInteraction, setLastContextMenuInteraction] = h$1(null);
	const [scrollSettledRevision, setScrollSettledRevision] = h$1(0);
	const [contextMenuState, setContextMenuState] = h$1(null);
	const contextMenuStateRef = F$1(contextMenuState);
	contextMenuStateRef.current = contextMenuState;
	const pendingStickyFocusPathRef = F$1(null);
	const pendingStickyKeyboardFocusPathRef = F$1(null);
	const pendingStickyKeyboardViewportOffsetRef = F$1(null);
	const pendingStickyKeyboardScrollTopRef = F$1(null);
	const debugContextMenuTriggerPathRef = F$1(null);
	const debugDisableScrollSuppressionRef = F$1(false);
	const clearPendingStickyKeyboardState = () => {
		pendingStickyKeyboardFocusPathRef.current = null;
		pendingStickyKeyboardViewportOffsetRef.current = null;
		pendingStickyKeyboardScrollTopRef.current = null;
	};
	const preserveStickyKeyboardFocusAtScrollTop = (path, scrollTop) => {
		pendingStickyKeyboardFocusPathRef.current = path;
		pendingStickyKeyboardViewportOffsetRef.current = null;
		pendingStickyKeyboardScrollTopRef.current = scrollTop == null ? null : {
			path,
			scrollTop
		};
	};
	const restoreStickyKeyboardViewportOffset = (path, viewportOffset) => {
		pendingStickyKeyboardFocusPathRef.current = null;
		pendingStickyKeyboardViewportOffsetRef.current = {
			path,
			viewportOffset
		};
		pendingStickyKeyboardScrollTopRef.current = null;
	};
	const skipInitialSearchAutoFocusRef = F$1(searchBlurBehavior === "retain" && controller.isSearchOpen());
	const [fakeSearchFocusActive, setFakeSearchFocusActive] = h$1(searchFakeFocus);
	_$1(() => {
		if (!searchFakeFocus) setFakeSearchFocusActive(false);
	}, [searchFakeFocus]);
	const searchInputUserInteractedRef = F$1(false);
	const markSearchInputInteracted = b$1(() => {
		searchInputUserInteractedRef.current = true;
		setFakeSearchFocusActive((previous) => previous ? false : previous);
	}, []);
	const [layoutState, setLayoutState] = h$1(() => computeFileTreeViewLayoutState({
		controller,
		itemHeight,
		overscan,
		scrollTop: 0,
		stickyFolders,
		viewportHeight: initialViewportHeight
	}));
	const [hasStickyUiMount, setHasStickyUiMount] = h$1(false);
	_$1(() => {
		setHasStickyUiMount(true);
	}, []);
	const contextMenuEnabled = composition?.contextMenu?.enabled === true || composition?.contextMenu?.render != null || composition?.contextMenu?.onOpen != null || composition?.contextMenu?.onClose != null;
	const contextMenuTriggerMode = composition?.contextMenu?.triggerMode ?? (contextMenuEnabled ? "right-click" : "both");
	const contextMenuButtonTriggerEnabled = contextMenuTriggerMode === "both" || contextMenuTriggerMode === "button";
	const contextMenuButtonVisibility = composition?.contextMenu?.buttonVisibility ?? "when-needed";
	const contextMenuRightClickEnabled = contextMenuTriggerMode === "both" || contextMenuTriggerMode === "right-click";
	A$1(() => {
		const rootElement = rootRef.current;
		if (rootElement == null) return;
		const handleDebugSetContextMenuTrigger = (event) => {
			if (!(event instanceof CustomEvent)) return;
			const nextPath = event.detail?.path ?? null;
			debugContextMenuTriggerPathRef.current = nextPath;
			setContextHoverPath(nextPath);
			setLastContextMenuInteraction(nextPath == null ? null : "pointer");
		};
		const handleDebugSetScrollSuppression = (event) => {
			if (!(event instanceof CustomEvent)) return;
			debugDisableScrollSuppressionRef.current = event.detail?.disabled === true;
		};
		rootElement.addEventListener("file-tree-debug-set-context-menu-trigger", handleDebugSetContextMenuTrigger);
		rootElement.addEventListener("file-tree-debug-set-scroll-suppression", handleDebugSetScrollSuppression);
		return () => {
			rootElement.removeEventListener("file-tree-debug-set-context-menu-trigger", handleDebugSetContextMenuTrigger);
			rootElement.removeEventListener("file-tree-debug-set-scroll-suppression", handleDebugSetScrollSuppression);
		};
	}, []);
	const registerRowButton = b$1((path, element) => {
		setButtonRef(rowButtonRefs.current, path, element);
	}, []);
	const registerStickyRowButton = b$1((path, element) => {
		setButtonRef(stickyRowButtonRefs.current, path, element);
	}, []);
	const registerRenameInput = b$1((element) => {
		renameInputRef.current = element;
	}, []);
	const getTriggerAnchorButton = b$1((path) => {
		return getContextMenuAnchorButton(path, stickyRowButtonRefs.current, rowButtonRefs.current);
	}, []);
	const gitLaneActive = gitStatusByPath != null || ignoredGitDirectories != null || directoriesWithGitChanges != null;
	const { resolveIcon } = q$1(() => createFileTreeIconResolver(icons), [icons]);
	const renameView = controller[FILE_TREE_RENAME_VIEW]();
	const renamingPath = renameView.getPath();
	const isRenaming = renamingPath != null;
	const isSearchOpen = controller.isSearchOpen();
	const searchValue = controller.getSearchValue();
	const focusedPath = controller.getFocusedPath();
	const focusedIndex = controller.getFocusedIndex();
	const scrollRequest = controller.getScrollRequest();
	const dragAndDropEnabled = controller.isDragAndDropEnabled();
	const dragSession = controller.getDragSession();
	const draggedPathSet = q$1(() => dragSession == null ? null : new Set(dragSession.draggedPaths), [dragSession]);
	const dragTarget = dragSession?.target ?? null;
	const draggedPrimaryPath = dragSession?.primaryPath ?? null;
	const treeDomId = getFileTreeRootDomId(instanceId);
	const { overlayHeight: overlayRowsHeight, overlayRows, snapshot: layoutSnapshot, visibleRows } = layoutState;
	const resolvedViewportHeight = layoutSnapshot.physical.viewportHeight;
	const range = q$1(() => ({
		end: layoutSnapshot.window.endIndex,
		start: layoutSnapshot.window.startIndex
	}), [layoutSnapshot.window.endIndex, layoutSnapshot.window.startIndex]);
	const stickyRows = overlayRows;
	const occludedStickyRows = layoutSnapshot.sticky.rows;
	const totalScrollableHeight = layoutSnapshot.physical.totalHeight;
	const stickyOverlayHeight = layoutSnapshot.sticky.height;
	const stickyRowPathSet = q$1(() => new Set(occludedStickyRows.map((entry) => getFileTreeRowPath(entry.row))), [occludedStickyRows]);
	const focusedRowIsMounted = focusedIndex >= 0 && focusedIndex >= range.start && focusedIndex <= range.end;
	const renderDecorationForRow = b$1((row, targetPath) => renderRowDecoration$1?.({
		item: createContextMenuItem(row, targetPath),
		row
	}) ?? null, [renderRowDecoration$1]);
	const restoreContextMenuFocus = b$1((restorePath) => {
		if (focusElement(restorePath == null ? null : rowButtonRefs.current.get(restorePath) ?? null)) return true;
		return focusElement(rootRef.current);
	}, []);
	const restoreFocusToTree = b$1((path) => {
		restoreContextMenuFocus(controller.focusNearestPath(path));
	}, [controller, restoreContextMenuFocus]);
	const restoreFocusToTreeRef = F$1(restoreFocusToTree);
	restoreFocusToTreeRef.current = restoreFocusToTree;
	const shouldRestoreContextMenuFocusRef = F$1(true);
	const closeContextMenuRef = F$1(() => {});
	const closeContextMenu = b$1((restoreFocus = true) => {
		const currentContextMenuState = contextMenuStateRef.current;
		if (currentContextMenuState == null) return;
		shouldRestoreContextMenuFocusRef.current = shouldRestoreContextMenuFocusRef.current && restoreFocus;
		setContextMenuState(null);
		composition?.contextMenu?.onClose?.();
		if (shouldRestoreContextMenuFocusRef.current) restoreFocusToTree(currentContextMenuState.path);
	}, [composition?.contextMenu, restoreFocusToTree]);
	closeContextMenuRef.current = closeContextMenu;
	const updateTriggerPosition = b$1((itemButton) => {
		const nextTop = itemButton == null ? null : getContextMenuAnchorTop(rootRef.current, itemButton);
		setContextMenuAnchorTop((previousTop) => previousTop === nextTop ? previousTop : nextTop);
	}, []);
	const openContextMenuForRow = b$1((row, targetPath, options) => {
		const item = controller.getItem(targetPath);
		if (item == null) return;
		const anchorButton = getTriggerAnchorButton(targetPath);
		if (anchorButton?.dataset.fileTreeStickyRow === "true") {
			const scrollElement = scrollRef.current;
			preserveStickyKeyboardFocusAtScrollTop(targetPath, scrollElement?.scrollTop ?? null);
			domFocusOwnerRef.current = true;
			setActiveItemPath((previousPath) => previousPath === targetPath ? previousPath : targetPath);
		}
		item.focus();
		updateTriggerPosition(anchorButton);
		shouldRestoreContextMenuFocusRef.current = true;
		setContextMenuState({
			anchorRect: options?.anchorRect ?? null,
			item: createContextMenuItem(row, targetPath),
			path: targetPath,
			source: options?.source ?? "keyboard"
		});
	}, [
		controller,
		getTriggerAnchorButton,
		updateTriggerPosition
	]);
	const startRenameFromPath = b$1((path) => {
		if (!renamingEnabled) return;
		if (controller.isSearchOpen()) {
			const scrollElement = scrollRef.current;
			const viewportHeight = readMeasuredViewportHeight(scrollElement, resolvedViewportHeight);
			restoreTreeFocusViewportOffsetRef.current = focusedIndex < 0 || scrollElement == null ? null : Math.max(0, Math.min(focusedIndex * itemHeight - scrollElement.scrollTop, Math.max(0, viewportHeight - itemHeight)));
			restoreTreeFocusAfterSearchCloseRef.current = true;
		}
		if (controller.startRenaming(path) === false) return;
		setLastContextMenuInteraction("focus");
		setControllerRevision((revision) => revision + 1);
	}, [
		controller,
		focusedIndex,
		itemHeight,
		renamingEnabled,
		resolvedViewportHeight
	]);
	const revealCanonicalRowAtStickyOffset = b$1((path, { restoreTreeFocus = true, targetOffset = "live-overlay" } = {}) => {
		const scrollElement = scrollRef.current;
		if (scrollElement == null) return false;
		controller.focusPath(path);
		const visibleIndex = controller.getFocusedIndex();
		if (visibleIndex < 0) return false;
		const focusedRow = controller.getVisibleRows(visibleIndex, visibleIndex)[0] ?? null;
		if (focusedRow == null) return false;
		const liveViewportHeight = readMeasuredViewportHeight(scrollElement, resolvedViewportHeight);
		const liveTotalHeight = controller.getVisibleCount() * itemHeight;
		const targetViewportOffset = targetOffset === "sticky-parents" ? focusedRow.ancestorPaths.length * itemHeight : computeFileTreeViewLayoutState({
			controller,
			itemHeight,
			overscan,
			scrollTop: scrollElement.scrollTop,
			stickyFolders,
			viewportHeight: liveViewportHeight
		}).snapshot.sticky.height;
		domFocusOwnerRef.current = true;
		scrollFocusedRowToViewportOffset(scrollElement, visibleIndex, itemHeight, liveViewportHeight, liveTotalHeight, targetViewportOffset);
		updateViewportRef.current();
		pendingStickyFocusPathRef.current = restoreTreeFocus ? path : null;
		return true;
	}, [
		controller,
		itemHeight,
		overscan,
		resolvedViewportHeight,
		stickyFolders
	]);
	const shouldSuppressContextMenu = () => {
		return isScrollingRef.current === true || touchLongPressTimerRef.current != null || touchDragActiveRef.current === true;
	};
	const requestDragAnimationFrame = (callback) => {
		return typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(() => {
			callback();
		}) : window.setTimeout(callback, 16);
	};
	const cancelDragAnimationFrame = (handle) => {
		if (handle == null) return;
		if (typeof window.cancelAnimationFrame === "function") {
			window.cancelAnimationFrame(handle);
			return;
		}
		window.clearTimeout(handle);
	};
	const clearDragHoverOpen = () => {
		if (dragHoverOpenTimerRef.current != null) {
			clearTimeout(dragHoverOpenTimerRef.current);
			dragHoverOpenTimerRef.current = null;
		}
		dragHoverOpenKeyRef.current = null;
	};
	const clearDragPreview = () => {
		dragPreviewRef.current?.remove();
		dragPreviewRef.current = null;
	};
	const stopDragAutoScroll = () => {
		cancelDragAnimationFrame(dragAutoScrollFrameRef.current);
		dragAutoScrollFrameRef.current = null;
		dragPointRef.current = null;
	};
	const mountDragPreview = (preview) => {
		const rootNode = rootRef.current?.getRootNode();
		if (rootNode instanceof ShadowRoot) {
			rootNode.append(preview);
			return;
		}
		document.body.append(preview);
	};
	const clearTouchDragResources = () => {
		touchCleanupRef.current?.();
		touchCleanupRef.current = null;
		if (touchLongPressTimerRef.current != null) {
			clearTimeout(touchLongPressTimerRef.current);
			touchLongPressTimerRef.current = null;
		}
		touchDragActiveRef.current = false;
		touchPreviewOffsetRef.current = null;
		touchStartPointRef.current = null;
		if (touchSourceElementRef.current != null) {
			touchSourceElementRef.current.setAttribute("draggable", "true");
			touchSourceElementRef.current.style.removeProperty("touch-action");
			touchSourceElementRef.current = null;
		}
		clearDragPreview();
		clearDragHoverOpen();
		stopDragAutoScroll();
		dragRowSnapshotRef.current = null;
	};
	const syncDropTargetFromPoint = (clientX, clientY) => {
		const rootNode = rootRef.current?.getRootNode();
		const nextTarget = resolveDropTargetFromElement(getPointElement(rootNode instanceof ShadowRoot ? rootNode : document, clientX, clientY));
		controller.setDragTarget(nextTarget);
		return controller.getDragSession()?.target ?? null;
	};
	const scheduleDragHoverOpen = (nextTarget) => {
		const openDelay = controller.getDragAndDropConfig()?.openOnDropDelay ?? 800;
		if (nextTarget == null || nextTarget.kind !== "directory" || nextTarget.directoryPath == null || openDelay <= 0) {
			clearDragHoverOpen();
			return;
		}
		const targetItem = controller.getItem(nextTarget.directoryPath);
		const directoryItem = isFileTreeDirectoryHandle(targetItem) ? targetItem : null;
		if (directoryItem == null || directoryItem.isExpanded()) {
			clearDragHoverOpen();
			return;
		}
		const nextKey = `${nextTarget.directoryPath}::${nextTarget.flattenedSegmentPath ?? ""}`;
		if (dragHoverOpenKeyRef.current === nextKey) return;
		clearDragHoverOpen();
		dragHoverOpenKeyRef.current = nextKey;
		dragHoverOpenTimerRef.current = setTimeout(() => {
			const currentTarget = controller.getDragSession()?.target;
			if (currentTarget?.kind !== "directory" || currentTarget.directoryPath !== nextTarget.directoryPath || currentTarget.flattenedSegmentPath !== nextTarget.flattenedSegmentPath) return;
			directoryItem.expand();
		}, openDelay);
	};
	const runDragAutoScroll = () => {
		dragAutoScrollFrameRef.current = null;
		const dragPoint = dragPointRef.current;
		const scrollElement = scrollRef.current;
		if (dragPoint == null || scrollElement == null || controller.getDragSession() == null) return;
		const scrollRect = scrollElement.getBoundingClientRect();
		const scrollDelta = getDragEdgeScrollDelta(dragPoint.clientY, scrollRect);
		if (scrollDelta === 0) return;
		const maxScrollTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
		const boundedScrollTop = Math.max(0, Math.min(maxScrollTop, scrollElement.scrollTop + scrollDelta));
		if (boundedScrollTop !== scrollElement.scrollTop) {
			scrollElement.scrollTop = boundedScrollTop;
			updateViewportRef.current();
		}
		scheduleDragHoverOpen(syncDropTargetFromPoint(dragPoint.clientX, dragPoint.clientY));
		dragAutoScrollFrameRef.current = requestDragAnimationFrame(runDragAutoScroll);
	};
	const updateDragPoint = (clientX, clientY) => {
		dragPointRef.current = {
			clientX,
			clientY
		};
		dragAutoScrollFrameRef.current ??= requestDragAnimationFrame(runDragAutoScroll);
	};
	const handleRowDragStart = (event, row, targetPath) => {
		const dragSource = event.currentTarget;
		if (dragSource == null) return;
		clearTouchDragResources();
		clearDragPreview();
		clearDragHoverOpen();
		stopDragAutoScroll();
		if (controller.startDrag(targetPath) === false) {
			event.preventDefault();
			return;
		}
		dragRowSnapshotRef.current = row;
		if (event.dataTransfer != null) {
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.dropEffect = "move";
			event.dataTransfer.setData("text/plain", targetPath);
			if (shouldUseCustomPointerDragImage()) {
				const preview = createDragPreviewElement(dragSource);
				const rect = dragSource.getBoundingClientRect();
				Object.assign(preview.style, {
					height: `${rect.height}px`,
					opacity: "0.85",
					transform: "translate3d(-9999px, 0px, 0)",
					width: `${rect.width}px`
				});
				mountDragPreview(preview);
				dragPreviewRef.current = preview;
				event.dataTransfer.setDragImage(preview, Math.max(0, event.clientX - rect.left), Math.max(0, event.clientY - rect.top));
			}
		}
	};
	const handleRowDragEnd = () => {
		clearDragPreview();
		clearDragHoverOpen();
		stopDragAutoScroll();
		dragRowSnapshotRef.current = null;
		controller.cancelDrag();
	};
	const handleRowTouchStart = (event, row, targetPath) => {
		if (touchLongPressTimerRef.current != null || touchDragActiveRef.current) return;
		const touch = event.touches[0];
		const dragSource = event.currentTarget;
		if (touch == null || dragSource == null) return;
		touchStartPointRef.current = {
			clientX: touch.clientX,
			clientY: touch.clientY
		};
		touchSourceElementRef.current = dragSource;
		dragSource.setAttribute("draggable", "false");
		const clearPendingTouchStart = (options = {}) => {
			const restoreNativeDraggable = options.restoreNativeDraggable ?? !touchDragActiveRef.current;
			if (touchLongPressTimerRef.current != null) {
				clearTimeout(touchLongPressTimerRef.current);
				touchLongPressTimerRef.current = null;
			}
			document.removeEventListener("touchmove", handlePendingTouchMove);
			document.removeEventListener("touchend", handlePendingTouchEnd);
			document.removeEventListener("touchcancel", handlePendingTouchEnd);
			if (touchCleanupRef.current === clearPendingTouchStart) touchCleanupRef.current = null;
			if (restoreNativeDraggable) {
				dragSource.setAttribute("draggable", "true");
				if (touchSourceElementRef.current === dragSource) touchSourceElementRef.current = null;
				touchStartPointRef.current = null;
			}
		};
		const handlePendingTouchMove = (moveEvent) => {
			const moveTouch = moveEvent.touches[0];
			const startPoint = touchStartPointRef.current;
			if (moveTouch == null || startPoint == null) return;
			const deltaX = moveTouch.clientX - startPoint.clientX;
			const deltaY = moveTouch.clientY - startPoint.clientY;
			if (deltaX * deltaX + deltaY * deltaY <= TOUCH_LONG_PRESS_MOVE_THRESHOLD * TOUCH_LONG_PRESS_MOVE_THRESHOLD) return;
			clearPendingTouchStart();
		};
		const handlePendingTouchEnd = () => {
			clearPendingTouchStart();
		};
		document.addEventListener("touchmove", handlePendingTouchMove, { passive: true });
		document.addEventListener("touchend", handlePendingTouchEnd);
		document.addEventListener("touchcancel", handlePendingTouchEnd);
		touchCleanupRef.current = clearPendingTouchStart;
		touchLongPressTimerRef.current = setTimeout(() => {
			clearPendingTouchStart({ restoreNativeDraggable: false });
			if (controller.startDrag(targetPath) === false) {
				dragSource.setAttribute("draggable", "true");
				if (touchSourceElementRef.current === dragSource) touchSourceElementRef.current = null;
				touchStartPointRef.current = null;
				return;
			}
			touchDragActiveRef.current = true;
			touchSourceElementRef.current = dragSource;
			dragSource.setAttribute("draggable", "false");
			dragSource.style.setProperty("touch-action", "none");
			dragRowSnapshotRef.current = row;
			const rect = dragSource.getBoundingClientRect();
			const preview = createDragPreviewElement(dragSource);
			Object.assign(preview.style, {
				height: `${rect.height}px`,
				opacity: "0.85",
				transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
				width: `${rect.width}px`
			});
			mountDragPreview(preview);
			dragPreviewRef.current = preview;
			touchPreviewOffsetRef.current = {
				x: touch.clientX - rect.left,
				y: touch.clientY - rect.top
			};
			const handleActiveTouchMove = (moveEvent) => {
				const moveTouch = moveEvent.touches[0];
				if (moveTouch == null) return;
				moveEvent.preventDefault();
				const previewOffset = touchPreviewOffsetRef.current;
				if (previewOffset != null && dragPreviewRef.current != null) dragPreviewRef.current.style.transform = `translate3d(${moveTouch.clientX - previewOffset.x}px, ${moveTouch.clientY - previewOffset.y}px, 0)`;
				scheduleDragHoverOpen(syncDropTargetFromPoint(moveTouch.clientX, moveTouch.clientY));
				updateDragPoint(moveTouch.clientX, moveTouch.clientY);
			};
			const handleActiveTouchEnd = (endEvent) => {
				const endTouch = endEvent.changedTouches[0];
				if (endTouch != null) syncDropTargetFromPoint(endTouch.clientX, endTouch.clientY);
				controller.completeDrag();
				clearTouchDragResources();
			};
			const handleActiveTouchCancel = () => {
				controller.cancelDrag();
				clearTouchDragResources();
			};
			touchCleanupRef.current = () => {
				document.removeEventListener("touchmove", handleActiveTouchMove);
				document.removeEventListener("touchend", handleActiveTouchEnd);
				document.removeEventListener("touchcancel", handleActiveTouchCancel);
			};
			document.addEventListener("touchmove", handleActiveTouchMove, { passive: false });
			document.addEventListener("touchend", handleActiveTouchEnd);
			document.addEventListener("touchcancel", handleActiveTouchCancel);
		}, TOUCH_LONG_PRESS_DELAY);
	};
	const handleTreeKeyDown = (event) => {
		if (contextMenuState != null) {
			if (event.key === "Escape") {
				closeContextMenu();
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (BLOCKED_CONTEXT_MENU_NAV_KEYS.has(event.key)) {
				event.preventDefault();
				event.stopPropagation();
			}
			return;
		}
		if (renameView.isActive()) {
			if (event.key === "Escape") renameView.cancel();
			else if (event.key === "Enter") renameView.commit();
			else return;
			setLastContextMenuInteraction("focus");
			setControllerRevision((revision) => revision + 1);
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (renamingEnabled && event.key === "F2") {
			startRenameFromPath(focusedPath ?? void 0);
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (isSearchOpen) {
			if (event.key === "Escape") {
				restoreTreeFocusAfterSearchCloseRef.current = false;
				restoreTreeFocusViewportOffsetRef.current = null;
				controller.closeSearch();
			} else if (event.key === "Enter") {
				const currentFocusedPath = controller.getFocusedPath();
				if (currentFocusedPath != null) controller.selectOnlyPath(currentFocusedPath);
				const scrollElement$1 = scrollRef.current;
				const viewportHeight = readMeasuredViewportHeight(scrollElement$1, resolvedViewportHeight);
				restoreTreeFocusViewportOffsetRef.current = focusedIndex < 0 || scrollElement$1 == null ? null : Math.max(0, Math.min(focusedIndex * itemHeight - scrollElement$1.scrollTop, Math.max(0, viewportHeight - itemHeight)));
				restoreTreeFocusAfterSearchCloseRef.current = true;
				controller.closeSearch();
			} else if (event.key === "ArrowDown") controller.focusNextSearchMatch();
			else if (event.key === "ArrowUp") controller.focusPreviousSearchMatch();
			else return;
			setLastContextMenuInteraction("focus");
			setControllerRevision((revision) => revision + 1);
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (searchEnabled && isSearchOpenSeedKey(event)) {
			controller.openSearch(event.key);
			setControllerRevision((revision) => revision + 1);
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const isKeyboardContextMenuRequest = contextMenuEnabled && isContextMenuOpenKey(event);
		const shouldInspectStickyKeyboardState = canKeyUseStickyKeyboardState(event, contextMenuEnabled);
		const activeTreeElement = shouldInspectStickyKeyboardState && rootRef.current != null ? getActiveTreeElement(rootRef.current) : null;
		const mountedStickyRowPathSet = shouldInspectStickyKeyboardState ? new Set(getMountedStickyRowPaths(rootRef.current)) : /* @__PURE__ */ new Set();
		const activeStickyFocusPath = activeTreeElement?.dataset.fileTreeStickyPath ?? null;
		const activeStickyRowOwnsFocus = activeTreeElement?.dataset.fileTreeStickyRow === "true" && activeStickyFocusPath != null;
		if (activeStickyRowOwnsFocus && activeStickyFocusPath !== focusedPath && mountedStickyRowPathSet.has(activeStickyFocusPath)) {
			const scrollElement$1 = scrollRef.current;
			preserveStickyKeyboardFocusAtScrollTop(activeStickyFocusPath, scrollElement$1?.scrollTop ?? null);
			controller.focusPath(activeStickyFocusPath);
		}
		const effectiveFocusedPath = controller.getFocusedPath();
		const effectiveFocusedIndex = controller.getFocusedIndex();
		const focusedItem = controller.getFocusedItem();
		if (focusedItem == null) return;
		const focusedDirectoryItem = isFileTreeDirectoryHandle(focusedItem) ? focusedItem : null;
		const startedFromStickyRow = effectiveFocusedPath != null && (stickyRowPathSet.has(effectiveFocusedPath) || activeStickyRowOwnsFocus && activeStickyFocusPath === effectiveFocusedPath && mountedStickyRowPathSet.has(effectiveFocusedPath));
		const shouldPreserveLocalStickyFocusMove = event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowRight" && focusedDirectoryItem != null && focusedDirectoryItem.isExpanded();
		const shouldRestoreCollapsedStickyFocusViewport = event.key === "ArrowLeft" && startedFromStickyRow && focusedDirectoryItem != null && focusedDirectoryItem.isExpanded();
		const scrollElement = scrollRef.current;
		let handled = true;
		if (event.shiftKey && event.key === "ArrowDown") controller.extendSelectionFromFocused(1);
		else if (event.shiftKey && event.key === "ArrowUp") controller.extendSelectionFromFocused(-1);
		else if (isKeyboardContextMenuRequest && effectiveFocusedPath != null && effectiveFocusedIndex >= 0) {
			const focusedRow = controller.getVisibleRows(effectiveFocusedIndex, effectiveFocusedIndex)[0] ?? null;
			const focusedButton = getContextMenuAnchorButton(effectiveFocusedPath, stickyRowButtonRefs.current, rowButtonRefs.current);
			if (focusedRow == null || focusedButton == null) handled = false;
			else openContextMenuForRow(focusedRow, effectiveFocusedPath);
		} else if ((event.ctrlKey || event.metaKey) && isSpaceSelectionKey(event)) controller.toggleFocusedSelection();
		else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") controller.selectAllVisiblePaths();
		else switch (event.key) {
			case "ArrowDown":
				controller.focusNextItem();
				break;
			case "ArrowUp":
				controller.focusPreviousItem();
				break;
			case "ArrowRight":
				if (focusedDirectoryItem == null || focusedDirectoryItem.isExpanded()) controller.focusNextItem();
				else focusedDirectoryItem.expand();
				break;
			case "ArrowLeft":
				if (focusedDirectoryItem != null && focusedDirectoryItem.isExpanded()) focusedDirectoryItem.collapse();
				else controller.focusParentItem();
				break;
			case "Home":
				controller.focusFirstItem();
				break;
			case "End":
				controller.focusLastItem();
				break;
			default: handled = false;
		}
		if (!handled) return;
		setLastContextMenuInteraction("focus");
		const nextFocusedPath = controller.getFocusedPath();
		const nextFocusedPathIsMountedSticky = nextFocusedPath != null && (stickyRowPathSet.has(nextFocusedPath) || mountedStickyRowPathSet.has(nextFocusedPath));
		const stickyKeyboardMoveLandsOnDifferentStickyRow = shouldPreserveLocalStickyFocusMove && nextFocusedPath !== effectiveFocusedPath;
		const stickyKeyboardMenuStaysOnStickyRow = isKeyboardContextMenuRequest && activeStickyRowOwnsFocus && activeStickyFocusPath === effectiveFocusedPath && nextFocusedPath === effectiveFocusedPath;
		if ((startedFromStickyRow || stickyKeyboardMenuStaysOnStickyRow) && nextFocusedPath != null && (stickyKeyboardMoveLandsOnDifferentStickyRow && nextFocusedPathIsMountedSticky || stickyKeyboardMenuStaysOnStickyRow)) {
			preserveStickyKeyboardFocusAtScrollTop(nextFocusedPath, scrollElement?.scrollTop ?? null);
			domFocusOwnerRef.current = true;
			setActiveItemPath((previousPath) => previousPath === nextFocusedPath ? previousPath : nextFocusedPath);
		} else {
			const stickyArrowUpExitsStack = event.key === "ArrowUp" && startedFromStickyRow && nextFocusedPath !== effectiveFocusedPath;
			if (nextFocusedPath != null && (stickyArrowUpExitsStack || shouldRestoreCollapsedStickyFocusViewport && nextFocusedPath === effectiveFocusedPath)) {
				restoreStickyKeyboardViewportOffset(nextFocusedPath, getStickyKeyboardViewportOffset(rootRef.current, scrollElement, activeTreeElement, effectiveFocusedPath, itemHeight, stickyOverlayHeight, resolvedViewportHeight));
				domFocusOwnerRef.current = true;
				setActiveItemPath((previousPath) => previousPath === nextFocusedPath ? previousPath : nextFocusedPath);
			} else clearPendingStickyKeyboardState();
		}
		setControllerRevision((revision) => revision + 1);
		event.preventDefault();
		event.stopPropagation();
	};
	A$1(() => {
		if (!searchEnabled || !isSearchOpen) return;
		if (skipInitialSearchAutoFocusRef.current) {
			skipInitialSearchAutoFocusRef.current = false;
			return;
		}
		focusElement(searchInputRef.current);
	}, [isSearchOpen, searchEnabled]);
	A$1(() => {
		const input = renameInputRef.current;
		switch (classifyFileTreeRenameHandoff({
			hasRenderedInput: input != null,
			previousRenamingPath: previousRenamingPathRef.current,
			renamingPath
		})) {
			case "reset":
				previousRenamingPathRef.current = null;
				return;
			case "reveal-canonical":
				if (renamingPath != null) revealCanonicalRowAtStickyOffset(renamingPath, {
					restoreTreeFocus: false,
					targetOffset: "live-overlay"
				});
				return;
			case "ignore": return;
			case "focus-input":
				if (input != null) {
					pendingStickyFocusPathRef.current = null;
					previousRenamingPathRef.current = renamingPath;
					focusElement(input);
					input.select();
				}
				return;
		}
	}, [
		range.end,
		range.start,
		renamingPath,
		revealCanonicalRowAtStickyOffset,
		stickyRowPathSet
	]);
	A$1(() => {
		const rootElement = rootRef.current;
		if (rootElement == null) return;
		let nullFocusOutTimer = null;
		const clearNullFocusOutTimer = () => {
			if (nullFocusOutTimer == null) return;
			clearTimeout(nullFocusOutTimer);
			nullFocusOutTimer = null;
		};
		const updateActiveItemPath = () => {
			const nextActiveItemPath = getActiveTreeElement(rootElement)?.dataset.itemPath ?? null;
			setActiveItemPath((previousPath) => previousPath === nextActiveItemPath ? previousPath : nextActiveItemPath);
		};
		const onFocusIn = () => {
			clearNullFocusOutTimer();
			domFocusOwnerRef.current = true;
			updateActiveItemPath();
		};
		const onFocusOut = (event) => {
			const nextTarget = event.relatedTarget;
			if (nextTarget == null) {
				clearNullFocusOutTimer();
				nullFocusOutTimer = setTimeout(() => {
					nullFocusOutTimer = null;
					if (getActiveTreeElement(rootElement) != null) {
						updateActiveItemPath();
						return;
					}
					domFocusOwnerRef.current = false;
					setActiveItemPath(null);
				}, 0);
				return;
			}
			if (!(nextTarget instanceof Node) || !rootElement.contains(nextTarget)) {
				clearNullFocusOutTimer();
				domFocusOwnerRef.current = false;
				setActiveItemPath(null);
				return;
			}
			const nextActiveItemPath = nextTarget instanceof HTMLElement ? nextTarget.dataset.itemPath ?? null : null;
			setActiveItemPath((previousPath) => previousPath === nextActiveItemPath ? previousPath : nextActiveItemPath);
		};
		rootElement.addEventListener("focusin", onFocusIn);
		rootElement.addEventListener("focusout", onFocusOut);
		return () => {
			clearNullFocusOutTimer();
			rootElement.removeEventListener("focusin", onFocusIn);
			rootElement.removeEventListener("focusout", onFocusOut);
		};
	}, []);
	A$1(() => {
		const rootElement = rootRef.current;
		if (rootElement == null) return;
		if (layoutSnapshot.physical.scrollTop <= 0) rootElement.dataset.scrollAtTop = "true";
		else delete rootElement.dataset.scrollAtTop;
	}, [layoutSnapshot.physical.scrollTop]);
	A$1(() => {
		let scrollTimer = null;
		const scrollElement = scrollRef.current;
		const listElement = listRef.current;
		const rootElement = rootRef.current;
		if (scrollElement == null) return;
		measuredViewportHeightRef.current = readMeasuredViewportHeight(scrollElement, initialViewportHeight);
		const update = () => {
			const nextItemCount = controller.getVisibleCount();
			const nextViewportHeight = getCachedViewportHeight(measuredViewportHeightRef.current, initialViewportHeight);
			const maxScrollTop = Math.max(0, nextItemCount * itemHeight - nextViewportHeight);
			if (scrollElement.scrollTop > maxScrollTop) scrollElement.scrollTop = maxScrollTop;
			setLayoutState(computeFileTreeViewLayoutState({
				controller,
				itemHeight,
				overscan,
				scrollTop: Math.min(scrollElement.scrollTop, maxScrollTop),
				stickyFolders,
				viewportHeight: nextViewportHeight
			}));
		};
		if (!initialFocusedScrollAppliedRef.current) {
			initialFocusedScrollAppliedRef.current = true;
			const initialFocusedIndex = controller.getFocusedIndex();
			if (initialFocusedIndex >= 0) {
				const initialViewportHeightPx = getCachedViewportHeight(measuredViewportHeightRef.current, initialViewportHeight);
				const initialFocusedRow = controller.getVisibleRows(initialFocusedIndex, initialFocusedIndex)[0] ?? null;
				scrollFocusedRowIntoView(scrollElement, initialFocusedIndex, itemHeight, initialViewportHeightPx, stickyFolders && initialFocusedRow != null ? Math.max(0, Math.min(initialFocusedRow.ancestorPaths.length * itemHeight, Math.max(0, initialViewportHeightPx - itemHeight))) : 0);
			}
		}
		updateViewportRef.current = update;
		let hasSeenInitialControllerSnapshot = false;
		const unsubscribe = controller.subscribe(() => {
			if (hasSeenInitialControllerSnapshot) setControllerRevision((revision) => revision + 1);
			else hasSeenInitialControllerSnapshot = true;
			update();
		});
		const markScrolling = () => {
			if (debugDisableScrollSuppressionRef.current === true) return;
			if (listElement != null) listElement.dataset.isScrolling ??= "";
			if (rootElement != null) rootElement.dataset.isScrolling ??= "";
			isScrollingRef.current = true;
			if (scrollTimer != null) clearTimeout(scrollTimer);
			scrollTimer = setTimeout(() => {
				if (listElement != null) delete listElement.dataset.isScrolling;
				if (rootElement != null) delete rootElement.dataset.isScrolling;
				isScrollingRef.current = false;
				setScrollSettledRevision((revision) => revision + 1);
				scrollTimer = null;
			}, 50);
		};
		let overlayRevealTimer = null;
		const clearOverlayReveal = () => {
			if (rootElement != null) delete rootElement.dataset.overlayReveal;
			if (overlayRevealTimer != null) {
				clearTimeout(overlayRevealTimer);
				overlayRevealTimer = null;
			}
		};
		const markOverlayReveal = () => {
			if (rootElement == null || debugDisableScrollSuppressionRef.current === true) return;
			if (scrollElement.scrollTop > 0) return;
			rootElement.dataset.overlayReveal = "true";
			if (overlayRevealTimer != null) clearTimeout(overlayRevealTimer);
			overlayRevealTimer = setTimeout(() => {
				clearOverlayReveal();
			}, 200);
		};
		const onScroll = () => {
			update();
			if (scrollElement.scrollTop > 0) clearOverlayReveal();
			if (contextMenuStateRef.current != null && isScrollingRef.current) closeContextMenuRef.current();
			if (debugDisableScrollSuppressionRef.current === true) {
				isScrollingRef.current = false;
				return;
			}
			setContextHoverPath((previousPath) => previousPath == null ? previousPath : null);
			markScrolling();
		};
		const onPreScroll = () => {
			markScrolling();
			markOverlayReveal();
		};
		const SCROLL_KEYS = new Set([
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"PageUp",
			"PageDown",
			"Home",
			"End",
			" ",
			"Spacebar"
		]);
		const onKeyDownPreScroll = (event) => {
			if (!SCROLL_KEYS.has(event.key)) return;
			onPreScroll();
		};
		scrollElement.addEventListener("scroll", onScroll, { passive: true });
		scrollElement.addEventListener("wheel", onPreScroll, { passive: true });
		scrollElement.addEventListener("touchmove", onPreScroll, { passive: true });
		scrollElement.addEventListener("keydown", onKeyDownPreScroll);
		const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
			measuredViewportHeightRef.current = (entries[0] == null ? null : getResizeObserverViewportHeight(entries[0])) ?? readMeasuredViewportHeight(scrollElement, initialViewportHeight);
			update();
		}) : null;
		resizeObserver?.observe(scrollElement);
		return () => {
			updateViewportRef.current = () => {};
			unsubscribe();
			scrollElement.removeEventListener("scroll", onScroll);
			scrollElement.removeEventListener("wheel", onPreScroll);
			scrollElement.removeEventListener("touchmove", onPreScroll);
			scrollElement.removeEventListener("keydown", onKeyDownPreScroll);
			if (scrollTimer != null) clearTimeout(scrollTimer);
			if (overlayRevealTimer != null) clearTimeout(overlayRevealTimer);
			if (listElement != null) delete listElement.dataset.isScrolling;
			if (rootElement != null) {
				delete rootElement.dataset.isScrolling;
				delete rootElement.dataset.overlayReveal;
			}
			isScrollingRef.current = false;
			measuredViewportHeightRef.current = null;
			resizeObserver?.disconnect();
		};
	}, [
		controller,
		initialViewportHeight,
		itemHeight,
		overscan,
		stickyFolders
	]);
	A$1(() => {
		if (contextMenuEnabled || contextMenuState == null) return;
		closeContextMenu(false);
	}, [
		closeContextMenu,
		contextMenuEnabled,
		contextMenuState
	]);
	const activeContextMenuKey = q$1(() => contextMenuState == null ? null : `${contextMenuState.path}::${contextMenuState.source}`, [contextMenuState]);
	A$1(() => {
		if (activeContextMenuKey == null) {
			slotHost?.clearSlotContent(CONTEXT_MENU_SLOT_NAME);
			return;
		}
		const currentState = contextMenuStateRef.current;
		if (currentState == null) return;
		const anchorElement = contextMenuTriggerRef.current ?? contextMenuAnchorRef.current;
		if (anchorElement == null) return;
		const context = {
			anchorElement,
			anchorRect: currentState.anchorRect ?? serializeAnchorRect(anchorElement.getBoundingClientRect()),
			close: (options) => {
				closeContextMenuRef.current(options?.restoreFocus ?? true);
			},
			restoreFocus: () => {
				if (!shouldRestoreContextMenuFocusRef.current) return;
				restoreFocusToTreeRef.current(contextMenuStateRef.current?.path ?? null);
			}
		};
		const menuContent = composition?.contextMenu?.render?.(currentState.item, context) ?? null;
		slotHost?.setSlotContent(CONTEXT_MENU_SLOT_NAME, menuContent);
		composition?.contextMenu?.onOpen?.(currentState.item, context);
		focusFirstMenuElement(menuContent);
		queueMicrotask(() => {
			if (menuContent == null || !menuContent.isConnected) return;
			if (document.activeElement !== menuContent) return;
			focusFirstMenuElement(menuContent);
		});
		return () => {
			slotHost?.clearSlotContent(CONTEXT_MENU_SLOT_NAME);
		};
	}, [
		activeContextMenuKey,
		composition?.contextMenu,
		slotHost
	]);
	A$1(() => {
		if (contextMenuState != null && controller.getItem(contextMenuState.path) == null) closeContextMenu();
	}, [
		closeContextMenu,
		contextMenuState,
		controller
	]);
	A$1(() => {
		if (contextMenuState == null) return;
		const rootNode = rootRef.current?.getRootNode();
		const host = rootNode instanceof ShadowRoot ? rootNode.host : rootRef.current;
		const onPointerDown = (event) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (isEventInContextMenu(event)) return;
			if (contextMenuAnchorRef.current?.contains(target) === true) return;
			if (host?.contains(target) === true) return;
			closeContextMenu();
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeContextMenu();
			}
		};
		document.addEventListener("mousedown", onPointerDown, true);
		document.addEventListener("keydown", onKeyDown, true);
		return () => {
			document.removeEventListener("mousedown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown, true);
		};
	}, [closeContextMenu, contextMenuState]);
	A$1(() => {
		const scrollElement = scrollRef.current;
		const rootElement = rootRef.current;
		if (scrollElement == null || rootElement == null) {
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		const focusedButton = focusedPath == null ? null : rowButtonRefs.current.get(focusedPath) ?? null;
		const activeTreeElement = getActiveTreeElement(rootElement);
		const activeTreeElementPath = activeTreeElement?.dataset.itemPath ?? null;
		const renameInputOwnsFocus = isRenaming && renameInputRef.current === activeTreeElement;
		const searchInputOwnsFocus = searchEnabled && searchInputRef.current === activeTreeElement;
		const shouldRestoreTreeFocusAfterSearchClose = restoreTreeFocusAfterSearchCloseRef.current && !isSearchOpen;
		const preservedViewportOffset = restoreTreeFocusViewportOffsetRef.current ?? 0;
		const pendingStickyFocusPath = pendingStickyFocusPathRef.current;
		const pendingStickyKeyboardFocusPath = pendingStickyKeyboardFocusPathRef.current;
		const pendingStickyKeyboardViewportOffset = pendingStickyKeyboardViewportOffsetRef.current;
		const pendingStickyKeyboardScrollTop = pendingStickyKeyboardScrollTopRef.current;
		const focusWithinTree = activeTreeElement != null;
		const shouldOwnDomFocus = domFocusOwnerRef.current || focusWithinTree;
		const focusedPathChanged = previousFocusedPathRef.current !== focusedPath;
		const shouldPreserveStickyKeyboardFocusViewport = pendingStickyKeyboardFocusPath != null && pendingStickyKeyboardFocusPath === focusedPath && focusedPath != null;
		let shouldSuppressDomFocusForScrollRequest = false;
		let shouldUpdateViewportForScrollRequest = false;
		if (scrollRequest != null && scrollRequest.id !== processedScrollRequestIdRef.current) {
			processedScrollRequestIdRef.current = scrollRequest.id;
			const scrollRequestIndex = scrollRequest.visibleIndex;
			const scrollRequestRow = controller.getVisibleRows(scrollRequestIndex, scrollRequestIndex)[0] ?? null;
			if (scrollRequestRow != null) {
				const scrollRequestTopInset = stickyFolders ? Math.max(0, Math.min(scrollRequestRow.ancestorPaths.length * itemHeight, Math.max(0, resolvedViewportHeight - itemHeight))) : stickyOverlayHeight;
				shouldSuppressDomFocusForScrollRequest = true;
				shouldUpdateViewportForScrollRequest = scrollFocusedRowToOffset(scrollElement, scrollRequestIndex, itemHeight, resolvedViewportHeight, totalScrollableHeight, scrollRequest.offset, scrollRequestTopInset);
			}
			controller.clearScrollRequest(scrollRequest.id);
		}
		const shouldRestoreFocusedRowViewportOffset = !shouldSuppressDomFocusForScrollRequest && shouldRestoreTreeFocusAfterSearchClose && scrollFocusedRowToViewportOffset(scrollElement, focusedIndex, itemHeight, resolvedViewportHeight, totalScrollableHeight, preservedViewportOffset);
		const shouldRestoreStickyFocusedRowViewportOffset = !shouldSuppressDomFocusForScrollRequest && pendingStickyFocusPath != null && pendingStickyFocusPath === focusedPath && scrollFocusedRowToViewportOffset(scrollElement, focusedIndex, itemHeight, resolvedViewportHeight, totalScrollableHeight, stickyOverlayHeight);
		const shouldRestoreStickyKeyboardViewportOffset = !shouldSuppressDomFocusForScrollRequest && pendingStickyKeyboardViewportOffset != null && pendingStickyKeyboardViewportOffset.path === focusedPath && scrollFocusedRowToViewportOffset(scrollElement, focusedIndex, itemHeight, resolvedViewportHeight, totalScrollableHeight, pendingStickyKeyboardViewportOffset.viewportOffset);
		const shouldRestoreStickyKeyboardScrollTop = !shouldSuppressDomFocusForScrollRequest && pendingStickyKeyboardScrollTop != null && pendingStickyKeyboardScrollTop.path === focusedPath && scrollElement.scrollTop !== pendingStickyKeyboardScrollTop.scrollTop;
		if (shouldRestoreStickyKeyboardScrollTop) scrollElement.scrollTop = pendingStickyKeyboardScrollTop.scrollTop;
		if (shouldRestoreStickyKeyboardScrollTop || shouldUpdateViewportForScrollRequest || shouldRestoreStickyFocusedRowViewportOffset || shouldRestoreStickyKeyboardViewportOffset || shouldRestoreFocusedRowViewportOffset || shouldOwnDomFocus && focusedPathChanged && pendingStickyFocusPath !== focusedPath && !shouldPreserveStickyKeyboardFocusViewport && scrollFocusedRowIntoView(scrollElement, focusedIndex, itemHeight, resolvedViewportHeight, stickyOverlayHeight)) updateViewportRef.current();
		if (shouldSuppressDomFocusForScrollRequest) {
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		if (!shouldOwnDomFocus) {
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		if (renameInputOwnsFocus) {
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		if (searchInputOwnsFocus && !shouldRestoreTreeFocusAfterSearchClose) {
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		if (focusedButton == null) {
			if (shouldRestoreTreeFocusAfterSearchClose && focusedIndex >= 0) {
				scrollFocusedRowToViewportOffset(scrollElement, focusedIndex, itemHeight, resolvedViewportHeight, totalScrollableHeight, preservedViewportOffset);
				updateViewportRef.current();
			}
			previousFocusedPathRef.current = focusedPath;
			return;
		}
		if (focusedPathChanged || shouldRestoreTreeFocusAfterSearchClose || pendingStickyFocusPath === focusedPath || pendingStickyKeyboardFocusPath === focusedPath || pendingStickyKeyboardViewportOffset?.path === focusedPath || pendingStickyKeyboardScrollTop?.path === focusedPath || activeTreeElementPath == null || activeTreeElementPath !== focusedPath) {
			focusElement(focusedButton);
			if (pendingStickyFocusPath === focusedPath) pendingStickyFocusPathRef.current = null;
			if (pendingStickyKeyboardFocusPath === focusedPath) pendingStickyKeyboardFocusPathRef.current = null;
			if (pendingStickyKeyboardViewportOffset?.path === focusedPath) pendingStickyKeyboardViewportOffsetRef.current = null;
			if (pendingStickyKeyboardScrollTop?.path === focusedPath) pendingStickyKeyboardScrollTopRef.current = null;
			restoreTreeFocusAfterSearchCloseRef.current = false;
			restoreTreeFocusViewportOffsetRef.current = null;
		}
		previousFocusedPathRef.current = focusedPath;
	}, [
		controller,
		focusedIndex,
		focusedPath,
		focusedRowIsMounted,
		itemHeight,
		isRenaming,
		isSearchOpen,
		range,
		resolvedViewportHeight,
		searchEnabled,
		scrollRequest,
		stickyFolders,
		stickyOverlayHeight,
		totalScrollableHeight,
		visibleRows
	]);
	const focusedRowIsVisible = focusedIndex >= 0 && focusedIndex >= layoutSnapshot.visible.startIndex && focusedIndex <= layoutSnapshot.visible.endIndex;
	const focusedRowIsSticky = focusedPath != null && stickyRows.some((entry) => getFileTreeRowPath(entry.row) === focusedPath);
	const focusedRowHasVisibleAnchor = focusedRowIsVisible || focusedRowIsSticky;
	const focusTriggerPath = contextMenuButtonTriggerEnabled && domFocusOwnerRef.current === true && focusedRowHasVisibleAnchor ? focusedPath : null;
	const pointerTriggerPath = lastContextMenuInteraction === "pointer" ? contextHoverPath : null;
	const triggerPath = contextMenuState?.path ?? debugContextMenuTriggerPathRef.current ?? pointerTriggerPath ?? focusTriggerPath ?? contextHoverPath;
	const isPointerContextMenuOpen = contextMenuState?.source === "right-click";
	A$1(() => {
		if (isScrollingRef.current && contextMenuState == null) return;
		updateTriggerPosition(getTriggerAnchorButton(triggerPath));
	}, [
		contextMenuState,
		getTriggerAnchorButton,
		range,
		resolvedViewportHeight,
		scrollSettledRevision,
		stickyRows,
		triggerPath,
		updateTriggerPosition,
		visibleRows
	]);
	const handleTreePointerOver = b$1((event) => {
		if (isScrollingRef.current) return;
		if (isEventInContextMenu(event)) return;
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.closest?.(`[data-type="${CONTEXT_MENU_TRIGGER_TYPE}"]`) != null) return;
		const stickyRowButton = target.closest?.("[data-file-tree-sticky-row=\"true\"]");
		const rowButton = target.closest?.("[data-type=\"item\"]");
		const nextPath = stickyRowButton instanceof HTMLElement ? stickyRowButton.dataset.fileTreeStickyPath ?? null : rowButton instanceof HTMLElement ? rowButton.dataset.itemPath ?? null : null;
		if (nextPath != null) setLastContextMenuInteraction((previousMode) => previousMode === "pointer" ? previousMode : "pointer");
		setContextHoverPath((previousPath) => previousPath === nextPath ? previousPath : nextPath);
	}, []);
	const handleTreePointerLeave = b$1(() => {
		setContextHoverPath(null);
	}, []);
	A$1(() => {
		if (!dragAndDropEnabled) return;
		const handleWindowDragEnd = () => {
			clearTouchDragResources();
			controller.cancelDrag();
		};
		window.addEventListener("dragend", handleWindowDragEnd);
		return () => {
			window.removeEventListener("dragend", handleWindowDragEnd);
			clearTouchDragResources();
			controller.cancelDrag();
		};
	}, [controller, dragAndDropEnabled]);
	const handleTreeDragOver = (event) => {
		if (!dragAndDropEnabled || controller.getDragSession() == null || touchDragActiveRef.current) return;
		const nextTarget = resolveDropTargetFromElement(event.target instanceof HTMLElement ? event.target : null);
		controller.setDragTarget(nextTarget);
		scheduleDragHoverOpen(controller.getDragSession()?.target ?? null);
		updateDragPoint(event.clientX, event.clientY);
		if (event.dataTransfer != null) event.dataTransfer.dropEffect = "move";
		event.preventDefault();
	};
	const handleTreeDragLeave = (event) => {
		if (!dragAndDropEnabled || controller.getDragSession() == null || touchDragActiveRef.current) return;
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget) === true) return;
		clearDragHoverOpen();
		stopDragAutoScroll();
		controller.setDragTarget(null);
	};
	const handleTreeDrop = (event) => {
		if (!dragAndDropEnabled || controller.getDragSession() == null || touchDragActiveRef.current) return;
		event.preventDefault();
		syncDropTargetFromPoint(event.clientX, event.clientY);
		controller.completeDrag();
		clearDragPreview();
		clearDragHoverOpen();
		stopDragAutoScroll();
		dragRowSnapshotRef.current = null;
	};
	const windowHeight = layoutSnapshot.window.height;
	const windowOffsetTop = layoutSnapshot.window.offsetTop;
	const windowStickyTopInset = Math.min(0, resolvedViewportHeight - windowHeight);
	const windowStickyBottomInset = Math.min(0, resolvedViewportHeight - windowHeight - stickyOverlayHeight);
	const shouldRenderParkedFocusedRow = activeItemPath === focusedPath || restoreTreeFocusAfterSearchCloseRef.current;
	const parkedFocusedRow = focusedPath != null && shouldRenderParkedFocusedRow && !focusedRowIsMounted && focusedIndex >= 0 ? visibleRows[focusedIndex] ?? controller.getVisibleRows(focusedIndex, focusedIndex)[0] ?? null : null;
	const parkedFocusedRowOffset = parkedFocusedRow == null ? null : getParkedFocusedRowOffset(focusedIndex, itemHeight, range, windowHeight);
	const draggedRowSnapshot = dragRowSnapshotRef.current;
	const draggedRowIsMounted = draggedPrimaryPath != null && draggedRowSnapshot != null && draggedRowSnapshot.path === draggedPrimaryPath && draggedRowSnapshot.index >= range.start && draggedRowSnapshot.index <= range.end;
	const parkedDraggedRow = draggedPrimaryPath != null && draggedRowSnapshot != null && draggedRowSnapshot.path === draggedPrimaryPath && !draggedRowIsMounted && draggedRowSnapshot.path !== parkedFocusedRow?.path ? draggedRowSnapshot : null;
	const parkedDraggedRowOffset = parkedDraggedRow == null ? null : getParkedFocusedRowOffset(parkedDraggedRow.index, itemHeight, range, windowHeight);
	const guideStyleText = getFileTreeGuideStyleText((focusedIndex >= 0 ? visibleRows[focusedIndex] ?? controller.getVisibleRows(focusedIndex, focusedIndex)[0] ?? null : null)?.ancestorPaths.at(-1) ?? null);
	const activeDescendantId = isSearchOpen && focusedPath != null ? getFileTreeFocusedRowDomId(instanceId, focusedPath, !focusedRowIsMounted) : void 0;
	const visualFocusPath = contextMenuState?.path ?? (isSearchOpen ? focusedPath : activeItemPath);
	const visualContextHoverPath = contextMenuState?.path ?? contextHoverPath;
	const triggerButton = getTriggerAnchorButton(triggerPath);
	const triggerButtonVisible = contextMenuEnabled && contextMenuButtonTriggerEnabled && !isPointerContextMenuOpen && !isRenaming && triggerButton != null && contextMenuAnchorTop != null && triggerPath != null;
	const contextMenuAnchorVisible = contextMenuEnabled && (triggerButtonVisible || contextMenuState != null);
	const pointerAnchorRect = contextMenuState?.anchorRect;
	const rowAnchorTop = pointerAnchorRect == null && triggerButton != null && contextMenuAnchorTop != null && (contextMenuState != null || triggerButtonVisible) ? contextMenuAnchorTop : null;
	const contextMenuAnchorStyle = pointerAnchorRect != null ? {
		left: `${pointerAnchorRect.left}px`,
		position: "fixed",
		right: "auto",
		top: `${pointerAnchorRect.top}px`
	} : rowAnchorTop != null ? { top: `${rowAnchorTop}px` } : void 0;
	const contextMenuTriggerStyle = isPointerContextMenuOpen ? { opacity: "0" } : void 0;
	const handleRowClick = b$1((event, row, targetPath, mode) => {
		const plan = computeFileTreeRowClickPlan({
			event: {
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				shiftKey: event.shiftKey
			},
			isDirectory: row.kind === "directory",
			isSearchOpen,
			mode
		});
		const shouldToggleDirectory = plan.toggleDirectory && row.kind === "directory";
		const mountedDirectoryPath = shouldToggleDirectory ? controller.resolveMountedDirectoryPathFromInput(targetPath) : null;
		if (shouldToggleDirectory && mountedDirectoryPath == null) return;
		const actionTargetPath = mountedDirectoryPath ?? targetPath;
		switch (plan.selection.kind) {
			case "range":
				controller.selectPathRange(actionTargetPath, plan.selection.additive);
				break;
			case "toggle":
				controller.togglePathSelectionFromInput(actionTargetPath);
				break;
			case "single":
				controller.selectOnlyMountedPathFromInput(actionTargetPath);
				break;
		}
		const clickedElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
		const clickedRowIsVisible = row.index >= layoutSnapshot.visible.startIndex && row.index <= layoutSnapshot.visible.endIndex;
		const shouldExposeFocusedTrigger = mode === "flow" && clickedRowIsVisible && clickedElement != null && clickedElement.dataset.itemParked !== "true";
		controller.focusMountedPathFromInput(actionTargetPath);
		if (shouldExposeFocusedTrigger) {
			domFocusOwnerRef.current = true;
			setActiveItemPath((previousPath) => previousPath === actionTargetPath ? previousPath : actionTargetPath);
			setLastContextMenuInteraction("focus");
		}
		if (shouldToggleDirectory) controller.toggleMountedDirectoryFromInput(actionTargetPath);
		if (plan.closeSearch) controller.closeSearch();
		if (plan.revealCanonical) revealCanonicalRowAtStickyOffset(actionTargetPath, { targetOffset: "sticky-parents" });
	}, [
		controller,
		isSearchOpen,
		layoutSnapshot.visible.endIndex,
		layoutSnapshot.visible.startIndex,
		revealCanonicalRowAtStickyOffset
	]);
	const openMenuFromTrigger = () => {
		if (isScrollingRef.current) return;
		if (!contextMenuButtonTriggerEnabled) return;
		if (triggerPath == null || triggerButton == null) return;
		const triggerItem = controller.getItem(triggerPath);
		if (triggerItem == null) return;
		updateTriggerPosition(triggerButton);
		shouldRestoreContextMenuFocusRef.current = true;
		setContextMenuState({
			anchorRect: null,
			item: {
				kind: triggerItem.isDirectory() ? "directory" : "file",
				name: triggerButton.getAttribute("aria-label") ?? triggerPath,
				path: triggerItem.getPath()
			},
			path: triggerItem.getPath(),
			source: "button"
		});
	};
	const flowRowFrame = {
		contextHoverPath: visualContextHoverPath,
		contextMenuButtonTriggerEnabled,
		contextMenuButtonVisibility,
		contextMenuEnabled,
		contextMenuRightClickEnabled,
		contextMenuTriggerMode,
		controller,
		directoriesWithGitChanges,
		dragAndDropEnabled,
		draggedPathSet,
		dragTarget,
		gitLaneActive,
		gitStatusByPath,
		handleRowDragEnd,
		handleRowDragStart,
		handleRowTouchStart,
		ignoredGitDirectories,
		ignoredInheritanceCache,
		instanceId,
		itemHeight,
		onKeyDown: handleTreeKeyDown,
		onRowClick: handleRowClick,
		openContextMenuForRow,
		registerButton: registerRowButton,
		registerRenameInput,
		renameView,
		renderDecorationForRow,
		resolveIcon,
		shouldSuppressContextMenu,
		visualFocusPath
	};
	const stickyRowFrame = {
		...flowRowFrame,
		registerButton: registerStickyRowButton
	};
	return /* @__PURE__ */ u$2("div", {
		ref: rootRef,
		id: treeDomId,
		"data-file-tree-context-menu-button-visibility": contextMenuEnabled && contextMenuButtonTriggerEnabled ? contextMenuButtonVisibility : void 0,
		"data-file-tree-context-menu-trigger-mode": contextMenuEnabled ? contextMenuTriggerMode : void 0,
		"data-file-tree-has-context-menu-action-lane": contextMenuEnabled && contextMenuButtonTriggerEnabled ? "true" : void 0,
		"data-file-tree-has-git-lane": gitLaneActive ? "true" : void 0,
		"data-file-tree-virtualized-root": "true",
		onDragLeave: dragAndDropEnabled ? handleTreeDragLeave : void 0,
		onDragOver: dragAndDropEnabled ? handleTreeDragOver : void 0,
		onDrop: dragAndDropEnabled ? handleTreeDrop : void 0,
		onKeyDown: handleTreeKeyDown,
		onPointerLeave: contextMenuEnabled ? handleTreePointerLeave : void 0,
		onPointerOver: contextMenuEnabled ? handleTreePointerOver : void 0,
		role: "tree",
		tabIndex: -1,
		style: {
			outline: "none",
			position: "relative"
		},
		children: [
			/* @__PURE__ */ u$2("style", {
				"data-file-tree-guide-style": "true",
				dangerouslySetInnerHTML: { __html: guideStyleText }
			}),
			/* @__PURE__ */ u$2("slot", {
				name: HEADER_SLOT_NAME,
				"data-type": "header-slot"
			}),
			searchEnabled ? /* @__PURE__ */ u$2("div", {
				"data-file-tree-search-container": true,
				"data-open": isSearchOpen ? "true" : "false",
				children: /* @__PURE__ */ u$2("input", {
					ref: searchInputRef,
					"aria-activedescendant": activeDescendantId,
					"aria-controls": treeDomId,
					placeholder: "Search…",
					"data-file-tree-search-input": true,
					"data-file-tree-search-input-fake-focus": fakeSearchFocusActive ? "true" : void 0,
					value: searchValue,
					onBlur: () => {
						if (searchBlurBehavior === "retain" && !searchInputUserInteractedRef.current) return;
						controller.closeSearch();
					},
					onFocus: markSearchInputInteracted,
					onPointerDown: markSearchInputInteracted,
					onInput: (event) => {
						markSearchInputInteracted();
						const target = event.currentTarget;
						controller.setSearch(target.value);
					}
				})
			}) : null,
			/* @__PURE__ */ u$2("div", {
				ref: scrollRef,
				"data-file-tree-virtualized-scroll": "true",
				children: [stickyFolders && hasStickyUiMount && stickyRows.length > 0 ? /* @__PURE__ */ u$2("div", {
					"aria-hidden": "true",
					"data-file-tree-sticky-overlay": "true",
					children: /* @__PURE__ */ u$2("div", {
						"data-file-tree-sticky-overlay-content": "true",
						style: { height: `${overlayRowsHeight}px` },
						children: stickyRows.map((entry, index) => renderStyledRow(stickyRowFrame, entry.row, `sticky:${getFileTreeRowPath(entry.row)}`, {
							mode: "sticky",
							style: {
								left: "0",
								position: "absolute",
								right: "0",
								top: `${entry.top}px`,
								zIndex: `${stickyRows.length - index}`
							}
						}))
					})
				}) : null, /* @__PURE__ */ u$2("div", {
					ref: listRef,
					"data-file-tree-virtualized-list": "true",
					style: { height: `${totalScrollableHeight}px` },
					children: [/* @__PURE__ */ u$2("div", {
						"data-file-tree-virtualized-sticky-offset": "true",
						"aria-hidden": "true",
						style: { height: `${windowOffsetTop}px` }
					}), /* @__PURE__ */ u$2("div", {
						"data-file-tree-virtualized-sticky": "true",
						style: {
							height: `${windowHeight}px`,
							top: `${windowStickyTopInset}px`,
							bottom: `${windowStickyBottomInset}px`
						},
						children: [
							renderRangeChildren(flowRowFrame, range, stickyRowPathSet),
							parkedFocusedRow != null && parkedFocusedRowOffset != null ? renderStyledRow(flowRowFrame, parkedFocusedRow, `parked:${parkedFocusedRow.path}`, {
								isParked: true,
								style: {
									left: "0",
									opacity: "0",
									pointerEvents: draggedPrimaryPath === parkedFocusedRow.path ? "none" : void 0,
									position: "absolute",
									right: "0",
									top: `${parkedFocusedRowOffset}px`
								}
							}) : null,
							parkedDraggedRow != null && parkedDraggedRowOffset != null ? renderStyledRow(flowRowFrame, parkedDraggedRow, `parked-drag:${parkedDraggedRow.path}`, {
								isParked: true,
								style: {
									left: "0",
									opacity: "0",
									pointerEvents: "none",
									position: "absolute",
									right: "0",
									top: `${parkedDraggedRowOffset}px`
								}
							}) : null
						]
					})]
				})]
			}),
			contextMenuEnabled ? /* @__PURE__ */ u$2("div", {
				ref: contextMenuAnchorRef,
				"data-type": "context-menu-anchor",
				"data-visible": contextMenuAnchorVisible ? "true" : "false",
				style: contextMenuAnchorStyle,
				children: [/* @__PURE__ */ u$2("button", {
					ref: contextMenuTriggerRef,
					type: "button",
					"data-type": CONTEXT_MENU_TRIGGER_TYPE,
					"aria-label": "Options",
					"aria-haspopup": "menu",
					"aria-expanded": contextMenuState != null ? "true" : "false",
					"data-visible": triggerButtonVisible ? "true" : "false",
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onClick: (event) => {
						event.preventDefault();
						event.stopPropagation();
						if (contextMenuState != null) {
							closeContextMenu();
							return;
						}
						openMenuFromTrigger();
					},
					tabIndex: -1,
					style: contextMenuTriggerStyle,
					children: /* @__PURE__ */ u$2(Icon, { ...resolveIcon("file-tree-icon-ellipsis") })
				}), contextMenuState != null ? /* @__PURE__ */ u$2("slot", { name: CONTEXT_MENU_SLOT_NAME }) : null]
			}) : null,
			contextMenuState != null ? /* @__PURE__ */ u$2("div", {
				"data-type": "context-menu-wash",
				"aria-hidden": "true",
				onMouseDownCapture: (event) => {
					event.preventDefault();
					closeContextMenu();
				},
				onTouchStartCapture: (event) => {
					event.preventDefault();
					event.stopPropagation();
					closeContextMenu();
				},
				onTouchMoveCapture: (event) => {
					event.preventDefault();
					event.stopPropagation();
				},
				onWheelCapture: (event) => {
					event.preventDefault();
					event.stopPropagation();
				}
			}) : null
		]
	});
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/runtime.js
const fileTreeRenderer = {
	hydrateRoot: (element, props) => {
		G$1(_$2(FileTreeView, props), element);
	},
	renderRoot: (element, props) => {
		F$2(_$2(FileTreeView, props), element);
	},
	unmountRoot: (element) => {
		F$2(null, element);
	}
};
function renderFileTreeRoot(element, props) {
	fileTreeRenderer.renderRoot(element, props);
}
function hydrateFileTreeRoot(element, props) {
	fileTreeRenderer.hydrateRoot(element, props);
}
function unmountFileTreeRoot(element) {
	fileTreeRenderer.unmountRoot(element);
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/slotHost.js
var FileTreeManagedSlotHost = class {
	#contentBySlot = /* @__PURE__ */ new Map();
	#host = null;
	clearAll() {
		for (const content of this.#contentBySlot.values()) content.remove();
		this.#contentBySlot.clear();
	}
	clearSlotContent(slotName) {
		const currentContent = this.#getCurrentContent(slotName);
		if (currentContent == null) return;
		currentContent.remove();
		this.#contentBySlot.delete(slotName);
	}
	setHost(host) {
		this.#host = host;
		if (host == null) return;
		this.#adoptExistingManagedContent(host);
		for (const [slotName, content] of this.#contentBySlot) this.#attachContent(slotName, content);
	}
	setSlotContent(slotName, content) {
		const currentContent = this.#getCurrentContent(slotName);
		if (currentContent === content) {
			if (content != null) {
				this.#contentBySlot.set(slotName, content);
				this.#attachContent(slotName, content);
			}
			return;
		}
		currentContent?.remove();
		if (content == null) {
			this.#contentBySlot.delete(slotName);
			return;
		}
		this.#contentBySlot.set(slotName, content);
		this.#attachContent(slotName, content);
	}
	setSlotHtml(slotName, html) {
		const normalizedHtml = html?.trim() ?? "";
		if (normalizedHtml.length === 0) {
			this.setSlotContent(slotName, null);
			return;
		}
		const currentContent = this.#getCurrentContent(slotName);
		if (currentContent != null && currentContent.innerHTML === normalizedHtml) {
			this.#contentBySlot.set(slotName, currentContent);
			this.#attachContent(slotName, currentContent);
			return;
		}
		const nextContent = document.createElement("div");
		nextContent.innerHTML = normalizedHtml;
		this.setSlotContent(slotName, nextContent);
	}
	#getCurrentContent(slotName) {
		const trackedContent = this.#contentBySlot.get(slotName) ?? null;
		if (trackedContent != null) return trackedContent;
		const host = this.#host;
		if (host == null) return null;
		for (const element of Array.from(host.children)) {
			if (!(element instanceof HTMLElement)) continue;
			if (element.dataset.fileTreeManagedSlot === slotName) return element;
		}
		return null;
	}
	#attachContent(slotName, content) {
		content.slot = slotName;
		content.dataset.fileTreeManagedSlot = slotName;
		if (this.#host != null && content.parentNode !== this.#host) this.#host.appendChild(content);
	}
	#adoptExistingManagedContent(host) {
		for (const element of Array.from(host.children)) {
			if (!(element instanceof HTMLElement)) continue;
			const slotName = element.dataset.fileTreeManagedSlot;
			if (slotName == null || this.#contentBySlot.has(slotName)) continue;
			this.#contentBySlot.set(slotName, element);
		}
	}
};

//#endregion
//#region node_modules/preact-render-to-string/dist/index.module.js
var r = "diffed", o = "__c", i = "__s", a = "__c", c = "__k", u = "__d", s = "__s", l = /[\s\n\\/='"\0<>]/, f = /^(xlink|xmlns|xml)([A-Z])/, p = /^(?:accessK|auto[A-Z]|cell|ch|col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|popoverT|readO|rowS|src[A-Z]|tabI|useM|item[A-Z])/, h = /^ac|^ali|arabic|basel|cap|clipPath$|clipRule$|color|dominant|enable|fill|flood|font|glyph[^R]|horiz|image|letter|lighting|marker[^WUH]|overline|panose|pointe|paint|rendering|shape|stop|strikethrough|stroke|text[^L]|transform|underline|unicode|units|^v[^i]|^w|^xH/, d = new Set(["draggable", "spellcheck"]);
function v(e) {
	void 0 !== e.__g ? e.__g |= 8 : e[u] = !0;
}
function m(e) {
	void 0 !== e.__g ? e.__g &= -9 : e[u] = !1;
}
function y(e) {
	return void 0 !== e.__g ? !!(8 & e.__g) : !0 === e[u];
}
var _ = /["&<]/;
function g(e) {
	if (0 === e.length || !1 === _.test(e)) return e;
	for (var t = 0, n = 0, r = "", o = ""; n < e.length; n++) {
		switch (e.charCodeAt(n)) {
			case 34:
				o = "&quot;";
				break;
			case 38:
				o = "&amp;";
				break;
			case 60:
				o = "&lt;";
				break;
			default: continue;
		}
		n !== t && (r += e.slice(t, n)), r += o, t = n + 1;
	}
	return n !== t && (r += e.slice(t, n)), r;
}
var b = {}, x = new Set([
	"animation-iteration-count",
	"border-image-outset",
	"border-image-slice",
	"border-image-width",
	"box-flex",
	"box-flex-group",
	"box-ordinal-group",
	"column-count",
	"fill-opacity",
	"flex",
	"flex-grow",
	"flex-negative",
	"flex-order",
	"flex-positive",
	"flex-shrink",
	"flood-opacity",
	"font-weight",
	"grid-column",
	"grid-row",
	"line-clamp",
	"line-height",
	"opacity",
	"order",
	"orphans",
	"stop-opacity",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"widows",
	"z-index",
	"zoom"
]), k = /[A-Z]/g;
function w(e) {
	var t = "";
	for (var n in e) {
		var r = e[n];
		if (null != r && "" !== r) {
			var o = "-" == n[0] ? n : b[n] || (b[n] = n.replace(k, "-$&").toLowerCase()), i = ";";
			"number" != typeof r || o.startsWith("--") || x.has(o) || (i = "px;"), t = t + o + ":" + r + i;
		}
	}
	return t || void 0;
}
function C() {
	this.__d = !0;
}
function A(e, t) {
	return {
		__v: e,
		context: t,
		props: e.props,
		setState: C,
		forceUpdate: C,
		__d: !0,
		__h: new Array(0)
	};
}
function S(e, t, n) {
	if (!e.s) {
		if (n instanceof L) {
			if (!n.s) return void (n.o = S.bind(null, e, t));
			1 & t && (t = n.s), n = n.v;
		}
		if (n && n.then) return void n.then(S.bind(null, e, t), S.bind(null, e, 2));
		e.s = t, e.v = n;
		const r = e.o;
		r && r(e);
	}
}
var L = /* @__PURE__ */ function() {
	function e() {}
	return e.prototype.then = function(t, n) {
		var r = new e(), o = this.s;
		if (o) {
			var i = 1 & o ? t : n;
			if (i) {
				try {
					S(r, 1, i(this.v));
				} catch (e) {
					S(r, 2, e);
				}
				return r;
			}
			return this;
		}
		return this.o = function(e) {
			try {
				var o = e.v;
				1 & e.s ? S(r, 1, t ? t(o) : o) : n ? S(r, 1, n(o)) : S(r, 2, o);
			} catch (e) {
				S(r, 2, e);
			}
		}, r;
	}, e;
}();
function E(e) {
	return e instanceof L && 1 & e.s;
}
function j(e, t, n) {
	for (var r;;) {
		var o = e();
		if (E(o) && (o = o.v), !o) return i;
		if (o.then) {
			r = 0;
			break;
		}
		var i = n();
		if (i && i.then) {
			if (!E(i)) {
				r = 1;
				break;
			}
			i = i.s;
		}
		if (t) {
			var a = t();
			if (a && a.then && !E(a)) {
				r = 2;
				break;
			}
		}
	}
	var c = new L(), u = S.bind(null, c, 2);
	return (0 === r ? o.then(l) : 1 === r ? i.then(s) : a.then(f)).then(void 0, u), c;
	function s(r) {
		i = r;
		do {
			if (t && (a = t()) && a.then && !E(a)) return void a.then(f).then(void 0, u);
			if (!(o = e()) || E(o) && !o.v) return void S(c, 1, i);
			if (o.then) return void o.then(l).then(void 0, u);
			E(i = n()) && (i = i.v);
		} while (!i || !i.then);
		i.then(s).then(void 0, u);
	}
	function l(e) {
		e ? (i = n()) && i.then ? i.then(s).then(void 0, u) : s(i) : S(c, 1, i);
	}
	function f() {
		(o = e()) ? o.then ? o.then(l).then(void 0, u) : l(o) : S(c, 1, i);
	}
}
function T(e, t) {
	try {
		var n = e();
	} catch (e) {
		return t(!0, e);
	}
	return n && n.then ? n.then(t.bind(null, !1), t.bind(null, !0)) : t(!1, n);
}
var D, P, $, U, Z = function(a, u) {
	try {
		var s = n[i];
		n[i] = !0, D = n.__b, P = n[r], $ = n.__r, U = n.unmount;
		var l = _$2(k$2, null);
		return l[c] = [a], Promise.resolve(T(function() {
			return Promise.resolve(O(a, u || F, !1, void 0, l, !0, void 0)).then(function(e) {
				var t, n = function() {
					if (W(e)) {
						var n = function() {
							var e = o.join(H);
							return t = 1, e;
						}, r = 0, o = e, i = j(function() {
							return !!o.some(function(e) {
								return e && "function" == typeof e.then;
							}) && r++ < 25;
						}, void 0, function() {
							return Promise.resolve(Promise.all(o)).then(function(e) {
								o = e.flat();
							});
						});
						return i && i.then ? i.then(n) : n();
					}
				}();
				return n && n.then ? n.then(function(n) {
					return t ? n : e;
				}) : t ? n : e;
			});
		}, function(t, n$1) {
			if (n[o] && n[o](a, M), n[i] = s, M.length = 0, t) throw n$1;
			return n$1;
		}));
	} catch (e) {
		return Promise.reject(e);
	}
}, F = {}, M = [], W = Array.isArray, z = Object.assign, H = "", N = "<!--$s-->", q = "<!--/$s-->";
function B(a, u, s) {
	var l = n[i];
	n[i] = !0, D = n.__b, P = n[r], $ = n.__r, U = n.unmount;
	var f = _$2(k$2, null);
	f[c] = [a];
	try {
		var p = O(a, u || F, !1, void 0, f, !1, s);
		return W(p) ? p.join(H) : p;
	} catch (e) {
		if (e.then) throw new Error("Use \"renderToStringAsync\" for suspenseful rendering.");
		throw e;
	} finally {
		n[o] && n[o](a, M), n[i] = l, M.length = 0;
	}
}
function I(e, t) {
	var n, r = e.type, o = !0;
	return e[a] ? (o = !1, (n = e[a]).state = n[s]) : n = new r(e.props, t), e[a] = n, n.__v = e, n.props = e.props, n.context = t, v(n), n.state ?? (n.state = F), n[s] ?? (n[s] = n.state), r.getDerivedStateFromProps ? n.state = z({}, n.state, r.getDerivedStateFromProps(n.props, n.state)) : o && n.componentWillMount ? (n.componentWillMount(), n.state = n[s] !== n.state ? n[s] : n.state) : !o && n.componentWillUpdate && n.componentWillUpdate(), $ && $(e), n.render(n.props, n.state, t);
}
function O(t, r, o, i, u, _, b) {
	if (null == t || !0 === t || !1 === t || t === H) return H;
	var x = typeof t;
	if ("object" != x) return "function" == x ? H : "string" == x ? g(t) : t + H;
	if (W(t)) {
		var k, C = H;
		u[c] = t;
		for (var S = t.length, L = 0; L < S; L++) {
			var E = t[L];
			if (null != E && "boolean" != typeof E) {
				var j, T = O(E, r, o, i, u, _, b);
				"string" == typeof T ? C += T : (k || (k = new Array(S)), C && k.push(C), C = H, W(T) ? (j = k).push.apply(j, T) : k.push(T));
			}
		}
		return k ? (C && k.push(C), k) : C;
	}
	if (void 0 !== t.constructor) return H;
	t.__ = u, D && D(t);
	var Z = t.type, M = t.props;
	if ("function" == typeof Z) {
		var B, V, K, J = r;
		if (Z === k$2) {
			if ("tpl" in M) {
				for (var Q = H, X = 0; X < M.tpl.length; X++) if (Q += M.tpl[X], M.exprs && X < M.exprs.length) {
					var Y = M.exprs[X];
					if (null == Y) continue;
					"object" != typeof Y || void 0 !== Y.constructor && !W(Y) ? Q += Y : Q += O(Y, r, o, i, t, _, b);
				}
				return Q;
			}
			if ("UNSTABLE_comment" in M) return "<!--" + g(M.UNSTABLE_comment) + "-->";
			V = M.children;
		} else {
			if (null != (B = Z.contextType)) {
				var ee = r[B.__c];
				J = ee ? ee.props.value : B.__;
			}
			var te = Z.prototype && "function" == typeof Z.prototype.render;
			if (te) V = I(t, J), K = t[a];
			else {
				t[a] = K = A(t, J);
				for (var ne = 0; y(K) && ne++ < 25;) {
					m(K), $ && $(t);
					try {
						V = Z.call(K, M, J);
					} catch (e) {
						throw _ && e && "function" == typeof e.then && (t._suspended = !0), e;
					}
				}
				v(K);
			}
			if (null != K.getChildContext && (r = z({}, r, K.getChildContext())), te && n.errorBoundaries && (Z.getDerivedStateFromError || K.componentDidCatch)) {
				V = null != V && V.type === k$2 && null == V.key && null == V.props.tpl ? V.props.children : V;
				try {
					return O(V, r, o, i, t, _, !1);
				} catch (e) {
					return Z.getDerivedStateFromError && (K[s] = Z.getDerivedStateFromError(e)), K.componentDidCatch && K.componentDidCatch(e, F), y(K) ? (V = I(t, r), null != (K = t[a]).getChildContext && (r = z({}, r, K.getChildContext())), O(V = null != V && V.type === k$2 && null == V.key && null == V.props.tpl ? V.props.children : V, r, o, i, t, _, b)) : H;
				} finally {
					P && P(t), U && U(t);
				}
			}
		}
		V = null != V && V.type === k$2 && null == V.key && null == V.props.tpl ? V.props.children : V;
		try {
			var re = O(V, r, o, i, t, _, b);
			return P && P(t), n.unmount && n.unmount(t), t._suspended ? "string" == typeof re ? N + re + q : W(re) ? (re.unshift(N), re.push(q), re) : re.then(function(e) {
				return N + e + q;
			}) : re;
		} catch (n$2) {
			if (!_ && b && b.onError) {
				var oe = function e(n) {
					return b.onError(n, t, function(t, n) {
						try {
							return O(t, r, o, i, n, _, b);
						} catch (t) {
							return e(t);
						}
					});
				}(n$2);
				if (void 0 !== oe) return oe;
				var ie = n.__e;
				return ie && ie(n$2, t), H;
			}
			if (!_) throw n$2;
			if (!n$2 || "function" != typeof n$2.then) throw n$2;
			return n$2.then(function e() {
				try {
					var n = O(V, r, o, i, t, _, b);
					return t._suspended ? N + n + q : n;
				} catch (t) {
					if (!t || "function" != typeof t.then) throw t;
					return t.then(e);
				}
			});
		}
	}
	var ae, ce = "<" + Z, ue = H;
	for (var se in M) {
		var le = M[se];
		if ("function" != typeof (le = G(le) ? le.value : le) || "class" === se || "className" === se) {
			switch (se) {
				case "children":
					ae = le;
					continue;
				case "key":
				case "ref":
				case "__self":
				case "__source": continue;
				case "htmlFor":
					if ("for" in M) continue;
					se = "for";
					break;
				case "className":
					if ("class" in M) continue;
					se = "class";
					break;
				case "defaultChecked":
					se = "checked";
					break;
				case "defaultSelected":
					se = "selected";
					break;
				case "defaultValue":
				case "value":
					switch (se = "value", Z) {
						case "textarea":
							ae = le;
							continue;
						case "select":
							i = le;
							continue;
						case "option": i != le || "selected" in M || (ce += " selected");
					}
					break;
				case "dangerouslySetInnerHTML":
					ue = le && le.__html;
					continue;
				case "style":
					"object" == typeof le && (le = w(le));
					break;
				case "acceptCharset":
					se = "accept-charset";
					break;
				case "httpEquiv":
					se = "http-equiv";
					break;
				default: if (f.test(se)) se = se.replace(f, "$1:$2").toLowerCase();
				else {
					if (l.test(se)) continue;
					"-" !== se[4] && !d.has(se) || null == le ? o ? h.test(se) && (se = "panose1" === se ? "panose-1" : se.replace(/([A-Z])/g, "-$1").toLowerCase()) : p.test(se) && (se = se.toLowerCase()) : le += H;
				}
			}
			null != le && !1 !== le && (ce = !0 === le || le === H ? ce + " " + se : ce + " " + se + "=\"" + ("string" == typeof le ? g(le) : le + H) + "\"");
		}
	}
	if (l.test(Z)) throw new Error(Z + " is not a valid HTML tag name in " + ce + ">");
	if (ue || ("string" == typeof ae ? ue = g(ae) : null != ae && !1 !== ae && !0 !== ae && (ue = O(ae, r, "svg" === Z || "foreignObject" !== Z && o, i, t, _, b))), P && P(t), U && U(t), !ue && R.has(Z)) return ce + "/>";
	var fe = "</" + Z + ">", pe = ce + ">";
	return W(ue) ? [pe].concat(ue, [fe]) : "string" != typeof ue ? [
		pe,
		ue,
		fe
	] : pe + ue + fe;
}
var R = new Set([
	"area",
	"base",
	"br",
	"col",
	"command",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]), V = B, K = B;
function G(e) {
	return null !== e && "object" == typeof e && "function" == typeof e.peek && "value" in e;
}

//#endregion
//#region node_modules/@pierre/trees/dist/render/FileTree.js
let clientInstanceId = 0;
function createClientId(explicitId) {
	if (explicitId != null && explicitId.length > 0) return explicitId;
	clientInstanceId += 1;
	return `pst_ft_${clientInstanceId}`;
}
function resolveInitialViewportHeight({ initialVisibleRowCount, itemHeight }) {
	return initialVisibleRowCount == null ? FILE_TREE_DEFAULT_VIEWPORT_HEIGHT : Math.max(0, initialVisibleRowCount) * (itemHeight ?? FILE_TREE_DEFAULT_ITEM_HEIGHT);
}
function parseSpriteSheet(spriteSheet) {
	if (typeof document === "undefined") return;
	const wrapper = document.createElement("div");
	wrapper.innerHTML = spriteSheet;
	const svg = wrapper.querySelector("svg");
	return svg instanceof SVGElement ? svg : void 0;
}
function isBuiltInSpriteSheet(spriteSheet) {
	return spriteSheet.querySelector("#file-tree-icon-chevron") instanceof SVGElement && spriteSheet.querySelector("#file-tree-icon-file") instanceof SVGElement && spriteSheet.querySelector("#file-tree-icon-dot") instanceof SVGElement && spriteSheet.querySelector("#file-tree-icon-lock") instanceof SVGElement;
}
function getTopLevelSpriteSheets(shadowRoot) {
	return Array.from(shadowRoot.children).filter((element) => element instanceof SVGElement);
}
var FileTree = class {
	static LoadedCustomComponent = FileTreeContainerLoaded;
	#composition;
	#controller;
	#id;
	#onSelectionChange;
	#renderRowDecoration;
	#renamingEnabled;
	#searchBlurBehavior;
	#searchEnabled;
	#searchFakeFocus;
	#slotHost = new FileTreeManagedSlotHost();
	#density;
	#viewOptions;
	#fileTreeContainer;
	#gitStatusState;
	#icons;
	#unsafeCSS;
	#unsafeCSSStyle;
	#appliedUnsafeCSS;
	#selectionVersion;
	#selectionSubscription = null;
	#wrapper;
	#wroteHostItemHeight = false;
	#wroteHostDensityFactor = false;
	constructor(options) {
		const { composition, density, fileTreeSearchMode, gitStatus, id, initialSearchQuery, icons, itemHeight, onSearchChange, onSelectionChange, overscan, renderRowDecoration, renaming, search, searchBlurBehavior, searchFakeFocus, stickyFolders, unsafeCSS, initialVisibleRowCount, ...controllerOptions } = options;
		this.#composition = composition;
		this.#id = createClientId(id);
		this.#gitStatusState = resolveFileTreeGitStatusState(gitStatus);
		this.#icons = icons;
		this.#unsafeCSS = unsafeCSS;
		this.#onSelectionChange = onSelectionChange;
		this.#renderRowDecoration = renderRowDecoration;
		this.#renamingEnabled = renaming != null && renaming !== false;
		this.#searchBlurBehavior = searchBlurBehavior;
		this.#searchEnabled = search === true;
		this.#searchFakeFocus = searchFakeFocus === true;
		this.#density = resolveFileTreeDensity(density, itemHeight);
		this.#viewOptions = {
			itemHeight: this.#density.itemHeight,
			overscan,
			stickyFolders,
			initialVisibleRowCount
		};
		this.#controller = new FileTreeController({
			...controllerOptions,
			fileTreeSearchMode,
			initialSearchQuery,
			onSearchChange,
			renaming
		});
		this.#selectionVersion = this.#controller.getSelectionVersion();
		this.#selectionSubscription = this.#onSelectionChange == null ? null : this.subscribe(() => {
			this.#emitSelectionChange();
		});
	}
	unmount() {
		if (this.#wrapper != null) {
			unmountFileTreeRoot(this.#wrapper);
			delete this.#wrapper.dataset.fileTreeVirtualizedWrapper;
			this.#wrapper = void 0;
		}
		this.#slotHost.clearAll();
		this.#slotHost.setHost(null);
		if (this.#fileTreeContainer != null) {
			delete this.#fileTreeContainer.dataset.fileTreeVirtualized;
			this.#removeOwnedDensityHostStyle(this.#fileTreeContainer);
			this.#fileTreeContainer = void 0;
		}
	}
	cleanUp() {
		this.unmount();
		this.#selectionSubscription?.();
		this.#selectionSubscription = null;
		this.#controller.destroy();
	}
	getFileTreeContainer() {
		return this.#fileTreeContainer;
	}
	getItem(path) {
		return this.#controller.getItem(path);
	}
	getFocusedItem() {
		return this.#controller.getFocusedItem();
	}
	getFocusedPath() {
		return this.#controller.getFocusedPath();
	}
	getSelectedPaths() {
		return this.#controller.getSelectedPaths();
	}
	getComposition() {
		return this.#composition;
	}
	getItemHeight() {
		return this.#density.itemHeight;
	}
	getDensityFactor() {
		return this.#density.factor;
	}
	subscribe(listener) {
		let hasSeenInitialSnapshot = false;
		return this.#controller.subscribe(() => {
			if (!hasSeenInitialSnapshot) {
				hasSeenInitialSnapshot = true;
				return;
			}
			listener();
		});
	}
	focusPath(path) {
		this.#controller.focusPath(path);
	}
	scrollToPath(path, options) {
		this.#controller.scrollToPath(path, options);
	}
	focusNearestPath(path) {
		return this.#controller.focusNearestPath(path);
	}
	add(path) {
		this.#controller.add(path);
	}
	batch(operations) {
		this.#controller.batch(operations);
	}
	move(fromPath, toPath, options) {
		this.#controller.move(fromPath, toPath, options);
	}
	onMutation(type, handler) {
		return this.#controller.onMutation(type, handler);
	}
	setSearch(value) {
		this.#controller.setSearch(value);
	}
	openSearch(initialValue) {
		this.#controller.openSearch(initialValue);
	}
	closeSearch() {
		this.#controller.closeSearch();
	}
	isSearchOpen() {
		return this.#controller.isSearchOpen();
	}
	getSearchValue() {
		return this.#controller.getSearchValue();
	}
	getSearchMatchingPaths() {
		return this.#controller.getSearchMatchingPaths();
	}
	focusNextSearchMatch() {
		this.#controller.focusNextSearchMatch();
	}
	focusPreviousSearchMatch() {
		this.#controller.focusPreviousSearchMatch();
	}
	startRenaming(path, options) {
		return this.#controller.startRenaming(path, options);
	}
	remove(path, options) {
		this.#controller.remove(path, options);
	}
	resetPaths(paths, options) {
		this.#controller.resetPaths(paths, options);
	}
	setComposition(composition) {
		this.#composition = composition;
		const mountedTree = this.#getMountedTreeElements();
		if (mountedTree == null) return;
		this.#syncHeaderSlotContent();
		renderFileTreeRoot(mountedTree.wrapper, this.#getViewProps());
	}
	setGitStatus(gitStatus) {
		this.#gitStatusState = resolveFileTreeGitStatusState(gitStatus, this.#gitStatusState);
		const mountedTree = this.#getMountedTreeElements();
		if (mountedTree == null) return;
		renderFileTreeRoot(mountedTree.wrapper, this.#getViewProps());
	}
	setIcons(icons) {
		this.#icons = icons;
		const mountedTree = this.#getMountedTreeElements();
		if (mountedTree == null) return;
		this.#syncIconSurface(mountedTree.host, mountedTree.wrapper);
		renderFileTreeRoot(mountedTree.wrapper, this.#getViewProps());
	}
	hydrate({ fileTreeContainer }) {
		const host = this.#prepareHost(fileTreeContainer);
		const wrapper = this.#getOrCreateWrapper(host);
		this.#syncHeaderSlotContent();
		hydrateFileTreeRoot(wrapper, this.#getViewProps());
	}
	render({ containerWrapper, fileTreeContainer }) {
		const host = this.#prepareHost(fileTreeContainer ?? this.#fileTreeContainer, containerWrapper);
		const wrapper = this.#getOrCreateWrapper(host);
		this.#syncHeaderSlotContent();
		renderFileTreeRoot(wrapper, this.#getViewProps());
	}
	#getInitialViewOptions() {
		return {
			initialViewportHeight: resolveInitialViewportHeight({
				initialVisibleRowCount: this.#viewOptions.initialVisibleRowCount,
				itemHeight: this.#viewOptions.itemHeight
			}),
			itemHeight: this.#viewOptions.itemHeight,
			overscan: this.#viewOptions.overscan,
			stickyFolders: this.#viewOptions.stickyFolders
		};
	}
	#getViewProps() {
		return {
			composition: this.#composition,
			controller: this.#controller,
			gitStatusByPath: this.#gitStatusState?.statusByPath,
			ignoredGitDirectories: this.#gitStatusState?.ignoredDirectoryPaths,
			directoriesWithGitChanges: this.#gitStatusState?.directoriesWithChanges,
			icons: this.#icons,
			instanceId: this.#id,
			renamingEnabled: this.#renamingEnabled,
			renderRowDecoration: this.#renderRowDecoration,
			searchBlurBehavior: this.#searchBlurBehavior,
			searchEnabled: this.#searchEnabled,
			searchFakeFocus: this.#searchFakeFocus,
			slotHost: this.#slotHost,
			...this.#getInitialViewOptions()
		};
	}
	#getMountedTreeElements() {
		const host = this.#fileTreeContainer;
		const wrapper = this.#wrapper;
		if (host == null || wrapper == null) return null;
		return {
			host,
			wrapper
		};
	}
	#syncIconSurface(host, wrapper) {
		const shadowRoot = host.shadowRoot;
		if (shadowRoot != null) {
			this.#syncBuiltInSpriteSheet(shadowRoot);
			this.#syncCustomSpriteSheet(shadowRoot);
		}
		this.#syncIconModeAttrs(wrapper);
	}
	#emitSelectionChange() {
		const onSelectionChange = this.#onSelectionChange;
		if (onSelectionChange == null) return;
		const nextSelectionVersion = this.#controller.getSelectionVersion();
		if (nextSelectionVersion === this.#selectionVersion) return;
		this.#selectionVersion = nextSelectionVersion;
		onSelectionChange(this.#controller.getSelectedPaths());
	}
	#syncHeaderSlotContent() {
		const renderHeader = this.#composition?.header?.render;
		if (renderHeader != null) {
			this.#slotHost.setSlotContent(HEADER_SLOT_NAME, renderHeader());
			return;
		}
		this.#slotHost.setSlotHtml(HEADER_SLOT_NAME, this.#composition?.header?.html ?? null);
	}
	#syncBuiltInSpriteSheet(shadowRoot) {
		const currentBuiltInSprite = getTopLevelSpriteSheets(shadowRoot).find((sprite) => isBuiltInSpriteSheet(sprite));
		const nextBuiltInSprite = parseSpriteSheet(getBuiltInSpriteSheet(normalizeFileTreeIcons(this.#icons).set));
		if (nextBuiltInSprite == null) return;
		if (currentBuiltInSprite != null && currentBuiltInSprite.outerHTML === nextBuiltInSprite.outerHTML) return;
		if (currentBuiltInSprite != null) currentBuiltInSprite.replaceWith(nextBuiltInSprite);
		else shadowRoot.prepend(nextBuiltInSprite);
	}
	#syncCustomSpriteSheet(shadowRoot) {
		const topLevelSprites = getTopLevelSpriteSheets(shadowRoot);
		const builtInSprite = topLevelSprites.find((sprite) => isBuiltInSpriteSheet(sprite));
		const currentCustomSprites = topLevelSprites.filter((sprite) => sprite !== builtInSprite);
		const customSpriteSheet = normalizeFileTreeIcons(this.#icons).spriteSheet?.trim() ?? "";
		if (customSpriteSheet.length === 0) {
			for (const currentCustomSprite of currentCustomSprites) currentCustomSprite.remove();
			return;
		}
		const customSprite = parseSpriteSheet(customSpriteSheet);
		if (customSprite == null) {
			for (const currentCustomSprite of currentCustomSprites) currentCustomSprite.remove();
			return;
		}
		if (currentCustomSprites.length === 1 && currentCustomSprites[0].outerHTML === customSprite.outerHTML) return;
		for (const currentCustomSprite of currentCustomSprites) currentCustomSprite.remove();
		shadowRoot.appendChild(customSprite);
	}
	#syncIconModeAttrs(wrapper) {
		const normalizedIcons = normalizeFileTreeIcons(this.#icons);
		if (normalizedIcons.colored && isColoredBuiltInIconSet(normalizedIcons.set)) wrapper.dataset.fileTreeColoredIcons = "true";
		else delete wrapper.dataset.fileTreeColoredIcons;
	}
	#syncUnsafeCSS(shadowRoot) {
		const existingUnsafeStyle = shadowRoot.querySelector(`style[${FILE_TREE_UNSAFE_CSS_ATTRIBUTE}]`);
		if (this.#unsafeCSSStyle == null && existingUnsafeStyle instanceof HTMLStyleElement) this.#unsafeCSSStyle = existingUnsafeStyle;
		if (this.#unsafeCSS == null || this.#unsafeCSS === "") {
			this.#unsafeCSSStyle?.remove();
			this.#unsafeCSSStyle = void 0;
			this.#appliedUnsafeCSS = void 0;
			return;
		}
		if (this.#unsafeCSSStyle?.parentNode === shadowRoot && this.#appliedUnsafeCSS === this.#unsafeCSS) return;
		this.#unsafeCSSStyle ??= document.createElement("style");
		this.#unsafeCSSStyle.setAttribute(FILE_TREE_UNSAFE_CSS_ATTRIBUTE, "");
		if (this.#unsafeCSSStyle.parentNode !== shadowRoot) shadowRoot.appendChild(this.#unsafeCSSStyle);
		this.#unsafeCSSStyle.textContent = wrapUnsafeCSS(this.#unsafeCSS);
		this.#appliedUnsafeCSS = this.#unsafeCSS;
	}
	#getOrCreateWrapper(host) {
		if (this.#wrapper != null) return this.#wrapper;
		const shadowRoot = host.shadowRoot;
		if (shadowRoot == null) throw new Error("FileTree requires a shadow root");
		const wrapperCandidates = Array.from(shadowRoot.children).filter((element) => element instanceof HTMLDivElement && typeof element.dataset.fileTreeId === "string" && element.dataset.fileTreeId.length > 0);
		const existingWrapper = wrapperCandidates.find((element) => element.dataset.fileTreeId === this.#id) ?? wrapperCandidates[0];
		if (existingWrapper != null) this.#id = existingWrapper.dataset.fileTreeId ?? this.#id;
		this.#wrapper = existingWrapper ?? document.createElement("div");
		this.#wrapper.dataset.fileTreeId = this.#id;
		this.#wrapper.dataset.fileTreeVirtualizedWrapper = "true";
		this.#syncIconSurface(host, this.#wrapper);
		if (this.#wrapper.parentNode !== shadowRoot) shadowRoot.appendChild(this.#wrapper);
		return this.#wrapper;
	}
	#prepareHost(fileTreeContainer, parentNode) {
		const host = fileTreeContainer ?? this.#fileTreeContainer ?? document.createElement(FILE_TREE_TAG_NAME);
		if (parentNode != null && host.parentNode !== parentNode) parentNode.appendChild(host);
		const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
		prepareFileTreeShadowRoot(host, shadowRoot);
		this.#syncUnsafeCSS(shadowRoot);
		host.dataset.fileTreeVirtualized = "true";
		host.style.display = "flex";
		this.#applyDensityHostStyle(host);
		this.#slotHost.setHost(host);
		this.#fileTreeContainer = host;
		return host;
	}
	#applyDensityHostStyle(host) {
		if (host.style.getPropertyValue("--trees-item-height") === "") {
			host.style.setProperty("--trees-item-height", `${String(this.#density.itemHeight)}px`);
			this.#wroteHostItemHeight = true;
		}
		if (host.style.getPropertyValue("--trees-density-override") === "") {
			host.style.setProperty("--trees-density-override", String(this.#density.factor));
			this.#wroteHostDensityFactor = true;
		}
	}
	#removeOwnedDensityHostStyle(host) {
		if (this.#wroteHostItemHeight) {
			host.style.removeProperty("--trees-item-height");
			this.#wroteHostItemHeight = false;
		}
		if (this.#wroteHostDensityFactor) {
			host.style.removeProperty("--trees-density-override");
			this.#wroteHostDensityFactor = false;
		}
	}
};

//#endregion
//#region web/src/file-list-methods.ts
var FileListMethods = class {
	fileTree;
	fileTreeExpansion;
	setupSidebarResizer() {
		const sidebar = document.getElementById("sidebar");
		const resizer = document.getElementById("sidebar-resizer");
		const collapseBtn = document.getElementById("sidebar-collapse-btn");
		if (!sidebar || !resizer) return;
		const STORAGE_KEY = "lrv-sidebar-collapsed";
		const setCollapsed = (collapsed) => {
			sidebar.classList.toggle("collapsed", collapsed);
			if (collapseBtn) collapseBtn.textContent = collapsed ? "›" : "‹";
			localStorage.setItem(STORAGE_KEY, String(collapsed));
		};
		if (localStorage.getItem(STORAGE_KEY) === "true") setCollapsed(true);
		collapseBtn?.addEventListener("mousedown", (e) => {
			e.stopPropagation();
		});
		collapseBtn?.addEventListener("click", () => {
			setCollapsed(!sidebar.classList.contains("collapsed"));
		});
		let isResizing = false;
		resizer.addEventListener("mousedown", (e) => {
			if (sidebar.classList.contains("collapsed")) return;
			isResizing = true;
			resizer.classList.add("dragging");
			document.body.style.cursor = "ew-resize";
			document.body.style.userSelect = "none";
			e.preventDefault();
		});
		document.addEventListener("mousemove", (e) => {
			if (!isResizing) return;
			const newWidth = e.clientX;
			if (newWidth >= 150 && newWidth <= 600) sidebar.style.width = newWidth + "px";
		});
		document.addEventListener("mouseup", () => {
			if (isResizing) {
				isResizing = false;
				resizer.classList.remove("dragging");
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			}
		});
	}
	setupCommitStripResizer() {
		const strip = document.getElementById("commit-strip");
		const resizer = document.getElementById("commit-strip-resizer");
		const sidebar = document.getElementById("sidebar");
		if (!strip || !resizer || !sidebar) return;
		const STORAGE_KEY = "lrv-commit-strip-height-pct";
		const DEFAULT_PCT = .5;
		const sidebarHeight = () => sidebar.getBoundingClientRect().height;
		const applyPct = (pct) => {
			strip.style.height = Math.round(sidebarHeight() * pct) + "px";
		};
		const saved = localStorage.getItem(STORAGE_KEY);
		applyPct(saved !== null ? parseFloat(saved) : DEFAULT_PCT);
		let isResizing = false;
		let startY = 0;
		let startHeight = 0;
		resizer.addEventListener("mousedown", (e) => {
			isResizing = true;
			startY = e.clientY;
			startHeight = strip.getBoundingClientRect().height;
			resizer.classList.add("dragging");
			document.body.style.cursor = "ns-resize";
			document.body.style.userSelect = "none";
			e.preventDefault();
		});
		document.addEventListener("mousemove", (e) => {
			if (!isResizing) return;
			const newHeight = startHeight + e.clientY - startY;
			const total = sidebarHeight();
			strip.style.height = Math.max(60, Math.min(newHeight, total - 60)) + "px";
		});
		document.addEventListener("mouseup", () => {
			if (!isResizing) return;
			isResizing = false;
			resizer.classList.remove("dragging");
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			const total = sidebarHeight();
			localStorage.setItem(STORAGE_KEY, String(strip.getBoundingClientRect().height / total));
		});
	}
	setupFileListControls() {
		const filter = document.getElementById("file-list-filter");
		const collapseAll = document.getElementById("collapse-all-dirs");
		const expandAll = document.getElementById("expand-all-dirs");
		if (filter) filter.value = this.fileListFilter;
		filter?.addEventListener("input", () => {
			this.fileListFilter = filter.value.trim().toLowerCase();
			this.fileTree?.setSearch(this.fileListFilter || null);
			this.renderSummary(this.visibleFileCount());
		});
		collapseAll?.addEventListener("click", () => {
			this.fileTreeExpansion = "closed";
			this.renderFileList();
		});
		expandAll?.addEventListener("click", () => {
			this.fileTreeExpansion = "open";
			this.renderFileList();
		});
	}
	expandCurrentFileAncestors() {
		const currentPath = this.currentPath();
		if (currentPath) {
			this.selectFileTreePath(currentPath);
			this.fileTree?.scrollToPath(currentPath, {
				focus: true,
				offset: "nearest"
			});
		}
	}
	selectFileTreePath(path) {
		const tree = this.fileTree;
		if (!tree) return;
		for (const selectedPath of tree.getSelectedPaths()) if (selectedPath !== path) tree.getItem(selectedPath)?.deselect();
		tree.getItem(path)?.select();
		tree.focusPath(path);
	}
	renderFileList() {
		const list = document.getElementById("file-list");
		const summaryHost = document.getElementById("overall-review-summary");
		if (!list || !summaryHost) return;
		this.fileTree?.cleanUp();
		this.fileTree = null;
		clearEl(list);
		clearEl(summaryHost);
		list.classList.add("file-tree", "file-tree-root");
		this.renderCommitRow(summaryHost);
		if (!this.files.length) {
			list.appendChild(el("li", {
				className: "file-list-empty",
				text: "No files match the current filter."
			}));
			this.renderSummary(0);
			return;
		}
		const selectedPath = this.currentPath();
		const treeHost = document.createElement("file-tree-container");
		treeHost.className = "lrv-file-tree";
		list.appendChild(treeHost);
		const pathToIndex = new Map(this.files.map((file, index) => [file.path, index]));
		const tree = new FileTree({
			paths: this.files.map((file) => file.path),
			flattenEmptyDirectories: true,
			initialExpansion: this.fileTreeExpansion ?? "open",
			initialSelectedPaths: selectedPath && !this.currentFileIsCommit ? [selectedPath] : [],
			gitStatus: this.files.map((file) => ({
				path: file.path,
				status: this.gitStatus(file)
			})),
			search: false,
			fileTreeSearchMode: "hide-non-matches",
			initialSearchQuery: this.fileListFilter || null,
			density: "compact",
			icons: { set: "minimal" },
			renderRowDecoration: ({ item }) => {
				const file = this.files[pathToIndex.get(item.path) ?? -1];
				if (!file) return null;
				const { added, deleted } = this.computeFileDelta(file);
				const comments = this.commentManager.getCommentsForFile(file.path).length + this.reviewNoteManager.getNotesForFile(file.path).length;
				const commentText = comments > 0 ? ` ● ${comments}` : "";
				return {
					text: `+${added} -${deleted} ${file.status[0]?.toUpperCase() ?? "?"}${commentText}`,
					title: `${file.path}: +${added} -${deleted}${comments > 0 ? `, ${comments} comments` : ""}`
				};
			},
			onSelectionChange: (paths) => {
				const selected = paths[0];
				if (!selected) return;
				const index = pathToIndex.get(selected);
				if (index === void 0) return;
				if (this.isStacked) this.scrollToFileInStacked(index);
				else this.loadFile(index);
			},
			unsafeCSS: this.fileTreeCss()
		});
		this.fileTree = tree;
		tree.render({ fileTreeContainer: treeHost });
		this.renderSummary(this.visibleFileCount());
		requestAnimationFrame(() => {
			if (selectedPath && !this.currentFileIsCommit) {
				this.selectFileTreePath(selectedPath);
				tree.scrollToPath(selectedPath, {
					focus: true,
					offset: "nearest"
				});
			}
		});
	}
	renderCommitRow(host) {
		if (!(this.diff !== null)) return;
		const li = el("li", {
			className: `tree-row tree-row-summary ${this.currentFileIsCommit ? "active" : ""}`,
			attrs: { "data-commit": "1" }
		});
		const reviewNoteCount = this.reviewNoteManager.getNotesForFile("(commit)").length;
		const hasOverallDraft = this.overallReviewComment.trim().length > 0;
		const left = el("span", { className: "file-left" }, [el("span", { className: "tree-toggle-spacer" }), el("span", {
			className: "file-name summary-file-name",
			text: "Review Summary"
		})]);
		const commentCount = this.commentManager.getCommentsForFile("(commit)").length + reviewNoteCount + (hasOverallDraft ? 1 : 0);
		if (commentCount > 0) left.appendChild(el("span", {
			className: "file-comment-badge",
			text: String(commentCount)
		}));
		const right = el("span", { className: "file-right" }, [el("span", {
			className: "file-status",
			text: hasOverallDraft ? "G" : reviewNoteCount > 0 ? "R" : "S"
		})]);
		const rowButton = el("button", {
			className: "tree-row-content tree-row-button summary-row-button",
			attrs: {
				type: "button",
				"aria-label": "Open review summary"
			}
		}, [left, right]);
		rowButton.onclick = () => {
			this.loadCommitView();
		};
		li.appendChild(rowButton);
		host.appendChild(li);
	}
	renderSummary(visibleFiles) {
		const summary = document.getElementById("file-list-summary");
		if (!summary) return;
		const totalFiles = this.files.length;
		const filterLabel = this.fileListFilter ? ` matching "${this.fileListFilter}"` : "";
		summary.textContent = visibleFiles === totalFiles && !this.fileListFilter ? `${totalFiles} files` : `${visibleFiles} of ${totalFiles} files${filterLabel}`;
	}
	currentPath() {
		return this.currentFileIsCommit ? null : this.files[this.currentFileIndex]?.path ?? null;
	}
	visibleFileCount() {
		if (!this.fileListFilter) return this.files.length;
		const filter = this.fileListFilter.toLowerCase();
		return this.files.filter((file) => file.path.toLowerCase().includes(filter) || Boolean(file.old_path?.toLowerCase().includes(filter))).length;
	}
	computeFileDelta(file) {
		return {
			added: file.hunks.reduce((acc, hunk) => acc + hunk.lines.filter((line) => line.type === "add").length, 0),
			deleted: file.hunks.reduce((acc, hunk) => acc + hunk.lines.filter((line) => line.type === "delete").length, 0)
		};
	}
	gitStatus(file) {
		if (file.status === "added") return "added";
		if (file.status === "deleted") return "deleted";
		if (file.status === "renamed") return "renamed";
		return "modified";
	}
	fileTreeCss() {
		return `
      :host {
        flex: 1 1 auto;
        min-height: 0;
        --trees-bg-override: transparent;
        --trees-fg-override: var(--text-primary);
        --trees-fg-muted-override: var(--text-secondary);
        --trees-selected-bg-override: var(--bg-elevated);
        --trees-selected-fg-override: var(--text-primary);
        --trees-selected-focused-border-color-override: var(--accent-color);
        --trees-focus-ring-color-override: var(--accent-color);
        --trees-border-color-override: var(--border-color);
        --trees-border-radius-override: 1px;
        --trees-item-padding-x-override: 3px;
        --trees-item-margin-x-override: 0px;
        --trees-padding-inline-override: 0px;
        --trees-level-gap-override: 2px;
        font-family: var(--font-sans);
      }
      [data-file-tree-virtualized-root] {
        background: transparent;
      }
      [data-type="item"] {
        border-radius: 1px;
        margin: 1px 0;
        box-shadow: inset 0 0 0 1px transparent;
      }
      [data-type="item"]:hover {
        background: var(--bg-elevated);
      }
      [data-item-selected="true"] {
        background: var(--bg-elevated);
        box-shadow: inset 3px 0 0 var(--accent-color);
      }
      [data-item-focused="true"],
      [aria-selected="true"] {
        outline: none;
      }
      [data-item-section="decoration"],
      [data-item-section="git"] {
        font-variant-numeric: tabular-nums;
        color: var(--text-secondary);
      }
    `;
	}
};

//#endregion
//#region web/src/language.ts
function globPatternToRegExp(pattern) {
	const regexBody = String(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
	return new RegExp(`^${regexBody}$`, "i");
}
function detectLanguageFromPathAndContent(path = "", content = "") {
	const normalizedPath = path.replace(/\\/g, "/").replace(/[?#].*$/, "");
	const baseName = normalizedPath.split("/").pop() || normalizedPath;
	const lowerPath = normalizedPath.toLowerCase();
	const lowerBase = baseName.toLowerCase();
	const fileNameMap = {
		dockerfile: "dockerfile",
		makefile: "makefile",
		gnumakefile: "makefile",
		"cmakelists.txt": "cmake",
		gemfile: "ruby",
		rakefile: "ruby",
		pipfile: "toml"
	};
	if (fileNameMap[lowerBase]) return fileNameMap[lowerBase];
	if (typeof monaco !== "undefined" && monaco.languages.getLanguages) {
		const languages = monaco.languages.getLanguages();
		for (const lang of languages) {
			if (!lang || !lang.id) continue;
			if ((Array.isArray(lang.filenames) ? lang.filenames : []).some((name) => String(name).toLowerCase() === lowerBase)) return lang.id;
			if ((Array.isArray(lang.extensions) ? lang.extensions : []).some((ext) => lowerPath.endsWith(String(ext).toLowerCase()))) return lang.id;
			if ((Array.isArray(lang.filenamePatterns) ? lang.filenamePatterns : []).some((pattern) => {
				try {
					const rx = globPatternToRegExp(pattern);
					return rx.test(baseName) || rx.test(normalizedPath);
				} catch (_) {
					return false;
				}
			})) return lang.id;
		}
	}
	for (const [ext, language] of Object.entries({
		".rs": "rust",
		".js": "javascript",
		".mjs": "javascript",
		".cjs": "javascript",
		".jsx": "javascript",
		".ts": "typescript",
		".tsx": "typescript",
		".d.ts": "typescript",
		".py": "python",
		".md": "markdown",
		".mdx": "markdown",
		".json": "json",
		".jsonc": "json",
		".html": "html",
		".htm": "html",
		".css": "css",
		".scss": "scss",
		".less": "less",
		".yml": "yaml",
		".yaml": "yaml",
		".xml": "xml",
		".toml": "toml",
		".ini": "ini",
		".cfg": "ini",
		".sh": "shell",
		".bash": "shell",
		".zsh": "shell",
		".fish": "shell",
		".sql": "sql",
		".go": "go",
		".java": "java",
		".kt": "kotlin",
		".swift": "swift",
		".php": "php",
		".rb": "ruby",
		".lua": "lua",
		".c": "c",
		".h": "cpp",
		".cpp": "cpp",
		".cc": "cpp",
		".cxx": "cpp",
		".hpp": "cpp",
		".cs": "csharp",
		".dart": "dart",
		".dockerfile": "dockerfile"
	})) if (lowerBase.endsWith(ext)) return language;
	const firstLine = (content.split("\n", 1)[0] ?? "").toLowerCase();
	if (firstLine.startsWith("#!")) {
		if (firstLine.includes("bash") || firstLine.includes("sh") || firstLine.includes("zsh") || firstLine.includes("fish")) return "shell";
		if (firstLine.includes("python")) return "python";
		if (firstLine.includes("node") || firstLine.includes("deno")) return "javascript";
		if (firstLine.includes("ruby")) return "ruby";
		if (firstLine.includes("perl")) return "perl";
	}
	return "plaintext";
}

//#endregion
//#region web/src/font.ts
const MONO_FALLBACK = "'Monaco', 'Menlo', 'Consolas', monospace";
const DEFAULT_MONO_STACK = `'JetBrains Mono', ${MONO_FALLBACK}`;
function isMonospace(fontName) {
	const ctx = el("canvas").getContext("2d");
	if (!ctx) return false;
	ctx.font = `72px '${fontName}'`;
	return Math.abs(ctx.measureText("m").width - ctx.measureText("i").width) < 1;
}
function monoFontStack(font) {
	const name = (font || "").toString().trim();
	if (!name) return DEFAULT_MONO_STACK;
	if (name.includes(",")) return name;
	if (!isMonospace(name)) return DEFAULT_MONO_STACK;
	return `'${name}', ${MONO_FALLBACK}`;
}
function prefersReducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

//#endregion
//#region web/src/file-loading-methods.ts
let _loadSerial = 0;
var FileLoadingMethods = class {
	lastModifiedRangeSelection;
	lastOriginalRangeSelection;
	editorClickDisposables;
	getCurrentFile(index) {
		return this.files[index];
	}
	binaryPreviewUrl(file, side) {
		const params = new URLSearchParams({
			path: side === "old" ? file.old_path || file.path : file.path,
			side
		});
		if (this.seriesInfo?.is_series) params.set("commit", String(this.currentCommitIdx));
		return `/api/file/preview?${params.toString()}`;
	}
	renderBinaryPreview(container, file) {
		const status = file.status.toLowerCase();
		const canShowOld = ![
			"added",
			"add",
			"a",
			"new"
		].includes(status);
		const canShowNew = ![
			"deleted",
			"delete",
			"d",
			"removed"
		].includes(status);
		const initialSide = canShowNew ? "new" : "old";
		const previewFrame = el("iframe", {
			className: "binary-file-preview-frame",
			attrs: {
				title: `${file.path} binary preview`,
				loading: "lazy"
			}
		});
		const previewLink = el("a", {
			className: "binary-file-open-link",
			text: "Open in new tab",
			attrs: {
				target: "_blank",
				rel: "noopener noreferrer"
			}
		});
		const setSide = (side) => {
			const url = this.binaryPreviewUrl(file, side);
			previewFrame.src = url;
			previewLink.href = url;
			oldBtn?.classList.toggle("active", side === "old");
			newBtn?.classList.toggle("active", side === "new");
			label.textContent = side === "old" ? "Showing old side" : "Showing new side";
		};
		const label = el("div", {
			className: "binary-file-side-label",
			text: ""
		});
		let oldBtn = null;
		let newBtn = null;
		const controls = el("div", { className: "binary-file-controls" });
		if (canShowOld && canShowNew) {
			oldBtn = el("button", {
				className: "btn-secondary binary-file-side-btn",
				text: "Old",
				attrs: { type: "button" }
			});
			newBtn = el("button", {
				className: "btn-secondary binary-file-side-btn",
				text: "New",
				attrs: { type: "button" }
			});
			oldBtn.onclick = () => setSide("old");
			newBtn.onclick = () => setSide("new");
			controls.append(oldBtn, newBtn);
		}
		controls.append(label, previewLink);
		container.appendChild(el("div", { className: "binary-file-notice" }, [
			el("div", {
				className: "binary-file-title",
				text: "Binary file"
			}),
			el("div", {
				className: "binary-file-body",
				text: `${file.path} changed. Previewing it with the browser instead of a text diff.`
			}),
			controls,
			previewFrame
		]));
		setSide(initialSide);
	}
	isAddedFile(file) {
		const rawStatus = file.status.toLowerCase();
		if (rawStatus === "added" || rawStatus === "add" || rawStatus === "a" || rawStatus === "new") return true;
		return file.hunks.length > 0 && file.hunks.every((h) => (h.old_start ?? 0) === 0);
	}
	async loadFile(index) {
		this.currentFileIsCommit = false;
		if (window.DEBUG) console.info("[app] loadFile: index", index);
		window.Perf.mark("loadFile:start");
		window.Perf.recordFileSwitchStart();
		this.currentFileIndex = index;
		const file = this.getCurrentFile(index);
		const isAddedFile = this.isAddedFile(file);
		const renderSideBySide = !this.isInline && !isAddedFile;
		if (window.DEBUG) console.info("[app] loadFile: path", file.path, "status", file.status);
		this.initFileHunks(file);
		this.expandCurrentFileAncestors();
		this.renderFileList();
		if (this.originalModel) {
			this.originalModel.dispose();
			this.originalModel = null;
		}
		if (this.modifiedModel) {
			this.modifiedModel.dispose();
			this.modifiedModel = null;
		}
		if (this.currentWidget && this.currentWidgetEditor) {
			this.currentWidgetEditor.removeContentWidget(this.currentWidget);
			this.currentWidget = null;
			this.currentWidgetEditor = null;
		}
		this.modifiedReviewNoteZoneIds = [];
		this.originalReviewNoteZoneIds = [];
		this.modifiedReviewNoteDecorations = [];
		this.originalReviewNoteDecorations = [];
		const theme = this.config.color_scheme;
		const container = document.getElementById("editor-container");
		if (!container) return;
		container.classList.toggle("file-added-view", file.status === "added");
		container.classList.remove("binary-file-view");
		container.querySelector(".binary-file-notice")?.remove();
		if (this._commitViewEl) {
			this._commitViewEl.style.display = "none";
			container.style.display = "";
		}
		const oldBanner = $$2("#old-missing-banner");
		if (oldBanner) oldBanner.style.display = "none";
		if (file.is_binary) {
			container.classList.add("binary-file-view");
			this.renderBinaryPreview(container, file);
			markAppReady();
			return;
		}
		const mono = monoFontStack(this.config.font);
		const reduceMotion = prefersReducedMotion();
		if (!this.editor) this.editor = monaco.editor.createDiffEditor(container, {
			theme,
			renderSideBySide,
			readOnly: true,
			originalEditable: false,
			automaticLayout: true,
			scrollBeyondLastLine: true,
			minimap: { enabled: true },
			glyphMargin: true,
			folding: false,
			lineDecorationsWidth: 0,
			fontSize: 14,
			fontFamily: mono,
			lineNumbers: "on",
			renderOverviewRuler: true,
			hideUnchangedRegions: MONACO_HIDE_UNCHANGED,
			scrollbar: {
				vertical: "visible",
				horizontal: "visible"
			}
		});
		window.Perf.mark("loadFile:fetch:start");
		await this.fetchFilePair(file.path);
		window.Perf.mark("loadFile:fetch:end");
		window.Perf.measure("loadFile:fetch", "loadFile:fetch:start", "loadFile:fetch:end");
		const filePair = this.fileCache[this.fileCacheKey(file.path)];
		const oldContent = filePair.old;
		const newContent = filePair.new;
		const language = detectLanguageFromPathAndContent(file.path || file.old_path || "", newContent || oldContent);
		if (oldBanner) {
			const show = !isAddedFile && filePair.old.length === 0 && filePair.new.length > 0;
			oldBanner.style.display = show ? "" : "none";
		}
		window.Perf.mark("loadFile:models:start");
		this.originalModel = monaco.editor.createModel(oldContent, language);
		this.modifiedModel = monaco.editor.createModel(newContent, language);
		window.Perf.mark("loadFile:models:end");
		window.Perf.measure("loadFile:models", "loadFile:models:start", "loadFile:models:end");
		if (window.DEBUG) console.info("[app] models created for", file.path, "lang", language, "old/new lines", oldContent.split("\n").length, newContent.split("\n").length);
		window.Perf.mark("loadFile:setModel:start");
		const diffEditor = this.editor;
		const editorContainer = document.getElementById("editor-container");
		editorContainer?.classList.add("diff-loading");
		const mySerial = ++_loadSerial;
		const uncover = () => {
			if (_loadSerial === mySerial) editorContainer?.classList.remove("diff-loading");
		};
		const fallback = setTimeout(uncover, 1500);
		diffEditor.setModel({
			original: this.originalModel,
			modified: this.modifiedModel
		});
		window.Perf.mark("loadFile:setModel:end");
		window.Perf.measure("loadFile:setModel", "loadFile:setModel:start", "loadFile:setModel:end");
		let scrollReset;
		scrollReset = diffEditor.onDidUpdateDiff(() => {
			scrollReset?.dispose();
			clearTimeout(fallback);
			diffEditor.getModifiedEditor().setScrollTop(0);
			diffEditor.getOriginalEditor().setScrollTop(0);
			requestAnimationFrame(() => requestAnimationFrame(uncover));
		});
		diffEditor.updateOptions({
			renderSideBySide,
			fontFamily: mono,
			glyphMargin: true,
			folding: false,
			lineDecorationsWidth: 0,
			scrollBeyondLastLine: true,
			hideUnchangedRegions: MONACO_HIDE_UNCHANGED
		});
		monaco.editor.setTheme(theme);
		const opts = {
			smoothScrolling: !reduceMotion,
			glyphMargin: true,
			folding: false,
			scrollBeyondLastLine: true
		};
		const me = diffEditor.getModifiedEditor();
		const oe = diffEditor.getOriginalEditor();
		if (me.getModel()) me.updateOptions(opts);
		if (oe.getModel()) oe.updateOptions(opts);
		window.Perf.mark("loadFile:paint-wait:start");
		requestAnimationFrame(() => requestAnimationFrame(() => {
			window.Perf.mark("loadFile:paint-wait:end");
			window.Perf.measure("loadFile:paint-wait", "loadFile:paint-wait:start", "loadFile:paint-wait:end");
			window.Perf.recordFileSwitchEnd();
			window.Perf.mark("loadFile:end");
			window.Perf.measure("loadFile:total", "loadFile:start", "loadFile:end");
			if (window.DEBUG) {
				const e = performance.getEntriesByName("fileSwitch");
				const d = e.length > 0 ? e[e.length - 1].duration : null;
				if (d != null) console.info("[perf] fileSwitch ms:", Math.round(d));
			}
			const prefs = [
				"function",
				"const",
				"import",
				"class",
				"return",
				"if",
				"export",
				"let"
			];
			const spans = Array.from(document.querySelectorAll(".monaco-editor .view-line span"));
			let found = null;
			for (const p of prefs) {
				for (const s of spans) if ((s.textContent ?? "").trim() === p) {
					found = s;
					break;
				}
				if (found) break;
			}
			if (found) {
				const col = getComputedStyle(found).color;
				if (col) document.documentElement.style.setProperty("--accent-color", col);
			}
			markAppReady();
		}));
		const modifiedEditor = diffEditor.getModifiedEditor();
		const originalEditor = diffEditor.getOriginalEditor();
		modifiedEditor.updateOptions({ lineNumbers: "on" });
		originalEditor.updateOptions({ lineNumbers: "on" });
		this.setupEditorClickHandlers(file.path, modifiedEditor, originalEditor);
		this.updateDecorations();
		this.renderReviewNotes();
		this.applyInitialHunkFocus(file.path);
	}
	setupEditorClickHandlers(filePath, modifiedEditor, originalEditor) {
		this.editorClickDisposables?.forEach((disposable) => disposable.dispose());
		this.editorClickDisposables = [];
		this.lastModifiedRangeSelection = this.editorRangeSelection(modifiedEditor.getSelection());
		this.lastOriginalRangeSelection = this.editorRangeSelection(originalEditor.getSelection());
		this.editorClickDisposables.push(modifiedEditor.onDidChangeCursorSelection(() => {
			this.lastModifiedRangeSelection = this.editorRangeSelection(modifiedEditor.getSelection()) ?? this.lastModifiedRangeSelection;
		}), originalEditor.onDidChangeCursorSelection(() => {
			this.lastOriginalRangeSelection = this.editorRangeSelection(originalEditor.getSelection()) ?? this.lastOriginalRangeSelection;
		}), modifiedEditor.onMouseUp((e) => {
			this.lastModifiedRangeSelection = this.editorRangeSelection(modifiedEditor.getSelection()) ?? this.lastModifiedRangeSelection;
		}), originalEditor.onMouseUp((e) => {
			this.lastOriginalRangeSelection = this.editorRangeSelection(originalEditor.getSelection()) ?? this.lastOriginalRangeSelection;
		}));
		this.editorClickDisposables.push(modifiedEditor.onMouseDown((e) => {
			if (this.isCommentGutterTarget(e) && e.target.position) this.beginEditorGutterGesture(filePath, modifiedEditor, e.target.position.lineNumber, "new");
		}), originalEditor.onMouseDown((e) => {
			if (this.isCommentGutterTarget(e) && e.target.position) this.beginEditorGutterGesture(filePath, originalEditor, e.target.position.lineNumber, "old");
		}));
	}
	beginEditorGutterGesture(filePath, targetEditor, downLine, side) {
		const handleMouseUp = (event) => {
			const upLine = targetEditor.getTargetAtClientPoint(event.clientX, event.clientY)?.position?.lineNumber ?? downLine;
			const fallbackSelection = side === "new" ? this.lastModifiedRangeSelection : this.lastOriginalRangeSelection;
			this.showCommentDialog(filePath, this.commentLineFromGutterGesture(targetEditor, downLine, upLine, fallbackSelection), upLine, side);
		};
		document.addEventListener("mouseup", handleMouseUp, {
			capture: true,
			once: true
		});
	}
	isCommentGutterTarget(e) {
		return e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN;
	}
	commentLineFromGutterGesture(editor, downLine, upLine, fallbackSelection) {
		if (downLine !== upLine) return [Math.min(downLine, upLine), Math.max(downLine, upLine)];
		return this.commentLineFromEditorSelection(editor, upLine, fallbackSelection);
	}
	commentLineFromEditorSelection(editor, clickedLine, fallbackSelection) {
		const current = this.commentLineFromSelection(editor.getSelection(), clickedLine);
		if (Array.isArray(current)) return current;
		return this.commentLineFromSelection(fallbackSelection, clickedLine) ?? current ?? clickedLine;
	}
	commentLineFromSelection(selection, clickedLine) {
		if (!selection || selection.isEmpty()) return null;
		const start = Math.min(selection.startLineNumber, selection.endLineNumber);
		let end = Math.max(selection.startLineNumber, selection.endLineNumber);
		const exclusiveEndColumn = selection.startLineNumber < selection.endLineNumber || selection.startLineNumber === selection.endLineNumber && selection.startColumn <= selection.endColumn ? selection.endColumn : selection.startColumn;
		if (end > start && exclusiveEndColumn === 1) end -= 1;
		if (clickedLine < start || clickedLine > end || end < start) return null;
		return start === end ? start : [start, end];
	}
	editorRangeSelection(selection) {
		if (!selection || selection.isEmpty() || selection.startLineNumber === selection.endLineNumber) return null;
		return selection;
	}
	applyInitialHunkFocus(filePath) {
		const hunks = this.fileHunks[filePath];
		if (hunks && hunks.length > 0) {
			const currentIdx = this.currentHunkIndex[filePath] ?? 0;
			setTimeout(() => {
				this.jumpToHunk(currentIdx);
				const hr = hunks[currentIdx];
				const side = hr.side === "old" ? "old" : "new";
				this.setFocusedLine(side, hr.start, false);
			}, 100);
		}
	}
};

//#endregion
//#region web/src/platform.ts
const IS_MAC = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const MOD_KEY_LABEL = IS_MAC ? "⌘" : "Ctrl";

//#endregion
//#region web/src/shortcuts.ts
const KEYBOARD_SHORTCUTS = [
	{
		keys: ["Mod+ArrowDown", "Mod+J"],
		action: "nextFile",
		description: "Next file"
	},
	{
		keys: ["Mod+ArrowUp", "Mod+K"],
		action: "previousFile",
		description: "Previous file"
	},
	{
		keys: ["Shift+ArrowDown", "Shift+J"],
		action: "nextHunk",
		description: "Next hunk"
	},
	{
		keys: ["Shift+ArrowUp", "Shift+K"],
		action: "previousHunk",
		description: "Previous hunk"
	},
	{
		keys: ["ArrowDown", "j"],
		action: "lineDown",
		description: "Next changed line"
	},
	{
		keys: ["ArrowUp", "k"],
		action: "lineUp",
		description: "Previous changed line"
	},
	{
		keys: ["s"],
		action: "toggleView",
		description: "Toggle inline/side-by-side"
	},
	{
		keys: ["Enter"],
		action: "openComment",
		description: "Comment on focused line"
	},
	{
		keys: ["Escape"],
		action: "clearFocus",
		description: "Clear focus"
	},
	{
		keys: ["Mod+Shift+Enter"],
		action: "submitReview",
		description: "Submit review"
	},
	{
		keys: ["?"],
		action: "showHelp",
		description: "Show keyboard shortcuts"
	},
	{
		keys: [
			"Alt+ArrowDown",
			"Mod+Shift+ArrowRight",
			"Mod+Shift+L"
		],
		action: "nextCommit",
		description: "Next commit (series mode)"
	},
	{
		keys: [
			"Alt+ArrowUp",
			"Mod+Shift+ArrowLeft",
			"Mod+Shift+H"
		],
		action: "previousCommit",
		description: "Previous commit (series mode)"
	}
];

//#endregion
//#region web/src/navigation-methods.ts
var NavigationMethods = class {
	getCurrentFile() {
		return this.files[this.currentFileIndex];
	}
	setupKeyboardShortcuts() {
		document.addEventListener("keydown", (e) => {
			if (document.querySelector(".submit-modal-overlay")) return;
			const activeElement = document.activeElement || document.body;
			if (activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT" || activeElement.isContentEditable)) return;
			if (this.currentWidget !== null) return;
			const action = this.matchKeyboardShortcut(e);
			if (!action) return;
			e.preventDefault();
			switch (action) {
				case "nextFile":
					this.nextFile();
					break;
				case "previousFile":
					this.previousFile();
					break;
				case "toggleView":
					this.toggleView();
					break;
				case "lineDown":
					this.moveLine(1);
					break;
				case "lineUp":
					this.moveLine(-1);
					break;
				case "nextHunk":
					this.nextHunk();
					break;
				case "previousHunk":
					this.previousHunk();
					break;
				case "openComment":
					this.openCommentOnCurrentFocus();
					break;
				case "submitReview":
					this.showSubmitConfirmation();
					break;
				case "showHelp":
					this.showKeyboardHelp();
					break;
				case "clearFocus":
					this.clearFocusedHunk();
					break;
				case "nextCommit":
					this.nextCommit();
					break;
				case "previousCommit":
					this.previousCommit();
					break;
			}
		});
	}
	toggleView() {
		this.isInline = !this.isInline;
		this.loadFile(this.currentFileIndex);
		const file = this.getCurrentFile();
		if (this.isAddedFile(file)) {
			showNavIndicator("Inline (new file)");
			return;
		}
		showNavIndicator(this.isInline ? "Inline" : "Side-by-Side");
	}
	matchKeyboardShortcut(e) {
		const modKey = IS_MAC ? e.metaKey : e.ctrlKey;
		for (const shortcut of KEYBOARD_SHORTCUTS) for (const keyCombo of shortcut.keys) if (this.matchesKeyCombo(e, keyCombo, modKey)) return shortcut.action;
		return null;
	}
	matchesKeyCombo(e, combo, modKey) {
		const parts = combo.split("+");
		let needsMod = false;
		let needsShift = false;
		let needsAlt = false;
		let key = "";
		for (const part of parts) if (part === "Mod") needsMod = true;
		else if (part === "Shift") needsShift = true;
		else if (part === "Alt") needsAlt = true;
		else key = part;
		if (needsMod !== modKey) return false;
		if (needsAlt !== e.altKey) return false;
		if (![
			"?",
			"!",
			"@",
			"#",
			"$",
			"%",
			"^",
			"&",
			"*",
			"(",
			")"
		].includes(key) && needsShift !== e.shiftKey) return false;
		const isLetter = key.length === 1 && /[a-z]/i.test(key);
		if (key === "?") return e.shiftKey && e.code === "Slash";
		if (isLetter) {
			const code = "Key" + key.toUpperCase();
			return e.code === code;
		}
		return e.key === key;
	}
	nextFile() {
		if (this.currentFileIndex < this.files.length - 1) {
			this.loadFile(this.currentFileIndex + 1);
			showNavIndicator(`File ${this.currentFileIndex + 2}/${this.files.length}`);
		}
	}
	previousFile() {
		if (this.currentFileIndex > 0) {
			this.loadFile(this.currentFileIndex - 1);
			showNavIndicator(`File ${this.currentFileIndex}/${this.files.length}`);
		}
	}
	nextHunk() {
		const file = this.getCurrentFile();
		const hunks = this.fileHunks[file.path];
		if (!hunks || hunks.length === 0) {
			this.nextFile();
			return;
		}
		const currentIdx = this.currentHunkIndex[file.path] ?? 0;
		if (currentIdx >= hunks.length - 1) this.nextFile();
		else {
			const nextIdx = currentIdx + 1;
			this.currentHunkIndex[file.path] = nextIdx;
			this.jumpToHunk(nextIdx);
		}
	}
	previousHunk() {
		const file = this.getCurrentFile();
		const hunks = this.fileHunks[file.path];
		if (!hunks || hunks.length === 0) {
			this.previousFile();
			return;
		}
		const currentIdx = this.currentHunkIndex[file.path] ?? 0;
		if (currentIdx <= 0) this.previousFile();
		else {
			const prevIdx = currentIdx - 1;
			this.currentHunkIndex[file.path] = prevIdx;
			this.jumpToHunk(prevIdx);
		}
	}
	jumpToHunk(hunkIndex) {
		if (!this.editor) return;
		const file = this.getCurrentFile();
		const hunks = this.fileHunks[file.path];
		if (!hunks || hunkIndex >= hunks.length) return;
		const hunkRange = hunks[hunkIndex];
		const reduceMotion = prefersReducedMotion();
		const smooth = monaco.editor.ScrollType.Smooth;
		if (hunkRange.side === "old") {
			this.editor.getOriginalEditor().revealLineInCenter(hunkRange.start, reduceMotion ? monaco.editor.ScrollType.Immediate : smooth);
			this.highlightFocusedHunk(hunkRange.start, hunkRange.end, "old");
			this.setFocusedLine("old", hunkRange.start, false);
			const idx = (this.currentHunkIndex[file.path] ?? 0) + 1;
			const total = hunks.length;
			showNavIndicator(`Hunk ${idx}/${total} • old`);
		} else {
			this.editor.getModifiedEditor().revealLineInCenter(hunkRange.start, reduceMotion ? monaco.editor.ScrollType.Immediate : smooth);
			this.highlightFocusedHunk(hunkRange.start, hunkRange.end, "new");
			this.setFocusedLine("new", hunkRange.start, false);
			const idx = (this.currentHunkIndex[file.path] ?? 0) + 1;
			const total = hunks.length;
			showNavIndicator(`Hunk ${idx}/${total} • new`);
		}
	}
	highlightFocusedHunk(startLine, endLine, side = "new") {
		if (!this.editor) return;
		const modifiedEditor = this.editor.getModifiedEditor();
		const originalEditor = this.editor.getOriginalEditor();
		const decorations = [];
		for (let line = startLine; line <= endLine; line++) decorations.push({
			range: new monaco.Range(line, 1, line, 1),
			options: {
				isWholeLine: true,
				className: "focused-hunk-line"
			}
		});
		this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(this.focusedHunkDecorationsNew, []);
		this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(this.focusedHunkDecorationsOld, []);
		if (side === "old") this.focusedHunkDecorationsOld = originalEditor.deltaDecorations([], decorations);
		else this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations([], decorations);
	}
	setFocusedLine(side, monacoLine, reveal = true) {
		if (!this.editor) return;
		this.currentFocusedLine = {
			side,
			line: monacoLine
		};
		const modifiedEditor = this.editor.getModifiedEditor();
		const originalEditor = this.editor.getOriginalEditor();
		const scrollType = prefersReducedMotion() ? monaco.editor.ScrollType.Immediate : monaco.editor.ScrollType.Smooth;
		this.focusedLineDecorationsNew = modifiedEditor.deltaDecorations(this.focusedLineDecorationsNew, []);
		this.focusedLineDecorationsOld = originalEditor.deltaDecorations(this.focusedLineDecorationsOld, []);
		const dec = [{
			range: new monaco.Range(monacoLine, 1, monacoLine, 1),
			options: {
				isWholeLine: true,
				className: "focused-line"
			}
		}];
		if (side === "old") {
			this.focusedLineDecorationsOld = originalEditor.deltaDecorations([], dec);
			if (reveal) originalEditor.revealLineInCenterIfOutsideViewport(monacoLine, scrollType);
		} else {
			this.focusedLineDecorationsNew = modifiedEditor.deltaDecorations([], dec);
			if (reveal) modifiedEditor.revealLineInCenterIfOutsideViewport(monacoLine, scrollType);
		}
		showNavIndicator(`Line ${monacoLine} • ${side === "old" ? "old" : "new"}`);
	}
	moveLine(delta) {
		if (!this.editor) return;
		const file = this.getCurrentFile();
		const hunks = this.fileHunks[file.path];
		if (!hunks || hunks.length === 0) return;
		let idx = this.currentHunkIndex[file.path] ?? 0;
		const hr = hunks[idx];
		if (!this.currentFocusedLine) {
			const side = hr.side === "old" ? "old" : "new";
			this.setFocusedLine(side, hr.start, true);
			return;
		}
		let { side, line } = this.currentFocusedLine;
		if (side !== hr.side || line < hr.start || line > hr.end) {
			side = hr.side === "old" ? "old" : "new";
			line = hr.start;
		}
		let nextLine = line + delta;
		if (nextLine >= hr.start && nextLine <= hr.end) {
			this.setFocusedLine(side, nextLine, true);
			return;
		}
		if (delta > 0 && idx < hunks.length - 1) {
			idx += 1;
			this.currentHunkIndex[file.path] = idx;
			const nhr = hunks[idx];
			const ns = nhr.side === "old" ? "old" : "new";
			this.jumpToHunk(idx);
			this.setFocusedLine(ns, nhr.start, true);
		} else if (delta < 0 && idx > 0) {
			idx -= 1;
			this.currentHunkIndex[file.path] = idx;
			const phr = hunks[idx];
			const ps = phr.side === "old" ? "old" : "new";
			this.jumpToHunk(idx);
			this.setFocusedLine(ps, phr.end, true);
		}
	}
	clearFocusedHunk() {
		if (!this.editor) return;
		const modifiedEditor = this.editor.getModifiedEditor();
		const originalEditor = this.editor.getOriginalEditor();
		this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(this.focusedHunkDecorationsNew, []);
		this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(this.focusedHunkDecorationsOld, []);
	}
	openCommentOnCurrentFocus() {
		if (!this.editor) return;
		const file = this.getCurrentFile();
		const hunks = this.fileHunks[file.path];
		if (!hunks || hunks.length === 0) return;
		if (this.currentFocusedLine) {
			const { side, line } = this.currentFocusedLine;
			this.showCommentDialog(file.path, line, line, side);
			return;
		}
		const hunkRange = hunks[this.currentHunkIndex[file.path] ?? 0];
		const side = hunkRange.side === "old" ? "old" : "new";
		this.showCommentDialog(file.path, hunkRange.start, hunkRange.start, side);
	}
};

//#endregion
//#region web/src/modal.ts
function openModal({ title, titleId, modalClass = "", footerContent = [], onKeydown }) {
	const overlay = el("div", { className: "submit-modal-overlay" });
	const modal = el("div", { className: `submit-modal${modalClass ? " " + modalClass : ""}` });
	const header = el("div", { className: "submit-modal-header" }, [el("h2", titleId ? {
		text: title,
		attrs: { id: titleId }
	} : { text: title }), el("button", {
		className: "submit-modal-close",
		text: "×",
		attrs: { "aria-label": "Close" }
	})]);
	const body = el("div", { className: "submit-modal-body" });
	const footer = el("div", { className: "submit-modal-footer" });
	(Array.isArray(footerContent) ? footerContent : [footerContent]).forEach((node) => {
		if (node) footer.appendChild(node);
	});
	modal.appendChild(header);
	modal.appendChild(body);
	modal.appendChild(footer);
	overlay.appendChild(modal);
	document.body.appendChild(overlay);
	const previouslyFocused = document.activeElement;
	modal.setAttribute("role", "dialog");
	modal.setAttribute("aria-modal", "true");
	if (titleId) modal.setAttribute("aria-labelledby", titleId);
	const focusable = () => Array.from(modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])")).filter((focusEl) => !focusEl.hasAttribute("disabled"));
	const onTrap = (e) => {
		if (e.key === "Tab") {
			const nodes = focusable();
			if (nodes.length === 0) return;
			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	};
	document.addEventListener("keydown", onTrap);
	let handleEscape;
	const close = () => {
		overlay.remove();
		document.removeEventListener("keydown", onTrap);
		if (handleEscape) document.removeEventListener("keydown", handleEscape);
		if (onKeydown) document.removeEventListener("keydown", onKeydown);
		if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
	};
	handleEscape = (e) => {
		if (e.key === "Escape") close();
	};
	document.addEventListener("keydown", handleEscape);
	if (onKeydown) document.addEventListener("keydown", onKeydown);
	const closeButton = header.querySelector(".submit-modal-close");
	if (closeButton) closeButton.onclick = close;
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) close();
	});
	setTimeout(() => {
		const f = focusable()[0];
		if (f) f.focus();
	}, 0);
	return {
		overlay,
		modal,
		body,
		footer,
		close
	};
}

//#endregion
//#region web/src/commit-methods.ts
var CommitMethods = class {
	showCommitSummaryDialog() {
		const modKey = MOD_KEY_LABEL;
		const { modal, body, close } = openModal({
			title: "Add Review Summary",
			titleId: "commit-summary-dialog",
			footerContent: [el("button", {
				className: "btn-secondary cancel-btn",
				text: "Cancel"
			}), el("button", {
				className: "btn-primary save-btn",
				text: "Add Summary Comment"
			})],
			onKeydown: (e) => {
				if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					save();
				}
			}
		});
		modal.style.maxWidth = "600px";
		body.style.padding = "20px";
		const explainer = el("div", {
			className: "commit-summary-help",
			text: "Use this for high-level feedback that is not tied to a specific file or line."
		});
		const ta = el("textarea", {
			className: "comment-textarea",
			attrs: {
				placeholder: `Add summary comment… (${modKey}+Enter to save)`,
				autofocus: true
			}
		});
		body.append(explainer, ta);
		const autoResize = () => {
			ta.style.height = "auto";
			ta.style.height = `${ta.scrollHeight}px`;
		};
		ta.addEventListener("input", autoResize);
		ta.value = this.overallReviewComment;
		const save = () => {
			this.overallReviewComment = ta.value.trim();
			this.renderFileList();
			if (this.currentFileIsCommit) this.loadCommitView();
			close();
		};
		modal.querySelector(".cancel-btn").onclick = close;
		modal.querySelector(".save-btn").onclick = save;
		setTimeout(() => {
			ta.focus();
			autoResize();
		}, 0);
	}
	showCommitMessagePopover(anchorEl, message, rev) {
		if (this._commitPopoverEl) {
			this._commitPopoverEl.remove();
			this._commitPopoverEl = null;
			return;
		}
		const pop = el("div", { className: "commit-popover" });
		const first = message.split("\n")[0] || "(no message)";
		const title = el("div", {
			className: "commit-popover-title",
			text: rev ? `${rev}: ${first}` : first
		});
		const body = el("div", { className: "commit-popover-body" });
		appendLinkifiedText(body, message);
		pop.appendChild(title);
		pop.appendChild(body);
		const form = el("div");
		form.style.marginTop = "10px";
		const ta = el("textarea");
		ta.rows = 3;
		ta.style.width = "100%";
		ta.placeholder = "Comment on this commit…";
		const controls = el("div");
		controls.style.display = "flex";
		controls.style.gap = "8px";
		controls.style.marginTop = "6px";
		const addBtn = el("button", {
			className: "btn-secondary",
			text: "Add Comment"
		});
		const cancelBtn = el("button", {
			className: "btn-secondary",
			text: "Cancel"
		});
		controls.appendChild(addBtn);
		controls.appendChild(cancelBtn);
		form.appendChild(ta);
		form.appendChild(controls);
		pop.appendChild(form);
		document.body.appendChild(pop);
		const r = anchorEl.getBoundingClientRect();
		const pad = 6;
		let top = r.bottom + pad;
		let left = r.left;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const rect = pop.getBoundingClientRect();
		if (left + rect.width + pad > vw) left = Math.max(pad, vw - rect.width - pad);
		if (top + rect.height + pad > vh) top = Math.max(pad, r.top - rect.height - pad);
		pop.style.left = `${Math.max(pad, left)}px`;
		pop.style.top = `${Math.max(pad, top)}px`;
		const onDocClick = (e) => {
			const target = e.target;
			if (!target || !pop.contains(target) && target !== anchorEl) cleanup();
		};
		const onEsc = (e) => {
			if (e.key === "Escape") cleanup();
		};
		const cleanup = () => {
			if (this._commitPopoverEl) {
				this._commitPopoverEl.remove();
				this._commitPopoverEl = null;
			}
			document.removeEventListener("click", onDocClick, true);
			document.removeEventListener("keydown", onEsc, true);
		};
		this._commitPopoverEl = pop;
		setTimeout(() => {
			document.addEventListener("click", onDocClick, true);
			document.addEventListener("keydown", onEsc, true);
		}, 0);
		cancelBtn.onclick = (e) => {
			e.preventDefault();
			cleanup();
		};
		addBtn.onclick = (e) => {
			e.preventDefault();
			const body = ta.value.trim();
			if (!body) {
				ta.focus();
				return;
			}
			const comment = {
				file: "(commit)",
				line: 1,
				side: "new",
				body
			};
			this.commentManager.addComment(comment);
			showNavIndicator("Commit comment added");
			cleanup();
		};
	}
	loadCommitView() {
		this.currentFileIsCommit = true;
		const container = document.getElementById("editor-container");
		if (!container) return;
		container.style.display = "none";
		if (!this._commitViewEl) {
			const host = document.querySelector(".content");
			if (!host) return;
			const viewEl = el("div", { className: "commit-view" });
			viewEl.style.padding = "16px";
			viewEl.style.overflow = "auto";
			viewEl.style.height = "calc(100vh - 48px)";
			host.appendChild(viewEl);
			this._commitViewEl = viewEl;
		}
		const viewEl = this._commitViewEl;
		clearEl(viewEl);
		viewEl.style.display = "";
		const rev = this.diff?.commit_hash ?? "";
		if (rev) {
			const meta = el("div");
			meta.style.color = "var(--text-secondary)";
			meta.style.fontSize = "11px";
			meta.style.marginBottom = "12px";
			meta.textContent = rev;
			viewEl.appendChild(meta);
		}
		const summaryBox = el("div", { className: "commit-summary-box" }, [el("div", {
			className: "commit-summary-copy",
			text: "High-level review comments live here and are submitted as commit-level feedback."
		}), el("div", {
			className: "commit-summary-hint",
			text: "This is the global review note. It also appears in the final submit check."
		})]);
		const summaryEditor = el("textarea", {
			className: "commit-summary-input",
			attrs: { placeholder: "Add overall feedback for the agent…" }
		});
		summaryEditor.value = this.overallReviewComment;
		const autoResizeSummary = () => {
			summaryEditor.style.height = "auto";
			summaryEditor.style.height = `${Math.max(summaryEditor.scrollHeight, 120)}px`;
		};
		summaryEditor.addEventListener("input", () => {
			this.overallReviewComment = summaryEditor.value;
			this.renderFileList();
			autoResizeSummary();
		});
		summaryBox.appendChild(summaryEditor);
		viewEl.appendChild(summaryBox);
		setTimeout(autoResizeSummary, 0);
		const msgLines = (this.diff?.commit_message ?? "(no message)").split("\n");
		if (this.diff?.commit_message) {
			const msgContainer = el("div");
			msgContainer.style.border = "1px solid var(--border-color)";
			msgContainer.style.borderRadius = "4px";
			msgContainer.style.background = "var(--bg-elevated)";
			msgContainer.style.fontFamily = "var(--font-mono)";
			msgContainer.style.fontSize = "13px";
			msgLines.forEach((lineText, lineIndex) => {
				const lineNum = lineIndex + 1;
				const lineDiv = el("div");
				lineDiv.style.display = "flex";
				lineDiv.style.lineHeight = "1.6";
				lineDiv.style.cursor = "pointer";
				lineDiv.style.padding = "2px 0";
				lineDiv.onmouseover = () => {
					lineDiv.style.background = "var(--bg-secondary)";
				};
				lineDiv.onmouseout = () => {
					lineDiv.style.background = "";
				};
				const lineNumSpan = el("span");
				lineNumSpan.style.display = "inline-block";
				lineNumSpan.style.width = "40px";
				lineNumSpan.style.textAlign = "right";
				lineNumSpan.style.paddingRight = "12px";
				lineNumSpan.style.color = "var(--text-secondary)";
				lineNumSpan.style.userSelect = "none";
				lineNumSpan.style.flexShrink = "0";
				lineNumSpan.textContent = String(lineNum);
				const lineContent = el("span");
				lineContent.style.paddingRight = "12px";
				lineContent.style.whiteSpace = "pre-wrap";
				lineContent.style.wordBreak = "break-word";
				appendLinkifiedText(lineContent, lineText || " ");
				lineContent.addEventListener("click", (event) => {
					if (event.target?.closest("a")) event.stopPropagation();
				});
				lineDiv.appendChild(lineNumSpan);
				lineDiv.appendChild(lineContent);
				lineDiv.onclick = () => {
					this.showCommitLineCommentDialog(lineNum);
				};
				msgContainer.appendChild(lineDiv);
			});
			viewEl.appendChild(msgContainer);
		}
		const reviewNotes = this.reviewNoteManager.getNotesForFile("(commit)");
		if (reviewNotes.length > 0) {
			const reviewNotesHeader = el("h3", { text: "Review Notes" });
			reviewNotesHeader.style.marginTop = "24px";
			reviewNotesHeader.style.fontSize = "14px";
			viewEl.appendChild(reviewNotesHeader);
			const noteList = el("div");
			reviewNotes.forEach((note) => {
				const row = this.buildReviewNoteNode(note);
				row.style.height = "auto";
				row.style.margin = "0 0 8px 0";
				noteList.appendChild(row);
			});
			viewEl.appendChild(noteList);
		}
		const commentsHeader = el("h3", { text: "Comments" });
		commentsHeader.style.marginTop = reviewNotes.length > 0 ? "16px" : "24px";
		commentsHeader.style.fontSize = "14px";
		viewEl.appendChild(commentsHeader);
		const list = el("div");
		const comments = this.commentManager.getCommentsForFile("(commit)");
		if (comments.length === 0) {
			const empty = el("div");
			empty.style.color = "var(--text-secondary)";
			empty.style.fontSize = "12px";
			empty.style.padding = "8px 0";
			empty.textContent = this.diff?.commit_message ? "No comments yet. Add a summary comment above or click a commit-message line." : "No summary comments yet.";
			list.appendChild(empty);
		} else comments.forEach((c) => {
			const row = el("div");
			row.style.display = "flex";
			row.style.flexDirection = "column";
			row.style.gap = "8px";
			row.style.padding = "12px";
			row.style.marginBottom = "8px";
			row.style.border = "1px solid var(--border-color)";
			row.style.borderRadius = "4px";
			row.style.background = "var(--bg-elevated)";
			const lineLabel = el("div");
			lineLabel.style.fontSize = "11px";
			lineLabel.style.color = "var(--text-secondary)";
			lineLabel.textContent = !this.diff?.commit_message && commentStartLine(c) === 1 ? "Summary" : `Line ${commentLineLabel(c)}`;
			const bodyRow = el("div");
			bodyRow.style.display = "flex";
			bodyRow.style.justifyContent = "space-between";
			bodyRow.style.alignItems = "flex-start";
			bodyRow.style.gap = "12px";
			const body = el("div");
			body.style.whiteSpace = "pre-wrap";
			body.style.fontFamily = "var(--font-sans)";
			body.style.fontSize = "13px";
			body.style.flex = "1";
			body.textContent = c.body;
			const del = el("button", {
				className: "btn-danger",
				text: "Delete"
			});
			del.style.fontSize = "11px";
			del.style.padding = "4px 8px";
			del.onclick = () => {
				const absIndex = this.commentManager.findComment("(commit)", commentStartLine(c), c.side);
				if (absIndex >= 0) {
					this.commentManager.removeComment(absIndex);
					this.loadCommitView();
				}
			};
			bodyRow.appendChild(body);
			bodyRow.appendChild(del);
			row.appendChild(lineLabel);
			row.appendChild(bodyRow);
			list.appendChild(row);
		});
		viewEl.appendChild(list);
		this.renderFileList();
	}
	showCommitLineCommentDialog(lineNum) {
		const modKey = MOD_KEY_LABEL;
		const footerContent = [el("button", {
			className: "btn-secondary cancel-btn",
			text: "Cancel"
		}), el("button", {
			className: "btn-primary save-btn",
			text: "Add Comment"
		})];
		const { overlay, modal, body, footer, close } = openModal({
			title: `Comment on Commit Message Line ${lineNum}`,
			titleId: "commit-comment-dialog",
			footerContent,
			onKeydown: (e) => {
				if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					save();
				}
			}
		});
		modal.style.maxWidth = "600px";
		body.style.padding = "20px";
		const ta = el("textarea", { className: "comment-textarea" });
		ta.rows = 4;
		ta.placeholder = "Add your comment...";
		ta.autofocus = true;
		body.appendChild(ta);
		const hint = el("div");
		hint.style.fontSize = "11px";
		hint.style.color = "var(--text-secondary)";
		hint.style.marginTop = "8px";
		hint.textContent = `${modKey}+Enter to save, Escape to cancel`;
		body.appendChild(hint);
		const save = () => {
			const text = ta.value.trim();
			if (!text) {
				ta.focus();
				return;
			}
			const comment = {
				file: "(commit)",
				line: lineNum,
				side: "new",
				body: text
			};
			this.commentManager.addComment(comment);
			close();
			this.loadCommitView();
		};
		const cancelBtn = footer.querySelector(".cancel-btn");
		const saveBtn = footer.querySelector(".save-btn");
		if (cancelBtn) cancelBtn.onclick = close;
		if (saveBtn) saveBtn.onclick = save;
		setTimeout(() => ta.focus(), 100);
	}
};

//#endregion
//#region web/src/comments-ui-methods.ts
var CommentsUIMethods = class {
	updateDecorations() {
		if (!this.editor) return;
		const file = this.files[this.currentFileIndex];
		if (!file) return;
		const comments = this.commentManager.getCommentsForFile(file.path);
		const modifiedEditor = this.editor.getModifiedEditor();
		const originalEditor = this.editor.getOriginalEditor();
		const modifiedDecorations = comments.filter((c) => c.side === "new").map((comment) => ({
			range: new monaco.Range(commentStartLine(comment), 1, commentEndLine(comment), 1),
			options: {
				isWholeLine: true,
				glyphMarginClassName: "codicon codicon-comment",
				glyphMarginHoverMessage: { value: comment.body }
			}
		}));
		const originalDecorations = comments.filter((c) => c.side === "old").map((comment) => ({
			range: new monaco.Range(commentStartLine(comment), 1, commentEndLine(comment), 1),
			options: {
				isWholeLine: true,
				glyphMarginClassName: "codicon codicon-comment",
				glyphMarginHoverMessage: { value: comment.body }
			}
		}));
		this.modifiedDecorations = modifiedEditor.deltaDecorations(this.modifiedDecorations, modifiedDecorations);
		this.originalDecorations = originalEditor.deltaDecorations(this.originalDecorations, originalDecorations);
	}
	showCommentDialog(file, commentLine, monacoLineNumber, side) {
		if (!this.editor) return;
		const targetEditor = side === "new" ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
		if (!Array.isArray(commentLine)) {
			const resolvedCommentLine = this.commentLineFromEditorSelection(targetEditor, monacoLineNumber, side === "new" ? this.lastModifiedRangeSelection : this.lastOriginalRangeSelection);
			if (Array.isArray(resolvedCommentLine)) commentLine = resolvedCommentLine;
		}
		if (this.currentWidget) {
			if (this.currentWidgetEditor) this.currentWidgetEditor.removeContentWidget(this.currentWidget);
			this.currentWidget = null;
			this.currentWidgetEditor = null;
		}
		const existingIndex = this.commentManager.findComment(file, monacoLineNumber, side);
		const existingComment = existingIndex >= 0 ? this.commentManager.comments[existingIndex] : null;
		const editorWidth = targetEditor.getLayoutInfo().contentWidth;
		const domNode = el("div", { className: "inline-comment-box" });
		domNode.style.width = `${editorWidth}px`;
		const modKey = MOD_KEY_LABEL;
		const title = el("h3", { text: `Line ${existingComment ? commentLineLabel(existingComment) : this.commentLineLabel(commentLine)}${existingComment ? " - Edit" : ""}` });
		const textarea = el("textarea", {
			className: "comment-textarea",
			attrs: {
				placeholder: "Add your comment...",
				autofocus: true
			}
		});
		const actions = el("div", { className: "comment-actions" }, [
			el("span", {
				className: "shortcut-hint",
				text: `${modKey}+Enter to save`
			}),
			existingComment ? el("button", {
				className: "btn-danger delete-btn",
				text: "Delete"
			}) : null,
			el("button", {
				className: "btn-secondary cancel-btn",
				text: "Cancel"
			}),
			el("button", {
				className: "btn-primary save-btn",
				text: "Save"
			})
		]);
		domNode.appendChild(title);
		domNode.appendChild(textarea);
		domNode.appendChild(actions);
		const widget = {
			getId: () => "inline.comment.widget",
			allowEditorOverflow: true,
			suppressMouseDown: false,
			getDomNode: () => domNode,
			getPosition: () => ({
				position: {
					lineNumber: monacoLineNumber,
					column: 1
				},
				preference: [monaco.editor.ContentWidgetPositionPreference.BELOW, monaco.editor.ContentWidgetPositionPreference.ABOVE]
			})
		};
		targetEditor.addContentWidget(widget);
		targetEditor.layoutContentWidget(widget);
		this.currentWidget = widget;
		this.currentWidgetEditor = targetEditor;
		const saveBtn = domNode.querySelector(".save-btn");
		const cancelBtn = domNode.querySelector(".cancel-btn");
		const autoResize = () => {
			textarea.style.height = "auto";
			textarea.style.height = `${textarea.scrollHeight}px`;
		};
		textarea.addEventListener("input", autoResize);
		if (existingComment) textarea.value = existingComment.body;
		const handleKeydown = (e) => {
			if (e.key === "Escape") cleanup();
			else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				saveComment();
			}
		};
		textarea.addEventListener("keydown", handleKeydown);
		const cleanup = () => {
			targetEditor.removeContentWidget(widget);
			this.currentWidget = null;
			textarea.removeEventListener("keydown", handleKeydown);
			textarea.removeEventListener("input", autoResize);
		};
		const saveComment = () => {
			if (!textarea.value.trim()) {
				textarea.focus();
				return;
			}
			if (existingIndex >= 0) this.commentManager.updateComment(existingIndex, textarea.value);
			else {
				const comment = {
					file,
					line: commentLine,
					side,
					body: textarea.value
				};
				this.commentManager.addComment(comment);
			}
			this.updateDecorations();
			cleanup();
		};
		if (saveBtn) saveBtn.onclick = saveComment;
		if (cancelBtn) cancelBtn.onclick = cleanup;
		const deleteBtnEl = domNode.querySelector(".delete-btn");
		if (deleteBtnEl) deleteBtnEl.onclick = () => {
			this.commentManager.removeComment(existingIndex);
			this.updateDecorations();
			cleanup();
		};
		setTimeout(() => {
			textarea.focus();
			autoResize();
			targetEditor.layoutContentWidget(widget);
		}, 100);
	}
	commentLineLabel(line) {
		if (Array.isArray(line)) return line[0] === line[1] ? String(line[0]) : `${line[0]}-${line[1]}`;
		return String(line);
	}
	updateUI() {
		const count = this.commentManager.getComments().length;
		const countEl = document.getElementById("comment-count");
		if (countEl) countEl.textContent = count.toString();
		this.renderFileList();
	}
};

//#endregion
//#region web/src/review-note-methods.ts
var ReviewNoteMethods = class {
	renderReviewNotes() {
		this.renderMonacoReviewNotes();
		this.renderStackedReviewNotes();
	}
	renderMonacoReviewNotes() {
		if (!this.editor) return;
		const file = this.files[this.currentFileIndex];
		if (!file) return;
		const notes = this.reviewNoteManager.getNotesForFile(file.path);
		const modifiedEditor = this.editor.getModifiedEditor();
		const originalEditor = this.editor.getOriginalEditor();
		const modifiedNotes = notes.filter((note) => note.side === "new");
		const originalNotes = notes.filter((note) => note.side === "old");
		this.modifiedReviewNoteZoneIds = this.replaceReviewNoteZones(modifiedEditor, this.modifiedReviewNoteZoneIds, modifiedNotes);
		this.originalReviewNoteZoneIds = this.replaceReviewNoteZones(originalEditor, this.originalReviewNoteZoneIds, originalNotes);
		this.modifiedReviewNoteDecorations = this.replaceReviewNoteDecorations(modifiedEditor, this.modifiedReviewNoteDecorations, modifiedNotes);
		this.originalReviewNoteDecorations = this.replaceReviewNoteDecorations(originalEditor, this.originalReviewNoteDecorations, originalNotes);
	}
	replaceReviewNoteZones(targetEditor, existingIds, notes) {
		const model = targetEditor.getModel();
		if (!model) return [];
		const maxLine = model.getLineCount();
		const newIds = [];
		targetEditor.changeViewZones((accessor) => {
			existingIds.forEach((id) => accessor.removeZone(id));
			notes.forEach((note) => {
				const line = Math.max(1, Math.min(commentEndLine(note), maxLine));
				const node = el("div", { className: `review-note-zone review-note-zone-${note.side}` });
				node.appendChild(this.buildReviewNoteNode(note));
				const id = accessor.addZone({
					afterLineNumber: line,
					domNode: node,
					heightInPx: this.reviewNoteHeightPx(note)
				});
				newIds.push(id);
			});
		});
		return newIds;
	}
	replaceReviewNoteDecorations(targetEditor, existingIds, notes) {
		const model = targetEditor.getModel();
		if (!model) return [];
		const maxLine = model.getLineCount();
		const decorations = notes.map((note) => {
			const start = Math.max(1, Math.min(commentStartLine(note), maxLine));
			const end = Math.max(start, Math.min(commentEndLine(note), maxLine));
			return {
				range: new monaco.Range(start, 1, end, 1),
				options: {
					isWholeLine: true,
					glyphMarginClassName: "codicon codicon-comment-discussion review-note-glyph",
					glyphMarginHoverMessage: { value: note.body },
					linesDecorationsClassName: "review-note-line-decoration"
				}
			};
		});
		return targetEditor.deltaDecorations(existingIds, decorations);
	}
	renderStackedReviewNotes() {
		const container = document.getElementById("stacked-container");
		if (!container) return;
		if (this.isStacked && container.querySelector(".stacked-code-view")) {
			this.renderStackedComments();
			return;
		}
		container.querySelectorAll(".stacked-review-note-row").forEach((row) => row.remove());
		this.files.forEach((file) => {
			this.reviewNoteManager.getNotesForFile(file.path).forEach((note) => this.insertStackedReviewNote(container, note));
		});
	}
	insertStackedReviewNote(container, note) {
		const body = container.querySelector(`table[data-path="${CSS.escape(note.file)}"]`)?.querySelector("tbody");
		if (!body) return;
		const targetLine = commentEndLine(note);
		let targetRow = null;
		for (const row of Array.from(body.rows)) {
			const cells = row.querySelectorAll(".stacked-num");
			const num = note.side === "new" ? cells[1]?.textContent : cells[0]?.textContent;
			if (num && Number.parseInt(num, 10) === targetLine) {
				targetRow = row;
				break;
			}
		}
		if (!targetRow) return;
		const tr = document.createElement("tr");
		tr.className = `stacked-review-note-row stacked-review-note-${note.side}`;
		const oldCell = document.createElement("td");
		oldCell.colSpan = 2;
		const newCell = document.createElement("td");
		newCell.colSpan = 2;
		const noteCell = note.side === "new" ? newCell : oldCell;
		const spacerCell = note.side === "new" ? oldCell : newCell;
		noteCell.className = "stacked-review-note-cell";
		spacerCell.className = "stacked-review-note-spacer";
		noteCell.appendChild(this.buildReviewNoteNode(note));
		tr.append(oldCell, newCell);
		const next = targetRow.nextSibling;
		body.insertBefore(tr, next ?? null);
	}
	buildReviewNoteNode(note) {
		const disposition = note.disposition ?? "open";
		const box = el("div", { className: `review-note review-note-${note.side} review-note-${disposition}` });
		for (const eventName of [
			"pointerdown",
			"mousedown",
			"click",
			"dblclick"
		]) box.addEventListener(eventName, (event) => event.stopPropagation());
		const meta = el("div", { className: "review-note-meta" });
		meta.textContent = [
			note.author,
			note.date,
			`${note.side} line ${commentLineLabel(note)}`
		].filter(Boolean).join(" - ");
		if (note.source_url) {
			const link = el("a", {
				className: "review-note-source",
				text: "Open",
				attrs: {
					href: note.source_url,
					target: "_blank",
					rel: "noopener noreferrer"
				}
			});
			meta.appendChild(link);
		}
		const body = el("div", { className: "review-note-body" });
		appendLinkifiedText(body, note.body);
		box.append(meta, body, this.buildReviewNoteActions(note));
		return box;
	}
	buildReviewNoteActions(note) {
		const actions = el("div", { className: "review-note-actions" });
		const disposition = note.disposition ?? "open";
		if (disposition === "addressed" || disposition === "ignored") {
			actions.appendChild(el("span", {
				className: `review-note-status review-note-status-${disposition}`,
				text: disposition === "addressed" ? "Queued for agent" : "Ignored"
			}));
			const undo = el("button", {
				className: "btn-secondary review-note-btn",
				text: "Undo"
			});
			undo.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.reviewNoteManager.updateNote(note, {
					disposition: "open",
					instruction: void 0
				});
			});
			actions.appendChild(undo);
			return actions;
		}
		const address = el("button", {
			className: "btn-primary review-note-btn",
			text: "Address"
		});
		address.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.queueReviewNoteForAgent(note);
		});
		const reply = el("button", {
			className: "btn-secondary review-note-btn",
			text: "Reply"
		});
		reply.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.showReviewNoteReplyForm(actions, note);
		});
		const ignore = el("button", {
			className: "btn-secondary review-note-btn",
			text: "Ignore"
		});
		ignore.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.reviewNoteManager.updateNote(note, { disposition: "ignored" });
		});
		actions.append(address, reply, ignore);
		return actions;
	}
	showReviewNoteReplyForm(actions, note) {
		if (actions.querySelector(".review-note-reply")) return;
		const form = el("div", { className: "review-note-reply" });
		const textarea = el("textarea", {
			className: "review-note-reply-text",
			attrs: { placeholder: "Instructions for the agent..." }
		});
		const controls = el("div", { className: "review-note-reply-actions" });
		const save = el("button", {
			className: "btn-primary review-note-btn",
			text: "Queue"
		});
		const cancel = el("button", {
			className: "btn-secondary review-note-btn",
			text: "Cancel"
		});
		save.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const instruction = textarea.value.trim();
			if (!instruction) {
				textarea.focus();
				return;
			}
			this.queueReviewNoteForAgent(note, instruction);
		});
		cancel.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			form.remove();
		});
		controls.append(save, cancel);
		form.append(textarea, controls);
		actions.appendChild(form);
		textarea.focus();
	}
	queueReviewNoteForAgent(note, instruction) {
		const comment = {
			file: note.file,
			line: note.line,
			side: note.side,
			body: this.formatReviewNoteInstruction(note, instruction)
		};
		this.commentManager.addComment(note.commit_idx === void 0 ? comment : {
			...comment,
			commit_idx: note.commit_idx
		});
		this.reviewNoteManager.updateNote(note, instruction === void 0 ? { disposition: "addressed" } : {
			disposition: "addressed",
			instruction
		});
	}
	formatReviewNoteInstruction(note, instruction) {
		const author = note.author ? ` from ${note.author}` : "";
		const quoted = note.body.split("\n").map((line) => `> ${line}`).join("\n");
		const source = note.source_url ? `\n\nSource: ${note.source_url}` : "";
		if (instruction) return `${instruction}\n\nReview comment${author}:\n${quoted}${source}`;
		return `Address this review comment${author}:\n${quoted}${source}`;
	}
	reviewNoteHeightPx(note) {
		const visualLines = note.body.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 86)), 0);
		return Math.max(124, Math.min(460, 88 + visualLines * 18));
	}
};

//#endregion
//#region web/src/dialog-methods.ts
function parseQueuedReviewNoteBody(body) {
	const lines = body.replace(/\r\n?/g, "\n").trim().split("\n");
	let source;
	for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
		const line = lines[idx]?.trim() ?? "";
		if (!line) continue;
		const sourceMatch = line.match(/^Source:\s+(https?:\/\/\S+)$/);
		if (sourceMatch) {
			source = sourceMatch[1];
			lines.splice(idx, lines.length - idx);
		}
		break;
	}
	while (lines.length > 0 && !lines[lines.length - 1]?.trim()) lines.pop();
	const introIndex = lines.findIndex((line) => /^(?:Address this review comment|Review comment)(?: from .+)?:$/.test(line.trim()));
	if (introIndex === -1) return null;
	const intro = lines[introIndex]?.trim() ?? "";
	const quote = lines.slice(introIndex + 1).map((line) => {
		if (line === ">") return "";
		if (line.startsWith("> ")) return line.slice(2);
		return line;
	}).join("\n").trim();
	if (!quote) return null;
	const instruction = lines.slice(0, introIndex).join("\n").trim();
	const author = intro.match(/review comment from (.+):$/i)?.[1];
	const parsed = { quote };
	if (instruction) parsed.instruction = instruction;
	if (author) parsed.author = author;
	if (source) parsed.source = source;
	return parsed;
}
var DialogMethods = class {
	showKeyboardHelp() {
		const { overlay, modal, body, close } = openModal({
			title: "Keyboard Shortcuts",
			titleId: "kb-help-title",
			modalClass: "help-modal",
			onKeydown: (e) => {
				if (e.key === "?") {
					e.preventDefault();
					close();
				}
			}
		});
		const thead = el("thead", {}, [el("tr", {}, [el("th", { text: "Shortcut" }), el("th", { text: "Action" })])]);
		const tbody = el("tbody");
		const table = el("table", { className: "shortcuts-table" }, [thead, tbody]);
		KEYBOARD_SHORTCUTS.forEach((shortcut) => {
			const row = el("tr");
			const keysCell = el("td");
			const keyComboDiv = el("div", { className: "key-combo" });
			shortcut.keys.forEach((combo, idx) => {
				if (idx > 0) keyComboDiv.appendChild(el("span", {
					className: "key-or",
					text: "or"
				}));
				combo.replace("Mod", IS_MAC ? "Cmd" : "Ctrl").split("+").forEach((part, partIdx) => {
					if (partIdx > 0) {
						const plus = el("span", { text: "+" });
						plus.style.margin = "0 2px";
						plus.style.color = "#888";
						keyComboDiv.appendChild(plus);
					}
					const key = el("span", { className: "key" });
					key.textContent = part.replace("ArrowDown", "↓").replace("ArrowUp", "↑").replace("Enter", "⏎");
					keyComboDiv.appendChild(key);
				});
			});
			keysCell.appendChild(keyComboDiv);
			const actionCell = el("td", { text: shortcut.description });
			row.appendChild(keysCell);
			row.appendChild(actionCell);
			tbody.appendChild(row);
		});
		body.appendChild(table);
	}
	showSettingsModal() {
		const { overlay, modal, body, footer, close } = openModal({
			title: "Settings",
			titleId: "settings-title",
			modalClass: "help-modal",
			footerContent: [el("button", {
				className: "btn-secondary cancel-btn",
				text: "Cancel"
			}), el("button", {
				className: "btn-primary save-btn",
				text: "Save"
			})]
		});
		const form = el("form", { className: "settings-form" });
		let currentColorScheme = this.config.color_scheme;
		const legacyThemeMap = {
			dark: "vs-dark",
			light: "vs",
			"high-contrast": "hc-black"
		};
		if (legacyThemeMap[currentColorScheme]) currentColorScheme = legacyThemeMap[currentColorScheme];
		const currentFont = this.config.font;
		const currentSplitView = this.config.split_view;
		const currentAutoCloseTab = this.config.auto_close_tab;
		if (window.DEBUG) console.info("Settings modal - current values:", {
			currentColorScheme,
			currentFont,
			currentSplitView,
			currentAutoCloseTab
		});
		const opt = (value, text) => el("option", {
			attrs: { value },
			text
		});
		const optGroup = (label, options) => el("optgroup", { attrs: { label } }, options.map(([value, text]) => opt(value, text)));
		const userThemeGroup = this.userThemes.length > 0 ? [optGroup("Custom", this.userThemes.map((t) => [t.id, t.name]))] : [];
		const colorSelect = el("select", { attrs: {
			id: "color-scheme",
			name: "color_scheme"
		} }, [
			optGroup("Standard", [
				["vs-dark", "VS Dark"],
				["vs", "VS Light"],
				["hc-black", "High Contrast Dark"],
				["hc-light", "High Contrast Light"]
			]),
			optGroup("GitHub", [["github-dark", "GitHub Dark"], ["github-light", "GitHub Light"]]),
			optGroup("Firefox DevTools", [["firefox-devtools-dark", "Firefox DevTools Dark"], ["firefox-devtools-light", "Firefox DevTools Light"]]),
			optGroup("Solarized", [["solarized-dark", "Solarized Dark"], ["solarized-light", "Solarized Light"]]),
			optGroup("Phabricator", [["phabricator", "Phabricator"]]),
			...userThemeGroup
		]);
		const themeHint = el("div", { className: "settings-hint" });
		themeHint.innerHTML = "Custom themes: drop any VS Code theme <code>.json</code> into <code>&lt;config-dir&gt;/themes/</code>. Run <code>lrv --config-dir</code> for the path on your platform.";
		const themeField = el("div", { className: "settings-field" }, [
			el("label", {
				attrs: { for: "color-scheme" },
				text: "Theme"
			}),
			colorSelect,
			themeHint
		]);
		const fontField = el("div", { className: "settings-field" }, [el("label", {
			attrs: { for: "font" },
			text: "Editor Font"
		}), el("input", { attrs: {
			type: "text",
			id: "font",
			name: "font",
			value: currentFont,
			placeholder: "JetBrains Mono"
		} })]);
		const splitViewField = el("div", { className: "settings-field" }, [el("label", {
			attrs: { for: "split-view" },
			text: "Split View"
		}), el("div", { className: "checkbox-wrapper" }, [el("input", { attrs: {
			type: "checkbox",
			id: "split-view",
			name: "split_view",
			checked: currentSplitView
		} }), el("span", { text: "Show original and modified side-by-side" })])]);
		const autoCloseField = el("div", { className: "settings-field" }, [el("label", {
			attrs: { for: "auto-close-tab" },
			text: "Auto-Close Tab"
		}), el("div", { className: "checkbox-wrapper" }, [el("input", { attrs: {
			type: "checkbox",
			id: "auto-close-tab",
			name: "auto_close_tab",
			checked: currentAutoCloseTab
		} }), el("span", { text: "Automatically close tab after submitting review" })])]);
		form.appendChild(themeField);
		form.appendChild(fontField);
		form.appendChild(splitViewField);
		form.appendChild(autoCloseField);
		body.appendChild(form);
		const colorField = form.querySelector("#color-scheme");
		if (colorField) colorField.value = currentColorScheme;
		const save = async () => {
			const saveBtn = footer.querySelector(".save-btn");
			if (!saveBtn) return;
			saveBtn.disabled = true;
			saveBtn.textContent = "Saving...";
			const formData = new FormData(form);
			const newConfig = resolveAppConfig({
				color_scheme: String(formData.get("color_scheme") ?? "vs-dark"),
				font: String(formData.get("font") ?? ""),
				split_view: formData.get("split_view") === "on",
				auto_close_tab: formData.get("auto_close_tab") === "on",
				stacked_view: this.config.stacked_view
			});
			try {
				if ((await fetch("/api/config", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(newConfig)
				})).ok) {
					this.config = newConfig;
					this.isInline = !this.config.split_view;
					monaco.editor.setTheme(this.config.color_scheme);
					this.applyThemeToUI(this.config.color_scheme);
					saveBtn.textContent = "Saved!";
					setTimeout(() => {
						close();
						this.loadFile(this.currentFileIndex);
					}, 500);
				} else {
					alert("Failed to save settings");
					saveBtn.disabled = false;
					saveBtn.textContent = "Save";
				}
			} catch (error) {
				alert(`Failed to save settings: ${error}`);
				saveBtn.disabled = false;
				saveBtn.textContent = "Save";
			}
		};
		const cancelBtn = footer.querySelector(".cancel-btn");
		const saveBtn = footer.querySelector(".save-btn");
		if (cancelBtn) cancelBtn.onclick = close;
		if (saveBtn) saveBtn.onclick = save;
		setTimeout(() => {
			const initial = form.querySelector("#color-scheme");
			if (initial) initial.focus();
		}, 0);
	}
	async showSubmitConfirmation() {
		const comments = this.commentManager.getComments();
		const overallDraft = this.overallReviewComment.trim();
		const submissionComments = [...comments];
		if (overallDraft && !submissionComments.some((comment) => comment.file === "(commit)" && comment.side === "new" && comment.line === 1 && comment.body === overallDraft)) submissionComments.push({
			file: "(commit)",
			line: 1,
			side: "new",
			body: overallDraft
		});
		let submit = () => {};
		const footerContent = [el("button", {
			className: "btn-secondary cancel-submit-btn",
			text: "Cancel"
		}), el("button", {
			className: "btn-primary confirm-submit-btn",
			text: "Submit Review"
		})];
		const { overlay, modal, body, footer, close } = openModal({
			title: submissionComments.length === 0 ? "Submit Review" : `Review Comments (${submissionComments.length})`,
			titleId: "submit-title",
			modalClass: "submit-review-modal",
			footerContent,
			onKeydown: (e) => {
				if (e.key === "Enter" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					submit();
				}
			}
		});
		if (submissionComments.length === 0) {
			const noCommentsMsg = el("p", { text: "No comments. Submit to approve this review." });
			noCommentsMsg.style.padding = "20px";
			noCommentsMsg.style.textAlign = "center";
			noCommentsMsg.style.color = "var(--text-secondary)";
			body.appendChild(noCommentsMsg);
		}
		const summaryField = el("div", { className: "submit-summary-field" }, [el("label", {
			className: "submit-summary-label",
			text: "Overall feedback"
		})]);
		const summaryInput = el("textarea", {
			className: "submit-summary-input",
			attrs: { placeholder: "Final global comment before submit…" }
		});
		summaryInput.value = this.overallReviewComment;
		summaryField.appendChild(summaryInput);
		body.appendChild(summaryField);
		const commentsByFile = {};
		submissionComments.forEach((comment) => {
			commentsByFile[comment.file] ??= [];
			commentsByFile[comment.file].push(comment);
		});
		if (submissionComments.length > 0) {
			const fileCount = Object.keys(commentsByFile).length;
			body.appendChild(el("div", { className: "submit-review-summary" }, [
				el("div", { className: "submit-review-summary-item" }, [el("strong", { text: submissionComments.length }), el("span", { text: submissionComments.length === 1 ? "queued comment" : "queued comments" })]),
				el("div", { className: "submit-review-summary-item" }, [el("strong", { text: fileCount }), el("span", { text: fileCount === 1 ? "location" : "locations" })]),
				el("div", {
					className: "submit-review-summary-hint",
					text: "These comments will be sent to the agent when you submit."
				})
			]));
		}
		const fileContents = {};
		await Promise.all(Object.keys(commentsByFile).map(async (filePath) => {
			if (filePath === "(commit)") return;
			const fileComments = commentsByFile[filePath] ?? [];
			const sides = [...new Set(fileComments.map((c) => c.side))];
			for (const side of sides) {
				const key = `${filePath}:${side}`;
				const commitParam = fileComments[0]?.commit_idx !== void 0 ? `&commit=${fileComments[0].commit_idx}` : "";
				try {
					const data = await fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=${side}${commitParam}`);
					fileContents[key] = String(data.content ?? "").split("\n");
				} catch (err) {
					console.error(`Failed to fetch ${key}:`, err);
					fileContents[key] = [];
				}
			}
		}));
		submissionComments.forEach((comment) => {
			const preview = el("div", { className: "comment-preview" });
			const isCommitComment = comment.file === "(commit)";
			const locationText = isCommitComment ? "Review summary" : `${comment.file}:${commentLineLabel(comment)}`;
			const sideText = isCommitComment ? " (global)" : ` (${comment.side})`;
			const previewHeader = el("div", { className: "comment-preview-header" }, [el("span", {
				className: "comment-preview-location",
				text: locationText
			}), el("span", {
				className: "comment-preview-side",
				text: sideText
			})]);
			const lines = fileContents[`${comment.file}:${comment.side}`] ?? [];
			const rangeStart = commentStartLine(comment);
			const rangeEnd = commentEndLine(comment);
			const startLine = Math.max(0, rangeStart - 2);
			const endLine = Math.min(lines.length, rangeEnd + 1);
			const excerpt = lines.slice(startLine, endLine);
			const codeBlock = el("div", { className: "comment-preview-code" });
			excerpt.forEach((line, idx) => {
				const lineDiv = el("div", { className: "comment-preview-code-line" });
				const lineNumber = startLine + idx + 1;
				if (lineNumber >= rangeStart && lineNumber <= rangeEnd) lineDiv.classList.add("target");
				lineDiv.appendChild(el("span", {
					className: "comment-preview-code-line-number",
					text: lineNumber
				}));
				lineDiv.appendChild(el("span", {
					className: "comment-preview-code-line-text",
					text: line || " "
				}));
				codeBlock.appendChild(lineDiv);
			});
			preview.appendChild(previewHeader);
			if (!isCommitComment && excerpt.length > 0) preview.appendChild(codeBlock);
			preview.appendChild(this.renderSubmitCommentBody(comment));
			body.appendChild(preview);
		});
		submit = async () => {
			const submitBtn = footer.querySelector(".confirm-submit-btn");
			if (!submitBtn) return;
			this.overallReviewComment = summaryInput.value.trim();
			const finalComments = [...comments];
			const finalOverall = this.overallReviewComment;
			if (finalOverall && !finalComments.some((comment) => comment.file === "(commit)" && comment.side === "new" && comment.line === 1 && comment.body === finalOverall)) finalComments.push({
				file: "(commit)",
				line: 1,
				side: "new",
				body: finalOverall
			});
			submitBtn.disabled = true;
			submitBtn.textContent = "Submitting...";
			try {
				const resp = await fetch("/api/complete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ comments: finalComments })
				});
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
				await this.clearPersistedComments();
				this.commentManager.setComments([]);
				this.overallReviewComment = "";
				this.updateDecorations();
				this.renderFileList();
				if (this.currentFileIsCommit) this.loadCommitView();
				submitBtn.textContent = "Submitted!";
				const submitReviewBtn = document.getElementById("submit-review");
				if (submitReviewBtn) {
					submitReviewBtn.disabled = true;
					submitReviewBtn.textContent = "Review Submitted";
				}
				setTimeout(() => {
					close();
					if (this.config.auto_close_tab) window.close();
				}, 1e3);
			} catch (error) {
				alert(`Failed to submit review: ${error}`);
				submitBtn.disabled = false;
				submitBtn.textContent = "Submit Review";
			}
		};
		const cancelSubmitBtn = footer.querySelector(".cancel-submit-btn");
		const confirmSubmitBtn = footer.querySelector(".confirm-submit-btn");
		if (cancelSubmitBtn) cancelSubmitBtn.onclick = close;
		if (confirmSubmitBtn) confirmSubmitBtn.onclick = submit;
		setTimeout(() => {
			const f = footer.querySelector(".confirm-submit-btn");
			if (f) f.focus();
		}, 0);
	}
	renderSubmitCommentBody(comment) {
		const container = el("div", { className: "comment-preview-text" });
		const parsed = parseQueuedReviewNoteBody(comment.body);
		if (!parsed) {
			const plain = el("div", { className: "comment-preview-body-plain" });
			appendLinkifiedText(plain, comment.body);
			container.appendChild(plain);
			return container;
		}
		const actionText = el("div", { className: "comment-preview-action-text" });
		appendLinkifiedText(actionText, parsed.instruction ?? "Ask the agent to address this review comment.");
		container.appendChild(el("div", { className: "comment-preview-action" }, [el("span", {
			className: "comment-preview-action-badge",
			text: "Queued"
		}), actionText]));
		const reviewTitleChildren = [el("span", {
			className: "comment-preview-review-label",
			text: "Reviewer comment"
		})];
		if (parsed.author) reviewTitleChildren.push(el("span", {
			className: "comment-preview-review-author",
			text: parsed.author
		}));
		const quote = el("blockquote", { className: "comment-preview-quote" });
		appendLinkifiedText(quote, parsed.quote);
		const reviewChildren = [el("div", { className: "comment-preview-review-title" }, reviewTitleChildren), quote];
		if (parsed.source) reviewChildren.push(el("div", { className: "comment-preview-source" }, [el("span", { text: "Source" }), el("a", {
			className: "auto-link",
			text: "Open in Phabricator",
			attrs: {
				href: parsed.source,
				target: "_blank",
				rel: "noopener noreferrer"
			}
		})]));
		container.appendChild(el("div", { className: "comment-preview-review" }, reviewChildren));
		return container;
	}
};

//#endregion
//#region web/src/series-methods.ts
var SeriesMethods = class {
	renderSeriesNav() {
		const container = document.getElementById("commit-strip");
		const resizer = document.getElementById("commit-strip-resizer");
		if (!container) return;
		if (!this.seriesInfo?.is_series) {
			container.style.display = "none";
			if (resizer) resizer.style.display = "none";
			return;
		}
		container.style.display = "";
		if (resizer) resizer.style.display = "";
		clearEl(container);
		const { commits } = this.seriesInfo;
		const nav = el("div", { className: "series-nav" });
		const mixedAuthors = new Set(commits.map((c) => c.commit_author).filter(Boolean)).size > 1;
		commits.forEach((commit) => {
			const isActive = commit.idx === this.currentCommitIdx;
			const commitCommentCount = this.commentManager.getComments().filter((c) => c.commit_idx === commit.idx).length + this.reviewNoteManager.getNotes().filter((n) => n.commit_idx === commit.idx).length;
			const row = el("div", { className: `series-commit${isActive ? " active" : ""}${commitCommentCount > 0 ? " has-comments" : ""}` });
			const num = el("span", {
				className: "series-commit-num",
				text: String(commit.idx + 1)
			});
			const info = el("div", { className: "series-commit-info" });
			const msg = commit.commit_message?.split("\n")[0] ?? "(no message)";
			const titleRow = el("div", { className: "series-commit-title-row" });
			const title = el("div", {
				className: "series-commit-msg",
				text: msg
			});
			titleRow.appendChild(title);
			if (commitCommentCount > 0) titleRow.appendChild(el("span", {
				className: "series-comment-badge",
				text: String(commitCommentCount)
			}));
			const meta = el("div", { className: "series-commit-meta" });
			meta.innerHTML = `<span class="series-hash">${commit.commit_hash?.slice(0, 8) ?? ""}</span> <span class="delta-add">+${commit.stats.additions}</span> <span class="delta-del">-${commit.stats.deletions}</span>${mixedAuthors && commit.commit_author ? ` <span class="series-author">${commit.commit_author}</span>` : ""}`;
			info.appendChild(titleRow);
			info.appendChild(meta);
			row.appendChild(num);
			row.appendChild(info);
			row.addEventListener("click", () => {
				if (commit.idx !== this.currentCommitIdx) this.loadCommit(commit.idx);
			});
			nav.appendChild(row);
		});
		container.appendChild(nav);
	}
	async loadCommit(idx) {
		const series = this.seriesInfo;
		if (!series) return;
		const clamped = Math.max(0, Math.min(idx, series.commits.length - 1));
		this.currentCommitIdx = clamped;
		this.commentManager.currentCommitIdx = clamped;
		this.reviewNoteManager.currentCommitIdx = clamped;
		const diffData = await fetchJSON(`/api/diff?commit=${clamped}`);
		this.diff = diffData;
		this.files = diffData.files;
		this.stats = diffData.stats;
		this.fileHunks = {};
		this.currentHunkIndex = {};
		this.currentFileIndex = 0;
		this.currentFileIsCommit = false;
		this._eagerPrefetchStarted = false;
		this.renderSeriesNav();
		this.renderFileList();
		if (this.isStacked) this.renderStackedView();
		else if (this.files.length > 0) await this.loadFile(0);
		else this.loadCommitView();
		showNavIndicator(`Commit ${clamped + 1}/${series.commits.length}: ${series.commits[clamped]?.commit_message?.split("\n")[0] ?? ""}`);
	}
	nextCommit() {
		if (!this.seriesInfo?.is_series) return;
		this.loadCommit(this.currentCommitIdx + 1);
	}
	previousCommit() {
		if (!this.seriesInfo?.is_series) return;
		this.loadCommit(this.currentCommitIdx - 1);
	}
};

//#endregion
//#region web/src/stacked-view-methods.ts
const DIFFS_THEME = {
	dark: "pierre-dark",
	light: "pierre-light"
};
let diffsRuntimePromise = null;
function loadDiffsRuntime() {
	diffsRuntimePromise ??= Promise.all([
		import("./chunks/stacked-diff-a6Yv5Xck.js").then((n) => n.La),
		import("./chunks/stacked-diff-a6Yv5Xck.js").then((n) => n.za),
		import("./chunks/stacked-diff-a6Yv5Xck.js").then((n) => n.Ra),
		import("./chunks/stacked-diff-a6Yv5Xck.js").then((n) => n.Ia)
	]).then(([codeView, patchParser, fileParser, workerPool]) => ({
		CodeView: codeView.CodeView,
		parsePatchFiles: patchParser.parsePatchFiles,
		parseDiffFromFile: fileParser.parseDiffFromFile,
		getOrCreateWorkerPoolSingleton: workerPool.getOrCreateWorkerPoolSingleton
	}));
	return diffsRuntimePromise;
}
function createDiffsWorker() {
	return new Worker("/assets/app/diffs-worker.js", { type: "module" });
}
var StackedViewMethods = class {
	stackedCodeView;
	stackedItems;
	stackedFileMetadata;
	stackedDraft;
	stackedItemVersion;
	stackedScrollUnsubscribe;
	stackedRenderToken;
	stackedHydratedFiles;
	stackedParseDiffFromFile;
	stackedLastRangeSelection;
	showStackedView() {
		this.isStacked = true;
		const editor = document.getElementById("editor-container");
		const stacked = document.getElementById("stacked-container");
		if (editor) editor.style.display = "none";
		if (stacked) {
			stacked.style.display = "";
			this.renderStackedView();
		}
		this.updateStackedToggleLabel();
		const toggleView = document.getElementById("toggle-view");
		if (toggleView) toggleView.style.display = "none";
		this.persistStackedPref(true);
	}
	hideStackedView() {
		this.isStacked = false;
		this.stackedRenderToken = (this.stackedRenderToken ?? 0) + 1;
		const editor = document.getElementById("editor-container");
		const stacked = document.getElementById("stacked-container");
		if (editor) editor.style.display = "";
		if (stacked) stacked.style.display = "none";
		this.updateStackedToggleLabel();
		const toggleView = document.getElementById("toggle-view");
		if (toggleView) toggleView.style.display = "";
		this.persistStackedPref(false);
		if (!this.editor && this.files.length > 0) this.loadFile(this.currentFileIndex);
	}
	updateStackedToggleLabel() {
		const toggle = document.getElementById("toggle-stacked");
		if (!toggle) return;
		toggle.classList.toggle("active", this.isStacked);
		toggle.textContent = this.isStacked ? "Mode: Stacked" : "Mode: File by file";
		toggle.setAttribute("aria-pressed", String(this.isStacked));
	}
	persistStackedPref(value) {
		this.config.stacked_view = value;
		fetchJSON("/api/config", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(this.config)
		}).catch(() => {});
	}
	toggleStackedView() {
		if (this.isStacked) this.hideStackedView();
		else this.showStackedView();
	}
	stackedTopForFile(file) {
		if (file.is_binary) return document.getElementById(this.stackedSectionId(file.path))?.offsetTop ?? null;
		return this.stackedCodeView?.getTopForItem(this.stackedItemId(file.path)) ?? null;
	}
	scrollToFileInStacked(index) {
		if (!this.isStacked) return;
		const file = this.files[index];
		if (!file) return;
		this.currentFileIndex = index;
		this.currentFileIsCommit = false;
		if (this._commitViewEl) this._commitViewEl.style.display = "none";
		this.renderFileList();
		const anchor = document.getElementById(this.stackedSectionId(file.path));
		if (file.is_binary) {
			anchor?.scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
			return;
		}
		if (this.stackedCodeView) {
			this.stackedCodeView.scrollTo({
				type: "item",
				id: this.stackedItemId(file.path),
				align: "start",
				behavior: "instant"
			});
			return;
		}
		anchor?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}
	async renderStackedView() {
		const container = document.getElementById("stacked-container");
		if (!container) return;
		this.stackedScrollUnsubscribe?.();
		this.stackedScrollUnsubscribe = null;
		this.stackedCodeView?.cleanUp();
		this.stackedCodeView = null;
		this.stackedItems = /* @__PURE__ */ new Map();
		this.stackedFileMetadata = /* @__PURE__ */ new Map();
		this.stackedHydratedFiles = /* @__PURE__ */ new Set();
		this.stackedParseDiffFromFile = null;
		this.stackedLastRangeSelection = null;
		this.stackedRenderToken = (this.stackedRenderToken ?? 0) + 1;
		const renderToken = this.stackedRenderToken;
		clearEl(container);
		const msg = this.diff?.commit_message;
		const hash = this.diff?.commit_hash;
		if (msg || hash) {
			const msgBox = el("div", { className: "stacked-commit-message" });
			if (hash) msgBox.appendChild(el("div", {
				className: "stacked-commit-hash",
				text: hash.slice(0, 12)
			}));
			if (msg) msgBox.appendChild(el("pre", {
				className: "stacked-commit-msg-body",
				text: msg
			}));
			container.appendChild(msgBox);
		}
		if (!this.files.length) {
			container.appendChild(el("div", {
				className: "stacked-empty",
				text: "No files changed."
			}));
			return;
		}
		const { CodeView, parsePatchFiles, parseDiffFromFile, getOrCreateWorkerPoolSingleton } = await loadDiffsRuntime();
		if (!this.isStacked || !container.isConnected || renderToken !== this.stackedRenderToken) return;
		this.stackedParseDiffFromFile = parseDiffFromFile;
		const codeViewRoot = el("div", { className: "stacked-code-view" });
		container.appendChild(codeViewRoot);
		const binaryFiles = this.files.filter((file) => file.is_binary);
		const items = this.files.map((file) => this.buildCodeViewItem(file, parsePatchFiles)).filter((item) => !!item);
		if (!items.length) {
			if (binaryFiles.length) {
				codeViewRoot.appendChild(el("div", {
					className: "stacked-empty",
					text: "This review contains only binary files."
				}));
				binaryFiles.forEach((file) => codeViewRoot.appendChild(this.renderBinaryFileNotice(file)));
			} else codeViewRoot.appendChild(el("div", {
				className: "stacked-empty",
				text: "No renderable text changes."
			}));
			return;
		}
		const workerPool = getOrCreateWorkerPoolSingleton({
			poolOptions: {
				workerFactory: createDiffsWorker,
				poolSize: Math.min(Math.max(navigator.hardwareConcurrency ?? 4, 2), 6),
				totalASTLRUCacheSize: 64
			},
			highlighterOptions: {
				theme: DIFFS_THEME,
				lineDiffType: "word-alt",
				maxLineDiffLength: 1e3,
				tokenizeMaxLineLength: 1e3
			}
		});
		const view = new CodeView({
			diffStyle: "split",
			theme: DIFFS_THEME,
			lineHoverHighlight: "both",
			hunkSeparators: "line-info-basic",
			collapsedContextThreshold: 1,
			expansionLineCount: 30,
			stickyHeaders: true,
			enableLineSelection: true,
			renderHeaderMetadata: (fileDiff) => this.buildHeaderMetadata(this.fileForPath(fileDiff.name)),
			onLineNumberClick: (props, context) => this.showStackedDraft(this.pathFromCodeViewContext(context), props),
			onSelectedLinesChange: (selection) => this.rememberStackedSelection(selection),
			onLineSelected: (range, context) => this.showStackedDraftFromSelection(this.pathFromCodeViewContext(context), range),
			renderAnnotation: (annotation) => this.renderStackedAnnotation(annotation),
			unsafeCSS: this.stackedDiffsCss()
		}, workerPool);
		this.stackedCodeView = view;
		view.setup(codeViewRoot);
		view.setItems(items);
		view.render(true);
		if (binaryFiles.length) binaryFiles.forEach((file) => container.appendChild(this.renderBinaryFileNotice(file)));
		this.stackedScrollUnsubscribe = view.subscribeToScroll((scrollTop) => {
			this.syncCurrentFileFromStackedScroll(scrollTop);
		});
		this.hydrateStackedFile(this.files[this.currentFileIndex], parseDiffFromFile);
	}
	buildCodeViewItem(file, parsePatchFiles) {
		if (file.is_binary) return null;
		const metadata = this.toPatchDiffsMetadata(file, parsePatchFiles);
		if (!metadata) return null;
		this.stackedFileMetadata.set(file.path, metadata);
		const item = {
			id: this.stackedItemId(file.path),
			type: "diff",
			fileDiff: metadata,
			annotations: this.stackedAnnotationsForFile(file.path),
			version: ++this.stackedItemVersion
		};
		this.stackedItems.set(file.path, item);
		return item;
	}
	async hydrateStackedFile(file, parseDiffFromFile) {
		if (!file || file.is_binary || this.stackedHydratedFiles.has(file.path)) return;
		this.stackedHydratedFiles.add(file.path);
		const metadata = await this.toFullFileDiffsMetadata(file, parseDiffFromFile);
		if (!metadata || !this.isStacked || this.stackedParseDiffFromFile !== parseDiffFromFile) return;
		const existing = this.stackedItems.get(file.path);
		if (!existing) return;
		const nextItem = {
			...existing,
			fileDiff: metadata,
			annotations: this.stackedAnnotationsForFile(file.path),
			version: ++this.stackedItemVersion
		};
		this.stackedFileMetadata.set(file.path, metadata);
		this.stackedItems.set(file.path, nextItem);
		if (this.stackedCodeView?.updateItem(nextItem)) this.stackedCodeView.render(true);
	}
	async toFullFileDiffsMetadata(file, parseDiffFromFile) {
		let pair;
		try {
			pair = await this.fetchFilePair(file.path);
		} catch {
			return null;
		}
		if (!pair.old && !pair.new) return null;
		const normalise = (s) => s && !s.endsWith("\n") ? s + "\n" : s;
		const oldFile = {
			name: file.old_path ?? file.path,
			contents: normalise(pair.old),
			cacheKey: `${this.fileCacheKey(file.path)}:old`
		};
		const newFile = {
			name: file.path,
			contents: normalise(pair.new),
			cacheKey: `${this.fileCacheKey(file.path)}:new`
		};
		try {
			return parseDiffFromFile(oldFile, newFile);
		} catch {
			return null;
		}
	}
	toPatchDiffsMetadata(file, parsePatchFiles) {
		if (!file.hunks.length) return null;
		return parsePatchFiles(this.toUnifiedPatch(file), `lrv:${file.path}`)[0]?.files[0] ?? null;
	}
	buildHeaderMetadata(file) {
		const { additions, deletions } = this.fileDelta(file);
		const meta = el("span", { className: "stacked-file-meta" });
		if (additions > 0) meta.appendChild(el("span", {
			className: "delta-add",
			text: `+${additions}`
		}));
		if (deletions > 0) meta.appendChild(el("span", {
			className: "delta-del",
			text: `-${deletions}`
		}));
		meta.appendChild(el("span", {
			className: `stacked-file-status status-${file.status}`,
			text: file.status[0]?.toUpperCase() ?? "?",
			attrs: { title: file.status }
		}));
		return meta;
	}
	renderBinaryFileNotice(file) {
		return el("div", {
			className: "stacked-binary-file",
			attrs: { id: this.stackedSectionId(file.path) }
		}, [el("div", {
			className: "stacked-binary-title",
			text: file.path
		}), el("div", {
			className: "stacked-binary-body",
			text: `${file.status[0]?.toUpperCase() ?? "?"}${file.status.slice(1)} binary file. Text diff is unavailable.`
		})]);
	}
	showStackedDraft(file, props) {
		if (!file) return;
		const side = this.fromAnnotationSide(props.annotationSide);
		this.stackedDraft = {
			file,
			line: this.stackedSelectedLine(file, props.lineNumber, side),
			side
		};
		this.renderStackedComments();
	}
	showStackedDraftFromSelection(file, range) {
		if (!file || !range) return;
		const startSide = range.side ? this.fromAnnotationSide(range.side) : null;
		const endSide = range.endSide ? this.fromAnnotationSide(range.endSide) : startSide;
		if (!startSide || startSide !== endSide) return;
		const start = Math.min(range.start, range.end);
		const end = Math.max(range.start, range.end);
		this.stackedDraft = {
			file,
			line: start === end ? start : [start, end],
			side: startSide
		};
		this.renderStackedComments();
	}
	stackedSelectedLine(file, clickedLine, side) {
		const current = this.commentLineFromStackedSelection(this.stackedCodeView?.getSelectedLines(), file, clickedLine, side);
		if (Array.isArray(current)) return current;
		return this.commentLineFromStackedSelection(this.stackedLastRangeSelection, file, clickedLine, side) ?? current ?? clickedLine;
	}
	rememberStackedSelection(selection) {
		if (this.isStackedRangeSelection(selection)) this.stackedLastRangeSelection = selection;
	}
	commentLineFromStackedSelection(selected, file, clickedLine, side) {
		const startSide = selected?.range.side ? this.fromAnnotationSide(selected.range.side) : null;
		const endSide = selected?.range.endSide ? this.fromAnnotationSide(selected.range.endSide) : startSide;
		if (!selected || selected.id !== this.stackedItemId(file) || startSide !== side || endSide !== side) return clickedLine;
		const start = Math.min(selected.range.start, selected.range.end);
		const end = Math.max(selected.range.start, selected.range.end);
		if (clickedLine < start || clickedLine > end) return null;
		return start === end ? start : [start, end];
	}
	isStackedRangeSelection(selection) {
		return !!selection && selection.range.start !== selection.range.end;
	}
	renderStackedComments() {
		if (!this.isStacked) return;
		for (const [path, item] of this.stackedItems) {
			const nextItem = {
				...item,
				annotations: this.stackedAnnotationsForFile(path),
				version: ++this.stackedItemVersion
			};
			this.stackedItems.set(path, nextItem);
			if (!this.stackedCodeView?.updateItem(nextItem)) continue;
		}
		this.stackedCodeView?.render(true);
	}
	renderStackedAnnotation(annotation) {
		const metadata = annotation.metadata;
		if (!metadata) return;
		if (metadata.kind === "draft") return this.buildDraftAnnotation(metadata);
		if (metadata.kind === "review-note") {
			const wrap = el("div", { className: `stacked-annotation stacked-review-note-${metadata.note.side}` });
			wrap.appendChild(this.buildReviewNoteNode(metadata.note));
			return wrap;
		}
		return this.buildCommentAnnotation(metadata.comment, metadata.index);
	}
	buildDraftAnnotation(draft) {
		const form = el("div", { className: "stacked-comment-form" });
		const ta = document.createElement("textarea");
		ta.className = "stacked-comment-ta";
		ta.placeholder = "Add a comment...";
		ta.rows = 3;
		const save = el("button", {
			className: "stacked-comment-save btn-primary",
			text: "Save"
		});
		const cancel = el("button", {
			className: "stacked-comment-cancel btn-secondary",
			text: "Cancel"
		});
		const doSave = () => {
			const body = ta.value.trim();
			if (!body) {
				ta.focus();
				return;
			}
			const comment = {
				file: draft.file,
				line: draft.line,
				side: draft.side,
				body
			};
			this.commentManager.addComment(this.seriesInfo?.is_series ? {
				...comment,
				commit_idx: this.currentCommitIdx
			} : comment);
			this.stackedDraft = null;
			this.stackedLastRangeSelection = null;
			this.stackedCodeView?.clearSelectedLines({ notify: false });
			this.renderStackedComments();
		};
		save.addEventListener("click", doSave);
		cancel.addEventListener("click", () => {
			this.stackedDraft = null;
			this.stackedLastRangeSelection = null;
			this.stackedCodeView?.clearSelectedLines({ notify: false });
			this.renderStackedComments();
		});
		ta.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				doSave();
			} else if (event.key === "Escape") {
				this.stackedDraft = null;
				this.stackedLastRangeSelection = null;
				this.stackedCodeView?.clearSelectedLines({ notify: false });
				this.renderStackedComments();
			}
		});
		form.append(ta, el("div", { className: "stacked-comment-actions" }, [save, cancel]));
		queueMicrotask(() => ta.focus());
		return form;
	}
	buildCommentAnnotation(comment, index) {
		const box = el("div", { className: "stacked-comment-box" });
		const meta = el("div", {
			className: "stacked-comment-meta",
			text: `${comment.side} line ${commentLineLabel(comment)}`
		});
		const body = el("div", {
			className: "stacked-comment-body",
			text: comment.body
		});
		const actions = el("div", { className: "stacked-comment-actions-row" });
		const edit = el("button", {
			className: "stacked-comment-edit btn-secondary",
			text: "Edit"
		});
		const del = el("button", {
			className: "stacked-comment-del btn-danger",
			text: "Delete"
		});
		edit.addEventListener("click", () => {
			const ta = document.createElement("textarea");
			ta.className = "stacked-comment-ta";
			ta.rows = 3;
			ta.value = comment.body;
			const save = el("button", {
				className: "btn-primary",
				text: "Save"
			});
			const cancel = el("button", {
				className: "btn-secondary",
				text: "Cancel"
			});
			const saveEdit = () => {
				const newBody = ta.value.trim();
				if (!newBody) {
					ta.focus();
					return;
				}
				this.commentManager.updateComment(index, newBody);
			};
			save.addEventListener("click", saveEdit);
			cancel.addEventListener("click", () => this.renderStackedComments());
			ta.addEventListener("keydown", (event) => {
				if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
					event.preventDefault();
					saveEdit();
				} else if (event.key === "Escape") this.renderStackedComments();
			});
			box.replaceChildren(meta, ta, el("div", { className: "stacked-comment-actions-row" }, [save, cancel]));
			ta.focus();
		});
		del.addEventListener("click", () => this.commentManager.removeComment(index));
		actions.append(edit, del);
		box.append(meta, body, actions);
		return box;
	}
	stackedAnnotationsForFile(path) {
		const annotations = [];
		this.commentManager.getComments().forEach((comment, index) => {
			if (comment.file !== path) return;
			annotations.push({
				side: this.toAnnotationSide(comment.side),
				lineNumber: commentEndLine(comment),
				metadata: {
					kind: "comment",
					comment,
					index
				}
			});
		});
		this.reviewNoteManager.getNotesForFile(path).forEach((note) => {
			annotations.push({
				side: this.toAnnotationSide(note.side),
				lineNumber: commentEndLine(note),
				metadata: {
					kind: "review-note",
					note
				}
			});
		});
		if (this.stackedDraft?.file === path) annotations.push({
			side: this.toAnnotationSide(this.stackedDraft.side),
			lineNumber: Array.isArray(this.stackedDraft.line) ? this.stackedDraft.line[1] : this.stackedDraft.line,
			metadata: {
				kind: "draft",
				...this.stackedDraft
			}
		});
		return annotations;
	}
	syncCurrentFileFromStackedScroll(scrollTop) {
		if (!this.files.length) return;
		let bestIdx = this.currentFileIndex;
		let bestTop = Number.NEGATIVE_INFINITY;
		this.files.forEach((file, index) => {
			const top = this.stackedTopForFile(file);
			if (top == null || top > scrollTop + 32 || top < bestTop) return;
			bestTop = top;
			bestIdx = index;
		});
		if (bestIdx !== this.currentFileIndex) {
			this.currentFileIndex = bestIdx;
			this.currentFileIsCommit = false;
			this.renderFileList();
			if (this.stackedParseDiffFromFile) this.hydrateStackedFile(this.files[bestIdx], this.stackedParseDiffFromFile);
		}
	}
	toUnifiedPatch(file) {
		const oldPath = file.old_path ?? file.path;
		const oldHeader = file.status === "added" ? "/dev/null" : `a/${oldPath}`;
		const newHeader = file.status === "deleted" ? "/dev/null" : `b/${file.path}`;
		const lines = [`diff --git a/${oldPath} b/${file.path}`];
		if (file.status === "added") lines.push("new file mode 100644");
		else if (file.status === "deleted") lines.push("deleted file mode 100644");
		else if (file.status === "renamed" && file.old_path) lines.push(`rename from ${file.old_path}`, `rename to ${file.path}`);
		lines.push(`--- ${oldHeader}`, `+++ ${newHeader}`);
		for (const hunk of file.hunks) {
			const oldCount = hunk.lines.filter((line) => line.type !== "add").length;
			const newCount = hunk.lines.filter((line) => line.type !== "delete").length;
			lines.push(`@@ -${hunk.old_start ?? 0},${oldCount} +${hunk.new_start ?? 0},${newCount} @@`);
			for (const line of hunk.lines) lines.push(`${this.diffLinePrefix(line)}${line.content ?? ""}`);
		}
		return `${lines.join("\n")}\n`;
	}
	diffLinePrefix(line) {
		if (line.type === "add") return "+";
		if (line.type === "delete") return "-";
		return " ";
	}
	fileDelta(file) {
		let additions = 0;
		let deletions = 0;
		for (const hunk of file.hunks) for (const line of hunk.lines) if (line.type === "add") additions += 1;
		else if (line.type === "delete") deletions += 1;
		return {
			additions,
			deletions
		};
	}
	toAnnotationSide(side) {
		return side === "new" ? "additions" : "deletions";
	}
	fromAnnotationSide(side) {
		return side === "additions" ? "new" : "old";
	}
	stackedSectionId(path) {
		return `stacked-file-${path.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
	}
	stackedItemId(path) {
		return `file:${path}`;
	}
	pathFromCodeViewContext(context) {
		const id = context?.item?.id ?? "";
		return id.startsWith("file:") ? id.slice(5) : id;
	}
	fileForPath(path) {
		return this.files.find((file) => file.path === path) ?? this.files[0];
	}
	stackedDiffsCss() {
		return `
      :host {
        --diffs-font-family: var(--font-mono);
        --diffs-light-bg: var(--bg-primary);
        --diffs-dark-bg: var(--bg-primary);
        --diffs-light: var(--text-primary);
        --diffs-dark: var(--text-primary);
        --diffs-fg-number-override: var(--text-secondary);
        --diffs-bg-context-override: color-mix(in srgb, var(--bg-primary) 88%, var(--text-primary));
        --diffs-bg-context-gutter-override: color-mix(in srgb, var(--bg-primary) 84%, var(--text-primary));
        --diffs-bg-separator-override: color-mix(in srgb, var(--bg-primary) 78%, var(--text-primary));
        --diffs-bg-buffer-override: color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary));
        --diffs-bg-selection-override: var(--accent-color);
        --diffs-bg-selection-number-override: var(--accent-color);
      }
      [data-line-annotation] { padding: 8px 12px; }
      [data-interactive-line-numbers] { cursor: pointer; }
    `;
	}
};

//#endregion
//#region web/src/monaco-app.ts
function applyMixin(TargetClass, MethodsClass) {
	for (const name of Object.getOwnPropertyNames(MethodsClass.prototype)) {
		if (name === "constructor") continue;
		const descriptor = Object.getOwnPropertyDescriptor(MethodsClass.prototype, name);
		if (!descriptor) continue;
		Object.defineProperty(TargetClass.prototype, name, descriptor);
	}
}
var MonacoApp = class {
	commentManager;
	reviewNoteManager;
	currentFileIndex;
	editor;
	isInline;
	modifiedDecorations;
	originalDecorations;
	modifiedReviewNoteDecorations;
	originalReviewNoteDecorations;
	modifiedReviewNoteZoneIds;
	originalReviewNoteZoneIds;
	focusedHunkDecorationsNew;
	focusedHunkDecorationsOld;
	focusedLineDecorationsNew;
	focusedLineDecorationsOld;
	currentFocusedLine;
	currentWidget;
	currentWidgetEditor;
	diff;
	files;
	stats;
	fileCache;
	overallReviewComment;
	fileHunks;
	currentHunkIndex;
	config;
	context;
	originalModel;
	modifiedModel;
	_eagerPrefetchStarted;
	_commitPopoverEl;
	currentFileIsCommit;
	_commitViewEl;
	collapsedDirs;
	fileListFilter;
	seriesInfo;
	currentCommitIdx;
	commentDraftKey;
	commentDraftWrite;
	constructor() {
		this.commentManager = new CommentManager();
		this.reviewNoteManager = new ReviewNoteManager();
		this.currentFileIndex = 0;
		this.editor = null;
		this.isInline = false;
		this.modifiedDecorations = [];
		this.originalDecorations = [];
		this.modifiedReviewNoteDecorations = [];
		this.originalReviewNoteDecorations = [];
		this.modifiedReviewNoteZoneIds = [];
		this.originalReviewNoteZoneIds = [];
		this.focusedHunkDecorationsNew = [];
		this.focusedHunkDecorationsOld = [];
		this.focusedLineDecorationsNew = [];
		this.focusedLineDecorationsOld = [];
		this.currentFocusedLine = null;
		this.currentWidget = null;
		this.diff = null;
		this.files = [];
		this.stats = {
			files_changed: 0,
			additions: 0,
			deletions: 0
		};
		this.fileCache = {};
		this.overallReviewComment = "";
		this.userThemes = [];
		this.fileHunks = {};
		this.currentHunkIndex = {};
		this.config = DEFAULT_APP_CONFIG;
		this.originalModel = null;
		this.modifiedModel = null;
		this._eagerPrefetchStarted = false;
		this._commitPopoverEl = null;
		this.currentFileIsCommit = false;
		this._commitViewEl = null;
		this.collapsedDirs = /* @__PURE__ */ new Set();
		this.fileListFilter = "";
		this.seriesInfo = null;
		this.currentCommitIdx = 0;
		this.commentDraftKey = null;
		this.commentDraftWrite = Promise.resolve();
		this.isStacked = false;
		this.commentManager.onChange(() => {
			this.persistComments();
			this.updateUI();
			if (this.isStacked) this.renderStackedComments();
		});
		this.reviewNoteManager.onChange(() => {
			this.renderReviewNotes();
			this.renderFileList();
			if (this.currentFileIsCommit) this.loadCommitView();
		});
	}
	async init() {
		if (window.DEBUG) console.info("[app] init: start");
		window.Perf.recordAppInitStart();
		window.Perf.mark("init:start");
		if (performance.getEntriesByName("page:script-start").length > 0) window.Perf.measure("page:script-to-init-start", "page:script-start", "init:start");
		window.Perf.mark("init:fetch:start");
		const t0 = performance.now();
		const [configData, contextData, diffData, seriesData, reviewNotesData, userThemesData] = await Promise.all([
			fetchJSON("/api/config"),
			fetchJSON("/api/context"),
			fetchJSON("/api/diff"),
			fetchJSON("/api/series"),
			fetchJSON("/api/review-notes"),
			fetchJSON("/api/themes"),
			document.fonts.ready
		]);
		window.Perf.mark("init:fetch:end");
		window.Perf.measure("init:fetch", "init:fetch:start", "init:fetch:end");
		if (window.DEBUG) console.info("[app] init: responses received in", Math.round(performance.now() - t0), "ms");
		this.config = resolveAppConfig(configData);
		this.context = contextData;
		if (this.context.title) document.title = this.context.title;
		else {
			const dirName = (this.context.working_directory ?? "").split("/").pop() ?? "";
			document.title = dirName || "lrv";
		}
		if (window.DEBUG) console.info("[app] init: parsed config/context/diff");
		this.seriesInfo = seriesData;
		this.userThemes = userThemesData ?? [];
		this.currentCommitIdx = 0;
		this.commentManager.currentCommitIdx = seriesData.is_series ? 0 : null;
		this.reviewNoteManager.currentCommitIdx = seriesData.is_series ? 0 : null;
		this.reviewNoteManager.setNotes(reviewNotesData ?? []);
		this.diff = diffData;
		this.files = diffData.files;
		this.stats = diffData.stats;
		this.commentDraftKey = buildCommentDraftKey(this.context, this.diff, this.seriesInfo);
		await this.restorePersistedComments();
		this.isInline = !this.config.split_view;
		window.Perf.mark("init:amd-wait:start");
		await new Promise((resolve, reject) => {
			const start = performance.now();
			const timer = setInterval(() => {
				if (window.require) {
					clearInterval(timer);
					resolve();
				}
				if (performance.now() - start > 5e3) {
					clearInterval(timer);
					reject(/* @__PURE__ */ new Error("AMD loader not ready"));
				}
			}, 25);
		});
		window.Perf.mark("init:amd-wait:end");
		window.Perf.measure("init:amd-wait", "init:amd-wait:start", "init:amd-wait:end");
		const amdRequire = window.require;
		amdRequire.config({ paths: { vs: window.MONACO_VS_BASE ?? "/assets/vendor/monaco/min/vs" } });
		this.applyThemeToUI(this.config.color_scheme);
		document.documentElement.setAttribute("data-ui-ready", "1");
		return new Promise((resolve) => {
			window.Perf.mark("init:monaco:load:start");
			amdRequire(["vs/editor/editor.main"], () => {
				window.Perf.mark("init:monaco:load:end");
				window.Perf.measure("init:monaco:load", "init:monaco:load:start", "init:monaco:load:end");
				if (window.DEBUG) console.info("[app] monaco loaded");
				this.defineCustomThemes();
				this.applyThemeToUI(this.config.color_scheme);
				document.documentElement.setAttribute("data-ui-ready", "1");
				window.Perf.mark("init:ui-setup:start");
				this.setupUI();
				window.Perf.mark("init:ui-setup:end");
				window.Perf.measure("init:ui-setup", "init:ui-setup:start", "init:ui-setup:end");
				window.Perf.mark("init:file-list:render:start");
				this.renderSeriesNav();
				this.renderFileList();
				window.Perf.mark("init:file-list:render:end");
				window.Perf.measure("init:file-list:render", "init:file-list:render:start", "init:file-list:render:end");
				if (window.DEBUG) console.info("[app] calling loadFile(0)");
				if (this.config.stacked_view) this.showStackedView();
				window.Perf.mark("init:first-file:load:start");
				const firstLoad = this.isStacked || this.files.length === 0 ? Promise.resolve() : this.loadFile(0);
				if (this.files.length === 0) this.loadCommitView();
				Promise.resolve(firstLoad).then(() => {
					window.Perf.mark("init:first-file:load:end");
					window.Perf.measure("init:first-file:load", "init:first-file:load:start", "init:first-file:load:end");
					const reviewTime = document.getElementById("review-time");
					if (reviewTime) reviewTime.textContent = (/* @__PURE__ */ new Date()).toLocaleString();
					this.renderProjectInfo();
					window.Perf.mark("init:final-paint-wait:start");
					requestAnimationFrame(() => requestAnimationFrame(() => {
						window.Perf.mark("init:final-paint-wait:end");
						window.Perf.measure("init:final-paint-wait", "init:final-paint-wait:start", "init:final-paint-wait:end");
						window.Perf.recordAppInitEnd();
						window.Perf.mark("init:end");
						window.Perf.measure("init:total", "init:start", "init:end");
						if (window.DEBUG) {
							const e = performance.getEntriesByName("appInit");
							const d = e.length > 0 ? e[e.length - 1].duration : null;
							if (d != null) console.info("[perf] appInit ms:", Math.round(d));
						}
						markAppReady();
					}));
					resolve();
				});
			});
		});
	}
	persistComments() {
		if (!this.commentDraftKey) return;
		const key = this.commentDraftKey;
		const comments = this.commentManager.getComments();
		this.commentDraftWrite = this.commentDraftWrite.catch(() => void 0).then(() => saveCommentDraft(key, comments));
	}
	async restorePersistedComments() {
		if (!this.commentDraftKey) return;
		const comments = await loadCommentDraft(this.commentDraftKey);
		if (comments.length === 0) return;
		const banner = document.getElementById("restore-banner");
		const msg = document.getElementById("restore-banner-msg");
		const yesBtn = document.getElementById("restore-yes-btn");
		const noBtn = document.getElementById("restore-no-btn");
		if (!banner || !msg || !yesBtn || !noBtn) {
			this.commentManager.setComments(comments);
			return;
		}
		msg.textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"} from a previous session — restore?`;
		banner.style.display = "";
		const close = () => {
			banner.style.display = "none";
		};
		yesBtn.onclick = () => {
			this.commentManager.setComments(comments);
			close();
		};
		noBtn.onclick = () => {
			this.clearPersistedComments();
			close();
		};
	}
	async clearPersistedComments() {
		if (!this.commentDraftKey) return;
		try {
			await this.commentDraftWrite.catch(() => void 0);
			await clearCommentDraft(this.commentDraftKey);
		} catch (error) {
			console.warn("Failed to clear persisted review comments:", error);
		}
	}
	applyThemeToUI(themeName) {
		const setVar = (k, v) => {
			if (v) document.documentElement.style.setProperty(k, v);
		};
		const defs = window.UI_THEME_DEFS ?? {};
		const accentHex = (window.UIThemeAccentsHex ?? {})[themeName] ?? (() => {
			const def = defs[themeName];
			if (def && Array.isArray(def.rules)) {
				const kw = def.rules.find((r) => r && r.token === "keyword" && r.foreground);
				if (kw?.foreground) return "#" + String(kw.foreground).replace(/^#/, "");
			}
			return null;
		})();
		if (accentHex) {
			const norm = el("div");
			norm.style.color = accentHex;
			document.body.appendChild(norm);
			try {
				setVar("--accent-color", getComputedStyle(norm).color);
				window.__ACCENT_READY = true;
			} finally {
				norm.remove();
			}
		}
		const themeColors = defs[themeName]?.colors ?? {};
		const fromTheme = (token) => themeColors[token] ?? "";
		setVar("--bg-primary", fromTheme("editor.background"));
		setVar("--bg-secondary", fromTheme("editorGutter.background") || fromTheme("editor.lineHighlightBackground") || fromTheme("editor.background"));
		setVar("--bg-elevated", fromTheme("editorGutter.background") || fromTheme("editor.lineHighlightBackground") || fromTheme("editor.background"));
		setVar("--text-primary", fromTheme("editor.foreground"));
		setVar("--text-secondary", fromTheme("editorLineNumber.foreground"));
		setVar("--border-color", fromTheme("editorGroup.border"));
		const editorEl = document.querySelector(".monaco-editor");
		if (editorEl) {
			const cs = getComputedStyle(editorEl);
			if (!fromTheme("editor.background")) setVar("--bg-primary", cs.backgroundColor);
			if (!fromTheme("editorGutter.background") && !fromTheme("editor.lineHighlightBackground")) {
				const margin = document.querySelector(".monaco-editor .margin") ?? editorEl;
				setVar("--bg-secondary", getComputedStyle(margin).backgroundColor || cs.backgroundColor);
				setVar("--bg-elevated", getComputedStyle(margin).backgroundColor || cs.backgroundColor);
			}
			if (!fromTheme("editor.foreground")) setVar("--text-primary", getComputedStyle(document.body).color);
			if (!fromTheme("editorLineNumber.foreground")) {
				const rgbNums = cs.backgroundColor.match(/\d+/g);
				if (rgbNums && rgbNums.length >= 3) {
					const lum = (.2126 * +rgbNums[0] + .7152 * +rgbNums[1] + .0722 * +rgbNums[2]) / 255;
					document.documentElement.style.setProperty("--text-secondary", lum > .5 ? "#595c60" : "#858585");
				}
			}
		}
	}
	defineCustomThemes() {
		const defs = window.UI_THEME_DEFS ??= {};
		Object.entries(CUSTOM_THEMES).forEach(([name, theme]) => {
			monaco.editor.defineTheme(name, theme);
			defs[name] = theme;
		});
		this.userThemes.forEach((t) => {
			monaco.editor.defineTheme(t.id, t.data);
			defs[t.id] = t.data;
			window.UIThemeAccentsHex = {
				...window.UIThemeAccentsHex,
				[t.id]: t.accent_hex
			};
		});
	}
	renderProjectInfo() {
		const container = $$2("#project-info");
		if (!container) return;
		clearEl(container);
		if (this.context.title) {
			const t = this.context.title;
			container.appendChild(el("span", {
				className: "project-info-value",
				text: t,
				attrs: { title: t }
			}));
		}
		const wd = this.context.working_directory ?? "";
		const dirName = wd.split("/").pop() || wd;
		container.appendChild(el("span", {
			className: "project-info-value",
			text: dirName,
			attrs: { title: wd }
		}));
		if (this.context.git_branch) {
			container.appendChild(el("span", {
				className: "project-info-separator",
				text: "·"
			}));
			container.appendChild(el("span", {
				className: "project-info-value git-branch",
				text: this.context.git_branch
			}));
		}
		if (this.diff && (this.diff.commit_message || this.diff.commit_hash)) {
			container.appendChild(el("span", {
				className: "project-info-separator",
				text: "·"
			}));
			const mm = el("span", { className: "commit-message" });
			const rev = this.diff.commit_hash ? `${this.diff.commit_hash.substring(0, 7)}: ` : "";
			const firstLine = (this.diff.commit_message ?? "").split("\n")[0];
			appendLinkifiedText(mm, rev + firstLine);
			if (this.diff.commit_message) mm.title = this.diff.commit_message;
			mm.addEventListener("click", (ev) => {
				if (ev.target?.closest("a")) {
					ev.stopPropagation();
					return;
				}
				this.showCommitMessagePopover(ev.currentTarget, this.diff?.commit_message ?? "", this.diff?.commit_hash ?? "");
			});
			container.appendChild(mm);
		}
	}
	setupUI() {
		$$2("#file-list")?.addEventListener("click", (e) => {
			const li = e.target?.closest("li");
			if (li) {
				const dirKey = li.getAttribute("data-dir-key");
				if (dirKey) {
					if (this.collapsedDirs.has(dirKey)) this.collapsedDirs.delete(dirKey);
					else this.collapsedDirs.add(dirKey);
					this.renderFileList();
					return;
				}
				if (li.dataset.commit === "1") this.loadCommitView();
				else {
					const index = Number(li.dataset.index ?? -1);
					if (index >= 0) if (this.isStacked) this.scrollToFileInStacked(index);
					else this.loadFile(index);
				}
			}
		});
		$$2("#settings-btn")?.addEventListener("click", () => {
			this.showSettingsModal();
		});
		$$2("#help-btn")?.addEventListener("click", () => this.showKeyboardHelp());
		$$2("#submit-review")?.addEventListener("click", async () => {
			this.showSubmitConfirmation();
		});
		$$2("#toggle-view")?.addEventListener("click", () => {
			this.isInline = !this.isInline;
			this.loadFile(this.currentFileIndex);
		});
		$$2("#toggle-stacked")?.addEventListener("click", () => {
			this.toggleStackedView();
		});
		const statsEl = $$2("#stats");
		if (statsEl) statsEl.textContent = `${this.stats.files_changed} files, +${this.stats.additions} -${this.stats.deletions}`;
		if (this.context.is_public) {
			const b = $$2("#public-banner");
			if (b) b.style.display = "";
		}
		if (this.context.claude_skill_installed === false) {
			const banner = $$2("#skill-banner");
			const installBtn = $$2("#skill-install-btn");
			const dismissBtn = $$2("#skill-dismiss-btn");
			if (banner) {
				banner.style.display = "";
				const hide = () => {
					banner.style.display = "none";
				};
				dismissBtn?.addEventListener("click", hide);
				installBtn?.addEventListener("click", async () => {
					installBtn.disabled = true;
					installBtn.textContent = "Installing…";
					try {
						if ((await fetch("/api/install-skill", { method: "POST" })).ok) hide();
						else {
							installBtn.textContent = "Failed — try again";
							installBtn.disabled = false;
						}
					} catch {
						installBtn.textContent = "Failed — try again";
						installBtn.disabled = false;
					}
				});
			}
		}
		this.setupSidebarResizer();
		this.setupCommitStripResizer();
		this.setupFileListControls();
		this.setupKeyboardShortcuts();
	}
};
applyMixin(MonacoApp, FileDataMethods);
applyMixin(MonacoApp, FileListMethods);
applyMixin(MonacoApp, FileLoadingMethods);
applyMixin(MonacoApp, NavigationMethods);
applyMixin(MonacoApp, CommitMethods);
applyMixin(MonacoApp, CommentsUIMethods);
applyMixin(MonacoApp, ReviewNoteMethods);
applyMixin(MonacoApp, DialogMethods);
applyMixin(MonacoApp, SeriesMethods);
applyMixin(MonacoApp, StackedViewMethods);

//#endregion
//#region web/src/main.ts
document.title = "lrv — Loading…";
window.DEBUG = false;
window.__APP_READY = false;
if (window.DEBUG) window.addEventListener("error", function(e) {
	console.info("[onerror]", e.message, e.filename, e.lineno, e.colno);
});
performance.mark("page:script-start");
window.addEventListener("DOMContentLoaded", () => {
	performance.mark("page:dom-content-loaded");
}, { once: true });
window.addEventListener("load", () => {
	performance.mark("page:load-event");
}, { once: true });
const app = new MonacoApp();
window.__APP = app;
app.init().then(() => {
	if (window.DEBUG) console.info("Monaco Editor initialized");
});

//#endregion