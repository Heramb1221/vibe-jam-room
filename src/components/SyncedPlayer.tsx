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
<<<<<<< HEAD
=======
<<<<<<< HEAD
  isHost: boolean;
=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
>>>>>>> a281fe11d26cc3945d0819a46c969a7e04770e73
  currentSong: {
    id: string;
    video_id: string;
    title: string;
  } | null;
  onSongEnd: () => void;
  isHost: boolean;
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

<<<<<<< HEAD
export const SyncedPlayer = ({ roomId, userId, currentSong, onSongEnd, isHost }: SyncedPlayerProps) => {
=======
<<<<<<< HEAD
export const SyncedPlayer = ({ roomId, userId, isHost, currentSong, onSongEnd }: SyncedPlayerProps) => {
=======
export const SyncedPlayer = ({ roomId, userId, currentSong, onSongEnd }: SyncedPlayerProps) => {
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
>>>>>>> a281fe11d26cc3945d0819a46c969a7e04770e73
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [volume, setVolume] = useState(50);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
<<<<<<< HEAD
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const isSyncingRef = useRef(false);
  const { toast } = useToast();

  // Load YouTube API
  useEffect(() => {
    if (window.YT) {
      return;
    }

=======
  const lastSyncTime = useRef<number>(Date.now());
  const { toast } = useToast();

  useEffect(() => {
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
<<<<<<< HEAD
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
    };
  }, []);

  // Initialize player when YouTube API is ready
  useEffect(() => {
    const initializeWhenReady = () => {
      if (window.YT && window.YT.Player && currentSong && !isInitializedRef.current) {
        initializePlayer();
        isInitializedRef.current = true;
      }
    };

    if (window.YT && window.YT.Player) {
      initializeWhenReady();
    } else {
      window.onYouTubeIframeAPIReady = initializeWhenReady;
    }
  }, [currentSong?.id]);

  const initializePlayer = () => {
    if (!currentSong) return;

<<<<<<< HEAD
    if (playerRef.current) {
      playerRef.current.destroy();
    }

=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
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
<<<<<<< HEAD
    console.log('Player ready');
=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
    setIsPlayerReady(true);
    if (playerRef.current && volume !== undefined) {
      playerRef.current.setVolume(volume);
    }
  };

  const handlePlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.ENDED) {
<<<<<<< HEAD
      if (isHost) {
        console.log('Song ended, moving to next');
        onSongEnd();
      }
    }
  };

  // Reload player when song changes
=======
      onSongEnd();
    }
  };

>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
  useEffect(() => {
    if (!currentSong) {
      setIsPlayerReady(false);
      isInitializedRef.current = false;
      return;
    }

<<<<<<< HEAD
    if (isPlayerReady && playerRef.current && playerRef.current.loadVideoById) {
=======
    if (playerRef.current && playerRef.current.loadVideoById) {
<<<<<<< HEAD
>>>>>>> a281fe11d26cc3945d0819a46c969a7e04770e73
      console.log('Loading new video:', currentSong.video_id);
      playerRef.current.loadVideoById(currentSong.video_id);
      
      // Initialize playback state for new song
      if (isHost) {
        setTimeout(() => {
          updatePlaybackState({ 
            current_song_id: currentSong.id,
            playback_position: 0,
            is_playing: false
          });
        }, 500);
      }
    }
  }, [currentSong?.id, isPlayerReady]);

  // Subscribe to playback state changes
=======
      playerRef.current.loadVideoById(currentSong.video_id);
    }
  }, [currentSong?.id, isPlayerReady]);

