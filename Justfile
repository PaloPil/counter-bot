set dotenv-load

alias r := run
# Runs the project
run:
    go run ./src

alias b := build
# Builds a binary
build:
    go build -o bin/gobot ./src

# Run all tests
test:
    go test ./...

# Clean trashfiles
clean:
    go clean
    rm -rf bin
