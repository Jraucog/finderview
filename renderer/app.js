/* ═══════════════════════════════════════════════════════════════════════════
   FinderView — app.js  (2026 — VS Code tree + column resize + inline editor)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Column definitions ──────────────────────────────────────────────────────── */
function escapeHTML(str) { return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
const COL_DEFS = [
  { id:'name',      label:'Nombre',     required:true,  cssVar:'--col-w-name',      sort: e=>e.name.toLowerCase() },
  { id:'mtime',     label:'Modificado', required:false, cssVar:'--col-w-mtime',     sort: e=>e.mtime||'' },
  { id:'size',      label:'Tamaño',     required:false, cssVar:'--col-w-size',      sort: e=>e.size||0 },
  { id:'type',      label:'Tipo',       required:false, cssVar:'--col-w-type',      sort: e=>fileTypeLabel(e.name,e.isDir) },
  { id:'birthtime', label:'Creado',     required:false, cssVar:'--col-w-birthtime', sort: e=>e.birthtime||'' },
  { id:'ext',       label:'Extensión',  required:false, cssVar:'--col-w-ext',       sort: e=>getExt(e.name) },
];

/* ── App state ───────────────────────────────────────────────────────────────── */
const state = {
  currentPath:   null,
  treeItems:     [],   // flat visible tree: [{entry, level, expanded, childrenLoaded, children}]
  entries:       [],   // raw entries of currentPath (level 0)
  selectedFile:  null,
  selectedItems: new Set(),
  focusedIdx:    -1,
  theme:        'default',
  viewMode:     'list',
  sort:          { col:'name', dir:'asc' },
  visibleCols:   ['name','mtime','size'],
  colWidths:     {},   // colId → px (overrides CSS default)
  showHidden:    false,
  compactMode:   false,
  compactSidebar:false,
  sidebarVisible:true,
  showRecents:   false,
  showFrequents: false,
  searchQuery:   '',
  homeDirs:      {},
  icloudPath:    null,
  favorites:     [],
  fileTags:      {},
  dragSrcEl:     null,
  renaming:      false,
  editorEntry:   null,  // currently open file in editor
  editorModified:false,
  editorSaveFn:  null,
};

/* ── File type utils ─────────────────────────────────────────────────────────── */
const AUDIO_EXTS = new Set(['mp3','wav','flac','aif','aiff','m4a','ogg','opus','wma']);
const IMAGE_EXTS = new Set(['jpg','jpeg','png','gif','webp','svg','heic','bmp','tiff','avif','ico']);
const VIDEO_EXTS = new Set(['mp4','mov','avi','mkv','webm','m4v','flv','wmv']);
const TEXT_EXTS  = new Set(['txt','md','js','ts','jsx','tsx','mjs','cjs','py','rb','go','rs','java','c','cpp','h','hpp','cs','html','htm','css','scss','less','json','xml','yaml','yml','sh','bash','zsh','fish','log','ini','toml','env','conf','cfg','csv','sql','graphql','vue','svelte','kt','swift','r','m','mm','pl','lua','dart','ex','exs','erl','clj','hs','fs','ml','nim','v','zig','tex','gitignore','dockerfile','makefile','editorconfig']);

function getExt(name)  { return (name.split('.').pop()||'').toLowerCase(); }
function isAudio(n)    { return AUDIO_EXTS.has(getExt(n)); }
function isImage(n)    { return IMAGE_EXTS.has(getExt(n)); }
function isVideo(n)    { return VIDEO_EXTS.has(getExt(n)); }
function isText(n)     { return TEXT_EXTS.has(getExt(n)); }
function isPDF(n)      { return getExt(n)==='pdf'; }

function fileTypeLabel(name, isDir) {
  if (isDir) return 'Carpeta';
  const e=getExt(name);
  const M={mp3:'Audio MP3',wav:'Audio WAV',flac:'Audio FLAC',aif:'Audio AIFF',aiff:'Audio AIFF',m4a:'Audio M4A',ogg:'Audio OGG',mp4:'Video MP4',mov:'Video QuickTime',avi:'Video AVI',mkv:'Video MKV',webm:'Video WebM',jpg:'Imagen JPEG',jpeg:'Imagen JPEG',png:'Imagen PNG',gif:'Imagen GIF',webp:'Imagen WebP',svg:'SVG',heic:'Imagen HEIC',pdf:'PDF',doc:'Word',docx:'Word',txt:'Texto',md:'Markdown',xls:'Excel',xlsx:'Excel',csv:'CSV',zip:'ZIP',rar:'RAR',app:'Aplicación',dmg:'Imagen de disco',js:'JavaScript',ts:'TypeScript',py:'Python',html:'HTML',css:'CSS',json:'JSON',sh:'Shell Script',swift:'Swift',kt:'Kotlin',rs:'Rust',go:'Go',java:'Java',c:'C',cpp:'C++'};
  return M[e]||(e?e.toUpperCase():'Archivo');
}
function fileIcon(name, isDir) {
  if (isDir) return '📁';
  const e=getExt(name);
  const M={mp3:'🎵',wav:'🎵',flac:'💿',aif:'🎵',aiff:'🎵',m4a:'🎵',ogg:'🎵',mp4:'🎬',mov:'🎬',avi:'🎬',mkv:'🎬',webm:'🎬',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',heic:'🖼️',pdf:'📄',doc:'📝',docx:'📝',txt:'📝',md:'📝',xls:'📊',xlsx:'📊',csv:'📊',zip:'🗜️',rar:'🗜️',tar:'🗜️',gz:'🗜️',app:'⚙️',dmg:'💿',pkg:'📦',js:'📜',ts:'📜',py:'🐍',html:'🌐',css:'🎨',json:'📋',sh:'🖥️',swift:'🍎',kt:'🤖',rs:'🦀',go:'🐹',java:'☕',c:'⚡',cpp:'⚡'};
  return M[e]||'📄';
}
function audioArt(n) { return ['flac','alac'].includes(getExt(n))?'💿':['wav','aif','aiff'].includes(getExt(n))?'🎤':'🎵'; }

function formatSize(b) { if(!b&&b!==0)return'—'; if(b<1024)return`${b} B`; if(b<1024**2)return`${(b/1024).toFixed(1)} KB`; if(b<1024**3)return`${(b/1024**2).toFixed(1)} MB`; return`${(b/1024**3).toFixed(2)} GB`; }
function formatDate(iso) { if(!iso)return'—'; return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function formatTime(s)  { if(isNaN(s))return'—'; return`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }
function escapeHTML(s)  { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/* ── Persistence ─────────────────────────────────────────────────────────────── */
function setTheme(t) { document.documentElement.dataset.theme = t; }
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('fv-settings')||'{}');
    if(s.sort)        state.sort        = s.sort;
    if(s.visibleCols) state.visibleCols = s.visibleCols;
    if(s.viewMode)    state.viewMode    = s.viewMode;
    if(s.showHidden!==undefined) state.showHidden=s.showHidden;
    if(s.compactMode!==undefined) state.compactMode=s.compactMode;
    if(s.compactSidebar!==undefined) state.compactSidebar=s.compactSidebar;
    if(s.sidebarVisible!==undefined) state.sidebarVisible=s.sidebarVisible;
    if(s.showRecents!==undefined) state.showRecents=s.showRecents;
    if(s.showFrequents!==undefined) state.showFrequents=s.showFrequents;
    if(s.theme) state.theme = s.theme;
    if(s.fileTags)    state.fileTags    = s.fileTags;
    if(s.colWidths)   state.colWidths   = s.colWidths;
    // Apply saved column widths to CSS
    setTheme(state.theme);
    Object.entries(state.colWidths).forEach(([id,w])=>{
      const def=COL_DEFS.find(c=>c.id===id); if(def?.cssVar) document.documentElement.style.setProperty(def.cssVar, w+'px');
    });
  } catch(_) {}
}
function saveSettings() {
  localStorage.setItem('fv-settings', JSON.stringify({
    sort:state.sort, visibleCols:state.visibleCols, viewMode:state.viewMode, theme:state.theme,
    showHidden:state.showHidden, compactMode:state.compactMode, compactSidebar:state.compactSidebar,
    sidebarVisible:state.sidebarVisible, showRecents:state.showRecents, showFrequents:state.showFrequents,
    fileTags:state.fileTags, colWidths:state.colWidths,
  }));
}
function loadFavorites() { try { const s=localStorage.getItem('fv-favorites'); return s?JSON.parse(s):null; } catch(_){return null;} }
function saveFavorites() { localStorage.setItem('fv-favorites',JSON.stringify(state.favorites)); }
function getDefaultFavorites(h) {
  return [{label:'Escritorio',path:h.desktop,icon:'🖥️'},{label:'Descargas',path:h.downloads,icon:'⬇️'},{label:'Documentos',path:h.documents,icon:'📄'},{label:'Imágenes',path:h.pictures,icon:'🖼️'},{label:'Música',path:h.music,icon:'🎵'},{label:'Películas',path:h.movies,icon:'🎬'},{label:'Aplicaciones',path:h.applications,icon:'🚀'}].filter(f=>f.path);
}

/* ── Sort & filter (applied to any entries array) ────────────────────────────── */
function sortAndFilterEntries(entries) {
  const def = COL_DEFS.find(c=>c.id===state.sort.col)||COL_DEFS[0];
  const dir = state.sort.dir==='asc'?1:-1;
  let list  = [...entries];
  if (state.smartFilter) {
    const exts = {
      image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
      audio: ["mp3", "wav", "m4a", "flac", "ogg"],
      video: ["mp4", "mkv", "mov", "avi", "webm"],
      doc: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "md", "csv"]
    }[state.smartFilter];
    if (exts) list = list.filter(e => e.isDir || exts.includes(e.name.split('.').pop().toLowerCase()));
  }
  if (!state.showHidden) list=list.filter(e=>!e.name.startsWith('.'));
  if (state.searchQuery && !state.searchResults) { const q=state.searchQuery.toLowerCase(); list=list.filter(e=>e.name.toLowerCase().includes(q)); }
  list.sort((a,b)=>{ if(a.isDir!==b.isDir) return a.isDir?-1:1; const av=def.sort(a),bv=def.sort(b); if(av<bv)return-dir; if(av>bv)return dir; return 0; });
  return list;
}

function colValue(colId, entry) {
  switch(colId) {
    case 'name':      return entry.name;
    case 'type':      return fileTypeLabel(entry.name,entry.isDir);
    case 'mtime':     return formatDate(entry.mtime);
    case 'birthtime': return formatDate(entry.birthtime);
    case 'size':      return entry.isDir?'—':formatSize(entry.size);
    case 'ext':       return entry.isDir?'—':'.'+getExt(entry.name);
    default:          return '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLUMN RESIZE
   ═══════════════════════════════════════════════════════════════════════════ */
let _rzHandle = null; // the handle being dragged

function initColResize(handle, colId, def, th) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    _rzHandle = handle; handle.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;

    const onMove = (me) => {
      const delta = me.clientX - startX;
      const newW  = Math.max(45, Math.round(startW + delta));
      state.colWidths[colId] = newW;
      if (def.cssVar) document.documentElement.style.setProperty(def.cssVar, newW+'px');
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (_rzHandle) { _rzHandle.classList.remove('resizing'); _rzHandle=null; }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveSettings();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/* ── Render column headers ───────────────────────────────────────────────────── */
function renderColHeaders() {
  const hdr = document.getElementById('col-headers');
  hdr.innerHTML = '';
  if (state.viewMode === 'grid') return;

  state.visibleCols.forEach((colId) => {
    const def = COL_DEFS.find(c => c.id === colId);
    if (!def) return;

    // Adding col-{id} class gives the header the SAME width as file-row cells (CSS vars)
    const th = document.createElement('div');
    th.className = `col-head col-${colId}${colId === state.sort.col ? ' sorted' : ''}`;
    th.dataset.col = colId;

    const label  = document.createElement('span'); label.textContent = def.label;
    const sortIco = document.createElement('span'); sortIco.className = 'col-sort-icon';
    sortIco.innerHTML = colId === state.sort.col
      ? (state.sort.dir === 'asc'
          ? `<svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M4 1L7 5H1L4 1z" fill="currentColor"/></svg>`
          : `<svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M4 5L1 1H7L4 5z" fill="currentColor"/></svg>`)
      : '';
    th.appendChild(label); th.appendChild(sortIco);
    th.addEventListener('click', () => setSort(colId));
    hdr.appendChild(th);

    // Resize handle = sibling flex item (NOT inside col-head)
    const rh = document.createElement('div'); rh.className = 'col-rz-handle';
    initColResize(rh, colId, def, th);
    hdr.appendChild(rh);
  });
}


