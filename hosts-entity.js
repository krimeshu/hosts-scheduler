/**
 * Created by krimeshu on 2016/7/5.
 */

var os = require('os');
var fs = require('fs');

var ROW_TYPE = {
    EMPTY: 0,
    COMMENT: 1,
    RULE: 2
};

function HostsEntity() {
    this.filePath = null;
    this.groupSet = [];
    this.rowSet = [];
    this.rawText = null;
    this.loaded = false;
}

HostsEntity.ROW_TYPE = ROW_TYPE;

var PERMANENT_GROUP = '[ALWAYS_ON]';
var ABANDONED_GROUP = '[ALWAYS_OFF]';

const isAvailableRule = (text) => {
    return /^\s*([\d]+\.[\d.]+|[\da-f]*::?[\da-f:]+)\s+(.+?)$/i.test(text);
};

const enableRuleRows = (row) => {
    if (row.type === ROW_TYPE.COMMENT &&
        isAvailableRule(row.text)) {
        row.type = ROW_TYPE.RULE;
    }
};

const disableRuleRows = (row) => {
    if (row.type === ROW_TYPE.RULE) {
        row.type = ROW_TYPE.COMMENT;
    }
};

HostsEntity.prototype = {
    // 加载某个hosts文件并解析到本对象
    'load': function (filePath) {
        var self = this;
        var buffer = fs.readFileSync(filePath);
        var text = String(buffer);
        self.filePath = filePath;
        self.rawText = text;
        self.loaded = true;
        self.parse(text);
    },
    // 将本对象状态存入读取的hosts文件
    'save': function () {
        var self = this,
            filePath = self.filePath,
            loaded = self.loaded;
        if (!loaded) {
            throw new Error('HostEntity is not loaded!');
        }
        fs.writeFileSync(filePath, self.stringify());
    },
    // 将本对象状态恢复到最初读取时
    'restore': function () {
        var self = this,
            rawText = self.rawText,
            loaded = self.loaded;
        if (!loaded) {
            throw new Error('HostEntity is not loaded!');
        }
        self.parse(rawText);
    },
    // 将某段hosts内容解析到本对象
    'parse': function (text) {
        var self = this,
            groupSet = self.groupSet = [],
            rowSet = self.rowSet = [],

            ROW_TYPE = HostsEntity.ROW_TYPE,

            rowTexts = text.split(/\r?\n/g),
            emptyReg = /^\s*$/,
            commentReg = /^#/,
            groupBorderReg = /^#={4,}\s*(.*?)$/;

        var defaultGroup = {
            name: '',
            members: []
        };
        var permanentGroup = {
            name: PERMANENT_GROUP,
            members: []
        };
        var abandonedGroup = {
            name: ABANDONED_GROUP,
            members: []
        };
        groupSet.push(defaultGroup, permanentGroup, abandonedGroup);

        var currentGroup = defaultGroup;

        for (var i = 0, l = rowTexts.length; i < l; i++) {
            var rowText = rowTexts[i],
                row = {};
            // console.log(('00' + i).slice(-3) + ': ' + rowText);
            if (emptyReg.test(rowText)) {
                // 当前行是空行
                row.text = rowText;
                row.type = ROW_TYPE.EMPTY;
                currentGroup.members.push(row);
            } else if (commentReg.test(rowText)) {
                // 是一条注释
                row.text = rowText.slice(1);
                row.type = ROW_TYPE.COMMENT;
                var ms = groupBorderReg.exec(rowText);
                if (ms) {
                    // 注释是一条分组标记
                    var groupName = ms[1];
                    if (groupName) {
                        // 标记中指定了分组名
                        var groups = groupSet.filter(function (group) {
                            return group.name === groupName;
                        });
                        if (groups.length >= 1) {
                            // 是某个已存在的分组
                            currentGroup = groups[0];
                        } else {
                            // 是新的分组
                            currentGroup = {
                                name: groupName,
                                members: []
                            };
                            groupSet.push(currentGroup);
                        }
                    } else {
                        // 未指定分组名，说明是分组结束标记
                        currentGroup = defaultGroup;
                    }
                } else {
                    // 注释是一条普通注释
                    currentGroup.members.push(row);
                }
            } else {
                // 是一条规则
                row.text = rowText;
                row.type = ROW_TYPE.RULE;
                currentGroup.members.push(row);
            }
            row.group = currentGroup;
            rowSet.push(row);
        }
    },
    // 将当前hosts状态转为文本
    'stringify': function () {
        var self = this,
            groupSet = self.groupSet,

            ROW_TYPE = HostsEntity.ROW_TYPE,

            builder = [];

        groupSet.forEach(function (group) {
            var groupName = group.name,
                groupMembers = group.members;
            groupName && builder.push('#==== ' + groupName);
            groupMembers.forEach(function (row) {
                switch (row.type) {
                    case ROW_TYPE.EMPTY:
                        builder.push('');
                        break;
                    case ROW_TYPE.COMMENT:
                        builder.push('#' + row.text);
                        break;
                    case ROW_TYPE.RULE:
                        builder.push(row.text);
                        break;
                }
            });
            groupName && builder.push('#====');
        });

        return builder.join(os.platform() == 'win32' ? '\r\n' : '\n');
    },
    // 大致判断某行内容是否可用的规则（排除普通文本注释的情况）
    isAvailableRule,
    // 判断是否存在某个分组
    'hasGroup': function (groupName) {
        var self = this,
            groupSet = self.groupSet,
            groups = groupSet.filter(function (group) {
                return group.name === groupName;
            });
        return groups.length > 0;
    },
    // 获取指定分组名下的所有成员行（groupName为空时返回未分组的行）
    'getRowsOfGroup': function (groupName) {
        var self = this,
            groupSet = self.groupSet,
            groups = groupSet.filter(function (group) {
                return group.name === groupName;
            }),
            rows = [];

        groups.forEach(function (group) {
            rows = rows.concat(group.members);
        });
        return rows;
    },
    // 启用指定分组名下的所有成员行（groupName为空时操作未分组的行）
    'enableGroup': function (groupName) {
        var self = this,

            ROW_TYPE = HostsEntity.ROW_TYPE;

        // 先禁用所有规则
        self.disableAll();

        // 永久组自动开启
        self.getRowsOfGroup(PERMANENT_GROUP).forEach(enableRuleRows);

        // 废弃组永远不被启用
        if (groupName === ABANDONED_GROUP) {
            console.log('\nAbandoned group "' + ABANDONED_GROUP + '" should not be enabled.\n');
            return;
        }
        // 再对选中分组进行启用
        self.getRowsOfGroup(groupName || '').forEach(enableRuleRows);
    },
    // 禁用指定分组名下的所有成员行（groupName为空时操作未分组的行）
    'disableGroup': function (groupName) {
        var self = this,

            ROW_TYPE = HostsEntity.ROW_TYPE;

        // 废弃组自动关闭
        self.getRowsOfGroup(ABANDONED_GROUP).forEach(disableRuleRows);

        // 永久组永远不被关闭
        if (groupName === PERMANENT_GROUP) {
            console.log('\Permanent group "' + PERMANENT_GROUP + '" should not be disabled.\n');
            return;
        }

        self.getRowsOfGroup(groupName || '').forEach(disableRuleRows);
    },
    // 禁用所有规则行
    'disableAll': function () {
        var self = this,
            rowSet = self.rowSet,

            ROW_TYPE = HostsEntity.ROW_TYPE;

        rowSet.forEach(function (row) {
            var group = row.group;
            if (group && group.name === PERMANENT_GROUP) {
                // 永久规则不被禁用
                return;
            }
            if (row.type === ROW_TYPE.RULE) {
                row.type = ROW_TYPE.COMMENT;
            }
        });
    },
    // 获取当前启用的最后一个分组名
    'getActiveGroups': function () {
        var self = this,
            groupSet = self.groupSet,

            ROW_TYPE = HostsEntity.ROW_TYPE;

        const activeGroups = groupSet
            .filter(group => group.members.find(i => i.type === ROW_TYPE.RULE));
        return activeGroups.map(group => group.name);
    },
    // 显示当前启用的分组名
    'printActiveGroup': function () {
        var self = this,
            groupSet = self.groupSet,

            ROW_TYPE = HostsEntity.ROW_TYPE,

            currentGroupNames = self.getActiveGroups();

        if (!currentGroupNames) {
            console.log('\nNo group enabled now.');
            return;
        }

        console.log('\nCurrent enabled group: %s\n', currentGroupNames);
    },
    // 显示目前使用的分组情况
    'printGroupState': function () {
        var self = this,
            groupSet = self.groupSet,

            currentGroupNames = self.getActiveGroups();

        console.log('\nCurrent group state:\n');
        groupSet.forEach(function (group) {
            var groupName = group.name,
                isPermanent = groupName === PERMANENT_GROUP,
                isCurrent = isPermanent || currentGroupNames.indexOf(groupName) >= 0;
            if (groupName === ABANDONED_GROUP) return;
            let name = groupName || '[UNGROUPED]';
            if (isCurrent) {
                let total = 0;
                let enabled = 0;
                group.members.forEach(row => {
                    if (row.type === ROW_TYPE.COMMENT &&
                        isAvailableRule(row.text)) {
                        total++;
                    } else if (row.type === ROW_TYPE.RULE) {
                        total++;
                        enabled++;
                    }
                });
                const state = (enabled === total) ? '✔' : `(${enabled}/${total})`;
                console.log('\t%s%s%s', '** ', name, ' **', state);
            } else {
                console.log('\t%s%s%s', '   ', name, '');
            }
        });
    }
};

module.exports = HostsEntity;