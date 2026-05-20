# Loan Prequalify Telegram

Static multi-step debt prequalification form:

- `index.html`
- `styles.css`
- `script.js`
- `assets/logo.svg`

## Telegram setup (required)

1. Copy `telegram-config.sample.php` to `telegram-config.php` (or edit the included `telegram-config.php`).
2. Open **`telegram-config.php`** and set:
   - **`bot_token`** — from @BotFather
   - **`chat_id`** — numeric ID of the chat where leads should appear (often starts with `-` for groups/channels)

Example:

```php
return [
    'bot_token' => '123456789:AA...',
    'chat_id' => '-1001234567890',
];
```

3. Upload **`telegram.php`** and **`telegram-config.php`** next to **`index.html`** on your server.

`telegram.php` only reads credentials from **`telegram-config.php`** (or from env vars `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` if those strings are left empty). Nothing secret is sent to the browser.

## Submit endpoint

The form POSTs JSON to **`telegram.php`**. On success, the browser redirects to the LendingTree URL configured in `script.js`.

Override the endpoint in `index.html` if needed:

```html
<script>
  window.__QUOTE_API_ENDPOINT__ = "https://yourdomain.com/telegram.php";
</script>
```

## Troubleshooting

- **“Telegram credentials are not configured”** — `telegram-config.php` is missing, not uploaded to the same folder as `telegram.php`, or `bot_token` / `chat_id` are still empty.
- **`telegram-config.php` missing** — Copy `telegram-config.sample.php` to `telegram-config.php` and fill in values.
