#!/usr/bin/env python3
"""
Диагностика физики (RigidBodies и Joints) в файлах MMD (.pmx)
на базе библиотеки PMX-Scripting-Tools.

Запуск из директории PMX-Scripting-Tools:
    python inspect_pmx_physics.py /media/chrono/2BBD00A479A7EF93/dev/3d/mmd-viewer/public/models/model.pmx
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pmx_scripting import pmx_parser, pmx_struct


ZONE_PATTERNS: dict[str, list[re.Pattern[str]]] = {
    "breast": [
        re.compile(r"(乳|胸|ちち|breast|boob|bust|oppai)", re.IGNORECASE),
    ],
    "hair": [
        re.compile(
            r"(髪|髪の毛|アホ毛|ツインテ|ポニテ|おさげ|もみあげ|前髪|後ろ髪|横髪|hair|bang|ponytail|twintail)",
            re.IGNORECASE,
        ),
    ],
    "skirt": [
        re.compile(r"(スカート|skirt)", re.IGNORECASE),
    ],
}

ZONE_REFERENCE_INFO: dict[str, dict[str, str]] = {
    "breast": {
        "title": "Грудь (Breast)",
        "common_names": "乳.L / 乳.R, 胸, 左乳 / 右乳, breast_L / breast_R",
        "what_to_check": (
            "Обычно тип тела — bone-driven (0), physics (1) или physics+bone (2) "
            "с умеренной массой и пружинами (spring_move / spring_rot) в Joints. "
            "Слишком низкое демпфирование или слишком мягкие пружины дают долгое "
            "«желейное» дрожание, а слишком жёсткие — делают движение деревянным."
        ),
    },
    "hair": {
        "title": "Волосы (Hair)",
        "common_names": "髪, 前髪, 後ろ髪, 横髪, ツインテ, ポニテ, もみあげ, hair",
        "what_to_check": (
            "Волосы обычно строятся цепочками сегментов от корня к кончикам с коллайдерами "
            "(режим Bone/kinematic) на голове, шее и плечах, чтобы пряди не проваливались "
            "сквозь тело. Частая проблема — отсутствие коллайдеров на плечах/спине или "
            "слишком слабые ограничения углов, из-за чего пряди «выстреливают»."
        ),
    },
    "skirt": {
        "title": "Юбка (Skirt)",
        "common_names": "スカート, 前スカート, 後ろスカート, 左スカート, 右スカート, skirt",
        "what_to_check": (
            "Юбка чаще всего состоит из радиальных цепочек сегментов вокруг бёдер и ног "
            "плюс коллайдеров на бёдрах/ногах. Если коллайдеров на ногах не хватает "
            "или слишком слабы пружины/ограничения, при беге ткань легко пробивает меш."
        ),
    },
}


def bone_label(bones: list[pmx_struct.PmxBone], idx: int) -> str:
    if 0 <= idx < len(bones):
        b = bones[idx]
        return b.name_jp or b.name_en or f"<bone_{idx}>"
    return "<нет кости>"


def rb_label(rb: pmx_struct.PmxRigidBody, idx: int) -> str:
    return rb.name_jp or rb.name_en or f"<rb_{idx}>"


def classify_zone(rb: pmx_struct.PmxRigidBody, bones: list[pmx_struct.PmxBone]) -> str:
    b_name = ""
    if 0 <= rb.bone_idx < len(bones):
        b = bones[rb.bone_idx]
        b_name = f"{b.name_jp} {b.name_en}"
    combined = f"{rb.name_jp} {rb.name_en} {b_name}"
    for zone, patterns in ZONE_PATTERNS.items():
        if any(p.search(combined) for p in patterns):
            return zone
    return "other"


def is_bone_only_mode(phys_mode: pmx_struct.RigidBodyPhysMode) -> bool:
    return phys_mode == pmx_struct.RigidBodyPhysMode.BONE


def analyze_pmx(pmx: pmx_struct.Pmx) -> None:
    print(f"Модель: {pmx.header.name_jp or pmx.header.name_en or '<без названия>'}")
    print(
        f"Костей: {len(pmx.bones)} | "
        f"RigidBodies: {len(pmx.rigidbodies)} | "
        f"Joints: {len(pmx.joints)}"
    )
    print("-" * 70)

    if not pmx.rigidbodies:
        print("В модели нет RigidBodies — физика в MMD работать не будет.")
        return

    zone_indices: dict[str, list[int]] = {"breast": [], "hair": [], "skirt": [], "other": []}
    for idx, rb in enumerate(pmx.rigidbodies):
        zone = classify_zone(rb, pmx.bones)
        zone_indices[zone].append(idx)

    rb_to_zone = {idx: zone for zone, idxs in zone_indices.items() for idx in idxs}

    for zone in ("breast", "hair", "skirt"):
        idxs = zone_indices[zone]
        ref = ZONE_REFERENCE_INFO[zone]
        print(f"\n=== {ref['title']} ===")

        if not idxs:
            print("  [Не найдено по стандартным именам]")
            print(f"  Типичные имена в PMX: {ref['common_names']}")
            print(f"  Справка: {ref['what_to_check']}")
            continue

        rbs = [pmx.rigidbodies[i] for i in idxs]
        related_joints = [
            j
            for j in pmx.joints
            if rb_to_zone.get(j.rb1_idx) == zone or rb_to_zone.get(j.rb2_idx) == zone
        ]

        phys_rbs = [rb for rb in rbs if not is_bone_only_mode(rb.phys_mode)]
        masses = [rb.phys_mass for rb in phys_rbs]
        move_damps = [rb.phys_move_damp for rb in rbs]
        rot_damps = [rb.phys_rot_damp for rb in rbs]

        spring_move_vals = [v for j in related_joints for v in j.movespring]
        spring_rot_vals = [v for j in related_joints for v in j.rotspring]

        modes_summary: dict[str, int] = {}
        for rb in rbs:
            m_name = getattr(rb.phys_mode, "name", str(rb.phys_mode))
            modes_summary[m_name] = modes_summary.get(m_name, 0) + 1

        print(
            f"  RigidBodies: {len(rbs)} (режимы: {modes_summary}) | "
            f"Связанных Joints: {len(related_joints)}"
        )
        if masses:
            print(f"  Масса (не-BONED тела): min={min(masses):.3f}, max={max(masses):.3f}")
        print(
            f"  Move damp: {min(move_damps):.3f}..{max(move_damps):.3f} | "
            f"Rot damp: {min(rot_damps):.3f}..{max(rot_damps):.3f}"
        )
        if related_joints:
            print(
                f"  Spring move: {min(spring_move_vals):.2f}..{max(spring_move_vals):.2f} | "
                f"Spring rot: {min(spring_rot_vals):.2f}..{max(spring_rot_vals):.2f}"
            )

        warnings: list[str] = []
        for idx, rb in zip(idxs, rbs):
            name = rb_label(rb, idx)
            b_name = bone_label(pmx.bones, rb.bone_idx)
            if not is_bone_only_mode(rb.phys_mode) and rb.phys_mass <= 0.0:
                warnings.append(f"тело '{name}' (кость '{b_name}') имеет массу <= 0")
            if any(dim <= 0.0 for dim in rb.size):
                warnings.append(f"тело '{name}' имеет нулевой/отрицательный размер {rb.size}")
            if (
                rb.phys_move_damp < 0.0
                or rb.phys_move_damp > 0.9999
                or rb.phys_rot_damp < 0.0
                or rb.phys_rot_damp > 0.9999
            ):
                warnings.append(
                    f"необычный damping у '{name}': move={rb.phys_move_damp}, rot={rb.phys_rot_damp}"
                )

        if zone == "breast" and not related_joints:
            warnings.append(
                "на груди нет Joints — при физическом/смешанном режиме тело может вести себя слишком жёстко или оторванно"
            )

        if warnings:
            print("  Потенциальные проблемы:")
            for w in warnings[:10]:
                print(f"    - {w}")
            if len(warnings) > 10:
                print(f"    - ... и ещё {len(warnings) - 10}")
        else:
            print("  Базовые параметры выглядят вменяемо (реальную упругость стоит смотреть в сцене).")


def main() -> int:
    if len(sys.argv) < 2:
        print("Использование: python inspect_pmx_physics.py <путь_к_модели.pmx>")
        return 1

    pmx_path = Path(sys.argv[1])
    if not pmx_path.exists():
        print(f"Файл не найден: {pmx_path}")
        return 1

    pmx = pmx_parser.read_pmx(str(pmx_path), moreinfo=False)
    analyze_pmx(pmx)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
