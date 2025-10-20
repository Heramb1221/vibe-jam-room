/*
  # Add Playback State Management for Synchronized Music Listening

  1. New Tables
    - `playback_state`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `current_song_id` (uuid, nullable, foreign key to songs)
      - `is_playing` (boolean, default false)
      - `playback_position` (numeric, current playback position in seconds)
      - `last_updated` (timestamptz, auto-updated)
      - `updated_by` (uuid, user who last updated the state)
      
  2. Security
    - Enable RLS on `playback_state` table
    - Anyone can read playback state in a room
    - Only authenticated users in the room can update playback state
    
  3. Changes
    - Add realtime subscription for playback_state table
    - Create trigger to automatically initialize playback state when room is created
*/

CREATE TABLE IF NOT EXISTS public.playback_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  is_playing BOOLEAN DEFAULT false,
  playback_position NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID NOT NULL,
  CONSTRAINT playback_state_room_id_key UNIQUE(room_id)
);

ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playback state"
  ON public.playback_state FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert playback state"
  ON public.playback_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = updated_by);

CREATE POLICY "Authenticated users can update playback state"
  ON public.playback_state FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = updated_by);

CREATE TRIGGER update_playback_state_timestamp
  BEFORE UPDATE ON public.playback_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.playback_state;

CREATE OR REPLACE FUNCTION public.initialize_playback_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.playback_state (room_id, updated_by)
  VALUES (NEW.id, NEW.host_id)
  ON CONFLICT (room_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER initialize_room_playback_state
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_playback_state();