/*
  # Cleanup Duplicate User Policies

  1. Changes
    - Removes duplicate SELECT policies
    - Keeps only one comprehensive SELECT policy for simplicity
*/

-- Drop the redundant "Users can read own profile" policy since we have a broader one
DROP POLICY IF EXISTS "Users can read own profile" ON users;
