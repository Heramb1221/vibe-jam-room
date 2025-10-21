-- ================================================================
-- Update RLS Policies for Songs Table
-- Allow all authenticated users to manage queue
-- ================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can delete songs they added" ON public.songs;

-- Create new policy: Anyone can delete any song in the queue
CREATE POLICY "Anyone in room can delete songs"
  ON public.songs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_participants.room_id = songs.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- Ensure anyone in room can update song positions
DROP POLICY IF EXISTS "Anyone in room can update song order" ON public.songs;

CREATE POLICY "Anyone in room can update songs"
  ON public.songs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_participants.room_id = songs.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- ================================================================
-- Add indexes for better performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_songs_room_queue 
  ON public.songs(room_id, queue_position);

CREATE INDEX IF NOT EXISTS idx_room_participants_lookup 
  ON public.room_participants(room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_room_time 
  ON public.messages(room_id, created_at DESC);

-- ================================================================
-- Function to auto-reorder queue after deletion
-- ================================================================

CREATE OR REPLACE FUNCTION reorder_song_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Reorder remaining songs in the queue
  WITH numbered_songs AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY queue_position) - 1 AS new_position
    FROM public.songs
    WHERE room_id = OLD.room_id
  )
  UPDATE public.songs
  SET queue_position = numbered_songs.new_position
  FROM numbered_songs
  WHERE songs.id = numbered_songs.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-reordering
DROP TRIGGER IF EXISTS trigger_reorder_queue ON public.songs;

CREATE TRIGGER trigger_reorder_queue
  AFTER DELETE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION reorder_song_queue();

-- ================================================================
-- Reload schema cache
-- ================================================================
NOTIFY pgrst, 'reload schema';