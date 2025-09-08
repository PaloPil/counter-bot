# Counter Bot for Discord

A Discord bot that creates and manages counting channels where users must count sequentially. Users who break the counting sequence are temporarily muted.

## Features

- ✅ Sequential number counting validation
- 🔇 Automatic timeout/muting for rule violations
- 🎯 Configurable counting channels and timeout roles
- 🎨 Customizable reaction emojis
- 🧮 Mathematical expression evaluation (optional)
- 🌐 Multi-language support (English/French)
- 🛡️ Input validation and security measures

## Setup

### Prerequisites

- Node.js 18.0.0 or higher
- Discord Bot Token
- A Discord server with appropriate permissions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TotoB12/counter-bot-epita.git
cd counter-bot-epita
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your Discord bot token:
```env
DISCORD_TOKEN=your_discord_bot_token_here
MATHEVAL_URL=localhost:3000  # Optional: for math expression evaluation
NODE_ENV=production
```

### Running the Bot

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Configuration

Use the `/setup` command in your Discord server to configure the bot:

- **Channel**: The text channel where counting will take place
- **Timeout Role**: Role assigned to users when they break counting rules
- **Timeout Duration**: How long users are muted (in minutes)
- **Starting Number**: The number to start counting from
- **Emoji**: Reaction emoji for correct numbers (or "no" to disable)

## Usage

1. Run `/setup` command with appropriate parameters
2. Users count sequentially in the designated channel
3. Users who send incorrect numbers, repeat numbers, or edit/delete their messages are temporarily muted
4. The bot reacts to correct numbers with the configured emoji

## Development

### Code Quality

The project uses ESLint for code formatting and quality:

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Project Structure

```
├── commands/          # Slash commands
│   └── setup.js      # Bot configuration command
├── events/           # Discord event handlers
│   ├── ready.js      # Bot ready event
│   ├── messageCreate.js    # New message handling
│   ├── messageUpdate.js    # Message edit handling
│   ├── messageDelete.js    # Message deletion handling
│   └── interactionCreate.js # Slash command handling
├── lib/              # Utility functions
│   └── utils.js      # Core bot utilities
├── guilds/           # Guild configuration storage (auto-created)
├── index.js          # Main bot entry point
└── package.json      # Dependencies and scripts
```

## Security Features

- Environment variable validation
- Input sanitization for mathematical expressions
- File path validation
- Rate limiting protection
- Suspicious input detection

## License

ISC License - see package.json for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint:fix`
5. Test your changes
6. Submit a pull request
