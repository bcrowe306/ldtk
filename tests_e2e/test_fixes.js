const { LDtkTestDriver } = require('./harness.js');
const path = require('path');

async function testFixes() {
    console.log('[E2E Test] Starting verification of bug fixes...');
    const driver = new LDtkTestDriver(path.resolve(__dirname, '../tests/lab1.ldtk'));
    try {
        await driver.launch();
        console.log('[E2E Test] Waiting for Editor to initialize...');
        await driver.waitFor('window.__ldtk && window.__ldtk.isEditorReady()');

        // Test 1: Verify project and editor structures
        const data = await driver.eval('window.__ldtk.getProjectData()');
        console.log('[E2E Test] Project data verified:', data.levelsCount, 'levels,', data.defsCount.layers, 'layers');

        // Test 2: Test Level.hasLayerInstance and getLayerInstanceFromRule resilience (#1181)
        const hasLayerRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const level = ed.project.worlds[0].levels[0];
                    return {
                        hasValid: level.hasLayerInstance(ed.project.defs.layers[0].uid),
                        hasInvalid: level.hasLayerInstance(999999)
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1181 layer resilience test:', hasLayerRes);
        if (hasLayerRes.error || !hasLayerRes.hasValid || hasLayerRes.hasInvalid) {
            throw new Error('Layer resilience assertion failed: ' + JSON.stringify(hasLayerRes));
        }

        // Test 3: Test EnumDef.removeValue safety (#1182)
        const enumSafeRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor.project.defs.enums[0];
                    if (!ed) return { skipped: true };
                    const res = ed.removeValue("NonExistent_Value_123");
                    return { success: res === false };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1182 EnumDef.removeValue safety test:', enumSafeRes);
        if (enumSafeRes.error || (!enumSafeRes.skipped && !enumSafeRes.success)) {
            throw new Error('EnumDef safety assertion failed: ' + JSON.stringify(enumSafeRes));
        }

        // Test 4: Test EntityInstance bounds calculation with null def (#1242)
        const entityNullDefRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const level = ed.project.worlds[0].levels[0];
                    let targetEi = null;
                    for (const li of level.layerInstances) {
                        if (li.entityInstances && li.entityInstances.length > 0) {
                            targetEi = li.entityInstances[0];
                            break;
                        }
                    }
                    if (!targetEi) return { skipped: true };
                    const origDefUid = targetEi.defUid;
                    targetEi.defUid = 999999;
                    const width = targetEi.get_width();
                    const height = targetEi.get_height();
                    const centerX = targetEi.get_centerX();
                    const centerY = targetEi.get_centerY();
                    targetEi.defUid = origDefUid;
                    return {
                        success: width === 16 && height === 16 && typeof centerX === "number" && typeof centerY === "number"
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1242 EntityInstance null def resilience test:', entityNullDefRes);
        if (entityNullDefRes.error || (!entityNullDefRes.skipped && !entityNullDefRes.success)) {
            throw new Error('EntityInstance null def assertion failed: ' + JSON.stringify(entityNullDefRes));
        }

        // Test 5: Test FieldInstance.setEntityRefTo null targetEi guard (#1216)
        const fieldNullGuardRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const level = ed.project.worlds[0].levels[0];
                    let targetEi = null;
                    for (const li of level.layerInstances) {
                        if (li.entityInstances && li.entityInstances.length > 0) {
                            targetEi = li.entityInstances[0];
                            break;
                        }
                    }
                    if (!targetEi) return { skipped: true };
                    const fi = targetEi.fieldInstances.h ? Object.values(targetEi.fieldInstances.h)[0] : null;
                    if (!fi) return { skipped: true };
                    fi.setEntityRefTo(0, targetEi, null, false);
                    return { success: true };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1216 FieldInstance null targetEi guard test:', fieldNullGuardRes);
        if (fieldNullGuardRes.error || (!fieldNullGuardRes.skipped && !fieldNullGuardRes.success)) {
            throw new Error('FieldInstance setEntityRefTo assertion failed: ' + JSON.stringify(fieldNullGuardRes));
        }

        // Test 6: Test GenericLevelElementGroup null resilience (#1233)
        const elementGroupRes = await driver.eval(`
            (() => {
                try {
                    const group = window.editor.selectionTool.group;
                    const empty = group.isEmpty();
                    const count = group.selectedElementsCount();
                    const coords = { cx: 0, cy: 0, levelX: 0, levelY: 0, worldX: 0, worldY: 0 };
                    const overing = group.isOveringSelection(coords);
                    return { success: empty === true && count === 0 && overing === false };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1233 GenericLevelElementGroup safety test:', elementGroupRes);
        if (elementGroupRes.error || !elementGroupRes.success) {
            throw new Error('GenericLevelElementGroup assertion failed: ' + JSON.stringify(elementGroupRes));
        }

        // Test 7: Test selectLevel(null) resilience (#1129)
        const selectLevelNullRes = await driver.eval(`
            (() => {
                try {
                    window.editor.selectLevel(null);
                    return { success: true };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1129 selectLevel(null) resilience test:', selectLevelNullRes);
        if (selectLevelNullRes.error || !selectLevelNullRes.success) {
            throw new Error('selectLevel(null) assertion failed: ' + JSON.stringify(selectLevelNullRes));
        }

        // Test 8: Test tidy cleanup for deleted tileset in LayerDef & EntityDef (#1107, #1128)
        const tidyCleanupRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const ld = ed.project.defs.layers[0];
                    if (ld) {
                        ld.autoTilesKilledByOtherLayerUid = 999999;
                        ld.tidy(ed.project);
                        if (ld.autoTilesKilledByOtherLayerUid !== null) {
                            return { success: false, reason: "autoTilesKilledByOtherLayerUid was not cleaned" };
                        }
                    }
                    const ent = ed.project.defs.entities[0];
                    if (ent) {
                        ent.tileRect = { tilesetUid: 999999, x: 0, y: 0, w: 16, h: 16 };
                        ent.uiTileRect = { tilesetUid: 999999, x: 0, y: 0, w: 16, h: 16 };
                        ent.tidy(ed.project);
                        if (ent.tileRect !== null || ent.uiTileRect !== null) {
                            return { success: false, reason: "ent.tileRect/uiTileRect was not cleaned" };
                        }
                    }
                    return { success: true };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1107 & #1128 tidy cleanup test:', tidyCleanupRes);
        if (tidyCleanupRes.error || !tidyCleanupRes.success) {
            throw new Error('tidy cleanup assertion failed: ' + JSON.stringify(tidyCleanupRes));
        }

        // Test 9: Test Enum field explicit null when default is not null (#1252)
        const enumNullRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const level = ed.project.worlds[0].levels[0];
                    let targetEi = null;
                    for (const li of level.layerInstances) {
                        if (li.entityInstances && li.entityInstances.length > 0) {
                            targetEi = li.entityInstances[0];
                            break;
                        }
                    }
                    if (!targetEi) return { skipped: true };

                    // Find or create an enum field definition with default
                    
                    let enumFd = null;
                    let targetEntDef = null;
                    for (const ent of ed.project.defs.entities) {
                        for (const fd of ent.fieldDefs) {
                            if (fd.type && fd.type._hx_index === 6) {
                                enumFd = fd;
                                targetEntDef = ent;
                                break;
                            }
                        }
                        if (enumFd) break;
                    }
                    if (!enumFd) return { skipped: true, reason: "No enum field in project" };

                    // Find or create an entity instance for targetEntDef
                    enumFd.canBeNull = true;
                    const enumDef = ed.project.defs.getEnumDef(enumFd.type.enumDefUid);
                    if (!enumDef || enumDef.values.length === 0) return { skipped: true };
                    enumFd.setDefault(enumDef.values[0].id);

                    const fi = targetEi.getFieldInstance(enumFd, true);
                    // Verify default value works
                    fi.parseValue(0, null);
                    const isDefault = fi.isUsingDefault(0);
                    const defaultVal = fi.getEnumValue(0);

                    // Now set explicit null
                    fi.setExplicitNull(0);
                    const isUsingDefAfterNull = fi.isUsingDefault(0);
                    const isNullAfterNull = fi.valueIsNull(0);
                    const enumValAfterNull = fi.getEnumValue(0);
                    const jsonVal = fi.toJson().__value;

                    return {
                        success: isDefault && defaultVal === enumDef.values[0].id
                            && !isUsingDefAfterNull && isNullAfterNull && enumValAfterNull === null && jsonVal === null
                    };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1252 Enum explicit null resilience test:', enumNullRes);
        if (enumNullRes.error || (!enumNullRes.skipped && !enumNullRes.success)) {
            throw new Error('#1252 assertion failed: ' + JSON.stringify(enumNullRes));
        }

        // Test 10: Test getLayerInstance null safety & missing layer in LevelRender (#1127)
        const missingLayerRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const level = ed.project.worlds[0].levels[0];
                    const missing = level.getLayerInstance(999999);
                    ed.levelRender.invalidateLayer(null, 999999);
                    return { success: missing === null };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1127 missing layer resilience test:', missingLayerRes);
        if (missingLayerRes.error || !missingLayerRes.success) {
            throw new Error('#1127 assertion failed: ' + JSON.stringify(missingLayerRes));
        }

        // Test 11: Test project external files dir without extension (#1209)
        const externalDirRes = await driver.eval(`
            (() => {
                try {
                    const ed = window.editor;
                    const oldPath = ed.project.filePath.full;
                    ed.project.filePath.parseFilePath("/test/dir/all-the-levels");
                    const extDir = ed.project.getAbsExternalFilesDir();
                    ed.project.filePath.parseFilePath(oldPath);
                    return { success: extDir.endsWith("all-the-levels_data") };
                } catch(e) {
                    return { error: e.message, stack: e.stack };
                }
            })()
        `);
        console.log('[E2E Test] #1209 project dir collision resilience test:', externalDirRes);
        if (externalDirRes.error || !externalDirRes.success) {
            throw new Error('#1209 assertion failed: ' + JSON.stringify(externalDirRes));
        }

        // Capture verification screenshot
        await driver.captureScreenshot(path.resolve(__dirname, 'batch3_verified.png'));
        console.log('[E2E Test] All batch 1, 2, and 3 bug fix tests passed successfully!');
    } catch(err) {
        console.error('[E2E Test] Test failed:', err);
        process.exitCode = 1;
    } finally {
        await driver.kill();
    }
}

testFixes();
