create policy "sales funnel events own read"
  on public.sales_funnel_events for select
  using (auth.uid() = user_id);
