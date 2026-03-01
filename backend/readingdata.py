import serial
import json
import re
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

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


def read_serial_data():
    global serial_connection, latest_data, stop_reading
    
    while not stop_reading and serial_connection and serial_connection.is_open:
        try:
            line = serial_connection.readline().decode(errors="ignore").strip()
            
            if not line:
                continue
            
            print(f"Received: {line}")
            
            json_text = extract_json(line)
            if not json_text:
                continue
            
            try:
                data = json.loads(json_text)
                latest_data = data
                with open("fullinfo.json", "w", encoding = "utf-8") as f:
                    json.dump(data, f)
                
                    
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
        data_list = []
        with open("fullinfo.json", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    json_text = extract_json(line)
                    if json_text:
                        try:
                            data_list.append(json.loads(json_text))
                        except json.JSONDecodeError:
                            continue
        return jsonify(data_list)
    except FileNotFoundError:
        return jsonify({'error': 'fullinfo.json not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)