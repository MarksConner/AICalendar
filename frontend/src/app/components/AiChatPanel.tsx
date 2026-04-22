import { useEffect, useMemo, useState } from "react";
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
import { ThinkingSymbol } from "../design_system/components/ui/ThinkingSymbol";

// Chat message construct
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};


// Initial message, used when chat is empty. Type ChatMessage array
const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi! Ask me about your schedule and I can help plan your day.",
  },
];

const CHAT_ID_KEY = "chat_id";

export const AiChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages); // First message in messages is the initial state.
  const [draft, setDraft] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicDraft, setHasMicDraft] = useState(false);

  const chatClient = useMemo(() => new ChatClient(), []);


// Wrapp
  const resetToWelcome = () => {
    setMessages(initialMessages);
  };

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

  const parseSenderIs = (value: any): boolean | null => {
    if (value === true) return true;
    if (value === false) return false;

    if (value === 1) return true;
    if (value === 0) return false;

    if (value === "true") return true;
    if (value === "false") return false;

    if (value === "1") return true;
    if (value === "0") return false;

    return null;
  };

  const getMessageRole = (msg: any): "user" | "assistant" => {
    const senderIs = parseSenderIs(msg.sender_is);

    if (senderIs !== null) {
      return senderIs ? "user" : "assistant";
    }

    if (msg.role === "user") return "user";
    if (msg.role === "assistant") return "assistant";

    return "assistant";
  };

  useEffect(() => {
    const savedChatId = localStorage.getItem(CHAT_ID_KEY);

    if (!savedChatId) {
      resetToWelcome();
      return;
    }

    setChatId(savedChatId);
    loadPreviousMessages(savedChatId);
  }, []);

  async function loadPreviousMessages(existingChatId: string) {
    setIsHistoryLoading(true);

    try {
      const response = await chatClient.getChatHistoryAPI(existingChatId);

      if (!response.ok) {
        localStorage.removeItem(CHAT_ID_KEY);
        setChatId(null);
        resetToWelcome();
        return;
      }

      const historyData = await response.json();

      const history = Array.isArray(historyData)
        ? historyData
        : Array.isArray(historyData.messages)
        ? historyData.messages
        : [];

      if (history.length === 0) {
        resetToWelcome();
        return;
      }

      setMessages(
        history.map((msg: any, index: number) => ({
          id: String(msg.message_id ?? msg.id ?? `message-${index}`),
          role: getMessageRole(msg),
          text: String(msg.text ?? msg.content ?? ""),
        }))
      );
    } catch (error) {
      console.error("Failed to load previous messages:", error);
      resetToWelcome();
    } finally {
      setIsHistoryLoading(false);
    }
  }

  const sendCurrentDraft = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isLoading || isHistoryLoading) return;

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

      let currentChatId = chatId || localStorage.getItem(CHAT_ID_KEY);

      if (!currentChatId) {
        const createResponse = await chatClient.createChatAPI(trimmed);

        if (!createResponse.ok) {
          addAssistantMessage("Failed to create chat.");
          return;
        }

        const createData = await createResponse.json();
        console.log("createChatAPI data:", createData);

        currentChatId =
          typeof createData.chat_id === "string"
            ? createData.chat_id
            : typeof createData.chat?.chat_id === "string"
            ? createData.chat.chat_id
            : typeof createData.chat_id?.chat_id === "string"
            ? createData.chat_id.chat_id
            : null;

        if (!currentChatId) {
          addAssistantMessage("Chat was created but chat_id was invalid.");
          return;
        }

        localStorage.setItem(CHAT_ID_KEY, currentChatId);
        setChatId(currentChatId);
      } else {
        const sendResponse = await chatClient.sendMessageAPI(
          currentChatId,
          trimmed,
          true
        );

        if (!sendResponse.ok) {
          addAssistantMessage("Failed to send message.");
          return;
        }

        const sendData = await sendResponse.json();
        console.log("sendMessageAPI data:", sendData);
      }

      const aiResponse = await chatClient.askAI(trimmed, calendarId,chatId);

      if (!aiResponse.ok) {
        addAssistantMessage("Failed to get AI response.");
        return;
      }

      const aiData = await aiResponse.json();
      console.log("askAI data:", aiData);

    const assistantText = Array.isArray(aiData.results)
      ? aiData.results
          .map((item: any) => `• ${item.response ?? item.error ?? item.message}`)
          .filter(Boolean)
          .join("\n")
      : String(aiData.response ?? aiData.message ?? aiData.error ?? "No response returned.");
          
        addAssistantMessage(assistantText);

      if (currentChatId) {
        const saveAssistantResponse = await chatClient.sendMessageAPI(
          currentChatId,
          assistantText,
          false
        );

        if (!saveAssistantResponse.ok) {
          console.error("Failed to persist assistant message.");
        }
      }
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
    if (isLoading || isHistoryLoading) return;

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

        {(isLoading || isHistoryLoading) && (
          <Box
            sx={{
              alignSelf: "flex-start",
              maxWidth: "85%",
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: "background.paper",
              color: "text.primary",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <ThinkingSymbol />
          </Box>
        )}
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
        <Button
          type="submit"
          disabled={!draft.trim() || isLoading || isHistoryLoading}
        >
          Send
        </Button>
        <Button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading || isHistoryLoading}
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