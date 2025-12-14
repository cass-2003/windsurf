const path = require('path');

module.exports = {
    target: 'web',
    mode: 'production',
    entry: './src/webview/index.tsx',
    output: {
        path: path.resolve(__dirname, '..', 'dist'),
        filename: 'webview.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    devtool: 'nosources-source-map'
};