function setSort(colId) {
  if (state.sort.col===colId) state.sort.dir = state.sort.dir==='asc'?'desc':'asc';
  else { state.sort.col=colId; state.sort.dir='asc'; }
  saveSettings(); renderColHeaders(); rerenderTree();
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */
function chevronSVG() { return `<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 1.5L4.5 6L8 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

function getRecents() {
  try { return JSON.parse(localStorage.getItem('fv-recents') || '[]'); } catch(_) { return []; }
}

function getFrequents() {
  try {
    const map = JSON.parse(localStorage.getItem('fv-frequents') || '{}');
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  } catch(_) { return []; }
}

function trackNavigationStats(dirPath) {
  if (!dirPath || dirPath === '/' || dirPath === '.') return;
  try {
    // 1. Recents: top 5 unique visited paths
    let recents = getRecents().filter(p => p !== dirPath);
    recents.unshift(dirPath);
    if (recents.length > 5) recents = recents.slice(0, 5);
    localStorage.setItem('fv-recents', JSON.stringify(recents));

    // 2. Frequents: path -> frequency counter
    let map = JSON.parse(localStorage.getItem('fv-frequents') || '{}');
    map[dirPath] = (map[dirPath] || 0) + 1;
    localStorage.setItem('fv-frequents', JSON.stringify(map));

    updateRecentsFrequentsSidebar();
  } catch(_) {}
}

function updateRecentsFrequentsSidebar() {
  buildRecentsSection();
  buildFrequentsSection();
}

function formatPathDisplay(path) {
  if (!path) return '';
  if (state.icloudPath && path.startsWith(state.icloudPath)) {
    const rel = path.slice(state.icloudPath.length).replace(/^\//, '');
    return rel ? `iCloud: ${rel}` : 'iCloud Drive';
  }
  if (path.includes('com~apple~CloudDocs')) {
    const rel = path.split('com~apple~CloudDocs').pop().replace(/^\//, '');
    return rel ? `iCloud: ${rel}` : 'iCloud Drive';
  }
  if (state.homeDirs.home && path === state.homeDirs.home) return 'Inicio (Home)';
  const last = path.split('/').filter(Boolean).pop();
  return last || path;
}

function buildRecentsSection() {
  const inner = document.getElementById('sidebar-inner');
  if (!inner) return;
  document.getElementById('recents-section')?.remove();
  if (!state.showRecents) return;
  const recents = getRecents();
  if (!recents.length) return;

  const section = document.createElement('div');
  section.className = 'sidebar-section';
  section.id = 'recents-section';

  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  const title = document.createElement('div');
  title.className = 'sidebar-section-title';
  title.textContent = 'Recientes';

  const actions = document.createElement('div');
  actions.className = 'sidebar-header-actions';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'sidebar-header-btn';
  clearBtn.title = 'Borrar recientes';
  clearBtn.innerHTML = `<span style="font-size:10px;">✕</span>`;
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.removeItem('fv-recents');
    section.remove();
  });
  actions.appendChild(clearBtn);

  header.appendChild(title);
  header.appendChild(actions);
  section.appendChild(header);

  recents.forEach(path => {
    const name = formatPathDisplay(path);
    const el = document.createElement('div');
    el.className = 'sidebar-item';
    el.dataset.path = path;
    const row = document.createElement('div');
    row.className = 'sidebar-item-row';
    row.innerHTML = `<span class="sidebar-icon">🕒</span><span class="sidebar-label" title="${escapeHTML(path)}">${escapeHTML(name)}</span>`;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSidebarItem(el);
      navigateTo(path);
    });
    el.appendChild(row);
    section.appendChild(el);
  });

  const frequentsSection = document.getElementById('frequents-section');
  const homeSection = document.getElementById('home-section');
  if (frequentsSection) {
    inner.insertBefore(section, frequentsSection);
  } else if (homeSection) {
    inner.insertBefore(section, homeSection);
  } else {
    inner.appendChild(section);
  }
}

function buildFrequentsSection() {
  const inner = document.getElementById('sidebar-inner');
  if (!inner) return;
  document.getElementById('frequents-section')?.remove();
  if (!state.showFrequents) return;
  const frequents = getFrequents();
  if (!frequents.length) return;

  const section = document.createElement('div');
  section.className = 'sidebar-section';
  section.id = 'frequents-section';

  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  const title = document.createElement('div');
  title.className = 'sidebar-section-title';
  title.textContent = 'Más Frecuentes';

  const actions = document.createElement('div');
  actions.className = 'sidebar-header-actions';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'sidebar-header-btn';
  clearBtn.title = 'Borrar frecuentes';
  clearBtn.innerHTML = `<span style="font-size:10px;">✕</span>`;
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.removeItem('fv-frequents');
    section.remove();
  });
  actions.appendChild(clearBtn);

  header.appendChild(title);
  header.appendChild(actions);
  section.appendChild(header);

  frequents.forEach(item => {
    const name = formatPathDisplay(item.path);
    const el = document.createElement('div');
    el.className = 'sidebar-item';
    el.dataset.path = item.path;
    const row = document.createElement('div');
    row.className = 'sidebar-item-row';
    row.innerHTML = `<span class="sidebar-icon">🔥</span><span class="sidebar-label" title="${escapeHTML(item.path)}">${escapeHTML(name)}</span><span class="freq-badge">${item.count}</span>`;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSidebarItem(el);
      navigateTo(item.path);
    });
    el.appendChild(row);
    section.appendChild(el);
  });

  const homeSection = document.getElementById('home-section');
  if (homeSection) {
    inner.insertBefore(section, homeSection);
  } else {
    inner.appendChild(section);
  }
}

async function buildSidebar() {
  const inner = document.getElementById('sidebar-inner');
  inner.innerHTML = '';
  buildFavoritesSection();
  buildRecentsSection();
  buildFrequentsSection();
  const homeSection = makeSection('Inicio');
  homeSection.id = 'home-section';
  homeSection.appendChild(await createExpandableItem('Home', state.homeDirs.home, '🏠'));
  inner.appendChild(homeSection);
  if (state.icloudPath) {
    const ic = makeSection('iCloud');
    ic.id = 'icloud-section';
    ic.appendChild(await createExpandableItem('iCloud Drive', state.icloudPath, '☁️'));
    inner.appendChild(ic);
  }
  const trashPath = state.homeDirs?.trash || (state.homeDirs?.home ? `${state.homeDirs.home}/.Trash` : null);
  if (trashPath) {
    const trashSection = makeSection('Papelera');
    trashSection.id = 'trash-section';
    const trashItem = await createExpandableItem('Papelera', trashPath, '🗑️');
    trashItem.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('application/json')) {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        trashItem.classList.add('drag-over');
      }
    });
    trashItem.addEventListener('dragleave', () => trashItem.classList.remove('drag-over'));
    trashItem.addEventListener('drop', async (e) => {
      e.preventDefault(); e.stopPropagation();
      trashItem.classList.remove('drag-over');
      const paths = getDroppedPaths(e);
      if (paths.length) {
        await window.api.trashItem(paths);
        paths.forEach(p => dropStackPaths.delete(p));
        updateDropStack();
        await reloadCurrentDir();
      }
    });
    trashSection.appendChild(trashItem);
    inner.appendChild(trashSection);
  }
}

function makeSection(title) {
  const s = document.createElement('div');
  s.className = 'sidebar-section';
  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  const h = document.createElement('div');
  h.className = 'sidebar-section-title';
  h.textContent = title;
  header.appendChild(h);
  s.appendChild(header);
  return s;
}

function buildFavoritesSection() {
  const inner = document.getElementById('sidebar-inner');
  document.getElementById('fav-section')?.remove();
  const section = document.createElement('div'); section.className='sidebar-section'; section.id='fav-section';
  const header  = document.createElement('div'); header.className='sidebar-section-header';
  const title   = document.createElement('div'); title.className='sidebar-section-title'; title.textContent='Favoritos';
  
  const actions = document.createElement('div'); actions.className='sidebar-header-actions';

  const expandAllBtn = document.createElement('button');
  expandAllBtn.className = 'sidebar-header-btn';
  expandAllBtn.title = 'Expandir todo';
  expandAllBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  expandAllBtn.addEventListener('click', expandAllSidebar);

  const collapseAllBtn = document.createElement('button');
  collapseAllBtn.className = 'sidebar-header-btn';
  collapseAllBtn.title = 'Compactar todo';
  collapseAllBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  collapseAllBtn.addEventListener('click', collapseAllSidebar);

  const addBtn = document.createElement('button');
  addBtn.className = 'sidebar-add-btn';
  addBtn.title = 'Agregar carpeta';
  addBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  addBtn.addEventListener('click', addFavoriteFolder);

  actions.appendChild(expandAllBtn);
  actions.appendChild(collapseAllBtn);
  actions.appendChild(addBtn);

  header.appendChild(title); header.appendChild(actions); section.appendChild(header);
  if (!state.favorites.length) { const h=document.createElement('div'); h.className='fav-empty-hint'; h.textContent='Haz clic en + para agregar'; section.appendChild(h); }
  else state.favorites.forEach((fav,idx)=>section.appendChild(createFavoriteItem(fav,idx)));
  const first=inner.querySelector('.sidebar-section:not(#fav-section)');
  first?inner.insertBefore(section,first):inner.appendChild(section);
}

async function collapseAllSidebar() {
  const items = document.querySelectorAll('#sidebar .sidebar-item.expanded');
  items.forEach(el => collapseItem(el));
}

async function expandAllSidebar() {
  const rootFavs = document.querySelectorAll('#sidebar .sidebar-item.has-children');
  for (const el of rootFavs) {
    if (!el.classList.contains('expanded')) {
      const sub = el.querySelector('.sidebar-subtree') || el.querySelector('.sidebar-subitems');
      if (sub) {
        if (el._subdirs) {
          await expandItem(el, sub, el._subdirs);
        } else if (el.dataset.path) {
          const s = await window.api.readdir(el.dataset.path).catch(()=>[]);
          if (s && s.length) await expandItem(el, sub, s);
        }
      }
    }
  }
}

function createFavoriteItem(fav, idx) {
  const el=document.createElement('div'); el.className='sidebar-item fav-item'; el.dataset.path=fav.path; el.dataset.idx=idx; el.draggable=true;
  if(fav.color) el.dataset.color=fav.color;
  const dot=document.createElement('span'); dot.className='sidebar-color-dot';
  const dh =document.createElement('span'); dh.className='drag-handle';
  dh.innerHTML=`<svg width="9" height="13" viewBox="0 0 9 13" fill="none"><circle cx="2.5" cy="2.5" r="1.1" fill="currentColor"/><circle cx="6.5" cy="2.5" r="1.1" fill="currentColor"/><circle cx="2.5" cy="6.5" r="1.1" fill="currentColor"/><circle cx="6.5" cy="6.5" r="1.1" fill="currentColor"/><circle cx="2.5" cy="10.5" r="1.1" fill="currentColor"/><circle cx="6.5" cy="10.5" r="1.1" fill="currentColor"/></svg>`;
  const ch=document.createElement('span'); ch.className='sidebar-chevron'; ch.innerHTML=chevronSVG();
  const ic=document.createElement('span'); ic.className='sidebar-icon'; ic.textContent=fav.icon;
  const lb=document.createElement('span'); lb.className='sidebar-label'; lb.textContent=fav.label;
  const row=document.createElement('div'); row.className='sidebar-item-row';
  row.appendChild(dot); row.appendChild(dh); row.appendChild(ch); row.appendChild(ic); row.appendChild(lb);
  el.appendChild(row);
  const sub=document.createElement('div'); sub.className='sidebar-subtree'; el.appendChild(sub);
  window.api.readdir(fav.path).then(s=>{if(s?.length){el.classList.add('has-children');el._subdirs=s;}}).catch(()=>{});
  el.addEventListener('dragover',(e)=>{
    if(e.dataTransfer.types.includes('application/json')) {
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      el.classList.add('drag-over');
    }
  });
  el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
  el.addEventListener('drop',async(e)=>{
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drag-over');
    if(!e.dataTransfer.types.includes('application/json')) return;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if(!raw) return;
      const data = JSON.parse(raw);
      const valid = data.filter(p => p !== fav.path);
      if(valid.length) {
        const action = e.altKey ? 'copy' : 'move';
        const res = await window.api[action](valid, fav.path);
        if (res && res.error) alert('Error: ' + res.error);
        await reloadCurrentDir();
      }
    } catch(err) {}
  });

  // Chevron click: only expand/collapse
  ch.style.cursor = 'pointer';
  ch.addEventListener('click', async(e)=>{
    e.stopPropagation();
    if(el.classList.contains('has-children')){
      const exp=el.classList.contains('expanded');
      exp?collapseItem(el):await expandItem(el,sub,el._subdirs||[]);
    }
  });

  // Row click: navigate only (no expand)
  row.addEventListener('click', async(e)=>{
    e.stopPropagation();
    selectSidebarItem(el); navigateTo(fav.path);
  });
  el.addEventListener('contextmenu',(e)=>{e.preventDefault(); e.stopPropagation();e.stopPropagation();showSidebarCtx(e.clientX,e.clientY,parseInt(el.dataset.idx,10),fav);});
  el.addEventListener('dragstart',(e)=>{state.dragSrcEl=el;el.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',idx);});
  el.addEventListener('dragend',()=>{el.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));state.dragSrcEl=null;});
  el.addEventListener('dragover',(e)=>{
    if(e.dataTransfer.types.includes('application/json') || state.dragSrcEl) {
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = (e.dataTransfer.types.includes('application/json') && e.altKey) ? 'copy' : 'move';
      if(!state.dragSrcEl || el!==state.dragSrcEl) {
        document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
        el.classList.add('drag-over');
      }
    }
  });
  el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
  el.addEventListener('drop',async (e)=>{
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drag-over');
    if(e.dataTransfer.types.includes('application/json')) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if(!raw) return;
        const data = JSON.parse(raw);
        const valid = data.filter(p => p !== fav.path);
        if(valid.length) {
          const action = e.altKey ? 'copy' : 'move';
          const res = await window.api[action](valid, fav.path);
          if(res && res.error) alert('Error: ' + res.error);
          await reloadCurrentDir();
        }
      } catch(err) { alert('Catch error: ' + err.message); }
      return;
    }
    if(!state.dragSrcEl||state.dragSrcEl===el)return;
    const src=parseInt(state.dragSrcEl.dataset.idx,10),dst=parseInt(el.dataset.idx,10);
    if(isNaN(src)||isNaN(dst))return;
    const[m]=state.favorites.splice(src,1);
    state.favorites.splice(dst,0,m);
    saveFavorites();
    buildFavoritesSection();
  });
  return el;
}

async function addFavoriteFolder() {
  const p=await window.api.openFolderDialog(); if(!p||state.favorites.some(f=>f.path===p))return;
  const name=p.split('/').filter(Boolean).pop()||p;
  state.favorites.push({label:name,path:p,icon:'📁'}); saveFavorites(); buildFavoritesSection();
}

async function createExpandableItem(label, dirPath, icon, isDir=true) {
  let subdirs=[]; 
  if (isDir) { try{subdirs=await window.api.readdir(dirPath);}catch(_){} }
  const hasCh=isDir && subdirs.length>0;
  const el=document.createElement('div'); el.className=`sidebar-item${hasCh?' has-children':''}`; el.dataset.path=dirPath;
  const sp=document.createElement('span'); sp.className='drag-handle drag-handle--hidden';
  const ch=document.createElement('span'); ch.className='sidebar-chevron'; ch.innerHTML=chevronSVG();
  const ic=document.createElement('span'); ic.className='sidebar-icon'; ic.textContent=icon;
  const txt=document.createElement('span'); txt.className='sidebar-label'; txt.textContent=label;
  const row=document.createElement('div'); row.className='sidebar-item-row';
  row.appendChild(sp);row.appendChild(ch);row.appendChild(ic);row.appendChild(txt);
  el.appendChild(row);
  const sub=document.createElement('div'); sub.className='sidebar-subtree'; el.appendChild(sub);
  
  // Hover & DND logic
  row.addEventListener('mouseenter',()=>{if(state.dragSrcEl&&state.dragSrcEl!==el)el.classList.add('drag-over');sp.classList.remove('drag-handle--hidden');});
  row.addEventListener('mouseleave',()=>{el.classList.remove('drag-over');sp.classList.add('drag-handle--hidden');});
  el.addEventListener('dragover',(e)=>{if(state.dragSrcEl&&state.dragSrcEl!==el){e.preventDefault(); e.stopPropagation();e.dataTransfer.dropEffect='move';}});
  el.addEventListener('drop',async (e)=>{
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drag-over');
    if(!isDir) return;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if(!raw) return;
      const data = JSON.parse(raw);
      const valid = data.filter(p => p !== dirPath);
      if(valid.length) {
        const action = e.altKey ? 'copy' : 'move';
        const res = await window.api[action](valid, dirPath);
        if (res && res.error) alert('Error: ' + res.error);
        await reloadCurrentDir();
      }
    } catch(err) {}
  });

  // Chevron click: only expand/collapse, don't navigate
  if(hasCh) {
    ch.style.cursor = 'pointer';
    ch.addEventListener('click', async(e)=>{
      e.stopPropagation();
      const exp=el.classList.contains('expanded');
      exp?collapseItem(el):await expandItem(el,sub,subdirs);
    });
  }

  // Row click: navigate or preview (never expand)
  row.addEventListener('click', async(e)=>{
    e.stopPropagation();
    selectSidebarItem(el);
    if (isDir) {
      navigateTo(dirPath);
    } else {
      const stats = await window.api.stat(dirPath);
      const entry = { name: label, fullPath: dirPath, isDir: false, size: stats?.size||0, mtime: stats?.mtimeMs||Date.now() };
      state.selectedFile = entry;
      document.getElementById('preview-panel').classList.remove('hidden');
      showFileContent(entry);
    }
  });
  return el;
}

async function expandItem(el, sub, subdirs) {
  el.classList.add('expanded');
  if(!sub.children.length) {
    const sorted = sortAndFilterEntries(subdirs);
    const limit = sorted.slice(0, 50);
    for(const s of limit) {
      sub.appendChild(await createExpandableItem(s.name, s.fullPath, fileIcon(s.name, s.isDir), s.isDir));
    }
    if (sorted.length > 50) {
      const more = document.createElement('div');
      more.className = 'sidebar-item sidebar-more-btn';
      more.innerHTML = `<div class="sidebar-item-row" style="padding-left:45px;color:rgba(255,255,255,0.4);font-size:11px;font-style:italic;cursor:pointer;">... ${sorted.length - 50} más</div>`;
      more.addEventListener('click', async(e)=>{
        e.stopPropagation();
        more.remove();
        for(const s of sorted.slice(50)) sub.appendChild(await createExpandableItem(s.name, s.fullPath, fileIcon(s.name, s.isDir), s.isDir));
      });
      sub.appendChild(more);
    }
  }
}
function collapseItem(el)  { el.classList.remove('expanded'); el.querySelectorAll('.sidebar-item.expanded').forEach(c=>c.classList.remove('expanded')); }
function selectSidebarItem(el) { document.querySelectorAll('.sidebar-item.selected').forEach(e=>e.classList.remove('selected')); el.classList.add('selected'); }

/* ── Context menus ───────────────────────────────────────────────────────────── */
const COLOR_OPTIONS = [{id:'red',bg:'#ff453a'},{id:'orange',bg:'#ff9f0a'},{id:'yellow',bg:'#ffd60a'},{id:'green',bg:'#30d158'},{id:'blue',bg:'#0a7aff'},{id:'purple',bg:'#bf5af2'},{id:'',bg:'transparent',label:'✕'}];

function showSidebarCtx(x,y,favIdx,fav) {
  removeCtx();
  const menu=document.createElement('div'); menu.id='ctx-menu';
  const colorRow=document.createElement('div'); colorRow.className='ctx-colors';
  const cl=document.createElement('span'); cl.className='ctx-color-label'; cl.textContent='Etiqueta:'; colorRow.appendChild(cl);
  COLOR_OPTIONS.forEach(c=>{
    const btn=document.createElement('div'); btn.className='ctx-color-btn'; btn.style.background=c.bg||'rgba(255,255,255,.1)';
    if(c.label){btn.style.cssText='font-size:11px;display:flex;align-items:center;justify-content:center;color:var(--t2);border:1px solid var(--border);';btn.textContent=c.label;}
    if(fav.color===c.id) btn.classList.add('active');
    btn.addEventListener('click',()=>{state.favorites[favIdx].color=c.id||undefined;saveFavorites();buildFavoritesSection();removeCtx();});
    colorRow.appendChild(btn);
  });
  menu.appendChild(colorRow);
  menu.appendChild(mkSep());

  const openTab=mkCtxItem('📑','Abrir en nueva pestaña');
  openTab.addEventListener('click',()=>{removeCtx();openNewTab(fav.path);});
  menu.appendChild(openTab);

  const openWin=mkCtxItem('🪟','Abrir en nueva ventana');
  openWin.addEventListener('click',()=>{removeCtx();window.api.newWindow(fav.path);});
  menu.appendChild(openWin);
  menu.appendChild(mkSep());

  const ren=mkCtxItem('✏️','Renombrar'); ren.addEventListener('click',()=>{removeCtx();const n=prompt('Nuevo nombre:',fav.label);if(n?.trim()){state.favorites[favIdx].label=n.trim();saveFavorites();buildFavoritesSection();}});
  menu.appendChild(ren);
  menu.appendChild(mkSep());
  const rem=mkCtxItem('🗑️','Eliminar de Favoritos',true); rem.addEventListener('click',()=>{state.favorites.splice(favIdx,1);saveFavorites();buildFavoritesSection();removeCtx();});
  menu.appendChild(rem);
  document.body.appendChild(menu); positionMenu(menu,x,y);
  setTimeout(()=>document.addEventListener('click',removeCtx,{once:true}),0);
}

function showFileCtx(x,y,entry) {
  removeCtx(); // clear any html menus just in case
  const itemCount = state.selectedItems.size;
  window.api.showContextMenu({ 
    isDir: entry.isDir, 
    canPaste: !!(window._clipboard && window._clipboard.paths.length > 0), 
    itemCount 
  });
}

function mkCtxItem(icon,label,destructive=false,disabled=false) {
  const el=document.createElement('div'); el.className=`ctx-item${destructive?' ctx-destructive':''}${disabled?' ctx-disabled':''}`;
  el.innerHTML=`<span class="ctx-icon">${icon}</span>${label}`; return el;
}
function mkSep() { const s=document.createElement('div'); s.className='ctx-sep'; return s; }
function positionMenu(menu,x,y) { menu.style.left=x+'px'; menu.style.top=y+'px'; requestAnimationFrame(()=>{const r=menu.getBoundingClientRect();if(r.right>window.innerWidth)menu.style.left=(x-r.width)+'px';if(r.bottom>window.innerHeight)menu.style.top=(y-r.height)+'px';}); }
function removeCtx() { document.getElementById('ctx-menu')?.remove(); }

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */
async function reloadCurrentDir() {
  const res = await window.api.readdir(state.currentPath);
  if (!res.error) {
    state.entries = res;
    // Recursively refresh any expanded folders to prevent stale UI
    const refreshExpanded = async (items) => {
      for (const item of items) {
        if (item.expanded && item.entry.isDir) {
          const subRes = await window.api.readdir(item.entry.fullPath);
          if (!subRes.error) {
            item.children = subRes;
            await refreshExpanded(item.children.map(c => ({
              entry: c, expanded: state.treeItems.find(t => t.entry.fullPath === c.fullPath)?.expanded || false
            })));
          }
        }
      }
    };
    await refreshExpanded(state.treeItems);
    state.selectedItems.clear();
    state.selectedFile = null;
    rerenderTree();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TABS MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */
let tabs = [];
let activeTabId = null;

function initTabs(initialPath) {
  const p = initialPath || state.currentPath || '/';
  const firstTab = createTabObj(p);
  tabs = [firstTab];
  activeTabId = firstTab.id;
  renderTabs();
}

function createTabObj(p) {
  const cleanP = p || '/';
  const name = cleanP === '/' ? 'Macintosh HD' : (cleanP.endsWith('.Trash') ? 'Papelera' : (cleanP.split('/').filter(Boolean).pop() || 'Macintosh HD'));
  return {
    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    path: cleanP,
    title: name,
    history: [cleanP],
    historyIdx: 0,
  };
}

function updateHistoryButtons() {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const backBtn = document.getElementById('btn-hist-back');
  const fwdBtn = document.getElementById('btn-hist-forward');
  const upBtn = document.getElementById('btn-hist-up');
  if (upBtn) {
    upBtn.disabled = (!state.currentPath || state.currentPath === '/');
  }
  if (!activeTab || !activeTab.history) {
    if (backBtn) backBtn.disabled = true;
    if (fwdBtn) fwdBtn.disabled = true;
    return;
  }
  if (backBtn) backBtn.disabled = (activeTab.historyIdx <= 0);
  if (fwdBtn) fwdBtn.disabled = (activeTab.historyIdx >= activeTab.history.length - 1);
}

function navigateBack() {
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab || !activeTab.history || activeTab.historyIdx <= 0) return;
  activeTab.historyIdx--;
  const prevPath = activeTab.history[activeTab.historyIdx];
  navigateTo(prevPath, true, false);
}

function navigateForward() {
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab || !activeTab.history || activeTab.historyIdx >= activeTab.history.length - 1) return;
  activeTab.historyIdx++;
  const nextPath = activeTab.history[activeTab.historyIdx];
  navigateTo(nextPath, true, false);
}

function navigateUp() {
  if (!state.currentPath || state.currentPath === '/') return;
  const parent = state.currentPath.split('/').slice(0, -1).join('/') || '/';
  navigateTo(parent);
}

let closedTabsStack = [];

function openNewTab(dirPath) {
  const p = dirPath || state.currentPath || state.homeDirs.downloads || state.homeDirs.home || '/';
  const tab = createTabObj(p);
  tabs.push(tab);
  switchTab(tab.id);
  setTimeout(() => {
    const list = document.getElementById('tab-list');
    if (list) list.scrollLeft = list.scrollWidth;
  }, 20);
}

function reopenClosedTab() {
  if (!closedTabsStack.length) return;
  const lastTab = closedTabsStack.pop();
  if (!lastTab || !lastTab.path) return;
  
  const tab = {
    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    path: lastTab.path,
    title: lastTab.title || (lastTab.path === '/' ? 'Macintosh HD' : (lastTab.path.split('/').filter(Boolean).pop() || 'Macintosh HD')),
    history: lastTab.history && lastTab.history.length ? lastTab.history : [lastTab.path],
    historyIdx: typeof lastTab.historyIdx === 'number' ? lastTab.historyIdx : (lastTab.history ? lastTab.history.length - 1 : 0),
  };
  tabs.push(tab);
  switchTab(tab.id);
  setTimeout(() => {
    const list = document.getElementById('tab-list');
    if (list) list.scrollLeft = list.scrollWidth;
  }, 20);
}

function closeTab(tabId, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  const closingTab = tabs[idx];
  closedTabsStack.push({
    path: closingTab.path,
    title: closingTab.title,
    history: closingTab.history ? [...closingTab.history] : [closingTab.path],
    historyIdx: closingTab.historyIdx || 0,
  });
  if (closedTabsStack.length > 30) closedTabsStack.shift();

  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    activeTabId = null;
    state.currentPath = null;
    state.entries = [];
    state.treeItems = [];
    state.selectedFile = null;
    renderTabs();
    updateHistoryButtons();
    showWelcomeScreen();
  } else {
    if (activeTabId === tabId) {
      const newIdx = Math.max(0, idx - 1);
      switchTab(tabs[newIdx].id);
    } else {
      renderTabs();
    }
  }
}

function showWelcomeScreen() {
  const listEl = document.getElementById('file-list');
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.innerHTML = `<span class="bc-item bc-last" style="color:var(--t3);font-style:italic;">Sin pestaña activa</span>`;
  
  if (listEl) {
    listEl.innerHTML = `
      <div class="empty-state welcome-hub" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px 20px;user-select:none;">
        <div class="welcome-icon" style="font-size:52px;margin-bottom:12px;opacity:0.9;">✦</div>
        <h2 style="font-size:18px;font-weight:600;color:var(--t1);margin-bottom:6px;">Selecciona una carpeta para comenzar</h2>
        <p style="color:var(--t2);font-size:13px;max-width:420px;line-height:1.5;margin-bottom:28px;">
          Elige un acceso rápido a continuación o haz clic en cualquier carpeta de la barra lateral izquierda.
        </p>

        <div class="welcome-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;max-width:560px;width:100%;margin-bottom:24px;">
          ${state.homeDirs.home ? `
            <div class="welcome-card" data-path="${escapeHTML(state.homeDirs.home)}">
              <span class="welcome-card-icon">🏠</span>
              <span class="welcome-card-title">Inicio</span>
            </div>
          ` : ''}
          ${state.homeDirs.desktop ? `
            <div class="welcome-card" data-path="${escapeHTML(state.homeDirs.desktop)}">
              <span class="welcome-card-icon">🖥️</span>
              <span class="welcome-card-title">Escritorio</span>
            </div>
          ` : ''}
          ${state.homeDirs.downloads ? `
            <div class="welcome-card" data-path="${escapeHTML(state.homeDirs.downloads)}">
              <span class="welcome-card-icon">📥</span>
              <span class="welcome-card-title">Descargas</span>
            </div>
          ` : ''}
          ${state.homeDirs.documents ? `
            <div class="welcome-card" data-path="${escapeHTML(state.homeDirs.documents)}">
              <span class="welcome-card-icon">📄</span>
              <span class="welcome-card-title">Documentos</span>
            </div>
          ` : ''}
          ${state.icloudPath ? `
            <div class="welcome-card" data-path="${escapeHTML(state.icloudPath)}">
              <span class="welcome-card-icon">☁️</span>
              <span class="welcome-card-title">iCloud</span>
            </div>
          ` : ''}
          <div class="welcome-card" id="welcome-card-browse">
            <span class="welcome-card-icon">📂</span>
            <span class="welcome-card-title">Examinar...</span>
          </div>
        </div>

        <div style="font-size:11px;color:var(--t3);display:flex;align-items:center;gap:14px;">
          <span><kbd style="padding:2px 5px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;">⌘ + T</kbd> Nueva pestaña</span>
          <span><kbd style="padding:2px 5px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;">⌘ + K</kbd> Herramientas</span>
        </div>
      </div>
    `;

    listEl.querySelectorAll('.welcome-card[data-path]').forEach(card => {
      card.addEventListener('click', () => {
        const p = card.dataset.path;
        if (p) openNewTab(p);
      });
    });

    document.getElementById('welcome-card-browse')?.addEventListener('click', async () => {
      const selected = await window.api.openFolderDialog();
      if (selected) openNewTab(selected);
    });
  }

  const statusEl = document.getElementById('status-items');
  if (statusEl) statusEl.textContent = 'Sin pestaña activa';
}

function getDroppedPaths(e) {
  const paths = [];
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const f = e.dataTransfer.files[i];
      if (f && f.path) paths.push(f.path);
    }
  }
  if (!paths.length && e.dataTransfer.types.includes('application/json')) {
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) paths.push(...parsed);
      }
    } catch (_) {}
  }
  if (!paths.length) {
    const raw = e.dataTransfer.getData('text/plain');
    if (raw) {
      const lines = raw.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.startsWith('/'));
      if (lines.length) paths.push(...lines);
    }
  }
  return Array.from(new Set(paths));
}

function switchTab(tabId) {
  activeTabId = tabId;
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  renderTabs();
  updateHistoryButtons();
  navigateTo(tab.path, false, false);
}

function renderTabs() {
  const tabList = document.getElementById('tab-list');
  if (!tabList) return;
  tabList.innerHTML = '';

  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab-item' + (tab.id === activeTabId ? ' active' : '');
    tabEl.draggable = true;

    tabEl.innerHTML = `
      <span class="tab-icon">${tab.path === '/' ? '💽' : (tab.path.endsWith('.Trash') ? '🗑️' : '📁')}</span>
      <span class="tab-title">${escapeHTML(tab.title)}</span>
      <button type="button" class="tab-close" title="Cerrar pestaña (⌘W)" draggable="false">✕</button>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      switchTab(tab.id);
    });

    // Middle-click (wheel click) on tab to close it
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        closeTab(tab.id, e);
      }
    });

    const closeBtn = tabEl.querySelector('.tab-close');
    if (closeBtn) {
      closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeTab(tab.id, e);
      });
    }

    // Drag & Drop on Tab (Hover to switch + Drop to move/copy)
    tabEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      tabEl.classList.add('drag-over');

      if (tab.id !== activeTabId && !tabEl._hoverTimer) {
        tabEl._hoverTimer = setTimeout(() => {
          switchTab(tab.id);
        }, 400);
      }
    });

    tabEl.addEventListener('dragleave', () => {
      tabEl.classList.remove('drag-over');
      if (tabEl._hoverTimer) {
        clearTimeout(tabEl._hoverTimer);
        tabEl._hoverTimer = null;
      }
    });

    tabEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      tabEl.classList.remove('drag-over');
      if (tabEl._hoverTimer) {
        clearTimeout(tabEl._hoverTimer);
        tabEl._hoverTimer = null;
      }

      const paths = getDroppedPaths(e);
      const valid = paths.filter(p => p !== tab.path);
      if (valid.length) {
        const action = e.altKey ? 'copy' : 'move';
        const res = await window.api[action](valid, tab.path);
        if (res && res.error) alert('Error: ' + res.error);
        if (action === 'move') {
          valid.forEach(p => dropStackPaths.delete(p));
          updateDropStack();
        }
        await reloadCurrentDir();
      }
    });

    tabList.appendChild(tabEl);
  });
}

