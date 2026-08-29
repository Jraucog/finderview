# 📁 FinderView

<div align="center">

![FinderView Banner](assets/icon.icns)

**A blazing-fast, modern macOS file manager built with Electron, native macOS integrations, and power-user workflows.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon%20%26%20Intel)-black.svg)](#)
[![Security Audit](https://img.shields.io/badge/Security%20Audit-100%25%20Passed-brightgreen.svg)](#security--hardening)
[![Powered by Antigravity](https://img.shields.io/badge/%E2%9C%A6%20Powered%20by-Antigravity-00e5ff.svg)](#)

</div>

---

## ✨ Features Overview

### 📑 Native Multi-Tabs & Smart Session Hub
- **Multi-Tab Workflow**: Open tabs with `⌘T`, close with `⌘W`, or click with mouse wheel.
- **Reopen Closed Tabs (`⌘⇧T`)**: Seamlessly restore closed tabs with full back/forward navigation history.
- **Welcome Hub Screen**: Closing all tabs reveals a sleek start dashboard with quick-access folders (`Home`, `Desktop`, `Downloads`, `Documents`, `iCloud`) rather than abruptly exiting.

### 🌲 VS Code–Style Accordion Tree & Flexible Views
- **Inline Folder Accordion**: Expand nested folders inline without losing your place.
- **Multiple Layout Modes**:
  - **List View (`⌘1`)**: Detailed metadata columns (Name, Size, Modified Date).
  - **Icon Grid View (`⌘2`)**: High-density visual layout with instant image thumbnails.
  - **Gallery View (`⌘3`)**: Carousel-style hero media browser.
- **Compact Density Modes**: Toggle compact spacing for maximum information density in both the sidebar and file grid.

### 🪟 Dual-Pane Split View (`⌘D`)
- Compare directories side-by-side.
- Drag and drop files effortlessly between primary and secondary panes.

### 🗂️ Drop Stack Multi-File Accumulator
- Pin files from disparate folders into a floating Drop Stack dock.
- Move, copy, or batch rename accumulated files in a single drag-and-drop action.

### ⚡ Command Palette & Disk Management Suite (`⌘K` / `⌘P`)
- **🐘 Giant Files Scanner**: Locate files > 500 MB to recover storage instantly.
- **📦 Large Files Scanner**: Find files > 100 MB.
- **⏳ Old Files Scanner**: Detect files untouched for > 365 days or > 180 days for archiving.
- **✨ Today's Activity**: Filter files created or edited in the last 24 hours.
- **📸 Screenshot Finder**: Quickly organize all system screenshots.
- **📁 Empty Folder Cleaner**: Detect empty directories.
- **💻 Dev Cache Finder**: Locate bulky `node_modules`, `.cache`, `.pytest_cache`, and `Pods`.
- **🧹 .DS_Store Purger**: Recursively clean macOS `.DS_Store` junk files.
- **📊 Disk Space Analyzer**: Visual storage breakdown with interactive category charts (Videos, Images, Audio, Docs, Code, Archives).

### 👁️ In-App Preview & Media Hub (`⌘⌥P` / `Spacebar`)
- **Quick Look (`Spacebar`)**: Instant full-screen floating preview.
- **Persistent Global Audio Player**: Play audio files continuously in the background with cover art extraction (ID3v2 synchsafe parser).
- **Code & Text Editor**: Syntax-highlighted viewer and inline text editor with direct save (`⌘S`).

### 🗑️ Native macOS Trash Integration
- **Sidebar Trash Section**: Quick access to macOS Trash with drag-and-drop deletion.
- **Shortcuts**: `⌘ + Delete` to Trash, `⌘ + ⌥ + Delete` to permanently remove with confirmation.

### 🎨 Beautiful Themes
- **Cosmic Antigravity** (Cyan & Indigo gradient accents)
- **macOS Dark & Light**
- **Goku Blue** (God Ki Azure)
- **Pink Pastel** (Sakura)
- **Cyberpunk Neon & Forest Emerald**

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **`⌘ + T`** | Open new tab |
| **`⌘ + W`** | Close current tab (or window if in Welcome Hub) |
| **`⌘ + ⇧ + T`** | Reopen last closed tab with history |
| **`⌘ + K`** / **`⌘ + P`** | Open Command Palette & Disk Tools |
| **`⌘ + B`** | Toggle Left Sidebar |
| **`⌘ + ⌥ + P`** | Toggle Right Preview / Editor Panel |
| **`⌘ + D`** | Toggle Dual-Pane Split View |
| **`⌘ + 1`** / **`⌘ + 2`** / **`⌘ + 3`** | Switch View (List / Grid / Gallery) |
| **`⌘ + [`** / **`⌘ + ]`** | Navigate History (Back / Forward) |
| **`⌘ + ↑`** | Navigate to Parent Directory (Up) |
| **`⌘ + Delete`** | Move selected items to macOS Trash |
| **`⌘ + ⌥ + Delete`** | Permanently delete selected items |
| **`Spacebar`** | Open Quick Look preview |
| **`Enter`** | Rename selected item |
| **`⌘ + A`** | Select all items |
| **`⌘ + C`** / **`⌘ + V`** | Copy and Paste items |
| **`⌘ + ⌥ + C`** | Copy full file path to clipboard |
| **`⌘ + S`** | Save edited file in preview editor |

---

## 🚀 Installation & Local Development

### Prerequisites
- macOS 11.0 (Big Sur) or newer (Apple Silicon `arm64` or Intel `x64`)
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm (v9 or newer)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/finderview.git
cd finderview
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run in development mode
```bash
npm start
```

### 4. Build native macOS Application
```bash
# Builds FinderView.app in dist/mac/
npm run build
```

---

## 🛡️ Security & Hardening

FinderView is engineered according to the **Electron Security Best Practices**:

- ✅ **Context Isolation**: `contextIsolation: true` is strictly enforced.
- ✅ **Node Integration Disabled**: `nodeIntegration: false` in all renderer processes.
- ✅ **Strict Content Security Policy (CSP)**: Blocks unverified remote scripts and eval injection.
- ✅ **Command Injection Immunity**: All child process calls (`open`, `ditto`, `osascript`) utilize fixed argument arrays (`spawn`), preventing shell interpolation vulnerabilities.
- ✅ **Navigation Lockdown**: Restricts navigation strictly to local protocol assets.
- ✅ **Comprehensive Test Suite**: Automated security regression suite included.

Run the automated security tests anytime:
```bash
npm run test:security
```

---

## 🏗️ Project Structure

```
finderview/
├── main.js              # Electron main process & secure IPC handlers
├── preload.js           # ContextBridge API exposure
├── package.json         # Scripts, dependencies & build configuration
├── assets/              # App icons & static assets
├── tests/
│   └── security.test.js # Automated security audit & regression test suite
└── renderer/
    ├── index.html       # Single-page UI structure
    ├── styles.css       # Design system, themes, and animations
    └── app.js           # State management, tree view, audio & tab engine
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>✦ Crafted with Antigravity</sub>
</div>
