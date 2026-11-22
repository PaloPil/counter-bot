package utils

import (
	"errors"
	"io"
	"log"
	"path/filepath"
	"testing"

	bolt "go.etcd.io/bbolt"
)

func TestMessageValueSurvivesRestartAndKeepsOriginal(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.db")
	db, err := bolt.Open(path, 0600, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := DbSaveMessageValue(db, "channel", "message", 2); err != nil {
		t.Fatal(err)
	}
	if err := DbSaveMessageValue(db, "channel", "message", 3); err != nil {
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
	original, err := DbGetMessageValue(db, "channel", "message")
	if err != nil || original != 2 {
		t.Fatalf("original = %d, error = %v", original, err)
	}
	for _, expression := range []string{"2", "1+1", "4/2"} {
		value, err := EvalExpr(expression, log.New(io.Discard, "", 0))
		if err != nil || value != original {
			t.Fatalf("%q: value %d, error %v", expression, value, err)
		}
	}
	if _, err := DbGetMessageValue(db, "other-channel", "message"); !errors.Is(err, ErrMessageValueUnknown) {
		t.Fatalf("unexpected error: %v", err)
	}
}
