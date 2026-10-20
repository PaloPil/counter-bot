package events

import (
	"log"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/messages"
	"github.com/discord-go/discord.go/rest"
	bolt "go.etcd.io/bbolt"
)

func getPreviousMessage(ctx *bot.MessageContext, l *log.Logger) (*messages.Message, error) {
	limit := 1
	messages, err := ctx.Bot.Rest.GetChannelMessages(
		ctx.Context(), ctx.ChannelID(),
		rest.GetMessagesParams{
			Before: &ctx.Message.ID,
			Limit:  &limit,
		},
	)
	if err != nil {
		l.Printf("Failed to fetch previous messages")
		return nil, err
	}

	if len(messages) == 0 {
		return nil, nil
	}

	return &messages[0], nil
}

func MessageCreateEventHandler(l *log.Logger, db *bolt.DB) func(ctx *bot.MessageContext) {
	return func(ctx *bot.MessageContext) {
		cfg, err := utils.DbGetConfig(db, ctx.GuildID.String())
		if err != nil {
			return
		}

		message := ctx.Message
		if ctx.ChannelID().String() != cfg.CountingChannelID || message.Author.Bot {
			return
		}

		prevMessage, err := getPreviousMessage(ctx, l)
		if err != nil {
			l.Print(err)
		}

		var prev int64 = 0
		if prevMessage != nil {
			if prevMessage.Author.ID == message.Author.ID {
				utils.PunishAuthor(ctx, cfg, l)
				return
			}

			m, err := utils.EvalExpr(prevMessage.Content, l)
			if err == nil {
				prev = m
			}
		}

		n, err := utils.EvalExpr(message.Content, l)
		if err == nil && n == prev+1 {
			go func() {
				if err := ctx.Bot.Rest.CreateReaction(ctx.Context(), message.ChannelID, message.ID, cfg.Reaction); err != nil {
					l.Printf("Cannot react")
				}
			}()
		} else {
			utils.PunishAuthor(ctx, cfg, l)
		}
	}
}
