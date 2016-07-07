/**
 * Created by krimeshu on 2016/7/5.
 */
var os = require('os');
var HostsEntity = require('./hosts-entity');

var HOSTS_PATH = os.platform() == 'win32' ?
    'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts';
// var EOL = os.EOL;

var defaultHosts = new HostsEntity();

defaultHosts.load(HOSTS_PATH);

// console.log('\nrowSet:\n', JSON.stringify(defaultHosts.rowSet, null, 2));
// console.log('\ngroupSet:\n', JSON.stringify(defaultHosts.groupSet, null, 2));
// console.log(defaultHosts.getRowsOfGroup());

var line = new Array(81).join('*');
console.log(line);
console.log('Current active group: ' + defaultHosts.getActiveGroup());
console.log('Group after active group: ' + defaultHosts.getGroupAfterActive());
console.log(line);
console.log(defaultHosts.stringify());

defaultHosts.enableGroup();

console.log(line);
console.log('Current active group: ' + defaultHosts.getActiveGroup());
console.log('Group after active group: ' + defaultHosts.getGroupAfterActive());
console.log(line);
console.log(defaultHosts.stringify());