# UAVmap Systemd Service Installation

## Quick Install

```bash
# Copy project to Ubuntu server, then:
cd /path/to/MapDemo/systemd
sudo bash install.sh
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `uavmap-api` | 5000 | Flask API backend (readingdata.py) |
| `uavmap-frontend` | 8080 | Static file server for frontend |

## Commands

### View Status
```bash
sudo systemctl status uavmap-api
sudo systemctl status uavmap-frontend
```

### View Logs
```bash
# Real-time API logs
sudo journalctl -u uavmap-api -f

# Real-time Frontend logs
sudo journalctl -u uavmap-frontend -f

# Last 100 lines
sudo journalctl -u uavmap-api -n 100
```

### Control Services
```bash
# Restart
sudo systemctl restart uavmap-api
sudo systemctl restart uavmap-frontend

# Stop
sudo systemctl stop uavmap-api
sudo systemctl stop uavmap-frontend

# Start
sudo systemctl start uavmap-api
sudo systemctl start uavmap-frontend
```

## Serial Port Access

If using serial port for UAV communication, ensure the service user has access:

```bash
# Add www-data to dialout group
sudo usermod -a -G dialout www-data

# Restart service after adding to group
sudo systemctl restart uavmap-api
```

## Custom Configuration

### Change User
Edit `/etc/systemd/system/uavmap-api.service`:
```ini
User=your-user
Group=your-group
```

### Change Port
Edit `/opt/uavmap/backend/readingdata.py`:
```python
app.run(host='0.0.0.0', port=YOUR_PORT, debug=False)
```

Then restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart uavmap-api
```

## Firewall

```bash
# Allow ports
sudo ufw allow 5000/tcp
sudo ufw allow 8080/tcp
```

## Uninstall

```bash
cd /path/to/MapDemo/systemd
sudo bash uninstall.sh
```
