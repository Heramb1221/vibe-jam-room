import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  LogOut, Music2, Plus, Trash2, Mic, MicOff, 
  Video, VideoOff, Play, Pause, Volume2, Radio 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
}

interface Participant {
  id: string;
  username: string;
  is_host: boolean;
  mic_enabled: boolean;
  video_enabled: boolean;
}

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newSong, setNewSong] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!roomId) {
      navigate("/");
      return;
    }

    loadRoom();
    joinRoom();
    subscribeToUpdates();

    return () => {
      leaveRoom();
    };
  }, [roomId, user]);

  const loadRoom = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      toast({ title: "Room not found", variant: "destructive" });
      navigate("/");
      return;
    }

    setRoom(data);
    setKaraokeMode(data.karaoke_mode);
    loadSongs();
    loadMessages();
    loadParticipants();
  };

  const joinRoom = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id,
        username: profile?.username || 'Anonymous',
        is_host: false,
      });

    if (error && !error.message.includes('duplicate')) {
      console.error("Error joining room:", error);
    }
  };

  const leaveRoom = async () => {
    if (!user || !roomId) return;

    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
  };

  const loadSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('room_id', roomId)
      .order('queue_position', { ascending: true });

    if (data) setSongs(data);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data);
  };

  const loadParticipants = async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId);

    if (data) {
      setParticipants(data);
      const current = data.find(p => p.user_id === user?.id);
      if (current) setCurrentParticipant(current);
    }
  };

  const subscribeToUpdates = () => {
    const songsChannel = supabase
      .channel('songs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'songs',
        filter: `room_id=eq.${roomId}`
      }, () => loadSongs())
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, () => loadMessages())
      .subscribe();

    const participantsChannel = supabase
      .channel('participants-changes')
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

    // Extract video ID from YouTube URL or use as is
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

    if (error) {
      toast({ title: "Error adding song", description: error.message, variant: "destructive" });
    } else {
      setNewSong("");
      toast({ title: "Song added to queue!" });
    }
  };

  const handleDeleteSong = async (songId: string) => {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', songId);

    if (error) {
      toast({ title: "Error removing song", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        username: profile?.username || 'Anonymous',
        content: newMessage,
      });

    if (error) {
      toast({ title: "Error sending message", variant: "destructive" });
    } else {
      setNewMessage("");
    }
  };

  const toggleMic = async () => {
    if (!currentParticipant) return;

    const { error } = await supabase
      .from('room_participants')
      .update({ mic_enabled: !currentParticipant.mic_enabled })
      .eq('id', currentParticipant.id);

    if (error) {
      toast({ title: "Error toggling mic", variant: "destructive" });
    }
  };

  const toggleVideo = async () => {
    if (!currentParticipant) return;

    const { error } = await supabase
      .from('room_participants')
      .update({ video_enabled: !currentParticipant.video_enabled })
      .eq('id', currentParticipant.id);

    if (error) {
      toast({ title: "Error toggling video", variant: "destructive" });
    }
  };

  const toggleKaraoke = async () => {
    const { error } = await supabase
      .from('rooms')
      .update({ karaoke_mode: !karaokeMode })
      .eq('id', roomId);

    if (error) {
      toast({ title: "Error toggling karaoke mode", variant: "destructive" });
    } else {
      setKaraokeMode(!karaokeMode);
    }
  };

  const handleExitRoom = async () => {
    await leaveRoom();
    navigate("/");
  };

  if (!room) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Music2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{room.name}</h1>
              <p className="text-xs text-muted-foreground">Room ID: {roomId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleKaraoke}
            >
              <Radio className="h-4 w-4 mr-2" />
              {karaokeMode ? "Karaoke ON" : "Karaoke OFF"}
            </Button>
            <ThemeToggle />
            <Button variant="destructive" size="sm" onClick={handleExitRoom}>
              <LogOut className="h-4 w-4 mr-2" />
              Exit Room
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Player + Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Player */}
          <Card className="p-6">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
              {songs.length > 0 ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${songs[0].video_id}?autoplay=${isPlaying ? 1 : 0}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Music2 className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>No songs in queue</p>
                </div>
              )}
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={currentParticipant?.mic_enabled ? "default" : "outline"}
                  size="icon"
                  onClick={toggleMic}
                >
                  {currentParticipant?.mic_enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={currentParticipant?.video_enabled ? "default" : "outline"}
                  size="icon"
                  onClick={toggleVideo}
                >
                  {currentParticipant?.video_enabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon">
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Queue */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Queue</h3>
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Enter YouTube URL or video ID..."
                value={newSong}
                onChange={(e) => setNewSong(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSong()}
              />
              <Button onClick={handleAddSong} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Song
              </Button>
            </div>
            <Separator className="my-4" />
            <ScrollArea className="h-64">
              {songs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No songs in queue</p>
              ) : (
                <div className="space-y-2">
                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{song.title}</p>
                          {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                        </div>
                      </div>
                      {(user?.id === song.added_by || currentParticipant?.is_host) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSong(song.id)}
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

        {/* Right Column: Chat + Participants */}
        <div className="space-y-4">
          {/* Participants */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Participants ({participants.length})
            </h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {participant.username[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{participant.username}</span>
                      {participant.is_host && (
                        <Badge variant="secondary" className="text-xs">Host</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {participant.mic_enabled && <Mic className="h-3 w-3 text-primary" />}
                      {participant.video_enabled && <Video className="h-3 w-3 text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat */}
          <Card className="p-6 flex flex-col h-96">
            <h3 className="text-lg font-semibold mb-4">Chat</h3>
            <ScrollArea className="flex-1 mb-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No messages yet</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {message.username}
                      </p>
                      <p className="text-sm bg-muted/50 p-2 rounded-lg">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Room;