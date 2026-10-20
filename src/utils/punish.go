package utils

import (
	"log"
	"time"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/snowflake"
)

func PunishAuthor(ctx *bot.MessageContext, cfg *GuildConfig, l *log.Logger) {
	msg := ctx.Message

	go func() {
		if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), msg.ChannelID, msg.ID); err != nil {
			l.Printf("Failed to delete message")
		}
	}()

	role, err := snowflake.Parse(cfg.TimeoutRoleID)
	if err != nil {
		l.Printf("Cannot parse role %s\n", cfg.TimeoutRoleID)
		return
	}

	go func() {
		if err = ctx.Bot.Rest.AddGuildMemberRole(ctx.Context(), ctx.GuildID, ctx.Author.ID, role); err != nil {
			l.Print(err)
		}

		time.AfterFunc(time.Duration(cfg.TimeoutDuration)*time.Minute, func() {
			if err = ctx.Bot.Rest.RemoveGuildMemberRole(ctx.Context(), ctx.GuildID, ctx.Author.ID, role); err != nil {
				l.Print(err)
			}
		})
	}()

}
