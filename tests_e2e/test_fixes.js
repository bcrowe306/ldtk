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

        // Capture verification screenshot
        await driver.captureScreenshot(path.resolve(__dirname, 'batch2_verified.png'));
        console.log('[E2E Test] All batch 1 and 2 bug fix tests passed successfully!');
    } catch(err) {
        console.error('[E2E Test] Test failed:', err);
        process.exitCode = 1;
    } finally {
        await driver.kill();
    }
}

testFixes();
