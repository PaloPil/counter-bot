package commands

import (
	"fmt"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/interactions"
	"github.com/discord-go/discord.go/permissions"
	"github.com/discord-go/discord.go/rest"
	"github.com/discord-go/discord.go/snowflake"
)

var maxLimit int = 100

var disabled bool = true

func PurgeRegister(router *bot.Router) {
	if disabled {
		return
	}
	router.Command("purge", "Purges all messages after a certain one", purgeHandler(),
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeString,
			Name:        "message",
			Description: "Last message to keep",
			Required:    true,
		},
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeInteger,
			Name:        "max",
			Description: fmt.Sprintf("Max number of messages to delete (Default: 30, Max: %d)", maxLimit),
			Required:    false,
		},
	).RequirePermissions(permissions.Administrator)
}

func purgeHandler() func(*bot.InteractionContext) {
	return func(ctx *bot.InteractionContext) {
		messageOpt := ctx.OptionString("message")
		message, err := snowflake.Parse(messageOpt)
		if err != nil {
			ctx.ReplyEphemeral("Error: Unknown message")
			return
		}

		max := 30
		if opt := ctx.Option("max"); opt != nil {
			max = int(opt.Int())
		}
		if max > maxLimit {
			max = maxLimit
		}

		messages, err := ctx.Bot.Rest.GetChannelMessages(ctx.Context(), ctx.ChannelID(), rest.GetMessagesParams{
			After: &message,
			Limit: &max,
		})
		if err != nil || len(messages) == 0 {
			ctx.ReplyEphemeral("Error: Failed to get messages in this channel")
			return
		}

		var messagesIDs []snowflake.ID
		for _, mess := range messages {
			messagesIDs = append(messagesIDs, mess.ID)
		}

		if err := ctx.Bot.Rest.BulkDeleteMessages(ctx.Context(), ctx.ChannelID(), messagesIDs); err != nil {
			ctx.ReplyEphemeral("Error: Failed to delete messages")
			return
		}

		ctx.ReplyEphemeral("Messages successfully deleted!")
	}
}
