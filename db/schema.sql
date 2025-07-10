-- This schema is designed for Supabase and includes authentication integration.

-- Create the projects table to store user-created interactive videos.
CREATE TABLE projects (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  project_data jsonb       NOT NULL,
  created_at  timestamptz  DEFAULT now(),
  updated_at  timestamptz  DEFAULT now()
);

-- Function to automatically update the 'updated_at' timestamp on any project modification.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the handle_updated_at function before any update on the projects table.
CREATE TRIGGER on_project_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- Enable Row Level Security (RLS) to ensure users can only access their own data.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- 1. Allow public read access to all projects.
CREATE POLICY "Allow public read access"
  ON projects FOR SELECT
  USING (true);

-- 2. Allow logged-in users to create projects for themselves.
CREATE POLICY "Allow individual insert access"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own projects.
CREATE POLICY "Allow individual update access"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Allow users to delete their own projects.
CREATE POLICY "Allow individual delete access"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
