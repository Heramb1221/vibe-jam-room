import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  LogOut, Plus, Trash2, Send, Users, Music2, Loader2
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SyncedPlayer } from "@/components/SyncedPlayer";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  video_id: string;
  added_by: string;
  queue_position: number;
}

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Participant {
  id: string;
  user_id: string;
  username: string;
  is_host: boolean;
}

interface Room {
  id: string;
  name: string;
  host_id: string;
  created_at: string;
}

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newSong, setNewSong] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join this room"
      });
      navigate("/auth", { state: { returnTo: `/room/${roomId}` } });
      return;
    }

    if (!roomId) {
      navigate("/");
      return;
    }

    loadRoom();

    return () => {
      leaveRoom();
    };
  }, [roomId, user, authLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadRoom = async () => {
    try {
      setLoading(true);
      setRoomNotFound(false);

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (error || !data) {
        console.error("Room not found:", error);
        setRoomNotFound(true);
        toast({
          title: "Room not found",
          description: "This room doesn't exist or has been deleted",
          variant: "destructive"
        });
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      setRoom(data);

      await joinRoom(data);
      await Promise.all([
        loadSongs(),
        loadMessages(),
        loadParticipants()
      ]);

      subscribeToUpdates();

      setLoading(false);
    } catch (error) {
      console.error("Error loading room:", error);
      toast({
        title: "Error loading room",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const joinRoom = async (roomData: Room) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';

      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        console.log("Already a participant");
        return;
      }

      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: username,
          is_host: user.id === roomData.host_id,
        });

      if (error && !error.message.includes('duplicate')) {
        console.error("Error joining room:", error);
        toast({
          title: "Error joining room",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Joined room successfully!",
          description: `Welcome to ${roomData.name}`
        });
      }
    } catch (error) {
      console.error("Error in joinRoom:", error);
    }
  };

  const leaveRoom = async () => {
    if (!user || !roomId) return;

    try {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  const loadSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('room_id', roomId)
        .order('queue_position', { ascending: true });

      if (error) throw error;
      if (data) setSongs(data);
    } catch (error) {
      console.error("Error loading songs:", error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;
      if (data) {
        setParticipants(data);
        const current = data.find(p => p.user_id === user?.id);
        if (current) setCurrentParticipant(current);
      }
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  const subscribeToUpdates = () => {
    const songsChannel = supabase
      .channel(`songs-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'songs',
        filter: `room_id=eq.${roomId}`
      }, () => loadSongs())
      .subscribe();

    const messagesChannel = supabase
      .channel(`messages-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    const participantsChannel = supabase
      .channel(`participants-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      }, () => loadParticipants())
      .subscribe();

    return () => {
      supabase.removeChannel(songsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  };

  const handleAddSong = async () => {
    if (!newSong.trim() || !user) return;

    try {
      const videoIdMatch = newSong.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : newSong;

      const { error } = await supabase
        .from('songs')
        .insert({
          room_id: roomId,
          title: videoId,
          video_id: videoId,
          added_by: user.id,
          queue_position: songs.length,
        });

      if (error) throw error;

      setNewSong("");
      toast({ title: "Song added to queue!" });
    } catch (error: any) {
      toast({
        title: "Error adding song",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSong = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      toast({ title: "Song removed from queue" });
    } catch (error) {
      toast({ title: "Error removing song", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: profile?.username || 'Anonymous',
          content: newMessage,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleExitRoom = async () => {
    await leaveRoom();
    navigate("/");
  };

  const handleSongEnd = async () => {
    if (songs.length > 0) {
      await handleDeleteSong(songs[0].id);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (roomNotFound || !room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center space-y-4">
          <Music2 className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold">Room Not Found</h2>
          <p className="text-muted-foreground">This room doesn't exist or has been deleted</p>
          <Button onClick={() => navigate("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{room.name}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {participants.length} {participants.length === 1 ? 'person' : 'people'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExitRoom}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Exit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2 space-y-6">
            <SyncedPlayer
              roomId={roomId!}
              userId={user!.id}
              currentSong={songs.length > 0 ? songs[0] : null}
              onSongEnd={handleSongEnd}
            />

            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Queue</h3>
                <Badge variant="secondary">{songs.length}</Badge>
              </div>

              <div className="space-y-3 mb-4">
                <Input
                  placeholder="Paste YouTube URL or video ID..."
                  value={newSong}
                  onChange={(e) => setNewSong(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}
                  className="bg-background/50"
                />
                <Button onClick={handleAddSong} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Queue
                </Button>
              </div>

              <Separator className="my-4" />

              <ScrollArea className="h-64">
                {songs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Queue is empty</p>
                ) : (
                  <div className="space-y-2">
                    {songs.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">Playing</Badge>
                          )}
                          {index !== 0 && (
                            <span className="text-sm font-medium text-muted-foreground min-w-[24px]">
                              #{index}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{song.title}</p>
                          </div>
                        </div>
                        {(user?.id === song.added_by || currentParticipant?.is_host) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSong(song.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </h3>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border">
                        <span className="text-sm font-semibold">
                          {participant.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{participant.username}</p>
                        {participant.is_host && (
                          <Badge variant="secondary" className="text-xs mt-1">Host</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <Card className="p-6 flex flex-col h-[500px] bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="text-lg font-semibold mb-4">Chat</h3>

              <ScrollArea className="flex-1 mb-4 pr-4">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-xs font-medium text-primary">
                            {message.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="text-sm bg-muted/50 p-2.5 rounded-lg border border-border/30">
                          {message.content}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-background/50"
                />
                <Button onClick={handleSendMessage} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
