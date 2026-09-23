CREATE POLICY "homes: creator read" ON public.homes FOR SELECT TO authenticated USING (created_by = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homes, public.home_members, public.items TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.homes, public.home_members, public.items, public.profiles TO service_role;