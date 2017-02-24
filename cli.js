#!/usr/bin/env node

var main = require('./');

var args = process.argv.slice(2);

if (args.length == 0) {
    main.help();
    return;
}

var funcMap = {
        '-v': 'version',
        '--version': 'version',
        '-g': 'enableGroup',
        '--group': 'enableGroup',
        '-n': 'switchNext',
        '--next': 'switchNext',
        '-t': 'test',
        '--test': 'test',
        '-s': 'showState',
        '--state': 'showState',
        '-f': 'flushDNS',
        '--flush': 'flushDNS',
        '-d': 'disableAll',
        '--disable': 'disableAll',
        '-h': 'help',
        '--help': 'help'
    },
    funcName = null,
    argCache = [];

for (var i = 0, arg; arg = args[i]; i++) {
    var newName = funcMap[arg],
        newFunc = main[newName];

    if (newFunc) {
        if (funcName || argCache.length) {
            callMain(funcName || 'help', argCache);
        }
        funcName = newName;
        argCache = [];
    } else {
        if (/^`.*?`$/.test(arg)) {
            arg = JSON.parse(arg.slice(1, -1));
        }
        argCache.push(arg);
    }
}

callMain(funcName || 'help', argCache);

function callMain(funcName, args) {
    main[funcName].apply(main, args);
    // var argStr = args.map(function (arg) {
    //     return JSON.stringify(arg);
    // }).join(', ');
    // console.log('main["' + funcName + '"](' + argStr + ');');
}

