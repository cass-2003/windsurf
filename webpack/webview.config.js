const path = require('path');
const webpack = require('webpack');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    const isDevelopment = !isProduction;
    
    return {
        target: 'web',
        mode: isProduction ? 'production' : 'development',
        entry: {
            main: './src/webview/index.tsx'
        },
        output: {
            path: path.resolve(__dirname, '..', 'dist', 'webview'),
            filename: '[name].bundle.js',
            clean: true,
            publicPath: isDevelopment ? 'http://localhost:9000/' : './'
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
            fallback: {
                "crypto": require.resolve("crypto-browserify"),
                "buffer": require.resolve("buffer"),
                "stream": require.resolve("stream-browserify")
            }
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: path.resolve(__dirname, '..', 'tsconfig.json')
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(png|jpg|jpeg|gif|svg)$/,
                    type: 'asset/resource'
                }
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser'
            }),
            new WebpackManifestPlugin({
                fileName: 'manifest.json'
            })
            // 混淆将在构建后通过 javascript-obfuscator CLI 完成
        ],
        optimization: {
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10
                    },
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'react-vendor',
                        chunks: 'all',
                        priority: 20
                    }
                }
            },
            minimize: isProduction
        },
        devtool: isProduction ? false : 'source-map',
        devServer: isDevelopment ? {
            port: 9000,
            hot: true,
            allowedHosts: 'all',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            }
        } : undefined
    };
};
