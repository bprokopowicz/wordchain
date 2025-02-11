var WebpackObfuscator = require('webpack-obfuscator');
module.exports = {
    entry: {
        main: './docs/javascript/AppDisplay.js'
    },
    output: {
        filename: 'bundle.js'
    },
    plugins: [
        new WebpackObfuscator({
             rotateStringsArray: true
        }, ['js-file-to-exclude.js'])
    ]
};
