/**
 * Created by krimeshu on 2016/7/5.
 */
var os = require('os');
var childProcess = require('child_process');

var HostsEntity = require('./hosts-entity');

var HOSTS_PATH = os.platform() == 'win32' ?
    'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts';

module.exports = {
    // 测试
    'test': function () {
        var defaultHosts = new HostsEntity();
        defaultHosts.load(HOSTS_PATH);

        var line = new Array(81).join('*');

        console.log(line);
        console.log('Current active group: ' + defaultHosts.getActiveGroup());
        console.log('Group after active group: ' + defaultHosts.getGroupAfterActive());
        console.log(line);
        console.log(defaultHosts.stringify());

        this.switchNext();

        console.log(line);
        console.log('Current active group: ' + defaultHosts.getActiveGroup());
        console.log('Group after active group: ' + defaultHosts.getGroupAfterActive());
        console.log(line);
        console.log(defaultHosts.stringify());
    },
    // 查看版本
    'version': function () {
        var version = require('./package.json').version;
        console.log('v' + version);
    },
    // 切换到下一个自定义分组
    'switchNext': function () {
        var defaultHosts = new HostsEntity();
        defaultHosts.load(HOSTS_PATH);

        console.log('\nSwitching active group to next...');
        defaultHosts.enableGroup(defaultHosts.getGroupAfterActive());
        defaultHosts.save();

        this.showState(defaultHosts);
        this.flushDNS();
    },
    // 启用某个分组
    'enableGroup': function (groupName) {
        var defaultHosts = new HostsEntity();
        defaultHosts.load(HOSTS_PATH);

        console.log('\nSwitching active group to: ' + (groupName || '(default)'));
        if (!defaultHosts.hasGroup(groupName)) {
            console.log('\n Group: ' + groupName + ' not found!');
            return;
        }
        defaultHosts.enableGroup(groupName);
        defaultHosts.save();

        this.showState(defaultHosts);
        this.flushDNS();
    },
    // 禁用所有规则
    'disableAll': function () {
        var defaultHosts = new HostsEntity();
        defaultHosts.load(HOSTS_PATH);

        defaultHosts.disableAll();
        defaultHosts.save();

        this.flushDNS();
    },
    // 显示当前分组状态
    'showState': function (_hosts) {
        var defaultHosts = _hosts;
        if (!defaultHosts) {
            defaultHosts = new HostsEntity();
            defaultHosts.load(HOSTS_PATH);
        }

        defaultHosts.printGroupState();
    },
    // 显示当前分组规则
    'listCurrentGroup': function (_hosts) {
        var defaultHosts = _hosts;
        if (!defaultHosts) {
            defaultHosts = new HostsEntity();
            defaultHosts.load(HOSTS_PATH);
        }

        defaultHosts.printActiveGroup();
    },
    // 刷新DNS缓存
    'flushDNS': function () {
        var platform = os.platform();
        if (platform == 'win32' || platform == 'win64') {
            childProcess.exec('ipconfig /release & ipconfig /renew & ipconfig /flushdns', done);
        } else if (platform == 'darwin') {
            childProcess.exec('sudo killall -HUP mDNSResponder', done);
        } else if (platform == 'linux') {
            childProcess.exec('/etc/init.d/nscd restart', done);
        }
        function done() {
            console.log('\nDNS cache flushed!');
        }
    },
    // 查看帮助
    'help': function () {
        var helpText = '\n\
        hs -v\n\
        hs --version                查看版本\n\
        hs [-g] [<groupName>]\n\
        hs [--group] [<groupName>]  切换到对应分组（未指定分组名则关闭所有自定义分组）\n\
        hs -n\n\
        hs --next                   在现有自定义分组间轮流切换\n\
        hs -s\n\
        hs --state                  查看当前分组启用状态\n\
        hs -l\n\
        hs --list                   列出当前启用的分组规则\n\
        hs -f\n\
        hs --flush                  清空DNS缓存\n\
        hs -d\n\
        hs --disable                禁用所有分组的规则\n\
        hs -h\n\
        hs --help                   查看帮助\n\
        ';

        console.log('\nHosts Scheduler\n%s', helpText);
    }
};
