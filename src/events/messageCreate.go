package events

import (
	"log"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/messages"
	"github.com/discord-go/discord.go/rest"
	bolt "go.etcd.io/bbolt"
)

func getPreviousMessage(ctx *bot.MessageContext, l *log.Logger, db *bolt.DB) (*messages.Message, error) {
	limit := 1
	before := ctx.Message.ID
	for {
		messages, err := ctx.Bot.Rest.GetChannelMessages(
			ctx.Context(), ctx.ChannelID(),
			rest.GetMessagesParams{
				Before: &before,
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

		if messages[0].EditedTimestamp == nil {
			if value, err := utils.EvalExpr(messages[0].Content, l); err == nil {
				if err := utils.DbSaveMessageValue(db, ctx.ChannelID().String(), messages[0].ID.String(), value); err != nil {
					return nil, err
				}
			}
			return &messages[0], nil
		}
		original, err := utils.DbGetMessageValue(db, ctx.ChannelID().String(), messages[0].ID.String())
		value, evalErr := utils.EvalExpr(messages[0].Content, l)
		if err == nil && evalErr == nil && value == original {
			return &messages[0], nil
		}
		// Also skip edits missed while the bot was offline or awaiting deletion.
		before = messages[0].ID
	}
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
		if evalErr == nil {
			if err := utils.DbSaveMessageValue(db, message.ChannelID.String(), message.ID.String(), n); err != nil {
				l.Print(err)
				if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
					l.Print(err)
				}
				return
			}
		}
		prevMessage, err := getPreviousMessage(ctx, l, db)
		if err != nil {
			l.Print(err)
			if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
				l.Print(err)
			}
			return
		}

		var prev int64 = 0
		if prevMessage != nil {
			if prevMessage.Author.ID == message.Author.ID {
				go utils.PunishAuthor(&ctx.BaseContext, ctx.GuildID, &ctx.Message, cfg, l, db)
				return
			}

			m, err := utils.EvalExpr(prevMessage.Content, l)
			if err != nil {
				if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), message.ChannelID, message.ID); err != nil {
					l.Print(err)
				}
				return
			}
			prev = m
		}

		if evalErr == nil && n == prev+1 {
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
