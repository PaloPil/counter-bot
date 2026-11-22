package events

import (
	"errors"
	"log"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/messages"
	"github.com/discord-go/discord.go/rest"
	bolt "go.etcd.io/bbolt"
)

func getPreviousMessage(ctx *bot.MessageContext, l *log.Logger, db *bolt.DB) (*messages.Message, int64, error) {
	limit := 50
	before := ctx.Message.ID
	messages, err := ctx.Bot.Rest.GetChannelMessages(
		ctx.Context(), ctx.ChannelID(),
		rest.GetMessagesParams{
			Before: &before,
			Limit:  &limit,
		},
	)
	if err != nil {
		l.Printf("Failed to fetch previous messages")
		return nil, 0, err
	}

	if len(messages) == 0 {
		return nil, 0, nil
	}

	for i := range messages {
		message := &messages[i]
		value, err := utils.EvalExpr(message.Content, l)
		if message.EditedTimestamp == nil {
			return message, value, err
		}
		original, originalErr := utils.DbGetMessageValue(db, ctx.ChannelID().String(), message.ID.String())
		if originalErr == nil && err == nil && value == original {
			return message, original, nil
		}
	}
	return nil, 0, errors.New("no usable message in recent counting history")
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

		n, evalErr := utils.EvalExpr(message.Content, l)
		prevMessage, prev, err := getPreviousMessage(ctx, l, db)
		if err != nil {
			l.Print(err)
			if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
				l.Print(err)
			}
			return
		}

		if prevMessage != nil {
			if prevMessage.Author.ID == message.Author.ID {
				go utils.PunishAuthor(&ctx.BaseContext, ctx.GuildID, &ctx.Message, cfg, l, db)
				return
			}
		}

		if evalErr == nil && n == prev+1 {
			if err := utils.DbSaveMessageValue(db, message.ChannelID.String(), message.ID.String(), n); err != nil {
				l.Print(err)
				if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
					l.Print(err)
				}
				return
			}
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
