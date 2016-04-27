// Copyright (c) Microsoft Corporation. All rights reserved.
var telemetry = require('../../node_modules/taco-simulate-server/src/client-common/clientTelemetryHelper'); // TODO: Clean this up after taco-simulate and taco-simulate-server are merged

var socket;

module.exports.initialize = function (pluginHandlers, serviceToPluginMap) {
    socket = io();
    module.exports.socket = socket;

    socket.emit('register-simulation-host');
    socket.on('exec', function (data) {
        if (!data) {
            throw 'Exec called on simulation host without exec info';
        }

        var index = data.index;
        if (typeof index !== 'number') {
            throw 'Exec called on simulation host without an index specified';
        }

        var success = data.hasSuccess ? getSuccess(index) : null;
        var failure = data.hasFail ? getFailure(index) : null;

        var service = data.service;
        if (!service) {
            throw 'Exec called on simulation host without a service specified';
        }

        var action = data.action;
        if (!action) {
            throw 'Exec called on simulation host without an action specified';
        }

        console.log('Exec ' + service + '.' + action + ' (index: ' + index + ')');

        var handler = pluginHandlers[service] && pluginHandlers[service][action];
        var telemetryProps = { pluginId: serviceToPluginMap[service], service: service, action: action };

        if (!handler) {
            telemetryProps.handled = 'none';
            telemetry.sendClientTelemetry(socket, 'exec', telemetryProps);
            handler = pluginHandlers['*']['*'];
            handler(success, failure, service, action, data.args);
        } else {
            telemetryProps.handled = 'sim-host';
            telemetry.sendClientTelemetry(socket, 'exec', telemetryProps);
            handler(success, failure, data.args);
        }
    });

    socket.on('refresh', function () {
        document.location.reload(true);
    });
};

function getSuccess(index) {
    return function (result) {
        console.log('Success callback for index: ' + index + '; result: ' + result);
        var data = { index: index, result: result };
        socket.emit('exec-success', data);
    };
}

function getFailure(index) {
    return function (error) {
        console.log('Failure callback for index: ' + index + '; error: ' + error);
        var data = { index: index, error: error };
        socket.emit('exec-failure', data);
    };
}
