"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";

interface VideoEmbedProps {
  url: string;
  onClick?: () => void;
}

export function VideoEmbed({ url, onClick }: VideoEmbedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    // Intersection Observer for auto-playing
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Browser might block auto-play if not muted or user hasn't interacted
              setIsPlaying(false);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(video);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      observer.disconnect();
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = x / rect.width;
    videoRef.current.currentTime = p * videoRef.current.duration;
  };

  return (
    <div 
      ref={containerRef}
      className="group relative rounded-2xl overflow-hidden bg-black max-h-[80vh] border border-gray-200 dark:border-gray-800 w-full mt-3 flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        } else {
          togglePlay(e);
        }
      }}
    >
      <video
        ref={videoRef}
        src={url}
        muted={isMuted}
        playsInline
        loop
        className="max-w-full max-h-[80vh] object-contain block"
        preload="metadata"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Center Play Button (Mobile/Initial) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-all">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-100 group-hover:scale-110 transition-transform">
            <Play fill="currentColor" size={32} />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div 
          className="h-1 w-full bg-white/20 rounded-full mb-4 cursor-pointer relative group/progress"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
            </button>
            
            <button 
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            <span className="text-white text-xs font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button 
            onClick={handleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
