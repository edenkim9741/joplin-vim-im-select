const path = require('node:path');
const fs = require('fs-extra');
const CopyPlugin = require('copy-webpack-plugin');
const { builtinModules } = require('node:module');

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const config = require('./plugin.config.json');

const moduleFallback = {};
for (const moduleName of builtinModules) {
    moduleFallback[moduleName] = false;
}

const baseConfig = {
    mode: 'production',
    target: 'node',
    stats: 'errors-warnings',
    devtool: false,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.json',
                    },
                },
            },
        ],
    },
    resolve: {
        alias: {
            api: path.resolve(rootDir, 'api'),
        },
        extensions: ['.ts', '.tsx', '.js', '.json'],
        fallback: moduleFallback,
    },
};

const mainConfig = {
    ...baseConfig,
    name: 'main',
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: distDir,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: '**/*',
                    context: srcDir,
                    to: distDir,
                    globOptions: {
                        ignore: ['**/*.ts', '**/*.tsx'],
                    },
                },
            ],
        }),
        {
            apply(compiler) {
                compiler.hooks.beforeRun.tap('CleanDist', () => {
                    fs.removeSync(distDir);
                    fs.ensureDirSync(distDir);
                });
            },
        },
    ],
};

const extraScriptConfigs = config.extraScripts.map((scriptPath) => {
    const parsed = path.parse(scriptPath);
    return {
        ...baseConfig,
        name: `extra:${scriptPath}`,
        entry: `./src/${scriptPath}`,
        externalsType: 'commonjs',
        externals: {
            '@codemirror/view': { commonjs: '@codemirror/view' },
            '@codemirror/state': { commonjs: '@codemirror/state' },
        },
        output: {
            filename: `${parsed.name}.js`,
            path: path.join(distDir, parsed.dir),
            library: 'default',
            libraryTarget: 'commonjs',
            libraryExport: 'default',
        },
        dependencies: ['main'],
    };
});

module.exports = [mainConfig, ...extraScriptConfigs];
