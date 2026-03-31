-- Migration: add 'approved' status to projects table
-- Run this in Supabase SQL Editor

-- 1. Drop the existing check constraint and recreate with 'approved' added
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'pending', 'draft', 'confirmed', 'approved',
    'recruiting', 'testing', 'analyzing', 'completed', 'rejected'
  ));

-- 2. Add RLS policy so clients can update (approve) their own projects
--    (Previously clients only had SELECT on projects — no UPDATE)
DROP POLICY IF EXISTS "Clients can update own projects" ON projects;

CREATE POLICY "Clients can update own projects" ON projects
  FOR UPDATE
  USING (client_id = auth.uid());
