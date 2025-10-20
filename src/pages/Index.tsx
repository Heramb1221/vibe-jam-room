import { useState } from "react";
import { Users, Radio, Mic2, ArrowRight, LogOut, Heart, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HeartWaveLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      <Heart className={`${className} text-primary fill-primary animate-pulse`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-end gap-[2px] opacity-70">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-[2px] bg-background rounded-full wave"
              style={{
                height: `${[60, 80, 60][i]}%`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createdRoomLink, setCreatedRoomLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!roomName.trim()) {
      toast({ title: "Please enter a room name", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // First get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: roomName.trim(),
          host_id: user.id,
        })
        .select()
        .single();

      if (roomError) {
        throw roomError;
      }

      if (!room) {
        throw new Error("Room creation failed - no data returned");
      }

      // Add host as participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: profile?.username || user.email?.split('@')[0] || 'Anonymous',
          is_host: true,
        });

      if (participantError) {
        console.error("Participant error:", participantError);
      }

      // Generate shareable link
      const roomLink = `${window.location.origin}/room/${room.id}`;
      setCreatedRoomLink(roomLink);
      
      toast({ 
        title: "Room created successfully!",
        description: "Share the link with your friends"
      });
      
      // Don't close dialog yet - show the link first
      setRoomName("");
      
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({ 
        title: "Error creating room", 
        description: error.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdRoomLink);
      setLinkCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleJoinCreatedRoom = () => {
    const roomId = createdRoomLink.split('/').pop();
    setCreateDialogOpen(false);
    setCreatedRoomLink("");
    setLoading(false);
    navigate(`/room/${roomId}`);
  };

  const handleJoinRoom = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!joinRoomId.trim()) {
      toast({ title: "Please enter a room ID", variant: "destructive" });
      return;
    }

    setJoinDialogOpen(false);
    setJoinRoomId("");
    navigate(`/room/${joinRoomId.trim()}`);
  };

  const features = [
    {
      icon: Heart,
      title: "Collaborative Playback",
      description: "Listen to music together in real-time with friends"
    },
    {
      icon: Radio,
      title: "Live Karaoke",
      description: "Sing along with synchronized lyrics and recording"
    },
    {
      icon: Users,
      title: "Social Experience",
      description: "Chat, react, and interact while enjoying music"
    },
    {
      icon: Mic2,
      title: "Voice & Video",
      description: "Connect with voice and video for true collaboration"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartWaveLogo />
            <span className="text-xl font-bold">HeartWave</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost">Join Room</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join a Room</DialogTitle>
                      <DialogDescription>Enter the room ID to join</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="joinRoomId">Room ID</Label>
                        <Input
                          id="joinRoomId"
                          placeholder="Enter room ID"
                          value={joinRoomId}
                          onChange={(e) => setJoinRoomId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                        />
                      </div>
                      <Button onClick={handleJoinRoom} disabled={loading} className="w-full">
                        Join Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button className="gradient-primary glow-hover" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-64 w-64 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-20 right-10 h-96 w-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto px-4 py-24 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium animate-fade-in">
              <Heart className="h-4 w-4 text-primary fill-primary" />
              <span>Experience Music Together</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in">
              Listen, Sing, and
              <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Connect Together
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              A modern platform for collaborative music listening, karaoke sessions, and social experiences. 
              Join your friends in real-time music rooms.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {user ? (
                <>
                  <Dialog open={createDialogOpen} onOpenChange={(open) => {
                    setCreateDialogOpen(open);
                    if (!open) {
                      setCreatedRoomLink("");
                      setLinkCopied(false);
                      setLoading(false);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="gradient-primary glow-hover text-lg h-14 px-8">
                        Create Room
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {createdRoomLink ? "Room Created!" : "Create a New Room"}
                        </DialogTitle>
                        <DialogDescription>
                          {createdRoomLink 
                            ? "Share this link with your friends to invite them"
                            : "Give your room a name and start listening together"
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {!createdRoomLink ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="roomName">Room Name</Label>
                              <Input
                                id="roomName"
                                placeholder="My Awesome Room"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                                disabled={loading}
                              />
                            </div>
                            <Button onClick={handleCreateRoom} disabled={loading} className="w-full">
                              {loading ? "Creating..." : "Create Room"}
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>Room Link</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={createdRoomLink}
                                  readOnly
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleCopyLink}
                                >
                                  {linkCopied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Room ID: {createdRoomLink.split('/').pop()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleCopyLink} variant="outline" className="flex-1">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </Button>
                              <Button onClick={handleJoinCreatedRoom} className="flex-1">
                                Join Room
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-primary/20 hover:border-primary">
                        Join Room
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Join a Room</DialogTitle>
                        <DialogDescription>Enter the room ID to join</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="joinRoomIdHero">Room ID</Label>
                          <Input
                            id="joinRoomIdHero"
                            placeholder="Enter room ID"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                          />
                        </div>
                        <Button onClick={handleJoinRoom} disabled={loading} className="w-full">
                          Join Room
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Button 
                  size="lg" 
                  className="gradient-primary glow-hover text-lg h-14 px-8"
                  onClick={() => navigate('/auth')}
                >
                  Sign In to Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Decorative waveform */}
            <div className="flex items-end justify-center gap-1 mt-12 opacity-50">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-primary to-secondary rounded-full wave"
                  style={{
                    height: `${Math.random() * 60 + 20}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for music lovers who want to share their experience with others
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="p-6 gradient-card hover:scale-105 transition-transform duration-300 cursor-pointer"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 bg-accent/30 rounded-full blur-3xl animate-pulse-glow" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <Card className="max-w-4xl mx-auto p-12 text-center gradient-card glow-primary">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create your own music room or join an existing one. 
              It takes less than a minute to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="gradient-primary glow-hover text-lg h-14 px-8"
                onClick={() => user ? setCreateDialogOpen(true) : navigate('/auth')}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HeartWaveLogo className="h-5 w-5" />
              <span className="font-semibold">HeartWave</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 HeartWave. Built for music lovers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;