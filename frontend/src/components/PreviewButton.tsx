import Button from '@cloudscape-design/components/button';
import { useEffect, useState } from 'react';
import { useAlert } from '../contexts/AlertProvider';
import { useApi } from '../hooks/useApi';

interface PreviewButtonProps {
  text: string;
  languageCode: string;
  voiceId: string;
}
export function PreviewButton(props: PreviewButtonProps) {
  const { text, languageCode, voiceId } = props;

  const { setAlert } = useAlert();
  const { apiFetch } = useApi();
  const [busy, setBusy] = useState(false);

  const [audio, setAudio] = useState<HTMLAudioElement>(new Audio());
  const [playing, setPlaying] = useState(false);

  // Reduce calls to polly by re-using request
  const [cache, setCache] = useState(false);

  useEffect(() => {
    audio.onended = () => {
      setPlaying(false);
    };
  }, []);

  useEffect(() => {
    // Reset cache if voices/locale/text changes
    setCache(false);
  }, [languageCode, voiceId, text]);

  /**
   * Handle request to start/stop audio
   */
  const pollyButtonPressed = async () => {
    if (playing) {
      audio.pause();
      const currAudio = audio;
      currAudio.src = '';
      setAudio(currAudio);
      setPlaying(false);
    } else {
      await callPollyToPlayPrompt();
    }
  };

  const callPollyToPlayPrompt = async () => {
    try {
      setBusy(true);
      if (!cache) {
        setCache(true);
        // Call our preview speech API
        const result = await apiFetch<{ Audio: any }>('POST', '/api/preview-speech', {
          languageCode,
          voiceId,
          text,
        });

        if (!result) {
          throw new Error('No response from preview speech API');
        }

        const buffer = result.Audio;
        /**
         * For some reason, the Buffer that is being returned by the API uses a 'data' attribute to hold the Array
         */
        const data = Uint8Array.from((buffer as any)['data']);

        audio.src = URL.createObjectURL(new Blob([data]));
        setAudio(audio);
      }

      // update Audio with the URL and play the audio
      setPlaying(true);
      await audio.play();
    } catch (error) {
      setAlert((error as Error).message, 'error');
      setPlaying(false);
      audio.src = '';
      setAudio(audio);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !text || !voiceId;

  return (
    <Button
      iconName={playing ? 'audio-off' : 'audio-full'}
      onClick={pollyButtonPressed}
      disabled={disabled}
      ariaLabel="Preview text-to-speech"
      formAction={'none'}
    >
      {playing ? 'Stop Preview' : 'Preview'}
    </Button>
  );
}
