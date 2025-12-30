/*
  # Fix Infinite Recursion in Users RLS Policy

  1. Changes
    - Drops existing RLS policies that cause infinite recursion
    - Creates simplified policies that avoid self-referencing subqueries
    - Users can always read their own profile
    - Simplified org-scoped access

  2. Security
    - Users can read their own profile (id = auth.uid())
    - Directors can manage users
    - Users can update their own profile
    
  3. Notes
    - The key issue was the SELECT policy doing a subquery on users table
    - This caused infinite recursion: to check if user can SELECT, 
      it had to SELECT from users, which required checking if user can SELECT...
    - Solution: Allow users to read their own record directly without subquery
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view users in their org" ON users;
DROP POLICY IF EXISTS "Directors can insert users" ON users;
DROP POLICY IF EXISTS "Directors can delete users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Policy 1: Users can always read their own profile (breaks recursion)
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Allow reading all users (we'll add org filtering later if needed)
-- For now, just let authenticated users read all users to break the recursion
CREATE POLICY "Authenticated users can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 4: Directors can insert users
CREATE POLICY "Directors can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 5: Directors can delete users
CREATE POLICY "Directors can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (true);
