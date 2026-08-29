const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow(startPath) {
  const win = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#1c1c1e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    trafficLightPosition: { x: 14, y: 16 },
  });

  const query = startPath ? { startPath } : {};
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query });
  
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (startPath) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('navigate-to', startPath);
    });
  }
  if (!mainWindow) mainWindow = win;
  return win;
}

app.whenReady().then(() => createWindow());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('new-window', async (_event, startPath) => {
  return createWindow(startPath || null);
});

ipcMain.handle('window:close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('fs:search', async (_event, dirPath, query) => {
  const q = query.toLowerCase();
  const results = [];
  let count = 0;
  async function walk(currentDir, depth) {
    if (depth > 5 || count > 200) return;
    try {
      const entries = await require('fs').promises.readdir(currentDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const fullPath = path.join(currentDir, e.name);
        if (e.name.toLowerCase().includes(q)) {
          try {
            const s = fs.statSync(fullPath);
            results.push({ name: e.name, isDir: e.isDirectory(), size: s.size, mtime: s.mtimeMs, fullPath, parentDir: currentDir });
            count++;
            if (count > 200) return;
          } catch(err) {}
        }
        if (e.isDirectory()) {
          await walk(fullPath, depth + 1);
        }
      }
    } catch(e) {}
  }
  await walk(dirPath, 0);
  return results;
});

ipcMain.handle('fs:smartScan', async (_event, dirPath, filterType, options = {}) => {
  const results = [];
  const now = Date.now();
  let count = 0;
  const maxResults = options.maxResults || 200;
  const maxDepth = options.maxDepth || 6;

  async function walk(currentDir, depth) {
    if (depth > maxDepth || count >= maxResults) return;
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const e of entries) {
        if (filterType !== 'junk_folders' && (e.name === 'node_modules' || e.name === '.git')) continue;
        const fullPath = path.join(currentDir, e.name);

        if (filterType === 'empty_folders' && e.isDirectory()) {
          try {
            const sub = await fs.promises.readdir(fullPath);
            if (sub.length === 0) {
              results.push({ name: e.name, fullPath, isDir: true, size: 0, mtime: new Date().toISOString() });
              count++;
              if (count >= maxResults) return;
            }
          } catch (_) {}
        } else if (filterType === 'junk_folders' && e.isDirectory()) {
          if (['node_modules', '.cache', '.npm', '.yarn', 'Pods', '.gradle', 'vendor', '.pytest_cache'].includes(e.name)) {
            try {
              const s = fs.statSync(fullPath);
              results.push({ name: e.name, fullPath, isDir: true, size: 0, mtime: s.mtime.toISOString() });
              count++;
              if (count >= maxResults) return;
            } catch (_) {}
          }
        } else if (!e.isDirectory()) {
          try {
            const s = fs.statSync(fullPath);
            const mtimeMs = s.mtimeMs;
            const size = s.size;
            let match = false;

            if (filterType === 'large_500mb' && size >= 500 * 1024 * 1024) {
              match = true;
            } else if (filterType === 'large_100mb' && size >= 100 * 1024 * 1024) {
              match = true;
            } else if (filterType === 'large_1gb' && size >= 1024 * 1024 * 1024) {
              match = true;
            } else if (filterType === 'old_1year' && (now - mtimeMs) >= 365 * 24 * 3600 * 1000) {
              match = true;
            } else if (filterType === 'old_6months' && (now - mtimeMs) >= 180 * 24 * 3600 * 1000) {
              match = true;
            } else if (filterType === 'modified_today' && (now - mtimeMs) <= 24 * 3600 * 1000) {
              match = true;
            } else if (filterType === 'screenshots') {
              const lower = e.name.toLowerCase();
              if (lower.startsWith('screenshot') || lower.startsWith('captura de pantalla') || lower.startsWith('screen shot')) {
                match = true;
              }
            } else if (filterType === 'ds_store' && e.name === '.DS_Store') {
              match = true;
            }

            if (match) {
              results.push({ name: e.name, fullPath, isDir: false, size, mtime: s.mtime.toISOString(), birthtime: s.birthtime.toISOString() });
              count++;
              if (count >= maxResults) return;
            }
          } catch (_) {}
        }

        if (e.isDirectory()) {
          await walk(fullPath, depth + 1);
        }
      }
    } catch (_) {}
  }

  await walk(dirPath, 0);
  if (filterType.startsWith('large')) {
    results.sort((a, b) => b.size - a.size);
  } else if (filterType.startsWith('old')) {
    results.sort((a, b) => new Date(a.mtime) - new Date(b.mtime));
  } else if (filterType === 'modified_today') {
    results.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  }
  return results;
});

