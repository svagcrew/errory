const getSvagEslintBaseConfigs = require('svag-lint/configs/base')
/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [...getSvagEslintBaseConfigs()]
