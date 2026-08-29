# 📁 FinderView

<div align="center">

![FinderView Banner](assets/icon.icns)

**Un administrador de archivos para macOS moderno, ultrarrápido y potente, construido con Electron, integraciones nativas de macOS y flujos de trabajo avanzados.**

[![License: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Plataforma-macOS%20(Apple%20Silicon%20%26%20Intel)-black.svg)](#)
[![Security Audit](https://img.shields.io/badge/Auditor%C3%ADa%20de%20Seguridad-100%25%20Aprobada-brightgreen.svg)](#-seguridad-y-fortalecimiento)
[![Powered by Antigravity](https://img.shields.io/badge/%E2%9C%A6%20Powered%20by-Antigravity-00e5ff.svg)](#)

[English](README.md) | **Español**

</div>

---

## ⚡ ¿Por qué FinderView? (FinderView vs. Apple Finder)

> **Eleva tu productividad al gestionar archivos.** Creado desde cero para desarrolladores, diseñadores y usuarios avanzados que aman macOS pero necesitan mayor control, velocidad y herramientas modernas.

| Característica / Función | 🍎 Apple Finder | 🚀 FinderView Pro |
| :--- | :---: | :---: |
| **Árbol en Acordeón en Línea** | ❌ No (Vista de columnas tosca) | ✅ **Sí (Estilo VS Code con despliegue en línea)** |
| **Doble Panel / Vista Dividida (`⌘D`)** | ❌ No (Requiere múltiples ventanas) | ✅ **Sí (Dos paneles en paralelo en 1 ventana)** |
| **Pila de Acumulación (Drop Stack)** | ❌ No | ✅ **Sí (Acumula archivos de varias carpetas)** |
| **Paleta de Comandos Pro (`⌘K`/`⌘P`)** | ❌ Spotlight básico | ✅ **Sí (Acciones rápidas y herramientas de disco)** |
| **Reabrir Pestañas Cerradas (`⌘⇧T`)** | ❌ No (Se pierde el historial) | ✅ **Sí (Restaura al instante con navegación)** |
| **Pantalla de Inicio Inteligente al Cerrar** | ❌ Cierra la ventana de golpe | ✅ **Sí (Dashboard interactivo de accesos rápidos)** |
| **Buscador de Archivos Gigantes y Antiguos** | ❌ Requiere apps de pago (CleanMyMac) | ✅ **Sí (>500MB, >100MB, >1 año, carpetas vacías)** |
| **Limpiador de Caches y `node_modules`** | ❌ No | ✅ **Sí (Detección y purga de dependencias)** |
| **Analizador Visual de Espacio en Disco** | ❌ Lista básica en Ajustes de macOS | ✅ **Sí (Gráfico interactivo por categorías)** |
| **Reproductor de Música en Segundo Plano** | ❌ Se detiene al cerrar la vista previa | ✅ **Sí (Música continua + Carátulas ID3v2)** |
| **Editor de Código y Texto Integrado (`⌘S`)** | ❌ Abre app externa obligatoria | ✅ **Sí (Editor con resaltado y guardado directo)** |
| **Temas Visuales Personalizados** | ❌ Solo Claro/Oscuro del sistema | ✅ **Sí (7 Temas: Antigravity, Goku Blue, Pink...)** |
| **Soporte Multilenguaje (i18n)** | Idioma del sistema | ✅ **Sí (Español / Inglés conmutables)** |
| **Código Abierto y Seguro** | ❌ Propietario y cerrado | ✅ **Sí (Licencia MIT y 100% auditable)** |

---

## ✨ Características Principales

### 📑 Pestañas Nativas y Pantalla de Inicio Inteligente
- **Gestión Multi-Pestaña**: Abre pestañas con `⌘T`, ciérralas con `⌘W`, botón `✕` o clic central con la rueda del ratón.
- **Reabrir Pestañas Cerradas (`⌘⇧T`)**: Restaura las últimas pestañas cerradas conservando todo su historial de navegación (atrás/adelante) y ruta exacta.
- **Pantalla de Inicio / Hub**: Al cerrar la última pestaña, la aplicación permanece abierta y muestra un panel interactivo con accesos directos (`Inicio`, `Escritorio`, `Descargas`, `Documentos`, `iCloud Drive`, `Examinar...`).

### 🌲 Árbol en Acordeón al Estilo VS Code y Vistas Flexibles
- **Despliegue de Carpetas en Línea**: Explora subcarpetas en acordeón sin perder la vista actual.
- **Múltiples Modos de Visualización**:
  - **Vista Lista (`⌘1`)**: Columnas con metadatos detallados (Nombre, Tamaño, Fecha de modificación).
  - **Vista Íconos / Mosaico (`⌘2`)**: Cuadrícula de alta densidad visual con miniaturas instantáneas de imágenes.
  - **Vista Galería (`⌘3`)**: Modo carrusel multimedia para fotos y videos.
- **Modos Compactos**: Alterna densidad compacta tanto para la barra lateral como para la cuadrícula de archivos.

### 🪟 Modo Doble Panel / Vista Dividida (`⌘D`)
- Compara dos directorios en paralelo en la misma ventana.
- Arrastra y suelta archivos fácilmente entre el panel principal y el secundario.

### 🗂️ Drop Stack (Pila Flotante de Archivos)
- Acumula archivos de distintas carpetas en un dock flotante.
- Mueve, copia o renombra por lotes todos los archivos acumulados en un solo movimiento.

### ⚡ Command Palette y Suite de Gestión de Disco (`⌘K` / `⌘P`)
- **🐘 Archivos Gigantes**: Localiza archivos > 500 MB para liberar espacio de inmediato.
- **📦 Archivos Grandes**: Encuentra archivos > 100 MB.
- **⏳ Archivos Antiguos**: Detecta archivos sin modificar en > 365 días o > 180 días.
- **✨ Actividad de Hoy**: Filtra archivos creados o editados en las últimas 24 horas.
- **📸 Buscador de Capturas**: Organiza capturas de pantalla del sistema.
- **📁 Limpiador de Carpetas Vacías**: Detecta carpetas sin contenido.
- **💻 Limpiador de Caches**: Localiza `node_modules`, `.cache`, `.pytest_cache` y `Pods`.
- **🧹 Purga de .DS_Store**: Elimina archivos ocultos `.DS_Store` en toda la carpeta recursivamente.
- **📊 Analizador Visual de Disco**: Desglose gráfico e interactivo de almacenamiento por categorías (Videos, Imágenes, Audio, Docs, Código, Comprimidos).

### 👁️ Panel de Previsualización y Centro Multimedia (`⌘⌥P` / `Barra Espaciadora`)
- **Quick Look (`Barra Espaciadora`)**: Vista previa flotante a pantalla completa.
- **Reproductor de Audio Persistente en Segundo Plano**: Reproduce pistas de audio continuamente con extracción de carátulas ID3v2.
- **Editor de Código y Texto**: Visor con resaltado de sintaxis y editor de texto integrado con guardado directo (`⌘S`).

### 🗑️ Integración Nativa con la Papelera de macOS
- **Acceso Rápido en Barra Lateral**: Sección dedicada con soporte para arrastrar y soltar archivos a la papelera.
- **Atajos**: `⌘ + Delete` para enviar a la papelera, `⌘ + ⌥ + Delete` para eliminación permanente con confirmación.

### 🎨 Temas Personalizables y Multilenguaje
- Soporte para **Español (ES)** e **English (US)** desde el menú de Ajustes ⚙️.
- Temas: **Cosmic Antigravity**, **Oscuro macOS**, **Full Blanco**, **Goku Blue Dios**, **Pink Pastel**, **Cyberpunk** y **Forest**.

---

## ⌨️ Tabla de Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| **`⌘ + T`** | Abrir nueva pestaña |
| **`⌘ + W`** | Cerrar pestaña actual (o ventana si está en la pantalla de inicio) |
| **`⌘ + ⇧ + T`** | Reabrir última pestaña cerrada (con historial) |
| **`⌘ + K`** / **`⌘ + P`** | Abrir Paleta de Comandos y Herramientas de Disco |
| **`⌘ + B`** | Ocultar / Mostrar Barra Lateral Izquierda |
| **`⌘ + ⌥ + P`** | Ocultar / Mostrar Panel Derecho de Previsualización / Editor |
| **`⌘ + D`** | Alternar Modo Doble Panel (Split View) |
| **`⌘ + 1`** / **`⌘ + 2`** / **`⌘ + 3`** | Cambiar Vista (Lista / Mosaico / Galería) |
| **`⌘ + [`** / **`⌘ + ]`** | Navegar Historial (Atrás / Adelante) |
| **`⌘ + ↑`** | Subir de nivel (Carpeta Superior) |
| **`⌘ + Delete`** | Mover elementos seleccionados a la Papelera de macOS |
| **`⌘ + ⌥ + Delete`** | Eliminar permanentemente los elementos seleccionados |
| **`Barra Espaciadora`** | Abrir previsualización Quick Look |
| **`Enter`** | Renombrar archivo o carpeta seleccionada |
| **`⌘ + A`** | Seleccionar todos los elementos |
| **`⌘ + C`** / **`⌘ + V`** | Copiar y Pegar elementos |
| **`⌘ + ⌥ + C`** | Copiar ruta completa del archivo al portapapeles |
| **`⌘ + S`** | Guardar cambios en el editor de archivos |

---

## 🚀 Instalación y Desarrollo Local

### Requisitos Previos
- macOS 11.0 (Big Sur) o superior (Apple Silicon `arm64` o Intel `x64`)
- [Node.js](https://nodejs.org/) (v18 o superior)
- npm (v9 o superior)

### 1. Clonar el repositorio
```bash
git clone https://github.com/Jraucog/finderview.git
cd finderview
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar en modo desarrollo
```bash
npm start
```

### 4. Compilar aplicación nativa de macOS (.app)
```bash
# Compila FinderView.app en dist/mac/
npm run build
```

---

## 🛡️ Seguridad y Fortalecimiento

FinderView está diseñado siguiendo estrictamente las mejores prácticas de seguridad de Electron:

- ✅ **Aislamiento de Contexto**: `contextIsolation: true` activado obligatoriamente.
- ✅ **Node Integration Desactivado**: `nodeIntegration: false` en todos los renderers.
- ✅ **Content Security Policy (CSP)**: Política estricta que bloquea scripts remotos no autorizados e inyecciones `eval`.
- ✅ **Inmunidad a Inyección de Comandos**: Todos los subprocesos (`child_process.spawn`) utilizan vectores de argumentos en arrays fijos.
- ✅ **Restricción de Navegación**: Bloqueo estricto contra redirecciones imprevistas (`will-navigate` y `setWindowOpenHandler`).
- ✅ **Suite de Pruebas Automatizadas**: 10 tests de seguridad ejecutables con `npm test`.

Para ejecutar las pruebas de seguridad:
```bash
npm test
```

---

## 🏗️ Estructura del Proyecto

```
finderview/
├── main.js              # Proceso principal de Electron y manejadores IPC seguros
├── preload.js           # Puente ContextBridge seguro
├── package.json         # Scripts, metadatos y configuración de compilación
├── assets/              # Íconos y recursos estáticos
├── tests/
│   └── security.test.js # Suite de pruebas de seguridad y regresión
└── renderer/
    ├── index.html       # Estructura visual de la interfaz
    ├── styles.css       # Sistema de diseño, temas y animaciones
    └── app.js           # Estado, árbol en acordeón, i18n, pestañas y audio
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).

---

<div align="center">
  <sub>✦ Desarrollado con Antigravity</sub>
</div>
