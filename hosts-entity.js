/**
 * Created by krimeshu on 2016/7/5.
 */

var os = require('os');
var fs = require('fs');

function HostsEntity() {
    this.filePath = null;
    this.groupSet = [];
    this.rowSet = [];
    this.rawText = null;
    this.loaded = false;
}

HostsEntity.ROW_TYPE = {
    EMPTY: 0,
    COMMENT: 1,
    RULE: 2
};

HostsEntity.prototype = {
    load: function (filePath) {
        var self = this;
        var buffer = fs.readFileSync(filePath);
        var text = String(buffer);
        self.filePath = filePath;
        self.rawText = text;
        self.loaded = true;
        self.parse(text);
    },
    save: function () {
        var self = this,
            filePath = self.filePath,
            loaded = self.loaded;
        if (!loaded) {
            throw new Error('HostEntity is not loaded!');
        }
        fs.writeFileSync(filePath, self.stringify());
    },
    restore: function () {
        var self = this,
            rawText = self.rawText,
            loaded = self.loaded;
        if (!loaded) {
            throw new Error('HostEntity is not loaded!');
        }
        self.parse(rawText);
    },
    parse: function (text) {
        var self = this,
            groupSet = self.groupSet = [],
            rowSet = self.rowSet = [],

            ROW_TYPE = HostsEntity.ROW_TYPE,

            rowTexts = text.split(/\r?\n/g),
            emptyReg = /^\s*$/,
            commentReg = /^#/,
            groupBorderReg = /^#====\s*(.*?)$/,

            defaultGroup = {
                name: '',
                members: []
            },
            currentGroup = defaultGroup;
        groupSet.push(currentGroup);

        for (var i = 0, l = rowTexts.length; i < l; i++) {
            var rowText = rowTexts[i],
                row = {};
            // console.log(('00' + i).slice(-3) + ': ' + rowText);
            if (emptyReg.test(rowText)) {
                // 当前行是空行
                row.text = rowText;
                row.type = ROW_TYPE.EMPTY
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
            rowSet.push(row);
        }
    },
    stringify: function () {
        var self = this,
            rowSet = self.rowSet,

            ROW_TYPE = HostsEntity.ROW_TYPE,

            builder = [];

        rowSet.forEach(function (row) {
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

        return builder.join(os.platform() == 'win32' ? '\r\n' : '\n');
    },
    getRowsOfGroup: function (groupName) {
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
    isAvailableRule: function (text) {
        return /^\s*([\d]+\.[\d.]+|[\da-f]*::?[\da-f:]+)\s+(.+?)$/i.test(text);
    },
    enableGroup: function (groupName) {
        var self = this,

            ROW_TYPE = HostsEntity.ROW_TYPE;

        // 先禁用所有自定义分组
        self.disableGroup();

        // 再对选中分组进行启用
        self.getRowsOfGroup(groupName || '').forEach(function (row) {
            if (row.type === ROW_TYPE.COMMENT &&
                self.isAvailableRule(row.text)) {
                row.type = ROW_TYPE.RULE;
            }
        });
    },
    disableGroup: function (groupName) {
        var self = this,
            groupSet = self.groupSet,

            ROW_TYPE = HostsEntity.ROW_TYPE,

            hasTargetName = arguments.length > 0;

        groupSet.forEach(function (group) {
            if (hasTargetName && group.name !== groupName) {
                // 指定了分组名，当前组名不对时，不处理
                return;
            }
            group.members.forEach(function (row) {
                if (row.type === ROW_TYPE.RULE) {
                    row.type = ROW_TYPE.COMMENT;
                }
            });
        });
    },
    getActiveGroup: function () {
        var self = this,
            groupSet = self.groupSet,

            ROW_TYPE = HostsEntity.ROW_TYPE,

            groupName = '';

        groupSet.forEach(function (group) {
            var allActive = group.members.length > 0;
            group.members.forEach(function (row) {
                if (row.type === ROW_TYPE.COMMENT) {
                    allActive = false;
                }
            });
            if (allActive) {
                groupName = group.name;
            }
        });

        return groupName;
    }
};

module.exports = HostsEntity;