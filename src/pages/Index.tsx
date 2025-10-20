import { Music, Users, Radio, Mic2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Music,
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
            <Music className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Music Together</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate('/room')}>
              Join Room
            </Button>
            <Button className="gradient-primary glow-hover">
              Sign In
            </Button>
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
              <Music className="h-4 w-4 text-primary" />
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
              <Button 
                size="lg" 
                className="gradient-primary glow-hover text-lg h-14 px-8"
                onClick={() => navigate('/room')}
              >
                Join a Room
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-primary/20 hover:border-primary">
                Create Room
              </Button>
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
              <Button size="lg" className="gradient-primary glow-hover text-lg h-14 px-8">
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
              <Music className="h-5 w-5 text-primary" />
              <span className="font-semibold">Music Together</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Music Together. Built for music lovers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