>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
  useEffect(() => {
    if (!roomId || !isPlayerReady) return;

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

<<<<<<< HEAD
    // Periodic sync for hosts
    if (isHost) {
      syncIntervalRef.current = setInterval(() => {
        syncHostPosition();
      }, 2000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [roomId, isPlayerReady, isHost]);
=======
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isPlayerReady]);
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c

  const loadPlaybackState = async () => {
    try {
      const { data, error } = await supabase
        .from('playback_state')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

<<<<<<< HEAD
      if (error) {
        console.error('Error loading playback state:', error);
        // Initialize playback state if it doesn't exist
        if (isHost && currentSong) {
          await initializePlaybackState();
        }
        return;
      }
      
      if (data) {
        console.log('Loaded playback state:', data);
=======
      if (error) throw error;
      if (data) {
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
        setPlaybackState(data);
        syncPlayerWithState(data);
      } else if (isHost && currentSong) {
        await initializePlaybackState();
      }
    } catch (error) {
      console.error('Error loading playback state:', error);
    }
  };

<<<<<<< HEAD
  const initializePlaybackState = async () => {
    if (!currentSong) return;
    
    try {
      const { error } = await supabase
        .from('playback_state')
        .upsert({
          room_id: roomId,
          current_song_id: currentSong.id,
          is_playing: false,
          playback_position: 0,
          updated_by: userId,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'room_id'
        });

      if (error) {
        console.error('Error initializing playback state:', error);
      } else {
        console.log('Playback state initialized');
      }
    } catch (error) {
      console.error('Error in initializePlaybackState:', error);
    }
  };

  const handlePlaybackUpdate = (newState: PlaybackState) => {
    // Prevent update loops
    if (newState.updated_by === userId && lastUpdateRef.current === newState.last_updated) {
      return;
    }

    lastUpdateRef.current = newState.last_updated;
    console.log('Playback update received:', newState);
=======
  const handlePlaybackUpdate = (newState: PlaybackState) => {
    if (newState.updated_by === userId) {
      return;
    }

>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
    setPlaybackState(newState);
    syncPlayerWithState(newState);
  };

  const syncPlayerWithState = (state: PlaybackState) => {
<<<<<<< HEAD
    if (!playerRef.current || !isPlayerReady || isSyncingRef.current) {
      console.log('Player not ready for sync or already syncing');
=======
<<<<<<< HEAD
    if (!playerRef.current || !isPlayerReady) {
      console.log('Player not ready for sync');
>>>>>>> a281fe11d26cc3945d0819a46c969a7e04770e73
      return;
    }

    isSyncingRef.current = true;

    try {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      const targetTime = Number(state.playback_position) || 0;
      const timeDiff = Math.abs(currentTime - targetTime);

      console.log('Syncing player:', { 
        currentTime, 
        targetTime, 
        timeDiff, 
        isPlaying: state.is_playing 
      });

      // Sync position if difference is more than 2 seconds
      if (timeDiff > 2) {
        console.log('Seeking to:', targetTime);
        playerRef.current.seekTo(targetTime, true);
      }

      // Sync play/pause state
      const playerState = playerRef.current.getPlayerState();
      const isCurrentlyPlaying = playerState === window.YT.PlayerState.PLAYING;

      if (state.is_playing && !isCurrentlyPlaying) {
        console.log('Playing video');
        playerRef.current.playVideo();
      } else if (!state.is_playing && isCurrentlyPlaying) {
        console.log('Pausing video');
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('Error syncing player:', error);
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  };

  const syncHostPosition = async () => {
    if (!isHost || !playerRef.current || !isPlayerReady || isUpdatingState) return;

    try {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      const playerState = playerRef.current.getPlayerState();
      const isPlaying = playerState === window.YT.PlayerState.PLAYING;

      // Only update if state has changed significantly
      if (playbackState) {
        const timeDiff = Math.abs(currentTime - Number(playbackState.playback_position));
        const stateChanged = isPlaying !== playbackState.is_playing;
        
        if (timeDiff > 1 || stateChanged) {
          await updatePlaybackState({
            playback_position: currentTime,
            is_playing: isPlaying
          });
        }
      }
    } catch (error) {
      console.error('Error syncing host position:', error);
    }
=======
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
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
  };

  const updatePlaybackState = async (updates: Partial<PlaybackState>) => {
    if (isUpdatingState) return;

    try {
      setIsUpdatingState(true);

      const currentTime = playerRef.current?.getCurrentTime() || 0;
<<<<<<< HEAD
      const timestamp = new Date().toISOString();

      const updateData = {
        room_id: roomId,
        ...updates,
        playback_position: updates.playback_position ?? currentTime,
        updated_by: userId,
        last_updated: timestamp,
      };

      lastUpdateRef.current = timestamp;

      console.log('Updating playback state:', updateData);

      const { error } = await supabase
        .from('playback_state')
<<<<<<< HEAD
        .upsert(updateData, {
          onConflict: 'room_id'
        });
=======
        .update(updateData)
=======

      const { error } = await supabase
        .from('playback_state')
        .update({
          ...updates,
          playback_position: updates.playback_position ?? currentTime,
          updated_by: userId,
          last_updated: new Date().toISOString(),
        })
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
        .eq('room_id', roomId);
>>>>>>> a281fe11d26cc3945d0819a46c969a7e04770e73

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
<<<<<<< HEAD
    if (!playerRef.current || !isHost) return;
=======
    if (!playerRef.current) return;
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c

    playerRef.current.playVideo();
    await updatePlaybackState({ is_playing: true });
  };

  const handlePause = async () => {
<<<<<<< HEAD
    if (!playerRef.current || !isHost) return;
=======
    if (!playerRef.current) return;
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c

    playerRef.current.pauseVideo();
    await updatePlaybackState({ is_playing: false });
  };

  const handleSkip = async () => {
<<<<<<< HEAD
    if (!isHost) return;
=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
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
<<<<<<< HEAD
        {!isPlayerReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white">Loading player...</p>
          </div>
        )}
=======
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
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
<<<<<<< HEAD
              disabled={!isPlayerReady || !isHost}
              className="h-10 w-10"
              title={!isHost ? "Only host can control playback" : ""}
=======
              disabled={!isPlayerReady}
              className="h-10 w-10"
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
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
<<<<<<< HEAD
              disabled={!isPlayerReady || !isHost}
              className="h-10 w-10"
              title={!isHost ? "Only host can skip songs" : ""}
=======
              disabled={!isPlayerReady}
              className="h-10 w-10"
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
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
<<<<<<< HEAD

        {!isHost && (
          <p className="text-xs text-muted-foreground text-center">
            Host controls the playback. Enjoy the synchronized listening experience!
          </p>
        )}
      </div>
    </Card>
  );
};
=======
      </div>
    </Card>
  );
};
>>>>>>> 8ae1ce6c53eabde5f3d0533445165c0ba48a7b9c
