'use client';

import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChatMessage as ChatMessageType } from "@/hooks/fun/use-chat";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  const router = useRouter();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Handle internal links (proposal builder, products, etc.)
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) {
      e.preventDefault();
      router.push(url.pathname + url.search);
    }
    // External links open normally in new tab
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-base ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-foreground"
        }`}
      >
        {isUser ? (
          <div>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.images && message.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Pasted image ${i + 1}`}
                    className="rounded-lg max-h-40 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(url, "_blank")}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:underline [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-h-60 [&_img]:w-auto">
            <ReactMarkdown
              components={{
                a: ({ href, children, ...props }) => {
                  const isExternal = href?.startsWith("http") && !href?.includes(window.location.host);
                  return (
                    <a
                      href={href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onClick={(e) => href && handleLinkClick(e, href)}
                      className="text-primary underline cursor-pointer hover:text-primary/80"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
