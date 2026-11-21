# mathmap

《数学地图》的数据层。三样东西，互不依赖：

```python
import mathmap

mathmap.cells()    # 24 个课程格：学段 / 分支 / 前置 / 知识点清单
mathmap.defs()     # 167 条定义：定义 / 关键结论 / 教材出处
mathmap.tables()   # 八张表的行列语义，以及每张表回答什么问题
```

需要 DataFrame 时：

```python
mathmap.frame("cells")     # 需要 pandas
mathmap.frame("defs")
```

按名字取一条：

```python
mathmap.cell("分数与小数")
mathmap.definition("定点")
```

## 这是什么

一张从数数走到八元数的知识地图。166 个目录格，每格一条教材级定义和一处可查的出处；
前面六张表按**对象**分类（群、环、拓扑空间），后面两张按**结构阶数**和**遗忘方向**分类。

页面在仓库根目录的 `math-map.html`，单文件、离线可用、不需要装任何东西。
这个包只是把同一份数据开放出来，方便做统计、做教具、喂给别的程序。

## 数据是只读镜像

改这里不会改变页面。要改内容，改 `math-map.html`，然后重新导出。

## 许可

代码 AGPL-3.0-or-later，内容 CC BY-SA 4.0，**数据 CC BY 4.0**——数据可以自由使用（含商用），只需标注来源。见仓库根目录的 `LICENSES.md`。