async function navigateTo(dirPath, updateTab = true, pushHistory = true) {
  if (!dirPath) return;
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab) {
    openNewTab(dirPath);
    return;
  }
  state.currentPath   = dirPath;
  state.selectedFile  = null;
  state.selectedItems.clear();
  state.focusedIdx    = -1;
  state.searchQuery   = '';
  state.editorEntry   = null;
  state.editorModified= false;

  if (activeTab) {
    if (updateTab) {
      activeTab.path = dirPath;
      activeTab.title = dirPath === '/' ? 'Macintosh HD' : (dirPath.endsWith('.Trash') ? 'Papelera' : (dirPath.split('/').filter(Boolean).pop() || 'Macintosh HD'));
      renderTabs();
    }
    if (pushHistory) {
      if (!activeTab.history) { activeTab.history = [dirPath]; activeTab.historyIdx = 0; }
      else {
        if (activeTab.history[activeTab.historyIdx] !== dirPath) {
          activeTab.history = activeTab.history.slice(0, activeTab.historyIdx + 1);
          activeTab.history.push(dirPath);
          activeTab.historyIdx = activeTab.history.length - 1;
        }
      }
    }
    updateHistoryButtons();
  }

  clearSearch();
  hidePreview();
  renderBreadcrumb(dirPath);
  renderColHeaders();
  trackNavigationStats(dirPath);
  if (state.viewMode === 'gallery') {
    renderGalleryView(dirPath);
  } else if (document.startViewTransition) {
    document.startViewTransition(()=>renderFileList(dirPath));
  } else {
    await renderFileList(dirPath);
  }
}

function renderBreadcrumb(dirPath) {
  const bc=document.getElementById('breadcrumb');
  if(!bc) return;
  bc.innerHTML='';
  const parts=dirPath.split('/').filter(Boolean);
  const paths=parts.map((_,i)=>'/'+parts.slice(0,i+1).join('/'));
  
  const root=document.createElement('span');
  root.className='bc-item';
  root.innerHTML=`<span style="font-size:12px;">💽</span> <span>Macintosh HD</span>`;
  root.title='/';
  root.addEventListener('click',()=>navigateTo('/'));
  bc.appendChild(root);

  paths.forEach((p,i)=>{
    const sep=document.createElement('span');
    sep.className='bc-sep';
    sep.textContent='›';
    bc.appendChild(sep);

    const isTrash = parts[i] === '.Trash';
    const label = isTrash ? 'Papelera' : parts[i];
    const icon = isTrash ? '🗑️' : '📁';

    const el=document.createElement('span');
    el.className=`bc-item${i===paths.length-1?' bc-last':''}`;
    el.innerHTML=`<span style="font-size:12px;">${icon}</span> <span>${escapeHTML(label)}</span>`;
    el.title=p;
    if(i<paths.length-1) el.addEventListener('click',()=>navigateTo(p));
    bc.appendChild(el);
  });
  
  // Auto-scroll to end so current location is in view
  setTimeout(() => { bc.scrollLeft = bc.scrollWidth; }, 10);
}

/* ═══════════════════════════════════════════════════════════════════════════
   VS CODE–STYLE TREE VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
async function renderFileList(dirPath) {
  const listEl=document.getElementById('file-list'); listEl.innerHTML='';
  // Show skeleton
  for(let i=0;i<10;i++){const sk=document.createElement('div');sk.className='skeleton-row';sk.innerHTML=`<div class="skel skel-icon"></div><div class="skel skel-name" style="width:${80+Math.random()*140}px"></div><div class="skel skel-meta"></div>`;listEl.appendChild(sk);}
  // Fetch
  const raw=await window.api.readdir(dirPath);
  state.entries=(raw&&!raw.error)?raw:[];
  // Build flat tree items from root entries
  const sorted=sortAndFilterEntries(state.entries);
  state.treeItems=sorted.map(e=>({entry:e,level:0,expanded:false,childrenLoaded:false,children:[]}));
  renderTreeView(listEl);
  updateStatus();
}

function rerenderTree() {
  const listEl=document.getElementById('file-list');
  if(!listEl) return;
  
  if (state.searchQuery && state.searchResults) {
    const sorted = sortAndFilterEntries(state.searchResults);
    state.treeItems = sorted.map(e => ({entry: e, level: 0, expanded: false, childrenLoaded: false, children: []}));
    renderTreeView(listEl);
    updateStatus();
    return;
  }

  const sorted=sortAndFilterEntries(state.entries);
  function rebuild(entries,level) {
    const items=[];
    entries.forEach(e=>{
      const prev=state.treeItems.find(t=>t.entry.fullPath===e.fullPath&&t.level===level);
      const item={entry:e,level,expanded:prev?.expanded||false,childrenLoaded:prev?.childrenLoaded||false,children:prev?.children||[]};
      items.push(item);
      if(item.expanded&&item.childrenLoaded&&item.children.length) items.push(...rebuild(sortAndFilterEntries(item.children),level+1));
    });
    return items;
  }
  state.treeItems=rebuild(sorted,0);
  renderTreeView(listEl);
  updateStatus();
}

function renderTreeView(listEl) {
  listEl.innerHTML='';
  if (!state.entries.length) {
    if (state.currentPath && state.currentPath.endsWith('.Trash')) {
      listEl.innerHTML = `
        <div class="empty-state trash-hub" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:30px;">
          <div class="es-icon" style="font-size:56px;margin-bottom:12px;">🗑️</div>
          <h2 style="font-size:16px;font-weight:600;color:var(--t1);margin-bottom:6px;">Papelera de macOS</h2>
          <p style="color:var(--t2);max-width:380px;font-size:12px;line-height:1.5;margin-bottom:20px;">
            Los elementos enviados a la papelera están protegidos por el sistema de seguridad de macOS.
          </p>
          <div style="display:flex;gap:10px;">
            <button id="btn-open-mac-trash" class="brm-btn brm-btn-pri" style="padding:7px 16px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              <span>🪟</span> Abrir en Finder
            </button>
            <button id="btn-empty-mac-trash" class="brm-btn brm-btn-sec" style="padding:7px 16px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              <span>🧹</span> Vaciar Papelera
            </button>
          </div>
          <p style="font-size:11px;color:var(--t3);margin-top:24px;">
            💡 Tip: Puedes arrastrar archivos a la barra lateral o presionar <kbd>⌘ + Delete</kbd> para enviarlos aquí.
          </p>
        </div>
      `;
      document.getElementById('btn-open-mac-trash')?.addEventListener('click', () => window.api.openTrash());
      document.getElementById('btn-empty-mac-trash')?.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas vaciar la Papelera de macOS?')) {
          await window.api.emptyTrash();
        }
      });
      return;
    }
    listEl.innerHTML='<div class="empty-state"><div class="es-icon">🔒</div><p>Sin acceso o carpeta vacía.</p></div>';
    return;
  }
  if (!state.treeItems.length) {
    const msg=state.searchQuery?`Sin resultados para "<strong>${state.searchQuery}</strong>"`:'Esta carpeta está vacía.';
    listEl.innerHTML=`<div class="empty-state"><div class="es-icon">📂</div><p>${msg}</p></div>`; return;
  }

  
  let _renderId = Date.now();
  listEl._renderId = _renderId;
  let i = 0;
  const CHUNK_SIZE = 100;
  function nextChunk() {
    if (listEl._renderId !== _renderId) return;
    const frag = document.createDocumentFragment();
    const end = Math.min(i + CHUNK_SIZE, state.treeItems.length);
    for (; i < end; i++) {
      const item = state.treeItems[i];
      const visualIdx = i;
      
    const {entry,level}=item;
    const el=document.createElement('div');
    el.className='file-item'; el.dataset.path=entry.fullPath; el.dataset.isdir=entry.isDir;
    el.style.setProperty('--row-idx',Math.min(visualIdx,40));
    el.setAttribute('role','option'); el.setAttribute('aria-label',entry.name);
    const tag=state.fileTags[entry.fullPath]; if(tag) el.dataset.tag=tag;
    if(state.selectedFile?.fullPath===entry.fullPath) el.classList.add('selected');
    if(state.selectedItems.has(entry.fullPath)) el.classList.add('multi-selected');

    /* Chevron for folders / spacer for files */
    const chevEl=document.createElement('span'); chevEl.className='tree-chevron';
    if(entry.isDir) {
      chevEl.innerHTML=item.expanded?svgChevDown():svgChevRight();
      chevEl.addEventListener('click',(e)=>{e.stopPropagation();toggleFolder(item,listEl);});
    }

    /* Icon */
    const iconEl=document.createElement('span'); iconEl.className='file-icon';
    if(state.viewMode==='grid' && !entry.isDir) {
      if(isImage(entry.name)) {
        iconEl.innerHTML = `<img src="file://${encodeURI(entry.fullPath).replace(/\#/g, '%23')}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" onerror="this.parentElement.innerHTML='${fileIcon(entry.name,false)}'"/>`;
      } else if(isVideo(entry.name)) {
        iconEl.innerHTML = `<video src="file://${encodeURI(entry.fullPath).replace(/\#/g, '%23')}#t=0.1" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:4px;" onerror="this.parentElement.innerHTML='${fileIcon(entry.name,false)}'"></video>`;
      } else {
        iconEl.textContent=fileIcon(entry.name,entry.isDir);
      }
    } else {
      iconEl.textContent=fileIcon(entry.name,entry.isDir);
    }

    /* Tag dot */
    const dot=document.createElement('span'); dot.className='file-tag-dot';

    /* In grid mode, icon is at top level */
    if (state.viewMode === 'grid') {
      el.appendChild(iconEl);
    }

    /* Columns */
    state.visibleCols.forEach(colId=>{
      const def=COL_DEFS.find(c=>c.id===colId); if(!def) return;
      const col=document.createElement('span');
      col.className=`file-col col-${colId}`;

      if (colId === 'name') {
        if (state.viewMode !== 'grid') {
          col.style.paddingLeft = (6 + level * 16) + 'px';
          col.appendChild(chevEl);
          col.appendChild(iconEl);
          col.appendChild(dot);
          const nameSpan = document.createElement('span');
          nameSpan.className = 'file-name-text';
          nameSpan.textContent = entry.name;
          col.appendChild(nameSpan);
        } else {
          col.textContent = entry.name;
        }
      } else {
        col.textContent = colValue(colId, entry);
      }
      el.appendChild(col);
    });

    /* Drag and Drop to Move/Copy */
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      if(!state.selectedItems.has(entry.fullPath)) {
        state.selectedItems.clear(); state.selectedItems.add(entry.fullPath); state.selectedFile=entry;
        document.querySelectorAll('.file-item.selected,.file-item.multi-selected').forEach(x=>x.classList.remove('selected','multi-selected'));
        el.classList.add('selected');
      }
      const selectedList = Array.from(state.selectedItems);
      const payload = JSON.stringify(selectedList);
      e.dataTransfer.setData('application/json', payload);
      e.dataTransfer.setData('text/plain', selectedList.join('\n'));
      e.dataTransfer.setData('text/uri-list', selectedList.map(p => 'file://' + encodeURI(p)).join('\r\n'));
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setDragImage(el, 20, 14);
    });
    if (entry.isDir) {
      el.classList.add('is-dir');
      el.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', async (e) => {
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('drag-over');
        try {
          const paths = getDroppedPaths(e);
          const valid = paths.filter(p => p !== entry.fullPath);
          if(valid.length) {
            const action = e.altKey ? 'copy' : 'move';
            const res = await window.api[action](valid, entry.fullPath);
            if (res && res.error) alert('Error: ' + res.error);
            if (action === 'move') {
              valid.forEach(p => dropStackPaths.delete(p));
              updateDropStack();
            }
            await reloadCurrentDir();
          }
        } catch(err) {}
      });
    }

    /* Click — VS Code style: folder expands, file shows content */
    el.addEventListener('click',(e)=>{
      if(e.metaKey||e.ctrlKey) { toggleMultiSelect(el,entry); return; }
      if(e.shiftKey&&state.focusedIdx>=0) { rangeSelect(visualIdx,listEl); return; }
      state.selectedItems.clear();
      document.querySelectorAll('.file-item.multi-selected').forEach(x=>x.classList.remove('multi-selected'));

      if(entry.isDir) {
        // VS Code: single click expands folder inline
        toggleFolder(item,listEl);
        selectTreeItem(el,item,visualIdx); if(!qlOverlay.classList.contains('hidden')) openQuickLook(entry);
      } else {
        selectTreeItem(el,item,visualIdx); if(!qlOverlay.classList.contains('hidden')) openQuickLook(entry);
        // Single click on file: open inline editor / preview in right panel
        showFileContent(entry);
      }
    });

    /* Double-click: navigate folder or open file externally */
    el.addEventListener('dblclick',()=>{
      if(entry.isDir) navigateTo(entry.fullPath);
      else window.api.openFile(entry.fullPath);
    });

    el.addEventListener('contextmenu',(e)=>{
      e.preventDefault(); e.stopPropagation();
      if(!state.selectedItems.has(entry.fullPath)) {
        state.selectedItems.clear(); state.selectedItems.add(entry.fullPath); state.selectedFile=entry;
        document.querySelectorAll('.file-item.selected,.file-item.multi-selected').forEach(x=>x.classList.remove('selected','multi-selected'));
        el.classList.add('selected');
      }
      showFileCtx(e.clientX,e.clientY,entry);
    });
    listEl.appendChild(el);
      frag.appendChild(el);
    }
    listEl.appendChild(frag);
    if (i < state.treeItems.length) requestAnimationFrame(nextChunk);
  }
  nextChunk();


  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
  });
  listEl.addEventListener('drop', async (e) => {
    if (e.target === listEl || e.target.classList.contains('empty-state')) {
      e.preventDefault();
      e.stopPropagation();
      const paths = getDroppedPaths(e);
      const valid = paths.filter(p => p !== state.currentPath);
      if (valid.length) {
        const action = e.altKey ? 'copy' : 'move';
        const res = await window.api[action](valid, state.currentPath);
        if (res && res.error) alert('Error: ' + res.error);
        if (action === 'move') {
          valid.forEach(p => dropStackPaths.delete(p));
          updateDropStack();
        }
        await reloadCurrentDir();
      }
    }
  });

  // Click on empty space = deselect
  listEl.addEventListener('contextmenu',(e)=>{
    if(e.target===listEl){
      e.preventDefault(); e.stopPropagation();
      state.selectedItems.clear();
      state.selectedFile = null;
      document.querySelectorAll('.file-item.selected,.file-item.multi-selected').forEach(x=>x.classList.remove('selected','multi-selected'));
      hidePreview(); updateStatus();
      window.api.showContextMenu({ isDir: true, canPaste: !!(window._clipboard && window._clipboard.paths.length > 0), itemCount: 0 });
    }
  });

  listEl.addEventListener('click',(e)=>{
    if(e.target===listEl){
      document.querySelectorAll('.file-item.selected,.file-item.multi-selected').forEach(x=>x.classList.remove('selected','multi-selected'));
      state.selectedFile=null;state.selectedItems.clear();state.focusedIdx=-1;
      hidePreview();updateStatus();
    }
  },{passive:true});
  listEl.tabIndex=0;
}

