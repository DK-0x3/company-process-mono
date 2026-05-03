import pluginJs from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';
import pluginImport from 'eslint-plugin-import';
import importTs from 'eslint-plugin-import-typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginOptimizeRegex from 'eslint-plugin-optimize-regex';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPerf from 'eslint-plugin-react-perf';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		ignores: ['build/**/*'],
		languageOptions: {
			parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: globals.browser,
		},
		plugins: {
			'@typescript-eslint': tsEslint,
			'react': pluginReact,
			'react-hooks': reactHooks,
			'react-perf': reactPerf,
			'import': pluginImport,
			'optimize-regex': pluginOptimizeRegex,
			'unused-imports': unusedImports,
			'jsx-a11y': jsxA11y,
			'simple-import-sort': simpleImportSort,
			'boundaries': boundaries,
			'import-typescript': importTs,
		},
		rules: {
			// --- Base / Recommended ---
			...pluginJs.configs.recommended.rules,
			...tsEslint.configs.recommended.rules,
			...pluginReact.configs.flat.recommended.rules,
			...pluginImport.configs.errors.rules,
			...pluginImport.configs.warnings.rules,
			...boundaries.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			...reactPerf.configs.recommended.rules,

			// --- Code Style ---
			'quotes': ['error', 'single'],
			'semi': ['error', 'always'],
			'object-curly-spacing': ['error', 'always'],
			'indent': [2, 'tab'],
			'no-tabs': 'off',
			'no-trailing-spaces': 'off',
			'linebreak-style': 0,

			// === ОБЪЕКТЫ ===
			// Перенос строк в объектах с 3+ свойствами
			'object-curly-newline': [
				'error',
				{
					ObjectExpression: {
						multiline: true,
						minProperties: 3,
						consistent: true
					},
					ObjectPattern: {
						multiline: true,
						minProperties: 3,
						consistent: true
					},
					ImportDeclaration: {
						multiline: true,
						minProperties: 3,
						consistent: true
					},
					ExportDeclaration: {
						multiline: true,
						minProperties: 3,
						consistent: true
					}
				}
			],
			// Свойства объектов на новых строках
			'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],

			// === МАССИВЫ ===
			// Если 3+ элементов — каждый на новой строке
			'array-element-newline': [
				'error',
				{
					multiline: true,
					minItems: 3
				}
			],
			// Скобки массива на новых строках, если многострочный
			'array-bracket-newline': ['error', { multiline: true }],

			// === ИМПОРТЫ / ЭКСПОРТЫ ===
			// Если много импортов — каждый на новой строке
			'import/newline-after-import': ['error', { count: 1 }],

			// === ЦЕПОЧКИ ВЫЗОВОВ ===
			// Перенос строк в длинных цепочках (.map().filter().reduce())
			'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],

			// === ОПЕРАТОРЫ ===
			// Переносы строк до операторов
			'operator-linebreak': ['error', 'before'],

			// === ФУНКЦИИ ===
			// Обязательные круглые скобки у аргументов стрелочных функций
			'arrow-parens': ['error', 'always'],

			// === ПРОЧЕЕ ===
			// Ограничение длины строки
			'max-len': [
				'error',
				{
					code: 120,
					ignoreComments: true,
					ignoreUrls: true
				}
			],
			// Без лишних пробелов
			'no-multi-spaces': 'error',

			// --- TypeScript ---
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'interface',
					format: ['PascalCase'] 
				},
				{
					selector: 'variable',
					format: [
						'camelCase',
						'UPPER_CASE',
						'PascalCase'
					],
					leadingUnderscore: 'allowDouble',
					trailingUnderscore: 'allowDouble',
				},
				{
					selector: 'function',
					format: [
						'camelCase',
						'UPPER_CASE',
						'PascalCase'
					],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow',
				},
				{
					selector: 'class',
					format: ['PascalCase'] 
				},
			],

			// --- React ---
			'react/react-in-jsx-scope': 'off',
			'react/no-deprecated': 'off',
			'react/jsx-filename-extension': [
				2,
				{
					extensions: [
						'.js',
						'.jsx',
						'.ts',
						'.tsx'
					] 
				},
			],
			'jsx-quotes': ['error', 'prefer-double'],
			'react/require-default-props': 'off',
			'react/no-unused-class-component-methods': 'off',
			'react/prop-types': 0,
			'react/jsx-props-no-spreading': 'off',
			'react/jsx-indent': [2, 'tab'],
			'react/jsx-indent-props': [2, 'tab'],
			'react/function-component-definition': [2, { namedComponents: 'arrow-function' },],
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'react-perf/jsx-no-new-object-as-prop': 'warn',
			'react-perf/jsx-no-new-array-as-prop': 'warn',
			'react-perf/jsx-no-new-function-as-prop': 'warn',
			'react-perf/jsx-no-jsx-as-prop': 'off',

			// --- Import ---
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
			'import/no-unresolved': 'off',
			'import/named': 'off',
			'import/extensions': [
				'error',
				'ignorePackages',
				{
					js: 'never',
					mjs: 'never',
					jsx: 'never',
					ts: 'never',
					tsx: 'never',
				},
			],
			'import/prefer-default-export': 'off',
			'import/order': 'off',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'boundaries/element-types': [
				'error',
				{
					default: 'disallow',
					rules: [
						// pages можно собирать только из widgets, features, entities, shared
						{
							from: 'pages',
							allow: [
								'widgets',
								'features',
								'entities',
								'shared',
								'pages'
							],
						},
						// widgets можно собирать из features, entities, shared
						{
							from: 'widgets',
							allow: [
								'features',
								'entities',
								'shared',
								'widgets'
							],
						},
						// features можно собирать из entities, shared
						{
							from: 'features',
							allow: [
								'entities',
								'shared',
								'features'
							],
						},
						// entities можно собирать только из shared
						{
							from: 'entities',
							allow: ['shared', 'entities'],
						},
						// shared может импортировать сам себя (внутри слоя)
						{
							from: 'shared',
							allow: ['shared', 'app'], // ! только если нужно пробросить хуки
						},
						// app — верхний уровень, может импортировать все
						{
							from: 'app',
							allow: [
								'pages',
								'widgets',
								'features',
								'entities',
								'shared',
								'app'
							],
						},
					],
				},
			],
			'boundaries/no-unknown': 'error',
			'import-typescript/no-relative-parent-imports': ['error'],

			// --- A11y ---
			'jsx-a11y/control-has-associated-label': 'off',

			// --- Regex ---
			'optimize-regex/optimize-regex': 'warn',

			// --- Misc ---
			'no-undef': 'off',
			'no-underscore-dangle': 'off',
			'no-cond-assign': 'off',
			'class-methods-use-this': 'off',
			'lines-between-class-members': [
				'error',
				'always',
				{ exceptAfterSingleLine: true },
			],
			'no-plusplus': 'off',
			'no-shadow': 'off',
			'no-bitwise': 'off',
			'global-require': 0,
			'no-param-reassign': 0,
		},
		settings: {
			'import/resolver': {
				node: {
					extensions: [
						'.js',
						'.jsx',
						'.ts',
						'.tsx'
					],
				},
				typescript: {
					project: './tsconfig.json',
				},
			},
			react: {
				version: 'detect',
			},
			'boundaries/elements': [
				{
					type: 'app',
					pattern: 'src/app/*' 
				},
				{
					type: 'pages',
					pattern: 'src/pages/*' 
				},
				{
					type: 'widgets',
					pattern: 'src/widgets/*' 
				},
				{
					type: 'features',
					pattern: 'src/features/*' 
				},
				{
					type: 'entities',
					pattern: 'src/entities/*' 
				},
				{
					type: 'shared',
					pattern: 'src/shared/*' 
				},
			]
		},
	},
	{
		// --- Extra TSX-specific rules ---
		files: ['*.tsx'],
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variable',
					format: [
						'camelCase',
						'UPPER_CASE',
						'PascalCase'
					],
					leadingUnderscore: 'allowDouble',
					trailingUnderscore: 'allowDouble',
				},
				{
					selector: 'variable',
					format: [
						'camelCase',
						'UPPER_CASE',
						'PascalCase'
					],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow',
				},
			],
		},
	},
];
