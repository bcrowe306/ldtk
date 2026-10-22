# LDtk Fork Setup, Automation Test Harness, CI & UI Fixes

## 1. Submodule Configuration
- **Submodule Path**: `ldtk`
- **Submodule Remote URL**: [`https://github.com/bcrowe306/ldtk.git`](https://github.com/bcrowe306/ldtk.git)
- **Local remotes configured in `ldtk/`**:
  - `origin`: [`https://github.com/bcrowe306/ldtk.git`](https://github.com/bcrowe306/ldtk.git) (push & fetch via osxkeychain)
  - `upstream`: [`https://github.com/deepnight/ldtk.git`](https://github.com/deepnight/ldtk.git) (for syncing upstream releases and patches)
- Staged in parent repository [.gitmodules](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/.gitmodules).

---

## 2. Multi-Platform GitHub Actions CI Builds
Configured in [.github/workflows/ci.yml](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/.github/workflows/ci.yml) and [app/electron-builder.json](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/app/electron-builder.json):

| Target Platform | Package / Distribution | Runner | Output Artifact |
|---|---|---|---|
| **macOS (amd64)** | `.dmg` installer (x64) | `macos-13` | `macos_amd64` |
| **Windows (win_64)** | `.exe` NSIS installer (x64) | `windows-latest` | `win_64` |
| **Linux (AppImage)** | `.AppImage` (x64) | `ubuntu-latest` | `linux_appimage` |
| **Linux (deb)** | `.deb` Debian package (x64) | `ubuntu-latest` | `linux_deb` |

Packaging scripts configured in [app/package.json](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/app/package.json):
- `npm run pack-macos-amd64`
- `npm run pack-win64`
- `npm run pack-linux`

---

## 3. Automation Hook & E2E Verification Harness
To enable automated testing, inspection, and screenshot verification directly on the live Electron application without requiring manual driving:

- **Renderer Hook ([app/assets/js/testHook.js](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/app/assets/js/testHook.js))**:
  - Exposes `window.__ldtk` to inspection scripts.
  - Exposes `window.app` and `window.editor` directly from Haxe processes.
  - Queries project data, world data, layer definitions, active modals, and triggers DOM interactions.
- **CDP Automation Driver ([tests_e2e/harness.js](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/tests_e2e/harness.js))**:
  - Spawns Electron with `--remote-debugging-port=9222`.
  - Attaches to Chrome DevTools Protocol over WebSockets.
  - Evaluates expressions, waits for conditions, and captures PNG screenshots.
- **Test Runner ([tests_e2e/test_fixes.js](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/tests_e2e/test_fixes.js))**:
  - `npm run test-fixes` executes automated assertions against editor state, verifies bug fix resilience, and captures output.

---

## 4. Triage & First Batch of Bug Fixes (Committed & Pushed)

All changes preserve 100% compatibility with existing LDtk JSON schema and file format.

| Issue | Title / Symptom | Root Cause | Fix Applied | Status |
|---|---|---|---|---|
| **#1154** | RulePatternEditor crashes reading 'addClass' on null tile image | `Project.resolveTileRectAsHtmlImg` returns null when a tile image or tileset reference is invalid; `jImg.addClass()` was called directly on null. | Guarded tile image creation and added null-check before `addClass("valueIcon")` in [RulePatternEditor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/RulePatternEditor.hx). | **Fixed & Verified** |
| **#1174** | Opening copied rule with missing IntGrid value crashes editor | `RuleEditor` initialized `curValue` to the most frequent value in the pattern without verifying if that value exists in the target layer's `sourceDef`. | Added validation in [RuleEditor.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/modal/dialog/RuleEditor.hx) to fallback to available IntGrid values or `Const.AUTO_LAYER_ANYTHING`. | **Fixed & Verified** |
| **#1181** | Clicking outside IntGrid rules editor crashes with "Missing layer instance" | `LevelRender` handled `LayerRuleChanged(r)` by calling `getLayerInstanceFromRule(r)` which threw an uncaught error if the layer definition was not instanced on the level. | Added `Level.hasLayerInstance` in [Level.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/Level.hx) and guarded null layer instance in [LevelRender.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/display/LevelRender.hx). | **Fixed & Verified** |
| **#1216** | Duplicate level crashes with symmetrical entity references | `FieldInstance.setEntityRefTo` lacked null target guard, and attempted symmetry tidying before all duplicated entity IDs were remapped. | Added null target guard and optional `tidy` parameter in [FieldInstance.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/inst/FieldInstance.hx) and updated [World.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/World.hx). | **Fixed & Verified** |
| **#1242** | Crash while deleting referenced entity definition | Deleting an EntityDef caused referenced entity instances to have `def == null`. Rendering reference links called `tei.centerX` / `tei.width`, which threw `TypeError: Cannot read properties of undefined (reading 'width')`. | Added null `def` fallback bounds in [EntityInstance.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/inst/EntityInstance.hx) and guarded `tei.def == null` in [FieldInstanceRender.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/display/FieldInstanceRender.hx). | **Fixed & Verified** |
| **#1182** | Deleting enum value throws unhandled error and crashes application | `EnumDef.removeValue` threw a raw string exception if the value was already deleted or renamed. | Made `EnumDef.removeValue` in [EnumDef.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/data/def/EnumDef.hx) check cleaned identifiers and return boolean status safely instead of crashing. | **Fixed & Verified** |
| **#1177** | Language select does not update in Entity form | Changing the text language mode in custom field definitions did not emit `FieldDefChanged` or link the form change event. | Added `editor.ge.emit(FieldDefChanged(curField))` and `i.linkEvent(FieldDefChanged(curField))` in [FieldDefsForm.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/ui/FieldDefsForm.hx). | **Fixed & Verified** |
| **#1137** | Dragging item in long lists auto-scrolls uncontrollably | `SortableJS` options had `scrollSensitivity: 140` and `scrollSpeed: 40`, triggering high-speed scrolling even when the cursor was far from container edges. | Adjusted to smooth, responsive values (`scrollSensitivity: 50`, `scrollSpeed: 15`) in [JsTools.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.renderer/misc/JsTools.hx). | **Fixed & Verified** |
| **#1254** / **#1217** | Linux AppImage startup crash | Unprivileged user namespaces are disabled by default on modern Linux distros (Ubuntu 24.04+, KDE neon, Debian 12+), requiring `--no-sandbox`. | Added automatic `--no-sandbox` fallback on Linux in [ElectronMain.hx](file:///Users/brandoncrowe/Documents/Git/odin_raylib_engine/ldtk/src/electron.main/ElectronMain.hx). | **Fixed & Verified** |

---

## 5. Commits Pushed to Fork
- `e2c5d53a`: `ci: add multi-platform builds and e2e test hook`
- `353c9189`: `fix(ui): resolve stability issues (#1154, #1174, #1181, #1216, #1242, #1182, #1177, #1137, #1254)`
