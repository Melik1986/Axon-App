# Error Handling в AXON

## 📋 Обзор

AXON использует **централизованную систему обработки ошибок** с типизированными ошибками, user-friendly сообщениями и автоматическим логированием.

---

## 🏗️ Архитектура

### **Backend (NestJS)**

```
server/src/
├── filters/
│   ├── global-exception.filter.ts      ← Централизованный обработчик всех ошибок
│   └── llm-provider-exception.filter.ts ← Специализированный для LLM API ошибок
```

**Особенности:**

- Стандартизированный формат `ErrorResponse` с `ErrorCode` enum
- Приоритетная обработка LLM ошибок (без утечки API ключей)
- Автоматический маппинг HTTP статусов на error codes
- Логирование всех исключений через `AppLogger`

### **Frontend (React Native)**

```
client/
├── lib/
│   └── error-handler.ts                ← Централизованная библиотека обработки ошибок
├── components/
│   ├── ErrorBoundary.tsx               ← React Error Boundary
│   └── ErrorFallback.tsx               ← UI для критических ошибок
```

**Особенности:**

- Парсинг API ошибок с типизацией
- User-friendly сообщения для всех error codes
- Classification (recoverable, requires reauth, etc.)
- Offline-first fallback для ERP данных

### **Shared Types**

```
shared/types.ts
├── ErrorResponse interface             ← Формат ошибки от API
└── ErrorCode enum                      ← Коды всех типов ошибок
```

---

## 📝 Error Response Format

### **Стандартный формат ответа**

```typescript
interface ErrorResponse {
  statusCode: number; // HTTP статус (400, 401, 500, etc.)
  message: string; // User-friendly сообщение
  error?: string; // Тип ошибки (для совместимости)
  code?: string; // ErrorCode (LLM_PROVIDER_ERROR, etc.)
  details?: string; // Дополнительные детали
  timestamp: string; // ISO 8601 timestamp
  path?: string; // Путь API endpoint
}
```

### **Пример ответа с ошибкой**

```json
{
  "statusCode": 502,
  "message": "LLM Provider unavailable, check API key settings",
  "code": "LLM_INVALID_API_KEY",
  "details": "Invalid API key",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/chat"
}
```

---

## 🔢 Error Codes

### **LLM Provider Errors**

- `LLM_PROVIDER_ERROR` — Общая ошибка провайдера
- `LLM_INVALID_API_KEY` — Неверный API ключ
- `LLM_RATE_LIMIT` — Превышен rate limit
- `LLM_QUOTA_EXCEEDED` — Превышена квота
- `LLM_CONTEXT_LENGTH` — Превышена длина контекста

### **ERP Errors**

- `ERP_CONNECTION_ERROR` — Ошибка подключения к ERP
- `ERP_AUTHENTICATION_ERROR` — Ошибка аутентификации
- `ERP_INVALID_RESPONSE` — Невалидный ответ от ERP

### **RAG Errors**

- `RAG_VECTOR_STORE_ERROR` — Ошибка vector store (Qdrant)
- `RAG_EMBEDDING_ERROR` — Ошибка генерации эмбеддингов

### **Auth Errors**

- `AUTH_INVALID_TOKEN` — Невалидный токен
- `AUTH_TOKEN_EXPIRED` — Токен истёк
- `AUTH_INSUFFICIENT_PERMISSIONS` — Недостаточно прав

### **MCP Errors**

- `MCP_CONNECTION_ERROR` — Ошибка подключения к MCP серверу
- `MCP_TOOL_EXECUTION_ERROR` — Ошибка выполнения MCP tool

### **Guardian Errors**

- `GUARDIAN_RULE_VIOLATION` — Нарушение бизнес-правил
- `GUARDIAN_VALIDATION_FAILED` — Провалена валидация

### **Generic Errors**

- `INTERNAL_ERROR` — Внутренняя ошибка сервера (500)
- `BAD_REQUEST` — Невалидный запрос (400)
- `UNAUTHORIZED` — Требуется аутентификация (401)
- `FORBIDDEN` — Доступ запрещён (403)
- `NOT_FOUND` — Ресурс не найден (404)
- `RATE_LIMIT_EXCEEDED` — Превышен rate limit (429)

