#!/bin/bash

# UAVmap Uninstallation Script
# Run with: sudo bash uninstall.sh

set -e

echo "=========================================="
echo "  UAVmap Service Uninstallation"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash uninstall.sh"
    exit 1
fi

echo "[1/4] Stopping services..."
systemctl stop map-backend.service 2>/dev/null || true
systemctl stop map-frontend.service 2>/dev/null || true

echo "[2/4] Disabling services..."
systemctl disable map-backend.service 2>/dev/null || true
systemctl disable map-frontend.service 2>/dev/null || true

echo "[3/4] Removing service files..."
rm -f /etc/systemd/system/map-backend.service
rm -f /etc/systemd/system/map-frontend.service
systemctl daemon-reload

echo "[4/4] Removing installation directory..."
read -p "Remove /opt/uavmap? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf /opt/uavmap
    echo "Directory removed."
else
    echo "Directory kept."
fi

echo ""
echo "Uninstallation complete!"
