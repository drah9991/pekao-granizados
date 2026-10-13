import { useState, useRef, useEffect } from 'react';
import { useTextChat } from './useTextChat';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useTextChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy el asistente virtual de Pekao Central. ¿En qué te puedo ayudar hoy con tu punto de venta o inventario?',
      },
    ],
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-all duration-300",
          isOpen ? "bg-slate-800 hover:bg-slate-700 text-white" : "gradient-primary text-white hover:scale-105"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[500px] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-white/5 border-b border-white/10">
            <div className="bg-primary/20 p-2 rounded-full">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Asistente Pekao</h3>
              <p className="text-xs text-slate-400">En línea</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3 text-sm",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    m.role === 'user' ? "bg-primary text-white" : "bg-white/10 text-primary"
                  )}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl max-w-[80%]",
                    m.role === 'user' 
                      ? "bg-primary text-white rounded-tr-sm" 
                      : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm whitespace-pre-wrap"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 text-sm flex-row">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm flex items-center gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 bg-white/5 border-t border-white/10">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Pregúntale a Pekao..."
                className="flex-1 bg-black/50 border-white/10 rounded-full px-4 text-sm h-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
