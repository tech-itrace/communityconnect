import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface BotResponse {
    response: string;
    resultsCount?: number;
    suggestions?: string[];
}

export function Chat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hello! I can help you find community members. Try asking me "Who works in tech?" or "Find members in Chennai"',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessageMutation = useMutation({
        mutationFn: async (message: string) => {
            const response = await api.post<BotResponse>('/api/messages', {
                message,
            });
            return response.data;
        },
        onSuccess: (data) => {
            const botMessage: Message = {
                id: Date.now().toString() + '-bot',
                text: data.response,
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);

            // Add suggestions if available
            if (data.suggestions && data.suggestions.length > 0) {
                const suggestionText = `\n\nSuggestions:\n${data.suggestions.join('\n')}`;
                const suggestionMessage: Message = {
                    id: Date.now().toString() + '-suggestions',
                    text: suggestionText,
                    sender: 'bot',
                    timestamp: new Date(),
                };
                setTimeout(() => {
                    setMessages((prev) => [...prev, suggestionMessage]);
                }, 300);
            }
        },
        onError: (error: any) => {
            const errorMessage: Message = {
                id: Date.now().toString() + '-error',
                text: error.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        },
    });

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Send to bot
        sendMessageMutation.mutate(input);

        // Clear input
        setInput('');
        inputRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const quickQuestions = [
        'Who works in tech?',
        'Find members in Chennai',
        'Show me software engineers',
        'Members with MBA degree',
    ];

    const handleQuickQuestion = (question: string) => {
        setInput(question);
        inputRef.current?.focus();
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Chat with Bot</h2>
                <p className="text-muted-foreground">
                    Ask questions about community members in natural language
                </p>
            </div>

            <Card className="h-[calc(100vh-250px)] flex flex-col">
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Community Search Assistant
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''
                                    }`}
                            >
                                <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    {message.sender === 'user' ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <Bot className="h-4 w-4" />
                                    )}
                                </div>
                                <div
                                    className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'text-right' : ''
                                        }`}
                                >
                                    <div
                                        className={`inline-block rounded-lg px-4 py-2 ${message.sender === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">
                                            {message.text}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 px-1">
                                        {message.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {sendMessageMutation.isPending && (
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="bg-muted rounded-lg px-4 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    {messages.length === 1 && (
                        <div className="px-4 pb-4 border-t pt-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                Try these questions:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {quickQuestions.map((question) => (
                                    <Button
                                        key={question}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickQuestion(question)}
                                    >
                                        {question}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 border-t">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask a question about community members..."
                                disabled={sendMessageMutation.isPending}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || sendMessageMutation.isPending}
                                size="icon"
                            >
                                {sendMessageMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Press Enter to send, Shift+Enter for new line
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