/* Toggle folder expand/collapse in the tree */
async function toggleFolder(item, listEl) {
  const idx=state.treeItems.indexOf(item); if(idx<0) return;

  if(item.expanded) {
    // Collapse — remove all descendants
    item.expanded=false;
    let end=idx+1;
    while(end<state.treeItems.length&&state.treeItems[end].level>item.level) end++;
    state.treeItems.splice(idx+1,end-idx-1);
  } else {
    // Expand — load children if needed
    item.expanded=true;
    if(!item.childrenLoaded){
      const raw=await window.api.readdir(item.entry.fullPath);
      item.children=(raw&&!raw.error)?raw:[];
      item.childrenLoaded=true;
    }
    const childEntries=sortAndFilterEntries(item.children);
    const childItems=childEntries.map(e=>({entry:e,level:item.level+1,expanded:false,childrenLoaded:false,children:[]}));
    state.treeItems.splice(idx+1,0,...childItems);
  }
  renderTreeView(listEl);
}

function selectTreeItem(el, item, visualIdx) {
  document.querySelectorAll('.file-item.selected').forEach(x=>x.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedFile=item.entry; state.focusedIdx=visualIdx;
  updateStatus();
}

function toggleMultiSelect(el, entry) {
  if(state.selectedItems.has(entry.fullPath)){state.selectedItems.delete(entry.fullPath);el.classList.remove('multi-selected');}
  else{state.selectedItems.add(entry.fullPath);el.classList.add('multi-selected');}
  updateStatus();
}
function rangeSelect(toIdx, listEl) {
  const all=[...listEl.querySelectorAll('.file-item')];
  const start=Math.min(state.focusedIdx,toIdx); const end=Math.max(state.focusedIdx,toIdx);
  all.slice(start,end+1).forEach(x=>{state.selectedItems.add(x.dataset.path);x.classList.add('multi-selected');});
  updateStatus();
}

function moveSelection(delta) {
  const listEl = document.getElementById('file-list');
  const items  = [...listEl.querySelectorAll('.file-item')];
  if (!items.length) return;
  const newIdx = Math.max(0, Math.min(items.length - 1, state.focusedIdx + delta));
  const el     = items[newIdx];
  const item   = state.treeItems[newIdx];
  if (!el || !item) return;

  document.querySelectorAll('.file-item.selected').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  state.selectedFile = item.entry;
  state.focusedIdx   = newIdx;

  // If Quick Look is open → update the preview with the new file
  if (!qlOverlay.classList.contains('hidden')) {
    if (!item.entry.isDir) openQuickLook(item.entry);
    // if it's a dir, close QL
    else closeQuickLook();
  } else {
    showFileContent(item.entry);
  }
  updateStatus();
}

function updateStatus() {
  const textEl=document.getElementById('status-text');
  const mc=state.selectedItems.size;
  if(mc>0) { textEl.innerHTML=`${state.treeItems.filter(t=>t.level===0).length} elementos <span class="sel-badge">${mc} seleccionados</span>`; }
  else if(state.selectedFile) {
    const e=state.selectedFile;
    textEl.textContent=e.isDir?`📁 ${escapeHTML(e.name)} ${e.expanded?'(expandido)':''}`:(`${escapeHTML(e.name)} — ${formatSize(e.size)}`);
  } else {
    textEl.textContent=`${state.treeItems.filter(t=>t.level===0).length} elemento${state.treeItems.filter(t=>t.level===0).length!==1?'s':''}${state.searchQuery?' (filtrado)':''}`;
    document.getElementById('status-hint').textContent='';
  }
  if(state.selectedFile&&!state.selectedFile.isDir) {
    document.getElementById('status-hint').textContent='Espacio: vista previa · Enter: renombrar · ⌘S: guardar';
  }
}

/* SVG helpers */
function svgChevRight() { return `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5L3.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function svgChevDown()  { return `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 7L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

/* ═══════════════════════════════════════════════════════════════════════════
   FILE CONTENT PANEL (inline editor + preview, like VS Code)
   ═══════════════════════════════════════════════════════════════════════════ */
async function showFileContent(entry) {
  // Show preview panel
  document.getElementById('preview-panel')?.classList.remove('hidden');
  document.getElementById('preview-divider')?.classList.remove('hidden');
  document.getElementById('btn-toggle-preview')?.classList.add('active');

  if (entry.isDir) { showFolderPreview(entry); return; }

  // Text files → inline editable editor
  if (isText(entry.name)) { await showTextEditor(entry); return; }

  // Audio files → modern audio player card
  if (isAudio(entry.name)) { await showAudioPreview(entry); return; }

  // Images, PDF, video, other → preview info
  showFilePreview(entry);
}

async function showTextEditor(entry) {
  if (_previewAudio) { _previewAudio.pause(); _previewAudio.src = ''; _previewAudio = null; }
  state.editorEntry=entry; state.editorModified=false;
  const inner=document.getElementById('preview-inner');

  inner.innerHTML=`
    <div class="editor-container">
      <div class="editor-topbar">
        <span class="editor-topbar-icon">${fileIcon(entry.name,false)}</span>
        <span class="editor-topbar-name">${escapeHTML(entry.name)}</span>
        <span class="editor-modified-dot" id="ed-dot">●</span>
        <button class="editor-save-btn" id="ed-save" disabled>Guardar</button>
      </div>
      <textarea class="editor-textarea" id="ed-area" spellcheck="false" placeholder="Cargando…" wrap="off"></textarea>
      <div class="editor-hint">
        <span><kbd>⌘S</kbd> guardar</span>
        <span><kbd>⌘Z</kbd> deshacer</span>
        <span>Tab para indentar</span>
      </div>
    </div>`;

  const textarea=document.getElementById('ed-area');
  const saveBtn =document.getElementById('ed-save');
  const dot     =document.getElementById('ed-dot');

  // Load content
  const res=await window.api.readText(entry.fullPath);
  if(res.error){textarea.value=`Error: ${res.error}`;textarea.disabled=true;return;}
  let original=res.content; textarea.value=original;

  textarea.addEventListener('input',()=>{
    const changed=textarea.value!==original;
    saveBtn.disabled=!changed;
    dot.classList.toggle('visible',changed);
    state.editorModified=changed;
  });

  // Tab key → insert 2 spaces
  textarea.addEventListener('keydown',(e)=>{
    if(e.key==='Tab'){ e.preventDefault(); e.stopPropagation(); const s=textarea.selectionStart; textarea.setRangeText('  ',s,textarea.selectionEnd,'end'); }
    if((e.metaKey||e.ctrlKey)&&e.key==='s'){ e.preventDefault(); e.stopPropagation(); doSave(); }
  });

  async function doSave() {
    if(saveBtn.disabled) return;
    const r=await window.api.writeFile(entry.fullPath,textarea.value);
    if(r.success){original=textarea.value;saveBtn.disabled=true;dot.classList.remove('visible');state.editorModified=false;}
    else{alert('Error guardando: '+r.error);}
  }
  saveBtn.addEventListener('click',doSave);
  state.editorSaveFn=doSave;
}

function hidePreview() {
  if (_previewAudio) { _previewAudio.pause(); _previewAudio.src = ''; _previewAudio = null; }
  document.getElementById('preview-panel')?.classList.add('hidden');
  document.getElementById('preview-divider')?.classList.add('hidden');
  document.getElementById('btn-toggle-preview')?.classList.remove('active');
  const inner = document.getElementById('preview-inner');
  if (inner) inner.innerHTML=`<div id="preview-placeholder"><div class="prev-empty-icon">👆</div><p>Selecciona un elemento para ver su información</p></div>`;
  state.editorEntry=null; state.editorModified=false; state.editorSaveFn=null;
}

async function showFolderPreview(entry) {
  const inner=document.getElementById('preview-inner');
  inner.innerHTML=`
    <div class="prev-thumb"><span class="prev-emoji">📂</span></div>
    <div class="prev-header">
      <div class="prev-name-wrap"><input type="text" class="prev-name-input" id="prev-name-folder" value="${escapeHTML(entry.name)}" spellcheck="false" /></div>
      <div class="prev-kind">Carpeta</div>
    </div>
    <div class="prev-section-title">Información</div><div class="prev-separator"></div>
    <div class="prop-row"><span class="prop-key">Modificado</span><span class="prop-val">${formatDate(entry.mtime)}</span></div>
    <div class="prop-row"><span class="prop-key">Ruta</span><span class="prop-val" style="word-break:break-all">${entry.fullPath}</span></div>
    <div class="prop-row" id="prev-count"><span class="prop-key">Elementos</span><span class="prop-val">…</span></div>
    <div class="prev-section-title" style="margin-top:8px">Contenido</div><div class="prev-separator"></div>
    <div class="prev-folder-list" id="prev-folder-list"><div style="padding:8px 16px;font-size:11px;color:rgba(255,255,255,.3)">Cargando…</div></div>`;

  setupRenameInput(document.getElementById('prev-name-folder'), entry);

  const entries=await window.api.readdir(entry.fullPath);
  const cnt=document.getElementById('prev-count'); if(cnt)cnt.querySelector('.prop-val').textContent=entries?.length?`${entries.length} elementos`:'0';
  const listEl=document.getElementById('prev-folder-list'); if(!listEl)return;
  listEl.innerHTML='';
  if(!entries?.length){listEl.innerHTML='<div class="prev-more">Carpeta vacía o sin acceso</div>';return;}
  entries.slice(0,24).forEach(sub=>{
    const row=document.createElement('div'); row.className='prev-folder-item';
    row.innerHTML=`<span class="pf-icon">${fileIcon(sub.name,sub.isDir)}</span><span class="pf-name">${escapeHTML(sub.name)}</span>`;

    row.addEventListener('click',()=>sub.isDir?navigateTo(sub.fullPath):window.api.openFile(sub.fullPath));
    listEl.appendChild(row);
  });
  if(entries.length>24){const m=document.createElement('div');m.className='prev-more';m.textContent=`+${entries.length-24} más…`;listEl.appendChild(m);}
}

let _previewAudio = null;
let _audioWasPlaying = false;

async function showAudioPreview(entry) {
  const shouldAutoPlay = _previewAudio ? !_previewAudio.paused : _audioWasPlaying;
  if (_previewAudio) {
    _previewAudio.pause();
    _previewAudio.src = '';
    _previewAudio = null;
  }
  const inner = document.getElementById('preview-inner');

  const fileExt = getExt(entry.name).toUpperCase();
  const fileSz = formatSize(entry.size);

  inner.innerHTML = `
    <div class="audio-player-card">
      <div class="audio-disc-wrap">
        <div class="audio-disc paused" id="prev-audio-disc">
          <div class="audio-disc-center" id="prev-audio-art">
            <span class="disc-icon">🎵</span>
          </div>
        </div>
      </div>
      <div class="audio-info">
        <div class="audio-title" title="${escapeHTML(entry.name)}">${escapeHTML(entry.name)}</div>
        <div class="audio-badges">
          <span class="audio-badge accent">${fileExt}</span>
          <span class="audio-badge">${fileSz}</span>
        </div>
      </div>
      <div class="audio-waveform paused" id="prev-audio-wf">
        ${Array.from({length: 12}, () => '<div class="audio-wave-bar"></div>').join('')}
      </div>
      <div class="audio-seek-container">
        <div class="audio-seek-track" id="prev-audio-seek">
          <div class="audio-seek-fill" id="prev-audio-fill"></div>
        </div>
        <div class="audio-time-row">
          <span id="prev-audio-cur">0:00</span>
          <span id="prev-audio-dur">—:——</span>
        </div>
      </div>
      <div class="audio-controls">
        <button class="audio-ctrl-btn" id="prev-audio-rwd" title="Retroceder 5s">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19l-9-7 9-7v14z"/><path d="M22 19l-9-7 9-7v14z"/></svg>
        </button>
        <button class="audio-play-main" id="prev-audio-play" title="Reproducir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="audio-ctrl-btn" id="prev-audio-fwd" title="Adelantar 5s">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 19l9-7-9-7v14z"/><path d="M2 19l9-7-9-7v14z"/></svg>
        </button>
        <button class="audio-ctrl-btn" id="prev-audio-loop" title="Repetir">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        </button>
      </div>
      <div class="audio-vol-wrap">
        <button class="audio-ctrl-btn" id="prev-audio-mute" style="width:24px;height:24px;border:none;background:transparent;" title="Silenciar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <input type="range" class="audio-vol-slider" id="prev-audio-vol" min="0" max="1" step="0.05" value="1" title="Volumen" />
      </div>
    </div>
    <div class="prev-section-title">Información</div><div class="prev-separator"></div>
    <div class="prop-row"><span class="prop-key">Tipo</span><span class="prop-val">${fileTypeLabel(entry.name,false)}</span></div>
    <div class="prop-row"><span class="prop-key">Tamaño</span><span class="prop-val">${formatSize(entry.size)}</span></div>
    <div class="prop-row"><span class="prop-key">Extensión</span><span class="prop-val">.${getExt(entry.name)}</span></div>
    <div class="prop-row"><span class="prop-key">Modificado</span><span class="prop-val">${formatDate(entry.mtime)}</span></div>
    ${entry.birthtime?`<div class="prop-row"><span class="prop-key">Creado</span><span class="prop-val">${formatDate(entry.birthtime)}</span></div>`:''}
    <div class="prop-row"><span class="prop-key">Ruta</span><span class="prop-val" style="word-break:break-all">${entry.fullPath}</span></div>
  `;

  const disc = document.getElementById('prev-audio-disc');
  const wf = document.getElementById('prev-audio-wf');
  const seekTrack = document.getElementById('prev-audio-seek');
  const seekFill = document.getElementById('prev-audio-fill');
  const curEl = document.getElementById('prev-audio-cur');
  const durEl = document.getElementById('prev-audio-dur');
  const playBtn = document.getElementById('prev-audio-play');
  const rwdBtn = document.getElementById('prev-audio-rwd');
  const fwdBtn = document.getElementById('prev-audio-fwd');
  const loopBtn = document.getElementById('prev-audio-loop');
  const muteBtn = document.getElementById('prev-audio-mute');
  const volSlider = document.getElementById('prev-audio-vol');

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = 'file://' + encodeURI(entry.fullPath).replace(/\#/g, '%23');
  _previewAudio = audio;

  const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  const pauseIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

  audio.addEventListener('loadedmetadata', () => {
    durEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekFill.style.width = pct + '%';
    curEl.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener('play', () => {
    _audioWasPlaying = true;
  });
  audio.addEventListener('ended', () => {
    if (audio.loop) return;
    // Auto-advance to next audio track in directory
    const allAudio = state.treeItems.filter(t => !t.entry.isDir && isAudio(t.entry.name));
    const currentIndex = allAudio.findIndex(t => t.entry.fullPath === entry.fullPath);
    if (currentIndex >= 0 && currentIndex + 1 < allAudio.length) {
      const nextItem = allAudio[currentIndex + 1];
      const el = document.querySelector(`.file-item[data-path="${CSS.escape(nextItem.entry.fullPath)}"]`);
      state.selectedItems.clear();
      state.selectedItems.add(nextItem.entry.fullPath);
      state.selectedFile = nextItem.entry;
      document.querySelectorAll('.file-item.selected').forEach(x => x.classList.remove('selected'));
      if (el) el.classList.add('selected');
      _audioWasPlaying = true;
      showAudioPreview(nextItem.entry);
    } else {
      _audioWasPlaying = false;
      playBtn.innerHTML = playIcon;
      disc.classList.remove('spinning');
      disc.classList.add('paused');
      wf.classList.add('paused');
      wf.classList.remove('active');
    }
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        _audioWasPlaying = true;
        playBtn.innerHTML = pauseIcon;
        disc.classList.add('spinning');
        disc.classList.remove('paused');
        wf.classList.remove('paused');
        wf.classList.add('active');
      }).catch(() => {});
    } else {
      audio.pause();
      _audioWasPlaying = false;
      playBtn.innerHTML = playIcon;
      disc.classList.add('paused');
      wf.classList.add('paused');
      wf.classList.remove('active');
    }
  });

  rwdBtn.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 5); });
  fwdBtn.addEventListener('click', () => { if(audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); });
  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle('active', audio.loop);
  });
  seekTrack.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const r = seekTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    audio.currentTime = pos * audio.duration;
  });
  volSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volSlider.value);
    audio.muted = (audio.volume === 0);
  });
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    muteBtn.style.opacity = audio.muted ? '0.4' : '1';
  });

  // Auto-play if previous track was playing
  if (shouldAutoPlay) {
    audio.play().then(() => {
      _audioWasPlaying = true;
      playBtn.innerHTML = pauseIcon;
      disc.classList.add('spinning');
      disc.classList.remove('paused');
      wf.classList.remove('paused');
      wf.classList.add('active');
    }).catch(() => {});
  }

  // Load Album Art asynchronously
  window.api.getAlbumArt(entry.fullPath).then(art => {
    if (art) {
      const artContainer = document.getElementById('prev-audio-art');
      if (artContainer) {
        artContainer.innerHTML = `<img src="${art}" alt="${escapeHTML(entry.name)}" />`;
      }
    }
  });
}

