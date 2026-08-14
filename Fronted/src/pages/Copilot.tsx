import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  askCopilot,
  getCopilotState,
  startCopilotConversation,
  type CopilotContext,
} from '@/api/copilot';
import { formatTimeOnly } from '@/utils/date';
import type { CopilotMessage } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { clsx } from 'clsx';

function renderLine(line: string, index: number) {
  if (!line.trim()) return <br key={index} />;
  const isBullet = line.trim().startsWith('- ');
  return (
    <p key={index} className={clsx(isBullet && 'pl-3')}>
      {line}
    </p>
  );
}

function MessageBubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm',
          isUser ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant/20'
        )}
      >
        <span
          className={clsx(
            'material-symbols-outlined text-[16px]',
            isUser ? 'text-on-primary' : 'text-ai-accent'
          )}
        >
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>

      <div
        className={clsx(
          'max-w-[78%] rounded-2xl px-4 py-3 text-body-md font-body-md shadow-sm',
          isUser
            ? 'bg-primary text-on-primary rounded-tr-sm'
            : 'bg-surface-container-high text-on-surface border border-outline-variant/10 rounded-tl-sm'
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">
          {msg.content.split('\n').map(renderLine)}
        </div>
        <p
          className={clsx(
            'text-metadata font-metadata mt-1.5',
            isUser ? 'text-on-primary/70 text-right' : 'text-on-surface-variant'
          )}
        >
          {msg.timestamp.includes('T') ? formatTimeOnly(msg.timestamp) : msg.timestamp}
        </p>
      </div>
    </div>
  );
}

const EMPTY_CONTEXT: CopilotContext = {
  availableInventory: 0,
  pendingRequests: 0,
  criticalRequests: 0,
  pendingApprovals: 0,
  lowStockItems: 0,
  fulfillmentOrders: 0,
  deliveredOrders: 0,
  reportsGenerated: 0,
  activeModel: 'Loading',
  activeModelVersion: null,
};

export default function CopilotPage() {
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [context, setContext] = useState<CopilotContext>(EMPTY_CONTEXT);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const consumedPromptRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    getCopilotState()
      .then((state) => {
        setConversationId(state.conversation.id);
        setMessages(state.messages);
        setSuggestions(state.suggestions);
        setContext(state.context);
      })
      .catch(() => toastError('Copilot Unavailable', 'The backend could not load the current Copilot session.'))
      .finally(() => setIsLoading(false));
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;
    setInput('');
    setIsTyping(true);

    try {
      const response = await askCopilot(content, conversationId);
      setConversationId(response.conversation.id);
      setContext(response.context);
      setSuggestions(response.suggestions);
      setMessages(response.messages);
    } catch {
      toastError('Copilot Request Failed', 'The backend rejected or could not answer this message.');
    } finally {
      setIsTyping(false);
    }
  }, [conversationId, input, isTyping, toastError]);

  useEffect(() => {
    const prompt = searchParams.get('prompt')?.trim();
    if (!prompt || isLoading || consumedPromptRef.current === prompt) return;
    consumedPromptRef.current = prompt;
    void sendMessage(prompt);
    navigate('/copilot', { replace: true });
  }, [isLoading, navigate, searchParams, sendMessage]);

  const handleResetChat = async () => {
    setIsLoading(true);
    try {
      const state = await startCopilotConversation();
      setConversationId(state.conversation.id);
      setMessages(state.messages);
      setSuggestions(state.suggestions);
      setContext(state.context);
    } catch {
      toastError('Session Not Started', 'The backend could not create a new Copilot session.');
    } finally {
      setIsLoading(false);
    }
  };

  const contextRows = [
    { label: 'Active Model', value: context.activeModelVersion ? `${context.activeModel} v${context.activeModelVersion}` : context.activeModel },
    { label: 'Pending Requests', value: context.pendingRequests.toLocaleString() },
    { label: 'Pending Approvals', value: context.pendingApprovals.toLocaleString() },
    { label: 'Low Stock SKUs', value: context.lowStockItems.toLocaleString() },
    { label: 'Inventory Units', value: context.availableInventory.toLocaleString() },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title font-page-title text-on-surface mb-1 tracking-tight">
            NEXUS Copilot
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Operational chatbot backed by the connected NEXUS database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-ai-accent/10 rounded-full border border-ai-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-ai-accent animate-pulse" />
            <span className="text-label-caps font-label-caps text-ai-accent">
              {context.activeModelVersion ? `Model ${context.activeModelVersion}` : 'DB Context Active'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetChat} loading={isLoading}>
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            New Session
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <GlassCard padding="none" className="flex-1 overflow-y-auto scrollbar-none">
            <div className="p-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isLoading && (
                <p className="text-body-sm font-body-sm text-on-surface-variant">Loading Copilot session...</p>
              )}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-ai-accent">smart_toy</span>
                  </div>
                  <div className="bg-surface-container-high rounded-2xl rounded-tl-sm px-4 py-3 border border-outline-variant/10">
                    <div className="flex items-center gap-1.5 py-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-ai-accent animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </GlassCard>

          <div className="mt-4">
            <div className="flex items-center gap-3 bg-surface-container-high rounded-2xl border border-outline-variant/20 px-4 py-3 focus-within:border-primary/40 transition-colors shadow-sm">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about critical approvals, stock levels, fulfillment, reports, or audit activity..."
                className="flex-1 bg-transparent text-on-surface font-body-md text-body-md outline-none placeholder:text-on-surface-variant/50"
              />
              <Button
                id="copilot-send-btn"
                variant="primary"
                size="sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping || isLoading}
                className="rounded-xl"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </Button>
            </div>
            <p className="text-metadata font-metadata text-outline text-center mt-2">
              Answers are generated from connected PostgreSQL records
            </p>
          </div>
        </div>

        <div className="w-72 shrink-0 space-y-4">
          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-3">Quick Inquiries</h3>
            <div className="space-y-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isTyping || isLoading}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-all border border-outline-variant/10 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-3">Active Context</h3>
            <div className="space-y-2 text-body-sm font-body-sm text-on-surface-variant">
              {contextRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span>{row.label}</span>
                  <span className="text-on-surface font-semibold text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
