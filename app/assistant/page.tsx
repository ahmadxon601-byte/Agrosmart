"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";

import styles from "./assistant.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "rule-based";
};

export default function AssistantPage() {
  const messageIdRef = useRef(1);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Savol bering. Men ekin, sug'orish va dala ishlari bo'yicha qisqa amaliy tavsiya beraman.",
      mode: "ai"
    }
  ]);

  const quickPrompts = useMemo(
    () => [
      "Bugun sug'orish kerakmi?",
      "Qaysi ekinni ekkanim ma'qul?",
      "Yomg'ir bo'lsa rejani qanday o'zgartiray?",
      "Hozir dala ishini qaysi vaqtda qilgan yaxshi?"
    ],
    []
  );

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) return;

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isSending]);

  async function sendMessage(customQuestion?: string) {
    const nextQuestion = (customQuestion ?? question).trim();

    if (!nextQuestion || isSending) {
      return;
    }

    const nextMessageId = () => `msg-${messageIdRef.current++}`;
    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      content: nextQuestion
    };

    const history = messages
      .filter((message) => message.id !== "welcome")
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          history
        })
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        mode?: "ai" | "rule-based";
      };

      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: data.answer ?? data.error ?? "Javob olinmadi.",
        mode: data.mode ?? "rule-based"
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          content: "So'rov yuborilmadi. Tarmoq yoki server holatini tekshiring.",
          mode: "rule-based"
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <section className={styles.chatShell}>
            <header className={styles.chatHeader}>
              <div>
                <p>AgroSmart AI</p>
                <h1>Dehqon yordamchisi</h1>
              </div>
              <span>{isSending ? "Javob yozmoqda" : "Online"}</span>
            </header>

            <div ref={messageListRef} className={styles.messageList}>
              {messages.length === 1 ? (
                <div className={styles.emptyState}>
                  <h1>Bugun dalada nima qilamiz?</h1>
                  <p>{messages[0].content}</p>
                  <div className={styles.promptGrid}>
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className={styles.promptButton}
                        onClick={() => void sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message, index) => {
                if (index === 0 && messages.length === 1) {
                  return null;
                }

                return (
                  <article
                    key={message.id}
                    className={message.role === "user" ? styles.userMessage : styles.assistantMessage}
                  >
                    <div className={styles.messageAvatar}>{message.role === "user" ? "S" : "AI"}</div>
                    <div className={styles.messageBody}>
                      <div className={styles.messageMeta}>
                        <small>{message.role === "user" ? "Siz" : "AgroSmart"}</small>
                        {message.role === "assistant" ? (
                          <span>{message.mode === "ai" ? "AI" : "Rule-based"}</span>
                        ) : null}
                      </div>
                      <p>{message.content}</p>
                    </div>
                  </article>
                );
              })}

              {isSending ? (
                <article className={`${styles.assistantMessage} ${styles.typingMessage}`}>
                  <div className={styles.messageAvatar}>AI</div>
                  <div className={styles.typingDots} aria-label="Javob yozilmoqda">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              ) : null}
            </div>

            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Savol yozing..."
                rows={1}
              />
              <button type="submit" disabled={isSending || !question.trim()} aria-label="Yuborish">
                ↑
              </button>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}
