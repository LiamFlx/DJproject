/*
  # Fix Policy Conflict

  1. Changes
    - Drop existing policy if it exists before recreating
    - Ensure clean migration without conflicts

  2. Security
    - Maintain same security policies
    - No changes to actual permissions
*/

-- Drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

-- Recreate the policy
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Ensure the function exists for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate the trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);