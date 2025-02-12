var WebpackObfuscator = require('webpack-obfuscator');
module.exports = {
    entry: {
        main: './docs/javascript/AppDisplay.js',
        test: './test/Test.js',
    },
    output: {
        filename: '[name]-bundled.js',
    },
    plugins: [
        new WebpackObfuscator({ }, ['js-file-to-exclude.js'])
    ]
};
