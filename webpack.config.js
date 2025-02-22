var WebpackObfuscator = require('webpack-obfuscator');
module.exports = {
    entry: {
        wordchain: './docs/javascript/BundledAppDisplay.js',
        testing: './test/BundledTest.js',
    },
    output: {
        filename: '[name]-bundled.js',
    },
    plugins: [
        new WebpackObfuscator({ }, ['js-file-to-exclude.js'])
    ],
    module: {
        rules: [
            {
                /* Note: 'test' does NOT refer to testing or above entry point! */
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ]
            }
        ]
    },
};
