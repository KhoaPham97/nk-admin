import { FC, useEffect, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { API_ENDPOINTS } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatGPTWidget: FC = () => {
  const [open, setOpen] = useState(false);

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào 👋 Tôi là trợ lý NHẬT KHANG BIKE. Bạn cần tìm phụ tùng hoặc tư vấn sản phẩm gì?",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = message.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setMessage("");
    setLoading(true);

    try {
      const history = messages.map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const response = await fetch(API_ENDPOINTS.CHATGPT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra");
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Xin lỗi, hiện tại tôi không thể kết nối. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* CHAT BUTTON */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="
            fixed bottom-6 right-6 z-[9998]
            flex h-14 w-14 items-center justify-center
            rounded-full bg-blue-600
            text-white shadow-xl
            transition-all duration-300
            hover:scale-110 hover:bg-blue-700
          "
          title="Chat với NHẬT KHANG BIKE"
        >
          <FiMessageCircle className="text-2xl" />

          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            AI
          </span>
        </button>
      )}

      {/* CHAT BOX */}
      {open && (
        <div
          className="
            fixed bottom-5 right-5 z-[9999]
            flex h-[600px] w-[380px]
            max-w-[calc(100vw-24px)]
            flex-col overflow-hidden
            rounded-2xl border border-gray-200
            bg-white shadow-2xl
          "
        >
          {/* HEADER */}
          <div className="flex items-center justify-between bg-blue-600 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600">
                <FiMessageCircle className="text-xl" />
              </div>

              <div>
                <div className="font-bold">NHẬT KHANG BIKE</div>

                <div className="text-xs text-blue-100">
                  Trợ lý AI • Đang hoạt động
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                flex h-9 w-9 items-center justify-center
                rounded-full
                transition hover:bg-blue-700
              "
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="space-y-4">
              {messages.map((item, index) => {
                const isUser = item.role === "user";

                return (
                  <div
                    key={index}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`
                        max-w-[85%]
                        rounded-2xl px-4 py-3
                        text-sm leading-6
                        ${
                          isUser
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md bg-white text-gray-800 shadow-sm"
                        }
                      `}
                    >
                      {item.content}
                    </div>
                  </div>
                );
              })}

              {/* LOADING */}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* INPUT */}
          <div className="border-t bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về sản phẩm..."
                disabled={loading}
                className="
                  min-w-0 flex-1
                  bg-transparent
                  text-sm
                  outline-none
                  placeholder:text-gray-400
                "
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                className="
                  flex h-10 w-10
                  shrink-0 items-center justify-center
                  rounded-lg bg-blue-600
                  text-white
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:bg-gray-300
                "
              >
                <FiSend />
              </button>
            </div>

            <div className="mt-2 text-center text-[10px] text-gray-400">
              AI có thể trả lời chưa chính xác. Hãy kiểm tra thông tin sản phẩm.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatGPTWidget;
