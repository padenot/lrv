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
				foreground: "586e75",
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
			"editor.inactiveSelectionBackground": "#073642"
		}
	},
	"solarized-light": {
		base: "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "93a1a1",
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
			"editor.inactiveSelectionBackground": "#eee8d5"
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
			"editor.inactiveSelectionBackground": "#1c1b22"
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
			"editor.inactiveSelectionBackground": "#f0f0f0"
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
			"editor.inactiveSelectionBackground": "#1f6feb40"
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
			"editor.inactiveSelectionBackground": "#0969da20"
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
	"hc-light": "#007acc"
};
window.UIThemeAccentsHex = UI_THEME_ACCENTS_HEX;

//#endregion
//#region web/src/dom.ts
const $ = (sel, root = document) => root.querySelector(sel);
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
	constructor() {
		this.comments = [];
		this.listeners = [];
	}
	addComment(comment) {
		this.comments.push(comment);
		this.notifyListeners();
	}
	removeComment(index) {
		this.comments.splice(index, 1);
		this.notifyListeners();
	}
	findComment(file, line, side) {
		return this.comments.findIndex((c) => c.file === file && c.side === side && commentContainsLine(c, line));
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
		return this.comments.filter((c) => c.file === file);
	}
	onChange(listener) {
		this.listeners.push(listener);
	}
	notifyListeners() {
		this.listeners.forEach((l) => l());
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
	auto_close_tab: true
};
function resolveAppConfig(input) {
	return {
		color_scheme: input.color_scheme ?? DEFAULT_APP_CONFIG.color_scheme,
		font: input.font?.trim() || DEFAULT_APP_CONFIG.font,
		split_view: input.split_view ?? DEFAULT_APP_CONFIG.split_view,
		auto_close_tab: input.auto_close_tab ?? DEFAULT_APP_CONFIG.auto_close_tab
	};
}

