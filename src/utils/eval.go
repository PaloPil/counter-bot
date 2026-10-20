package utils

import (
	"errors"
	"log"

	"github.com/expr-lang/expr"
)

func EvalExpr(s string, l *log.Logger) (int64, error) {
	program, err := expr.Compile(s, expr.AsInt64())
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
