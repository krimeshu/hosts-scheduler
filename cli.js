#!/usr/bin/env node

var main = require('./');

var args = process.argv.slice(2);

if (args.length == 0) {
    main.switchNext();
    return;
}

var funcMap = {
        '-n': 'switchNext',
        '--next': 'switchNext',
        '-t': 'test',
        '--test': 'test',
        '-g': 'enableGroup',
        '--group': 'enableGroup'
    },
    funcName = null,
    argCache = [];

for (var i = 0, arg; arg = args[i]; i++) {
    var newName = funcMap[arg],
        newFunc = main[newName];

    if (newFunc) {
        if (funcName || argCache.length) {
            callMain(funcName || 'enableGroup', argCache);
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

callMain(funcName || 'enableGroup', argCache);

function callMain(funcName, args) {
    main[funcName].apply(main, args);
    // var argStr = args.map(function (arg) {
    //     return JSON.stringify(arg);
    // }).join(', ');
    // console.log('main["' + funcName + '"](' + argStr + ');');
}

