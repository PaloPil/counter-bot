package utils

import (
	"errors"
	"log"
	"regexp"

	"github.com/expr-lang/expr"
)

var spoilerPattern = regexp.MustCompile(`(?s)\|\|.*?\|\|`)

func EvalExpr(s string, l *log.Logger) (int64, error) {
	// Preserve token boundaries when removing spoiler text.
	expression := spoilerPattern.ReplaceAllString(s, " ")
	program, err := expr.Compile(expression, expr.AsInt64(), expr.MaxNodes(256))
	if err != nil {
		l.Printf("Cannot eval `%s` (compile stage)", s)
		return 0, errors.New("Cannot parse the expression")
	}

	output, err := expr.Run(program, nil)
	if err != nil {
		l.Printf("Cannot eval `%s` (run stage)", s)
		return 0, errors.New("Cannot evalutate the expression")
	}

	if num, ok := output.(int64); ok {
		return num, nil
	} else {
		l.Printf("`%s` parsed as a %T)", s, output)
		return 0, errors.New("Is it really a number?")
	}

}
