import React, { useEffect, useState } from "react";

import {Card,CardHeader,CardContent,CardFooter} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

//Struct that matches the Message model from the backend. This will be removed once we have better structures between frontend and backend.
type Message = {
  message_id: string;
  chat_id: string;
  sender_is_user: boolean;
  content: string;
  created_at?: string;
};

//Declare Chat page as a React functional component. This means that ChatPage is a function that returns JSX to render the chat interface.
//JSX is a syntax extension for JavaScript that looks similar to HTML and is used in React to describe the UI structure.
// his component manages chat messages, user input, and interactions with different backend's API's.
//If a chat ID exists in local storage, it loads messages for that chat when the component mounts or when the chat ID changes.
export const ChatPage: React.FC = () => { const [chatId, setChatId] = useState<string | null> (localStorage.getItem("current_chat_id"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");

  //Function to load messages for a given chat ID from the backend API.
  const loadMessages = async (id: string) => {
    try {
      setLoadingMessages(true);
      setError(null);

      //Uses fetch to call the backend API /get_all_messages_in_chat to get messages for the specified chat ID. Which was stored in local storage when the user first sent a message.
      const res = await fetch(`http://127.0.0.1:8000/chats/get_all_messages_in_chat/${id}`, {
          method: "GET",
          headers: {"Content-Type": "application/json",...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
    
      //Checks if the response is correct. If not, it logs an error and sets an error message in the state.
      if (!res.ok) {

        if (res.status === 404 || res.status === 400) {
            console.warn("Chat not found, clearing saved chat_id");
            localStorage.removeItem("current_chat_id");
            setChatId(null);
            setMessages([]);
            return;
          }

        const data = await res.json().catch(() => null);
        console.error("Failed to load messages:", data);
        setError(data?.detail ?? "Failed to load messages");
        return;
      }
      //If the response is correct , it parses the JSON data and updates the messages state with the retrieved messages.
      const data: Message[] = await res.json();
      setMessages(data);

    }catch (err) {
      console.error("Network error while loading messages:", err);
      setError("Network error while loading messages");
    }finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId]);

  //Function to handle sending a new message.
  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

  //Checks if user ID is available, if not, it sets an error message. (This will be removed once authentication is fully implemented.)
    if (!userId) {
      setError("No user_id found. Please log in again.");
      return;
    }
    setError(null);
    setLoadingSend(true);

    try {

      //If there is not chat id call /first_message api to create a new chat with the first message. (This is somewhat confusing since the api is called first_message but it creates a new chat.)
      //Firs message naming will be changed in future to demonstrate its structure better.
      if (!chatId) {
        const res = await fetch("http://127.0.0.1:8000/chats/first_message",{
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              user_id: userId,
              content: input,
            }),
          }
        );

      
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Failled chat creation", data);
          return;
        }

        const chat = await res.json();
        const new_chat_id = chat.chat_id;
        setChatId(new_chat_id);
        
        //Store the new chat ID in local storage for future reference.
        localStorage.setItem("current_chat_id", new_chat_id);

        //Load messages for the newly created chat.
        await loadMessages(new_chat_id);

        setInput("");
        return;
      }
      const res = await fetch(
        "http://127.0.0.1:8000/messages/send_message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            chat_id: chatId,
            content: input,
            sender_is_user: true,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to send message:", data);
        setError(data?.detail ?? "Could not send message");
        return;
      }

      const savedMessage: Message = await res.json();

      setMessages((prev) => [...prev, savedMessage]);

      setInput("");
    } catch (err) {
      console.error("Network error while sending message:", err);
      setError("Network error while sending message");
    } finally {
      setLoadingSend(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text">
      <Card variant="elevated" className="w-full max-w-2xl h-[70vh] flex flex-col">
        <CardHeader>
          <h1 className="text-xl font-semibold text-center">Chat</h1>
          <p className="text-sm text-muted text-center">
            No messages found, create a new chat by sending a message!
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 overflow-y-auto border border-border rounded-md p-3 space-y-2 bg-background">
            {loadingMessages && (
              <p className="text-xs text-muted text-center">
                Loading messages...
              </p>
            )}

            {!loadingMessages && messages.length === 0 && (
              <p className="text-xs text-muted text-center">
                No messages yet.
              </p>
            )}

            {messages.map((m, index) => (
              <div
                key={m.message_id ?? `${m.chat_id}-${index}`}
                className={`flex ${
                  m.sender_is_user ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    m.sender_is_user
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-text"
                  }`}
                >
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center mt-1">{error}</p>
          )}
        </CardContent>

        <CardFooter>
          <form
            onSubmit={handleSend}
            className="flex w-full items-center gap-2"
          >
            <Input
              label=""
              placeholder="Type Here"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInput(e.target.value)
              }
              className="flex-1"
            />
            <Button type="submit" disabled={loadingSend}>
              {loadingSend ? "Sending..." : "Send"}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};