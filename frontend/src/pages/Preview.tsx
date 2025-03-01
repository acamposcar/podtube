import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Check, Youtube, Calendar, Clock, Headphones } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  duration: string;
  url: string;
}

interface Channel {
  title: string;
  description: string;
  thumbnail: string;
}

export default function Preview() {
  const { feedId } = useParams<{ feedId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const feedUrl = `${API_URL}/feed/${feedId}`;

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await axios.get(`${API_URL}/preview/${feedId}`);
        setChannel(response.data.channel);
        setVideos(response.data.videos);
      } catch (err) {
        setError('Failed to load preview. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [feedId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-youtube-red border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading podcast feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 bg-destructive/15 text-destructive rounded-lg border border-destructive/20 flex flex-col items-center">
        <div className="rounded-full bg-destructive/20 p-3 mb-3">
          <Youtube className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-2">Error Loading Feed</h3>
        <p>{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between mb-6">
        <Button
          variant="outline"
          rounded="full"
          asChild
          className="flex items-center gap-2"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Channels
          </Link>
        </Button>
      </div>

      {channel && (
        <Card variant="glass" className="overflow-hidden">
          <div className="relative h-48 md:h-64 bg-gradient-to-r from-youtube-red/20 to-youtube-red/5">
            <div className="absolute inset-0 bg-noise opacity-20"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-6 md:p-8 w-full flex flex-col md:flex-row gap-6 items-center md:items-start">
                <img
                  src={channel.thumbnail}
                  alt={channel.title}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                <div className="text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{channel.title}</h2>
                  <p className="text-muted-foreground max-w-2xl">{channel.description}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-youtube-red to-youtube-red/80 text-white">
          <CardTitle className="text-center">Your Podcast Feed is Ready!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Headphones className="h-5 w-5 text-youtube-red" />
            <p className="text-center font-medium">
              Copy this URL and add it to your favorite podcast app:
            </p>
          </div>
          <div className="relative">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all border border-border">
              {feedUrl}
            </div>
            <Button
              variant="gradient"
              size="sm"
              rounded="full"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy URL'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 mt-12 mb-6">
        <div className="h-px flex-grow bg-border"></div>
        <h3 className="text-xl font-semibold px-4">Recent Episodes</h3>
        <div className="h-px flex-grow bg-border"></div>
      </div>

      <div className="space-y-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden" variant="elevated" hover>
            <div className="grid grid-cols-1 md:grid-cols-4 group">
              <div className="md:col-span-1 relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover min-h-[200px]"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button variant="youtube" rounded="full" asChild>
                    <a href={video.url} target="_blank" rel="noopener noreferrer">
                      <Youtube className="h-4 w-4 mr-2" />
                      Watch on YouTube
                    </a>
                  </Button>
                </div>
              </div>
              <div className="p-6 md:col-span-3">
                <h4 className="text-xl font-semibold mb-3">{video.title}</h4>
                <div className="flex flex-wrap gap-4 mb-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{video.published_at}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{video.duration}</span>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 line-clamp-3">{video.description}</p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" rounded="full" asChild className="flex items-center gap-2">
                    <a href={video.url} target="_blank" rel="noopener noreferrer">
                      <Youtube className="h-4 w-4" />
                      Watch on YouTube
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg border border-green-200 animate-float">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Feed URL copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
} 