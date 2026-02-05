# Отчет об инцидентах и диагностике (2026-02-05)

## 1. Анализ "Утечки" (GitGuardian)

**Инцидент:** `1 internal secret incident detected! Generic Password`
**Файл:** `client/lib/secure-settings-storage.ts` (строки 11-29)
**Статус:** ✅ **Ложное срабатывание (False Positive)**

**Разбор:**
Система GitGuardian среагировала на наличие строки `"erp.password"` в массиве `SETTINGS_HIGH_SEC_PATHS`.

```typescript
export const SETTINGS_HIGH_SEC_PATHS = [
  "erp.url",
  "erp.apiKey",
  "erp.username",
  "erp.password", // <--- Триггер
  "erp.specUrl",
];
```

Это **схема ключей** (названия свойств), по которым приложение сохраняет данные в SecureStore. Самих значений (паролей) в коде нет. Код безопасен.

## 2. Критическая ошибка (500 Internal Server Error)

**Ошибка:** `Cannot read properties of undefined (reading 'validateToken')`
**Источник:** `server/src/modules/auth/auth.guard.ts`
**Причина:** В модуле `RulebookModule` использовался `AuthGuard`, но отсутствовал импорт `AuthModule`. Это приводило к тому, что зависимость `AuthService` не внедрялась (Dependency Injection failure).
**Решение:** Добавлен `imports: [AuthModule]` в `server/src/modules/rules/rulebook.module.ts`.

## 3. Логи и Предупреждения (Terminal Logs)

### Предупреждения (Warnings)

- `SafeAreaView has been deprecated`: Исходит из библиотеки `react-native-image-viewing` или других UI-зависимостей. В коде проекта (`ChatScreen.tsx`) используется актуальный `useSafeAreaInsets`. Не требует немедленных действий.
- `ImagePicker.MediaTypeOptions`: Предупреждение о будущем устаревании API в `expo-image-picker`. Не блокирует работу.

### Информационные (Info)

- `AUTH_SUCCESS`, `Local Vector Store initialized`: Нормальные логи работы системы.

## 4. Биометрия (UX Optimization)

**Проблема:** Двойной запрос биометрии (при входе на экран и при сохранении).
**Решение:** Отключен флаг `requireAuthentication: true` в `secure-settings-storage.ts`.
**Результат:** Приложение проверяет биометрию только один раз — при входе в защищенный раздел настроек (`useProtectScreen`). Сохранение происходит без повторного системного промпта.
