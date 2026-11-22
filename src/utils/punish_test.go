package utils

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/discord-go/discord.go/snowflake"
	bolt "go.etcd.io/bbolt"
)

type removalStub struct {
	calls int
	err   error
}

func (r *removalStub) RemoveGuildMemberRole(context.Context, snowflake.ID, snowflake.ID, snowflake.ID) error {
	r.calls++
	return r.err
}

func TestCleanupResumesAfterReopenAndRetries(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.db")
	db, err := bolt.Open(path, 0600, nil)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	err = db.Update(func(tx *bolt.Tx) error {
		b, err := tx.CreateBucketIfNotExists(sanctionsBucket)
		if err != nil {
			return err
		}
		for key, expiry := range map[string]time.Time{"expired": now.Add(-time.Minute), "active": now.Add(time.Hour)} {
			data, err := json.Marshal(sanction{Guild: 1, User: 2, Role: 3, Expires: expiry})
			if err != nil {
				return err
			}
			if err := b.Put([]byte(key), data); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = bolt.Open(path, 0600, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	client := &removalStub{err: errors.New("Discord unavailable")}
	if err := releaseExpired(context.Background(), db, client, now); err == nil {
		t.Fatal("expected removal failure")
	}
	client.err = nil
	if err := releaseExpired(context.Background(), db, client, now); err != nil {
		t.Fatal(err)
	}
	if client.calls != 2 {
		t.Fatalf("got %d removal attempts", client.calls)
	}
	if err := db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(sanctionsBucket)
		if b.Get([]byte("expired")) != nil {
			t.Error("expired sanction retained after success")
		}
		if b.Get([]byte("active")) == nil {
			t.Error("active sanction lost")
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
}