---

## 🎯 Backend Usage

### **1. Автоматическая обработка (рекомендуется)**

Просто бросайте стандартные NestJS исключения:

```typescript
import { HttpException, HttpStatus } from "@nestjs/common";

// Будет автоматически обработано GlobalExceptionFilter
throw new HttpException("Product not found", HttpStatus.NOT_FOUND);
```

### **2. Кастомные бизнес-ошибки**

Бросайте HttpException с кастомным телом:

```typescript
throw new HttpException(
  {
    statusCode: HttpStatus.BAD_GATEWAY,
    message: "Cannot connect to 1C",
    code: "ERP_CONNECTION_ERROR",
    details: "Timeout after 30s",
  },
  HttpStatus.BAD_GATEWAY,
);
```

### **3. Создание Typed Exception (опционально, для будущего)**

```typescript
// server/src/common/exceptions/erp-connection.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@/shared/types";

export class ErpConnectionException extends HttpException {
  constructor(message: string, details?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        code: ErrorCode.ERP_CONNECTION_ERROR,
        details,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

// Usage
throw new ErpConnectionException("Failed to connect to 1C", "Timeout");
```

---

## 🎯 Frontend Usage

### **1. API Calls (query-client.ts)**

```typescript
import { apiRequest } from "@/lib/query-client";
import { getUserFriendlyMessage, logError } from "@/lib/error-handler";

try {
  const response = await apiRequest("POST", "/api/chat", { content: "Hello" });
  const data = await response.json();
} catch (error) {
  // error уже типизирован как ApiErrorResponse
  logError(error, "ChatScreen.sendMessage");

  // Получить user-friendly сообщение
  const message = getUserFriendlyMessage(error);
  Alert.alert("Error", message);
}
```

### **2. Hooks (useAxon, useVoice, etc.)**

```typescript
import {
  getUserFriendlyMessage,
  logError,
  parseApiError,
} from "@/lib/error-handler";

try {
  // ... some API call
} catch (error) {
  // Залогировать с контекстом
  logError(error, "useAxon.ask", {
    conversationId: currentConversationId,
    questionLength: question.length,
  });

  // Парсинг и user-friendly сообщение
  const apiError = parseApiError(error);
  const friendlyMessage = getUserFriendlyMessage(apiError);

  // Бросить с user-friendly сообщением
  throw new Error(friendlyMessage);
}
```

### **3. Error Classification**

```typescript
import { isRecoverableError, requiresReauthentication } from '@/lib/error-handler';

catch (error) {
  const apiError = parseApiError(error);

  // Требуется ли повторная аутентификация?
  if (requiresReauthentication(apiError)) {
    navigation.navigate('Login');
    return;
  }

  // Можно ли повторить запрос?
  if (isRecoverableError(apiError)) {
    setShowRetryButton(true);
  }
}
```

### **4. Offline-First с Fallback**

```typescript
// inventoryStore.ts pattern
try {
  const response = await fetch(`${baseUrl}api/1c/stock`);

  if (!response.ok) {
    const apiError = await extractErrorFromResponse(response);
    throw apiError;
  }

  const items = await response.json();
  set({ stockItems: items, lastSyncAt: Date.now() });
  return items;
} catch (error) {
  logError(error, "inventoryStore.fetchStock", {
    hasCachedData: get().stockItems.length > 0,
  });

  // Если есть кэш — вернуть его
  const cachedItems = get().stockItems;
  if (cachedItems.length > 0) {
    AppLogger.warn("Returning cached data:", getUserFriendlyMessage(error));
    return cachedItems;
  }

  // Если нет кэша — бросить user-friendly ошибку
  throw new Error(getUserFriendlyMessage(error));
}
```

---

## 🛡️ Error Boundary (React)

### **Использование ErrorBoundary**

```tsx
// App.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary
      onError={(error, stackTrace) => {
        // Отправить в аналитику (Sentry, etc.)
        console.error("App crashed:", error, stackTrace);
      }}
    >
      <Navigation />
    </ErrorBoundary>
  );
}
```

**Функциональность:**

