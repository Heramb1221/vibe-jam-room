import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  username: string;
  is_host: boolean;
  user_id: string;
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
  const signalChannelRef = useRef<any>(null);

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
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
      peerConnections.forEach(pc => pc.close());
    };
  }, []);

  // Setup signaling channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase
      .channel(`webrtc-${roomId}`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
          await handleOffer(payload.fromUserId, payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
          await handleAnswer(payload.fromUserId, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
          await handleIceCandidate(payload.fromUserId, payload.candidate);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId !== currentUserId && localStream) {
            createPeerConnection(presence.userId, true);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          closePeerConnection(presence.userId);
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            userId: currentUserId, 
            online_at: new Date().toISOString() 
          });
        }
      });

    signalChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, currentUserId, localStream]);

  const createPeerConnection = async (targetUserId: string, isInitiator: boolean) => {
    if (peerConnections.has(targetUserId)) {
      return peerConnections.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection(configuration);

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote tracks
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, remoteStream);
        return newMap;
      });

      // Attach to video element
      const videoElement = remoteVideosRef.current.get(targetUserId);
      if (videoElement) {
        videoElement.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            fromUserId: currentUserId,
            targetUserId,
            candidate: event.candidate,
          },
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closePeerConnection(targetUserId);
      }
    };

    setPeerConnections(prev => {
      const newMap = new Map(prev);
      newMap.set(targetUserId, pc);
      return newMap;
    });

    // If initiator, create and send offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        
        if (signalChannelRef.current) {
          signalChannelRef.current.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              fromUserId: currentUserId,
              targetUserId,
              offer,
            },
          });
        }
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }

    return pc;
  };

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const pc = await createPeerConnection(fromUserId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            fromUserId: currentUserId,
            targetUserId: fromUserId,
            answer,
          },
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnections.get(fromUserId);
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections.get(fromUserId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const closePeerConnection = (userId: string) => {
    const pc = peerConnections.get(userId);
    if (pc) {
      pc.close();
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  const toggleMic = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);

        // Update participant state in database
        await supabase
          .from('room_participants')
          .update({ mic_enabled: audioTrack.enabled })
          .eq('room_id', roomId)
          .eq('user_id', currentUserId);
      }
    }
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        // Update participant state in database
        await supabase
          .from('room_participants')
          .update({ video_enabled: videoTrack.enabled })
          .eq('room_id', roomId)
          .eq('user_id', currentUserId);
      }
    }
  };

  const toggleMute = () => {
    remoteVideosRef.current.forEach(video => {
      if (video) {
        video.muted = !video.muted;
      }
    });
    setIsMuted(!isMuted);
  };

  const currentParticipant = participants.find(p => p.user_id === currentUserId);

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
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className="w-16 h-16 rounded-full bg-card/50 backdrop-blur flex items-center justify-center border-2 border-primary/30">
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
          .filter(p => p.user_id !== currentUserId)
          .map(participant => {
            const hasStream = remoteStreams.has(participant.user_id);
            
            return (
              <Card key={participant.id} className="relative aspect-video overflow-hidden bg-muted">
                {hasStream && (
                  <video
                    ref={el => {
                      if (el) remoteVideosRef.current.set(participant.user_id, el);
                    }}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
                  <span>{participant.username}</span>
                  {participant.is_host && (
                    <span className="px-1 bg-primary rounded text-[10px]">HOST</span>
                  )}
                </div>
                {!hasStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <div className="w-16 h-16 rounded-full bg-card/50 backdrop-blur flex items-center justify-center border-2 border-border">
                      <span className="text-2xl font-bold">
                        {participant.username[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
};