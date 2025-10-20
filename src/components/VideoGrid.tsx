import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Participant {
  id: string;
  username: string;
  is_host: boolean;
  mic_enabled: boolean;
  video_enabled: boolean;
}

interface VideoGridProps {
  participants: Participant[];
  currentUserId: string;
  roomId: string;
}

export const VideoGrid = ({ participants, currentUserId, roomId }: VideoGridProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Initially disable tracks
        stream.getAudioTracks().forEach(track => track.enabled = false);
        stream.getVideoTracks().forEach(track => track.enabled = false);
        
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle microphone
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle mute for remote streams
  const toggleMute = () => {
    remoteVideosRef.current.forEach(video => {
      if (video) {
        video.muted = !video.muted;
      }
    });
    setIsMuted(!isMuted);
  };

  // Get current participant info
  const currentParticipant = participants.find(p => p.id === currentUserId);

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex items-center justify-center gap-2 p-4 bg-card rounded-lg border">
        <Button
          variant={isMicEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleMic}
          className="relative"
        >
          {isMicEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant={isVideoEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Local Video */}
        <Card className="relative aspect-video overflow-hidden bg-muted">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
            <span>You</span>
            {currentParticipant?.is_host && (
              <span className="px-1 bg-primary rounded text-[10px]">HOST</span>
            )}
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {currentParticipant?.username?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
          )}
          {!isMicEnabled && (
            <div className="absolute top-2 right-2 p-1 bg-destructive rounded">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
        </Card>

        {/* Remote Videos */}
        {participants
          .filter(p => p.id !== currentUserId)
          .map(participant => (
            <Card key={participant.id} className="relative aspect-video overflow-hidden bg-muted">
              <video
                ref={el => {
                  if (el) remoteVideosRef.current.set(participant.id, el);
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
                <span>{participant.username}</span>
                {participant.is_host && (
                  <span className="px-1 bg-primary rounded text-[10px]">HOST</span>
                )}
              </div>
              {!participant.video_enabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {participant.username[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              {!participant.mic_enabled && (
                <div className="absolute top-2 right-2 p-1 bg-destructive rounded">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
};