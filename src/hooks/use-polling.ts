import { convertToUIMessages } from '@/lib/utils/ai';
import { useEffect } from 'react';

type UsePollingOptions = {
  id: string;
  onUpdate: (newData: any) => void;
  interval?: number;
};

const usePolling = ({ id, onUpdate, interval = 60000 }: UsePollingOptions) => {
  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/chat/${id}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();

        if (!data || !data.messages) {
          return;
        }
        
        const messages = convertToUIMessages(data?.messages);

        onUpdate(messages); // Pass fetched data to the callback
      } catch (_) {
        // Intentionally ignore the error
      }
    };

    const pollingInterval = setInterval(poll, interval);
    return () => clearInterval(pollingInterval); // Cleanup interval on unmount
  }, [id, onUpdate, interval]);
};

export default usePolling;
