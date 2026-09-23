-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Homes
CREATE TABLE public.homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homes TO authenticated;
GRANT ALL ON public.homes TO service_role;
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.home_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (home_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_members TO authenticated;
GRANT ALL ON public.home_members TO service_role;
ALTER TABLE public.home_members ENABLE ROW LEVEL SECURITY;

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Pantry',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  target_quantity INTEGER NOT NULL DEFAULT 1 CHECK (target_quantity >= 0),
  expires_at DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE INDEX items_home_idx ON public.items(home_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_home_member(_home_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.home_members WHERE home_id = _home_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_home_owner(_home_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.home_members WHERE home_id = _home_id AND user_id = _user_id AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION public.shares_home_with(_other UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.home_members a JOIN public.home_members b ON a.home_id = b.home_id
    WHERE a.user_id = _user_id AND b.user_id = _other
  );
$$;

-- Creator becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_home()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.home_members (home_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER on_home_created AFTER INSERT ON public.homes
FOR EACH ROW EXECUTE FUNCTION public.handle_new_home();

-- Join by invite code
CREATE OR REPLACE FUNCTION public.join_home_by_code(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _home UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO _home FROM public.homes WHERE invite_code = upper(trim(_code));
  IF _home IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.home_members (home_id, user_id, role) VALUES (_home, auth.uid(), 'member')
  ON CONFLICT (home_id, user_id) DO NOTHING;
  RETURN _home;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER items_touch BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Policies
CREATE POLICY "profiles: own or shared" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_home_with(id, auth.uid()));
CREATE POLICY "profiles: update own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "homes: members read" ON public.homes FOR SELECT TO authenticated
  USING (public.is_home_member(id, auth.uid()));
CREATE POLICY "homes: create" ON public.homes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "homes: owner update" ON public.homes FOR UPDATE TO authenticated
  USING (public.is_home_owner(id, auth.uid()));
CREATE POLICY "homes: owner delete" ON public.homes FOR DELETE TO authenticated
  USING (public.is_home_owner(id, auth.uid()));

CREATE POLICY "members: members read" ON public.home_members FOR SELECT TO authenticated
  USING (public.is_home_member(home_id, auth.uid()));
CREATE POLICY "members: leave or owner removes" ON public.home_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_home_owner(home_id, auth.uid()));

CREATE POLICY "items: members all" ON public.items FOR ALL TO authenticated
  USING (public.is_home_member(home_id, auth.uid()))
  WITH CHECK (public.is_home_member(home_id, auth.uid()));