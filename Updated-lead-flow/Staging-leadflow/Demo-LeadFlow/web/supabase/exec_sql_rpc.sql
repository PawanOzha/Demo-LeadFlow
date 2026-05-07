-- Run this once in Supabase SQL Editor for service-role SQL bridge.
-- It allows server-side code to execute existing SQL text via Supabase RPC
-- instead of direct DATABASE_URL Postgres connections.

create or replace function public.exec_sql(
  query_text text,
  query_params jsonb default '[]'::jsonb
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pcount int := coalesce(jsonb_array_length(query_params), 0);
  row_query text := format('select row_to_json(t)::jsonb from (%s) t', query_text);
  normalized_query text := lower(ltrim(query_text));
  is_row_query boolean :=
    normalized_query like 'select %' or
    normalized_query like 'with %' or
    normalized_query like 'values %' or
    normalized_query like 'table %';
begin
  -- Row-returning queries: preserve existing JSON row behavior.
  -- DML (UPDATE/INSERT/DELETE) is executed directly and returns an empty set.
  if is_row_query then
    begin
      if pcount = 0 then
        return query execute row_query;
      elsif pcount = 1 then
        return query execute row_query using query_params->>0;
      elsif pcount = 2 then
        return query execute row_query using query_params->>0, query_params->>1;
      elsif pcount = 3 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2;
      elsif pcount = 4 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3;
      elsif pcount = 5 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4;
      elsif pcount = 6 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5;
      elsif pcount = 7 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6;
      elsif pcount = 8 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7;
      elsif pcount = 9 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8;
      elsif pcount = 10 then
        return query execute row_query using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8, query_params->>9;
      else
        raise exception 'exec_sql supports up to 10 parameters, got %', pcount;
      end if;
      return;
    exception
      -- CTEs that start with WITH but end in DML (without RETURNING) are not subqueryable.
      when syntax_error or invalid_parameter_value then
        null;
    end;
  end if;

  if pcount = 0 then
    execute query_text;
  elsif pcount = 1 then
    execute query_text using query_params->>0;
  elsif pcount = 2 then
    execute query_text using query_params->>0, query_params->>1;
  elsif pcount = 3 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2;
  elsif pcount = 4 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3;
  elsif pcount = 5 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4;
  elsif pcount = 6 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5;
  elsif pcount = 7 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6;
  elsif pcount = 8 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7;
  elsif pcount = 9 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8;
  elsif pcount = 10 then
    execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8, query_params->>9;
  else
    raise exception 'exec_sql supports up to 10 parameters, got %', pcount;
  end if;

  return;
end;
$$;

revoke all on function public.exec_sql(text, jsonb) from public;
grant execute on function public.exec_sql(text, jsonb) to authenticated, service_role;

create or replace function public.exec_sql_batch_tx(
  statements jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stmt jsonb;
  query_text text;
  query_params jsonb;
  pcount int;
begin
  for stmt in select * from jsonb_array_elements(coalesce(statements, '[]'::jsonb)) loop
    query_text := stmt->>'query_text';
    query_params := coalesce(stmt->'query_params', '[]'::jsonb);
    pcount := coalesce(jsonb_array_length(query_params), 0);

    if pcount = 0 then
      execute query_text;
    elsif pcount = 1 then
      execute query_text using query_params->>0;
    elsif pcount = 2 then
      execute query_text using query_params->>0, query_params->>1;
    elsif pcount = 3 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2;
    elsif pcount = 4 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3;
    elsif pcount = 5 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4;
    elsif pcount = 6 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5;
    elsif pcount = 7 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6;
    elsif pcount = 8 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7;
    elsif pcount = 9 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8;
    elsif pcount = 10 then
      execute query_text using query_params->>0, query_params->>1, query_params->>2, query_params->>3, query_params->>4, query_params->>5, query_params->>6, query_params->>7, query_params->>8, query_params->>9;
    else
      raise exception 'exec_sql_batch_tx supports up to 10 parameters per statement, got %', pcount;
    end if;
  end loop;
end;
$$;

revoke all on function public.exec_sql_batch_tx(jsonb) from public;
grant execute on function public.exec_sql_batch_tx(jsonb) to authenticated, service_role;