async function showFilePreview(entry) {
  if (_previewAudio) { _previewAudio.pause(); _previewAudio.src = ''; _previewAudio = null; }
  const inner=document.getElementById('preview-inner');
  const isImg=isImage(entry.name); const isVid=isVideo(entry.name);
  let thumbHTML=`<div class="prev-thumb"><span class="prev-emoji" id="prev-art-emoji">${fileIcon(entry.name,false)}</span></div>`;
  
  if (isImg) {
    thumbHTML=`<div class="prev-thumb"><img src="file://${encodeURI(entry.fullPath).replace(/\#/g, '%23')}" alt="${escapeHTML(entry.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=prev-emoji>🖼️</span>'"/></div>`;
  } else if (isVid) {
    thumbHTML=`<div class="prev-thumb"><video src="file://${encodeURI(entry.fullPath).replace(/\#/g, '%23')}#t=0.1" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.parentElement.innerHTML='<span class=prev-emoji>🎬</span>'"></video></div>`;
  }
  
  inner.innerHTML=`${thumbHTML}
    <div class="prev-header">
      <div class="prev-name-wrap"><input type="text" class="prev-name-input" id="prev-name-file" value="${escapeHTML(entry.name)}" spellcheck="false" /></div>
      <div class="prev-kind">${fileTypeLabel(entry.name,false)}</div>
    </div>
    <div class="prev-section-title">Información</div><div class="prev-separator"></div>
    <div class="prop-row"><span class="prop-key">Tipo</span><span class="prop-val">${fileTypeLabel(entry.name,false)}</span></div>
    <div class="prop-row"><span class="prop-key">Tamaño</span><span class="prop-val">${formatSize(entry.size)}</span></div>
    <div class="prop-row"><span class="prop-key">Extensión</span><span class="prop-val">.${getExt(entry.name)}</span></div>
    <div class="prop-row"><span class="prop-key">Modificado</span><span class="prop-val">${formatDate(entry.mtime)}</span></div>
    ${entry.birthtime?`<div class="prop-row"><span class="prop-key">Creado</span><span class="prop-val">${formatDate(entry.birthtime)}</span></div>`:''}
    <div class="prop-row"><span class="prop-key">Ruta</span><span class="prop-val" style="word-break:break-all">${entry.fullPath}</span></div>`;

  setupRenameInput(document.getElementById('prev-name-file'), entry);
}

function setupRenameInput(input, entry) {
  if(!input) return;
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      const newName = input.value.trim();
      if (newName && newName !== entry.name) {
        const res = await window.api.rename(entry.fullPath, newName);
        if (!res.error) {
          entry.name = newName;
          entry.fullPath = res.newPath;
          input.blur();
          rerenderTree();
        } else {
          input.value = entry.name;
          input.blur();
        }
      } else {
        input.blur();
      }
    }
    if (e.key === 'Escape') {
      input.value = entry.name;
      input.blur();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function openSettings() {
  document.getElementById('settings-overlay').classList.remove('hidden');
  document.getElementById('settings-panel').classList.remove('hidden');
  renderSettings();
  document.getElementById('btn-settings').classList.add('active');
}
function closeSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('settings-panel').classList.add('hidden');
  document.getElementById('btn-settings').classList.remove('active');
}
function renderSettings() {
  const body=document.getElementById('settings-body'); body.innerHTML='';
  body.appendChild(makeSettingsSection('Vista',[
    makeToggleRow('🗂️','Vista de lista','Vista predeterminada al abrir carpetas',state.viewMode==='list',v=>{state.viewMode=v?'list':'grid';setView(state.viewMode);saveSettings();}),
    makeToggleRow('📐','Vista compacta de archivos','Mayor densidad de información en archivos',state.compactMode,v=>{state.compactMode=v;saveSettings();document.getElementById('file-list').classList.toggle('compact-mode', v); document.getElementById('content').classList.toggle('compact-grid', v);}),
    makeToggleRow('📑','Compactar barra lateral','Menor espaciado y tamaño en la barra lateral izquierda',state.compactSidebar,v=>{state.compactSidebar=v;saveSettings();document.getElementById('sidebar')?.classList.toggle('compact-sidebar', v);}),
    makeToggleRow('🕒','Mostrar Recientes en barra lateral','Muestra las últimas 5 carpetas visitadas en la barra lateral',state.showRecents,v=>{state.showRecents=v;saveSettings();buildRecentsSection();}),
    makeToggleRow('🔥','Mostrar Más Frecuentes en barra lateral','Muestra las 5 carpetas más frecuentadas en la barra lateral',state.showFrequents,v=>{state.showFrequents=v;saveSettings();buildFrequentsSection();}),
    makeToggleRow('🔍','Mostrar archivos ocultos','Archivos que comienzan con "."',state.showHidden,v=>{state.showHidden=v;saveSettings();rerenderTree();}),
  ]));
  body.appendChild(makeSettingsSection('Temas', [
    (function(){
      const div=document.createElement('div'); div.className='theme-selector';
      const themes = [
        {id:'antigravity', bg:'linear-gradient(135deg, #00f0ff, #6366f1)', title:'Antigravity'},
        {id:'default', bg:'#1c1c1e', title:'Oscuro'},
        {id:'navy', bg:'#0B132B', title:'Azul marino'},
        {id:'goku-blue', bg:'linear-gradient(135deg, #030B1E, #00E5FF)', title:'Goku Blue Dios'},
        {id:'pink', bg:'#2d1b2e', title:'Pink oscuro'},
        {id:'pink-light', bg:'#FFF0F5', title:'Pink claro'},
        {id:'light', bg:'#ffffff', title:'Full blanca'},
      ];
      themes.forEach(t=>{
        const wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;';
        const btn=document.createElement('div'); btn.className='theme-btn'+(state.theme===t.id?' active':'');
        btn.style.background=t.bg; btn.title=t.title;
        const lbl=document.createElement('span'); lbl.textContent=t.title; lbl.style.cssText='font-size:9px;color:var(--t3);white-space:nowrap;';
        btn.addEventListener('click', ()=>{
          state.theme=t.id; saveSettings(); setTheme(t.id);
          div.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
        });
        wrap.appendChild(btn); wrap.appendChild(lbl);
        div.appendChild(wrap);
      });
      return div;
    })()
  ]));
  // Column presets
  const presets = [
    {label:'Mínimo', icon:'📄', cols:['name'], desc:'Solo nombre'},
    {label:'Estándar', icon:'📋', cols:['name','mtime','size'], desc:'Nombre, fecha, tamaño'},
    {label:'Completo', icon:'📊', cols:['name','mtime','size','type','birthtime','ext'], desc:'Todas las columnas'},
  ];
  const presetRows = presets.map(p => {
    const isActive = JSON.stringify([...state.visibleCols].sort()) === JSON.stringify([...p.cols].sort());
    const row = document.createElement('div'); row.className = 's-row';
    row.style.cssText = 'cursor:pointer;border-radius:6px;' + (isActive ? 'background:var(--bg-row-sel);' : '');
    const ic = document.createElement('span'); ic.className='s-row-icon'; ic.textContent=p.icon;
    const te = document.createElement('div'); te.className='s-row-text';
    const tl = document.createElement('div'); tl.className='s-row-title'; tl.textContent=p.label;
    const sb = document.createElement('div'); sb.className='s-row-sub'; sb.textContent=p.desc;
    te.appendChild(tl); te.appendChild(sb);
    row.appendChild(ic); row.appendChild(te);
    if(isActive) { const ck = document.createElement('span'); ck.textContent='✓'; ck.style.cssText='color:var(--accent);font-weight:700;font-size:14px;'; row.appendChild(ck); }
    row.addEventListener('click', ()=>{
      state.visibleCols = [...p.cols];
      saveSettings(); renderColHeaders(); rerenderTree(); renderSettings();
    });
    return row;
  });
  body.appendChild(makeSettingsSection('Columnas', presetRows));
  // Sort
  const sortCard=document.createElement('div'); sortCard.className='s-card';
  const selRow=document.createElement('div'); selRow.className='s-row';
  const si=document.createElement('span'); si.className='s-row-icon'; si.textContent='🔤';
  const st=document.createElement('div'); st.className='s-row-text'; const stT=document.createElement('div'); stT.className='s-row-title'; stT.textContent='Columna'; st.appendChild(stT);
  const sel=document.createElement('select'); sel.className='s-select';
  COL_DEFS.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.label;if(c.id===state.sort.col)o.selected=true;sel.appendChild(o);});
  sel.addEventListener('change',()=>{state.sort.col=sel.value;saveSettings();renderColHeaders();rerenderTree();});
  selRow.appendChild(si);selRow.appendChild(st);selRow.appendChild(sel);sortCard.appendChild(selRow);
  const dirRow=document.createElement('div'); dirRow.className='s-row';
  const di=document.createElement('span'); di.className='s-row-icon'; di.textContent='↕️';
  const dt=document.createElement('div'); dt.className='s-row-text'; const dtT=document.createElement('div'); dtT.className='s-row-title'; dtT.textContent='Dirección'; dt.appendChild(dtT);
  const dg=document.createElement('div'); dg.className='s-btn-group';
  const asc=document.createElement('button'); asc.className=`s-btn${state.sort.dir==='asc'?' active':''}`; asc.textContent='A→Z';
  const desc=document.createElement('button'); desc.className=`s-btn${state.sort.dir==='desc'?' active':''}`; desc.textContent='Z→A';
  asc.addEventListener('click',()=>{state.sort.dir='asc';asc.classList.add('active');desc.classList.remove('active');saveSettings();renderColHeaders();rerenderTree();});
  desc.addEventListener('click',()=>{state.sort.dir='desc';desc.classList.add('active');asc.classList.remove('active');saveSettings();renderColHeaders();rerenderTree();});
  dg.appendChild(asc);dg.appendChild(desc);dirRow.appendChild(di);dirRow.appendChild(dt);dirRow.appendChild(dg);sortCard.appendChild(dirRow);
  const sortSec=document.createElement('div');sortSec.className='s-section';const sl=document.createElement('div');sl.className='s-label';sl.textContent='Ordenar';sortSec.appendChild(sl);sortSec.appendChild(sortCard);body.appendChild(sortSec);
  // Shortcuts
  const ic=document.createElement('div');ic.className='s-section';const il=document.createElement('div');il.className='s-label';il.textContent='Atajos';ic.appendChild(il);
  const icard=document.createElement('div');icard.className='s-card';
  [['↑↓','Navegar'],['→','Expandir carpeta'],['←/⌫','Contraer / Subir'],['Espacio','Vista previa (Quick Look)'],['Enter','Renombrar'],['⌘S','Guardar archivo'],['⌘F','Buscar'],['⌘O','Abrir externamente'],['Doble clic','Navegar / Abrir app']].forEach(([k,v])=>{
    const r=document.createElement('div');r.className='s-row';r.innerHTML=`<span class="s-row-icon" style="font-size:10px;background:var(--bg-row-inac);border-radius:4px;padding:2px 6px;width:auto;font-family:monospace;color:var(--t1)">${k}</span><span class="s-row-title" style="font-size:11.5px;color:var(--t2);margin-left:8px;">${v}</span>`;icard.appendChild(r);
  });
  ic.appendChild(icard);body.appendChild(ic);
}
function makeSettingsSection(title,rows){const s=document.createElement('div');s.className='s-section';const l=document.createElement('div');l.className='s-label';l.textContent=title;const c=document.createElement('div');c.className='s-card';rows.forEach(r=>c.appendChild(r));s.appendChild(l);s.appendChild(c);return s;}
function makeToggleRow(icon,title,sub,val,onChange){const row=document.createElement('div');row.className='s-row';const ie=document.createElement('span');ie.className='s-row-icon';ie.textContent=icon;const te=document.createElement('div');te.className='s-row-text';const tl=document.createElement('div');tl.className='s-row-title';tl.textContent=title;te.appendChild(tl);if(sub){const sl=document.createElement('div');sl.className='s-row-sub';sl.textContent=sub;te.appendChild(sl);}const tog=document.createElement('label');tog.className='s-toggle';const inp=document.createElement('input');inp.type='checkbox';inp.checked=val;const tr=document.createElement('span');tr.className='s-toggle-track';const th=document.createElement('span');th.className='s-toggle-thumb';inp.addEventListener('change',()=>onChange(inp.checked));tog.appendChild(inp);tog.appendChild(tr);tog.appendChild(th);row.appendChild(ie);row.appendChild(te);row.appendChild(tog);return row;}

document.getElementById('btn-settings').addEventListener('click',()=>document.getElementById('settings-panel').classList.contains('hidden')?openSettings():closeSettings());
document.getElementById('settings-close').addEventListener('click',closeSettings);
document.getElementById('settings-overlay').addEventListener('click',closeSettings);

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════════════════════ */
const searchWrap=document.getElementById('search-wrap');
const searchInput=document.getElementById('search-input');
const searchClear=document.getElementById('search-clear');
document.getElementById('search-icon-btn').addEventListener('click',()=>{searchWrap.classList.remove('search-collapsed');searchInput.focus();});
let searchTimeout = null;
searchInput.addEventListener('input',()=>{
  state.searchQuery=searchInput.value.trim();
  searchClear.classList.toggle('hidden',!state.searchQuery);
  if (!state.searchQuery || state.searchQuery.startsWith('>') || state.searchQuery.startsWith('/') || state.searchQuery.startsWith('~')) {
    state.searchResults = null;
    rerenderTree();
    return;
  }
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    state.searchResults = await window.api.search(state.currentPath, state.searchQuery);
    rerenderTree();
  }, 250);
});
searchInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const val = searchInput.value.trim();
    if (val.startsWith('>')) {
      e.preventDefault();
      const cmd = val.slice(1).trim();
      searchInput.value = 'Ejecutando...'; searchInput.disabled = true;
      const res = await window.api.execCommand(cmd, state.currentPath);
      searchInput.disabled = false; clearSearch();
      qlFilename.textContent = `Terminal: ${cmd}`;
      document.getElementById('ql-topbar-icon').textContent = '💻';
      document.getElementById('ql-footer-info').textContent = 'Directorio: ' + state.currentPath;
      qlBody.innerHTML = ''; qlBody.style.display = 'block'; qlOverlay.classList.remove('hidden');
      const pre = document.createElement('pre');
      pre.style.cssText = 'color: #4af626; background: #000; padding: 16px; margin: 0; width: 100%; height: 100%; overflow: auto; font-family: monospace; font-size: 13px; white-space: pre-wrap;';
      if (res.error) pre.textContent = `Error: ${res.error}\n\n${res.stderr}`;
      else pre.textContent = res.stdout || res.stderr || '(Comando finalizado sin salida)';
      qlBody.appendChild(pre);
    if (res && res.error) alert('Error: ' + res.error);
      await reloadCurrentDir();
    } else if (val.startsWith('/') || val.startsWith('~')) {
      e.preventDefault();
      let p = val;
      if (val.startsWith('~')) p = val.replace('~', state.homeDirs.home);
      navigateTo(p);
      clearSearch();
    }
  }
});
searchInput.addEventListener('blur',()=>{if(!state.searchQuery)searchWrap.classList.add('search-collapsed');});
searchClear.addEventListener('click',()=>{clearSearch();rerenderTree();});
function clearSearch(){state.searchQuery='';state.searchResults=null;searchInput.value='';searchClear.classList.add('hidden');searchWrap.classList.add('search-collapsed');}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK LOOK (multi-type: image, PDF, video, audio, text, other)
   ═══════════════════════════════════════════════════════════════════════════ */
let _qlAudio=null;
const qlOverlay=document.getElementById('ql-overlay');
const qlBody=document.getElementById('ql-body');
const qlFilename=document.getElementById('ql-filename');
const qlTopIcon=document.getElementById('ql-topbar-icon');
const qlFooterInfo=document.getElementById('ql-footer-info');

