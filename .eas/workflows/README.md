# EAS CI/CD Workflows - Инструкция

## Обзор

Создана система CI/CD с использованием EAS Workflows для защиты веток `main` и `dev`. Реализованы те же проверки, что и в Husky pre-commit хуке:

- ✅ **lint-staged** - проверка кода и форматирования
- ✅ **gitleaks** - сканирование на утечки секретов
- ✅ **TypeScript** - проверка типов
- ✅ **npm audit** - аудит зависимостей на уязвимости

## Структура workflow файлов

```
.eas/workflows/
├── ci-cd.yml          # Общий CI/CD пайплайн
├── development.yml    # Workflow для dev ветки
└── production.yml     # Workflow для main ветки
```

## Workflow для dev ветки

**Файл:** `.eas/workflows/development.yml`

**Триггеры:** Push и PR в ветку `dev`

**Шаги:**
1. **Code Quality & Security** - проверки аналогичные Husky
2. **Development Build** - сборка APK для тестирования
3. **OTA Update** - деплой в development канал
4. **Notify Success** - уведомление об успехе

**Команда для запуска вручную:**
```bash
eas workflow:run development
```

## Workflow для main ветки

**Файл:** `.eas/workflows/production.yml`

**Триггеры:** Push и PR в ветку `main`

**Шаги:**
1. **Production Quality Gate** - строгие проверки безопасности
2. **Build iOS Production** - сборка для App Store
3. **Build Android Production** - сборка для Google Play
4. **Submit to App Store** - отправка в App Store Connect
5. **Submit to Google Play** - отправка в Google Play Console
6. **Production OTA** - деплой в production канал
7. **Production Complete** - итоговое уведомление

**Команда для запуска вручную:**
```bash
eas workflow:run production
```

## Настройка перед первым запуском

### 1. Убедитесь, что EAS CLI установлен:
```bash
npm install -g eas-cli
eas login
```

### 2. Проверьте настройки в `eas.json`:
- Профили `development` и `production` настроены корректно
- Каналы `development` и `production` определены в разделе `update`

### 3. Настройте credentials для публикации:

**Для iOS (App Store):**
```bash
eas credentials:manager
# Выберите iOS и следуйте инструкциям для настройки Apple Developer Account
```

**Для Android (Google Play):**
```bash
eas credentials:manager
# Выберите Android и загрузите service account key из Google Play Console
```

## Команды для работы с workflows

### Запуск workflow вручную:
```bash
# Запуск development workflow
eas workflow:run development

# Запуск production workflow
eas workflow:run production

# Запуск общего CI/CD workflow
eas workflow:run ci-cd
```

### Просмотр статуса workflow:
```bash
# Список всех запусков
eas workflow:list

# Детали конкретного запуска
eas workflow:view [WORKFLOW_ID]

# Логи workflow
eas build:view [BUILD_ID]
```

### Проверка logs в реальном времени:
```bash
eas build:logs [BUILD_ID]
```

## Защита веток

Workflow автоматически запускаются при:
- **Push** в ветку `main` или `dev`
- **Pull Request** в ветку `main` или `dev`

Если любая из проверок не пройдет (аналогично Husky):
- ❌ **lint-staged** найдет ошибки → Workflow остановится
- ❌ **gitleaks** обнаружит секреты → Workflow остановится
- ❌ **TypeScript** покажет ошибки типов → Workflow остановится
- ❌ **npm audit** найдет критические уязвимости → Workflow остановится

## Кэширование

Все workflow используют кэширование:
- **npm dependencies** - кэшируются между запусками
- **EAS builds** - кэшируются для ускорения сборки

## Уведомления

После успешного завершения workflow:
- **Dev workflow** → OTA update доступен в development канале
- **Production workflow** → Приложение отправлено в сторы + OTA в production канале

## Отладка

Если workflow падает:

1. **Проверьте логи:**
   ```bash
   eas workflow:view [WORKFLOW_ID]
   ```

2. **Проверьте локально:**
   ```bash
   # Проверьте те же команды, что и в workflow
   npm run lint
   npm run check:types
   npx lint-staged
   ```

3. **Проверьте gitleaks локально:**
   ```bash
   # Убедитесь, что Docker запущен
   docker run --rm -v $(pwd):/workspace zricethezav/gitleaks:latest detect --source /workspace
   ```

## Безопасность

- Все workflow используют те же проверки безопасности, что и Husky
- Gitleaks сканирует на наличие секретов в каждом коммите
- Запуск workflow требует аутентификации в EAS

## Поддержка

При проблемах:
1. Проверьте логи workflow
2. Убедитесь, что все credentials настроены
3. Проверьте, что Docker запущен (для gitleaks в Husky)
4. Обратитесь к документации EAS: https://docs.expo.dev/build/eas-workflows/