"use client";

import React from "react";
import useChatAll from "./hooks/useChatAll";
import ChatSuggestions from "./components/ChatSuggestions";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";

function Chat() {
  const {
    chatInput,
    setChatInput,
    messages,
    showSuggestions,
    isLoading,
    chatSuggestions,
    handleSendMessage,
    handleSuggestionClick,
    handleInputChange,
  } = useChatAll();

  return (
    <div className="max-h-screen flex flex-col items-center px-4">
      <div className=" flex flex-col justify-center items-center gap*8 max-w-4xl w-full">
        <div className="flex overflow-auto">
          {messages.length === 0 && showSuggestions ? (
            <ChatSuggestions
              suggestions={chatSuggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          ) : (
            <ChatMessages messages={messages} isLoading={isLoading} />
          )}
        </div>
        <ChatInput
          chatInput={chatInput}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default Chat;
