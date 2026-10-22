const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
    if (context.electronPlatformName !== 'darwin') return;
    const appName = `${context.packager.appInfo.productFilename}.app`;
    const appPath = path.join(context.appOutDir, appName);
    console.log(`[afterPackSign] Applying deep ad-hoc code signature to ${appPath}...`);
    try {
        execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
        execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
        console.log(`[afterPackSign] Successfully verified ad-hoc signature on ${appName}`);
    } catch (err) {
        console.error(`[afterPackSign] Error signing macOS bundle:`, err);
        throw err;
    }
};
