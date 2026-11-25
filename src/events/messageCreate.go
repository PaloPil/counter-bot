package events

import (
	"log"
	"math"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/messages"
	"github.com/discord-go/discord.go/rest"
	"github.com/discord-go/discord.go/snowflake"
	bolt "go.etcd.io/bbolt"
)

func getPreviousMessage(ctx *bot.BaseContext, channelID, before snowflake.ID, l *log.Logger) (*messages.Message, int64, error) {
	limit := 50
	for {
		history, err := ctx.Bot.Rest.GetChannelMessages(ctx.Context(), channelID, rest.GetMessagesParams{Before: &before, Limit: &limit})
		if err != nil {
			return nil, 0, err
		}
		for i := range history {
			message := &history[i]
			if message.Author == nil || message.Author.Bot {
				continue
			}
			value, err := utils.EvalExpr(message.Content, l)
			if err == nil {
				return message, value, nil
			}
		}
		if len(history) < limit {
			return nil, 0, nil
		}
		before = history[len(history)-1].ID
	}
}

func followsPreviousMessage(message, previous *messages.Message, value, previousValue int64) bool {
	return previousValue < math.MaxInt64 && value == previousValue+1 &&
		(previous == nil || previous.Author.ID != message.Author.ID)
}

func MessageCreateEventHandler(l *log.Logger, db *bolt.DB) func(ctx *bot.MessageContext) {
	return func(ctx *bot.MessageContext) {
		cfg, err := utils.DbGetConfig(db, ctx.GuildID.String())
		if err != nil {
			return
		}

		message := ctx.Message
		if ctx.ChannelID().String() != cfg.CountingChannelID || message.Author == nil || message.Author.Bot {
			return
		}

		n, evalErr := utils.EvalExpr(message.Content, l)
		prevMessage, prev, err := getPreviousMessage(&ctx.BaseContext, message.ChannelID, message.ID, l)
		if err != nil {
			l.Print(err)
			if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
				l.Print(err)
			}
			return
		}

		if evalErr == nil && followsPreviousMessage(&message, prevMessage, n, prev) {
			go func() {
				if err := ctx.Bot.Rest.CreateReaction(ctx.Context(), message.ChannelID, message.ID, cfg.Reaction); err != nil {
					l.Printf("Cannot react")
				}
			}()
		} else {
			go utils.PunishAuthor(&ctx.BaseContext, ctx.GuildID, &ctx.Message, cfg, l, db)
		}
	}
}
