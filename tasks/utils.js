const minimist = require('minimist');

exports.env = minimist(process.argv, { default: { env: 'development' } }).env;
