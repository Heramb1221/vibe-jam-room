import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface SyncedPlayerProps {
  roomId: string;
  userId: string;
  currentSong: {
    id: string;
    video_id: string;
    title: string;
  } | null;
  onSongEnd: () => void;
}

interface PlaybackState {
  is_playing: boolean;
  playback_position: number;
  current_song_id: string | null;
  last_updated: string;
  updated_by: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const SyncedPlayer = ({ roomId, userId, currentSong, onSongEnd }: SyncedPlayerProps) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [volume, setVolume] = useState(50);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const lastSyncTime = useRef<number>(Date.now());
  const { toast } = useToast();

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initializePlayer();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const initializePlayer = () => {
    if (!currentSong) return;

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: currentSong.video_id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange,
      },
    });
  };

  const handlePlayerReady = () => {
    setIsPlayerReady(true);
    if (playerRef.current && volume !== undefined) {
      playerRef.current.setVolume(volume);
    }
  };

  const handlePlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.ENDED) {
      onSongEnd();
    }
  };

  useEffect(() => {
    if (!isPlayerReady || !currentSong) return;

    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(currentSong.video_id);
    }
  }, [currentSong?.id, isPlayerReady]);

  useEffect(() => {
    if (!roomId) return;

    loadPlaybackState();

    const channel = supabase
      .channel(`playback-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playback_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          handlePlaybackUpdate(payload.new as PlaybackState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isPlayerReady]);

  const loadPlaybackState = async () => {
    try {
      const { data, error } = await supabase
        .from('playback_state')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;
      if (data) {
        setPlaybackState(data);
        syncPlayerWithState(data);
      }
    } catch (error) {
      console.error('Error loading playback state:', error);
    }
  };

  const handlePlaybackUpdate = (newState: PlaybackState) => {
    if (newState.updated_by === userId) {
      return;
    }

    setPlaybackState(newState);
    syncPlayerWithState(newState);
  };

  const syncPlayerWithState = (state: PlaybackState) => {
    if (!playerRef.current || !isPlayerReady) return;

    const currentTime = playerRef.current.getCurrentTime();
    const timeDiff = Math.abs(currentTime - Number(state.playback_position));

    if (timeDiff > 2) {
      playerRef.current.seekTo(Number(state.playback_position), true);
    }

    if (state.is_playing) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }

    lastSyncTime.current = Date.now();
  };

  const updatePlaybackState = async (updates: Partial<PlaybackState>) => {
    if (isUpdatingState) return;

    try {
      setIsUpdatingState(true);

      const currentTime = playerRef.current?.getCurrentTime() || 0;

      const { error } = await supabase
        .from('playback_state')
        .update({
          ...updates,
          playback_position: updates.playback_position ?? currentTime,
          updated_by: userId,
          last_updated: new Date().toISOString(),
        })
        .eq('room_id', roomId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating playback state:', error);
      toast({
        title: 'Sync error',
        description: 'Failed to sync playback state',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingState(false);
    }
  };

  const handlePlay = async () => {
    if (!playerRef.current) return;

    playerRef.current.playVideo();
    await updatePlaybackState({ is_playing: true });
  };

  const handlePause = async () => {
    if (!playerRef.current) return;

    playerRef.current.pauseVideo();
    await updatePlaybackState({ is_playing: false });
  };

  const handleSkip = async () => {
    onSongEnd();
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById('youtube-player');
    if (iframe && iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  if (!currentSong) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
        <div className="text-center text-muted-foreground">
          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No song playing</p>
          <p className="text-sm mt-2">Add a song to the queue to start</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="aspect-video bg-black relative">
        <div id="youtube-player" className="w-full h-full" />
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-lg truncate">{currentSong.title}</h3>
          <p className="text-sm text-muted-foreground">Now Playing</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={playbackState?.is_playing ? handlePause : handlePlay}
              disabled={!isPlayerReady}
              className="h-10 w-10"
            >
              {playbackState?.is_playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSkip}
              disabled={!isPlayerReady}
              className="h-10 w-10"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleFullscreen}
            className="h-10 w-10"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