function openQuickLook(entry){
  if(_qlAudio){_qlAudio.pause();_qlAudio.src='';_qlAudio=null;}
  qlFilename.textContent=entry.name; qlTopIcon.textContent=fileIcon(entry.name,entry.isDir);
  qlFooterInfo.textContent=[formatSize(entry.size),fileTypeLabel(entry.name,entry.isDir),formatDate(entry.mtime)].filter(Boolean).join('  ·  ');
  qlBody.innerHTML=''; qlBody.style.display=''; qlOverlay.classList.remove('hidden');
  if(isImage(entry.name))renderQlImage(entry);
  else if(isPDF(entry.name))renderQlPDF(entry);
  else if(isVideo(entry.name))renderQlVideo(entry);
  else if(isAudio(entry.name))renderQlAudio(entry);
  else if(isText(entry.name))renderQlText(entry);
  else renderQlOther(entry);
}
function closeQuickLook(){if(qlOverlay.classList.contains('hidden'))return;if(_qlAudio){_qlAudio.pause();_qlAudio.src='';_qlAudio=null;}qlBody.innerHTML='';qlOverlay.classList.add('hidden');}
function renderQlImage(e){const w=document.createElement('div');w.className='ql-img-wrap';const i=document.createElement('img');i.src='file://'+encodeURI(e.fullPath).replace(/\#/g, '%23');i.alt=e.name;i.onerror=()=>{w.innerHTML=`<div class="ql-other-wrap"><div class="ql-other-icon">🖼️</div><div class="ql-other-name">${escapeHTML(e.name)}</div></div>`;};w.appendChild(i);qlBody.appendChild(w);}
function renderQlPDF(e){const em=document.createElement('embed');em.className='ql-pdf-embed';em.type='application/pdf';em.src='file://'+encodeURI(e.fullPath).replace(/\#/g, '%23');qlBody.style.display='block';qlBody.appendChild(em);}
function renderQlVideo(e){const v=document.createElement('video');v.className='ql-video';v.controls=true;v.autoplay=true;v.src='file://'+encodeURI(e.fullPath).replace(/\#/g, '%23');v.onerror=()=>renderQlOther(e);qlBody.appendChild(v);}
async function renderQlAudio(e) {
  if (_previewAudio) { _previewAudio.pause(); }
  const w = document.createElement('div');
  w.className = 'ql-audio-container';

  const fileExt = getExt(e.name).toUpperCase();
  const fileSz = formatSize(e.size);

  w.innerHTML = `
    <div class="audio-disc-wrap">
      <div class="audio-disc paused" id="ql-audio-disc">
        <div class="audio-disc-center" id="ql-audio-art">
          <span class="disc-icon">🎵</span>
        </div>
      </div>
    </div>
    <div class="audio-info">
      <div class="audio-title" title="${escapeHTML(e.name)}">${escapeHTML(e.name)}</div>
      <div class="audio-badges">
        <span class="audio-badge accent">${fileExt}</span>
        <span class="audio-badge">${fileSz}</span>
      </div>
    </div>
    <div class="audio-waveform paused" id="ql-audio-wf">
      ${Array.from({length: 14}, () => '<div class="audio-wave-bar"></div>').join('')}
    </div>
    <div class="audio-seek-container">
      <div class="audio-seek-track" id="ql-audio-seek">
        <div class="audio-seek-fill" id="ql-audio-fill"></div>
      </div>
      <div class="audio-time-row">
        <span id="ql-audio-cur">0:00</span>
        <span id="ql-audio-dur">—:——</span>
      </div>
    </div>
    <div class="audio-controls">
      <button class="audio-ctrl-btn" id="ql-audio-rwd" title="Retroceder 5s">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19l-9-7 9-7v14z"/><path d="M22 19l-9-7 9-7v14z"/></svg>
      </button>
      <button class="audio-play-main" id="ql-audio-play" title="Reproducir / Pausa">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
      <button class="audio-ctrl-btn" id="ql-audio-fwd" title="Adelantar 5s">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 19l9-7-9-7v14z"/><path d="M2 19l9-7-9-7v14z"/></svg>
      </button>
      <button class="audio-ctrl-btn" id="ql-audio-loop" title="Repetir">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
      </button>
    </div>
  `;

  qlBody.appendChild(w);

  const disc = document.getElementById('ql-audio-disc');
  const wf = document.getElementById('ql-audio-wf');
  const seekTrack = document.getElementById('ql-audio-seek');
  const seekFill = document.getElementById('ql-audio-fill');
  const curEl = document.getElementById('ql-audio-cur');
  const durEl = document.getElementById('ql-audio-dur');
  const playBtn = document.getElementById('ql-audio-play');
  const rwdBtn = document.getElementById('ql-audio-rwd');
  const fwdBtn = document.getElementById('ql-audio-fwd');
  const loopBtn = document.getElementById('ql-audio-loop');

  const playIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  const pauseIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.src = 'file://' + encodeURI(e.fullPath).replace(/\#/g, '%23');
  _qlAudio = audio;

  audio.addEventListener('loadedmetadata', () => { durEl.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    seekFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    curEl.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener('ended', () => {
    if (!audio.loop) {
      playBtn.innerHTML = playIcon;
      disc.classList.remove('spinning');
      disc.classList.add('paused');
      wf.classList.add('paused');
      wf.classList.remove('active');
    }
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        playBtn.innerHTML = pauseIcon;
        disc.classList.add('spinning');
        disc.classList.remove('paused');
        wf.classList.remove('paused');
        wf.classList.add('active');
      }).catch(() => {});
    } else {
      audio.pause();
      playBtn.innerHTML = playIcon;
      disc.classList.add('paused');
      wf.classList.add('paused');
      wf.classList.remove('active');
    }
  });

  rwdBtn.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 5); });
  fwdBtn.addEventListener('click', () => { if(audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); });
  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle('active', audio.loop);
  });
  seekTrack.addEventListener('click', (ev) => {
    if (!audio.duration) return;
    const r = seekTrack.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * audio.duration;
  });

  audio.play().then(() => {
    playBtn.innerHTML = pauseIcon;
    disc.classList.add('spinning');
    disc.classList.remove('paused');
    wf.classList.remove('paused');
    wf.classList.add('active');
  }).catch(() => {});

  window.api.getAlbumArt(e.fullPath).then(albumArt => {
    if (albumArt) {
      const artEl = document.getElementById('ql-audio-art');
      if (artEl) artEl.innerHTML = `<img src="${albumArt}" alt="${escapeHTML(e.name)}" />`;
    }
  });
}
async function renderQlText(e){const w=document.createElement('div');w.className='ql-text-wrap';w.innerHTML='<div style="color:rgba(255,255,255,.3);padding:16px;font-size:12px">Cargando…</div>';qlBody.style.display='block';qlBody.appendChild(w);const res=await window.api.readText(e.fullPath);if(res.error){w.innerHTML=`<div style="color:#ff453a;padding:16px">Error: ${res.error}</div>`;return;}const pre=document.createElement('pre');pre.textContent=res.content;w.innerHTML='';w.appendChild(pre);}
function renderQlOther(e){const w=document.createElement('div');w.className='ql-other-wrap';w.innerHTML=`<div class="ql-other-icon">${fileIcon(e.name,e.isDir)}</div><div class="ql-other-name">${escapeHTML(e.name)}</div><div class="ql-other-info">No hay vista previa disponible.<br><strong>${fileTypeLabel(e.name,e.isDir)}</strong> · ${formatSize(e.size)}</div><button class="ql-open-btn" id="ql-open-ext">Abrir con app predeterminada</button>`;qlBody.appendChild(w);document.getElementById('ql-open-ext').addEventListener('click',()=>{window.api.openFile(e.fullPath);closeQuickLook();});}
function svgPlay()  { return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 3.5l13 7.5-13 7.5V3.5z" fill="white"/></svg>`; }
function svgPause() { return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="3" width="5" height="16" rx="2" fill="white"/><rect x="13" y="3" width="5" height="16" rx="2" fill="white"/></svg>`; }
document.getElementById('ql-close').addEventListener('click',closeQuickLook);
document.getElementById('ql-backdrop').addEventListener('click',closeQuickLook);

/* ═══════════════════════════════════════════════════════════════════════════
   CODE SYNTAX HIGHLIGHTING (Lightweight & Safe)
   ═══════════════════════════════════════════════════════════════════════════ */
function highlightCode(rawCode, ext) {
  const esc = escapeHTML(rawCode);
  let html = esc.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, '<span class="tok-comment">$1</span>');
  html = html.replace(/(&quot;[\s\S]*?&quot;|&#039;[\s\S]*?&#039;|`[\s\S]*?`)/g, '<span class="tok-str">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  const kws = /\b(const|let|var|function|async|await|return|if|else|for|while|import|from|export|default|class|extends|new|try|catch|finally|throw|typeof|instanceof|switch|case|break|continue|null|undefined|true|false|def|self|print|elif|lambda|yield|struct|fn|pub|impl|type|interface|package|select)\b/g;
  html = html.replace(kws, '<span class="tok-kw">$1</span>');
  html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  return `<pre class="code-preview-wrap"><code>${html}</code></pre>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GALLERY VIEW MODE
   ═══════════════════════════════════════════════════════════════════════════ */
function renderGalleryView(dirPath) {
  const gView = document.getElementById('gallery-view');
  const fList = document.getElementById('file-list');
  const heroPrev = document.getElementById('gallery-hero-preview');
  const heroMeta = document.getElementById('gallery-hero-meta');
  const strip = document.getElementById('gallery-strip');

  if (!gView || !fList) return;
  gView.classList.remove('hidden');
  fList.classList.add('hidden');

  strip.innerHTML = '';
  const mediaEntries = state.entries.filter(e => !e.isDir);
  if (!mediaEntries.length) {
    heroPrev.innerHTML = '<div style="color:var(--t3);font-size:13px;">No hay archivos multimedia en esta carpeta</div>';
    heroMeta.innerHTML = '';
    return;
  }

  const activeEntry = state.selectedFile || mediaEntries[0];
  showGalleryHero(activeEntry);

  mediaEntries.forEach(entry => {
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb' + (entry.fullPath === activeEntry.fullPath ? ' active' : '');
    if (isImage(entry.name)) {
      thumb.innerHTML = `<img src="file://${encodeURI(entry.fullPath)}" alt="" loading="lazy"/><span class="gt-name">${escapeHTML(entry.name)}</span>`;
    } else {
      thumb.innerHTML = `<span class="gt-icon">${fileIcon(entry.name, entry.isDir)}</span><span class="gt-name">${escapeHTML(entry.name)}</span>`;
    }
    thumb.addEventListener('click', () => {
      state.selectedFile = entry;
      strip.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      showGalleryHero(entry);
    });
    strip.appendChild(thumb);
  });
}

function showGalleryHero(entry) {
  const heroPrev = document.getElementById('gallery-hero-preview');
  const heroMeta = document.getElementById('gallery-hero-meta');
  if (!heroPrev || !heroMeta) return;

  if (isImage(entry.name)) {
    heroPrev.innerHTML = `<img src="file://${encodeURI(entry.fullPath)}" alt="${escapeHTML(entry.name)}"/>`;
  } else if (isVideo(entry.name)) {
    heroPrev.innerHTML = `<video src="file://${encodeURI(entry.fullPath)}" controls autoplay style="max-height:100%;max-width:100%;"></video>`;
  } else if (isAudio(entry.name)) {
    heroPrev.innerHTML = `<div style="text-align:center;"><div style="font-size:64px;margin-bottom:12px;">🎵</div><button class="audio-play-main" id="gh-play-btn" style="width:48px;height:48px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:20px;">▶</button></div>`;
    heroPrev.querySelector('#gh-play-btn')?.addEventListener('click', () => playTrackGlobally(entry));
  } else {
    heroPrev.innerHTML = `<div style="font-size:72px;">${fileIcon(entry.name, entry.isDir)}</div>`;
  }

  heroMeta.innerHTML = `
    <span class="gh-title">${escapeHTML(entry.name)}</span>
    <span>${formatSize(entry.size)} · ${formatDate(entry.mtime)}</span>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DUAL PANE SPLIT VIEW MODE
   ═══════════════════════════════════════════════════════════════════════════ */
let isSplitMode = false;
let secondaryPath = null;
let secondaryEntries = [];

function toggleSplitView() {
  isSplitMode = !isSplitMode;
  const secPane = document.getElementById('secondary-pane');
  const divider = document.getElementById('split-divider');
  const btn = document.getElementById('btn-toggle-split');

  if (btn) btn.classList.toggle('active', isSplitMode);
  if (secPane && divider) {
    secPane.classList.toggle('hidden', !isSplitMode);
    divider.classList.toggle('hidden', !isSplitMode);
  }

  if (isSplitMode) {
    secondaryPath = secondaryPath || state.homeDirs.desktop || state.homeDirs.home || '/';
    loadSecondaryPane(secondaryPath);
  }
}

async function loadSecondaryPane(dirPath) {
  secondaryPath = dirPath;
  const secList = document.getElementById('secondary-file-list');
  if (!secList) return;
  secList.innerHTML = '<div style="padding:10px;color:var(--t3);font-size:12px;">Cargando...</div>';
  const res = await window.api.readdir(dirPath);
  if (res && !res.error) {
    secondaryEntries = res;
    renderSecondaryList();
  }
}

function renderSecondaryList() {
  const secList = document.getElementById('secondary-file-list');
  if (!secList) return;
  secList.innerHTML = '';
  
  const header = document.createElement('div');
  header.style.cssText = 'padding:6px 10px;font-size:11px;font-weight:600;background:var(--bg-toolbar);border-bottom:1px solid var(--border);color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  header.textContent = `Panel 2: ${secondaryPath}`;
  secList.appendChild(header);

  secondaryEntries.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'file-item file-row';
    el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 10px;cursor:pointer;font-size:12px;';
    el.innerHTML = `
      <span class="file-icon">${fileIcon(entry.name, entry.isDir)}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(entry.name)}</span>
      <span style="color:var(--t3);font-size:11px;">${entry.isDir ? '' : formatSize(entry.size)}</span>
    `;
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify([entry.fullPath]));
      e.dataTransfer.setData('text/plain', entry.fullPath);
      e.dataTransfer.effectAllowed = 'copyMove';
    });
    el.addEventListener('dblclick', () => {
      if (entry.isDir) loadSecondaryPane(entry.fullPath);
      else window.api.openFile(entry.fullPath);
    });
    secList.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   PERSISTENT BACKGROUND AUDIO PLAYER
   ═══════════════════════════════════════════════════════════════════════════ */
let globalAudio = null;
let currentTrack = null;

function setupPersistentPlayer() {
  const playerEl = document.getElementById('persistent-player');
  const playBtn = document.getElementById('pp-play');
  const prevBtn = document.getElementById('pp-prev');
  const nextBtn = document.getElementById('pp-next');
  const seekbar = document.getElementById('pp-seekbar');
  const seekFill = document.getElementById('pp-seek-fill');
  const timeCurr = document.getElementById('pp-time-curr');
  const timeDur = document.getElementById('pp-time-dur');
  const closeBtn = document.getElementById('pp-close');
  const openQlBtn = document.getElementById('pp-open-ql');

  playBtn?.addEventListener('click', () => {
    if (!globalAudio) return;
    if (globalAudio.paused) { globalAudio.play(); playBtn.textContent = '⏸'; }
    else { globalAudio.pause(); playBtn.textContent = '▶'; }
  });

  prevBtn?.addEventListener('click', () => playAdjacentTrack(-1));
  nextBtn?.addEventListener('click', () => playAdjacentTrack(1));

  closeBtn?.addEventListener('click', () => {
    if (globalAudio) { globalAudio.pause(); globalAudio = null; }
    playerEl?.classList.add('hidden');
  });

  openQlBtn?.addEventListener('click', () => {
    if (currentTrack) openQuickLook(currentTrack);
  });

  seekbar?.addEventListener('click', (e) => {
    if (!globalAudio || !globalAudio.duration) return;
    const rect = seekbar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    globalAudio.currentTime = pos * globalAudio.duration;
  });
}

function playTrackGlobally(entry) {
  currentTrack = entry;
  const playerEl = document.getElementById('persistent-player');
  const titleEl = document.getElementById('pp-title');
  const artistEl = document.getElementById('pp-artist');
  const coverEl = document.getElementById('pp-cover');
  const playBtn = document.getElementById('pp-play');
  const seekFill = document.getElementById('pp-seek-fill');
  const timeCurr = document.getElementById('pp-time-curr');
  const timeDur = document.getElementById('pp-time-dur');

  if (playerEl) playerEl.classList.remove('hidden');
  if (titleEl) titleEl.textContent = entry.name.replace(/\.[^/.]+$/, '');
  if (artistEl) artistEl.textContent = 'FinderView Player';

  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.addEventListener('timeupdate', () => {
      if (!globalAudio || !globalAudio.duration) return;
      const pct = (globalAudio.currentTime / globalAudio.duration) * 100;
      if (seekFill) seekFill.style.width = pct + '%';
      if (timeCurr) timeCurr.textContent = fmtSecs(globalAudio.currentTime);
      if (timeDur) timeDur.textContent = fmtSecs(globalAudio.duration);
    });
    globalAudio.addEventListener('ended', () => playAdjacentTrack(1));
  }

  globalAudio.src = 'file://' + encodeURI(entry.fullPath);
  globalAudio.play().then(() => {
    if (playBtn) playBtn.textContent = '⏸';
  }).catch(() => {});

  window.api.getAlbumArt(entry.fullPath).then(art => {
    if (coverEl) coverEl.src = art || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23222"/><text x="8" y="22" fill="%2300f0ff" font-size="16">🎵</text></svg>';
  });
}

function playAdjacentTrack(dir) {
  const audioEntries = state.entries.filter(e => !e.isDir && isAudio(e.name));
  if (!audioEntries.length) return;
  let idx = currentTrack ? audioEntries.findIndex(e => e.fullPath === currentTrack.fullPath) : -1;
  idx = (idx + dir + audioEntries.length) % audioEntries.length;
  playTrackGlobally(audioEntries[idx]);
}

function fmtSecs(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMAND PALETTE (⌘K / ⌘P)
   ═══════════════════════════════════════════════════════════════════════════ */
function openCommandPalette() {
  const overlay = document.getElementById('cmd-palette-overlay');
  const input = document.getElementById('cmd-palette-input');
  if (!overlay || !input) return;
  overlay.classList.remove('hidden');
  input.value = '';
  input.focus();
  renderCommandPaletteResults('');
}

function closeCommandPalette() {
  document.getElementById('cmd-palette-overlay')?.classList.add('hidden');
}

function renderCommandPaletteResults(query) {
  const resultsContainer = document.getElementById('cmd-palette-results');
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';
  const q = query.toLowerCase().trim();
  const items = [];

  const commands = [
    // ── Disk & Storage Tools ──
    { title: '🐘 Buscar Archivos Gigantes (> 500 MB)', sub: 'Escanear archivos muy pesados para liberar espacio', icon: '🐘', type: 'tool', action: () => runSmartScan('large_500mb', 'Archivos Gigantes (> 500 MB)') },
    { title: '📦 Buscar Archivos Grandes (> 100 MB)', sub: 'Escanear archivos mayores a 100 MB en la carpeta actual', icon: '📦', type: 'tool', action: () => runSmartScan('large_100mb', 'Archivos Grandes (> 100 MB)') },
    { title: '⏳ Buscar Archivos Antiguos (> 1 Año)', sub: 'Archivos no modificados en los últimos 365 días', icon: '⏳', type: 'tool', action: () => runSmartScan('old_1year', 'Archivos Antiguos (> 1 Año)') },
    { title: '📅 Buscar Archivos Antiguos (> 6 Meses)', sub: 'Archivos sin modificar en más de 180 días', icon: '📅', type: 'tool', action: () => runSmartScan('old_6months', 'Archivos Antiguos (> 6 Meses)') },
    { title: '✨ Buscar Archivos Modificados Hoy', sub: 'Archivos creados o modificados en las últimas 24 horas', icon: '✨', type: 'tool', action: () => runSmartScan('modified_today', 'Archivos Modificados Hoy') },
    { title: '📸 Buscar Capturas de Pantalla', sub: 'Encontrar capturas y screenshots en el directorio', icon: '📸', type: 'tool', action: () => runSmartScan('screenshots', 'Capturas de Pantalla') },
    { title: '📁 Buscar Carpetas Vacías', sub: 'Detectar carpetas sin contenido para purgar', icon: '📂', type: 'tool', action: () => runSmartScan('empty_folders', 'Carpetas Vacías') },
    { title: '💻 Buscar Caches y node_modules', sub: 'Detectar directorios de dependencias y caches pesadas', icon: '💻', type: 'tool', action: () => runSmartScan('junk_folders', 'Caches y node_modules') },
    { title: '🧹 Limpiar Archivos .DS_Store Ocultos', sub: 'Eliminar archivos .DS_Store de la carpeta actual recursivamente', icon: '🧹', type: 'tool', action: () => cleanDsStoreAction() },
    { title: '📊 Analizador de Espacio en Disco', sub: 'Desglose visual de espacio por tipo (Imágenes, Videos, Docs...)', icon: '📊', type: 'tool', action: () => openDiskAnalyzer() },
    
    // ── Quick Actions ──
    { title: 'Reabrir Pestaña Cerrada', sub: 'Restaurar la última pestaña cerrada (⇧⌘T)', icon: '↺', type: 'command', action: () => reopenClosedTab() },
    { title: 'Nueva Carpeta', sub: 'Crear una carpeta en la ruta actual', icon: '📁', type: 'command', action: () => createNewFolderAction() },
    { title: 'Nuevo Archivo (.txt)', sub: 'Crear un archivo de texto', icon: '📄', type: 'command', action: () => createNewTextFileAction() },
    { title: 'Ocultar / Mostrar Barra Lateral', sub: 'Alternar panel izquierdo (⌘B)', icon: '📐', type: 'command', action: () => toggleSidebar() },
    { title: 'Ocultar / Mostrar Previsualización', sub: 'Alternar panel derecho (⌘⌥P)', icon: '👁️', type: 'command', action: () => togglePreviewPanel() },
    { title: 'Abrir en Terminal', sub: 'Lanzar Terminal en la carpeta actual', icon: '🖥️', type: 'command', action: () => window.api.openTerminal(state.currentPath) },
    { title: 'Abrir en VS Code', sub: 'Abrir proyecto en Visual Studio Code', icon: '💻', type: 'command', action: () => window.api.openEditor(state.currentPath) },
    { title: 'Copiar Ruta Actual', sub: state.currentPath, icon: '📋', type: 'command', action: () => window.api.copyToClipboard(state.currentPath) },
    { title: 'Modo Doble Panel (Split View)', sub: 'Alternar vista dividida (⌘D)', icon: '🪟', type: 'command', action: () => toggleSplitView() },
    { title: 'Vista Lista', sub: 'Vista detallada con columnas (⌘1)', icon: '📋', type: 'command', action: () => setView('list') },
    { title: 'Vista Íconos (Grid)', sub: 'Vista mosaico de íconos (⌘2)', icon: '▦', type: 'command', action: () => setView('grid') },
    { title: 'Vista Galería', sub: 'Vista multimedia / carrusel (⌘3)', icon: '🖼️', type: 'command', action: () => setView('gallery') },
    { title: 'Tema Antigravity', sub: 'Cosmic Cyan & Quantum Indigo', icon: '🚀', type: 'command', action: () => { state.theme='antigravity'; saveSettings(); setTheme('antigravity'); } },
    { title: 'Tema Goku Blue', sub: 'Azul Goku Fase Dios', icon: '⚡', type: 'command', action: () => { state.theme='goku-blue'; saveSettings(); setTheme('goku-blue'); } },
    { title: 'Tema Pink', sub: 'Pink Pastel', icon: '🌸', type: 'command', action: () => { state.theme='pink-light'; saveSettings(); setTheme('pink-light'); } }
  ];

  commands.forEach(c => {
    if (!q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)) {
      items.push(c);
    }
  });

  state.favorites.forEach(f => {
    if (!q || f.label.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)) {
      items.push({
        type: 'folder',
        title: f.label,
        sub: f.path,
        icon: f.icon || '⭐',
        action: () => navigateTo(f.path)
      });
    }
  });

  state.entries.forEach(e => {
    if (!q || e.name.toLowerCase().includes(q)) {
      items.push({
        type: e.isDir ? 'folder' : 'file',
        title: e.name,
        sub: e.fullPath,
        icon: fileIcon(e.name, e.isDir),
        action: () => {
          if (e.isDir) navigateTo(e.fullPath);
          else window.api.openFile(e.fullPath);
        }
      });
    }
  });

  if (!items.length) {
    resultsContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t3);font-size:12px;">No se encontraron resultados</div>';
    return;
  }

  items.slice(0, 35).forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'cmd-item' + (idx === 0 ? ' selected' : '');
    const badgeLabel = item.type === 'tool' ? 'Disco' : (item.type === 'command' ? 'Acción' : (item.type === 'folder' ? 'Carpeta' : 'Archivo'));
    el.innerHTML = `
      <span class="cmd-item-icon">${item.icon}</span>
      <div class="cmd-item-text">
        <span class="cmd-item-title">${escapeHTML(item.title)}</span>
        <span class="cmd-item-sub">${escapeHTML(item.sub)}</span>
      </div>
      <span class="cmd-badge">${badgeLabel}</span>
    `;
    el.addEventListener('click', () => {
      closeCommandPalette();
      item.action();
    });
    resultsContainer.appendChild(el);
  });
}

async function runSmartScan(type, label) {
  closeCommandPalette();
  const listEl = document.getElementById('file-list');
  if (listEl) {
    listEl.innerHTML = `
      <div class="empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:30px;">
        <div class="es-icon" style="font-size:48px;margin-bottom:12px;">🔍</div>
        <h2 style="font-size:15px;font-weight:600;color:var(--t1);">Analizando disco...</h2>
        <p style="color:var(--t2);font-size:12px;margin-top:4px;">${escapeHTML(label)}</p>
      </div>
    `;
  }
  const results = await window.api.smartScan(state.currentPath, type);
  state.searchResults = (results && !results.error) ? results : [];
  state.searchQuery = label;
  rerenderTree();
  updateStatus();
}

async function cleanDsStoreAction() {
  closeCommandPalette();
  if (confirm(`¿Limpiar archivos .DS_Store recursivamente en "${state.currentPath}"?`)) {
    const res = await window.api.cleanDsStore(state.currentPath);
    if (res && res.success) {
      alert(`✨ Limpieza completada: Se eliminaron ${res.count} archivo(s) .DS_Store.`);
      await reloadCurrentDir();
    } else {
      alert('No se encontraron archivos .DS_Store o hubo un error.');
    }
  }
}

async function openDiskAnalyzer() {
  closeCommandPalette();
  const overlay = document.getElementById('disk-analyzer-overlay');
  const body = document.getElementById('disk-analyzer-body');
  if (!overlay || !body) return;
  overlay.classList.remove('hidden');
  body.innerHTML = `
    <div style="text-align:center;padding:28px 10px;">
      <div style="font-size:40px;margin-bottom:10px;">📊</div>
      <div style="font-size:14px;font-weight:600;color:var(--t1);">Analizando uso de espacio...</div>
      <div style="font-size:12px;color:var(--t3);margin-top:4px;">${escapeHTML(state.currentPath)}</div>
    </div>
  `;

  const data = await window.api.diskBreakdown(state.currentPath);
  if (!data || !data.categories) {
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--t2);">No se pudo analizar esta carpeta.</div>';
    return;
  }

  const { totalSize, fileCount, dirCount, categories } = data;
  const colors = {
    images: '#ff6b6b',
    videos: '#f06595',
    audio: '#cc5de8',
    docs: '#339af0',
    code: '#20c997',
    archives: '#fcc419',
    other: '#868e96'
  };

  let segsHtml = '';
  let catsHtml = '';

  Object.entries(categories).forEach(([key, cat]) => {
    const pct = totalSize > 0 ? (cat.size / totalSize) * 100 : 0;
    const color = colors[key] || '#868e96';
    if (pct > 0) {
      segsHtml += `<div class="disk-bar-seg" style="width:${pct.toFixed(1)}%;background:${color};" title="${cat.label}: ${formatSize(cat.size)} (${pct.toFixed(1)}%)"></div>`;
    }
    catsHtml += `
      <div class="disk-cat-row">
        <div class="disk-cat-left">
          <span class="disk-cat-dot" style="background:${color};"></span>
          <span>${cat.icon} ${cat.label}</span>
        </div>
        <div class="disk-cat-right">
          <span class="disk-cat-count">${cat.count} archivos</span>
          <span class="disk-cat-size">${formatSize(cat.size)}</span>
        </div>
      </div>
    `;
  });

  body.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:11px;color:var(--t3);text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">Espacio Ocupado</div>
          <div style="font-size:20px;font-weight:700;color:var(--t1);">${formatSize(totalSize)}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:var(--t2);">
          ${fileCount} archivos · ${dirCount} subcarpetas
        </div>
      </div>
      <div class="disk-bar-track">
        ${segsHtml || '<div class="disk-bar-seg" style="width:100%;background:var(--bg-hover);"></div>'}
      </div>
    </div>
    <div style="max-height:240px;overflow-y:auto;padding-right:2px;">
      ${catsHtml}
    </div>
  `;
}

document.getElementById('disk-analyzer-close')?.addEventListener('click', () => {
  document.getElementById('disk-analyzer-overlay')?.classList.add('hidden');
});
document.getElementById('disk-analyzer-btn-close')?.addEventListener('click', () => {
  document.getElementById('disk-analyzer-overlay')?.classList.add('hidden');
});

async function createNewFolderAction() {
  const p = window.api.pathJoin(state.currentPath, 'Nueva_Carpeta');
  const res = await window.api.createFolder(p);
  if (res && res.error) alert('Error: ' + res.error);
  await reloadCurrentDir();
}

async function createNewTextFileAction() {
  const p = window.api.pathJoin(state.currentPath, 'Nuevo_Archivo.txt');
  const res = await window.api.createFile(p);
  if (res && res.error) alert('Error: ' + res.error);
  await reloadCurrentDir();
}

/* ═══════════════════════════════════════════════════════════════════════════
   BATCH RENAME MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
let batchRenameFiles = [];
let batchMode = 'replace';

function openBatchRename(paths) {
  batchRenameFiles = paths || Array.from(state.selectedItems);
  if (!batchRenameFiles.length && state.selectedFile) batchRenameFiles = [state.selectedFile.fullPath];
  if (!batchRenameFiles.length) return;

  const modal = document.getElementById('batch-rename-overlay');
  document.getElementById('brm-count').textContent = batchRenameFiles.length;
  modal.classList.remove('hidden');
  updateBatchRenamePreview();
}

function closeBatchRename() {
  document.getElementById('batch-rename-overlay')?.classList.add('hidden');
}

function updateBatchRenamePreview() {
  const previewList = document.getElementById('brm-preview-list');
  if (!previewList) return;
  previewList.innerHTML = '';

  const findVal = document.getElementById('brm-find')?.value || '';
  const replaceVal = document.getElementById('brm-replace')?.value || '';
  const isCase = document.getElementById('brm-case-sensitive')?.checked || false;

  const prefixVal = document.getElementById('brm-prefix')?.value || '';
  const suffixVal = document.getElementById('brm-suffix')?.value || '';

  const numBase = document.getElementById('brm-num-base')?.value || 'Track';
  const numStart = parseInt(document.getElementById('brm-num-start')?.value, 10) || 1;
  const numDigits = parseInt(document.getElementById('brm-num-digits')?.value, 10) || 2;

  batchRenameFiles.forEach((fullPath, idx) => {
    const oldName = fullPath.split('/').pop();
    const ext = oldName.includes('.') ? '.' + oldName.split('.').pop() : '';
    const baseWithoutExt = oldName.slice(0, oldName.length - ext.length);
    let newName = oldName;

    if (batchMode === 'replace') {
      if (findVal) {
        const regex = new RegExp(findVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), isCase ? 'g' : 'gi');
        newName = oldName.replace(regex, replaceVal);
      }
    } else if (batchMode === 'prefix-suffix') {
      newName = `${prefixVal}${baseWithoutExt}${suffixVal}${ext}`;
    } else if (batchMode === 'numbering') {
      const numStr = String(numStart + idx).padStart(numDigits, '0');
      newName = `${numBase} ${numStr}${ext}`;
    }

    const row = document.createElement('div');
    row.className = 'brm-preview-row';
    row.innerHTML = `
      <span class="brm-old-name">${escapeHTML(oldName)}</span>
      <span class="brm-arrow">➔</span>
      <span class="brm-new-name">${escapeHTML(newName)}</span>
    `;
    previewList.appendChild(row);
  });
}

async function applyBatchRename() {
  const findVal = document.getElementById('brm-find')?.value || '';
  const replaceVal = document.getElementById('brm-replace')?.value || '';
  const isCase = document.getElementById('brm-case-sensitive')?.checked || false;

  const prefixVal = document.getElementById('brm-prefix')?.value || '';
  const suffixVal = document.getElementById('brm-suffix')?.value || '';

  const numBase = document.getElementById('brm-num-base')?.value || 'Track';
  const numStart = parseInt(document.getElementById('brm-num-start')?.value, 10) || 1;
  const numDigits = parseInt(document.getElementById('brm-num-digits')?.value, 10) || 2;

  for (let idx = 0; idx < batchRenameFiles.length; idx++) {
    const fullPath = batchRenameFiles[idx];
    const oldName = fullPath.split('/').pop();
    const ext = oldName.includes('.') ? '.' + oldName.split('.').pop() : '';
    const baseWithoutExt = oldName.slice(0, oldName.length - ext.length);
    let newName = oldName;

    if (batchMode === 'replace') {
      if (findVal) {
        const regex = new RegExp(findVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), isCase ? 'g' : 'gi');
        newName = oldName.replace(regex, replaceVal);
      }
    } else if (batchMode === 'prefix-suffix') {
      newName = `${prefixVal}${baseWithoutExt}${suffixVal}${ext}`;
    } else if (batchMode === 'numbering') {
      const numStr = String(numStart + idx).padStart(numDigits, '0');
      newName = `${numBase} ${numStr}${ext}`;
    }

    if (newName && newName !== oldName) {
      await window.api.rename(fullPath, newName);
    }
  }

  closeBatchRename();
  state.selectedItems.clear();
  state.selectedFile = null;
  await reloadCurrentDir();
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown',(e)=>{
  // Global saves should work even if focused in textarea
  if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault(); e.stopPropagation();state.editorSaveFn?.();return;}

  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') {
    if (e.key === 'Escape') {
      closeCommandPalette();
      closeBatchRename();
    }
    return;
  }

  const isCmd = e.metaKey || e.ctrlKey;
  if(isCmd&&e.shiftKey&&e.key.toLowerCase()==='t'){e.preventDefault(); e.stopPropagation();reopenClosedTab();return;}
  if(isCmd&&!e.shiftKey&&e.key.toLowerCase()==='t'){e.preventDefault(); e.stopPropagation();openNewTab();return;}
  if(isCmd&&e.key.toLowerCase()==='w'){e.preventDefault(); e.stopPropagation();closeTab(activeTabId);return;}
  if(isCmd&&(e.key.toLowerCase()==='k'||e.key.toLowerCase()==='p')){e.preventDefault(); e.stopPropagation();openCommandPalette();return;}
  if(isCmd&&e.key.toLowerCase()==='b'){e.preventDefault(); e.stopPropagation();toggleSidebar();return;}
  if(isCmd&&e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault(); e.stopPropagation();togglePreviewPanel();return;}
  if(isCmd&&e.key==='['){e.preventDefault(); e.stopPropagation();navigateBack();return;}
  if(isCmd&&e.key===']'){e.preventDefault(); e.stopPropagation();navigateForward();return;}
  if(isCmd&&e.altKey&&e.key.toLowerCase()==='c'){
    e.preventDefault(); e.stopPropagation();
    const p = state.selectedFile?.fullPath || state.currentPath;
    if (p) window.api.copyToClipboard(p);
    return;
  }

  if(e.ctrlKey&&e.key==='Tab'){
    e.preventDefault(); e.stopPropagation();
    if(tabs.length>1){
      const currIdx = tabs.findIndex(t => t.id === activeTabId);
      const nextIdx = e.shiftKey ? (currIdx - 1 + tabs.length) % tabs.length : (currIdx + 1) % tabs.length;
      switchTab(tabs[nextIdx].id);
    }
    return;
  }
  if(isCmd && e.key === '1'){ e.preventDefault(); setView('list'); return; }
  if(isCmd && e.key === '2'){ e.preventDefault(); setView('grid'); return; }
  if(isCmd && e.key === '3'){ e.preventDefault(); setView('gallery'); return; }

  if(isCmd&&e.key.toLowerCase()==='z'){e.preventDefault(); e.stopPropagation();performUndo();return;}
  if(isCmd&&e.key.toLowerCase()==='n'){e.preventDefault(); e.stopPropagation();window.api.newWindow(state.currentPath);return;}
  if(isCmd&&e.key.toLowerCase()==='f'){e.preventDefault(); e.stopPropagation();searchWrap.classList.remove('search-collapsed');searchInput.focus();return;}
  if(isCmd&&e.key.toLowerCase()==='o'&&state.selectedFile){e.preventDefault(); e.stopPropagation();window.api.openFile(state.selectedFile.fullPath);return;}
  
  // Cmd+A: Select All
  if(isCmd&&e.key.toLowerCase()==='a'){
    e.preventDefault(); e.stopPropagation();
    state.selectedItems.clear();
    state.treeItems.forEach(item => state.selectedItems.add(item.entry.fullPath));
    if(state.treeItems.length) {
      state.selectedFile = state.treeItems[state.treeItems.length - 1].entry;
      state.focusedIdx = state.treeItems.length - 1;
    }
    rerenderTree();
    return;
  }

  // Cmd+C: Copy
  if(isCmd&&e.key.toLowerCase()==='c'){
    if(state.selectedItems.size > 0) {
      window._clipboard = { type: 'copy', paths: Array.from(state.selectedItems) };
    }
    return;
  }

  // Cmd+X: Cut
  if(isCmd&&e.key.toLowerCase()==='x'){
    if(state.selectedItems.size > 0) {
      window._clipboard = { type: 'move', paths: Array.from(state.selectedItems) };
    }
    return;
  }

  // Cmd+V: Paste
  if(isCmd&&e.key.toLowerCase()==='v'){
    if(window._clipboard && window._clipboard.paths.length > 0) {
      const dest = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
      const valid = window._clipboard.paths.filter(p => p !== dest);
      if(valid.length) {
        window.api[window._clipboard.type](valid, dest).then(reloadCurrentDir);
        if(window._clipboard.type === 'move') window._clipboard = null;
      }
    }
    return;
  }

  // Cmd+Backspace or Cmd+Delete: Send to macOS Trash (or Cmd+Alt+Delete for permanent)
  if (isCmd && (e.key === 'Backspace' || e.key === 'Delete' || e.code === 'Backspace' || e.code === 'Delete')) {
    e.preventDefault(); e.stopPropagation();
    const targets = state.selectedItems.size > 0 
      ? Array.from(state.selectedItems) 
      : (state.selectedFile ? [state.selectedFile.fullPath] : []);
    if (targets.length > 0) {
      if (e.altKey) {
        if (confirm(`¿Eliminar permanentemente ${targets.length === 1 ? 'este elemento' : `${targets.length} elementos`}?`)) {
          window.api.delete(targets).then(() => {
            state.selectedItems.clear();
            state.selectedFile = null;
            reloadCurrentDir();
          });
        }
      } else {
        window.api.trashItem(targets).then(() => {
          state.selectedItems.clear();
          state.selectedFile = null;
          reloadCurrentDir();
        });
      }
    }
    return;
  }

  // Cmd+Up/Down
  if(isCmd&&e.key==='ArrowDown'&&state.selectedFile){
    e.preventDefault(); e.stopPropagation();
    if(state.selectedFile.isDir) navigateTo(state.selectedFile.fullPath);
    else window.api.openFile(state.selectedFile.fullPath);
    return;
  }
  if(isCmd&&e.key==='ArrowUp'){
    e.preventDefault(); e.stopPropagation();
    if(state.currentPath&&state.currentPath!=='/') navigateTo(state.currentPath.split('/').slice(0,-1).join('/')||'/');
    return;
  }

  if(e.key==='ArrowDown'){
    e.preventDefault(); e.stopPropagation();
    let jump = 1;
    if(state.viewMode==='grid'){
      const items=document.querySelectorAll('#file-list .file-item');
      if(items.length>1){ let cols=0,y=items[0].offsetTop; for(let i=0;i<items.length;i++){if(items[i].offsetTop===y)cols++;else break;} jump=cols||1; }
    }
    moveSelection(jump);
    return;
  }
  if(e.key==='ArrowUp'){
    e.preventDefault(); e.stopPropagation();
    let jump = -1;
    if(state.viewMode==='grid'){
      const items=document.querySelectorAll('#file-list .file-item');
      if(items.length>1){ let cols=0,y=items[0].offsetTop; for(let i=0;i<items.length;i++){if(items[i].offsetTop===y)cols++;else break;} jump=-(cols||1); }
    }
    moveSelection(jump);
    return;
  }
  if(e.key==='ArrowRight'){
    e.preventDefault(); e.stopPropagation();
    if(state.viewMode==='grid'){ moveSelection(+1); return; }
    if(state.selectedFile?.isDir){
      const item=state.treeItems.find(t=>t.entry.fullPath===state.selectedFile.fullPath);
      if(item&&!item.expanded) toggleFolder(item,document.getElementById('file-list'));
    }
    return;
  }
  if(e.key==='ArrowLeft'){
    e.preventDefault(); e.stopPropagation();
    if(state.viewMode==='grid'){ moveSelection(-1); return; }
    if(state.selectedFile?.isDir){
      const item=state.treeItems.find(t=>t.entry.fullPath===state.selectedFile.fullPath);
      if(item?.expanded){toggleFolder(item,document.getElementById('file-list'));return;}
    }
    if(state.currentPath&&state.currentPath!=='/') navigateTo(state.currentPath.split('/').slice(0,-1).join('/')||'/');
    return;
  }

  if(e.key===' '){e.preventDefault(); e.stopPropagation();if(!qlOverlay.classList.contains('hidden')){closeQuickLook();}else if(state.selectedFile&&!state.selectedFile.isDir){openQuickLook(state.selectedFile);}return;}
  if(e.key==='Enter'&&state.selectedFile&&!state.renaming){e.preventDefault(); e.stopPropagation();startRename(state.selectedFile);return;}
  if(e.key==='Escape'){closeQuickLook();closeSettings();closeCommandPalette();closeBatchRename();return;}
  if((e.key==='Backspace'||e.key==='Delete')&&!state.renaming&&qlOverlay.classList.contains('hidden')){if(state.currentPath&&state.currentPath!=='/')navigateTo(state.currentPath.split('/').slice(0,-1).join('/')||'/');}
});

/* ═══════════════════════════════════════════════════════════════════════════
   VIEW TOGGLE + RESIZE SIDEBAR + DIVIDER
   ═══════════════════════════════════════════════════════════════════════════ */
document.getElementById('btn-view-list')?.addEventListener('click',()=>setView('list'));
document.getElementById('btn-view-grid')?.addEventListener('click',()=>setView('grid'));
document.getElementById('btn-view-gallery')?.addEventListener('click',()=>setView('gallery'));
document.getElementById('btn-toggle-split')?.addEventListener('click',()=>toggleSplitView());
document.getElementById('btn-cmd-palette')?.addEventListener('click',()=>openCommandPalette());

function setView(mode){
  state.viewMode = mode || 'list';
  saveSettings();
  const content = document.getElementById('content');
  if (content) {
    content.classList.toggle('view-grid', mode === 'grid');
    content.classList.toggle('view-gallery', mode === 'gallery');
  }
  
  document.getElementById('btn-view-list')?.classList.toggle('active', mode === 'list');
  document.getElementById('btn-view-grid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('btn-view-gallery')?.classList.toggle('active', mode === 'gallery');

  const gView = document.getElementById('gallery-view');
  const fList = document.getElementById('file-list');
  if (mode === 'gallery') {
    gView?.classList.remove('hidden');
    fList?.classList.add('hidden');
    renderGalleryView(state.currentPath);
  } else {
    gView?.classList.add('hidden');
    fList?.classList.remove('hidden');
    renderColHeaders();
    rerenderTree();
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const div = document.getElementById('divider');
  const btn = document.getElementById('btn-toggle-sidebar');
  if (!sb) return;
  const isHidden = sb.classList.toggle('hidden');
  div?.classList.toggle('hidden', isHidden);
  btn?.classList.toggle('active', !isHidden);
  state.sidebarVisible = !isHidden;
  saveSettings();
}

function togglePreviewPanel() {
  const prev = document.getElementById('preview-panel');
  const div = document.getElementById('preview-divider');
  const btn = document.getElementById('btn-toggle-preview');
  if (!prev) return;
  const isHidden = prev.classList.contains('hidden');
  if (isHidden) {
    if (state.selectedFile) {
      showFileContent(state.selectedFile);
    } else {
      prev.classList.remove('hidden');
      div?.classList.remove('hidden');
      const inner = document.getElementById('preview-inner');
      if (inner) inner.innerHTML = `<div id="preview-placeholder"><div class="prev-empty-icon">👆</div><p>Selecciona un elemento para ver su información</p></div>`;
    }
    btn?.classList.add('active');
  } else {
    hidePreview();
    btn?.classList.remove('active');
  }
}

/* Sidebar resize */
const divider = document.getElementById('divider');
const sidebar = document.getElementById('sidebar');
let isResizingSb = false;
divider?.addEventListener('mousedown',()=>{
  isResizingSb = true;
  divider.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

const prevDivider = document.getElementById('preview-divider');
const prevPanel = document.getElementById('preview-panel');
let isResizingPrev = false;
prevDivider?.addEventListener('mousedown',()=>{
  isResizingPrev = true;
  prevDivider.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  if (prevPanel) prevPanel.style.transition = 'none';
});

document.addEventListener('mousemove',(e)=>{
  if(isResizingSb && sidebar){
    sidebar.style.width = Math.max(160, Math.min(e.clientX, 340)) + 'px';
  }
  if(isResizingPrev){
    const maxW = Math.round(window.innerWidth * 0.75);
    const w = Math.max(180, Math.min(window.innerWidth - e.clientX, maxW));
    document.documentElement.style.setProperty('--preview-w', w + 'px');
  }
});

document.addEventListener('mouseup',()=>{
  if(isResizingSb){
    isResizingSb = false;
    divider?.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
  if(isResizingPrev){
    isResizingPrev = false;
    prevDivider?.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (prevPanel) prevPanel.style.transition = '';
  }
});

const originalApi = { rename: window.api.rename, move: window.api.move, copy: window.api.copy, delete: window.api.delete };
window.api.rename = async (oldPath, newPath) => {
  const res = await originalApi.rename(oldPath, newPath);
  if (res && res.success) pushUndo('rename', { oldPath, newPath: res.newPath || newPath });
  return res;
};
window.api.move = async (srcs, destDir) => {
  const res = await originalApi.move(srcs, destDir);
  if (res && (res.success || !res.error)) {
    const moves = srcs.map(p => ({ from: p, to: window.api.pathJoin(destDir, window.api.basename(p)) }));
    pushUndo('move', { moves });
  }
  return res;
};
window.api.copy = async (srcs, destDir) => {
  const res = await originalApi.copy(srcs, destDir);
  if (res && (res.success || !res.error)) {
    const copies = srcs.map(p => window.api.pathJoin(destDir, window.api.basename(p)));
    pushUndo('copy', { copies });
  }
  return res;
};
window.api.delete = async (srcs) => {
  const res = await originalApi.delete(srcs);
  if (res && (res.success || !res.error)) pushUndo('delete', {});
  return res;
};

// Smart filters
document.querySelectorAll('.smart-filter').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const type = btn.dataset.type;
    if (state.smartFilter === type) {
      state.smartFilter = null;
      btn.classList.remove('active');
    } else {
      state.smartFilter = type;
      document.querySelectorAll('.smart-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    rerenderTree();
  });
});

// Drop Stack Logic
let dropStackPaths = new Set();
const dsEl = document.getElementById('drop-stack');
const dsItems = document.getElementById('ds-items');
const dsCount = document.getElementById('ds-count');

function updateDropStack() {
  if (dropStackPaths.size > 0) {
    dsEl.classList.remove('hidden');
    dsCount.textContent = dropStackPaths.size;
    dsItems.innerHTML = '';
    Array.from(dropStackPaths).forEach(p => {
      const el = document.createElement('div');
      el.className = 'ds-item';
      el.title = p;
      el.draggable = true;

      const icon = fileIcon(window.api.basename(p), false);
      const name = document.createElement('span');
      name.textContent = `${icon} ${window.api.basename(p)}`;

      const delBtn = document.createElement('span');
      delBtn.className = 'ds-item-del';
      delBtn.innerHTML = '&times;';
      delBtn.title = 'Quitar de la pila';
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropStackPaths.delete(p);
        updateDropStack();
      });

      el.appendChild(name);
      el.appendChild(delBtn);

      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('application/json', JSON.stringify(Array.from(dropStackPaths)));
      });
      dsItems.appendChild(el);
    });
  } else {
    dsEl.classList.add('hidden');
  }
}

document.getElementById('ds-clear')?.addEventListener('click', () => {
  dropStackPaths.clear();
  updateDropStack();
});

document.getElementById('ds-btn-move')?.addEventListener('click', async () => {
  if (dropStackPaths.size === 0 || !state.currentPath) return;
  const list = Array.from(dropStackPaths).filter(p => window.api.dirname(p) !== state.currentPath);
  if (list.length > 0) {
    const res = await window.api.move(list, state.currentPath);
    if (res && res.error) alert('Error: ' + res.error);
    else {
      list.forEach(p => dropStackPaths.delete(p));
      updateDropStack();
      await reloadCurrentDir();
    }
  } else {
    alert('Los archivos ya se encuentran en la carpeta actual.');
  }
});

document.getElementById('ds-btn-copy')?.addEventListener('click', async () => {
  if (dropStackPaths.size === 0 || !state.currentPath) return;
  const list = Array.from(dropStackPaths);
  if (list.length > 0) {
    const res = await window.api.copy(list, state.currentPath);
    if (res && res.error) alert('Error: ' + res.error);
    else {
      await reloadCurrentDir();
    }
  }
});

// Drop files directly INTO drop stack container
dsEl.addEventListener('dragover', (e) => {
  e.preventDefault(); e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
});
dsEl.addEventListener('drop', (e) => {
  e.preventDefault(); e.stopPropagation();
  try {
    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      const data = JSON.parse(raw);
      data.forEach(p => dropStackPaths.add(p));
      updateDropStack();
    }
  } catch(err) {}
});

