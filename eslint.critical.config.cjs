const baseConfig = require('./eslint.config.cjs');

const applicationConfig = baseConfig.find((entry) => entry?.languageOptions?.globals) || {};

module.exports = [
    {
        ignores: ['js/vendor/**']
    },
    {
        languageOptions: applicationConfig.languageOptions || {
            ecmaVersion: 2021,
            sourceType: 'module'
        },
        rules: {
            'constructor-super': 'error',
            'for-direction': 'error',
            'getter-return': 'error',
            'no-async-promise-executor': 'error',
            'no-class-assign': 'error',
            'no-compare-neg-zero': 'error',
            'no-cond-assign': 'error',
            'no-const-assign': 'error',
            'no-constant-binary-expression': 'error',
            'no-debugger': 'error',
            'no-dupe-args': 'error',
            'no-dupe-class-members': 'error',
            'no-dupe-else-if': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-duplicate-imports': 'error',
            'no-ex-assign': 'error',
            'no-extra-boolean-cast': 'error',
            'no-extra-semi': 'error',
            'no-func-assign': 'error',
            'no-import-assign': 'error',
            'no-irregular-whitespace': 'error',
            'no-loss-of-precision': 'error',
            'no-new-native-nonconstructor': 'error',
            'no-obj-calls': 'error',
            'no-self-assign': 'error',
            'no-setter-return': 'error',
            'no-sparse-arrays': 'error',
            'no-this-before-super': 'error',
            'no-undef': 'error',
            'no-unexpected-multiline': 'error',
            'no-unreachable': 'error',
            'no-unreachable-loop': 'error',
            'no-unsafe-finally': 'error',
            'no-unsafe-negation': 'error',
            'no-useless-backreference': 'error',
            'no-useless-catch': 'error',
            'require-yield': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error'
        }
    }
];
