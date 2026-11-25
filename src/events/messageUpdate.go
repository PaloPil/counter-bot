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
		// Fetch the current content because update payloads may be partial.
		message, err := ctx.Bot.Rest.GetChannelMessage(ctx.Context(), ctx.ChannelID, ctx.ID)
		if err != nil {
			l.Print(err)
			return
		}
		if message.Author != nil && message.Author.Bot {
			return
		}
		previous, previousValue, err := getPreviousMessage(&ctx.BaseContext, message.ChannelID, message.ID, l)
		if err != nil {
			l.Print(err)
			return
		}
		value, evalErr := utils.EvalExpr(message.Content, l)
		if message.Author != nil && evalErr == nil && followsPreviousMessage(message, previous, value, previousValue) {
			return
		}
		utils.PunishAuthor(&ctx.BaseContext, update.GuildID, message, cfg, l, db)
	}
}
