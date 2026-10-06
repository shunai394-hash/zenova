create policy "sales funnel events claim anonymous session"
  on public.sales_funnel_events for update
  using (user_id is null and auth.uid() is not null)
  with check (user_id = auth.uid());
