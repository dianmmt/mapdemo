#!/bin/bash

# UAVmap Installation Script for Ubuntu
# Run with: sudo bash install.sh

set -e

echo "=========================================="
echo "  UAVmap Service Installation Script"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash install.sh"
    exit 1
fi

# Variables
INSTALL_DIR="/opt/uavmap"
SERVICE_USER="www-data"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/6] Creating installation directory..."
mkdir -p "$INSTALL_DIR"

echo "[2/6] Copying project files..."
cp -r "$PROJECT_DIR"/* "$INSTALL_DIR/"
rm -rf "$INSTALL_DIR/systemd"

echo "[3/6] Setting up Python virtual environment..."
cd "$INSTALL_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
deactivate

echo "[4/6] Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

# If using serial port, add user to dialout group
usermod -a -G dialout $SERVICE_USER 2>/dev/null || true

echo "[5/6] Installing systemd services..."
cp "$SCRIPT_DIR/map-backend.service" /etc/systemd/system/
cp "$SCRIPT_DIR/map-frontend.service" /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

echo "[6/6] Enabling and starting services..."
systemctl enable map-backend.service
systemctl enable map-frontend.service
systemctl start map-backend.service
systemctl start map-frontend.service

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Services status:"
systemctl status map-backend.service --no-pager -l || true
echo ""
systemctl status map-frontend.service --no-pager -l || true
echo ""
echo "URLs:"
echo "  - Frontend: http://localhost:8080"
echo "  - API:      http://localhost:5000"
echo ""
echo "Useful commands:"
echo "  - View Backend logs:  sudo journalctl -u map-backend -f"
echo "  - View Frontend logs: sudo journalctl -u map-frontend -f"
echo "  - Restart Backend:    sudo systemctl restart map-backend"
echo "  - Restart Frontend:   sudo systemctl restart map-frontend"
echo "  - Stop all:           sudo systemctl stop map-backend map-frontend"
echo ""
