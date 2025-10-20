-- Create playback_state table
CREATE TABLE public.playback_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_playing BOOLEAN DEFAULT false,
  playback_position DECIMAL DEFAULT 0,
  current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  updated_by UUID NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playback_state
CREATE POLICY "Anyone can view playback state" ON public.playback_state FOR SELECT USING (true);
CREATE POLICY "Anyone can update playback state" ON public.playback_state FOR UPDATE USING (true);
CREATE POLICY "Anyone can create playback state" ON public.playback_state FOR INSERT USING (true);

-- Enable realtime for playback_state table
ALTER PUBLICATION supabase_realtime ADD TABLE public.playback_state;