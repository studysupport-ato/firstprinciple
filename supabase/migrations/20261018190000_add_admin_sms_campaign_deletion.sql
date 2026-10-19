create or replace function public.delete_sms_campaigns_admin(p_campaign_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_count integer;
  deleted_count integer;
begin
  if p_campaign_ids is null
    or cardinality(p_campaign_ids) = 0
    or cardinality(p_campaign_ids) > 10
  then
    raise exception 'Select between 1 and 10 campaigns.';
  end if;

  if (
    select count(distinct requested.id)
    from unnest(p_campaign_ids) as requested(id)
  ) <> cardinality(p_campaign_ids)
  then
    raise exception 'Campaign selection contains duplicates.';
  end if;

  perform id
  from public.sms_campaigns
  where id = any(p_campaign_ids)
  for update;
  get diagnostics selected_count = row_count;

  if selected_count <> cardinality(p_campaign_ids) then
    raise exception 'One or more campaigns no longer exist.';
  end if;

  if exists (
    select 1
    from public.sms_campaigns
    where id = any(p_campaign_ids)
      and status in ('sending', 'uncertain')
  ) then
    raise exception 'Sending or uncertain campaigns cannot be deleted.';
  end if;

  delete from public.sms_delivery_events as event
  using public.sms_campaign_recipients as recipient
  where recipient.campaign_id = any(p_campaign_ids)
    and (
      event.recipient_id = recipient.id
      or (
        recipient.provider_reference is not null
        and event.provider_reference = recipient.provider_reference
      )
    );

  delete from public.sms_campaigns
  where id = any(p_campaign_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_sms_campaigns_admin(uuid[]) from public, anon, authenticated;
grant execute on function public.delete_sms_campaigns_admin(uuid[]) to service_role;
