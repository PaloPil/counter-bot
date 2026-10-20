package commands

import (
	"log"

	"github.com/discord-go/discord.go/bot"
	bolt "go.etcd.io/bbolt"
)

func RegisterCommands(router *bot.Router, l *log.Logger, db *bolt.DB) {
	SetupRegister(router, db)
	PurgeRegister(router)
}
