import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseTextChatOptions {
  api: string;
  initialMessages?: ChatMessage[];
  getHeaders?: () => Promise<Record<string, string>>;
}

const ERROR_MESSAGE = 'No pude responder en este momento. Intenta de nuevo.';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || ERROR_MESSAGE;
  } catch {
    return ERROR_MESSAGE;
  }
}

export function useTextChat({ api, initialMessages = [], getHeaders }: UseTextChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const assistantId = crypto.randomUUID();
      const history = [...messages, userMessage];

      setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);
      setInput('');
      setIsLoading(true);

      const setAssistantContent = (content: string) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));

      try {
        const extraHeaders = getHeaders ? await getHeaders() : {};
        const response = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...extraHeaders },
          body: JSON.stringify({
            // El mensaje de bienvenida es local; no se envía al modelo
            messages: history
              .filter((m) => m.id !== 'welcome')
              .map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!response.ok) {
          setAssistantContent(await readErrorMessage(response));
          return;
        }
        if (!response.body) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          setAssistantContent(content);
        }

        if (!content) setAssistantContent(ERROR_MESSAGE);
      } catch (error) {
        console.error('Error in chat:', error);
        setAssistantContent(ERROR_MESSAGE);
      } finally {
        setIsLoading(false);
      }
    },
    [api, getHeaders, input, isLoading, messages],
  );

  return { messages, input, handleInputChange, handleSubmit, isLoading };
}
