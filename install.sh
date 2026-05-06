#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

case "$OS" in
  darwin|linux) ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

BINARY="coco-agent-${OS}-${ARCH}"
REPO="celeroncoder/coco"

echo "Fetching latest coco-agent release..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Failed to determine latest release tag."
  exit 1
fi

echo "Downloading coco-agent $TAG for ${OS}-${ARCH}..."

INSTALL_DIR="${COCO_INSTALL_DIR:-$HOME/.coco/bin}"
mkdir -p "$INSTALL_DIR"

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$BINARY"
curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/coco-agent"
chmod +x "$INSTALL_DIR/coco-agent"

echo ""
echo "coco-agent installed to $INSTALL_DIR/coco-agent"

if ! echo "$PATH" | tr ':' '\n' | grep -qxF "$INSTALL_DIR"; then
  echo ""
  echo "To add $INSTALL_DIR to your PATH:"

  SHELL_NAME="$(basename "${SHELL:-}")"
  case "$SHELL_NAME" in
    zsh)  RC_FILE="$HOME/.zshrc" ;;
    bash) RC_FILE="$HOME/.bashrc" ;;
    fish) RC_FILE="$HOME/.config/fish/config.fish" ;;
    *)    RC_FILE="$HOME/.profile" ;;
  esac

  echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> $RC_FILE"
  echo "  source $RC_FILE"
fi

echo ""
echo "Run 'coco-agent start' to begin."
