import YouTubeDownloader from '@/components/youtube/YouTubeDownloader';

export const metadata = {
  title: 'YouTube Downloader | Star Player',
};

export default function YouTubePage() {
  return (
    <div className="flex-1 h-full bg-background overflow-y-auto">
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Download</h1>
        <p className="text-text-secondary">Download audio from YouTube directly to your offline library.</p>
      </div>
      
      <YouTubeDownloader />
    </div>
  );
}
