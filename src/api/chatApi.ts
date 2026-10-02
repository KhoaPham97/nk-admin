// src/api/chatApi.ts

import axios from "axios";
import { BASE_URL, DEFAUL_URL } from "../api";
export const CHAT_API_URL = BASE_URL;

export const CHAT_SOCKET_URL = DEFAUL_URL;

const chatApi = axios.create({
  baseURL: CHAT_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ProductContext {
  productId?: string;
  name?: string;
  code?: string;
  price?: number;
  image?: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderType: "customer" | "admin";
  senderId?: string | null;
  message: string;
  images?: string[];
  product?: ProductContext;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  _id: string;
  customerId: any;
  status: "open" | "closed";
  lastMessage: string;
  lastMessageAt: string;
  unreadCustomer: number;
  unreadAdmin: number;
  productContext?: ProductContext;
  createdAt: string;
  updatedAt: string;
}

export const getOrCreateConversation = async (
  customerId: string,
  product?: ProductContext,
) => {
  const response = await chatApi.post("/chat/conversation", {
    customerId,
    product,
  });

  return response.data;
};

export const getMessages = async (conversationId: string) => {
  const response = await chatApi.get(
    `/chat/conversation/${conversationId}/messages`,
  );

  return response.data;
};

export const sendMessageApi = async (
  conversationId: string,
  data: {
    senderType: "customer" | "admin";
    senderId?: string;
    message?: string;
    images?: string[];
    product?: ProductContext;
  },
) => {
  const response = await chatApi.post(
    `/chat/conversation/${conversationId}/message`,
    data,
  );

  return response.data;
};

export const markChatRead = async (
  conversationId: string,
  readerType: "customer" | "admin",
) => {
  const response = await chatApi.put(
    `/chat/conversation/${conversationId}/read`,
    {
      readerType,
    },
  );

  return response.data;
};

export const getAdminConversations = async (status = "open") => {
  const response = await chatApi.get(`/chat/admin/conversations`, {
    params: {
      status,
      page: 1,
      limit: 100,
    },
  });

  return response.data;
};

export const closeConversation = async (conversationId: string) => {
  const response = await chatApi.put(
    `/chat/conversation/${conversationId}/close`,
  );

  return response.data;
};

export default chatApi;
