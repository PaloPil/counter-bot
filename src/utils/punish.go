package utils

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/discord-go/discord.go/bot"
	"github.com/discord-go/discord.go/snowflake"
	bolt "go.etcd.io/bbolt"
)

var sanctionMu sync.Mutex
var sanctionsBucket = []byte("sanctions")

type sanction struct {
	Guild   snowflake.ID `json:",string"`
	User    snowflake.ID `json:",string"`
	Role    snowflake.ID `json:",string"`
	Expires time.Time
}

func PunishAuthor(ctx *bot.MessageContext, cfg *GuildConfig, l *log.Logger, db *bolt.DB) {
	if err := ctx.Bot.Rest.DeleteMessage(ctx.Context(), ctx.Message.ChannelID, ctx.Message.ID); err != nil {
		l.Print(err)
	}
	role, err := snowflake.Parse(cfg.TimeoutRoleID)
	if err != nil {
		l.Print(err)
		return
	}
	if cfg.TimeoutDuration < 1 || cfg.TimeoutDuration > 40320 {
		l.Print("Invalid timeout duration")
		return
	}
	s := sanction{ctx.GuildID, ctx.Author.ID, role, time.Now().Add(time.Duration(cfg.TimeoutDuration) * time.Minute)}
	key := []byte(s.Guild.String() + "/" + s.User.String() + "/" + s.Role.String())
	sanctionMu.Lock()
	defer sanctionMu.Unlock()
	// Commit the deadline before contacting Discord so a crash cannot leave an untracked role.
	err = db.Update(func(tx *bolt.Tx) error {
		b, err := tx.CreateBucketIfNotExists(sanctionsBucket)
		if err != nil {
			return err
		}
		if data := b.Get(key); data != nil {
			var previous sanction
			if err := json.Unmarshal(data, &previous); err != nil {
				return err
			}
			if previous.Expires.After(s.Expires) {
				s.Expires = previous.Expires
			}
		}
		data, err := json.Marshal(s)
		if err != nil {
			return err
		}
		return b.Put(key, data)
	})
	if err != nil {
		l.Print(err)
		return
	}
	// Keep the record on failure because a network error may hide a successful assignment.
	if err := ctx.Bot.Rest.AddGuildMemberRole(ctx.Context(), s.Guild, s.User, s.Role); err != nil {
		l.Print(err)
	}
}

type roleRemover interface {
	RemoveGuildMemberRole(context.Context, snowflake.ID, snowflake.ID, snowflake.ID) error
}

func releaseExpired(ctx context.Context, db *bolt.DB, client roleRemover, now time.Time) error {
	sanctionMu.Lock()
	defer sanctionMu.Unlock()
	var pending []struct {
		key   []byte
		value sanction
	}
	err := db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(sanctionsBucket)
		if b == nil {
			return nil
		}
		return b.ForEach(func(k, v []byte) error {
			var s sanction
			if err := json.Unmarshal(v, &s); err != nil {
				return err
			}
			if !s.Expires.After(now) {
				pending = append(pending, struct {
					key   []byte
					value sanction
				}{append([]byte(nil), k...), s})
			}
			return nil
		})
	})
	if err != nil {
		return err
	}
	var failures error
	for _, entry := range pending {
		s := entry.value
		requestCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		err := client.RemoveGuildMemberRole(requestCtx, s.Guild, s.User, s.Role)
		cancel()
		if err != nil {
			failures = errors.Join(failures, err)
			continue
		}
		if err := db.Update(func(tx *bolt.Tx) error { return tx.Bucket(sanctionsBucket).Delete(entry.key) }); err != nil {
			return err
		}
	}
	return failures
}

// RunSanctionCleanup resumes persisted deadlines and retries failed removals.
func RunSanctionCleanup(ctx context.Context, db *bolt.DB, client roleRemover, l *log.Logger) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		if err := releaseExpired(ctx, db, client, time.Now()); err != nil {
			l.Print(err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
