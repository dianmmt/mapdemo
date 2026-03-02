import serial
import json
import re
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import serial.tools.list_ports as ls 
app = Flask(__name__)
CORS(app)

serial_connection = None
latest_data = {}
read_thread = None
stop_reading = False


def extract_json(text):
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end+1]
    return None

@app.route('/ports', methods=['GET'])
def get_ports():
    ports = []
    for port in ls.comports():
        print(port.device)
        ports.append(port.device)
    return ports

def read_serial_data():
    global serial_connection, latest_data, stop_reading
    
    print("[THREAD] Serial reading thread started")
    
    while not stop_reading and serial_connection and serial_connection.is_open:
        try:
            line = serial_connection.readline().decode(errors="ignore").strip()
            
            if not line:
                continue
            
            print(f"[RX] {line}")
            
            json_text = extract_json(line)
            if not json_text:
                continue
            
            try:
                data = json.loads(json_text)
                data['received_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                latest_data = data
                
                # Load existing data
                try:
                    with open("db.json", "r", encoding="utf-8") as f:
                        all_data = json.load(f)
                    if not isinstance(all_data, list):
                        all_data = [all_data] if all_data else []
                except (FileNotFoundError, json.JSONDecodeError):
                    all_data = []
                
                # Append new record
                all_data.append(data)
                
                # Save all records
                with open("db.json", "w", encoding="utf-8") as f:
                    json.dump(all_data, f, indent=2, ensure_ascii=False)
                
                print(f"Saved to db.json: {data.get('device_type', 'Unknown')} at {data['received_at']} (Total: {len(all_data)} records)")
                
                    
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                
        except Exception as e:
            print(f"Serial read error: {e}")
            break



def parse_drone_data(text):
    results = []
    json_pattern = r'\{[^{}]+\}'
    matches = re.findall(json_pattern, text)
    
    for match in matches:
        try:
            data = json.loads(match)
            results.append({
                "freq": data.get("freq"),
                "device_type": data.get("device_type")
            })
        except json.JSONDecodeError:
            continue
    
    return results


@app.route('/connect', methods=['POST'])
def connect():
    global serial_connection, read_thread, stop_reading, latest_data
    
    try:
        data = request.get_json()
        port = data.get('port', 'COM7')
        baud = data.get('baud', 115200)
        
        if serial_connection and serial_connection.is_open:
            stop_reading = True
            if read_thread:
                read_thread.join(timeout=2)
            serial_connection.close()
        
        serial_connection = serial.Serial(port, baud, timeout=1)
        latest_data = {}
        stop_reading = False
        
        read_thread = threading.Thread(target=read_serial_data, daemon=True)
        read_thread.start()
        
        print(f"\n[CONNECTED] Serial port {port} @ {baud} baud")
        
        return jsonify({'success': True, 'message': f'Connected to {port} @ {baud} baud'})
        
    except serial.SerialException as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/disconnect', methods=['POST'])
def disconnect():
    global serial_connection, stop_reading, read_thread
    
    try:
        stop_reading = True
        if read_thread:
            read_thread.join(timeout=2)
        if serial_connection and serial_connection.is_open:
            serial_connection.close()
        serial_connection = None
        
        return jsonify({'success': True, 'message': 'Disconnected'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/data', methods=['GET'])
def get_data():
    return jsonify(latest_data)


@app.route('/status', methods=['GET'])
def get_status():
    is_connected = serial_connection is not None and serial_connection.is_open
    return jsonify({
        'connected': is_connected,
        'port': serial_connection.port if is_connected else None
    })


@app.route('/config', methods=['POST'])
def set_config():
    try:
        data = request.get_json()
        port = data.get('port')
        baud = data.get('baud')
        return jsonify({'success': True, 'config': {'port': port, 'baud': baud}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/drone-data', methods=['GET'])
def get_drone_data():
    try:
        with open("db.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return jsonify([data])
        if isinstance(data, list):
            return jsonify(data)
        return jsonify([])
    except FileNotFoundError:
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/clear-data', methods=['POST'])
def clear_data():
    try:
        with open("db.json", "w", encoding="utf-8") as f:
            json.dump([], f)
        return jsonify({'success': True, 'message': 'All data cleared'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)