// LDtk Automation & Testing Hook
(function() {
    function getApp() {
        if (window.app) return window.app;
        try {
            return (window.$hxClasses && window.$hxClasses["App"]) ? window.$hxClasses["App"].ME : null;
        } catch(e) { return null; }
    }

    function getEditor() {
        if (window.editor) return window.editor;
        try {
            return (window.$hxClasses && window.$hxClasses["page.Editor"]) ? window.$hxClasses["page.Editor"].ME : null;
        } catch(e) { return null; }
    }

    window.__ldtk = {
        isReady: function() {
            var app = getApp();
            return !!(app && app.hasGlContext !== undefined);
        },
        isEditorReady: function() {
            var ed = getEditor();
            return !!(ed && ed.project && (ed.project.levels || (ed.project.worlds && ed.project.worlds.length > 0)));
        },
        getApp: getApp,
        getEditor: getEditor,
        getProjectData: function() {
            var ed = getEditor();
            if (!ed || !ed.project) return null;
            var levelsCount = 0;
            if (ed.project.levels) levelsCount = ed.project.levels.length;
            else if (ed.project.worlds) {
                for (var i = 0; i < ed.project.worlds.length; i++) {
                    levelsCount += ed.project.worlds[i].levels ? ed.project.worlds[i].levels.length : 0;
                }
            }
            return {
                levelsCount: levelsCount,
                worldsCount: ed.project.worlds ? ed.project.worlds.length : 0,
                defsCount: ed.project.defs ? {
                    layers: ed.project.defs.layers ? ed.project.defs.layers.length : 0,
                    entities: ed.project.defs.entities ? ed.project.defs.entities.length : 0,
                    enums: ed.project.defs.enums ? ed.project.defs.enums.length : 0,
                    tilesets: ed.project.defs.tilesets ? ed.project.defs.tilesets.length : 0
                } : null,
                curLevelId: ed.curLevelId,
                curWorldIid: ed.curWorldIid,
                worldMode: ed.worldMode
            };
        },
        openProject: function(filePath) {
            var app = getApp();
            if (!app) throw new Error("App not ready");
            app.loadProject(filePath);
        },
        getOpenModals: function() {
            var list = [];
            $(".modal, .window, .dialog").each(function() {
                var j = $(this);
                if (j.is(":visible")) {
                    list.push({
                        id: j.attr("id") || "",
                        classes: j.attr("class") || "",
                        title: j.find("h2, .title, header").text().trim()
                    });
                }
            });
            return list;
        },
        clickSelector: function(selector) {
            var el = $(selector);
            if (!el.length) return false;
            el.first().trigger("click");
            return true;
        }
    };
})();
