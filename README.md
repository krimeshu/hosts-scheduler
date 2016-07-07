# hosts-scheduler

## 使用方法

首先切换到 `hosts-scheduler` 所在目录：

```bash
cd path/to/hosts-scheduler
```

初次使用时，请建立命令链接，方便今后快速调用：

```base
npm link
```

之后就可以通过 `hs` 命令快捷调用了：

```base
hs
hs -g group1
```

## hosts 规则分组说明

通过事先在 `hosts` 文件中加入注释标记，可以将规则进行分组：

```
#==== dev
127.0.0.1 website_host
#====

#==== test
192.168.0.101 website_host
#====

#==== online
#====
```

然后通过 `hs -g <分组名>` 或 `hs --group <分组名>` 即可启用对应分组下的规则，并刷新 DNS 缓存，使域名立即生效：

```
hs -g dev
hs -g test
hs -g online
```

直接使用 `hs` 则自动在现有的分组间按顺序切换：

```
hs
```