package utils

import (
	"encoding/json"
	"errors"

	bolt "go.etcd.io/bbolt"
)

var messageValuesBucket = []byte("messageValues")
var ErrMessageValueUnknown = errors.New("original message value is unknown")

func DbSaveMessageValue(db *bolt.DB, channelID, messageID string, value int64) error {
	return db.Update(func(tx *bolt.Tx) error {
		b, err := tx.CreateBucketIfNotExists(messageValuesBucket)
		if err != nil {
			return err
		}
		key := []byte(channelID + "/" + messageID)
		if b.Get(key) != nil {
			return nil
		}
		data, err := json.Marshal(value)
		if err != nil {
			return err
		}
		return b.Put(key, data)
	})
}

func DbGetMessageValue(db *bolt.DB, channelID, messageID string) (int64, error) {
	var value int64
	err := db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(messageValuesBucket)
		if b == nil {
			return ErrMessageValueUnknown
		}
		data := b.Get([]byte(channelID + "/" + messageID))
		if data == nil {
			return ErrMessageValueUnknown
		}
		return json.Unmarshal(data, &value)
	})
	return value, err
}
