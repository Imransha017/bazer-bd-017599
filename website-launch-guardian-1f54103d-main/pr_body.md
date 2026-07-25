## Summary

This PR adds a combined SQL migration file that consolidates all 87 individual migration files into a single file for easy Supabase database setup.

## Changes

- Added `supabase/combined_setup.sql` - a single SQL file containing all database migrations
- Tables, RLS policies, functions, triggers, and seed data are all included
- Makes it easy to set up the database by pasting this single file into Supabase SQL Editor

## How to Use

1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of `combined_setup.sql`
3. Click Run - all tables, functions, RLS policies, and initial data will be created

## After Running SQL
- Create a public Storage bucket named `products` in Supabase Storage
- Set environment variables in Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
