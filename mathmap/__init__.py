"""Math Map — 一份从数数走到八元数的数学知识地图。

三样东西，各自独立：

    cells()    24 个课程格（学段 / 分支 / 前置 / 知识点清单）
    defs()     167 格定义（定义 / 关键结论 / 教材出处）
    tables()   八张表的行列语义

    frame("cells")   需要 pandas 时用它，一行 DataFrame

数据是只读镜像，改这里不会改变页面。页面在 math-map.html。
"""
from __future__ import annotations

import json
from pathlib import Path

__version__ = "1.10"
__all__ = ["cells", "defs", "tables", "frame", "cell", "definition"]

_D = Path(__file__).parent / "data"


def _load(name: str):
    with open(_D / name, encoding="utf-8") as f:
        return json.load(f)


def cells() -> list[dict]:
    """24 个课程格：id / stage / name / pre / soft / items / note"""
    return _load("cells.json")["cells"]


def defs() -> dict[str, dict]:
    """167 格定义：{名称: {k: 数学对象, d: 定义, t: 关键结论, s: [出处]}}"""
    return _load("defs.json")["defs"]


def tables() -> list[dict]:
    """八张表的行列语义与它回答的问题"""
    return _load("tables.json")["tables"]


def cell(name: str) -> dict | None:
    """按格名取一个课程格"""
    for c in cells():
        if c["name"] == name or c["id"] == name:
            return c
    return None


def definition(name: str) -> dict | None:
    """按格名取一条定义"""
    return defs().get(name)


def frame(kind: str = "cells"):
    """把数据摊成 DataFrame。需要 pandas。"""
    import pandas as pd

    if kind == "cells":
        return pd.DataFrame(cells())
    if kind == "defs":
        d = defs()
        return pd.DataFrame(
            [{"name": k, "object": v.get("k"), "def": v.get("d"),
              "key": v.get("t"), "sources": v.get("s", [])} for k, v in d.items()]
        )
    if kind == "tables":
        return pd.DataFrame(tables())
    raise ValueError("kind 只能是 cells / defs / tables")
