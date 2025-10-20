import { io, Socket } from 'socket.io-client';
import { supabase } from '@/integrations/supabase/client';

class SocketService {
  private socket: Socket | null = null;
  
  connect(roomId: string, userId: string) {
    this.socket = io(process.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      query: { roomId, userId }
    });
    
    return this.socket;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
  
  // Player sync events
  emitPlayerState(state: 'play' | 'pause' | 'seek', data: any) {
    this.socket?.emit('player:state', { state, data });
  }
  
  onPlayerState(callback: (data: any) => void) {
    this.socket?.on('player:state', callback);
  }
  
  // WebRTC signaling
  emitOffer(offer: RTCSessionDescriptionInit, targetUserId: string) {
    this.socket?.emit('webrtc:offer', { offer, targetUserId });
  }
  
  onOffer(callback: (data: any) => void) {
    this.socket?.on('webrtc:offer', callback);
  }
  
  emitAnswer(answer: RTCSessionDescriptionInit, targetUserId: string) {
    this.socket?.emit('webrtc:answer', { answer, targetUserId });
  }
  
  onAnswer(callback: (data: any) => void) {
    this.socket?.on('webrtc:answer', callback);
  }
  
  emitIceCandidate(candidate: RTCIceCandidate, targetUserId: string) {
    this.socket?.emit('webrtc:ice-candidate', { candidate, targetUserId });
  }
  
  onIceCandidate(callback: (data: any) => void) {
    this.socket?.on('webrtc:ice-candidate', callback);
  }
}

export const socketService = new SocketService();