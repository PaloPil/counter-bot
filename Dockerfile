# === BUILDER ===
FROM --platform=$BUILDPLATFORM golang:1.26 AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY ./src ./src

ARG TARGETOS
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -o /bin/counter-bot ./src

# === RUNNER ===
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder /bin/counter-bot /counter-bot

VOLUME ["/data"]

ENTRYPOINT [ "/counter-bot" ]
