package events

import (
	"log"
	"palopil/counter-bot/src/utils"
	"time"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/snowflake"
	bolt "go.etcd.io/bbolt"
)

func MessageUpdateEventHandler(l *log.Logger, db *bolt.DB) func(*bot.MessageUpdateContext) {
	return func(ctx *bot.MessageUpdateContext) {
		// Inspect the raw event: cached messages can retain an old edit timestamp
		// when Discord only updates embeds or other metadata.
		var update struct {
			EditedTimestamp *time.Time   `json:"edited_timestamp"`
			GuildID         snowflake.ID `json:"guild_id,string"`
		}
		if err := ctx.Decode(&update); err != nil {
			l.Print(err)
			return
		}
		if update.EditedTimestamp == nil {
			return
		}
		cfg, err := utils.DbGetConfig(db, update.GuildID.String())
		if err != nil || ctx.ChannelID.String() != cfg.CountingChannelID {
			return
		}
		if ctx.Author != nil && ctx.Author.Bot {
			return
		}
		original, originalErr := utils.DbGetMessageValue(db, ctx.ChannelID.String(), ctx.ID.String())
		// Fetch the current content because update payloads may be partial.
		message, err := ctx.Bot.Rest.GetChannelMessage(ctx.Context(), ctx.ChannelID, ctx.ID)
		if err != nil {
			l.Print(err)
			return
		}
		if message.Author != nil && message.Author.Bot {
			return
		}
		value, evalErr := utils.EvalExpr(message.Content, l)
		if originalErr == nil && evalErr == nil && value == original {
			return
		}
		if originalErr == nil {
			utils.PunishAuthor(&ctx.BaseContext, update.GuildID, message, cfg, l, db)
			return
		}
		if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), ctx.ChannelID, ctx.ID); err != nil {
			l.Printf("Failed to delete edited counting message %s: %v", ctx.ID, err)
		}
	}
}