ipcMain.handle('fs:cleanDsStore', async (_event, dirPath) => {
  let count = 0;
  async function walk(cur, depth) {
    if (depth > 6) return;
    try {
      const entries = await fs.promises.readdir(cur, { withFileTypes: true });
      for (const e of entries) {
        const fp = path.join(cur, e.name);
        if (e.name === '.DS_Store') {
          try { fs.unlinkSync(fp); count++; } catch (_) {}
        } else if (e.isDirectory() && e.name !== '.git' && e.name !== 'node_modules') {
          await walk(fp, depth + 1);
        }
      }
    } catch (_) {}
  }
  await walk(dirPath, 0);
  return { success: true, count };
});

ipcMain.handle('fs:diskBreakdown', async (_event, dirPath) => {
  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;
  const categories = {
    images: { label: 'Imágenes', count: 0, size: 0, icon: '🖼️' },
    videos: { label: 'Videos', count: 0, size: 0, icon: '🎬' },
    audio: { label: 'Audio', count: 0, size: 0, icon: '🎵' },
    docs: { label: 'Documentos', count: 0, size: 0, icon: '📄' },
    code: { label: 'Código', count: 0, size: 0, icon: '💻' },
    archives: { label: 'Comprimidos', count: 0, size: 0, icon: '🗜️' },
    other: { label: 'Otros', count: 0, size: 0, icon: '📦' },
  };

  async function walk(cur, depth) {
    if (depth > 5 || fileCount > 6000) return;
    try {
      const entries = await fs.promises.readdir(cur, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const fp = path.join(cur, e.name);
        if (e.isDirectory()) {
          dirCount++;
          await walk(fp, depth + 1);
        } else {
          try {
            const s = fs.statSync(fp);
            const size = s.size;
            totalSize += size;
            fileCount++;
            const ext = path.extname(e.name).replace('.', '').toLowerCase();
            if (['jpg','jpeg','png','gif','webp','svg','heic','bmp','tiff','ico'].includes(ext)) {
              categories.images.count++; categories.images.size += size;
            } else if (['mp4','mov','avi','mkv','webm','m4v','flv','wmv'].includes(ext)) {
              categories.videos.count++; categories.videos.size += size;
            } else if (['mp3','wav','flac','aif','aiff','m4a','ogg','opus','aac'].includes(ext)) {
              categories.audio.count++; categories.audio.size += size;
            } else if (['pdf','doc','docx','txt','md','xls','xlsx','csv','ppt','pptx','rtf'].includes(ext)) {
              categories.docs.count++; categories.docs.size += size;
            } else if (['js','ts','jsx','tsx','py','rb','go','rs','java','c','cpp','html','css','json','sh','yaml','yml'].includes(ext)) {
              categories.code.count++; categories.code.size += size;
            } else if (['zip','rar','tar','gz','7z','dmg','pkg','iso','bz2'].includes(ext)) {
              categories.archives.count++; categories.archives.size += size;
            } else {
              categories.other.count++; categories.other.size += size;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
  await walk(dirPath, 0);
  return { totalSize, fileCount, dirCount, categories };
});

ipcMain.handle('fs:readdir', async (_event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => {
        const full = path.join(dirPath, e.name);
        let size = null, mtime = null, birthtime = null;
        try {
          const stat = fs.statSync(full);
          size = stat.size;
          mtime = stat.mtime.toISOString();
          birthtime = stat.birthtime.toISOString();
        } catch (_) {}
        return { name: e.name, fullPath: full, isDir: e.isDirectory(), size, mtime, birthtime };
      })
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:subdirs', async (_event, dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({ name: e.name, fullPath: path.join(dirPath, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (_) { return []; }
});

ipcMain.handle('fs:stat', async (_event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      birthtime: stat.birthtime.toISOString(),
      isDir: stat.isDirectory(),
    };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:readText', async (_event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content: content.slice(0, 200000) };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:writeFile', async (_event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:rename', async (_event, oldPath, newName) => {
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:copy', async (_event, sourcePaths, destDir) => {
  try {
    for (const src of sourcePaths) {
      const dest = path.join(destDir, path.basename(src));
      fs.cpSync(src, dest, { recursive: true });
    }
    return { success: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:move', async (_event, sourcePaths, destDir) => {
  try {
    for (const src of sourcePaths) {
      const dest = path.join(destDir, path.basename(src));
      try {
        fs.renameSync(src, dest);
      } catch (err) {
        if (err.code === 'EXDEV') {
          fs.cpSync(src, dest, { recursive: true });
          fs.rmSync(src, { recursive: true, force: true });
        } else {
          throw err;
        }
      }
    }
    return { success: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:create-file', async (_event, filePath) => {
  try {
    let finalPath = filePath;
    let i = 1;
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(dir, `${base} ${i}${ext}`);
      i++;
    }
    fs.writeFileSync(finalPath, '');
    return { success: true, filePath: finalPath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:create-folder', async (_event, folderPath) => {
  try {
    let finalPath = folderPath;
    let i = 1;
    while (fs.existsSync(finalPath)) {
      finalPath = `${folderPath} ${i}`;
      i++;
    }
    fs.mkdirSync(finalPath);
    return { success: true, filePath: finalPath };
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('fs:delete', async (_event, targetPaths) => {
  try {
    for (const p of targetPaths) {
      fs.rmSync(p, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:openFile', async (_event, filePath) => {
  shell.openPath(filePath);
});

// A tiny ID3v2 parser to extract album art (APIC frame)
ipcMain.handle('fs:getAlbumArt', async (_event, filePath) => {
  let fd = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);
    if (header.toString('ascii', 0, 3) !== 'ID3') return null;
    
    // Size is synchsafe (7 bits per byte)
    const size = (header[6] << 21) | (header[7] << 14) | (header[8] << 7) | header[9];
    const tagsBuf = Buffer.alloc(Math.min(size, 256 * 1024)); // max read 256kb for safety
    fs.readSync(fd, tagsBuf, 0, tagsBuf.length, 10);
    
    let offset = 0;
    while (offset < tagsBuf.length - 10) {
      const frameId = tagsBuf.toString('ascii', offset, offset + 4);
      if (frameId === '\x00\x00\x00\x00') break;
      const frameSize = tagsBuf.readUInt32BE(offset + 4);
      if (frameId === 'APIC') {
        let frameOffset = offset + 10;
        const textEncoding = tagsBuf[frameOffset++];
        // Mime type
        let mimeType = '';
        while (tagsBuf[frameOffset] !== 0 && frameOffset < tagsBuf.length) { mimeType += String.fromCharCode(tagsBuf[frameOffset++]); }
        frameOffset++; // null byte
        const pictureType = tagsBuf[frameOffset++];
        // Description
        if (textEncoding === 0 || textEncoding === 3) {
          while (tagsBuf[frameOffset] !== 0 && frameOffset < tagsBuf.length) frameOffset++; frameOffset++;
        } else {
          while ((tagsBuf[frameOffset] !== 0 || tagsBuf[frameOffset+1] !== 0) && frameOffset < tagsBuf.length - 1) frameOffset += 2; frameOffset += 2;
        }
        if (frameOffset < offset + 10 + frameSize) {
          const imgData = tagsBuf.subarray(frameOffset, offset + 10 + frameSize);
          return `data:${mimeType || 'image/jpeg'};base64,${imgData.toString('base64')}`;
        }
      }
      offset += 10 + frameSize;
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Agregar carpeta a Favoritos',
  });
  if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0];
  return null;
});

ipcMain.handle('fs:getHomeDirs', async () => {
  const home = os.homedir();
  return {
    home,
    desktop:      path.join(home, 'Desktop'),
    downloads:    path.join(home, 'Downloads'),
    documents:    path.join(home, 'Documents'),
    applications: '/Applications',
    pictures:     path.join(home, 'Pictures'),
    music:        path.join(home, 'Music'),
    movies:       path.join(home, 'Movies'),
    trash:        path.join(home, '.Trash'),
  };
});

ipcMain.handle('fs:getiCloudPath', async () => {
  const driveFolder = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
  return fs.existsSync(driveFolder) ? driveFolder : null;
});

ipcMain.handle('fs:openTrash', async () => {
  try {
    const { spawn } = require('child_process');
    spawn('osascript', ['-e', 'tell application "Finder" to open trash', '-e', 'tell application "Finder" to activate']);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:emptyTrash', async () => {
  try {
    const { spawn } = require('child_process');
    spawn('osascript', ['-e', 'tell application "Finder" to empty trash']);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:trashItem', async (_event, filePaths) => {
  try {
    const list = Array.isArray(filePaths) ? filePaths : [filePaths];
    for (const p of list) {
      await shell.trashItem(p);
    }
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:openTerminal', async (_event, dirPath) => {
  try {
    const { spawn } = require('child_process');
    spawn('open', ['-a', 'Terminal', dirPath]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:openEditor', async (_event, filePath) => {
  try {
    const { spawn } = require('child_process');
    spawn('open', ['-a', 'Visual Studio Code', filePath]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:compressZip', async (_event, sourcePaths) => {
  try {
    const { spawn } = require('child_process');
    const list = Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths];
    if (!list.length) return { error: 'No items to compress' };
    
    for (const src of list) {
      const dir = path.dirname(src);
      const base = path.basename(src);
      const zipName = `${base}.zip`;
      const zipPath = path.join(dir, zipName);
      
      await new Promise((resolve, reject) => {
        const proc = spawn('ditto', ['-c', '-k', '--sequesterRsrc', src, zipPath]);
        proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`ditto exited with ${code}`))));
        proc.on('error', reject);
      });
    }
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

const { Menu, clipboard } = require('electron');
ipcMain.handle('clipboard:write', async (_event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.on('show-context-menu', (event, { isDir, canPaste, itemCount }) => {
  const hasItems = itemCount > 0;
  const template = [
    { label: itemCount > 1 ? `Renombrar ${itemCount} ítems...` : 'Renombrar', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'rename') },
    ...(itemCount > 1 ? [{ label: 'Renombrado Masivo (Batch)...', click: () => event.sender.send('context-menu-action', 'batch-rename') }] : []),
    { label: 'Añadir a Drop Stack', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'add-to-drop-stack') },
    { type: 'separator' },
    { label: 'Copiar', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'copy') },
    { label: 'Copiar ruta completa', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'copy-path') },
    { label: 'Pegar', enabled: canPaste, click: () => event.sender.send('context-menu-action', 'paste') },
    { type: 'separator' },
    { 
      label: 'Nuevo',
      submenu: [
        { label: 'Carpeta', click: () => event.sender.send('context-menu-action', 'new-folder') },
        { type: 'separator' },
        { label: 'Documento de texto (.txt)', click: () => event.sender.send('context-menu-action', 'new-file-txt') },
        { label: 'Documento Markdown (.md)', click: () => event.sender.send('context-menu-action', 'new-file-md') },
        { label: 'Archivo HTML (.html)', click: () => event.sender.send('context-menu-action', 'new-file-html') },
        { label: 'Archivo JavaScript (.js)', click: () => event.sender.send('context-menu-action', 'new-file-js') }
      ]
    },
    { type: 'separator' },
    { label: 'Comprimir a .ZIP', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'compress') },
    { type: 'separator' },
    { label: 'Abrir en Terminal', click: () => event.sender.send('context-menu-action', 'open-terminal') },
    { label: 'Abrir en VS Code', click: () => event.sender.send('context-menu-action', 'open-vscode') },
    { type: 'separator' },
    { label: 'Abrir en nueva pestaña', click: () => event.sender.send('context-menu-action', 'new-tab') },
    { label: 'Abrir en nueva ventana', click: () => event.sender.send('context-menu-action', 'new-window') },
    { type: 'separator' },
    { label: 'Mover a la Papelera', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'trash') },
    { label: 'Eliminar permanentemente', enabled: hasItems, click: () => event.sender.send('context-menu-action', 'delete') }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});
