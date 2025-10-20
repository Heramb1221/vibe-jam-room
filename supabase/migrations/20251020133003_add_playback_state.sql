-- Fix playback_state initialization and sync

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS initialize_room_playback_state ON public.rooms;
DROP FUNCTION IF EXISTS public.initialize_playback_state();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.initialize_playback_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.playback_state (
    room_id, 
    updated_by,
    is_playing,
    playback_position,
    current_song_id
  )
  VALUES (
    NEW.id, 
    NEW.host_id,
    false,
    0,
    NULL
  )
  ON CONFLICT (room_id) DO UPDATE SET
    updated_by = EXCLUDED.updated_by,
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER initialize_room_playback_state
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_playback_state();

-- Initialize playback state for existing rooms that don't have one
INSERT INTO public.playback_state (room_id, updated_by, is_playing, playback_position)
SELECT 
  r.id,
  r.host_id,
  false,
  0
FROM public.rooms r
LEFT JOIN public.playback_state ps ON ps.room_id = r.id
WHERE ps.id IS NULL
ON CONFLICT (room_id) DO NOTHING;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_playback_state_room_id ON public.playback_state(room_id);
CREATE INDEX IF NOT EXISTS idx_playback_state_updated_by ON public.playback_state(updated_by);