- ✅ Ловит **все** необработанные ошибки в React tree
- ✅ Показывает красивый UI с кнопкой "Try Again"
- ✅ В dev mode — кнопка для просмотра stack trace
- ✅ Автоматический reload приложения при критических ошибках

---

## 📊 User-Friendly Messages

### **Автоматический маппинг**

Все error codes автоматически мапятся на user-friendly сообщения:

| Error Code             | User-Friendly Message                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `LLM_INVALID_API_KEY`  | Invalid API key. Please update your LLM settings.                    |
| `ERP_CONNECTION_ERROR` | Cannot connect to ERP system. Please check your connection settings. |
| `RATE_LIMIT_EXCEEDED`  | Too many requests. Please slow down and try again.                   |
| `AUTH_TOKEN_EXPIRED`   | Session expired. Please log in again.                                |

### **Customization**

Если сервер вернул кастомный `message`, он используется вместо дефолтного:

```typescript
// Backend
throw new HttpException(
  {
    message: 'Product "Apple" not found in warehouse "Main"',
    code: "NOT_FOUND",
  },
  HttpStatus.NOT_FOUND,
);

// Frontend получит именно это сообщение
```

---

## 🔍 Логирование

### **Backend (AppLogger)**

```typescript
import { AppLogger } from "./utils/logger";

try {
  // ...
} catch (error) {
  AppLogger.error("Failed to process chat", error, {
    userId: req.user.id,
    conversationId,
  });
  throw error;
}
```

### **Frontend (logError)**

```typescript
import { logError } from "@/lib/error-handler";

logError(error, "useAxon.ask", {
  conversationId: currentConversationId,
  questionLength: question.length,
});
```

**Особенности:**

- ✅ Автоматическое извлечение `statusCode`, `code`, `message` из ошибок
- ✅ Дополнительный metadata для debugging
- ✅ Логи в dev mode выводятся в консоль с цветами

---

## 🚀 Best Practices

### **✅ DO**

1. **Всегда используйте error-handler на клиенте:**

   ```typescript
   const message = getUserFriendlyMessage(error);
   ```

2. **Логируйте с контекстом:**

   ```typescript
   logError(error, "ComponentName.methodName", { userId, actionId });
   ```

3. **Используйте offline-first pattern для ERP:**

   ```typescript
   if (cachedData.length > 0) return cachedData;
   throw new Error(getUserFriendlyMessage(error));
   ```

4. **Проверяйте reauthentication:**
   ```typescript
   if (requiresReauthentication(error)) {
     navigation.navigate("Login");
   }
   ```

### **❌ DON'T**

1. **НЕ показывайте пользователю технические детали:**

   ```typescript
   // ❌ BAD
   Alert.alert("Error", error.stack);

   // ✅ GOOD
   Alert.alert("Error", getUserFriendlyMessage(error));
   ```

2. **НЕ игнорируйте ошибки:**

   ```typescript
   // ❌ BAD
   catch (error) { /* ignore */ }

   // ✅ GOOD
   catch (error) {
     logError(error, 'context');
     throw new Error(getUserFriendlyMessage(error));
   }
   ```

3. **НЕ делайте generic error handling:**

   ```typescript
   // ❌ BAD
   catch (error) {
     Alert.alert('Error', 'Something went wrong');
   }

   // ✅ GOOD
   catch (error) {
     const message = getUserFriendlyMessage(error);
     Alert.alert('Error', message);
   }
   ```

---

## 🔮 Future Improvements (LOW PRIORITY)

### **1. Typed Exception Classes**

Создать классы для каждого типа ошибок:

```typescript
// server/src/common/exceptions/
├── base.exception.ts
├── erp-connection.exception.ts
├── tool-execution.exception.ts
├── validation.exception.ts
└── index.ts
```

### **2. Retry Mechanisms**

Автоматический retry для recoverable errors:

```typescript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRecoverableError(error) || i === maxRetries - 1) {
        throw error;
      }
      await sleep(2 ** i * 1000); // Exponential backoff
    }
  }
}
```

### **3. Error Telemetry**

Интеграция с Sentry/Datadog для мониторинга:

