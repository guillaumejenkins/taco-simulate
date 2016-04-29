// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db'),
    Messages = require('messages'),
    customElements = require('./custom-elements'),
    socket = require('./socket'),
    dialog = require('dialog'),
    telemetry = require('../../node_modules/taco-simulate-server/src/client-common/clientTelemetryHelper'); // TODO: Clean this up after taco-simulate and taco-simulate-server are merged

var plugins;
var pluginHandlers = {};
var serviceToPluginMap = {};

customElements.initialize();
socket.initialize(pluginHandlers, serviceToPluginMap);

window.addEventListener('DOMContentLoaded', function () {
    sizeContent();

    // Initialize standard modules, then plugins
    db.initialize().then(initializePlugins);
});

window.addEventListener('resize', function () {
    sizeContent();
});

function sizeContent() {
    // Size the content area to keep column widths fixed
    var bodyWidth = parseInt(window.getComputedStyle(document.body).width);
    var contentWidth = (Math.floor((bodyWidth - 1) / 333) || 1) * 333;
    document.querySelector('.cordova-main').style.width = contentWidth + 'px';
}

var pluginMessages = {};
function applyPlugins(plugins, clobberScope, clobberToPluginMap) {
    Object.keys(plugins).forEach(function (pluginId) {
        var plugin = plugins[pluginId];
        if (plugin) {
            if (typeof plugin === 'function') {
                pluginMessages[pluginId] = pluginMessages[pluginId] || new Messages(pluginId, socket.socket);
                plugin = plugin(pluginMessages[pluginId]);
                plugins[pluginId] = plugin;
            }
            if (clobberScope) {
                clobber(plugin, clobberScope, clobberToPluginMap, pluginId);
            }
        }
    });
}

function clobber(clobbers, scope, clobberToPluginMap, pluginId) {
    Object.keys(clobbers).forEach(function (key) {
        if (clobberToPluginMap && pluginId) {
            clobberToPluginMap[key] = pluginId;
        }

        if (clobbers[key] && typeof clobbers[key] === 'object') {
            scope[key] = scope[key] || {};
            clobber(clobbers[key], scope[key]);
        } else {
            scope[key] = clobbers[key];
        }
    });
}

function initializePlugins() {
    plugins = {
        /** PLUGINS **/
    };

    var pluginHandlersDefinitions = {
        /** PLUGIN-HANDLERS **/
    };

    applyPlugins(plugins);
    applyPlugins(pluginHandlersDefinitions, pluginHandlers, serviceToPluginMap);

    // Hide and register dialogs
    Array.prototype.forEach.call(document.getElementById('popup-window').children, function (dialogRef) {
        dialogRef.show = function () {
            document.getElementById('popup-window').style.display = '';
            this.style.display = '';
        };
        dialogRef.hide = function () {
            document.getElementById('popup-window').style.display = 'none';
            this.style.display = 'none';
        };
        dialog.pluginDialogs[dialogRef.id] = dialogRef;
        dialogRef.style.display = 'none';
    });

    Object.keys(plugins).forEach(function (pluginId) {
        try {
            plugins[pluginId].initialize && plugins[pluginId].initialize({ telemetryHelper: telemetry, socket: socket.socket });
        } catch (e) {
            console.error('Error initializing plugin ' + pluginId);
            console.error(e);
        }
    });
}
