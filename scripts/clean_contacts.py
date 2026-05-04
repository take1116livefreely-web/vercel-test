#!/usr/bin/env python3
"""
incidents テーブルの site_contact / phone_number をクリーニングするスクリプト。

【実行方法】
    # 確認のみ（DB書き込みなし）
    python -X utf8 scripts/clean_contacts.py --dry-run

    # 実際にクリーニング
    python -X utf8 scripts/clean_contacts.py
"""

import os
import re
import sys

try:
    import requests
except ImportError:
    print("ERROR: pip install requests を実行してください。")
    sys.exit(1)

SUPABASE_URL = (
    os.environ.get('SUPABASE_URL') or
    os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or ''
).rstrip('/')
SERVICE_KEY = (
    os.environ.get('SUPABASE_SERVICE_KEY') or
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or ''
)

PHONE_RE = re.compile(r'\d{2,4}-\d{3,4}-\d{4}')

# ── クリーニング関数 ───────────────────────────────────────────────────────────

def clean_name(raw: str) -> str:
    """担当者名から様・括弧内備考・中間者メモを除去し、先頭の1人だけ返す"""
    name = raw
    # 括弧内の備考を削除（全角・半角）
    name = re.sub(r'[（(][^）)]*[）)]', '', name)
    # 「XXさん依頼/経由/より/から引き継ぎ」などの中間者メモを削除
    name = re.sub(r'\S+さん\S*[\s　]*', '', name)
    # 複数担当者（「山本 様 斎藤 様」）→ 先頭だけ取り出す
    # 様の後ろにスペース+文字が続く場合はそこで打ち切る
    name = re.split(r'様[\s　]+(?=\S)', name)[0]
    # 様を除去
    name = re.sub(r'[\s　]*様[\s　]*', '', name)
    # 空白を正規化
    name = re.sub(r'[\s　]+', ' ', name).strip()
    return name

def clean_phone(raw: str) -> str:
    """電話番号フィールドから最初の有効な番号だけ返す"""
    if not raw:
        return raw
    m = PHONE_RE.search(raw)
    return m.group(0) if m else raw

# ── Supabase REST API ─────────────────────────────────────────────────────────

def fetch_all(session: requests.Session) -> list[dict]:
    """site_contact を持つ全レコードを取得"""
    results = []
    limit = 1000
    offset = 0
    while True:
        resp = session.get(
            f"{SUPABASE_URL}/rest/v1/incidents",
            params={
                'select': 'id,site_contact,phone_number',
                'site_contact': 'not.is.null',
                'limit': limit,
                'offset': offset,
            },
            headers={**session.headers, 'Prefer': 'count=exact'},
        )
        data = resp.json()
        if not isinstance(data, list):
            raise RuntimeError(f"API エラー: {data}")
        results.extend(data)
        cr = resp.headers.get('content-range', '*/0')
        total = int(cr.split('/')[-1]) if '/' in cr else len(data)
        offset += limit
        if offset >= total:
            break
    return results

def update_record(session: requests.Session, record_id: str, patch: dict) -> bool:
    resp = session.patch(
        f"{SUPABASE_URL}/rest/v1/incidents",
        params={'id': f'eq.{record_id}'},
        json=patch,
    )
    return resp.status_code in (200, 204)

# ── メイン ────────────────────────────────────────────────────────────────────

def main():
    dry_run = '--dry-run' in sys.argv

    if not SUPABASE_URL or not SERVICE_KEY:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。")
        sys.exit(1)

    session = requests.Session()
    session.headers.update({
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    })

    print("=== レコード取得中... ===")
    records = fetch_all(session)
    print(f"  取得: {len(records)} 件")

    # 更新が必要なレコードを抽出
    updates: list[tuple[str, dict, dict]] = []  # (id, before, patch)

    for r in records:
        raw_name  = r.get('site_contact') or ''
        raw_phone = r.get('phone_number') or ''

        new_name  = clean_name(raw_name)  if raw_name  else raw_name
        new_phone = clean_phone(raw_phone) if raw_phone else raw_phone

        patch: dict = {}
        if new_name != raw_name:
            patch['site_contact'] = new_name if new_name else None
        if new_phone != raw_phone:
            patch['phone_number'] = new_phone if new_phone else None

        if patch:
            updates.append((r['id'], {'site_contact': raw_name, 'phone_number': raw_phone}, patch))

    print(f"\n=== 更新対象: {len(updates)} 件 ===")
    for rid, before, patch in updates:
        short = rid[:8]
        if 'site_contact' in patch:
            print(f"  [{short}] 担当者: 「{before['site_contact']}」→「{patch['site_contact']}」")
        if 'phone_number' in patch:
            print(f"  [{short}] 電話番号: 「{before['phone_number']}」→「{patch['phone_number']}」")

    if not updates:
        print("  更新対象なし。終了します。")
        return

    if dry_run:
        print("\n[DRY RUN] --dry-run のため DB 書き込みをスキップしました。")
        print("実際に実行するには --dry-run を外してください。")
        return

    auto_yes = '--yes' in sys.argv
    if not auto_yes:
        print(f"\n続行しますか？ [y/N]: ", end='')
        if input().strip().lower() != 'y':
            print("中止しました。")
            return

    print("\n=== 更新中... ===")
    ok = ng = 0
    for i, (rid, _, patch) in enumerate(updates, 1):
        if update_record(session, rid, patch):
            ok += 1
        else:
            ng += 1
            print(f"  ✗ 失敗: {rid[:8]}")
        print(f"  {i}/{len(updates)}", end='\r', flush=True)

    print(f"\n\n=== 完了: 成功 {ok} 件 / 失敗 {ng} 件 ===")


if __name__ == '__main__':
    main()
