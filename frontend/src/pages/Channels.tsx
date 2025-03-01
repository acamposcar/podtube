import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Plus, Youtube, Copy, Check, Search, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_URL = import.meta.env.VITE_API_URL;

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriber_count: number;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
  });
  const [newChannelData, setNewChannelData] = useState({
    channel_id: '',
    title: '',
    description: '',
    thumbnail: '',
    subscriber_count: 0,
    video_count: 0
  });
  const [channelUrl, setChannelUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/channels`);
      setChannels(response.data.channels);
    } catch (err) {
      setError('Failed to load channels. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChannels();
    setRefreshing(false);
    toast({
      title: "Channels refreshed",
      description: "Your channel list has been updated",
      variant: "success"
    });
  };

  const handleEditClick = (channel: Channel) => {
    setCurrentChannel(channel);
    setFormData({
      title: channel.title,
      description: channel.description,
      thumbnail: channel.thumbnail,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (channel: Channel) => {
    setCurrentChannel(channel);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!currentChannel) return;

    try {
      await axios.put(`${API_URL}/api/channels/${currentChannel.id}`, formData);
      setIsEditDialogOpen(false);
      fetchChannels();
      toast({
        title: "Channel updated",
        description: "The channel has been successfully updated",
        variant: "success"
      });
    } catch (err) {
      setError('Failed to update channel. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentChannel) return;

    try {
      await axios.delete(`${API_URL}/api/channels/${currentChannel.id}`);
      setIsDeleteDialogOpen(false);
      fetchChannels();
      toast({
        title: "Channel deleted",
        description: "The channel has been successfully removed",
        variant: "default"
      });
    } catch (err) {
      setError('Failed to delete channel. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewChannelInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewChannelData(prev => ({ ...prev, [name]: value }));
  };

  const handleChannelUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setChannelUrl(url);
    
    // Almacenar la URL completa en el channel_id
    // El backend se encargará de extraer el ID real del canal
    setNewChannelData(prev => ({ ...prev, channel_id: url }));
  };

  const handleAddChannel = async () => {
    try {
      // Validar que tenemos una URL de canal
      if (!channelUrl.trim()) {
        setError('Por favor, introduce una URL de canal de YouTube válida.');
        return;
      }
      
      // Validar que tenemos un título
      if (!newChannelData.title.trim()) {
        setError('Por favor, introduce un título para el canal.');
        return;
      }

      console.log('Enviando datos al servidor:', newChannelData);
      
      const response = await axios.post(`${API_URL}/api/channels`, newChannelData);
      console.log('Respuesta del servidor:', response.data);
      
      setIsAddDialogOpen(false);
      // Reset form data
      setNewChannelData({
        channel_id: '',
        title: '',
        description: '',
        thumbnail: '',
        subscriber_count: 0,
        video_count: 0
      });
      setChannelUrl('');
      fetchChannels();
      toast({
        title: "Channel added",
        description: "The new channel has been successfully added",
        variant: "success"
      });
    } catch (err: unknown) {
      console.error('Error al añadir canal:', err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al añadir el canal. Por favor, inténtalo de nuevo.');
    }
  };

  const handleCopyFeedUrl = async (channelId: string) => {
    try {
      const feedUrl = `${API_URL}/feed/${channelId}`;
      await navigator.clipboard.writeText(feedUrl);
      setCopiedChannel(channelId);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedChannel(null);
      }, 2000);
      
      // Show success message
      toast({
        title: "URL copiada",
        description: "La URL del feed ha sido copiada al portapapeles",
        variant: "success"
      });
    } catch (err) {
      console.error('Error al copiar URL:', err);
      setError('No se pudo copiar la URL al portapapeles');
    }
  };

  // Filter channels based on search query
  const filteredChannels = channels.filter(channel => 
    channel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-youtube-red to-youtube-red/70 bg-clip-text text-transparent">YouTube Podcast Manager</h1>
          <p className="text-muted-foreground mt-1">
            Convert your favorite YouTube channels into podcast feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="gradient"
            rounded="full"
            className="flex items-center gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search channels..."
          className="pl-8 rounded-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {error && (
        <div className="w-full bg-destructive/15 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
          {error}
          <Button 
            variant="link" 
            className="p-0 h-auto text-destructive ml-2 underline"
            onClick={() => setError('')}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="grid" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Grid View</TabsTrigger>
          <TabsTrigger value="list" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden" variant="elevated">
                  <div className="relative">
                    <Skeleton className="h-40 w-full" />
                    <div className="absolute inset-0 shimmer" />
                  </div>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gradient-to-br from-youtube-red to-youtube-red/70 p-4 mb-4 shadow-glow animate-pulse-slow">
                <Youtube className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-medium">No channels found</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-md">
                {searchQuery ? 'No channels match your search criteria.' : 'You haven\'t added any YouTube channels yet.'}
              </p>
              <Button 
                variant="gradient" 
                rounded="full"
                size="lg"
                onClick={() => {
                  setSearchQuery('');
                  setIsAddDialogOpen(true);
                }}
                className="animate-float"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Channel
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChannels.map((channel) => (
                <Card key={channel.id} className="overflow-hidden flex flex-col h-full" variant="elevated" hover>
                  <div className="relative h-40 bg-muted">
                    <img
                      src={channel.thumbnail}
                      alt={channel.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        variant="glass"
                        size="icon-sm"
                        rounded="full"
                        onClick={() => handleEditClick(channel)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        rounded="full"
                        onClick={() => handleDeleteClick(channel)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="secondary" className="glass">
                        {formatDate(channel.updated_at)}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-grow">
                    <h3 className="text-xl font-semibold mb-2 line-clamp-1">{channel.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {channel.description || 'No description available'}
                    </p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <Badge variant="outline" className="bg-muted/50">
                        {channel.subscriber_count.toLocaleString()} subscribers
                      </Badge>
                      <Badge variant="outline" className="bg-muted/50">
                        {channel.video_count.toLocaleString()} videos
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-between border-t mt-auto">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        rounded="full"
                        asChild
                        className="flex items-center gap-1"
                      >
                        <a href={`https://youtube.com/channel/${channel.channel_id}`} target="_blank" rel="noopener noreferrer">
                          <Youtube className="h-3 w-3" />
                          YouTube
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        rounded="full"
                        onClick={() => handleCopyFeedUrl(channel.id)}
                        className="flex items-center gap-1 min-w-[110px]"
                      >
                        {copiedChannel === channel.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Feed
                          </>
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="gradient"
                      size="sm"
                      rounded="full"
                      asChild
                    >
                      <Link to={`/preview/${channel.id}`}>
                        View Feed
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          {loading ? (
            <Card variant="elevated">
              <ScrollArea className="h-[60vh]">
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-2">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gradient-to-br from-youtube-red to-youtube-red/70 p-4 mb-4 shadow-glow animate-pulse-slow">
                <Youtube className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-medium">No channels found</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-md">
                {searchQuery ? 'No channels match your search criteria.' : 'You haven\'t added any YouTube channels yet.'}
              </p>
              <Button 
                variant="gradient" 
                rounded="full"
                size="lg"
                onClick={() => {
                  setSearchQuery('');
                  setIsAddDialogOpen(true);
                }}
                className="animate-float"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Channel
              </Button>
            </div>
          ) : (
            <Card variant="elevated">
              <ScrollArea className="h-[60vh]">
                <div className="p-2">
                  {filteredChannels.map((channel) => (
                    <div 
                      key={channel.id} 
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="relative h-14 w-14">
                        <img
                          src={channel.thumbnail}
                          alt={channel.title}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{channel.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{channel.subscriber_count.toLocaleString()} subscribers</span>
                          <span>•</span>
                          <span>{formatDate(channel.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          rounded="full"
                          onClick={() => handleCopyFeedUrl(channel.id)}
                          className="flex items-center gap-1 h-8"
                        >
                          {copiedChannel === channel.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          rounded="full"
                          asChild
                          className="h-8"
                        >
                          <Link to={`/preview/${channel.id}`}>
                            View
                          </Link>
                        </Button>
                        <div className="flex">
                          <Button
                            variant="glass"
                            size="icon-sm"
                            rounded="full"
                            onClick={() => handleEditClick(channel)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            rounded="full"
                            onClick={() => handleDeleteClick(channel)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Channel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Channel</DialogTitle>
            <DialogDescription>
              Update the channel information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL</Label>
              <Input
                id="thumbnail"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleInputChange}
                className="rounded-md"
              />
              {formData.thumbnail && (
                <div className="mt-2 rounded-md overflow-hidden w-full max-w-[200px] border border-border">
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail preview"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" rounded="full" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" rounded="full" onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this channel? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentChannel && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <img
                  src={currentChannel.thumbnail}
                  alt={currentChannel.title}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div>
                  <h4 className="font-medium">{currentChannel.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentChannel.subscriber_count.toLocaleString()} subscribers • {currentChannel.video_count.toLocaleString()} videos
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" rounded="full" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" rounded="full" onClick={handleDeleteConfirm}>
              Delete Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Channel Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Channel</DialogTitle>
            <DialogDescription>
              Enter the YouTube channel details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel_url">YouTube Channel URL</Label>
              <Input
                id="channel_url"
                name="channel_url"
                value={channelUrl}
                onChange={handleChannelUrlChange}
                placeholder="https://www.youtube.com/channel/..."
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL of the YouTube channel (e.g., https://www.youtube.com/channel/UC...)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_title">Title</Label>
              <Input
                id="new_title"
                name="title"
                value={newChannelData.title}
                onChange={handleNewChannelInputChange}
                placeholder="Channel title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_description">Description</Label>
              <Textarea
                id="new_description"
                name="description"
                value={newChannelData.description}
                onChange={handleNewChannelInputChange}
                rows={4}
                placeholder="Channel description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_thumbnail">Thumbnail URL</Label>
              <Input
                id="new_thumbnail"
                name="thumbnail"
                value={newChannelData.thumbnail}
                onChange={handleNewChannelInputChange}
                placeholder="https://example.com/thumbnail.jpg"
              />
              {newChannelData.thumbnail && (
                <div className="mt-2 rounded-md overflow-hidden w-full max-w-[200px]">
                  <img
                    src={newChannelData.thumbnail}
                    alt="Thumbnail preview"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" rounded="full" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" rounded="full" onClick={handleAddChannel}>
              Add Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 