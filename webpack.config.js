var WebpackObfuscator = require('webpack-obfuscator');
module.exports = {
    entry: {
        main: './docs/javascript/AppDisplayBundled.js',
        test: './test/TestBundled.js',
    },
    output: {
        filename: '[name]-bundled.js',
    },
    /*
    plugins: [
        new WebpackObfuscator({ }, ['js-file-to-exclude.js'])
    ],
    */
    module: {
        rules: [
          {
            test: /\.css$/,
            use: [
                'style-loader',
                'css-loader',
            ]
          }
        ]
    },
};
