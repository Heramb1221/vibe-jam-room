import { Heart } from "lucide-react";

export const HeartWaveLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
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