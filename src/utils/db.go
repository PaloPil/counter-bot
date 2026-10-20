package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"

	bolt "go.etcd.io/bbolt"
)

var bucketName = []byte("guildConfigs")

type GuildConfig struct {
	CountingChannelID string `json:"channel"`
	TimeoutDuration   int    `json:"timeout"`
	TimeoutRoleID     string `json:"role"`
	Reaction          string `json:"react"`
}

func DbOpen(l *log.Logger) *bolt.DB {
	dbPath, set := os.LookupEnv("DB_PATH")
	if !set {
		dbPath = "/opt/counter-bot/data.db"
		l.Printf("No `DB_PATH` defined, defaulting to `%s`", dbPath)
	}

	db, err := bolt.Open(dbPath, 0600, nil)
	if err != nil {
		l.Fatal("Cannot open database")
	}

	err = db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(bucketName)
		return err
	})
	if err != nil {
		l.Fatalf("Cannot create bucket `%s`", bucketName)
	}

	l.Printf("Connected to database!")

	return db
}

func DbClose(db *bolt.DB) {
	db.Close()
}

func DbUpdateConfig(db *bolt.DB, guildID string, cfg GuildConfig) error {
	data, err := json.Marshal(cfg)
	if err != nil {
		return errors.New("Serialization error")
	}

	return db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)

		return b.Put([]byte(guildID), data)
	})
}

func DbGetConfig(db *bolt.DB, guildID string) (*GuildConfig, error) {
	var cfg GuildConfig

	err := db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)
		data := b.Get([]byte(guildID))

		if data == nil {
			return fmt.Errorf("No config for guild n°%s", guildID)
		}

		return json.Unmarshal(data, &cfg)
	})

	if err != nil {
		return nil, err
	}

	return &cfg, nil
}
