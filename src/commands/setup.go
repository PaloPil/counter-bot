package commands

import (
	"os"
	"palopil/counter-bot/src/utils"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/interactions"
	"github.com/discord-go/discord.go/permissions"
	bolt "go.etcd.io/bbolt"
)

func SetupRegister(router *bot.Router, db *bolt.DB) {
	router.Command("setup", "Setup server config", setupHandler(db),
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeChannel,
			Name:        "channel",
			Description: "Channel in which counting will happen",
			Required:    true,
		},
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeRole,
			Name:        "timeout_role",
			Description: "Role that will be added on timeout",
			Required:    true,
		},
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeInteger,
			Name:        "timeout_duration",
			Description: "Timeout duration, in minutes (Default: 10)",
			Required:    false,
		},
		interactions.ApplicationCommandOption{
			Type:        interactions.ApplicationCommandOptionTypeString,
			Name:        "reaction",
			Description: "Reaction that will be added to valid numbers (Default: ✅)",
			Required:    false,
		},
	).RequirePermissions(permissions.ManageGuild)

	ownerid, defined := os.LookupEnv("OWNER_ID")
	if defined {
		router.Command("force-setup", "Manual setup by bot owner",
			func(ctx *bot.InteractionContext) {
				if ctx.User().ID.String() != ownerid {
					ctx.ReplyEphemeral("error.")
					return
				}
				setupHandler(db)(ctx)
			},
			interactions.ApplicationCommandOption{
				Type: interactions.ApplicationCommandOptionTypeChannel,
				Name: "channel",
			},
			interactions.ApplicationCommandOption{
				Type: interactions.ApplicationCommandOptionTypeRole,
				Name: "timeout_role",
			},
			interactions.ApplicationCommandOption{
				Type: interactions.ApplicationCommandOptionTypeInteger,
				Name: "timeout_duration",
			},
			interactions.ApplicationCommandOption{
				Type: interactions.ApplicationCommandOptionTypeString,
				Name: "reaction",
			},
		)
	}
}

func setupHandler(db *bolt.DB) func(*bot.InteractionContext) {
	return func(ctx *bot.InteractionContext) {
		channel := ctx.OptionChannel("channel")
		timeout := 10
		if opt := ctx.Option("timeout_duration"); opt != nil {
			timeout = int(opt.Int())
		}
		role := ctx.OptionRole("timeout_role")
		reaction := "✅"
		if opt := ctx.Option("reaction"); opt != nil {
			reaction = opt.String()
		}

		utils.DbUpdateConfig(db, ctx.Guild.ID.String(), utils.GuildConfig{
			CountingChannelID: channel.String(),
			TimeoutDuration:   int(timeout),
			TimeoutRoleID:     role.String(),
			Reaction:          reaction,
		})

		ctx.Reply("Config updated!")
	}
}
