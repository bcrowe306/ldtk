# LDtk Fork Improvements & Validation Report

This document records all changes, fixes, and end-to-end verification tests applied to the LDtk fork repository: [`bcrowe306/ldtk`](https://github.com/bcrowe306/ldtk).

---

## 1. Automated Testing & Verification Infrastructure
A dedicated end-to-end test runner was built in `tests_e2e/harness.js` and `tests_e2e/test_fixes.js`.
- Connects directly to the running LDtk application instance using Chrome DevTools Protocol over WebSockets.
- Injects native events, drives DOM elements, manipulates project state, inspects rendered layers, and verifies application lifecycle.
- Verifies that all fixes do not alter file format specifications or break backward compatibility.

---

## 2. Issues Diagnosed and Resolved

### Batch 1: High-Priority Stability & UI Polish
| Issue | Description | Cause | Fix Implemented | Status |
| :--- | :--- | :--- | :--- | :--- |
| **#1154** | Mouse wheel zoom jumps erratically on macOS | macOS smooth scroll / trackpad wheel deltas with small non-integer values accumulated poorly or reversed. | Normalized mouse wheel delta handling with threshold clamping in [Editor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/page/Editor.hx). | **Fixed & Verified** |
| **#1174** | Entity search filter input losing focus on keypress | Reactively re-rendering the entity list on every keystroke reconstructed the search `<input>` element. | Preserved active focus and cursor selection across search re-renders in [EntityList.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/EntityList.hx). | **Fixed & Verified** |
| **#1181** | Rule editor modal overflow on small screen heights | Fixed modal height caused action buttons to clip off-screen on displays under 900px height. | Replaced fixed pixel bounds with `vh`-based max-height constraints and dynamic scrollable containers in [RuleEditor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/RuleEditor.hx). | **Fixed & Verified** |
| **#1216** | Color picker dropdown doesn't close on clicking outside | Document click listener was bound to inner content container instead of global window backdrop. | Attached global pointerdown dismissal handler to backdrop in [ColorPicker.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/ColorPicker.hx). | **Fixed & Verified** |
| **#1242** | Auto-layer rule preview ghosting on pan | Intermediate tile render cache was not invalidated during canvas drag operations. | Explicitly cleared cached tile canvas on view offset invalidation in [AutoLayer.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/display/AutoLayer.hx). | **Fixed & Verified** |
| **#1182** | Layer opacity slider snaps to 0% unexpectedly | Drag delta calculated with incorrect bounding rect offset in scaled editor view. | Used viewport-relative normalized client coordinates for slider tracking in [LayerList.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/LayerList.hx). | **Fixed & Verified** |
| **#1177** | Unhandled exception when reordering empty layer stack | Attempted to slice array at index `-1` when no layers were selected during keyboard reorder. | Added boundary checks to layer array mutations in [Project.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/Project.hx). | **Fixed & Verified** |
| **#1137** | Tooltip sticks permanently when hovering rapidly | `mouseleave` events dropped when mouse exited window boundaries while tooltip timer was pending. | Added window-blur and pointercancel safety cleanup to [Tooltip.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/Tooltip.hx). | **Fixed & Verified** |
| **#1254** | Missing translation key warnings in console | Several recent UI strings lacked fallback identifiers in English locale dictionary. | Added complete English fallbacks in `src/electron.renderer/Lang.hx`. | **Fixed & Verified** |

### Batch 2: Core Stability & Multi-World Crashes
| Issue | Description | Cause | Fix Implemented | Status |
| :--- | :--- | :--- | :--- | :--- |
| **#1129** | Multi-world crash when world is empty or coordinates null | `World.hx` accessed `w.defaultLevelWidth` and bounds without null-guarding empty/uninitialized worlds. | Added safe null-coalescing fallbacks for empty worlds in [World.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/World.hx). | **Fixed & Verified** |
| **#1233** | Entity deletion leaves stale selection handles | Deleting an active entity via keyboard shortcut did not clean up `curEntityInstance` reference. | Dispatched selection cleanup before entity removal in [Editor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/page/Editor.hx). | **Fixed & Verified** |
| **#1128** | Crash when deleting layer while auto-baking in background | Background bake promise resolved after layer instance was destroyed. | Added cancellation token checking in [AutoLayer.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/display/AutoLayer.hx). | **Fixed & Verified** |
| **#1155** | Auto-layer rule baking freeze with circular rule modulo | Modulo calculation in rule matching entered infinite loops under negative coordinates. | Sanitized coordinate modulo arithmetic in [RuleParser.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/def/RuleParser.hx). | **Fixed & Verified** |
| **#1119** | Mac pinch-to-zoom causes canvas jitter | macOS trackpad pinch events dispatched both `wheel` and `gesturechange` events simultaneously. | Debounced and smoothed pinch gesture scaling in [Editor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/page/Editor.hx). | **Fixed & Verified** |
| **#1107** | Tileset picker crash after deleting active tileset definition | Tileset view maintained dangling references to deleted tileset IDs. | Reset active tileset selection to first available or null in [TilesetPicker.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/TilesetPicker.hx). | **Fixed & Verified** |

### Batch 3: UI/UX & Data Integrity
| Issue | Description | Cause | Fix Implemented | Status |
| :--- | :--- | :--- | :--- | :--- |
| **#1252** | Setting enum value to null in entity field values throws | Passing null or empty value to enum field serializer threw unhandled exception. | Allowed null/empty string reset in [FieldInstance.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/inst/FieldInstance.hx). | **Fixed & Verified** |
| **#1127** | Opening level with missing layer definition crashes | Levels containing serialized layers whose definitions were deleted threw unhandled null access. | Filtered missing layer instances gracefully with warning notice in [Level.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/Level.hx). | **Fixed & Verified** |
| **#1209** | Crash `ENOTDIR: not a directory, mkdir .../simplified` when saving without extension | Saving a project without typing `.ldtk` created a regular file with the same name as `getAbsExternalFilesDir()`, causing subdirectory creation to throw `ENOTDIR`. | Automatically ensured `Const.FILE_EXTENSION` in [Editor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/page/Editor.hx) and added `_data` fallback in [Project.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/Project.hx). | **Fixed & Verified** |
| **#1173** | Cannot scroll large tilesets on Mac / trackpad | `Tileset.onPickerMouseWheel` treated all wheel events as zoom and did nothing if `viewFitted`, preventing trackpad and wheel panning. | Differentiated pan vs zoom in [Tileset.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/Tileset.hx): standard wheel/trackpad scrolling smoothly pans `scrollX`/`scrollY` and un-fits view as needed, while Ctrl/Cmd/pinch zooms. | **Fixed & Verified** |

### Batch 4: macOS Packaging & Gatekeeper Code Signing
| Issue | Description | Cause | Fix Implemented | Status |
| :--- | :--- | :--- | :--- | :--- |
| **macOS Gatekeeper** | "The application is damaged and can't be opened" on Apple Silicon | Unpackaged Electron prebuilt binaries contain sealed resource requirements matching `Electron.app`. When `electron-builder` skips signing due to missing Developer ID, changes in `Contents/Resources` invalidate sealed resources, causing Apple Silicon Gatekeeper to mark the app as damaged. | Added `afterPack` hook (`app/scripts/afterPackSign.js`) that performs deep ad-hoc code signing (`codesign --force --deep --sign -`) on the `.app` bundle and frameworks before DMG creation, and added automated installation and launch verification directly to GitHub CI. | **Fixed & Verified** |

---

## 3. GitHub Actions CI/CD Pipeline
Continuous Integration is configured in `.github/workflows/ci.yml`:
- **macOS Runner** (`macos-latest`):
  - Builds native **Apple Silicon arm64** DMG (`LDtk <version> installer-arm64.dmg`).
  - Builds **Intel x64** DMG (`LDtk <version> installer-x64.dmg`).
  - **Automated Verification Step**: Mounts generated DMGs, checks code signature and sealed resource validity (`codesign --verify --deep --strict --verbose=2`), tests bundle installation, and launches the application via macOS LaunchServices (`open -n`) to verify that the app launches cleanly without Gatekeeper "damaged" errors.
- **Windows Runner** (`windows-latest`):
  - Builds 64-bit Windows NSIS installer (`LDtk <version> installer.exe`).
- **Linux Runner** (`ubuntu-latest`):
  - Builds Linux standalone AppImage (`LDtk <version> installer.AppImage`).
  - Builds Linux Debian package (`LDtk <version> installer.deb`).
- **Publish Release Job** (`ubuntu-latest`):
  - Automatically triggers on new version tags (`refs/tags/v*`).
  - Depends on successful completion and test verification across all builders before publishing.

---

## 4. Commits Pushed to Fork
- `e2c5d53a`: `ci: add multi-platform builds and e2e test hook`
- `353c9189`: `fix(ui): resolve stability issues (#1154, #1174, #1181, #1216, #1242, #1182, #1177, #1137, #1254)`
- `91f5b5a3`: `fix(ui): resolve crashes in multi-world (#1129), entity deletion (#1233), killing layer (#1128), layer baking (#1155), mac zoom (#1119), and deleted tilesets (#1107)`
- `80d44684`: `fix(ui): resolve enum null selection (#1252), missing layer crash (#1127), save path ENOTDIR (#1209), and tileset scrolling (#1173)`
- `44d64239`: `ci: add native macos-arm64 apple silicon build`
- `8bc47dde`: `fix: consolidate macos arm64 and x64 builds in single pass`

---

## 5. Published Releases

### Release `v1.5.3-fork.3` (Gatekeeper Fix & Automated CI Installation/Launch Test)
- **Release Page**: [`https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.3`](https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.3)
- **Key Fixes & Features**:
  - Resolved macOS Apple Silicon "damaged application" error via deep ad-hoc code signing hook (`afterPackSign.js`).
  - Added CI automated test step that mounts the DMG, verifies code signature and sealed resources, and opens the installed application via LaunchServices before allowing release publication.
  - Published native Apple Silicon (`arm64`), Intel (`x64`), Windows (`win_64`), Linux (`AppImage`), and Linux (`deb`).

### Release `v1.5.3-fork.2` (Native macOS Apple Silicon arm64 + x64)
- **Release Page**: [`https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.2`](https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.2)
- **Included Enhancements**:
  - Added native Apple Silicon **macOS arm64** installer build.
  - Distinct DMG artifact names (`installer-arm64.dmg` vs `installer-x64.dmg`).
  - Consolidated single-pass macOS builder avoiding runner queue concurrency bottlenecks.

### Release `v1.5.3-fork.1`
- **Release Page**: [`https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.1`](https://github.com/bcrowe306/ldtk/releases/tag/v1.5.3-fork.1)
- **Included Fixes**: 19 cataloged UI/UX, stability, multi-world, layer rule, and path resilience fixes across Batches 1, 2, and 3.
