import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

type Message = {
  messages_id: string;
  chat_id: string;
  sender_is: boolean;
  content: string;
  file_url?: string | null;
};

// TODO: replace with real logged-in user id from token / context
const USER_ID = "02c05120-dd3b-4e4d-9d7d-0f686c173e3f";

export default function ChatPage() {
  const params = useParams();
  const [chatId, setChatId] = useState<string | null>(params.chatId ?? null);
  const [content, setContent] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load messages when we have a chatId
  useEffect(() => {
    if (!chatId) return;

    fetch(`http://127.0.0.1:8000/chats/chat/${chatId}`)
      .then((res) => res.json())
      .then((data: Message[]) => {
        console.log("Loaded messages:", data);
        setMessages(data);
      })
      .catch((err) => {
        console.error("Load messages error:", err);
        setError("Failed to load messages");
      });
  }, [chatId]);

  const sendMessage = async () => {
    if (!content.trim()) return;
    setError(null);

    try {
      // For now always use first_message endpoint, like your original code
      console.log("Sending first message...");

      const res = await fetch("http://127.0.0.1:8000/chats/first_message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          content: content,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Send failed:", errText);
        setError("Failed to send message");
        return;
      }

      const chat = await res.json();
      console.log("Chat created:", chat);

      setChatId(chat.chat_id);
      setContent("");
    } catch (err) {
      console.error("Send failed:", err);
      setError("Failed to send message");
    }
  };

  // To keep the same structure as LoginPage, use a <form> wrapping the Card
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  return (
    <div className="login-root">
      <form onSubmit={onSubmit}>
        <Card variant="elevated" className="login-card">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-center">
              Chat with your AI-Agent
            </h1>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Messages area */}
            <div className="border border-border rounded-md h-80 p-3 overflow-y-auto bg-background/50">
              {messages.length === 0 ? (
                <p className="text-sm text-muted text-center mt-8">
                  Start the conversation by sending a message below.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.messages_id}
                    className={`mb-2 flex ${
                      msg.sender_is ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted">
                      <div className="text-[11px] text-muted mb-1">
                        {msg.sender_is ? "You" : "Agent"}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            {/* Input + Send button, styled like your login form */}
            <div className="flex w-full items-center gap-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="px-6">
                Send
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}