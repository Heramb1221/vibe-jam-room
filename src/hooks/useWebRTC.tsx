// src/hooks/useWebRTC.tsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

const defaultConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

/**
 * Custom React hook for managing multi-user WebRTC connections using Supabase Realtime signaling.
 * @param roomId - Unique ID for the room
 * @param userId - Current user's ID
 * @param localStream - MediaStream (audio/video) of the current user
 */
export const useWebRTC = (roomId: string, userId: string, localStream: MediaStream | null) => {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingChannel = useRef<any>(null);

  useEffect(() => {
    if (!roomId || !userId || !localStream) return;

    // Set up Supabase Realtime channel for signaling
    const channel = supabase.channel(`webrtc:${roomId}`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetUserId === userId) {
          await handleOffer(payload.fromUserId, payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.targetUserId === userId) {
          await handleAnswer(payload.fromUserId, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetUserId === userId) {
          await handleIceCandidate(payload.fromUserId, payload.candidate);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId !== userId) {
            // New user joined — initiate connection
            createPeerConnection(presence.userId, true);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, online_at: new Date().toISOString() });
        }
      });

    signalingChannel.current = channel;

    return () => {
      // Cleanup all connections and unsubscribe
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      channel.unsubscribe();
    };
  }, [roomId, userId, localStream]);

  /** Create and manage a peer connection */
  const createPeerConnection = async (targetUserId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(targetUserId)) {
      return peerConnections.current.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection(defaultConfig);

    // Add local media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Create a new MediaStream for the remote user
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      setRemoteStreams(prev => new Map(prev.set(targetUserId, remoteStream)));
    };

    // Send ICE candidates to remote user
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            fromUserId: userId,
            targetUserId,
            candidate: event.candidate,
          },
        });
      }
    };

    peerConnections.current.set(targetUserId, pc);

    // If this client initiates the connection
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalingChannel.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          fromUserId: userId,
          targetUserId,
          offer,
        },
      });
    }

    return pc;
  };

  /** Handle an incoming WebRTC offer */
  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    const pc = await createPeerConnection(fromUserId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    signalingChannel.current.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        fromUserId: userId,
        targetUserId: fromUserId,
        answer,
      },
    });
  };

  /** Handle an incoming WebRTC answer */
  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  /** Handle an incoming ICE candidate */
  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  return {
    remoteStreams,
    createPeerConnection,
  };
};
