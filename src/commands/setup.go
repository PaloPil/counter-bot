package commands

import (
	"os"
	"palopil/counter-bot/src/utils"
	"slices"

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
	).RequirePermissions(permissions.ManageGuild | permissions.ManageRoles)

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
				Type:        interactions.ApplicationCommandOptionTypeChannel,
				Name:        "channel",
				Description: "DO NOT USE",
			},
			interactions.ApplicationCommandOption{
				Type:        interactions.ApplicationCommandOptionTypeRole,
				Name:        "timeout_role",
				Description: "DO NOT USE",
			},
			interactions.ApplicationCommandOption{
				Type:        interactions.ApplicationCommandOptionTypeInteger,
				Name:        "timeout_duration",
				Description: "DO NOT USE",
			},
			interactions.ApplicationCommandOption{
				Type:        interactions.ApplicationCommandOptionTypeString,
				Name:        "reaction",
				Description: "DO NOT USE",
			},
		)
	}
}

func setupHandler(db *bolt.DB) func(*bot.InteractionContext) {
	return func(ctx *bot.InteractionContext) {
		if ctx.Guild == nil || ctx.Member == nil {
			ctx.ReplyEphemeral("Use this command in a server.")
			return
		}
		channel := ctx.OptionChannel("channel")
		timeout := 10
		if opt := ctx.Option("timeout_duration"); opt != nil {
			timeout = int(opt.Int())
		}
		role := ctx.OptionRole("timeout_role")
		if timeout < 1 || timeout > 40320 {
			ctx.ReplyEphemeral("Timeout duration must be between 1 and 40320 minutes.")
			return
		}
		member, err := ctx.Bot.Rest.GetGuildMember(ctx.Context(), ctx.Guild.ID, ctx.User().ID)
		if err != nil {
			ctx.ReplyEphemeral("Cannot verify your roles.")
			return
		}
		guildRoles, err := ctx.Bot.Rest.GetGuildRoles(ctx.Context(), ctx.Guild.ID)
		if err != nil {
			ctx.ReplyEphemeral("Cannot verify server roles.")
			return
		}
		highest := 0
		targetPosition := 0
		validRole := false
		for _, r := range guildRoles {
			if slices.Contains(member.Roles, r.ID) && r.Position > highest {
				highest = r.Position
			}
			if r.ID == role {
				targetPosition = r.Position
				validRole = !r.Managed && r.ID != ctx.Guild.ID
			}
		}
		owner := ctx.Guild.OwnerID == ctx.User().ID
		if !validRole || (!owner && (!ctx.Member.Permissions.HasAll(permissions.ManageGuild|permissions.ManageRoles) || targetPosition >= highest)) {
			ctx.ReplyEphemeral("You must be allowed to manage the selected role, below your highest role.")
			return
		}
		reaction := "✅"
		if opt := ctx.Option("reaction"); opt != nil {
			reaction = opt.String()
		}

		if err := utils.DbUpdateConfig(db, ctx.Guild.ID.String(), utils.GuildConfig{
			CountingChannelID: channel.String(),
			TimeoutDuration:   int(timeout),
			TimeoutRoleID:     role.String(),
			Reaction:          reaction,
		}); err != nil {
			ctx.ReplyEphemeral("Failed to save configuration.")
			return
		}

		ctx.Reply("Config updated!")
	}
}
