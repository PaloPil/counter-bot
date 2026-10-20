package events

import (
	"log"

	"github.com/discord-go/discord.go/bot"
	bolt "go.etcd.io/bbolt"
)

func RegisterEvents(b *bot.Bot, l *log.Logger, db *bolt.DB) {
	b.OnMessageCreate(MessageCreateEventHandler(l, db))
}
