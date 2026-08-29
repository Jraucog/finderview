# Changelog

All notable changes to the **FinderView** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-29

### 🎉 Initial Release of FinderView

#### ✨ Navigation & Workspace
- Multi-Tab management with instant restoration (`⌘⇧T`), hover-activated close buttons, and middle-click closing.
- Welcome Hub screen ("Selecciona una carpeta para comenzar") when closing all tabs.
- Accordion tree view with inline directory expansion.
- List, Grid, and Gallery view modes with compact density toggles.
- Dual-Pane split view (`⌘D`) for side-by-side file operations.
- Drop Stack floating dock for multi-file staging and batch actions.
- Full navigation history (`◀`, `▶`, `▲`) with `⌘[`, `⌘]`, and `⌘↑`.

#### ⚡ Command Palette & Disk Management (`⌘K` / `⌘P`)
- Search giant files (> 500 MB) and large files (> 100 MB).
- Search old files (> 365 days / > 180 days) and today's activity.
- Empty folders scanner and development cache cleaner (`node_modules`, `.cache`, `Pods`).
- Recursive `.DS_Store` purger.
- Interactive Disk Analyzer with categorized visual breakdown.

#### 👁️ Preview & Media Engine
- Quick Look modal preview (`Spacebar`).
- Persistent background audio player with playback controls and ID3v2 album art extractor.
- Inline code viewer and text editor with syntax highlighting and direct save (`⌘S`).
- Batch Renamer tool (Find & Replace, Prefix/Suffix, Auto-numbering).

#### 🛡️ Security & Performance
- Zero-trust Electron configuration (`contextIsolation: true`, `nodeIntegration: false`).
- Strict Content Security Policy (CSP).
- Command injection prevention via argument array parameterization.
- Automated security audit suite (`npm run test:security`) with 100% test coverage.

#### 🎨 Customization
- Built-in theme engine: Cosmic Antigravity, Goku Blue, Pink Pastel, Dark, Light, Cyberpunk, and Forest.
- Configurable sidebar sections with optional Recents and Most Frequent widgets.
