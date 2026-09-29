CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First signed-in user becomes the super-admin; afterwards nobody else can claim it.
CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  END IF;
  RETURN public.has_role(auth.uid(), 'admin');
END $$;

CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  categories text[] NOT NULL DEFAULT ARRAY['Dairy','Pantry','Produce','Frozen','Household','Bathroom','Other'],
  units text[] NOT NULL DEFAULT ARRAY['pcs','kg','g','L','ml','pack'],
  currency text NOT NULL DEFAULT 'EUR',
  expiring_days integer NOT NULL DEFAULT 3,
  signups_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings: read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings: admin update" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Block new accounts when sign-ups are turned off.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT COALESCE((SELECT signups_enabled FROM public.app_settings LIMIT 1), true) THEN
    RAISE EXCEPTION 'Sign-ups are currently closed';
  END IF;
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

-- Admin policies for homes
CREATE POLICY "homes: admin read" ON public.homes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "homes: admin delete" ON public.homes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz, home_count bigint, is_admin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, COALESCE(p.display_name, ''), u.created_at, u.last_sign_in_at,
      (SELECT count(*) FROM public.home_members m WHERE m.user_id = u.id),
      public.has_role(u.id, 'admin')
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
    ORDER BY u.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_homes()
RETURNS TABLE (id uuid, name text, created_at timestamptz, owner_name text, member_count bigint, item_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT h.id, h.name, h.created_at, COALESCE(p.display_name, ''),
      (SELECT count(*) FROM public.home_members m WHERE m.home_id = h.id),
      (SELECT count(*) FROM public.items i WHERE i.home_id = h.id)
    FROM public.homes h LEFT JOIN public.profiles p ON p.id = h.created_by
    ORDER BY h.created_at;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_homes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_super_admin() FROM anon;