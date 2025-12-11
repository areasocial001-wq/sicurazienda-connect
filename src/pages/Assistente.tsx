import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Bot, User, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useAIChat } from '@/hooks/useAIChat';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const SUGGESTED_QUESTIONS = [
  "Quali corsi di formazione offrite?",
  "Come funziona il DVR?",
  "Cos'è la sorveglianza sanitaria?",
  "Quali sono i requisiti per RSPP?",
  "Come posso richiedere un preventivo?",
];

export default function Assistente() {
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Assistente AI
              </h1>
              <p className="text-muted-foreground text-sm">
                Chiedimi qualsiasi cosa sui servizi SicurAzienda
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            <Trash2 className="h-4 w-4 mr-2" />
            Nuova chat
          </Button>
        </div>

        {/* Chat Area */}
        <Card className="h-[calc(100vh-280px)] min-h-[400px] flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Come posso aiutarti?</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Sono l'assistente virtuale di SicurAzienda. Posso rispondere a domande su 
                  sicurezza sul lavoro, formazione, consulenza e molto altro.
                </p>
                
                {/* Suggested Questions */}
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSuggestedQuestion(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-3",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div className="text-destructive text-sm text-center mt-4 p-3 bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <CardContent className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Invia
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
