import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { localVectorStore, LocalDocument } from "./vector-store";
import { embeddingService } from "./embedding-service";
import { getApiUrl } from "../query-client";
import { AppLogger } from "../logger";

interface ExtractedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  text: string;
  chunks: string[];
}

export class DocumentIndexer {
  /**
   * Pick file -> send to server for text extraction -> store in local SQLite.
   * Server is stateless: extracts text, returns it, stores nothing.
   */
  async indexPickedDocument(): Promise<LocalDocument | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const file = result.assets[0];
      if (!file) return null;

      AppLogger.info(`Processing document: ${file.name}`, undefined, "RAG");

      // Send file to server for text extraction
      const extracted = await this.extractViaServer(file);
      if (!extracted) return null;

      // Store in local SQLite (no embeddings at upload time)
      const doc: LocalDocument = {
        id: extracted.id,
        name: extracted.name,
        content: extracted.text,
        embedding: null,
        metadata: {
          type: extracted.type,
          size: extracted.size,
          chunks: extracted.chunks.length,
          mimeType: file.mimeType,
        },
        createdAt: Date.now(),
      };

      await localVectorStore.addDocument(doc);
      AppLogger.info(
        `Document stored locally: ${file.name} (${extracted.chunks.length} chunks)`,
        undefined,
        "RAG",
      );
      return doc;
    } catch (error) {
      AppLogger.error("Failed to process document", error, "RAG");
      return null;
    }
  }

  /**
   * Send file to server POST /api/documents/upload for text extraction.
   * Server extracts text, returns { id, name, type, size, text, chunks }.
   */
  private async extractViaServer(
    file: DocumentPicker.DocumentPickerAsset,
  ): Promise<ExtractedDocument | null> {
    try {
      const baseUrl = getApiUrl();
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append("file", blob, file.name);
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as unknown as Blob);
      }
      formData.append("name", file.name);

      const url = new URL("/api/documents/upload", baseUrl);

      // Use manual fetch with auth token (apiRequest doesn't support FormData)
      const { useAuthStore } = await import("@/store/authStore");
      const token = useAuthStore.getState().getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Upload failed: ${response.status}`);
      }

      return (await response.json()) as ExtractedDocument;
    } catch (error) {
      AppLogger.error("Server text extraction failed", error, "RAG");
      return null;
    }
  }

  /**
   * Search local documents: try text search (no embeddings needed).
   * Falls back to embedding search if embeddings exist.
   */
  async searchLocal(query: string) {
    // Text search first (works without embeddings/API key)
    const textResults = await localVectorStore.textSearch(query);
    if (textResults.length > 0) return textResults;

    // Fall back to embedding search if available
    try {
      const queryEmbedding = await embeddingService.getEmbedding(query);
      const hasRealEmbedding = queryEmbedding.some((v) => v !== 0);
      if (hasRealEmbedding) {
        return localVectorStore.search(queryEmbedding);
      }
    } catch {
      // Embedding service unavailable, text search is sufficient
    }

    return textResults;
  }
}

export const documentIndexer = new DocumentIndexer();
