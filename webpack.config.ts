/* eslint-env node */

import { Configuration as WebpackConfiguration } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";
import * as path from "path";
import { ConsoleRemotePlugin } from "@openshift-console/dynamic-plugin-sdk-webpack";

const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

import pluginMetadata from './plugin-metadata';

interface Configuration extends WebpackConfiguration {
    devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
    mode: "development",
    // No regular entry points. The remote container entry is handled by ConsoleRemotePlugin.
    entry: {},
    context: path.resolve(__dirname, "src"),
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name]-bundle.js",
        chunkFilename: "[name]-chunk.js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        plugins: [new TsconfigPathsPlugin()],
    },
    module: {
        rules: [
            {
                test: /\.(jsx?|tsx?)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.resolve(__dirname, "tsconfig.json"),
                        },
                    },
                ],
            },
            {
                exclude:
                    /node_modules\/(?!(@patternfly|@openshift-console\/plugin-shared|@openshift-console\/dynamic-plugin-sdk)\/).*/,
                test: /\.scss$/,
                use: [
                    { loader: 'style-loader' },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'resolve-url-loader',
                        options: {
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                outputStyle: 'compressed',
                            },
                            sourceMap: true,
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*$|$)/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[name].[ext]',
                },
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
        ],
    },
    devServer: {
        static: './dist',
        port: 9001,
        // Allow bridge running in a container to connect to the plugin dev server.
        allowedHosts: 'all',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization",
            'Cache-Control': 'no-store'
        },
        devMiddleware: {
            writeToDisk: true,
        },
    },
    plugins: [
        new ConsoleRemotePlugin({
            pluginMetadata,
            validateExtensionIntegrity: false
        }),
        new CopyWebpackPlugin({
            patterns: [{ from: path.resolve(__dirname, 'locales'), to: 'locales' }],
        }),
    ],
    devtool: "source-map",
    optimization: {
        chunkIds: "named",
        minimize: false,
    },
};

if (process.env.NODE_ENV === "production") {
    config.mode = "production";
    if (config.output) {
        config.output.filename = '[name]-bundle-[hash].min.js';
        config.output.chunkFilename = '[name]-chunk-[chunkhash].min.js';
    }
    if (config.optimization) {
        config.optimization.chunkIds = 'deterministic';
        config.optimization.minimize = true;
    }
    config.devtool = false;
}

export default config;
