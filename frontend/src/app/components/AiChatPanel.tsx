import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Button } from "../design_system/components/ui/Button";
import { Input } from "../design_system/components/ui/Input";
import {
  startMicrophoneInput,
  stopMicrophoneInput,
} from "../services/tts/mic_parsing";
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
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicDraft, setHasMicDraft] = useState(false);

  const chatClient = useMemo(() => new ChatClient(), []);

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

  const sendCurrentDraft = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: trimmed },
    ]);
    setDraft("");
    setHasMicDraft(false);
    setIsLoading(true);

    try {
      const calendarId = localStorage.getItem("calendar_id");
      if (!calendarId) {
        addAssistantMessage("No calendar selected.");
        return;
      }

      let currentChatId = chatId;

      if (!currentChatId) {
        const createResponse = await chatClient.createChatAPI(trimmed);

        if (!createResponse.ok) {
          addAssistantMessage("Failed to create chat.");
          return;
        }

        const createData = await createResponse.json();
        console.log("createChatAPI data:", createData);

        currentChatId = createData.chat_id;
        setChatId(currentChatId);
      } else {
        const sendResponse = await chatClient.sendMessageAPI(
          currentChatId,
          trimmed
        );

        if (!sendResponse.ok) {
          addAssistantMessage("Failed to send message.");
          return;
        }

        const sendData = await sendResponse.json();
        console.log("sendMessageAPI data:", sendData);
      }

      const aiResponse = await chatClient.askAI(trimmed, calendarId);

      if (!aiResponse.ok) {
        addAssistantMessage("Failed to get AI response.");
        return;
      }

      const aiData = await aiResponse.json();
      console.log("askAI data:", aiData);
      addAssistantMessage(aiData.response);
    } catch (error) {
      console.error(error);
      addAssistantMessage("Something went wrong while sending the message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendCurrentDraft();
  };

  const handleMicClick = async () => {
    if (isLoading) return;

    if (isRecording) {
      stopMicrophoneInput();
      return;
    }

    if (hasMicDraft && draft.trim()) {
      await sendCurrentDraft();
      return;
    }

    setIsRecording(true);
    setHasMicDraft(false);

    try {
      const text = await startMicrophoneInput();

      if (text && text.trim()) {
        setDraft(text);
        setHasMicDraft(true);
      } else {
        addAssistantMessage("Could not transcribe microphone input.");
      }
    } catch (error) {
      console.error(error);
      addAssistantMessage("Microphone transcription failed.");
    } finally {
      setIsRecording(false);
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
                message.role === "user"
                  ? "primary.contrastText"
                  : "text.primary",
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
          onChange={(event) => {
            setDraft(event.target.value);
            setHasMicDraft(false);
          }}
          sx={{ flex: 1 }}
        />

        <Button type="submit" disabled={!draft.trim() || isLoading}>
          Send
        </Button>

        <Button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading}
          sx={{
            backgroundColor: isRecording ? "error.main" : undefined,
            color: isRecording ? "error.contrastText" : undefined,
            "&:hover": {
              backgroundColor: isRecording ? "error.dark" : undefined,
            },
          }}
        >
          {isRecording ? "⏹" : hasMicDraft ? "📨" : "🎤"}
        </Button>
      </Box>
    </Stack>
  );
};