document.addEventListener('dragstart', () => {
  if (dropStackPaths.size === 0) {
    dsCount.textContent = '0';
    dsItems.innerHTML = '<div style="color:var(--t3);font-size:11px;text-align:center;padding:12px;width:100%;">Arrastra archivos aquí para apilarlos</div>';
    dsEl.classList.remove('hidden');
  }
});
document.addEventListener('dragend', () => {
  if (dropStackPaths.size === 0) {
    dsEl.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   INIT & EVENT LISTENERS
   ═══════════════════════════════════════════════════════════════════════════ */
async function init() {
  loadSettings();
  state.homeDirs  = await window.api.getHomeDirs();
  state.icloudPath= await window.api.getiCloudPath();
  state.favorites = loadFavorites() || getDefaultFavorites(state.homeDirs);
  setView(state.viewMode);
  await buildSidebar();
  document.getElementById('file-list')?.classList.toggle('compact-mode', state.compactMode);
  document.getElementById('content')?.classList.toggle('compact-grid', state.compactMode);
  document.getElementById('sidebar')?.classList.toggle('compact-sidebar', state.compactSidebar);

  if (!state.sidebarVisible) {
    document.getElementById('sidebar')?.classList.add('hidden');
    document.getElementById('divider')?.classList.add('hidden');
    document.getElementById('btn-toggle-sidebar')?.classList.remove('active');
  } else {
    document.getElementById('btn-toggle-sidebar')?.classList.add('active');
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const start = urlParams.get('startPath') || state.homeDirs.downloads || state.homeDirs.home || '/';
  
  initTabs(start);
  navigateTo(start);
  setTimeout(() => {
    const m = document.querySelector(`.sidebar-item[data-path="${CSS.escape(start)}"]`);
    if (m) selectSidebarItem(m);
  }, 100);

  document.getElementById('btn-new-tab')?.addEventListener('click', () => openNewTab());
  document.getElementById('btn-hist-back')?.addEventListener('click', () => navigateBack());
  document.getElementById('btn-hist-forward')?.addEventListener('click', () => navigateForward());
  document.getElementById('btn-hist-up')?.addEventListener('click', () => navigateUp());
  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', toggleSidebar);
  document.getElementById('btn-toggle-preview')?.addEventListener('click', togglePreviewPanel);

  // Setup Command Palette listeners
  const cmdInput = document.getElementById('cmd-palette-input');
  cmdInput?.addEventListener('input', (e) => renderCommandPaletteResults(e.target.value));
  document.getElementById('cmd-palette-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'cmd-palette-overlay') closeCommandPalette();
  });

  // Setup Batch Rename listeners
  document.getElementById('brm-close')?.addEventListener('click', closeBatchRename);
  document.getElementById('brm-btn-cancel')?.addEventListener('click', closeBatchRename);
  document.getElementById('brm-btn-apply')?.addEventListener('click', applyBatchRename);
  document.querySelectorAll('.brm-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.brm-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      batchMode = t.dataset.mode;
      document.getElementById('brm-form-replace')?.classList.toggle('hidden', batchMode !== 'replace');
      document.getElementById('brm-form-prefix-suffix')?.classList.toggle('hidden', batchMode !== 'prefix-suffix');
      document.getElementById('brm-form-numbering')?.classList.toggle('hidden', batchMode !== 'numbering');
      updateBatchRenamePreview();
    });
  });
  ['brm-find','brm-replace','brm-case-sensitive','brm-prefix','brm-suffix','brm-num-base','brm-num-start','brm-num-digits'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateBatchRenamePreview);
    document.getElementById(id)?.addEventListener('change', updateBatchRenamePreview);
  });

  setupPersistentPlayer();

  // Listen for new-window navigate-to messages
  window.api.onNavigateTo && window.api.onNavigateTo((path) => {
    navigateTo(path);
  });
}

