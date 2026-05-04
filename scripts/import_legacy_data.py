#!/usr/bin/env python3
"""
現場対応管理 — 過去CSVデータ Supabase 取り込みスクリプト

【事前準備】
    pip install requests

【環境変数の設定】
    set SUPABASE_URL=https://xxxxxxxx.supabase.co
    set SUPABASE_SERVICE_KEY=eyJ...

【実行方法】
    # バリデーションのみ（DBへの書き込みなし）
    python scripts/import_legacy_data.py --dry-run

    # 実際に取り込む
    python scripts/import_legacy_data.py
"""

import csv
import json
import os
import sys
import uuid
from collections import Counter
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests が必要です。  pip install requests  を実行してください。")
    sys.exit(1)

# ── 設定 ──────────────────────────────────────────────────────────────────────

DATA_DIR = Path(r"G:\マイドライブ\仕事\現場対応管理ツール\data\import_ai_optimized")

VALID_ACTION_TYPES = {'確認作業', '再起動・リセット', '部品交換', '設定変更', '業者手配', 'その他'}
VALID_RESULT_TYPES = {'効果なし', '部分改善', '解決'}
VALID_STATUSES     = {'open', 'in_progress', 'closed'}
VALID_INCIDENT_TYPES = {'trouble', 'other'}

EXPECTED_INCIDENTS = 2863
EXPECTED_RESPONSES = 3184
NUM_CHUNKS         = 12
BATCH_SIZE         = 100   # 1回のHTTPリクエストで送る行数

# ── CSV ヘルパー ───────────────────────────────────────────────────────────────

def read_csv(path: Path) -> list[dict]:
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def noneify(val: str | None) -> str | None:
    """空文字 / 空白のみ → None"""
    if val is None:
        return None
    v = val.strip()
    return v if v else None

# ── データ読み込み ─────────────────────────────────────────────────────────────

def load_incidents() -> list[dict]:
    rows = []
    for i in range(1, NUM_CHUNKS + 1):
        path = DATA_DIR / 'chunks' / f'incidents_{i:03d}.csv'
        rows.extend(read_csv(path))
    return rows

def load_responses() -> list[dict]:
    rows = []
    for i in range(1, NUM_CHUNKS + 1):
        path = DATA_DIR / 'chunks' / f'responses_{i:03d}.csv'
        rows.extend(read_csv(path))
    return rows

# ── バリデーション ─────────────────────────────────────────────────────────────

def validate(raw_incidents: list[dict], raw_responses: list[dict]) -> tuple[list[str], list[str]]:
    """
    Returns (errors, warnings).
    errors   → 取り込み中止
    warnings → 取り込みは続行するが報告する
    """
    errors   = []
    warnings = []

    # ---- 件数チェック ----
    if len(raw_incidents) != EXPECTED_INCIDENTS:
        errors.append(f"incidents件数: {len(raw_incidents)} (期待値: {EXPECTED_INCIDENTS})")
    if len(raw_responses) != EXPECTED_RESPONSES:
        errors.append(f"responses件数: {len(raw_responses)} (期待値: {EXPECTED_RESPONSES})")

    # ---- incidents ----
    legacy_ids: set[str] = set()
    status_counter: Counter = Counter()
    closed_with_resolution    = 0
    closed_without_resolution = 0

    for idx, row in enumerate(raw_incidents, 1):
        lid = row.get('legacy_id', '').strip()

        # 重複
        if lid in legacy_ids:
            errors.append(f"重複 legacy_id: {lid}")
        legacy_ids.add(lid)

        # 必須フィールド
        for field in ('title', 'general_contractor', 'site_name', 'content'):
            if not noneify(row.get(field)):
                errors.append(f"{lid}: {field} が空")

        # status
        status = row.get('status', '').strip()
        if status not in VALID_STATUSES:
            errors.append(f"{lid}: 不正 status '{status}'")
        else:
            status_counter[status] += 1

        # incident_type
        itype = row.get('incident_type', '').strip()
        if itype not in VALID_INCIDENT_TYPES:
            errors.append(f"{lid}: 不正 incident_type '{itype}'")

        # resolution ルール
        resolution = noneify(row.get('resolution', ''))
        if status == 'closed':
            if resolution:
                closed_with_resolution += 1
            else:
                closed_without_resolution += 1
                warnings.append(f"{lid}: closed なのに resolution が空")
        else:
            if resolution:
                errors.append(f"{lid}: {status} なのに resolution が入っている")

    # ---- responses ----
    action_counter: Counter = Counter()
    result_counter: Counter = Counter()

    for row in raw_responses:
        rid = row.get('legacy_response_id', '').strip()
        iid = row.get('legacy_incident_id', '').strip()

        # 孤立参照
        if iid not in legacy_ids:
            errors.append(f"response {rid}: legacy_incident_id '{iid}' が incidents に存在しない")

        # action_type
        at = noneify(row.get('action_type', ''))
        if at:
            if at not in VALID_ACTION_TYPES:
                errors.append(f"response {rid}: 不正 action_type '{at}'")
            else:
                action_counter[at] += 1

        # result_type
        rt = noneify(row.get('result_type', ''))
        if rt:
            if rt not in VALID_RESULT_TYPES:
                errors.append(f"response {rid}: 不正 result_type '{rt}'")
            else:
                result_counter[rt] += 1

    # ---- サマリー出力 ----
    print(f"\n  status 分布: {dict(status_counter)}")
    print(f"  closed 件 resolution あり: {closed_with_resolution} / なし: {closed_without_resolution}")
    print(f"\n  action_type 分布: {dict(action_counter)}")
    print(f"  result_type 分布: {dict(result_counter)}")

    return errors, warnings