```typescript
import * as Sentry from '@sentry/react-native';

logError(error, context, metadata) {
  // ...
  Sentry.captureException(error, {
    tags: { context },
    extra: metadata,
  });
}
```

### **4. Расширенная классификация**

Добавить больше типов classification:

```typescript
isNetworkError(error): boolean
isTimeoutError(error): boolean
isValidationError(error): boolean
getRetrySuggestion(error): { shouldRetry: boolean; delayMs: number }
```

---

## 📚 Связанные файлы

### **Backend**

- `server/src/filters/global-exception.filter.ts`
- `server/src/filters/llm-provider-exception.filter.ts`
- `server/src/main.ts` (регистрация фильтров)
- `server/src/utils/logger.ts`

### **Frontend**

- `client/lib/error-handler.ts`
- `client/lib/query-client.ts`
- `client/components/ErrorBoundary.tsx`
- `client/components/ErrorFallback.tsx`
- `client/hooks/useAxon.ts`
- `client/hooks/useVoice.ts`
- `client/store/inventoryStore.ts`

### **Shared**

- `shared/types.ts` (`ErrorResponse`, `ErrorCode`)

---

## 🎓 Примеры из реальных компонентов

### **useAxon.ts**

```typescript
try {
  const response = await apiRequest("POST", "/api/chat", payload);
  // ... process response
} catch (error) {
  logError(error, "useAxon.ask", {
    conversationId: currentConversationId,
    questionLength: question.length,
  });

  const apiError = parseApiError(error);
  const friendlyMessage = getUserFriendlyMessage(apiError);
  throw new Error(friendlyMessage);
}
```

### **useVoice.ts**

```typescript
if (!serverResponse.ok) {
  const apiError = await extractErrorFromResponse(serverResponse);
  throw apiError;
}

// ... later in catch
const friendlyMessage = getUserFriendlyMessage(err);
const isTranscriptionError =
  errorMsg.includes("transcri") || errorMsg.includes("whisper");

if (isTranscriptionError) {
  addMessage({
    role: "assistant",
    content:
      `⚠️ Voice transcription failed: ${friendlyMessage}\n\n` +
      `Check Settings → LLM Provider → Transcription Model.`,
  });
}
```

### **inventoryStore.ts**

```typescript
try {
  const response = await fetch(`${baseUrl}api/1c/stock${query}`);

  if (!response.ok) {
    const apiError = await extractErrorFromResponse(response);
    throw apiError;
  }

  return items;
} catch (error) {
  logError(error, "inventoryStore.fetchStock", {
    productName,
    hasCachedData: get().stockItems.length > 0,
  });

  // Offline-first fallback
  const cachedItems = get().stockItems;
  if (cachedItems.length > 0) {
    AppLogger.warn("Returning cached data:", getUserFriendlyMessage(error));
    return cachedItems;
  }

  throw new Error(getUserFriendlyMessage(error));
}
```

---

## ✅ Checklist для новых API endpoints

При создании нового API endpoint:

- [ ] Бросать HttpException с правильным statusCode
- [ ] Использовать ErrorCode из enum (если применимо)
- [ ] Добавить details для дополнительного контекста
- [ ] НЕ включать sensitive data (API keys, passwords) в details
- [ ] Логировать через AppLogger перед throw
- [ ] Документировать в Swagger (@ApiResponse)

При создании нового API call на клиенте:

- [ ] Использовать apiRequest() или authenticatedFetch()
- [ ] Обрабатывать ошибки через getUserFriendlyMessage()
- [ ] Логировать через logError() с контекстом
- [ ] Проверять requiresReauthentication() для 401
- [ ] Проверять isRecoverableError() для retry logic
- [ ] Добавить offline-first fallback (если применимо)

---

## 📞 Поддержка

Если обнаружена ошибка без user-friendly сообщения:

1. Добавить новый ErrorCode в `shared/types.ts`
2. Добавить маппинг в `ERROR_MESSAGES` в `client/lib/error-handler.ts`
3. Обновить backend для использования нового кода

Если нужна помощь:

- Изучить примеры выше
- Посмотреть `client/lib/error-handler.ts` для всех доступных функций
- Проверить `server/src/filters/global-exception.filter.ts` для backend логики
