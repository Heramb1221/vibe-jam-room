import { useState } from "react";
import { Music, Play, Pause, Volume2, SkipForward, Repeat, Maximize2, Users, MessageSquare, ListMusic, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const Room = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [message, setMessage] = useState("");

  // Placeholder data
  const queue = [
    { id: 1, title: "Song One", artist: "Artist A", duration: "3:45" },
    { id: 2, title: "Song Two", artist: "Artist B", duration: "4:20" },
    { id: 3, title: "Song Three", artist: "Artist C", duration: "3:12" },
  ];

  const participants = [
    { id: 1, name: "User1", isMuted: false, isHost: true },
    { id: 2, name: "User2", isMuted: true, isHost: false },
    { id: 3, name: "User3", isMuted: false, isHost: false },
  ];

  const messages = [
    { id: 1, user: "User1", text: "Great song!", time: "2:30 PM" },
    { id: 2, user: "User2", text: "Add more songs!", time: "2:31 PM" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Music Together Room</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {participants.length}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden gradient-card glow-primary">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Music className="h-24 w-24 text-muted-foreground opacity-50" />
              </div>
            </Card>

            {/* Player Controls */}
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Now Playing</h3>
                <p className="text-sm text-muted-foreground">Song Title - Artist Name</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider defaultValue={[33]} max={100} step={1} className="cursor-pointer" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1:25</span>
                  <span>4:30</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Repeat className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full gradient-primary glow-hover"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12">{volume[0]}%</span>
              </div>
            </Card>

            {/* Chat Section (Mobile: full width, Desktop: below player) */}
            <div className="lg:hidden">
              <Card className="p-4 h-80 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Chat</h3>
                </div>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{msg.user}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" className="gradient-primary">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Queue */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Queue</h3>
                </div>
                <Button size="sm" variant="outline" className="h-8">
                  Add Song
                </Button>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {queue.map((song, idx) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{song.duration}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Lyrics */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Lyrics</h3>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="text-foreground font-medium">♪ Current line playing...</p>
                  <p>Next line of lyrics</p>
                  <p>Another line</p>
                  <p>More lyrics here</p>
                  <p>Continuing the song</p>
                </div>
              </ScrollArea>
            </Card>

            {/* Participants */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Participants</h3>
              </div>
              <div className="space-y-2">
                {participants.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-medium">
                        {user.name[0]}
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                      {user.isHost && (
                        <Badge variant="secondary" className="text-xs">Host</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className={`h-4 w-4 ${user.isMuted ? 'text-muted-foreground' : 'text-primary'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Desktop Chat */}
            <div className="hidden lg:block">
              <Card className="p-4 h-80 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Chat</h3>
                </div>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{msg.user}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" className="gradient-primary">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
