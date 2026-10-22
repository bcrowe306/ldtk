const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class LDtkTestDriver {
    constructor(projectPath, options = {}) {
        this.projectPath = projectPath ? path.resolve(projectPath) : null;
        this.port = options.port || 9222;
        this.proc = null;
        this.ws = null;
        this.idCounter = 1;
    }

    async launch() {
        const electronBin = path.resolve(__dirname, '../app/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
        const appDir = path.resolve(__dirname, '../app');
        const args = [`--remote-debugging-port=${this.port}`, '.'];
        if (this.projectPath) args.push(this.projectPath);

        this.proc = spawn(electronBin, args, { cwd: appDir, detached: true });
        this.proc.on('error', err => console.error('[Driver] Electron process error:', err));

        // Wait for debugging port
        const start = Date.now();
        let target = null;
        while (Date.now() - start < 15000) {
            try {
                const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
                const list = await res.json();
                target = list.find(t => t.url && t.url.includes('app.html'));
                if (target && target.webSocketDebuggerUrl) break;
            } catch (e) {
                // wait
            }
            await new Promise(r => setTimeout(r, 250));
        }

        if (!target) {
            await this.kill();
            throw new Error('Failed to find app.html target on port ' + this.port);
        }

        this.ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
        });
        console.log('[Driver] Connected to LDtk app.html via CDP');
    }

    send(method, params = {}) {
        const id = this.idCounter++;
        return new Promise((resolve, reject) => {
            const handler = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.id === id) {
                    this.ws.removeEventListener('message', handler);
                    if (data.error) reject(new Error(JSON.stringify(data.error)));
                    else resolve(data.result);
                }
            };
            this.ws.addEventListener('message', handler);
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true
        });
        return res && res.result ? res.result.value : null;
    }

    async waitFor(predicateExpr, timeoutMs = 20000, intervalMs = 250) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const val = await this.eval(predicateExpr);
                if (val) return val;
            } catch (e) {}
            await new Promise(r => setTimeout(r, intervalMs));
        }
        throw new Error(`Timeout waiting for expression: ${predicateExpr}`);
    }

    async captureScreenshot(outputPath) {
        const res = await this.send('Page.captureScreenshot', { format: 'png' });
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
        return outputPath;
    }

    async kill() {
        if (this.ws) {
            try { this.ws.close(); } catch(e) {}
            this.ws = null;
        }
        if (this.proc) {
            try {
                process.kill(-this.proc.pid, 'SIGKILL');
            } catch(e) {
                try { this.proc.kill('SIGKILL'); } catch(e2) {}
            }
            this.proc = null;
        }
    }
}

module.exports = { LDtkTestDriver };

if (require.main === module) {
    (async () => {
        const driver = new LDtkTestDriver(path.resolve(__dirname, '../tests/lab1.ldtk'));
        try {
            await driver.launch();
            console.log('[Driver] Waiting for Editor to be ready...');
            await driver.waitFor('window.__ldtk && window.__ldtk.isEditorReady()');
            const data = await driver.eval('window.__ldtk.getProjectData()');
            console.log('[Driver] Project Data:', JSON.stringify(data, null, 2));

            const screenshot = path.resolve(__dirname, 'lab1_verified.png');
            await driver.captureScreenshot(screenshot);
            console.log(`[Driver] Verified screenshot saved to: ${screenshot}`);
        } catch (e) {
            console.error('[Driver] Test failed:', e);
            process.exitCode = 1;
        } finally {
            await driver.kill();
        }
    })();
}
