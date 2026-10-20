package main

import (
	"log"
	"os"
	"palopil/counter-bot/src/commands"
	"palopil/counter-bot/src/events"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/intents"
)

func getToken(l *log.Logger) string {
	token := os.Getenv("DISCORD_TOKEN")
	if token == "" {
		l.Fatalln("Error: DISCORD_TOKEN isn't defined")
	}
	return token
}

func main() {
	l := log.New(os.Stderr, "[CNTR] ", 0)

	token := getToken(l)
	db := utils.DbOpen(l)
	defer utils.DbClose(db)

	router := bot.NewRouter()
	client := bot.New(token,
		bot.WithIntents(intents.Guilds),
		bot.WithRouter(router),
	)

	commands.RegisterCommands(router, l, db)
	events.RegisterEvents(client, l, db)

	if err := client.Run(); err != nil {
		l.Fatalln(err)
	}
}
