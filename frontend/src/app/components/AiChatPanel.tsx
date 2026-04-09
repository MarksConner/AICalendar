import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Button } from "../design_system/components/ui/Button";
import { Input } from "../design_system/components/ui/Input";
import ChatClient from "../api_client/ChatClient";



type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi! Ask me about your schedule and I can help plan your day.",
  },
];

export const AiChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatClient = useMemo(() => new ChatClient(), []); // Memoize ChatClient instance to avoid unnecessary re-instantiations on re-renders
  

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: trimmed },
    ]);
    setDraft("");
    setIsLoading(true);

// Helper function for now to add assistant messages to the chat, we can call this after receiving a response from the API in the future.
  const addAssistantMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text,
      },
    ]);
  };

    if(!chatId){ // If no chatId, create a new chat with the first message
      chatClient.createChatAPI(trimmed).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          console.log("createChatAPI data:", data);
          setChatId(data.chat_id); // Store the chatId for future messages

          const calendarId = localStorage.getItem("calendar_id");
          // Null check.
          if (!calendarId) {
            addAssistantMessage("No calendar selected.");
            setIsLoading(false);
            return;
          }
          const aiResponse = await chatClient.askAI(trimmed, calendarId);
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            console.log("askAI data:", aiData);
            addAssistantMessage(aiData.response); // Add the AI's response to the chat
          } else {
            // Handle error for askAI
          }
        } else {
          // Handle error for createChatAPI
        }
        setIsLoading(false);
      });
    } else { // If chatId exists, send message to existing chat
      chatClient.sendMessageAPI(chatId, trimmed).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          console.log("sendMessageAPI data:", data);
           const calendarId = localStorage.getItem("calendar_id");
          // Null check.-- Duplicated code probably could refactor
          if (!calendarId) {
            addAssistantMessage("No calendar selected.");
            setIsLoading(false);
            return;
          }
          //--------------------
          const aiResponse = await chatClient.askAI(trimmed, calendarId); // This is currently not interacting with the database.
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            console.log("askAI data:", aiData);
            addAssistantMessage(aiData.response); // Add the AI's response to the chat
          } else {
            // Handle error for askAI
          }
        } else {
          // Handle error for sendMessageAPI
        }
        setIsLoading(false);
      });

    }
  };

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }} spacing={2}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          pr: 0.5,
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor:
                message.role === "user" ? "primary.main" : "background.paper",
              color:
                message.role === "user" ? "primary.contrastText" : "text.primary",
              border: message.role === "user" ? undefined : "1px solid",
              borderColor: message.role === "user" ? undefined : "divider",
            }}
          >
            <Typography variant="body2">{message.text}</Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}
      >
        <Input
          placeholder="Ask about your schedule..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          sx={{ flex: 1 }}
        />
        <Button type="submit" disabled={!draft.trim()}>
          Send
        </Button>
      </Box>
    </Stack>
  );
};