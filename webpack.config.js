const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const getNodeEnv = ({ production, tests, e2e } = {}) => (
	(e2e && 'e2e') ||
	(tests && 'tests') ||
	(production && 'production') ||
	'development'
);

module.exports = (env) => [
	{
		mode: env.production || env.e2e ? 'production' : 'development',
		entry: {
			background: './src/background.js',
			...(env.tests ? {
				'main.spec': './src/main.spec.js',
			} : {}),
		},
		output: {
			path: path.resolve(__dirname, 'app'),
			filename: '[name].js',
			library: '[name]',
			libraryTarget: 'umd',
		},
		devtool: 'source-maps',
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_module/,
					use: [
						{
							loader: 'babel-loader',
							options: {
								babelrc: false,
								presets: [
									['@babel/env', {
										targets: { electron: '3' },
										modules: 'commonjs',
									}],
								],
							},
						},
						...(env.coverage ? [
							{
								loader: 'istanbul-instrumenter-loader',
								options: { esModules: true },
							},
						] : []),
					],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(getNodeEnv(env)),
			}),
		],
		target: 'electron-main',
		node: {
			__dirname: false,
		},
		externals: [nodeExternals()],
	},
	{
		mode: env.production || env.e2e ? 'production' : 'development',
		entry: {
			app: './src/app.js',
			'i18n/index': './src/i18n/index.js',
			preload: './src/preload.js',
			...(env.tests ? {
				'renderer.spec': './src/renderer.spec.js',
			} : {}),
		},
		output: {
			path: path.resolve(__dirname, 'app'),
			filename: '[name].js',
			library: '[name]',
			libraryTarget: 'umd',
		},
		devtool: 'source-maps',
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_module/,
					use: [
						{
							loader: 'babel-loader',
							options: {
								babelrc: false,
								presets: [
									['@babel/env', {
										targets: { electron: '3' },
										modules: 'commonjs',
									}],
								],
							},
						},
						...(env.coverage ? [
							{
								loader: 'istanbul-instrumenter-loader',
								options: { esModules: true },
							},
						] : []),
					],
				},
				{
					test: /\.less$/,
					use: [
						{
							loader: 'style-loader',
							options: {
								singleton: true,
							},
						},
						'css-loader',
						'less-loader',
					],
				},
				{
					test: /\.(woff2?|ttf|eot|svg|jpe?g|png|gif|mp4|mov|ogg|webm)(\?.*)?$/,
					use: [
						'file-loader',
					],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(getNodeEnv(env)),
			}),
			new CopyWebpackPlugin([
				{ from: './src/public', to: './public' },
				{ from: './src/i18n/lang', to: './i18n/lang' },
			]),
		],
		target: 'electron-renderer',
		node: {
			__dirname: false,
		},
		externals: [nodeExternals()],
	},
	...(env.e2e ? [
		{
			mode: 'development',
			entry: './src/e2e/app.e2e.js',
			output: {
				path: path.resolve(__dirname, 'app'),
				filename: 'e2e.js',
			},
			module: {
				rules: [
					{
						test: /\.js$/,
						exclude: /node_module/,
						use: [
							{
								loader: 'babel-loader',
								options: {
									babelrc: false,
									presets: [
										['@babel/env', {
											targets: { node: 10 },
											modules: 'commonjs',
										}],
									],
								},
							},
						],
					},
				],
			},
			target: 'node',
			node: {
				__dirname: false,
			},
			externals: [nodeExternals()],
		},
	] : []),
];
