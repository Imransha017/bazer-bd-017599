
CREATE OR REPLACE FUNCTION public.get_review_authors(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

-- Ensure users can delete their own reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='review self delete') THEN
    CREATE POLICY "review self delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
