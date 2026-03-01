import serial
import json

PORT = "COM7"
BAUD = 115200


def extract_json(text):
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:
        return text[start:end+1]

    return None


def main():
    ser = serial.Serial(PORT, BAUD, timeout=1)
    print("Listening COM7...")

    while True:
        line = ser.readline().decode(errors="ignore").strip()

        if not line:
            continue

        print("RX:", line)

        json_text = extract_json(line)

        if not json_text:
            continue

        try:
            data = json.loads(json_text)

            # Lưu toàn bộ dữ liệu vào db.json
            with open("db.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            print("Saved full data to db.json")

        except Exception as e:
            print("JSON error:", e)


if __name__ == "__main__":
    main()