//#endregion
//#region web/src/ui-signals.ts
let navTimer = null;
const FIRST_LINE_SELECTOR = ".monaco-editor .view-lines .view-line";
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
function appendLinkifiedText(target, text) {
	target.textContent = "";
	target.appendChild(linkifyText(text));
}
function linkifyText(text) {
	const fragment = document.createDocumentFragment();
	const matches = [];
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
	contextLineCount: 3,
	minimumLineCount: 3,
	revealLineCount: 20
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
	async fetchFilePair(filePath) {
		if (this.fileCache[filePath]) return this.fileCache[filePath];
		const [oldData, newData] = await Promise.all([fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=old`).catch((err) => {
			if (window.DEBUG) console.error("[app] old fetch failed", err);
			return { content: "" };
		}), fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=new`).catch((err) => {
			if (window.DEBUG) console.error("[app] new fetch failed", err);
			return { content: "" };
		})]);
		this.fileCache[filePath] = {
			old: oldData.content ?? "",
			new: newData.content ?? ""
		};
		return this.fileCache[filePath];
	}
	async eagerPrefetchAllFiles() {
		if (this._eagerPrefetchStarted) return;
		this._eagerPrefetchStarted = true;
		const toFetch = this.files.map((f) => f.path).filter((p) => !this.fileCache[p]);
		if (toFetch.length === 0) return;
		if (window.DEBUG) console.info("[prefetch] warming", toFetch.length, "files");
		const concurrency = 8;
		let i = 0;
		const nextBatch = () => {
			const batch = [];
			for (let k = 0; k < concurrency && i < toFetch.length; k++, i++) {
				const p = toFetch[i];
				batch.push(Promise.all([fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=old`), fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=new`)]).then(([oldData, newData]) => {
					this.fileCache[p] = {
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
//#region web/src/file-list-methods.ts
var FileListMethods = class {
	setupSidebarResizer() {
		const sidebar = document.getElementById("sidebar");
		const resizer = document.getElementById("sidebar-resizer");
		if (!sidebar || !resizer) return;
		let isResizing = false;
		resizer.addEventListener("mousedown", (e) => {
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
	renderFileList() {
		const list = document.getElementById("file-list");
		if (!list) return;
		clearEl(list);
		if (this.diff !== null && (this.diff.commit_message || this.diff.commit_hash)) {
			const li = el("li", {
				className: this.currentFileIsCommit ? "active" : "",
				attrs: { "data-commit": "1" }
			});
			const left = el("span", { className: "file-left" }, [el("span", { text: "Commit" })]);
			const right = el("span", { className: "file-right" });
			const commentCount = this.commentManager.getCommentsForFile("(commit)").length;
			if (commentCount > 0) left.appendChild(el("span", {
				className: "file-comment-badge",
				text: String(commentCount)
			}));
			right.appendChild(el("span", {
				className: "file-status",
				text: "C"
			}));
			li.appendChild(left);
			li.appendChild(right);
			list.appendChild(li);
		}
		this.files.forEach((file, index) => {
			const li = el("li", {
				className: !this.currentFileIsCommit && index === this.currentFileIndex ? "active" : "",
				attrs: { "data-index": index }
			});
			const left = el("span", { className: "file-left" });
			const name = el("span");
			if (file.status === "renamed" && file.old_path) name.textContent = `${file.old_path} → ${file.path}`;
			else name.textContent = file.path;
			left.appendChild(name);
			const commentCount = this.commentManager.getCommentsForFile(file.path).length;
			if (commentCount > 0) left.appendChild(el("span", {
				className: "file-comment-badge",
				text: String(commentCount)
			}));
			const right = el("span", { className: "file-right" });
			const added = file.hunks.reduce((acc, h) => acc + h.lines.filter((line) => line.type === "add").length, 0);
			const deleted = file.hunks.reduce((acc, h) => acc + h.lines.filter((line) => line.type === "delete").length, 0);
			right.appendChild(el("span", { className: "file-delta" }, [
				el("span", {
					className: "delta-add",
					text: `+${added}`
				}),
				" ",
				el("span", {
					className: "delta-del",
					text: `-${deleted}`
				})
			]));
			right.appendChild(el("span", {
				className: `file-status ${file.status}`,
				text: file.status.charAt(0).toUpperCase()
			}));
			li.appendChild(left);
			li.appendChild(right);
			list.appendChild(li);
		});
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
var FileLoadingMethods = class {
	getCurrentFile(index) {
		return this.files[index];
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
		const theme = this.config.color_scheme;
		const container = document.getElementById("editor-container");
		if (!container) return;
		if (this._commitViewEl) {
			this._commitViewEl.style.display = "none";
			container.style.display = "";
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
			fontSize: 13,
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
		const filePair = this.fileCache[file.path];
		const oldContent = filePair.old;
		const newContent = filePair.new;
		const language = detectLanguageFromPathAndContent(file.path || file.old_path || "", newContent || oldContent);
		const oldBanner = $("#old-missing-banner");
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
		diffEditor.setModel({
			original: this.originalModel,
			modified: this.modifiedModel
		});
		window.Perf.mark("loadFile:setModel:end");
		window.Perf.measure("loadFile:setModel", "loadFile:setModel:start", "loadFile:setModel:end");
		const scrollReset = diffEditor.onDidUpdateDiff(() => {
			scrollReset.dispose();
			diffEditor.getModifiedEditor().setScrollTop(0);
			diffEditor.getOriginalEditor().setScrollTop(0);
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
		this.applyInitialHunkFocus(file.path);
	}
	setupEditorClickHandlers(filePath, modifiedEditor, originalEditor) {
		modifiedEditor.onMouseDown((e) => {
			if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
				if (!e.target.position) return;
				const monacoLine = e.target.position.lineNumber;
				this.showCommentDialog(filePath, monacoLine, monacoLine, "new");
			}
		});
		originalEditor.onMouseDown((e) => {
			if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
				if (!e.target.position) return;
				const monacoLine = e.target.position.lineNumber;
				this.showCommentDialog(filePath, monacoLine, monacoLine, "old");
			}
		});
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
		let key = "";
		for (const part of parts) if (part === "Mod") needsMod = true;
		else if (part === "Shift") needsShift = true;
		else key = part;
		if (needsMod !== modKey) return false;
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
		const meta = el("div");
		meta.style.color = "var(--text-secondary)";
		meta.style.fontSize = "11px";
		meta.style.marginBottom = "12px";
		meta.textContent = this.diff?.commit_hash ?? "";
		viewEl.appendChild(meta);
		const msgLines = (this.diff?.commit_message ?? "(no message)").split("\n");
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
		const commentsHeader = el("h3", { text: "Comments" });
		commentsHeader.style.marginTop = "24px";
		commentsHeader.style.fontSize = "14px";
		viewEl.appendChild(commentsHeader);
		const list = el("div");
		const comments = this.commentManager.getCommentsForFile("(commit)");
		if (comments.length === 0) {
			const empty = el("div");
			empty.style.color = "var(--text-secondary)";
			empty.style.fontSize = "12px";
			empty.style.padding = "8px 0";
			empty.textContent = "No comments yet. Click a line in the message above to add one.";
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
			lineLabel.textContent = `Line ${commentLineLabel(c)}`;
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
		const ta = el("textarea");
		ta.rows = 4;
		ta.style.width = "100%";
		ta.style.fontFamily = "var(--font-sans)";
		ta.style.fontSize = "13px";
		ta.style.padding = "8px";
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
	showCommentDialog(file, fileLineNumber, monacoLineNumber, side) {
		if (!this.editor) return;
		const targetEditor = side === "new" ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
		if (this.currentWidget) {
			if (this.currentWidgetEditor) this.currentWidgetEditor.removeContentWidget(this.currentWidget);
			this.currentWidget = null;
			this.currentWidgetEditor = null;
		}
		const existingIndex = this.commentManager.findComment(file, fileLineNumber, side);
		const existingComment = existingIndex >= 0 ? this.commentManager.comments[existingIndex] : null;
		const domNode = el("div", { className: "inline-comment-box" });
		const modKey = MOD_KEY_LABEL;
		const title = el("h3", { text: `Line ${existingComment ? commentLineLabel(existingComment) : fileLineNumber}${existingComment ? " - Edit" : ""}` });
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
		this.currentWidget = widget;
		this.currentWidgetEditor = targetEditor;
		const saveBtn = domNode.querySelector(".save-btn");
		const cancelBtn = domNode.querySelector(".cancel-btn");
		if (existingComment) textarea.value = existingComment.body;
		const handleKeydown = (e) => {
			if (e.key === "Escape") cleanup();
			else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				saveComment();
			}
		};
		document.addEventListener("keydown", handleKeydown);
		const cleanup = () => {
			targetEditor.removeContentWidget(widget);
			this.currentWidget = null;
			document.removeEventListener("keydown", handleKeydown);
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
					line: fileLineNumber,
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
		setTimeout(() => textarea.focus(), 100);
	}
	updateUI() {
		const count = this.commentManager.getComments().length;
		const countEl = document.getElementById("comment-count");
		if (countEl) countEl.textContent = count.toString();
		this.renderFileList();
	}
};

//#endregion
//#region web/src/dialog-methods.ts
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
			optGroup("Solarized", [["solarized-dark", "Solarized Dark"], ["solarized-light", "Solarized Light"]])
		]);
		const themeField = el("div", { className: "settings-field" }, [el("label", {
			attrs: { for: "color-scheme" },
			text: "Theme"
		}), colorSelect]);
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
				auto_close_tab: formData.get("auto_close_tab") === "on"
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
		let submit = () => {};
		const footerContent = [el("button", {
			className: "btn-secondary cancel-submit-btn",
			text: "Cancel"
		}), el("button", {
			className: "btn-primary confirm-submit-btn",
			text: "Submit Review"
		})];
		const { overlay, modal, body, footer, close } = openModal({
			title: comments.length === 0 ? "Submit Review" : `Review Comments (${comments.length})`,
			titleId: "submit-title",
			footerContent,
			onKeydown: (e) => {
				if (e.key === "Enter" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					submit();
				}
			}
		});
		if (comments.length === 0) {
			const noCommentsMsg = el("p", { text: "No comments. Submit to approve this review." });
			noCommentsMsg.style.padding = "20px";
			noCommentsMsg.style.textAlign = "center";
			noCommentsMsg.style.color = "var(--text-secondary)";
			body.appendChild(noCommentsMsg);
		}
		const commentsByFile = {};
		comments.forEach((comment) => {
			commentsByFile[comment.file] ??= [];
			commentsByFile[comment.file].push(comment);
		});
		const fileContents = {};
		await Promise.all(Object.keys(commentsByFile).map(async (filePath) => {
			const fileComments = commentsByFile[filePath] ?? [];
			const sides = [...new Set(fileComments.map((c) => c.side))];
			for (const side of sides) {
				const key = `${filePath}:${side}`;
				try {
					const data = await fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=${side}`);
					fileContents[key] = String(data.content ?? "").split("\n");
				} catch (err) {
					console.error(`Failed to fetch ${key}:`, err);
					fileContents[key] = [];
				}
			}
		}));
		comments.forEach((comment) => {
			const preview = el("div", { className: "comment-preview" });
			const previewHeader = el("div", {
				className: "comment-preview-header",
				text: `${comment.file}:${commentLineLabel(comment)} (${comment.side})`
			});
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
				lineDiv.textContent = line || " ";
				codeBlock.appendChild(lineDiv);
			});
			const commentText = el("div", {
				className: "comment-preview-text",
				text: comment.body
			});
			preview.appendChild(previewHeader);
			preview.appendChild(codeBlock);
			preview.appendChild(commentText);
			body.appendChild(preview);
		});
		submit = async () => {
			const submitBtn = footer.querySelector(".confirm-submit-btn");
			if (!submitBtn) return;
			submitBtn.disabled = true;
			submitBtn.textContent = "Submitting...";
			try {
				const resp = await fetch("/api/complete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ comments })
				});
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
	currentFileIndex;
	editor;
	isInline;
	modifiedDecorations;
	originalDecorations;
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
	constructor() {
		this.commentManager = new CommentManager();
		this.currentFileIndex = 0;
		this.editor = null;
		this.isInline = false;
		this.modifiedDecorations = [];
		this.originalDecorations = [];
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
		this.fileHunks = {};
		this.currentHunkIndex = {};
		this.config = DEFAULT_APP_CONFIG;
		this.originalModel = null;
		this.modifiedModel = null;
		this._eagerPrefetchStarted = false;
		this._commitPopoverEl = null;
		this.currentFileIsCommit = false;
		this._commitViewEl = null;
		this.commentManager.onChange(() => this.updateUI());
	}
	async init() {
		if (window.DEBUG) console.info("[app] init: start");
		window.Perf.recordAppInitStart();
		window.Perf.mark("init:start");
		if (performance.getEntriesByName("page:script-start").length > 0) window.Perf.measure("page:script-to-init-start", "page:script-start", "init:start");
		window.Perf.mark("init:fetch:start");
		const t0 = performance.now();
		const [configData, contextData, diffData] = await Promise.all([
			fetchJSON("/api/config"),
			fetchJSON("/api/context"),
			fetchJSON("/api/diff"),
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
		this.diff = diffData;
		this.files = diffData.files;
		this.stats = diffData.stats;
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
				const hex = (window.UIThemeAccentsHex ?? {})[this.config.color_scheme];
				if (hex) {
					const norm = el("div");
					norm.style.color = hex;
					document.body.appendChild(norm);
					try {
						const rgb = getComputedStyle(norm).color;
						if (rgb) document.documentElement.style.setProperty("--accent-color", rgb);
					} finally {
						norm.remove();
					}
					window.__ACCENT_READY = true;
				}
				window.Perf.mark("init:ui-setup:start");
				this.setupUI();
				window.Perf.mark("init:ui-setup:end");
				window.Perf.measure("init:ui-setup", "init:ui-setup:start", "init:ui-setup:end");
				window.Perf.mark("init:file-list:render:start");
				this.renderFileList();
				window.Perf.mark("init:file-list:render:end");
				window.Perf.measure("init:file-list:render", "init:file-list:render:start", "init:file-list:render:end");
				if (window.DEBUG) console.info("[app] calling loadFile(0)");
				window.Perf.mark("init:first-file:load:start");
				Promise.resolve(this.loadFile(0)).then(() => {
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
	applyThemeToUI(themeName) {
		const setVar = (k, v) => {
			if (v) document.documentElement.style.setProperty(k, v);
		};
		const def = (window.UI_THEME_DEFS ?? {})[themeName];
		if (def && Array.isArray(def.rules)) {
			const kw = def.rules.find((r) => r && r.token === "keyword" && r.foreground);
			if (kw && kw.foreground) {
				const hex = "#" + String(kw.foreground).replace(/^#/, "");
				const norm = el("div");
				norm.style.color = hex;
				document.body.appendChild(norm);
				try {
					setVar("--accent-color", getComputedStyle(norm).color);
					window.__ACCENT_READY = true;
				} finally {
					norm.remove();
				}
			}
		}
		const editorEl = document.querySelector(".monaco-editor");
		if (editorEl) {
			const cs = getComputedStyle(editorEl);
			setVar("--bg-primary", cs.backgroundColor);
			const overlay = document.querySelector(".monaco-editor .margin") ?? editorEl;
			const cs2 = getComputedStyle(overlay);
			setVar("--bg-secondary", cs2.backgroundColor || cs.backgroundColor);
			setVar("--bg-elevated", cs2.backgroundColor || cs.backgroundColor);
			setVar("--text-primary", getComputedStyle(document.body).color);
			setVar("--text-secondary", "");
		}
	}
	defineCustomThemes() {
		const defs = window.UI_THEME_DEFS ??= {};
		Object.entries(CUSTOM_THEMES).forEach(([name, theme]) => {
			monaco.editor.defineTheme(name, theme);
			defs[name] = theme;
		});
	}
	renderProjectInfo() {
		const container = $("#project-info");
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
		$("#file-list")?.addEventListener("click", (e) => {
			const li = e.target?.closest("li");
			if (li) if (li.dataset.commit === "1") this.loadCommitView();
			else {
				const index = Number(li.dataset.index ?? -1);
				if (index >= 0) this.loadFile(index);
			}
		});
		$("#settings-btn")?.addEventListener("click", () => {
			this.showSettingsModal();
		});
		$("#help-btn")?.addEventListener("click", () => this.showKeyboardHelp());
		$("#submit-review")?.addEventListener("click", async () => {
			this.showSubmitConfirmation();
		});
		$("#toggle-view")?.addEventListener("click", () => {
			this.isInline = !this.isInline;
			this.loadFile(this.currentFileIndex);
		});
		const statsEl = $("#stats");
		if (statsEl) statsEl.textContent = `${this.stats.files_changed} files, +${this.stats.additions} -${this.stats.deletions}`;
		if (this.context.is_public) {
			const b = $("#public-banner");
			if (b) b.style.display = "";
		}
		this.setupSidebarResizer();
		this.setupKeyboardShortcuts();
	}
};
applyMixin(MonacoApp, FileDataMethods);
applyMixin(MonacoApp, FileListMethods);
applyMixin(MonacoApp, FileLoadingMethods);
applyMixin(MonacoApp, NavigationMethods);
applyMixin(MonacoApp, CommitMethods);
applyMixin(MonacoApp, CommentsUIMethods);
applyMixin(MonacoApp, DialogMethods);

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