init();

// Context Menu IPC Handling
window.api.onContextAction && window.api.onContextAction(async (action) => {
  const selected = Array.from(state.selectedItems);
  if (!selected.length && state.selectedFile) selected.push(state.selectedFile.fullPath);
  
  if (action === 'add-to-drop-stack') {
    selected.forEach(p => dropStackPaths.add(p));
    updateDropStack();
    return;
  }
  if (action === 'new-tab') {
    const target = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
    openNewTab(target);
    return;
  }
  if (action === 'new-window') {
    const target = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
    window.api.newWindow(target);
    return;
  }
  if (action === 'open-terminal') {
    const target = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
    window.api.openTerminal(target);
    return;
  }
  if (action === 'open-vscode') {
    const target = state.selectedFile ? state.selectedFile.fullPath : state.currentPath;
    window.api.openEditor(target);
    return;
  }
  if (action === 'copy-path') {
    const target = state.selectedFile ? state.selectedFile.fullPath : state.currentPath;
    window.api.copyToClipboard(target);
    return;
  }
  if (action === 'compress') {
    await window.api.compressZip(selected);
    await reloadCurrentDir();
    return;
  }
  if (action === 'batch-rename') {
    openBatchRename(selected);
    return;
  }
  if (action === 'trash') {
    await window.api.trashItem(selected);
    state.selectedItems.clear();
    state.selectedFile = null;
    await reloadCurrentDir();
    return;
  }
  if (action.startsWith('new-file-') || action === 'new-folder') {
    const targetDir = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
    let res;
    if (action === 'new-folder') {
      const p = window.api.pathJoin(targetDir, 'Nueva_Carpeta');
      res = await window.api.createFolder(p);
    } else {
      const ext = action.replace('new-file-', '');
      const p = window.api.pathJoin(targetDir, `Nuevo_Archivo.${ext}`);
      res = await window.api.createFile(p);
    }
    if (res && res.error) alert('Error: ' + res.error);
    await reloadCurrentDir();
    if (res && res.success) {
      setTimeout(() => {
        const item = state.treeItems.find(t => t.entry.fullPath === res.filePath);
        if(item) startRename(item.entry);
      }, 50);
    }
    return;
  }
  if (action === 'delete') {
    await window.api.delete(selected);
    state.selectedItems.clear();
    state.selectedFile = null;
    await reloadCurrentDir();
  } else if (action === 'rename') {
    if (selected.length === 1) {
      const item = state.treeItems.find(t=>t.entry.fullPath===selected[0]);
      if(item) startRename(item.entry);
    } else {
      openBatchRename(selected);
    }
  } else if (action === 'copy') {
    window._clipboard = { type: 'copy', paths: selected };
  } else if (action === 'paste') {
    if(window._clipboard && window._clipboard.paths.length > 0) {
      const dest = (state.selectedFile && state.selectedFile.isDir) ? state.selectedFile.fullPath : state.currentPath;
      const valid = window._clipboard.paths.filter(p => p !== dest);
      if(valid.length) {
        const res = await window.api[window._clipboard.type](valid, dest);
        if(window._clipboard.type === 'move') window._clipboard = null;
        if (res && res.error) alert('Error: ' + res.error);
        await reloadCurrentDir();
      }
    }
  }
});
