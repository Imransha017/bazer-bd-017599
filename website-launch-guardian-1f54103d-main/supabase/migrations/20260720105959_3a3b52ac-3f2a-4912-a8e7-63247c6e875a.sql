ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;