package utils

import (
	"io"
	"log"
	"testing"
)

func TestEvalExprIgnoresSpoilers(t *testing.T) {
	logger := log.New(io.Discard, "", 0)
	for _, input := range []string{
		"42 ||Hello||",
		"||hidden|| 42",
		"40 ||first|| + 2 ||second||",
		"42 ||multiple\nlines||",
		"42 ||1 / 0||",
	} {
		value, err := EvalExpr(input, logger)
		if err != nil || value != 42 {
			t.Errorf("EvalExpr(%q) = %d, %v", input, value, err)
		}
	}
	for _, input := range []string{"||42||", "4||hidden||2", "42 ||unclosed"} {
		if _, err := EvalExpr(input, logger); err == nil {
			t.Errorf("expected invalid expression for %q", input)
		}
	}
}