# ── DB行の構築 ────────────────────────────────────────────────────────────────

def build_incidents(raw: list[dict]) -> tuple[list[dict], dict[str, str]]:
    """DB挿入用行リストと legacy_id → new_uuid マッピングを返す"""
    rows: list[dict] = []
    legacy_to_uuid: dict[str, str] = {}

    for r in raw:
        new_id = str(uuid.uuid4())
        legacy_to_uuid[r['legacy_id'].strip()] = new_id

        status    = r['status'].strip()
        closed_at = noneify(r.get('closed_at', ''))

        rows.append({
            'id':                 new_id,
            'title':              r['title'].strip(),
            'general_contractor': r['general_contractor'].strip(),
            'site_name':          r['site_name'].strip(),
            'site_contact':       noneify(r.get('site_contact', '')),
            'phone_number':       noneify(r.get('phone_number', '')),
            'content':            r['content'].strip(),
            'status':             status,
            'category':           noneify(r.get('category', '')),
            'device':             noneify(r.get('device', '')),
            'incident_type':      r.get('incident_type', 'trouble').strip() or 'trouble',
            'resolution':         noneify(r.get('resolution', '')) if status == 'closed' else None,
            'created_at':         r['created_at'].strip(),
            'closed_at':          closed_at if status == 'closed' else None,
            'closed_by':          None,
            'created_by':         None,
            'tags':               [],
        })

    return rows, legacy_to_uuid

def build_responses(raw: list[dict], legacy_to_uuid: dict[str, str]) -> tuple[list[dict], list[str]]:
    """DB挿入用行リストと孤立スキップリストを返す"""
    rows:    list[dict] = []
    skipped: list[str]  = []

    for r in raw:
        incident_id = legacy_to_uuid.get(r['legacy_incident_id'].strip())
        if not incident_id:
            skipped.append(r.get('legacy_response_id', ''))
            continue

        rows.append({
            'id':          str(uuid.uuid4()),
            'incident_id': incident_id,
            'content':     r['content'].strip(),
            'responder_id': None,
            'action_type': noneify(r.get('action_type', '')),
            'result_type': noneify(r.get('result_type', '')),
            'created_at':  r['created_at'].strip(),
            'tags':        [],
        })

    return rows, skipped

# ── Supabase REST INSERT ───────────────────────────────────────────────────────

def insert_all(session: requests.Session, base_url: str, table: str,
               rows: list[dict], label: str) -> None:
    total = len(rows)
    endpoint = f"{base_url}/rest/v1/{table}"

    for start in range(0, total, BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]
        resp = session.post(endpoint, json=batch)
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"{table} INSERT 失敗 (batch {start}): "
                f"HTTP {resp.status_code}\n{resp.text[:500]}"
            )
        done = min(start + BATCH_SIZE, total)
        print(f"  {label}: {done}/{total}", end='\r', flush=True)

    print(f"  {label}: {total}/{total} 完了               ")

