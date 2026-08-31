import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830000000_leaderboard_v1.sql'),
  'utf8',
);

describe('leaderboard database migration', () => {
  it('enforces one anonymous player row per map and numeric ranking', () => {
    expect(migration).toContain('unique (map_id, anonymous_player_id)');
    expect(migration).toContain('(map_id, time_ms asc, updated_at asc)');
    expect(migration).toContain('time_ms integer not null');
  });

  it('keeps slower scores and changes names only with a faster time', () => {
    expect(migration).toContain('v_improved := p_time_ms < v_row.time_ms');
    expect(migration).toContain('case when v_improved then p_player_name else scores.player_name end');
    expect(migration).toContain("case when v_improved then 'improved' else 'kept' end");
  });

  it('blocks direct browser access and adds a short server-side submission interval', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on table public.leaderboard_scores from public, anon, authenticated');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("v_now - interval '2 seconds'");
  });
});
