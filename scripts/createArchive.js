const path = require('node:path');
const fs = require('fs-extra');
const tar = require('tar');
const crypto = require('node:crypto');

async function main() {
    const root = path.resolve(__dirname, '..');
    const distDir = path.join(root, 'dist');
    const publishDir = path.join(root, 'publish');
    const manifestPath = path.join(distDir, 'manifest.json');

    if (!fs.pathExistsSync(manifestPath)) {
        throw new Error('dist/manifest.json is missing. Run the build first.');
    }

    const manifest = fs.readJsonSync(manifestPath);
    if (!manifest.id) throw new Error('Plugin manifest id is missing.');

    const files = fs.readdirSync(distDir);
    if (!files.length) throw new Error('dist/ is empty.');

    fs.ensureDirSync(publishDir);
    const jplPath = path.join(publishDir, `${manifest.id}.jpl`);
    const infoPath = path.join(publishDir, `${manifest.id}.json`);
    fs.removeSync(jplPath);

    await tar.create(
        {
            cwd: distDir,
            file: jplPath,
            portable: true,
            strict: true,
            gzip: false,
        },
        files,
    );

    const digest = crypto
        .createHash('sha256')
        .update(fs.readFileSync(jplPath))
        .digest('hex');

    fs.writeJsonSync(
        infoPath,
        {
            ...manifest,
            _publish_hash: `sha256:${digest}`,
        },
        { spaces: 2 },
    );

    console.log(`Plugin archive created: ${jplPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