# ── DB検証 ────────────────────────────────────────────────────────────────────

def verify(session: requests.Session, base_url: str) -> None:
    print()
    for table, expected in [('incidents', EXPECTED_INCIDENTS), ('responses', EXPECTED_RESPONSES)]:
        resp = session.get(
            f"{base_url}/rest/v1/{table}",
            params={'select': 'id', 'limit': 1},
            headers={**session.headers, 'Prefer': 'count=exact'},
        )
        cr = resp.headers.get('content-range', '*/0')
        total_in_db = int(cr.split('/')[-1]) if '/' in cr else 0
        mark = '✓' if total_in_db >= expected else '✗'
        print(f"  {mark} {table}: DB合計 {total_in_db} 件 (今回投入 {expected} 件)")

# ── メイン ────────────────────────────────────────────────────────────────────

def main() -> None:
    dry_run = '--dry-run' in sys.argv

    supabase_url = (
        os.environ.get('SUPABASE_URL') or
        os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or ''
    ).rstrip('/')
    service_key = (
        os.environ.get('SUPABASE_SERVICE_KEY') or
        os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or ''
    )

    if not supabase_url or not service_key:
        print(
            "ERROR: 以下の環境変数を設定してください。\n"
            "  set NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co\n"
            "  set SUPABASE_SERVICE_ROLE_KEY=eyJ..."
        )
        sys.exit(1)

    # ── 読み込み
    print("=== データ読み込み ===")
    raw_incidents = load_incidents()
    raw_responses = load_responses()
    print(f"  incidents: {len(raw_incidents)} 件")
    print(f"  responses: {len(raw_responses)} 件")

    # ── バリデーション
    print("\n=== バリデーション ===")
    errors, warnings = validate(raw_incidents, raw_responses)

    if warnings:
        print(f"\n  警告 {len(warnings)} 件:")
        for w in warnings[:20]:
            print(f"    △ {w}")
        if len(warnings) > 20:
            print(f"    ... (他 {len(warnings) - 20} 件)")

    if errors:
        print(f"\n  エラー {len(errors)} 件:")
        for e in errors[:30]:
            print(f"    ✗ {e}")
        if len(errors) > 30:
            print(f"    ... (他 {len(errors) - 30} 件)")
        print("\n取り込みを中止します。エラーを修正してから再実行してください。")
        sys.exit(1)

    print("\n  バリデーション: OK")

    # ── DB行構築
    print("\n=== DB行を構築 ===")
    incident_rows, legacy_to_uuid = build_incidents(raw_incidents)
    response_rows, skipped        = build_responses(raw_responses, legacy_to_uuid)
    print(f"  incidents: {len(incident_rows)} 行")
    print(f"  responses: {len(response_rows)} 行")
    if skipped:
        print(f"  スキップ (孤立 response): {len(skipped)} 件")
        for s in skipped:
            print(f"    - {s}")

    # ── dry-run
    if dry_run:
        print(
            "\n[DRY RUN] --dry-run フラグが指定されています。\n"
            "DBへの書き込みはスキップしました。\n"
            "実際に取り込むには --dry-run を外して実行してください。"
        )
        return

    # ── 確認プロンプト
    print(
        f"\nSupabase へ取り込みます。\n"
        f"  URL: {supabase_url}\n"
        f"  incidents: {len(incident_rows)} 件\n"
        f"  responses: {len(response_rows)} 件\n"
        "続行しますか？ [y/N]: ",
        end='',
    )
    if input().strip().lower() != 'y':
        print("中止しました。")
        return

    # ── 挿入
    session = requests.Session()
    session.headers.update({
        'apikey':        service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
    })

    print("\n=== incidents を挿入中... ===")
    insert_all(session, supabase_url, 'incidents', incident_rows, 'incidents')

    print("\n=== responses を挿入中... ===")
    insert_all(session, supabase_url, 'responses', response_rows, 'responses')

    # ── 検証
    print("\n=== 取り込み後 DB検証 ===")
    verify(session, supabase_url)

    print("\n=== 完了 ===")


if __name__ == '__main__':
    main()
