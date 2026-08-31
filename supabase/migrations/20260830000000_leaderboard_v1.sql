create table if not exists public.leaderboard_scores (
  id bigint generated always as identity primary key,
  map_id text not null,
  anonymous_player_id uuid not null,
  player_name varchar(20) not null,
  time_ms integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_submission_at timestamptz not null default now(),
  constraint leaderboard_scores_one_player_per_map unique (map_id, anonymous_player_id),
  constraint leaderboard_scores_known_map check (
    map_id in ('alpine-flow', 'parallax', 'canyon-signal', 'dynamo-rise', 'switchyard')
  ),
  constraint leaderboard_scores_safe_name check (
    char_length(btrim(player_name)) between 1 and 20
    and player_name = btrim(player_name)
    and position('<' in player_name) = 0
    and position('>' in player_name) = 0
  ),
  constraint leaderboard_scores_plausible_time check (time_ms between 1000 and 86400000)
);

create index if not exists leaderboard_scores_map_ranking_idx
  on public.leaderboard_scores (map_id, time_ms asc, updated_at asc);

alter table public.leaderboard_scores enable row level security;

revoke all on table public.leaderboard_scores from public, anon, authenticated;
grant select, insert, update on table public.leaderboard_scores to service_role;
grant usage, select on sequence public.leaderboard_scores_id_seq to service_role;

create or replace function public.submit_leaderboard_score(
  p_map_id text,
  p_anonymous_player_id uuid,
  p_player_name text,
  p_time_ms integer
)
returns table (
  map_id text,
  anonymous_player_id uuid,
  player_name text,
  time_ms integer,
  updated_at timestamptz,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.leaderboard_scores%rowtype;
  v_now timestamptz := clock_timestamp();
  v_improved boolean := false;
  v_outcome text;
begin
  if p_map_id not in ('alpine-flow', 'parallax', 'canyon-signal', 'dynamo-rise', 'switchyard') then
    raise exception 'leaderboard_invalid_map' using errcode = '22023';
  end if;
  if p_anonymous_player_id is null then
    raise exception 'leaderboard_invalid_player' using errcode = '22023';
  end if;
  if p_player_name is null
    or char_length(btrim(p_player_name)) not between 1 and 20
    or p_player_name <> btrim(p_player_name)
    or position('<' in p_player_name) > 0
    or position('>' in p_player_name) > 0
    or p_player_name ~ '[[:cntrl:]]' then
    raise exception 'leaderboard_invalid_name' using errcode = '22023';
  end if;
  if p_time_ms is null or p_time_ms not between 1000 and 86400000 then
    raise exception 'leaderboard_invalid_time' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_map_id || ':' || p_anonymous_player_id::text, 0)
  );

  select scores.*
    into v_row
    from public.leaderboard_scores as scores
    where scores.map_id = p_map_id
      and scores.anonymous_player_id = p_anonymous_player_id
    for update;

  if found then
    if v_row.last_submission_at > v_now - interval '2 seconds' then
      raise exception 'leaderboard_rate_limited' using errcode = 'P0001';
    end if;

    v_improved := p_time_ms < v_row.time_ms;
    update public.leaderboard_scores as scores
      set player_name = case when v_improved then p_player_name else scores.player_name end,
          time_ms = case when v_improved then p_time_ms else scores.time_ms end,
          updated_at = case when v_improved then v_now else scores.updated_at end,
          last_submission_at = v_now
      where scores.id = v_row.id
      returning scores.* into v_row;
    v_outcome := case when v_improved then 'improved' else 'kept' end;
  else
    insert into public.leaderboard_scores (
      map_id,
      anonymous_player_id,
      player_name,
      time_ms,
      created_at,
      updated_at,
      last_submission_at
    ) values (
      p_map_id,
      p_anonymous_player_id,
      p_player_name,
      p_time_ms,
      v_now,
      v_now,
      v_now
    ) returning * into v_row;
    v_outcome := 'created';
  end if;

  return query
    select
      v_row.map_id,
      v_row.anonymous_player_id,
      v_row.player_name::text,
      v_row.time_ms,
      v_row.updated_at,
      v_outcome;
end;
$$;

revoke all on function public.submit_leaderboard_score(text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.submit_leaderboard_score(text, uuid, text, integer) to service_role;

comment on table public.leaderboard_scores is
  'Anonymous Vector Surf V1 leaderboard: one best score per browser-generated player ID and map.';
