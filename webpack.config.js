var WebpackObfuscator = require('webpack-obfuscator');
module.exports = {
    entry: {
        main: './docs/javascript/AppDisplay.js'
    },
    output: {
        filename: 'bundle.js'
    },
    /*
    uncomment this to apply obfuscation.  As of Feb 11, 2025, obfuscation
    makes the client-side app unreliable or completely unusable, due to 
    runtime undefined references.
    plugins: [
        new WebpackObfuscator({ }, ['js-file-to-exclude.js'])
    ]
    */
};
