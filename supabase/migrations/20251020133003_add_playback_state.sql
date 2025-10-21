-- ================================================================
-- ✅ 1. Ensure UUID extension is enabled
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- ✅ 2. Drop old playback_state if it exists (for clean rebuild)
-- ================================================================
DROP TABLE IF EXISTS public.playback_state CASCADE;


-- ================================================================
-- ✅ 3. Create the playback_state table
-- ================================================================
CREATE TABLE public.playback_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_playing BOOLEAN DEFAULT false,
  playback_position DECIMAL DEFAULT 0,
  current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  updated_by UUID NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- ✅ 4. Add automatic timestamp updates on UPDATE
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_updated ON public.playback_state;
CREATE TRIGGER trigger_update_last_updated
BEFORE UPDATE ON public.playback_state
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated();


-- ================================================================
-- ✅ 5. Enable Row-Level Security (RLS) and policies
-- ================================================================
ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view playback state" ON public.playback_state;
DROP POLICY IF EXISTS "Anyone can update playback state" ON public.playback_state;
DROP POLICY IF EXISTS "Anyone can create playback state" ON public.playback_state;

CREATE POLICY "Anyone can view playback state"
  ON public.playback_state
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update playback state"
  ON public.playback_state
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can create playback state"
  ON public.playback_state
  FOR INSERT
  WITH CHECK (true);


-- ================================================================
-- ✅ 6. Enable realtime updates for Supabase channels
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.playback_state;


-- ================================================================
-- ✅ 7. Auto-initialize playback_state when new rooms are created
-- ================================================================
DROP FUNCTION IF EXISTS public.initialize_playback_state() CASCADE;

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
  ON CONFLICT (room_id) DO UPDATE
  SET
    updated_by = EXCLUDED.updated_by,
    last_updated = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS initialize_room_playback_state ON public.rooms;
CREATE TRIGGER initialize_room_playback_state
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_playback_state();


-- ================================================================
-- ✅ 8. Initialize playback_state for existing rooms (if missing)
-- ================================================================
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


-- ================================================================
-- ✅ 9. Add performance indexes
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_playback_state_room_id ON public.playback_state(room_id);
CREATE INDEX IF NOT EXISTS idx_playback_state_updated_by ON public.playback_state(updated_by);


-- ================================================================
-- ✅ 10. Reload Supabase schema cache immediately
-- ================================================================
NOTIFY pgrst, 'reload schema';


-- ================================================================
-- ✅ 11. Verify table registration (optional check)
-- Run this after executing the script to confirm.
-- ================================================================
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'playback_state';
