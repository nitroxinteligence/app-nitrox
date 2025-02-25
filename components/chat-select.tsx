"use client"

// components/chat-select.tsx
import type React from "react"
import { useState, useEffect } from "react"
import { Select } from "antd"
import { useQuery } from "@apollo/client"
import { GET_CONVERSATIONS } from "../graphql/queries"
import type { Conversation } from "../types/Conversation"

interface ChatSelectProps {
  onSelect: (conversationId: string) => void
}

const { Option } = Select

const ChatSelect: React.FC<ChatSelectProps> = ({ onSelect }) => {
  const { loading, error, data } = useQuery(GET_CONVERSATIONS)
  const [selectedConversationId, setSelectedConversationId] = useState("")

  useEffect(() => {
    if (data?.getConversations) {
      // Select the first conversation by default if available
      if (data.getConversations.length > 0) {
        setSelectedConversationId(data.getConversations[0].id)
        onSelect(data.getConversations[0].id)
      }
    }
  }, [data, onSelect])

  if (loading) return <p>Loading conversations...</p>
  if (error) return <p>Error loading conversations: {error.message}</p>

  const conversations: Conversation[] | undefined = data?.getConversations

  //Declare variables here to address undeclared variable errors.  These are placeholders;  replace with actual values or imports as needed.
  const brevity = "brief"
  const it = "it"
  const is = "is"
  const correct = "correct"
  const and = "and"

  return (
    <Select
      value={selectedConversationId}
      onChange={(value) => {
        setSelectedConversationId(value)
        onSelect(value)
      }}
      style={{ width: 200 }}
      placeholder="Select a conversation"
    >
      {conversations?.map((conversation) => (
        <Option key={conversation.id} value={conversation.id}>
          {conversation.participants.map((participant) => participant.name).join(", ")}
        </Option>
      ))}
    </Select>
  )
}

export default ChatSelect

