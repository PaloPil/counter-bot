package events

import (
	"log"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	bolt "go.etcd.io/bbolt"
)

func MessageDeleteEventHandler(l *log.Logger, db *bolt.DB) func(*bot.EventContext) {
	return func(ctx *bot.EventContext) {
		var deletion struct {
			ChannelID string   `json:"channel_id"`
			ID        string   `json:"id"`
			IDs       []string `json:"ids"`
		}
		if err := ctx.Decode(&deletion); err != nil {
			l.Print(err)
			return
		}
		if deletion.ID != "" {
			deletion.IDs = append(deletion.IDs, deletion.ID)
		}
		if err := utils.DbDeleteMessageValues(db, deletion.ChannelID, deletion.IDs); err != nil {
			l.Print(err)
		}
	}
}
