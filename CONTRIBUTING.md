# Contributing to FinderView

Thank you for your interest in improving **FinderView**! We welcome bug reports, feature requests, and pull requests.

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/Jraucog/finderview.git
   cd finderview
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start in development mode:**
   ```bash
   npm start
   ```

---

## 🧪 Testing & Quality Checks

Before submitting a pull request, ensure all security and regression tests pass:

```bash
# Check syntax
node -c main.js && node -c preload.js && node -c renderer/app.js

# Run automated security test suite
npm run test:security
```

---

## 🔒 Security Guidelines

When writing code for FinderView:
- **Never expose raw `require` or `ipcRenderer` in `preload.js`**. Always use `contextBridge.exposeInMainWorld`.
- **Never use `child_process.exec()` with unescaped user inputs**. Always use `child_process.spawn()` with fixed argument arrays.
- **Sanitize HTML strings** using `escapeHTML()` before interpolating into `innerHTML`.
- Maintain `nodeIntegration: false` and `contextIsolation: true`.

---

## 📜 Pull Request Guidelines

1. Create a feature branch (`git checkout -b feat/your-feature`).
2. Make concise, well-documented commits.
3. Verify that the build succeeds (`npm run build`).
4. Submit a PR against the `main` branch with a clear description of your changes.
