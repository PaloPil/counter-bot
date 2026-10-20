{
  description = "Go dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            go
            gopls # Language server
            golangci-lint # Linter
            delve # Debugger
            gotools # goimports, godoc...
            go-tools # staticcheck
          ];

          shellHook = ''
            export GOPATH=~/.go
          '';
        };
      }
    );
}
